// Mapa de recuperación: qué músculos están listos y cuáles siguen tocados,
// más el volumen de la semana con sus avisos.

import * as estado from '../estado.js';
import { MUSCULOS, ORDEN_MUSCULOS, siluetaCuerpo } from '../musculos.js';
import {
  claseDeRecuperacion, recuperacionPorMusculo, seriesSemanales, textoDeRecuperacion,
} from '../recuperacion.js';
import { anadir, h } from '../ui.js';

// Referencias de volumen semanal por músculo (ver Ajustes → De dónde sale cada cosa).
const SERIES_MINIMAS = 10;
const SERIES_MAXIMAS = 20;

export function tarjetaRecuperacion(datos, { compacta = false } = {}) {
  const sinMusculos = datos.ejercicios.filter((e) => !e.archivado && !e.musculos?.principales?.length);
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

    sinMusculos.length > 0 && h('p', { class: 'aviso-texto' },
      `${sinMusculos.length} ejercicio${sinMusculos.length > 1 ? 's' : ''} sin músculos asignados: `
      + 'hasta que los pongas, no cuentan para el mapa. Ábrelos y pulsa «Usar los del catálogo».'),

    tocados.length
      ? h('ul', { class: 'lista-musculos' },
        tocados.slice(0, compacta ? 3 : 20).map((x) => h('li', {},
          h('span', { class: `punto ${claseDeRecuperacion(x.porcentaje)}` }),
          textoDeRecuperacion(x))))
      : h('p', { class: 'suave' }, 'Todo recuperado: puedes entrenar lo que quieras.'),

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
            h('span', { class: 'nombre' }, MUSCULOS[m].nombre),
            h('span', { class: `barra ${clase}` }, h('span', { style: `width:${ancho}%` })),
            h('span', { class: 'valor' }, n));
        }))
        : h('p', { class: 'suave' }, 'Aún no hay series registradas esta semana.'),

      h('p', { class: 'nota' },
        `La referencia son ${SERIES_MINIMAS} a ${SERIES_MAXIMAS} series semanales por músculo, `
        + 'repartidas en dos sesiones. Las series de un músculo secundario cuentan la mitad.'),

      flojos.length > 0 && h('p', { class: 'aviso-texto' },
        `Vas corto en: ${flojos.map((m) => MUSCULOS[m].nombre).join(', ')}. Con una serie más por sesión ya entrarías en rango.`),
      pasados.length > 0 && h('p', { class: 'aviso-texto' },
        `Te pasas de ${SERIES_MAXIMAS} series en: ${pasados.map((m) => MUSCULOS[m].nombre).join(', ')}. `
        + 'No es un problema si lo recuperas bien, pero vigila cómo llegas a la siguiente sesión.'),
      sinTocar.length > 0 && h('p', { class: 'suave' },
        `Sin entrenar esta semana: ${sinTocar.map((m) => MUSCULOS[m].nombre).join(', ')}.`),

      h('a', { class: 'boton enlace', href: '#/ajustes' }, 'De dónde salen estos números')));
}
