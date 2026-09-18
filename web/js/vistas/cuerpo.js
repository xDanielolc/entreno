// Mapa de recuperación: qué músculos están listos y cuáles siguen tocados,
// más el volumen de la semana con sus avisos.

import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { cuentaParaFatiga } from '../catalogo.js';
import { ORDEN_MUSCULOS, nombreMusculo, siluetaCuerpo } from '../musculos.js';
import {
  claseDeRecuperacion, detalleDeRecuperacion, recuperacionPorMusculo, seriesSemanales, textoDeRecuperacion,
} from '../recuperacion.js';
import { anadir, h } from '../ui.js';

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
        + `Te ${sinMusculos.length > 1 ? `faltan estos ${sinMusculos.length}` : 'falta este'}; tócalo y pulsa «Usar los del catálogo» o márcalos a mano:`),
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
      h('p', {}, 'Cuántas horas necesita:'),
      h('ul', {},
        h('li', {}, '36 horas de base. Es lo que tarda la síntesis de proteínas en volver a la normalidad tras entrenar (MacDougall, 1995); '
          + 'al fallo, la fuerza tarda hasta 48 h en recuperarse (Pareja-Blanco, 2020).'),
        h('li', {}, 'Un músculo grande (pecho, dorsal, glúteo, cuádriceps, isquios) suma 6 h; uno pequeño resta 6.'),
        h('li', {}, 'A partir de la tercera serie efectiva, cada una suma 4 h, hasta un máximo de 72 h.'),
        h('li', {}, 'Una serie al fallo cuenta 1,3; con 3 o más en recámara, 0,7. En un drop set, cada bajada de más cuenta media serie. '
          + 'Un músculo secundario recibe la mitad.')),
      h('p', { class: 'nota' }, 'Las 36 y 48 horas salen de estudios. El reparto por series y por tamaño es una aproximación razonable, '
        + 'no una medida: tómalo como orientación, y si te notas cargado, manda lo que notas.')),

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
