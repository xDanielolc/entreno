"""Auditoría estática de web/: archivos sin listar en sw.js, exportaciones, funciones e importaciones sin uso."""
import re
from pathlib import Path

web = Path('.')
sw = (web / 'sw.js').read_text(encoding='utf-8')
listados = set(re.findall(r"'\./([^']+)'", sw))
todos = [p.as_posix() for p in web.rglob('*') if p.is_file()]
propios = [r for r in todos if r.endswith(('.js', '.css', '.html', '.webmanifest', '.ttf', '.wav')) and r != 'sw.js']
print('sin listar en sw.js:', [r for r in propios if r not in listados])
print('listados que no existen:', [r for r in listados if not (web / r).exists()][:10])

fuentes = {r: (web / r).read_text(encoding='utf-8') for r in todos if r.endswith('.js')}
todo = '\n'.join(fuentes.values()) + (web / 'index.html').read_text(encoding='utf-8')


def usos(nombre, texto):
    return len(re.findall(r'\b' + re.escape(nombre) + r'\b', texto))


muertos = []
for r, t in fuentes.items():
    for m in re.finditer(r'^export (?:async )?(?:function|const|let) (\w+)', t, re.M):
        if usos(m.group(1), todo) <= 1:
            muertos.append(f'{r}: {m.group(1)}')
print('exportados sin ningún uso:', muertos)

sinuso = []
for r, t in fuentes.items():
    for m in re.finditer(r'^(?:  )?(?:async )?function (\w+)\(', t, re.M):
        if usos(m.group(1), todo) <= 1:
            sinuso.append(f'{r}: {m.group(1)}')
    for m in re.finditer(r'^(?:  )?const (\w+) = (?:async )?\(', t, re.M):
        if usos(m.group(1), todo) <= 1:
            sinuso.append(f'{r}: {m.group(1)} (const)')
print('funciones sin uso:', sinuso)

impsin = []
for r, t in fuentes.items():
    for m in re.finditer(r'import \{([^}]+)\} from', t):
        for n in m.group(1).split(','):
            n = n.strip().split(' as ')[-1].strip()
            if n and usos(n, t) <= 1:
                impsin.append(f'{r}: {n}')
    for m in re.finditer(r'import \* as (\w+) from', t):
        if usos(m.group(1), t) <= 1:
            impsin.append(f'{r}: * as {m.group(1)}')
print('importaciones sin usar:', len(impsin))
for x in impsin:
    print('  ', x)

# Clases CSS que ya no aparecen en ningún JS ni HTML (candidatas; solo se cuentan).
css = (web / 'css/estilo.css').read_text(encoding='utf-8')
clases = set(re.findall(r'\.([a-z][a-z0-9-]+)', re.sub(r'/\*.*?\*/', '', css, flags=re.S)))
huerfanas = sorted(c for c in clases if usos(c, todo) == 0 and not re.search(c.replace('-', '.') , ''))
print('clases CSS sin rastro en JS/HTML:', len(huerfanas))
print(' ', ', '.join(huerfanas))
