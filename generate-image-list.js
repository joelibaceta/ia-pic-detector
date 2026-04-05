/**
 * Script Node.js para generar lista dinámica de imágenes
 * Escanea la carpeta images/ y crea un archivo JSON con las rutas
 */

const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');
const outputFile = path.join(__dirname, 'image-list.json');

// Extensiones de imagen soportadas
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

try {
    // Leer contenido de la carpeta images/
    const files = fs.readdirSync(imagesDir);
    
    // Filtrar solo archivos de imagen
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
    }).map(file => `images/${file}`);
    
    // Escribir JSON
    fs.writeFileSync(outputFile, JSON.stringify(imageFiles, null, 2));
    
    console.log('✓ Lista de imágenes generada exitosamente:');
    console.log(`  Total: ${imageFiles.length} imágenes`);
    imageFiles.forEach(img => console.log(`  - ${img}`));
    console.log(`\n✓ Archivo guardado en: ${outputFile}`);
    
} catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
}
