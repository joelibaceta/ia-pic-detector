/**
 * Umbrales y Pesos para la Detección de IA
 */

const Thresholds = {
    // Umbrales de anomalía para cada métrica (extremadamente conservadores)
    anomaly: {
        energyDistribution: 0.75,
        noisePattern: 0.80,
        interScaleCorrelation: 0.70,
        llSmoothness: 0.70,
        hlLhRatio: 0.60,
        midFrequencyGap: 0.75
    },

    // Pesos para el score final (deben sumar 1.0)
    // Ajustados con validación 3 IA / 3 Reales para reducir falsos negativos de IA.
    weights: {
        energyDistribution: 0.003,
        noisePattern: 0.229,
        interScaleCorrelation: 0.255,
        llSmoothness: 0.154,
        hlLhRatio: 0.244,
        midFrequencyGap: 0.115
    },

    // Valores de referencia para imágenes naturales
    naturalImage: {
        LL_ratio: { min: 0.60, max: 0.80 },
        HH_ratio: { min: 0.05, max: 0.15 },
        mid_ratio: { min: 0.25, max: 0.50 },
        HH_kurtosis: { min: -1, max: 5 },
        LL_entropy: { min: 6.0, max: 8.0 },
        HL_LH_ratio: { min: 0.8, max: 1.2 },
        interScaleRatio: { min: 2, max: 8 }
    },

    // Umbral de clasificación final
    classification: {
        aiThreshold: 0.62  // Score > 0.62 = IA detectada (validado con 6 imágenes)
    }
};
