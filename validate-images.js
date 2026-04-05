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

function loadDetectorModules() {
  const base = __dirname;

  loadScriptAndExport(path.join(base, 'js/core/utils.js'), ['Utils']);
  loadScriptAndExport(path.join(base, 'js/core/statistics.js'), ['Statistics']);
  loadScriptAndExport(path.join(base, 'js/core/correlation.js'), ['Correlation']);
  loadScriptAndExport(path.join(base, 'js/core/preprocessing.js'), ['Preprocessing']);
  loadScriptAndExport(path.join(base, 'js/core/wavelet.js'), ['Wavelet']);
  loadScriptAndExport(path.join(base, 'js/features/featureExtractor.js'), ['FeatureExtractor']);
  loadScriptAndExport(path.join(base, 'js/detection/thresholds.js'), ['Thresholds']);
  loadScriptAndExport(path.join(base, 'js/detection/anomalyMetrics.js'), ['AnomalyMetrics']);
  loadScriptAndExport(path.join(base, 'js/detection/classifier.js'), ['Classifier']);
}

function inferGroundTruth(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.startsWith('ia')) return true;
  if (normalized.startsWith('real')) return false;
  return null;
}

async function imageToImageData(filePath, maxSize = 1024) {
  const img = await Jimp.read(filePath);

  let { width, height } = img.bitmap;
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
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
  const metrics = AnomalyMetrics.computeAll(features);
  const aiScore = Classifier.computeAIScore(metrics);
  const classification = Classifier.classify(aiScore, metrics);

  return {
    aiScore,
    ...classification,
    metrics
  };
}

function summarize(results) {
  const valid = results.filter((r) => r.actual !== null && !r.error);
  const total = valid.length;
  let correct = 0;
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const r of valid) {
    if (r.predicted === r.actual) correct += 1;
    if (r.predicted && r.actual) tp += 1;
    if (!r.predicted && !r.actual) tn += 1;
    if (r.predicted && !r.actual) fp += 1;
    if (!r.predicted && r.actual) fn += 1;
  }

  const accuracy = total ? (correct / total) * 100 : 0;

  return { total, correct, accuracy, tp, tn, fp, fn };
}

async function main() {
  loadDetectorModules();

  const imagesDir = path.join(__dirname, 'images');
  const files = fs
    .readdirSync(imagesDir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();

  const results = [];

  for (const file of files) {
    const fullPath = path.join(imagesDir, file);
    const actual = inferGroundTruth(file);

    try {
      const imageData = await imageToImageData(fullPath);
      const result = analyzeImage(imageData);

      results.push({
        file,
        actual,
        predicted: result.isAI,
        aiScore: Number(result.aiScore.toFixed(4)),
        confidence: result.confidence,
        metrics: Object.fromEntries(
          Object.entries(result.metrics).map(([k, v]) => [k, Number((v.score || 0).toFixed(4))])
        )
      });
    } catch (error) {
      results.push({ file, actual, error: error.message });
    }
  }

  const summary = summarize(results);

  console.log('VALIDATION_RESULTS_START');
  console.log(
    JSON.stringify(
      {
        threshold: Thresholds.classification.aiThreshold,
        summary,
        results
      },
      null,
      2
    )
  );
  console.log('VALIDATION_RESULTS_END');
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exitCode = 1;
});
