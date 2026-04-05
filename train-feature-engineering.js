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
  loadScriptAndExport(path.join(base, 'js/features/regionalFeatureExtractor.js'), ['RegionalFeatureExtractor']);
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
  'reg_lab_distance',
  'reg_sharpness_ratio',
  'reg_contour_gradient',
  'reg_skin_lbp_diff',
  'reg_skin_glcm_diff',
  'reg_noise_consistency',
  'reg_fft_profile_diff',
  'reg_local_contrast_ratio',
  'reg_jpeg_block_inconsistency',
  'col_hist_entropy',
  'col_hist_uniformity',
  'col_hist_spread',
  'illum_consistency',
  'illum_uniformity',
  'edge_uniformity',
  'edge_sharpness',
  'edge_density',
  'wavelet_score'
];

function makePixelKeys(pixelInputSize) {
  const keys = [];
  const total = pixelInputSize * pixelInputSize;
  for (let i = 0; i < total; i++) {
    keys.push(`px_${String(i).padStart(4, '0')}`);
  }
  return keys;
}

function makeSurfKeys(surfDescriptorSize) {
  const keys = [];
  const total = Math.max(0, Math.min(64, Number(surfDescriptorSize) || 0));
  for (let i = 0; i < total; i++) {
    keys.push(`surf_${String(i).padStart(4, '0')}`);
  }
  return keys;
}

function parseArgs() {
  const cfg = {
    datasetRoot: path.join('archive', 'real_vs_fake', 'real-vs-fake'),
    maxSize: 256,
    trainPerClass: 1200,
    validPerClass: 600,
    seed: 42,
    topK: 20,
    ablationDeltaMin: 0.001,
    minFinalFeatures: 8,
    thresholdObjective: 'balancedAccuracy',
    modelSelectionObjective: 'balancedAccuracy',
    pixelInputSize: 0,
    surfDescriptorSize: 0,
    logisticEpochs: 180,
    logisticLR: 0.05,
    nnHidden: 18,
    nnEpochs: 80,
    nnLR: 0.01,
    rfTrees: 160,
    rfMaxDepth: 8,
    rfMinSamplesSplit: 24,
    rfFeatureFraction: 0.35,
    modelPath: 'hybrid-model.feature-engineered.json',
    reportPath: 'feature-engineering-report.json'
  };

  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.split('=');
    if (!k || v === undefined) continue;
    if (k === '--datasetRoot') cfg.datasetRoot = v;
    if (k === '--maxSize') cfg.maxSize = Number(v);
    if (k === '--trainPerClass') cfg.trainPerClass = Number(v);
    if (k === '--validPerClass') cfg.validPerClass = Number(v);
    if (k === '--seed') cfg.seed = Number(v);
    if (k === '--topK') cfg.topK = Number(v);
    if (k === '--ablationDeltaMin') cfg.ablationDeltaMin = Number(v);
    if (k === '--minFinalFeatures') cfg.minFinalFeatures = Number(v);
    if (k === '--thresholdObjective') cfg.thresholdObjective = v;
    if (k === '--modelSelectionObjective') cfg.modelSelectionObjective = v;
    if (k === '--pixelInputSize') cfg.pixelInputSize = Number(v);
    if (k === '--surfDescriptorSize') cfg.surfDescriptorSize = Number(v);
    if (k === '--logisticEpochs') cfg.logisticEpochs = Number(v);
    if (k === '--logisticLR') cfg.logisticLR = Number(v);
    if (k === '--nnHidden') cfg.nnHidden = Number(v);
    if (k === '--nnEpochs') cfg.nnEpochs = Number(v);
    if (k === '--nnLR') cfg.nnLR = Number(v);
    if (k === '--rfTrees') cfg.rfTrees = Number(v);
    if (k === '--rfMaxDepth') cfg.rfMaxDepth = Number(v);
    if (k === '--rfMinSamplesSplit') cfg.rfMinSamplesSplit = Number(v);
    if (k === '--rfFeatureFraction') cfg.rfFeatureFraction = Number(v);
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

function resizeNearestGray(grayImage, targetW, targetH) {
  const src = grayImage.data;
  const srcW = grayImage.width;
  const srcH = grayImage.height;
  const out = new Float32Array(targetW * targetH);

  const xRatio = srcW / targetW;
  const yRatio = srcH / targetH;

  for (let y = 0; y < targetH; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(y * yRatio));
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x * xRatio));
      out[y * targetW + x] = src[srcY * srcW + srcX] / 255;
    }
  }

  return out;
}

function extractPixelFeatureMap(grayImage, pixelInputSize) {
  if (!Number.isInteger(pixelInputSize) || pixelInputSize <= 0) {
    return {};
  }

  const vec = resizeNearestGray(grayImage, pixelInputSize, pixelInputSize);
  const mean = vec.reduce((a, b) => a + b, 0) / (vec.length || 1);
  const map = {};
  for (let i = 0; i < vec.length; i++) {
    map[`px_${String(i).padStart(4, '0')}`] = clamp01(vec[i] - mean + 0.5);
  }
  return map;
}

function extractSurfFeatureMap(surfLikeVector, surfDescriptorSize) {
  if (!Number.isInteger(surfDescriptorSize) || surfDescriptorSize <= 0) {
    return {};
  }

  const size = Math.max(0, Math.min(64, surfDescriptorSize));
  const vec = Array.isArray(surfLikeVector) ? surfLikeVector : [];
  const map = {};

  for (let i = 0; i < size; i++) {
    const value = Number.isFinite(vec[i]) ? vec[i] : 0;
    map[`surf_${String(i).padStart(4, '0')}`] = clamp01(value);
  }

  return map;
}

function featureMapFromImageData(imageData, pixelInputSize = 0, surfDescriptorSize = 0) {
  const grayImage = Preprocessing.toGrayscale(imageData);
  const waveletCoeffs = Wavelet.dwt2D(grayImage, 3);
  const features = FeatureExtractor.extractAll(waveletCoeffs);
  const advancedFeatures = AdvancedFeatureExtractor.extract(grayImage, imageData, { surfDescriptorSize });
  const metrics = AnomalyMetrics.computeAll(features, advancedFeatures);
  const summary = FeatureExtractor.summarize(features);
  const waveletScore = Classifier.computeAIScore(metrics);

  const m = (k) => clamp01(metrics[k]?.score ?? 0);
  const lbp = advancedFeatures?.lbp || {};
  const dct = advancedFeatures?.dct || {};
  const fft = advancedFeatures?.fft || {};
  const residual = advancedFeatures?.residual || {};
  const glcm = advancedFeatures?.glcm || {};
  const regional = advancedFeatures?.regional || {};

  const baseMap = {
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

    reg_lab_distance: clamp01(Math.min((regional.labDistance || 0) / 50, 1)),
    reg_sharpness_ratio: clamp01(Math.min((regional.sharpnessRatio || 0) / 3, 1)),
    reg_contour_gradient: clamp01(Math.min((regional.contourGradient || 0) / 120, 1)),
    reg_skin_lbp_diff: clamp01(((regional.skinLbpDiff || 0) + 3) / 6),
    reg_skin_glcm_diff: clamp01(((regional.skinGlcmDiff || 0) + 20) / 40),
    reg_noise_consistency: clamp01(regional.noiseConsistency || 0),
    reg_fft_profile_diff: clamp01(((regional.fftProfileDiff || 0) + 2.5) / 5),
    reg_local_contrast_ratio: clamp01(Math.min((regional.localContrastRatio || 0) / 3, 1)),
    reg_jpeg_block_inconsistency: clamp01(Math.min((regional.jpegBlockInconsistency || 0) / 3, 1)),

    wavelet_score: clamp01(waveletScore)
  };

  if (surfDescriptorSize > 0) {
    return {
      ...baseMap,
      ...extractSurfFeatureMap(advancedFeatures?.surfLike, surfDescriptorSize)
    };
  }

  if (pixelInputSize > 0) {
    return {
      ...baseMap,
      ...extractPixelFeatureMap(grayImage, pixelInputSize)
    };
  }

  return baseMap;
}

async function buildDataset(files, label, maxSize, pixelInputSize = 0, surfDescriptorSize = 0) {
  const rows = [];
  let done = 0;

  for (const file of files) {
    try {
      const imageData = await imageToImageData(file, maxSize);
      const fmap = featureMapFromImageData(imageData, pixelInputSize, surfDescriptorSize);
      rows.push({
        file,
        y: label ? 1 : 0,
        featureMap: fmap
      });
    } catch (error) {
      rows.push({ file, y: label ? 1 : 0, error: error.message });
    }

    done += 1;
    if (done % 100 === 0) {
      process.stdout.write(`\rProcessed ${done}/${files.length} (${label ? 'fake' : 'real'})`);
    }
  }

  process.stdout.write('\n');
  return rows.filter((r) => !r.error);
}

function toMatrix(rows, featureKeys) {
  return rows.map((r) => featureKeys.map((k) => r.featureMap[k] || 0));
}

function fitNormalizer(X) {
  const n = X.length;
  const p = X[0].length;
  const mean = new Array(p).fill(0);
  const std = new Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) mean[j] += X[i][j];
  }
  for (let j = 0; j < p; j++) mean[j] /= n;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      const d = X[i][j] - mean[j];
      std[j] += d * d;
    }
  }
  for (let j = 0; j < p; j++) std[j] = Math.sqrt(std[j] / n) || 1;

  return { mean, std };
}

function normalizeMatrix(X, mean, std) {
  return X.map((row) => row.map((v, j) => (v - mean[j]) / (std[j] + 1e-8)));
}

function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function predictLogisticRow(row, w, b) {
  let z = b;
  for (let j = 0; j < row.length; j++) z += w[j] * row[j];
  return sigmoid(z);
}

function trainLogistic(X, y, epochs, lr, l2 = 0.0005) {
  const n = X.length;
  const p = X[0].length;
  const w = new Array(p).fill(0);
  let b = 0;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const dw = new Array(p).fill(0);
    let db = 0;
    let loss = 0;

    for (let i = 0; i < n; i++) {
      const pred = predictLogisticRow(X[i], w, b);
      const yy = y[i];
      const e = pred - yy;

      for (let j = 0; j < p; j++) {
        dw[j] += e * X[i][j];
      }
      db += e;

      const pp = Math.min(Math.max(pred, 1e-7), 1 - 1e-7);
      loss += -(yy * Math.log(pp) + (1 - yy) * Math.log(1 - pp));
    }

    const scale = lr / n;
    for (let j = 0; j < p; j++) {
      w[j] -= scale * (dw[j] + l2 * w[j]);
    }
    b -= scale * db;

    if (epoch % 20 === 0 || epoch === 1 || epoch === epochs) {
      console.log(`Logistic epoch ${epoch}/${epochs} - loss: ${(loss / n).toFixed(4)}`);
    }
  }

  return { w, b };
}

function relu(x) {
  return x > 0 ? x : 0;
}

function reluDeriv(x) {
  return x > 0 ? 1 : 0;
}

function initNN(inputSize, hiddenSize, seed) {
  const rnd = mulberry32(seed);
  const W1 = Array.from({ length: hiddenSize }, () =>
    Array.from({ length: inputSize }, () => (rnd() - 0.5) * 0.12)
  );
  const b1 = new Array(hiddenSize).fill(0);
  const W2 = Array.from({ length: hiddenSize }, () => (rnd() - 0.5) * 0.12);
  const b2 = 0;
  return { W1, b1, W2, b2, inputSize, hiddenSize };
}

function forwardNN(model, x) {
  const z1 = new Array(model.hiddenSize).fill(0);
  const a1 = new Array(model.hiddenSize).fill(0);

  for (let h = 0; h < model.hiddenSize; h++) {
    let z = model.b1[h];
    for (let j = 0; j < model.inputSize; j++) z += model.W1[h][j] * x[j];
    z1[h] = z;
    a1[h] = relu(z);
  }

  let z2 = model.b2;
  for (let h = 0; h < model.hiddenSize; h++) z2 += model.W2[h] * a1[h];
  const p = sigmoid(z2);
  return { z1, a1, p };
}

function trainNN(model, X, y, epochs, lr) {
  const n = X.length;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const dW1 = Array.from({ length: model.hiddenSize }, () => new Array(model.inputSize).fill(0));
    const db1 = new Array(model.hiddenSize).fill(0);
    const dW2 = new Array(model.hiddenSize).fill(0);
    let db2 = 0;
    let loss = 0;

    for (let i = 0; i < n; i++) {
      const cache = forwardNN(model, X[i]);
      const p = Math.min(Math.max(cache.p, 1e-7), 1 - 1e-7);
      const yy = y[i];
      const dz2 = p - yy;

      loss += -(yy * Math.log(p) + (1 - yy) * Math.log(1 - p));

      for (let h = 0; h < model.hiddenSize; h++) dW2[h] += dz2 * cache.a1[h];
      db2 += dz2;

      for (let h = 0; h < model.hiddenSize; h++) {
        const dz1 = dz2 * model.W2[h] * reluDeriv(cache.z1[h]);
        db1[h] += dz1;
        for (let j = 0; j < model.inputSize; j++) dW1[h][j] += dz1 * X[i][j];
      }
    }

    const scale = lr / n;
    for (let h = 0; h < model.hiddenSize; h++) model.W2[h] -= scale * dW2[h];
    model.b2 -= scale * db2;

    for (let h = 0; h < model.hiddenSize; h++) {
      model.b1[h] -= scale * db1[h];
      for (let j = 0; j < model.inputSize; j++) model.W1[h][j] -= scale * dW1[h][j];
    }

    if (epoch % 20 === 0 || epoch === 1 || epoch === epochs) {
      console.log(`NN epoch ${epoch}/${epochs} - loss: ${(loss / n).toFixed(4)}`);
    }
  }

  return model;
}

function confusionFromScores(scores, y, threshold) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (let i = 0; i < scores.length; i++) {
    const pred = scores[i] > threshold;
    const actual = y[i] === 1;
    if (pred && actual) tp += 1;
    if (!pred && !actual) tn += 1;
    if (pred && !actual) fp += 1;
    if (!pred && actual) fn += 1;
  }

  const total = tp + tn + fp + fn;
  const accuracy = total ? (tp + tn) / total : 0;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const specificity = tn + fp ? tn / (tn + fp) : 0;
  const balancedAccuracy = (recall + specificity) / 2;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return { tp, tn, fp, fn, total, accuracy, precision, recall, specificity, balancedAccuracy, f1 };
}

function rocCurvePoints(scores, y) {
  // Generar puntos ROC para todos los thresholds únicos
  const sorted = scores
    .map((s, i) => ({ score: s, label: y[i] }))
    .sort((a, b) => b.score - a.score);

  const thresholds = new Set(sorted.map(p => p.score));
  thresholds.add(0);
  thresholds.add(1);

  const points = [];
  for (const t of Array.from(thresholds).sort((a, b) => b - a)) {
    const cm = confusionFromScores(scores, y, t);
    points.push({
      threshold: t,
      tpr: cm.recall,
      fpr: cm.recall > 0 || cm.specificity > 0 ? 1 - cm.specificity : 0,
      cm
    });
  }
  return points;
}

function calculateAUC(rocPoints) {
  let auc = 0;
  for (let i = 0; i < rocPoints.length - 1; i++) {
    const x1 = rocPoints[i].fpr;
    const x2 = rocPoints[i + 1].fpr;
    const y1 = rocPoints[i].tpr;
    const y2 = rocPoints[i + 1].tpr;
    auc += Math.abs(x2 - x1) * (y1 + y2) / 2;
  }
  return auc;
}

function bestThreshold(scores, y, objective = 'balancedAccuracy', min = 0.1, max = 0.9, step = 0.01) {
  const rocPoints = rocCurvePoints(scores, y);
  
  let best = null;
  for (const point of rocPoints) {
    const cm = point.cm;
    const score = Number.isFinite(cm[objective]) ? cm[objective] : cm.balancedAccuracy;
    
    if (!best || score > best.score || (score === best.score && cm.f1 > best.cm.f1)) {
      best = { threshold: point.threshold, cm, tpr: point.tpr, fpr: point.fpr };
      best.score = score;
    }
  }
  
  if (!best) {
    best = { threshold: 0.5, cm: confusionFromScores(scores, y, 0.5), score: 0 };
  }
  
  best.auc = calculateAUC(rocPoints);
  return best;
}

function pointBiserialImportance(X, y, featureKeys) {
  const n = X.length;
  const p = featureKeys.length;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const yStd = Math.sqrt(y.reduce((s, v) => s + (v - yMean) * (v - yMean), 0) / n) || 1;

  const rows = [];
  for (let j = 0; j < p; j++) {
    let xMean = 0;
    for (let i = 0; i < n; i++) xMean += X[i][j];
    xMean /= n;

    let xStd = 0;
    for (let i = 0; i < n; i++) xStd += (X[i][j] - xMean) * (X[i][j] - xMean);
    xStd = Math.sqrt(xStd / n) || 1;

    let cov = 0;
    for (let i = 0; i < n; i++) cov += (X[i][j] - xMean) * (y[i] - yMean);
    cov /= n;

    const corr = cov / (xStd * yStd + 1e-12);
    rows.push({ feature: featureKeys[j], importance: Math.abs(corr), corr });
  }

  rows.sort((a, b) => b.importance - a.importance);
  return rows;
}

function evaluateLogistic(trainX, trainY, validX, validY, epochs, lr, thresholdObjective) {
  const model = trainLogistic(trainX, trainY, epochs, lr);
  const trainScores = trainX.map((r) => predictLogisticRow(r, model.w, model.b));
  const validScores = validX.map((r) => predictLogisticRow(r, model.w, model.b));

  const bestTrain = bestThreshold(trainScores, trainY, thresholdObjective);
  const trainMetrics = confusionFromScores(trainScores, trainY, bestTrain.threshold);
  const validMetrics = confusionFromScores(validScores, validY, bestTrain.threshold);

  return {
    model,
    threshold: bestTrain.threshold,
    trainMetrics,
    validMetrics,
    validScores
  };
}

function evaluateNN(trainX, trainY, validX, validY, hiddenSize, epochs, lr, seed, thresholdObjective) {
  const model = initNN(trainX[0].length, hiddenSize, seed + 101);
  trainNN(model, trainX, trainY, epochs, lr);

  const trainScores = trainX.map((r) => forwardNN(model, r).p);
  const validScores = validX.map((r) => forwardNN(model, r).p);

  const bestTrain = bestThreshold(trainScores, trainY, thresholdObjective);
  const trainMetrics = confusionFromScores(trainScores, trainY, bestTrain.threshold);
  const validMetrics = confusionFromScores(validScores, validY, bestTrain.threshold);

  return {
    model,
    threshold: bestTrain.threshold,
    trainMetrics,
    validMetrics,
    validScores
  };
}

function giniImpurity(labels) {
  const n = labels.length;
  if (!n) return 0;
  let ones = 0;
  for (let i = 0; i < n; i++) ones += labels[i] ? 1 : 0;
  const p1 = ones / n;
  const p0 = 1 - p1;
  return 1 - (p1 * p1 + p0 * p0);
}

function bootstrapIndices(n, rnd) {
  const idx = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = Math.floor(rnd() * n);
  return idx;
}

function randomFeatureSubset(total, fraction, rnd) {
  const take = Math.max(1, Math.floor(total * fraction));
  const all = Array.from({ length: total }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, take);
}

function bestRandomSplit(X, y, indices, featureSubset, rnd) {
  let best = null;
  const parentLabels = indices.map((i) => y[i]);
  const parentGini = giniImpurity(parentLabels);
  if (parentGini === 0) return null;

  for (const f of featureSubset) {
    const values = indices.map((i) => X[i][f]);
    let minV = values[0];
    let maxV = values[0];
    for (let i = 1; i < values.length; i++) {
      if (values[i] < minV) minV = values[i];
      if (values[i] > maxV) maxV = values[i];
    }
    if (!Number.isFinite(minV) || !Number.isFinite(maxV) || maxV - minV < 1e-9) continue;

    const tries = Math.min(18, Math.max(6, Math.floor(Math.sqrt(values.length))));
    for (let t = 0; t < tries; t++) {
      const threshold = minV + rnd() * (maxV - minV);
      const left = [];
      const right = [];
      for (const rowIdx of indices) {
        if (X[rowIdx][f] <= threshold) left.push(rowIdx);
        else right.push(rowIdx);
      }

      if (!left.length || !right.length) continue;

      const leftG = giniImpurity(left.map((i) => y[i]));
      const rightG = giniImpurity(right.map((i) => y[i]));
      const weighted = (left.length / indices.length) * leftG + (right.length / indices.length) * rightG;
      const gain = parentGini - weighted;

      if (!best || gain > best.gain) {
        best = { feature: f, threshold, left, right, gain };
      }
    }
  }

  return best;
}

function buildRFTree(X, y, indices, depth, cfg, rnd) {
  const labels = indices.map((i) => y[i]);
  const n = labels.length;
  const p = labels.reduce((a, b) => a + (b ? 1 : 0), 0) / (n || 1);

  if (depth >= cfg.rfMaxDepth || n < cfg.rfMinSamplesSplit || p <= 0 || p >= 1) {
    return { leaf: true, prob: p };
  }

  const featureSubset = randomFeatureSubset(X[0].length, cfg.rfFeatureFraction, rnd);
  const split = bestRandomSplit(X, y, indices, featureSubset, rnd);

  if (!split || split.gain <= 1e-7) {
    return { leaf: true, prob: p };
  }

  return {
    leaf: false,
    feature: split.feature,
    threshold: split.threshold,
    left: buildRFTree(X, y, split.left, depth + 1, cfg, rnd),
    right: buildRFTree(X, y, split.right, depth + 1, cfg, rnd)
  };
}

function predictRFTree(tree, row) {
  let node = tree;
  while (!node.leaf) {
    node = row[node.feature] <= node.threshold ? node.left : node.right;
  }
  return node.prob;
}

function trainRandomForest(trainX, trainY, cfg) {
  const rnd = mulberry32(cfg.seed + 909);
  const trees = [];

  for (let t = 0; t < cfg.rfTrees; t++) {
    const idx = bootstrapIndices(trainX.length, rnd);
    trees.push(buildRFTree(trainX, trainY, idx, 0, cfg, rnd));
    if ((t + 1) % 20 === 0 || t === cfg.rfTrees - 1) {
      console.log(`RF tree ${t + 1}/${cfg.rfTrees}`);
    }
  }

  return { trees };
}

function predictRF(model, X) {
  return X.map((row) => {
    let sum = 0;
    for (const tree of model.trees) sum += predictRFTree(tree, row);
    return sum / (model.trees.length || 1);
  });
}

function evaluateRF(trainX, trainY, validX, validY, cfg, thresholdObjective) {
  const model = trainRandomForest(trainX, trainY, cfg);
  const trainScores = predictRF(model, trainX);
  const validScores = predictRF(model, validX);

  const bestTrain = bestThreshold(trainScores, trainY, thresholdObjective);
  const trainMetrics = confusionFromScores(trainScores, trainY, bestTrain.threshold);
  const validMetrics = confusionFromScores(validScores, validY, bestTrain.threshold);

  return {
    model,
    threshold: bestTrain.threshold,
    trainMetrics,
    validMetrics,
    validScores
  };
}

function subsetMatrix(X, indices) {
  return X.map((row) => indices.map((idx) => row[idx]));
}

function ablationByFeature(trainX, trainY, validX, validY, selectedFeatures, featureToIndex, cfg) {
  const baselineIndices = selectedFeatures.map((f) => featureToIndex.get(f));
  const baseTrain = subsetMatrix(trainX, baselineIndices);
  const baseValid = subsetMatrix(validX, baselineIndices);
  const baseEval = evaluateLogistic(
    baseTrain,
    trainY,
    baseValid,
    validY,
    cfg.logisticEpochs,
    cfg.logisticLR,
    cfg.thresholdObjective
  );

  const rows = [];
  for (const feature of selectedFeatures) {
    const reduced = selectedFeatures.filter((f) => f !== feature);
    if (!reduced.length) continue;

    const idx = reduced.map((f) => featureToIndex.get(f));
    const tr = subsetMatrix(trainX, idx);
    const va = subsetMatrix(validX, idx);
    const ev = evaluateLogistic(
      tr,
      trainY,
      va,
      validY,
      cfg.logisticEpochs,
      cfg.logisticLR,
      cfg.thresholdObjective
    );

    rows.push({
      feature,
      validF1Without: ev.validMetrics.f1,
      deltaF1: baseEval.validMetrics.f1 - ev.validMetrics.f1
    });
  }

  rows.sort((a, b) => b.deltaF1 - a.deltaF1);
  return {
    baselineF1: baseEval.validMetrics.f1,
    rows
  };
}

function computeSelectedIndices(keys, featureToIndex) {
  return keys.map((k) => featureToIndex.get(k)).filter((v) => Number.isInteger(v));
}

function metricFromValid(validMetrics, objective) {
  const value = validMetrics?.[objective];
  if (Number.isFinite(value)) return value;
  return Number.isFinite(validMetrics?.balancedAccuracy) ? validMetrics.balancedAccuracy : 0;
}

async function main() {
  const cfg = parseArgs();
  const base = process.cwd();
  loadDetectorModules(base);

  const pixelKeys = cfg.pixelInputSize > 0 ? makePixelKeys(cfg.pixelInputSize) : [];
  const surfKeys = cfg.surfDescriptorSize > 0 ? makeSurfKeys(cfg.surfDescriptorSize) : [];
  const featureKeys = [...FEATURE_KEYS, ...(surfKeys.length ? surfKeys : pixelKeys)];

  const trainRealDir = path.join(base, cfg.datasetRoot, 'train', 'real');
  const trainFakeDir = path.join(base, cfg.datasetRoot, 'train', 'fake');
  const validRealDir = path.join(base, cfg.datasetRoot, 'valid', 'real');
  const validFakeDir = path.join(base, cfg.datasetRoot, 'valid', 'fake');

  const trainReal = sampleArray(listImageFiles(trainRealDir), cfg.trainPerClass, cfg.seed + 3);
  const trainFake = sampleArray(listImageFiles(trainFakeDir), cfg.trainPerClass, cfg.seed + 5);
  const validReal = sampleArray(listImageFiles(validRealDir), cfg.validPerClass, cfg.seed + 7);
  const validFake = sampleArray(listImageFiles(validFakeDir), cfg.validPerClass, cfg.seed + 11);

  console.log('Feature engineering config:', cfg);
  console.log('Train samples per class:', trainReal.length, trainFake.length);
  console.log('Valid samples per class:', validReal.length, validFake.length);

  const trainRows = [
    ...(await buildDataset(trainReal, false, cfg.maxSize, cfg.pixelInputSize, cfg.surfDescriptorSize)),
    ...(await buildDataset(trainFake, true, cfg.maxSize, cfg.pixelInputSize, cfg.surfDescriptorSize))
  ];
  const validRows = [
    ...(await buildDataset(validReal, false, cfg.maxSize, cfg.pixelInputSize, cfg.surfDescriptorSize)),
    ...(await buildDataset(validFake, true, cfg.maxSize, cfg.pixelInputSize, cfg.surfDescriptorSize))
  ];

  const trainY = trainRows.map((r) => r.y);
  const validY = validRows.map((r) => r.y);

  const trainXRaw = toMatrix(trainRows, featureKeys);
  const validXRaw = toMatrix(validRows, featureKeys);

  const { mean, std } = fitNormalizer(trainXRaw);
  const trainX = normalizeMatrix(trainXRaw, mean, std);
  const validX = normalizeMatrix(validXRaw, mean, std);

  const ranking = pointBiserialImportance(trainX, trainY, featureKeys);
  const selectedFeatures = ranking.slice(0, Math.min(cfg.topK, ranking.length)).map((r) => r.feature);

  const featureToIndex = new Map(featureKeys.map((k, i) => [k, i]));
  const selectedIndices = computeSelectedIndices(selectedFeatures, featureToIndex);

  const trainSel = subsetMatrix(trainX, selectedIndices);
  const validSel = subsetMatrix(validX, selectedIndices);

  console.log('Top selected features:', selectedFeatures.slice(0, 10));

  const logisticEval = evaluateLogistic(
    trainSel,
    trainY,
    validSel,
    validY,
    cfg.logisticEpochs,
    cfg.logisticLR,
    cfg.thresholdObjective
  );
  const nnEval = evaluateNN(
    trainSel,
    trainY,
    validSel,
    validY,
    cfg.nnHidden,
    cfg.nnEpochs,
    cfg.nnLR,
    cfg.seed,
    cfg.thresholdObjective
  );
  const rfEval = evaluateRF(
    trainSel,
    trainY,
    validSel,
    validY,
    cfg,
    cfg.thresholdObjective
  );

  const ablation = ablationByFeature(trainX, trainY, validX, validY, selectedFeatures, featureToIndex, cfg);

  const prunedFeatures = selectedFeatures.filter((f) => {
    const row = ablation.rows.find((r) => r.feature === f);
    if (!row) return true;
    return row.deltaF1 >= cfg.ablationDeltaMin;
  });

  const finalFeatures = prunedFeatures.length >= cfg.minFinalFeatures ? prunedFeatures : selectedFeatures;
  const finalIndices = computeSelectedIndices(finalFeatures, featureToIndex);
  const finalTrain = subsetMatrix(trainX, finalIndices);
  const finalValid = subsetMatrix(validX, finalIndices);

  const logisticPrunedEval = evaluateLogistic(
    finalTrain,
    trainY,
    finalValid,
    validY,
    cfg.logisticEpochs,
    cfg.logisticLR,
    cfg.thresholdObjective
  );

  const nnPrunedEval = evaluateNN(
    finalTrain,
    trainY,
    finalValid,
    validY,
    cfg.nnHidden,
    cfg.nnEpochs,
    cfg.nnLR,
    cfg.seed + 17,
    cfg.thresholdObjective
  );
  const rfPrunedEval = evaluateRF(
    finalTrain,
    trainY,
    finalValid,
    validY,
    cfg,
    cfg.thresholdObjective
  );

  const candidates = [
    {
      stage: 'prePrune',
      modelType: 'logistic',
      features: selectedFeatures,
      indices: selectedIndices,
      eval: logisticEval
    },
    {
      stage: 'prePrune',
      modelType: 'nn',
      features: selectedFeatures,
      indices: selectedIndices,
      eval: nnEval
    },
    {
      stage: 'prePrune',
      modelType: 'randomForest',
      features: selectedFeatures,
      indices: selectedIndices,
      eval: rfEval
    },
    {
      stage: 'postPrune',
      modelType: 'logistic',
      features: finalFeatures,
      indices: finalIndices,
      eval: logisticPrunedEval
    },
    {
      stage: 'postPrune',
      modelType: 'nn',
      features: finalFeatures,
      indices: finalIndices,
      eval: nnPrunedEval
    },
    {
      stage: 'postPrune',
      modelType: 'randomForest',
      features: finalFeatures,
      indices: finalIndices,
      eval: rfPrunedEval
    }
  ];

  let selectedCandidate = candidates[0];
  let bestObjectiveValue = metricFromValid(selectedCandidate.eval.validMetrics, cfg.modelSelectionObjective);

  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const value = metricFromValid(c.eval.validMetrics, cfg.modelSelectionObjective);
    const selectedF1 = selectedCandidate.eval.validMetrics.f1;
    const currentF1 = c.eval.validMetrics.f1;
    if (value > bestObjectiveValue || (value === bestObjectiveValue && currentF1 > selectedF1)) {
      selectedCandidate = c;
      bestObjectiveValue = value;
    }
  }

  const bestModelType = selectedCandidate.modelType;
  const selectedStage = selectedCandidate.stage;
  const selectedFeaturesFinal = selectedCandidate.features;
  const selectedIndicesFinal = selectedCandidate.indices;
  const selectedEval = selectedCandidate.eval;

  const exportModel = {
    version: '3.1.0-feature-engineered-ensemble',
    modelType: bestModelType,
    inputSize: selectedFeaturesFinal.length,
    featureKeys: selectedFeaturesFinal,
    mean: selectedIndicesFinal.map((i) => mean[i]),
    std: selectedIndicesFinal.map((i) => std[i]),
    threshold: selectedEval.threshold,
    auc: selectedEval.auc || 0,
    blendAlpha: 1,
    ensembleMode: true,
    confidencePenalty: 0.15,
    trainedAt: new Date().toISOString()
  };

  // Guardar los 3 modelos para ensemble voting
  const ensembleModels = {
    logistic: { threshold: logisticPrunedEval.threshold, auc: logisticPrunedEval.auc || 0 },
    nn: { threshold: nnPrunedEval.threshold, auc: nnPrunedEval.auc || 0 },
    randomForest: { threshold: rfPrunedEval.threshold, auc: rfPrunedEval.auc || 0 }
  };
  
  exportModel.ensembleModels = ensembleModels;

  if (bestModelType === 'logistic') {
    exportModel.W = selectedEval.model.w;
    exportModel.b = selectedEval.model.b;
  } else if (bestModelType === 'randomForest') {
    exportModel.trees = selectedEval.model.trees;
    exportModel.rfTrees = selectedEval.model.trees.length;
    exportModel.rfMaxDepth = cfg.rfMaxDepth;
  } else {
    exportModel.hiddenSize = selectedEval.model.hiddenSize;
    exportModel.W1 = selectedEval.model.W1;
    exportModel.b1 = selectedEval.model.b1;
    exportModel.W2 = selectedEval.model.W2;
    exportModel.b2 = selectedEval.model.b2;
  }

  const report = {
    config: cfg,
    selectedFeatures,
    prunedFeatures,
    finalFeatures,
    importanceRanking: ranking,
    ablation,
    prePrune: {
      logistic: {
        threshold: logisticEval.threshold,
        trainMetrics: logisticEval.trainMetrics,
        validMetrics: logisticEval.validMetrics
      },
      nn: {
        threshold: nnEval.threshold,
        trainMetrics: nnEval.trainMetrics,
        validMetrics: nnEval.validMetrics
      },
      randomForest: {
        threshold: rfEval.threshold,
        trainMetrics: rfEval.trainMetrics,
        validMetrics: rfEval.validMetrics
      }
    },
    postPrune: {
      logistic: {
        threshold: logisticPrunedEval.threshold,
        trainMetrics: logisticPrunedEval.trainMetrics,
        validMetrics: logisticPrunedEval.validMetrics
      },
      nn: {
        threshold: nnPrunedEval.threshold,
        trainMetrics: nnPrunedEval.trainMetrics,
        validMetrics: nnPrunedEval.validMetrics
      },
      randomForest: {
        threshold: rfPrunedEval.threshold,
        trainMetrics: rfPrunedEval.trainMetrics,
        validMetrics: rfPrunedEval.validMetrics
      }
    },
    bestModelType,
    selectedStage,
    thresholdObjective: cfg.thresholdObjective,
    modelSelectionObjective: cfg.modelSelectionObjective,
    selectedObjectiveValue: bestObjectiveValue
  };

  fs.writeFileSync(path.join(base, cfg.modelPath), JSON.stringify(exportModel, null, 2));
  fs.writeFileSync(path.join(base, cfg.reportPath), JSON.stringify(report, null, 2));

  console.log('\n==== Feature Engineering Done ====');
  console.log('Threshold objective:', cfg.thresholdObjective);
  console.log('Model selection objective (valid):', cfg.modelSelectionObjective);
  console.log('Best model:', bestModelType);
  console.log('Selected stage:', selectedStage);
  console.log('Selected features:', selectedFeatures.length, '| Final features:', finalFeatures.length);
  console.log(
    'Post-prune Logistic valid F1:',
    logisticPrunedEval.validMetrics.f1.toFixed(4),
    'Acc:',
    (logisticPrunedEval.validMetrics.accuracy * 100).toFixed(2) + '%',
    'BAcc:',
    (logisticPrunedEval.validMetrics.balancedAccuracy * 100).toFixed(2) + '%'
  );
  console.log(
    'Post-prune NN valid F1:',
    nnPrunedEval.validMetrics.f1.toFixed(4),
    'Acc:',
    (nnPrunedEval.validMetrics.accuracy * 100).toFixed(2) + '%',
    'BAcc:',
    (nnPrunedEval.validMetrics.balancedAccuracy * 100).toFixed(2) + '%'
  );
  console.log(
    'Post-prune RF valid F1:',
    rfPrunedEval.validMetrics.f1.toFixed(4),
    'Acc:',
    (rfPrunedEval.validMetrics.accuracy * 100).toFixed(2) + '%',
    'BAcc:',
    (rfPrunedEval.validMetrics.balancedAccuracy * 100).toFixed(2) + '%'
  );
  console.log('Saved model:', cfg.modelPath);
  console.log('Saved report:', cfg.reportPath);
}

main().catch((error) => {
  console.error('Feature engineering failed:', error);
  process.exitCode = 1;
});
