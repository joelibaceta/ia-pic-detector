/**
 * Ejemplo de uso del detector en Node.js
 * 
 * Para usar el detector en Node.js necesitas:
 * 1. Cargar todos los módulos del detector
 * 2. Convertir la imagen a un formato compatible
 */

const fs = require('fs');
const path = require('path');

// En Node.js necesitas cargar los módulos en orden
// (en el navegador se cargan automáticamente vía <script>)

console.log('🔍 AI Image Detector - Ejemplo Node.js\n');
console.log('⚠️  NOTA: Para usar en Node.js necesitas:');
console.log('   1. Cargar todos los módulos del detector (core, features, detection)');
console.log('   2. Un entorno compatible con Canvas (como node-canvas)');
console.log('   3. Convertir File API a Buffer\n');

console.log('📝 Uso recomendado:');
console.log('   - Para análisis: Usa el navegador (test.html)');
console.log('   - Para optimización: Usa los scripts de análisis (optimize-*.js)');
console.log('   - Para integración: Crea un servidor web que use el detector\n');

console.log('💡 Alternativa sugerida:');
console.log('   Crea un servidor Express que:');
console.log('   1. Reciba imágenes vía API');
console.log('   2. Las procese usando Puppeteer/Playwright');
console.log('   3. Ejecute el detector en contexto de navegador');
console.log('   4. Devuelva el resultado JSON\n');

// Ejemplo de estructura para servidor Node.js
const exampleServerCode = `
// server.js - Ejemplo de servidor Node.js con el detector
const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/detect', upload.single('image'), async (req, res) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Cargar el detector en la página
    await page.goto('http://localhost:8000');
    await page.addScriptTag({ path: './js/detector.js' });
    
    // Ejecutar detección
    const result = await page.evaluate(async (imagePath) => {
        const response = await fetch(imagePath);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg');
        return await detectAIImage(file);
    }, req.file.path);
    
    await browser.close();
    res.json(result);
});

app.listen(3000);
`;

console.log('📄 Código de ejemplo:');
console.log(exampleServerCode);

console.log('✅ Para desarrollo rápido: Usa test.html en el navegador');
console.log('✅ Para producción: Implementa el patrón servidor + Puppeteer');
