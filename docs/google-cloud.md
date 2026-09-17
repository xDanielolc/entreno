# Configuración de Google Cloud

Hecho el 17-09-2026 desde la consola web.

| Elemento | Valor |
|---|---|
| Cuenta propietaria | la cuenta personal de Google del propietario |
| Proyecto | App de entrenamiento, ID `app-de-entrenamiento-508909` |
| API activada | Google Drive API |
| Pantalla de consentimiento | Usuarios externos, estado **Prueba** |
| Permiso | `drive.file` (Google lo clasifica como no sensible) |
| Cliente OAuth | Aplicación web «Web - GitHub Pages y local» |
| Client ID | en `web/js/config.js` |
| Orígenes autorizados | `http://localhost:8000`, `https://xdanielolc.github.io` |
| Usuarios de prueba | la cuenta del propietario |

## Pendiente

- **Estado «Prueba»**: solo pueden entrar los correos de la lista de usuarios
  de prueba (máximo 100). Para familia y amigos hay dos opciones: añadir sus
  correos uno a uno, o pulsar «Publicar app». Como `drive.file` no es un
  permiso sensible, publicar no exige la revisión de Google.
- El secreto del cliente no se ha guardado: una app de navegador no lo usa.
