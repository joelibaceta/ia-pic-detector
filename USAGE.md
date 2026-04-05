# AI Image Detector - Uso en Node.js y Browser

## 🌐 Uso en Browser (Recomendado)

El detector está optimizado para navegador. Simplemente incluye los scripts:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Core modules -->
    <script src="js/core/utils.js"></script>
    <script src="js/core/preprocessing.js"></script>
    <script src="js/core/wavelet.js"></script>
    <script src="js/core/statistics.js"></script>
    <script src="js/core/correlation.js"></script>
    
    <!-- Feature extraction -->
    <script src="js/features/featureExtractor.js"></script>
    
    <!-- Detection -->
    <script src="js/detection/thresholds.js"></script>
    <script src="js/detection/anomalyMetrics.js"></script>
    <script src="js/detection/classifier.js"></script>
    <script src="js/detection/WaveletAIDetector.js"></script>
    
    <!-- Main API -->
    <script src="js/detector.js"></script>
</head>
<body>
    <input type="file" id="imageInput" accept="image/*">
    
    <script>
        document.getElementById('imageInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const result = await detectAIImage(file);
            
            console.log('Es IA:', result.isAI);
            console.log('Confianza:', result.confidence + '%');
            console.log('Score:', result.aiScore);
        });
    </script>
</body>
</html>
```

## 📦 Uso en Node.js

### Opción 1: Servidor con Puppeteer (Recomendado para producción)

```javascript
const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/detect-ai', upload.single('image'), async (req, res) => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        // Navegar a tu aplicación
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);
        
        // Cargar la imagen y ejecutar detección
        const result = await page.evaluate(async (imagePath) => {
            const response = await fetch(imagePath);
            const blob = await response.blob();
            const file = new File([blob], 'image.jpg', { type: blob.type });
            return await detectAIImage(file);
        }, `file://${path.join(__dirname, req.file.path)}`);
        
        await browser.close();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('🚀 Detector API running on http://localhost:3000');
});
```

### Opción 2: Scripts de análisis (Ya implementado)

Los scripts `optimize-*.js` y `generate-image-list.js` ya funcionan en Node.js porque:
- No procesan imágenes directamente
- Solo analizan JSONs exportados desde el navegador
- Son herramientas de optimización

```bash
# Generar lista de imágenes
node generate-image-list.js

# Optimizar thresholds
node optimize-thresholds.js

# Optimizar pesos de métricas
node optimize-weights.js
```

## 🎯 Flujo de trabajo recomendado

### Desarrollo y Testing
1. Usa `test.html` en el navegador
2. Exporta métricas con el botón "🔬 Exportar Métricas Detalladas"
3. Ejecuta `node optimize-weights.js` para optimizar
4. Aplica cambios en `thresholds.js`

### Producción
1. **Opción A**: API REST con Puppeteer (mejor para backend)
2. **Opción B**: Widget embebido en navegador (mejor para frontend)
3. **Opción C**: Extensión de navegador

## 📚 API del Detector

### Browser Global API

```javascript
// Detección completa
const result = await detectAIImage(file);
// { isAI, confidence, aiScore, details, metrics, anomalies }

// Detección rápida
const quick = await quickDetectAI(file);
// { isAI, confidence }

// Debug info
const debug = await getDebugInfo(file);
// { wavelets, features, metrics }

// Usando el objeto detector
const result2 = await detector.detect(file);
```

### Node.js Module Export

```javascript
// Si cargas via require (con servidor Puppeteer)
const AIDetector = require('./js/detector.js');

// En el contexto de navegador de Puppeteer:
page.evaluate(async (imagePath) => {
    return await AIDetector.detect(file);
}, imagePath);
```

## 🔧 Instalación para servidor Node.js

```bash
npm init -y
npm install express multer puppeteer
```

## ⚠️ Limitaciones en Node.js puro

El detector usa APIs del navegador:
- `Canvas` para procesamiento de imágenes
- `ImageData` para píxeles
- `File API` para archivos

Por eso Node.js puro requiere:
- `node-canvas` (equivalente de Canvas)
- `jsdom` (equivalente de DOM)
- Conversión Buffer ↔ File

**Conclusión**: Es más simple usar Puppeteer que emular todo el entorno del navegador.

## 📊 Arquitectura del proyecto

```
js/
├── core/                    # Procesamiento básico
│   ├── utils.js            # Utilidades matemáticas
│   ├── preprocessing.js    # Preprocesamiento de imagen
│   ├── wavelet.js          # Transformada Daubechies 4
│   ├── statistics.js       # Cálculos estadísticos
│   └── correlation.js      # Correlaciones
├── features/               # Extracción de características
│   └── featureExtractor.js # Features wavelet
├── detection/              # Detección y clasificación
│   ├── thresholds.js       # Configuración (pesos/thresholds)
│   ├── anomalyMetrics.js   # 6 métricas de detección
│   ├── classifier.js       # Clasificador final
│   └── WaveletAIDetector.js# Orquestador principal
└── detector.js             # API pública (UMD compatible)

optimize-weights.js          # Optimizador Node.js ✅
optimize-thresholds.js       # Optimizador Node.js ✅
generate-image-list.js       # Generador Node.js ✅
test-suite.js               # Suite de pruebas browser
test.html                   # Interface de testing
```

## 🎨 Ejemplos de uso

Ver:
- `test.html` - Testing interactivo
- `example-node.js` - Ejemplo servidor Node.js
- `optimize-weights.js` - Análisis en Node.js
