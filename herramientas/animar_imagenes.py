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

from PIL import Image, ImageChops

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


def encajar(base, otra):
    """Dónde poner `otra` para que coincida lo más posible con `base` (lo que
    no se mueve: banco, máquina, piernas…). Se parte de encajarlas por abajo y
    se prueba a moverla hasta que solapan más líneas. Devuelve su ancla."""
    ax, ay = ancla(base)
    bx, by = ancla(otra)
    escala = 160 / max(base.width, base.height, otra.width, otra.height)
    pequeña = lambda im: mascara(im, 200).resize((max(1, round(im.width * escala)), max(1, round(im.height * escala))))
    a, b = pequeña(base), pequeña(otra)
    lado = 400
    lienzo_a = Image.new("L", (lado, lado), 0)
    lienzo_a.paste(a, (100, 100))
    # Desplazamiento de partida (encajadas por abajo), en la escala pequeña.
    x0 = round(100 + (ax - bx) * escala)
    y0 = round(100 + (ay - by) * escala)
    mejor, mejor_xy = -1, (x0, y0)
    for dy in range(-24, 25, 2):
        for dx in range(-24, 25, 2):
            lienzo_b = Image.new("L", (lado, lado), 0)
            lienzo_b.paste(b, (x0 + dx, y0 + dy))
            n = ImageChops.multiply(lienzo_a, lienzo_b).histogram()[255]
            if n > mejor:
                mejor, mejor_xy = n, (x0 + dx, y0 + dy)
    # La otra va desplazada respecto a la base; su ancla es la de la base menos ese desplazamiento.
    despl_x = (mejor_xy[0] - 100) / escala
    despl_y = (mejor_xy[1] - 100) / escala
    return ax - despl_x, ay - despl_y


def animar(fotos, salida, duraciones=(900, 900)):
    """Junta las posturas en un WebP animado sobre blanco, encajadas por abajo.
    Cada postura se coloca con su ancla en el mismo punto; el lienzo es el
    cuadrado que abarca el dibujo de todas (así no se corta nada)."""
    ims = [a_rgb(f) for f in fotos]
    anclas = [ancla(ims[0])] + [encajar(ims[0], im) for im in ims[1:]]
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


# Cada ejercicio con su dibujo de Everkinetic, elegido mirando las dos
# posturas (revisión del 19-10-2026). Una lista: se prueba en orden hasta dar
# con una que tenga las dos posturas. («invertir», empieza por la postura
# final: las negativas empiezan arriba.) Si una postura viene cortada en el
# original (el dibujo toca el borde), se queda solo la completa.
FORZADOS = {
    "Abductores en máquina": ["thigh-abductor"],
    "Aductores en máquina": ["thigh-adductor"],
    "Aperturas con mancuernas": ["dumbbell-flys"],
    "Buenos días": ["barbell-good-mornings"],
    "Cruces en polea": ["cable-crossover"],
    "Crunch abdominal": ["crunches"],
    "Crunch en polea": ["seated-ab-crunch-with-cable"],
    "Curl concentrado": ["concentration-curls-with-dumbbell"],
    "Curl de bíceps con barra": ["biceps-curls-with-barbell", "ez-bar-curl-with-barbell"],
    "Curl de bíceps con mancuernas": ["biceps-curl-with-dumbbell", "alternating-biceps-curl-with-dumbbell"],
    "Curl de bíceps en máquina": ["biceps-curl-with-machine", "preacher-curl-with-machine"],
    "Curl en polea": ["standing-biceps-curl-with-cable"],
    "Curl femoral sentado": ["seated-leg-curl"],
    "Curl femoral tumbado": ["lying-leg-curl-machine"],
    "Curl inclinado": ["alternating-incline-curl-with-dumbbell"],
    "Curl invertido": ["biceps-curl-reverse-with-dumbbells"],
    "Curl martillo": ["biceps-hammer-curl-with-dumbbell", "alternating-hammer-curl-with-dumbbell"],
    "Curl predicador": ["preacher-curl-with-barbell", "two-arm-preacher-curl-with-dumbbell"],
    "Dominadas": ["pull-ups"],
    "Dominadas negativas": [("pull-ups", "invertir")],
    "Dominadas supinas": ["chin-ups", "narrow-parallel-grip-chin-ups"],
    "Elevación de gemelos": ["standing-calf-raise-with-dumbbell", "standing-calf-raises-using-machine"],
    "Elevación de gemelos en multipower": ["standing-barbell-calf-raise", "smith-machine-reverse-calf-raises"],
    "Elevación de gemelos en prensa": ["calves-press-on-leg-machine"],
    "Elevación de gemelos sentado": ["seated-calf-raise-using-machine", "seated-calf-raise-with-barbell"],
    "Elevación de gemelos tipo burro": ["donkey-calf-raises"],
    "Gemelo de pie con barra": ["standing-barbell-calf-raise"],
    "Elevaciones frontales": ["front-dumbbell-raise", "front-raises"],
    "Elevaciones laterales": ["lateral-dumbbell-raises"],
    "Encogimientos de trapecio": ["barbell-shrugs", "shoulder-shrugs"],
    "Extensión de cuádriceps": ["leg-extensions"],
    "Extensión de tríceps en máquina": ["triceps-extensions-using-machine"],
    "Extensión de tríceps en polea": ["triceps-pushdown-with-cable"],
    "Extensión de tríceps sobre la cabeza": ["standing-triceps-extension-2", "seated-two-arm-triceps-extension-with-dumbbell"],
    "Flexiones": ["push-ups"],
    "Flexiones diamante": ["close-triceps-pushup"],
    "Fondos asistidos": ["chest-dips"],
    "Fondos de tríceps": ["chest-dips", "tricep-dips-using-body-weight"],
    "Fondos en banco": ["bench-dips"],
    "Fondos en paralelas negativos": [("chest-dips", "invertir")],
    "Hiperextensiones": ["hyperextensions"],
    "Jalón al pecho": ["wide-grip-lat-pull-down", "underhand-pull-downs"],
    "Jalón con agarre estrecho": ["v-bar-pull-down"],
    "Patada de glúteo en polea": ["one-legged-cable-kickback"],
    "Patada de tríceps": ["triceps-kickback-with-dumbbell"],
    "Peso muerto con mancuernas": ["dumbbell-dead-lifts"],
    "Plancha lateral": ["side-plank"],
    "Prensa de piernas": ["leg-press"],
    "Press cerrado": ["close-grip-barbell-bench-press"],
    "Press de banca": ["bench-press"],
    "Press de banca con mancuernas": ["bench-press-dumbbell"],
    "Press de hombro con mancuernas": ["dumbbell-shoulder-press", "one-arm-dumbbell-shoulder-press", "arnold-press"],
    "Press de pecho en máquina": ["machine-bench-press", "decline-chest-press"],
    "Press declinado": ["decline-barbell-bench-press"],
    "Press francés": ["lying-triceps-press-with-barbell"],
    "Press inclinado": ["incline-bench-press"],
    "Press inclinado con mancuernas": ["incline-dumbbell-press", "dumbbell-incline-bench-press"],
    "Press militar": ["barbell-shoulder-press", "seated-military-press"],
    "Pullover en polea": ["straight-arm-push-down"],
    "Puente de glúteo": ["bridging"],
    "Pájaros con mancuernas": ["bent-over-rear-deltoid-raise-with-head-on-bench", "lying-rear-lateral-raise"],
    "Remo al mentón": ["upright-barbell-rows"],
    "Remo con barra": ["bent-over-row-with-barbell", "reverse-grips-bent-over-barbell-rows", "rear-deltoid-row-barbell"],
    "Remo con mancuerna": ["rear-deltoid-row-dumbbell"],
    "Remo en T": ["t-bar-rows"],
    "Remo en máquina": ["seated-cable-rows"],
    "Remo en polea": ["seated-cable-rows"],
    "Remo invertido": ["body-row"],
    "Sentadilla búlgara": ["one-leg-squat-with-barbell", "single-leg-squat-with-barbell"],
    "Sentadilla hack": ["hack-squat-machine"],
    "Sentadilla sissy": ["weighted-sissy-squat-with-weight-plate"],
    "Subida al cajón": ["step-ups-with-dumbbells"],
    "Superman": ["supermans"],
}


def cortada(im):
    """¿El dibujo llega al borde de la imagen? Entonces viene cortado."""
    caja = mascara(im).getbbox()
    if not caja:
        return False
    x0, y0, x1, y1 = caja
    return x0 <= 2 or y0 <= 2 or x1 >= im.width - 2 or y1 >= im.height - 2


def forzar(ejercicios, ek):
    hechos = 0
    for nombre, opciones in FORZADOS.items():
        if nombre not in ejercicios:
            print(f"  (sin {nombre} en los créditos)")
            continue
        fotos = clave = invertir = None
        for op in opciones:
            k, inv = (op if isinstance(op, tuple) else (op, None))
            if k not in ek:
                continue
            try:
                fotos = [bajar(EVERKINETIC_PNG.format(id=ek[k], fase="relaxation")), bajar(EVERKINETIC_PNG.format(id=ek[k], fase="tension"))]
                clave, invertir = k, inv
                break
            except Exception:  # noqa: BLE001
                continue
        if not fotos:
            print(f"  (sin dibujo con dos posturas: {nombre})")
            continue
        # «solo-final» / «solo-inicio»: la otra postura viene cortada en el
        # original (las piernas o los discos fuera del dibujo).
        if invertir in ("solo-final", "solo-inicio"):
            sanas = fotos[1:] if invertir == "solo-final" else fotos[:1]
            invertir = None
        else:
            ims = [a_rgb(f) for f in fotos]
            sanas = [f for f, im in zip(fotos, ims) if not cortada(im)]
        solo = len(sanas) == 1
        base = re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()).strip("-")
        salida = DESTINO / f"{base}.webp"
        # Si el nombre ya lo usa otro ejercicio (una foto de wger), se aparta.
        ocupado = any(c.get("archivo") == f"imagenes/ejercicios/anim/{salida.name}" for n, c in ejercicios.items() if n != nombre)
        if ocupado:
            salida = DESTINO / f"{base}-ek.webp"
        if solo:
            animar(sanas, salida, duraciones=(900,))
        elif invertir:
            animar(list(reversed(fotos)), salida, duraciones=(1100, 700))
        else:
            animar(fotos, salida)
        c = ejercicios[nombre]
        if c.get("fuente") != "propia":
            c["estatica"] = c.get("estatica") or (None if c["archivo"].endswith(".webp") else c["archivo"])
        c.update({"archivo": f"imagenes/ejercicios/anim/{salida.name}", "animada": not solo, "autor": "Everkinetic",
                  "fuente": "everkinetic", "nombreEnFuente": clave})
        for k in ("nombreEnWger", "aliasDe"):
            c.pop(k, None)
        hechos += 1
        print(f"  {nombre} <- {clave}{' (solo la postura completa)' if solo else ''}{' (al revés)' if invertir else ''}")
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
    # Los alias (otro nombre del mismo ejercicio) enseñan lo mismo que su base.
    for nombre, c in ejercicios.items():
        base = ejercicios.get(c.get("aliasDe") or "")
        if base and base.get("archivo") != c.get("archivo"):
            c.update({k: base[k] for k in ("archivo", "autor", "fuente", "nombreEnFuente", "animada") if k in base})
    ruta.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{hechos} animadas. Sin segunda postura ({len(sin)}): {', '.join(sin)}")


if __name__ == "__main__":
    main()
