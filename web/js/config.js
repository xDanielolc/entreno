// Configuración pública de la app.
//
// El Client ID NO es un secreto: viaja en cada inicio de sesión y cualquiera
// puede verlo en el navegador. Lo que protege la cuenta es la lista de
// orígenes autorizados configurada en Google Cloud, no ocultar este número.
// El «secreto del cliente» que muestra Google no se usa en una app de
// navegador y no debe aparecer nunca en este repositorio.

export const CONFIG = Object.freeze({
  googleClientId:
    '386174644405-eu6sfe270ae5s3ui3jr32frh9j0aat9a.apps.googleusercontent.com',

  // Permiso mínimo: la app solo ve los archivos que ella misma crea.
  googleScopes: 'https://www.googleapis.com/auth/drive.file',

  nombreArchivoDatos: 'entrenamiento.json',
});
