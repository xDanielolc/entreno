// Inicio de sesión con Google (Google Identity Services).
//
// Se pide un «token de acceso»: un pase temporal (una hora) que permite a la
// app leer y escribir SUS archivos en el Drive del usuario. No hay contraseñas
// ni secretos en la app, y el pase caduca solo.

import { CONFIG } from './config.js';

const URL_SCRIPT = 'https://accounts.google.com/gsi/client';
const CLAVE_TOKEN = 'tokenGoogle';
// Pase de larga duración, cifrado por el renovador: solo él sabe leerlo.
const CLAVE_PASE = 'paseGoogle';
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
  if (revocar) { try { almacen()?.removeItem(CLAVE_PASE); } catch { /* nada */ } }
  if (revocar && token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
}

function guardarToken(token, expiraEn) {
  const caduca = Date.now() + Number(expiraEn || 3600) * 1000;
  try { almacen()?.setItem(CLAVE_TOKEN, JSON.stringify({ token, caduca })); } catch { /* se pedirá de nuevo */ }
}

export function hayPase() {
  try { return Boolean(CONFIG.urlRenovador && almacen()?.getItem(CLAVE_PASE)); } catch { return false; }
}

// Renueva el permiso con el pase de larga duración: sin ventanas de Google.
// Devuelve el token o null si no se ha podido (sin pase, o ya no vale).
export async function renovarConPase() {
  if (!hayPase()) return null;
  try {
    const r = await fetch(`${CONFIG.urlRenovador}/renovar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pase: almacen().getItem(CLAVE_PASE) }),
    });
    const json = await r.json();
    if (r.status === 401) { almacen()?.removeItem(CLAVE_PASE); return null; }
    if (!r.ok || !json.access_token) return null;
    guardarToken(json.access_token, json.expires_in);
    return json.access_token;
  } catch {
    return null;
  }
}

// Con renovador: se pide a Google un código (una sola vez) y el renovador lo
// cambia por el permiso y el pase de larga duración.
async function pedirConRenovador(pista) {
  await cargarScript();
  return new Promise((resolver, rechazar) => {
    const cliente = google.accounts.oauth2.initCodeClient({
      client_id: CONFIG.googleClientId,
      scope: CONFIG.googleScopes,
      ux_mode: 'popup',
      // Solo se llega aquí si no hay pase: «consent» hace que Google dé
      // siempre el pase de larga duración (si ya diste permiso, a veces no).
      prompt: 'consent',
      login_hint: pista || undefined,
      callback: async (respuesta) => {
        if (respuesta.error) { rechazar(new ErrorAcceso(respuesta.error_description || respuesta.error)); return; }
        try {
          const r = await fetch(`${CONFIG.urlRenovador}/canjear`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: respuesta.code }),
          });
          const json = await r.json();
          if (!json.access_token) throw new Error(json.error || 'sin permiso');
          guardarToken(json.access_token, json.expires_in);
          if (json.pase) { try { almacen()?.setItem(CLAVE_PASE, json.pase); } catch { /* nada */ } }
          resolver(json.access_token);
        } catch (e) {
          rechazar(new ErrorAcceso(`No se pudo conectar con el renovador: ${e.message}`));
        }
      },
      error_callback: (error) => rechazar(new ErrorAcceso(
        error.type === 'popup_closed' ? 'Se cerró la ventana de Google.' : 'No se pudo conectar con Google.', error.type)),
    });
    cliente.requestCode();
  });
}

// Pide un token. Con «silencioso» no muestra la pantalla de elegir cuenta si
// ya se dio permiso antes; aun así el navegador puede bloquear la ventana si
// no viene de un toque del usuario, y entonces hay que pedirlo con un botón.
export async function pedirToken({ silencioso = false, pista = null, forzar = false } = {}) {
  const vigente = tokenVigente();
  if (vigente && !forzar) return vigente;
  // Con renovador: primero el pase (sin ventana); si no hay, se pide uno.
  if (CONFIG.urlRenovador) {
    const renovado = await renovarConPase();
    if (renovado) return renovado;
    return pedirConRenovador(pista);
  }
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
