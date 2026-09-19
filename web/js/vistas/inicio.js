import * as estado from '../estado.js';
import { sedeInicial } from '../sedes.js';
import { barraModoPrueba } from '../modo-prueba.js';
import { crearSerieDesdePlan } from '../series.js';
import { anadir, fechaLarga, h, hoyISO, modal, nuevoId } from '../ui.js';
import { tarjetaRecuperacion, tarjetaSugerenciasAjuste } from './cuerpo.js';
import { tarjetaInstalar } from './instalar.js';
import { masRecienteAntes, resumenSesion } from './historial.js';
import { empezarDia, proximoDia, rutinaActiva } from './rutinas.js';

export function vistaInicio(contenedor) {
  const d = estado.datos();
  const enCurso = d.sesiones.find((s) => s.estado === 'en-curso' && !s.borrada);
  const activos = d.ejercicios.filter((e) => !e.archivado);
  const recientes = d.sesiones.filter((s) => s.estado === 'terminada' && !s.borrada)
    .sort(masRecienteAntes).slice(0, 3);
  const necesitaPeso = d.perfil.pesoCorporalKg == null
    && activos.some((e) => ['asistida', 'pesoCorporal'].includes(e.carga.tipo));
  const rutina = rutinaActiva(d);
  const dia = rutina ? proximoDia(d, rutina) : null;

  function empezarSuelto() {
    const id = nuevoId('ses');
    estado.cambiar((datos) => {
      datos.sesiones.push({
        id, fecha: hoyISO(), sedeId: sedeInicial(datos, null), rutinaId: null, diaRutinaId: null,
        estado: 'en-curso', inicio: new Date().toISOString(), fin: null, ejercicios: [], notas: '', borrada: null,
      });
    });
    location.hash = `#/sesion/${id}`;
  }

  function empezarConRutina(elegido) {
    const id = empezarDia(rutina, elegido, (datos, ej, plan) => crearSerieDesdePlan(datos, ej, plan));
    location.hash = `#/sesion/${id}`;
  }

  function elegirDia() {
    const cerrar = modal('Elegir día', h('div', { class: 'lista-eleccion' },
      rutina.dias.map((x) => h('button', { class: 'tarjeta fila-enlace', onclick: () => { cerrar(); empezarConRutina(x); } },
        h('div', {},
          h('strong', {}, x.nombre),
          h('div', { class: 'suave' }, `${x.ejercicios.length} ejercicios`)),
        x.id === dia.id && h('span', { class: 'etiqueta' }, 'Toca hoy')))));
  }

  anadir(contenedor,
    estado.esSinCuenta() && barraModoPrueba(),
    h('p', { class: 'fecha-hoy' }, fechaLarga(hoyISO())),
    h('h1', {}, d.perfil.nombre ? `Hola, ${d.perfil.nombre}` : 'Hola'),

    necesitaPeso && h('a', { class: 'tarjeta aviso-tarjeta', href: '#/ajustes' },
      'Indica tu peso corporal en Ajustes: lo necesitan tus ejercicios con máquina asistida.'),

    enCurso
      ? h('a', { class: 'boton grande', href: `#/sesion/${enCurso.id}` }, 'Continuar entrenamiento')
      : dia
        ? h('section', { class: 'tarjeta' },
          h('p', { class: 'suave' }, `${rutina.nombre} · hoy toca`),
          h('h2', {}, dia.nombre),
          h('p', { class: 'suave' }, dia.ejercicios.length
            ? dia.ejercicios.map((x) => d.ejercicios.find((e) => e.id === x.ejercicioId)?.nombre ?? '—').join(', ')
            : 'Este día no tiene ejercicios todavía'),
          h('button', { class: 'boton grande', onclick: () => empezarConRutina(dia) }, 'Empezar'),
          h('div', { class: 'fila-botones' },
            h('button', { class: 'boton secundario', onclick: elegirDia }, 'Otro día'),
            h('button', { class: 'boton secundario', onclick: empezarSuelto }, 'Sin rutina')))
        : h('button', { class: 'boton grande', onclick: empezarSuelto }, 'Empezar entrenamiento'),

    !activos.length && h('div', { class: 'tarjeta' },
      h('p', {}, 'Aún no tienes ejercicios. Puedes añadir una rutina prehecha (trae sus ejercicios) o crear el primero.'),
      h('div', { class: 'fila-botones' },
        h('a', { class: 'boton', href: '#/rutinas' }, 'Rutinas prehechas'),
        h('a', { class: 'boton secundario', href: '#/ejercicio/nuevo' }, 'Crear ejercicio'))),

    activos.length > 0 && !rutina && h('a', { class: 'boton enlace', href: '#/rutinas' },
      'Elegir o crear una rutina para que te diga qué toca cada día'),
    rutina && h('a', { class: 'boton enlace', href: '#/rutinas' }, 'Ver mis rutinas'),

    tarjetaSugerenciasAjuste(d),
    tarjetaRecuperacion(d, { compacta: true }),
    tarjetaInstalar(),

    recientes.length > 0 && h('section', {},
      h('h2', {}, 'Últimos entrenamientos'),
      recientes.map((s) => resumenSesion(d, s))));
}
