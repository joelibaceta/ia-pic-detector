/**
 * Extractor avanzado de features para deteccion IA.
 * Incluye: LBP, DCT ratios, FFT radial slope, PRNU/residual y GLCM residual.
 */

const AdvancedFeatureExtractor = {
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    },

    resizeNearest(image, targetW, targetH) {
        const src = image.data;
        const srcW = image.width;
        const srcH = image.height;
        const out = new Float32Array(targetW * targetH);

        const xRatio = srcW / targetW;
        const yRatio = srcH / targetH;

        for (let y = 0; y < targetH; y++) {
            const srcY = Math.min(srcH - 1, Math.floor(y * yRatio));
            for (let x = 0; x < targetW; x++) {
                const srcX = Math.min(srcW - 1, Math.floor(x * xRatio));
                out[y * targetW + x] = src[srcY * srcW + srcX];
            }
        }

        return { data: out, width: targetW, height: targetH };
    },

    ensureSize(grayImage, maxSide = 128, minSide = 32) {
        const { width, height } = grayImage;
        if (width <= maxSide && height <= maxSide && width >= minSide && height >= minSide) {
            return grayImage;
        }

        const ratio = Math.min(maxSide / width, maxSide / height);
        const scaledW = this.clamp(Math.floor(width * ratio), minSide, maxSide);
        const scaledH = this.clamp(Math.floor(height * ratio), minSide, maxSide);
        return this.resizeNearest(grayImage, scaledW, scaledH);
    },

    mean(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        return sum / (data.length || 1);
    },

    variance(data, meanValue = null) {
        const m = meanValue === null ? this.mean(data) : meanValue;
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const d = data[i] - m;
            sum += d * d;
        }
        return sum / (data.length || 1);
    },

    std(data, meanValue = null) {
        return Math.sqrt(this.variance(data, meanValue));
    },

    skewness(data) {
        const m = this.mean(data);
        const s = this.std(data, m);
        if (s === 0) return 0;
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const d = data[i] - m;
            sum += d * d * d;
        }
        return (sum / data.length) / Math.pow(s, 3);
    },

    kurtosis(data) {
        const m = this.mean(data);
        const v = this.variance(data, m);
        if (v === 0) return 0;
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const d = data[i] - m;
            sum += d * d * d * d;
        }
        return (sum / data.length) / (v * v) - 3;
    },

    entropyFromHistogram(hist) {
        let e = 0;
        let total = 0;
        for (let i = 0; i < hist.length; i++) total += hist[i];
        if (total === 0) return 0;
        for (let i = 0; i < hist.length; i++) {
            if (hist[i] <= 0) continue;
            const p = hist[i] / total;
            e -= p * Math.log2(p);
        }
        return e;
    },

    quantizedEntropy(data, bins = 64) {
        if (!data.length) return 0;
        let min = data[0];
        let max = data[0];
        for (let i = 1; i < data.length; i++) {
            if (data[i] < min) min = data[i];
            if (data[i] > max) max = data[i];
        }
        const range = max - min || 1;
        const hist = new Array(bins).fill(0);
        for (let i = 0; i < data.length; i++) {
            const bin = Math.min(bins - 1, Math.floor(((data[i] - min) / range) * bins));
            hist[bin] += 1;
        }
        return this.entropyFromHistogram(hist);
    },

    extractLBP(grayImage) {
        const image = this.ensureSize(grayImage, 160, 48);
        const { data, width, height } = image;
        const hist = new Array(16).fill(0);

        const offsets = [
            [-1, -1], [0, -1], [1, -1], [1, 0],
            [1, 1], [0, 1], [-1, 1], [-1, 0]
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const center = data[y * width + x];
                let code = 0;

                for (let i = 0; i < 8; i++) {
                    const nx = x + offsets[i][0];
                    const ny = y + offsets[i][1];
                    const n = data[ny * width + nx];
                    if (n >= center) {
                        code |= (1 << i);
                    }
                }

                const bin = code >> 4;
                hist[bin] += 1;
            }
        }

        const total = hist.reduce((a, b) => a + b, 0) || 1;
        const norm = hist.map((v) => v / total);
        const entropy = this.entropyFromHistogram(hist);
        const uniformity = Math.max(...norm);

        return {
            hist16: norm,
            entropy,
            uniformity
        };
    },

    dctBlock8x8(block) {
        const out = new Float32Array(64);
        const alpha = (k) => (k === 0 ? Math.sqrt(1 / 8) : Math.sqrt(2 / 8));

        const cosTable = this._dctCosTable || (() => {
            const table = Array.from({ length: 8 }, () => new Float32Array(8));
            for (let u = 0; u < 8; u++) {
                for (let x = 0; x < 8; x++) {
                    table[u][x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
                }
            }
            this._dctCosTable = table;
            return table;
        })();

        for (let v = 0; v < 8; v++) {
            for (let u = 0; u < 8; u++) {
                let sum = 0;
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        sum += block[y * 8 + x] * cosTable[u][x] * cosTable[v][y];
                    }
                }
                out[v * 8 + u] = alpha(u) * alpha(v) * sum;
            }
        }

        return out;
    },

    extractDCT(grayImage) {
        const image = this.ensureSize(grayImage, 128, 64);
        const { data, width, height } = image;

        const blocksX = Math.floor(width / 8);
        const blocksY = Math.floor(height / 8);
        const maxBlocks = 160;

        let low = 0;
        let mid = 0;
        let high = 0;
        let totalBlocks = 0;

        for (let by = 0; by < blocksY; by++) {
            for (let bx = 0; bx < blocksX; bx++) {
                if (totalBlocks >= maxBlocks) break;

                const block = new Float32Array(64);
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        const xx = bx * 8 + x;
                        const yy = by * 8 + y;
                        block[y * 8 + x] = data[yy * width + xx] - 128;
                    }
                }

                const coeff = this.dctBlock8x8(block);

                for (let v = 0; v < 8; v++) {
                    for (let u = 0; u < 8; u++) {
                        if (u === 0 && v === 0) continue;
                        const band = u + v;
                        const e = coeff[v * 8 + u] * coeff[v * 8 + u];
                        if (band <= 3) low += e;
                        else if (band <= 6) mid += e;
                        else high += e;
                    }
                }

                totalBlocks += 1;
            }
            if (totalBlocks >= maxBlocks) break;
        }

        const total = low + mid + high + 1e-10;
        const lowRatio = low / total;
        const midRatio = mid / total;
        const highRatio = high / total;

        const slope = Math.log((highRatio + 1e-8) / (lowRatio + 1e-8));

        return {
            lowRatio,
            midRatio,
            highRatio,
            slope
        };
    },

    fft1D(real, imag) {
        const n = real.length;
        let j = 0;

        for (let i = 1; i < n; i++) {
            let bit = n >> 1;
            while (j & bit) {
                j ^= bit;
                bit >>= 1;
            }
            j ^= bit;
            if (i < j) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }

        for (let len = 2; len <= n; len <<= 1) {
            const ang = -2 * Math.PI / len;
            const wlenCos = Math.cos(ang);
            const wlenSin = Math.sin(ang);

            for (let i = 0; i < n; i += len) {
                let wCos = 1;
                let wSin = 0;
                for (let j2 = 0; j2 < len / 2; j2++) {
                    const uR = real[i + j2];
                    const uI = imag[i + j2];

                    const vR = real[i + j2 + len / 2] * wCos - imag[i + j2 + len / 2] * wSin;
                    const vI = real[i + j2 + len / 2] * wSin + imag[i + j2 + len / 2] * wCos;

                    real[i + j2] = uR + vR;
                    imag[i + j2] = uI + vI;
                    real[i + j2 + len / 2] = uR - vR;
                    imag[i + j2 + len / 2] = uI - vI;

                    const nextCos = wCos * wlenCos - wSin * wlenSin;
                    const nextSin = wCos * wlenSin + wSin * wlenCos;
                    wCos = nextCos;
                    wSin = nextSin;
                }
            }
        }
    },

    extractFFT(grayImage) {
        const sample = this.ensureSize(grayImage, 64, 64);
        const size = 64;
        const data = this.resizeNearest(sample, size, size).data;

        const re = Array.from({ length: size }, () => new Float64Array(size));
        const im = Array.from({ length: size }, () => new Float64Array(size));

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                re[y][x] = data[y * size + x] - 128;
                im[y][x] = 0;
            }
            this.fft1D(re[y], im[y]);
        }

        for (let x = 0; x < size; x++) {
            const colRe = new Float64Array(size);
            const colIm = new Float64Array(size);
            for (let y = 0; y < size; y++) {
                colRe[y] = re[y][x];
                colIm[y] = im[y][x];
            }
            this.fft1D(colRe, colIm);
            for (let y = 0; y < size; y++) {
                re[y][x] = colRe[y];
                im[y][x] = colIm[y];
            }
        }

        const maxR = Math.floor(Math.sqrt(2 * (size / 2) * (size / 2)));
        const radialSum = new Float64Array(maxR + 1);
        const radialCount = new Uint32Array(maxR + 1);

        let lowEnergy = 0;
        let highEnergy = 0;
        let totalEnergy = 0;

        for (let y = 0; y < size; y++) {
            const fy = y <= size / 2 ? y : y - size;
            for (let x = 0; x < size; x++) {
                const fx = x <= size / 2 ? x : x - size;
                const mag2 = re[y][x] * re[y][x] + im[y][x] * im[y][x];
                const r = Math.floor(Math.sqrt(fx * fx + fy * fy));

                radialSum[r] += mag2;
                radialCount[r] += 1;

                totalEnergy += mag2;
                if (r <= 6) lowEnergy += mag2;
                if (r >= 18) highEnergy += mag2;
            }
        }

        const xs = [];
        const ys = [];
        const normalizedBand = [];
        for (let r = 1; r <= maxR; r++) {
            if (!radialCount[r]) continue;
            const p = radialSum[r] / radialCount[r];
            if (p <= 0) continue;
            xs.push(Math.log(r + 1e-8));
            ys.push(Math.log(p + 1e-12));
            normalizedBand.push(p);
        }

        const xMean = this.mean(xs);
        const yMean = this.mean(ys);
        let num = 0;
        let den = 0;
        for (let i = 0; i < xs.length; i++) {
            const dx = xs[i] - xMean;
            num += dx * (ys[i] - yMean);
            den += dx * dx;
        }
        const radialSlope = den === 0 ? 0 : num / den;

        const gm = Math.exp(ys.reduce((a, b) => a + b, 0) / (ys.length || 1));
        const am = normalizedBand.reduce((a, b) => a + b, 0) / (normalizedBand.length || 1);
        const spectralFlatness = gm / (am + 1e-12);

        return {
            radialSlope,
            lowHighRatio: lowEnergy / (highEnergy + 1e-10),
            spectralFlatness,
            totalEnergy
        };
    },

    blur3x3(grayImage) {
        const { data, width, height } = grayImage;
        const out = new Float32Array(data.length);
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let wsum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const xx = this.clamp(x + kx, 0, width - 1);
                        const yy = this.clamp(y + ky, 0, height - 1);
                        const w = kernel[ky + 1][kx + 1];
                        sum += data[yy * width + xx] * w;
                        wsum += w;
                    }
                }
                out[y * width + x] = sum / wsum;
            }
        }

        return { data: out, width, height };
    },

    extractResidual(grayImage) {
        const image = this.ensureSize(grayImage, 160, 64);
        const blurred = this.blur3x3(image);

        const residual = new Float32Array(image.data.length);
        for (let i = 0; i < image.data.length; i++) {
            residual[i] = image.data[i] - blurred.data[i];
        }

        const mean = this.mean(residual);
        const std = this.std(residual, mean);
        const skewness = this.skewness(residual);
        const kurtosis = this.kurtosis(residual);
        const entropy = this.quantizedEntropy(residual, 64);

        const signalStd = this.std(image.data);
        let residualEnergy = 0;
        let signalEnergy = 0;
        for (let i = 0; i < residual.length; i++) {
            residualEnergy += residual[i] * residual[i];
            signalEnergy += image.data[i] * image.data[i];
        }

        return {
            residual,
            width: image.width,
            height: image.height,
            stats: {
                mean,
                std,
                skewness,
                kurtosis,
                entropy,
                prnuStrength: std / (signalStd + 1e-10),
                hfNoiseRatio: residualEnergy / (signalEnergy + 1e-10)
            }
        };
    },

    quantizeResidual(value, mean, std, levels = 16) {
        const span = 3 * (std + 1e-8);
        const v = this.clamp((value - mean) / span, -1, 1);
        return this.clamp(Math.floor(((v + 1) * 0.5) * levels), 0, levels - 1);
    },

    glcmForOffset(residualData, width, height, dx, dy, levels = 16) {
        const matrix = Array.from({ length: levels }, () => new Float64Array(levels));

        const m = this.mean(residualData);
        const s = this.std(residualData, m);

        let count = 0;
        for (let y = 0; y < height; y++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let x = 0; x < width; x++) {
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;

                const a = this.quantizeResidual(residualData[y * width + x], m, s, levels);
                const b = this.quantizeResidual(residualData[ny * width + nx], m, s, levels);
                matrix[a][b] += 1;
                count += 1;
            }
        }

        if (count === 0) return matrix;
        for (let i = 0; i < levels; i++) {
            for (let j = 0; j < levels; j++) {
                matrix[i][j] /= count;
            }
        }

        return matrix;
    },

    glcmStats(matrix) {
        const levels = matrix.length;
        let contrast = 0;
        let homogeneity = 0;
        let energy = 0;
        let muX = 0;
        let muY = 0;

        for (let i = 0; i < levels; i++) {
            for (let j = 0; j < levels; j++) {
                const p = matrix[i][j];
                contrast += (i - j) * (i - j) * p;
                homogeneity += p / (1 + Math.abs(i - j));
                energy += p * p;
                muX += i * p;
                muY += j * p;
            }
        }

        let varX = 0;
        let varY = 0;
        let corrNum = 0;
        for (let i = 0; i < levels; i++) {
            for (let j = 0; j < levels; j++) {
                const p = matrix[i][j];
                varX += (i - muX) * (i - muX) * p;
                varY += (j - muY) * (j - muY) * p;
                corrNum += (i - muX) * (j - muY) * p;
            }
        }

        const correlation = corrNum / (Math.sqrt(varX * varY) + 1e-10);

        return { contrast, homogeneity, energy, correlation };
    },

    extractResidualGLCM(residualObj) {
        const { residual, width, height } = residualObj;
        const offsets = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];

        const stats = offsets.map(([dx, dy]) => {
            const m = this.glcmForOffset(residual, width, height, dx, dy, 16);
            return this.glcmStats(m);
        });

        const avg = {
            contrast: 0,
            homogeneity: 0,
            energy: 0,
            correlation: 0
        };

        for (const s of stats) {
            avg.contrast += s.contrast;
            avg.homogeneity += s.homogeneity;
            avg.energy += s.energy;
            avg.correlation += s.correlation;
        }

        const n = stats.length || 1;
        avg.contrast /= n;
        avg.homogeneity /= n;
        avg.energy /= n;
        avg.correlation /= n;

        return avg;
    },

    extract(grayImage) {
        const lbp = this.extractLBP(grayImage);
        const dct = this.extractDCT(grayImage);
        const fft = this.extractFFT(grayImage);
        const residualObj = this.extractResidual(grayImage);
        const glcm = this.extractResidualGLCM(residualObj);

        return {
            lbp,
            dct,
            fft,
            residual: residualObj.stats,
            glcm
        };
    }
};
