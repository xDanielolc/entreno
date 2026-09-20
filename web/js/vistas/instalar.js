// Tarjeta para instalar la app en la pantalla de inicio. Solo se ve cuando
// la app se abre desde el navegador (no instalada), y se puede ocultar.
//
// Sobre el aviso de Samsung: al instalar desde Samsung Internet, Android 14 o
// más nuevo enseña «app no segura», porque el paquete que fabrica Samsung
// Internet para las apps web declara una versión de Android antigua. No
// depende de esta app. Desde Chrome no sale.

import { h } from '../ui.js';

const CLAVE = 'entreno-instalar-oculto-hasta';
let promptDiferido = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptDiferido = e;
});

function instalada() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

function oculta() {
  try { return Number(localStorage.getItem(CLAVE) || 0) > Date.now(); } catch { return false; }
}

function ocultar(dias) {
  try { localStorage.setItem(CLAVE, String(Date.now() + dias * 86_400_000)); } catch { /* nada */ }
}

export function tarjetaInstalar() {
  if (instalada() || oculta()) return null;
  const esSamsung = /SamsungBrowser/i.test(navigator.userAgent);
  const esIos = /iPhone|iPad/i.test(navigator.userAgent);
  const tarjeta = h('section', { class: 'tarjeta instalar' },
    h('p', {}, h('strong', {}, 'Instala la app en la pantalla de inicio'), ': sin barra del navegador y sin cobertura.'),
    h('details', {},
      h('summary', {}, 'Cómo se instala'),
      esIos
        ? h('p', { class: 'nota' }, 'En Safari, toca el botón de compartir (el cuadrado con la flecha) y luego «Añadir a pantalla de inicio».')
        : h('p', { class: 'nota' }, 'En Chrome, abre el menú (los tres puntos de arriba a la derecha) y toca «Instalar aplicación» '
          + 'o «Añadir a pantalla de inicio».'),
      esSamsung && h('p', { class: 'nota' }, 'Estás en Samsung Internet. Si al instalar sale un aviso de «app no segura», es cosa '
        + 'de Samsung Internet (fabrica el paquete con una versión de Android antigua): puedes instalar igual, o abrir esta '
        + 'dirección en Chrome, donde no sale.')),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton enlace', onclick: () => { ocultar(30); tarjeta.remove(); } }, 'Ahora no'),
      promptDiferido && h('button', { class: 'boton', onclick: async () => {
        promptDiferido.prompt();
        const { outcome } = await promptDiferido.userChoice;
        promptDiferido = null;
        if (outcome === 'accepted') tarjeta.remove();
      } }, 'Instalar')));
  return tarjeta;
}
