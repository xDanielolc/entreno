// Gráficas de progreso, en SVG y sin librerías.
//
// Son las dos de tus Excel: la evolución del 1RM estimado y el trabajo de la
// serie, con los ciclos superpuestos para comparar unos con otros.
//
// Los colores de las series están validados para daltonismo en claro y en
// oscuro. El nombre de cada ciclo va en la leyenda y en la tabla de números
// (Dan prefirió quitar la etiqueta del final de cada línea).

import {
  esfuerzoTotal, formatearNumero, records, registrosDelCiclo, seriesDeEjercicio, trabajoSerie, valeParaReferencia, valeParaRM,
} from '../calculos.js';
import { rmDeSerie } from '../formula1rm.js';
import { recomendacionesGenerales } from '../recomendaciones.js';
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

// `textoX`: cómo se escribe cada valor del eje X (por defecto, el número; en
// el historial, la fecha).
export function graficaLineas({ titulo, series, unidad, etiquetaX = 'Día del ciclo', textoX = (x) => x }) {
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
  // Con fechas, las de los extremos se arriman hacia dentro para que quepan.
  const anclaX = (v) => (textoX(v) === v ? 'middle' : v === xMin ? 'start' : v === xMax ? 'end' : 'middle');

  const grafico = nodo('svg', {
    viewBox: `0 0 ${ANCHO} ${ALTO}`, class: 'grafica', role: 'img',
    'aria-label': `${titulo}. ${conDatos.map((s) => `${s.nombre}: de ${formatearNumero(s.puntos[0].y)} a ${formatearNumero(s.puntos.at(-1).y)} ${unidad}`).join('. ')}`,
  },
  // Rejilla, discreta
  marcasY.map((v) => nodo('line', { x1: MARGEN.izquierda, x2: ANCHO - MARGEN.derecha, y1: py(v), y2: py(v), class: 'rejilla' })),
  marcasY.map((v) => texto(formatearNumero(Math.round(v)), { x: MARGEN.izquierda - 6, y: py(v) + 3, class: 'eje', 'text-anchor': 'end' })),
  marcasX.map((v) => texto(textoX(v), { x: px(v), y: ALTO - 8, class: 'eje', 'text-anchor': anclaX(v) })),

  // Una línea por ciclo, con sus puntos y su etiqueta al final
  conDatos.map((s) => {
    const d = s.puntos.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');
    return nodo('g', { class: 'serie-grafica', style: `--color:${s.color}` },
      !s.discontinua && nodo('path', { d, class: 'linea' }),
      !s.discontinua && s.puntos.map((p) => nodo('circle', { cx: px(p.x), cy: py(p.y), r: 4, class: 'punto' },
        etiquetaEmergente(`${s.nombre} · ${etiquetaX.toLowerCase()} ${textoX(p.x)}: ${formatearNumero(p.y)} ${unidad}`))),
      s.discontinua && nodo('path', { d, class: 'linea discontinua' }));
  }));

  return h('figure', { class: 'figura' },
    h('figcaption', {}, titulo, h('span', { class: 'suave' }, ` (${unidad})`)),
    grafico,
    h('p', { class: 'nota centrado' }, etiquetaX),
    h('div', { class: 'leyenda' }, conDatos.map((s) => h('span', { class: 'leyenda-item' },
      h('span', { class: 'leyenda-color', style: `background:${s.color}` }), s.nombre))),
    tablaDeDatos(conDatos.filter((s) => !s.discontinua), unidad, etiquetaX, textoX));
}

// Los mismos datos en forma de tabla: para leerlos exactos y para quien no
// pueda ver la gráfica.
function tablaDeDatos(series, unidad, etiquetaX, textoX = (x) => x) {
  const xs = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.x)))].sort((a, b) => a - b);
  return h('details', { class: 'tabla-datos' },
    h('summary', {}, 'Ver los números'),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, etiquetaX), series.map((s) => h('th', {}, s.nombre)))),
      h('tbody', {}, xs.map((x) => h('tr', {},
        h('th', {}, textoX(x)),
        series.map((s) => h('td', {}, formatearNumero(s.puntos.find((p) => p.x === x)?.y) || '—')))))));
}

// ---------------------------------------------------------------------------
// Sección de progreso de un ejercicio
// ---------------------------------------------------------------------------

const COLORES_CLARO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const COLORES_OSCURO = ['#3987e5', '#d95926', '#199e70', '#c98500'];

export function colores() {
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

// Qué fechas se ven en «Todo el historial» (Dan: «un selector para ver todo
// desde el inicio, cada ciclo y unas fechas por defecto: 1 mes, 3 meses, 1 año»).
const RANGOS = [['todo', 'Todo'], ['12', '1 año'], ['3', '3 meses'], ['1', '1 mes'], ['desde', 'Desde…']];
let rango = 'todo';
let rangoDesde = null;

function desdeDelRango() {
  if (rango === 'todo') return null;
  if (rango === 'desde') return rangoDesde;
  const d = new Date();
  d.setMonth(d.getMonth() - Number(rango));
  return d.toISOString().slice(0, 10);
}

function selectorRango(repintar) {
  return h('div', { class: 'rango-fechas' },
    h('div', { class: 'fila-marcas compacta', role: 'group', 'aria-label': 'Fechas que se ven' }, RANGOS.map(([k, texto]) =>
      h('button', { type: 'button', class: `boton-marca${rango === k ? ' activo' : ''}`, 'aria-pressed': String(rango === k),
        onclick: () => { rango = k; repintar(); } }, texto))),
    rango === 'desde' && h('input', { type: 'date', value: rangoDesde ?? '', max: new Date().toISOString().slice(0, 10), 'aria-label': 'Desde qué día',
      onchange: (e) => { rangoDesde = e.target.value || null; repintar(); } }));
}

// El mejor 1RM de cada día, en kg, desde una fecha (o de siempre).
function mejorPorDia(datos, ejercicio, vale, desde) {
  const porDia = new Map();
  for (const x of seriesDeEjercicio(datos, ejercicio.id)) {
    if (!vale(x.serie) || (desde && x.sesion.fecha < desde)) continue;
    const v = rmDeSerie(datos, ejercicio, x.serie, esfuerzoTotal(x.serie));
    if (v != null) porDia.set(x.sesion.fecha, Math.max(porDia.get(x.sesion.fecha) ?? 0, v));
  }
  return porDia;
}

function graficaHistorial(datos, ejercicio, paleta, repintar) {
  const desde = desdeDelRango();
  // Las series largas (más de 12, o las Bilbo) estiman peor el 1RM: si hay
  // bastantes días con series cortas, la gráfica y la tendencia salen solo de
  // ellas (Dan: «los cálculos pasados se basan en altas repeticiones»).
  const cortas = mejorPorDia(datos, ejercicio, (s) => valeParaReferencia(ejercicio, s), desde);
  const soloCortas = cortas.size >= 4;
  const porDia = soloCortas ? cortas : mejorPorDia(datos, ejercicio, valeParaRM, desde);
  const vale = (serie) => valeParaRM(serie);
  const fechas = [...porDia.keys()].sort();
  // El primer día ya hay gráfica: el 1RM que sale de cada serie de ese día.
  if (fechas.length === 1 && rango === 'todo') {
    const puntos = seriesDeEjercicio(datos, ejercicio.id).filter((x) => vale(x.serie))
      .map((x) => rmDeSerie(datos, ejercicio, x.serie, esfuerzoTotal(x.serie))).filter((v) => v != null)
      .map((v, k) => ({ x: k + 1, y: Math.round(v * 10) / 10 }));
    if (!puntos.length) return null;
    return [
      h('p', { class: 'tendencia' }, 'Tu primer día: el 1RM que sale de cada serie. Desde el segundo día verás cómo progresas.'),
      graficaLineas({ titulo: 'Tu 1RM estimado en cada serie', unidad: 'kg', etiquetaX: 'Serie',
        series: [{ nombre: '1RM de la serie', color: paleta[0], puntos }] })];
  }
  if (fechas.length < 2) {
    return [selectorRango(repintar), h('p', { class: 'suave centrado' }, 'En estas fechas hay menos de dos días con este ejercicio.')];
  }
  // El eje X son días de verdad (no «entrenamiento 1, 2, 3…»): así se ve
  // cuándo entrenaste y la tendencia es por mes de calendario.
  const t0 = new Date(fechas[0]).getTime();
  const diaDe = (f) => Math.round((new Date(f).getTime() - t0) / 86_400_000);
  const fechaDe = (dias) => fechaCorta(new Date(t0 + dias * 86_400_000).toISOString().slice(0, 10));
  const puntos = fechas.map((f) => ({ x: diaDe(f), y: Math.round(porDia.get(f) * 10) / 10, dias: diaDe(f) }));
  const t = tendencia(puntos);
  const texto = !t ? 'Con 4 días o más verás si tu 1RM va a mejor.'
    : Math.abs(t.porMes) < 0.5 ? 'Tu 1RM está estable.'
      : t.porMes > 0 ? `Tu 1RM sube unos ${formatearNumero(Math.round(t.porMes * 10) / 10)} kg al mes.`
        : `Tu 1RM baja unos ${formatearNumero(Math.round(-t.porMes * 10) / 10)} kg al mes: revisa descanso y recuperación.`;
  return [
    selectorRango(repintar),
    h('p', { class: `tendencia ${t && t.porMes >= 0.5 ? 'sube' : t && t.porMes <= -0.5 ? 'baja' : ''}` }, texto),
    soloCortas && h('p', { class: 'nota centrado' }, 'Con tus series de 12 repeticiones o menos, que estiman mejor el 1RM.'),
    graficaLineas({
      titulo: 'Tu mejor 1RM estimado de cada día',
      unidad: 'kg',
      etiquetaX: 'Fecha',
      textoX: fechaDe,
      series: [
        { nombre: 'Mejor 1RM del día', color: paleta[0], puntos: puntos.map(({ x, y }) => ({ x, y })) },
        t && { nombre: 'Tendencia', color: paleta[1], discontinua: true,
          puntos: [puntos[0], puntos.at(-1)].map((p) => ({ x: p.x, y: Math.round(t.en(p.dias) * 10) / 10 })) },
      ].filter(Boolean),
    })];
}

// Se repinta sola al cambiar de vista o de fechas (también dentro de un
// cartel, donde repintar la pantalla de detrás no serviría).
export function seccionProgreso(datos, ejercicio) {
  const primera = construirProgreso(datos, ejercicio, () => {});
  if (!primera) return null;
  const caja = h('div', { class: 'progreso-caja' });
  const repintar = () => caja.replaceChildren(construirProgreso(datos, ejercicio, repintar) ?? '');
  repintar();
  return caja;
}

function construirProgreso(datos, ejercicio, repintar) {
  const planes = (ejercicio.series || []).filter((p) => p.progresion?.tipo === 'bilbo');
  const paleta = colores();
  const r = records(datos, ejercicio.id);
  if (!r.mejorTrabajo && !r.mejor1RM) return null;
  const conCiclos = planes.some((p) => (p.progresion.ciclos || []).some((c) => registrosDelCiclo(datos, ejercicio, p, c.n).length > 1));
  const vista = conCiclos ? vistaProgreso : 'historial';

  const graficas = [];
  if (vista === 'historial' && ejercicio.carga?.tipo !== 'ninguna') graficas.push(...(graficaHistorial(datos, ejercicio, paleta, repintar) ?? []));
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

  const avisos = recomendacionesGenerales(datos).filter((x) => x.enlace === `#/ejercicio/${ejercicio.id}` && x.clave !== 'ciclo-terminado');
  return h('section', { class: 'progreso' },
    h('h2', {}, 'Progreso'),
    avisos.map((x) => h('p', { class: 'aviso-texto' }, x.texto)),
    conCiclos && h('div', { class: 'fila-marcas compacta' }, [['historial', 'Todo el historial'], ['ciclos', 'Por ciclos']].map(([k, texto]) =>
      h('button', { type: 'button', class: `boton-marca${vista === k ? ' activo' : ''}`, 'aria-pressed': String(vista === k),
        onclick: () => { vistaProgreso = k; repintar(); } }, texto))),
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
      'Cuando tengas dos días registrados aparecerán aquí las gráficas.'),
    tablaEntrenamientos(datos, ejercicio));
}

// Todos los días del ejercicio en una tabla, como en las hojas de cálculo:
// fecha, ciclo, lo que hiciste, el 1RM del día y tus comentarios.
function tablaEntrenamientos(datos, ejercicio) {
  const dias = new Map();
  const desde = desdeDelRango();
  for (const x of seriesDeEjercicio(datos, ejercicio.id)) {
    if (x.serie.tipo === 'calentamiento' || (desde && x.sesion.fecha < desde)) continue;
    if (!dias.has(x.sesion.id)) dias.set(x.sesion.id, { sesion: x.sesion, entrada: x.entrada, series: [] });
    dias.get(x.sesion.id).series.push(x.serie);
  }
  if (!dias.size) return null;
  const conCarga = ejercicio.carga?.tipo !== 'ninguna';
  const texto = (s) => (s.tramos?.length
    ? s.tramos.map((t) => `${formatearNumero(t.carga)}×${formatearNumero(t.esfuerzo)}`).join(' → ')
    : [s.carga != null && formatearNumero(s.carga), s.esfuerzo != null && `${formatearNumero(s.esfuerzo)}${s.recamara ? `+${s.recamara}` : ''}`]
      .filter(Boolean).join('×'));
  const filas = [...dias.values()].reverse();
  return h('details', { class: 'tabla-datos' },
    h('summary', {}, 'Ver los entrenamientos'),
    h('div', { class: 'tabla-scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Día'), h('th', {}, 'Ciclo'), h('th', {}, conCarga ? 'kg × reps' : 'Hecho'),
        conCarga && h('th', {}, '1RM'), h('th', {}, 'Comentarios'))),
      h('tbody', {}, filas.map(({ sesion, entrada, series }) => {
        const rm = conCarga ? Math.max(...series.map((s) => rmDeSerie(datos, ejercicio, s, esfuerzoTotal(s)) ?? 0)) : 0;
        const notas = [...series.map((s) => s.nota), entrada.nota].filter(Boolean);
        return h('tr', {},
          h('th', {}, fechaCorta(sesion.fecha)),
          h('td', {}, entrada.cicloN ? `${entrada.cicloN}·${entrada.diaCiclo ?? '—'}` : '—'),
          h('td', {}, series.map(texto).join(' · ')),
          conCarga && h('td', {}, rm ? formatearNumero(Math.round(rm * 10) / 10) : '—'),
          h('td', { class: 'comentario' }, notas.join(' · ') || ''));
      })))),
    h('p', { class: 'nota centrado' }, 'Lo más reciente arriba. Ciclo: número de ciclo · día (lo de tus Excel juntado con este ejercicio va sin ciclo). Calentamientos fuera.'));
}
