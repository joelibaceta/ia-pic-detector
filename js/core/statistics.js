/**
 * Módulo de Estadísticas para análisis de coeficientes wavelet
 */

const Statistics = {
    /**
     * Calcula la energía de una banda (suma de cuadrados normalizada)
     * @param {Float32Array} coeffs
     * @returns {number}
     */
    energy(coeffs) {
        let energy = 0;
        const n = coeffs.length;
        
        for (let i = 0; i < n; i++) {
            energy += coeffs[i] * coeffs[i];
        }
        
        return energy / n;
    },

    /**
     * Calcula la media de un array
     * @param {Float32Array} data
     * @returns {number}
     */
    mean(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        return sum / data.length;
    },

    /**
     * Calcula la varianza
     * @param {Float32Array} data
     * @param {number} mean - Media precalculada (opcional)
     * @returns {number}
     */
    variance(data, mean = null) {
        if (mean === null) mean = this.mean(data);
        
        let variance = 0;
        for (let i = 0; i < data.length; i++) {
            const diff = data[i] - mean;
            variance += diff * diff;
        }
        
        return variance / data.length;
    },

    /**
     * Calcula la desviación estándar
     * @param {Float32Array} data
     * @param {number} mean - Media precalculada (opcional)
     * @returns {number}
     */
    std(data, mean = null) {
        return Math.sqrt(this.variance(data, mean));
    },

    /**
     * Calcula el skewness (asimetría)
     * @param {Float32Array} data
     * @returns {number}
     */
    skewness(data) {
        const n = data.length;
        const m = this.mean(data);
        const s = this.std(data, m);
        
        if (s === 0) return 0;
        
        let skew = 0;
        for (let i = 0; i < n; i++) {
            const diff = data[i] - m;
            skew += diff * diff * diff;
        }
        
        return (skew / n) / Math.pow(s, 3);
    },

    /**
     * Calcula el kurtosis (curtosis)
     * @param {Float32Array} data
     * @returns {number} Excess kurtosis (kurtosis - 3)
     */
    kurtosis(data) {
        const n = data.length;
        const m = this.mean(data);
        const v = this.variance(data, m);
        
        if (v === 0) return 0;
        
        let kurt = 0;
        for (let i = 0; i < n; i++) {
            const diff = data[i] - m;
            kurt += diff * diff * diff * diff;
        }
        
        return (kurt / n) / (v * v) - 3; // Excess kurtosis
    },

    /**
     * Calcula la entropía de Shannon
     * @param {Float32Array} data
     * @param {number} bins - Número de bins para el histograma
     * @returns {number}
     */
    entropy(data, bins = 256) {
        const histogram = new Array(bins).fill(0);
        
        // Encontrar min y max
        const min = Utils.findMin(data);
        const max = Utils.findMax(data);
        const range = max - min || 1;
        
        // Construir histograma
        for (let i = 0; i < data.length; i++) {
            const normalized = (data[i] - min) / range;
            const bin = Math.min(Math.floor(normalized * bins), bins - 1);
            histogram[bin]++;
        }
        
        // Calcular entropía
        let entropy = 0;
        const total = data.length;
        
        for (let i = 0; i < bins; i++) {
            if (histogram[i] > 0) {
                const p = histogram[i] / total;
                entropy -= p * Math.log2(p);
            }
        }
        
        return entropy;
    },

    /**
     * Calcula todas las estadísticas de una banda
     * @param {Float32Array} coeffs
     * @returns {Object} Estadísticas completas
     */
    computeAll(coeffs) {
        const m = this.mean(coeffs);
        const v = this.variance(coeffs, m);
        const s = Math.sqrt(v);
        
        return {
            energy: this.energy(coeffs),
            mean: m,
            variance: v,
            std: s,
            skewness: this.skewness(coeffs),
            kurtosis: this.kurtosis(coeffs),
            entropy: this.entropy(coeffs)
        };
    }
};
