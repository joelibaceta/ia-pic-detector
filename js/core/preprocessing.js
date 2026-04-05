/**
 * Módulo de Preprocesamiento de Imágenes
 */

const Preprocessing = {
    /**
     * Convierte ImageData a escala de grises (luminancia)
     * @param {ImageData} imageData
     * @returns {Object} { data: Float32Array, width: number, height: number }
     */
    toGrayscale(imageData) {
        const { width, height, data } = imageData;
        const gray = new Float32Array(width * height);
        
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            // Conversión estándar RGB a luminancia (ITU-R BT.601)
            gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
        
        return { data: gray, width, height };
    },

    /**
     * Normaliza los valores de una imagen al rango [0, 1]
     * @param {Object} image - { data, width, height }
     * @returns {Object} Imagen normalizada
     */
    normalize(image) {
        const { data, width, height } = image;
        const normalized = new Float32Array(data.length);
        
        const min = Utils.findMin(data);
        const max = Utils.findMax(data);
        const range = max - min || 1;
        
        for (let i = 0; i < data.length; i++) {
            normalized[i] = (data[i] - min) / range;
        }
        
        return { data: normalized, width, height };
    },

    /**
     * Redimensiona una imagen (downsampling simple)
     * @param {Object} image - { data, width, height }
     * @param {number} newWidth
     * @param {number} newHeight
     * @returns {Object} Imagen redimensionada
     */
    resize(image, newWidth, newHeight) {
        const { data, width, height } = image;
        const resized = new Float32Array(newWidth * newHeight);
        
        const xRatio = width / newWidth;
        const yRatio = height / newHeight;
        
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const srcX = Math.floor(x * xRatio);
                const srcY = Math.floor(y * yRatio);
                const srcIdx = srcY * width + srcX;
                const dstIdx = y * newWidth + x;
                resized[dstIdx] = data[srcIdx];
            }
        }
        
        return { data: resized, width: newWidth, height: newHeight };
    }
};
