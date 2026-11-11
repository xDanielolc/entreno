import json, sys, time
sys.argv = ['nav.py', 'nada']
import importlib.util
spec = importlib.util.spec_from_file_location('nav', 'nav.py')
src = open('nav.py', encoding='utf-8').read().replace('\nmain()\n', '\n')
ns = {'__file__': 'nav.py', '__name__': 'nav'}
exec(compile(src, 'nav.py', 'exec'), ns)
c = ns['Cdp'](); c.metricas()
def js(expr):
    r = c.manda("Runtime.evaluate", expression=f"(async()=>{{{expr}}})()", awaitPromise=True, returnByValue=True)
    return r["result"].get("value")
c.manda("Page.enable"); c.manda("Network.enable")
c.manda("Network.setCacheDisabled", cacheDisabled=False)
c.manda("Network.setBypassServiceWorker", bypass=False)
# 1) cargar con conexión y esperar al service worker
c.manda("Page.navigate", url="http://localhost:8000/")
time.sleep(5)
print('sw:', js("const r=await navigator.serviceWorker.getRegistration(); return r ? (r.active?.state ?? 'sin activar') + ' ' + (await caches.keys()).join(',') : 'sin registro'"))
c.manda("Page.reload"); time.sleep(5)
print('controlada:', js("return Boolean(navigator.serviceWorker.controller)"))
# 2) sin conexión
c.manda("Network.emulateNetworkConditions", offline=True, latency=0, downloadThroughput=-1, uploadThroughput=-1)
fallos = []
c.manda("Page.reload"); time.sleep(6)
print('offline texto:', (js("return document.querySelector('main')?.innerText.slice(0,120)") or 'VACIO').replace('\n', ' | '))
# 3) pasar por las pantallas y buscar módulos o imágenes que fallen
rutas = ['#/', '#/cuerpo', '#/cuerpo/records', '#/cuerpo/medidas', '#/cuerpo/fotos', '#/diario', '#/ejercicios', '#/historial', '#/historial/calendario', '#/aprender', '#/ajustes', '#/rutinas', '#/audios', '#/guia-estilo']
for ruta in rutas:
    t = js(f"location.hash='{ruta}'; await new Promise(r=>setTimeout(r,1500)); const m=document.querySelector('main').innerText; const rotas=[...document.querySelectorAll('img')].filter(i=>i.complete && i.naturalWidth===0 && i.offsetParent).map(i=>i.src.split('/').slice(-2).join('/')); return (m.includes('Algo ha fallado')?'FALLO: '+m.slice(0,150):'ok '+m.length)+' | imgs rotas: '+rotas.length+' '+rotas.slice(0,4).join(',')")
    print(ruta, '→', t)
c.manda("Network.emulateNetworkConditions", offline=False, latency=0, downloadThroughput=-1, uploadThroughput=-1)
