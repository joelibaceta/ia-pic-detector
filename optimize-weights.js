/**
 * Optimizador Avanzado de Pesos
 * Analiza métricas individuales y encuentra la mejor combinación de pesos
 */

const fs = require('fs');
const path = require('path');

// Ground truth - actualiza según tus imágenes
const GROUND_TRUTH = {
    'images/508010630_10239641674839058_1065749617840723590_n.jpg': false,
    'images/509879109_10239783617147527_1082183775493285193_n.jpg': false,
    'images/513931813_10239864276443959_2167545655610779375_n.jpg': false,
    'images/Gemini_Generated_Image_806c6g806c6g806c.png': true,
    'images/image.png': true
};

// Métricas de ejemplo - serán reemplazadas por datos reales
const EXAMPLE_METRICS = {
    'images/508010630_10239641674839058_1065749617840723590_n.jpg': {
        score: 0.707,
        metrics: {
            energyDistribution: '15.0',
            noisePattern: '20.0',
            interScaleCorrelation: '10.0',
            llSmoothness: '5.0',
            hlLhRatio: '30.0',
            midFrequencyGap: '25.0'
        }
    },
    'images/509879109_10239783617147527_1082183775493285193_n.jpg': {
        score: 0.684,
        metrics: {
            energyDistribution: '12.0',
            noisePattern: '18.0',
            interScaleCorrelation: '8.0',
            llSmoothness: '4.0',
            hlLhRatio: '28.0',
            midFrequencyGap: '22.0'
        }
    },
    'images/513931813_10239864276443959_2167545655610779375_n.jpg': {
        score: 0.729,
        metrics: {
            energyDistribution: '18.0',
            noisePattern: '22.0',
            interScaleCorrelation: '12.0',
            llSmoothness: '6.0',
            hlLhRatio: '32.0',
            midFrequencyGap: '28.0'
        }
    },
    'images/Gemini_Generated_Image_806c6g806c6g806c.png': {
        score: 0.714,
        metrics: {
            energyDistribution: '16.0',
            noisePattern: '21.0',
            interScaleCorrelation: '11.0',
            llSmoothness: '5.5',
            hlLhRatio: '31.0',
            midFrequencyGap: '26.0'
        }
    },
    'images/image.png': {
        score: 0.708,
        metrics: {
            energyDistribution: '14.0',
            noisePattern: '19.0',
            interScaleCorrelation: '9.0',
            llSmoothness: '4.5',
            hlLhRatio: '29.0',
            midFrequencyGap: '24.0'
        }
    }
};

// Cargar métricas detalladas
let detailedMetrics;
try {
    const data = fs.readFileSync('detailed-metrics.json', 'utf8');
    detailedMetrics = JSON.parse(data);
    console.log('✓ Cargadas métricas reales desde detailed-metrics.json\n');
} catch (error) {
    console.log('⚠️  No se encontró detailed-metrics.json, usando datos de ejemplo\n');
    console.log('📋 Para usar datos reales:');
    console.log('1. Abre test.html en el navegador');
    console.log('2. Ejecuta Test 4: Detección Completa');
    console.log('3. Haz clic en "🔬 Exportar Métricas Detalladas"');
    console.log('4. Ejecuta este script nuevamente\n');
    console.log('Continuando con datos de ejemplo...\n');
    detailedMetrics = EXAMPLE_METRICS;
}

/**
 * Calcula poder discriminativo de cada métrica
 */
function analyzeMetricDiscrimination() {
    console.log('🔍 ANÁLISIS DE PODER DISCRIMINATIVO POR MÉTRICA\n');
    
    const metricNames = ['energyDistribution', 'noisePattern', 'interScaleCorrelation', 
                         'llSmoothness', 'hlLhRatio', 'midFrequencyGap'];
    
    const analysis = {};
    
    for (const metric of metricNames) {
        const aiScores = [];
        const realScores = [];
        
        for (const [image, data] of Object.entries(detailedMetrics)) {
            const isAI = GROUND_TRUTH[image];
            const score = parseFloat(data.metrics[metric]) / 100; // Normalizar a 0-1
            
            if (isAI) {
                aiScores.push(score);
            } else {
                realScores.push(score);
            }
        }
        
        const aiAvg = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
        const realAvg = realScores.reduce((a, b) => a + b, 0) / realScores.length;
        const separation = Math.abs(aiAvg - realAvg);
        
        analysis[metric] = {
            aiAvg: aiAvg.toFixed(3),
            realAvg: realAvg.toFixed(3),
            separation: separation.toFixed(3),
            direction: aiAvg > realAvg ? 'IA↑' : 'Real↑'
        };
    }
    
    // Ordenar por separación
    const sorted = Object.entries(analysis)
        .sort((a, b) => parseFloat(b[1].separation) - parseFloat(a[1].separation));
    
    console.log('Métrica                    | IA Avg | Real Avg | Separación | Dirección');
    console.log('-'.repeat(75));
    
    sorted.forEach(([metric, data]) => {
        const name = metric.padEnd(25);
        console.log(`${name} | ${data.aiAvg}  | ${data.realAvg}   | ${data.separation}      | ${data.direction}`);
    });
    
    console.log('\n💡 Interpretación:');
    console.log('- Separación alta = métrica discriminativa (útil)');
    console.log('- Separación baja = métrica ruidosa (menos útil)');
    console.log('- Dirección indica si IA tiene valores más altos o bajos\n');
    
    return sorted;
}

/**
 * Prueba diferentes combinaciones de pesos
 */
function optimizeWeights(metricAnalysis) {
    console.log('🎯 OPTIMIZACIÓN DE PESOS\n');
    
    const metricNames = metricAnalysis.map(m => m[0]);
    let bestAccuracy = 0;
    let bestWeights = null;
    let bestThreshold = 0;
    let bestResults = null;
    
    // Estrategia: dar más peso a métricas con mayor separación
    const strategies = [
        { name: 'Uniforme', weights: [1/6, 1/6, 1/6, 1/6, 1/6, 1/6] },
        { name: 'Por separación', weights: null }, // Calculado dinámicamente
        { name: 'Top 3 métricas', weights: null },
        { name: 'Solo mejor métrica', weights: null }
    ];
    
    // Calcular pesos por separación
    const separations = metricAnalysis.map(m => parseFloat(m[1].separation));
    const totalSep = separations.reduce((a, b) => a + b, 0);
    strategies[1].weights = separations.map(s => s / totalSep);
    
    // Top 3
    const top3Weights = metricNames.map((_, i) => i < 3 ? 1/3 : 0);
    strategies[2].weights = top3Weights;
    
    // Solo mejor
    const bestOnlyWeights = metricNames.map((_, i) => i === 0 ? 1 : 0);
    strategies[3].weights = bestOnlyWeights;
    
    console.log('Probando estrategias de pesos...\n');
    
    for (const strategy of strategies) {
        // Crear objeto de pesos
        const weights = {};
        metricNames.forEach((name, i) => {
            weights[name] = strategy.weights[i];
        });
        
        // Probar con diferentes thresholds
        for (let threshold = 0.5; threshold <= 0.95; threshold += 0.05) {
            const result = testConfiguration(weights, threshold);
            
            if (result.accuracy > bestAccuracy) {
                bestAccuracy = result.accuracy;
                bestWeights = weights;
                bestThreshold = threshold;
                bestResults = result;
                bestResults.strategyName = strategy.name;
            }
        }
    }
    
    console.log('=' .repeat(80));
    console.log('🏆 MEJOR CONFIGURACIÓN ENCONTRADA\n');
    console.log(`Estrategia: ${bestResults.strategyName}`);
    console.log(`Accuracy: ${bestAccuracy.toFixed(1)}%`);
    console.log(`Threshold: ${bestThreshold.toFixed(2)}`);
    console.log(`Correctas: ${bestResults.correct}/${bestResults.total}\n`);
    
    console.log('Pesos óptimos:');
    for (const [metric, weight] of Object.entries(bestWeights)) {
        if (weight > 0.01) {
            console.log(`  ${metric}: ${weight.toFixed(3)} (${(weight * 100).toFixed(1)}%)`);
        }
    }
    
    console.log('\nResultados por imagen:');
    bestResults.details.forEach(d => {
        console.log(`  ${d.correct} ${d.image}`);
        console.log(`     Score: ${d.score.toFixed(3)} → ${d.predicted} (Real: ${d.actual})`);
    });
    
    // Generar código para thresholds.js
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 CÓDIGO PARA COPIAR EN thresholds.js:\n');
    console.log('weights: {');
    for (const [metric, weight] of Object.entries(bestWeights)) {
        console.log(`    ${metric}: ${weight.toFixed(2)},`);
    }
    console.log('},\n');
    console.log('classification: {');
    console.log(`    aiThreshold: ${bestThreshold.toFixed(2)}`);
    console.log('}');
    
    // Guardar reporte
    fs.writeFileSync('weight-optimization-report.json', JSON.stringify({
        strategy: bestResults.strategyName,
        accuracy: bestAccuracy,
        threshold: bestThreshold,
        weights: bestWeights,
        results: bestResults.details
    }, null, 2));
    
    console.log('\n✓ Reporte guardado en: weight-optimization-report.json\n');
}

/**
 * Prueba una configuración específica
 */
function testConfiguration(weights, threshold) {
    let correct = 0;
    const details = [];
    
    for (const [image, data] of Object.entries(detailedMetrics)) {
        // Calcular score con los pesos dados
        let score = 0;
        for (const [metric, weight] of Object.entries(weights)) {
            const metricScore = parseFloat(data.metrics[metric]) / 100;
            score += metricScore * weight;
        }
        
        const predicted = score > threshold;
        const actual = GROUND_TRUTH[image];
        const isCorrect = predicted === actual;
        
        if (isCorrect) correct++;
        
        details.push({
            image: image.split('/').pop(),
            score,
            predicted: predicted ? 'IA' : 'Real',
            actual: actual ? 'IA' : 'Real',
            correct: isCorrect ? '✓' : '✗'
        });
    }
    
    return {
        accuracy: (correct / Object.keys(detailedMetrics).length) * 100,
        correct,
        total: Object.keys(detailedMetrics).length,
        details
    };
}

// Ejecutar optimización
console.clear();
console.log('🧬 OPTIMIZADOR AVANZADO DE PESOS - AI Image Detector\n');
console.log(`Analizando ${Object.keys(detailedMetrics).length} imágenes...\n`);

const metricAnalysis = analyzeMetricDiscrimination();
console.log('\n');
optimizeWeights(metricAnalysis);
