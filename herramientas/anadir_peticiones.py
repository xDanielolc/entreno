"""Añade a imagenes-ia/peticiones.json las filas de un archivo
[slug, ejercicio, vista, inicio, final, (ancla)] o [slug, ejercicio, vista, postura, "quieto"]."""
import json, pathlib, sys
RAIZ = pathlib.Path(__file__).resolve().parent.parent
p = RAIZ / "imagenes-ia" / "peticiones.json"
lista = json.loads(p.read_text(encoding="utf8"))
hay = {x["slug"] for x in lista}
for fila in json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf8")):
    if fila[0] in hay:
        continue
    if len(fila) == 5 and fila[4] == "quieto":
        lista.append({"slug": fila[0], "ejercicio": fila[1], "vista": fila[2], "postura": fila[3]})
    else:
        d = {"slug": fila[0], "ejercicio": fila[1], "vista": fila[2], "inicio": fila[3], "final": fila[4]}
        if len(fila) > 5:
            d["ancla"] = fila[5]
        lista.append(d)
p.write_text(json.dumps(lista, ensure_ascii=False, indent=1), encoding="utf8")
print(len(lista))
