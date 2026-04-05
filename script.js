// Elementos del DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadContent = document.getElementById('uploadContent');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const resultArea = document.getElementById('resultArea');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const confidence = document.getElementById('confidence');
const resultDescription = document.getElementById('resultDescription');
const modelStats = document.getElementById('modelStats');
const modelTypeValue = document.getElementById('modelTypeValue');
const finalScoreValue = document.getElementById('finalScoreValue');
const waveletScoreValue = document.getElementById('waveletScoreValue');
const nnScoreValue = document.getElementById('nnScoreValue');
const thresholdValue = document.getElementById('thresholdValue');
const evidenceTableBody = document.getElementById('evidenceTableBody');
const evidenceSummary = document.getElementById('evidenceSummary');
const evidenceWarning = document.getElementById('evidenceWarning');

let selectedFile = null;

// Prevenir comportamiento por defecto del drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Resaltar área de drop
['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    uploadArea.classList.add('dragover');
}

function unhighlight(e) {
    uploadArea.classList.remove('dragover');
}

// Manejar drop
uploadArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFiles(files[0]);
    }
}

// Manejar selección de archivo
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files[0]);
    }
});

// Procesar archivo
function handleFiles(file) {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona una imagen válida.');
        return;
    }
    
    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 10MB.');
        return;
    }
    
    selectedFile = file;
    
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadContent.style.display = 'none';
        previewContainer.style.display = 'block';
        analyzeBtn.disabled = false;
        resultArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Botón eliminar imagen
removeBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    previewImage.src = '';
    uploadContent.style.display = 'flex';
    previewContainer.style.display = 'none';
    analyzeBtn.disabled = true;
    resultArea.style.display = 'none';
});

// Botón analizar (usa la función detectAIImage de wavelet-detector.js)
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    // Mostrar loader
    btnText.textContent = 'Analyzing...';
    btnLoader.style.display = 'block';
    analyzeBtn.disabled = true;
    resultArea.style.display = 'none';
    
    try {
        // Llamar a la función de detección
        const result = await detectAIImage(selectedFile);
        
        // Mostrar resultados
        displayResults(result);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al analizar la imagen. Por favor, intenta de nuevo.');
    } finally {
        btnText.textContent = 'Analyze Image';
        btnLoader.style.display = 'none';
        analyzeBtn.disabled = false;
    }
});

// Mostrar resultados
function displayResults(result) {
    const resultCard = resultArea.querySelector('.result-card');
    const anomalyCount = Object.values(result.anomalies || {}).filter(Boolean).length;
    const finalScore = Number.parseFloat(result.aiScore);
    const thresholdPct = Number.isFinite(Number.parseFloat(result.modelThreshold))
        ? Number.parseFloat(result.modelThreshold)
        : (typeof Thresholds !== 'undefined' && Thresholds.classification
            ? Thresholds.classification.aiThreshold * 100
            : 56);
    const distanceToThreshold = Number.isFinite(finalScore) ? thresholdPct - finalScore : 0;
    const isNearThreshold = distanceToThreshold >= 0 && distanceToThreshold <= 12;
    const hasConflict = !result.isAI && anomalyCount >= 3 && isNearThreshold;
    const waveletScoreText = result.waveletScore ? ` Wavelet: ${result.waveletScore}%` : '';
    const nnScoreText = result.nnScore ? ` Modelo: ${result.nnScore}%` : '';
    
    if (result.isAI) {
        // Imagen generada por IA
        resultCard.className = 'result-card ai-detected';
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'AI-Generated Image';
        confidence.textContent = `${result.confidence}%`;
        resultDescription.textContent = result.details || 'This image shows strong indicators of being artificially generated. Our wavelet analysis detected patterns commonly associated with AI image generation tools.';
    } else if (hasConflict) {
        // Resultado mixto: señales altas pero score final bajo umbral
        resultCard.className = 'result-card human-created';
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'Mixed Signals (Inconclusive)';
        confidence.textContent = `${result.confidence}%`;
        resultDescription.textContent = `Se detectaron señales técnicas altas (${anomalyCount}) y el score final quedó cerca, pero por debajo, del umbral de IA (${thresholdPct.toFixed(1)}%).${waveletScoreText}${nnScoreText}`;
    } else {
        // Imagen real/humana
        resultCard.className = 'result-card human-created';
        resultIcon.textContent = '✓';
        resultTitle.textContent = 'Likely Human-Created';
        confidence.textContent = `${result.confidence}%`;
        if (!result.isAI && anomalyCount >= 3) {
            resultDescription.textContent = `Se observaron algunas señales altas (${anomalyCount}), pero la decision final es No IA: score final ${Number.isFinite(finalScore) ? `${finalScore.toFixed(1)}%` : 'N/A'} por debajo del umbral (${thresholdPct.toFixed(1)}%).${waveletScoreText}${nnScoreText}`;
        } else {
            resultDescription.textContent = result.details || `This image appears to be authentic. Decision: No IA, porque el score final quedo por debajo del umbral (${thresholdPct.toFixed(1)}%).${waveletScoreText}${nnScoreText}`;
        }
    }

    renderModelStats(result);

    renderEvidence(result);
    
    resultArea.style.display = 'block';
    
    // Scroll suave al resultado
    setTimeout(() => {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function renderModelStats(result) {
    if (!modelStats) return;

    const finalScore = Number.parseFloat(result.aiScore);
    const waveletScore = Number.parseFloat(result.waveletScore);
    const nnScore = Number.parseFloat(result.nnScore);
    const thresholdPct = Number.isFinite(Number.parseFloat(result.modelThreshold))
        ? Number.parseFloat(result.modelThreshold)
        : (typeof Thresholds !== 'undefined' && Thresholds.classification
            ? Thresholds.classification.aiThreshold * 100
            : null);

    if (modelTypeValue) {
        const rawType = String(result.modelType || 'wavelet').toLowerCase();
        modelTypeValue.textContent = rawType === 'hybrid' ? 'Hibrido (Wavelet + ML)' : 'Wavelet clasico';
    }
    if (finalScoreValue) {
        finalScoreValue.textContent = Number.isFinite(finalScore) ? `${finalScore.toFixed(1)}%` : '-';
    }
    if (waveletScoreValue) {
        waveletScoreValue.textContent = Number.isFinite(waveletScore) ? `${waveletScore.toFixed(1)}%` : '-';
    }
    if (nnScoreValue) {
        nnScoreValue.textContent = Number.isFinite(nnScore) ? `${nnScore.toFixed(1)}%` : 'N/A';
    }
    if (thresholdValue) {
        thresholdValue.textContent = Number.isFinite(thresholdPct) ? `${thresholdPct.toFixed(1)}%` : '-';
    }

    modelStats.style.display = 'block';
}

function normalizeScore(raw) {
    const value = typeof raw === 'string' ? parseFloat(raw) : raw;
    if (!Number.isFinite(value)) return 0;
    return value > 1 ? value / 100 : value;
}

function scoreLevel(score) {
    if (score >= 0.75) return { label: 'Alto', className: 'high' };
    if (score >= 0.45) return { label: 'Medio', className: 'medium' };
    return { label: 'Bajo', className: 'low' };
}

function renderEvidence(result) {
    if (!evidenceTableBody || !evidenceSummary) return;

    const scores = result.metrics || {};
    const anomalies = result.anomalies || {};
    const lawScores = result.lawScores || null;

    const readLawValue = (keys, fallback) => {
        if (!lawScores || typeof lawScores !== 'object') return fallback;
        for (const key of keys) {
            const value = lawScores[key];
            if (value !== undefined && value !== null) {
                return normalizeScore(value);
            }
        }
        return fallback;
    };

    const signals = [
        {
            key: 'energyDistribution',
            label: 'Law Spectral',
            measure: 'Reparte energia entre frecuencias (bajas vs altas).',
            value: readLawValue(['spectral', 'lawSpectral', 'Law Spectral'], normalizeScore(scores.energyDistribution)),
            anomalous: !!anomalies.energyDistribution
        },
        {
            key: 'hlLhRatio',
            label: 'Law Benford Score',
            measure: 'Evalua distribucion de digitos y balance direccional del detalle.',
            value: readLawValue(['benford', 'lawBenford', 'Law Benford Score'], normalizeScore(scores.hlLhRatio)),
            anomalous: !!anomalies.hlLhRatio
        },
        {
            key: 'noisePattern',
            label: 'Law Noise Score',
            measure: 'Analiza textura de ruido esperada en sensores reales.',
            value: readLawValue(['noise', 'lawNoise', 'Law Noise Score'], normalizeScore(scores.noisePattern)),
            anomalous: !!anomalies.noisePattern
        },
        {
            key: 'midFrequencyGap',
            label: 'Law Glcm Score',
            measure: 'Mide co-ocurrencia y regularidad espacial de patrones.',
            value: readLawValue(['glcm', 'lawGlcm', 'Law Glcm Score'], normalizeScore(scores.midFrequencyGap)),
            anomalous: !!anomalies.midFrequencyGap
        }
    ];

    const fallbackMean = signals.reduce((sum, s) => sum + s.value, 0) / (signals.length || 1);
    const mean = readLawValue(['mean', 'lawMean', 'Mean'], fallbackMean);
    const meanLevel = scoreLevel(mean);

    evidenceTableBody.innerHTML = '';

    signals.forEach((signal) => {
        const level = scoreLevel(signal.value);
        const stateLabel = signal.anomalous ? 'Anomalo ⚠' : level.label;
        const stateClass = signal.anomalous ? 'warning' : level.className;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${signal.label}</td>
            <td class="evidence-measure">${signal.measure}</td>
            <td>${signal.value.toFixed(4)}</td>
            <td>
                <span class="signal-badge ${stateClass}">
                    ${stateLabel}
                </span>
            </td>
        `;
        evidenceTableBody.appendChild(row);
    });

    const meanRow = document.createElement('tr');
    meanRow.innerHTML = `
        <td><strong>Mean</strong></td>
        <td class="evidence-measure"><strong>Promedio de señales listadas arriba.</strong></td>
        <td><strong>${mean.toFixed(4)}</strong></td>
        <td><span class="signal-badge ${meanLevel.className}">${meanLevel.label}</span></td>
    `;
    evidenceTableBody.appendChild(meanRow);

    const anomalyCount = signals.filter((s) => s.anomalous).length;
    if (evidenceWarning) {
        if (anomalyCount >= 1) {
            evidenceWarning.style.display = 'block';
            evidenceWarning.textContent = `Warning: ${anomalyCount} señal(es) anomala(s). "Anomalo" significa comportamiento atipico frente a fotos naturales, no un veredicto final por si solo.`;
        } else {
            evidenceWarning.style.display = 'none';
            evidenceWarning.textContent = '';
        }
    }

    if (result.isAI) {
        evidenceSummary.textContent = `Se detectaron ${anomalyCount} señales fuertes compatibles con imagen sintética.`;
    } else if (anomalyCount >= 3) {
        evidenceSummary.textContent = `Resultado mixto: ${anomalyCount} señales fuertes, pero la predicción final quedó bajo el umbral de IA.`;
    } else {
        evidenceSummary.textContent = `Predominan patrones naturales. Señales fuertes detectadas: ${anomalyCount}.`;
    }
}

// Animación de entrada
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.card').style.animation = 'fadeIn 0.5s ease';
});
