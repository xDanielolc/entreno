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
import re
import unicodedata
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


def mascara(im, umbral=245):
    """Lo que no es blanco (incluidas las líneas grises claras y el azul
    claro de Everkinetic: con un umbral más bajo se quedaban fuera y se
    cortaban)."""
    return im.convert("L").point(lambda v: 255 if v < umbral else 0)


def ancla(im):
    """Centro horizontal y borde de abajo de lo que hay en la franja baja del
    dibujo (pies, banco, suelo): lo que no se mueve entre las dos posturas."""
    gris = mascara(im, 200)
    caja = gris.getbbox()
    if not caja:
        return im.width / 2, im.height
    x0, y0, x1, y1 = caja
    franja = gris.crop((x0, y1 - max(8, (y1 - y0) // 5), x1, y1))
    fb = franja.getbbox() or (0, 0, x1 - x0, 1)
    return x0 + (fb[0] + fb[2]) / 2, y1


def animar(fotos, salida, duraciones=(900, 900)):
    """Junta las posturas en un WebP animado sobre blanco, encajadas por abajo.
    Cada postura se coloca con su ancla en el mismo punto; el lienzo es el
    cuadrado que abarca el dibujo de todas (así no se corta nada)."""
    ims = [a_rgb(f) for f in fotos]
    anclas = [ancla(i) for i in ims]
    cajas = [mascara(i).getbbox() or (0, 0, i.width, i.height) for i in ims]
    # Caja de lo dibujado, en coordenadas con el ancla en (0, 0).
    x0 = min(c[0] - a[0] for c, a in zip(cajas, anclas))
    y0 = min(c[1] - a[1] for c, a in zip(cajas, anclas))
    x1 = max(c[2] - a[0] for c, a in zip(cajas, anclas))
    y1 = max(c[3] - a[1] for c, a in zip(cajas, anclas))
    margen = 24
    lado = round(max(x1 - x0, y1 - y0) + 2 * margen)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    marcos = []
    for im, (ax, ay) in zip(ims, anclas):
        lienzo = Image.new("RGB", (lado, lado), "white")
        lienzo.paste(im, (round(lado / 2 - cx - ax), round(lado / 2 - cy - ay)))
        marcos.append(lienzo)
    tope = 600
    if lado > tope:
        marcos = [m.resize((tope, tope), Image.LANCZOS) for m in marcos]
    marcos[0].save(salida, "WEBP", save_all=True, append_images=marcos[1:], duration=list(duraciones), loop=0, quality=82, method=6)


FORZADOS = {
    "Elevaciones laterales": "lateral-dumbbell-raises",
    "Dominadas": "pull-ups",
    "Dominadas negativas": ("pull-ups", "invertir"),
    "Dominadas supinas": "chin-ups",
    "Fondos de tríceps": "tricep-dips",
    "Fondos en paralelas negativos": ("tricep-dips", "invertir"),
    "Extensión de tríceps sobre la cabeza": "standing-triceps-extension-2",
    "Prensa de piernas": "leg-press",
    # En el original, una de las dos posturas viene cortada (las piernas en
    # la sentadilla, los discos en el peso muerto): solo la postura completa.
    "Sentadilla": ("barbell-squat", "solo-final"),
    "Peso muerto": ("barbell-dead-lifts", "solo-final"),
    "Peso muerto sumo": ("barbell-dead-lifts", "solo-final"),
    "Peso muerto con mancuernas": "dumbbell-dead-lifts",
    "Press militar": "barbell-shoulder-press",
    "Press de hombro con mancuernas": "dumbbell-shoulder-press",
    "Jalón al pecho": "wide-grip-lat-pull-down",
    "Jalón con agarre estrecho": "v-bar-pull-down",
    "Extensión de tríceps en polea": "triceps-pushdown-with-cable",
    "Extensión de cuádriceps": "leg-extensions",
    "Remo al mentón": "upright-barbell-rows",
    "Flexiones": "push-ups",
    "Zancadas": "dumbbell-lunges",
    "Curl inclinado": "alternating-incline-curl-with-dumbbell",
}


def forzar(ejercicios, ek):
    hechos = 0
    for nombre, cual in FORZADOS.items():
        clave, invertir = (cual if isinstance(cual, tuple) else (cual, None))
        if nombre not in ejercicios or clave not in ek:
            print(f"  (sin {nombre} o sin {clave})")
            continue
        i = ek[clave]
        try:
            fotos = [bajar(EVERKINETIC_PNG.format(id=i, fase="relaxation")), bajar(EVERKINETIC_PNG.format(id=i, fase="tension"))]
        except Exception:  # noqa: BLE001
            print(f"  (sin las dos posturas: {clave})")
            continue
        base = re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()).strip("-")
        salida = DESTINO / f"{base}.webp"
        # Si el nombre ya lo usa otro ejercicio (una foto de wger), se aparta.
        ocupado = any(c.get("archivo") == f"imagenes/ejercicios/anim/{salida.name}" for n, c in ejercicios.items() if n != nombre)
        if ocupado:
            salida = DESTINO / f"{base}-ek.webp"
        if invertir == "solo-final":
            animar(fotos[1:], salida, duraciones=(900,))
        elif invertir:
            animar(list(reversed(fotos)), salida, duraciones=(1100, 700))
        else:
            animar(fotos, salida)
        c = ejercicios[nombre]
        # Las animadas de webs comerciales (WebP) no se guardan como estática.
        c["estatica"] = c.get("estatica") or (None if c["archivo"].endswith(".webp") else c["archivo"])
        c.update({"archivo": f"imagenes/ejercicios/anim/{salida.name}", "animada": invertir != "solo-final", "autor": "Everkinetic",
                  "fuente": "everkinetic", "nombreEnFuente": clave})
        c.pop("nombreEnWger", None)
        c.pop("aliasDe", None)
        hechos += 1
        print(f"  forzada: {nombre} <- {clave}{' (al revés)' if invertir else ''}")
    return hechos


def main():
    ruta = IMAGENES / "creditos.json"
    creditos = json.loads(ruta.read_text(encoding="utf-8"))
    ejercicios = creditos["ejercicios"]
    DESTINO.mkdir(parents=True, exist_ok=True)

    # Archivo estático → nombres que lo usan (alias incluidos).
    por_archivo = {}
    for nombre, c in ejercicios.items():
        if c.get("fuente") == "propia":
            continue
        por_archivo.setdefault(c.get("estatica") or c["archivo"], []).append(nombre)

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
        if not local.exists() or local.suffix.lower() in (".gif", ".webp") or nombres[0] in FORZADOS:
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

    hechos += forzar(ejercicios, ek)
    ruta.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{hechos} animadas. Sin segunda postura ({len(sin)}): {', '.join(sin)}")


if __name__ == "__main__":
    main()
