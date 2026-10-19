// Página de prueba (#/prueba-presentacion): repetir la animación de entrada
// en sus dos variantes y quedarse con una. No sale en ningún menú.
import { anadir, aviso, h } from '../ui.js';
import { mostrarPresentacion } from '../presentacion.js';

const VARIANTES = {
  cae: ['La caja cae del cielo', 'Aterriza sobre su esquina derecha, da un botecito y cae hacia la izquierda hasta quedar plana.'],
  derecha: ['La caja entra por la derecha', 'Entra recta, choca con la pesa, se inclina por el golpe y se asienta.'],
};
const CLAVE = 'entreno-presentacion';

const repetir = (variante) => mostrarPresentacion(variante, { nueva: true });

export function vistaPruebaPresentacion(contenedor) {
  let elegida = 'cae';
  try { elegida = localStorage.getItem(CLAVE) || 'cae'; } catch { /* sin almacenamiento */ }
  const zona = h('div', { class: 'formulario' });
  const pintar = () => {
    zona.replaceChildren(...Object.entries(VARIANTES).map(([k, [titulo, explica]]) => h('div', { class: 'tarjeta' },
      h('h2', {}, titulo, elegida === k ? ' · la de ahora' : ''),
      h('p', { class: 'nota' }, explica),
      h('div', { class: 'fila-botones' },
        h('button', { type: 'button', class: 'boton secundario', onclick: () => repetir(k) }, 'Verla'),
        h('button', { type: 'button', class: 'boton', disabled: elegida === k, onclick: () => {
          elegida = k;
          try { localStorage.setItem(CLAVE, k); } catch { /* sin almacenamiento */ }
          aviso('Hecho: esta es la que saldrá al abrir la app en este móvil.');
          pintar();
        } }, 'Quedarme con esta')))));
  };
  anadir(contenedor, h('h1', {}, 'Presentación'),
    h('p', { class: 'nota centrado' }, 'Toca «Verla» para repetir cada una. La que elijas sale al abrir la app (en este aparato).'),
    zona);
  pintar();
}
