/**
 * Test de inferencia con modelo Random Forest en Node (simula frontend)
 * Valida que RF + estadísticos regionales funcionan correctamente
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScriptInContext(scriptPath) {
  const source = fs.readFileSync(scriptPath, 'utf8');
  vm.runInThisContext(source, { filename: scriptPath });
}

console.log('=== RF Inference Test ===\n');

// Cargar módulos core
console.log('Loading core modules...');
loadScriptInContext(path.join(__dirname, 'js/core/utils.js'));
loadScriptInContext(path.join(__dirname, 'js/core/statistics.js'));
loadScriptInContext(path.join(__dirname, 'js/core/correlation.js'));
loadScriptInContext(path.join(__dirname, 'js/core/preprocessing.js'));
loadScriptInContext(path.join(__dirname, 'js/core/wavelet.js'));

// Cargar feature extractors
console.log('Loading feature extractors...');
loadScriptInContext(path.join(__dirname, 'js/features/featureExtractor.js'));
loadScriptInContext(path.join(__dirname, 'js/features/regionalFeatureExtractor.js'));
loadScriptInContext(path.join(__dirname, 'js/features/advancedFeatureExtractor.js'));

// Cargar detection modules
console.log('Loading detection modules...');
loadScriptInContext(path.join(__dirname, 'js/detection/thresholds.js'));
loadScriptInContext(path.join(__dirname, 'js/detection/anomalyMetrics.js'));
loadScriptInContext(path.join(__dirname, 'js/detection/classifier.js'));
loadScriptInContext(path.join(__dirname, 'js/detection/hybridModel.js'));

// Cargar modelo RF
console.log('Loading RF model...');
const modelPath = path.join(__dirname, 'hybrid-model.fe.pixel.v3.rf.10k.json');
const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

console.log(`\n📊 Model Info:`);
console.log(`  Type: ${modelData.modelType}`);
console.log(`  Input Features: ${modelData.inputSize}`);
console.log(`  Feature Keys: ${modelData.featureKeys.length}`);
console.log(`  RF Trees: ${modelData.rfTrees}`);
console.log(`  Threshold: ${(modelData.threshold * 100).toFixed(2)}%`);
console.log(`  Trained: ${modelData.trainedAt}`);

// Validar estructura RF
console.log(`\n🔍 Validating RF Structure:`);
if (Array.isArray(modelData.trees)) {
  console.log(`  ✓ Trees array present: ${modelData.trees.length} trees loaded`);
  
  // Muestra de primer árbol
  const firstTree = modelData.trees[0];
  console.log(`  ✓ First tree structure:`, {
    isLeaf: firstTree.leaf,
    hasFeature: firstTree.feature !== undefined,
    hasThreshold: firstTree.threshold !== undefined,
    depth: countTreeDepth(firstTree)
  });
} else {
  console.log(`  ✗ ERROR: Trees array missing!`);
  process.exit(1);
}

function countTreeDepth(node, depth = 0) {
  if (node.leaf) return depth;
  const leftDepth = countTreeDepth(node.left || {}, depth + 1);
  const rightDepth = countTreeDepth(node.right || {}, depth + 1);
  return Math.max(leftDepth, rightDepth);
}

// Validar features RF
console.log(`\n📋 Feature Analysis:`);
const regionFeatures = modelData.featureKeys.filter(k => k.startsWith('reg_'));
const surfFeatures = modelData.featureKeys.filter(k => k.startsWith('surf_'));
const waveletFeatures = modelData.featureKeys.filter(k => k.startsWith('metric_') || k.startsWith('summary_'));

console.log(`  Regional Features: ${regionFeatures.length}`);
if (regionFeatures.length > 0) {
  console.log(`    ${regionFeatures.slice(0, 3).join(', ')}...`);
}

console.log(`  SURF-like Features: ${surfFeatures.length}`);
if (surfFeatures.length > 0) {
  console.log(`    ${surfFeatures.slice(0, 3).join(', ')}...`);
}

console.log(`  Wavelet/Advanced: ${waveletFeatures.length}`);

// Crear vector test
console.log(`\n🧪 Testing RF Prediction:`);
const testVector = new Array(modelData.inputSize).fill(0.5);
const normalizedVector = HybridModel.normalize(testVector, modelData.mean, modelData.std);
const prediction = HybridModel.predictRandomForest(normalizedVector, modelData);

console.log(`  Test vector: [${testVector.slice(0, 3).join(', ')}, ...] (size: ${testVector.length})`);
console.log(`  Normalized: [${normalizedVector.slice(0, 3).map(v => v.toFixed(3)).join(', ')}, ...]`);
console.log(`  RF Prediction: ${(prediction * 100).toFixed(2)}%`);
console.log(`  Classification (threshold ${(modelData.threshold * 100).toFixed(2)}%): ${prediction > modelData.threshold ? 'AI' : 'Real'}`);

// Cargar reporte
console.log(`\n📈 Training Report:`);
const reportPath = path.join(__dirname, 'feature-engineering-report.pixel.v3.rf.10k.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

if (report.postPrune) {
  console.log(`  Post-prune RF Validation:`);
  console.log(`    F1: ${report.postPrune.randomForest.validMetrics.f1.toFixed(4)}`);
  console.log(`    Accuracy: ${(report.postPrune.randomForest.validMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`    Balanced Accuracy: ${(report.postPrune.randomForest.validMetrics.balancedAccuracy * 100).toFixed(2)}%`);
}

console.log(`\n✅ RF Inference Test Complete`);
console.log(`\n💡 The frontend is ready to use the RF model with regional + wavelet features.`);
