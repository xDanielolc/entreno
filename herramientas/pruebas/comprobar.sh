#!/bin/bash
# Comprueba que todos los módulos de la app cargan (sintaxis e imports) en Chrome sin ventana.
S="$(dirname "$0")"; cd "$S"
python nav.py goto http://localhost:8000/privacidad.html 1 > /dev/null
python nav.py js <<'JS'
const lista = await (await fetch('/sw.js?x=' + Date.now())).text();
const archivos = [...lista.matchAll(/'\.\/(js\/[^']+\.js)'/g)].map(m => m[1]);
const malos = [];
for (const a of archivos) { try { await import('/' + a + '?x=' + Date.now()); } catch (e) { malos.push(a + ': ' + e.message); } }
return malos.length ? malos : 'TODO CARGA (' + archivos.length + ' módulos)';
JS
