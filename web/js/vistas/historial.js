import * as estado from '../estado.js';
import { anadir, fechaLarga, h } from '../ui.js';

export function resumenSesion(datos, sesion) {
  const nombres = sesion.ejercicios
    .map((e) => datos.ejercicios.find((x) => x.id === e.ejercicioId)?.nombre ?? 'Ejercicio borrado');
  const series = sesion.ejercicios.reduce((n, e) => n + e.series.filter((s) => s.hecha).length, 0);
  return h('a', { class: 'tarjeta fila-enlace', href: `#/sesion/${sesion.id}` },
    h('div', {},
      h('strong', {}, fechaLarga(sesion.fecha)),
      sesion.estado === 'en-curso' && h('span', { class: 'etiqueta' }, 'En curso'),
      h('div', { class: 'suave' }, nombres.length ? nombres.join(', ') : 'Sin ejercicios')),
    h('span', { class: 'contador' }, `${series} ${series === 1 ? 'serie' : 'series'}`));
}

export function masRecienteAntes(a, b) {
  return (b.fecha + (b.inicio || '')).localeCompare(a.fecha + (a.inicio || ''));
}

export function vistaHistorial(contenedor) {
  const d = estado.datos();
  const sesiones = d.sesiones.filter((s) => !s.borrada).sort(masRecienteAntes);
  const papelera = d.sesiones.filter((s) => s.borrada).sort(masRecienteAntes);
  anadir(contenedor,
    h('h1', {}, 'Historial'),
    sesiones.length
      ? sesiones.map((s) => resumenSesion(d, s))
      : h('p', { class: 'suave' }, 'Todavía no hay entrenamientos registrados.'),
    papelera.length > 0 && h('details', { class: 'papelera' },
      h('summary', {}, `Papelera (${papelera.length})`),
      h('p', { class: 'nota' }, 'Los entrenamientos borrados se quedan aquí. Ábrelos para recuperarlos.'),
      papelera.map((s) => resumenSesion(d, s))));
}
