"""Vuelve a encajar las dos posturas de un dibujo animado que «se teletransporta».

Toma los dos fotogramas del WebP ya hecho (web/imagenes/ejercicios/anim/), busca en
un margen amplio el desplazamiento con el que más coinciden las líneas de la parte
que no se mueve (`zona`, en fracciones de la caja del dibujo de la primera postura)
y lo reescribe en el mismo archivo. No toca creditos.json.

Uso: python herramientas/reencajar.py [nombre]
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageSequence

RAIZ = Path(__file__).resolve().parent.parent
ANIM = RAIZ / "web" / "imagenes" / "ejercicios" / "anim"

# Revisión de Dan (22-10-2026): la máquina o el cuerpo saltaban de sitio entre posturas.
# zona = (izquierda, arriba, derecha, abajo) de la parte quieta.
REENCAJAR = {
    "abductores-en-maquina": {"zona": (0.3, 0.0, 0.8, 0.35)},    # respaldo y cabeza
    "aductores-en-maquina": {"zona": (0.3, 0.0, 0.8, 0.35)},
    "elevaciones-de-piernas": {"mover": (-195, 85)},             # tumbado: cabeza sobre cabeza (medido a ojo)
    "fondos-en-banco": {"zona": (0.0, 0.3, 0.25, 1.0)},          # el cajón y los talones
    "remo-en-t": {"zona": (0.3, 0.75, 0.65, 1.0)},              # la plataforma de los pies
    "remo-invertido": {"mover": (-12, 0)},                      # los talones en su sitio; la barra ya cuadra
    "plancha-lateral": {"mover": (-18, 6)},                     # mano y pies quietos; sube la cadera
    "sentadilla-bulgara": {"mover": (12, 66)},                  # el pie de delante quieto en el suelo
    "prensa-de-piernas": {"mover": (68, -72)},                   # el respaldo y la cabeza quietos;        # Dan: la persona quieta, se mueve la máquina
}


def tinta(im, umbral=200):
    return im.convert("L").point(lambda v: 255 if v < umbral else 0)


def reencajar(nombre, zona=None, rango=50, escala=0.25, mover=None):
    archivo = ANIM / f"{nombre}.webp"
    fuente = Image.open(archivo)
    marcos = [f.convert("RGB") for f in ImageSequence.Iterator(fuente)]
    duraciones = [f.info.get("duration", 900) for f in ImageSequence.Iterator(Image.open(archivo))]
    if len(marcos) < 2:
        return False
    a, b = marcos[:2]
    caja = tinta(a).getbbox()
    x0, y0, x1, y1 = caja
    w, h = x1 - x0, y1 - y0
    # Fracciones de la caja del dibujo o, si pasan de 1, píxeles del fotograma.
    zona = zona or (0, 0, 1, 1)
    z = tuple(zona) if max(zona) > 1 else (round(x0 + zona[0] * w), round(y0 + zona[1] * h), round(x0 + zona[2] * w), round(y0 + zona[3] * h))
    # Líneas engordadas: la coincidencia sube poco a poco al acercarse, no solo al clavarla.
    gorda = lambda m: m.filter(ImageFilter.MaxFilter(5))
    pa = gorda(tinta(a).crop(z).resize((max(1, round((z[2] - z[0]) * escala)), max(1, round((z[3] - z[1]) * escala)))))
    pb = gorda(tinta(b).resize((round(b.width * escala), round(b.height * escala))))
    ox, oy = round(z[0] * escala), round(z[1] * escala)
    mejor, mejor_d = -1, (0, 0)
    if mover:
        # Dibujos demasiado distintos para encajarlos solos: el desplazamiento se mide a ojo.
        rango, mejor_d = -1, (mover[0] * escala, mover[1] * escala)
    for dy in range(-rango, rango + 1):
        for dx in range(-rango, rango + 1):
            trozo = pb.crop((ox - dx, oy - dy, ox - dx + pa.width, oy - dy + pa.height))
            n = ImageChops.multiply(pa, trozo).histogram()[255]
            if n > mejor:
                mejor, mejor_d = n, (dx, dy)
    dx, dy = round(mejor_d[0] / escala), round(mejor_d[1] / escala)
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
    salida[0].save(archivo, "WEBP", save_all=True, append_images=salida[1:], duration=duraciones[:2], loop=0, quality=82, method=6)
    print(f"{nombre}: desplazada {dx}, {dy}")
    return True


if __name__ == "__main__":
    filtro = sys.argv[1] if len(sys.argv) > 1 else None
    for nombre, op in REENCAJAR.items():
        if not filtro or filtro == nombre:
            reencajar(nombre, op.get("zona"), mover=op.get("mover"))
