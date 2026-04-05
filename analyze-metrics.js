/**
 * Analizador de métricas individuales
 * Identifica qué métricas son más discriminativas entre IA y Real
 */

const fs = require('fs');

console.log('📊 ANÁLISIS DE MÉTRICAS INDIVIDUALES\n');
console.log('Para mejorar la detección, necesitamos analizar cada métrica por separado.');
console.log('Por favor, ejecuta los tests y exporta las métricas detalladas.\n');

console.log('🔧 INSTRUCCIONES:\n');
console.log('1. Abre test.html en el navegador');
console.log('2. Ejecuta Test 3: Métricas de Detección');
console.log('3. Copia los valores de cada métrica para cada imagen');
console.log('4. Pégalos en el objeto METRICS_DATA de este archivo\n');

// Plantilla para copiar métricas
const METRICS_TEMPLATE = `
// Ejemplo de estructura - reemplaza con valores reales
const METRICS_DATA = {
    'images/508010630_10239641674839058_1065749617840723590_n.jpg': {
        isAI: false,  // Ground truth
        metrics: {
            energyDistribution: 0.15,
            noisePattern: 0.20,
            interScaleCorrelation: 0.10,
            llSmoothness: 0.05,
            hlLhRatio: 0.30,
            midFrequencyGap: 0.25
        }
    },
    // ... más imágenes
};
`;

console.log(METRICS_TEMPLATE);

console.log('\n💡 ALTERNATIVA RÁPIDA:\n');
console.log('Si no quieres copiar manualmente, podemos:');
console.log('1. Modificar test-suite.js para exportar métricas detalladas');
console.log('2. Crear un endpoint que las guarde automáticamente');
console.log('3. Usar la consola del navegador para capturar los datos\n');

console.log('📋 Scores actuales (muy similares - problema de discriminación):');
const scores = {
    'Real 1': 0.707,
    'Real 2': 0.684,
    'Real 3': 0.729,
    'IA 1': 0.714,
    'IA 2': 0.708
};

for (const [type, score] of Object.entries(scores)) {
    console.log(`  ${type}: ${score}`);
}

console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
console.log('Las imágenes reales tienen scores muy altos (0.68-0.73)');
console.log('Las imágenes IA tienen scores similares (0.71-0.71)');
console.log('Solución: Ajustar pesos y umbrales de métricas individuales\n');

console.log('🎯 ESTRATEGIA DE OPTIMIZACIÓN:\n');
console.log('1. Identificar qué métricas tienen mayor separación IA vs Real');
console.log('2. Aumentar peso de métricas discriminativas');
console.log('3. Reducir peso de métricas ruidosas');
console.log('4. Ajustar umbrales de anomalía por métrica\n');

// Sugerencias basadas en el problema actual
console.log('💡 SUGERENCIAS INMEDIATAS:\n');
console.log('Opción A: Bajar threshold a 0.70 (accuracy 60% pero al menos clasifica)');
console.log('  → classification.aiThreshold = 0.70\n');

console.log('Opción B: Hacer métricas más estrictas (requiere análisis)');
console.log('  → Subir umbrales de anomalía a 0.85-0.90');
console.log('  → Solo detectar casos MUY obvios de IA\n');

console.log('Opción C: Invertir enfoque - detectar "realness" en vez de "AI-ness"');
console.log('  → Buscar características de fotos reales (ruido de sensor, etc.)\n');

console.log('🚀 ¿Quieres que genere un script automatizado para capturar métricas?');
console.log('   Responde "sí" y lo crearemos juntos.\n');
