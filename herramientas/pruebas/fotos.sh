#!/bin/bash
# fotos.sh CARPETA: captura a página completa un conjunto fijo de pantallas (con todos los plegables abiertos).
cd "$(dirname "$0")"
dest="$1"; mkdir -p "capturas/$dest"
python nav.py goto "http://localhost:8000/" 4 > /dev/null
rutas=$(python nav.py js <<'JS'
const est=await import('/js/estado.js'); const d=est.datos();
const ses=d.sesiones.find(s=>s.estado==='terminada'); const cur=d.sesiones.find(s=>s.estado==='en-curso');
return ['#/','#/cuerpo','#/cuerpo/records','#/cuerpo/medidas','#/diario','#/ejercicios','#/ejercicio/'+d.ejercicios[0].id,'#/historial','#/historial/calendario','#/sesion/'+ses.id, cur?'#/sesion/'+cur.id:'#/','#/aprender','#/ajustes','#/rutinas','#/rutina/'+d.rutinas[0].id,'#/guia-estilo'].join(' ');
JS
)
n=0
for r in $rutas; do
  n=$((n+1))
  python nav.py js > /dev/null <<JS
location.hash='$r'; await esp(1300); for (const det of document.querySelectorAll('main details')) det.open=true; for (const a of document.querySelectorAll('.aviso')) a.classList.remove('visible'); window.scrollTo(0,0); await esp(500); return 1;
JS
  python nav.py shot "$dest/$(printf %02d $n).png" full > /dev/null
done
echo "$n capturas en $dest"
