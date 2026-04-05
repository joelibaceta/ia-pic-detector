/**
 * Script de optimización de umbrales para el detector de IA
 * Prueba diferentes combinaciones de parámetros para maximizar accuracy
 */

const fs = require('fs');
const path = require('path');

// CONFIGURACIÓN: Define cuáles imágenes son IA (true) o reales (false)
// ⚠️ ACTUALIZA ESTOS VALORES SEGÚN TUS IMÁGENES
const GROUND_TRUTH = {
    'images/508010630_10239641674839058_1065749617840723590_n.jpg': false,  // Real - foto personal
    'images/509879109_10239783617147527_1082183775493285193_n.jpg': false,  // Real - foto personal
    'images/513931813_10239864276443959_2167545655610779375_n.jpg': false,  // Real - foto personal
    'images/Gemini_Generated_Image_806c6g806c6g806c.png': true,              // IA - generada por Gemini
    'images/image.png': true                                                  // IA - ¿generada por IA?
};

// Resultados actuales del test (scores antes de clasificación)
// ⚠️ EJECUTA LOS TESTS Y EXPORTA LOS SCORES REALES
// Estos son valores de ejemplo - cópialos del archivo detected-scores.js
const CURRENT_SCORES = {
    'images/508010630_10239641674839058_1065749617840723590_n.jpg': 0.707,
    'images/509879109_10239783617147527_1082183775493285193_n.jpg': 0.684,
    'images/513931813_10239864276443959_2167545655610779375_n.jpg': 0.729,
    'images/Gemini_Generated_Image_806c6g806c6g806c.png': 0.714,
    'images/image.png': 0.708
};

/**
 * Calcula accuracy para un threshold dado
 */
function calculateAccuracy(scores, threshold, groundTruth) {
    let correct = 0;
    let total = 0;
    const results = [];
    
    for (const [image, actualScore] of Object.entries(scores)) {
        const predicted = actualScore > threshold;  // true = IA
        const actual = groundTruth[image];
        const isCorrect = predicted === actual;
        
        if (isCorrect) correct++;
        total++;
        
        results.push({
            image: path.basename(image),
            score: actualScore,
            predicted: predicted ? 'IA' : 'Real',
            actual: actual ? 'IA' : 'Real',
            correct: isCorrect ? '✓' : '✗'
        });
    }
    
    return {
        accuracy: (correct / total) * 100,
        correct,
        total,
        results
    };
}

/**
 * Prueba un rango de thresholds
 */
function optimizeThreshold() {
    console.log('🔍 Optimizando threshold de clasificación...\n');
    console.log('Ground Truth:');
    for (const [image, isAI] of Object.entries(GROUND_TRUTH)) {
        console.log(`  ${path.basename(image)}: ${isAI ? 'IA ⚠️' : 'Real ✓'}`);
    }
    console.log('\n' + '='.repeat(80) + '\n');
    
    const thresholds = [];
    const minThreshold = 0.50;
    const maxThreshold = 0.95;
    const step = 0.01;
    
    let bestThreshold = minThreshold;
    let bestAccuracy = 0;
    let bestResults = null;
    
    // Probar cada threshold
    for (let threshold = minThreshold; threshold <= maxThreshold; threshold += step) {
        const result = calculateAccuracy(CURRENT_SCORES, threshold, GROUND_TRUTH);
        
        thresholds.push({
            threshold: threshold.toFixed(2),
            accuracy: result.accuracy.toFixed(1),
            correct: result.correct,
            total: result.total
        });
        
        if (result.accuracy > bestAccuracy) {
            bestAccuracy = result.accuracy;
            bestThreshold = threshold;
            bestResults = result;
        }
    }
    
    // Mostrar top 10 mejores thresholds
    console.log('📊 Top 10 Mejores Thresholds:\n');
    const sortedThresholds = thresholds
        .sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy))
        .slice(0, 10);
    
    sortedThresholds.forEach((t, i) => {
        const icon = i === 0 ? '🏆' : `${i + 1}.`;
        console.log(`${icon} Threshold: ${t.threshold} → Accuracy: ${t.accuracy}% (${t.correct}/${t.total})`);
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
    console.log(`✨ MEJOR CONFIGURACIÓN ENCONTRADA:\n`);
    console.log(`Threshold óptimo: ${bestThreshold.toFixed(3)}`);
    console.log(`Accuracy: ${bestAccuracy.toFixed(1)}%`);
    console.log(`Correctas: ${bestResults.correct}/${bestResults.total}\n`);
    
    console.log('Resultados detallados:');
    bestResults.results.forEach(r => {
        console.log(`  ${r.correct} ${r.image}`);
        console.log(`     Score: ${r.score.toFixed(3)} → Predicción: ${r.predicted} (Real: ${r.actual})`);
    });
    
    // Generar configuración recomendada
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📝 CONFIGURACIÓN RECOMENDADA para thresholds.js:\n');
    console.log('classification: {');
    console.log(`    aiThreshold: ${bestThreshold.toFixed(2)}  // Accuracy: ${bestAccuracy.toFixed(1)}%`);
    console.log('}\n');
    
    // Guardar reporte
    const report = {
        bestThreshold: parseFloat(bestThreshold.toFixed(3)),
        accuracy: parseFloat(bestAccuracy.toFixed(1)),
        topThresholds: sortedThresholds.slice(0, 5),
        detailedResults: bestResults.results,
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('optimization-report.json', JSON.stringify(report, null, 2));
    console.log('✓ Reporte guardado en: optimization-report.json\n');
}

/**
 * Sugerencias para mejorar la detección
 */
function generateRecommendations() {
    console.log('💡 RECOMENDACIONES:\n');
    console.log('1. Si el accuracy no es 100%, considera:');
    console.log('   - Ajustar los pesos de las métricas individuales');
    console.log('   - Revisar los umbrales de anomalía por métrica');
    console.log('   - Verificar que las métricas distingan correctamente IA vs Real\n');
    
    console.log('2. Para optimizar pesos de métricas:');
    console.log('   - Ejecuta el detector y captura los scores individuales de cada métrica');
    console.log('   - Identifica qué métricas tienen mayor diferencia entre IA y Real');
    console.log('   - Aumenta el peso de las métricas más discriminativas\n');
    
    console.log('3. Scores actuales observados:');
    for (const [image, score] of Object.entries(CURRENT_SCORES)) {
        const isAI = GROUND_TRUTH[image];
        console.log(`   ${path.basename(image)}: ${score.toFixed(3)} (${isAI ? 'IA' : 'Real'})`);
    }
    console.log();
}

// Ejecutar optimización
console.clear();
console.log('🎯 OPTIMIZADOR DE THRESHOLDS - AI Image Detector\n');
optimizeThreshold();
generateRecommendations();
