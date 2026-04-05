/**
 * Utilidades comunes para el detector de IA
 */

const Utils = {
    /**
     * Carga una imagen desde un archivo
     * @param {File} file - Archivo de imagen
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Obtiene ImageData de una imagen
     * @param {HTMLImageElement} img
     * @param {number} maxSize - Tamaño máximo para redimensionar
     * @returns {ImageData}
     */
    getImageData(img, maxSize = 1024) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        
        // Redimensionar si es muy grande
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        return ctx.getImageData(0, 0, width, height);
    },

    /**
     * Obtiene un píxel de forma segura
     * @param {Float32Array|Array} data
     * @param {number} width
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    getPixel(data, width, x, y) {
        const idx = y * width + x;
        return idx < data.length ? data[idx] : 0;
    },

    /**
     * Encuentra el mínimo de un array sin spread operator
     * @param {Float32Array|Array} data
     * @returns {number}
     */
    findMin(data) {
        let min = data[0];
        for (let i = 1; i < data.length; i++) {
            if (data[i] < min) min = data[i];
        }
        return min;
    },

    /**
     * Encuentra el máximo de un array sin spread operator
     * @param {Float32Array|Array} data
     * @returns {number}
     */
    findMax(data) {
        let max = data[0];
        for (let i = 1; i < data.length; i++) {
            if (data[i] > max) max = data[i];
        }
        return max;
    },

    /**
     * Pausa la ejecución
     * @param {number} ms
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
