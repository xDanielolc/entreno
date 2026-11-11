# Pruebas de la app en un Chrome sin ventana

Scripts de la auditoría del 11-11-2026. Sirven para probar la app a 375 px sin tocar el navegador de nadie.
Necesitan Python con `websocket-client` y `Pillow`, Chrome instalado y la app servida en http://localhost:8000
(`Probar la app en el ordenador.bat`).

- `nav.py start` lanza Chrome sin ventana (perfil propio junto al script, puerto 9444). Después:
  `nav.py goto URL`, `nav.py js` (JavaScript por la entrada estándar, con las ayudas de `ayudas.js`: `toca`, `ver`,
  `botones`, `campos`, `escribe`, `desbordes`, `donde`), `nav.py shot nombre.png [full]`, `nav.py tema claro|oscuro`,
  `nav.py tap x y`, `nav.py swipe x1 y1 x2 y2`, `nav.py offline on|off`, `nav.py stop`.
  Oscuro forzado (como Ecosia): `nav.py start --blink-settings=forceDarkModeEnabled=true`.
- `comprobar.sh`: importa todos los módulos listados en `sw.js`; si alguno no carga (un nombre repetido, una
  importación que no existe), lo dice. Pasarlo antes de publicar: no hay Node para comprobar la sintaxis.
- `tocar.sh "texto"`: toque táctil de verdad en el botón con ese texto (para lo que depende de un gesto real).
- `fotos.sh carpeta`: 16 pantallas a página completa, con los plegables abiertos, para comparar antes y después.
- `offline.py`: carga con conexión, la corta y recorre 14 pantallas buscando fallos y dibujos rotos.
- `limpieza.py` (desde `web/`): archivos sin listar en `sw.js`, exportaciones, funciones e importaciones sin uso.
- `css_muerto.py` (desde `web/`): reglas de `estilo.css` de clases que ya no aparecen en ningún JS (`--aplicar`).

Probar siempre en modo prueba («Probar sin cuenta»), nunca con una cuenta real.
- `prueba_worker.py`: ejecuta el Worker de avisos (`herramientas/cloudflare/avisos.js`) dentro de Chrome con un almacén y un servicio de avisos de mentira, y comprueba la firma.
- `prueba_push.py`: entrega un push vacío al service worker de la app local y enseña la notificación que saca.
