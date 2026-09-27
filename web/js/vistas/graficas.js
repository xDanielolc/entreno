// Gráficas de progreso, en SVG y sin librerías.
//
// Son las dos de tus Excel: la evolución del 1RM estimado y el trabajo de la
// serie, con los ciclos superpuestos para comparar unos con otros.
//
// Los colores de las series están validados para daltonismo en claro y en
// oscuro. El nombre de cada ciclo va en la leyenda y en la tabla de números
// (Dan prefirió quitar la etiqueta del final de cada línea).

import {
  esfuerzoTotal, formatearNumero, records, registrosDelCiclo, seriesDeEjercicio, trabajoSerie,
} from '../calculos.js';
import { rmDeSerie } from '../formula1rm.js';
import { fechaCorta, h } from '../ui.js';

const CICLOS_A_MOSTRAR = 4;
const ANCHO = 320;
const ALTO = 190;
const MARGEN = { arriba: 14, derecha: 34, abajo: 26, izquierda: 38 };

function svg(etiqueta, ...hijos) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', etiqueta);
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false) continue;
    el.append(hijo);
  }
  return el;
}

function nodo(etiqueta, props = {}, ...hijos) {
  const el = svg(etiqueta, ...hijos);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    el.setAttribute(k, v);
  }
  return el;
}

// Texto que muestra el navegador al mantener el dedo o el ratón sobre el punto.
function etiquetaEmergente(contenido) {
  const el = svg('title');
  el.textContent = contenido;
  return el;
}

function texto(contenido, props) {
  const el = nodo('text', props);
  el.textContent = contenido;
  return el;
}

// ---------------------------------------------------------------------------
// Gráfica de líneas
// ---------------------------------------------------------------------------

export function graficaLineas({ titulo, series, unidad, etiquetaX = 'Día del ciclo' }) {
  const conDatos = series.filter((s) => s.puntos.length);
  if (!conDatos.length) return null;

  const xs = conDatos.flatMap((s) => s.puntos.map((p) => p.x));
  const ys = conDatos.flatMap((s) => s.puntos.map((p) => p.y));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs, xMin + 1);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys, yMin + 1);
  const holgura = (yMax - yMin) * 0.12 || 1;
  const y0 = yMin - holgura;
  const y1 = yMax + holgura;

  const px = (x) => MARGEN.izquierda + ((x - xMin) / (xMax - xMin)) * (ANCHO - MARGEN.izquierda - MARGEN.derecha);
  const py = (y) => ALTO - MARGEN.abajo - ((y - y0) / (y1 - y0)) * (ALTO - MARGEN.arriba - MARGEN.abajo);

  const marcasY = [y0 + (y1 - y0) * 0.1, (y0 + y1) / 2, y1 - (y1 - y0) * 0.1];
  const marcasX = [...new Set([xMin, Math.round((xMin + xMax) / 2), xMax])];

  const grafico = nodo('svg', {
    viewBox: `0 0 ${ANCHO} ${ALTO}`, class: 'grafica', role: 'img',
    'aria-label': `${titulo}. ${conDatos.map((s) => `${s.nombre}: de ${formatearNumero(s.puntos[0].y)} a ${formatearNumero(s.puntos.at(-1).y)} ${unidad}`).join('. ')}`,
  },
  // Rejilla, discreta
  marcasY.map((v) => nodo('line', { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: py(v), y2: py(v), class: 'rejilla' })),
  marcasY.map((v) => texto(formatearNumero(Math.round(v)), { x: MARGEN.izquierda - 6, y: py(v) + 3, class: 'eje', 'text-anchor': 'end' })),
  marcasX.map((v) => texto(v, { x: px(v), y: ALTO - 8, class: 'eje', 'text-anchor': 'middle' })),

  // Una línea por ciclo, con sus puntos y su etiqueta al final
  conDatos.map((s) => {
    const d = s.puntos.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');
    return nodo('g', { class: 'serie-grafica', style: `--color:${s.color}` },
      !s.discontinua && nodo('path', { d, class: 'linea' }),
      !s.discontinua && s.puntos.map((p) => nodo('circle', { cx: px(p.x), cy: py(p.y), r: 4, class: 'punto' },
        etiquetaEmergente(`${s.nombre} · ${etiquetaX.toLowerCase()} ${p.x}: ${formatearNumero(p.y)} ${unidad}`))),
      s.discontinua && nodo('path', { d, class: 'linea discontinua' }));
  }));

  return h('figure', { class: 'figura' },
    h('figcaption', {}, titulo, h('span', { class: 'suave' }, ` (${unidad})`)),
    grafico,
    h('p', { class: 'nota centrado' }, etiquetaX),
    h('div', { class: 'leyenda' }, conDatos.map((s) => h('span', { class: 'leyenda-item' },
      h('span', { class: 'leyenda-color', style: `background:${s.color}` }), s.nombre))),
    tablaDeDatos(conDatos.filter((s) => !s.discontinua), unidad, etiquetaX));
}

// Los mismos datos en forma de tabla: para leerlos exactos y para quien no
// pueda ver la gráfica.
function tablaDeDatos(series, unidad, etiquetaX) {
  const xs = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.x)))].sort((a, b) => a - b);
  return h('details', { class: 'tabla-datos' },
    h('summary', {}, 'Ver los números'),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, etiquetaX), series.map((s) => h('th', {}, s.nombre)))),
      h('tbody', {}, xs.map((x) => h('tr', {},
        h('th', {}, x),
        series.map((s) => h('td', {}, formatearNumero(s.puntos.find((p) => p.x === x)?.y) || '—')))))));
}

// ---------------------------------------------------------------------------
// Sección de progreso de un ejercicio
// ---------------------------------------------------------------------------

const COLORES_CLARO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const COLORES_OSCURO = ['#3987e5', '#d95926', '#199e70', '#c98500'];

function colores() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro'
    || (!document.documentElement.dataset.tema && matchMedia('(prefers-color-scheme: dark)').matches);
  return oscuro ? COLORES_OSCURO : COLORES_CLARO;
}

// Qué se ve en el progreso: los ciclos por separado o todo seguido.
let vistaProgreso = 'historial';

// Tendencia del 1RM: recta de mínimos cuadrados sobre el mejor 1RM de cada
// día, en kilos por mes. Con menos de 4 días no se dice nada.
function tendencia(puntos) {
  if (puntos.length < 4) return null;
  const n = puntos.length;
  const mx = puntos.reduce((t, p) => t + p.dias, 0) / n;
  const my = puntos.reduce((t, p) => t + p.y, 0) / n;
  const sxx = puntos.reduce((t, p) => t + (p.dias - mx) ** 2, 0);
  if (!sxx) return null;
  const pendiente = puntos.reduce((t, p) => t + (p.dias - mx) * (p.y - my), 0) / sxx;
  return { porMes: pendiente * 30, en: (dias) => my + pendiente * (dias - mx) };
}

function graficaHistorial(datos, ejercicio, paleta) {
  const porDia = new Map();
  for (const x of seriesDeEjercicio(datos, ejercicio.id)) {
    if (x.serie.tramos?.length || x.serie.tipo === 'calentamiento') continue;
    const v = rmDeSerie(datos, ejercicio, x.serie, esfuerzoTotal(x.serie));
    if (v != null) porDia.set(x.sesion.fecha, Math.max(porDia.get(x.sesion.fecha) ?? 0, v));
  }
  const fechas = [...porDia.keys()].sort();
  if (fechas.length < 2) return null;
  const t0 = new Date(fechas[0]).getTime();
  const puntos = fechas.map((f, i) => ({ x: i + 1, y: Math.round(porDia.get(f) * 10) / 10, dias: (new Date(f).getTime() - t0) / 86_400_000 }));
  const t = tendencia(puntos);
  const texto = !t ? 'Con 4 días o más verás si tu 1RM va a mejor.'
    : Math.abs(t.porMes) < 0.5 ? 'Tu 1RM está estable.'
      : t.porMes > 0 ? `Tu 1RM sube unos ${formatearNumero(Math.round(t.porMes * 10) / 10)} kg al mes.`
        : `Tu 1RM baja unos ${formatearNumero(Math.round(-t.porMes * 10) / 10)} kg al mes: revisa descanso y recuperación.`;
  return [
    h('p', { class: `tendencia ${t && t.porMes >= 0.5 ? 'sube' : t && t.porMes <= -0.5 ? 'baja' : ''}` }, texto),
    graficaLineas({
      titulo: 'Tu mejor 1RM estimado de cada día',
      unidad: 'kg',
      etiquetaX: 'Entrenamiento',
      series: [
        { nombre: 'Mejor 1RM del día', color: paleta[0], puntos: puntos.map(({ x, y }) => ({ x, y })) },
        t && { nombre: 'Tendencia', color: paleta[1], discontinua: true,
          puntos: [puntos[0], puntos.at(-1)].map((p) => ({ x: p.x, y: Math.round(t.en(p.dias) * 10) / 10 })) },
      ].filter(Boolean),
    })];
}

export function seccionProgreso(datos, ejercicio) {
  const planes = (ejercicio.series || []).filter((p) => p.progresion?.tipo === 'bilbo');
  const paleta = colores();
  const r = records(datos, ejercicio.id);
  if (!r.mejorTrabajo && !r.mejor1RM) return null;
  const conCiclos = planes.some((p) => (p.progresion.ciclos || []).some((c) => registrosDelCiclo(datos, ejercicio, p, c.n).length > 1));
  const vista = conCiclos ? vistaProgreso : 'historial';

  const graficas = [];
  if (vista === 'historial' && ejercicio.carga?.tipo !== 'ninguna') graficas.push(...(graficaHistorial(datos, ejercicio, paleta) ?? []));
  for (const plan of vista === 'ciclos' ? planes : []) {
    const ciclos = (plan.progresion.ciclos || [])
      .map((c) => ({ c, registros: registrosDelCiclo(datos, ejercicio, plan, c.n) }))
      .filter((x) => x.registros.length > 1)
      .slice(-CICLOS_A_MOSTRAR);
    if (!ciclos.length) continue;

    const serie = (valor) => ciclos.map((x, i) => ({
      nombre: `Ciclo ${x.c.n}`,
      etiquetaCorta: `C${x.c.n}`,
      color: paleta[i % paleta.length],
      puntos: x.registros
        .map((reg) => ({ x: reg.dia, y: valor(reg.serie) }))
        .filter((p) => p.y != null)
        .sort((a, b) => a.x - b.x),
    }));

    const conCarga = ejercicio.carga?.tipo !== 'ninguna';
    if (conCarga) {
      graficas.push(graficaLineas({
        titulo: 'Evolución del 1RM estimado',
        series: serie((s) => {
          const v = rmDeSerie(datos, ejercicio, s, esfuerzoTotal(s));
          return v == null ? null : Math.round(v * 10) / 10;
        }),
        unidad: 'kg',
      }));
    }
    graficas.push(graficaLineas({
      titulo: conCarga ? 'Trabajo en la serie' : 'Evolución',
      series: serie((s) => (conCarga ? trabajoSerie(s) : esfuerzoTotal(s))),
      unidad: conCarga ? 'kg de trabajo: peso × repeticiones' : (ejercicio.esfuerzo?.unidad ?? ''),
    }));
  }

  return h('section', { class: 'progreso' },
    h('h2', {}, 'Progreso'),
    conCiclos && h('div', { class: 'fila-marcas compacta' }, [['historial', 'Todo el historial'], ['ciclos', 'Por ciclos']].map(([k, texto]) =>
      h('button', { type: 'button', class: `boton-marca${vista === k ? ' activo' : ''}`, 'aria-pressed': String(vista === k),
        onclick: () => { vistaProgreso = k; dispatchEvent(new HashChangeEvent('hashchange')); } }, texto))),
    h('div', { class: 'tarjetas-record' },
      r.mejor1RM && h('div', { class: 'tarjeta record' },
        h('span', { class: 'suave' }, 'Récord de 1RM estimado'),
        h('strong', {}, `${formatearNumero(r.mejor1RM.valor)} kg`),
        h('span', { class: 'suave' }, fechaCorta(r.mejor1RM.fecha))),
      r.mejorTrabajo && h('div', { class: 'tarjeta record' },
        h('span', { class: 'suave' }, 'Récord de trabajo en una serie'),
        h('strong', {}, `${formatearNumero(r.mejorTrabajo.valor)} kg`),
        h('span', { class: 'suave' }, fechaCorta(r.mejorTrabajo.fecha)))),
    graficas.filter(Boolean),
    !graficas.filter(Boolean).length && h('p', { class: 'suave' },
      'Cuando tengas dos días registrados aparecerán aquí las gráficas.'));
}
