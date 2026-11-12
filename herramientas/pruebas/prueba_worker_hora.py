"""Prueba que el Worker de avisos manda cada aviso a su hora exacta (0.91.3): el que toca ya mismo lo manda la
propia petición; el de dentro de medio minuto, el cron, esperando dormido; y el que se quita mientras espera no sale.
Tarda unos 35 s. Necesita el Chrome de pruebas en marcha (nav.py start) y cualquier página abierta."""
import json
import subprocess
import sys
from pathlib import Path

aqui = Path(__file__).resolve().parent
codigo = (aqui.parent / 'cloudflare' / 'avisos.js').read_text(encoding='utf-8')
prueba = """
const codigo = %s;
const mod = await import(URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' })));
const w = mod.default;
const entorno = () => { const almacen = new Map(); return { almacen, ORIGENES: 'https://xdanielolc.github.io', AVISOS: { get: async (k) => almacen.get(k) ?? null, put: async (k, v) => { almacen.set(k, v); } } }; };
const pide = (env, cuerpo, esperas) => w.fetch({ method: 'POST', url: 'https://avisos.ejemplo/programar',
  headers: { get: (k) => (k === 'Origin' ? 'https://xdanielolc.github.io' : null) }, json: async () => structuredClone(cuerpo) }, env, { waitUntil: (p) => esperas.push(p) });
const mandados = [];
const fetchDeVerdad = globalThis.fetch;
globalThis.fetch = async (url) => { mandados.push({ url: String(url), cuando: Date.now() }); return new Response(null, { status: 201 }); };
const r = {};
try {
  const ep = (n) => 'https://fcm.googleapis.com/fcm/send/' + n;
  // 1. Dentro de 2 s: lo manda la propia petición y no pasa por el almacén.
  const a = entorno(); const esperasA = []; const cuandoA = Date.now() + 2000;
  r.directo = await (await pide(a, { endpoint: ep('a'), avisos: [{ tipo: 'descanso', cuando: cuandoA }] }, esperasA)).json();
  r.directoEnAlmacen = JSON.parse(a.almacen.get('avisos') || '[]').length;
  // 2. Dentro de 27 s: al almacén; el cron espera y lo manda a su hora.
  const b = entorno(); const cuandoB = Date.now() + 27000;
  await pide(b, { endpoint: ep('b'), avisos: [{ tipo: 'descanso', cuando: cuandoB }] }, []);
  r.apuntadoB = JSON.parse(b.almacen.get('avisos')).length;
  let tareaB; await w.scheduled({}, b, { waitUntil: (p) => { tareaB = p; } });
  // 3. Otro igual, pero el móvil lo quita a los 3 s (se saltó el descanso): no debe salir.
  const c = entorno(); const cuandoC = Date.now() + 27000;
  await pide(c, { endpoint: ep('c'), avisos: [{ tipo: 'descanso', cuando: cuandoC }, { tipo: 'manana', cuando: Date.now() + 3600_000 }] }, []);
  let tareaC; await w.scheduled({}, c, { waitUntil: (p) => { tareaC = p; } });
  await new Promise((x) => setTimeout(x, 3000));
  await pide(c, { endpoint: ep('c'), avisos: [{ tipo: 'manana', cuando: Date.now() + 3600_000 }] }, []);
  await Promise.all([...esperasA, tareaB, tareaC]);
  const de = (n) => mandados.filter((m) => m.url.endsWith('/' + n));
  r.directoMandado = de('a').length; r.directoDesfaseMs = de('a')[0] ? de('a')[0].cuando - cuandoA : null;
  r.cronMandado = de('b').length; r.cronDesfaseMs = de('b')[0] ? de('b')[0].cuando - cuandoB : null;
  r.quedanB = JSON.parse(b.almacen.get('avisos')).length;
  r.canceladoMandado = de('c').length;
  r.quedanC = JSON.parse(c.almacen.get('avisos')).map((x) => x.t);
} finally { globalThis.fetch = fetchDeVerdad; }
return r;
""" % json.dumps(codigo)
sys.stdout.buffer.write(subprocess.run([sys.executable, str(aqui / 'nav.py'), 'js'], input=prueba.encode('utf-8'), capture_output=True).stdout)
