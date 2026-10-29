"""Quita las orejas de una cabeza vista de frente (o de espaldas): los bultos que sobresalen del óvalo a los
lados. Busca la cabeza (lo más alto del dibujo, o la que se le diga con --cabeza x,y), mide el borde del óvalo
fila a fila, y donde el borde salta hacia fuera (la oreja) borra lo que sobresale y cierra el contorno con una
línea entre el punto de arriba y el de abajo de la oreja.
Uso: python quitar_orejas.py <webp> [--cabeza x,y] [--prueba salida.png]"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageSequence

args = sys.argv[1:]
ruta = args[0]
cabeza = None
prueba = None
if '--cabeza' in args:
    cabeza = tuple(int(v) for v in args[args.index('--cabeza') + 1].split(','))
if '--prueba' in args:
    prueba = args[args.index('--prueba') + 1]

im = Image.open(ruta)
fr, dur = [], []
for i in range(getattr(im, 'n_frames', 1)):
    im.seek(i); im.load(); fr.append(im.convert('RGB').copy()); dur.append(im.info.get('duration'))


def arreglar(f):
    a = np.array(f.convert('L')) < 200
    if cabeza:
        cx, y0 = cabeza
        # sube hasta lo alto de la cabeza
        col = np.nonzero(a[:y0 + 1, cx])[0]
        y0 = col.min() if len(col) else y0
    else:
        ys, xs = np.nonzero(a)
        y0 = ys.min()
        cx = int(np.median(xs[ys < y0 + 15]))
    # alto de la cabeza: baja por el centro hasta la barbilla (la primera tinta tras el hueco de la cara)
    columna = a[y0:, cx]
    hueco = np.nonzero(~columna)[0]
    if not len(hueco):
        return f, 'sin cabeza'
    dentro = hueco[0]
    tras = np.nonzero(columna[dentro:])[0]
    alto = (tras[0] + dentro) if len(tras) else 80
    d = ImageDraw.Draw(f)
    hecho = []
    for lado in (-1, 1):
        bordes = {}
        for y in range(y0 + 2, y0 + alto):
            fila = a[y]
            # desde el centro hacia fuera, primera tinta = borde interior del contorno
            xs = range(cx, cx + lado * (alto + 30), lado)
            x_borde = next((x for x in xs if 0 <= x < fila.size and fila[x]), None)
            if x_borde is None:
                continue
            # recorre el trazo y lo que haya pegado hacia fuera
            x = x_borde
            while 0 <= x + lado < fila.size and fila[x + lado]:
                x += lado
            # deja un hueco de hasta 4 píxeles por si la oreja va separada del contorno
            fin = x
            for salto in range(1, 6):
                xx = x + lado * salto
                if 0 <= xx < fila.size and fila[xx]:
                    fin = xx
                    while 0 <= fin + lado < fila.size and fila[fin + lado]:
                        fin += lado
            bordes[y] = (x_borde, fin)
        ys = sorted(bordes)
        if len(ys) < 10:
            continue
        # anchura del trazo normal y filas en las que sobresale algo más (la oreja)
        anchos = np.array([abs(bordes[y][1] - bordes[y][0]) for y in ys])
        normal = np.median(anchos)
        marcadas = [y for y, an in zip(ys, anchos) if an > normal + 2 and y > y0 + alto * 0.3 and y < y0 + alto * 0.85]
        if len(marcadas) < 4:
            continue
        # el primer bloque seguido (con huecos de una o dos filas): la oreja, no la mandíbula
        bloque = [marcadas[0]]
        for y in marcadas[1:]:
            if y - bloque[-1] <= 3:
                bloque.append(y)
            else:
                break
        if len(bloque) < 4:
            continue
        ya, yb = min(bloque) - 2, max(bloque) + 2
        for y in range(ya, yb + 1):
            if y in bordes:
                xb, fin = bordes[y]
                x0, x1 = sorted((xb + lado * 1, fin + lado * 3))
                d.line((x0, y, x1, y), fill='white')
        # el contorno, seguido
        pa = bordes.get(ya - 1, bordes[ya]); pb = bordes.get(yb + 1, bordes[yb])
        d.line((pa[0] + lado, ya - 1, pb[0] + lado, yb + 1), fill='black', width=max(2, int(round(normal))))
        hecho.append((lado, ya, yb))
    return f, hecho


out = []
for f in fr:
    g, info = arreglar(f)
    print(info)
    out.append(g)
if prueba:
    w = sum(min(g.width, 300) for g in out)
    o = Image.new('RGB', (300 * len(out), 300), 'white')
    for i, g in enumerate(out):
        a = np.array(g.convert('L')) < 150
        ys, xs = np.nonzero(a); y0 = ys.min(); cx = int(np.median(xs[ys < y0 + 15]))
        o.paste(g.crop((cx - 60, y0 - 5, cx + 60, y0 + 115)).resize((300, 300)), (i * 300, 0))
    o.save(prueba)
else:
    if len(out) > 1:
        out[0].save(ruta, 'WEBP', save_all=True, append_images=out[1:], duration=dur, loop=0, quality=82, method=6)
    else:
        out[0].save(ruta, 'WEBP', quality=82, method=6)
