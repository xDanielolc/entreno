// Mapa de músculos: catálogo y dibujo del cuerpo.
//
// El dibujo es nuestro, hecho en SVG con las mismas variables de color que el
// resto de la app: así cambia solo con el tema y no depende de imágenes de
// nadie. Es una silueta estilizada, no una lámina de anatomía.

export const MUSCULOS = {
  trapecio:    { nombre: 'Trapecio',   grupo: 'tirón',  tamano: 'medio' },
  hombro:      { nombre: 'Hombros',    grupo: 'empuje', tamano: 'pequeno' },
  pecho:       { nombre: 'Pecho',      grupo: 'empuje', tamano: 'grande' },
  biceps:      { nombre: 'Bíceps',     grupo: 'tirón',  tamano: 'pequeno' },
  triceps:     { nombre: 'Tríceps',    grupo: 'empuje', tamano: 'pequeno' },
  antebrazo:   { nombre: 'Antebrazo',  grupo: 'tirón',  tamano: 'pequeno' },
  abdomen:     { nombre: 'Abdomen',    grupo: 'core',   tamano: 'medio' },
  oblicuos:    { nombre: 'Oblicuos',   grupo: 'core',   tamano: 'pequeno' },
  dorsal:      { nombre: 'Dorsal',     grupo: 'tirón',  tamano: 'grande' },
  lumbar:      { nombre: 'Lumbares',   grupo: 'tirón',  tamano: 'medio' },
  gluteo:      { nombre: 'Glúteo',     grupo: 'pierna', tamano: 'grande' },
  cuadriceps:  { nombre: 'Cuádriceps', grupo: 'pierna', tamano: 'grande' },
  isquios:     { nombre: 'Isquios',    grupo: 'pierna', tamano: 'grande' },
  aductores:   { nombre: 'Aductores',  grupo: 'pierna', tamano: 'medio' },
  abductores:  { nombre: 'Abductores', grupo: 'pierna', tamano: 'medio' },
  gemelo:      { nombre: 'Gemelos',    grupo: 'pierna', tamano: 'pequeno' },
};

export const ORDEN_MUSCULOS = Object.keys(MUSCULOS);

// Qué músculos aparecen en cada vista del dibujo.
const DELANTE = ['trapecio', 'hombro', 'pecho', 'biceps', 'antebrazo', 'abdomen', 'oblicuos', 'cuadriceps', 'aductores', 'gemelo'];
const DETRAS = ['trapecio', 'hombro', 'dorsal', 'triceps', 'antebrazo', 'lumbar', 'gluteo', 'isquios', 'abductores', 'gemelo'];

// Formas del cuerpo, en un lienzo de 100 × 220. Cada músculo son una o varias
// piezas; las simétricas se dibujan dos veces, una a cada lado.
const FORMAS = {
  delante: {
    trapecio:   ['M38,28 L50,24 L62,28 L58,33 L42,33 Z'],
    hombro:     ['M32,32 a8,7 0 0,0 -8,9 l5,4 a10,9 0 0,1 7,-9 Z', 'M68,32 a8,7 0 0,1 8,9 l-5,4 a10,9 0 0,0 -7,-9 Z'],
    pecho:      ['M39,35 q11,-3 10,10 q-6,5 -12,1 Z', 'M61,35 q-11,-3 -10,10 q6,5 12,1 Z'],
    biceps:     ['M24,44 q5,2 4,13 q-5,3 -7,-3 Z', 'M76,44 q-5,2 -4,13 q5,3 7,-3 Z'],
    antebrazo:  ['M21,58 q6,1 5,14 q-5,2 -7,-4 Z', 'M79,58 q-6,1 -5,14 q5,2 7,-4 Z'],
    abdomen:    ['M43,48 h14 v26 q-7,4 -14,0 Z'],
    oblicuos:   ['M39,50 q3,10 3,22 q-5,-3 -5,-12 Z', 'M61,50 q-3,10 -3,22 q5,-3 5,-12 Z'],
    cuadriceps: ['M39,80 q6,-3 10,2 l-2,34 q-6,3 -10,-2 Z', 'M61,80 q-6,-3 -10,2 l2,34 q6,3 10,-2 Z'],
    aductores:  ['M47,82 q3,-1 4,0 l-1,22 q-3,1 -4,-1 Z'],
    gemelo:     ['M40,126 q5,-2 8,2 l-2,22 q-5,2 -7,-2 Z', 'M60,126 q-5,-2 -8,2 l2,22 q5,2 7,-2 Z'],
  },
  detras: {
    trapecio:   ['M38,28 L50,24 L62,28 L60,44 L50,48 L40,44 Z'],
    hombro:     ['M32,32 a8,7 0 0,0 -8,9 l5,4 a10,9 0 0,1 7,-9 Z', 'M68,32 a8,7 0 0,1 8,9 l-5,4 a10,9 0 0,0 -7,-9 Z'],
    dorsal:     ['M38,42 q12,6 0,24 q-4,-8 -3,-16 Z', 'M62,42 q-12,6 0,24 q4,-8 3,-16 Z'],
    triceps:    ['M24,44 q5,2 4,13 q-5,3 -7,-3 Z', 'M76,44 q-5,2 -4,13 q5,3 7,-3 Z'],
    antebrazo:  ['M21,58 q6,1 5,14 q-5,2 -7,-4 Z', 'M79,58 q-6,1 -5,14 q5,2 7,-4 Z'],
    lumbar:     ['M43,62 h14 v12 q-7,3 -14,0 Z'],
    gluteo:     ['M40,76 q10,-4 10,6 q-1,7 -10,6 Z', 'M60,76 q-10,-4 -10,6 q1,7 10,6 Z'],
    isquios:    ['M39,92 q6,-3 10,2 l-2,28 q-6,3 -10,-2 Z', 'M61,92 q-6,-3 -10,2 l2,28 q6,3 10,-2 Z'],
    abductores: ['M38,78 q3,0 4,6 q-4,2 -5,-2 Z', 'M62,78 q-3,0 -4,6 q4,2 5,-2 Z'],
    gemelo:     ['M40,126 q5,-2 8,2 l-2,22 q-5,2 -7,-2 Z', 'M60,126 q-5,-2 -8,2 l2,22 q5,2 7,-2 Z'],
  },
};

// Silueta de fondo: cabeza, tronco, brazos y piernas.
const SILUETA = [
  'M50,6 a8,8 0 1,1 -0.1,0 Z',                                   // cabeza
  'M44,15 h12 l2,6 q9,2 12,10 l3,20 q1,8 -2,14 l-3,-1 l-2,-12 '
  + 'l-2,20 q-1,10 -1,18 l-2,44 q-1,10 -3,20 l-3,26 h-8 l-1,-26 '
  + 'l-2,-20 l-2,20 l-1,26 h-8 l-3,-26 q-2,-10 -3,-20 l-2,-44 '
  + 'q0,-8 -1,-18 l-2,-20 l-2,12 l-3,1 q-3,-6 -2,-14 l3,-20 '
  + 'q3,-8 12,-10 Z',
];

export function siluetaSVG({ vista = 'delante', estadoPorMusculo = {}, alPulsar = null } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 220');
  svg.setAttribute('class', 'cuerpo');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', vista === 'delante' ? 'Vista frontal del cuerpo' : 'Vista de espalda');

  for (const d of SILUETA) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', 'silueta');
    svg.append(p);
  }

  const lista = vista === 'delante' ? DELANTE : DETRAS;
  for (const musculo of lista) {
    const formas = FORMAS[vista][musculo] || [];
    const grupo = document.createElementNS(ns, 'g');
    const estado = estadoPorMusculo[musculo];
    grupo.setAttribute('class', `musculo ${estado?.clase ?? 'sin-datos'}`);
    grupo.dataset.musculo = musculo;
    const titulo = document.createElementNS(ns, 'title');
    titulo.textContent = estado?.titulo ?? MUSCULOS[musculo].nombre;
    grupo.append(titulo);
    for (const d of formas) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      grupo.append(p);
    }
    if (alPulsar) {
      grupo.setAttribute('tabindex', '0');
      grupo.addEventListener('click', () => alPulsar(musculo));
      grupo.addEventListener('keydown', (e) => { if (e.key === 'Enter') alPulsar(musculo); });
    }
    svg.append(grupo);
  }
  return svg;
}
