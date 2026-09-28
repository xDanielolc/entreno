// Mapa de recuperación: qué músculos están listos y cuáles siguen tocados,
// más el volumen de la semana con sus avisos.

import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { cuentaParaFatiga } from '../catalogo.js';
import { ORDEN_MUSCULOS, nombreMusculo, siluetaCuerpo } from '../musculos.js';
import {
  FACTORES, claseDeRecuperacion, detalleDeRecuperacion, esAutomatico, factorAutomatico, factorPersonal, recuperacionPorMusculo,
  seriesEnDias, seriesSemanales, sugerenciasDeAjuste, textoDeRecuperacion, durezaSemanal,
} from '../recuperacion.js';
import { abrirAlLlegar, anadir, aviso, h, hoyISO, modal, plegable, selector } from '../ui.js';
import { conGlosario } from './glosario.js';
import { pista } from './tutorial.js';

// Referencias de volumen semanal por músculo (ver Ajustes → De dónde sale cada cosa).
const SERIES_MINIMAS = 10;
const SERIES_MAXIMAS = 20;

export function tarjetaRecuperacion(datos, { compacta = false } = {}) {
  // El cardio general (correr, HIIT) no tiene músculo principal a propósito.
  const sinMusculos = datos.ejercicios.filter((e) => !e.archivado && !e.borrado && cuentaParaFatiga(e)
    && e.grupo !== 'cardio' && !e.musculos?.principales?.length);
  const rec = recuperacionPorMusculo(datos);
  const estados = {};
  for (const m of ORDEN_MUSCULOS) {
    estados[m] = {
      clase: claseDeRecuperacion(rec[m].porcentaje),
      titulo: textoDeRecuperacion(rec[m]),
    };
  }
  const tocados = ORDEN_MUSCULOS.map((m) => rec[m]).filter((x) => x.porcentaje < 90)
    .sort((a, b) => a.porcentaje - b.porcentaje);
  const media = Math.round(ORDEN_MUSCULOS.reduce((t, m) => t + rec[m].porcentaje, 0) / ORDEN_MUSCULOS.length);

  return h('section', { class: 'tarjeta recuperacion' },
    h('h2', {}, 'Recuperación'),
    // La media, en una barra bajo el título: se lee de un vistazo.
    h('div', { class: `barra-media ${claseDeRecuperacion(media)}`, role: 'img', 'aria-label': `Recuperación media: ${media} %` },
      h('span', { class: 'texto' }, `${media} % de media`),
      h('span', { class: 'carril' }, h('span', { class: 'relleno', style: `width: ${media}%` }))),

    !compacta && h('div', { class: 'cuerpos' },
      siluetaCuerpo({ vista: 'delante', estadoPorMusculo: estados }),
      siluetaCuerpo({ vista: 'detras', estadoPorMusculo: estados })),

    sinMusculos.length > 0 && h('div', { class: 'aviso-texto' },
      h('p', {}, 'Un ejercicio solo sale en el mapa si tiene marcado su músculo principal (y, mejor, los secundarios). '
        + (sinMusculos.length > 1
          ? `Te faltan estos ${sinMusculos.length}; ábrelos y pulsa «Usar los del catálogo» o marca los músculos a mano:`
          : 'Te falta este; ábrelo y pulsa «Usar los del catálogo» o marca los músculos a mano:')),
      h('ul', { class: 'lista-enlaces' }, sinMusculos.map((e) => h('li', {},
        h('a', { href: `#/ejercicio/${e.id}` }, e.nombre))))),

    tocados.length
      ? h('ul', { class: 'lista-musculos' },
        tocados.slice(0, compacta ? 3 : 20).map((x) => h('li', {},
          h('span', { class: `punto ${claseDeRecuperacion(x.porcentaje)}` }),
          h('span', {}, textoDeRecuperacion(x),
            !compacta && h('small', { class: 'suave bloque' }, detalleDeRecuperacion(x))))))
      : h('p', { class: 'suave' }, 'Todo recuperado: puedes entrenar lo que quieras.'),

    !compacta && h('details', { class: 'explicacion' },
      h('summary', {}, '¿Cómo se calculan estos porcentajes y horas?'),
      h('p', {}, 'Tu recuperación depende de tres cosas: lo dura que fue la sesión (lo cerca del fallo que acabaste), cuántas series '
        + 'hiciste y tu genética (tu ajuste personal). Justo al acabar el músculo está al 0 % y va subiendo hasta el 100 %.'),
      h('p', { class: 'nota' }, 'Con detalle, para quien quiera saberlo:'),
      h('ul', {},
        h('li', {}, 'Lo cerca del fallo que acabaste las series, que es lo que más pesa: con 3 o más en recámara, 24 h; '
          + 'con 1 o 2, 36 h; al fallo, 48 h; al fallo con más de 15 repeticiones o con drop set, 60 h. '
          + 'Se hace la media de tus series con la más dura.'),
        h('li', {}, 'El volumen, que pesa cada vez menos: una serie se queda en el 57 % de esas horas, '
          + 'dos en el 69 %, tres en el 78 %, cinco en el 89 %, ocho en el 96 % y a partir de ahí casi no cambia.'),
        h('li', {}, 'Tu ajuste personal por músculo, si lo has puesto (abajo).')),
      h('p', { class: 'nota' }, 'Respaldo: las horas según la cercanía al fallo y que el volumen apenas influya salen de '
        + 'Morán-Navarro (2017) y Pareja-Blanco (2019 y 2020). La forma de la curva del volumen y la media con la serie más dura '
        + 'son aproximaciones de la app. No hay estudios que den un tiempo fijo por músculo; por eso existe el ajuste personal.')),

    compacta && h('a', { class: 'boton enlace', href: '#/cuerpo' }, 'Ver el mapa del cuerpo y el volumen'));
}

// Solo las propuestas de ajuste (para Hoy): si no hay ninguna, nada.
export function tarjetaSugerenciasAjuste(d) {
  const sugerencias = sugerenciasDeAjuste(d);
  if (!sugerencias.length) return null;
  return h('section', { class: 'tarjeta' },
    h('h2', {}, 'Tu ritmo de recuperación'),
    sugerencias.map((s) => tarjetaSugerencia(d, s)));
}

function tarjetaSugerencia(d, s) {
  const aplicar = (m, factor) => estado.cambiar((x) => {
    x.perfil.recuperacion ??= { factores: {}, desde: {} };
    x.perfil.recuperacion.factores ??= {};
    x.perfil.recuperacion.desde ??= {};
    if (factor === 1) delete x.perfil.recuperacion.factores[m];
    else x.perfil.recuperacion.factores[m] = factor;
    x.perfil.recuperacion.desde[m] = hoyISO();
    aviso(`${nombreMusculo(m)}: ajuste guardado`);
  });
  const descartar = (m) => estado.cambiar((x) => {
    x.perfil.recuperacion ??= { factores: {}, desde: {} };
    x.perfil.recuperacion.desde ??= {};
    x.perfil.recuperacion.desde[m] = hoyISO();
  });
  return h('div', { class: 'tarjeta aviso-tarjeta' },
    h('p', {}, s.sentido === 'lento'
      ? `No estás recuperando ${nombreMusculo(s.musculo)} al ritmo esperado: ${s.veces} de ${s.total} veces te pusiste al menos `
        + '3 puntos por debajo de lo que calculaba la app. Revisa sueño, comida (sobre todo proteína) y la distancia entre '
        + 'entrenamientos. Si es tu ritmo normal, ajústalo para que el mapa te dé más horas.'
      : `Recuperas ${nombreMusculo(s.musculo)} muy por encima de lo esperado: ${s.veces} de ${s.total} veces te pusiste al menos `
        + '3 puntos por encima de lo que calculaba la app. Quizá puedas entrenarlo más a menudo o con más series.'),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => descartar(s.musculo) }, 'No, déjalo'),
      h('button', { class: 'boton', onclick: () => aplicar(s.musculo, s.nuevo) },
        `Ajustar a «${FACTORES.find((f) => f.valor === s.nuevo)?.texto.toLowerCase()}»`)));
}

// ---------------------------------------------------------------------------
// Pestaña Cuerpo: un mapa con tres formas de verlo, las series de la semana,
// el ritmo de recuperación y los consejos, todo lo largo plegado.
// ---------------------------------------------------------------------------

// Qué enseña el mapa. Se recuerda mientras la app esté abierta.
const MODOS_MAPA = {
  recuperacion: 'Recuperación',
  semana: 'Qué entrenar esta semana',
  menos: 'Lo que menos entrenas',
};
let modoMapa = 'recuperacion';

const LEYENDAS = {
  recuperacion: [['listo', 'Listo'], ['medio', 'A medias'], ['cansado', 'Aún tocado']],
  semana: [['cansado', 'Le falta mucho o te pasas mucho'], ['medio', 'Le falta algo o te pasas'], ['listo', 'En su sitio']],
  menos: [['cansado', 'Casi nada'], ['medio', 'Por debajo'], ['listo', 'Bien']],
};

// Objetivo de series semanales de un músculo: el tuyo si lo has puesto; si
// no, 10, o 6 si la mitad o más de sus series van al fallo o con bajadas.
export function objetivoSeries(d, m, dureza = durezaSemanal(d)) {
  const manual = d.perfil.objetivoSeries?.[m];
  if (manual != null) return { n: manual, manual: true };
  const x = dureza[m];
  return { n: x?.series > 0 && x.duras / x.series >= 0.5 ? 6 : SERIES_MINIMAS, manual: false };
}

// Colores de las series frente al objetivo: rojo si falta mucho, amarillo si
// falta algo, verde en su sitio; al pasarse, amarillo y luego rojo, y rojo
// también si te pasas y el músculo no se ha recuperado.
export function claseSeries(n, objetivo, recuperado = 100) {
  const maximo = Math.max(SERIES_MAXIMAS, objetivo * 2);
  if (n < objetivo * 0.5) return 'cansado';
  if (n < objetivo) return 'medio';
  if (n <= maximo) return 'listo';
  if (n > maximo * 1.3 || recuperado < 60) return 'cansado';
  return 'medio';
}

export function vistaCuerpo(contenedor) {
  const d = estado.datos();
  anadir(contenedor,
    h('h1', {}, 'Tu cuerpo'),
    tarjetaMapa(d),
    tarjetaSeries(d),
    tarjetaAjustePersonal(d));
}

function tarjetaMapa(d) {
  const rec = recuperacionPorMusculo(d);
  const dureza = durezaSemanal(d);
  const semana = seriesSemanales(d);
  const dosMeses = seriesEnDias(d, 60);
  const redondo = (n) => formatearNumero(Math.round(n * 10) / 10);
  const estados = {};
  for (const m of ORDEN_MUSCULOS) {
    const objetivo = objetivoSeries(d, m, dureza).n;
    if (modoMapa === 'recuperacion') {
      estados[m] = { clase: claseDeRecuperacion(rec[m].porcentaje), titulo: textoDeRecuperacion(rec[m]) };
    } else if (modoMapa === 'semana') {
      estados[m] = { clase: claseSeries(semana[m], objetivo, rec[m].porcentaje),
        titulo: `${nombreMusculo(m)}: ${redondo(semana[m])} de ${objetivo} series esta semana` };
    } else {
      // Media semanal de los dos últimos meses frente al objetivo.
      const media = dosMeses[m] / (60 / 7);
      estados[m] = { clase: media < objetivo * 0.5 ? 'cansado' : media < objetivo ? 'medio' : 'listo',
        titulo: `${nombreMusculo(m)}: ${redondo(media)} series por semana de media` };
    }
  }
  const tocados = ORDEN_MUSCULOS.map((m) => rec[m]).filter((x) => x.porcentaje < 90)
    .sort((a, b) => a.porcentaje - b.porcentaje);
  const menos = ORDEN_MUSCULOS.map((m) => ({ m, media: dosMeses[m] / (60 / 7) }))
    .sort((a, b) => a.media - b.media).slice(0, 5);

  return h('section', { class: 'tarjeta recuperacion' },
    h('div', { class: 'fila-marcas compacta modos-mapa', role: 'group', 'aria-label': 'Qué enseña el mapa' },
      Object.entries(MODOS_MAPA).map(([clave, texto]) => h('button', { type: 'button',
        class: `boton-marca${clave === modoMapa ? ' activo' : ''}`, 'aria-pressed': String(clave === modoMapa),
        onclick: () => { modoMapa = clave; dispatchEvent(new HashChangeEvent('hashchange')); } }, texto))),
    h('div', { class: 'leyenda' }, LEYENDAS[modoMapa].map(([clase, texto]) => h('span', { class: 'leyenda-item' },
      h('span', { class: `leyenda-color ${clase}` }), texto)),
    modoMapa === 'menos' && h('span', { class: 'leyenda-item' }, 'Media de los dos últimos meses')),
    h('div', { class: 'cuerpos' },
      siluetaCuerpo({ vista: 'delante', estadoPorMusculo: estados }),
      siluetaCuerpo({ vista: 'detras', estadoPorMusculo: estados })),
    // Debajo, lo mismo en una tabla corta en vez de una frase por músculo.
    modoMapa === 'recuperacion' && (tocados.length
      ? h('table', { class: 'tabla-musculos' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Músculo'), h('th', { class: 'num' }, 'Recuperado'), h('th', { class: 'num' }, 'Le faltan'))),
        h('tbody', {}, tocados.map((x) => h('tr', {},
          h('td', {}, h('span', { class: `punto ${claseDeRecuperacion(x.porcentaje)}` }), nombreMusculo(x.musculo, { corto: true })),
          h('td', { class: 'num' }, `${x.porcentaje} %`),
          h('td', { class: 'num' }, x.horasRestantes ? `${x.horasRestantes} h` : '—')))))
      : h('p', { class: 'suave' }, 'Todo recuperado: puedes entrenar lo que quieras.')),
    modoMapa === 'menos' && h('table', { class: 'tabla-musculos' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Los que menos'), h('th', { class: 'num' }, 'Series por semana'))),
      h('tbody', {}, menos.map((x) => h('tr', {},
        h('td', {}, h('span', { class: `punto ${estados[x.m].clase}` }), nombreMusculo(x.m, { corto: true })),
        h('td', { class: 'num' }, redondo(x.media)))))),
    modoMapa === 'recuperacion' && plegable('cuerpo-calculo', 'Cómo se calcula', {},
      h('ul', { class: 'nota' },
        h('li', {}, 'Justo al acabar, el músculo está al 0 % y sube hasta el 100 %.'),
        h('li', {}, 'Lo que más pesa es lo cerca del fallo que acabaste: de 24 h (3 o más en recámara) a 60 h (al fallo con drop set o más de 15 repeticiones).'),
        h('li', {}, 'Más series alargan algo el tiempo, cada vez menos.'),
        h('li', {}, 'Tu ritmo de recuperación (abajo) lo alarga o lo acorta.'),
        h('li', {}, 'Respaldo: Morán-Navarro 2017 y Pareja-Blanco 2019 y 2020. La forma exacta de la curva es una aproximación de la app.'))));
}

// Series de la semana por músculo, de más a menos, como «8/10».
function tarjetaSeries(d) {
  const semana = seriesSemanales(d);
  const dureza = durezaSemanal(d);
  const rec = recuperacionPorMusculo(d);
  const dosMeses = seriesEnDias(d, 60);
  const filas = ORDEN_MUSCULOS.filter((m) => dosMeses[m] > 0).map((m) => ({ m, n: Math.round(semana[m] * 10) / 10, objetivo: objetivoSeries(d, m, dureza) }))
    .sort((a, b) => b.n - a.n);
  const pasados = filas.filter((x) => claseSeries(x.n, x.objetivo.n, rec[x.m].porcentaje) === 'cansado' && x.n >= x.objetivo.n);

  const cambiarObjetivo = (m) => {
    const actual = d.perfil.objetivoSeries?.[m] ?? null;
    const cerrar = modal(`Objetivo de ${nombreMusculo(m)}`, h('div', {},
      h('p', { class: 'nota' }, 'Series por semana que quieres hacer de este músculo.'),
      selector([[null, `Lo que calcule la app (${objetivoSeries({ ...d, perfil: { ...d.perfil, objetivoSeries: {} } }, m, dureza).n})`],
        ...[4, 6, 8, 10, 12, 15, 20].map((n) => [n, String(n)])], actual, (v) => {
        cerrar();
        estado.cambiar((x) => {
          x.perfil.objetivoSeries ??= {};
          if (v == null) delete x.perfil.objetivoSeries[m]; else x.perfil.objetivoSeries[m] = v;
        });
      }, { titulo: 'Objetivo', botones: true })));
  };

  return h('section', { class: 'tarjeta' },
    h('h2', {}, 'Series por músculo en los últimos 7 días'),
    pasados.length > 0 && h('p', { class: 'aviso-texto' },
      `Te pasas en ${pasados.map((x) => nombreMusculo(x.m, { corto: true })).join(', ')}: vigila que se recuperen antes de volver a cargarlos.`),
    plegable('cuerpo-series', 'Ver las series', {},
      h('div', { class: 'barras-musculo' }, filas.map((x) => {
        const clase = claseSeries(x.n, x.objetivo.n, rec[x.m].porcentaje);
        const ancho = Math.min(100, (x.n / Math.max(x.objetivo.n * 2, SERIES_MAXIMAS)) * 100);
        return h('div', { class: 'barra-musculo' },
          h('span', { class: 'nombre' }, nombreMusculo(x.m, { corto: true })),
          h('span', { class: `barra ${clase}` }, h('span', { style: `width:${ancho}%` })),
          h('button', { type: 'button', class: `valor boton-objetivo${x.objetivo.manual ? ' manual' : ''}`,
            'aria-label': `Cambiar el objetivo de ${nombreMusculo(x.m)}`, onclick: () => cambiarObjetivo(x.m) },
          `${formatearNumero(x.n)}/${x.objetivo.n}`));
      })),
      filas.length
        ? h('p', { class: 'nota' }, 'Toca el número para cambiar el objetivo. Solo salen los músculos que has entrenado en los dos últimos meses.')
        : h('p', { class: 'suave' }, 'Aún no hay series en los dos últimos meses.')),
    plegable('cuerpo-como', 'Cómo funciona', { id: 'como-cuentan-las-series' },
      h('ul', { class: 'nota' },
        h('li', {}, `Objetivo: ${SERIES_MINIMAS} series por semana, o 6 si la mitad o más van al fallo o con bajadas.`),
        h('li', {}, 'Puedes poner el tuyo tocando el número.'),
        h('li', {}, 'Rojo: te falta mucho. Amarillo: te falta algo. Verde: en su sitio.'),
        h('li', {}, `Pasado el máximo (${SERIES_MAXIMAS}, o el doble de tu objetivo) vuelve a amarillo, y a rojo si te pasas mucho o si el músculo no se ha recuperado.`),
        h('li', {}, 'Un músculo secundario cuenta media serie. Un drop set, según lo que elijas en Ajustes.'),
        h('li', {}, 'Estiramientos, movilidad y yoga no cuentan.')),
      h('a', { class: 'boton enlace', href: '#/aprender', onclick: () => abrirAlLlegar('ap-de-donde-sale-cada-cosa', 'ap-series-por-musculo-y-semana') },
        'De dónde salen estos números')));
}

// ---------------------------------------------------------------------------
// Ajustar ritmo de recuperación: automático o a mano, músculo a músculo
// ---------------------------------------------------------------------------

function tarjetaAjustePersonal(d) {
  const sugerencias = sugerenciasDeAjuste(d);
  const aplicar = (m, factor) => estado.cambiar((x) => {
    x.perfil.recuperacion ??= { factores: {}, desde: {} };
    x.perfil.recuperacion.factores ??= {};
    x.perfil.recuperacion.desde ??= {};
    if (factor == null) delete x.perfil.recuperacion.factores[m];
    else x.perfil.recuperacion.factores[m] = factor;
    // Las sensaciones de antes ya se han tenido en cuenta.
    x.perfil.recuperacion.desde[m] = hoyISO();
    aviso(`${nombreMusculo(m)}: ajuste guardado`);
  });
  const coma = (n) => String(n).replace('.', ',');

  return h('section', { class: 'tarjeta' },
    h('h2', {}, 'Ajustar ritmo de recuperación'),
    sugerencias.map((s) => tarjetaSugerencia(d, s)),
    plegable('cuerpo-ritmo-que', 'Qué es', {},
      h('ul', { class: 'nota' },
        h('li', {}, 'Cada persona se recupera a su ritmo. Este número multiplica las horas que calcula la app: ×1,2 son un 20 % más.'),
        h('li', {}, 'En automático, la app lo saca de lo que contestas en «¿Cómo llegas hoy?» al empezar a entrenar (hacen falta 3 respuestas).'),
        h('li', {}, 'También puedes fijarlo a mano.'))),
    plegable('cuerpo-ritmo-musculo', 'Por músculo', {},
      h('div', { class: 'ajustes-musculo' }, ORDEN_MUSCULOS.map((m) => {
        const auto = factorAutomatico(d, m);
        return h('div', { class: 'fila-ajuste' },
          h('span', {}, nombreMusculo(m)),
          selector([[null, `Automático (×${coma(auto ?? 1)}${auto == null ? ', aún sin datos' : ''})`],
            ...FACTORES.map((f) => [f.valor, `${f.texto} (×${coma(f.valor)})`])],
          esAutomatico(d, m) ? null : factorPersonal(d, m), (v) => aplicar(m, v), { titulo: nombreMusculo(m), lista: true }));
      }))));
}

// Qué conviene cambiar, según tus últimos entrenamientos.
export function listaRecomendaciones(lista) {
  const icono = { aviso: '⚠', consejo: '→', bien: '✓' };
  return h('ul', { class: 'recomendaciones' }, lista.map((x) => h('li', { class: x.nivel },
    h('span', { class: 'icono-rec', 'aria-hidden': 'true' }, icono[x.nivel]),
    x.enlace ? h('a', { href: x.enlace }, conGlosario(x.texto)) : h('span', {}, conGlosario(x.texto)))));
}
