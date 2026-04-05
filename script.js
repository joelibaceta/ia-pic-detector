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
    
    resultArea.style.display = 'block';
    
    // Scroll suave al resultado
    setTimeout(() => {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Animación de entrada
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.card').style.animation = 'fadeIn 0.5s ease';
});
