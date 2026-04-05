const fs = require('fs');
const path = require('path');
const vm = require('vm');
const JimpModule = require('jimp');

const Jimp = JimpModule.Jimp || JimpModule;

function loadScriptAndExport(scriptPath, exportNames) {
  const source = fs.readFileSync(scriptPath, 'utf8');
  const exportLines = exportNames
    .map((name) => `if (typeof ${name} !== 'undefined') globalThis.${name} = ${name};`)
    .join('\n');
  vm.runInThisContext(`${source}\n${exportLines}`, { filename: scriptPath });
}

function loadDetectorModules(base) {
  loadScriptAndExport(path.join(base, 'js/core/utils.js'), ['Utils']);
  loadScriptAndExport(path.join(base, 'js/core/statistics.js'), ['Statistics']);
  loadScriptAndExport(path.join(base, 'js/core/correlation.js'), ['Correlation']);
  loadScriptAndExport(path.join(base, 'js/core/preprocessing.js'), ['Preprocessing']);
  loadScriptAndExport(path.join(base, 'js/core/wavelet.js'), ['Wavelet']);
  loadScriptAndExport(path.join(base, 'js/features/featureExtractor.js'), ['FeatureExtractor']);
  loadScriptAndExport(path.join(base, 'js/features/advancedFeatureExtractor.js'), ['AdvancedFeatureExtractor']);
  loadScriptAndExport(path.join(base, 'js/detection/thresholds.js'), ['Thresholds']);
  loadScriptAndExport(path.join(base, 'js/detection/anomalyMetrics.js'), ['AnomalyMetrics']);
  loadScriptAndExport(path.join(base, 'js/detection/classifier.js'), ['Classifier']);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    datasetRoot: path.join('archive', 'real_vs_fake', 'real-vs-fake'),
    maxSize: 512,
    trainPerClass: 800,
    validPerClass: 300,
    seed: 42,
    thresholdMin: 0.35,
    thresholdMax: 0.9,
    thresholdStep: 0.005,
    metric: 'f1',
    reportPath: 'archive-calibration-report.json'
  };

  for (const arg of args) {
    const [k, v] = arg.split('=');
    if (!k || v === undefined) continue;
    if (k === '--datasetRoot') cfg.datasetRoot = v;
    if (k === '--maxSize') cfg.maxSize = Number(v);
    if (k === '--trainPerClass') cfg.trainPerClass = Number(v);
    if (k === '--validPerClass') cfg.validPerClass = Number(v);
    if (k === '--seed') cfg.seed = Number(v);
    if (k === '--thresholdMin') cfg.thresholdMin = Number(v);
    if (k === '--thresholdMax') cfg.thresholdMax = Number(v);
    if (k === '--thresholdStep') cfg.thresholdStep = Number(v);
    if (k === '--metric') cfg.metric = v;
    if (k === '--reportPath') cfg.reportPath = v;
  }

  return cfg;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleArray(arr, n, seed) {
  if (n >= arr.length) return arr.slice();
  const rnd = mulberry32(seed);
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function listImageFiles(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .map((f) => path.join(dirPath, f));
}

async function imageToImageData(filePath, maxSize) {
  const img = await Jimp.read(filePath);
  let { width, height } = img.bitmap;

  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.max(8, Math.floor(width * ratio));
    height = Math.max(8, Math.floor(height * ratio));
    img.resize({ w: width, h: height });
  }

  return {
    width: img.bitmap.width,
    height: img.bitmap.height,
    data: new Uint8ClampedArray(img.bitmap.data)
  };
}

function analyzeImage(imageData) {
  const grayImage = Preprocessing.toGrayscale(imageData);
  const waveletCoeffs = Wavelet.dwt2D(grayImage, 3);
  const features = FeatureExtractor.extractAll(waveletCoeffs);
  const advanced = AdvancedFeatureExtractor.extract(grayImage);
  const metrics = AnomalyMetrics.computeAll(features, advanced);
  const aiScore = Classifier.computeAIScore(metrics);
  return { aiScore, metrics };
}

async function scoreFiles(files, label, maxSize) {
  const rows = [];
  let done = 0;

  for (const file of files) {
    try {
      const imageData = await imageToImageData(file, maxSize);
      const { aiScore, metrics } = analyzeImage(imageData);

      rows.push({
        file,
        actual: label,
        score: aiScore,
        metricScores: Object.fromEntries(
          Object.entries(metrics).map(([k, v]) => [k, Number.isFinite(v?.score) ? v.score : 0])
        )
      });
    } catch (error) {
      rows.push({ file, actual: label, error: error.message });
    }

    done += 1;
    if (done % 100 === 0) {
      process.stdout.write(`\rProcessed ${done}/${files.length} (${label ? 'fake' : 'real'})`);
    }
  }

  process.stdout.write('\n');
  return rows;
}

function confusion(rows, threshold) {
  const valid = rows.filter((r) => typeof r.score === 'number');
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const r of valid) {
    const pred = r.score > threshold;
    if (pred && r.actual) tp += 1;
    if (!pred && !r.actual) tn += 1;
    if (pred && !r.actual) fp += 1;
    if (!pred && r.actual) fn += 1;
  }

  const total = tp + tn + fp + fn;
  const accuracy = total ? (tp + tn) / total : 0;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const specificity = tn + fp ? tn / (tn + fp) : 0;

  return { tp, tn, fp, fn, total, accuracy, precision, recall, f1, specificity };
}

function optimizeThreshold(rows, min, max, step, metric) {
  let best = null;

  for (let t = min; t <= max + 1e-12; t += step) {
    const cm = confusion(rows, t);
    const target = cm[metric] ?? cm.f1;

    if (
      !best ||
      target > best.target ||
      (target === best.target && cm.accuracy > best.cm.accuracy)
    ) {
      best = {
        threshold: Number(t.toFixed(4)),
        target,
        metric,
        cm
      };
    }
  }

  return best;
}

function metricSeparation(rows) {
  const valid = rows.filter((r) => r.metricScores);
  const names = Object.keys(valid[0]?.metricScores || {});
  const result = {};

  for (const name of names) {
    const fake = valid.filter((r) => r.actual).map((r) => r.metricScores[name]);
    const real = valid.filter((r) => !r.actual).map((r) => r.metricScores[name]);

    const fakeAvg = fake.length ? fake.reduce((a, b) => a + b, 0) / fake.length : 0;
    const realAvg = real.length ? real.reduce((a, b) => a + b, 0) / real.length : 0;

    result[name] = {
      fakeAvg: Number(fakeAvg.toFixed(4)),
      realAvg: Number(realAvg.toFixed(4)),
      separation: Number(Math.abs(fakeAvg - realAvg).toFixed(4))
    };
  }

  return Object.fromEntries(
    Object.entries(result).sort((a, b) => b[1].separation - a[1].separation)
  );
}

async function main() {
  const cfg = parseArgs();
  const base = process.cwd();
  loadDetectorModules(base);

  const trainRealDir = path.join(base, cfg.datasetRoot, 'train', 'real');
  const trainFakeDir = path.join(base, cfg.datasetRoot, 'train', 'fake');
  const validRealDir = path.join(base, cfg.datasetRoot, 'valid', 'real');
  const validFakeDir = path.join(base, cfg.datasetRoot, 'valid', 'fake');

  const trainRealAll = listImageFiles(trainRealDir);
  const trainFakeAll = listImageFiles(trainFakeDir);
  const validRealAll = listImageFiles(validRealDir);
  const validFakeAll = listImageFiles(validFakeDir);

  const trainReal = sampleArray(trainRealAll, cfg.trainPerClass, cfg.seed + 11);
  const trainFake = sampleArray(trainFakeAll, cfg.trainPerClass, cfg.seed + 13);
  const validReal = sampleArray(validRealAll, cfg.validPerClass, cfg.seed + 17);
  const validFake = sampleArray(validFakeAll, cfg.validPerClass, cfg.seed + 19);

  console.log('Calibration config:', cfg);
  console.log('Train sample per class:', trainReal.length, trainFake.length);
  console.log('Valid sample per class:', validReal.length, validFake.length);

  const trainRows = [
    ...(await scoreFiles(trainReal, false, cfg.maxSize)),
    ...(await scoreFiles(trainFake, true, cfg.maxSize))
  ];

  const validRows = [
    ...(await scoreFiles(validReal, false, cfg.maxSize)),
    ...(await scoreFiles(validFake, true, cfg.maxSize))
  ];

  const best = optimizeThreshold(
    trainRows,
    cfg.thresholdMin,
    cfg.thresholdMax,
    cfg.thresholdStep,
    cfg.metric
  );

  const trainEval = confusion(trainRows, best.threshold);
  const validEval = confusion(validRows, best.threshold);
  const separation = metricSeparation(trainRows);

  const report = {
    generatedAt: new Date().toISOString(),
    config: cfg,
    bestThreshold: best.threshold,
    optimizedFor: cfg.metric,
    trainMetrics: trainEval,
    validMetrics: validEval,
    trainMetricSeparation: separation,
    thresholdsSuggestion: {
      aiThreshold: best.threshold,
      note: 'Use this threshold in js/detection/thresholds.js and re-check with full valid/test.'
    }
  };

  fs.writeFileSync(path.join(base, cfg.reportPath), JSON.stringify(report, null, 2));

  console.log('\n==== Suggested threshold ====');
  console.log('aiThreshold:', best.threshold);
  console.log('Train F1:', trainEval.f1.toFixed(4), '| Valid F1:', validEval.f1.toFixed(4));
  console.log('Train Acc:', (trainEval.accuracy * 100).toFixed(2) + '%', '| Valid Acc:', (validEval.accuracy * 100).toFixed(2) + '%');
  console.log('\nReport written to:', cfg.reportPath);
}

main().catch((err) => {
  console.error('Calibration failed:', err);
  process.exitCode = 1;
});
