/**
 * Métricas de Anomalía para Detección de IA
 * Implementa las 6 métricas principales de detección
 */

const AnomalyMetrics = {
    /**
     * Calcula ratios de energía directamente desde energías ya agregadas.
     * Evita re-aplicar Statistics.energy() sobre valores que ya son energía.
     */
    getLevel1EnergyRatios(level1) {
        const energies = {
            LL: level1.LL.energy,
            LH: level1.LH.energy,
            HL: level1.HL.energy,
            HH: level1.HH.energy
        };

        const totalEnergy = energies.LL + energies.LH + energies.HL + energies.HH + 1e-10;

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
     * 1. Distribución de energía anómala
     * Las IA concentran energía en bajas frecuencias
     */
    energyDistribution(features) {
        const level1 = features[0];
        const ratios = this.getLevel1EnergyRatios(level1);
        
        const llRatio = ratios.LL_ratio;
        const hhRatio = ratios.HH_ratio;
        
        // IA: LL extremadamente alto (>0.90) Y HH extremadamente bajo (<0.02)
        // Rango natural: LL=0.6-0.85, HH=0.03-0.15
        let anomalyScore = 0;
        if (llRatio > 0.90 && hhRatio < 0.02) {
            anomalyScore = (llRatio - 0.90) / 0.10 * (0.02 - hhRatio) / 0.02;
        }
        
        return {
            score: Math.min(anomalyScore, 1),
            llRatio,
            hhRatio,
            isAnomalous: anomalyScore > Thresholds.anomaly.energyDistribution
        };
    },

    /**
     * 2. Patrón de ruido no físico en HH
     * Kurtosis anómala indica ruido sintético
     */
    noisePattern(features) {
        const hhStats = features.map(f => f.HH);
        const avgKurtosis = hhStats.reduce((sum, s) => sum + s.kurtosis, 0) / hhStats.length;
        
        // Kurtosis natural: -1 a 5, sintético: <-2 o >8
        let kurtosisAnomaly = 0;
        if (avgKurtosis < -2) {
            kurtosisAnomaly = Math.min((-2 - avgKurtosis) / 3, 1);
        } else if (avgKurtosis > 8) {
            kurtosisAnomaly = Math.min((avgKurtosis - 8) / 5, 1);
        }
        
        return {
            score: kurtosisAnomaly,
            avgKurtosis,
            isAnomalous: kurtosisAnomaly > Thresholds.anomaly.noisePattern
        };
    },

    /**
     * 3. Correlación inter-escala
     * Compara ratios de energía entre niveles
     */
    interScaleCorrelation(features) {
        if (features.length < 2) {
            return { score: 0, isAnomalous: false, details: 'Insufficient levels' };
        }
        
        let correlationAnomaly = 0;
        
        for (let i = 0; i < features.length - 1; i++) {
            const ratio = features[i].HH.energy / (features[i + 1].HH.energy + 1e-10);
            
            // Natural: 1.5-12, IA: <1 o >15 (más tolerante)
            if (ratio < 1.0 || ratio > 15) {
                correlationAnomaly += 1;
            }
        }
        
        const score = correlationAnomaly / (features.length - 1);
        
        return {
            score,
            isAnomalous: score > Thresholds.anomaly.interScaleCorrelation
        };
    },

    /**
     * 4. Sobre-suavizado en banda LL
     * Entropía baja indica texturas artificiales
     */
    llSmoothness(features) {
        const llEntropies = features.map(f => f.LL.entropy);
        const avgEntropy = llEntropies.reduce((a, b) => a + b, 0) / llEntropies.length;
        
        // Entropía < 5 indica sobre-suavizado extremo (rango natural: 6-8)
        const smoothnessScore = avgEntropy < 5 ? (5 - avgEntropy) / 5 : 0;
        
        return {
            score: smoothnessScore,
            avgEntropy,
            isAnomalous: smoothnessScore > Thresholds.anomaly.llSmoothness
        };
    },

    /**
     * 5. Ratio HL/LH (direccionalidad)
     * Desbalance indica sesgos del modelo
     */
    hlLhRatio(features) {
        const level1 = features[0];
        const ratio = level1.HL.energy / (level1.LH.energy + 1e-10);
        
        // Natural: 0.8-1.2, IA: desbalance direccional
        const deviation = Math.abs(Math.log(ratio));
        const score = Math.min(deviation / 0.5, 1);
        
        return {
            score,
            ratio,
            isAnomalous: score > Thresholds.anomaly.hlLhRatio
        };
    },

    /**
     * 6. Gap en frecuencias medias
     * IA sub-representa frecuencias medias
     */
    midFrequencyGap(features) {
        const level1 = features[0];
        const ratios = this.getLevel1EnergyRatios(level1);
        
        const midRatio = ratios.mid_ratio;
        
        // Natural: 0.25-0.5, IA: <0.15 (gap significativo)
        const gapScore = midRatio < 0.15 ? (0.15 - midRatio) / 0.15 : 0;
        
        return {
            score: gapScore,
            midRatio,
            isAnomalous: gapScore > Thresholds.anomaly.midFrequencyGap
        };
    },

    /**
     * Calcula todas las métricas
     */
    computeAll(features) {
        return {
            energyDistribution: this.energyDistribution(features),
            noisePattern: this.noisePattern(features),
            interScaleCorrelation: this.interScaleCorrelation(features),
            llSmoothness: this.llSmoothness(features),
            hlLhRatio: this.hlLhRatio(features),
            midFrequencyGap: this.midFrequencyGap(features)
        };
    }
};
