/**
 * Extractor de Características Wavelet
 * Extrae estadísticas de todas las bandas en todos los niveles
 */

const FeatureExtractor = {
    /**
     * Extrae características de todos los niveles wavelet
     * @param {Object} waveletCoeffs - Resultado de Wavelet.dwt2D()
     * @returns {Array} Array de características por nivel
     */
    extractAll(waveletCoeffs) {
        const features = [];
        
        for (let level = 0; level < waveletCoeffs.levels.length; level++) {
            const { LL, LH, HL, HH } = waveletCoeffs.levels[level];
            
            features.push({
                level: level + 1,
                LL: Statistics.computeAll(LL.data),
                LH: Statistics.computeAll(LH.data),
                HL: Statistics.computeAll(HL.data),
                HH: Statistics.computeAll(HH.data),
                correlations: Correlation.interBandCorrelations(waveletCoeffs.levels[level])
            });
        }
        
        return features;
    },

    /**
     * Extrae características específicas de una banda
     * @param {Object} band - { data, width, height }
     * @param {string} bandName - Nombre de la banda
     * @returns {Object}
     */
    extractBandFeatures(band, bandName) {
        return {
            band: bandName,
            ...Statistics.computeAll(band.data),
            size: band.data.length,
            dimensions: { width: band.width, height: band.height }
        };
    },

    /**
     * Calcula ratios de energía entre bandas
     * @param {Object} level - Un nivel wavelet { LL, LH, HL, HH }
     * @returns {Object}
     */
    energyRatios(level) {
        const energies = {
            LL: Statistics.energy(level.LL.data),
            LH: Statistics.energy(level.LH.data),
            HL: Statistics.energy(level.HL.data),
            HH: Statistics.energy(level.HH.data)
        };
        
        const totalEnergy = energies.LL + energies.LH + energies.HL + energies.HH;
        
        return {
            LL_ratio: energies.LL / totalEnergy,
            LH_ratio: energies.LH / totalEnergy,
            HL_ratio: energies.HL / totalEnergy,
            HH_ratio: energies.HH / totalEnergy,
            HL_LH_ratio: energies.HL / (energies.LH + 1e-10),
            mid_ratio: (energies.LH + energies.HL) / totalEnergy,
            high_ratio: energies.HH / totalEnergy
        };
    },

    /**
     * Resume todas las características en un vector compacto
     * @param {Array} features - Features de todos los niveles
     * @returns {Object} Vector de características resumido
     */
    summarize(features) {
        const level1 = features[0];
        
        // Calcular ratios de energía
        const totalEnergy = level1.LL.energy + level1.LH.energy + level1.HL.energy + level1.HH.energy;
        
        return {
            // Energías nivel 1
            energy_LL: level1.LL.energy,
            energy_LH: level1.LH.energy,
            energy_HL: level1.HL.energy,
            energy_HH: level1.HH.energy,
            
            // Ratios
            LL_ratio: level1.LL.energy / totalEnergy,
            LH_ratio: level1.LH.energy / totalEnergy,
            HL_ratio: level1.HL.energy / totalEnergy,
            HH_ratio: level1.HH.energy / totalEnergy,
            HL_LH_ratio: level1.HL.energy / (level1.LH.energy + 1e-10),
            mid_ratio: (level1.LH.energy + level1.HL.energy) / totalEnergy,
            
            // Estadísticas de ruido (HH)
            HH_kurtosis: level1.HH.kurtosis,
            HH_skewness: level1.HH.skewness,
            HH_entropy: level1.HH.entropy,
            
            // Suavidad (LL)
            LL_entropy: level1.LL.entropy,
            LL_std: level1.LL.std,
            
            // Correlaciones
            LH_HL_corr: level1.correlations?.LH_HL || 0,
            LH_HH_corr: level1.correlations?.LH_HH || 0,
            HL_HH_corr: level1.correlations?.HL_HH || 0,
            
            // Promedio de entropías
            avg_entropy: (level1.LH.entropy + level1.HL.entropy + level1.HH.entropy) / 3
        };
    }
};
