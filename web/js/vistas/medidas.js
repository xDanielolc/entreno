// Medidas del cuerpo: peso, grasa, calorías y perímetros, cada uno con su
// trozo de muñeco (Lyfta las tiene así y a Dan le gustó «tal cual»,
// 27-10-2026). El peso sigue en `perfil.pesos` (lo usan los ejercicios con tu
// peso); lo demás, en `datos.medidas`.

import { icono } from '../iconos.js';
import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { musculoRecortado } from '../musculos.js';
import { apuntarPeso, quitarPeso } from '../peso.js';
import { aviso, fechaCorta, h, hoyISO, leerNumero, modal, nuevoId } from '../ui.js';

export const MEDIDAS_CUERPO = [
  { clave: 'peso', nombre: 'Peso corporal', unidad: 'kg', icono: 'corporal', min: 20, max: 400 },
  { clave: 'grasa', nombre: 'Grasa corporal', unidad: '%', icono: 'cinta', min: 2, max: 70 },
  { clave: 'kcal', nombre: 'Ingesta calórica', unidad: 'kcal', icono: 'kcal', min: 300, max: 10000 },
  { clave: 'cuello', nombre: 'Cuello', musculos: ['cuello'] },
  { clave: 'hombros', nombre: 'Hombros', musculos: ['hombro'] },
  { clave: 'pecho', nombre: 'Pecho', musculos: ['pecho'] },
  { clave: 'biceps-izq', nombre: 'Bíceps izquierdo', musculos: ['biceps'], lado: 'izq' },
  { clave: 'biceps-der', nombre: 'Bíceps derecho', musculos: ['biceps'], lado: 'der' },
  { clave: 'antebrazo-izq', nombre: 'Antebrazo izquierdo', musculos: ['antebrazoFlexor'], lado: 'izq' },
  { clave: 'antebrazo-der', nombre: 'Antebrazo derecho', musculos: ['antebrazoFlexor'], lado: 'der' },
  { clave: 'cintura', nombre: 'Cintura', musculos: ['abdomen', 'oblicuos'] },
  { clave: 'caderas', nombre: 'Caderas', musculos: ['gluteo', 'abductores'], vista: 'detras' },
  { clave: 'muslo-izq', nombre: 'Muslo izquierdo', musculos: ['cuadriceps'], lado: 'izq' },
  { clave: 'muslo-der', nombre: 'Muslo derecho', musculos: ['cuadriceps'], lado: 'der' },
  { clave: 'pantorrilla-izq', nombre: 'Pantorrilla izquierda', musculos: ['gemelo', 'soleo'], vista: 'detras', lado: 'izq' },
  { clave: 'pantorrilla-der', nombre: 'Pantorrilla derecha', musculos: ['gemelo', 'soleo'], vista: 'detras', lado: 'der' },
  { clave: 'altura', nombre: 'Altura', unidad: 'cm', icono: 'orden', min: 50, max: 250 },
];

function definiciones(d) {
  const propias = (d.perfil.medidasPropias ?? []).map((m) => ({ ...m, icono: 'cinta', propia: true }));
  return [...MEDIDAS_CUERPO, ...propias];
}

// Los valores de una medida, del más antiguo al más nuevo: [{ id, fecha, valor }].
export function valoresDe(d, clave) {
  if (clave === 'peso') return (d.perfil.pesos ?? []).map((p) => ({ id: p.fecha, fecha: p.fecha, valor: p.kg }));
  return (d.medidas ?? []).filter((m) => m.clave === clave).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Un valor por día: el último que pongas.
function apuntar(x, clave, valor, fecha) {
  if (clave === 'peso') { apuntarPeso(x, valor, fecha); return; }
  x.medidas ??= [];
  x.medidas = x.medidas.filter((m) => !(m.clave === clave && m.fecha === fecha));
  x.medidas.push({ id: nuevoId('med'), fecha, clave, valor });
}

function quitar(x, clave, v) {
  if (clave === 'peso') { quitarPeso(x, v.fecha); return; }
  x.medidas = (x.medidas ?? []).filter((m) => m.id !== v.id);
}

const unidadDe = (m) => m.unidad ?? 'cm';
const conUnidad = (m, v) => `${formatearNumero(v)} ${unidadDe(m)}`;

function dibujo(m) {
  if (m.musculos) return musculoRecortado(m.musculos, { vista: m.vista ?? null, lado: m.lado ?? null });
  return h('span', { class: 'icono-medida' }, icono(m.icono ?? 'cinta'));
}

export function vistaMedidas(contenedor) {
  const d = estado.datos();
  const fila = (m) => {
    const valores = valoresDe(d, m.clave);
    const ultimo = valores.at(-1);
    const cambio = valores.length >= 2 ? Math.round((ultimo.valor - valores.at(-2).valor) * 10) / 10 : null;
    return h('button', { type: 'button', class: 'fila-medida', onclick: () => abrirMedida(m) },
      h('span', { class: 'dibujo-medida' }, dibujo(m)),
      h('span', { class: 'crece' }, h('strong', {}, m.nombre),
        ultimo && h('small', { class: 'bloque suave' }, `${fechaCorta(ultimo.fecha)}`
          + (cambio ? ` · ${cambio > 0 ? '+' : ''}${formatearNumero(cambio)} ${unidadDe(m)}` : ''))),
      h('span', { class: 'valor-medida' }, ultimo ? conUnidad(m, ultimo.valor) : '—'));
  };
  // Masa magra: sale sola si hay peso y grasa del mismo día o cercanos.
  const peso = valoresDe(d, 'peso').at(-1);
  const grasa = valoresDe(d, 'grasa').at(-1);
  const magra = peso && grasa ? Math.round(peso.valor * (1 - grasa.valor / 100) * 10) / 10 : null;
  const grupos = [
    ['Generales', MEDIDAS_CUERPO.filter((m) => !m.musculos && m.clave !== 'altura')],
    ['Perímetros', MEDIDAS_CUERPO.filter((m) => m.musculos)],
    ['Otras', [...MEDIDAS_CUERPO.filter((m) => m.clave === 'altura'), ...definiciones(d).filter((m) => m.propia)]],
  ];
  contenedor.append(
    h('p', { class: 'nota centrado' }, 'Toca una medida para apuntarla y ver cómo cambia. Mide los perímetros con cinta, siempre en el mismo sitio y a la misma hora.'),
    ...grupos.map(([titulo, lista]) => h('section', { class: 'tarjeta lista-medidas' },
      h('h2', {}, titulo),
      lista.map(fila),
      titulo === 'Generales' && magra != null && h('p', { class: 'nota centrado' },
        `Masa magra (calculada con tu peso y tu grasa): ${formatearNumero(magra)} kg`),
      titulo === 'Otras' && h('button', { type: 'button', class: 'boton secundario', onclick: nuevaMedida }, '+ Añadir una medida tuya'))));
}

function nuevaMedida() {
  const nombre = h('input', { type: 'text', placeholder: 'Por ejemplo, muñeca', autocomplete: 'off' });
  const unidad = h('input', { type: 'text', value: 'cm', autocomplete: 'off' });
  const cerrar = modal('Medida nueva', h('div', { class: 'formulario' },
    h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Nombre'), nombre),
    h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Unidad'), unidad),
    h('button', { type: 'button', class: 'boton', onclick: () => {
      const n = nombre.value.trim();
      if (!n) return;
      estado.cambiar((x) => {
        x.perfil.medidasPropias ??= [];
        x.perfil.medidasPropias.push({ clave: nuevoId('medida'), nombre: n, unidad: unidad.value.trim() || 'cm' });
      });
      cerrar();
    } }, 'Añadir')));
  setTimeout(() => nombre.focus(), 50);
}

function abrirMedida(m) {
  const caja = h('div', { class: 'detalle-medida' });
  const cerrar = modal(m.nombre, caja);
  const pintar = () => {
    const d = estado.datos();
    const valores = valoresDe(d, m.clave);
    const valor = h('input', { type: 'text', inputmode: 'decimal', class: 'numero-peso', placeholder: unidadDe(m),
      'aria-label': `${m.nombre} en ${unidadDe(m)}` });
    const fecha = h('input', { type: 'date', value: hoyISO(), max: hoyISO(), 'aria-label': 'Día' });
    const guardar = () => {
      const v = leerNumero(valor.value);
      if (!(v > 0) || (m.min && v < m.min) || (m.max && v > m.max)) { aviso(`Pon ${m.nombre.toLowerCase()} en ${unidadDe(m)}`, { tipo: 'error' }); return; }
      estado.cambiar((x) => { apuntar(x, m.clave, v, fecha.value || hoyISO()); });
      aviso(`Apuntado: ${conUnidad(m, v)}.`);
      pintar();
    };
    caja.replaceChildren(
      h('div', { class: 'dibujo-medida grande' }, dibujo(m)),
      h('div', { class: 'fila-peso' }, valor, fecha),
      h('button', { type: 'button', class: 'boton', onclick: guardar }, 'Apuntar'),
      valores.length >= 2 ? graficaLinea(valores, unidadDe(m)) : h('p', { class: 'nota centrado' }, 'Con dos medidas o más sale la gráfica.'),
      valores.length > 0 && h('table', { class: 'tabla-musculos' },
        h('tbody', {}, [...valores].reverse().map((v) => h('tr', {},
          h('td', {}, fechaCorta(v.fecha)), h('td', { class: 'num' }, conUnidad(m, v.valor)),
          h('td', {}, h('button', { type: 'button', class: 'boton-icono', 'aria-label': `Borrar la del ${fechaCorta(v.fecha)}`,
            onclick: () => { estado.cambiar((x) => { quitar(x, m.clave, v); }); pintar(); } }, icono('cerrar'))))))),
      m.propia && h('button', { type: 'button', class: 'boton secundario peligro-texto', onclick: () => {
        estado.cambiar((x) => {
          x.perfil.medidasPropias = (x.perfil.medidasPropias ?? []).filter((p) => p.clave !== m.clave);
          x.medidas = (x.medidas ?? []).filter((p) => p.clave !== m.clave);
        });
        cerrar();
      } }, 'Quitar esta medida'));
  };
  pintar();
}

// Gráfica de línea con fechas: kilos o centímetros a lo largo del tiempo.
export function graficaLinea(valores, unidad) {
  const s = (tag, attrs = {}, ...hijos) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    for (const x of hijos.flat()) if (x) e.append(x);
    return e;
  };
  const ultimos = valores.slice(-60);
  const ancho = 300, alto = 130, vs = ultimos.map((p) => p.valor);
  const min = Math.min(...vs), max = Math.max(...vs);
  const margen = Math.max(0.5, (max - min) * 0.15);
  const t0 = new Date(ultimos[0].fecha), t1 = new Date(ultimos.at(-1).fecha);
  const x = (f) => ((new Date(f) - t0) / Math.max(1, t1 - t0)) * (ancho - 60) + 30;
  const y = (v) => alto - 28 - ((v - (min - margen)) / ((max + margen) - (min - margen))) * (alto - 56);
  const rotulo = (p, ancla) => [
    s('text', { x: x(p.fecha), y: y(p.valor) - 10, 'text-anchor': ancla, 'font-size': 12, fill: 'currentColor' }, document.createTextNode(`${formatearNumero(p.valor)} ${unidad}`)),
    s('text', { x: x(p.fecha), y: alto - 6, 'text-anchor': ancla, 'font-size': 11, fill: 'currentColor', opacity: 0.7 }, document.createTextNode(fechaCorta(p.fecha).slice(0, 5)))];
  return s('svg', { viewBox: `0 0 ${ancho} ${alto}`, class: 'grafica-peso', role: 'img',
    'aria-label': `De ${formatearNumero(vs[0])} a ${formatearNumero(vs.at(-1))} ${unidad}` },
  s('polyline', { points: ultimos.map((p) => `${x(p.fecha)},${y(p.valor)}`).join(' '), fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
  ultimos.map((p) => s('circle', { cx: x(p.fecha), cy: y(p.valor), r: 3, fill: 'currentColor' })),
  rotulo(ultimos[0], 'start'), rotulo(ultimos.at(-1), 'end'));
}
