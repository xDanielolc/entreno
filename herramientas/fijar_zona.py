"""Fija una zona de un dibujo animado: lo que cae dentro de la zona (los pies, las manos, el soporte de la máquina)
queda en el mismo sitio en todas las posturas.

Uso:
  python fijar_zona.py ver  salida.png ruta1.webp [ruta2.webp ...]      hoja con las posturas superpuestas (rojo/azul)
  python fijar_zona.py medir ruta.webp x0 y0 x1 y1 [--radio 30] [--escala]
  python fijar_zona.py fijar ruta.webp x0 y0 x1 y1 [--radio 30] [--escala] [--salida otra.webp] [--copiar]
  python fijar_zona.py dos ruta.webp ax ay dax day bx by dbx dby [--soporte x0 y0 x1 y1] [--primera] [--salida otra.webp]
      mueve dos puntos (fracciones) los píxeles que se digan y lo de en medio en proporción: pies Y manos a la vez
  python fijar_zona.py congelar ruta.webp      deja idéntico entre posturas todo lo que no se mueve (mini teletransportes)
  python fijar_zona.py todo                    el congelado, a todas las animaciones

La zona va en fracciones del lienzo (0-1). Para cada postura que no es la primera se busca el desplazamiento (y, con
--escala, el cambio de tamaño) con el que su tinta coincide mejor con la de la primera DENTRO de la zona, y se aplica
a la postura entera. Con --copiar, además, lo de dentro de la zona se sustituye por lo de la primera postura (para un
suelo o una máquina que la IA dibujó distinta cada vez). Conserva la duración de cada fotograma.
Lo pidió Dan en la octava revisión (02-11-2026): «fija los pies, que es lo que se ve más a la derecha».
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def posturas(ruta):
    im = Image.open(ruta)
    cuadros, tiempos = [], []
    for k in range(getattr(im, 'n_frames', 1)):
        im.seek(k)
        im.load()
        tiempos.append(im.info.get('duration', 700))
        fondo = Image.new('RGB', im.size, 'white')
        c = im.convert('RGBA')
        fondo.paste(c, mask=c.split()[3])
        cuadros.append(fondo)
    return cuadros, tiempos


def tinta(im):
    return np.array(im.convert('L')) < 170


def superpuesta(a, b):
    ta, tb = tinta(a), tinta(b)
    lienzo = np.full((*ta.shape, 3), 255, np.uint8)
    lienzo[ta & ~tb] = (220, 40, 40)
    lienzo[tb & ~ta] = (40, 80, 220)
    lienzo[ta & tb] = (20, 20, 20)
    return Image.fromarray(lienzo)


def mover(im, dx, dy, escala=1.0):
    w, h = im.size
    if escala != 1.0:
        g = im.resize((round(w * escala), round(h * escala)), Image.LANCZOS)
        base = Image.new('RGB', (w, h), 'white')
        base.paste(g, ((w - g.width) // 2, h - g.height))     # el tamaño cambia desde abajo y el centro
        im = base
    fuera = Image.new('RGB', (w, h), 'white')
    fuera.paste(im, (dx, dy))
    return fuera


def mejor(a, b, zona, radio, con_escala):
    w, h = a.size
    x0, y0, x1, y1 = (round(zona[0] * w), round(zona[1] * h), round(zona[2] * w), round(zona[3] * h))
    ta = tinta(a)[y0:y1, x0:x1]
    res = None
    for escala in ([1.0] if not con_escala else [0.94, 0.96, 0.98, 1.0, 1.02, 1.04, 1.06]):
        tb = tinta(mover(b, 0, 0, escala))
        relleno = np.pad(tb, radio)
        for dy in range(-radio, radio + 1):
            for dx in range(-radio, radio + 1):
                trozo = relleno[radio + y0 - dy:radio + y1 - dy, radio + x0 - dx:radio + x1 - dx]
                n = (ta & trozo).sum() - 0.25 * (ta ^ trozo).sum()
                if res is None or n > res[0]:
                    res = (n, dx, dy, escala)
    sin = (ta & tinta(b)[y0:y1, x0:x1]).sum()
    return res, sin, ta.sum()


def dos_puntos(im, a, da, b, db):
    """Mueve el punto `a` (píxeles) `da` píxeles y el punto `b`, `db`; lo de en medio, en proporción (una
    deformación lineal a lo largo de la línea que los une). Para fijar a la vez las manos y los pies."""
    a, da, b, db = (np.array(v, float) for v in (a, da, b, db))
    u = b - a
    largo = float(u @ u)
    m = np.eye(2) + np.outer(db - da, u) / largo
    c = da - (db - da) * float(a @ u) / largo
    inv = np.linalg.inv(m)
    d = -inv @ c
    return im.transform(im.size, Image.AFFINE, (inv[0, 0], inv[0, 1], d[0], inv[1, 0], inv[1, 1], d[1]), resample=Image.BICUBIC, fillcolor='white')


def quitar_soporte(base, im, caja, holgura=2):
    """Borra de `im` el soporte (el banco, el suelo, la máquina): la tinta que, dentro de `caja`, está en las dos
    posturas casi en el mismo sitio (a `holgura` píxeles). Devuelve la imagen sin él y la máscara de la tinta del
    soporte en `base`, para volver a pintarlo en su sitio después de mover la postura."""
    x0, y0, x1, y1 = caja
    ta, tb = tinta(base), tinta(im)
    zona = np.zeros(ta.shape, bool)
    zona[y0:y1, x0:x1] = True
    en_im = tb & engordar(ta, holgura) & zona
    en_base = ta & engordar(tb, holgura) & zona
    datos = np.array(im)
    datos[engordar(en_im, 1) & zona] = 255
    return Image.fromarray(datos), engordar(en_base, 1) & zona


def engordar(mascara, radio):
    """Dilata una máscara `radio` píxeles (cuadrado), con sumas acumuladas: rápido aunque el radio sea grande."""
    if radio <= 0:
        return mascara
    m = np.pad(mascara.astype(np.int32), radio)
    s = m.cumsum(0).cumsum(1)
    s = np.pad(s, ((1, 0), (1, 0)))
    lado = 2 * radio + 1
    h, w = mascara.shape
    total = s[lado:lado + h, lado:lado + w] - s[:h, lado:lado + w] - s[lado:lado + h, :w] + s[:h, :w]
    return total > 0


def congelar(base, im, tolerancia=3, margen=14):
    """Deja en `im` idéntico a `base` todo lo que no se mueve. «Se mueve» la tinta de cualquiera de las dos posturas
    que no tiene tinta de la otra a `tolerancia` píxeles o menos; alrededor de ella (`margen` píxeles) se conserva la
    postura; en el resto se copia la primera. Así el banco, las piernas apoyadas o la máquina, que en los dibujos
    originales bailan uno o dos píxeles entre posturas («mini teletransporte»), quedan clavados."""
    ta, tb = tinta(base), tinta(im)
    cerca_a, cerca_b = engordar(ta, tolerancia), engordar(tb, tolerancia)
    suelta = (ta & ~cerca_b) | (tb & ~cerca_a)
    # motas sueltas (un cruce de líneas, el borde de un trazo) no cuentan como movimiento
    densa = engordar(suelta, 2)
    cuenta = np.pad(suelta.astype(np.int32), 4).cumsum(0).cumsum(1)
    cuenta = np.pad(cuenta, ((1, 0), (1, 0)))
    h, w = suelta.shape
    vecinos = cuenta[9:9 + h, 9:9 + w] - cuenta[:h, 9:9 + w] - cuenta[9:9 + h, :w] + cuenta[:h, :w]
    movimiento = engordar(suelta & (vecinos >= 12) & densa, margen)
    datos = np.array(im)
    quieto = ~movimiento
    datos[quieto] = np.array(base)[quieto]
    return Image.fromarray(datos), movimiento


def main():
    orden = sys.argv[1]
    if orden == 'todo':
        # python fijar_zona.py todo: pasa el congelado a todas las animaciones de web/imagenes/ejercicios (anim e ia).
        # Hay que repetirlo después de reprocesar dibujos con imagenes_ia.py, animar_imagenes.py o reencajar.py.
        raiz = Path(__file__).resolve().parent.parent / 'web' / 'imagenes' / 'ejercicios'
        tocadas = 0
        for ruta in sorted(list((raiz / 'anim').glob('*.webp')) + list((raiz / 'ia').glob('*.webp'))):
            cuadros, tiempos = posturas(ruta)
            if len(cuadros) < 2:
                continue
            nuevos, cambios = [cuadros[0]], 0
            for c in cuadros[1:]:
                m, _ = congelar(cuadros[0], c)
                cambios += int((tinta(m) ^ tinta(c)).sum())
                nuevos.append(m)
            if cambios:
                tocadas += 1
                nuevos[0].save(ruta, 'WEBP', save_all=True, append_images=nuevos[1:], duration=tiempos, loop=0, quality=82, method=6)
        print(tocadas, 'animaciones corregidas')
        return
    if orden == 'congelar':
        # python fijar_zona.py congelar ruta.webp [--tolerancia 3] [--margen 14] [--salida otra.webp]
        ruta = Path(sys.argv[2])
        resto = sys.argv[3:]
        tolerancia = int(resto[resto.index('--tolerancia') + 1]) if '--tolerancia' in resto else 3
        margen = int(resto[resto.index('--margen') + 1]) if '--margen' in resto else 14
        salida = Path(resto[resto.index('--salida') + 1]) if '--salida' in resto else ruta
        cuadros, tiempos = posturas(ruta)
        nuevos = [cuadros[0]]
        for k, c in enumerate(cuadros[1:], 1):
            m, movimiento = congelar(cuadros[0], c, tolerancia, margen)
            cambiados = int((tinta(m) ^ tinta(c)).sum())
            print(f'{ruta.name} postura {k}: se mueve el {movimiento.mean() * 100:.0f} % del lienzo; {cambiados} píxeles de tinta corregidos')
            nuevos.append(m)
        nuevos[0].save(salida, 'WEBP', save_all=True, append_images=nuevos[1:], duration=tiempos, loop=0, quality=82, method=6)
        return
    if orden == 'dos':
        # python fijar_zona.py dos ruta.webp ax ay dax day bx by dbx dby [--soporte x0 y0 x1 y1] [--salida otra.webp]
        ruta = Path(sys.argv[2])
        v = [float(x) for x in sys.argv[3:11]]
        resto = sys.argv[11:]
        salida = Path(resto[resto.index('--salida') + 1]) if '--salida' in resto else ruta
        cuadros, tiempos = posturas(ruta)
        w, h = cuadros[0].size
        if '--primera' in resto:
            # Se mueve la primera postura y las demás se quedan (cuando al mover la segunda se saldría del lienzo).
            nuevos = [dos_puntos(cuadros[0], (v[0] * w, v[1] * h), (v[2], v[3]), (v[4] * w, v[5] * h), (v[6], v[7]))] + cuadros[1:]
            nuevos[0].save(salida, 'WEBP', save_all=True, append_images=nuevos[1:], duration=tiempos, loop=0, quality=82, method=6)
            print('guardado', salida)
            return
        nuevos = [cuadros[0]]
        for c in cuadros[1:]:
            soporte = None
            if '--soporte' in resto:
                k = resto.index('--soporte')
                z = [float(x) for x in resto[k + 1:k + 5]]
                caja = (round(z[0] * w), round(z[1] * h), round(z[2] * w), round(z[3] * h))
                c, soporte = quitar_soporte(cuadros[0], c, caja)
            m = dos_puntos(c, (v[0] * w, v[1] * h), (v[2], v[3]), (v[4] * w, v[5] * h), (v[6], v[7]))
            if soporte is not None:
                datos = np.array(m)
                datos[soporte] = np.array(cuadros[0])[soporte]
                m = Image.fromarray(datos)
            nuevos.append(m)
        nuevos[0].save(salida, 'WEBP', save_all=True, append_images=nuevos[1:], duration=tiempos, loop=0, quality=82, method=6)
        print('guardado', salida)
        return
    if orden == 'ver':
        salida, rutas = sys.argv[2], sys.argv[3:]
        lado = 360
        cols = min(4, len(rutas))
        filas = -(-len(rutas) // cols)
        hoja = Image.new('RGB', (cols * lado, filas * lado), 'white')
        for k, ruta in enumerate(rutas):
            c, _ = posturas(ruta)
            b = max(c[1:], key=lambda x: (tinta(c[0]) ^ tinta(x)).sum()) if len(c) > 1 else c[0]
            s = superpuesta(c[0], b)
            s.thumbnail((lado - 8, lado - 8))
            hoja.paste(s, ((k % cols) * lado + 4, (k // cols) * lado + 4))
        hoja.save(salida)
        return
    ruta = Path(sys.argv[2])
    zona = [float(x) for x in sys.argv[3:7]]
    resto = sys.argv[7:]
    radio = int(resto[resto.index('--radio') + 1]) if '--radio' in resto else 30
    con_escala = '--escala' in resto
    copiar = '--copiar' in resto
    salida = Path(resto[resto.index('--salida') + 1]) if '--salida' in resto else ruta
    cuadros, tiempos = posturas(ruta)
    nuevos = [cuadros[0]]
    for k, c in enumerate(cuadros[1:], 1):
        (n, dx, dy, escala), sin, total = mejor(cuadros[0], c, zona, radio, con_escala)
        print(f'{ruta.name} postura {k}: dx {dx:+d} dy {dy:+d} escala {escala} · coincidencia en la zona {sin / max(1, total):.2f} -> {(n) / max(1, total):.2f}')
        m = mover(c, dx, dy, escala)
        if copiar:
            w, h = m.size
            caja = (round(zona[0] * w), round(zona[1] * h), round(zona[2] * w), round(zona[3] * h))
            m.paste(cuadros[0].crop(caja), caja[:2])
        nuevos.append(m)
    if orden == 'fijar':
        nuevos[0].save(salida, 'WEBP', save_all=True, append_images=nuevos[1:], duration=tiempos, loop=0, quality=82, method=6)
        print('guardado', salida)


if __name__ == '__main__':
    main()
