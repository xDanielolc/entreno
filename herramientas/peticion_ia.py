"""Escribe la petición para la IA de imágenes de un dibujo de peticiones.json.
Uso: python herramientas/peticion_ia.py <slug>"""
import json, pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ESTILO = ("Crea una imagen nueva con exactamente el mismo estilo que el dibujo adjunto: línea negra sobre fondo blanco puro, "
          "trazo limpio de grosor uniforme, sin sombras, sin color, sin texto. El mismo hombre atlético, calvo y con cara de "
          "maniquí sin rasgos en todas las figuras (sin ojos, nariz, boca ni pelo), en pantalón corto y descalzo. ")


def peticion(p):
    if p.get("postura"):
        return (ESTILO + "Formato cuadrado, una sola figura entera, centrada y con margen. "
                f"Postura: {p['ejercicio']}, {p['vista']}: {p['postura']}.")
    return (ESTILO + "Imagen apaisada (16:9) con dos figuras de ese hombre una al lado de la otra y espacio blanco entre ellas: "
            "a la izquierda la posición de inicio y a la derecha la de final, del mismo tamaño, vistas desde el mismo ángulo, "
            "con los pies a la misma altura y el material (barra, banco, máquina) igual en las dos. "
            f"Ejercicio: {p['ejercicio']}, {p['vista']}. Inicio: {p['inicio']}. Final: {p['final']}.")


if __name__ == "__main__":
    lista = json.loads((RAIZ / "imagenes-ia" / "peticiones.json").read_text(encoding="utf8"))
    for p in lista:
        if p["slug"] == sys.argv[1]:
            print(peticion(p))
