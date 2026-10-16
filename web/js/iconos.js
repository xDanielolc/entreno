// Iconos de la app: trazos sencillos en SVG que heredan el color del texto.
// Antes eran emojis, que cada móvil pinta a su manera.

const SVG = {
  inicio: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/>',
  cuerpo: '<circle cx="12" cy="5" r="2.6"/><path d="M12 8.5v6"/><path d="M6.5 11.5 12 9l5.5 2.5"/><path d="M8.5 21l3.5-6.5L15.5 21"/>',
  ejercicios: '<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  historial: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/><path d="M8 14h3M13 14h3M8 17.5h3"/>',
  aprender: '<path d="M12 6.5c-2.2-1.8-5-2-8-2v13.5c3 0 5.8.2 8 2 2.2-1.8 5-2 8-2V4.5c-3 0-5.8.2-8 2z"/><path d="M12 6.5V20"/>',
  ajustes: '<path d="M4 7h9M18.5 7H20M4 17h3M12.5 17H20"/><circle cx="15.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/>',
  marca: '<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
};

export function icono(nombre, { clase = 'icono' } = {}) {
  const span = document.createElement('span');
  span.className = clase;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" `
    + `stroke-linecap="round" stroke-linejoin="round">${SVG[nombre] ?? ''}</svg>`;
  return span;
}
