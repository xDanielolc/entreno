// Cribado del sueño: un cuestionario que se hace una vez y dice si hay algo
// que mirar con un médico antes de ponerse a tocar las horas de sueño.
//
// Las preguntas, la puntuación y el veredicto están en `diario.js`
// (CRIBADO_SUENO, veredictoCribado), con sus fuentes. Aquí solo está la
// pantalla. Viene de la investigación del 27-10-2026: la idea no es hacer algo
// especial para dormir menos, sino descartar lo que pueda estar alargando el
// sueño sin que sirva de nada.
//
// Dos cosas que la pantalla repite a propósito, porque son las que se olvidan:
//   · Esto no diagnostica. Los cuestionarios no sirven para diagnosticar apnea
//     sin una prueba del sueño, y la guía de la American Academy of Sleep
//     Medicine lo dice con recomendación fuerte (Kapur 2017, PMID 28162150).
//   · Corregir lo que salga aquí no quita horas de sueño. Mejora el día
//     siguiente (Tachikawa 2017, PMID 28326793). Prometer lo otro sería
//     mentir.

import * as estado from '../estado.js';
import { CRIBADO_SUENO, PREGUNTAS_CRIBADO, cribadoCompleto, veredictoCribado } from '../diario.js';
import { ayuda, confirmar, fechaCorta, h, hoyISO, modal, selector } from '../ui.js';

const SUAVE = 'opacity: .8; font-size: .9rem;';
const COLOR_PRIORIDAD = { alta: 'var(--peligro)', media: 'var(--aviso)', baja: 'currentColor' };
const ETIQUETA_PRIORIDAD = { alta: 'Pide cita', media: 'Coméntalo', baja: 'Esto lo arreglas tú' };

// El cuestionario. Se guarda entero o no se guarda: media respuesta no sirve
// para nada y un veredicto a medias engaña más que ayuda.
export function abrirCribado({ alCerrar } = {}) {
  const d = estado.datos();
  const respuestas = { ...(d?.cribadoSueno?.respuestas ?? {}) };
  const pendientes = h('p', { style: SUAVE });
  const guardar = h('button', { class: 'boton', onclick: () => terminar() }, 'Guardar y ver el resultado');

  const refrescar = () => {
    const faltan = PREGUNTAS_CRIBADO.filter((k) => typeof respuestas[k] !== 'boolean').length;
    pendientes.textContent = faltan === 0
      ? 'Contestadas todas.'
      : `Faltan ${faltan} de ${PREGUNTAS_CRIBADO.length}.`;
    guardar.disabled = faltan > 0;
  };

  const fila = (grupo, pregunta) => {
    const clave = `${grupo.clave}.${pregunta.clave}`;
    const marcas = h('div');
    const pintar = () => {
      marcas.replaceChildren(selector([[true, 'Sí'], [false, 'No']], respuestas[clave], (v) => {
        respuestas[clave] = v;
        pintar();
        refrescar();
      }, { titulo: pregunta.texto, botones: true, compacto: true }));
    };
    pintar();
    return h('div', { style: 'display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);' },
      h('span', { class: 'crece' }, pregunta.texto,
        pregunta.ayuda ? ayuda(pregunta.texto, pregunta.ayuda) : null),
      marcas);
  };

  const cuerpo = h('div', { class: 'ayuda-texto' },
    h('p', {}, 'Se hace una vez. No diagnostica nada: solo dice si merece la pena pedir cita.'),
    h('p', { style: SUAVE }, 'Aviso que conviene leer antes: corregir lo que salga aquí no te va a quitar horas de sueño. El único estudio que midió la duración habitual antes y después de tratar un trastorno del sueño no encontró cambio, y eso con la calidad ya mejorada. Lo que se gana es el día siguiente.'),
    CRIBADO_SUENO.map((grupo) => h('section', { style: 'margin-top: 18px;' },
      h('h3', {}, grupo.titulo),
      grupo.nota ? h('p', { style: SUAVE }, grupo.nota) : null,
      grupo.preguntas.map((p) => fila(grupo, p)))),
    h('div', { style: 'margin-top: 18px;' }, pendientes),
    h('div', { class: 'fila-botones' }, guardar));

  const cerrar = modal('Cribado del sueño', cuerpo);
  refrescar();

  function terminar() {
    estado.cambiar((x) => {
      x.cribadoSueno = { fecha: hoyISO(), respuestas, version: 1 };
    });
    cerrar();
    abrirResultadoCribado();
    alCerrar?.();
  }

  return cerrar;
}

// El resultado, que se puede volver a mirar cuando se quiera.
export function abrirResultadoCribado() {
  const d = estado.datos();
  if (!cribadoCompleto(d)) { abrirCribado(); return; }
  const { stopBang, criteriosPiernas, avisos } = veredictoCribado(d.cribadoSueno.respuestas);

  const tarjetaAviso = (a) => h('section', {
    style: `border-left: 3px solid ${COLOR_PRIORIDAD[a.prioridad]}; padding: 2px 0 2px 12px; margin: 14px 0;`,
  },
  h('p', { style: `${SUAVE} margin: 0;` }, ETIQUETA_PRIORIDAD[a.prioridad]),
  h('p', { style: 'margin: 2px 0;' }, h('strong', {}, a.titulo)),
  h('p', { style: 'margin: 2px 0;' }, a.texto),
  h('p', { style: `${SUAVE} margin: 2px 0;` }, a.fuente));

  const cerrar = modal('Resultado del cribado', h('div', { class: 'ayuda-texto' },
    h('p', { style: SUAVE }, `Contestado el ${fechaCorta(d.cribadoSueno.fecha)}.`),
    avisos.length === 0
      ? h('p', {}, 'Nada que perseguir por aquí. No sale ninguna señal de apnea, de piernas inquietas ni de nada que convenga mirar con un médico. Sigue con el diario y con el test de atención.')
      : avisos.map(tarjetaAviso),
    h('hr'),
    h('p', { style: SUAVE }, `Para el dato: ${stopBang} puntos de 8 en el cuestionario de apnea y ${criteriosPiernas} de los 4 criterios de piernas inquietas.`),
    h('p', { style: SUAVE }, 'Esto no es un diagnóstico y no puede serlo. Un cuestionario no sirve para diagnosticar apnea sin una prueba del sueño, y en alguien joven y delgado estos cuestionarios funcionan peor que en nadie: aciertan casi siempre cuando dicen que sí hay algo, y se equivocan mucho cuando lo dicen (especificidad de 0,40).'),
    h('p', { style: SUAVE }, 'Kapur 2017, J Clin Sleep Med, PMID 28162150; Li 2024, Sleep Breath, PMID 39601864.'),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: async () => {
        if (await confirmar('¿Volver a contestar el cribado? Se sustituyen las respuestas de antes.', { si: 'Contestar otra vez' })) {
          cerrar();
          abrirCribado();
        }
      } }, 'Contestar otra vez'),
      h('button', { class: 'boton', onclick: () => cerrar() }, 'Cerrar'))));
  return cerrar;
}

// La tarjeta de la pestaña Sueño. Mientras no esté hecho, invita; una vez
// hecho, resume en una línea y deja volver a verlo.
export function tarjetaCribado(d) {
  if (!cribadoCompleto(d)) {
    return h('section', { class: 'tarjeta' },
      h('div', { class: 'cabecera-tarjeta' }, h('h2', { class: 'crece' }, 'Cribado del sueño')),
      h('p', {}, 'Veintidós preguntas de sí o no, una sola vez. Sirve para descartar lo que puede estar alargando tu sueño sin que te sirva: sobre todo apnea y movimientos de las piernas.'),
      h('p', { style: SUAVE }, 'No diagnostica nada ni te va a quitar horas. Solo dice si merece la pena pedir cita.'),
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton', onclick: () => abrirCribado() }, 'Hacerlo ahora')));
  }
  const { avisos } = veredictoCribado(d.cribadoSueno.respuestas);
  const altas = avisos.filter((a) => a.prioridad === 'alta').length;
  const resumen = avisos.length === 0
    ? 'Sin señales que mirar.'
    : altas > 0
      ? `${altas} ${altas === 1 ? 'cosa' : 'cosas'} para comentar con un médico.`
      : `${avisos.length} ${avisos.length === 1 ? 'apunte' : 'apuntes'}, ninguno urgente.`;
  return h('section', { class: 'tarjeta' },
    h('div', { class: 'cabecera-tarjeta' }, h('h2', { class: 'crece' }, 'Cribado del sueño')),
    h('p', {}, resumen, ' ', h('span', { style: SUAVE }, `Contestado el ${fechaCorta(d.cribadoSueno.fecha)}.`)),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => abrirResultadoCribado() }, 'Ver el resultado')));
}

// Por si alguna vez hace falta avisar desde fuera (hoy no se usa, pero deja
// claro qué cuenta como «hecho»).
export const faltaCribado = (d) => !cribadoCompleto(d);
