// Avisos a su hora para Entreno (Cloudflare Worker), aunque la app esté cerrada.
//
// Para qué sirve: una web no puede despertarse sola. El aviso del test de
// atención («45 minutos después de levantarte») era un temporizador de la
// propia app, y el móvil la congela en cuanto se apaga la pantalla: no llegaba
// nunca. Con este pequeño servidor, la app deja apuntado «avísame a tal hora»
// y es el servidor quien, a esa hora, manda el aviso al móvil (un «push»).
//
// Qué guarda: por cada móvil con avisos pendientes, la dirección de avisos
// que le da su navegador (una dirección larga y anónima de Google, Mozilla o
// Apple: no dice quién eres) y la hora a la que avisar. Nada más: ni nombre,
// ni correo, ni datos de entrenamiento ni de sueño. El aviso no lleva texto
// (lo pone la app al recibirlo) y se borra en cuanto se manda o caduca.
//
// Qué hay que darle en Cloudflare (ver docs/cloudflare.md, «Avisos a su hora»):
//   AVISOS    un almacén KV (binding) donde apunta los avisos pendientes y
//             guarda su par de claves, que crea él solo la primera vez
//   ORIGENES  (texto) webs que pueden usarlo: https://xdanielolc.github.io
//   Un disparador «Cron» cada minuto:  * * * * *
// No lleva ningún secreto puesto a mano.
//
// Rutas:
//   GET  /clave      → { clave }  la clave pública con la que el móvil se apunta
//   POST /programar  { endpoint, avisos: [{ tipo, cuando }] } → { ok, pendientes }
//        Es el estado completo que quiere ese móvil: sustituye a lo que hubiera.
//        Una lista vacía los quita todos. `cuando` va en milisegundos (Date.now()).

const SERVICIOS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/,
  /^updates\.push\.services\.mozilla\.com$/];
const MAXIMO_AVISOS = 500;            // en total, para que nadie llene el almacén
const MAXIMO_POR_MOVIL = 4;
const HORIZONTE_MS = 36 * 3600_000;   // no se apunta nada a más de día y medio
const CADUCA_MS = 30 * 60_000;        // un aviso que llega media hora tarde ya no sirve
const QUIEN = 'https://xdanielolc.github.io/entreno/';   // contacto que exige el protocolo (una dirección web vale)

export default {
  async fetch(peticion, env) {
    const origen = peticion.headers.get('Origin') || '';
    const permitidos = (env.ORIGENES || '').split(',').map((x) => x.trim()).filter(Boolean);
    const cors = permitidos.includes(origen)
      ? { 'Access-Control-Allow-Origin': origen, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
      : null;
    const respuesta = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), {
      status: estado, headers: { 'Content-Type': 'application/json', ...(cors || {}) },
    });
    if (peticion.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (!cors) return respuesta({ error: 'origen_no_permitido' }, 403);
    if (!env.AVISOS) return respuesta({ error: 'falta_almacen' }, 500);
    const ruta = new URL(peticion.url).pathname;

    try {
      if (ruta === '/clave' && peticion.method === 'GET') {
        return respuesta({ clave: (await claves(env)).publica });
      }
      if (ruta === '/programar' && peticion.method === 'POST') {
        let datos;
        try { datos = await peticion.json(); } catch { return respuesta({ error: 'json' }, 400); }
        if (!endpointValido(datos.endpoint)) return respuesta({ error: 'endpoint' }, 400);
        const ahora = Date.now();
        const nuevos = (Array.isArray(datos.avisos) ? datos.avisos : []).slice(0, MAXIMO_POR_MOVIL)
          .filter((a) => a && typeof a.tipo === 'string' && /^[a-z-]{1,20}$/.test(a.tipo)
            && Number.isFinite(a.cuando) && a.cuando > ahora - 60_000 && a.cuando < ahora + HORIZONTE_MS)
          .map((a) => ({ e: datos.endpoint, t: a.tipo, c: Math.round(a.cuando) }));
        const lista = (await leer(env)).filter((x) => x.e !== datos.endpoint);
        if (lista.length + nuevos.length > MAXIMO_AVISOS) return respuesta({ error: 'lleno' }, 503);
        await guardar(env, [...lista, ...nuevos]);
        return respuesta({ ok: true, pendientes: nuevos.length });
      }
      return respuesta({ error: 'ruta' }, 404);
    } catch (e) {
      return respuesta({ error: 'fallo' }, 500);
    }
  },

  // Cada minuto: manda los avisos cuya hora ha llegado y los quita de la lista.
  async scheduled(evento, env, contexto) {
    contexto.waitUntil(repartir(env));
  },
};

async function repartir(env, ahora = Date.now()) {
  const lista = await leer(env);
  if (!lista.length) return { mandados: 0, quedan: 0 };
  const tocan = lista.filter((x) => x.c <= ahora);
  if (!tocan.length) return { mandados: 0, quedan: lista.length };
  const k = await claves(env);
  let mandados = 0;
  const caidos = new Set();   // móviles que ya no existen para su servicio de avisos
  for (const aviso of tocan) {
    if (ahora - aviso.c > CADUCA_MS || caidos.has(aviso.e)) continue;
    try {
      const r = await mandar(k, aviso.e);
      if (r.status === 404 || r.status === 410) caidos.add(aviso.e);
      else if (r.ok) mandados += 1;
    } catch { /* la red del servicio: ese aviso se pierde, no se reintenta */ }
  }
  const quedan = lista.filter((x) => x.c > ahora && !caidos.has(x.e));
  await guardar(env, quedan);
  return { mandados, quedan: quedan.length };
}

// ---------------------------------------------------------------------------

function endpointValido(endpoint) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && endpoint.length < 1000 && SERVICIOS.some((s) => s.test(u.hostname));
  } catch { return false; }
}

async function leer(env) {
  try { return JSON.parse(await env.AVISOS.get('avisos') || '[]'); } catch { return []; }
}
async function guardar(env, lista) {
  await env.AVISOS.put('avisos', JSON.stringify(lista));
}

// El par de claves con el que el servidor firma los avisos (VAPID). Lo crea él
// solo la primera vez y lo guarda en su almacén: la privada no sale de aquí.
let enMemoria = null;
async function claves(env) {
  if (enMemoria) return enMemoria;
  let guardadas = null;
  try { guardadas = JSON.parse(await env.AVISOS.get('claves') || 'null'); } catch { guardadas = null; }
  if (!guardadas) {
    const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    guardadas = {
      privada: await crypto.subtle.exportKey('jwk', par.privateKey),
      publica: b64url(await crypto.subtle.exportKey('raw', par.publicKey)),
    };
    await env.AVISOS.put('claves', JSON.stringify(guardadas));
  }
  enMemoria = {
    publica: guardadas.publica,
    privada: await crypto.subtle.importKey('jwk', guardadas.privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']),
  };
  return enMemoria;
}

// Un aviso sin contenido: basta la firma del servidor (no hay nada que cifrar).
async function mandar(k, endpoint) {
  const cabecera = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const cuerpo = b64url(new TextEncoder().encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: QUIEN,
  })));
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k.privada, new TextEncoder().encode(`${cabecera}.${cuerpo}`));
  return fetch(endpoint, {
    method: 'POST',
    headers: { TTL: '1800', Urgency: 'high', Authorization: `vapid t=${cabecera}.${cuerpo}.${b64url(firma)}, k=${k.publica}` },
  });
}

function b64url(bytes) {
  let texto = '';
  for (const b of new Uint8Array(bytes)) texto += String.fromCharCode(b);
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
