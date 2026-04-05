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

const FEATURE_KEYS = [
  'metric_energyDistribution',
  'metric_noisePattern',
  'metric_interScaleCorrelation',
  'metric_llSmoothness',
  'metric_hlLhRatio',
  'metric_midFrequencyGap',
  'metric_lbpPattern',
  'metric_dctBand',
  'metric_fftRadial',
  'metric_prnuResidual',
  'metric_residualCooccurrence',
  'summary_LL_ratio',
  'summary_HH_ratio',
  'summary_mid_ratio',
  'summary_HL_LH_ratio',
  'summary_HH_kurtosis',
  'summary_HH_entropy',
  'summary_LL_entropy',
  'summary_avg_entropy',
  'adv_lbp_entropy',
  'adv_lbp_uniformity',
  'adv_dct_midRatio',
  'adv_dct_highRatio',
  'adv_dct_slope',
  'adv_fft_radialSlope',
  'adv_fft_lowHighRatio',
  'adv_fft_flatness',
  'adv_prnu_strength',
  'adv_prnu_hfNoiseRatio',
  'adv_residual_kurtosis',
  'adv_glcm_contrast',
  'adv_glcm_homogeneity',
  'adv_glcm_energy',
  'adv_glcm_correlation',
  'wavelet_score'
];

function parseArgs() {
  const cfg = {
    datasetRoot: path.join('archive', 'real_vs_fake', 'real-vs-fake'),
    maxSize: 384,
    trainPerClass: 1200,
    validPerClass: 400,
    hiddenSize: 12,
    epochs: 45,
    learningRate: 0.02,
    seed: 42,
    modelPath: 'hybrid-model.json',
    reportPath: 'hybrid-training-report.json'
  };

  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.split('=');
    if (!k || v === undefined) continue;
    if (k === '--datasetRoot') cfg.datasetRoot = v;
    if (k === '--maxSize') cfg.maxSize = Number(v);
    if (k === '--trainPerClass') cfg.trainPerClass = Number(v);
    if (k === '--validPerClass') cfg.validPerClass = Number(v);
    if (k === '--hiddenSize') cfg.hiddenSize = Number(v);
    if (k === '--epochs') cfg.epochs = Number(v);
    if (k === '--learningRate') cfg.learningRate = Number(v);
    if (k === '--seed') cfg.seed = Number(v);
    if (k === '--modelPath') cfg.modelPath = v;
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

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
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

function featureVectorFromImageData(imageData) {
  const grayImage = Preprocessing.toGrayscale(imageData);
  const waveletCoeffs = Wavelet.dwt2D(grayImage, 3);
  const features = FeatureExtractor.extractAll(waveletCoeffs);
  const advancedFeatures = AdvancedFeatureExtractor.extract(grayImage);
  const metrics = AnomalyMetrics.computeAll(features, advancedFeatures);
  const summary = FeatureExtractor.summarize(features);
  const waveletScore = Classifier.computeAIScore(metrics);

  const m = (k) => clamp01(metrics[k]?.score ?? 0);
  const lbp = advancedFeatures?.lbp || {};
  const dct = advancedFeatures?.dct || {};
  const fft = advancedFeatures?.fft || {};
  const residual = advancedFeatures?.residual || {};
  const glcm = advancedFeatures?.glcm || {};

  const featureMap = {
    metric_energyDistribution: m('energyDistribution'),
    metric_noisePattern: m('noisePattern'),
    metric_interScaleCorrelation: m('interScaleCorrelation'),
    metric_llSmoothness: m('llSmoothness'),
    metric_hlLhRatio: m('hlLhRatio'),
    metric_midFrequencyGap: m('midFrequencyGap'),
    metric_lbpPattern: m('lbpPattern'),
    metric_dctBand: m('dctBand'),
    metric_fftRadial: m('fftRadial'),
    metric_prnuResidual: m('prnuResidual'),
    metric_residualCooccurrence: m('residualCooccurrence'),

    summary_LL_ratio: clamp01(summary.LL_ratio || 0),
    summary_HH_ratio: clamp01(summary.HH_ratio || 0),
    summary_mid_ratio: clamp01(summary.mid_ratio || 0),
    summary_HL_LH_ratio: clamp01(Math.min((summary.HL_LH_ratio || 0) / 3, 1)),
    summary_HH_kurtosis: clamp01(((summary.HH_kurtosis || 0) + 3) / 12),
    summary_HH_entropy: clamp01((summary.HH_entropy || 0) / 8),
    summary_LL_entropy: clamp01((summary.LL_entropy || 0) / 8),
    summary_avg_entropy: clamp01((summary.avg_entropy || 0) / 8),

    adv_lbp_entropy: clamp01((lbp.entropy || 0) / 4),
    adv_lbp_uniformity: clamp01(lbp.uniformity || 0),
    adv_dct_midRatio: clamp01(dct.midRatio || 0),
    adv_dct_highRatio: clamp01(dct.highRatio || 0),
    adv_dct_slope: clamp01(((dct.slope || -1) + 2) / 2),
    adv_fft_radialSlope: clamp01(((fft.radialSlope || -2) + 4) / 4),
    adv_fft_lowHighRatio: clamp01(Math.min((fft.lowHighRatio || 0) / 12, 1)),
    adv_fft_flatness: clamp01(fft.spectralFlatness || 0),
    adv_prnu_strength: clamp01(Math.min((residual.prnuStrength || 0) / 0.5, 1)),
    adv_prnu_hfNoiseRatio: clamp01(Math.min((residual.hfNoiseRatio || 0) / 0.4, 1)),
    adv_residual_kurtosis: clamp01(((residual.kurtosis || 0) + 3) / 12),
    adv_glcm_contrast: clamp01(Math.min((glcm.contrast || 0) / 5, 1)),
    adv_glcm_homogeneity: clamp01(glcm.homogeneity || 0),
    adv_glcm_energy: clamp01(Math.min((glcm.energy || 0) / 0.3, 1)),
    adv_glcm_correlation: clamp01(((glcm.correlation || 0) + 1) / 2),
    wavelet_score: clamp01(waveletScore)
  };

  const vector = FEATURE_KEYS.map((key) => featureMap[key] || 0);

  return {
    vector,
    featureMap,
    waveletScore
  };
}

async function buildDataset(files, label, maxSize) {
  const rows = [];
  let done = 0;

  for (const file of files) {
    try {
      const imageData = await imageToImageData(file, maxSize);
      const out = featureVectorFromImageData(imageData);
      rows.push({
        x: out.vector,
        y: label ? 1 : 0,
        waveletScore: out.waveletScore,
        file
      });
    } catch (error) {
      rows.push({ error: error.message, y: label ? 1 : 0, file });
    }

    done += 1;
    if (done % 100 === 0) {
      process.stdout.write(`\rProcessed ${done}/${files.length} (${label ? 'fake' : 'real'})`);
    }
  }

  process.stdout.write('\n');
  return rows.filter((r) => !r.error);
}

function fitNormalizer(rows) {
  const inputSize = rows[0].x.length;
  const mean = new Array(inputSize).fill(0);
  const std = new Array(inputSize).fill(0);

  for (const r of rows) {
    for (let i = 0; i < inputSize; i++) {
      mean[i] += r.x[i];
    }
  }
  for (let i = 0; i < inputSize; i++) {
    mean[i] /= rows.length;
  }

  for (const r of rows) {
    for (let i = 0; i < inputSize; i++) {
      const d = r.x[i] - mean[i];
      std[i] += d * d;
    }
  }

  for (let i = 0; i < inputSize; i++) {
    std[i] = Math.sqrt(std[i] / rows.length) || 1;
  }

  return { mean, std };
}

function normalizeRows(rows, mean, std) {
  return rows.map((r) => ({
    ...r,
    xn: r.x.map((v, i) => (v - mean[i]) / (std[i] + 1e-8))
  }));
}

function initModel(inputSize, hiddenSize, seed) {
  const rnd = mulberry32(seed);

  const W1 = Array.from({ length: hiddenSize }, () =>
    Array.from({ length: inputSize }, () => (rnd() - 0.5) * 0.15)
  );
  const b1 = new Array(hiddenSize).fill(0);
  const W2 = Array.from({ length: hiddenSize }, () => (rnd() - 0.5) * 0.15);
  const b2 = 0;

  return { W1, b1, W2, b2, inputSize, hiddenSize };
}

function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function relu(x) {
  return x > 0 ? x : 0;
}

function reluDeriv(x) {
  return x > 0 ? 1 : 0;
}

function forward(model, x) {
  const z1 = new Array(model.hiddenSize).fill(0);
  const a1 = new Array(model.hiddenSize).fill(0);

  for (let h = 0; h < model.hiddenSize; h++) {
    let z = model.b1[h];
    for (let i = 0; i < model.inputSize; i++) {
      z += model.W1[h][i] * x[i];
    }
    z1[h] = z;
    a1[h] = relu(z);
  }

  let z2 = model.b2;
  for (let h = 0; h < model.hiddenSize; h++) {
    z2 += model.W2[h] * a1[h];
  }

  const p = sigmoid(z2);
  return { z1, a1, z2, p };
}

function trainNN(model, rows, epochs, lr) {
  const n = rows.length;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const dW1 = Array.from({ length: model.hiddenSize }, () => new Array(model.inputSize).fill(0));
    const db1 = new Array(model.hiddenSize).fill(0);
    const dW2 = new Array(model.hiddenSize).fill(0);
    let db2 = 0;

    let loss = 0;

    for (const r of rows) {
      const x = r.xn;
      const y = r.y;
      const cache = forward(model, x);
      const p = Math.min(Math.max(cache.p, 1e-7), 1 - 1e-7);

      loss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));

      const dz2 = p - y;
      for (let h = 0; h < model.hiddenSize; h++) {
        dW2[h] += dz2 * cache.a1[h];
      }
      db2 += dz2;

      for (let h = 0; h < model.hiddenSize; h++) {
        const dz1 = dz2 * model.W2[h] * reluDeriv(cache.z1[h]);
        db1[h] += dz1;
        for (let i = 0; i < model.inputSize; i++) {
          dW1[h][i] += dz1 * x[i];
        }
      }
    }

    const scale = lr / n;
    for (let h = 0; h < model.hiddenSize; h++) {
      model.W2[h] -= scale * dW2[h];
    }
    model.b2 -= scale * db2;

    for (let h = 0; h < model.hiddenSize; h++) {
      model.b1[h] -= scale * db1[h];
      for (let i = 0; i < model.inputSize; i++) {
        model.W1[h][i] -= scale * dW1[h][i];
      }
    }

    if (epoch % 5 === 0 || epoch === 1 || epoch === epochs) {
      console.log(`Epoch ${epoch}/${epochs} - loss: ${(loss / n).toFixed(4)}`);
    }
  }

  return model;
}

function predictNN(model, x) {
  return forward(model, x).p;
}

function confusion(rows, threshold, scoreFn) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const r of rows) {
    const score = scoreFn(r);
    const pred = score > threshold;
    const actual = r.y === 1;

    if (pred && actual) tp += 1;
    if (!pred && !actual) tn += 1;
    if (pred && !actual) fp += 1;
    if (!pred && actual) fn += 1;
  }

  const total = tp + tn + fp + fn;
  const accuracy = total ? (tp + tn) / total : 0;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return { tp, tn, fp, fn, total, accuracy, precision, recall, f1 };
}

function searchBlendAndThreshold(rows, nnScores) {
  let best = null;

  for (let alpha = 0; alpha <= 1.00001; alpha += 0.05) {
    const a = Number(alpha.toFixed(2));
    for (let t = 0.2; t <= 0.9; t += 0.01) {
      const threshold = Number(t.toFixed(2));
      const cm = confusion(rows, threshold, (r) =>
        clamp01(a * nnScores.get(r.file) + (1 - a) * r.waveletScore)
      );

      if (!best || cm.f1 > best.cm.f1 || (cm.f1 === best.cm.f1 && cm.accuracy > best.cm.accuracy)) {
        best = { alpha: a, threshold, cm };
      }
    }
  }

  return best;
}

async function main() {
  const cfg = parseArgs();
  const base = process.cwd();
  loadDetectorModules(base);

  const trainRealDir = path.join(base, cfg.datasetRoot, 'train', 'real');
  const trainFakeDir = path.join(base, cfg.datasetRoot, 'train', 'fake');
  const validRealDir = path.join(base, cfg.datasetRoot, 'valid', 'real');
  const validFakeDir = path.join(base, cfg.datasetRoot, 'valid', 'fake');

  const trainReal = sampleArray(listImageFiles(trainRealDir), cfg.trainPerClass, cfg.seed + 3);
  const trainFake = sampleArray(listImageFiles(trainFakeDir), cfg.trainPerClass, cfg.seed + 5);
  const validReal = sampleArray(listImageFiles(validRealDir), cfg.validPerClass, cfg.seed + 7);
  const validFake = sampleArray(listImageFiles(validFakeDir), cfg.validPerClass, cfg.seed + 11);

  console.log('Training config:', cfg);
  console.log('Train samples per class:', trainReal.length, trainFake.length);
  console.log('Valid samples per class:', validReal.length, validFake.length);

  const trainRows = [
    ...(await buildDataset(trainReal, false, cfg.maxSize)),
    ...(await buildDataset(trainFake, true, cfg.maxSize))
  ];

  const validRows = [
    ...(await buildDataset(validReal, false, cfg.maxSize)),
    ...(await buildDataset(validFake, true, cfg.maxSize))
  ];

  const { mean, std } = fitNormalizer(trainRows);
  const trainNorm = normalizeRows(trainRows, mean, std);
  const validNorm = normalizeRows(validRows, mean, std);

  const inputSize = trainNorm[0].xn.length;
  const model = initModel(inputSize, cfg.hiddenSize, cfg.seed + 101);
  trainNN(model, trainNorm, cfg.epochs, cfg.learningRate);

  const trainNNScores = new Map();
  const validNNScores = new Map();

  for (const r of trainNorm) trainNNScores.set(r.file, predictNN(model, r.xn));
  for (const r of validNorm) validNNScores.set(r.file, predictNN(model, r.xn));

  const bestTrain = searchBlendAndThreshold(trainNorm, trainNNScores);
  const trainEval = confusion(trainNorm, bestTrain.threshold, (r) =>
    clamp01(bestTrain.alpha * trainNNScores.get(r.file) + (1 - bestTrain.alpha) * r.waveletScore)
  );

  const validEval = confusion(validNorm, bestTrain.threshold, (r) =>
    clamp01(bestTrain.alpha * validNNScores.get(r.file) + (1 - bestTrain.alpha) * r.waveletScore)
  );

  const exportModel = {
    version: '2.0.0-hybrid',
    inputSize,
    hiddenSize: model.hiddenSize,
    mean,
    std,
    W1: model.W1,
    b1: model.b1,
    W2: model.W2,
    b2: model.b2,
    featureKeys: FEATURE_KEYS,
    blendAlpha: bestTrain.alpha,
    threshold: bestTrain.threshold,
    trainedAt: new Date().toISOString()
  };

  const report = {
    config: cfg,
    blendAlpha: bestTrain.alpha,
    threshold: bestTrain.threshold,
    trainMetrics: trainEval,
    validMetrics: validEval,
    note: 'Use with js/detection/hybridModel.js as complement to wavelet score.'
  };

  fs.writeFileSync(path.join(base, cfg.modelPath), JSON.stringify(exportModel, null, 2));
  fs.writeFileSync(path.join(base, cfg.reportPath), JSON.stringify(report, null, 2));

  console.log('\n==== Hybrid model trained ====');
  console.log('blendAlpha:', bestTrain.alpha);
  console.log('threshold:', bestTrain.threshold);
  console.log('Train F1:', trainEval.f1.toFixed(4), '| Valid F1:', validEval.f1.toFixed(4));
  console.log('Train Acc:', (trainEval.accuracy * 100).toFixed(2) + '%', '| Valid Acc:', (validEval.accuracy * 100).toFixed(2) + '%');
  console.log('Saved model:', cfg.modelPath);
  console.log('Saved report:', cfg.reportPath);
}

main().catch((error) => {
  console.error('Hybrid training failed:', error);
  process.exitCode = 1;
});
