// Inicio de sesión con Google (Google Identity Services).
//
// Se pide un «token de acceso»: un pase temporal (una hora) que permite a la
// app leer y escribir SUS archivos en el Drive del usuario. No hay contraseñas
// ni secretos en la app, y el pase caduca solo.

import { CONFIG } from './config.js';

const URL_SCRIPT = 'https://accounts.google.com/gsi/client';
const CLAVE_TOKEN = 'tokenGoogle';
// El pase se guarda en localStorage y no en sessionStorage: al cerrar la app
// instalada y volver a abrirla, la sesión del navegador es otra y se perdía.
const almacen = () => { try { return localStorage; } catch { return null; } };

let cargaScript;

function cargarScript() {
  cargaScript ??= new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = URL_SCRIPT;
    s.async = true;
    s.onload = resolver;
    s.onerror = () => {
      cargaScript = null;
      rechazar(new Error('No se ha podido cargar el acceso de Google. ¿Hay conexión?'));
    };
    document.head.append(s);
  });
  return cargaScript;
}

export function tokenVigente() {
  try {
    const guardado = JSON.parse(almacen()?.getItem(CLAVE_TOKEN));
    if (guardado && guardado.caduca - Date.now() > 60_000) return guardado.token;
  } catch { /* sin token */ }
  return null;
}

// Minutos que le quedan al pase (null si no hay).
export function minutosDeToken() {
  try {
    const guardado = JSON.parse(almacen()?.getItem(CLAVE_TOKEN));
    return guardado ? (guardado.caduca - Date.now()) / 60_000 : null;
  } catch { return null; }
}

// Olvida el pase. Solo se revoca el permiso (Google vuelve a pedir
// consentimiento) al eliminar la cuenta; al caducar o al salir, no.
export function olvidarToken({ revocar = false } = {}) {
  const token = tokenVigente();
  try { almacen()?.removeItem(CLAVE_TOKEN); } catch { /* nada */ }
  if (revocar && token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
}

// Pide un token. Con «silencioso» no muestra la pantalla de elegir cuenta si
// ya se dio permiso antes; aun así el navegador puede bloquear la ventana si
// no viene de un toque del usuario, y entonces hay que pedirlo con un botón.
export async function pedirToken({ silencioso = false, pista = null } = {}) {
  const vigente = tokenVigente();
  if (vigente) return vigente;
  await cargarScript();

  return new Promise((resolver, rechazar) => {
    const cliente = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.googleClientId,
      scope: CONFIG.googleScopes,
      prompt: silencioso ? '' : 'select_account',
      hint: pista || undefined,
      callback: (respuesta) => {
        if (respuesta.error) {
          rechazar(new ErrorAcceso(respuesta.error_description || respuesta.error));
          return;
        }
        if (!google.accounts.oauth2.hasGrantedAllScopes(respuesta, CONFIG.googleScopes)) {
          rechazar(new ErrorAcceso('Hace falta dar permiso para guardar en Google Drive.'));
          return;
        }
        const caduca = Date.now() + Number(respuesta.expires_in || 3600) * 1000;
        try {
          almacen()?.setItem(CLAVE_TOKEN, JSON.stringify({ token: respuesta.access_token, caduca }));
        } catch { /* se pedirá de nuevo al recargar */ }
        resolver(respuesta.access_token);
      },
      error_callback: (error) => {
        rechazar(new ErrorAcceso(
          error.type === 'popup_closed' ? 'Se cerró la ventana de Google.'
            : error.type === 'popup_failed_to_open' ? 'El navegador bloqueó la ventana de Google.'
              : 'No se pudo conectar con Google.', error.type));
      },
    });
    cliente.requestAccessToken();
  });
}

export class ErrorAcceso extends Error {
  constructor(mensaje, tipo = null) {
    super(mensaje);
    this.name = 'ErrorAcceso';
    this.tipo = tipo;
  }
}
