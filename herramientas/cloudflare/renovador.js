// Renovador del permiso de Google para Entreno (Cloudflare Worker).
//
// Para qué sirve: el permiso que da Google a una app de navegador dura una
// hora y renovarlo obliga a abrir su ventana. Con este pequeño servidor, la
// app pide una vez un «pase de larga duración» (refresh token) y, a partir de
// ahí, renueva el permiso sola, sin ventanas, cada vez que caduca.
//
// Qué guarda: NADA. No hay base de datos. El pase de larga duración se cifra
// aquí con una clave que solo conoce este servidor y se devuelve cifrado a la
// app, que lo guarda en el móvil. Sin esa clave no sirve para nada, y sin el
// móvil tampoco.
//
// Secretos (se ponen en Cloudflare, NUNCA en el repositorio):
//   GOOGLE_CLIENT_SECRET  el «secreto del cliente» de Google Cloud
//   CLAVE_CIFRADO         32 bytes aleatorios en base64 (ver la guía)
// Variables normales:
//   GOOGLE_CLIENT_ID      el mismo Client ID que usa la app
//   ORIGENES              webs que pueden usarlo, separadas por comas
//                         (https://xdanielolc.github.io)
//
// Rutas (las dos por POST, con JSON):
//   /canjear  { code }  → { access_token, expires_in, pase }
//   /renovar  { pase }  → { access_token, expires_in }

const TOKEN_GOOGLE = 'https://oauth2.googleapis.com/token';

export default {
  async fetch(peticion, env) {
    const origen = peticion.headers.get('Origin') || '';
    const permitidos = (env.ORIGENES || '').split(',').map((x) => x.trim()).filter(Boolean);
    const cors = permitidos.includes(origen)
      ? { 'Access-Control-Allow-Origin': origen, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
      : null;
    const respuesta = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), {
      status: estado, headers: { 'Content-Type': 'application/json', ...(cors || {}) },
    });

    if (peticion.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (!cors) return respuesta({ error: 'origen_no_permitido' }, 403);
    if (peticion.method !== 'POST') return respuesta({ error: 'metodo' }, 405);

    let datos;
    try { datos = await peticion.json(); } catch { return respuesta({ error: 'json' }, 400); }
    const ruta = new URL(peticion.url).pathname;

    try {
      if (ruta === '/canjear') {
        if (!datos.code) return respuesta({ error: 'falta_code' }, 400);
        const g = await pedirAGoogle(env, {
          grant_type: 'authorization_code', code: datos.code, redirect_uri: 'postmessage',
        });
        if (!g.refresh_token) return respuesta({ error: 'sin_pase_largo', access_token: g.access_token, expires_in: g.expires_in });
        return respuesta({ access_token: g.access_token, expires_in: g.expires_in, pase: await cifrar(env, g.refresh_token) });
      }
      if (ruta === '/renovar') {
        if (!datos.pase) return respuesta({ error: 'falta_pase' }, 400);
        const refresco = await descifrar(env, datos.pase);
        const g = await pedirAGoogle(env, { grant_type: 'refresh_token', refresh_token: refresco });
        return respuesta({ access_token: g.access_token, expires_in: g.expires_in });
      }
      return respuesta({ error: 'ruta' }, 404);
    } catch (e) {
      // invalid_grant: el pase ya no vale (permiso quitado o caducado).
      // invalid_grant o un pase que no se puede descifrar: hay que volver a conectar.
      const caducado = e.codigo === 'invalid_grant' || e.name === 'OperationError';
      return respuesta({ error: caducado ? 'pase_no_vale' : (e.codigo || 'fallo') }, caducado ? 401 : 502);
    }
  },
};

async function pedirAGoogle(env, campos) {
  const cuerpo = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...campos });
  const r = await fetch(TOKEN_GOOGLE, { method: 'POST', body: cuerpo });
  const json = await r.json();
  if (!r.ok || json.error) {
    const e = new Error(json.error_description || json.error || 'google');
    e.codigo = json.error || 'google';
    throw e;
  }
  return json;
}

// Cifrado AES-GCM con la clave del servidor. El resultado es «iv.datos» en base64.
async function clave(env) {
  const bruta = Uint8Array.from(atob(env.CLAVE_CIFRADO), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', bruta, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const deB64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

async function cifrar(env, texto) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await clave(env), new TextEncoder().encode(texto));
  return `${b64(iv)}.${b64(datos)}`;
}

async function descifrar(env, pase) {
  const [iv, datos] = String(pase).split('.');
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, await clave(env), deB64(datos));
  return new TextDecoder().decode(claro);
}
