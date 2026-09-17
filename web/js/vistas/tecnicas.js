// Selector de técnicas de intensidad: se pueden combinar varias en la misma
// serie (unilateral + rest-pause + isométrico final, por ejemplo).

import { TECNICAS } from '../esquema.js';
import { h } from '../ui.js';

export function selectorTecnicas(tecnicas, alCambiar) {
  const puestas = tecnicas || [];
  const libres = Object.entries(TECNICAS).filter(([k]) => !puestas.includes(k));

  return h('div', { class: 'tecnicas' },
    puestas.map((k) => h('span', { class: 'chip' },
      TECNICAS[k]?.etiqueta ?? k,
      h('button', { type: 'button', class: 'chip-quitar', 'aria-label': `Quitar ${TECNICAS[k]?.etiqueta ?? k}`,
        onclick: () => alCambiar(puestas.filter((x) => x !== k)) }, '✕'))),

    libres.length > 0 && h('select', { class: 'anadir-tecnica', 'aria-label': 'Añadir técnica',
      onchange: (e) => { if (e.target.value) alCambiar([...puestas, e.target.value]); } },
    h('option', { value: '' }, puestas.length ? '+ Otra técnica' : '+ Técnica'),
    libres.map(([k, v]) => h('option', { value: k }, v.etiqueta))));
}

// Texto corto para el historial: «Drop set + Unilateral».
export function textoTecnicas(tecnicas) {
  return (tecnicas || []).map((k) => TECNICAS[k]?.etiqueta ?? k).join(' + ');
}
