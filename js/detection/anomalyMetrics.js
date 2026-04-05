/**
 * Métricas de Anomalía para Detección de IA
 * Implementa las 6 métricas principales de detección
 */

const AnomalyMetrics = {
    clamp01(value) {
        return Math.min(1, Math.max(0, value));
    },

    outOfRangeScore(value, min, max, scale = 1) {
        if (!Number.isFinite(value)) return 1;
        if (value < min) return this.clamp01(((min - value) / ((max - min) * scale + 1e-10)));
        if (value > max) return this.clamp01(((value - max) / ((max - min) * scale + 1e-10)));
        return 0;
    },

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

        // Scoring continuo basado en desviación respecto a rangos naturales.
        const llDev = this.outOfRangeScore(
            llRatio,
            Thresholds.naturalImage.LL_ratio.min,
            Thresholds.naturalImage.LL_ratio.max,
            1.25
        );
        const hhDev = this.outOfRangeScore(
            hhRatio,
            Thresholds.naturalImage.HH_ratio.min,
            Thresholds.naturalImage.HH_ratio.max,
            1.1
        );

        const imbalance = this.clamp01(Math.abs(llRatio - hhRatio) / 0.9);
        const anomalyScore = this.clamp01(llDev * 0.45 + hhDev * 0.45 + imbalance * 0.10);
        
        return {
            score: anomalyScore,
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

        const kurtosisAnomaly = this.outOfRangeScore(
            avgKurtosis,
            Thresholds.naturalImage.HH_kurtosis.min,
            Thresholds.naturalImage.HH_kurtosis.max,
            1.2
        );

        const entropyValues = hhStats.map((s) => s.entropy);
        const avgEntropy = entropyValues.reduce((a, b) => a + b, 0) / entropyValues.length;
        const entropySpread = Math.sqrt(
            entropyValues.reduce((sum, e) => sum + (e - avgEntropy) * (e - avgEntropy), 0) / entropyValues.length
        );

        const spreadPenalty = this.clamp01(entropySpread / 1.25);
        const noiseScore = this.clamp01(kurtosisAnomaly * 0.8 + spreadPenalty * 0.2);
        
        return {
            score: noiseScore,
            avgKurtosis,
            isAnomalous: noiseScore > Thresholds.anomaly.noisePattern
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

        const ratios = [];
        for (let i = 0; i < features.length - 1; i++) {
            const ratio = features[i].HH.energy / (features[i + 1].HH.energy + 1e-10);
            ratios.push(ratio);
        }

        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const rangeScore = this.outOfRangeScore(
            avgRatio,
            Thresholds.naturalImage.interScaleRatio.min,
            Thresholds.naturalImage.interScaleRatio.max,
            1.2
        );

        const ratioStd = Math.sqrt(
            ratios.reduce((sum, r) => sum + (r - avgRatio) * (r - avgRatio), 0) / ratios.length
        );
        const stabilityPenalty = this.clamp01(ratioStd / (avgRatio + 1e-10));
        const score = this.clamp01(rangeScore * 0.7 + stabilityPenalty * 0.3);
        
        return {
            score,
            avgRatio,
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

        const entropyDev = this.outOfRangeScore(
            avgEntropy,
            Thresholds.naturalImage.LL_entropy.min,
            Thresholds.naturalImage.LL_entropy.max,
            1.25
        );

        const entropyStd = Math.sqrt(
            llEntropies.reduce((sum, e) => sum + (e - avgEntropy) * (e - avgEntropy), 0) / llEntropies.length
        );

        const tooFlatAcrossScales = this.clamp01((0.35 - entropyStd) / 0.35);
        const smoothnessScore = this.clamp01(entropyDev * 0.65 + tooFlatAcrossScales * 0.35);
        
        return {
            score: smoothnessScore,
            avgEntropy,
            entropyStd,
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

        const rangeScore = this.outOfRangeScore(
            ratio,
            Thresholds.naturalImage.HL_LH_ratio.min,
            Thresholds.naturalImage.HL_LH_ratio.max,
            1.0
        );

        const asymmetry = this.clamp01(Math.abs(Math.log(ratio)) / 1.25);
        const score = this.clamp01(rangeScore * 0.7 + asymmetry * 0.3);
        
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

        const midDev = this.outOfRangeScore(
            midRatio,
            Thresholds.naturalImage.mid_ratio.min,
            Thresholds.naturalImage.mid_ratio.max,
            1.1
        );

        const highDev = this.outOfRangeScore(
            ratios.high_ratio,
            Thresholds.naturalImage.HH_ratio.min,
            Thresholds.naturalImage.HH_ratio.max,
            1.25
        );

        const gapScore = this.clamp01(midDev * 0.75 + highDev * 0.25);
        
        return {
            score: gapScore,
            midRatio,
            isAnomalous: gapScore > Thresholds.anomaly.midFrequencyGap
        };
    },

    advancedUnavailable() {
        return {
            score: 0,
            isAnomalous: false,
            unavailable: true
        };
    },

    lbpPatternAnomaly(advanced) {
        if (!advanced?.lbp) return this.advancedUnavailable();

        const { entropy, uniformity } = advanced.lbp;
        const entropyScore = this.outOfRangeScore(
            entropy,
            Thresholds.advancedRef.lbpEntropy.min,
            Thresholds.advancedRef.lbpEntropy.max,
            1.1
        );
        const uniformityScore = this.outOfRangeScore(
            uniformity,
            Thresholds.advancedRef.lbpUniformity.min,
            Thresholds.advancedRef.lbpUniformity.max,
            1.0
        );

        const score = this.clamp01(entropyScore * 0.6 + uniformityScore * 0.4);
        return {
            score,
            entropy,
            uniformity,
            isAnomalous: score > Thresholds.anomaly.lbpPattern
        };
    },

    dctBandAnomaly(advanced) {
        if (!advanced?.dct) return this.advancedUnavailable();

        const { lowRatio, midRatio, highRatio, slope } = advanced.dct;
        const midScore = this.outOfRangeScore(
            midRatio,
            Thresholds.advancedRef.dctMidRatio.min,
            Thresholds.advancedRef.dctMidRatio.max,
            1.0
        );
        const highScore = this.outOfRangeScore(
            highRatio,
            Thresholds.advancedRef.dctHighRatio.min,
            Thresholds.advancedRef.dctHighRatio.max,
            1.0
        );
        const slopeScore = this.outOfRangeScore(
            slope,
            Thresholds.advancedRef.dctSlope.min,
            Thresholds.advancedRef.dctSlope.max,
            1.0
        );

        const score = this.clamp01(midScore * 0.35 + highScore * 0.35 + slopeScore * 0.30);
        return {
            score,
            lowRatio,
            midRatio,
            highRatio,
            slope,
            isAnomalous: score > Thresholds.anomaly.dctBand
        };
    },

    fftRadialAnomaly(advanced) {
        if (!advanced?.fft) return this.advancedUnavailable();

        const { radialSlope, lowHighRatio, spectralFlatness } = advanced.fft;
        const slopeScore = this.outOfRangeScore(
            radialSlope,
            Thresholds.advancedRef.fftRadialSlope.min,
            Thresholds.advancedRef.fftRadialSlope.max,
            1.0
        );
        const ratioScore = this.outOfRangeScore(
            lowHighRatio,
            Thresholds.advancedRef.fftLowHighRatio.min,
            Thresholds.advancedRef.fftLowHighRatio.max,
            1.1
        );
        const flatnessScore = this.outOfRangeScore(
            spectralFlatness,
            Thresholds.advancedRef.fftFlatness.min,
            Thresholds.advancedRef.fftFlatness.max,
            1.1
        );

        const score = this.clamp01(slopeScore * 0.4 + ratioScore * 0.35 + flatnessScore * 0.25);
        return {
            score,
            radialSlope,
            lowHighRatio,
            spectralFlatness,
            isAnomalous: score > Thresholds.anomaly.fftRadial
        };
    },

    prnuResidualAnomaly(advanced) {
        if (!advanced?.residual) return this.advancedUnavailable();

        const { prnuStrength, hfNoiseRatio, kurtosis } = advanced.residual;
        const prnuScore = this.outOfRangeScore(
            prnuStrength,
            Thresholds.advancedRef.prnuStrength.min,
            Thresholds.advancedRef.prnuStrength.max,
            1.0
        );
        const noiseScore = this.outOfRangeScore(
            hfNoiseRatio,
            Thresholds.advancedRef.hfNoiseRatio.min,
            Thresholds.advancedRef.hfNoiseRatio.max,
            1.0
        );
        const kurtosisScore = this.outOfRangeScore(
            kurtosis,
            Thresholds.advancedRef.residualKurtosis.min,
            Thresholds.advancedRef.residualKurtosis.max,
            1.2
        );

        const score = this.clamp01(prnuScore * 0.45 + noiseScore * 0.35 + kurtosisScore * 0.2);
        return {
            score,
            prnuStrength,
            hfNoiseRatio,
            residualKurtosis: kurtosis,
            isAnomalous: score > Thresholds.anomaly.prnuResidual
        };
    },

    residualCooccurrenceAnomaly(advanced) {
        if (!advanced?.glcm) return this.advancedUnavailable();

        const { contrast, homogeneity, energy, correlation } = advanced.glcm;
        const contrastScore = this.outOfRangeScore(
            contrast,
            Thresholds.advancedRef.glcmContrast.min,
            Thresholds.advancedRef.glcmContrast.max,
            1.2
        );
        const homogeneityScore = this.outOfRangeScore(
            homogeneity,
            Thresholds.advancedRef.glcmHomogeneity.min,
            Thresholds.advancedRef.glcmHomogeneity.max,
            1.1
        );
        const correlationScore = this.outOfRangeScore(
            correlation,
            Thresholds.advancedRef.glcmCorrelation.min,
            Thresholds.advancedRef.glcmCorrelation.max,
            1.1
        );
        const energyScore = this.outOfRangeScore(
            energy,
            Thresholds.advancedRef.glcmEnergy.min,
            Thresholds.advancedRef.glcmEnergy.max,
            1.0
        );

        const score = this.clamp01(
            contrastScore * 0.35 + homogeneityScore * 0.25 + correlationScore * 0.2 + energyScore * 0.2
        );

        return {
            score,
            contrast,
            homogeneity,
            energy,
            correlation,
            isAnomalous: score > Thresholds.anomaly.residualCooccurrence
        };
    },

    /**
     * Calcula todas las métricas
     */
    computeAll(features, advanced = null) {
        return {
            energyDistribution: this.energyDistribution(features),
            noisePattern: this.noisePattern(features),
            interScaleCorrelation: this.interScaleCorrelation(features),
            llSmoothness: this.llSmoothness(features),
            hlLhRatio: this.hlLhRatio(features),
            midFrequencyGap: this.midFrequencyGap(features),
            lbpPattern: this.lbpPatternAnomaly(advanced),
            dctBand: this.dctBandAnomaly(advanced),
            fftRadial: this.fftRadialAnomaly(advanced),
            prnuResidual: this.prnuResidualAnomaly(advanced),
            residualCooccurrence: this.residualCooccurrenceAnomaly(advanced)
        };
    }
};
