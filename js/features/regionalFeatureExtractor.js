/**
 * Features regionales sujeto/fondo para reforzar deteccion de artefactos de IA.
 * Implementa proxies robustos para:
 * 1) Distancia Lab sujeto/fondo
 * 2) Sharpness ratio sujeto/fondo (varianza de Laplaciano)
 * 3) Gradiente en banda de contorno
 * 4) LBP/GLCM en piel vs fondo
 * 5) Consistencia de residual por regiones
 * 6) FFT radial profile (diferencia sujeto/fondo)
 * 7) Estadisticas de contraste local
 * 8) Inconsistencia JPEG/bloques
 */

const RegionalFeatureExtractor = {
    clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    },

    mean(arr) {
        let s = 0;
        for (let i = 0; i < arr.length; i++) s += arr[i];
        return s / (arr.length || 1);
    },

    variance(arr, m = null) {
        const mu = m === null ? this.mean(arr) : m;
        let s = 0;
        for (let i = 0; i < arr.length; i++) {
            const d = arr[i] - mu;
            s += d * d;
        }
        return s / (arr.length || 1);
    },

    std(arr, m = null) {
        return Math.sqrt(this.variance(arr, m));
    },

    resizeNearestGray(grayImage, targetW, targetH) {
        const src = grayImage.data;
        const srcW = grayImage.width;
        const srcH = grayImage.height;
        const out = new Float32Array(targetW * targetH);

        const xRatio = srcW / targetW;
        const yRatio = srcH / targetH;

        for (let y = 0; y < targetH; y++) {
            const sy = Math.min(srcH - 1, Math.floor(y * yRatio));
            for (let x = 0; x < targetW; x++) {
                const sx = Math.min(srcW - 1, Math.floor(x * xRatio));
                out[y * targetW + x] = src[sy * srcW + sx];
            }
        }

        return { data: out, width: targetW, height: targetH };
    },

    gaussianBlur3x3(grayImage) {
        const { data, width, height } = grayImage;
        const out = new Float32Array(data.length);
        const k = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let ws = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const xx = this.clamp(x + kx, 0, width - 1);
                        const yy = this.clamp(y + ky, 0, height - 1);
                        const w = k[ky + 1][kx + 1];
                        sum += data[yy * width + xx] * w;
                        ws += w;
                    }
                }
                out[y * width + x] = sum / (ws || 1);
            }
        }

        return { data: out, width, height };
    },

    sobelMagnitude(grayImage) {
        const { data, width, height } = grayImage;
        const out = new Float32Array(data.length);
        const gxK = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        const gyK = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const p = data[(y + ky) * width + (x + kx)];
                        gx += p * gxK[ky + 1][kx + 1];
                        gy += p * gyK[ky + 1][kx + 1];
                    }
                }
                out[y * width + x] = Math.sqrt(gx * gx + gy * gy);
            }
        }

        return { data: out, width, height };
    },

    laplacian(grayImage) {
        const { data, width, height } = grayImage;
        const out = new Float32Array(data.length);
        const k = [
            [0, 1, 0],
            [1, -4, 1],
            [0, 1, 0]
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let v = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const p = data[(y + ky) * width + (x + kx)];
                        v += p * k[ky + 1][kx + 1];
                    }
                }
                out[y * width + x] = v;
            }
        }

        return { data: out, width, height };
    },

    createSubjectMask(width, height) {
        const mask = new Uint8Array(width * height);
        const cx = width / 2;
        const cy = height / 2;
        const rx = width * 0.32;
        const ry = height * 0.42;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = (x - cx) / (rx || 1);
                const ny = (y - cy) / (ry || 1);
                const inside = nx * nx + ny * ny <= 1;
                mask[y * width + x] = inside ? 1 : 0;
            }
        }
        return mask;
    },

    createBackgroundMask(width, height, subjectMask) {
        const mask = new Uint8Array(width * height);
        const marginX = Math.floor(width * 0.06);
        const marginY = Math.floor(height * 0.06);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const insideMargins = x >= marginX && x < width - marginX && y >= marginY && y < height - marginY;
                mask[idx] = !insideMargins || subjectMask[idx] ? 0 : 1;
            }
        }

        return mask;
    },

    createContourBand(width, height, subjectMask) {
        const band = new Uint8Array(width * height);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const s = subjectMask[idx];
                let diff = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const n = subjectMask[(y + ky) * width + (x + kx)];
                        if (n !== s) {
                            diff = 1;
                            break;
                        }
                    }
                    if (diff) break;
                }
                band[idx] = diff;
            }
        }

        return band;
    },

    collectByMask(values, mask) {
        const out = [];
        for (let i = 0; i < values.length; i++) {
            if (mask[i]) out.push(values[i]);
        }
        return out;
    },

    rgbToLab(r, g, b) {
        let rr = r / 255;
        let gg = g / 255;
        let bb = b / 255;

        rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
        gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
        bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

        const X = rr * 0.4124 + gg * 0.3576 + bb * 0.1805;
        const Y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
        const Z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505;

        const xn = 0.95047;
        const yn = 1.0;
        const zn = 1.08883;

        const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116));

        const fx = f(X / xn);
        const fy = f(Y / yn);
        const fz = f(Z / zn);

        return {
            L: 116 * fy - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz)
        };
    },

    meanLabForMask(imageData, mask) {
        const { data, width, height } = imageData;
        let sL = 0;
        let sa = 0;
        let sb = 0;
        let n = 0;

        for (let i = 0; i < width * height; i++) {
            if (!mask[i]) continue;
            const idx = i * 4;
            const lab = this.rgbToLab(data[idx], data[idx + 1], data[idx + 2]);
            sL += lab.L;
            sa += lab.a;
            sb += lab.b;
            n += 1;
        }

        if (!n) return { L: 0, a: 0, b: 0 };
        return { L: sL / n, a: sa / n, b: sb / n };
    },

    skinMaskFromRGB(imageData) {
        const { data, width, height } = imageData;
        const out = new Uint8Array(width * height);

        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const isSkin =
                r > 95 && g > 40 && b > 20 &&
                (max - min) > 15 &&
                Math.abs(r - g) > 15 &&
                r > g && r > b;

            out[i] = isSkin ? 1 : 0;
        }

        return out;
    },

    lbpEntropyByMask(grayImage, mask) {
        const { data, width, height } = grayImage;
        const hist = new Array(16).fill(0);
        const offsets = [
            [-1, -1], [0, -1], [1, -1], [1, 0],
            [1, 1], [0, 1], [-1, 1], [-1, 0]
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (!mask[idx]) continue;
                const c = data[idx];
                let code = 0;
                for (let i = 0; i < 8; i++) {
                    const nx = x + offsets[i][0];
                    const ny = y + offsets[i][1];
                    if (data[ny * width + nx] >= c) code |= (1 << i);
                }
                hist[code >> 4] += 1;
            }
        }

        const total = hist.reduce((a, b) => a + b, 0) || 1;
        let entropy = 0;
        for (let i = 0; i < hist.length; i++) {
            if (hist[i] <= 0) continue;
            const p = hist[i] / total;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    },

    glcmContrastByMask(grayImage, mask, levels = 16) {
        const { data, width, height } = grayImage;
        const matrix = Array.from({ length: levels }, () => new Float64Array(levels));
        let count = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width - 1; x++) {
                const idx = y * width + x;
                const idx2 = idx + 1;
                if (!mask[idx] || !mask[idx2]) continue;

                const a = this.clamp(Math.floor((data[idx] / 256) * levels), 0, levels - 1);
                const b = this.clamp(Math.floor((data[idx2] / 256) * levels), 0, levels - 1);
                matrix[a][b] += 1;
                count += 1;
            }
        }

        if (!count) return 0;
        let contrast = 0;
        for (let i = 0; i < levels; i++) {
            for (let j = 0; j < levels; j++) {
                const p = matrix[i][j] / count;
                contrast += (i - j) * (i - j) * p;
            }
        }
        return contrast;
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
                for (let k = 0; k < len / 2; k++) {
                    const uR = real[i + k];
                    const uI = imag[i + k];
                    const vR = real[i + k + len / 2] * wCos - imag[i + k + len / 2] * wSin;
                    const vI = real[i + k + len / 2] * wSin + imag[i + k + len / 2] * wCos;

                    real[i + k] = uR + vR;
                    imag[i + k] = uI + vI;
                    real[i + k + len / 2] = uR - vR;
                    imag[i + k + len / 2] = uI - vI;

                    const nextCos = wCos * wlenCos - wSin * wlenSin;
                    const nextSin = wCos * wlenSin + wSin * wlenCos;
                    wCos = nextCos;
                    wSin = nextSin;
                }
            }
        }
    },

    fftLowHighRatio(grayPatch) {
        const size = 32;
        const patch = this.resizeNearestGray(grayPatch, size, size);
        const re = Array.from({ length: size }, () => new Float64Array(size));
        const im = Array.from({ length: size }, () => new Float64Array(size));

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                re[y][x] = patch.data[y * size + x] - 128;
                im[y][x] = 0;
            }
            this.fft1D(re[y], im[y]);
        }

        for (let x = 0; x < size; x++) {
            const colR = new Float64Array(size);
            const colI = new Float64Array(size);
            for (let y = 0; y < size; y++) {
                colR[y] = re[y][x];
                colI[y] = im[y][x];
            }
            this.fft1D(colR, colI);
            for (let y = 0; y < size; y++) {
                re[y][x] = colR[y];
                im[y][x] = colI[y];
            }
        }

        let low = 0;
        let high = 0;
        for (let y = 0; y < size; y++) {
            const fy = y <= size / 2 ? y : y - size;
            for (let x = 0; x < size; x++) {
                const fx = x <= size / 2 ? x : x - size;
                const r = Math.sqrt(fx * fx + fy * fy);
                const mag2 = re[y][x] * re[y][x] + im[y][x] * im[y][x];
                if (r <= 4) low += mag2;
                if (r >= 10) high += mag2;
            }
        }

        return low / (high + 1e-10);
    },

    patchCenter(grayImage, ratio = 0.6) {
        const w = grayImage.width;
        const h = grayImage.height;
        const pw = Math.max(16, Math.floor(w * ratio));
        const ph = Math.max(16, Math.floor(h * ratio));
        const x0 = Math.floor((w - pw) / 2);
        const y0 = Math.floor((h - ph) / 2);
        return this.extractPatch(grayImage, x0, y0, pw, ph);
    },

    patchCorner(grayImage, ratio = 0.38) {
        const w = grayImage.width;
        const h = grayImage.height;
        const pw = Math.max(16, Math.floor(w * ratio));
        const ph = Math.max(16, Math.floor(h * ratio));
        return this.extractPatch(grayImage, 0, 0, pw, ph);
    },

    extractPatch(grayImage, x0, y0, pw, ph) {
        const { data, width } = grayImage;
        const out = new Float32Array(pw * ph);
        for (let y = 0; y < ph; y++) {
            for (let x = 0; x < pw; x++) {
                out[y * pw + x] = data[(y0 + y) * width + (x0 + x)];
            }
        }
        return { data: out, width: pw, height: ph };
    },

    localContrastMean(grayImage, mask) {
        const { data, width, height } = grayImage;
        const vals = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (!mask[idx]) continue;
                let sum = 0;
                let sum2 = 0;
                let n = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const v = data[(y + ky) * width + (x + kx)];
                        sum += v;
                        sum2 += v * v;
                        n += 1;
                    }
                }
                const mu = sum / n;
                const varv = Math.max(0, sum2 / n - mu * mu);
                vals.push(Math.sqrt(varv));
            }
        }
        return this.mean(vals);
    },

    jpegBlockInconsistency(grayImage, mask) {
        const { data, width, height } = grayImage;
        let borderDiff = 0;
        let borderCount = 0;
        let insideDiff = 0;
        let insideCount = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 1; x < width; x++) {
                const idx = y * width + x;
                if (!mask[idx] || !mask[idx - 1]) continue;
                const d = Math.abs(data[idx] - data[idx - 1]);
                const onBoundary = (x % 8 === 0);
                if (onBoundary) {
                    borderDiff += d;
                    borderCount += 1;
                } else {
                    insideDiff += d;
                    insideCount += 1;
                }
            }
        }

        for (let y = 1; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!mask[idx] || !mask[idx - width]) continue;
                const d = Math.abs(data[idx] - data[idx - width]);
                const onBoundary = (y % 8 === 0);
                if (onBoundary) {
                    borderDiff += d;
                    borderCount += 1;
                } else {
                    insideDiff += d;
                    insideCount += 1;
                }
            }
        }

        const b = borderDiff / (borderCount || 1);
        const i = insideDiff / (insideCount || 1);
        return b / (i + 1e-8);
    },

    extract(grayImage, imageData = null) {
        const g = this.resizeNearestGray(grayImage, 128, 128);
        const { width, height } = g;

        const subjectMask = this.createSubjectMask(width, height);
        const backgroundMask = this.createBackgroundMask(width, height, subjectMask);
        const contourMask = this.createContourBand(width, height, subjectMask);

        const lap = this.laplacian(g);
        const grad = this.sobelMagnitude(g);

        const lapSubject = this.collectByMask(lap.data, subjectMask);
        const lapBackground = this.collectByMask(lap.data, backgroundMask);
        const sharpSub = this.variance(lapSubject);
        const sharpBg = this.variance(lapBackground);
        const sharpnessRatio = sharpSub / (sharpBg + 1e-8);

        const contourGrad = this.mean(this.collectByMask(grad.data, contourMask));

        let labDistance = 0;
        let skinLbpDiff = 0;
        let skinGlcmDiff = 0;

        if (imageData && imageData.data && imageData.width && imageData.height) {
            const skinFull = this.skinMaskFromRGB(imageData);
            const skinMask = new Uint8Array(width * height);
            const scaleX = imageData.width / width;
            const scaleY = imageData.height / height;

            for (let y = 0; y < height; y++) {
                const sy = Math.min(imageData.height - 1, Math.floor(y * scaleY));
                for (let x = 0; x < width; x++) {
                    const sx = Math.min(imageData.width - 1, Math.floor(x * scaleX));
                    skinMask[y * width + x] = skinFull[sy * imageData.width + sx];
                }
            }

            const bgMask = new Uint8Array(width * height);
            for (let i = 0; i < bgMask.length; i++) {
                bgMask[i] = backgroundMask[i] ? 1 : 0;
            }

            const labSub = this.meanLabForMask(imageData, this.resizeMaskToSource(subjectMask, width, height, imageData.width, imageData.height));
            const labBg = this.meanLabForMask(imageData, this.resizeMaskToSource(backgroundMask, width, height, imageData.width, imageData.height));
            const dL = labSub.L - labBg.L;
            const da = labSub.a - labBg.a;
            const db = labSub.b - labBg.b;
            labDistance = Math.sqrt(dL * dL + da * da + db * db);

            const skinLbp = this.lbpEntropyByMask(g, skinMask);
            const bgLbp = this.lbpEntropyByMask(g, bgMask);
            skinLbpDiff = skinLbp - bgLbp;

            const skinGlcm = this.glcmContrastByMask(g, skinMask, 16);
            const bgGlcm = this.glcmContrastByMask(g, bgMask, 16);
            skinGlcmDiff = skinGlcm - bgGlcm;
        }

        const blurred = this.gaussianBlur3x3(g);
        const residual = new Float32Array(g.data.length);
        for (let i = 0; i < residual.length; i++) residual[i] = g.data[i] - blurred.data[i];

        const resSub = this.collectByMask(residual, subjectMask);
        const resBg = this.collectByMask(residual, backgroundMask);
        const stdSub = this.std(resSub);
        const stdBg = this.std(resBg);
        const noiseConsistency = 1 - Math.abs(stdSub - stdBg) / (Math.max(stdSub, stdBg, 1e-8));

        const subjectPatch = this.patchCenter(g, 0.62);
        const backgroundPatch = this.patchCorner(g, 0.38);
        const fftSub = this.fftLowHighRatio(subjectPatch);
        const fftBg = this.fftLowHighRatio(backgroundPatch);
        const fftProfileDiff = Math.log((fftSub + 1e-8) / (fftBg + 1e-8));

        const lcSub = this.localContrastMean(g, subjectMask);
        const lcBg = this.localContrastMean(g, backgroundMask);
        const localContrastRatio = lcSub / (lcBg + 1e-8);

        const jpegSub = this.jpegBlockInconsistency(g, subjectMask);
        const jpegBg = this.jpegBlockInconsistency(g, backgroundMask);
        const jpegBlockInconsistency = jpegSub / (jpegBg + 1e-8);

        return {
            labDistance,
            sharpnessRatio,
            contourGradient: contourGrad,
            skinLbpDiff,
            skinGlcmDiff,
            noiseConsistency,
            fftProfileDiff,
            localContrastRatio,
            jpegBlockInconsistency
        };
    },

    resizeMaskToSource(mask, srcW, srcH, dstW, dstH) {
        const out = new Uint8Array(dstW * dstH);
        const xRatio = srcW / dstW;
        const yRatio = srcH / dstH;

        for (let y = 0; y < dstH; y++) {
            const sy = Math.min(srcH - 1, Math.floor(y * yRatio));
            for (let x = 0; x < dstW; x++) {
                const sx = Math.min(srcW - 1, Math.floor(x * xRatio));
                out[y * dstW + x] = mask[sy * srcW + sx];
            }
        }

        return out;
    }
};
