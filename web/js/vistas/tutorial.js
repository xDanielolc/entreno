// Tutorial por niveles y «pistas»: notas pequeñas que explican una pantalla
// la primera vez y se cierran con ✕ para no volver. Lo visto se guarda en el
// perfil, así va con la cuenta a cualquier dispositivo.
//
// Niveles: 'basico' (solo las pistas básicas), 'avanzado' (todas) y
// 'ninguno'. Hasta que se elige, se enseñan las básicas.

import * as estado from '../estado.js';
import { h, modal } from '../ui.js';

export const NIVELES = {
  basico: { etiqueta: 'Guíame por lo básico', descripcion: 'Una nota corta en cada pantalla la primera vez que la abres. Lo demás lo descubres cuando quieras en «Saber más».' },
  avanzado: { etiqueta: 'Quiero entenderlo todo', descripcion: 'Las notas básicas y además las de los cálculos: 1RM, drop sets, recuperación.' },
  ninguno: { etiqueta: 'Sin tutorial', descripcion: 'Ninguna nota. Siempre puedes activarlas en Ajustes.' },
};

function config(d = estado.datos()) {
  return d?.perfil?.tutoriales ?? { nivel: null, vistos: {} };
}

export function nivelTutorial(d) {
  return config(d).nivel ?? null;
}

export function fijarNivel(nivel) {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.nivel = nivel;
  });
}

export function marcarVista(clave) {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.vistos ??= {};
    x.perfil.tutoriales.vistos[clave] = true;
  }, { tecleo: true });
}

// Vuelven a salir todas las pistas.
export function reiniciarPistas() {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.vistos = {};
  });
}

// Una pista, o null si no toca enseñarla.
export function pista(clave, texto, { avanzada = false } = {}) {
  const t = config();
  const nivel = t.nivel ?? 'basico';
  if (nivel === 'ninguno') return null;
  if (avanzada && nivel !== 'avanzado') return null;
  if (t.vistos?.[clave]) return null;
  const caja = h('div', { class: 'pista', role: 'note' },
    h('span', { class: 'pista-icono', 'aria-hidden': 'true' }, '💡'),
    h('span', { class: 'pista-texto' }, texto),
    h('button', { class: 'pista-cerrar', 'aria-label': 'Entendido, no volver a enseñar',
      onclick: () => { marcarVista(clave); caja.remove(); } }, '✕'));
  return caja;
}

// Cartel de bienvenida al tutorial: la app es grande, elige cuánto quieres
// que te guíe. Sale una vez, al entrar por primera vez.
export function elegirNivel({ alElegir } = {}) {
  const cerrar = modal('¿Te guío?', h('div', { class: 'tutorial-niveles' },
    h('p', {}, 'La app es grande: registra series, calcula tu 1RM, propone pesos, mide tu recuperación y más. '
      + 'No hace falta entenderlo todo el primer día.'),
    Object.entries(NIVELES).map(([clave, n]) => h('button', { class: 'tarjeta fila-enlace', onclick: () => {
      fijarNivel(clave);
      cerrar();
      alElegir?.(clave);
    } },
    h('div', {}, h('strong', {}, n.etiqueta), h('div', { class: 'suave' }, n.descripcion)))),
    h('p', { class: 'nota' }, 'Se puede cambiar en Ajustes, en «Tutorial», donde también se pueden volver a mostrar las notas.')));
  return cerrar;
}
