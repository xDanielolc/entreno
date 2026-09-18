# -*- coding: utf-8 -*-
"""
Descarga de wger (licencia Creative Commons BY-SA):

  · la silueta del cuerpo y la capa de cada músculo, para el mapa de
    recuperación (web/imagenes/musculos);
  · una imagen por ejercicio del catálogo (web/imagenes/ejercicios).

wger permite usarlas y redistribuirlas citando al autor y manteniendo la
licencia, así que se guarda el autor de cada imagen en creditos.json y la app
lo muestra en Ajustes.

Uso:
    herramientas\\.venv\\Scripts\\python.exe herramientas\\descargar_imagenes.py
"""

import json
import re
import ssl
import sys
import unicodedata
import urllib.request
from pathlib import Path

API = "https://wger.de/api/v2"
RAIZ = Path(__file__).resolve().parent.parent
IMAGENES = RAIZ / "web" / "imagenes"
CATALOGO_JS = RAIZ / "web" / "js" / "catalogo.js"
CONTEXTO = ssl.create_default_context()

# Nuestros músculos y su equivalente en wger (los que no aparecen en el dibujo
# se quedan sin capa: se ven en la lista, pero no en la silueta).
MUSCULOS_WGER = {
    "trapecio": 9, "hombro": 2, "pecho": 4, "biceps": 1, "triceps": 5,
    "abdomen": 6, "oblicuos": 14, "dorsal": 12, "gluteo": 8,
    "cuadriceps": 10, "isquios": 11, "gemelo": 7,
}


def bajar(url):
    req = urllib.request.Request(url, headers={"User-Agent": "app-entrenamiento/1.0"})
    with urllib.request.urlopen(req, timeout=90, context=CONTEXTO) as r:
        return r.read()


def pedir(url):
    return json.loads(bajar(url).decode("utf-8"))


def normalizar(texto):
    sin = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]", " ", sin.lower()).strip()


def palabras(texto):
    vacias = {"de", "del", "la", "el", "en", "con", "a", "por", "y", "the", "of", "with", "barbell", "dumbbell"}
    return {p for p in normalizar(texto).split() if p and p not in vacias}


# ---------------------------------------------------------------------------
# Mapa del cuerpo
# ---------------------------------------------------------------------------

# Tres capas de wger (hombro, pecho y bíceps) vienen con otro lienzo que el
# cuerpo: 362 de alto y desplazadas 7 píxeles. Se igualan al del cuerpo para
# que caigan justo encima.
def alinear(datos):
    texto = datos.decode("utf-8")
    if "translate(-395.71431,-323.50506)" in texto:
        texto = texto.replace("translate(-395.71431,-323.50506)", "translate(-395.71431,-316.50506)")
        texto = texto.replace('height="362"', 'height="369"', 1)
    return texto.encode("utf-8")


def descargar_musculos():
    destino = IMAGENES / "musculos"
    destino.mkdir(parents=True, exist_ok=True)
    creditos = {}

    for cara in ("front", "back"):
        datos = bajar(f"https://wger.de/static/images/muscles/muscular_system_{cara}.svg")
        (destino / f"cuerpo-{'delante' if cara == 'front' else 'detras'}.svg").write_bytes(datos)

    catalogo = {m["id"]: m for m in pedir(f"{API}/muscle/?limit=50&format=json")["results"]}
    for nombre, idWger in MUSCULOS_WGER.items():
        info = catalogo.get(idWger)
        if not info:
            print(f"  aviso: wger ya no tiene el músculo {idWger} ({nombre})")
            continue
        archivo = destino / f"{nombre}.svg"
        archivo.write_bytes(alinear(bajar(info["image_url_main"])))
        creditos[nombre] = {
            "archivo": f"imagenes/musculos/{nombre}.svg",
            "wger": info["name"],
            "delante": info["is_front"],
        }
        print(f"  músculo {nombre:<12} ← {info['name']}")
    return creditos


# ---------------------------------------------------------------------------
# Imágenes de los ejercicios
# ---------------------------------------------------------------------------

def indice_de_ejercicios():
    ejercicios = []
    siguiente = f"{API}/exerciseinfo/?limit=100&format=json"
    while siguiente:
        datos = pedir(siguiente)
        for base in datos["results"]:
            imagenes = base.get("images") or []
            if not imagenes:
                continue
            principal = next((i for i in imagenes if i.get("is_main")), imagenes[0])
            nombres = [t["name"] for t in base.get("translations", []) if t.get("name")]
            if nombres:
                ejercicios.append({
                    "nombres": nombres,
                    "imagen": principal["image"],
                    "autor": principal.get("license_author") or "wger",
                })
        siguiente = datos.get("next")
        print(f"  {len(ejercicios)} ejercicios con imagen…", end="\r")
    print()
    return ejercicios


# Cuando el parecido de nombres engaña, se dice a mano con qué ejercicio de
# wger se corresponde (o que no tiene imagen buena: None).
EXCEPCIONES = {
    "Flexiones": "Push-Up",
    "Flexiones a una mano": None,
    "Fondos asistidos": "Fondos",
    "Fondos en banco": None,
    "Extensión de tríceps en máquina": None,
    "Curl de bíceps en máquina": None,
    "Curl de bíceps con mancuernas": None,
    "Press inclinado": "Press inclinado con mancuernas",
    "Jalón al pecho": "Jalón al pecho con agarre neutro",
    "Jalón con agarre estrecho": "Jalón al Pecho con Agarre Cerrado",
    "Elevaciones laterales": "Lateral Raises",
    "Encogimientos de trapecio": "Encogimientos de hombros con mancuernas",
    "Extensión de cuádriceps": "Leg Extension",
    "Puente de glúteo": "Puente de glúteos",
    "Elevación de gemelos": "Elevación de talón de pie",
    "Subida al cajón": None,
    "Curl nórdico": None,
    "Crunch en polea": None,
    "Crunch inverso": None,
    "Flexión lateral de cuello": None,
    "Saltos al cajón": None,
}


def mejor_coincidencia(nombre, indice):
    if nombre in EXCEPCIONES:
        pedido = EXCEPCIONES[nombre]
        if pedido is None:
            return None
        for datos in indice:
            for candidato in datos["nombres"]:
                if normalizar(candidato) == normalizar(pedido):
                    return (datos, candidato)
        return None  # si el elegido ya no está en wger, mejor sin imagen que una equivocada
    objetivo = palabras(nombre)
    mejor, puntos_mejor = None, 0
    for datos in indice:
        for candidato in datos["nombres"]:
            otras = palabras(candidato)
            comunes = objetivo & otras
            if not comunes:
                continue
            puntos = len(comunes) / max(1, len(objetivo | otras))
            if puntos > puntos_mejor:
                mejor, puntos_mejor = (datos, candidato), puntos
    return mejor if puntos_mejor >= 0.45 else None


def descargar_ejercicios():
    destino = IMAGENES / "ejercicios"
    destino.mkdir(parents=True, exist_ok=True)
    nombres = re.findall(r"ej\('([^']+)'", CATALOGO_JS.read_text(encoding="utf-8"))
    print(f"Catálogo: {len(nombres)} ejercicios. Buscando imágenes…")
    indice = indice_de_ejercicios()

    creditos, sin_imagen = {}, []
    for nombre in nombres:
        elegido = mejor_coincidencia(nombre, indice)
        if not elegido:
            sin_imagen.append(nombre)
            continue
        datos, coincide = elegido
        archivo = re.sub(r"[^a-z0-9]+", "-", normalizar(nombre)).strip("-") + Path(datos["imagen"]).suffix
        ruta = destino / archivo
        try:
            if not ruta.exists():
                ruta.write_bytes(bajar(datos["imagen"]))
        except Exception as e:  # noqa: BLE001
            print(f"  fallo con {nombre}: {e!r}")
            sin_imagen.append(nombre)
            continue
        creditos[nombre] = {"archivo": f"imagenes/ejercicios/{archivo}",
                            "autor": datos["autor"], "nombreEnWger": coincide}
        print(f"  {nombre:<34} ← {coincide}")
    return creditos, sin_imagen


def main():
    IMAGENES.mkdir(parents=True, exist_ok=True)
    print("Mapa del cuerpo…")
    musculos = descargar_musculos()
    ejercicios, sin_imagen = descargar_ejercicios()

    (IMAGENES / "creditos.json").write_text(json.dumps({
        "fuente": "wger.de",
        "licencia": "Creative Commons Atribución-CompartirIgual (CC-BY-SA)",
        "musculos": musculos,
        "ejercicios": ejercicios,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n{len(musculos)} capas de músculo y {len(ejercicios)} imágenes de ejercicio.")
    if sin_imagen:
        print(f"Sin imagen ({len(sin_imagen)}): {', '.join(sin_imagen)}")


if __name__ == "__main__":
    sys.exit(main())
