// Selector de técnicas de intensidad: se pueden combinar varias en la misma
// serie (unilateral + rest-pause + isométrico final, por ejemplo).

import { TECNICAS } from '../esquema.js';
import { h, modal } from '../ui.js';

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

// La misma elección, plegada en un botón que dice las elegidas («Drop set ▾»)
// y abre la lista: en el entreno no se ven todas a la vez.
export function desplegableTecnicas(tecnicas, alCambiar) {
  const puestas = tecnicas || [];
  return h('button', { type: 'button', class: 'selector-abrir boton-tecnicas', onclick: () => {
    let actuales = [...puestas];
    const lista = h('div', { class: 'lista-selector' });
    const pintar = () => lista.replaceChildren(...Object.entries(TECNICAS).map(([k, v]) => h('button', {
      type: 'button', class: `boton-marca${actuales.includes(k) ? ' activo' : ''}`, 'aria-pressed': String(actuales.includes(k)),
      onclick: () => { actuales = actuales.includes(k) ? actuales.filter((x) => x !== k) : [...actuales, k]; pintar(); },
    }, v.etiqueta)));
    pintar();
    const cerrar = modal('Técnica de intensidad', h('div', {},
      h('p', { class: 'nota' }, 'Puedes combinar varias.'), lista,
      h('button', { type: 'button', class: 'boton', onclick: () => { cerrar(); alCambiar(actuales); } }, 'Listo')));
  } }, `${textoTecnicas(puestas) || 'Elegir técnica'} ▾`);
}

// Texto corto para el historial: «Drop set + Unilateral».
export function textoTecnicas(tecnicas) {
  return (tecnicas || []).map((k) => TECNICAS[k]?.etiqueta ?? k).join(' + ');
}
