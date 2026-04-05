/**
 * AI Image Detector - Punto de Entrada Principal
 * 
 * Este es el único archivo que necesitas importar en tu HTML.
 * Proporciona una función simple: detectAIImage(imageFile)
 * 
 * Estructura modular:
 * - /core: Procesamiento básico (wavelet, estadísticas, preprocesamiento)
 * - /features: Extracción de características
 * - /detection: Lógica de detección y clasificación
 */

// Instancia global del detector
const waveletDetector = new WaveletAIDetector();

// API pública como objeto global
const detector = {
    detect: async (imageFile) => {
        const result = await waveletDetector.detectAI(imageFile);
        // Asegurar que el score esté disponible (normalizado 0-1)
        if (result.aiScore && !result.score) {
            result.score = parseFloat(result.aiScore) / 100;
        }
        return result;
    },
    quickDetect: async (imageFile) => await waveletDetector.quickDetect(imageFile),
    getDebugInfo: async (imageFile) => await waveletDetector.getDebugInfo(imageFile),
    version: '1.0.0'
};

/**
 * Función principal de detección (API pública)
 * 
 * @param {File} imageFile - Archivo de imagen a analizar
 * @returns {Promise<Object>} Resultado con:
 *   - isAI: boolean - true si es IA, false si es real
 *   - confidence: number - Confianza 0-100%
 *   - details: string - Descripción detallada
 *   - metrics: Object - Scores de cada métrica
 *   - anomalies: Object - Flags de anomalías detectadas
 * 
 * @example
 * const result = await detectAIImage(file);
 * console.log(result.isAI);        // true/false
 * console.log(result.confidence);  // 87.5
 * console.log(result.details);     // "Detectados 3 indicadores..."
 */
async function detectAIImage(imageFile) {
    return await waveletDetector.detectAI(imageFile);
}

/**
 * Detección rápida (menos precisa pero más rápida)
 * @param {File} imageFile
 * @returns {Promise<Object>} { isAI, confidence }
 */
async function quickDetectAI(imageFile) {
    return await waveletDetector.quickDetect(imageFile);
}

/**
 * Obtiene información de depuración
 * @param {File} imageFile
 * @returns {Promise<Object>} Información detallada de wavelet y features
 */
async function getDebugInfo(imageFile) {
    return await waveletDetector.getDebugInfo(imageFile);
}

// UMD (Universal Module Definition) - Compatible con Node.js y Browser
(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        // Node.js/CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else {
        // Browser globals
        root.AIDetector = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    return {
        detect: detectAIImage,
        quickDetect: quickDetectAI,
        getDebugInfo: getDebugInfo,
        detector: detector,
        version: '1.0.0'
    };
}));
