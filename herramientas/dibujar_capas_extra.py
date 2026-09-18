# -*- coding: utf-8 -*-
r"""
Capas de músculo que wger no trae (antebrazo, hombro posterior, lumbares,
aductores, abductores, cuello y tibial), dibujadas encima de su silueta.

Las coordenadas son las del dibujo del cuerpo (200 × 369). Solo se dibuja el
lado izquierdo de la imagen: el derecho se obtiene reflejando en x = 100.
Son formas aproximadas, pensadas para que Claude Design las pula.

Uso:
    herramientas\.venv\Scripts\python.exe herramientas\dibujar_capas_extra.py
"""

from pathlib import Path

DESTINO = Path(__file__).resolve().parent.parent / "web" / "imagenes" / "musculos"
ANCHO, ALTO = 200, 369

# músculo → vista → lista de polígonos (lado izquierdo de la imagen)
CAPAS = {
    "antebrazo": {
        "delante": [[(47, 137), (55, 141), (54, 152), (47, 165), (38, 178), (31, 184), (26, 181),
                     (30, 168), (37, 152)]],
        "detras": [[(48, 135), (58, 139), (56, 152), (48, 168), (38, 186), (29, 188),
                    (32, 172), (40, 152)]],
    },
    "hombroPosterior": {
        "detras": [[(47, 76), (55, 70), (64, 71), (70, 77), (64, 86), (55, 96), (46, 101),
                    (43, 92), (44, 83)]],
    },
    "lumbar": {
        "detras": [[(88, 128), (96, 122), (99, 124), (99, 178), (93, 172), (87, 160), (85, 145)]],
    },
    "aductores": {
        "delante": [[(90, 190), (98, 192), (98, 212), (95, 232), (91, 244), (88, 228),
                     (87, 206)]],
    },
    "abductores": {
        "detras": [[(67, 158), (77, 152), (87, 158), (82, 168), (71, 178), (66, 171)]],
    },
    "cuello": {
        "delante": [[(88, 47), (93, 50), (98, 62), (98, 66), (94, 66), (87, 56)]],
        "detras": [[(90, 42), (97, 43), (98, 56), (93, 58), (88, 52)]],
    },
    "tibial": {
        "delante": [[(75, 270), (81, 266), (85, 280), (84, 305), (81, 328), (77, 322),
                     (73, 296)]],
    },
}


def reflejar(poligono):
    return [(ANCHO - x, y) for x, y in poligono]


def trazado(poligono):
    puntos = " L ".join(f"{x:g} {y:g}" for x, y in poligono)
    return f'<path d="M {puntos} Z"/>'


def main():
    for musculo, vistas in CAPAS.items():
        for vista, poligonos in vistas.items():
            todos = poligonos + [reflejar(p) for p in poligonos]
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{ANCHO}" height="{ALTO}" '
                   f'viewBox="0 0 {ANCHO} {ALTO}">\n'
                   f'  <!-- {musculo} ({vista}): capa propia de la app -->\n'
                   f'  <g fill="#000" stroke="#000" stroke-width="1.5" stroke-linejoin="round">\n    '
                   + "\n    ".join(trazado(p) for p in todos)
                   + "\n  </g>\n</svg>\n")
            archivo = DESTINO / f"{musculo}-{vista}.svg"
            archivo.write_text(svg, encoding="utf-8")
            print(f"  {archivo.name}")


if __name__ == "__main__":
    main()
