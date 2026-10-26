"""Vuelve a encajar las dos posturas de un dibujo animado que «se teletransporta».

Toma los dos fotogramas del WebP (los de Everkinetic, de la versión original guardada en Git, así
repetirlo no desplaza dos veces; los de la IA, recién salidos de imagenes_ia.py), busca el
desplazamiento con el que más coinciden las líneas de la parte que no se mueve (`zona`, en
fracciones de la caja del dibujo de la primera postura): primero a grandes rasgos y después
píxel a píxel, y lo reescribe. No toca creditos.json.

Uso: python herramientas/reencajar.py [nombre]
"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageSequence

RAIZ = Path(__file__).resolve().parent.parent
ANIM = RAIZ / "web" / "imagenes" / "ejercicios" / "anim"
ORIGINAL = "113dbb3"   # la 0.60.8: los animados de Everkinetic tal como salieron de animar_imagenes.py

# Revisión de Dan (22-10-2026): la máquina o el cuerpo saltaban de sitio entre posturas.
# zona = (izquierda, arriba, derecha, abajo) de la parte quieta.
REENCAJAR = {
    "abductores-en-maquina": {"zona": (0.3, 0.0, 0.8, 0.35)},    # respaldo y cabeza
    "aductores-en-maquina": {"mover": (-104, 0)},                 # cabeza y respaldo, medido a ojo
    "elevaciones-de-piernas": {"mover": (-195, 85)},             # tumbado: cabeza sobre cabeza (medido a ojo)
    "fondos-en-banco": {"zona": (0.0, 0.3, 0.25, 1.0)},          # el cajón y los talones
    "remo-en-t": {"mover": (-2, 0), "zona": (0.55, 0.5, 1.0, 1.0)},               # 23-10: el banco y sus patas (la plataforma ya cuadraba)
    "remo-invertido": {"zona": (0.0, 0.0, 1.0, 0.15)},          # 23-10: la barra y las manos (Dan: salta)
    "plancha-lateral": {"mover": (-18, 6), "zona": (0.0, 0.3, 0.18, 1.0)},  # 23-10: los pies quietos, afinado
    # 23-10, Dan: «el respaldo, la línea más a la izquierda, y la de más abajo, la de la prensa, no se mueven».
    # Medido sobre la rejilla: (62, -55); el (68, -72) de antes dejaba 17 píxeles de salto.
    "prensa-de-piernas": {"mover": (62, -55), "zona": (70, 195, 250, 300)},
    "remo-en-polea": {"zona": (0.05, 0.62, 0.8, 0.8)},                 # 23-10: el banco (la variante «al pecho»)
    # Dibujos de la IA («ia»: los reencaja imagenes_ia.py al hacerlos). 23-10, Dan: «un pequeño desplazamiento
    # lateral»: lo apoyado (pies, manos, rodillas) tiene que quedar clavado.
    "curl-invertido-completo": {"ia": True, "zona": (0.0, 0.9, 1.0, 1.0), "fijo_desde": 0.62},     # los pies
    "curl-martillo-completo": {"ia": True, "zona": (0.0, 0.9, 1.0, 1.0), "fijo_desde": 0.62},
    "pullover-en-polea-completo": {"ia": True, "zona": (0.0, 0.9, 1.0, 1.0), "fijo_desde": 0.62},
    "flexiones-en-pica": {"ia": True, "zona": (0.6, 0.85, 1.0, 1.0)},          # 23-10, Dan: las manos clavadas
    "sentadilla-goblet": {"ia": True, "zona": (0.0, 0.92, 1.0, 1.0)},          # los pies
    "puente-por-fases": {"ia": True, "zona": (0.6, 0.75, 1.0, 1.0)},           # los pies
    "mountain-climbers": {"ia": True, "zona": (0.72, 0.55, 1.0, 0.97)},        # las manos y los brazos
    "dominadas-supinas": {"ia": True, "zona": (0.0, 0.0, 1.0, 0.1)},          # la barra y las manos
    "dominada": {"ia": True, "zona": (160, 20, 230, 85), "mover": (-15, 0)},   # la mano izquierda en la barra (26-10)
    "dominadas-negativas": {"ia": True, "zona": (175, 20, 240, 85), "mover": (8, 0)},
    "dominadas-neutras": {"ia": True},
    "curl-nordico": {"ia": True, "zona": (0.0, 0.7, 1.0, 1.0)},   # el rodillo, las piernas y la colchoneta (26-10, ChatGPT)
    "elevaciones-laterales": {"ia": True, "zona": (0.0, 0.6, 1.0, 1.0), "fijo_desde": 0.72},  # rehecha entera (26-10): las piernas quietas, por debajo de las mancuernas
    "fondos-de-triceps": {"ia": True, "zona": (0.5, 0.45, 1.0, 1.0)},         # las patas y la base de las paralelas (26-10)
    "hip-thrust": {"ia": True, "zona": (0.0, 0.45, 0.35, 1.0)},               # el banco
    "face-pull": {"ia": True, "zona": (0.75, 0.0, 1.0, 1.0)},  # la columna (con las piernas fijas el muñeco se partía por la cintura)
    "elevacion-de-gemelos-completo": {"ia": True, "zona": (0.0, 0.8, 1.0, 1.0),    # el escalón
                                      "subir": (0.73, 0.18, 24)},                   # 23-10, Dan: «que suba más»
    "puente-de-gluteo": {"ia": True, "zona": (0.0, 0.0, 0.35, 1.0)},          # la cabeza y los hombros en el suelo
    "encogimientos-de-trapecio": {"ia": True, "zona": (0.0, 0.9, 1.0, 1.0), "fijo_desde": 0.6},  # pies; piernas quietas
    "carrera": {"ia": True, "zona": (0.25, 0.0, 0.75, 0.4)},                  # cabeza y hombros (corre en el sitio)
    "remo-de-cardio": {"ia": True, "zona": (0.0, 0.0, 0.3, 1.0)},             # el volante y las patas de delante
    "peso-muerto-rumano": {"ia": True, "zona": (0.0, 0.9, 1.0, 1.0)},      # 23-10: el de antes con los pies clavados
    # 23-10, Dan: «se parte por la mitad»: encajado por el respaldo y la cadera (por los pies, el tronco saltaba).
    "press-militar-ek-completo": {"ia": True, "zona": (0.2, 0.36, 0.8, 0.52), "fijo_desde": 0.55},
    # 23-10, Dan: «piernas sobre piernas»: las dos posturas con las mismas piernas.
    # 23-10, Dan: las zancadas «saltan». Adelante: el pie de atrás se queda donde estaba de pie (medido a ojo: la
    # bola del pie). Atrás: el pie de delante clavado, afinado píxel a píxel sobre el pie quieto.
    "escalera-sin-fin": {"ia": True, "zona": (0.0, 0.75, 1.0, 1.0)},         # la base de la máquina
    # Dan: «que suba más»; los postes son rectas verticales y estirarlos no se nota, la barra sube con los hombros.
    "elevacion-de-gemelos-en-multipower-completo": {"ia": True, "zona": (0.0, 0.88, 1.0, 1.0), "subir": (0.86, 0.2, 22)},
    "zancadas": {"ia": True, "mover": (180, 0)},
    "zancadas-hacia-atras": {"ia": True, "zona": (300, 555, 420, 600), "mover": (-78, 0)},
    "elevaciones-laterales-completo": {"ia": True, "zona": (0.0, 0.9, 1.0, 1.0), "fijo_desde": 0.6},
    "press-de-hombro-con-mancuernas-completo": {"ia": True, "zona": (0.0, 0.9, 1.0, 1.0), "fijo_desde": 0.6},
}


def tinta(im, umbral=200):
    return im.convert("L").point(lambda v: 255 if v < umbral else 0)


def original(nombre):
    """El animado de Everkinetic sin reencajar."""
    datos = subprocess.run(["git", "show", f"{ORIGINAL}:web/imagenes/ejercicios/anim/{nombre}.webp"],
                           capture_output=True, cwd=RAIZ).stdout
    return Image.open(io.BytesIO(datos)) if datos else Image.open(ANIM / f"{nombre}.webp")


def coincidencia(pa, pb, ox, oy, dx, dy):
    trozo = pb.crop((ox - dx, oy - dy, ox - dx + pa.width, oy - dy + pa.height))
    return ImageChops.multiply(pa, trozo).histogram()[255]


def buscar(a, b, z, escala, centro, rango):
    """El mejor desplazamiento (en píxeles del fotograma) a esa escala, alrededor de `centro`."""
    gorda = lambda m: m.filter(ImageFilter.MaxFilter(5 if escala < 1 else 3))
    pa = gorda(tinta(a).crop(z).resize((max(1, round((z[2] - z[0]) * escala)), max(1, round((z[3] - z[1]) * escala)))))
    pb = gorda(tinta(b).resize((round(b.width * escala), round(b.height * escala))))
    ox, oy = round(z[0] * escala), round(z[1] * escala)
    cx, cy = round(centro[0] * escala), round(centro[1] * escala)
    mejor, mejor_d = -1, (cx, cy)
    for dy in range(cy - rango, cy + rango + 1):
        for dx in range(cx - rango, cx + rango + 1):
            n = coincidencia(pa, pb, ox, oy, dx, dy)
            if n > mejor:
                mejor, mejor_d = n, (dx, dy)
    return round(mejor_d[0] / escala), round(mejor_d[1] / escala)


def reencajar(nombre, zona=None, rango=15, escala=0.25, mover=None, archivo=None, fijo_desde=None, subir=None):
    """`archivo`: un WebP de la IA ya hecho (se reencaja tal cual); sin él, el animado de Everkinetic."""
    archivo_ia = archivo is not None
    fuente = Image.open(archivo) if archivo else original(nombre)
    archivo = archivo or ANIM / f"{nombre}.webp"
    marcos = [f.convert("RGB") for f in ImageSequence.Iterator(fuente)]
    duraciones = [f.info.get("duration", 900) for f in ImageSequence.Iterator(fuente)]
    if len(marcos) < 2:
        return False
    a, b = marcos[:2]
    caja = tinta(a).getbbox()
    x0, y0, x1, y1 = caja
    w, h = x1 - x0, y1 - y0
    # Fracciones de la caja del dibujo o, si pasan de 1, píxeles del fotograma.
    zona = zona or (0, 0, 1, 1)
    z = tuple(zona) if max(zona) > 1 else (round(x0 + zona[0] * w), round(y0 + zona[1] * h), round(x0 + zona[2] * w), round(y0 + zona[3] * h))
    if mover and zona != (0, 0, 1, 1):
        # Medido a ojo y afinado píxel a píxel en la zona quieta.
        dx, dy = buscar(a, b, z, 1.0, mover, 8)
    elif mover:
        # Dibujos demasiado distintos para encajarlos solos: el desplazamiento se mide a ojo.
        dx, dy = mover
    elif archivo_ia:
        # Los de la IA ya salen casi encajados: solo se afina, píxel a píxel y cerca.
        dx, dy = buscar(a, b, z, 0.5, (0, 0), 20)
        dx, dy = buscar(a, b, z, 1.0, (dx, dy), 3)
    else:
        # Primero a grandes rasgos (líneas engordadas, la coincidencia sube poco a poco al acercarse) y luego
        # píxel a píxel: con solo lo grueso quedaba un «mini teletransporte» de hasta 4 píxeles.
        dx, dy = buscar(a, b, z, escala, (0, 0), rango)
        dx, dy = buscar(a, b, z, 1.0, (dx, dy), 6)
    # b se pega desplazada (dx, dy); el lienzo abarca las dos sin cortar nada.
    cb = tinta(b).getbbox()
    izq = min(caja[0], cb[0] + dx); arr = min(caja[1], cb[1] + dy)
    der = max(caja[2], cb[2] + dx); aba = max(caja[3], cb[3] + dy)
    margen = 24
    lado = max(der - izq, aba - arr) + 2 * margen
    cx, cy = (izq + der) / 2, (arr + aba) / 2
    salida = []
    for im, (mx, my) in ((a, (0, 0)), (b, (dx, dy))):
        lienzo = Image.new("RGB", (lado, lado), "white")
        lienzo.paste(im, (round(lado / 2 - cx + mx), round(lado / 2 - cy + my)))
        salida.append(lienzo.resize((600, 600), Image.LANCZOS) if lado > 600 else lienzo)
    if fijo_desde:
        # Lo de abajo no se mueve pero la IA lo dibujó algo distinto en cada postura (las piernas de los
        # completados): la segunda postura lleva, desde esa altura, lo mismo que la primera.
        c = tinta(salida[0]).getbbox()
        y = round(c[1] + (c[3] - c[1]) * fijo_desde)
        salida[1].paste(salida[0].crop((0, y, salida[0].width, salida[0].height)), (0, y))
    if subir:
        # La IA apenas levanta el cuerpo de puntillas (Dan: «que suba más»): en la segunda postura todo lo que
        # queda por encima del tobillo sube `px` y el tramo bajo de las piernas se estira para llegar a los pies.
        corte, tramo, px = subir
        b2 = salida[1]
        c = tinta(b2).getbbox()
        yc = round(c[1] + (c[3] - c[1]) * corte)
        s = round((c[3] - c[1]) * tramo)
        px = min(px, c[1])
        nueva = b2.copy()
        nueva.paste(Image.new("RGB", (b2.width, yc), "white"), (0, 0))
        nueva.paste(b2.crop((0, 0, b2.width, yc - s)), (0, -px))
        nueva.paste(b2.crop((0, yc - s, b2.width, yc)).resize((b2.width, s + px), Image.LANCZOS), (0, yc - s - px))
        salida[1] = nueva
    salida[0].save(archivo, "WEBP", save_all=True, append_images=salida[1:], duration=duraciones[:2], loop=0, quality=82, method=6)
    print(f"{nombre}: desplazada {dx}, {dy}")
    return True


if __name__ == "__main__":
    filtro = sys.argv[1] if len(sys.argv) > 1 else None
    for nombre, op in REENCAJAR.items():
        if not filtro or filtro == nombre:
            if not op.get("ia"):
                reencajar(nombre, op.get("zona"), mover=op.get("mover"))
