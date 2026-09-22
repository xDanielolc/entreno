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
import { tipoDePlantilla, tipoDeRutina, PLANTILLAS, anadirPlantilla, ejerciciosNuevos } from '../plantillas.js';
import { cuentaParaFatiga, normalizar } from '../catalogo.js';
import { nombreMusculo } from '../musculos.js';
import { pista } from './tutorial.js';
import { conGlosario } from './glosario.js';

export function rutinaActiva(datos) {
  return datos.rutinas.find((r) => r.activa && r.dias.length) ?? null;
}

// Puede haber varias rutinas activas a la vez (una de gimnasio y otra de
// casa, por ejemplo).
export function rutinasActivas(datos) {
  return datos.rutinas.filter((r) => r.activa && r.dias.length);
}

export const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const NOMBRES_DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Qué toca hoy entre las rutinas activas. Dos formas de repartir, que se
// pueden mezclar:
//   · una rutina con días fijos de la semana (diasSemana: 0 = lunes … 6 =
//     domingo) toca en esos días y solo en esos;
//   · las que no los tienen, las propone la app: la de su próximo día con
//     los músculos más recuperados y, en empate, la que lleve más tiempo
//     sin hacerse.
// Devuelve { rutina, dia, motivo, alternativas } o null.
export function queToca(datos, recuperacion = null, ahora = new Date()) {
  const activas = rutinasActivas(datos);
  if (!activas.length) return null;
  const hoyIndice = (ahora.getDay() + 6) % 7;
  const conDias = activas.filter((r) => r.diasSemana?.length);
  const libres = activas.filter((r) => !r.diasSemana?.length);
  const opcion = (rutina, motivo) => ({ rutina, dia: proximoDia(datos, rutina), motivo });
  const alternativas = activas.map((r) => opcion(r, ''));

  const deHoy = conDias.find((r) => r.diasSemana.includes(hoyIndice));
  if (deHoy) return { ...opcion(deHoy, `hoy es ${NOMBRES_DIAS[hoyIndice]}`), alternativas };

  if (libres.length) {
    const puntuacion = (r) => {
      const dia = proximoDia(datos, r);
      const musculos = new Set();
      for (const item of dia.ejercicios) {
        const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
        for (const m of ej?.musculos?.principales ?? []) musculos.add(m);
      }
      const pct = [...musculos].map((m) => recuperacion?.[m]?.porcentaje ?? 100);
      const minimo = pct.length ? Math.min(...pct) : 100;
      const ultima = datos.sesiones.filter((s) => !s.borrada && s.rutinaId === r.id).map((s) => s.fecha).sort().at(-1) ?? '';
      return { minimo, ultima };
    };
    const ordenadas = libres.map((r) => ({ r, ...puntuacion(r) }))
      .sort((a, b) => b.minimo - a.minimo || a.ultima.localeCompare(b.ultima));
    const mejor = ordenadas[0];
    const motivo = libres.length > 1
      ? (mejor.minimo >= 90 ? 'sus músculos están recuperados' : 'es la que mejor recuperada tienes')
      : '';
    return { ...opcion(mejor.r, motivo), alternativas };
  }

  // Todas tienen días fijos y hoy no toca ninguna: la más próxima.
  const proxima = conDias.map((r) => {
    const faltan = Math.min(...r.diasSemana.map((d) => (d - hoyIndice + 7) % 7 || 7));
    return { r, faltan };
  }).sort((a, b) => a.faltan - b.faltan)[0];
  const cuando = proxima.faltan === 1 ? 'mañana' : `el ${NOMBRES_DIAS[(hoyIndice + proxima.faltan) % 7]}`;
  return { ...opcion(proxima.r, `hoy no toca según tus días; la siguiente es ${cuando}`), descansoHoy: true, alternativas };
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
        series: planes.flatMap((plan) => { const s = crearSerie(datos, ej, plan, id); return Array.isArray(s) ? s : [s]; }) };
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

const TIPOS_RUTINA = { todas: 'Todas', fuerza: 'Fuerza e hipertrofia', cardio: 'Cardio', flexibilidad: 'Yoga, estirar y movilidad' };
const filtroRutinas = { tipo: 'todas', texto: '' };

export function vistaRutinas(contenedor) {
  const d = estado.datos();
  const zona = h('div');
  const nombreDe = (id) => d.ejercicios.find((e) => e.id === id)?.nombre ?? '';
  const cuadra = (tipo, texto) => (filtroRutinas.tipo === 'todas' || tipo === filtroRutinas.tipo)
    && (!filtroRutinas.texto || normalizar(texto).includes(normalizar(filtroRutinas.texto)));

  function pintarLista() {
    const mias = d.rutinas.filter((r) => cuadra(tipoDeRutina(d, r),
      `${r.nombre} ${r.dias.map((x) => `${x.nombre} ${x.ejercicios.map((e) => nombreDe(e.ejercicioId)).join(' ')}`).join(' ')}`));
    const prehechas = PLANTILLAS.filter((p) => cuadra(tipoDePlantilla(p),
      `${p.nombre} ${p.resumen} ${p.dias.map((x) => `${x.nombre} ${x.ejercicios.map((e) => e.nombre).join(' ')}`).join(' ')}`));
    zona.replaceChildren();
    anadir(zona,
      mias.some((r) => r.activa) && h('h2', {}, 'Activas'),
      mias.filter((r) => r.activa).map((r) => tarjetaRutina(r)),
      mias.some((r) => !r.activa) && h('h2', {}, 'Mías, sin activar'),
      mias.filter((r) => !r.activa).map((r) => tarjetaRutina(r)),
      h('h2', {}, 'Rutinas prehechas'),
      h('p', { class: 'nota' }, 'Añádelas a tus rutinas si te encajan; si no, ignóralas. Sus ejercicios se crean solo si no los tienes ya.'),
      prehechas.map((p) => tarjetaPlantilla(d, p)),
      !mias.length && !prehechas.length && h('p', { class: 'suave' }, 'Nada que cuadre con ese filtro.'));
  }

  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Rutinas'),
      h('a', { class: 'boton', href: '#/rutina/nueva' }, '+ Nueva')),
    pista('rutinas', 'Tus días de entrenamiento en orden. Las activas son las que te propone Hoy. Abajo, prehechas para empezar ya.'),
    !d.rutinas.length && h('p', { class: 'suave' },
      'Una rutina son tus días de entrenamiento en orden. La app te propondrá el siguiente cada vez que entrenes.'),
    h('input', { type: 'search', class: 'buscador', placeholder: 'Buscar rutina o ejercicio…', value: filtroRutinas.texto,
      'aria-label': 'Buscar rutina', oninput: (e) => { filtroRutinas.texto = e.target.value; pintarLista(); } }),
    h('div', { class: 'chips filtros-rutinas' }, Object.entries(TIPOS_RUTINA).map(([k, v]) => h('button', {
      type: 'button', class: `chip seleccionable ${filtroRutinas.tipo === k ? 'activo' : ''}`, 'aria-pressed': String(filtroRutinas.tipo === k),
      onclick: () => { filtroRutinas.tipo = k; pintarLista(); },
    }, v))),
    zona);
  pintarLista();
}

// Un texto largo, frase a frase, como lista: se lee más fácil.
export function enPuntos(texto) {
  const frases = (texto || '').split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ«¿¡0-9])/).map((f) => f.trim()).filter(Boolean);
  const usadas = new Set();
  if (frases.length < 2) return h('p', {}, conGlosario(texto, usadas));
  return h('ul', { class: 'puntos' }, frases.map((f) => h('li', {}, conGlosario(f, usadas))));
}

function tarjetaRutina(r) {
  const dias = r.diasSemana?.length ? r.diasSemana.map((i) => DIAS_SEMANA[i]).join(' ') : null;
  return h('a', { class: 'tarjeta fila-enlace', href: `#/rutina/${r.id}` },
    h('div', {},
      h('strong', {}, r.nombre),
      h('div', { class: 'suave' }, r.dias.map((x) => x.nombre).join(' · ') || 'Sin días'),
      dias && h('div', { class: 'suave' }, `Días fijos: ${dias}`)),
    r.activa && h('span', { class: 'etiqueta' }, 'Activa'));
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
    h('p', {}, conGlosario(plantilla.resumen)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Por qué es así'), enPuntos(plantilla.porQue)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Cómo se hace'), enPuntos(plantilla.comoSeHace)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Días y ejercicios'),
      plantilla.dias.map((dia) => h('div', {},
        h('p', {}, h('strong', {}, dia.nombre)),
        h('ul', {}, dia.ejercicios.map((x) => h('li', {}, x.nombre + (x.opcional ? ' (opcional)' : '') + (x.nota ? ` · ${x.nota}` : ''))))))),
    h('button', { class: 'boton secundario anadir-plantilla', onclick: anadir }, yaEsta ? 'Añadir otra copia' : 'Añadir a mis rutinas'));
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
    id: nuevoId('rut'), nombre: '', activa: true, dias: [], diasSemana: null,
  };
  const nombreEj = (ejId) => d.ejercicios.find((e) => e.id === ejId)?.nombre ?? 'Ejercicio borrado';
  let creada = Boolean(existente);

  // Se guarda solo a cada cambio, en cuanto tiene nombre.
  function persistir() {
    if (!borrador.nombre.trim()) return false;
    estado.cambiar((datos) => {
      const copia = structuredClone(borrador);
      copia.nombre = copia.nombre.trim();
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
      borrador.descripcion.split('\n\n').map((p) => enPuntos(p))),
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
          onchange: (e) => { borrador.activa = e.target.checked; persistir(); } }),
        'Rutina activa: Hoy te la propone (puedes tener varias activas)'),

      borrador.activa && h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Días fijos de la semana (opcional)'),
        h('div', { class: 'tecnicas' }, DIAS_SEMANA.map((letra, i) => h('button', {
          type: 'button', class: `chip seleccionable ${borrador.diasSemana?.includes(i) ? 'activo' : ''}`,
          'aria-pressed': String(Boolean(borrador.diasSemana?.includes(i))), 'aria-label': NOMBRES_DIAS[i],
          onclick: () => {
            const dias = new Set(borrador.diasSemana ?? []);
            if (dias.has(i)) dias.delete(i); else dias.add(i);
            borrador.diasSemana = dias.size ? [...dias].sort() : null;
            repintar();
          } }, letra))),
        h('small', { class: 'nota' }, 'Sin días fijos, la app propone esta rutina cuando sus músculos están recuperados. '
          + 'Con días fijos, solo esos días. Sirve para combinar dos rutinas activas: una con días fijos y otra libre, por ejemplo.')),

      sedesActivas(d).length > 0 && campo('Dónde se hace', h('select', {
        onchange: (e) => { borrador.sedeId = e.target.value || null; } },
      h('option', { value: '' }, 'En cualquier sitio'),
      sedesActivas(d).map((s) => h('option', { value: s.id, selected: s.id === borrador.sedeId }, nombreSede(d, s.id))))),

      avisoChoques(),

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

  // Dos días seguidos que cargan los mismos músculos no se pueden hacer en
  // días seguidos: conviene saberlo al montarla, no al chocarse con ello.
  function avisoChoques() {
    const principales = (dia) => {
      const musculos = new Set();
      for (const item of dia.ejercicios) {
        const ej = d.ejercicios.find((e) => e.id === item.ejercicioId);
        if (!ej || !cuentaParaFatiga(ej)) continue;
        for (const m of ej.musculos?.principales ?? []) musculos.add(m);
      }
      return musculos;
    };
    const choques = [];
    // Con dos días solo hay una pareja; con tres o más se mira también la
    // vuelta del último al primero, que es la que se repite cada semana.
    const parejas = borrador.dias.length < 2 ? 0
      : borrador.dias.length === 2 ? 1 : borrador.dias.length;
    for (let i = 0; i < parejas; i++) {
      const a = borrador.dias[i];
      const b = borrador.dias[(i + 1) % borrador.dias.length];
      if (a === b) continue;
      const enB = principales(b);
      const comunes = [...principales(a)].filter((m) => enB.has(m));
      if (comunes.length >= 1) choques.push({ a, b, comunes });
    }
    if (!choques.length) return null;
    return h('div', { class: 'tarjeta aviso-tarjeta' },
      h('p', {}, 'Ojo con el orden: hay días seguidos que cargan los mismos músculos, así que no podrás hacerlos un día detrás de otro.'),
      h('ul', {}, choques.map((c) => h('li', {},
        `${c.a.nombre} y ${c.b.nombre}: ${c.comunes.map((m) => nombreMusculo(m)).join(', ')}.`))),
      h('p', { class: 'nota' }, 'No es un error: puedes dejar un día de descanso entre medias o cambiar el orden. '
        + 'La app, de todas formas, te propondrá el día que mejor recuperado tengas.'));
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
          item.nota && h('small', { class: 'suave bloque' }, item.nota),
          tieneDropSet(item.ejercicioId) && h('select', { class: 'modo-carga-item', 'aria-label': 'Pesos del drop set en esta rutina',
            onchange: (e) => { item.modoCarga = e.target.value || null; persistir(); } },
          h('option', { value: '', selected: !item.modoCarga }, 'Drop set: como en el ejercicio'),
          h('option', { value: 'rm', selected: item.modoCarga === 'rm' }, 'Drop set: por % del 1RM'),
          h('option', { value: 'kg', selected: item.modoCarga === 'kg' }, 'Drop set: kilos a mano'))),
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

  function tieneDropSet(ejercicioId) {
    return (d.ejercicios.find((e) => e.id === ejercicioId)?.series || []).some((p) => (p.tecnicas || []).includes('drop-set'));
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
