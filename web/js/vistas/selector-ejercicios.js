// Buscador de ejercicios con filtros y tres formas de verlos.
//
// Se usa en la lista de «Ejercicios», al montar una rutina, al añadir un
// ejercicio al entrenamiento y al crear uno desde la lista general. Sirve
// igual para tus ejercicios que para los del catálogo: los dos tienen nombre,
// grupo y músculos.

import { CATALOGO, TIPOS_EJERCICIO, esMaquinaDePlacas, normalizar, tipoDeEjercicio } from '../catalogo.js';
import * as estado from '../estado.js';
import { planPorDefecto } from '../series.js';
import { imagenDe } from '../imagenes.js';
import { MUSCULOS, ORDEN_MUSCULOS, TREN_INFERIOR, TREN_SUPERIOR, nombreMusculo } from '../musculos.js';
import { anadir, h, modal, nuevoId, selector } from '../ui.js';

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

// Por defecto, solo imagen: se reconoce antes el dibujo que el nombre.
function leerModo() {
  try { return localStorage.getItem('entreno-modo-vista') || 'mosaico'; } catch { return 'mosaico'; }
}

function guardarModo(nuevo) {
  modo = nuevo;
  try { localStorage.setItem('entreno-modo-vista', nuevo); } catch { /* sin almacenamiento, da igual */ }
}

// Si dejaste los filtros abiertos, siguen abiertos al volver a pintar.
let filtrosAbiertos = false;

export function filtrar(items) {
  const texto = normalizar(filtro.texto);
  return items.filter((x) => {
    const principales = x.musculos?.principales ?? [];
    const todos = [...principales, ...(x.musculos?.secundarios ?? [])];
    // Solo por el nombre: si buscara también el material, escribir «peso
    // muerto» sacaría antes todo lo de «peso corporal». Para el material y
    // el grupo están los desplegables de al lado.
    if (texto && !normalizar(x.nombre).includes(texto)) return false;
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

// Buscador y, plegados debajo, los filtros y la forma de ver la lista.
// alCambiar() vuelve a pintar.
export function barraFiltros(alCambiar, { placeholder = 'Buscar ejercicio' } = {}) {
  // Los filtros se repintan solos al elegir, para que se vea lo marcado; el
  // buscador no, para no perder el teclado.
  const plegable = h('details', { class: 'filtros-plegables', open: filtrosAbiertos,
    ontoggle: (e) => { filtrosAbiertos = e.target.open; } });
  const cambio = () => { pintarFiltros(); alCambiar(); };
  const desplegable = (clave, opciones, etiqueta) => selector(Object.entries(opciones), filtro[clave],
    (v) => { filtro[clave] = v; cambio(); }, { titulo: etiqueta, lista: true });

  function pintarFiltros() {
    const activos = ['musculo', 'division', 'tipo'].filter((k) => filtro[k]).length;
    plegable.replaceChildren(); anadir(plegable,
      h('summary', {}, activos ? `Filtros (${activos})` : 'Filtros'),
      h('div', { class: 'fila-filtros' },
        desplegable('musculo', { '': 'Cualquier músculo',
          ...Object.fromEntries(ORDEN_MUSCULOS.map((m) => [m, MUSCULOS[m].nombre])) }, 'Músculo'),
        desplegable('division', DIVISIONES, 'Parte del cuerpo'),
        desplegable('tipo', { '': 'Cualquier tipo', ...TIPOS_EJERCICIO }, 'Tipo')),
      activos > 0 && h('button', { type: 'button', class: 'boton enlace', onclick: () => {
        filtro.musculo = ''; filtro.division = ''; filtro.tipo = ''; cambio();
      } }, 'Quitar filtros'),
      h('div', { class: 'modos-vista', role: 'radiogroup', 'aria-label': 'Cómo ver la lista' },
        Object.entries(MODOS_VISTA).map(([clave, texto]) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(clave === modo),
          class: `chip seleccionable ${clave === modo ? 'activo' : ''}`,
          onclick: () => { guardarModo(clave); cambio(); },
        }, texto))));
  }
  pintarFiltros();

  return h('div', { class: 'filtros-ejercicios' },
    h('input', { type: 'search', class: 'buscador', placeholder, value: filtro.texto,
      oninput: (e) => { filtro.texto = e.target.value; alCambiar(); } }),
    plegable);
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
    fraccionCorporal: x.carga === 'pesoCorporal' ? (x.fraccion ?? 1) : null,
    estiramiento: x.asistencia ? { tecnica: null, asistencia: x.asistencia } : undefined,
    musculos: {
      principales: [...(x.musculos?.principales ?? [])],
      secundarios: [...(x.musculos?.secundarios ?? [])],
    },
    series: [], notas: '',
  };
  // La regla sale de tu objetivo del cuestionario: fuerza, Bilbo; si no, el
  // rango de hipertrofia. Las rutinas prehechas la cambian por la suya.
  nuevo.series = [planPorDefecto(estado.datos() ?? { perfil: {} }, nuevo)];
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
