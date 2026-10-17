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
    # Repasadas el 16-10-2026 (0.45.1) sobre el dibujo ampliado: cada capa va
    # por las líneas que se ven en el dibujo y no se sale de la silueta (antes
    # el pecho bajaba hasta el abdomen y los aductores se metían entre las
    # piernas).
    #
    # El antebrazo, en dos: de frente se ve la cara de la palma (flexores) y
    # de espaldas, la de los nudillos (extensores).
    "antebrazoFlexor": {
        "delante": [[(44, 134.5), (52, 137.5), (56.8, 140.3), (55.1, 143.6), (52, 150.5), (47.1, 159.4), (43, 165.3),
                     (38.9, 171.1), (34.8, 177.4), (32.3, 180.5), (29, 179.8), (26.9, 176.3), (30.2, 169.7), (34.4, 161.3),
                     (38.5, 153), (41, 144.7), (41.9, 137)]],
    },
    "antebrazoExtensor": {
        "detras": [[(47.5, 139), (57.3, 141.5), (56.3, 151), (51.5, 161.5), (46.5, 170), (41.5, 178.3), (38, 185),
                    (29.5, 186), (32, 172), (40, 152)]],
    },
    # Abdomen: los cuatro cuadros de cada lado tal y como están dibujados, con
    # la línea alba en medio.
    "abdomen": {
        "delante": [[(84, 115.5), (97, 115.5), (97, 130.5), (84, 130.5)],
                    [(84, 132.5), (97, 132.5), (97, 145.5), (84, 145.5)],
                    [(84, 147.5), (97, 147.5), (97, 160), (84, 160)],
                    [(84.5, 162), (97, 162), (97, 182), (92, 180.5), (87.5, 174), (85, 167)]],
    },
    # Oblicuos (17-10-2026): propios y simétricos. El de wger tocaba los
    # cuadros del abdomen en un lado y en el otro dejaba una línea; ahora los
    # dos dejan la misma separación.
    "oblicuos": {
        "delante": [[(70, 114), (75, 111.5), (79, 112.5), (80.6, 116), (80.6, 130), (80.6, 145), (80.8, 158), (81.4, 165), (83.2, 171.5),
                     (84.6, 176.5), (80.5, 175.5), (75.5, 170), (71, 162), (68, 152), (66.8, 140), (67.5, 126), (68.5, 118)]],
    },
    # Pecho: por debajo de la clavícula, por el esternón, por la línea de
    # abajo del pectoral y, por fuera, hasta la línea que lo separa del
    # hombro, sin tocarlo.
    "pecho": {
        "delante": [[(90, 71), (84, 69.6), (77, 69.2), (71, 70.2), (68.4, 74), (64.6, 81), (60.8, 87.6), (61.6, 90.4),
                     (64.6, 93.4), (70, 96.8), (78.5, 98.5), (87, 98.5), (93, 98), (95.4, 97.2), (94, 94), (93.4, 86),
                     (92.2, 80), (90.6, 75)]],
    },
    # Hombro anterior y lateral: la cabeza del hombro, hasta la misma línea
    # que el pecho.
    "hombro": {
        "delante": [[(62, 66), (57.5, 65.8), (53, 67.6), (50, 71), (48.4, 77), (48.2, 84), (48.9, 91), (51, 96), (53.5, 99),
                     (56.5, 95), (59.3, 90.5), (60.6, 87.4), (64.4, 80.6), (68.2, 73.6), (67, 69)]],
    },
    "hombroPosterior": {
        "detras": [[(47, 76), (55, 70), (64, 71), (70, 77), (64, 86.5), (55, 95), (46.5, 99.5),
                    (43.6, 92), (44.2, 83)]],
    },
    "lumbar": {
        "detras": [[(89.5, 128), (96, 122), (99, 124), (99, 178), (93, 172), (88.5, 160), (87.5, 145)]],
    },
    # Aductores: la cara interna del muslo, sin meterse en el hueco entre las
    # piernas.
    "aductores": {
        "delante": [[(87.6, 190), (92, 188.8), (95.8, 190.6), (95.8, 205), (95.4, 215), (94.8, 226), (93.8, 236),
                     (92.6, 244), (91.2, 246), (90.2, 239), (89.2, 228), (88.2, 216), (87.2, 204), (87, 195)]],
    },
    # Abductores (glúteo medio): el hueco entre el dorsal y el glúteo mayor.
    "abductores": {
        "detras": [[(67.5, 152), (72, 150), (77, 148.5), (82, 147), (86, 146), (87.8, 150.5), (87.3, 156.5), (85, 158.4),
                    (80, 161.6), (75, 165), (70.5, 168.4), (67.6, 169.8), (67.1, 162)]],
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
        "detras": [[(82, 321), (92.5, 320.5), (92, 333), (91, 346), (89, 346), (85.5, 336), (83, 328)]],
    },
    # Isquios propios desde la 0.45.1: el de wger solo pintaba la tira de
    # fuera (bíceps femoral) y dejaba en gris la columna de dentro
    # (semitendinoso y semimembranoso), que se ve clarísima en el dibujo.
    "isquios": {
        "detras": [[(75.5, 215), (79, 209.5), (81.8, 212), (82, 230), (81.8, 250), (80.5, 265), (78, 272), (75.5, 268),
                    (74.5, 250), (74.8, 230)],
                   [(83.4, 206.5), (90, 203.5), (97, 200.8), (97.6, 215), (97.4, 235), (96.5, 250), (95, 260), (90, 262),
                    (85.5, 258), (83.4, 245), (83, 225)]],
    },
    "tibial": {
        # El tibial anterior: el vientre claro bajo la rodilla y su tendón.
        "delante": [[(75.5, 273), (79, 272.4), (82.8, 273.5), (83.8, 280), (83.8, 287), (82.8, 297), (80.3, 307),
                     (78.3, 313.5), (76.6, 307), (75.3, 303.7), (73.8, 294), (73.7, 286), (73.8, 280.3)]],
    },
}


# Eje de simetría: el cuerpo de wger tiene el centro del tronco en x = 98,5.
EJE = {("abdomen", "delante"): 98.5, ("pecho", "delante"): 98.5, ("oblicuos", "delante"): 98.5}


def reflejar(poligono, eje=ANCHO / 2):
    return [(2 * eje - x, y) for x, y in poligono]


# El cuerpo de wger no está centrado exactamente en x = 100: el cuello, visto
# de frente, queda 1,5 px a la derecha. Desplazamiento de la capa entera.
DESPLAZAMIENTO = {("cuello", "delante"): -1.5}


def trazado(poligono):
    puntos = " L ".join(f"{x:g} {y:g}" for x, y in poligono)
    return f'<path d="M {puntos} Z"/>'


def main():
    for musculo, vistas in CAPAS.items():
        for vista, poligonos in vistas.items():
            todos = poligonos + [reflejar(p, EJE.get((musculo, vista), ANCHO / 2)) for p in poligonos]
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
