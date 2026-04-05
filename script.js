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
const evidenceTableBody = document.getElementById('evidenceTableBody');
const evidenceSummary = document.getElementById('evidenceSummary');

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
    
    if (result.isAI) {
        // Imagen generada por IA
        resultCard.className = 'result-card ai-detected';
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'AI-Generated Image';
        confidence.textContent = `${result.confidence}%`;
        resultDescription.textContent = result.details || 'This image shows strong indicators of being artificially generated. Our wavelet analysis detected patterns commonly associated with AI image generation tools.';
    } else {
        // Imagen real/humana
        resultCard.className = 'result-card human-created';
        resultIcon.textContent = '✓';
        resultTitle.textContent = 'Likely Human-Created';
        confidence.textContent = `${result.confidence}%`;
        resultDescription.textContent = result.details || 'This image appears to be authentic. Our wavelet analysis found characteristics typical of real photographs or human-created digital art.';
    }

    renderEvidence(result);
    
    resultArea.style.display = 'block';
    
    // Scroll suave al resultado
    setTimeout(() => {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
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
            value: readLawValue(['spectral', 'lawSpectral', 'Law Spectral'], normalizeScore(scores.energyDistribution)),
            anomalous: !!anomalies.energyDistribution
        },
        {
            key: 'hlLhRatio',
            label: 'Law Benford Score',
            value: readLawValue(['benford', 'lawBenford', 'Law Benford Score'], normalizeScore(scores.hlLhRatio)),
            anomalous: !!anomalies.hlLhRatio
        },
        {
            key: 'noisePattern',
            label: 'Law Noise Score',
            value: readLawValue(['noise', 'lawNoise', 'Law Noise Score'], normalizeScore(scores.noisePattern)),
            anomalous: !!anomalies.noisePattern
        },
        {
            key: 'midFrequencyGap',
            label: 'Law Glcm Score',
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
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${signal.label}</td>
            <td>${signal.value.toFixed(4)}</td>
            <td>
                <span class="signal-badge ${signal.anomalous ? 'high' : level.className}">
                    ${signal.anomalous ? 'Anomalo' : level.label}
                </span>
            </td>
        `;
        evidenceTableBody.appendChild(row);
    });

    const meanRow = document.createElement('tr');
    meanRow.innerHTML = `
        <td><strong>Mean</strong></td>
        <td><strong>${mean.toFixed(4)}</strong></td>
        <td><span class="signal-badge ${meanLevel.className}">${meanLevel.label}</span></td>
    `;
    evidenceTableBody.appendChild(meanRow);

    const anomalyCount = signals.filter((s) => s.anomalous).length;
    evidenceSummary.textContent = result.isAI
        ? `Se detectaron ${anomalyCount} señales fuertes compatibles con imagen sintética.`
        : `Predominan patrones naturales. Señales fuertes detectadas: ${anomalyCount}.`;
}

// Animación de entrada
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.card').style.animation = 'fadeIn 0.5s ease';
});
