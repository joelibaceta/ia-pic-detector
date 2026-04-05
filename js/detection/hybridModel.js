/**
 * HybridModel: complemento ML (tiny NN) sobre features wavelet.
 * Carga opcionalmente un modelo JSON entrenado offline.
 */

const HybridModel = {
    _model: null,
    _loadAttempted: false,

    async ensureLoaded(modelPath = 'hybrid-model.json') {
        if (this._model || this._loadAttempted) {
            return this._model;
        }

        this._loadAttempted = true;

        if (typeof fetch === 'undefined') {
            return null;
        }

        try {
            const response = await fetch(modelPath, { cache: 'no-store' });
            if (!response.ok) {
                return null;
            }

            const model = await response.json();
            if (!model || !Array.isArray(model.mean) || !Array.isArray(model.std)) {
                return null;
            }

            this._model = model;
            return this._model;
        } catch (error) {
            console.warn('Hybrid model not loaded:', error?.message || error);
            return null;
        }
    },

    sigmoid(x) {
        if (x >= 0) {
            const z = Math.exp(-x);
            return 1 / (1 + z);
        }
        const z = Math.exp(x);
        return z / (1 + z);
    },

    relu(x) {
        return x > 0 ? x : 0;
    },

    clamp01(v) {
        return Math.min(1, Math.max(0, v));
    },

    buildFeatureMap(summary, metrics, waveletScore, advancedFeatures = null) {
        const safeScore = (metric) => {
            const score = metric?.score ?? 0;
            return Number.isFinite(score) ? this.clamp01(score) : 0;
        };

        const get = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

        const lbp = advancedFeatures?.lbp || {};
        const dct = advancedFeatures?.dct || {};
        const fft = advancedFeatures?.fft || {};
        const residual = advancedFeatures?.residual || {};
        const glcm = advancedFeatures?.glcm || {};
        const regional = advancedFeatures?.regional || {};

        return {
            metric_energyDistribution: safeScore(metrics.energyDistribution),
            metric_noisePattern: safeScore(metrics.noisePattern),
            metric_interScaleCorrelation: safeScore(metrics.interScaleCorrelation),
            metric_llSmoothness: safeScore(metrics.llSmoothness),
            metric_hlLhRatio: safeScore(metrics.hlLhRatio),
            metric_midFrequencyGap: safeScore(metrics.midFrequencyGap),
            metric_lbpPattern: safeScore(metrics.lbpPattern),
            metric_dctBand: safeScore(metrics.dctBand),
            metric_fftRadial: safeScore(metrics.fftRadial),
            metric_prnuResidual: safeScore(metrics.prnuResidual),
            metric_residualCooccurrence: safeScore(metrics.residualCooccurrence),

            summary_LL_ratio: this.clamp01(get(summary.LL_ratio, 0)),
            summary_HH_ratio: this.clamp01(get(summary.HH_ratio, 0)),
            summary_mid_ratio: this.clamp01(get(summary.mid_ratio, 0)),
            summary_HL_LH_ratio: this.clamp01(Math.min(get(summary.HL_LH_ratio, 0) / 3, 1)),
            summary_HH_kurtosis: this.clamp01((get(summary.HH_kurtosis, 0) + 3) / 12),
            summary_HH_entropy: this.clamp01(get(summary.HH_entropy, 0) / 8),
            summary_LL_entropy: this.clamp01(get(summary.LL_entropy, 0) / 8),
            summary_avg_entropy: this.clamp01(get(summary.avg_entropy, 0) / 8),

            adv_lbp_entropy: this.clamp01(get(lbp.entropy, 0) / 4),
            adv_lbp_uniformity: this.clamp01(get(lbp.uniformity, 0)),
            adv_dct_midRatio: this.clamp01(get(dct.midRatio, 0)),
            adv_dct_highRatio: this.clamp01(get(dct.highRatio, 0)),
            adv_dct_slope: this.clamp01((get(dct.slope, -1) + 2) / 2),
            adv_fft_radialSlope: this.clamp01((get(fft.radialSlope, -2) + 4) / 4),
            adv_fft_lowHighRatio: this.clamp01(Math.min(get(fft.lowHighRatio, 0) / 12, 1)),
            adv_fft_flatness: this.clamp01(get(fft.spectralFlatness, 0)),
            adv_prnu_strength: this.clamp01(Math.min(get(residual.prnuStrength, 0) / 0.5, 1)),
            adv_prnu_hfNoiseRatio: this.clamp01(Math.min(get(residual.hfNoiseRatio, 0) / 0.4, 1)),
            adv_residual_kurtosis: this.clamp01((get(residual.kurtosis, 0) + 3) / 12),
            adv_glcm_contrast: this.clamp01(Math.min(get(glcm.contrast, 0) / 5, 1)),
            adv_glcm_homogeneity: this.clamp01(get(glcm.homogeneity, 0)),
            adv_glcm_energy: this.clamp01(Math.min(get(glcm.energy, 0) / 0.3, 1)),
            adv_glcm_correlation: this.clamp01((get(glcm.correlation, 0) + 1) / 2),
            reg_lab_distance: this.clamp01(Math.min(get(regional.labDistance, 0) / 50, 1)),
            reg_sharpness_ratio: this.clamp01(Math.min(get(regional.sharpnessRatio, 0) / 3, 1)),
            reg_contour_gradient: this.clamp01(Math.min(get(regional.contourGradient, 0) / 120, 1)),
            reg_skin_lbp_diff: this.clamp01((get(regional.skinLbpDiff, 0) + 3) / 6),
            reg_skin_glcm_diff: this.clamp01((get(regional.skinGlcmDiff, 0) + 20) / 40),
            reg_noise_consistency: this.clamp01(get(regional.noiseConsistency, 0)),
            reg_fft_profile_diff: this.clamp01((get(regional.fftProfileDiff, 0) + 2.5) / 5),
            reg_local_contrast_ratio: this.clamp01(Math.min(get(regional.localContrastRatio, 0) / 3, 1)),
            reg_jpeg_block_inconsistency: this.clamp01(Math.min(get(regional.jpegBlockInconsistency, 0) / 3, 1)),
            wavelet_score: this.clamp01(get(waveletScore, 0))
        };
    },

    buildFeatureVector(summary, metrics, waveletScore, advancedFeatures, model) {
        const featureMap = this.buildFeatureMap(summary, metrics, waveletScore, advancedFeatures);

        if (Array.isArray(model?.featureKeys) && model.featureKeys.length > 0) {
            return model.featureKeys.map((key) => this.clamp01(featureMap[key] ?? 0));
        }

        return [
            featureMap.metric_energyDistribution,
            featureMap.metric_noisePattern,
            featureMap.metric_interScaleCorrelation,
            featureMap.metric_llSmoothness,
            featureMap.metric_hlLhRatio,
            featureMap.metric_midFrequencyGap,
            featureMap.summary_LL_ratio,
            featureMap.summary_HH_ratio,
            featureMap.summary_mid_ratio,
            featureMap.summary_HL_LH_ratio,
            featureMap.summary_HH_kurtosis,
            featureMap.summary_HH_entropy,
            featureMap.summary_LL_entropy,
            featureMap.summary_avg_entropy,
            featureMap.wavelet_score
        ];
    },

    normalize(vector, mean, std) {
        const out = new Array(vector.length);
        for (let i = 0; i < vector.length; i++) {
            const m = mean[i] ?? 0;
            const s = std[i] ?? 1;
            out[i] = (vector[i] - m) / (s + 1e-8);
        }
        return out;
    },

    predictNN(vector, model) {
        const x = this.normalize(vector, model.mean, model.std);
        const hiddenSize = model.hiddenSize;
        const inputSize = model.inputSize;

        const hidden = new Array(hiddenSize).fill(0);
        for (let h = 0; h < hiddenSize; h++) {
            let z = model.b1[h] || 0;
            const row = model.W1[h];
            for (let i = 0; i < inputSize; i++) {
                z += (row[i] || 0) * x[i];
            }
            hidden[h] = this.relu(z);
        }

        let z2 = model.b2 || 0;
        for (let h = 0; h < hiddenSize; h++) {
            z2 += (model.W2[h] || 0) * hidden[h];
        }

        return this.sigmoid(z2);
    },

    predictLogistic(vector, model) {
        const x = this.normalize(vector, model.mean, model.std);
        let z = model.b || 0;
        const w = model.W || [];
        for (let i = 0; i < x.length; i++) {
            z += (w[i] || 0) * x[i];
        }
        return this.sigmoid(z);
    },

    predictRFTree(tree, row) {
        let node = tree;
        while (node && !node.leaf) {
            node = row[node.feature] <= node.threshold ? node.left : node.right;
        }
        return node?.prob ?? 0.5;
    },

    predictRandomForest(vector, model) {
        const x = this.normalize(vector, model.mean, model.std);
        const trees = Array.isArray(model.trees) ? model.trees : [];
        if (!trees.length) return 0.5;
        let sum = 0;
        for (const tree of trees) {
            sum += this.predictRFTree(tree, x);
        }
        return this.clamp01(sum / trees.length);
    },

    predict(summary, metrics, waveletScore, advancedFeatures, model) {
        const vector = this.buildFeatureVector(summary, metrics, waveletScore, advancedFeatures, model);
        const modelType = model.modelType || 'nn';
        const nnProbability = modelType === 'logistic'
            ? this.predictLogistic(vector, model)
            : modelType === 'randomForest'
                ? this.predictRandomForest(vector, model)
                : this.predictNN(vector, model);

        const blendAlpha = Number.isFinite(model.blendAlpha) ? model.blendAlpha : 0.55;
        const finalScore = this.clamp01(blendAlpha * nnProbability + (1 - blendAlpha) * this.clamp01(waveletScore));
        const threshold = Number.isFinite(model.threshold) ? model.threshold : 0.5;

        return {
            nnProbability,
            finalScore,
            threshold,
            isAI: finalScore > threshold
        };
    }
};
