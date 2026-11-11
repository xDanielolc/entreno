"""Quita de estilo.css las reglas cuyas clases ya no aparecen en ningún JS ni HTML.
Conservador: una clase solo se da por muerta si no sale como palabra en ningún archivo y su prefijo no se monta con
plantillas (`entra-${...}`). De una lista de selectores se quitan solo los muertos; la regla entera, si lo son todos."""
import re
import sys
from pathlib import Path

web = Path('.')
css_ruta = web / 'css/estilo.css'
css = css_ruta.read_text(encoding='utf-8')
todo = '\n'.join(p.read_text(encoding='utf-8') for p in web.rglob('*.js')) + (web / 'index.html').read_text(encoding='utf-8') \
    + (web / 'privacidad.html').read_text(encoding='utf-8')

sin_comentarios = re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), css, flags=re.S)
clases = set(re.findall(r'\.([a-zA-Z][\w-]*)', sin_comentarios))


def muerta(c):
    if re.search(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', todo):
        return False
    partes = c.split('-')
    for k in range(1, len(partes)):
        prefijo = '-'.join(partes[:k]) + '-'
        if re.search(re.escape(prefijo) + r'\$\{', todo) or re.search(r"['\"`]" + re.escape(prefijo) + r"['\"`]\s*\+", todo):
            return False
    return True


muertas = {c for c in clases if muerta(c)}
print('clases muertas:', len(muertas), sorted(muertas))


def selector_muerto(sel):
    return any(c in muertas for c in re.findall(r'\.([a-zA-Z][\w-]*)', sel))


salida = []
quitadas = 0
recortadas = 0
i = 0
n = len(css)


def procesa(texto):
    """Devuelve el bloque de reglas `texto` sin las reglas muertas."""
    global quitadas, recortadas
    out = []
    i = 0
    while i < len(texto):
        # comentarios y espacios, tal cual
        m = re.compile(r'\s+|/\*.*?\*/', re.S).match(texto, i)
        if m:
            out.append(m.group(0)); i = m.end(); continue
        j = texto.find('{', i)
        k = texto.find(';', i)
        if j < 0:
            out.append(texto[i:]); break
        if 0 <= k < j:           # @import, @charset…
            out.append(texto[i:k + 1]); i = k + 1; continue
        cabecera = texto[i:j]
        # busca la llave de cierre
        prof = 0
        p = j
        while p < len(texto):
            if texto.startswith('/*', p):
                p = texto.find('*/', p) + 2; continue
            if texto[p] == '{': prof += 1
            elif texto[p] == '}':
                prof -= 1
                if prof == 0: break
            p += 1
        cuerpo = texto[j + 1:p]
        if cabecera.strip().startswith('@'):
            if re.match(r'\s*@(media|supports|layer|container)', cabecera):
                dentro = procesa(cuerpo)
                if dentro.strip():
                    out.append(cabecera + '{' + dentro + '}')
                else:
                    quitadas += 1
            else:
                out.append(texto[i:p + 1])
        else:
            limpio = re.sub(r'/\*.*?\*/', '', cabecera, flags=re.S)
            sels = [s for s in limpio.split(',')]
            vivos = [s for s in sels if not selector_muerto(s)]
            if not vivos:
                quitadas += 1
                # se lleva también el salto de línea que la precede
                while out and out[-1].strip() == '' and out[-1].count('\n') == 0:
                    out.pop()
            elif len(vivos) < len(sels):
                recortadas += 1
                sangria = re.match(r'\s*', cabecera).group(0)
                out.append(sangria + ','.join(vivos).strip() + ' {' + cuerpo + '}')
            else:
                out.append(texto[i:p + 1])
        i = p + 1
    return ''.join(out)


nuevo = procesa(css)
nuevo = re.sub(r'\n{4,}', '\n\n\n', nuevo)
print(f'reglas quitadas: {quitadas}, listas recortadas: {recortadas}, bytes: {len(css)} -> {len(nuevo)}')
if '--aplicar' in sys.argv:
    css_ruta.write_text(nuevo, encoding='utf-8', newline='\n')
    print('aplicado')
