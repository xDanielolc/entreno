#!/bin/bash
# tocar.sh "texto" [n] [espera]: toque real (táctil) en el botón visible con ese texto.
cd "$(dirname "$0")"
xy=$(echo "return donde('$1', ${2:-0});" | python nav.py js)
if [ "$xy" = "(nada)" ]; then echo "NO ENCUENTRO: $1"; exit 0; fi
python nav.py tap $xy > /dev/null; sleep "${3:-1}"
