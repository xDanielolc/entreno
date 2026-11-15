"""Rehace el «congelado» de las animaciones con el método que no parte líneas (15-11-2026).

El congelado de la 0.90.2 (`congelar_a_cortes` en fijar_zona.py) copiaba trozos de la primera postura y dejaba trazos
partidos. Este script vuelve a hacerlo con `congelar` (deformación suave) en todas las animaciones que tocó aquel paso
o las tandas posteriores, partiendo del dibujo de ANTES del congelado siempre que se puede:

  - si el archivo de ahora es justo «el de antes de la 0.90.2 + congelado viejo», se parte del de antes (Git);
  - si no (se fijó a mano, o es de una tanda posterior), se parte del de ahora: el método nuevo también cura los cortes.

Los que Dan dio por buenos (`VALEN`) no se tocan.
Uso: python herramientas/rehacer_congelado.py [--solo nombre1,nombre2] [--salida carpeta]   (sin --salida, en su sitio)
"""
import io
import subprocess
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fijar_zona import congelar, congelar_a_cortes, posturas, tinta  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
EJ = 'web/imagenes/ejercicios'
ANTES = '4bdb0a9^'   # el commit anterior al congelado viejo
VALEN = {'colgarse-de-la-barra-de-frente', 'curl-de-biceps-en-maquina', 'flexion-y-extension-de-dedos-del-pie',
         'flexiones-diamante', 'jalon-al-pecho-ek-completo', 'press-de-banca', 'press-de-banca-con-mancuernas',
         'press-declinado', 'press-inclinado', 'press-inclinado-con-mancuernas', 'sentadilla-hack'}


def de_git(ruta, version):
    r = subprocess.run(['git', 'show', f'{version}:{ruta}'], cwd=RAIZ, capture_output=True)
    if r.returncode:
        return None
    return posturas(io.BytesIO(r.stdout))


def parecidas(a, b):
    """¿Son la misma postura, salvo la compresión?"""
    if a.size != b.size:
        return False
    ta, tb = tinta(a), tinta(b)
    return (ta ^ tb).sum() < 0.03 * max(1, (ta | tb).sum())


def uno(args):
    ruta, salida = args
    rel = f'{EJ}/{ruta.parent.name}/{ruta.name}'
    cuadros, tiempos = posturas(ruta)
    if len(cuadros) < 2:
        return None
    origen, fuente = 'ahora', cuadros
    antes = de_git(rel, ANTES)
    if antes and len(antes[0]) == len(cuadros) and all(parecidas(x, y) for x, y in zip(
            [antes[0][0]] + [congelar_a_cortes(antes[0][0], c)[0] for c in antes[0][1:]], cuadros)):
        origen, fuente = 'antes', antes[0]
    nuevos = [fuente[0]]
    mueve = []
    for c in fuente[1:]:
        if np.array_equal(np.array(c), np.array(fuente[0])):
            nuevos.append(c)
            continue
        m, movimiento = congelar(fuente[0], c)
        nuevos.append(m)
        mueve.append(round(float(movimiento.mean()) * 100))
    destino = (salida / ruta.parent.name / ruta.name) if salida else ruta
    destino.parent.mkdir(parents=True, exist_ok=True)
    nuevos[0].save(destino, 'WEBP', save_all=True, append_images=nuevos[1:], duration=tiempos, loop=0, quality=84, method=6)
    return f'{ruta.parent.name}/{ruta.stem}: desde {origen}; se mueve {mueve} %'


def main():
    resto = sys.argv[1:]
    solo = set(resto[resto.index('--solo') + 1].split(',')) if '--solo' in resto else None
    salida = Path(resto[resto.index('--salida') + 1]) if '--salida' in resto else None
    cambiados = subprocess.run(['git', 'diff', '--name-only', ANTES, 'HEAD', '--', EJ], cwd=RAIZ, capture_output=True, text=True).stdout.split('\n')
    rutas = [RAIZ / c for c in cambiados if c.endswith('.webp') and (RAIZ / c).exists()
             and Path(c).parent.name in ('anim', 'ia') and not c.endswith('-quieta.webp')]
    rutas = [r for r in rutas if r.stem not in VALEN and (not solo or r.stem in solo)]
    with Pool(6) as p:
        for linea in p.imap_unordered(uno, [(r, salida) for r in rutas]):
            if linea:
                print(linea, flush=True)


if __name__ == '__main__':
    main()
