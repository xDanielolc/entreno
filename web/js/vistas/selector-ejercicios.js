// Buscador de ejercicios con filtros y tres formas de verlos.
//
// Se usa en la lista de «Ejercicios», al montar una rutina, al añadir un
// ejercicio al entrenamiento y al crear uno desde la lista general. Sirve
// igual para tus ejercicios que para los del catálogo: los dos tienen nombre,
// grupo y músculos.

import { CATALOGO, TIPOS_EJERCICIO, esMaquinaDePlacas, normalizar, tipoDeEjercicio } from '../catalogo.js';
import { progresionPorDefecto, serieNuevaPlantilla } from '../esquema.js';
import { imagenDe } from '../imagenes.js';
import { MUSCULOS, ORDEN_MUSCULOS, TREN_INFERIOR, TREN_SUPERIOR, nombreMusculo } from '../musculos.js';
import { anadir, h, modal, nuevoId } from '../ui.js';

export const MODOS_VISTA = {
  lista: 'Solo nombre',
  imagen: 'Con imagen',
  mosaico: 'Solo imagen',
};

const DIVISIONES = {
  '': 'Todo el cuerpo',
  empuje: 'Empuje',
  'tirón': 'Tirón',
  pierna: 'Pierna',
  core: 'Core',
  superior: 'Tren superior',
  inferior: 'Tren inferior',
};

// El filtro se recuerda mientras la app esté abierta; la forma de ver la
// lista, también entre visitas (solo en este móvil).
const filtro = { texto: '', musculo: '', division: '', tipo: '' };
let modo = leerModo();

function leerModo() {
  try { return localStorage.getItem('entreno-modo-lista') || 'imagen'; } catch { return 'imagen'; }
}

function guardarModo(nuevo) {
  modo = nuevo;
  try { localStorage.setItem('entreno-modo-lista', nuevo); } catch { /* sin almacenamiento, da igual */ }
}

export function filtrar(items) {
  const texto = normalizar(filtro.texto);
  return items.filter((x) => {
    const principales = x.musculos?.principales ?? [];
    const todos = [...principales, ...(x.musculos?.secundarios ?? [])];
    if (texto && !normalizar(`${x.nombre} ${x.grupo || ''} ${x.material || ''} ${x.familia || ''}`).includes(texto)) return false;
    if (filtro.musculo && !todos.includes(filtro.musculo)) return false;
    if (filtro.tipo && tipoDeEjercicio(x) !== filtro.tipo) return false;
    if (filtro.division === 'superior' && !principales.some((m) => TREN_SUPERIOR.includes(m))) return false;
    if (filtro.division === 'inferior' && !principales.some((m) => TREN_INFERIOR.includes(m))) return false;
    if (['empuje', 'tirón', 'pierna', 'core'].includes(filtro.division) && x.grupo !== filtro.division) return false;
    return true;
  });
}

export function hayFiltro() {
  return Boolean(filtro.texto || filtro.musculo || filtro.division || filtro.tipo);
}

// Buscador, desplegables y botones de vista. alCambiar() vuelve a pintar.
export function barraFiltros(alCambiar, { placeholder = 'Buscar ejercicio' } = {}) {
  const desplegable = (clave, opciones, etiqueta) => h('select', {
    'aria-label': etiqueta, class: filtro[clave] ? 'activo' : '',
    onchange: (e) => { filtro[clave] = e.target.value; e.target.className = filtro[clave] ? 'activo' : ''; alCambiar(); },
  }, Object.entries(opciones).map(([v, t]) => h('option', { value: v, selected: v === filtro[clave] }, t)));

  const botonesModo = h('div', { class: 'modos-vista', role: 'radiogroup', 'aria-label': 'Cómo ver la lista' });
  const pintarModos = () => botonesModo.replaceChildren(...Object.entries(MODOS_VISTA).map(([clave, texto]) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': String(clave === modo),
    class: `chip seleccionable ${clave === modo ? 'activo' : ''}`,
    onclick: () => { guardarModo(clave); pintarModos(); alCambiar(); },
  }, texto)));
  pintarModos();

  return h('div', { class: 'filtros-ejercicios' },
    h('input', { type: 'search', class: 'buscador', placeholder, value: filtro.texto,
      oninput: (e) => { filtro.texto = e.target.value; alCambiar(); } }),
    h('div', { class: 'fila-filtros' },
      desplegable('musculo', { '': 'Cualquier músculo',
        ...Object.fromEntries(ORDEN_MUSCULOS.map((m) => [m, MUSCULOS[m].nombre])) }, 'Músculo'),
      desplegable('division', DIVISIONES, 'Parte del cuerpo'),
      desplegable('tipo', { '': 'Cualquier tipo', ...TIPOS_EJERCICIO }, 'Tipo')),
    botonesModo);
}

// Contenedor de la lista, con la clase que toca según el modo.
export function cajaLista() {
  return h('div', { class: `lista-eleccion modo-${modo}` });
}

export function modoActual() {
  return modo;
}

// Una tarjeta de ejercicio. `pie` es texto o nodo bajo el nombre; `extra`, lo
// que va a la derecha (una etiqueta, por ejemplo).
export function tarjetaItem(x, { href, onclick, pie, extra, clase = '' } = {}) {
  const imagen = imagenDe(x.nombre);
  const etiqueta = href ? 'a' : 'button';
  const props = { class: `tarjeta fila-enlace item-ejercicio ${clase}`, href, onclick };
  if (!href) props.type = 'button';

  if (modo === 'mosaico') {
    return h(etiqueta, { ...props, class: `${props.class} mosaico`, title: x.nombre },
      imagen
        ? h('img', { src: imagen.archivo, alt: '', loading: 'lazy' })
        : h('span', { class: 'sin-imagen', 'aria-hidden': 'true' }, iniciales(x.nombre)),
      h('span', { class: 'nombre-mosaico' }, x.nombre),
      extra);
  }
  return h(etiqueta, props,
    modo === 'imagen' && (imagen
      ? h('img', { class: 'miniatura', src: imagen.archivo, alt: '', loading: 'lazy' })
      : h('span', { class: 'miniatura sin-imagen', 'aria-hidden': 'true' }, iniciales(x.nombre))),
    h('div', { class: 'crece' },
      h('strong', {}, x.nombre),
      pie && h('div', { class: 'suave' }, pie)),
    extra);
}

function iniciales(nombre) {
  return nombre.split(/\s+/).filter((p) => p.length > 2).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// Resumen legible de un ejercicio del catálogo: grupo, material y músculos.
export function pieCatalogo(x) {
  const musculos = (x.musculos?.principales ?? []).map((m) => nombreMusculo(m, { corto: true }));
  return [x.familia ? `yoga ${x.familia}` : x.grupo, x.material, musculos.join(', ')].filter(Boolean).join(' · ');
}

// Ejercicio nuevo, tuyo, a partir de uno del catálogo.
export function ejercicioDesdeCatalogo(x) {
  const nuevo = {
    id: nuevoId('ej'), nombre: x.nombre, sedeId: null, grupo: x.grupo, archivado: false,
    carga: { tipo: x.carga || 'peso' },
    esfuerzo: { tipo: x.esfuerzo || 'repeticiones' },
    esfuerzoExtra: x.distancia ? { tipo: 'distancia', opcional: true } : null,
    formula1RM: 'personal',
    maquinaPlacas: esMaquinaDePlacas(x),
    musculos: {
      principales: [...(x.musculos?.principales ?? [])],
      secundarios: [...(x.musculos?.secundarios ?? [])],
    },
    series: [], notas: '',
  };
  nuevo.series = [serieNuevaPlantilla(nuevo, { tipo: 'libre', progresion: 'libre' })];
  nuevo.series[0].progresion = progresionPorDefecto('libre', nuevo);
  return nuevo;
}

// Ventana para elegir un ejercicio: primero los tuyos y después, si se pide,
// los del catálogo que aún no tienes.
export function elegirEjercicio({
  titulo = 'Elegir ejercicio', mios = [], conCatalogo = true, marcarMio, alElegirMio, alElegirCatalogo, pie,
  etiquetaCatalogo = '+ Añadir',
}) {
  const nombresMios = new Set(mios.map((e) => normalizar(e.nombre)));
  const deLista = conCatalogo ? CATALOGO.filter((x) => !nombresMios.has(normalizar(x.nombre))) : [];
  const zona = h('div');

  const pintar = () => {
    const propios = filtrar(mios);
    const generales = filtrar(deLista);
    const caja = cajaLista();
    caja.append(...propios.map((e) => tarjetaItem(e, {
      pie: e.grupo || '',
      extra: marcarMio?.(e) && h('span', { class: 'etiqueta' }, marcarMio(e)),
      onclick: () => { cerrar(); alElegirMio(e); },
    })));
    const cajaGeneral = cajaLista();
    cajaGeneral.append(...generales.map((x) => tarjetaItem(x, {
      pie: pieCatalogo(x),
      extra: etiquetaCatalogo && h('span', { class: 'etiqueta' }, etiquetaCatalogo),
      onclick: () => { cerrar(); alElegirCatalogo(x); },
    })));
    zona.replaceChildren();
    anadir(zona,
      propios.length > 0 && caja,
      mios.length > 0 && generales.length > 0 && h('p', { class: 'nota' }, 'De la lista general (aún no son tuyos)'),
      generales.length > 0 && cajaGeneral,
      !propios.length && !generales.length && h('p', { class: 'suave' }, 'Ningún ejercicio coincide con los filtros.'));
  };

  const cerrar = modal(titulo, h('div', {},
    barraFiltros(pintar, { placeholder: conCatalogo && mios.length ? 'Buscar entre los tuyos y la lista general' : 'Buscar' }),
    zona,
    pie));
  pintar();
  return cerrar;
}
