#!/bin/bash
# Mueve la última imagen descargada de Gemini o de ChatGPT a imagenes-ia/<origen>/<nombre>.<ext>
# Uso: bash imagenes-ia/mover.sh fases-press-de-banca           (Gemini)
#      bash imagenes-ia/mover.sh fases-press-de-banca chatgpt   (ChatGPT)
# Espera hasta 20 s a que acabe la descarga.
cd "$(dirname "$0")"
origen="${2:-gemini}"
mkdir -p "$origen"
for i in $(seq 1 20); do
  if [ "$origen" = "chatgpt" ]; then
    # ChatGPT pone al archivo el título de la conversación: la imagen más reciente de los últimos 3 minutos.
    f=$(find /c/Users/megad/Downloads -maxdepth 1 -mmin -3 \( -name '*.png' -o -name '*.jpg' -o -name '*.webp' \) -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
  else
    f=$(ls -t /c/Users/megad/Downloads/Gemini_Generated_Image_*.jpg /c/Users/megad/Downloads/Gemini_Generated_Image_*.png 2>/dev/null | head -1)
  fi
  [ -n "$f" ] && break
  sleep 1
done
if [ -z "$f" ]; then echo "NO HAY DESCARGA"; exit 1; fi
sleep 1
ext="${f##*.}"
mv "$f" "$origen/$1.$ext" && echo "guardada $origen/$1.$ext"
