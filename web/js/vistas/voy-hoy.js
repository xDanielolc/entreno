// «¿Voy hoy?»: ¿es cansancio de verdad o pereza?
//
// Sale del árbol de decisión de Dan («Fatiga vs pereza»), revisado:
//   · Solo se suman puntos de cansancio. No tener síntomas no es «pereza»:
//     es no estar cansado. La pereza se ve en una sola cosa: no tener ganas
//     con el cuerpo bien.
//   · Lo que la app ya sabe no se pregunta: días seguidos entrenando y cómo
//     de recuperados están los músculos del día que toca.
//   · Fuera la frecuencia cardíaca en reposo: como marcador de cansancio es
//     poco fiable (Bosquet 2008); las preguntas de cómo te sientes lo
//     reflejan mejor (Saw 2016).
// Nada se guarda: es una ayuda para decidir, no un registro.

import { ayuda, h, modal } from '../ui.js';
import { cuentaParaFatiga } from '../catalogo.js';
import { nombreMusculo } from '../musculos.js';
import { recuperacionPorMusculo } from '../recuperacion.js';

const PREGUNTAS = [
  { clave: 'sueno', texto: '¿Cómo has dormido las dos últimas noches?', opciones: [
    ['bien', 'Bien (7 h o más)', 0], ['regular', 'Regular', 1], ['mal', 'Mal (6 h o menos)', 2]] },
  { clave: 'dolor', texto: '¿Te duele algo ahora?', opciones: [
    ['no', 'Nada', 0], ['agujetas', 'Agujetas', 1], ['articular', 'Dolor profundo o en una articulación', 3]] },
  { clave: 'estres', texto: '¿Cómo vas de estrés y energía estos días?', opciones: [
    ['normal', 'Normal', 0], ['algo', 'Algo cargado', 1], ['mucho', 'Muy estresado o sin energía', 2]] },
  { clave: 'ganas', texto: '¿Y las ganas?', opciones: [
    ['si', 'Con ganas', 0], ['pereza', 'Sin ganas, pero el cuerpo bien', 0],
    ['pesado', 'Sin ganas y el cuerpo pesado', 2], ['no-responde', 'Con ganas, pero el cuerpo no responde', 3]] },
];

const FUENTES = [
  ['Preguntas mejor que pulsómetro', 'Cómo te sientes refleja la carga de entrenamiento mejor que medidas como el pulso (Saw et al. 2016, revisión '
    + 'de 56 estudios). El pulso en reposo es poco fiable para ver si estás pasado de carga (Bosquet et al. 2008).'],
  ['Sueño', 'Dormir 6 h o menos baja el rendimiento; en fuerza máxima, poco (alrededor de un 3 %); en series largas, bastante más '
    + '(Craven et al. 2022, metaanálisis de 77 estudios).'],
  ['Estrés', 'Con mucho estrés en la vida, la fuerza tarda más en recuperarse tras un entreno duro (Stults-Kolehmainen et al. 2014; '
    + 'estudio pequeño, con universitarios).'],
  ['Recuperación y días seguidos', 'Los saca la app de tus entrenamientos (ver Aprender).'],
  ['La prueba del calentamiento', 'Calentar mejora el rendimiento (Fradkin 2010). Que la pereza se vaya al calentar y el cansancio no '
    + 'es una regla práctica: no hay estudios que lo midan así.'],
];

// Días seguidos entrenando hasta hoy (o hasta ayer, si hoy aún no).
function diasSeguidos(datos) {
  const dias = new Set(datos.sesiones.filter((s) => !s.borrada && s.estado === 'terminada').map((s) => s.fecha));
  const d = new Date();
  const local = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (!dias.has(local(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dias.has(local(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

// Lo que pone la app sin preguntar: [puntos, frase].
function datosDeLaApp(datos, dia) {
  const lineas = [];
  let puntos = 0;
  const seguidos = diasSeguidos(datos);
  if (seguidos >= 3) {
    const p = seguidos >= 5 ? 2 : 1;
    puntos += p;
    lineas.push(`Llevas ${seguidos} días seguidos entrenando.`);
  }
  let peor = null;
  if (dia) {
    const rec = recuperacionPorMusculo(datos);
    for (const item of dia.ejercicios) {
      const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
      if (!ej || ej.archivado || !cuentaParaFatiga(ej)) continue;
      for (const m of ej.musculos?.principales ?? []) {
        const x = rec[m];
        if (x && (!peor || x.porcentaje < peor.porcentaje)) peor = { ...x, musculo: m };
      }
    }
  }
  if (peor && peor.porcentaje < 90) {
    puntos += peor.porcentaje < 60 ? 3 : 1;
    lineas.push(`De lo que toca hoy, ${nombreMusculo(peor.musculo)} está al ${peor.porcentaje} %.`);
  }
  if (!lineas.length) lineas.push(dia ? 'Los músculos de hoy están recuperados y no llevas muchos días seguidos.' : 'No llevas muchos días seguidos.');
  return { puntos, lineas, poco: peor && peor.porcentaje < 60 };
}

export function voyHoy(datos, dia) {
  const respuestas = {};
  const app = datosDeLaApp(datos, dia);
  const zona = h('div', { class: 'voy-hoy' });
  // Qué pregunta se ve: una cada vez. Al contestar se pasa a la siguiente.
  let paso = 0;

  function veredicto() {
    let puntos = app.puntos;
    for (const p of PREGUNTAS) puntos += p.opciones.find(([k]) => k === respuestas[p.clave])[2];
    const pereza = respuestas.ganas === 'pereza';
    const dolor = respuestas.dolor === 'articular';
    let clase, titulo, pasos;
    if (puntos >= 6) {
      clase = 'descansa'; titulo = 'Descansa hoy';
      pasos = ['Hoy no es pereza: hay cansancio de verdad. Descansar también es entrenar.',
        'Si te apetece moverte: paseo o movilidad suave.',
        app.poco && 'O haz otro día de la rutina que no cargue los mismos músculos.',
        'Mañana vuelve a preguntármelo.'];
    } else if (puntos >= 3) {
      clase = 'calienta'; titulo = 'Ve y decide al calentar';
      pasos = ['Hay algo de cansancio, pero no tanto como para quedarte.',
        'Calienta 10 minutos suave.',
        'Si entras bien: entreno normal, quizá con una serie menos.',
        'Si sigues pesado: entreno corto o te vas sin culpa.'];
    } else {
      clase = 've'; titulo = pereza ? 'Es pereza: ve' : 'Ve';
      pasos = [pereza ? 'El cuerpo está bien: lo que falta son ganas, y eso suele irse al calentar.' : 'No hay señales de cansancio.',
        'Empieza por el calentamiento y no negocies hasta acabarlo.'];
    }
    if (dolor) pasos.push('Por el dolor: no cargues la zona que duele. Si sigue unos días o es en una articulación, consulta.');
    return h('div', { class: `veredicto ${clase}` },
      h('h3', {}, titulo),
      h('ul', {}, pasos.filter(Boolean).map((p) => h('li', {}, p))));
  }

  function pintar() {
    const n = PREGUNTAS.length;
    const contestadas = PREGUNTAS.filter((p) => respuestas[p.clave]).length;
    const barra = h('div', { class: 'progreso-voy', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(n),
      'aria-valuenow': String(contestadas), 'aria-label': `${contestadas} de ${n} contestadas` },
    h('span', { class: 'relleno', style: `width: ${(contestadas / n) * 100}%` }));
    if (paso >= n) {
      zona.replaceChildren(...[
        barra,
        veredicto(),
        h('div', { class: 'lo-que-se' },
          h('p', { class: 'etiqueta-campo' }, 'Lo que ya sabía la app'),
          app.lineas.map((l) => h('p', { class: 'nota' }, l))),
        h('div', { class: 'fila-botones' },
          h('button', { type: 'button', class: 'boton secundario', onclick: () => { paso = n - 1; pintar(); } }, '← Atrás'),
          h('button', { type: 'button', class: 'boton secundario', onclick: () => {
            for (const p of PREGUNTAS) delete respuestas[p.clave];
            paso = 0; pintar();
          } }, 'Otra vez')),
        h('p', { class: 'nota centrado' }, 'De dónde sale ', ayuda('¿Voy hoy?', 'Solo cuentan las señales de cansancio. '
          + 'No tener síntomas no es pereza; la pereza es no tener ganas con el cuerpo bien.', { lista: FUENTES })),
      ].flat().filter(Boolean));
      return;
    }
    const p = PREGUNTAS[paso];
    zona.replaceChildren(...[
      barra,
      h('p', { class: 'nota centrado paso-voy' }, `${paso + 1} de ${n}`),
      h('div', { class: 'pregunta-voy' },
        h('p', {}, h('strong', {}, p.texto)),
        h('div', { class: 'opciones-voy' }, p.opciones.map(([k, texto]) => h('button', {
          type: 'button', class: `boton-marca${respuestas[p.clave] === k ? ' activo' : ''}`, 'aria-pressed': String(respuestas[p.clave] === k),
          onclick: () => { respuestas[p.clave] = k; paso += 1; pintar(); },
        }, texto)))),
      paso > 0 && h('button', { type: 'button', class: 'boton enlace', onclick: () => { paso -= 1; pintar(); } }, '← Atrás'),
    ].flat().filter(Boolean));
  }
  pintar();
  modal('¿Voy hoy?', zona);
}
