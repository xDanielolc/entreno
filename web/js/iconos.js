// Iconos de la app: trazos sencillos en SVG que heredan el color del texto.
// Antes eran emojis, que cada móvil pinta a su manera.

const SVG = {
  inicio: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/>',
  cuerpo: '<circle cx="12" cy="5" r="2.6"/><path d="M12 8.5v6"/><path d="M6.5 11.5 12 9l5.5 2.5"/><path d="M8.5 21l3.5-6.5L15.5 21"/>',
  ejercicios: '<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  diario: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/><path d="M16 4v3M14.5 5.5h3"/>',
  historial: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/><path d="M8 14h3M13 14h3M8 17.5h3"/>',
  aprender: '<path d="M12 6.5c-2.2-1.8-5-2-8-2v13.5c3 0 5.8.2 8 2 2.2-1.8 5-2 8-2V4.5c-3 0-5.8.2-8 2z"/><path d="M12 6.5V20"/>',
  ajustes: '<path d="M4 7h9M18.5 7H20M4 17h3M12.5 17H20"/><circle cx="15.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/>',
  marca: '<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  papelera: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/><path d="M9 7V4.5h6V7"/>',
  bocadillo: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
  ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  reloj: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  repetir: '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  bombilla: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  campana: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  aviso: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17v.5"/>',
};

// Un icono de trazo en un <span>: hereda el color del texto que lo rodea.
export function icono(nombre, { clase = 'icono' } = {}) {
  const span = document.createElement('span');
  span.className = clase;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" `
    + `stroke-linecap="round" stroke-linejoin="round">${SVG[nombre] ?? ''}</svg>`;
  return span;
}
