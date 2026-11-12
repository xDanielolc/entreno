"""Prueba de punta a punta del aviso del descanso contra el servidor de verdad: en la app publicada, con un Chrome
de pruebas, se apunta al push, programa un descanso para dentro de N segundos y espera a que llegue la notificación.
Uso: python prueba_push_real.py [segundos, por defecto 40]. Necesita `nav.py start` antes.
Si Chrome sin ventana no consigue apuntarse al servicio de avisos de Google, lo dice y acaba: no es fallo de la app."""
import json
import sys
import time
from pathlib import Path

src = Path(__file__).with_name('nav.py').read_text(encoding='utf-8').replace('\nmain()\n', '\n')
ns = {'__file__': str(Path(__file__).with_name('nav.py')), '__name__': 'nav'}
exec(compile(src, 'nav.py', 'exec'), ns)
c = ns['Cdp']()
c.metricas()
SEG = int(sys.argv[1]) if len(sys.argv) > 1 else 40
WEB = 'https://xdanielolc.github.io'


def js(expr, espera=60):
    c.ws.settimeout(espera)
    r = c.manda("Runtime.evaluate", expression=f"(async()=>{{{expr}}})()", awaitPromise=True, returnByValue=True)
    return r["result"].get("value", r.get("exceptionDetails", {}).get("exception", {}).get("description"))


c.manda("Page.enable")
c.manda("Network.enable")
c.manda("Network.setCacheDisabled", cacheDisabled=True)
c.manda("Network.setBypassServiceWorker", bypass=False)
c.manda("Browser.grantPermissions", origin=WEB, permissions=["notifications"])
c.manda("Page.navigate", url=WEB + "/entreno/privacidad.html")
time.sleep(4)
print('service worker:', js("const r = await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready; await new Promise(x => setTimeout(x, 3000)); return (r.active?.state ?? 'sin activar') + ' · permiso ' + Notification.permission"))
print('versión:', js("return (await import('./js/version.js?x=' + Date.now())).VERSION_APP"))
apuntado = js(f"""
  const m = await import('./js/avisos-push.js');
  if (!m.hayServidorDeAvisos()) return 'sin servidor de avisos en esta página';
  const reg = await navigator.serviceWorker.ready;
  for (const n of await reg.getNotifications()) n.close();
  try {{
    await m.programarPush([{{ tipo: 'descanso', cuando: Date.now() + 3600_000 }}], 'descanso');   // primero, apuntarse (tarda)
    window.__cuando = Date.now() + {SEG} * 1000;
    const ok = await m.programarPush([{{ tipo: 'descanso', cuando: window.__cuando }}], 'descanso');
    const sub = await reg.pushManager.getSubscription();
    return JSON.stringify({{ servidor: ok, apuntado: Boolean(sub), servicio: sub ? new URL(sub.endpoint).hostname : null }});
  }} catch (e) {{ return 'fallo: ' + e.message; }}
""", espera=90)
print('apuntado:', apuntado)
if '"servidor": true' not in str(apuntado).replace('":t', '": t'):
    print('No se ha podido apuntar: sin prueba de llegada.')
    sys.exit(0)
inicio = time.time()
llego = None
while time.time() - inicio < SEG + 45:
    time.sleep(2)
    t = js("const r = await navigator.serviceWorker.ready; return (await r.getNotifications()).map(n => n.title + ' · desfase ' + ((n.timestamp - window.__cuando) / 1000).toFixed(1) + ' s').join(' | ')")
    if t:
        llego = t
        break
print('notificación:', llego if llego else 'no ha llegado')
print('limpieza:', js("const m = await import('./js/avisos-push.js'); await m.programarPush([], 'descanso'); const r = await navigator.serviceWorker.ready; for (const n of await r.getNotifications()) n.close(); const s = await r.pushManager.getSubscription(); if (s) await s.unsubscribe(); return 'hecha'", espera=60))
