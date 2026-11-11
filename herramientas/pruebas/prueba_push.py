"""Entrega un push vacío al service worker de la app local y mira qué notificación enseña."""
import json
import time
from pathlib import Path

src = Path(__file__).with_name('nav.py').read_text(encoding='utf-8').replace('\nmain()\n', '\n')
ns = {'__file__': str(Path(__file__).with_name('nav.py')), '__name__': 'nav'}
exec(compile(src, 'nav.py', 'exec'), ns)
c = ns['Cdp']()
c.metricas()


def js(expr):
    r = c.manda("Runtime.evaluate", expression=f"(async()=>{{{expr}}})()", awaitPromise=True, returnByValue=True)
    return r["result"].get("value", r.get("exceptionDetails"))


c.manda("Page.enable")
c.manda("Network.enable")
c.manda("Network.setCacheDisabled", cacheDisabled=True)
c.manda("Network.setBypassServiceWorker", bypass=False)
c.manda("Browser.grantPermissions", origin="http://localhost:8000", permissions=["notifications"])
c.manda("Page.navigate", url="http://localhost:8000/")
time.sleep(4)
# service worker nuevo: se quita el viejo y se vuelve a registrar para coger el sw.js de ahora
print('registro:', js("for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); const r = await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready; await new Promise(x => setTimeout(x, 2500)); return (r.active?.state ?? 'sin activar') + ' permiso=' + Notification.permission"))
c.manda("ServiceWorker.enable")
registro = None
c.ws.settimeout(3)
try:
    while True:
        m = json.loads(c.ws.recv())
        if m.get('method') == 'ServiceWorker.workerRegistrationUpdated':
            for r in m['params']['registrations']:
                if 'localhost:8000' in r['scopeURL'] and not r.get('isDeleted'):
                    registro = r['registrationId']
except Exception:
    pass
c.ws.settimeout(60)
print('id de registro:', registro)
c.manda("ServiceWorker.deliverPushMessage", origin="http://localhost:8000", registrationId=registro, data="")
time.sleep(1.5)
print('notificaciones:', js("const r = await navigator.serviceWorker.ready; return (await r.getNotifications()).map(n => ({ titulo: n.title, cuerpo: n.body, tag: n.tag, url: n.data?.url }))"))
c.manda("ServiceWorker.deliverPushMessage", origin="http://localhost:8000", registrationId=registro, data="")
time.sleep(1)
print('tras un segundo push:', js("const r = await navigator.serviceWorker.ready; const n = await r.getNotifications(); for (const x of n) x.close(); return n.length"))
