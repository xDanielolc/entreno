"""Escribe la petición para la IA de imágenes de un dibujo de peticiones.json.
Uso: python herramientas/peticion_ia.py <slug>"""
import json, pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ESTILO = ("Crea una imagen nueva con exactamente el mismo estilo que el dibujo adjunto: línea negra sobre fondo blanco puro, "
          "trazo limpio de grosor uniforme, sin sombras, sin color, sin texto y sin rellenos negros (el pantalón solo con "
          "contorno). El mismo hombre muy musculoso y definido (abdominales, pectorales y hombros marcados), calvo y con la "
          "cara completamente lisa de maniquí (sin ojos, nariz, boca, orejas ni pelo), sin camiseta, en pantalón corto y descalzo. ")

# Los fallos que Dan vio en la primera tanda (21-10-2026): se le recuerdan a la IA en cada petición de dos fases.
ERRORES = ("Muy importante: las dos figuras son dos fotogramas de la misma animación. El aparato (máquina, banco, barra, "
           "polea, cajón) es idéntico en las dos: mismo tamaño, misma posición y mismas patas; no aparece ni desaparece "
           "ninguna pieza ni ninguna polea. Lo que está apoyado (pies, rodillas, manos en el suelo) queda exactamente en el "
           "mismo sitio. El hombre tiene el mismo tamaño en las dos. En las máquinas de placas, la pila de placas está abajo "
           "al inicio y levantada al final. Las manos agarran igual en las dos figuras. ")


def peticion(p):
    if p.get("postura"):
        return (ESTILO + "Formato cuadrado, una sola figura entera, centrada y con margen. "
                f"Postura: {p['ejercicio']}, {p['vista']}: {p['postura']}.")
    return (ESTILO + "Imagen apaisada (16:9) con dos figuras de ese hombre una al lado de la otra y espacio blanco entre ellas: "
            "a la izquierda la posición de inicio y a la derecha la de final, del mismo tamaño, vistas desde el mismo ángulo, "
            "con los pies a la misma altura. " + ERRORES +
            f"Ejercicio: {p['ejercicio']}, {p['vista']}. Inicio: {p['inicio']}. Final: {p['final']}.")


if __name__ == "__main__":
    lista = json.loads((RAIZ / "imagenes-ia" / "peticiones.json").read_text(encoding="utf8"))
    for p in lista:
        if p["slug"] == sys.argv[1]:
            print(peticion(p))
