"""Convierte los dibujos hechos con IA (Gemini o ChatGPT) en las imágenes de
la app.

Cada dibujo original está en `imagenes-ia/<origen>/fases-<nombre>.jpg`: una
imagen apaisada con el mismo hombre dos veces, a la izquierda el inicio del
ejercicio y a la derecha el final. Este programa:

  1. parte la imagen por el hueco blanco entre las dos figuras;
  2. recorta cada postura y las encaja (lo que no se mueve, en el mismo sitio)
     con las funciones de `animar_imagenes.py`;
  3. guarda `web/imagenes/ejercicios/ia/<nombre>.webp` (animada, dos posturas)
     y `<nombre>-quieta.webp` (la primera postura, para donde no se anima);
  4. apunta en `web/imagenes/creditos.json` qué ejercicios la usan.

Los estiramientos y posturas de yoga se piden con una sola figura
(`quieto-<nombre>.jpg`): entonces no hay animación, solo la imagen.

Uso: python herramientas/imagenes_ia.py            (todas)
     python herramientas/imagenes_ia.py sentadilla (una)
"""
import json
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from animar_imagenes import mascara  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGENES = RAIZ / "imagenes-ia"
SALIDA = RAIZ / "web" / "imagenes" / "ejercicios" / "ia"
CREDITOS = RAIZ / "web" / "imagenes" / "creditos.json"
ANTES = ORIGENES / "creditos-antes.json"   # creditos.json de antes de los dibujos con IA (la 0.59)
PETICIONES = ORIGENES / "peticiones.json"   # cada dibujo: su ejercicio, cómo se pidió y su ancla


def partir(im):
    """Las dos figuras: corta por la columna en blanco más ancha del centro."""
    tinta = mascara(im, 200)
    ancho, alto = tinta.size
    columnas = [sum(1 for y in range(0, alto, 2) if tinta.getpixel((x, y))) for x in range(ancho)]
    mejor, inicio, mejor_tramo = 0, None, None
    for x in range(int(ancho * 0.25), int(ancho * 0.75)):
        if columnas[x] == 0:
            inicio = x if inicio is None else inicio
            if x - inicio > mejor:
                mejor, mejor_tramo = x - inicio, (inicio, x)
        else:
            inicio = None
    if not mejor_tramo:
        # A veces la IA pone una figura encima de la otra: entonces se corta por la fila en blanco.
        filas = [sum(1 for x in range(0, ancho, 2) if tinta.getpixel((x, y))) for y in range(alto)]
        tramo = max(((y0, y1) for y0 in range(int(alto * 0.25), int(alto * 0.75)) if filas[y0] == 0
                     for y1 in [next((y for y in range(y0, alto) if filas[y]), alto)]), key=lambda t: t[1] - t[0], default=None)
        if tramo:
            corte = (tramo[0] + tramo[1]) // 2
            return im.crop((0, 0, ancho, corte)), im.crop((0, corte, ancho, alto))
    corte = (mejor_tramo[0] + mejor_tramo[1]) // 2 if mejor_tramo else ancho // 2
    return im.crop((0, 0, corte, alto)), im.crop((corte, 0, ancho, alto))


def recortar(im, margen=12):
    caja = mascara(im, 200).getbbox()
    if not caja:
        return im
    x0, y0, x1, y1 = caja
    return im.crop((max(0, x0 - margen), max(0, y0 - margen), min(im.width, x1 + margen), min(im.height, y1 + margen)))


def ancla(im, modo):
    """Lo que no se mueve entre las dos posturas: los pies (centro de la
    franja de abajo y el borde de abajo) o, en lo que se hace colgado, la
    barra (franja de arriba y borde de arriba). Las dos figuras salen del
    mismo dibujo, con la misma escala y el mismo suelo: basta con ponerlas
    con su ancla en el mismo punto."""
    tinta = mascara(im, 200)
    caja = tinta.getbbox() or (0, 0, im.width, im.height)
    x0, y0, x1, y1 = caja
    if modo == "barra":
        # La barra: la fila con la tinta más ancha (de punta a punta) en la mitad de arriba.
        mejor = (0, y0, x0, x1)
        for y in range(y0, y0 + (y1 - y0) // 2):
            fila = tinta.crop((x0, y, x1, y + 1)).getbbox()
            if fila and fila[2] - fila[0] > mejor[0]:
                mejor = (fila[2] - fila[0], y, x0 + fila[0], x0 + fila[2])
        return (mejor[2] + mejor[3]) / 2, mejor[1]
    if modo == "cabeza":
        # De frente y con los pies en el suelo: la cabeza marca el centro y los pies, el suelo.
        franja = tinta.crop((x0, y0, x1, y0 + max(8, (y1 - y0) // 16))).getbbox()
        return x0 + ((franja[0] + franja[2]) / 2 if franja else (x1 - x0) / 2), y1
    if modo == "delante":
        # Lo de delante (los pies o la mano, a la derecha) se queda quieto.
        return x1, y1
    if modo == "atras":
        # Lo de atrás (los pies o las rodillas, a la izquierda) se queda quieto: el borde izquierdo y el de abajo.
        return x0, y1
    alto = max(8, (y1 - y0) // 16)
    if modo == "pies-sin-suelo":
        # Como «pies», pero saltando la línea del suelo (la IA la dibuja de distinto largo en cada figura).
        y = y1
        while y > y0 and sum(1 for v in tinta.crop((x0, y - 1, x1, y)).get_flattened_data() if v) > (x1 - x0) // 3:
            y -= 1
        y -= 3
        franja = tinta.crop((x0, y - alto, x1, y)).getbbox() or (0, 0, x1 - x0, 1)
        return x0 + (franja[0] + franja[2]) / 2, y1
    franja = tinta.crop((x0, y1 - alto, x1, y1) if modo == "pies" else (x0, y0, x1, y0 + alto))
    fb = franja.getbbox() or (0, 0, x1 - x0, 1)
    return x0 + (fb[0] + fb[2]) / 2, (y1 if modo == "pies" else y0)


def encajar(a, b, paso=2):
    """Para las máquinas y bicis (lo grande que no se mueve es el aparato): el
    desplazamiento de `b` que más tinta hace coincidir con `a`, por
    correlación con la transformada de Fourier."""
    import numpy as np
    def m(im):
        g = mascara(im, 200).resize((im.width // paso, im.height // paso), Image.BOX)
        return np.asarray(g, dtype=np.float32) / 255
    ma, mb = m(a), m(b)
    alto, ancho = ma.shape[0] + mb.shape[0], ma.shape[1] + mb.shape[1]
    corr = np.fft.irfft2(np.fft.rfft2(ma, (alto, ancho)) * np.conj(np.fft.rfft2(mb, (alto, ancho))), (alto, ancho))
    dy, dx = np.unravel_index(np.argmax(corr), corr.shape)
    dy = dy - alto if dy > alto // 2 else dy
    dx = dx - ancho if dx > ancho // 2 else dx
    return dx * paso, dy * paso


def animar(posturas, salida, modo="pies", duraciones=(900, 900), tope=600, margen=24):
    if modo == "encajar":
        sx, sy = encajar(*posturas)
        anclas = [(0, 0), (-sx, -sy)]
    else:
        anclas = [ancla(im, modo) for im in posturas]
    cajas = [mascara(im, 200).getbbox() or (0, 0, im.width, im.height) for im in posturas]
    x0 = min(c[0] - a[0] for c, a in zip(cajas, anclas))
    y0 = min(c[1] - a[1] for c, a in zip(cajas, anclas))
    x1 = max(c[2] - a[0] for c, a in zip(cajas, anclas))
    y1 = max(c[3] - a[1] for c, a in zip(cajas, anclas))
    lado = round(max(x1 - x0, y1 - y0) + 2 * margen)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    marcos = []
    for im, (ax, ay) in zip(posturas, anclas):
        lienzo = Image.new("RGB", (lado, lado), "white")
        # Pegado con máscara: el blanco de una postura no tapa nada.
        lienzo.paste(im, (round(lado / 2 - cx - ax), round(lado / 2 - cy - ay)))
        marcos.append(lienzo)
    if lado > tope:
        marcos = [m.resize((tope, tope), Image.LANCZOS) for m in marcos]
    marcos[0].save(salida, "WEBP", save_all=True, append_images=marcos[1:], duration=list(duraciones), loop=0, quality=82, method=6)


def quieta(im, salida, tope=600):
    """Una sola postura, centrada en un cuadrado blanco."""
    im = recortar(im, 24)
    lado = max(im.size)
    lienzo = Image.new("RGB", (lado, lado), "white")
    lienzo.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2))
    if lado > tope:
        lienzo = lienzo.resize((tope, tope), Image.LANCZOS)
    lienzo.save(salida, "WEBP", quality=82, method=6)


def procesar(origen, modo="pies", espejo=False, solo=False):
    nombre = origen.stem.split("-", 1)[1]
    # ChatGPT deja el fondo gris muy claro: lo casi blanco pasa a blanco puro.
    im = Image.open(origen).convert("RGB").point(lambda v: 255 if v > 232 else v)
    SALIDA.mkdir(parents=True, exist_ok=True)
    fija = SALIDA / f"{nombre}-quieta.webp"
    if origen.stem.startswith("fases-"):
        inicio, final = (recortar(x, 0) for x in partir(im))
        if solo:
            # Las dos figuras salieron casi iguales (pasa al alternar piernas): basta la primera, quieta.
            quieta(inicio, fija)
            return nombre, False
        if espejo:
            # La IA dibujó la segunda figura mirando al otro lado: se le da la vuelta.
            final = final.transpose(Image.FLIP_LEFT_RIGHT)
        animar([inicio, final], SALIDA / f"{nombre}.webp", modo)
        quieta(inicio, fija)
        return nombre, True
    quieta(im, fija)
    return nombre, False


def leer_tabla():
    """De peticiones.json: nombre del dibujo → {"ejercicios": [...], "ancla": ...}."""
    if not PETICIONES.exists():
        return {}
    return {p["slug"]: {"ejercicios": [p["ejercicio"], *p.get("tambien", [])], "ancla": p.get("ancla", "pies"), "espejo": p.get("espejo", False), "solo": p.get("solo", False), "usar": p.get("usar")}
            for p in json.loads(PETICIONES.read_text(encoding="utf8"))}


def ejercicios_de(entrada):
    """La tabla admite una lista de ejercicios o {"ejercicios": [...], "ancla": "barra"}."""
    if not entrada:
        return []
    return entrada if isinstance(entrada, list) else entrada.get("ejercicios", [])


def hecho_por_persona(datos):
    """Dibujos de Everkinetic o wger (no los muñecos generados por código)."""
    return bool(datos) and "munecos/" not in datos.get("archivo", "") and datos.get("fuente") != "ia"


def apuntar(hechos):
    """Pone la imagen nueva en los ejercicios que la usan (y en sus alias)."""
    tabla = leer_tabla()
    creditos = json.loads(CREDITOS.read_text(encoding="utf8"))
    ejercicios = creditos["ejercicios"]
    antes = json.loads(ANTES.read_text(encoding="utf8"))["ejercicios"] if ANTES.exists() else {}
    for nombre, animada, origen in hechos:
        entrada = tabla.get(nombre) or {}
        for ej in ejercicios_de(entrada):
            previo = antes.get(ej)
            # Regla de Dan (21-10-2026): si ya había un dibujo hecho por una persona (Everkinetic, wger),
            # se queda ese salvo que en la comparativa elija el de la IA ("usar": "ia"). "usar": "antes"
            # fuerza el de antes también cuando era un muñeco.
            usar = entrada.get("usar") if isinstance(entrada, dict) else None
            if usar is None:
                usar = "antes" if hecho_por_persona(previo) else "ia"
            if usar == "antes" and previo:
                for clave in [ej] + [k for k, o in ejercicios.items() if o.get("aliasDe") == ej]:
                    if clave in antes:
                        ejercicios[clave] = antes[clave]
                continue
            datos = {
                "archivo": f"imagenes/ejercicios/ia/{nombre}.webp" if animada else f"imagenes/ejercicios/ia/{nombre}-quieta.webp",
                "estatica": f"imagenes/ejercicios/ia/{nombre}-quieta.webp",
                "animada": animada,
                "fuente": "ia",
                "autor": "Gemini" if origen == "gemini" else "ChatGPT",
            }
            ejercicios[ej] = datos
            # Los alias (otro nombre del mismo ejercicio) copian la imagen.
            for clave, otro in ejercicios.items():
                if otro.get("aliasDe") == ej:
                    ejercicios[clave] = {**datos, "aliasDe": ej}
    CREDITOS.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf8")


def main():
    filtro = sys.argv[1] if len(sys.argv) > 1 else None
    tabla = leer_tabla()
    hechos = []
    # «descartes» guarda los que salieron mal: no se usan.
    for carpeta in sorted(p for p in ORIGENES.iterdir() if p.is_dir() and p.name != "descartes"):
        for origen in sorted(carpeta.glob("*.jpg")) + sorted(carpeta.glob("*.png")):
            if not origen.stem.startswith(("fases-", "quieto-")):
                continue
            nombre = origen.stem.split("-", 1)[1]
            if filtro and nombre != filtro:
                continue
            entrada = tabla.get(nombre)
            modo = entrada.get("ancla", "pies") if isinstance(entrada, dict) else "pies"
            opciones = entrada if isinstance(entrada, dict) else {}
            _, animada = procesar(origen, modo, bool(opciones.get("espejo")), bool(opciones.get("solo")))
            hechos.append((nombre, animada, carpeta.name))
            print(("animada " if animada else "quieta  ") + nombre)
    apuntar(hechos)


if __name__ == "__main__":
    main()
