/**
 * Suite de Tests para AI Detector
 * Valida el funcionamiento del sistema de detección usando todas las imágenes
 */

let testResults = {
    passed: 0,
    failed: 0,
    startTime: null,
    endTime: null
};

// Lista de imágenes detectadas dinámicamente
let TEST_IMAGES = [];

/**
 * Carga la lista de imágenes desde el JSON generado o la detecta dinámicamente
 */
async function loadImageList() {
    // Intentar cargar desde JSON generado
    try {
        const response = await fetch('image-list.json');
        if (response.ok) {
            TEST_IMAGES = await response.json();
            console.log(`✓ Cargadas ${TEST_IMAGES.length} imágenes desde image-list.json`);
            return TEST_IMAGES;
        }
    } catch (e) {
        console.log('⚠ image-list.json no encontrado, detectando imágenes...');
    }
    
    // Fallback: lista manual de imágenes conocidas
    const knownImages = [
        'image.png',
        '508010630_10239641674839058_1065749617840723590_n.jpg',
        '509879109_10239783617147527_1082183775493285193_n.jpg',
        '513931813_10239864276443959_2167545655610779375_n.jpg',
        '465609992_10239357673494253_8419656988449685181_n.jpg'
    ];
    
    // Verificar cuáles existen
    for (const img of knownImages) {
        try {
            const response = await fetch(`images/${img}`, { method: 'HEAD' });
            if (response.ok) {
                TEST_IMAGES.push(`images/${img}`);
            }
        } catch (e) {
            // Imagen no existe
        }
    }
    
    console.log(`✓ Detectadas ${TEST_IMAGES.length} imágenes disponibles`);
    return TEST_IMAGES;
}

/**
 * Ejecuta todos los tests en secuencia
 */
async function runAllTests() {
    // Cargar lista de imágenes
    await loadImageList();
    const runBtn = document.getElementById('runTests');
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Ejecutando tests...';
    
    testResults = { passed: 0, failed: 0 };
    testResults.startTime = Date.now();
    
    try {
        await test1_LoadImages();
        await test2_WaveletAnalysis();
        await test3_MetricsCalculation();
        await test4_CompleteDetection();
    } catch (error) {
        console.error('Error en suite de tests:', error);
    }
    
    testResults.endTime = Date.now();
    displaySummary();
    
    runBtn.disabled = false;
    runBtn.textContent = '🔄 Ejecutar Tests Nuevamente';
}

/**
 * Test 1: Carga de Imágenes
 */
async function test1_LoadImages() {
    const statusEl = document.getElementById('status1');
    const resultsEl = document.getElementById('results1');
    const imgEl = document.getElementById('testImage');
    
    statusEl.textContent = 'Ejecutando...';
    statusEl.className = 'test-status status-running';
    
    try {
        let resultsHTML = '<div style="display: grid; gap: 15px; margin-top: 15px;">';
        let allLoaded = true;
        let loadedCount = 0;
        
        for (const imagePath of TEST_IMAGES) {
            try {
                const response = await fetch(imagePath);
                const blob = await response.blob();
                const img = await loadImageElement(new File([blob], imagePath.split('/').pop(), { type: blob.type }));
                
                const dimensions = `${img.width}x${img.height}`;
                const fileSize = `${(blob.size / 1024).toFixed(2)} KB`;
                const fileName = imagePath.split('/').pop();
                
                resultsHTML += `
                    <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745;">
                        <div style="font-weight: 600; color: #28a745; margin-bottom: 8px;">
                            ✓ ${fileName}
                        </div>
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px; color: #666;">
                            <span>Dimensiones:</span><span>${dimensions}</span>
                            <span>Tamaño:</span><span>${fileSize}</span>
                            <span>Formato:</span><span>${blob.type}</span>
                        </div>
                    </div>
                `;
                
                loadedCount++;
                
                // Mostrar la primera imagen
                if (imagePath === TEST_IMAGES[0]) {
                    imgEl.src = URL.createObjectURL(blob);
                    imgEl.style.display = 'block';
                }
            } catch (error) {
                allLoaded = false;
                const fileName = imagePath.split('/').pop();
                resultsHTML += `
                    <div style="padding: 12px; background: #f8d7da; border-radius: 8px; border-left: 4px solid #dc3545;">
                        <div style="font-weight: 600; color: #dc3545; margin-bottom: 8px;">
                            ✗ ${fileName}
                        </div>
                        <div style="color: #dc3545; font-size: 13px;">
                            Error: ${error.message}
                        </div>
                    </div>
                `;
            }
        }
        
        resultsHTML += '</div>';
        resultsHTML += `
            <div style="margin-top: 15px; padding: 12px; background: #e7f3ff; border-radius: 8px; color: #084298;">
                <strong>Resumen:</strong> ${loadedCount}/${TEST_IMAGES.length} imágenes cargadas correctamente
            </div>
        `;
        
        resultsEl.innerHTML = resultsHTML;
        resultsEl.style.display = 'block';
        
        if (allLoaded) {
            statusEl.textContent = '✓ Pasado';
            statusEl.className = 'test-status status-pass';
            testResults.passed++;
        } else {
            statusEl.textContent = '⚠ Parcial';
            statusEl.className = 'test-status status-fail';
            testResults.failed++;
        }
        
    } catch (error) {
        resultsEl.innerHTML = `
            <div class="result-row">
                <span class="result-label">Error:</span>
                <span class="result-value" style="color: #dc3545;">${error.message}</span>
            </div>
        `;
        resultsEl.style.display = 'block';
        
        statusEl.textContent = '✗ Fallido';
        statusEl.className = 'test-status status-fail';
        testResults.failed++;
        
        throw error;
    }
}

/**
 * Test 2: Análisis Wavelet
 */
async function test2_WaveletAnalysis() {
    const statusEl = document.getElementById('status2');
    const resultsEl = document.getElementById('results2');
    
    statusEl.textContent = 'Ejecutando...';
    statusEl.className = 'test-status status-running';
    
    try {
        // Cargar primera imagen de prueba
        const response = await fetch(TEST_IMAGES[0]);
        const blob = await response.blob();
        const file = new File([blob], TEST_IMAGES[0].split('/').pop(), { type: blob.type });
        
        // Obtener datos de imagen usando la nueva API
        const img = await Utils.loadImage(file);
        const imageData = Utils.getImageData(img);
        const grayImage = Preprocessing.toGrayscale(imageData);
        
        // Aplicar DWT
        const waveletCoeffs = Wavelet.dwt2D(grayImage, 3);
        
        // Validar estructura
        const hasAllLevels = waveletCoeffs.levels.length === 3;
        const hasAllBands = waveletCoeffs.levels.every(level => 
            level.LL && level.LH && level.HL && level.HH
        );
        
        // Calcular estadísticas básicas
        const level1 = waveletCoeffs.levels[0];
        const llSize = level1.LL.data.length;
        const lhSize = level1.LH.data.length;
        
        resultsEl.innerHTML = `
            <div class="result-row">
                <span class="result-label">Niveles DWT:</span>
                <span class="result-value">${waveletCoeffs.levels.length} ${hasAllLevels ? '✓' : '✗'}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Bandas por nivel:</span>
                <span class="result-value">LL, LH, HL, HH ${hasAllBands ? '✓' : '✗'}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Tamaño Nivel 1 (LL):</span>
                <span class="result-value">${llSize} coeficientes</span>
            </div>
            <div class="result-row">
                <span class="result-label">Tamaño Nivel 1 (LH):</span>
                <span class="result-value">${lhSize} coeficientes</span>
            </div>
            <div class="result-row">
                <span class="result-label">Validación:</span>
                <span class="result-value" style="color: #28a745;">Estructura correcta ✓</span>
            </div>
        `;
        resultsEl.style.display = 'block';
        
        if (hasAllLevels && hasAllBands) {
            statusEl.textContent = '✓ Pasado';
            statusEl.className = 'test-status status-pass';
            testResults.passed++;
        } else {
            throw new Error('Estructura wavelet incompleta');
        }
        
    } catch (error) {
        resultsEl.innerHTML = `
            <div class="result-row">
                <span class="result-label">Error:</span>
                <span class="result-value" style="color: #dc3545;">${error.message}</span>
            </div>
        `;
        resultsEl.style.display = 'block';
        
        statusEl.textContent = '✗ Fallido';
        statusEl.className = 'test-status status-fail';
        testResults.failed++;
    }
}

/**
 * Test 3: Cálculo de Métricas
 */
async function test3_MetricsCalculation() {
    const statusEl = document.getElementById('status3');
    const resultsEl = document.getElementById('results3');
    
    statusEl.textContent = 'Ejecutando...';
    statusEl.className = 'test-status status-running';
    
    try {
        // Cargar y procesar primera imagen de prueba
        const response = await fetch(TEST_IMAGES[0]);
        const blob = await response.blob();
        const file = new File([blob], TEST_IMAGES[0].split('/').pop(), { type: blob.type });
        
        const img = await Utils.loadImage(file);
        const imageData = Utils.getImageData(img);
        const grayImage = Preprocessing.toGrayscale(imageData);
        const waveletCoeffs = Wavelet.dwt2D(grayImage, 3);
        const features = FeatureExtractor.extractAll(waveletCoeffs);
        const metrics = AnomalyMetrics.computeAll(features);
        
        // Validar que todas las métricas existen
        const requiredMetrics = [
            'energyDistribution',
            'noisePattern',
            'interScaleCorrelation',
            'llSmoothness',
            'hlLhRatio',
            'midFrequencyGap'
        ];
        
        const allMetricsPresent = requiredMetrics.every(m => metrics[m] !== undefined);
        
        // Crear grid de métricas
        let metricsHTML = '<div class="metrics-grid">';
        
        for (const [key, value] of Object.entries(metrics)) {
            const score = (value.score * 100).toFixed(1);
            const status = value.isAnomalous ? '⚠️' : '✓';
            metricsHTML += `
                <div class="metric-card">
                    <div class="metric-label">${formatMetricName(key)}</div>
                    <div class="metric-value">${score}% ${status}</div>
                </div>
            `;
        }
        metricsHTML += '</div>';
        
        resultsEl.innerHTML = `
            <div class="result-row">
                <span class="result-label">Métricas Calculadas:</span>
                <span class="result-value">${Object.keys(metrics).length} / 6</span>
            </div>
            <div class="result-row">
                <span class="result-label">Validación:</span>
                <span class="result-value" style="color: #28a745;">
                    ${allMetricsPresent ? 'Todas las métricas presentes ✓' : 'Métricas faltantes ✗'}
                </span>
            </div>
            ${metricsHTML}
        `;
        resultsEl.style.display = 'block';
        
        if (allMetricsPresent) {
            statusEl.textContent = '✓ Pasado';
            statusEl.className = 'test-status status-pass';
            testResults.passed++;
        } else {
            throw new Error('Métricas incompletas');
        }
        
    } catch (error) {
        resultsEl.innerHTML = `
            <div class="result-row">
                <span class="result-label">Error:</span>
                <span class="result-value" style="color: #dc3545;">${error.message}</span>
            </div>
        `;
        resultsEl.style.display = 'block';
        
        statusEl.textContent = '✗ Fallido';
        statusEl.className = 'test-status status-fail';
        testResults.failed++;
    }
}

/**
 * Test 4: Detección Completa en Todas las Imágenes
 */
async function test4_CompleteDetection() {
    const statusEl = document.getElementById('status4');
    const resultsEl = document.getElementById('results4');
    
    statusEl.textContent = 'Ejecutando...';
    statusEl.className = 'test-status status-running';
    
    try {
        let resultsHTML = '<div class="detection-results">';
        let allSuccessful = true;
        let totalTime = 0;
        const scoresData = {};  // Para exportar scores
        const detailedMetricsData = {};  // Para exportar métricas individuales
        
        for (const imagePath of TEST_IMAGES) {
            try {
                const response = await fetch(imagePath);
                const blob = await response.blob();
                const fileName = imagePath.split('/').pop();
                const file = new File([blob], fileName, { type: blob.type });
                
                // Ejecutar detección completa
                const startTime = performance.now();
                const result = await detector.detect(file);
                const endTime = performance.now();
                const executionTime = ((endTime - startTime) / 1000).toFixed(2);
                totalTime += parseFloat(executionTime);
                
                // Guardar score y métricas para optimización
                scoresData[imagePath] = result.score || 0;
                detailedMetricsData[imagePath] = {
                    score: result.score || 0,
                    metrics: result.metrics || {},
                    aiScore: result.aiScore,
                    isAI: result.isAI,
                    confidence: result.confidence
                };
                
                const classificationIcon = result.isAI ? '⚠️ IA' : '✓ Real';
                const classificationColor = result.isAI ? '#dc3545' : '#28a745';
                
                resultsHTML += `
                    <div class="detection-card">
                        <div class="detection-header" style="background: ${classificationColor}22; border-left: 4px solid ${classificationColor};">
                            <strong>${fileName}</strong>
                            <span style="color: ${classificationColor}; font-weight: 700;">${classificationIcon}</span>
                        </div>
                        <div class="detection-body">
                            <div class="result-row">
                                <span class="result-label">Score:</span>
                                <span class="result-value">${(result.score * 100).toFixed(1)}%</span>
                            </div>
                            <div class="result-row">
                                <span class="result-label">Confianza:</span>
                                <span class="result-value">${result.confidence}%</span>
                            </div>
                            <div class="result-row">
                                <span class="result-label">Tiempo:</span>
                                <span class="result-value">${executionTime}s</span>
                            </div>
                        </div>
                    </div>
                `;
                
            } catch (error) {
                allSuccessful = false;
                resultsHTML += `
                    <div class="detection-card">
                        <div class="detection-header" style="background: #dc354522; border-left: 4px solid #dc3545;">
                            <strong>${imagePath.split('/').pop()}</strong>
                            <span style="color: #dc3545;">✗ Error</span>
                        </div>
                        <div class="detection-body">
                            <span style="color: #dc3545;">${error.message}</span>
                        </div>
                    </div>
                `;
            }
        }
        
        resultsHTML += '</div>';
        resultsHTML += `
            <div class="summary-box">
                <strong>Resumen:</strong> ${TEST_IMAGES.length} imágenes analizadas en ${totalTime.toFixed(2)}s
            </div>
        `;
        
        // Exportar scores para optimización
        resultsHTML += `
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button onclick="exportScores()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    📊 Exportar Scores
                </button>
                <button onclick="exportDetailedMetrics()" style="padding: 10px 20px; background: #1ec78b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🔬 Exportar Métricas Detalladas
                </button>
            </div>
        `;
        
        // Guardar scores en variable global
        window.detectionScores = scoresData;
        window.detailedMetrics = detailedMetricsData;
        
        resultsEl.innerHTML = resultsHTML;
        resultsEl.style.display = 'block';
        
        if (allSuccessful) {
            statusEl.textContent = '✓ Pasado';
            statusEl.className = 'test-status status-pass';
            testResults.passed++;
        } else {
            statusEl.textContent = '⚠ Parcial';
            statusEl.className = 'test-status status-fail';
            testResults.failed++;
        }
        
    } catch (error) {
        resultsEl.innerHTML = `
            <div class="result-row">
                <span class="result-label">Error:</span>
                <span class="result-value" style="color: #dc3545;">${error.message}</span>
            </div>
        `;
        resultsEl.style.display = 'block';
        
        statusEl.textContent = '✗ Fallido';
        statusEl.className = 'test-status status-fail';
        testResults.failed++;
    }
}

/**
 * Exporta los scores para el script de optimización
 */
function exportScores() {
    if (!window.detectionScores) {
        alert('❌ No hay scores disponibles. Ejecuta primero los tests.');
        return;
    }
    
    const scores = window.detectionScores;
    const output = `// Scores detectados - Copia esto en optimize-thresholds.js\nconst CURRENT_SCORES = ${JSON.stringify(scores, null, 4).replace(/"([^"]+)":/g, "'$1':")};`;
    
    // Crear blob y descargar
    const blob = new Blob([output], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'detected-scores.js';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📊 Scores exportados:', scores);
    alert('✓ Scores exportados a detected-scores.js');
}

/**
 * Exporta métricas detalladas para análisis avanzado
 */
function exportDetailedMetrics() {
    if (!window.detailedMetrics) {
        alert('❌ No hay métricas disponibles. Ejecuta primero Test 4.');
        return;
    }
    
    const metrics = window.detailedMetrics;
    const output = JSON.stringify(metrics, null, 2);
    
    // Crear blob y descargar
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'detailed-metrics.json';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('🔬 Métricas detalladas exportadas:', metrics);
    alert('✓ Métricas exportadas a detailed-metrics.json');
}

/**
 * Muestra el resumen de tests
 */
function displaySummary() {
    const summaryEl = document.getElementById('summary');
    const passedEl = document.getElementById('passedCount');
    const failedEl = document.getElementById('failedCount');
    const timeEl = document.getElementById('executionTime');
    
    const totalTime = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);
    
    passedEl.textContent = testResults.passed;
    failedEl.textContent = testResults.failed;
    timeEl.textContent = totalTime + 's';
    
    summaryEl.style.display = 'grid';
}

/**
 * Utilidades
 */
function loadImageElement(file) {
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
}

function formatMetricName(name) {
    const names = {
        energyDistribution: 'Distribución de Energía',
        noisePattern: 'Patrón de Ruido',
        interScaleCorrelation: 'Correlación Inter-Escala',
        llSmoothness: 'Suavidad LL',
        hlLhRatio: 'Ratio HL/LH',
        midFrequencyGap: 'Gap Frec. Medias'
    };
    return names[name] || name;
}
