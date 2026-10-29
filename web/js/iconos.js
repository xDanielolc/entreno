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
  // Material, para el filtro «Equipo» de los ejercicios.
  barra: '<path d="M2 12h20M5.5 7.5v9M8 9v6M18.5 7.5v9M16 9v6"/>',
  mancuernas: '<path d="M7 7.5v9M17 7.5v9M4.5 10v4M19.5 10v4M7 12h10"/>',
  kettlebell: '<path d="M9 9V7.5a3 3 0 0 1 6 0V9"/><path d="M6.5 15a5.5 5.5 0 1 0 11 0 5.5 5.5 0 0 0-11 0z"/>',
  discos: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3.5v3M12 17.5v3"/>',
  polea: '<path d="M4 3h16M12 3v2"/><circle cx="12" cy="7.5" r="2.5"/><path d="M14.5 7.5V16M9.5 7.5V21"/><path d="M11.5 16h6l-1 3h-4z"/><rect x="7" y="18" width="5" height="3" rx=".5"/>',
  maquina: '<path d="M4 3v18M3 21h8M4 13h7v4"/><rect x="14" y="4" width="6" height="10" rx="1"/><path d="M14 7h6M14 10h6M17 14v7"/>',
  corporal: '<circle cx="12" cy="5" r="2.6"/><path d="M12 8.5v6"/><path d="M6.5 11.5 12 9l5.5 2.5"/><path d="M8.5 21l3.5-6.5L15.5 21"/>',
  fija: '<path d="M3 4h18M7 4v3M17 4v3"/><circle cx="12" cy="10" r="1.9"/><path d="M8 7.5l4 4.5 4-4.5M12 12v4.5M10 21l2-4.5 2 4.5"/>',
  gomas: '<path d="M4 7c4 0 4 10 8 10s4-10 8-10"/><path d="M4 5v4M20 5v4"/>',
  accesorios: '<circle cx="12" cy="12" r="8"/><path d="M5 9h14M5 15h14"/>',
  balon: '<circle cx="12" cy="12" r="8.5"/><path d="M3.8 9.5h16.4M3.8 14.5h16.4M12 3.5c-2.5 2.5-2.5 14.5 0 17"/>',
  rueda: '<circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/><path d="M2 12h4.5M17.5 12H22M2 10.5v3M22 10.5v3"/>',
  cajon: '<path d="M4 9.5 9 6h11v10.5L15 20H4z"/><path d="M4 9.5h11V20M15 9.5 20 6"/>',
  comba: '<path d="M5 6c0 11 14 11 14 0"/><path d="M5 2.5v5M19 2.5v5"/><path d="M3.8 2.5h2.4M17.8 2.5h2.4"/>',
  cuerdas: '<path d="M3 8c3-3 5 3 8 0s5-3 8 0M3 16c3-3 5 3 8 0s5-3 8 0"/><path d="M19 8h2M19 16h2"/>',
  saco: '<path d="M12 2v3"/><path d="M8 5h8l1 3v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V8z"/><path d="M7 9h10"/>',
  esterilla: '<path d="M2.5 18 7 8h14.5l-4.5 10z"/><path d="M7 8v1.5M2.5 18v1.5h14.5l4.5-10V8"/>',
  cardio: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l3 7M13.5 6H17"/>',
  bici: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l3 7M13.5 6H17"/>',
  otro: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.5v.4M12 16.5v.3"/>',
  kcal: '<circle cx="13" cy="13" r="6.5"/><circle cx="13" cy="13" r="3"/><path d="M3 3v6a2 2 0 0 0 2 2v10M5 3v5M21 3v18"/>',
  // Apartados de abajo (la tira de Cuerpo e Historial).
  resumen: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  trofeo: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  cinta: '<circle cx="9" cy="10" r="6"/><circle cx="9" cy="10" r="1.6"/><path d="M15 10v6h7M18 16v-2M21 16v-2"/>',
  camara: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.5M3.5 12h.5M3.5 18h.5"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/>',
  musculo: '<path d="M5 19c3-1 6-1 9 0 2.5-.5 4.5-2.5 5-5.5.4-3-1.5-5-4-5-1.2-2.3-3.5-4-6-3.5L8 8.5c1.3.7 2.5.6 3.5 0M5 19c-1-3-.5-6.5 1.5-9"/>',
  funcion: '<path d="M4 12h9M10 8l4 4-4 4M20 4v16"/>',
  orden: '<path d="M7 4v16M4 17l3 3 3-3M14 6h7M14 12h5M14 18h3"/>',
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
