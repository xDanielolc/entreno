// Rutinas: plantillas de días de entrenamiento.
//
// La rutina dice qué ejercicios lleva cada día y, si quieres, con cuáles de
// sus series. No dice en qué fecha cae: el día siguiente se deduce del último
// entrenamiento hecho, y siempre puedes elegir otro.

import * as estado from '../estado.js';
import { nombreSede, sedeInicial, sedesActivas } from '../sedes.js';
import { anadir, aviso, confirmar, h, hoyISO, nuevoId } from '../ui.js';
import { campo } from './ejercicios.js';
import { ejercicioDesdeCatalogo, elegirEjercicio as abrirSelector } from './selector-ejercicios.js';
import { PLANTILLAS, anadirPlantilla, ejerciciosNuevos } from '../plantillas.js';

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
      id, fecha: hoyISO(), sedeId: sedeInicial(datos, rutina),
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
      r.activa && h('span', { class: 'etiqueta' }, 'Activa'))),

    h('h2', {}, 'Rutinas prehechas'),
    h('p', { class: 'nota' }, 'Añádelas a tus rutinas si te encajan; si no, ignóralas. Sus ejercicios se crean solo si no los tienes ya.'),
    PLANTILLAS.map((p) => tarjetaPlantilla(d, p)));
}

function tarjetaPlantilla(d, plantilla) {
  const yaEsta = d.rutinas.some((r) => r.plantilla === plantilla.id);
  async function anadir() {
    const nuevos = ejerciciosNuevos(d, plantilla);
    const si = await confirmar(`¿Añadir «${plantilla.nombre}» a tus rutinas?`
      + (nuevos.length ? ` Se crearán ${nuevos.length} ejercicios que aún no tienes: ${nuevos.join(', ')}.` : ' Ya tienes todos sus ejercicios.'),
    { si: 'Añadir' });
    if (!si) return;
    let id;
    estado.cambiar((datos) => { id = anadirPlantilla(datos, plantilla); });
    aviso('Rutina añadida. Revisa los pesos de partida en cada ejercicio.');
    location.hash = `#/rutina/${id}`;
  }
  return h('article', { class: 'tarjeta plantilla' },
    h('strong', {}, plantilla.nombre),
    h('div', { class: 'suave' }, plantilla.autor),
    h('p', {}, plantilla.resumen),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Por qué es así'), h('p', {}, plantilla.porQue)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Cómo se hace'), h('p', {}, plantilla.comoSeHace)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Días y ejercicios'),
      plantilla.dias.map((dia) => h('div', {},
        h('p', {}, h('strong', {}, dia.nombre)),
        h('ul', {}, dia.ejercicios.map((x) => h('li', {}, x.nombre + (x.opcional ? ' (opcional)' : '') + (x.nota ? ` · ${x.nota}` : ''))))))),
    h('button', { class: 'boton secundario', onclick: anadir }, yaEsta ? 'Añadir otra copia' : 'Añadir a mis rutinas'));
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
  let creada = Boolean(existente);

  // Se guarda solo a cada cambio, en cuanto tiene nombre.
  function persistir() {
    if (!borrador.nombre.trim()) return false;
    estado.cambiar((datos) => {
      const copia = structuredClone(borrador);
      copia.nombre = copia.nombre.trim();
      if (copia.activa) for (const r of datos.rutinas) if (r.id !== copia.id) r.activa = false;
      const i = datos.rutinas.findIndex((r) => r.id === copia.id);
      if (i >= 0) datos.rutinas[i] = copia;
      else datos.rutinas.push(copia);
    }, { tecleo: true });
    creada = true;
    return true;
  }

  const zona = h('div');
  zona.addEventListener('input', () => persistir());
  anadir(contenedor, h('h1', {}, existente ? 'Editar rutina' : 'Nueva rutina'),
    borrador.descripcion && h('details', { class: 'tarjeta explicacion' },
      h('summary', {}, 'Por qué es así y cómo se hace'),
      borrador.descripcion.split('\n\n').map((p) => h('p', {}, p))),
    zona);

  function repintar() {
    persistir();
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

      sedesActivas(d).length > 0 && campo('Dónde se hace', h('select', {
        onchange: (e) => { borrador.sedeId = e.target.value || null; } },
      h('option', { value: '' }, 'En cualquier sitio'),
      sedesActivas(d).map((s) => h('option', { value: s.id, selected: s.id === borrador.sedeId }, nombreSede(d, s.id))))),

      borrador.dias.map((dia, i) => tarjetaDia(dia, i)),

      h('button', { type: 'button', class: 'boton secundario', onclick: () => {
        borrador.dias.push({ id: nuevoId('dia'), nombre: `Día ${borrador.dias.length + 1}`, ejercicios: [] });
        repintar();
      } }, '+ Añadir día'),

      h('p', { class: 'nota centrado' }, existente || creada ? 'Los cambios se guardan solos.' : 'En cuanto le pongas nombre, se guarda sola.'),
      h('div', { class: 'fila-botones' },
        !existente && h('button', { type: 'button', class: 'boton secundario', onclick: descartar }, 'Descartar'),
        h('button', { class: 'boton', type: 'submit' }, 'Listo')),

      existente && h('button', { type: 'button', class: 'boton enlace peligro-texto', onclick: borrar }, 'Borrar rutina'));
  }

  function tarjetaDia(dia, i) {
    return h('article', { class: 'tarjeta' },
      h('div', { class: 'cabecera-tarjeta' },
        h('input', { type: 'text', value: dia.nombre, 'aria-label': 'Nombre del día',
          oninput: (e) => { dia.nombre = e.target.value; } }),
        h('button', { type: 'button', class: 'boton-icono papelera', 'aria-label': 'Quitar día',
          onclick: async () => {
            if (!await confirmar(`¿Quitar «${dia.nombre}» de la rutina?`, { si: 'Quitar', peligro: true })) return;
            borrador.dias.splice(i, 1);
            repintar();
          } }, '🗑')),

      dia.ejercicios.map((item, j) => h('div', { class: 'fila-ejercicio' },
        h('span', {}, nombreEj(item.ejercicioId), item.opcional && h('small', { class: 'suave' }, ' (opcional)'),
          item.nota && h('small', { class: 'suave bloque' }, item.nota)),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Subir', disabled: j === 0,
          onclick: () => { dia.ejercicios.splice(j - 1, 0, dia.ejercicios.splice(j, 1)[0]); repintar(); } }, '↑'),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Bajar', disabled: j === dia.ejercicios.length - 1,
          onclick: () => { dia.ejercicios.splice(j + 1, 0, dia.ejercicios.splice(j, 1)[0]); repintar(); } }, '↓'),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Quitar ejercicio',
          onclick: () => { dia.ejercicios.splice(j, 1); repintar(); } }, '✕'))),

      h('button', { type: 'button', class: 'boton secundario', onclick: () => elegirEjercicio(dia) }, '+ Ejercicio'));
  }

  // Al montar la rutina se puede coger cualquier ejercicio tuyo o de la lista
  // general. Si es de la lista, se pregunta antes de añadirlo a los tuyos.
  function elegirEjercicio(dia) {
    abrirSelector({
      titulo: 'Añadir ejercicio al día',
      mios: d.ejercicios.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      marcarMio: (e) => dia.ejercicios.some((x) => x.ejercicioId === e.id) && 'Ya en este día',
      alElegirMio: (e) => anadirAlDia(dia, e.id),
      alElegirCatalogo: (x) => desdeCatalogo(dia, x),
    });
  }

  function anadirAlDia(dia, ejercicioId) {
    dia.ejercicios.push({ ejercicioId, opcional: false, series: null });
    repintar();
  }

  async function desdeCatalogo(dia, x) {
    const si = await confirmar(
      `«${x.nombre}» no está en tus ejercicios. ¿Lo añado tal y como viene en la lista? `
      + 'Luego puedes cambiarle la progresión y las series.',
      { si: 'Añadir a mis ejercicios' });
    if (!si) return;
    const nuevo = ejercicioDesdeCatalogo(x);
    estado.cambiar((datos) => { datos.ejercicios.push(nuevo); });
    aviso(`${x.nombre} añadido a tus ejercicios`);
    anadirAlDia(dia, nuevo.id);
  }

  function guardar() {
    borrador.nombre = borrador.nombre.trim();
    if (!borrador.nombre) { aviso('Ponle un nombre a la rutina', { tipo: 'error' }); return; }
    persistir();
    location.hash = '#/rutinas';
  }

  function descartar() {
    if (creada) estado.cambiar((datos) => { datos.rutinas = datos.rutinas.filter((r) => r.id !== borrador.id); });
    location.hash = '#/rutinas';
  }

  async function borrar() {
    if (!await confirmar('¿Borrar esta rutina? Los entrenamientos ya hechos se conservan.', { si: 'Borrar', peligro: true })) return;
    estado.cambiar((datos) => { datos.rutinas = datos.rutinas.filter((r) => r.id !== borrador.id); });
    location.hash = '#/rutinas';
  }

  repintar();
}
