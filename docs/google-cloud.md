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

## Quitar la advertencia «app no verificada» (0.16.0)

La app ya cumple lo que Google pide para verificarse con `drive.file`:
página de inicio pública (`https://xdanielolc.github.io/entreno/`) y política
de privacidad (`https://xdanielolc.github.io/entreno/privacidad.html`), con
enlace desde la pantalla de entrada y desde Ajustes. Lo que queda es en la
consola de Google Cloud, y lo tiene que hacer el propietario con su cuenta:

1. APIs y servicios → Pantalla de consentimiento de OAuth → «Editar app»:
   poner el nombre «Entreno», el correo de asistencia, la página de inicio y
   el enlace a la política de privacidad de arriba, y el dominio autorizado
   `xdanielolc.github.io`.
2. Guardar y pulsar «Publicar app» (pasa de «Prueba» a «En producción»).
3. Como `drive.file` no es un permiso sensible, no hace falta la revisión
   completa: la advertencia desaparece al publicar. Si Google pidiera
   «Verificar», rellenar el formulario con los mismos enlaces.

## Pendiente

- **Estado «Prueba»**: solo pueden entrar los correos de la lista de usuarios
  de prueba (máximo 100). Para familia y amigos hay dos opciones: añadir sus
  correos uno a uno, o pulsar «Publicar app». Como `drive.file` no es un
  permiso sensible, publicar no exige la revisión de Google.
- El secreto del cliente no se ha guardado: una app de navegador no lo usa.
