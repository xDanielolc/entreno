# -*- coding: utf-8 -*-
r"""
Muñecos propios para los ejercicios que ni wger ni Everkinetic dibujan:
yoga, estiramientos, movilidad, cardio y algunos de core.

Cada muñeco es un esqueleto visto de lado, mirando a la derecha, descrito
por el ángulo de cada segmento (en grados, como en la pantalla: 0 = derecha,
90 = abajo, -90 = arriba, 180 = izquierda). El brazo y la pierna del lado
lejano se pintan más claros. Son pictogramas sencillos, pensados para que
Claude Design los pula después con el mismo estilo.

Se ejecuta después de descargar_imagenes.py: solo dibuja los que siguen sin
imagen y los añade a creditos.json como «dibujo propio».

Uso:
    herramientas\.venv\Scripts\python.exe herramientas\dibujar_munecos.py
"""

import json
import math
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
IMAGENES = RAIZ / "web" / "imagenes"
DESTINO = IMAGENES / "munecos"

CERCA, LEJOS, OBJETO_GRIS = "#2f5d8c", "#9dbbdc", "#8a94a3"
OBJETO = OBJETO_GRIS
TORSO, CUELLO, CABEZA = 30, 5, 7
BRAZO, ANTEBRAZO = 16, 15
MUSLO, PIERNA, PIE = 20, 19, 6


def normalizar(texto):
    sin = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", sin.lower()).strip("-")


def punto(origen, angulo, largo):
    r = math.radians(angulo)
    return (origen[0] + math.cos(r) * largo, origen[1] + math.sin(r) * largo)


def pose(t=-90, a1=(90, 90), a2=None, l1=(90, 90, 0), l2=None, cabeza=None, objetos=(), suelo=True):
    """Devuelve el muñeco con sus articulaciones calculadas."""
    a2 = a2 or (a1[0] + 8, a1[1] + 8)
    l2 = l2 or (l1[0] - 8, l1[1] - 8, l1[2])
    cadera = (0.0, 0.0)
    hombro = punto(cadera, t, TORSO)
    cuello = punto(hombro, cabeza if cabeza is not None else t, CUELLO)
    centro_cabeza = punto(cuello, cabeza if cabeza is not None else t, CABEZA)
    j = {"cadera": cadera, "hombro": hombro, "cabeza": centro_cabeza}
    for n, (b, ab) in (("1", a1), ("2", a2)):
        j["codo" + n] = punto(hombro, b, BRAZO)
        j["mano" + n] = punto(j["codo" + n], ab, ANTEBRAZO)
    for n, (m, p, f) in (("1", l1), ("2", l2)):
        j["rodilla" + n] = punto(cadera, m, MUSLO)
        j["tobillo" + n] = punto(j["rodilla" + n], p, PIERNA)
        j["pie" + n] = punto(j["tobillo" + n], f, PIE)
    return {"j": j, "objetos": objetos, "suelo": suelo}


# --- Objetos ---------------------------------------------------------------

def dibujar_objeto(o, j, color=None):
    OBJETO = color or OBJETO_GRIS
    tipo = o[0]
    lin = lambda a, b, w=3: f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{OBJETO}" stroke-width="{w}" stroke-linecap="round"/>'
    if tipo == "mancuerna":
        m = j[o[1]]
        return lin((m[0] - 5, m[1]), (m[0] + 5, m[1]), 2) + "".join(
            f'<rect x="{m[0] + dx - 2:.1f}" y="{m[1] - 3.5:.1f}" width="4" height="7" rx="1" fill="{OBJETO}"/>' for dx in (-5, 5))
    if tipo == "disco":
        m = j[o[1]]
        return f'<circle cx="{m[0]:.1f}" cy="{m[1]:.1f}" r="{o[2] if len(o) > 2 else 6}" fill="none" stroke="{OBJETO}" stroke-width="3"/>'
    if tipo == "linea":          # ("linea", (x1, y1), (x2, y2)) en coordenadas del muñeco
        return lin(o[1], o[2])
    if tipo == "cuerda":         # de una mano a un punto fijo
        return lin(j[o[1]], o[2], 1.5) + f'<circle cx="{o[2][0]:.1f}" cy="{o[2][1]:.1f}" r="3" fill="{OBJETO}"/>'
    if tipo == "caja":           # ("caja", x, y, ancho, alto)
        return f'<rect x="{o[1]:.1f}" y="{o[2]:.1f}" width="{o[3]:.1f}" height="{o[4]:.1f}" rx="2" fill="{OBJETO}" opacity=".45"/>'
    if tipo == "rodillo":
        return f'<circle cx="{o[1]:.1f}" cy="{o[2]:.1f}" r="5" fill="{OBJETO}" opacity=".6"/>'
    if tipo == "rueda":          # rueda abdominal en la mano: disco con eje
        m = j[o[1]]
        return (f'<circle cx="{m[0]:.1f}" cy="{m[1] + 4:.1f}" r="7" fill="none" stroke="{OBJETO}" stroke-width="3"/>'
                f'<line x1="{m[0] - 6:.1f}" y1="{m[1] + 4:.1f}" x2="{m[0] + 6:.1f}" y2="{m[1] + 4:.1f}" stroke="{OBJETO}" stroke-width="2.5" stroke-linecap="round"/>')
    if tipo == "corazon":        # ("corazon", x, y, tamaño): un corazón para el cardio
        x, y, s = o[1], o[2], (o[3] if len(o) > 3 else 1)
        return (f'<path transform="translate({x:.1f} {y:.1f}) scale({s})" fill="#d64545" '
                'd="M0 4 C-6 -3 -10 -8 -5 -12 C-2 -14 0 -10 0 -8 C0 -10 2 -14 5 -12 C10 -8 6 -3 0 4 Z"/>')
    if tipo == "arco":           # círculo discontinuo alrededor de una articulación
        c = j[o[1]]
        return f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{o[2]}" fill="none" stroke="{OBJETO}" stroke-width="1.5" stroke-dasharray="3 3"/>'
    if tipo == "comba":
        a, b = j["mano1"], j["mano2"]
        top = min(j["cabeza"][1], a[1]) - 16
        return f'<path d="M{a[0]:.1f} {a[1]:.1f} Q{(a[0] + b[0]) / 2 + 14:.1f} {top:.1f} {b[0]:.1f} {b[1]:.1f}" fill="none" stroke="{OBJETO}" stroke-width="1.5"/>'
    raise ValueError(tipo)


def encuadre(poses):
    """Caja común a todas las posturas (para que no salte al cambiar)."""
    xs, ys = [], []
    for p in poses:
        j = p["j"]
        xs += [x for x, _ in j.values()]
        ys += [y for _, y in j.values()]
        # Los objetos también cuentan para el encuadre.
        for o in p["objetos"]:
            if o[0] == "linea":
                xs += [o[1][0], o[2][0]]; ys += [o[1][1], o[2][1]]
            elif o[0] == "caja":
                xs += [o[1], o[1] + o[3]]; ys += [o[2], o[2] + o[4]]
            elif o[0] == "cuerda":
                xs.append(o[2][0]); ys.append(o[2][1])
            elif o[0] == "rodillo":
                xs += [o[1] - 5, o[1] + 5]; ys += [o[2] - 5, o[2] + 5]
            elif o[0] == "corazon":
                s = o[3] if len(o) > 3 else 1
                xs += [o[1] - 11 * s, o[1] + 11 * s]; ys += [o[2] - 15 * s, o[2] + 5 * s]
            elif o[0] in ("mancuerna", "disco"):
                m = j[o[1]]
                xs += [m[0] - 8, m[0] + 8]; ys += [m[1] - 8, m[1] + 8]
    suelo_y = max(ys) + 4
    minx, maxx = min(xs) - 10, max(xs) + 10
    miny, maxy = min(ys) - 10, suelo_y + 4
    lado = max(maxx - minx, maxy - miny)
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    return cx, cy, lado, suelo_y


# Estilo de línea: cada segmento con contorno oscuro y relleno blanco, como
# los dibujos de línea de Everkinetic. Primero todos los contornos y luego
# todos los rellenos, para que las uniones no se vean cortadas.
TINTA, TINTA_LEJOS = "#1d1f24", "#8b9099"


def figura_linea(p):
    j = p["j"]

    def seg(a, b, color, w):
        return (f'<line x1="{j[a][0]:.1f}" y1="{j[a][1]:.1f}" x2="{j[b][0]:.1f}" y2="{j[b][1]:.1f}" '
                f'stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>')

    lejos = [("hombro", "codo2", 6), ("codo2", "mano2", 5.5), ("cadera", "rodilla2", 7.5), ("rodilla2", "tobillo2", 6.5), ("tobillo2", "pie2", 5)]
    cerca = [("cadera", "hombro", 11), ("cadera", "rodilla1", 8), ("rodilla1", "tobillo1", 7), ("tobillo1", "pie1", 5.5),
             ("hombro", "codo1", 7), ("codo1", "mano1", 6.5)]
    partes = [dibujar_objeto(o, j, TINTA) for o in p["objetos"] if o[0] in ("caja", "linea", "rodillo", "arco")]
    partes += [seg(a, b, TINTA_LEJOS, w + 3) for a, b, w in lejos] + [seg(a, b, "#fff", w) for a, b, w in lejos]
    partes += [seg(a, b, TINTA, w + 3.4) for a, b, w in cerca] + [seg(a, b, "#fff", w) for a, b, w in cerca]
    hx, hy = j["cabeza"]
    partes.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{CABEZA}" fill="#fff" stroke="{TINTA}" stroke-width="1.8"/>')
    partes += [dibujar_objeto(o, j, TINTA) for o in p["objetos"] if o[0] not in ("caja", "linea", "rodillo", "arco")]
    return "".join(partes)


def figura(p):
    if p.get("linea"):
        return figura_linea(p)
    j = p["j"]

    def seg(a, b, color, w):
        return (f'<line x1="{j[a][0]:.1f}" y1="{j[a][1]:.1f}" x2="{j[b][0]:.1f}" y2="{j[b][1]:.1f}" '
                f'stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>')

    partes = [dibujar_objeto(o, j) for o in p["objetos"] if o[0] in ("caja", "linea", "rodillo", "arco")]
    for n, color in (("2", LEJOS),):
        partes += [seg("hombro", "codo" + n, color, 6), seg("codo" + n, "mano" + n, color, 5.5),
                   seg("cadera", "rodilla" + n, color, 7), seg("rodilla" + n, "tobillo" + n, color, 6),
                   seg("tobillo" + n, "pie" + n, color, 5)]
    partes.append(seg("cadera", "hombro", CERCA, 10))
    hx, hy = j["cabeza"]
    partes += [seg("cadera", "rodilla1", CERCA, 7.5), seg("rodilla1", "tobillo1", CERCA, 6.5), seg("tobillo1", "pie1", CERCA, 5),
               seg("hombro", "codo1", CERCA, 6.5), seg("codo1", "mano1", CERCA, 6)]
    # La cabeza, al final y con borde blanco: los brazos que pasan por detrás
    # (brazos arriba) no la tapan.
    partes.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{CABEZA}" fill="{CERCA}" stroke="#fff" stroke-width="1.5"/>')
    partes += [dibujar_objeto(o, j) for o in p["objetos"] if o[0] not in ("caja", "linea", "rodillo", "arco")]
    return "".join(partes)


# Con dos posturas, el SVG las alterna (como los dibujos animados de
# Everkinetic): una se ve y la otra no, cada 0,9 s. Funciona dentro de <img>.
CAMBIO = "1.8s"


def svg_de(*poses):
    cx, cy, lado, suelo_y = encuadre(poses)
    caja = f"{cx - lado / 2:.1f} {cy - lado / 2:.1f} {lado:.1f} {lado:.1f}"
    suelo = (f'<line x1="{cx - lado / 2 + 4:.1f}" y1="{suelo_y:.1f}" x2="{cx + lado / 2 - 4:.1f}" y2="{suelo_y:.1f}" '
             f'stroke="{OBJETO}" stroke-width="1.5" opacity=".6"/>') if poses[0]["suelo"] else ""
    if len(poses) == 1:
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{caja}">{suelo}{figura(poses[0])}</svg>\n'
    grupos = []
    for k, p in enumerate(poses):
        valores = "visible;hidden" if k == 0 else "hidden;visible"
        grupos.append(f'<g visibility="{"visible" if k == 0 else "hidden"}">'
                      f'<animate attributeName="visibility" values="{valores}" dur="{CAMBIO}" calcMode="discrete" repeatCount="indefinite"/>'
                      f'{figura(p)}</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{caja}">{suelo}{"".join(grupos)}</svg>\n'


# --- Posturas base ---------------------------------------------------------

DE_PIE = dict(t=-90, a1=(95, 90), l1=(90, 90, 0))
SENTADO_SUELO = dict(t=-90, l1=(0, 0, -80), a1=(70, 20))
CUADRUPEDIA = dict(t=0, a1=(90, 90), l1=(90, 180, 180))           # a cuatro patas, cabeza a la derecha
TUMBADO_ARRIBA = dict(t=180, a1=(170, 180), l1=(0, 0, -80))       # boca arriba, cabeza a la izquierda
TUMBADO_ABAJO = dict(t=180, a1=(180, 180), l1=(0, 0, 80))         # boca abajo, cabeza a la izquierda


def P(base=None, **k):
    return pose(**{**(base or {}), **k})


def igualar(ref, p, junta):
    """Mueve la postura `p` (solo el muñeco, no los objetos fijos) para que su
    `junta` caiga donde la de `ref`: así los pies (o las manos en la barra)
    no saltan entre una postura y otra."""
    dx = ref["j"][junta][0] - p["j"][junta][0]
    dy = ref["j"][junta][1] - p["j"][junta][1]
    p["j"] = {k: (x + dx, y + dy) for k, (x, y) in p["j"].items()}
    return p


def L(p):
    """Marca la postura para el estilo de línea."""
    p["linea"] = True
    return p


MUNECOS = {
    # --- Fuerza y core que faltan ------------------------------------------
    # --- Cardio y potencia sin imagen (19-10-2026) ---------------------------
    "Cinta de correr": P(t=-80, a1=(60, -30), a2=(130, 60), l1=(30, 120, 0), l2=(125, 60, 20), objetos=[("caja", -34, 40, 74, 5), ("linea", (36, 40), (44, -24))]),
    "Cinta de andar en cuesta": P(DE_PIE, t=-82, a1=(70, 100), a2=(115, 85), l1=(60, 105, -10), l2=(110, 85, -10), objetos=[("linea", (-34, 46), (40, 36)), ("linea", (40, 36), (46, -26))]),
    "Bicicleta estática": P(t=-60, a1=(30, 50), a2=(35, 55), l1=(20, 100, 0), l2=(70, 110, 0), suelo=False, objetos=[("disco", "tobillo1", 1), ("linea", (-5, 3), (30, -18))]),
    "Spinning": P(t=-35, a1=(25, 45), a2=(30, 50), l1=(20, 100, 0), l2=(70, 110, 0), suelo=False, objetos=[("disco", "tobillo1", 1), ("linea", (-5, 3), (30, -18))]),
    "Escalera sin fin": P(DE_PIE, t=-85, a1=(60, 100), a2=(120, 80), l1=(20, 90, 0), l2=(110, 80, 0), objetos=[("caja", 4, 20, 20, 19), ("caja", 24, 8, 20, 31)]),
    "Esquí de fondo (máquina)": P(DE_PIE, t=-75, a1=(-40, -70), a2=(110, 130), l1=(60, 100, 0), l2=(115, 80, 0)),
    "Patinaje": P(t=-45, a1=(130, 160), a2=(60, 20), l1=(60, 120, 0), l2=(150, 160, 160)),
    "Baile": P(DE_PIE, a1=(-130, -150), a2=(40, 100), l1=(70, 100, 0), l2=(105, 80, 0)),
    "Sprints": P(t=-65, a1=(50, -40), a2=(140, 70), l1=(20, 110, 0), l2=(135, 50, 30)),
    "Trineo (empujar)": P(t=-30, a1=(-5, -5), a2=(0, 0), l1=(70, 120, 0), l2=(140, 100, 0), objetos=[("caja", 34, 20, 26, 22)]),
    "Battle ropes": P(t=-75, a1=(30, -10), a2=(35, -5), l1=(30, 110, 0), l2=(40, 115, 0), objetos=[("cuerda", "mano1", (70, 38))]),
    "Air squat": P(t=-90, a1=(0, 0), a2=(5, 5), l1=(90, 90, 0)),
    "Mountain climbers": P(t=-5, a1=(90, 90), a2=(92, 92), l1=(-130, 130, 90), l2=(175, 178, 90)),
    "Kettlebell swing": P(t=-30, a1=(95, 95), a2=(98, 98), l1=(70, 100, 0), l2=(75, 98, 0), objetos=[("disco", "mano1", 5)]),
    "Lanzamiento de balón medicinal": P(DE_PIE, t=-95, a1=(-110, -130), a2=(-105, -125), l1=(80, 95, 0), l2=(100, 85, 0), objetos=[("disco", "mano1", 7)]),
    "Face pull": P(DE_PIE, a1=(-12, -8), a2=(-8, -4), l1=(85, 92, 0), l2=(98, 88, 0), objetos=[("cuerda", "mano1", (62, -40))]),
    "Curl de muñeca": P(t=-65, a1=(65, 0), a2=(68, 2), l1=(0, 90, 0), l2=(4, 92, 0),
                        objetos=[("caja", -14, 0, 34, 7), ("mancuerna", "mano1")]),
    "Press pallof": P(DE_PIE, a1=(70, -70), a2=(74, -66), l1=(80, 95, 0), l2=(100, 85, 0), objetos=[("cuerda", "mano1", (-40, -22))]),
    "Press Arnold": P(DE_PIE, a1=(-70, -95), a2=(-75, -90), l1=(0, 90, 0), objetos=[("caja", -10, 2, 22, 8), ("mancuerna", "mano1"), ("mancuerna", "mano2")]),
    "Remo con barra": P(t=-25, a1=(110, 70), a2=(115, 75), l1=(100, 80, 0), objetos=[("disco", "mano1", 7)]),
    "Extensión de muñeca": P(DE_PIE, t=-80, l1=(0, 90, 0), a1=(60, 0), a2=(70, 10), objetos=[("caja", -10, 2, 20, 8), ("mancuerna", "mano1")]),
    "Colgarse de la barra": P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(95, 95, 30), suelo=False, objetos=[("linea", (-14, -64), (14, -64))]),
    "Paseo del granjero": P(DE_PIE, a1=(90, 90), l1=(70, 100, 0), l2=(110, 80, 0), objetos=[("mancuerna", "mano1"), ("mancuerna", "mano2")]),
    "Sentadilla a una pierna": P(t=-55, a1=(10, 10), l1=(15, 115, 0), l2=(-8, -2, -60)),
    "Curl nórdico": P(t=-45, a1=(20, 30), l1=(135, 180, 90), l2=(130, 180, 90)),
    # Colgado de la barra: piernas estiradas hasta la horizontal, o rodillas al pecho.
    "Elevación de piernas colgado": P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(-5, -5, -60), l2=(-2, -2, -60), suelo=False,
                                     objetos=[("linea", (-14, -64), (14, -64))]),
    "Elevación de rodillas colgado": P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(-20, 75, 0), l2=(-16, 78, 0), suelo=False,
                                      objetos=[("linea", (-14, -64), (14, -64))]),
    "Elevación de tibiales": P(DE_PIE, t=-95, l1=(100, 95, -35), objetos=[("linea", (-9, -45), (-9, 44))]),
    "Tibial con disco": P(DE_PIE, l1=(0, 90, -25), a1=(70, 40), objetos=[("caja", -12, 2, 24, 8), ("disco", "pie1", 5)]),
    "Plancha Copenhague": P(t=-165, a1=(90, 180), l1=(8, 8, 0), l2=(15, 10, 0), objetos=[("caja", 30, 2, 18, 12)]),
    "Posición hueca": P(t=190, a1=(195, 190), l1=(-12, -8, -30)),
    "Bicho muerto": P(TUMBADO_ARRIBA, a1=(-90, -90), a2=(190, 180), l1=(-90, 0, -60), l2=(-10, -5, -40)),
    "Pájaro-perro": P(CUADRUPEDIA, a2=(0, 0), l2=(180, 180, 90)),
    "Leñador en polea": P(DE_PIE, t=-95, a1=(40, 40), a2=(45, 45), l1=(80, 95, 0), l2=(100, 88, 0), objetos=[("cuerda", "mano1", (-35, -70))]),
    "Giros rusos": P(t=-115, a1=(20, 10), l1=(-30, 25, 0), l2=(-25, 30, 0), objetos=[("disco", "mano1", 5)]),
    "Bandera del dragón": P(t=165, a1=(200, 250), l1=(-60, -60, -60), l2=(-65, -62, -60), objetos=[("caja", -40, 0, 30, 8)]),
    "Comba": P(DE_PIE, a1=(110, 40), a2=(115, 45), l1=(90, 95, 20), objetos=[("comba",)]),
    "Boxeo": P(DE_PIE, t=-85, a1=(0, 0), a2=(70, -100), l1=(75, 100, 0), l2=(110, 85, 0)),
    "Escaleras": P(DE_PIE, t=-85, a1=(60, 100), a2=(120, 80), l1=(20, 90, 0), l2=(110, 80, 0),
                   objetos=[("caja", 4, 20, 20, 19), ("caja", 24, 8, 20, 31)]),
    "Carrera": P(t=-80, a1=(60, -30), a2=(130, 60), l1=(30, 120, 0), l2=(125, 60, 20)),
    "Cardio": P(t=-80, a1=(60, -30), a2=(130, 60), l1=(30, 120, 0), l2=(125, 60, 20), objetos=[("corazon", 34, -34, 1.8)]),
    "HIIT": P(t=-85, a1=(-40, -70), a2=(140, 60), l1=(40, 130, 0), l2=(120, 50, 20), suelo=False, objetos=[("corazon", 30, -40, 1.5)]),
    "Tabata": P(t=-85, a1=(-40, -70), a2=(140, 60), l1=(40, 130, 0), l2=(120, 50, 20), suelo=False, objetos=[("corazon", 30, -40, 1.5)]),
    "Burpees": P(t=10, a1=(90, 90), a2=(92, 92), l1=(170, 175, 180), l2=(172, 177, 180)),
    "Jumping jacks": P(DE_PIE, a1=(-120, -120), a2=(-115, -115), l1=(70, 90, 0), l2=(110, 90, 0), suelo=False),
    "Rodillas al pecho": P(DE_PIE, t=-88, a1=(60, 0), a2=(120, 60), l1=(-10, 110, 0), l2=(95, 95, 0)),
    "Rueda abdominal": P(t=-10, cabeza=-10, a1=(50, 45), a2=(52, 47), l1=(90, 180, 180), l2=(92, 182, 180),
                         objetos=[("rueda", "mano1")]),
    "Bicicleta": P(t=-45, a1=(35, 60), a2=(40, 65), l1=(20, 100, 0), l2=(70, 110, 0), suelo=False,
                   objetos=[("disco", "tobillo1", 1), ("linea", (-5, 3), (30, -18))]),
    "Elíptica": P(DE_PIE, t=-88, a1=(40, -40), a2=(70, -60), l1=(70, 100, 0), l2=(110, 80, 0)),
    "Remo de cardio": P(t=-100, a1=(120, -10), a2=(125, -5), l1=(0, 0, -80), objetos=[("linea", (-15, 4), (45, 4))]),
    "Natación": P(t=0, a1=(0, 0), a2=(170, 175), l1=(180, 185, 180), l2=(175, 170, 180), suelo=False),
    "Caminar": P(DE_PIE, a1=(70, 100), a2=(115, 85), l1=(70, 100, 0), l2=(110, 85, 0)),
    "Senderismo": P(DE_PIE, t=-80, a1=(60, 90), a2=(115, 85), l1=(70, 100, 0), l2=(110, 85, 0), objetos=[("linea", (30, -12), (38, 44))]),
    "Burpees": P(t=-10, a1=(90, 90), l1=(170, 175, 90), l2=(172, 176, 90)),
    "Saltos al cajón": P(t=-70, a1=(-60, -60), l1=(-15, 110, 0), l2=(-5, 115, 0), suelo=False, objetos=[("caja", 20, 20, 30, 24)]),

    # --- Estiramientos -----------------------------------------------------
    "Estiramiento": P(DE_PIE, t=-100, a1=(-95, -100), a2=(-100, -105)),
    "Estiramiento de isquios (Janu Sirsasana)": P(t=-40, a1=(20, 15), l1=(0, 0, -80), l2=(90, 90, 0), objetos=[("caja", 30, 2, 16, 43)]),
    "Estiramiento de cuádriceps": P(DE_PIE, a1=(110, 115), a2=(95, 90), l1=(95, -110, -90), l2=(90, 90, 0)),
    "Estiramiento de psoas en zancada (Anjaneyasana)": P(DE_PIE, a1=(-90, -90), l1=(0, 90, 0), l2=(120, 180, 180)),
    "Estiramiento de gemelo en pared": P(t=-60, a1=(-10, -10), l1=(70, 100, 0), l2=(125, 125, 0), objetos=[("linea", (48, -60), (48, 44))]),
    "Estiramiento de glúteo en figura de 4 (Supta Kapotasana)": P(TUMBADO_ARRIBA, a1=(-30, -10), l1=(-40, 180, 180), l2=(-80, 0, -60)),
    "Estiramiento de aductores en mariposa (Baddha Konasana)": P(t=-90, a1=(70, 40), l1=(15, 165, 0), l2=(20, 160, 0)),
    "Estiramiento de pectoral en el marco de la puerta": P(DE_PIE, t=-85, a1=(180, -90), l1=(80, 95, 0), l2=(105, 85, 0), objetos=[("linea", (-30, -60), (-30, 44))]),
    "Estiramiento de dorsal": P(t=0, a1=(0, 0), a2=(5, 5), l1=(90, 90, 0), objetos=[("linea", (58, -30), (58, 44))]),
    "Estiramiento de tríceps": P(DE_PIE, a1=(-75, 160), a2=(-45, -150)),
    "Estiramiento de hombro cruzado": P(DE_PIE, a1=(0, 0), a2=(40, -20)),
    "Estiramiento lateral de cuello": P(DE_PIE, cabeza=-55, a1=(-70, 160), a2=(95, 90)),
    "Estiramiento de antebrazo": P(DE_PIE, a1=(0, 0), a2=(40, -5)),
    "Estiramiento de lumbares con rodillas al pecho (Apanasana)": P(TUMBADO_ARRIBA, a1=(-45, -10), l1=(-120, -20, -60), l2=(-125, -25, -60)),

    # --- Movilidad ---------------------------------------------------------
    "CARs de hombro": P(DE_PIE, a1=(-120, -120), objetos=[("arco", "hombro", 30)]),
    "CARs de cadera": P(CUADRUPEDIA, l1=(40, 110, 180), objetos=[("arco", "cadera", 20)]),
    "Dislocaciones con pica": P(DE_PIE, a1=(-110, -110), a2=(-112, -112), objetos=[("disco", "mano1", 3)]),
    "Tobillo con rodilla a la pared": P(DE_PIE, a1=(-10, -10), l1=(0, 70, 0), l2=(120, 180, 180), objetos=[("linea", (40, -40), (40, 44))]),
    "Rotación torácica en libro abierto": P(t=180, a1=(-90, -90), a2=(0, 0), l1=(20, 110, 180), l2=(25, 115, 180)),
    "Sentadilla profunda mantenida (Malasana)": P(t=-75, a1=(10, 10), l1=(-10, 105, 0), l2=(-5, 110, 0)),
    "Sentadilla cosaca": P(t=-65, a1=(10, 10), l1=(-5, 110, 0), l2=(160, 160, -90)),
    "Movilidad de muñeca": P(CUADRUPEDIA, a1=(90, 90), objetos=[("arco", "mano1", 6)]),
    "Rotación 90/90": P(t=-90, a1=(70, 60), l1=(10, 100, 0), l2=(170, 100, 180)),
    "Gato-camello (Marjaryasana-Bitilasana)": P(CUADRUPEDIA, cabeza=40, objetos=[("arco", "hombro", 16)]),
    "Deslizamiento neural (nerve floss)": P(t=-80, cabeza=-20, a1=(70, 30), l1=(0, 0, -80), l2=(5, 90, 0)),
    "Deslizamiento neural ciático": P(t=-80, cabeza=-20, a1=(70, 30), l1=(0, 0, -80), l2=(5, 90, 0)),
    "Deslizamiento neural cervical": P(DE_PIE, cabeza=-110, a1=(0, 0), a2=(95, 90)),
    "Rotación tibial con rodilla flexionada": P(t=-90, a1=(60, 60), l1=(0, 90, 0), l2=(5, 92, 0), objetos=[("arco", "tobillo1", 8)]),
    "Estiramiento de sóleo en pared": P(t=-70, a1=(-15, -15), l1=(60, 110, 0), l2=(115, 130, 0), objetos=[("linea", (44, -60), (44, 44))]),
    "Rotación torácica en cuadrupedia": P(CUADRUPEDIA, a1=(90, 90), a2=(-60, -120), cabeza=-30, objetos=[("arco", "hombro", 14)]),
    "Estiramiento de trapecio superior": P(DE_PIE, cabeza=-60, a1=(-100, -170), a2=(95, 90)),
    "Estiramiento del elevador de la escápula": P(DE_PIE, cabeza=-50, a1=(-100, -160), a2=(95, 90)),
    "Puente por fases": P(t=170, a1=(-100, -180), l1=(-70, 110, 0), l2=(-65, 112, 0), suelo=True),
    "Postura del sastre, apertura lateral (Upavistha Konasana)": P(t=-90, a1=(80, 80), l1=(15, 165, 0), l2=(20, 160, 0)),
    "Zancada hacia el split frontal (Hanumanasana)": P(t=-88, a1=(60, 60), a2=(120, 120), l1=(0, 0, -80), l2=(180, 180, 180)),
    "Rotación externa de hombro con banda": P(DE_PIE, a1=(90, 0), a2=(95, 90), objetos=[("cuerda", "mano1", (-30, -5))]),
    "Rotación interna de hombro con toalla": P(DE_PIE, a1=(-120, -60), a2=(120, 170), objetos=[("linea", (-9, -62), (-13, -18))]),
    "Retracción cervical (chin tuck)": P(DE_PIE, cabeza=-100, objetos=[("linea", (-16, -44), (-6, -44))]),
    "Flexión lateral de cuello activa": P(DE_PIE, cabeza=-60),
    "Extensión torácica sobre rodillo": P(t=-150, cabeza=-170, a1=(-150, -170), l1=(-40, 80, 0), l2=(-38, 82, 0), objetos=[("rodillo", 20, -8)]),
    "Elevaciones Y-T-W": P(TUMBADO_ABAJO, a1=(-150, -150), a2=(-155, -155), cabeza=170),
    "Cobra en el suelo (Bhujangasana)": P(t=-150, cabeza=-170, a1=(120, 180), l1=(0, 0, 80), l2=(2, 2, 80)),
    "Estiramiento del sofá (couch stretch)": P(t=-90, a1=(90, 90), l1=(90, 180, 180), l2=(-20, 90, 0), objetos=[("linea", (-30, -40), (-30, 44))]),
    "Estiramiento de glúteo en paloma (Eka Pada Rajakapotasana)": P(t=-70, a1=(80, 70), l1=(20, 170, 180), l2=(175, 175, 180)),
    "Flexión y extensión de dedos del pie": P(SENTADO_SUELO, a1=(70, 20), l1=(0, 0, -60), l2=(0, 0, -100)),
    "Isométrico de flexión plantar": P(DE_PIE, l1=(90, 90, -40), l2=(92, 92, -40), objetos=[("linea", (-14, 44), (14, 44))]),
    "Estiramiento del empeine": P(t=-90, a1=(80, 80), l1=(90, 180, 180), l2=(92, 182, 180)),
    "Estiramiento de los dedos del pie": P(t=-90, a1=(80, 80), l1=(90, 180, 150), l2=(92, 182, 150)),
    "Liberación con rodillo": P(t=-150, a1=(130, 95), l1=(0, 0, -60), objetos=[("rodillo", 12, 8)]),
}

# --- Yoga --------------------------------------------------------------------
# Clave: el nombre en español con el sánscrito entre paréntesis, como en el
# catálogo. Se casan por el nombre en sánscrito.

YOGA = {
    "Virabhadrasana I": P(t=-90, a1=(-90, -90), l1=(10, 90, 0), l2=(140, 140, 0)),
    "Virabhadrasana II": P(t=-90, a1=(0, 0), a2=(180, 180), l1=(10, 90, 0), l2=(145, 145, 0)),
    "Virabhadrasana III": P(t=0, a1=(0, 0), l1=(90, 90, 0), l2=(180, 180, 90)),
    "Uttanasana": P(t=78, cabeza=85, a1=(95, 90), l1=(90, 90, 0)),
    "Prasarita Padottanasana": P(t=82, cabeza=88, a1=(95, 90), l1=(65, 65, 0), l2=(115, 115, 180)),
    "Parsvottanasana": P(t=40, a1=(90, 90), l1=(65, 65, 0), l2=(120, 120, 0)),
    "Tadasana": P(DE_PIE),
    "Utkatasana": P(t=-60, a1=(-60, -60), l1=(-5, 110, 0)),
    "Garudasana": P(t=-80, a1=(-10, -70), a2=(0, -80), l1=(20, 100, 0), l2=(10, 150, 60)),
    "Vrksasana": P(DE_PIE, a1=(-90, -90), l1=(90, 90, 0), l2=(30, 150, 100)),
    "Natarajasana": P(t=-60, a1=(-30, -30), a2=(150, 120), l1=(90, 90, 0), l2=(150, -120, -90)),
    "Trikonasana": P(t=-160, a1=(-90, -90), a2=(90, 90), l1=(60, 60, 0), l2=(120, 120, 0)),
    "Utthita Hasta Padangusthasana": P(DE_PIE, a1=(0, 0), l1=(0, 0, -80), l2=(90, 90, 0)),
    "Utthita Parsvakonasana": P(t=-145, a1=(-150, -150), a2=(90, 90), l1=(-10, 90, 0), l2=(135, 135, 0)),
    "Parivritta Baddha Parsvakonasana": P(t=-40, a1=(90, 0), a2=(-90, -90), l1=(0, 90, 0), l2=(135, 135, 0)),
    "Parivritta Trikonasana": P(t=-30, a1=(90, 90), a2=(-90, -90), l1=(60, 60, 0), l2=(120, 120, 0)),
    "Upavesasana": P(t=-80, a1=(20, -60), l1=(-15, 105, 0), l2=(-10, 110, 0)),

    "Ardha Matsyendrasana": P(t=-90, a1=(60, 90), a2=(150, 100), l1=(-50, 100, 0), l2=(10, 170, 180)),
    "Baddha Konasana": P(t=-90, a1=(60, 40), l1=(20, 165, 0), l2=(25, 160, 0)),
    "Supta Baddha Konasana": P(TUMBADO_ARRIBA, a1=(120, 180), l1=(-40, 30, 0), l2=(-35, 35, 0)),
    "Dandasana": P(SENTADO_SUELO, a1=(90, 90)),
    "Gomukhasana": P(t=-90, a1=(-90, 150), a2=(120, -60), l1=(10, 170, 180), l2=(5, 175, 180)),
    "Hanumanasana": P(t=-90, a1=(-90, -90), l1=(0, 0, -80), l2=(180, 180, 180)),
    "Janu Sirsasana": P(t=-25, a1=(10, 10), l1=(0, 0, -80), l2=(20, 170, 180)),
    "Parivritta Janu Sirsasana": P(t=-120, a1=(-150, -170), a2=(20, 20), l1=(0, 0, -80), l2=(20, 170, 180)),
    "Kurmasana": P(t=-15, a1=(20, 30), l1=(-15, 15, -80), l2=(-10, 20, -80)),
    "Supta Kurmasana": P(t=-5, a1=(150, 180), l1=(-40, 40, 0), l2=(-35, 45, 0)),
    "Mahamudra": P(t=-30, a1=(5, 5), l1=(0, 0, -80), l2=(15, 175, 180)),
    "Navasana": P(t=-125, a1=(10, 10), l1=(-45, -45, -60)),
    "Paschimottanasana": P(t=-15, cabeza=-5, a1=(5, 5), l1=(0, 0, -80)),
    "Upavistha Konasana": P(t=-45, a1=(20, 15), l1=(-10, -5, -80), l2=(15, 10, -80)),

    "Eka Pada Rajakapotasana": P(t=-80, a1=(-120, -150), l1=(10, 170, 180), l2=(170, 180, 180)),
    "Ustrasana": P(t=-130, cabeza=-160, a1=(130, 100), l1=(90, 180, 180)),
    "Balasana": P(t=15, cabeza=40, a1=(5, 5), l1=(25, 180, 180), l2=(28, 178, 180)),
    "Simhasana": P(t=-90, cabeza=-80, a1=(60, 80), l1=(60, 180, 180)),
    "Parighasana": P(t=-130, a1=(-160, -160), a2=(90, 90), l1=(90, 180, 180), l2=(20, 20, 0)),
    "Supta Virasana": P(t=180, a1=(200, 200), l1=(0, 170, 180), l2=(5, 172, 180)),

    "Dwi Pada Pitham": P(t=160, a1=(170, 180), l1=(-20, 80, 0)),
    "Karnapidasana": P(t=90, cabeza=0, a1=(0, 0), l1=(150, 120, 180), l2=(148, 118, 180)),
    "Anantasana": P(t=180, a1=(200, 90), l1=(-90, -90, -80), l2=(0, 0, -80)),
    "Apanasana": P(TUMBADO_ARRIBA, a1=(-40, -10), l1=(-130, -20, -60)),
    "Halasana": P(t=90, cabeza=0, a1=(0, 0), l1=(165, 170, 90), l2=(162, 168, 90)),
    "Savasana": P(TUMBADO_ARRIBA, a1=(175, 175), l1=(0, 0, -70)),
    "Matsyasana": P(t=175, cabeza=150, a1=(20, 20), l1=(0, 0, -70)),
    "Setu Bandhasana": P(t=160, a1=(170, 170), l1=(-15, 75, 0)),
    "Viparita Karani": P(TUMBADO_ARRIBA, a1=(175, 180), l1=(-90, -90, 0), objetos=[("linea", (12, -70), (12, 8))]),
    "Salamba Sarvangasana": P(t=90, cabeza=0, a1=(180, -80), l1=(-90, -90, -90)),
    "Niralamba Sarvangasana": P(t=90, cabeza=0, a1=(-80, -85), l1=(-90, -90, -90)),
    "Jathara Parivritti": P(TUMBADO_ARRIBA, a1=(-90, -90), a2=(180, 180), l1=(-10, 60, 0)),

    "Viparita Salabhasana": P(t=180, cabeza=200, a1=(160, 160), l1=(-60, -60, -60)),
    "Bhujangasana": P(t=-150, cabeza=-170, a1=(100, 90), l1=(0, 0, 90)),
    "Salabhasana": P(t=190, cabeza=200, a1=(10, 10), l1=(-10, -10, 60)),
    "Dhanurasana": P(t=-160, cabeza=-170, a1=(20, 10), l1=(-10, -100, -60)),

    "Catush Pada Pitham": P(t=180, a1=(100, 90), l1=(-10, 90, 0)),
    "Bakasana": P(t=-20, cabeza=10, a1=(95, 90), l1=(-20, 150, 180), suelo=True),
    "Parsva Bakasana": P(t=-15, a1=(95, 90), l1=(10, 150, 180)),
    "Purvottanasana": P(t=-160, a1=(100, 95), l1=(10, 10, 60)),
    "Vasisthasana": P(t=-160, a1=(100, 95), a2=(-90, -90), l1=(10, 10, 0)),
    "Astavakrasana": P(t=-5, a1=(95, 90), l1=(-10, -5, 0), l2=(-5, 0, 0)),
    "Adho Mukha Vrksasana": P(t=90, cabeza=90, a1=(90, 90), l1=(-90, -90, -90)),
    "Urdhva Dhanurasana": P(t=-140, cabeza=-200, a1=(-160, 110), l1=(20, 90, 0)),
    "Chaturanga Dandasana": P(t=-5, a1=(120, 60), l1=(175, 175, 90)),
    "Vrschikasana": P(t=95, cabeza=60, a1=(90, 0), a2=(92, 2), l1=(-110, -20, 60), l2=(-112, -22, 60)),
    "Pincha Mayurasana": P(t=90, cabeza=110, a1=(90, 0), a2=(92, 2), l1=(-90, -90, -90)),
    "Mayurasana": P(t=5, a1=(95, 90), l1=(180, 180, 180)),
    "Adho Mukha Svanasana": P(t=40, cabeza=70, a1=(45, 45), l1=(130, 130, 0), l2=(128, 128, 0)),
    "Urdhva Mukha Svanasana": P(t=-150, cabeza=-170, a1=(95, 90), l1=(10, 5, 90)),
    "Salamba Sirsasana": P(t=90, cabeza=90, a1=(110, 30), a2=(112, 32), l1=(-90, -90, -90)),
}



# --- Estilo de línea, con dos posturas (20-10-2026) -------------------------
# Para los ejercicios cuyo dibujo de Everkinetic viene cortado o no es del
# ejercicio. La segunda postura se coloca con `igualar` sobre el apoyo.
BARRA_ESPALDA = [("disco", "hombro", 8)]
LINEA = {}


def par(nombre, a, b, apoyo="tobillo1"):
    a, b = L(a), L(b)
    LINEA[nombre] = (a, igualar(a, b, apoyo) if apoyo else b)


par("Sentadilla", P(DE_PIE, a1=(115, -55), a2=(118, -52), objetos=BARRA_ESPALDA),
    P(t=-52, a1=(150, -10), a2=(153, -8), l1=(12, 112, 0), l2=(15, 114, 0), objetos=BARRA_ESPALDA))
par("Sentadilla en multipower", P(DE_PIE, a1=(115, -55), a2=(118, -52), objetos=BARRA_ESPALDA + [("linea", (-22, -78), (-22, 44)), ("linea", (22, -78), (22, 44))]),
    P(t=-58, a1=(150, -10), a2=(153, -8), l1=(10, 110, 0), l2=(13, 112, 0), objetos=BARRA_ESPALDA + [("linea", (-22, -78), (-22, 44)), ("linea", (22, -78), (22, 44))]))
par("Sentadilla frontal", P(DE_PIE, a1=(20, 190), a2=(24, 192), objetos=[("disco", "mano1", 8)]),
    P(t=-72, a1=(20, 190), a2=(24, 192), l1=(8, 108, 0), l2=(11, 110, 0), objetos=[("disco", "mano1", 8)]))
par("Sentadilla goblet", P(DE_PIE, a1=(60, -110), a2=(64, -106), objetos=[("mancuerna", "mano1")]),
    P(t=-68, a1=(60, -110), a2=(64, -106), l1=(8, 108, 0), l2=(11, 110, 0), objetos=[("mancuerna", "mano1")]))
par("Peso muerto", P(DE_PIE, a1=(92, 90), a2=(95, 92), objetos=[("disco", "mano1", 10)]),
    P(t=-22, a1=(90, 90), a2=(92, 92), l1=(55, 112, 0), l2=(58, 114, 0), objetos=[("disco", "mano1", 10)]))
par("Peso muerto sumo", P(DE_PIE, a1=(92, 90), a2=(95, 92), l1=(80, 95, 0), l2=(100, 85, 0), objetos=[("disco", "mano1", 10)]),
    P(t=-40, a1=(90, 90), a2=(92, 92), l1=(30, 105, 0), l2=(40, 100, 0), objetos=[("disco", "mano1", 10)]))
par("Peso muerto rumano", P(DE_PIE, a1=(92, 90), a2=(95, 92), objetos=[("disco", "mano1", 7)]),
    P(t=-12, a1=(90, 90), a2=(92, 92), l1=(80, 98, 0), l2=(82, 100, 0), objetos=[("disco", "mano1", 7)]))
par("Zancadas", P(DE_PIE, a1=(92, 90), a2=(95, 92), objetos=[("mancuerna", "mano1")]),
    P(t=-88, a1=(92, 90), a2=(95, 92), l1=(12, 92, 0), l2=(118, 168, 180), objetos=[("mancuerna", "mano1")]))
par("Zancadas hacia atrás", P(DE_PIE, a1=(92, 90), a2=(95, 92), objetos=[("mancuerna", "mano1")]),
    P(t=-88, a1=(92, 90), a2=(95, 92), l1=(12, 92, 0), l2=(118, 168, 180), objetos=[("mancuerna", "mano1")]))
par("Rueda abdominal", P(t=-38, cabeza=-38, a1=(85, 85), a2=(87, 87), l1=(70, 180, 90), l2=(72, 182, 90), objetos=[("rueda", "mano1")]),
    P(t=-6, cabeza=-6, a1=(4, 6), a2=(6, 8), l1=(150, 180, 90), l2=(152, 182, 90), objetos=[("rueda", "mano1")]), apoyo="rodilla1")
par("Hip thrust", P(t=-151, a1=(29, 29), a2=(31, 31), l1=(-30, 69, 0), l2=(-27, 72, 0), objetos=[("disco", "cadera", 7), ("caja", -50, 4, 26, 18)]),
    P(t=180, a1=(5, -5), a2=(7, -3), l1=(0, 90, 0), l2=(3, 92, 0), objetos=[("disco", "cadera", 7), ("caja", -50, 4, 26, 18)]))
par("Dominadas con lastre", P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(95, 110, 30), l2=(98, 112, 30), suelo=False,
                              objetos=[("linea", (-16, -64), (16, -64)), ("disco", "cadera", 6)]),
    P(DE_PIE, a1=(110, -70), a2=(113, -67), l1=(95, 115, 30), l2=(98, 117, 30), suelo=False,
      objetos=[("linea", (-16, -64), (16, -64)), ("disco", "cadera", 6)]), apoyo="mano1")
par("Dominadas asistidas", P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(95, 150, 30), l2=(98, 152, 30), suelo=False,
                             objetos=[("linea", (-16, -64), (16, -64)), ("cuerda", "rodilla1", (6, -64))]),
    P(DE_PIE, a1=(110, -70), a2=(113, -67), l1=(95, 150, 30), l2=(98, 152, 30), suelo=False,
      objetos=[("linea", (-16, -64), (16, -64)), ("cuerda", "rodilla1", (6, -64))]), apoyo="mano1")
par("Flexiones con lastre", P(t=-25, a1=(90, 90), a2=(92, 92), l1=(155, 155, 90), l2=(157, 157, 90), objetos=[("disco", "hombro", 6)]),
    P(t=-10, a1=(150, 55), a2=(152, 57), l1=(170, 170, 90), l2=(172, 172, 90), objetos=[("disco", "hombro", 6)]), apoyo="pie1")
par("Máquina de glúteo", P(CUADRUPEDIA, l1=(90, 180, 180), l2=(80, 175, 180), objetos=[("caja", -8, 18, 40, 10)]),
    P(CUADRUPEDIA, l1=(185, 180, 180), l2=(80, 175, 180), objetos=[("caja", -8, 18, 40, 10)]), apoyo="mano1")
# Abducción en polea: vista de frente (las dos piernas, a un lado y a otro).
par("Abducción en polea", P(DE_PIE, a1=(100, 95), a2=(80, 85), l1=(85, 90, 0), l2=(95, 90, 180), objetos=[("cuerda", "tobillo1", (-40, 40))]),
    P(DE_PIE, a1=(100, 95), a2=(80, 85), l1=(55, 55, 0), l2=(95, 90, 180), objetos=[("cuerda", "tobillo1", (-40, 40))]), apoyo="tobillo2")
# Los dos de prueba que pidió Dan, en el nuevo estilo.
par("Elevación de piernas colgado", P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(88, 90, 0), l2=(92, 92, 0), suelo=False,
                                      objetos=[("linea", (-16, -64), (16, -64))]),
    P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(-5, -5, -60), l2=(-2, -2, -60), suelo=False,
      objetos=[("linea", (-16, -64), (16, -64))]), apoyo="mano1")
par("Curl nórdico", P(t=-90, a1=(90, 90), a2=(92, 92), l1=(90, 180, 90), l2=(92, 180, 90), objetos=[("caja", -46, 22, 50, 6)]),
    P(t=-40, a1=(30, 40), a2=(33, 43), l1=(90, 180, 90), l2=(92, 180, 90), objetos=[("caja", -46, 22, 50, 6)]), apoyo="rodilla1")

# La otra postura de cada ejercicio con movimiento.
SEGUNDA = {
    "Cinta de correr": P(t=-80, a1=(130, 60), a2=(60, -30), l1=(125, 60, 20), l2=(30, 120, 0), objetos=[("caja", -34, 40, 74, 5), ("linea", (36, 40), (44, -24))]),
    "Cinta de andar en cuesta": P(DE_PIE, t=-82, a1=(115, 85), a2=(70, 100), l1=(110, 85, -10), l2=(60, 105, -10), objetos=[("linea", (-34, 46), (40, 36)), ("linea", (40, 36), (46, -26))]),
    "Bicicleta estática": P(t=-60, a1=(30, 50), a2=(35, 55), l1=(70, 110, 0), l2=(20, 100, 0), suelo=False, objetos=[("disco", "tobillo1", 1), ("linea", (-5, 3), (30, -18))]),
    "Spinning": P(t=-35, a1=(25, 45), a2=(30, 50), l1=(70, 110, 0), l2=(20, 100, 0), suelo=False, objetos=[("disco", "tobillo1", 1), ("linea", (-5, 3), (30, -18))]),
    "Escalera sin fin": P(DE_PIE, t=-85, a1=(120, 80), a2=(60, 100), l1=(110, 80, 0), l2=(20, 90, 0), objetos=[("caja", 4, 20, 20, 19), ("caja", 24, 8, 20, 31)]),
    "Escaleras": P(DE_PIE, t=-85, a1=(120, 80), a2=(60, 100), l1=(110, 80, 0), l2=(20, 90, 0), objetos=[("caja", 4, 20, 20, 19), ("caja", 24, 8, 20, 31)]),
    "Bicicleta": P(t=-45, a1=(35, 60), a2=(40, 65), l1=(70, 110, 0), l2=(20, 100, 0), suelo=False, objetos=[("disco", "tobillo1", 1), ("linea", (-5, 3), (30, -18))]),
    "Esquí de fondo (máquina)": P(DE_PIE, t=-75, a1=(110, 130), a2=(-40, -70), l1=(115, 80, 0), l2=(60, 100, 0)),
    "Patinaje": P(t=-45, a1=(60, 20), a2=(130, 160), l1=(150, 160, 160), l2=(60, 120, 0)),
    "Baile": P(DE_PIE, a1=(40, 100), a2=(-130, -150), l1=(105, 80, 0), l2=(70, 100, 0)),
    "Sprints": P(t=-65, a1=(140, 70), a2=(50, -40), l1=(135, 50, 30), l2=(20, 110, 0)),
    "Trineo (empujar)": P(t=-30, a1=(-5, -5), a2=(0, 0), l1=(140, 100, 0), l2=(70, 120, 0), objetos=[("caja", 34, 20, 26, 22)]),
    "Battle ropes": P(t=-75, a1=(60, 40), a2=(65, 45), l1=(30, 110, 0), l2=(40, 115, 0), objetos=[("cuerda", "mano1", (70, 38))]),
    "Air squat": P(t=-60, a1=(0, 0), a2=(5, 5), l1=(5, 110, 0), l2=(10, 112, 0)),
    "Mountain climbers": P(t=-5, a1=(90, 90), a2=(92, 92), l1=(175, 178, 90), l2=(-130, 130, 90)),
    "Kettlebell swing": P(DE_PIE, a1=(0, 0), a2=(4, 4), objetos=[("disco", "mano1", 5)]),
    "Lanzamiento de balón medicinal": P(DE_PIE, t=-80, a1=(-20, -20), a2=(-15, -15), l1=(70, 100, 0), l2=(110, 85, 0), objetos=[("disco", "mano1", 7)]),
    "Face pull": P(DE_PIE, a1=(-35, 180), a2=(-30, 185), l1=(85, 92, 0), l2=(98, 88, 0), objetos=[("cuerda", "mano1", (62, -40))]),
    "Curl de muñeca": P(t=-65, a1=(65, -25), a2=(68, -22), l1=(0, 90, 0), l2=(4, 92, 0),
                        objetos=[("caja", -14, 0, 34, 7), ("mancuerna", "mano1")]),
    "Press pallof": P(DE_PIE, a1=(0, 0), a2=(4, 4), l1=(80, 95, 0), l2=(100, 85, 0), objetos=[("cuerda", "mano1", (-40, -22))]),
    "Press Arnold": P(DE_PIE, a1=(-92, -92), a2=(-88, -88), l1=(0, 90, 0), objetos=[("caja", -10, 2, 22, 8), ("mancuerna", "mano1"), ("mancuerna", "mano2")]),
    "Extensión de muñeca": P(DE_PIE, t=-80, l1=(0, 90, 0), a1=(60, -25), a2=(70, -15), objetos=[("caja", -10, 2, 20, 8), ("mancuerna", "mano1")]),
    "Paseo del granjero": P(DE_PIE, a1=(90, 90), l1=(110, 80, 0), l2=(70, 100, 0), objetos=[("mancuerna", "mano1"), ("mancuerna", "mano2")]),
    "Sentadilla a una pierna": P(t=-88, a1=(15, 15), l1=(90, 90, 0), l2=(20, 60, -30)),
    "Curl nórdico": P(t=-90, a1=(90, 90), l1=(90, 180, 90), l2=(92, 180, 90)),
    "Elevación de piernas colgado": P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(88, 90, 0), l2=(92, 92, 0), suelo=False,
                                      objetos=[("linea", (-14, -64), (14, -64))]),
    "Elevación de rodillas colgado": P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(88, 90, 0), l2=(92, 92, 0), suelo=False,
                                       objetos=[("linea", (-14, -64), (14, -64))]),
    "Elevación de tibiales": P(DE_PIE, t=-95, l1=(100, 95, 0), objetos=[("linea", (-9, -45), (-9, 44))]),
    "Bicho muerto": P(TUMBADO_ARRIBA, a1=(190, 180), a2=(-90, -90), l1=(-10, -5, -40), l2=(-90, 0, -60)),
    "Pájaro-perro": P(CUADRUPEDIA, a2=(85, 90), l2=(85, 180, 180)),
    "Leñador en polea": P(DE_PIE, t=-85, a1=(120, 120), a2=(125, 125), l1=(80, 95, 0), l2=(100, 88, 0), objetos=[("cuerda", "mano1", (-35, -70))]),
    "Giros rusos": P(t=-115, a1=(-15, -25), l1=(-30, 25, 0), l2=(-25, 30, 0), objetos=[("disco", "mano1", 5)]),
    "Comba": P(DE_PIE, a1=(100, 10), a2=(105, 15), l1=(88, 95, 25), objetos=[("comba",)]),
    "Boxeo": P(DE_PIE, t=-85, a1=(70, -100), a2=(0, 0), l1=(75, 100, 0), l2=(110, 85, 0)),
    "Carrera": P(t=-80, a1=(130, 60), a2=(60, -30), l1=(125, 60, 20), l2=(30, 120, 0)),
    "Cardio": P(t=-80, a1=(130, 60), a2=(60, -30), l1=(125, 60, 20), l2=(30, 120, 0), objetos=[("corazon", 34, -34, 1.8)]),
    "HIIT": P(t=-85, a1=(140, 60), a2=(-40, -70), l1=(120, 50, 20), l2=(40, 130, 0), suelo=False, objetos=[("corazon", 30, -40, 1.5)]),
    "Tabata": P(t=-85, a1=(140, 60), a2=(-40, -70), l1=(120, 50, 20), l2=(40, 130, 0), suelo=False, objetos=[("corazon", 30, -40, 1.5)]),
    "Burpees": P(DE_PIE, a1=(-100, -100), a2=(-95, -95)),
    "Jumping jacks": P(DE_PIE, a1=(95, 90), a2=(100, 92), l1=(88, 90, 0), l2=(92, 90, 0), suelo=False),
    "Rodillas al pecho": P(DE_PIE, t=-88, a1=(120, 60), a2=(60, 0), l1=(95, 95, 0), l2=(-10, 110, 0)),
    "Elíptica": P(DE_PIE, t=-88, a1=(70, -60), a2=(40, -40), l1=(110, 80, 0), l2=(70, 100, 0)),
    "Remo de cardio": P(t=-60, a1=(-5, -5), a2=(0, 0), l1=(-50, 60, -20), objetos=[("linea", (-15, 4), (45, 4))]),
    "Natación": P(t=0, a1=(170, 175), a2=(0, 0), l1=(175, 170, 180), l2=(180, 185, 180), suelo=False),
    "Caminar": P(DE_PIE, a1=(115, 85), a2=(70, 100), l1=(110, 85, 0), l2=(70, 100, 0)),
    "Senderismo": P(DE_PIE, t=-80, a1=(115, 85), a2=(60, 90), l1=(110, 85, 0), l2=(70, 100, 0), objetos=[("linea", (30, -12), (38, 44))]),
}

# Dibujos propios que sustituyen a uno que había (no era del ejercicio o no era libre).
SUSTITUIR = {"Face pull", "Curl de muñeca", "Press pallof", *LINEA}


def main():
    creditos_ruta = IMAGENES / "creditos.json"
    creditos = json.loads(creditos_ruta.read_text(encoding="utf-8"))
    catalogo = (RAIZ / "web" / "js" / "catalogo.js").read_text(encoding="utf-8")
    DESTINO.mkdir(parents=True, exist_ok=True)

    todos = dict(MUNECOS)
    for nombre, (a, b) in LINEA.items():
        todos[nombre] = a
        SEGUNDA[nombre] = b
    for espanol, sanscrito in re.findall(r"yoga\('([^']+)', '([^']+)'", catalogo):
        if sanscrito in YOGA:
            todos[f"{espanol} ({sanscrito})"] = YOGA[sanscrito]

    hechos, faltan = 0, []
    nombres = re.findall(r"(?:ej|estiramiento|movilidad)\('([^']+)'", catalogo)
    nombres += [f"{e} ({s})" for e, s in re.findall(r"yoga\('([^']+)', '([^']+)'", catalogo)]
    for nombre in nombres:
        if nombre in creditos["ejercicios"] and creditos["ejercicios"][nombre].get("fuente") != "propia" and nombre not in SUSTITUIR:
            continue
        if nombre not in todos:
            faltan.append(nombre)
            continue
        archivo = f"{normalizar(nombre)}.svg"
        poses = [todos[nombre]] + ([SEGUNDA[nombre]] if nombre in SEGUNDA else [])
        (DESTINO / archivo).write_text(svg_de(*poses), encoding="utf-8")
        creditos["ejercicios"][nombre] = {"archivo": f"imagenes/munecos/{archivo}", "autor": "dibujo propio de la app", "fuente": "propia"}
        hechos += 1

    creditos_ruta.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{hechos} muñecos dibujados.")
    if faltan:
        print(f"Sin muñeco ({len(faltan)}): {', '.join(faltan)}")


if __name__ == "__main__":
    main()
