// Buscador de ejercicios con filtros y tres formas de verlos.
//
// Se usa en la lista de «Ejercicios», al montar una rutina, al añadir un
// ejercicio al entrenamiento y al crear uno desde la lista general. Sirve
// igual para tus ejercicios que para los del catálogo: los dos tienen nombre,
// grupo y músculos.

import { CATALOGO, TIPOS_EJERCICIO, esMaquinaDePlacas, normalizar, tipoDeEjercicio } from '../catalogo.js';
import * as estado from '../estado.js';
import { planesPorDefecto } from '../series.js';
import { imagenDeEjercicio } from '../imagenes.js';
import { MUSCULOS, ORDEN_MUSCULOS, TREN_INFERIOR, TREN_SUPERIOR, musculoRecortado, nombreMusculo } from '../musculos.js';
import { materialDe } from '../calculos.js';
import { icono } from '../iconos.js';
import { anadir, cerrarCarteles, h, modal, nuevoId } from '../ui.js';

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
const filtro = { texto: '', musculo: '', equipo: '', division: '', tipo: '', orden: 'alfabetico' };

// Cómo se ordena la lista: por defecto, alfabético; o agrupada.
export const ORDENES = { alfabetico: 'Alfabético', grupo: 'Por grupo (empuje, tirón…)', musculo: 'Por músculo principal' };
export const ordenActual = () => filtro.orden;
let modo = leerModo();

// Por defecto, solo imagen: se reconoce antes el dibujo que el nombre.
function leerModo() {
  try { return localStorage.getItem('entreno-modo-vista') || 'mosaico'; } catch { return 'mosaico'; }
}

function guardarModo(nuevo) {
  modo = nuevo;
  try { localStorage.setItem('entreno-modo-vista', nuevo); } catch { /* sin almacenamiento, da igual */ }
}


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
    if (filtro.equipo && equipoDe(x) !== filtro.equipo) return false;
    if (filtro.division === 'superior' && !principales.some((m) => TREN_SUPERIOR.includes(m))) return false;
    if (filtro.division === 'inferior' && !principales.some((m) => TREN_INFERIOR.includes(m))) return false;
    if (['empuje', 'tirón', 'pierna', 'core'].includes(filtro.division) && x.grupo !== filtro.division) return false;
    return true;
  });
}

export function hayFiltro() {
  return Boolean(filtro.texto || filtro.musculo || filtro.equipo || filtro.division || filtro.tipo);
}

// Material de cada ejercicio, juntado en «equipos» para el filtro visual (como
// Lyfta: barra, mancuerna, polea…). Sale del catálogo si el ejercicio no lo guarda.
// 29-10, Dan: balón, rueda y cajón por separado; nadar o andar por el monte no son equipo (van con «sin material»).
export const EQUIPOS = {
  barra: 'Barra', mancuernas: 'Mancuernas', kettlebell: 'Kettlebell', discos: 'Disco suelto (sin barra)', polea: 'Polea',
  maquina: 'Máquina', fija: 'Barra fija y paralelas', gomas: 'Gomas', balon: 'Balón medicinal', rueda: 'Rueda abdominal',
  cajon: 'Cajón', comba: 'Comba', cuerdas: 'Cuerdas', saco: 'Saco de boxeo', bici: 'Bici', esterilla: 'Esterilla',
  corporal: 'Sin material (tu peso)', otro: 'Otros',
};
const MATERIAL_A_EQUIPO = {
  barra: 'barra', landmine: 'barra', mancuernas: 'mancuernas', mancuerna: 'mancuernas', kettlebell: 'kettlebell',
  disco: 'discos', 'disco o goma': 'discos', polea: 'polea', 'máquina': 'maquina', multipower: 'maquina', trineo: 'maquina',
  'peso corporal': 'corporal', suelo: 'corporal', pared: 'corporal', banco: 'corporal', mano: 'corporal', libre: 'corporal',
  'barra fija': 'fija', paralelas: 'fija', 'barra baja': 'fija', 'arnés': 'fija', 'mano o goma': 'gomas', goma: 'gomas',
  'balón medicinal': 'balon', rueda: 'rueda', 'cajón': 'cajon', comba: 'comba', cuerdas: 'cuerdas',
  'saco o sombra': 'saco', esterilla: 'esterilla', bici: 'bici', 'bici de sala': 'bici', piscina: 'corporal',
  patines: 'otro', 'montaña': 'corporal',
};
export function equipoDe(x) {
  const material = materialDe(x);
  if (material) return MATERIAL_A_EQUIPO[material] ?? 'otro';
  if (x?.grupo === 'yoga') return 'esterilla';
  return x?.carga?.tipo === 'pesoCorporal' || x?.carga === 'pesoCorporal' ? 'corporal' : 'otro';
}

// Buscador y forma de ver la lista arriba; los filtros (músculo, equipo,
// función y orden) en botones que abren una hoja con dibujos. En la pestaña
// Ejercicios van en la tira de abajo (`tira: true`, lo pidió Dan el
// 27-10-2026); dentro de una ventana, en una fila bajo el buscador.
// alCambiar() vuelve a pintar la lista.
export function barraFiltros(alCambiar, { placeholder = 'Buscar ejercicio', tira = false, junto = null } = {}) {
  const botones = h('div', { class: tira ? 'tira-inferior tira-filtros' : 'fila-filtros-visual' });
  const vistas = h('div', { class: 'modos-vista', role: 'radiogroup', 'aria-label': 'Cómo ver la lista' });
  const quitar = h('div');
  const cambio = () => { pintarFiltros(); alCambiar(); };
  if (tira) document.body.classList.add('hay-tira');

  const elegir = (titulo, construir) => {
    const cerrar = modal(titulo, h('div', { class: 'hoja-filtro' }, construir((clave, valor) => {
      filtro[clave] = valor; cerrar(); cambio();
    })));
  };
  const opcionVisual = (activo, dibujo, texto, alPulsar) => h('button', { type: 'button',
    class: `opcion-visual${activo ? ' activo' : ''}`, 'aria-pressed': String(activo), onclick: alPulsar }, dibujo, h('span', {}, texto));
  const chips = (clave, opciones) => h('div', { class: 'rejilla-chips' }, opciones.map(([k, texto]) => h('button', { type: 'button',
    class: `chip seleccionable${filtro[clave] === k ? ' activo' : ''}`, 'aria-pressed': String(filtro[clave] === k),
    onclick: () => { filtro[clave] = k; cerrarCarteles(document.querySelector('.hoja-filtro')); cambio(); } }, texto)));

  const abrirMusculos = () => elegir('Músculo', (poner) => h('div', { class: 'rejilla-visual' },
    opcionVisual(!filtro.musculo, musculoRecortado(Object.keys(MUSCULOS).filter((m) => MUSCULOS[m].vistas.includes('delante')), { vista: 'delante', encuadre: 'entero' }),
      'Todos', () => poner('musculo', '')),
    ORDEN_MUSCULOS.map((m) => opcionVisual(filtro.musculo === m, musculoRecortado([m], { encuadre: 'cerca' }), nombreMusculo(m, { corto: true }),
      () => poner('musculo', m)))));
  // Solo los equipos que tiene algún ejercicio (tuyo o del catálogo).
  const hayEquipo = new Set([...CATALOGO, ...estado.datos().ejercicios].map(equipoDe));
  const abrirEquipos = () => elegir('Equipo', (poner) => h('div', { class: 'rejilla-visual' },
    opcionVisual(!filtro.equipo, h('span', { class: 'iconos-todos' }, ['barra', 'mancuernas', 'maquina'].map((k) => icono(k, { clase: 'icono' }))),
      'Todos', () => poner('equipo', '')),
    Object.entries(EQUIPOS).filter(([k]) => hayEquipo.has(k)).map(([k, texto]) => opcionVisual(filtro.equipo === k, icono(k, { clase: 'icono icono-grande' }), texto,
      () => poner('equipo', k)))));
  const abrirFuncion = () => elegir('Función', () => h('div', {},
    h('h3', {}, 'Qué movimiento'),
    chips('division', Object.entries(DIVISIONES)),
    h('h3', {}, 'Qué tipo'),
    chips('tipo', [['', 'Cualquier tipo'], ...Object.entries(TIPOS_EJERCICIO)])));
  const abrirOrden = () => elegir('Orden', () => chips('orden', Object.entries(ORDENES)));

  function pintarFiltros() {
    const funcion = [filtro.division && DIVISIONES[filtro.division], filtro.tipo && TIPOS_EJERCICIO[filtro.tipo]].filter(Boolean).join(' · ');
    const boton = (texto, icon, activo, alPulsar) => h('button', { type: 'button', class: `tira-boton${activo ? ' activo' : ''}`,
      'aria-pressed': String(activo), onclick: alPulsar }, icono(icon), h('span', { class: 'tira-texto' }, texto));
    botones.replaceChildren(
      boton(filtro.musculo ? nombreMusculo(filtro.musculo, { corto: true }) : 'Músculo', 'musculo', Boolean(filtro.musculo), abrirMusculos),
      boton(EQUIPOS[filtro.equipo] ?? 'Equipo', 'mancuernas', Boolean(EQUIPOS[filtro.equipo]), abrirEquipos),
      boton(funcion || 'Función', 'funcion', Boolean(funcion), abrirFuncion),
      boton(filtro.orden === 'alfabetico' ? 'Orden' : ORDENES[filtro.orden].split(' (')[0], 'orden', filtro.orden !== 'alfabetico', abrirOrden));
    vistas.replaceChildren(...Object.entries(MODOS_VISTA).map(([clave, texto]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(clave === modo),
      class: `chip seleccionable ${clave === modo ? 'activo' : ''}`,
      onclick: () => { guardarModo(clave); cambio(); },
    }, texto)));
    const hay = ['musculo', 'equipo', 'division', 'tipo'].some((k) => filtro[k]);
    quitar.replaceChildren(...(hay ? [h('button', { type: 'button', class: 'boton secundario quitar-filtros', onclick: () => {
      Object.assign(filtro, { musculo: '', equipo: '', division: '', tipo: '' }); cambio();
    } }, 'Quitar filtros')] : []));
  }
  pintarFiltros();

  return h('div', { class: 'filtros-ejercicios' },
    h('div', { class: 'fila-buscador' },
      h('input', { type: 'search', class: 'buscador', placeholder, value: filtro.texto,
        oninput: (e) => { filtro.texto = e.target.value; alCambiar(); } }), junto),
    vistas,
    quitar,
    botones);
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
  const imagen = imagenDeEjercicio(x);
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
  nuevo.series = planesPorDefecto(estado.datos() ?? { perfil: {} }, nuevo);
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
