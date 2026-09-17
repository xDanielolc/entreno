# -*- coding: utf-8 -*-
"""Genera los iconos PNG de la app (web/iconos). Provisionales hasta el diseño."""
from pathlib import Path
from PIL import Image, ImageDraw

DESTINO = Path(__file__).resolve().parent.parent / "web" / "iconos"
FONDO = (22, 24, 28)
ACENTO = (111, 207, 151)


def dibujar(tamano, margen_seguro):
    img = Image.new("RGB", (tamano, tamano), FONDO)
    d = ImageDraw.Draw(img)
    u = tamano * (1 - 2 * margen_seguro) / 100      # unidad dentro de la zona segura
    ox = oy = tamano * margen_seguro

    def rect(x0, y0, x1, y1, r):
        d.rounded_rectangle([ox + x0 * u, oy + y0 * u, ox + x1 * u, oy + y1 * u], radius=r * u, fill=ACENTO)

    rect(14, 47, 86, 53, 3)          # barra
    rect(22, 30, 32, 70, 4)          # discos grandes
    rect(68, 30, 78, 70, 4)
    rect(12, 38, 20, 62, 3)          # discos pequeños
    rect(80, 38, 88, 62, 3)
    return img


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    dibujar(192, 0.08).save(DESTINO / "icono-192.png")
    dibujar(512, 0.08).save(DESTINO / "icono-512.png")
    dibujar(180, 0.08).save(DESTINO / "icono-180.png")
    dibujar(512, 0.2).save(DESTINO / "icono-maskable-512.png")   # Android recorta los bordes
    (DESTINO / "icono.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        '<rect width="100" height="100" rx="22" fill="#16181c"/>'
        '<g fill="#6fcf97"><rect x="14" y="47" width="72" height="6" rx="3"/>'
        '<rect x="22" y="30" width="10" height="40" rx="4"/><rect x="68" y="30" width="10" height="40" rx="4"/>'
        '<rect x="12" y="38" width="8" height="24" rx="3"/><rect x="80" y="38" width="8" height="24" rx="3"/></g></svg>',
        encoding="utf-8")
    print("Iconos generados en", DESTINO)


if __name__ == "__main__":
    main()
