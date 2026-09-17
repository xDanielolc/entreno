import * as estado from '../estado.js';
import { anadir, fechaLarga, h, hoyISO, nuevoId } from '../ui.js';
import { masRecienteAntes, resumenSesion } from './historial.js';

export function vistaInicio(contenedor) {
  const d = estado.datos();
  const enCurso = d.sesiones.find((s) => s.estado === 'en-curso');
  const activos = d.ejercicios.filter((e) => !e.archivado);
  const recientes = d.sesiones.filter((s) => s.estado === 'terminada')
    .sort(masRecienteAntes).slice(0, 3);
  const necesitaPeso = d.perfil.pesoCorporalKg == null
    && activos.some((e) => ['asistida', 'pesoCorporal'].includes(e.carga.tipo));

  function empezar() {
    const id = nuevoId('ses');
    estado.cambiar((datos) => {
      datos.sesiones.push({
        id, fecha: hoyISO(), sedeId: datos.perfil.sedePorDefecto, rutinaId: null, diaRutinaId: null,
        estado: 'en-curso', inicio: new Date().toISOString(), fin: null, ejercicios: [], notas: '',
      });
    });
    location.hash = `#/sesion/${id}`;
  }

  anadir(contenedor,
    h('p', { class: 'fecha-hoy' }, fechaLarga(hoyISO())),
    h('h1', {}, d.perfil.nombre ? `Hola, ${d.perfil.nombre}` : 'Hola'),

    necesitaPeso && h('a', { class: 'tarjeta aviso-tarjeta', href: '#/ajustes' },
      'Indica tu peso corporal en Ajustes: lo necesitan tus ejercicios con máquina asistida.'),

    enCurso
      ? h('a', { class: 'boton grande', href: `#/sesion/${enCurso.id}` }, 'Continuar entrenamiento')
      : h('button', { class: 'boton grande', onclick: empezar }, 'Empezar entrenamiento'),

    !activos.length && h('div', { class: 'tarjeta' },
      h('p', {}, 'Aún no tienes ejercicios. Crea el primero para poder registrar series con su progresión.'),
      h('a', { class: 'boton secundario', href: '#/ejercicio/nuevo' }, 'Crear ejercicio')),

    recientes.length > 0 && h('section', {},
      h('h2', {}, 'Últimos entrenamientos'),
      recientes.map((s) => resumenSesion(d, s))));
}
