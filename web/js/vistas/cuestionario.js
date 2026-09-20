// Cuestionario de bienvenida: cuatro preguntas (cuánto sabes, qué buscas,
// dónde entrenas y qué tema) para ajustar el tutorial, el aspecto y la
// rutina prehecha que se recomienda. Sale una vez; se repite desde Ajustes.

import * as estado from '../estado.js';
import { h, modal } from '../ui.js';
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

  const terminar = () => {
    cerrar?.();
    estado.cambiar((x) => {
      x.perfil.cuestionario = { ...respuestas, hecho: true };
      x.perfil.tema = respuestas.tema ?? 'sistema';
    });
    // El nivel del tutorial sale de la experiencia; la guía arranca en el acto.
    const nivel = respuestas.experiencia === 'avanzado' ? 'basico' : 'basico';
    fijarNivel(nivel);
    alTerminar?.(respuestas);
    if (respuestas.experiencia !== 'avanzado') iniciarGuia();
  };

  pintar();
}
