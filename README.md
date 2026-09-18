# Entreno

App web instalable (PWA) para registrar entrenamientos con progresión
configurable: ciclos Bilbo, por carga, por esfuerzo o libre.

- **Dirección:** https://xdanielolc.github.io/entreno/
- **Datos:** cada persona entra con su cuenta de Google y sus datos se guardan
  en su propio Google Drive (permiso `drive.file`: la app solo ve los archivos
  que crea). También queda una copia en el dispositivo para usarla sin cobertura.
- **Sin compilación:** JavaScript, HTML y CSS tal cual, en `web/`.

## Carpetas

| Carpeta | Contenido |
|---|---|
| `web/` | La app. Es lo único que se publica |
| `docs/` | Esquema de datos y configuración de Google Cloud |
| `herramientas/` | Utilidades locales (convertidor de hojas de cálculo, iconos) |
| `datos-privados/` | Datos personales. No se sube nunca (está en `.gitignore`) |

## Probar en el ordenador

Doble clic en `Probar la app en el ordenador.bat` (necesita Python). Abre
http://localhost:8000.

## Publicar una versión nueva

1. Subir el número en `web/js/version.js` y en `VERSION` de `web/sw.js`.
2. Guardar en Git y subir a GitHub. La publicación es automática y los móviles
   reciben la versión nueva la siguiente vez que abren la app.

## Créditos

Las imágenes de los ejercicios y del mapa muscular proceden de
[wger](https://wger.de), con licencia Creative Commons
Atribución-CompartirIgual (CC-BY-SA). Cada imagen conserva a su autor en
`web/imagenes/creditos.json` y la app los muestra en Ajustes. Se descargan con
`herramientas/descargar_imagenes.py`.

Los ejercicios que wger no tiene usan los dibujos de
[Everkinetic](https://github.com/everkinetic/data) (CC-BY-SA 4.0). Los que
ninguno de los dos tiene (yoga, estiramientos, movilidad, cardio) llevan
muñecos propios generados con `herramientas/dibujar_munecos.py`, que se ejecuta
después del de descarga. También son propias siete capas del mapa muscular
(`herramientas/dibujar_capas_extra.py`).
