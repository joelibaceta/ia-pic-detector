/**
 * Umbrales y Pesos para la Detección de IA
 */

const Thresholds = {
    // Umbrales de anomalía para cada métrica.
    // Ajustados para scores continuos (menos saturación en 0 o 1).
    anomaly: {
        energyDistribution: 0.58,
        noisePattern: 0.57,
        interScaleCorrelation: 0.55,
        llSmoothness: 0.52,
        hlLhRatio: 0.50,
        midFrequencyGap: 0.56,
        lbpPattern: 0.56,
        dctBand: 0.56,
        fftRadial: 0.56,
        prnuResidual: 0.56,
        residualCooccurrence: 0.56
    },

    // Pesos para el score final (deben sumar 1.0)
    // Rebalanceados para priorizar métricas con mejor separación esperada.
    weights: {
        energyDistribution: 0.12,
        noisePattern: 0.08,
        interScaleCorrelation: 0.03,
        llSmoothness: 0.02,
        hlLhRatio: 0.15,
        midFrequencyGap: 0.05,
        lbpPattern: 0.12,
        dctBand: 0.15,
        fftRadial: 0.12,
        prnuResidual: 0.10,
        residualCooccurrence: 0.06
    },

    // Dirección esperada por métrica:
    //  1  => valor alto favorece IA
    // -1  => valor bajo favorece IA (se usa 1 - score)
    metricDirection: {
        energyDistribution: 1,
        noisePattern: -1,
        interScaleCorrelation: 1,
        llSmoothness: 1,
        hlLhRatio: 1,
        midFrequencyGap: 1,
        lbpPattern: 1,
        dctBand: 1,
        fftRadial: 1,
        prnuResidual: 1,
        residualCooccurrence: 1
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

    advancedRef: {
        lbpEntropy: { min: 2.2, max: 3.6 },
        lbpUniformity: { min: 0.08, max: 0.22 },
        dctMidRatio: { min: 0.20, max: 0.45 },
        dctHighRatio: { min: 0.10, max: 0.30 },
        dctSlope: { min: -1.6, max: -0.4 },
        fftRadialSlope: { min: -3.0, max: -1.1 },
        fftLowHighRatio: { min: 1.5, max: 8.0 },
        fftFlatness: { min: 0.08, max: 0.45 },
        prnuStrength: { min: 0.06, max: 0.32 },
        hfNoiseRatio: { min: 0.02, max: 0.25 },
        residualKurtosis: { min: -0.5, max: 6.0 },
        glcmContrast: { min: 0.3, max: 3.0 },
        glcmHomogeneity: { min: 0.35, max: 0.85 },
        glcmEnergy: { min: 0.02, max: 0.20 },
        glcmCorrelation: { min: 0.15, max: 0.95 }
    },

    // Umbral de clasificación final
    classification: {
        aiThreshold: 0.56  // Valor inicial; recalibrar con archive y train-hybrid-nn
    }
};
