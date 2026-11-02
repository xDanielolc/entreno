"""Encaja la segunda postura en tamaño y sitio sobre la primera por una zona quieta (fracciones de la caja de la
primera postura). Prueba escalas y desplazamientos y se queda con el que más tinta hace coincidir.
Uso: python escalar_encajar.py <webp> x0 y0 x1 y1 [escala_min escala_max] [--salida otro.webp]
La tinta de la segunda postura que cae en la zona sin coincidir resta (si no, siempre gana la escala más grande) y
no vale ninguna colocación que deje tinta fuera del lienzo."""
import sys
import numpy as np
from PIL import Image, ImageSequence

args = sys.argv[1:]
salida = None
if '--salida' in args:
    i = args.index('--salida')
    salida = args[i + 1]
    del args[i:i + 2]
sys.argv[1:] = args
ruta = sys.argv[1]
zona = tuple(float(v) for v in sys.argv[2:6])
emin, emax = (float(sys.argv[6]), float(sys.argv[7])) if len(sys.argv) > 7 else (0.8, 1.3)
im = Image.open(ruta)
fr = [f.convert('RGB').copy() for f in ImageSequence.Iterator(im)]
dur = []
_im = Image.open(ruta)
for i in range(_im.n_frames):
    _im.seek(i)
    _im.load()  # sin load() Pillow no da la duración del fotograma
    dur.append(_im.info.get('duration', 900))
a, b = fr[0], fr[1]
ta = np.array(a.convert('L')) < 150
ys, xs = np.nonzero(ta)
x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
w, h = x1 - x0, y1 - y0
z = (int(x0 + zona[0] * w), int(y0 + zona[1] * h), int(x0 + zona[2] * w), int(y0 + zona[3] * h))
from scipy.ndimage import binary_dilation
pa = binary_dilation(ta[z[1]:z[3], z[0]:z[2]], iterations=1)


def pegar(esc, dx, dy):
    bb = b.resize((round(b.width * esc), round(b.height * esc)), Image.LANCZOS)
    lienzo = Image.new('RGB', a.size, 'white')
    # escala alrededor del centro del lienzo y desplaza
    ox = round((a.width - bb.width) / 2) + dx
    oy = round((a.height - bb.height) / 2) + dy
    lienzo.paste(bb, (ox, oy))
    return lienzo


tinta_b = (np.array(b.convert('L')) < 150).sum()


def puntua(esc, dx, dy):
    t = np.array(pegar(esc, dx, dy).convert('L')) < 150
    if t.sum() < 0.97 * tinta_b * esc * esc:  # se sale del lienzo
        return -1
    tz = t[z[1]:z[3], z[0]:z[2]]
    return (pa & tz).sum() - 0.5 * (tz & ~pa).sum()


mejor = (-1e9, 1.0, 0, 0)
for esc in np.arange(emin, emax + 1e-9, 0.02):
    for dx in range(-60, 61, 6):
        for dy in range(-60, 61, 6):
            p = puntua(esc, dx, dy)
            if p > mejor[0]:
                mejor = (p, esc, dx, dy)
_, e0, dx0, dy0 = mejor
for esc in np.arange(e0 - 0.02, e0 + 0.021, 0.005):
    for dx in range(dx0 - 6, dx0 + 7):
        for dy in range(dy0 - 6, dy0 + 7):
            p = puntua(esc, dx, dy)
            if p > mejor[0]:
                mejor = (p, esc, dx, dy)
_, esc, dx, dy = mejor
nb = pegar(esc, dx, dy)
a.save(salida or ruta, 'WEBP', save_all=True, append_images=[nb], duration=dur[:2], loop=0, quality=82, method=6)
print(f'{ruta}: escala {esc:.3f}, desplazada {dx}, {dy}')
