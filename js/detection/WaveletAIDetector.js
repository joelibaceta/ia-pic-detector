/**
 * Clase Principal del Detector de IA basado en Wavelet
 * Integra todos los módulos para realizar la detección
 */

class WaveletAIDetector {
    constructor() {
        this.version = '1.0.0';
    }

    /**
     * Analiza una imagen y detecta si fue generada por IA
     * @param {File} imageFile - Archivo de imagen
     * @returns {Promise<Object>} Resultado del análisis
     */
    async detectAI(imageFile) {
        try {
            // 1. Cargar imagen
            const img = await Utils.loadImage(imageFile);
            const imageData = Utils.getImageData(img, 1024);
            
            // 2. Preprocesar (convertir a escala de grises)
            const grayImage = Preprocessing.toGrayscale(imageData);
            
            // 3. Aplicar DWT de 3 niveles
            const waveletCoeffs = Wavelet.dwt2D(grayImage, 3);
            
            // 4. Extraer características
            const features = FeatureExtractor.extractAll(waveletCoeffs);
            
            // 5. Calcular métricas de anomalía
            const metrics = AnomalyMetrics.computeAll(features);
            
            // 6. Calcular score de IA
            const aiScore = Classifier.computeAIScore(metrics);
            
            // 7. Clasificar
            const { isAI, confidence } = Classifier.classify(aiScore, metrics);
            
            // 8. Generar reporte
            const details = Classifier.generateReport(metrics, aiScore);
            const detailedReport = Classifier.generateDetailedReport(metrics);
            
            return {
                isAI,
                confidence,
                details,
                aiScore: (aiScore * 100).toFixed(1),
                metrics: detailedReport.scores,
                anomalies: detailedReport.anomalies,
                features: FeatureExtractor.summarize(features),
                debugInfo: {
                    waveletLevels: waveletCoeffs.levels.length,
                    imageSize: { width: imageData.width, height: imageData.height },
                    version: this.version
                }
            };
            
        } catch (error) {
            console.error('Error en detección wavelet:', error);
            throw new Error('Failed to analyze image: ' + error.message);
        }
    }

    /**
     * Versión simplificada para análisis rápido
     * @param {File} imageFile
     * @returns {Promise<Object>}
     */
    async quickDetect(imageFile) {
        const img = await Utils.loadImage(imageFile);
        const imageData = Utils.getImageData(img, 512); // Más pequeño = más rápido
        
        const grayImage = Preprocessing.toGrayscale(imageData);
        const waveletCoeffs = Wavelet.dwt2D(grayImage, 2); // Solo 2 niveles
        const features = FeatureExtractor.extractAll(waveletCoeffs);
        const metrics = AnomalyMetrics.computeAll(features);
        const aiScore = Classifier.computeAIScore(metrics);
        const { isAI, confidence } = Classifier.classify(aiScore);
        
        return { isAI, confidence };
    }

    /**
     * Obtiene información de depuración detallada
     * @param {File} imageFile
     * @returns {Promise<Object>}
     */
    async getDebugInfo(imageFile) {
        const img = await Utils.loadImage(imageFile);
        const imageData = Utils.getImageData(img, 1024);
        const grayImage = Preprocessing.toGrayscale(imageData);
        const waveletCoeffs = Wavelet.dwt2D(grayImage, 3);
        const features = FeatureExtractor.extractAll(waveletCoeffs);
        
        return {
            imageInfo: {
                width: imageData.width,
                height: imageData.height,
                pixels: imageData.data.length / 4
            },
            waveletInfo: {
                levels: waveletCoeffs.levels.length,
                level1Size: waveletCoeffs.levels[0].LL.data.length
            },
            features: features,
            summary: FeatureExtractor.summarize(features)
        };
    }
}
