/**
 * Transformada Wavelet Discreta (DWT) usando filtro Daubechies 4 (db4)
 */

const Wavelet = {
    // Coeficientes del filtro Daubechies 4 (db4)
    db4: {
        // Low-pass decomposition filter
        dec_lo: [
            -0.010597401784997278,
            0.032883011666982945,
            0.030841381835986965,
            -0.18703481171888114,
            -0.02798376941698385,
            0.6308807679295904,
            0.7148465705525415,
            0.23037781330885523
        ],
        // High-pass decomposition filter
        dec_hi: [
            -0.23037781330885523,
            0.7148465705525415,
            -0.6308807679295904,
            -0.02798376941698385,
            0.18703481171888114,
            0.030841381835986965,
            -0.032883011666982945,
            -0.010597401784997278
        ],
        length: 8
    },

    /**
     * Aplica DWT 2D multi-nivel
     * @param {Object} image - { data, width, height }
     * @param {number} levels - Número de niveles de descomposición
     * @returns {Object} Coeficientes wavelet por nivel
     */
    dwt2D(image, levels = 1) {
        let current = {
            data: image.data,
            width: image.width,
            height: image.height
        };
        
        const decompositions = [];
        
        for (let level = 0; level < levels; level++) {
            const result = this.singleLevelDWT_DB4(current);
            decompositions.push(result);
            
            // Para el siguiente nivel, usar solo LL (aproximación)
            current = result.LL;
        }
        
        return {
            levels: decompositions,
            originalSize: { width: image.width, height: image.height }
        };
    },

    /**
     * DWT de un solo nivel usando filtro Daubechies 4
     * @param {Object} image - { data, width, height }
     * @returns {Object} { LL, LH, HL, HH }
     */
    singleLevelDWT_DB4(image) {
        const { width, height, data } = image;
        const halfW = Math.floor(width / 2);
        const halfH = Math.floor(height / 2);
        
        // Paso 1: Filtrar filas (horizontal)
        const rowFiltered = this.applyFilters1D(data, width, height, true);
        
        // Paso 2: Filtrar columnas (vertical) en ambos resultados
        const LL_temp = this.applyFilters1D(rowFiltered.low, width, height, false);
        const HL_temp = this.applyFilters1D(rowFiltered.high, width, height, false);
        
        // Separar en 4 sub-bandas finales
        const LL = new Float32Array(halfW * halfH);
        const LH = new Float32Array(halfW * halfH);
        const HL = new Float32Array(halfW * halfH);
        const HH = new Float32Array(halfW * halfH);
        
        for (let y = 0; y < halfH; y++) {
            for (let x = 0; x < halfW; x++) {
                const idx = y * halfW + x;
                const srcIdx = y * width + x;
                
                LL[idx] = LL_temp.low[srcIdx] || 0;
                LH[idx] = LL_temp.high[srcIdx] || 0;
                HL[idx] = HL_temp.low[srcIdx] || 0;
                HH[idx] = HL_temp.high[srcIdx] || 0;
            }
        }
        
        return {
            LL: { data: LL, width: halfW, height: halfH },
            LH: { data: LH, width: halfW, height: halfH },
            HL: { data: HL, width: halfW, height: halfH },
            HH: { data: HH, width: halfW, height: halfH }
        };
    },

    /**
     * Aplica filtros 1D (db4) en filas o columnas
     * @param {Float32Array} data - Datos de entrada
     * @param {number} width - Ancho
     * @param {number} height - Alto
     * @param {boolean} isRow - true para filas, false para columnas
     * @returns {Object} { low, high } - Componentes de baja y alta frecuencia
     */
    applyFilters1D(data, width, height, isRow) {
        const length = isRow ? width : height;
        const stride = isRow ? height : width;
        const filterLen = this.db4.length;
        const halfLen = Math.floor(length / 2);
        
        const lowPass = new Float32Array(width * height);
        const highPass = new Float32Array(width * height);
        
        for (let s = 0; s < stride; s++) {
            for (let i = 0; i < halfLen; i++) {
                let sumLo = 0;
                let sumHi = 0;
                
                for (let k = 0; k < filterLen; k++) {
                    const pos = (2 * i + k) % length;
                    const idx = isRow ? (s * width + pos) : (pos * width + s);
                    const val = data[idx] || 0;
                    
                    sumLo += this.db4.dec_lo[k] * val;
                    sumHi += this.db4.dec_hi[k] * val;
                }
                
                const outIdx = isRow ? (s * width + i) : (i * width + s);
                lowPass[outIdx] = sumLo;
                highPass[outIdx] = sumHi;
            }
        }
        
        return { low: lowPass, high: highPass };
    },

    /**
     * DWT de un solo nivel usando filtro Haar (legacy - para comparación)
     * @param {Object} image - { data, width, height }
     * @returns {Object} { LL, LH, HL, HH }
     */
    singleLevelDWT(image) {
        const { width, height, data } = image;
        const halfW = Math.floor(width / 2);
        const halfH = Math.floor(height / 2);
        
        // Inicializar sub-bandas
        const LL = new Float32Array(halfW * halfH);
        const LH = new Float32Array(halfW * halfH);
        const HL = new Float32Array(halfW * halfH);
        const HH = new Float32Array(halfW * halfH);
        
        // Aplicar filtros Haar en 2D
        for (let y = 0; y < halfH; y++) {
            for (let x = 0; x < halfW; x++) {
                const x2 = x * 2;
                const y2 = y * 2;
                
                // Obtener 4 píxeles vecinos
                const a = Utils.getPixel(data, width, x2, y2);
                const b = Utils.getPixel(data, width, x2 + 1, y2);
                const c = Utils.getPixel(data, width, x2, y2 + 1);
                const d = Utils.getPixel(data, width, x2 + 1, y2 + 1);
                
                const idx = y * halfW + x;
                
                // Coeficientes Haar
                LL[idx] = (a + b + c + d) / 4;
                LH[idx] = (a + b - c - d) / 4;
                HL[idx] = (a - b + c - d) / 4;
                HH[idx] = (a - b - c + d) / 4;
            }
        }
        
        return {
            LL: { data: LL, width: halfW, height: halfH },
            LH: { data: LH, width: halfW, height: halfH },
            HL: { data: HL, width: halfW, height: halfH },
            HH: { data: HH, width: halfW, height: halfH }
        };
    },

    /**
     * Reconstrucción inversa (IDWT) - útil para debugging
     * @param {Object} coeffs - { LL, LH, HL, HH }
     * @returns {Object} Imagen reconstruida
     */
    idwt2D(coeffs) {
        const { LL, LH, HL, HH } = coeffs;
        const { width, height } = LL;
        const outWidth = width * 2;
        const outHeight = height * 2;
        const reconstructed = new Float32Array(outWidth * outHeight);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const ll = LL.data[idx];
                const lh = LH.data[idx];
                const hl = HL.data[idx];
                const hh = HH.data[idx];
                
                // Reconstruir 4 píxeles
                const x2 = x * 2;
                const y2 = y * 2;
                
                reconstructed[y2 * outWidth + x2] = ll + lh + hl + hh;
                reconstructed[y2 * outWidth + x2 + 1] = ll + lh - hl - hh;
                reconstructed[(y2 + 1) * outWidth + x2] = ll - lh + hl - hh;
                reconstructed[(y2 + 1) * outWidth + x2 + 1] = ll - lh - hl + hh;
            }
        }
        
        return { data: reconstructed, width: outWidth, height: outHeight };
    }
};
