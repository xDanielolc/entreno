// Histórico del test de atención: todos los tests hechos, en gráfica y en
// tabla, cada duración por su lado.
//
// Lo pidió Dan el 28-10-2026: quería ver la evolución de los resultados del
// test aparte del histórico de sueño. La tarjeta del diario solo enseña los
// del día, y la media móvil no deja ver si una semana fue mala.
//
// Tres decisiones que vienen de la evidencia, no del gusto:
//   · Cada duración va por separado y nunca se mezclan. En personas
//     descansadas la versión de 3 min no correlaciona con la de 10
//     (Antler 2022, PMID 35242006).
//   · La medida principal es la velocidad de respuesta (1/TR promediado), no
//     los lapsos: con 7 h en cama la velocidad baja mientras los lapsos
//     siguen planos (Belenky 2003), así que mirar lapsos al
//     recortar horas engaña.
//   · La línea del 11,5 % es el cambio mínimo detectable del test de 5 min
//     (2,77 × el error típico del 4,1-4,4 % de Thompson 2022, PMID 34627928).
//     Por encima de esa línea, una bajada es ruido tuyo, no una señal.

import * as estado from '../estado.js';
import { formatearNumero } from '../calculos.js';
import {
  CAMBIO_REAL_PVT, MODOS_PVT, MODO_PVT_POR_DEFECTO, TESTS_MEDIA_MOVIL,
  baseDePVT, compararConBase, datosModoPVT, mediaMovilPVT, modoPVT, testsPVT,
} from '../diario.js';
import { fechaCorta, h, modal, selector } from '../ui.js';
import { colores, graficaLineas } from './graficas.js';

const SUAVE = 'opacity: .8; font-size: .9rem;';

const velocidadTexto = (v) => (v > 0 ? formatearNumero(Math.round(v * 100) / 100) : '—');
const porcentaje = (x) => `${x > 0 ? '+' : '−'}${formatearNumero(Math.round(Math.abs(x) * 1000) / 10)} %`;

// ¿De qué duraciones hay algo que mirar? Si no hay ninguna, no se abre.
export const modosConTests = (d) => Object.keys(MODOS_PVT).filter((m) => testsPVT(d, m).length);

export function abrirHistoricoPVT({ modo = null } = {}) {
  const d = estado.datos();
  const conTests = modosConTests(d);
  let cual = modo && conTests.includes(modo) ? modo
    : conTests.includes(MODO_PVT_POR_DEFECTO) ? MODO_PVT_POR_DEFECTO
      : conTests[0];

  const cuerpo = h('div', { class: 'ayuda-texto' });
  const pintar = () => {
    const tests = testsPVT(d, cual);
    const base = baseDePVT(d, cual);
    const movil = mediaMovilPVT(d, cual);
    // Se filtran los nulos: `replaceChildren` es la API del DOM y no los salta
    // como hace `h`, así que un null se colaría como el texto «null».
    cuerpo.replaceChildren(...[
      conTests.length > 1
        ? selector(conTests.map((m) => [m, MODOS_PVT[m].etiqueta]), cual, (v) => { cual = v; pintar(); },
          { titulo: 'Duración del test', botones: true, compacto: true })
        : null,
      resumen(base, movil, tests),
      grafica(tests, base, cual),
      tabla(tests, base),
      h('p', { style: SUAVE }, 'Solo te comparas contigo: no hay baremos publicados del test en ninguna de sus versiones (Taillard 2024, PMID 38401239). Y las tres duraciones no se mezclan, porque en gente descansada la de 3 min no correlaciona con la de 10 (Antler 2022, PMID 35242006).'),
      h('div', { class: 'fila-botones' }, h('button', { class: 'boton', onclick: () => cerrar() }, 'Cerrar')),
    ].filter(Boolean));
  };

  const cerrar = modal('Histórico del test', cuerpo);
  pintar();
  return cerrar;
}

// Las tres cifras con las que se lee todo lo demás.
function resumen(base, movil, tests) {
  const frente = movil && !base.falta ? compararConBase(movil.velocidad, base) : null;
  return h('div', {},
    h('p', {}, `${tests.length} ${tests.length === 1 ? 'test' : 'tests'}`,
      tests.length ? ` entre el ${fechaCorta(tests[0].fecha)} y el ${fechaCorta(tests.at(-1).fecha)}` : '', '.'),
    base.falta
      ? h('p', { style: SUAVE }, base.falta === 'tests'
        ? `Todavía no hay línea base de esta duración: la forman tus primeros 5 tests y llevas ${base.tests}. Sin ella no se puede decir si algo ha cambiado.`
        : 'Todavía no hay ningún test de esta duración.')
      : h('p', {}, 'Tu línea base: ', h('strong', {}, velocidadTexto(base.velocidad), ' resp/s'),
        ` (tus primeros ${base.tests} tests, del ${fechaCorta(base.desde)} al ${fechaCorta(base.hasta)}).`,
        base.repartida ? h('span', { style: SUAVE }, ` Repartidos en ${base.abarca} días, así que compárate con cuidado.`) : null),
    movil
      ? h('p', {}, movil.tests === 1 ? 'Tu último test: ' : `Tus últimos ${Math.min(TESTS_MEDIA_MOVIL, movil.tests)}: `,
        h('strong', {}, velocidadTexto(movil.velocidad), ' resp/s'),
        frente
          ? h('span', {}, ' · ', porcentaje(frente.cambio), ' frente a tu base',
            frente.real
              ? h('strong', {}, frente.masLento ? ', y eso ya es un bajón real' : ', y eso ya es una subida real')
              : h('span', { style: SUAVE }, ', dentro de tu variación normal'))
          : null, '.')
      : null);
}

// La gráfica: un punto por test, la base en horizontal y el límite por debajo
// del cual una bajada ya cuenta como cambio real.
function grafica(tests, base, cual) {
  const buenos = tests.filter((t) => t.velocidad > 0);
  if (buenos.length < 2) return null;
  const [principal, , referencia, aviso] = colores();
  const fechas = buenos.map((t) => t.fecha);
  const puntos = buenos.map((t, i) => ({ x: i + 1, y: Math.round(t.velocidad * 100) / 100 }));
  const extremos = [{ x: 1 }, { x: buenos.length }];
  const series = [{ nombre: 'Velocidad', color: principal, puntos }];
  if (!base.falta) {
    series.push({
      nombre: 'Tu línea base',
      color: referencia ?? principal,
      discontinua: true,
      puntos: extremos.map((p) => ({ ...p, y: Math.round(base.velocidad * 100) / 100 })),
    });
    series.push({
      nombre: `Límite del ${formatearNumero(CAMBIO_REAL_PVT * 100)} %`,
      color: aviso ?? principal,
      discontinua: true,
      puntos: extremos.map((p) => ({ ...p, y: Math.round(base.velocidad * (1 - CAMBIO_REAL_PVT) * 100) / 100 })),
    });
  }
  return graficaLineas({
    titulo: `Velocidad de respuesta, test de ${datosModoPVT(cual).etiqueta}`,
    series,
    unidad: 'resp/s',
    etiquetaX: 'Test',
    decimalesY: 2,
    textoX: (x) => (fechas[x - 1] ? fechaCorta(fechas[x - 1]) : String(x)),
  });
}

// Todos los tests, del más reciente al más antiguo, con su cambio frente a la
// base. Los falsos toques salen aquí: en el histórico hay sitio.
function tabla(tests, base) {
  if (!tests.length) return null;
  const cabeceras = ['Fecha', 'Hora', 'Velocidad', 'Frente a tu base', 'Reacción', 'Lapsos', 'Falsos'];
  return h('div', { class: 'tabla-desliza' }, h('table', { class: 'tabla-musculos' },
    h('thead', {}, h('tr', {}, cabeceras.map((t) => h('th', {}, t)))),
    h('tbody', {}, tests.slice().reverse().map((t) => {
      const frente = compararConBase(t.velocidad, base);
      return h('tr', {},
        h('td', {}, fechaCorta(t.fecha)),
        h('td', {}, t.hora ?? '—'),
        h('td', {}, velocidadTexto(t.velocidad)),
        h('td', {}, frente
          ? h('span', { style: frente.real && frente.masLento ? 'color: var(--aviso);' : null }, porcentaje(frente.cambio))
          : '—'),
        h('td', {}, t.mediaMs != null ? `${t.mediaMs} ms` : '—'),
        h('td', {}, String(t.lapsos ?? '—')),
        h('td', {}, String(t.falsos ?? '—')));
    }))));
}
