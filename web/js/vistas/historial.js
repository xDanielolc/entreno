import * as estado from '../estado.js';
import { sedeInicial } from '../sedes.js';
import { anadir, fechaLarga, h, hoyISO, modal, nuevoId } from '../ui.js';

export function resumenSesion(datos, sesion) {
  const rutina = datos.rutinas.find((r) => r.id === sesion.rutinaId);
  const dia = rutina?.dias.find((x) => x.id === sesion.diaRutinaId);
  const nombres = sesion.ejercicios
    .map((e) => datos.ejercicios.find((x) => x.id === e.ejercicioId)?.nombre ?? 'Ejercicio borrado');
  const series = sesion.ejercicios.reduce((n, e) => n + e.series.filter((s) => s.hecha).length, 0);
  return h('a', { class: 'tarjeta fila-enlace', href: `#/sesion/${sesion.id}` },
    h('div', {},
      h('strong', {}, fechaLarga(sesion.fecha)),
      sesion.estado === 'en-curso' && h('span', { class: 'etiqueta' }, 'En curso'),
      dia && h('div', {}, dia.nombre),
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
  // Para pasar a la app entrenamientos de otros días (cardio antiguo, por
  // ejemplo): se crea en esa fecha y se rellena como uno normal.
  function anadirPasado() {
    const fecha = h('input', { type: 'date', value: hoyISO(), max: hoyISO() });
    const hora = h('input', { type: 'time', value: '19:00' });
    const cerrar = modal('Entrenamiento de otro día', h('div', { class: 'formulario' },
      h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Día'), fecha),
      h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Hora de inicio'), hora),
      h('button', { class: 'boton', onclick: () => {
        if (!fecha.value) return;
        const id = nuevoId('ses');
        const [a, m, dd] = fecha.value.split('-').map(Number);
        const [hh, mm] = (hora.value || '19:00').split(':').map(Number);
        estado.cambiar((datos) => {
          datos.sesiones.push({
            id, fecha: fecha.value, sedeId: sedeInicial(datos, null), rutinaId: null, diaRutinaId: null,
            estado: 'en-curso', inicio: new Date(a, m - 1, dd, hh, mm).toISOString(), fin: null,
            ejercicios: [], notas: '', borrada: null, sensacionesCerrada: true,
          });
        });
        cerrar();
        location.hash = `#/sesion/${id}`;
      } }, 'Crear y rellenar')));
  }

  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Historial'),
      h('button', { class: 'boton secundario', onclick: anadirPasado }, '+ De otro día')),
    sesiones.length
      ? sesiones.map((s) => resumenSesion(d, s))
      : h('p', { class: 'suave' }, 'Todavía no hay entrenamientos registrados.'),
    papelera.length > 0 && h('details', { class: 'papelera' },
      h('summary', {}, `Papelera (${papelera.length})`),
      h('p', { class: 'nota' }, 'Los entrenamientos borrados se quedan aquí. Ábrelos para recuperarlos.'),
      papelera.map((s) => resumenSesion(d, s))));
}
