// Página de prueba (#/prueba-colores): varias formas de pintar la cebra, para
// ver cuál aguanta el oscurecido que hacen algunos navegadores del móvil.
// No sale en ningún menú; se abre desde la lista de pruebas.
import { anadir, h } from '../ui.js';

const FORMAS = [
  ['A', 'Gris translúcido (la de ahora)', 'background-color: rgba(127,127,127,.24)'],
  ['B', 'Color de tarjeta más claro', 'background-color: var(--superficie-2)'],
  ['C', 'Degradado gris', 'background-image: linear-gradient(rgba(128,128,128,.3), rgba(128,128,128,.3))'],
  ['D', 'Sombra interior', 'box-shadow: inset 0 0 0 100vmax rgba(128,128,128,.3)'],
  ['E', 'Gris sólido', 'background-color: #3c4048'],
  ['F', 'Blanco translúcido', 'background-color: rgba(255,255,255,.12)'],
];

export function vistaPruebaColores(contenedor) {
  const tabla = (estilo) => h('table', { class: 'tabla-prueba' },
    h('tbody', {}, [1, 2, 3, 4].map((n) => h('tr', {},
      h('td', { style: n % 2 ? '' : estilo }, `Fila ${n}`), h('td', { style: n % 2 ? '' : estilo }, n)))));
  // G: las rayas pintadas en un lienzo.
  const lienzo = h('canvas', { width: 300, height: 120, style: 'width:100%;height:auto;display:block' });
  const ctx = lienzo.getContext('2d');
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(128,128,128,.3)' : 'transparent';
    ctx.fillRect(0, i * 30, 300, 30);
    ctx.fillStyle = '#ccc';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Fila ${i + 1}`, 8, i * 30 + 20);
  }
  anadir(contenedor,
    h('h1', {}, 'Prueba de la cebra'),
    h('p', { class: 'nota centrado' }, 'Dime qué letras ves con filas alternas de otro tono.'),
    FORMAS.map(([letra, texto, estilo]) => h('section', { class: 'tarjeta' },
      h('h2', { class: 'centrado' }, `${letra} · ${texto}`), tabla(estilo))),
    h('section', { class: 'tarjeta' }, h('h2', { class: 'centrado' }, 'G · Pintada en un lienzo'), lienzo));
}
