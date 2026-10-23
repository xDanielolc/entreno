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

from PIL import Image, ImageSequence

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from animar_imagenes import mascara  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "herramientas"))
from reencajar import REENCAJAR, reencajar  # noqa: E402
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
        # Sin columna en blanco, pero casi: solo la cruza una línea de suelo inclinada. Se corta por la más limpia.
        rango = range(int(ancho * 0.25), int(ancho * 0.75))
        x = min(rango, key=lambda c: columnas[c])
        if columnas[x] <= 3:
            mejor_tramo = (x, x)
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


def encajar(a, b, paso=2, desde=0.0):
    """Para las máquinas y bicis (lo grande que no se mueve es el aparato): el
    desplazamiento de `b` que más tinta hace coincidir con `a`, por
    correlación con la transformada de Fourier."""
    import numpy as np
    def m(im):
        g = mascara(im, 200).resize((im.width // paso, im.height // paso), Image.BOX)
        arr = np.asarray(g, dtype=np.float32) / 255
        if desde:
            # Solo cuenta lo de abajo (piernas y pies, que no se mueven): los brazos despistan.
            filas = np.nonzero(arr.sum(axis=1))[0]
            if len(filas):
                arr = arr.copy()
                arr[: int(filas[0] + (filas[-1] - filas[0]) * desde)] = 0
        return arr
    ma, mb = m(a), m(b)
    alto, ancho = ma.shape[0] + mb.shape[0], ma.shape[1] + mb.shape[1]
    corr = np.fft.irfft2(np.fft.rfft2(ma, (alto, ancho)) * np.conj(np.fft.rfft2(mb, (alto, ancho))), (alto, ancho))
    dy, dx = np.unravel_index(np.argmax(corr), corr.shape)
    dy = dy - alto if dy > alto // 2 else dy
    dx = dx - ancho if dx > ancho // 2 else dx
    return dx * paso, dy * paso


def animar(posturas, salida, modo="pies", duraciones=(900, 900), tope=600, margen=24, mover=None):
    if modo == "encajar":
        sx, sy = encajar(*posturas)
        anclas = [(0, 0), (-sx, -sy)]
    elif modo == "encajar-suelo":
        # De lado, donde más líneas cuadran; de alto, el suelo en su sitio (al ponerse de puntillas el cuerpo sube).
        sx, _ = encajar(*posturas, desde=0.55)
        abajo = [(mascara(im, 200).getbbox() or (0, 0, 0, im.height))[3] for im in posturas]
        anclas = [(0, 0), (-sx, abajo[1] - abajo[0])]
    else:
        anclas = [ancla(im, modo) for im in posturas]
    if mover:
        # Retoque a ojo («mover» en peticiones.json): la IA dibujó las posturas algo descolocadas.
        anclas[1] = (anclas[1][0] - mover[0], anclas[1][1] - mover[1])
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


def sin_suelo(im):
    """Borra las líneas de suelo (un tramo largo y seguido de tinta en la parte de abajo): la IA las dibuja
    a alturas distintas en cada postura y en la animación «saltan». Solo se borra el tramo, no la fila
    entera, para no comerse los pies."""
    im = im.copy()
    g = im.convert("L"); w, h = g.size; px = g.load()
    caja = mascara(im, 200).getbbox()
    if not caja:
        return im
    # El suelo está en lo más bajo del dibujo: se busca en la cuarta parte de abajo de lo dibujado.
    for y in range(int(caja[3] - (caja[3] - caja[1]) * 0.25), caja[3]):
        x, mejor = 0, (0, 0, 0)
        while x < w:
            if px[x, y] < 200:
                x0 = x
                while x < w and px[x, y] < 200:
                    x += 1
                if x - x0 > mejor[0]:
                    mejor = (x - x0, x0, x)
            x += 1
        if mejor[0] > w * 0.15:
            for yy in range(max(0, y - 2), min(h, y + 3)):
                for xx in range(mejor[1], mejor[2]):
                    im.putpixel((xx, yy), (255, 255, 255))
    return im


def centrar_en_barra(partes):
    """Una sola barra de lado a lado: al partir, cada postura se queda con un trozo de distinto largo.
    Se recorta cada postura a lo mismo a cada lado del centro de la figura, así la barra mide igual."""
    centros, anchos = [], []
    for im in partes:
        tinta = mascara(im, 200)
        x0, y0, x1, y1 = tinta.getbbox()
        _, barra_y = ancla(im, "barra")
        # El cuerpo, por debajo de la barra (la barra cruza de lado a lado y movería el centro).
        cuerpo = tinta.crop((x0, round(barra_y) + 12, x1, y1)).getbbox()
        cx = x0 + (cuerpo[0] + cuerpo[2]) / 2
        centros.append(cx)
        anchos.append(min(cx, im.width - cx))
    medio = min(anchos)
    return [im.crop((round(cx - medio), 0, round(cx + medio), im.height)) for im, cx in zip(partes, centros)]


def animar_mismo_lienzo(a, b, salida, tope=600, margen=24):
    """Dos posturas dibujadas sobre el mismo lienzo (la segunda es la primera editada por la IA: «cambia solo la
    postura»): el aparato ya está en su sitio en las dos, así que no se encajan, solo se recortan juntas."""
    b = b.resize(a.size, Image.LANCZOS)
    cajas = [mascara(im, 200).getbbox() for im in (a, b)]
    x0, y0 = min(c[0] for c in cajas), min(c[1] for c in cajas)
    x1, y1 = max(c[2] for c in cajas), max(c[3] for c in cajas)
    lado = max(x1 - x0, y1 - y0) + 2 * margen
    marcos = []
    for im in (a, b):
        lienzo = Image.new("RGB", (lado, lado), "white")
        lienzo.paste(im.crop((x0, y0, x1, y1)), ((lado - (x1 - x0)) // 2, (lado - (y1 - y0)) // 2))
        marcos.append(lienzo.resize((tope, tope), Image.LANCZOS) if lado > tope else lienzo)
    marcos[0].save(salida, "WEBP", save_all=True, append_images=marcos[1:], duration=[900, 900], loop=0, quality=82, method=6)


def partir_en_tres(im):
    """Tres figuras en fila: corta por los dos huecos en blanco más anchos (uno en cada mitad)."""
    tinta = mascara(im, 200)
    ancho, alto = tinta.size
    columnas = [sum(1 for y in range(0, alto, 2) if tinta.getpixel((x, y))) for x in range(ancho)]

    def hueco(desde, hasta):
        mejor, inicio, tramo = 0, None, (desde + hasta) // 2
        for x in range(desde, hasta):
            if columnas[x] <= 1:
                inicio = x if inicio is None else inicio
                if x - inicio > mejor:
                    mejor, tramo = x - inicio, (inicio + x) // 2
            else:
                inicio = None
        return tramo

    c1 = hueco(int(ancho * 0.15), int(ancho * 0.5))
    c2 = hueco(int(ancho * 0.5), int(ancho * 0.85))
    return im.crop((0, 0, c1, alto)), im.crop((c1, 0, c2, alto)), im.crop((c2, 0, ancho, alto))


def procesar(origen, modo="pies", espejo=False, solo=False, invertir=False, mover=None, escala=None, recorte=None, grosor=None):
    nombre = origen.stem.split("-", 1)[1]
    if origen.stem.startswith("completo-"):
        # Un dibujo hecho por una persona que venía cortado, completado por la IA: va aparte del de la IA.
        nombre += "-completo"
    # ChatGPT deja el fondo gris muy claro: lo casi blanco pasa a blanco puro.
    im = Image.open(origen).convert("RGB").point(lambda v: 255 if v > 232 else v)
    if grosor:
        # «grosor» en peticiones.json: engorda el trazo (Dan quería la línea más gruesa en algún dibujo).
        from PIL import ImageFilter
        im = im.filter(ImageFilter.MinFilter(grosor))
    SALIDA.mkdir(parents=True, exist_ok=True)
    fija = SALIDA / f"{nombre}-quieta.webp"
    if origen.stem.startswith("pasos-"):
        # «pasos-<nombre>-1» y «-2»: la segunda es la primera con solo la postura cambiada (mismo aparato).
        nombre = origen.stem[len("pasos-"):-2]
        fija = SALIDA / f"{nombre}-quieta.webp"
        segunda = Image.open(origen.with_name(origen.stem[:-2] + "-2" + origen.suffix)).convert("RGB").point(lambda v: 255 if v > 232 else v)
        # Al tamaño de la primera antes de nada: la IA devuelve la segunda más grande y, al reducirla, el trazo
        # quedaba más fino (Dan: «la línea igual en ambos lados de la animación»).
        if invertir:
            im, segunda = segunda, im
        segunda = segunda.resize(im.size, Image.LANCZOS)
        if grosor:
            # La IA a veces dibuja la segunda en gris: se oscurece el trazo y se engorda igual que la primera.
            from PIL import ImageFilter
            segunda = segunda.point(lambda v: 0 if v < 150 else (255 if v > 235 else int((v - 150) * 3)))
            segunda = segunda.filter(ImageFilter.MinFilter(grosor))
        animar_mismo_lienzo(im, segunda, SALIDA / f"{nombre}.webp")
        if nombre in REENCAJAR and REENCAJAR[nombre].get("ia"):
            op = REENCAJAR[nombre]
            reencajar(nombre, op.get("zona"), mover=op.get("mover"), archivo=SALIDA / f"{nombre}.webp", fijo_desde=op.get("fijo_desde"), subir=op.get("subir"))
        quieta(im, fija)
        return nombre, True
    if origen.stem.startswith("tres-"):
        # «tres-<nombre>»: las dos piernas alternas (correr, escalador) en tres figuras: una pierna delante, el paso
        # por el medio y la otra delante. Se anima ida y vuelta (1, 2, 3, 2), que es lo que la IA no sabe hacer con dos.
        partes = [recortar(x, 0) for x in partir_en_tres(im)]
        # Sin reencajar.py, que solo sabe de dos fotogramas: el ancla de peticiones.json basta.
        animar([partes[0], partes[1], partes[2], partes[1]], SALIDA / f"{nombre}.webp", modo, duraciones=(450, 300, 450, 300), mover=mover)
        quieta(partes[0], fija)
        return nombre, True
    if origen.stem.startswith(("fases-", "completo-")):
        if origen.stem.startswith("completo-"):
            # Sin suelo antes de partir: una línea de suelo de lado a lado no deja hueco entre las dos posturas.
            im = sin_suelo(im)
        partes = partir(im)
        if modo == "barra-centrada":
            partes, modo = centrar_en_barra(partes), "barra"
        inicio, final = (recortar(sin_suelo(x) if origen.stem.startswith("completo-") else x, 0) for x in partes)
        if solo:
            # Las dos figuras salieron casi iguales (pasa al alternar piernas): basta la primera, quieta.
            quieta(inicio, fija)
            return nombre, False
        if espejo:
            # La IA dibujó la segunda figura mirando al otro lado: se le da la vuelta.
            final = final.transpose(Image.FLIP_LEFT_RIGHT)
        if escala:
            # La IA dibujó la segunda figura más grande o más pequeña («escala» en peticiones.json, medida a ojo).
            final = final.resize((round(final.width * escala), round(final.height * escala)), Image.LANCZOS)
        if invertir:
            # Empieza por la postura final (las negativas: arriba y bajar despacio).
            inicio, final = final, inicio
        animar([inicio, final], SALIDA / f"{nombre}.webp", modo, mover=mover)
        if nombre in REENCAJAR and REENCAJAR[nombre].get("ia"):
            # Afinado píxel a píxel por lo que no se mueve (herramientas/reencajar.py).
            op = REENCAJAR[nombre]
            reencajar(nombre, op.get("zona"), mover=op.get("mover"), archivo=SALIDA / f"{nombre}.webp", fijo_desde=op.get("fijo_desde"), subir=op.get("subir"))
        quieta(inicio, fija)
        return nombre, True
    if recorte:
        # «recorte» en peticiones.json (fracciones izquierda, arriba, derecha, abajo): quitar aparato o aire de sobra.
        im = im.crop((round(im.width * recorte[0]), round(im.height * recorte[1]), round(im.width * recorte[2]), round(im.height * recorte[3])))
    quieta(im, fija)
    return nombre, False


def leer_tabla():
    """De peticiones.json: nombre del dibujo → {"ejercicios": [...], "ancla": ...}."""
    if not PETICIONES.exists():
        return {}
    return {p["slug"]: {"ejercicios": [p["ejercicio"], *p.get("tambien", [])], "ancla": p.get("ancla", "pies"), "espejo": p.get("espejo", False), "solo": p.get("solo", False), "usar": p.get("usar"), "sinAlias": p.get("sinAlias", False), "invertir": p.get("invertir", False), "mover": p.get("mover"), "escala": p.get("escala"), "recorte": p.get("recorte"), "grosor": p.get("grosor"), "duracion": p.get("duracion")}
            for p in json.loads(PETICIONES.read_text(encoding="utf8"))}


def ejercicios_de(entrada):
    """La tabla admite una lista de ejercicios o {"ejercicios": [...], "ancla": "barra"}."""
    if not entrada:
        return []
    return entrada if isinstance(entrada, list) else entrada.get("ejercicios", [])


# Ejercicios que se aguantan quietos: dibujo sin animar (Dan, 22-10-2026: «en estática que no se mueva»).
# Dibujos que se quedan como están (Dan eligió la versión de antes en una revisión): no se rehacen.
CONGELADOS = {"cruces-en-polea-completo",
              "estiramiento-de-pectoral-en-el-marco-de-la-puerta"}  # versiones que Dan prefiere o retocadas a mano (23-10)

QUIETOS = {"Plancha lateral": "imagenes/ejercicios/anim/plancha-lateral-quieta.webp"}


# Completados que no se apoyan en el suelo: se encajan por lo que no se mueve (las barras de los fondos).
ANCLA_COMPLETO = {"fondos-asistidos": "encajar", "fondos-de-triceps-ek": "encajar", "fondos-en-paralelas-negativos": "encajar"}


# El dibujo de antes de «Fondos asistidos» se ve como fondos en paralelas: Dan lo quiere para «Fondos de pecho».
# Y los que eran dos variantes (comparativa del 22-10-2026): el dibujo de antes pasa a la otra variante.
OTRO_DIBUJO = {"Fondos de pecho": "Fondos asistidos",
               "Encogimientos de trapecio con barra": "Encogimientos de trapecio",
               "Press de hombro a una mano": "Press de hombro con mancuernas",
               "Peso muerto rumano con mancuernas": "Peso muerto con mancuernas",
               "Pájaros en polea": "Pájaros en máquina",
               "Press militar sentado": "Press militar",
               "Remo en polea al pecho": "Remo en polea",
               "Sentadilla búlgara con barra": "Sentadilla búlgara",
               "Plancha lateral dinámica": "Plancha lateral"}


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
        if nombre.endswith("-completo"):
            continue
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
            # Los alias (otro nombre del mismo ejercicio) copian la imagen, salvo con "sinAlias"
            # (Dan, 22-10-2026: el dibujo nuevo de fondos, solo para los de tríceps).
            for clave, otro in ejercicios.items():
                if otro.get("aliasDe") == ej and not entrada.get("sinAlias"):
                    ejercicios[clave] = {**datos, "aliasDe": ej}
    # Dibujos que pasan a otro ejercicio por decisión de Dan (ejercicio → ejercicio cuyo dibujo de antes usa).
    for destino, origen in OTRO_DIBUJO.items():
        if origen in antes:
            ejercicios[destino] = {k: v for k, v in antes[origen].items() if k != "aliasDe"}
    # Dibujos hechos por una persona que venían cortados, completados por la IA: «completo-<nombre>»,
    # con <nombre> el del dibujo animado de antes (web/imagenes/ejercicios/anim/<nombre>.webp). Sustituyen a ese
    # dibujo donde se use, y no donde Dan eligió el de la IA.
    for nombre, animada, origen in hechos:
        if not nombre.endswith("-completo"):
            continue
        base = nombre[:-len("-completo")]
        for ej, datos in list(ejercicios.items()):
            if datos.get("archivo", "").endswith(f"/anim/{base}.webp"):
                ejercicios[ej] = {**{k: v for k, v in datos.items() if k not in ("estatica", "animada")},
                                  "archivo": f"imagenes/ejercicios/ia/{nombre}.webp", "estatica": f"imagenes/ejercicios/ia/{nombre}-quieta.webp",
                                  "animada": animada, "completadoCon": "Gemini" if origen == "gemini" else "ChatGPT"}
    for ej, archivo in QUIETOS.items():
        if ej in ejercicios:
            ejercicios[ej] = {**ejercicios[ej], "archivo": archivo, "estatica": archivo, "animada": False}
    CREDITOS.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf8")


def main():
    filtro = sys.argv[1] if len(sys.argv) > 1 else None
    tabla = leer_tabla()
    hechos = []
    # «descartes» guarda los que salieron mal: no se usan.
    for carpeta in sorted(p for p in ORIGENES.iterdir() if p.is_dir() and p.name != "descartes"):
        for origen in sorted(carpeta.glob("*.jpg")) + sorted(carpeta.glob("*.png")):
            if not origen.stem.startswith(("fases-", "quieto-", "completo-", "pasos-", "tres-")):
                continue
            if origen.stem.startswith("pasos-") and not origen.stem.endswith("-1"):
                continue
            nombre = origen.stem[len("pasos-"):-2] if origen.stem.startswith("pasos-") else origen.stem.split("-", 1)[1]
            if filtro and nombre != filtro:
                continue
            entrada = tabla.get(nombre)
            modo = entrada.get("ancla", "pies") if isinstance(entrada, dict) else "pies"
            if origen.stem.startswith("completo-"):
                # Las dos posturas de un dibujo completado coinciden casi enteras: se encajan donde más líneas cuadran.
                modo = ANCLA_COMPLETO.get(nombre, "encajar-suelo")
            opciones = entrada if isinstance(entrada, dict) else {}
            salida = nombre + ("-completo" if origen.stem.startswith("completo-") else "")
            if salida in CONGELADOS:
                # Dan prefirió una versión anterior: el WebP se queda como está en Git.
                hechos.append((salida, not origen.stem.startswith("quieto-"), carpeta.name))
                print("congelada " + salida)
                continue
            nombre, animada = procesar(origen, modo, bool(opciones.get("espejo")), bool(opciones.get("solo")), bool(opciones.get("invertir")), opciones.get("mover"), opciones.get("escala"), opciones.get("recorte"), None if origen.stem.startswith("completo-") else opciones.get("grosor"))
            if animada and opciones.get("duracion"):
                # «duracion» en peticiones.json (ms por fotograma): dos vistas de una postura quieta que se alternan
                # despacio (Dan: «sobre la cabeza, alternar las dos perspectivas cada 2 s»), no un movimiento.
                anim = Image.open(SALIDA / f"{nombre}.webp")
                marcos = [m.convert("RGB").copy() for m in ImageSequence.Iterator(anim)]
                marcos[0].save(SALIDA / f"{nombre}.webp", "WEBP", save_all=True, append_images=marcos[1:],
                               duration=opciones["duracion"], loop=0, quality=82, method=6)
            hechos.append((nombre, animada, carpeta.name))
            print(("animada " if animada else "quieta  ") + nombre)
    apuntar(hechos)


if __name__ == "__main__":
    main()
