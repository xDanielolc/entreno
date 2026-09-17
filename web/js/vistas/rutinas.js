// Rutinas: plantillas de días de entrenamiento.
//
// La rutina dice qué ejercicios lleva cada día y, si quieres, con cuáles de
// sus series. No dice en qué fecha cae: el día siguiente se deduce del último
// entrenamiento hecho, y siempre puedes elegir otro.

import * as estado from '../estado.js';
import { anadir, aviso, confirmar, h, hoyISO, modal, nuevoId } from '../ui.js';
import { campo } from './ejercicios.js';

export function rutinaActiva(datos) {
  return datos.rutinas.find((r) => r.activa && r.dias.length) ?? null;
}

// Día que toca: el siguiente al del último entrenamiento terminado de esa rutina.
export function proximoDia(datos, rutina) {
  const hechas = datos.sesiones
    .filter((s) => !s.borrada && s.rutinaId === rutina.id && s.diaRutinaId)
    .sort((a, b) => (a.fecha + (a.inicio || '')).localeCompare(b.fecha + (b.inicio || '')));
  const ultimo = hechas.at(-1);
  const i = rutina.dias.findIndex((x) => x.id === ultimo?.diaRutinaId);
  return rutina.dias[(i + 1) % rutina.dias.length] ?? rutina.dias[0];
}

// Crea la sesión de un día de rutina, con sus ejercicios y series ya puestas.
export function empezarDia(rutina, dia, crearSerie) {
  const id = nuevoId('ses');
  estado.cambiar((datos) => {
    const sesion = {
      id, fecha: hoyISO(), sedeId: datos.perfil.sedePorDefecto,
      rutinaId: rutina.id, diaRutinaId: dia.id, estado: 'en-curso',
      inicio: new Date().toISOString(), fin: null, ejercicios: [], notas: '', borrada: null,
    };
    for (const item of dia.ejercicios) {
      const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
      if (!ej || ej.archivado) continue;
      const planes = (ej.series || []).filter((p) => !item.series || item.series.includes(p.id));
      const entrada = { ejercicioId: ej.id, cicloN: null, diaCiclo: null, notas: '',
        series: planes.map((plan) => crearSerie(datos, ej, plan, id)) };
      const bilbo = entrada.series.find((x) => x.cicloN != null);
      if (bilbo) { entrada.cicloN = bilbo.cicloN; entrada.diaCiclo = bilbo.diaCiclo; }
      sesion.ejercicios.push(entrada);
    }
    datos.sesiones.push(sesion);
  });
  return id;
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export function vistaRutinas(contenedor) {
  const d = estado.datos();
  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Rutinas'),
      h('a', { class: 'boton', href: '#/rutina/nueva' }, '+ Nueva')),
    !d.rutinas.length && h('p', { class: 'suave' },
      'Una rutina son tus días de entrenamiento en orden. La app te propondrá el siguiente cada vez que entrenes.'),
    d.rutinas.map((r) => h('a', { class: 'tarjeta fila-enlace', href: `#/rutina/${r.id}` },
      h('div', {},
        h('strong', {}, r.nombre),
        h('div', { class: 'suave' }, r.dias.map((x) => x.nombre).join(' · ') || 'Sin días')),
      r.activa && h('span', { class: 'etiqueta' }, 'Activa'))));
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function vistaFormularioRutina(contenedor, { id }) {
  const d = estado.datos();
  const existente = id !== 'nueva' ? d.rutinas.find((r) => r.id === id) : null;
  if (id !== 'nueva' && !existente) {
    anadir(contenedor, h('p', {}, 'Esta rutina no existe.'));
    return;
  }
  const borrador = existente ? structuredClone(existente) : {
    id: nuevoId('rut'), nombre: '', activa: !d.rutinas.some((r) => r.activa), dias: [],
  };
  const nombreEj = (ejId) => d.ejercicios.find((e) => e.id === ejId)?.nombre ?? 'Ejercicio borrado';

  const zona = h('div');
  anadir(contenedor, h('h1', {}, existente ? 'Editar rutina' : 'Nueva rutina'), zona);

  function repintar() {
    const scroll = window.scrollY;
    zona.replaceChildren(formulario());
    window.scrollTo(0, scroll);
  }

  function formulario() {
    return h('form', { class: 'formulario', onsubmit: (e) => { e.preventDefault(); guardar(); } },
      campo('Nombre', h('input', { type: 'text', required: true, value: borrador.nombre,
        placeholder: 'PLPL Bilbo + Heavy Duty', oninput: (e) => { borrador.nombre = e.target.value; } })),

      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: borrador.activa,
          onchange: (e) => { borrador.activa = e.target.checked; } }),
        'Rutina activa: es la que propone la app al empezar'),

      borrador.dias.map((dia, i) => tarjetaDia(dia, i)),

      h('button', { type: 'button', class: 'boton secundario', onclick: () => {
        borrador.dias.push({ id: nuevoId('dia'), nombre: `Día ${borrador.dias.length + 1}`, ejercicios: [] });
        repintar();
      } }, '+ Añadir día'),

      h('div', { class: 'fila-botones' },
        h('a', { class: 'boton secundario', href: '#/rutinas' }, 'Cancelar'),
        h('button', { class: 'boton', type: 'submit' }, 'Guardar')),

      existente && h('button', { type: 'button', class: 'boton enlace peligro-texto', onclick: borrar }, 'Borrar rutina'));
  }

  function tarjetaDia(dia, i) {
    return h('article', { class: 'tarjeta' },
      h('div', { class: 'cabecera-tarjeta' },
        h('input', { type: 'text', value: dia.nombre, 'aria-label': 'Nombre del día',
          oninput: (e) => { dia.nombre = e.target.value; } }),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Quitar día',
          onclick: () => { borrador.dias.splice(i, 1); repintar(); } }, '🗑')),

      dia.ejercicios.map((item, j) => h('div', { class: 'fila-ejercicio' },
        h('span', {}, nombreEj(item.ejercicioId)),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Subir', disabled: j === 0,
          onclick: () => { dia.ejercicios.splice(j - 1, 0, dia.ejercicios.splice(j, 1)[0]); repintar(); } }, '↑'),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Bajar', disabled: j === dia.ejercicios.length - 1,
          onclick: () => { dia.ejercicios.splice(j + 1, 0, dia.ejercicios.splice(j, 1)[0]); repintar(); } }, '↓'),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Quitar ejercicio',
          onclick: () => { dia.ejercicios.splice(j, 1); repintar(); } }, '✕'))),

      h('button', { type: 'button', class: 'boton secundario', onclick: () => elegirEjercicio(dia) }, '+ Ejercicio'));
  }

  function elegirEjercicio(dia) {
    const disponibles = d.ejercicios.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const lista = h('div', { class: 'lista-eleccion' });
    const pintar = (filtro = '') => {
      const f = filtro.trim().toLowerCase();
      lista.replaceChildren(...disponibles
        .filter((e) => !f || `${e.nombre} ${e.grupo || ''}`.toLowerCase().includes(f))
        .map((e) => h('button', { type: 'button', class: 'tarjeta fila-enlace', onclick: () => {
          cerrar();
          dia.ejercicios.push({ ejercicioId: e.id, opcional: false, series: null });
          repintar();
        } }, h('strong', {}, e.nombre), h('span', { class: 'suave' }, e.grupo || ''))));
    };
    pintar();
    const cerrar = modal('Añadir ejercicio al día', h('div', {},
      h('input', { type: 'search', class: 'buscador', placeholder: 'Buscar', oninput: (e) => pintar(e.target.value) }),
      lista));
  }

  function guardar() {
    borrador.nombre = borrador.nombre.trim();
    if (!borrador.nombre) { aviso('Ponle un nombre a la rutina', { tipo: 'error' }); return; }
    estado.cambiar((datos) => {
      if (borrador.activa) for (const r of datos.rutinas) r.activa = false;
      const i = datos.rutinas.findIndex((r) => r.id === borrador.id);
      if (i >= 0) datos.rutinas[i] = borrador;
      else datos.rutinas.push(borrador);
    });
    aviso('Rutina guardada');
    location.hash = '#/rutinas';
  }

  async function borrar() {
    if (!await confirmar('¿Borrar esta rutina? Los entrenamientos ya hechos se conservan.', { si: 'Borrar', peligro: true })) return;
    estado.cambiar((datos) => { datos.rutinas = datos.rutinas.filter((r) => r.id !== borrador.id); });
    location.hash = '#/rutinas';
  }

  repintar();
}
