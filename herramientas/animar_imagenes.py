# -*- coding: utf-8 -*-
"""
Anima las imágenes libres de los ejercicios: muchos dibujos de Everkinetic y
de wger (CC-BY-SA) vienen en dos posturas, el principio y el final del
movimiento. Este script baja la otra postura y junta las dos en un WebP
animado (como un GIF, pero más ligero), en web/imagenes/ejercicios/anim/.
Después apunta creditos.json al animado (la estática queda en `estatica`).

Es provisional, hasta tener dibujos propios con un estilo único (encargo a
Claude Design en docs/encargo-para-design.md).

Uso:
    herramientas\\.venv\\Scripts\\python.exe herramientas\\animar_imagenes.py
"""

import hashlib
import io
import json
import ssl
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
IMAGENES = RAIZ / "web" / "imagenes"
DESTINO = IMAGENES / "ejercicios" / "anim"
API = "https://wger.de/api/v2"
EVERKINETIC_DATOS = "https://raw.githubusercontent.com/everkinetic/data/master/exercises.json"
EVERKINETIC_PNG = "https://raw.githubusercontent.com/everkinetic/data/master/dist/png/{id}-{fase}.png"
CONTEXTO = ssl.create_default_context()
CACHE = RAIZ / "herramientas" / "__pycache__" / "imagenes-bajadas"


def bajar(url):
    CACHE.mkdir(parents=True, exist_ok=True)
    local = CACHE / hashlib.md5(url.encode()).hexdigest()
    if local.exists():
        return local.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": "app-entrenamiento/1.0"})
    with urllib.request.urlopen(req, timeout=90, context=CONTEXTO) as r:
        datos = r.read()
    local.write_bytes(datos)
    return datos


def a_rgb(datos):
    im = Image.open(io.BytesIO(datos))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        fondo = Image.new("RGBA", im.size, "white")
        fondo.alpha_composite(im)
        im = fondo
    return im.convert("RGB")


def animar(fotos, salida):
    """Junta las posturas en un WebP animado, todas del mismo tamaño y sobre blanco."""
    ims = [a_rgb(f) for f in fotos]
    ancho = max(i.width for i in ims)
    alto = max(i.height for i in ims)
    lado = 600
    escala = min(1, lado / max(ancho, alto))
    marcos = []
    for i in ims:
        lienzo = Image.new("RGB", (ancho, alto), "white")
        lienzo.paste(i, ((ancho - i.width) // 2, (alto - i.height) // 2))
        if escala < 1:
            lienzo = lienzo.resize((round(ancho * escala), round(alto * escala)), Image.LANCZOS)
        marcos.append(lienzo)
    marcos[0].save(salida, "WEBP", save_all=True, append_images=marcos[1:], duration=900, loop=0, quality=82, method=6)


def main():
    ruta = IMAGENES / "creditos.json"
    creditos = json.loads(ruta.read_text(encoding="utf-8"))
    ejercicios = creditos["ejercicios"]
    DESTINO.mkdir(parents=True, exist_ok=True)

    # Archivo estático → nombres que lo usan (alias incluidos).
    por_archivo = {}
    for nombre, c in ejercicios.items():
        if c.get("fuente") == "propia" or c.get("animada"):
            continue
        por_archivo.setdefault(c.get("estatica", c["archivo"]), []).append(nombre)

    # 1) Everkinetic directo: tensión y relajación de su repositorio.
    ek = {e["name"]: e["id_num"] for e in json.loads(bajar(EVERKINETIC_DATOS))}
    # 2) wger: las imágenes de cada ejercicio (si tiene dos del mismo estilo).
    lista = json.loads(bajar(f"{API}/exerciseimage/?limit=1000&format=json"))["results"]
    por_ejercicio = {}
    for x in lista:
        por_ejercicio.setdefault(x["exercise"], []).append(x)
    huella_wger = {}
    for ej_id, imgs in por_ejercicio.items():
        if len(imgs) < 2:
            continue
        for x in imgs:
            try:
                huella_wger[hashlib.md5(bajar(x["image"])).hexdigest()] = (ej_id, x)
            except Exception:  # noqa: BLE001
                pass

    hechos, sin = 0, []
    for archivo, nombres in sorted(por_archivo.items()):
        local = RAIZ / "web" / archivo
        if not local.exists() or local.suffix.lower() in (".gif", ".webp"):
            continue
        c = ejercicios[nombres[0]]
        fotos = None
        if c.get("fuente") == "everkinetic" and c.get("nombreEnFuente") in ek:
            i = ek[c["nombreEnFuente"]]
            try:
                fotos = [bajar(EVERKINETIC_PNG.format(id=i, fase="relaxation")), bajar(EVERKINETIC_PNG.format(id=i, fase="tension"))]
            except Exception:  # noqa: BLE001
                fotos = None
        else:
            encontrado = huella_wger.get(hashlib.md5(local.read_bytes()).hexdigest())
            if encontrado:
                ej_id, propia = encontrado
                otras = [x for x in por_ejercicio[ej_id] if x["id"] != propia["id"] and x["style"] == propia["style"]
                         and not x["image"].lower().endswith((".gif", ".webp"))]
                if otras:
                    principal = local.read_bytes()
                    segunda = bajar(otras[0]["image"])
                    fotos = [segunda, principal] if propia.get("is_main") else [principal, segunda]
        if not fotos:
            sin.append(nombres[0])
            continue
        salida = DESTINO / (Path(archivo).stem + ".webp")
        animar(fotos, salida)
        for n in nombres:
            ejercicios[n]["estatica"] = ejercicios[n].get("estatica", archivo)
            ejercicios[n]["archivo"] = f"imagenes/ejercicios/anim/{salida.name}"
            ejercicios[n]["animada"] = True
        hechos += 1
        print(f"  animada: {', '.join(nombres)}")

    ruta.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{hechos} animadas. Sin segunda postura ({len(sin)}): {', '.join(sin)}")


if __name__ == "__main__":
    main()
