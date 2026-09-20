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

CERCA, LEJOS, OBJETO = "#2f5d8c", "#9dbbdc", "#8a94a3"
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

def dibujar_objeto(o, j):
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


def svg_de(p):
    j = p["j"]
    xs = [x for x, _ in j.values()]
    ys = [y for _, y in j.values()]
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
    suelo_y = max(ys) + 4
    minx, maxx = min(xs) - 10, max(xs) + 10
    miny, maxy = min(ys) - 10, suelo_y + 4
    lado = max(maxx - minx, maxy - miny)
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    caja = f"{cx - lado / 2:.1f} {cy - lado / 2:.1f} {lado:.1f} {lado:.1f}"

    def seg(a, b, color, w):
        return (f'<line x1="{j[a][0]:.1f}" y1="{j[a][1]:.1f}" x2="{j[b][0]:.1f}" y2="{j[b][1]:.1f}" '
                f'stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>')

    partes = []
    if p["suelo"]:
        partes.append(f'<line x1="{cx - lado / 2 + 4:.1f}" y1="{suelo_y:.1f}" x2="{cx + lado / 2 - 4:.1f}" y2="{suelo_y:.1f}" '
                      f'stroke="{OBJETO}" stroke-width="1.5" opacity=".6"/>')
    partes += [dibujar_objeto(o, j) for o in p["objetos"] if o[0] in ("caja", "linea", "rodillo", "arco")]
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
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{caja}">'
            + "".join(partes) + "</svg>\n")


# --- Posturas base ---------------------------------------------------------

DE_PIE = dict(t=-90, a1=(95, 90), l1=(90, 90, 0))
SENTADO_SUELO = dict(t=-90, l1=(0, 0, -80), a1=(70, 20))
CUADRUPEDIA = dict(t=0, a1=(90, 90), l1=(90, 180, 180))           # a cuatro patas, cabeza a la derecha
TUMBADO_ARRIBA = dict(t=180, a1=(170, 180), l1=(0, 0, -80))       # boca arriba, cabeza a la izquierda
TUMBADO_ABAJO = dict(t=180, a1=(180, 180), l1=(0, 0, 80))         # boca abajo, cabeza a la izquierda


def P(base=None, **k):
    return pose(**{**(base or {}), **k})


MUNECOS = {
    # --- Fuerza y core que faltan ------------------------------------------
    "Press Arnold": P(DE_PIE, a1=(-70, -95), a2=(-75, -90), l1=(0, 90, 0), objetos=[("caja", -10, 2, 22, 8), ("mancuerna", "mano1"), ("mancuerna", "mano2")]),
    "Remo con barra": P(t=-25, a1=(110, 70), a2=(115, 75), l1=(100, 80, 0), objetos=[("disco", "mano1", 7)]),
    "Extensión de muñeca": P(DE_PIE, t=-80, l1=(0, 90, 0), a1=(60, 0), a2=(70, 10), objetos=[("caja", -10, 2, 20, 8), ("mancuerna", "mano1")]),
    "Colgarse de la barra": P(DE_PIE, a1=(-90, -90), a2=(-95, -92), l1=(95, 95, 30), suelo=False, objetos=[("linea", (-14, -64), (14, -64))]),
    "Paseo del granjero": P(DE_PIE, a1=(90, 90), l1=(70, 100, 0), l2=(110, 80, 0), objetos=[("mancuerna", "mano1"), ("mancuerna", "mano2")]),
    "Sentadilla a una pierna": P(t=-55, a1=(10, 10), l1=(15, 115, 0), l2=(-8, -2, -60)),
    "Curl nórdico": P(t=-45, a1=(20, 30), l1=(135, 180, 90), l2=(130, 180, 90)),
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
    "Estiramiento de isquios": P(t=-40, a1=(20, 15), l1=(0, 0, -80), l2=(90, 90, 0), objetos=[("caja", 30, 2, 16, 43)]),
    "Estiramiento de cuádriceps": P(DE_PIE, a1=(110, 115), a2=(95, 90), l1=(95, -110, -90), l2=(90, 90, 0)),
    "Estiramiento de psoas en zancada": P(DE_PIE, a1=(-90, -90), l1=(0, 90, 0), l2=(120, 180, 180)),
    "Estiramiento de gemelo en pared": P(t=-60, a1=(-10, -10), l1=(70, 100, 0), l2=(125, 125, 0), objetos=[("linea", (48, -60), (48, 44))]),
    "Estiramiento de glúteo en figura de 4": P(TUMBADO_ARRIBA, a1=(-30, -10), l1=(-40, 180, 180), l2=(-80, 0, -60)),
    "Estiramiento de aductores en mariposa": P(t=-90, a1=(70, 40), l1=(15, 165, 0), l2=(20, 160, 0)),
    "Estiramiento de pectoral en el marco de la puerta": P(DE_PIE, t=-85, a1=(180, -90), l1=(80, 95, 0), l2=(105, 85, 0), objetos=[("linea", (-30, -60), (-30, 44))]),
    "Estiramiento de dorsal": P(t=0, a1=(0, 0), a2=(5, 5), l1=(90, 90, 0), objetos=[("linea", (58, -30), (58, 44))]),
    "Estiramiento de tríceps": P(DE_PIE, a1=(-75, 160), a2=(-45, -150)),
    "Estiramiento de hombro cruzado": P(DE_PIE, a1=(0, 0), a2=(40, -20)),
    "Estiramiento lateral de cuello": P(DE_PIE, cabeza=-55, a1=(-70, 160), a2=(95, 90)),
    "Estiramiento de antebrazo": P(DE_PIE, a1=(0, 0), a2=(40, -5)),
    "Estiramiento de lumbares con rodillas al pecho": P(TUMBADO_ARRIBA, a1=(-45, -10), l1=(-120, -20, -60), l2=(-125, -25, -60)),

    # --- Movilidad ---------------------------------------------------------
    "CARs de hombro": P(DE_PIE, a1=(-120, -120), objetos=[("arco", "hombro", 30)]),
    "CARs de cadera": P(CUADRUPEDIA, l1=(40, 110, 180), objetos=[("arco", "cadera", 20)]),
    "Dislocaciones con pica": P(DE_PIE, a1=(-110, -110), a2=(-112, -112), objetos=[("disco", "mano1", 3)]),
    "Tobillo con rodilla a la pared": P(DE_PIE, a1=(-10, -10), l1=(0, 70, 0), l2=(120, 180, 180), objetos=[("linea", (40, -40), (40, 44))]),
    "Rotación torácica en libro abierto": P(t=180, a1=(-90, -90), a2=(0, 0), l1=(20, 110, 180), l2=(25, 115, 180)),
    "Sentadilla profunda mantenida": P(t=-75, a1=(10, 10), l1=(-10, 105, 0), l2=(-5, 110, 0)),
    "Sentadilla cosaca": P(t=-65, a1=(10, 10), l1=(-5, 110, 0), l2=(160, 160, -90)),
    "Movilidad de muñeca": P(CUADRUPEDIA, a1=(90, 90), objetos=[("arco", "mano1", 6)]),
    "Rotación 90/90": P(t=-90, a1=(70, 60), l1=(10, 100, 0), l2=(170, 100, 180)),
    "Gato-camello": P(CUADRUPEDIA, cabeza=40, objetos=[("arco", "hombro", 16)]),
    "Deslizamiento neural (nerve floss)": P(t=-80, cabeza=-20, a1=(70, 30), l1=(0, 0, -80), l2=(5, 90, 0)),
    "Deslizamiento neural ciático": P(t=-80, cabeza=-20, a1=(70, 30), l1=(0, 0, -80), l2=(5, 90, 0)),
    "Deslizamiento neural cervical": P(DE_PIE, cabeza=-110, a1=(0, 0), a2=(95, 90)),
    "Rotación tibial con rodilla flexionada": P(t=-90, a1=(60, 60), l1=(0, 90, 0), l2=(5, 92, 0), objetos=[("arco", "tobillo1", 8)]),
    "Estiramiento de sóleo en pared": P(t=-70, a1=(-15, -15), l1=(60, 110, 0), l2=(115, 130, 0), objetos=[("linea", (44, -60), (44, 44))]),
    "Rotación torácica en cuadrupedia": P(CUADRUPEDIA, a1=(90, 90), a2=(-60, -120), cabeza=-30, objetos=[("arco", "hombro", 14)]),
    "Estiramiento de trapecio superior": P(DE_PIE, cabeza=-60, a1=(-100, -170), a2=(95, 90)),
    "Estiramiento del elevador de la escápula": P(DE_PIE, cabeza=-50, a1=(-100, -160), a2=(95, 90)),
    "Puente por fases": P(t=170, a1=(-100, -180), l1=(-70, 110, 0), l2=(-65, 112, 0), suelo=True),
    "Postura del sastre (apertura lateral)": P(t=-90, a1=(80, 80), l1=(15, 165, 0), l2=(20, 160, 0)),
    "Zancada hacia el split frontal": P(t=-88, a1=(60, 60), a2=(120, 120), l1=(0, 0, -80), l2=(180, 180, 180)),
    "Rotación externa de hombro con banda": P(DE_PIE, a1=(90, 0), a2=(95, 90), objetos=[("cuerda", "mano1", (-30, -5))]),
    "Rotación interna de hombro con toalla": P(DE_PIE, a1=(-120, -60), a2=(120, 170), objetos=[("linea", (-9, -62), (-13, -18))]),
    "Retracción cervical (chin tuck)": P(DE_PIE, cabeza=-100, objetos=[("linea", (-16, -44), (-6, -44))]),
    "Flexión lateral de cuello activa": P(DE_PIE, cabeza=-60),
    "Extensión torácica sobre rodillo": P(t=-150, cabeza=-170, a1=(-150, -170), l1=(-40, 80, 0), l2=(-38, 82, 0), objetos=[("rodillo", 20, -8)]),
    "Elevaciones Y-T-W": P(TUMBADO_ABAJO, a1=(-150, -150), a2=(-155, -155), cabeza=170),
    "Cobra en el suelo": P(t=-150, cabeza=-170, a1=(120, 180), l1=(0, 0, 80), l2=(2, 2, 80)),
    "Estiramiento del sofá (couch stretch)": P(t=-90, a1=(90, 90), l1=(90, 180, 180), l2=(-20, 90, 0), objetos=[("linea", (-30, -40), (-30, 44))]),
    "Estiramiento de glúteo en paloma": P(t=-70, a1=(80, 70), l1=(20, 170, 180), l2=(175, 175, 180)),
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


def main():
    creditos_ruta = IMAGENES / "creditos.json"
    creditos = json.loads(creditos_ruta.read_text(encoding="utf-8"))
    catalogo = (RAIZ / "web" / "js" / "catalogo.js").read_text(encoding="utf-8")
    DESTINO.mkdir(parents=True, exist_ok=True)

    todos = dict(MUNECOS)
    for espanol, sanscrito in re.findall(r"yoga\('([^']+)', '([^']+)'", catalogo):
        if sanscrito in YOGA:
            todos[f"{espanol} ({sanscrito})"] = YOGA[sanscrito]

    hechos, faltan = 0, []
    nombres = re.findall(r"(?:ej|estiramiento|movilidad)\('([^']+)'", catalogo)
    nombres += [f"{e} ({s})" for e, s in re.findall(r"yoga\('([^']+)', '([^']+)'", catalogo)]
    for nombre in nombres:
        if nombre in creditos["ejercicios"] and creditos["ejercicios"][nombre].get("fuente") != "propia":
            continue
        if nombre not in todos:
            faltan.append(nombre)
            continue
        archivo = f"{normalizar(nombre)}.svg"
        (DESTINO / archivo).write_text(svg_de(todos[nombre]), encoding="utf-8")
        creditos["ejercicios"][nombre] = {"archivo": f"imagenes/munecos/{archivo}", "autor": "dibujo propio de la app", "fuente": "propia"}
        hechos += 1

    creditos_ruta.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{hechos} muñecos dibujados.")
    if faltan:
        print(f"Sin muñeco ({len(faltan)}): {', '.join(faltan)}")


if __name__ == "__main__":
    main()
