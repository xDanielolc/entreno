# -*- coding: utf-8 -*-
r"""
Capas de músculo que wger no trae (antebrazo, hombro posterior, lumbares,
aductores, abductores, cuello, tibial y sóleo, más el gemelo partido del
sóleo), dibujadas encima de su silueta.

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
    # El gemelo de wger ocupa toda la pantorrilla. Se parte en dos: arriba el
    # gemelo (gastrocnemio, que se trabaja con la rodilla estirada, de pie) y
    # abajo el sóleo (que se trabaja con la rodilla doblada, sentado).
    "gemelo": {
        "detras": [[(97.1, 292.8), (95.2, 310.2), (92.5, 317), (84, 318), (74.1, 312.2), (71.6, 296.1),
                    (72.8, 283.0), (82.2, 264.4), (88.8, 262.8), (93.4, 266.8)]],
    },
    "soleo": {
        "detras": [[(92.5, 320), (91.4, 346), (89, 346), (84, 331.3), (76.5, 316.5), (84, 321)]],
    },
    "tibial": {
        # El vientre, bajo la rodilla y por fuera de la tibia; el tendón cruza
        # por delante del tobillo hasta el pie (antes se quedaba corto).
        "delante": [[(74, 274), (80, 270), (84, 282), (83, 304), (82, 318), (85, 332),
                     (87, 341), (84, 342), (80, 330), (76, 318), (73, 298)]],
    },
}


def reflejar(poligono):
    return [(ANCHO - x, y) for x, y in poligono]


# El cuerpo de wger no está centrado exactamente en x = 100: el cuello, visto
# de frente, queda 1,5 px a la derecha. Desplazamiento de la capa entera.
DESPLAZAMIENTO = {("cuello", "delante"): -1.5}


def trazado(poligono):
    puntos = " L ".join(f"{x:g} {y:g}" for x, y in poligono)
    return f'<path d="M {puntos} Z"/>'


def main():
    for musculo, vistas in CAPAS.items():
        for vista, poligonos in vistas.items():
            todos = poligonos + [reflejar(p) for p in poligonos]
            dx = DESPLAZAMIENTO.get((musculo, vista), 0)
            transform = f' transform="translate({dx:g} 0)"' if dx else ""
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{ANCHO}" height="{ALTO}" '
                   f'viewBox="0 0 {ANCHO} {ALTO}">\n'
                   f'  <!-- {musculo} ({vista}): capa propia de la app -->\n'
                   f'  <g fill="#000" stroke="#000" stroke-width="1.5" stroke-linejoin="round"{transform}>\n    '
                   + "\n    ".join(trazado(p) for p in todos)
                   + "\n  </g>\n</svg>\n")
            archivo = DESTINO / f"{musculo}-{vista}.svg"
            archivo.write_text(svg, encoding="utf-8")
            print(f"  {archivo.name}")


if __name__ == "__main__":
    main()
