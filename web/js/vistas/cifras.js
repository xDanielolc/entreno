// Cifras de tus últimas 12 semanas (entrenamientos, volumen y minutos) en
// tarjetas que se deslizan, y los retos del mes. Ideas de Lyfta que le
// gustaron a Dan (27-10-2026).

import { icono } from '../iconos.js';
import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { cifrasPorSemanas, retosDelMes } from '../records.js';
import { fechaCorta, h } from '../ui.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const kg = (n) => (n >= 10000 ? `${formatearNumero(Math.round(n / 100) / 10)} t` : `${formatearNumero(Math.round(n))} kg`);
const minutos = (n) => (n >= 60 ? `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, '0')} min` : `${n} min`);

export function tarjetaCifras(d) {
  const c = cifrasPorSemanas(d, 12);
  const tarjetas = [
    { clave: 'entrenamientos', titulo: 'Entrenamientos', texto: (n) => `${n} ${n === 1 ? 'entrenamiento' : 'entrenamientos'}`, corto: (n) => String(n) },
    { clave: 'volumen', titulo: 'Volumen', texto: kg, corto: kg },
    { clave: 'minutos', titulo: 'Duración', texto: minutos, corto: minutos },
  ];
  // Sin horas apuntadas (entrenamientos pasados a mano), la duración no dice nada.
  const visibles = tarjetas.filter((t) => t.clave !== 'minutos' || c.total.minutos || c.previo.minutos);
  const carril = h('div', { class: 'carril-cifras' }, visibles.map((t) => {
    const total = c.total[t.clave];
    const antes = c.previo[t.clave];
    const dif = total - antes;
    return h('article', { class: 'tarjeta-cifra' },
      h('span', { class: 'suave' }, t.titulo),
      h('strong', { class: 'cifra-grande' }, t.texto(total)),
      h('small', { class: 'suave' }, `${fechaCorta(c.desde)} a ${fechaCorta(c.hasta)}`),
      h('small', { class: `diferencia ${dif > 0 ? 'sube' : dif < 0 ? 'baja' : ''}` },
        `${dif > 0 ? '▲' : dif < 0 ? '▼' : '='} ${t.corto(Math.abs(Math.round(dif)))} frente a las 12 semanas anteriores`),
      barras(c.semanas.map((s) => s[t.clave]), t.corto));
  }));
  const puntos = h('div', { class: 'puntos-cifras', 'aria-hidden': 'true' }, visibles.map((_, i) => h('span', { class: i === 0 ? 'activo' : '' })));
  carril.addEventListener('scroll', () => {
    const i = Math.round(carril.scrollLeft / Math.max(1, carril.clientWidth * 0.86));
    [...puntos.children].forEach((p, k) => p.classList.toggle('activo', k === i));
  }, { passive: true });
  return h('section', { class: 'cifras-semanas' }, carril, puntos);
}

// Barras de cada semana, de la más antigua a la de ahora.
function barras(valores, texto) {
  const s = (tag, attrs = {}, ...hijos) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    for (const x of hijos.flat()) if (x) e.append(x);
    return e;
  };
  const ancho = 280, alto = 90, max = Math.max(1, ...valores);
  const paso = ancho / valores.length;
  return s('svg', { viewBox: `0 0 ${ancho} ${alto + 14}`, class: 'barras-cifra', role: 'img',
    'aria-label': `Por semanas: ${valores.map(texto).join(', ')}` },
  s('line', { x1: 0, x2: ancho, y1: alto, y2: alto, stroke: 'currentColor', opacity: 0.25 }),
  valores.map((v, i) => s('rect', { x: i * paso + paso * 0.18, width: paso * 0.64, y: alto - (v / max) * (alto - 4),
    height: Math.max(v > 0 ? 2 : 0, (v / max) * (alto - 4)), rx: 3, class: i === valores.length - 1 ? 'barra-actual' : 'barra' })),
  s('text', { x: 0, y: alto + 12, 'font-size': 10, fill: 'currentColor', opacity: 0.6 }, document.createTextNode('hace 12 semanas')),
  s('text', { x: ancho, y: alto + 12, 'font-size': 10, fill: 'currentColor', opacity: 0.6, 'text-anchor': 'end' }, document.createTextNode('esta')));
}

// Retos del mes, a tu medida (un poco por encima de tu media).
export function tarjetaRetos(d) {
  if (d.perfil.retos === false) return null;
  const { mes, retos } = retosDelMes(d);
  const nombreMes = MESES[Number(mes.slice(5, 7)) - 1];
  const texto = (r, n) => (r.clave === 'volumen' ? kg(n) : r.clave === 'minutos' ? minutos(n) : `${n}`);
  return h('section', { class: 'tarjeta retos con-ayuda-esquina' },
    h('h2', { class: 'con-icono' }, icono('trofeo'), `Retos de ${nombreMes}`),
    h('p', { class: 'nota centrado' }, 'A tu medida: un poco por encima de lo que sueles hacer en un mes.'),
    retos.map((r) => {
      const pct = Math.min(100, Math.round((r.hecho / r.meta) * 100));
      const hecho = r.hecho >= r.meta;
      return h('div', { class: `reto${hecho ? ' cumplido' : ''}` },
        h('div', { class: 'reto-texto' },
          h('span', {}, `${texto(r, r.meta)} ${r.clave === 'entrenamientos' ? 'entrenamientos' : r.clave === 'volumen' ? 'levantados' : 'entrenando'}`),
          h('strong', {}, hecho ? `¡Cumplido! (${texto(r, r.hecho)})` : `${texto(r, r.hecho)}`)),
        h('span', { class: 'carril' }, h('span', { class: 'relleno', style: `width:${pct}%` })));
    }),
    h('button', { type: 'button', class: 'ayuda-esquina boton-icono', 'aria-label': 'Quitar los retos de Entrenar',
      title: 'Quitar los retos', onclick: () => estado.cambiar((x) => { x.perfil.retos = false; }) }, icono('cerrar')));
}
