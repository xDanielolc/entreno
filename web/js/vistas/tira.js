// Tira de apartados abajo, justo encima de las pestañas. La idea es de Lyfta
// («Tú» se abre en Resumen, Ejercicios, Medidas y Fotos), pero Dan la quiere
// abajo, al alcance del pulgar (27-10-2026). La usan Cuerpo, Historial y los
// filtros de Ejercicios.

import { icono } from '../iconos.js';
import { h } from '../ui.js';

// botones: [{ texto, icono, href | onclick, activo }]
export function tiraInferior(botones, { etiqueta = 'Apartados', clase = '' } = {}) {
  document.body.classList.add('hay-tira');
  return h('nav', { class: `tira-inferior${clase ? ` ${clase}` : ''}`, 'aria-label': etiqueta },
    botones.filter(Boolean).map((b) => h(b.href ? 'a' : 'button', {
      type: b.href ? null : 'button',
      href: b.href ?? null,
      class: `tira-boton${b.activo ? ' activo' : ''}`,
      'aria-current': b.activo && b.href ? 'page' : null,
      'aria-pressed': !b.href ? String(Boolean(b.activo)) : null,
      onclick: b.onclick ?? null,
    }, b.icono && icono(b.icono), h('span', { class: 'tira-texto' }, b.texto))));
}
