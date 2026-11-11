// Avisos a su hora aunque la app esté cerrada.
//
// Un temporizador de la propia página no vale: el móvil congela la app en
// cuanto se apaga la pantalla, y el aviso no llega (le pasó a Dan con el del
// test de atención, 12-11-2026). Aquí la app deja apuntado en un servidor muy
// pequeño (Cloudflare, `herramientas/cloudflare/avisos.js`) «avísame a tal
// hora», y es él quien manda el aviso al móvil (un «push»); el texto lo pone
// el service worker al recibirlo.
//
// Al servidor solo va la dirección de avisos que da el navegador (anónima) y
// la hora. Si el servidor no existe o falla, no pasa nada: queda el
// temporizador de siempre y la tarjeta al abrir la app.

import { CONFIG } from './config.js';

const CLAVE_ESTADO = 'entreno-push-estado';   // lo último que se le dijo al servidor (para no repetirlo)
const CLAVE_PUBLICA = 'entreno-push-clave';   // la clave pública del servidor y el día que se pidió

export const hayServidorDeAvisos = () => Boolean(CONFIG.urlAvisos)
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function deB64url(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}
function aB64url(bytes) {
  let texto = '';
  for (const b of new Uint8Array(bytes)) texto += String.fromCharCode(b);
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// La clave pública del servidor. Se guarda un día: si el servidor se rehace
// (claves nuevas), al día siguiente el móvil se vuelve a apuntar solo.
async function clavePublica() {
  const hoy = new Date().toDateString();
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_PUBLICA) || 'null');
    if (guardada?.dia === hoy && guardada.clave) return guardada.clave;
  } catch { /* se pide de nuevo */ }
  const r = await fetch(`${CONFIG.urlAvisos}/clave`);
  if (!r.ok) throw new Error('sin clave');
  const { clave } = await r.json();
  try { localStorage.setItem(CLAVE_PUBLICA, JSON.stringify({ dia: hoy, clave })); } catch { /* sin almacén */ }
  return clave;
}

let cola = Promise.resolve(false);

// `avisos` es TODO lo que este móvil quiere que le avisen: [{ tipo, cuando }],
// con `cuando` en milisegundos (como Date.now()). Sustituye a lo anterior; una
// lista vacía lo quita todo. Devuelve una promesa con true si el servidor lo
// tiene apuntado. Se puede llamar cuantas veces haga falta: si nada ha
// cambiado, no se manda nada.
export function programarPush(avisos) {
  cola = cola.then(() => programar(avisos)).catch(() => false);
  return cola;
}

// Si el servidor no contesta (aún no existe, o no hay red), no se insiste hasta pasados diez minutos.
let sinServidorHasta = 0;

async function programar(avisos) {
  if (!hayServidorDeAvisos() || Notification.permission !== 'granted' || Date.now() < sinServidorHasta) return false;
  try { return await hablarConElServidor(avisos); } catch (e) { sinServidorHasta = Date.now() + 10 * 60_000; return false; }
}

async function hablarConElServidor(avisos) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && !avisos.length) return true;   // ni estaba apuntado ni hay nada que apuntar
  const clave = await clavePublica();
  // Apuntado con una clave que ya no es la del servidor: se rehace.
  if (sub && sub.options?.applicationServerKey && aB64url(sub.options.applicationServerKey) !== clave) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64url(clave) });
  const deseado = JSON.stringify({ e: sub.endpoint, a: avisos.map((a) => [a.tipo, Math.round(a.cuando / 60_000)]).sort() });
  try { if (localStorage.getItem(CLAVE_ESTADO) === deseado) return true; } catch { /* se manda */ }
  const r = await fetch(`${CONFIG.urlAvisos}/programar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, avisos: avisos.map((a) => ({ tipo: a.tipo, cuando: Math.round(a.cuando) })) }),
  });
  if (!r.ok) return false;
  try { localStorage.setItem(CLAVE_ESTADO, deseado); } catch { /* sin almacén */ }
  return true;
}
