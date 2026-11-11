"""Procesa UN original de la IA (dos posturas en una imagen, o una quieta) sin tocar creditos.json: para rehacer un
dibujo que la app ya usa. Después le pasa el congelado (lo que no se mueve, idéntico entre posturas).
Uso: python herramientas/procesar_uno.py imagenes-ia/gemini/fases-<slug>.jpg [ancla]
El nombre del archivo manda: `fases-`, `quieto-` o `completo-` más el slug de peticiones.json (de ahí salen el ancla
y las demás opciones)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import imagenes_ia as m
from fijar_zona import posturas, congelar

origen = Path(sys.argv[1])
nombre = origen.stem.split('-', 1)[1]
entrada = m.leer_tabla().get(nombre)
op = entrada if isinstance(entrada, dict) else {}
modo = sys.argv[2] if len(sys.argv) > 2 else op.get('ancla', 'pies')   # segundo argumento: el ancla, si el dibujo no está en peticiones.json
if origen.stem.startswith('completo-'):
    modo = m.ANCLA_COMPLETO.get(nombre, 'encajar-suelo')
salida, animada = m.procesar(origen, modo, bool(op.get('espejo')), bool(op.get('solo')), bool(op.get('invertir')), op.get('mover'),
                             op.get('escala'), op.get('recorte'), None if origen.stem.startswith('completo-') else op.get('grosor'))
print('animada' if animada else 'quieta', salida, 'ancla', modo)
if animada:
    ruta = m.SALIDA / f'{salida}.webp'
    cuadros, tiempos = posturas(ruta)
    nuevos = [cuadros[0]] + [congelar(cuadros[0], c)[0] for c in cuadros[1:]]
    nuevos[0].save(ruta, 'WEBP', save_all=True, append_images=nuevos[1:], duration=tiempos, loop=0, quality=82, method=6)
