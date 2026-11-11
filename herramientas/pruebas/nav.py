"""Chrome sin ventana para probar Entreno a 375 px.
  python nav.py start            lanza Chrome (perfil propio en el scratchpad)
  python nav.py goto URL
  python nav.py js   (JS por stdin; se evalua con await; imprime el resultado)
  python nav.py shot ARCHIVO.png [full]
  python nav.py tema claro|oscuro
  python nav.py offline on|off
  python nav.py swipe x1 y1 x2 y2
  python nav.py tap x y
  python nav.py stop
"""
import base64, json, subprocess, sys, time, urllib.request
from pathlib import Path
import websocket

AQUI = Path(__file__).resolve().parent
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PUERTO = 9444
ANCHO, ALTO = 375, 812


def pagina():
    datos = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PUERTO}/json"))
    for d in datos:
        if d["type"] == "page":
            return d
    raise SystemExit("sin pagina")


class Cdp:
    def __init__(self):
        self.ws = websocket.create_connection(pagina()["webSocketDebuggerUrl"], timeout=60, suppress_origin=True)
        self.n = 0

    def manda(self, metodo, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": metodo, "params": params}))
        while True:
            r = json.loads(self.ws.recv())
            if r.get("id") == self.n:
                if "error" in r:
                    raise SystemExit(f"CDP {metodo}: {r['error']}")
                return r["result"]

    def metricas(self, alto=ALTO):
        self.manda("Emulation.setDeviceMetricsOverride", width=ANCHO, height=alto, deviceScaleFactor=2, mobile=True)
        self.manda("Emulation.setTouchEmulationEnabled", enabled=True)


def main():
    orden = sys.argv[1]
    if orden == "start":
        perfil = AQUI / "perfil-chrome"
        subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PUERTO}", f"--user-data-dir={perfil}",
                          f"--window-size={ANCHO},{ALTO}", "--no-first-run", "--disable-gpu", "--remote-allow-origins=*",
                          "--autoplay-policy=no-user-gesture-required"] + sys.argv[2:] + ["about:blank"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         creationflags=0x00000008 | 0x00000200)
        for _ in range(40):
            try:
                pagina(); break
            except Exception:
                time.sleep(0.5)
        c = Cdp(); c.metricas()
        print("en marcha")
        return
    c = Cdp()
    c.metricas()
    ft = AQUI / "tema.txt"
    if orden == "tema":
        ft.write_text(sys.argv[2])
    if ft.exists():
        c.manda("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark" if ft.read_text().strip() == "oscuro" else "light"}])
    if orden == "goto":
        c.manda("Page.enable")
        c.manda("Network.enable")
        c.manda("Network.setCacheDisabled", cacheDisabled=True)
        c.manda("Network.setBypassServiceWorker", bypass=True)
        c.manda("Page.navigate", url="about:blank")
        time.sleep(0.3)
        c.manda("Page.navigate", url=sys.argv[2])
        time.sleep(float(sys.argv[3]) if len(sys.argv) > 3 else 2.5)
        print("ok")
    elif orden == "js":
        c.manda("Network.enable")
        c.manda("Network.setCacheDisabled", cacheDisabled=True)
        c.manda("Network.setBypassServiceWorker", bypass=True)
        codigo = (AQUI / "ayudas.js").read_text(encoding="utf-8") + "\n" + sys.stdin.buffer.read().decode("utf-8")
        r = c.manda("Runtime.evaluate", expression=f"(async()=>{{{codigo}}})()", awaitPromise=True, returnByValue=True, userGesture=True)
        if "exceptionDetails" in r:
            print("EXCEPCION:", json.dumps(r["exceptionDetails"].get("exception", r["exceptionDetails"]), ensure_ascii=False)[:1500])
        else:
            v = r["result"].get("value")
            sys.stdout.buffer.write((v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, indent=1)).encode("utf-8") if v is not None else b"(nada)")
    elif orden == "shot":
        completo = len(sys.argv) > 3 and sys.argv[3] == "full"
        if completo:
            alto = c.manda("Runtime.evaluate", expression="Math.max(document.documentElement.scrollHeight, 812)", returnByValue=True)["result"]["value"]
            c.metricas(min(int(alto), 6000))
            time.sleep(0.4)
        r = c.manda("Page.captureScreenshot", format="png")
        destino = Path(sys.argv[2])
        if not destino.is_absolute():
            destino = AQUI / "capturas" / destino
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(base64.b64decode(r["data"]))
        if completo:
            c.metricas()
        print(destino)
    elif orden == "tema":
        c.manda("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark" if sys.argv[2] == "oscuro" else "light"}])
        print("ok")
    elif orden == "offline":
        c.manda("Network.enable")
        c.manda("Network.emulateNetworkConditions", offline=sys.argv[2] == "on", latency=0, downloadThroughput=-1, uploadThroughput=-1)
        print("ok")
    elif orden == "tap":
        x, y = float(sys.argv[2]), float(sys.argv[3])
        c.manda("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
        c.manda("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
        print("ok")
    elif orden == "swipe":
        x1, y1, x2, y2 = map(float, sys.argv[2:6])
        c.manda("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x1, "y": y1}])
        for i in range(1, 11):
            c.manda("Input.dispatchTouchEvent", type="touchMove", touchPoints=[{"x": x1 + (x2 - x1) * i / 10, "y": y1 + (y2 - y1) * i / 10}])
            time.sleep(0.02)
        c.manda("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
        print("ok")
    elif orden == "consola":
        c.manda("Runtime.enable")
        c.manda("Log.enable")
        c.ws.settimeout(float(sys.argv[2]) if len(sys.argv) > 2 else 2)
        try:
            while True:
                r = json.loads(c.ws.recv())
                if r.get("method") in ("Runtime.exceptionThrown", "Log.entryAdded", "Runtime.consoleAPICalled"):
                    print(json.dumps(r["params"], ensure_ascii=False)[:600])
        except Exception:
            pass
    elif orden == "stop":
        try:
            c.manda("Browser.close")
        except BaseException:
            pass
        print("cerrado")


main()
