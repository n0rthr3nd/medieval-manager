# Configuración de PWA - Medieval Manager Alchemist

## Iconos de la Aplicación

La aplicación necesita iconos en diferentes tamaños para funcionar correctamente como PWA. El logo de la aplicación (MMA - Medieval Manager Alchemist) ya ha sido proporcionado.

### Generación de Iconos

Para generar los iconos necesarios a partir del logo proporcionado, sigue estos pasos:

#### Opción 1: Usar herramienta online (Recomendado)

1. Ve a [https://realfavicongenerator.net/](https://realfavicongenerator.net/)
2. Sube el archivo del logo (imagen del bocadillo con corona y guantes de boxeo)
3. Configura las siguientes opciones:
   - **iOS**: Ajustar para que el logo se vea bien sin márgenes
   - **Android Chrome**: Usar el logo completo
   - **Windows**: Usar el logo completo
4. Descarga el paquete de iconos
5. Copia los archivos PNG a `frontend/src/assets/icons/` con estos nombres:
   - `icon-72x72.png`
   - `icon-96x96.png`
   - `icon-128x128.png`
   - `icon-144x144.png`
   - `icon-152x152.png`
   - `icon-192x192.png`
   - `icon-384x384.png`
   - `icon-512x512.png`

#### Opción 2: Usar ImageMagick (línea de comandos)

Si tienes ImageMagick instalado, puedes usar este script:

```bash
# Navegar al directorio del logo
cd /path/to/logo

# Asegúrate de que el logo se llama 'logo.png'
# Si el logo tiene márgenes, primero recórtalo:
convert logo.png -trim -resize 1024x1024 logo-trimmed.png

# Generar todos los tamaños
for size in 72 96 128 144 152 192 384 512; do
  convert logo-trimmed.png -resize ${size}x${size} icon-${size}x${size}.png
done

# Copiar al directorio de assets
cp icon-*.png /home/user/medieval-manager/frontend/src/assets/icons/
```

#### Opción 3: Usar herramientas PWA

Instala PWA Asset Generator:

```bash
npm install -g pwa-asset-generator

# Navegar al directorio del frontend
cd /home/user/medieval-manager/frontend

# Generar iconos (asumiendo que el logo está en ./logo.png)
pwa-asset-generator logo.png src/assets/icons \
  --icon-only \
  --padding "0%" \
  --background "#ffffff"
```

### Verificar la Configuración

Una vez generados los iconos:

1. Verifica que todos los archivos existen en `frontend/src/assets/icons/`
2. Compila la aplicación: `npm run build`
3. Sirve la aplicación en producción
4. Usa Chrome DevTools > Application > Manifest para verificar que todos los iconos se cargan correctamente

## Características de la PWA

La aplicación ahora incluye:

✅ **Manifest.json**: Configuración de la PWA con nombre, íconos, tema, etc.
✅ **Service Worker**: Caché de recursos, funcionalidad offline, y soporte para notificaciones push
✅ **Meta Tags**: Configuración para iOS, Android y Windows
✅ **Notificaciones Push**: Sistema completo de notificaciones web push
✅ **Instalable**: Los usuarios pueden instalar la app en su dispositivo

## Probar la PWA

### En local (requiere HTTPS o localhost):

1. Inicia el servidor de desarrollo: `npm start`
2. Abre Chrome DevTools > Application
3. Verifica:
   - Manifest cargado correctamente
   - Service Worker registrado
   - Iconos disponibles
4. En el menú de Chrome, verás la opción "Instalar Medieval Manager"

### En producción:

1. Despliega la aplicación en un servidor HTTPS
2. Visita la URL en un navegador móvil o Chrome de escritorio
3. Se mostrará un banner de instalación o puedes instalar desde el menú

## Notificaciones Push

### Configuración del Backend

Las claves VAPID ya están configuradas en `/backend/.env`. Si necesitas regenerarlas:

```bash
cd backend
npx web-push generate-vapid-keys
```

Actualiza las variables en `.env`:
```
VAPID_PUBLIC_KEY=tu_clave_publica
VAPID_PRIVATE_KEY=tu_clave_privada
VAPID_SUBJECT=mailto:admin@medievalmanager.com
```

### Cómo Funcionan las Notificaciones

1. **Usuario se suscribe**: Al hacer clic en "Activar notificaciones" en `/orders`
2. **Notificación automática**: Se envía automáticamente los jueves a las 11:00 (6 horas antes del cierre)
3. **Notificación manual**: Los administradores pueden enviar notificaciones desde el backend

### Probar Notificaciones

Enviar notificación manual usando cURL:

```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "title": "Prueba de Notificación",
    "body": "Esta es una notificación de prueba",
    "data": {
      "url": "/orders"
    }
  }'
```

## Solución de Problemas

### Los iconos no se muestran

- Verifica que los archivos PNG existen en `src/assets/icons/`
- Limpia la caché del navegador
- Reconstruye la aplicación: `npm run build`

### Service Worker no se registra

- Verifica que estás en HTTPS o localhost
- Revisa la consola del navegador para errores
- Verifica que `service-worker.js` está en el directorio raíz del sitio desplegado

### Notificaciones no funcionan

- Verifica que el permiso de notificaciones está concedido
- Revisa que las claves VAPID están configuradas correctamente
- Verifica que el Service Worker está activo
- Comprueba que estás en HTTPS (requerido para Push API)

## Recursos Adicionales

- [MDN: Progressive Web Apps](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
- [Web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN: Push API](https://developer.mozilla.org/es/docs/Web/API/Push_API)
