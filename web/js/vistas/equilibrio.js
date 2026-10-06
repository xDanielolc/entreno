// Equilibrio: un gráfico de araña con lo que llevas entrenado, para ver de un
// vistazo qué tienes descompensado. Idea sacada de Lyfta. Cuatro formas de
// agrupar (zonas del cuerpo, empuje/tirón/pierna, arriba/abajo, delante/detrás)
// y dos periodos (esta semana, este mes).

import { formatearNumero } from '../calculos.js';
import { MUSCULOS, TREN_INFERIOR, TREN_SUPERIOR } from '../musculos.js';
import { durezaSemanal, seriesEnDias } from '../recuperacion.js';
import { h } from '../ui.js';
import { objetivoSeries } from './cuerpo.js';

// Zonas del cuerpo: los 20 músculos juntados en 12, como hace Lyfta.
const ZONAS = [
  ['Pecho', ['pecho']],
  ['Hombros', ['hombro', 'hombroPosterior']],
  ['Bíceps', ['biceps']],
  ['Tríceps', ['triceps']],
  ['Antebrazo', ['antebrazoFlexor', 'antebrazoExtensor']],
  ['Espalda', ['dorsal', 'trapecio']],
  ['Lumbares', ['lumbar']],
  ['Abdomen', ['abdomen', 'oblicuos']],
  ['Glúteo', ['gluteo', 'abductores']],
  ['Cuádriceps', ['cuadriceps', 'aductores']],
  ['Isquios', ['isquios']],
  ['Gemelos', ['gemelo', 'soleo', 'tibial']],
];

const DELANTE = ['pecho', 'hombro', 'biceps', 'antebrazoFlexor', 'abdomen', 'oblicuos', 'cuadriceps', 'aductores', 'tibial', 'cuello'];
const deGrupo = (g) => Object.keys(MUSCULOS).filter((m) => MUSCULOS[m].grupo === g);
const CORE = deGrupo('core');

const MODOS = {
  zonas: { texto: 'Músculos', ejes: ZONAS, porObjetivo: true },
  grupos: { texto: 'Empuje · tirón · pierna', ejes: [['Empuje', deGrupo('empuje')], ['Tirón', deGrupo('tirón')], ['Pierna', deGrupo('pierna')], ['Core', CORE]] },
  tren: { texto: 'Arriba · abajo', ejes: [['Tren superior', TREN_SUPERIOR], ['Tren inferior', TREN_INFERIOR], ['Core', CORE.filter((m) => m !== 'cuello')]] },
  cadena: { texto: 'Delante · detrás', ejes: [
    ['Delante, arriba', DELANTE.filter((m) => TREN_SUPERIOR.includes(m) || m === 'abdomen' || m === 'oblicuos')],
    ['Detrás, arriba', TREN_SUPERIOR.filter((m) => !DELANTE.includes(m)).concat('lumbar')],
    ['Detrás, abajo', TREN_INFERIOR.filter((m) => !DELANTE.includes(m))],
    ['Delante, abajo', DELANTE.filter((m) => TREN_INFERIOR.includes(m))],
  ] },
};
const PERIODOS = { 7: 'Esta semana', 30: 'Este mes', propio: 'Otro…' };

let modo = 'zonas';
let dias = 7;
let periodo = '7';       // '7', '30' o 'propio' (los días que elijas)

export function tarjetaEquilibrio(d) {
  const caja = h('section', { class: 'tarjeta equilibrio' });
  const pintar = () => {
    const { ejes, porObjetivo } = MODOS[modo];
    const series = seriesEnDias(d, dias);
    const dureza = durezaSemanal(d);
    const semanas = dias / 7;
    // Cada eje: series hechas y, en «Zonas», el % de tu objetivo.
    const valores = ejes.map(([nombre, musculos]) => {
      const hechas = musculos.reduce((t, m) => t + (series[m] ?? 0), 0);
      const objetivo = musculos.reduce((t, m) => t + objetivoSeries(d, m, dureza).n, 0) * semanas;
      return { nombre, hechas, objetivo, pct: objetivo ? hechas / objetivo : 0 };
    });
    const total = valores.reduce((t, v) => t + v.hechas, 0);
    // Radio: en «Zonas», frente al objetivo (el anillo discontinuo es el 100 %);
    // en lo demás, frente al eje que más lleva.
    const tope = porObjetivo ? 1.5 : Math.max(...valores.map((v) => v.hechas), 1);
    const radio = (v) => Math.min(1, (porObjetivo ? v.pct : v.hechas) / tope);

    caja.replaceChildren(
      h('h2', { class: 'centrado' }, 'Equilibrio'),
      h('p', { class: 'nota centrado' }, 'Qué entrenas más y qué tienes descompensado.'),
      h('div', { class: 'grupo-botones' }, h('span', { class: 'etiqueta-grupo' }, 'Ver por'),
        filaBotones(Object.entries(MODOS).map(([k, x]) => [k, x.texto]), modo, (k) => { modo = k; pintar(); })),
      h('div', { class: 'grupo-botones' }, h('span', { class: 'etiqueta-grupo' }, 'Periodo'),
        filaBotones(Object.entries(PERIODOS), periodo, (k) => {
          periodo = k;
          if (k !== 'propio') dias = Number(k);
          pintar();
        }),
        periodo === 'propio' && h('label', { class: 'periodo-propio' }, 'Últimos',
          h('input', { type: 'text', inputmode: 'numeric', value: String(dias), 'aria-label': 'Días',
            onchange: (e) => { const n = Math.round(Number(e.target.value)); dias = n >= 1 && n <= 365 ? n : dias; pintar(); } }),
          'días')),
      total
        ? arana(valores.map((v) => ({ ...v, r: radio(v) })), porObjetivo ? 1 / 1.5 : null)
        : h('p', { class: 'suave centrado' }, `Sin series ${dias === 7 ? 'esta semana' : dias === 30 ? 'este mes' : `en los últimos ${dias} días`}.`),
      total > 0 && h('ul', { class: 'nota lista-equilibrio' }, conclusiones(valores, porObjetivo).map((t) => h('li', {}, t))));
  };
  pintar();
  return caja;
}

function filaBotones(opciones, actual, alElegir) {
  return h('div', { class: 'fila-marcas compacta centrada' }, opciones.map(([k, texto]) => h('button', {
    type: 'button', class: `boton-marca${String(k) === String(actual) ? ' activo' : ''}`, 'aria-pressed': String(String(k) === String(actual)),
    onclick: () => alElegir(k) }, texto)));
}

// Lo que salta a la vista, en dos o tres frases.
function conclusiones(valores, porObjetivo) {
  const n = (x) => formatearNumero(Math.round(x * 10) / 10);
  if (porObjetivo) {
    const orden = [...valores].sort((a, b) => a.pct - b.pct);
    const flojos = orden.filter((v) => v.pct < 0.5).slice(0, 3);
    const altos = orden.filter((v) => v.pct > 1.3).reverse().slice(0, 2);
    const lista = [];
    if (flojos.length) lista.push(`Lo que menos: ${flojos.map((v) => `${v.nombre} (${n(v.hechas)} series)`).join(', ')}.`);
    if (altos.length) lista.push(`Por encima de tu objetivo: ${altos.map((v) => v.nombre).join(', ')}.`);
    if (!lista.length) lista.push('Bastante equilibrado: todo cerca de tu objetivo.');
    lista.push('El anillo discontinuo es tu objetivo de series.');
    return lista;
  }
  // El core se compara aparte: siempre lleva menos series y no es descompensar.
  const [mas, menos] = valores.filter((v) => v.nombre !== 'Core').sort((a, b) => b.hechas - a.hechas)
    .filter((_, i, xs) => i === 0 || i === xs.length - 1);
  const lista = valores.map((v) => `${v.nombre}: ${n(v.hechas)} series`);
  if (menos && menos.hechas > 0 && mas.hechas / menos.hechas >= 1.5) {
    lista.unshift(`Descompensado: ${mas.nombre} lleva ${n(mas.hechas / menos.hechas)} veces más que ${menos.nombre}.`);
  } else if (menos && menos.hechas === 0) {
    lista.unshift(`Nada de ${menos.nombre.toLowerCase()}.`);
  } else lista.unshift('Bastante equilibrado.');
  return lista;
}

// El gráfico de araña, en SVG.
function arana(valores, anilloObjetivo) {
  const NS = 'http://www.w3.org/2000/svg';
  const nodo = (tag, attrs = {}, ...hijos) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    for (const x of hijos.flat()) if (x != null && x !== false) e.append(x);
    return e;
  };
  const T = 320; const C = T / 2; const R = 120;
  const k = valores.length;
  const punto = (i, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / k;
    return [C + Math.cos(a) * R * r, C + Math.sin(a) * R * r];
  };
  const poligono = (r) => valores.map((_, i) => punto(i, typeof r === 'function' ? r(i) : r).map((x) => x.toFixed(1)).join(',')).join(' ');
  // Márgenes anchos a los lados para que las etiquetas quepan en el móvil.
  return nodo('svg', { viewBox: `-100 -30 ${T + 200} ${T + 60}`, class: 'arana', role: 'img',
    'aria-label': valores.map((v) => `${v.nombre}: ${formatearNumero(Math.round(v.hechas * 10) / 10)} series`).join('. ') },
  [0.25, 0.5, 0.75, 1].map((r) => nodo('polygon', { points: poligono(r), class: 'arana-red' })),
  valores.map((_, i) => { const [x, y] = punto(i, 1); return nodo('line', { x1: C, y1: C, x2: x, y2: y, class: 'arana-red' }); }),
  anilloObjetivo && nodo('polygon', { points: poligono(anilloObjetivo), class: 'arana-objetivo' }),
  nodo('polygon', { points: poligono((i) => valores[i].r), class: 'arana-valor' }),
  valores.map((v, i) => { const [x, y] = punto(i, v.r); return nodo('circle', { cx: x, cy: y, r: 3.5, class: 'arana-punto' }); }),
  valores.map((v, i) => {
    const [x, y] = punto(i, 1.1);
    const ancla = Math.abs(x - C) < 8 ? 'middle' : x > C ? 'start' : 'end';
    return nodo('text', { x, y: y + 4, 'text-anchor': ancla, class: 'arana-etiqueta' }, v.nombre);
  }));
}
