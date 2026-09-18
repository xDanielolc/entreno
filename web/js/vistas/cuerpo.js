// Mapa de recuperación: qué músculos están listos y cuáles siguen tocados,
// más el volumen de la semana con sus avisos.

import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { cuentaParaFatiga } from '../catalogo.js';
import { ORDEN_MUSCULOS, nombreMusculo, siluetaCuerpo } from '../musculos.js';
import {
  FACTORES, claseDeRecuperacion, detalleDeRecuperacion, factorPersonal, recuperacionPorMusculo, seriesSemanales,
  sugerenciasDeAjuste, textoDeRecuperacion,
} from '../recuperacion.js';
import { anadir, aviso, h, hoyISO } from '../ui.js';

// Referencias de volumen semanal por músculo (ver Ajustes → De dónde sale cada cosa).
const SERIES_MINIMAS = 10;
const SERIES_MAXIMAS = 20;

export function tarjetaRecuperacion(datos, { compacta = false } = {}) {
  const sinMusculos = datos.ejercicios.filter((e) => !e.archivado && cuentaParaFatiga(e)
    && !e.musculos?.principales?.length);
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
    h('div', { class: 'cabecera-tarjeta' },
      h('h2', {}, 'Recuperación'),
      h('span', { class: `anillo ${claseDeRecuperacion(media)}` }, `${media} %`)),

    h('div', { class: 'cuerpos' },
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
      h('p', {}, 'El porcentaje es el tiempo que ha pasado desde que entrenaste ese músculo, dividido entre el que necesita. '
        + 'Justo al acabar está al 0 % y va subiendo hasta el 100 %. No tiene nada que ver con las 10 a 20 series por semana: '
        + 'eso es cuánto conviene entrenar cada músculo en total; esto, cuánto tarda en reponerse de la última sesión.'),
      h('p', {}, 'Cuántas horas necesita, en tres pasos:'),
      h('ul', {},
        h('li', {}, 'Lo cerca del fallo que acabaste las series, que es lo que más pesa: con 3 o más en recámara, 24 h; '
          + 'con 1 o 2, 36 h; al fallo, 48 h; al fallo con más de 15 repeticiones o con drop set, 60 h. '
          + 'Se hace la media de tus series con la más dura.'),
        h('li', {}, 'El volumen, que pesa poco y cada vez menos: una serie se queda en el 70 % de esas horas, '
          + 'tres en el 87 %, seis en el 96 % y a partir de ahí casi no cambia.'),
        h('li', {}, 'Tu ajuste personal por músculo, si lo has puesto (abajo).')),
      h('p', { class: 'nota' }, 'Respaldo: las horas según la cercanía al fallo y que el volumen apenas influya salen de '
        + 'Morán-Navarro (2017) y Pareja-Blanco (2019 y 2020). La forma de la curva del volumen y la media con la serie más dura '
        + 'son aproximaciones de la app. No hay estudios que den un tiempo fijo por músculo; por eso existe el ajuste personal.')),

    compacta && h('a', { class: 'boton enlace', href: '#/cuerpo' }, 'Ver el cuerpo entero y el volumen'));
}

export function vistaCuerpo(contenedor) {
  const d = estado.datos();
  const semana = seriesSemanales(d);
  const conDatos = ORDEN_MUSCULOS.filter((m) => semana[m] > 0)
    .sort((a, b) => semana[b] - semana[a]);
  const flojos = ORDEN_MUSCULOS.filter((m) => semana[m] > 0 && semana[m] < SERIES_MINIMAS);
  const pasados = ORDEN_MUSCULOS.filter((m) => semana[m] > SERIES_MAXIMAS);
  const sinTocar = ORDEN_MUSCULOS.filter((m) => !semana[m]);

  anadir(contenedor,
    h('h1', {}, 'Tu cuerpo'),
    tarjetaRecuperacion(d),
    tarjetaAjustePersonal(d),

    h('section', { class: 'tarjeta' },
      h('h2', {}, 'Series de los últimos 7 días'),
      conDatos.length
        ? h('div', { class: 'barras-musculo' }, conDatos.map((m) => {
          const n = Math.round(semana[m] * 10) / 10;
          const ancho = Math.min(100, (n / (SERIES_MAXIMAS + 5)) * 100);
          const clase = n < SERIES_MINIMAS ? 'poco' : n > SERIES_MAXIMAS ? 'mucho' : 'bien';
          return h('div', { class: 'barra-musculo' },
            h('span', { class: 'nombre' }, nombreMusculo(m, { corto: true })),
            h('span', { class: `barra ${clase}` }, h('span', { style: `width:${ancho}%` })),
            h('span', { class: 'valor' }, formatearNumero(n)));
        }))
        : h('p', { class: 'suave' }, 'Aún no hay series registradas esta semana.'),

      h('p', { class: 'nota' },
        `La referencia son ${SERIES_MINIMAS} a ${SERIES_MAXIMAS} series semanales por músculo, `
        + 'repartidas en dos sesiones. Las series de un músculo secundario cuentan la mitad y, en un drop set, '
        + 'cada bajada de más cuenta media serie. Estiramientos, movilidad y yoga no cuentan.'),

      flojos.length > 0 && h('p', { class: 'aviso-texto' },
        `Vas corto en: ${flojos.map((m) => nombreMusculo(m)).join(', ')}. Reparte las que te faltan entre tus próximas sesiones: con dos sesiones por semana, 5 series de cada músculo por sesión.`),
      pasados.length > 0 && h('p', { class: 'aviso-texto' },
        `Te pasas de ${SERIES_MAXIMAS} series en: ${pasados.map((m) => nombreMusculo(m)).join(', ')}. `
        + 'No es un problema si lo recuperas bien, pero vigila cómo llegas a la siguiente sesión.'),
      sinTocar.length > 0 && h('p', { class: 'suave' },
        `Sin entrenar esta semana: ${sinTocar.map((m) => nombreMusculo(m)).join(', ')}.`),

      h('a', { class: 'boton enlace', href: '#/ajustes' }, 'De dónde salen estos números')));
}


// ---------------------------------------------------------------------------
// Ajuste personal: te recuperas más rápido o más despacio de lo normal
// ---------------------------------------------------------------------------

function tarjetaAjustePersonal(d) {
  const sugerencias = sugerenciasDeAjuste(d);
  const conAjuste = ORDEN_MUSCULOS.filter((m) => factorPersonal(d, m) !== 1);

  const aplicar = (m, factor, { callado = false } = {}) => estado.cambiar((x) => {
    x.perfil.recuperacion ??= { factores: {}, desde: {} };
    x.perfil.recuperacion.factores ??= {};
    x.perfil.recuperacion.desde ??= {};
    if (factor === 1) delete x.perfil.recuperacion.factores[m];
    else x.perfil.recuperacion.factores[m] = factor;
    // Las sensaciones de antes ya se han tenido en cuenta.
    x.perfil.recuperacion.desde[m] = hoyISO();
    if (!callado) aviso(`${nombreMusculo(m)}: ajuste guardado`);
  });
  const descartar = (m) => estado.cambiar((x) => {
    x.perfil.recuperacion ??= { factores: {}, desde: {} };
    x.perfil.recuperacion.desde ??= {};
    x.perfil.recuperacion.desde[m] = hoyISO();
  });

  return h('section', { class: 'tarjeta' },
    h('h2', {}, 'Tu ritmo de recuperación'),
    sugerencias.map((s) => h('div', { class: 'tarjeta aviso-tarjeta' },
      h('p', {}, s.sentido === 'lento'
        ? `${nombreMusculo(s.musculo)}: ${s.veces} de ${s.total} veces llegaste cargado cuando la app te daba por recuperado. `
          + 'Parece que te recuperas más despacio de lo normal.'
        : `${nombreMusculo(s.musculo)}: ${s.veces} de ${s.total} veces llegaste fresco cuando la app te daba por cansado. `
          + 'Parece que te recuperas antes de lo normal.'),
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton secundario', onclick: () => descartar(s.musculo) }, 'No, déjalo'),
        h('button', { class: 'boton', onclick: () => aplicar(s.musculo, s.nuevo) },
          `Ajustar a «${FACTORES.find((f) => f.valor === s.nuevo)?.texto.toLowerCase()}»`)))),
    h('p', { class: 'nota' }, 'Al empezar cada entrenamiento puedes decir cómo llegas (cargado, normal o fresco). '
      + 'Con tres respuestas o más por músculo, la app te dirá si te recuperas antes o después de lo que calcula. '
      + 'También puedes ajustarlo a mano:'),
    conAjuste.length > 0 && h('p', {}, `Ajustados: ${conAjuste.map((m) => `${nombreMusculo(m)} ×${String(factorPersonal(d, m)).replace('.', ',')}`).join(', ')}.`),
    h('details', { class: 'explicacion' },
      h('summary', {}, 'Ajustar a mano'),
      h('div', { class: 'ajustes-musculo' }, ORDEN_MUSCULOS.map((m) => h('label', { class: 'fila-ajuste' },
        h('span', {}, nombreMusculo(m)),
        h('select', { onchange: (e) => aplicar(m, Number(e.target.value)) },
          FACTORES.map((f) => h('option', { value: f.valor, selected: f.valor === factorPersonal(d, m) },
            `${f.texto} (×${String(f.valor).replace('.', ',')})`))))))));
}
