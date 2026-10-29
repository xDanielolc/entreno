"""Mini teletransportes: lo quieto de un dibujo coincide mejor con un desplazamiento pequeño (1-6 px) que sin
desplazar. Mide la coincidencia de tinta de todo el dibujo (lo que se mueve no coincide de ninguna forma, así
que manda lo quieto) sin desplazar y con el mejor desplazamiento cercano."""
import json, sys
import numpy as np
from PIL import Image, ImageSequence

R = str(__import__('pathlib').Path(__file__).resolve().parent.parent / 'web') + '/'
lista = json.load(open(sys.argv[1], encoding='utf-8'))
res = []
for ruta, nombres in lista.items():
    fr = [np.array(f.convert('L')) < 150 for f in ImageSequence.Iterator(Image.open(R + ruta))]
    a = fr[0]
    b = max(fr[1:], key=lambda c: (a ^ c).sum())
    def co(dx, dy):
        m = np.roll(np.roll(b, dy, 0), dx, 1)
        return (a & m).sum()
    base = co(0, 0)
    mejor = max(((co(dx, dy), dx, dy) for dx in range(-6, 7) for dy in range(-6, 7)), key=lambda t: t[0])
    tot = min(a.sum(), b.sum())
    res.append(dict(ruta=ruta, usan=nombres, base=round(base / tot, 3), mejor=round(mejor[0] / tot, 3),
                    dx=mejor[1], dy=mejor[2], ganancia=round((mejor[0] - base) / tot, 3)))
res.sort(key=lambda r: -r['ganancia'])
json.dump(res, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for r in res:
    if (r['dx'], r['dy']) != (0, 0):
        print(f"{r['ganancia']:.3f} {r['dx']:+d},{r['dy']:+d} base {r['base']:.2f} {r['ruta'].split('/',2)[-1]}")
