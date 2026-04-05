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
        const directions = Thresholds.metricDirection || {};
        const weightKeys = Object.keys(weights);
        const weightSum = weightKeys.reduce((sum, key) => sum + (weights[key] || 0), 0) || 1;
        
        // Validar y normalizar cada score
        const getScore = (metric) => {
            const score = metric?.score ?? 0;
            return isNaN(score) || !isFinite(score) ? 0 : score;
        };

        const directionalScore = (key, metric) => {
            const score = Math.min(Math.max(getScore(metric), 0), 1);
            const direction = directions[key] ?? 1;
            if (direction < 0) return 1 - score;
            return score;
        };
        
        let score = 0;
        for (const key of weightKeys) {
            score += directionalScore(key, metrics[key]) * (weights[key] || 0);
        }
        
        const finalScore = Math.min(Math.max(score / weightSum, 0), 1);
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
        const metricDescriptions = {
            energyDistribution: 'Distribución de energía anómala en bandas de frecuencia',
            noisePattern: 'Patrón de ruido inconsistente con sensores físicos',
            interScaleCorrelation: 'Correlaciones inter-escala inusuales',
            llSmoothness: 'Sobre-suavizado detectado en texturas',
            hlLhRatio: 'Desbalance direccional en detalles',
            midFrequencyGap: 'Gap en frecuencias medias característico de generación sintética',
            lbpPattern: 'Patrones locales de textura (LBP) poco naturales',
            dctBand: 'Distribución DCT por bandas fuera de comportamiento fotográfico',
            fftRadial: 'Pendiente radial FFT inconsistente con ley espectral natural',
            prnuResidual: 'Estadísticas de residual/PRNU no compatibles con sensor real',
            residualCooccurrence: 'Co-ocurrencia en residual con dependencia espacial sintética'
        };

        const anomalies = [];

        for (const [key, metric] of Object.entries(metrics)) {
            if (metric?.isAnomalous && metricDescriptions[key]) {
                anomalies.push(metricDescriptions[key]);
            }
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
        const scores = {};
        const anomalies = {};

        for (const [key, metric] of Object.entries(metrics)) {
            const score = Number.isFinite(metric?.score) ? metric.score : 0;
            scores[key] = (score * 100).toFixed(1);
            anomalies[key] = !!metric?.isAnomalous;
        }

        return {
            summary: this.generateReport(metrics),
            scores,
            anomalies
        };
    }
};
