"""Prueba el Worker de avisos dentro de Chrome (mismas API web que Cloudflare) con un almacén y un servicio de avisos de mentira."""
import json
import subprocess
import sys
from pathlib import Path

aqui = Path(__file__).resolve().parent
codigo = (aqui.parent / "cloudflare" / "avisos.js").read_text(encoding='utf-8')
prueba = """
const codigo = %s;
const mod = await import(URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' })));
const w = mod.default;
const almacen = new Map();
const env = { ORIGENES: 'https://xdanielolc.github.io', AVISOS: { get: async (k) => almacen.get(k) ?? null, put: async (k, v) => { almacen.set(k, v); } } };
// El navegador no deja poner la cabecera Origin en un Request: se le pasa al Worker una petición de mentira.
const pide = (ruta, { metodo = 'GET', cuerpo = null, origen = 'https://xdanielolc.github.io' } = {}) => w.fetch({ method: metodo, url: 'https://avisos.ejemplo' + ruta,
  headers: { get: (k) => (k === 'Origin' ? origen : null) }, json: async () => { if (cuerpo == null) throw new Error('sin cuerpo'); return structuredClone(cuerpo); } }, env);
const r = {};
// 1. orígenes
r.origenAjeno = (await pide('/clave', { origen: 'https://malo.example' })).status;
r.preflight = (await pide('/programar', { metodo: 'OPTIONS' })).status;
// 2. clave pública: 65 bytes en base64url, y siempre la misma
const rc = await pide('/clave'); const jc = await rc.clone().json(); if (!jc.clave) return { estado: rc.status, cuerpo: jc, crypto: typeof crypto.subtle, seguro: isSecureContext };
const c1 = (await (await pide('/clave')).json()).clave; const c2 = (await (await pide('/clave')).json()).clave;
const bytes = Uint8Array.from(atob(c1.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
r.clave = { largo: bytes.length, primerByte: bytes[0], estable: c1 === c2 };
// 3. programar: endpoint malo, bueno, y sustituir
const ep = 'https://fcm.googleapis.com/fcm/send/abc123';
const ahora = Date.now();
r.endpointMalo = (await pide('/programar', { metodo: 'POST', cuerpo: { endpoint: 'https://malo.example/x', avisos: [] } })).status;
r.programar = await (await pide('/programar', { metodo: 'POST', cuerpo: { endpoint: ep, avisos: [{ tipo: 'manana', cuando: ahora + 5000 }, { tipo: 'tarde', cuando: ahora + 6 * 3600_000 }, { tipo: 'lejos', cuando: ahora + 72 * 3600_000 }] } })).json();
r.otroMovil = await (await pide('/programar', { metodo: 'POST', cuerpo: { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/zzz', avisos: [{ tipo: 'manana', cuando: ahora - 3 * 3600_000 }, { tipo: 'manana', cuando: ahora + 1000 }] } })).json();
r.guardado = JSON.parse(almacen.get('avisos')).map((x) => x.t + '@' + new URL(x.e).hostname);
// 4. repartir a su hora: se captura lo que mandaría al servicio de avisos
const mandados = [];
const fetchDeVerdad = globalThis.fetch;
globalThis.fetch = async (url, opciones) => { mandados.push({ url, opciones }); return new Response(null, { status: String(url).includes('mozilla') ? 410 : 201 }); };
const corre = async (cuando) => { let p; const orig = Date.now; Date.now = () => cuando; try { await w.scheduled({}, env, { waitUntil: (x) => { p = x; } }); await p; } finally { Date.now = orig; } };
await corre(ahora + 1);            // aún no toca ninguno
r.antesDeHora = mandados.length;
await corre(ahora + 60_000);       // toca el de la mañana de los dos móviles
globalThis.fetch = fetchDeVerdad;
r.mandados = mandados.map((m) => new URL(m.url).hostname);
r.quedan = JSON.parse(almacen.get('avisos')).map((x) => x.t + '@' + new URL(x.e).hostname);
// 5. la firma del aviso es válida con la clave pública (ES256) y lleva la audiencia correcta
const aut = mandados[0].opciones.headers.Authorization;
const [, jwt, k] = aut.match(/^vapid t=([^,]+), k=(.+)$/);
const [h64, c64, f64] = jwt.split('.');
const de = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length %% 4)) %% 4)), (c) => c.charCodeAt(0));
const publica = await crypto.subtle.importKey('raw', de(k), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
r.firmaValida = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publica, de(f64), new TextEncoder().encode(h64 + '.' + c64));
r.cabecera = JSON.parse(new TextDecoder().decode(de(h64)));
const cuerpo = JSON.parse(new TextDecoder().decode(de(c64)));
r.audiencia = cuerpo.aud; r.sub = cuerpo.sub; r.caducaEnHoras = Math.round((cuerpo.exp - Date.now() / 1000) / 3600);
r.cabecerasEnvio = { TTL: mandados[0].opciones.headers.TTL, metodo: mandados[0].opciones.method, claveIgual: k === c1 };
// 6. cancelar
r.cancelar = await (await pide('/programar', { metodo: 'POST', cuerpo: { endpoint: ep, avisos: [] } })).json();
r.trasCancelar = JSON.parse(almacen.get('avisos')).length;
return r;
""" % json.dumps(codigo)
sys.stdout.buffer.write(subprocess.run([sys.executable, str(aqui / 'nav.py'), 'js'], input=prueba.encode('utf-8'), capture_output=True).stdout)
