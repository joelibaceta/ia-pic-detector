/**
 * Clasificador de Imágenes IA
 * Calcula el score final y genera el reporte
 */

const Classifier = {
    /**
     * Calcula el score final de IA basado en las métricas
     * @param {Object} metrics - Métricas de anomalía
     * @returns {number} Score entre 0 y 1
     */
    computeAIScore(metrics) {
        const weights = Thresholds.weights;
        
        // Validar y normalizar cada score
        const getScore = (metric) => {
            const score = metric?.score ?? 0;
            return isNaN(score) || !isFinite(score) ? 0 : score;
        };
        
        const score =
            getScore(metrics.energyDistribution) * weights.energyDistribution +
            getScore(metrics.noisePattern) * weights.noisePattern +
            getScore(metrics.interScaleCorrelation) * weights.interScaleCorrelation +
            getScore(metrics.llSmoothness) * weights.llSmoothness +
            getScore(metrics.hlLhRatio) * weights.hlLhRatio +
            getScore(metrics.midFrequencyGap) * weights.midFrequencyGap;
        
        const finalScore = Math.min(Math.max(score, 0), 1);
        return isNaN(finalScore) ? 0.5 : finalScore;
    },

    /**
     * Clasifica la imagen como IA o real
     * @param {number} aiScore - Score de IA
     * @returns {Object} { isAI, confidence }
     */
    classify(aiScore, metrics = null) {
        const threshold = Thresholds.classification.aiThreshold;
        const isAI = aiScore > threshold;

        const clamp01 = (v) => Math.min(1, Math.max(0, v));

        // Distancia al umbral normalizada por el máximo margen posible del lado actual.
        const marginRange = isAI ? (1 - threshold) : threshold;
        const margin = clamp01(Math.abs(aiScore - threshold) / (marginRange || 1));

        // Consenso: si la clase es IA, esperamos score promedio alto; si es Real, promedio bajo.
        let agreement = 1;
        if (metrics && typeof metrics === 'object') {
            const metricScores = Object.values(metrics)
                .map((metric) => clamp01(metric?.score ?? 0))
                .filter((score) => Number.isFinite(score));

            if (metricScores.length > 0) {
                const avgScore = metricScores.reduce((sum, s) => sum + s, 0) / metricScores.length;
                agreement = isAI ? avgScore : (1 - avgScore);
            }
        }

        // Mezcla de margen y consenso para evitar sobreconfianza en casos ambiguos.
        const blended = 0.65 * margin + 0.35 * agreement;
        const confidence = 35 + blended * 65;
        
        return {
            isAI,
            confidence: Math.max(35, Math.min(100, Math.round(confidence * 10) / 10))
        };
    },

    /**
     * Genera un reporte detallado de la detección
     * @param {Object} metrics - Métricas calculadas
     * @param {number} aiScore - Score de IA
     * @returns {string}
     */
    generateReport(metrics, aiScore) {
        const anomalies = [];
        
        if (metrics.energyDistribution.isAnomalous) {
            anomalies.push('Distribución de energía anómala en bandas de frecuencia');
        }
        if (metrics.noisePattern.isAnomalous) {
            anomalies.push('Patrón de ruido inconsistente con sensores físicos');
        }
        if (metrics.interScaleCorrelation.isAnomalous) {
            anomalies.push('Correlaciones inter-escala inusuales');
        }
        if (metrics.llSmoothness.isAnomalous) {
            anomalies.push('Sobre-suavizado detectado en texturas');
        }
        if (metrics.hlLhRatio.isAnomalous) {
            anomalies.push('Desbalance direccional en detalles');
        }
        if (metrics.midFrequencyGap.isAnomalous) {
            anomalies.push('Gap en frecuencias medias característico de generación sintética');
        }
        
        if (anomalies.length === 0) {
            return 'La imagen presenta características consistentes con fotografía real o arte digital tradicional.';
        }
        
        return `Detectados ${anomalies.length} indicadores de generación por IA:\n• ${anomalies.join('\n• ')}`;
    },

    /**
     * Genera un reporte con métricas detalladas
     * @param {Object} metrics
     * @returns {Object}
     */
    generateDetailedReport(metrics) {
        return {
            summary: this.generateReport(metrics),
            scores: {
                energyDistribution: (metrics.energyDistribution.score * 100).toFixed(1),
                noisePattern: (metrics.noisePattern.score * 100).toFixed(1),
                interScaleCorrelation: (metrics.interScaleCorrelation.score * 100).toFixed(1),
                llSmoothness: (metrics.llSmoothness.score * 100).toFixed(1),
                hlLhRatio: (metrics.hlLhRatio.score * 100).toFixed(1),
                midFrequencyGap: (metrics.midFrequencyGap.score * 100).toFixed(1)
            },
            anomalies: {
                energyDistribution: metrics.energyDistribution.isAnomalous,
                noisePattern: metrics.noisePattern.isAnomalous,
                interScaleCorrelation: metrics.interScaleCorrelation.isAnomalous,
                llSmoothness: metrics.llSmoothness.isAnomalous,
                hlLhRatio: metrics.hlLhRatio.isAnomalous,
                midFrequencyGap: metrics.midFrequencyGap.isAnomalous
            }
        };
    }
};
