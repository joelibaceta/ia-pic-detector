# AI Image Detector

Análisis Multi-Escala con Wavelets para Detección de Imágenes Generadas por IA

## ¿Como funciona?

Los modelos de difusión (DDPM, Stable Diffusion, Midjourney, etc.) generan imágenes eliminando ruido gaussiano paso a paso.

Este proceso NO reproduce correctamente:

- El ruido fotográfico real,
- Las texturas multi-escala,
- Las correlaciones físicas entre direcciones y frecuencias.

Las cámaras reales producen imágenes descritas estadísticamente como:

- 1/f frequency law,
- Gaussian Scale Mixtures (GSM) en sub-bandas,
- Ruido shot + read,
- Blur óptico dependiente de PSF.

Las IA no.

> La Transformada Wavelet captura exactamente esas inconsistencias.