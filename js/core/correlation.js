/**
 * Módulo de Correlaciones entre bandas wavelet
 */

const Correlation = {
    /**
     * Calcula la correlación de Pearson entre dos bandas
     * @param {Float32Array} data1
     * @param {Float32Array} data2
     * @returns {number} Coeficiente de correlación [-1, 1]
     */
    pearson(data1, data2) {
        if (data1.length !== data2.length) {
            throw new Error('Arrays must have the same length');
        }
        
        const n = data1.length;
        const mean1 = Statistics.mean(data1);
        const mean2 = Statistics.mean(data2);
        
        let numerator = 0;
        let sum1Sq = 0;
        let sum2Sq = 0;
        
        for (let i = 0; i < n; i++) {
            const diff1 = data1[i] - mean1;
            const diff2 = data2[i] - mean2;
            
            numerator += diff1 * diff2;
            sum1Sq += diff1 * diff1;
            sum2Sq += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(sum1Sq * sum2Sq);
        
        return denominator === 0 ? 0 : numerator / denominator;
    },

    /**
     * Calcula la covarianza entre dos bandas
     * @param {Float32Array} data1
     * @param {Float32Array} data2
     * @returns {number}
     */
    covariance(data1, data2) {
        if (data1.length !== data2.length) {
            throw new Error('Arrays must have the same length');
        }
        
        const n = data1.length;
        const mean1 = Statistics.mean(data1);
        const mean2 = Statistics.mean(data2);
        
        let cov = 0;
        for (let i = 0; i < n; i++) {
            cov += (data1[i] - mean1) * (data2[i] - mean2);
        }
        
        return cov / n;
    },

    /**
     * Calcula la correlación cruzada entre todas las bandas de un nivel
     * @param {Object} level - { LL, LH, HL, HH }
     * @returns {Object} Matriz de correlaciones
     */
    interBandCorrelations(level) {
        const bands = ['LH', 'HL', 'HH'];
        const correlations = {};
        
        for (let i = 0; i < bands.length; i++) {
            for (let j = i + 1; j < bands.length; j++) {
                const band1 = bands[i];
                const band2 = bands[j];
                const key = `${band1}_${band2}`;
                
                correlations[key] = this.pearson(
                    level[band1].data,
                    level[band2].data
                );
            }
        }
        
        return correlations;
    },

    /**
     * Calcula la correlación entre escalas (mismo tipo de banda, diferentes niveles)
     * @param {Array} levels - Array de niveles wavelet
     * @param {string} bandType - 'LL', 'LH', 'HL', 'HH'
     * @returns {Array} Correlaciones entre niveles consecutivos
     */
    interScaleCorrelation(levels, bandType = 'HH') {
        const correlations = [];
        
        for (let i = 0; i < levels.length - 1; i++) {
            const level1 = levels[i][bandType];
            const level2 = levels[i + 1][bandType];
            
            // Redimensionar level2 al tamaño de level1 para comparar
            const resized = this.resizeToMatch(level2, level1);
            
            const corr = this.pearson(level1.data, resized);
            correlations.push(corr);
        }
        
        return correlations;
    },

    /**
     * Redimensiona una banda para que coincida con otra (simple downsampling)
     * @param {Object} source - { data, width, height }
     * @param {Object} target - { data, width, height }
     * @returns {Float32Array}
     */
    resizeToMatch(source, target) {
        const { data: srcData, width: srcW, height: srcH } = source;
        const { width: tgtW, height: tgtH } = target;
        
        const resized = new Float32Array(tgtW * tgtH);
        const xRatio = srcW / tgtW;
        const yRatio = srcH / tgtH;
        
        for (let y = 0; y < tgtH; y++) {
            for (let x = 0; x < tgtW; x++) {
                const srcX = Math.floor(x * xRatio);
                const srcY = Math.floor(y * yRatio);
                const srcIdx = srcY * srcW + srcX;
                const tgtIdx = y * tgtW + x;
                resized[tgtIdx] = srcData[srcIdx];
            }
        }
        
        return resized;
    }
};
