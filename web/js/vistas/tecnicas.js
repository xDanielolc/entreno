// Selector de técnicas de intensidad: se pueden combinar varias en la misma
// serie (unilateral + rest-pause + isométrico final, por ejemplo).

import { TECNICAS } from '../esquema.js';
import { h } from '../ui.js';

export function selectorTecnicas(tecnicas, alCambiar) {
  // Todas a la vista, como botones que se quedan marcados: el desplegable
  // del móvil sacaba una barra de «Anterior / Siguiente» que no pintaba nada.
  const puestas = tecnicas || [];
  return h('div', { class: 'chips tecnicas' }, Object.entries(TECNICAS).map(([k, v]) => {
    const marcada = puestas.includes(k);
    return h('button', {
      type: 'button', class: `chip seleccionable ${marcada ? 'activo' : ''}`, 'aria-pressed': String(marcada),
      onclick: () => alCambiar(marcada ? puestas.filter((x) => x !== k) : [...puestas, k]),
    }, v.etiqueta);
  }));
}

// Texto corto para el historial: «Drop set + Unilateral».
export function textoTecnicas(tecnicas) {
  return (tecnicas || []).map((k) => TECNICAS[k]?.etiqueta ?? k).join(' + ');
}
