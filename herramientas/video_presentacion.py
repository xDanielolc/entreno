"""Fabrica los vídeos de la presentación al abrir (uno por tema) a partir de la
animación CSS de siempre (estilo.css, «Presentación al abrir») y sus sonidos
(presentacion.js).

Por qué un vídeo: con cascos Bluetooth el sonido llega tarde y el navegador no
sabe cuánto; en un vídeo, el reproductor del móvil retrasa la imagen para que
vaya a la par con el sonido.

Cómo: abre Chrome sin ventana, pone la presentación en cada tema, la para en
cada fotograma (30 por segundo) y hace una captura; sintetiza el sonido igual
que presentacion.js (los botes) con las grabaciones de la caja; y ffmpeg lo
junta en AV1 + Opus dentro de un WebM, lo más ligero que reproduce Chrome.

Uso:  python herramientas/video_presentacion.py [tema ...]
Necesita (pip install --user): imageio-ffmpeg websocket-client numpy
Salida: web/imagenes/presentacion/<tema>.webm
"""
import base64
import json
import math
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import websocket

RAIZ = Path(__file__).resolve().parent.parent
WEB = RAIZ / "web"
SALIDA = WEB / "imagenes" / "presentacion"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")

# Tema → (data-tema, ¿oscuro?). «claro» y «oscuro» son también los de «Como el móvil».
TEMAS = {"claro": False, "oscuro": True, "fallout": False, "pixel": False,
         "arcano": True, "matrix": True, "ochentero": True}
ANCHO, ALTO, ESCALA = 360, 780, 3        # píxeles CSS de un móvil y densidad: el vídeo sale de 1080 × 2340 (con 2 no era nítido)
FPS = 30
DURACION = 3.95                           # luego la app funde la pantalla (0,4 s) sobre el último fotograma
PUERTO = 9339

# Los sonidos, como en presentacion.js (variante «cae»): tres botes y los dos golpes de la caja.
BOTES = [(1.8 * 0.30, 480), (1.8 * 0.60, 560), (1.8 * 0.84, 640)]
GOLPES = [("caja-golpe.wav", 1.75 + 1.3 * 0.30), ("caja-paf.wav", 1.75 + 1.3 * 0.52)]
MUESTREO = 48000


def tono(sonido, t, desde, hasta, dur, fuerza, ataque=0.004):
    """El «tono» de presentacion.js: frecuencia que cae en rampa exponencial y
    volumen que sube en `ataque` y se apaga en `dur`."""
    n = int(dur * MUESTREO)
    tiempos = np.arange(n) / MUESTREO
    frecuencia = desde * (hasta / desde) ** (tiempos / dur)
    fase = 2 * np.pi * np.cumsum(frecuencia) / MUESTREO
    sube = tiempos < ataque
    volumen = np.where(sube, 0.0001 * (fuerza / 0.0001) ** (tiempos / ataque),
                       fuerza * (0.0001 / fuerza) ** ((tiempos - ataque) / (dur - ataque)))
    i = int(t * MUESTREO)
    sonido[i:i + n] += np.sin(fase) * volumen


def muestra(sonido, t, archivo, fuerza):
    with wave.open(str(WEB / "sonidos" / archivo)) as w:
        datos = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        if w.getnchannels() > 1:
            datos = datos.reshape(-1, w.getnchannels()).mean(axis=1)
        origen = w.getframerate()
    n = int(len(datos) * MUESTREO / origen)
    datos = np.interp(np.arange(n) * origen / MUESTREO, np.arange(len(datos)), datos)
    i = int(t * MUESTREO)
    sonido[i:i + n] += datos * fuerza


def fabricar_sonido(destino):
    sonido = np.zeros(int((DURACION + 0.5) * MUESTREO))
    for t, f in BOTES:
        tono(sonido, t, f * 0.6, f, 0.05, 0.16)
        tono(sonido, t + 0.05, f, f * 0.8, 0.1, 0.08)
    for archivo, t in GOLPES:
        muestra(sonido, t, archivo, 0.9)
    sonido = np.clip(sonido, -1, 1)
    with wave.open(str(destino), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(MUESTREO)
        w.writeframes((sonido * 32767).astype(np.int16).tobytes())


# Sin la etiqueta viewport, Chrome en modo móvil pinta la página a 980 px de ancho y
# todo salía a un tercio de su tamaño (la pesa «se ve súper pequeña», Dan, 27-10-2026).
PAGINA = """<!doctype html><html lang="es"{atributos}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="{css}">
<style>#presentacion.en-marcha {{ animation: none !important; }} body {{ margin: 0; }}</style></head>
<body><div id="presentacion" class="cae en-marcha"><div class="escena"><div class="caja"></div>
<div class="pesa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path class="disco" d="M6.5 7.5v9M3.5 10v4"/><path class="disco" d="M17.5 7.5v9M20.5 10v4"/><path d="M6.5 12h11"/></svg></div>
<div class="nombre">Entreno</div></div></div></body></html>"""


class Chrome:
    def __init__(self, carpeta):
        self.proceso = subprocess.Popen([str(CHROME), "--headless=new", f"--remote-debugging-port={PUERTO}",
                                         f"--user-data-dir={carpeta}", "--hide-scrollbars", "--mute-audio",
                                         "--allow-file-access-from-files", "about:blank"],
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                paginas = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PUERTO}/json/list"))
                pagina = next(p for p in paginas if p["type"] == "page")
                break
            except Exception:
                time.sleep(0.2)
        self.ws = websocket.create_connection(pagina["webSocketDebuggerUrl"], timeout=60, suppress_origin=True)
        self.n = 0

    def __call__(self, metodo, **parametros):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": metodo, "params": parametros}))
        while True:
            r = json.loads(self.ws.recv())
            if r.get("id") == self.n:
                if "error" in r:
                    raise RuntimeError(f"{metodo}: {r['error']}")
                return r.get("result", {})

    def js(self, codigo):
        return self("Runtime.evaluate", expression=codigo, awaitPromise=True, returnByValue=True)["result"].get("value")

    def cerrar(self):
        self.ws.close(); self.proceso.terminate(); self.proceso.wait()


def grabar(chrome, tema, carpeta):
    oscuro = TEMAS[tema]
    atributos = f' data-tema="{tema}"' + (' data-fondo="oscuro"' if oscuro else "")
    html = carpeta / f"{tema}.html"
    html.write_text(PAGINA.format(atributos=atributos, css=(WEB / "css" / "estilo.css").as_uri()), encoding="utf-8")
    chrome("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark" if oscuro else "light"},
                                                   {"name": "prefers-reduced-motion", "value": "no-preference"}])
    chrome("Page.navigate", url=html.as_uri())
    time.sleep(1.0)
    chrome.js("document.fonts.ready.then(() => true)")
    fotogramas = carpeta / tema
    fotogramas.mkdir()
    total = int(round(DURACION * FPS))
    for i in range(total + 1):
        ms = i * 1000 / FPS
        chrome.js(f"document.getAnimations().forEach((a) => {{ a.pause(); a.currentTime = {ms}; }}); true")
        datos = chrome("Page.captureScreenshot", format="png")["data"]
        (fotogramas / f"{i:04d}.png").write_bytes(base64.b64decode(datos))
    return fotogramas


def codificar(fotogramas, sonido, destino):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(fotogramas / "%04d.png"),
                    "-i", str(sonido), "-c:v", "libaom-av1", "-crf", "30", "-b:v", "0", "-cpu-used", "4", "-row-mt", "1",
                    "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "32k", "-ac", "1", "-shortest", str(destino)],
                   check=True)


def main():
    temas = sys.argv[1:] or list(TEMAS)
    SALIDA.mkdir(parents=True, exist_ok=True)
    carpeta = Path(tempfile.mkdtemp(prefix="video-presentacion-"))
    try:
        sonido = carpeta / "sonido.wav"
        fabricar_sonido(sonido)
        chrome = Chrome(carpeta / "perfil")
        chrome("Emulation.setDeviceMetricsOverride", width=ANCHO, height=ALTO, deviceScaleFactor=ESCALA, mobile=True)
        try:
            for tema in temas:
                fotogramas = grabar(chrome, tema, carpeta)
                destino = SALIDA / f"{tema}.webm"
                codificar(fotogramas, sonido, destino)
                print(f"{tema}: {destino.stat().st_size // 1024} KB")
        finally:
            chrome.cerrar()
    finally:
        shutil.rmtree(carpeta, ignore_errors=True)


if __name__ == "__main__":
    main()
