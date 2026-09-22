// Cuestionario de bienvenida: cuatro preguntas (cuánto sabes, qué buscas,
// dónde entrenas y qué tema) para ajustar el tutorial, el aspecto y la
// rutina prehecha que se recomienda. Sale una vez; se repite desde Ajustes.

import * as estado from '../estado.js';
import { h, modal } from '../ui.js';
import { TIPOS_SEDE, nuevaSede } from '../sedes.js';
import { fijarNivel, iniciarGuia } from './tutorial.js';

export const PREGUNTAS = [
  { clave: 'experiencia', titulo: '¿Cuánto sabes de entrenar?', opciones: {
    novato: { etiqueta: 'Nada o casi nada', descripcion: 'Te lo explico todo, sin prisa.' },
    algo: { etiqueta: 'Lo básico', descripcion: 'Sé qué es una serie y una repetición; lo demás, según.' },
    avanzado: { etiqueta: 'Bastante', descripcion: 'Conozco el 1RM, la recámara, los drop sets, las progresiones y los programas. Solo dime dónde está cada cosa.' },
  } },
  { clave: 'objetivo', titulo: '¿Qué buscas?', opciones: {
    musculo: { etiqueta: 'Ganar músculo', descripcion: 'Hipertrofia: que el músculo crezca.' },
    fuerza: { etiqueta: 'Ganar fuerza', descripcion: 'Levantar más peso en los básicos.' },
    salud: { etiqueta: 'Salud y forma física', descripcion: 'Moverme, estar bien y no lesionarme.' },
    movilidad: { etiqueta: 'Movilidad y flexibilidad', descripcion: 'Estiramientos, yoga, articulaciones.' },
  } },
  { clave: 'donde', titulo: '¿Dónde entrenas?', opciones: {
    gimnasio: { etiqueta: 'En un gimnasio', descripcion: 'Con máquinas, barras y mancuernas.' },
    casa: { etiqueta: 'En casa', descripcion: 'Con poco material.' },
    calle: { etiqueta: 'En la calle o un parque', descripcion: 'Con tu peso y alguna barra.' },
  } },
  { clave: 'tema', titulo: '¿Cómo lo quieres ver?', opciones: {
    claro: { etiqueta: 'Tema claro' },
    oscuro: { etiqueta: 'Tema oscuro' },
    sistema: { etiqueta: 'Como el móvil', descripcion: 'Sigue el ajuste del sistema.' },
  } },
];

export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro' || tema === 'oscuro') raiz.dataset.tema = tema;
  else delete raiz.dataset.tema;
}

// Qué rutina prehecha encaja con lo que ha contestado.
export function rutinaRecomendada(perfil) {
  const q = perfil.cuestionario ?? {};
  if (q.objetivo === 'movilidad') return 'flexibilidad-tres-sesiones';
  if (q.donde === 'calle' || q.donde === 'casa') return 'calistenia-cuerpo-entero';
  if (q.experiencia === 'novato') return 'cuerpo-entero-principiantes';
  if (q.objetivo === 'fuerza') return 'cinco-por-cinco';
  if (q.objetivo === 'musculo') return q.experiencia === 'avanzado' ? 'plpl-bilbo-heavy-duty' : 'cuerpo-entero-principiantes';
  return 'cuerpo-entero-principiantes';
}

export function cuestionarioHecho(d) {
  return Boolean(d?.perfil?.cuestionario?.hecho);
}

// Enseña las preguntas una a una y guarda las respuestas.
export function hacerCuestionario({ alTerminar } = {}) {
  const respuestas = { ...(estado.datos().perfil.cuestionario ?? {}) };
  let i = 0;
  let cerrar = null;

  const pintar = () => {
    cerrar?.();
    const p = PREGUNTAS[i];
    cerrar = modal(p.titulo, h('div', { class: 'tutorial-niveles' },
      h('p', { class: 'nota' }, `Pregunta ${i + 1} de ${PREGUNTAS.length}. La app vale igual para quien empieza que para quien compite: `
        + 'esto solo decide cuánto te explico y qué te propongo.'),
      Object.entries(p.opciones).map(([clave, o]) => h('button', {
        class: `tarjeta fila-enlace ${respuestas[p.clave] === clave ? 'preferido' : ''}`,
        onclick: () => {
          respuestas[p.clave] = clave;
          if (p.clave === 'tema') aplicarTema(clave);
          if (i + 1 < PREGUNTAS.length) { i += 1; pintar(); } else terminar();
        } },
      h('div', {}, h('strong', {}, o.etiqueta), o.descripcion && h('div', { class: 'suave' }, o.descripcion)))),
      i > 0 && h('button', { class: 'boton enlace', onclick: () => { i -= 1; pintar(); } }, 'Anterior')));
  };

  // Lo que contestas cambia cosas de verdad, y al final se dice cuáles.
  const terminar = () => {
    cerrar?.();
    const nivel = respuestas.experiencia === 'avanzado' ? 'avanzado' : 'basico';
    estado.cambiar((x) => {
      x.perfil.cuestionario = { ...respuestas, hecho: true };
      x.perfil.tema = respuestas.tema ?? 'sistema';
      // Quien dice saber bastante no quiere «?» detrás de cada palabra.
      x.perfil.glosario = respuestas.experiencia === 'avanzado' ? 'ninguno' : 'siempre';
      // Quien empieza se queda más lejos del fallo: rinde casi igual y se
      // recupera antes mientras coge técnica.
      if (respuestas.experiencia === 'novato') x.perfil.recamaraPorDefecto ??= 2;
      // El sitio donde entrenas queda creado, y es el que sale al entrenar.
      if (respuestas.donde && !(x.sedes || []).length) {
        const sede = nuevaSede(TIPOS_SEDE[respuestas.donde]?.etiqueta ?? 'Mi sitio', respuestas.donde);
        x.sedes = [...(x.sedes || []), sede];
        x.perfil.sedePorDefecto = sede.id;
      }
    });
    fijarNivel(nivel);
    alTerminar?.(respuestas);
    resumen(respuestas);
  };

  // Qué ha cambiado con lo que ha contestado, en una lista corta.
  function resumen(r) {
    const lineas = [];
    lineas.push(r.experiencia === 'avanzado'
      ? 'Te digo solo dónde está cada cosa, sin explicar conceptos ni poner «?» detrás de las palabras.'
      : r.experiencia === 'novato'
        ? 'Te lo explico todo, con notas en cada pantalla, y dejo puesta una recámara de 2 (más lejos del fallo mientras coges técnica).'
        : 'Te lo explico todo, con notas cortas en cada pantalla.');
    if (r.donde) lineas.push(`He creado tu sitio: ${TIPOS_SEDE[r.donde]?.etiqueta}. Cada entrenamiento se guardará ahí.`);
    lineas.push(`La rutina que te recomiendo en «Hoy» va con lo que buscas (${PREGUNTAS[1].opciones[r.objetivo]?.etiqueta.toLowerCase() ?? 'tu objetivo'}).`);
    lineas.push('Todo esto se cambia luego en Ajustes y en Aprender; nada queda fijo.');
    const cerrarR = modal('Listo, queda así', h('div', {},
      h('ul', {}, lineas.map((x) => h('li', {}, x))),
      h('button', { class: 'boton', onclick: () => { cerrarR(); iniciarGuia(); } }, 'Empezar el tutorial'),
      h('button', { class: 'boton enlace', onclick: () => cerrarR() }, 'Ahora no')));
  }

  pintar();
}
