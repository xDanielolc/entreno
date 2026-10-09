import {
  aPesoDisponible, cicloActual, formatearNumero, generarEscalera, lecturaDesdeCarga, pesosDeMaquina, registrosDelCiclo,
  modeloDeEjercicio, rmDeReferencia, seriesDelPrograma,
} from '../calculos.js';
import * as estado from '../estado.js';
import {
  ASISTENCIAS, DIAS_CICLO_POR_DEFECTO, medidasDe, TECNICAS_ESTIRAMIENTO, TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_PROGRESION, TIPOS_SERIE,
  UNIDADES, unidadMedida,
  progresionPorDefecto, serieNuevaPlantilla, sobrePorDefecto, tramosDe,
} from '../esquema.js';
import { inicialDelPrograma, tramosPorDefecto } from '../calculos.js';
import { EXPLICACIONES_1RM, FORMULAS, calibrar, estimar1RM, modeloDe, pesoParaReps, textoCalibracion } from '../formula1rm.js';
import { FRACCION_CORPORAL_POR_NOMBRE, PROGRAMAS, fraccionSinDato } from '../esquema.js';
import { MODOS_INICIO, MODOS_REINICIO, PRESETS_CICLO, inicioDe, alargarCiclo, aplicarPreset, completarCiclo, describirCiclo, empezarCicloNuevo, escaleraDe } from '../ciclos.js';
import { abrirAlLlegar, ayuda, hoyISO, confirmarEscribiendo, idApartado } from '../ui.js';
import { CATALOGO, esMaquinaDePlacas, normalizar, tipoDeEjercicio } from '../catalogo.js';
import { ORDEN_MUSCULOS, nombreMusculo } from '../musculos.js';
import { entradaDeEjercicio, planesPorDefecto } from '../series.js';
import { nombreSede, sedesActivas, separarPorSede } from '../sedes.js';
import { seccionProgreso } from './graficas.js';
import { imagenDe } from '../imagenes.js';
import { anadir, aviso, confirmar, h, leerNumero, modal, nuevoId, plegable, selector } from '../ui.js';
import { pista } from './tutorial.js';
import { explicar } from './glosario.js';
import { barraFiltros, cajaLista, ejercicioDesdeCatalogo, elegirEjercicio, filtrar, hayFiltro, ordenActual, pieCatalogo, tarjetaItem } from './selector-ejercicios.js';
import { selectorTecnicas } from './tecnicas.js';
import { TECNICAS } from '../esquema.js';

// Grupos habituales, para el desplegable de la ficha.
const GRUPOS = ['empuje', 'tirón', 'pierna', 'core', 'cardio', 'estiramiento', 'movilidad', 'yoga'];

// ---------------------------------------------------------------------------
// Lista, con buscador
// ---------------------------------------------------------------------------

let verArchivados = false;

export function vistaEjercicios(contenedor) {
  const d = estado.datos();
  const hayArchivados = d.ejercicios.some((e) => e.archivado && !e.borrado);
  const zona = h('div', { id: 'lista-ejercicios' });

  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Ejercicios'),
      h('a', { class: 'boton', href: '#/ejercicio/nuevo' }, '+ Nuevo')),

    pista('ejercicios-lista', 'Toca un ejercicio para cambiar sus series y músculos. «+ Nuevo» para añadir de la lista o crear uno.'),
    d.ejercicios.length > 0 && barraFiltros(() => pintarLista()),

    zona,

    hayArchivados && h('button', { class: 'boton enlace', onclick: () => { verArchivados = !verArchivados; estado.emitir('vista'); } },
      verArchivados ? 'Ocultar archivados' : 'Ver archivados'));

  function pintarLista() {
    const lista = filtrar(d.ejercicios.filter((e) => !e.borrado && (verArchivados || !e.archivado)));
    // Por defecto, en orden alfabético y sin grupos; en Filtros se elige
    // agrupar por grupo o por músculo.
    const grupos = agruparPorGrupo(lista, ordenActual());

    // Si estás buscando, también salen los de la lista general que aún no
    // tienes: así «peso muerto con mancuernas» o la pliometría aparecen
    // aunque no los hayas añadido nunca.
    const mios = new Set(d.ejercicios.filter((e) => !e.borrado).map((e) => normalizar(e.nombre)));
    const deLista = hayFiltro() ? filtrar(CATALOGO.filter((x) => !mios.has(normalizar(x.nombre)))) : [];

    zona.replaceChildren();
    if (!lista.length && !deLista.length) {
      anadir(zona, h('p', { class: 'suave' }, d.ejercicios.length
        ? 'Ningún ejercicio coincide con los filtros, ni tuyo ni de la lista general.'
        : 'Crea tu primer ejercicio: eliges qué mide y cómo progresa cada una de sus series.'));
      return;
    }
    anadir(zona,
      [...grupos].map(([grupo, ejercicios]) => h('section', {},
        grupo && h('h2', {}, grupo.charAt(0).toUpperCase() + grupo.slice(1)),
        anadir(cajaLista(), ejercicios.map((e) => tarjetaEjercicio(d, e))))),
      // Los de la lista general, también por grupos y plegados: así no sale
      // un montón sin orden debajo de los tuyos.
      deLista.length > 0 && h('section', {},
        h('h2', {}, 'De la lista general'),
        h('p', { class: 'nota' }, 'Aún no son tuyos. Toca uno y se añade con sus músculos puestos.'),
        ordenActual() === 'alfabetico'
          ? anadir(cajaLista(), [...deLista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((x) => tarjetaCatalogo(x)))
          : [...agruparPorGrupo(deLista, ordenActual())].map(([grupo, xs]) => plegable(`catalogo-${grupo}`,
            `${grupo.charAt(0).toUpperCase() + grupo.slice(1)} (${xs.length})`, { class: 'explicacion grupo-catalogo' },
            anadir(cajaLista(), xs.map((x) => tarjetaCatalogo(x)))))));
  }
  pintarLista();
}

// Agrupa según el orden elegido: nada (un solo grupo sin título, en orden
// alfabético), por grupo o por músculo principal.
function agruparPorGrupo(lista, orden = 'grupo') {
  const clave = orden === 'musculo' ? (x) => nombreMusculo(x.musculos?.principales?.[0] ?? '') || 'otros'
    : orden === 'grupo' ? (x) => (x.grupo || 'otros').trim().toLowerCase() : () => '';
  const grupos = new Map();
  for (const x of [...lista].sort((a, b) => clave(a).localeCompare(clave(b), 'es') || a.nombre.localeCompare(b.nombre, 'es'))) {
    const g = clave(x).toLowerCase();
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(x);
  }
  return grupos;
}

// Un ejercicio de la lista general, para añadirlo desde el buscador.
function tarjetaCatalogo(x) {
  return tarjetaItem(x, {
    pie: pieCatalogo(x),
    extra: h('span', { class: 'etiqueta' }, '+ Añadir'),
    onclick: () => {
      const nuevo = ejercicioDesdeCatalogo(x);
      estado.cambiar((datos) => { datos.ejercicios.push(nuevo); });
      aviso(`${x.nombre} añadido a tus ejercicios.`,
        { accion: { texto: 'Abrir', fn: () => { location.hash = `#/ejercicio/${nuevo.id}`; } } });
    },
  });
}

function tarjetaEjercicio(datos, ej) {
  // Varias series iguales («3 series libres: doble progresión») se agrupan.
  const cuenta = new Map();
  for (const plan of ej.series || []) {
    const prog = TIPOS_PROGRESION[plan.progresion?.tipo]?.etiqueta ?? 'Libre';
    const ciclo = plan.progresion?.tipo === 'bilbo' ? cicloActual(plan) : null;
    let texto = `${TIPOS_SERIE[plan.tipo]}: ${prog.toLowerCase()}`;
    if (ciclo?.escalera?.length) {
      const hechos = registrosDelCiclo(datos, ej, plan, ciclo.n).length;
      texto = `${TIPOS_SERIE[plan.tipo]}: ciclo ${ciclo.n}, día ${Math.min(hechos + 1, ciclo.escalera.length)} de ${ciclo.escalera.length}`;
    }
    cuenta.set(texto, (cuenta.get(texto) ?? 0) + 1);
  }
  const partes = [...cuenta].map(([texto, n]) => (n > 1 ? `${n} × ${texto}` : texto));
  const sinMusculos = !ej.musculos?.principales?.length;
  return tarjetaItem(ej, {
    href: `#/ejercicio/${ej.id}`,
    clase: ej.archivado ? 'archivado' : '',
    pie: [ej.sedeId && nombreSede(datos, ej.sedeId), partes.join(' · ') || 'Sin series configuradas'].filter(Boolean).join(' · '),
    extra: ej.archivado ? h('span', { class: 'etiqueta' }, 'Archivado')
      : sinMusculos && h('span', { class: 'etiqueta aviso-etiqueta' }, 'Sin músculos'),
  });
}

// ---------------------------------------------------------------------------
// Ficha: crear o editar
// ---------------------------------------------------------------------------

function ejercicioVacio() {
  const base = {
    id: nuevoId('ej'),
    nombre: '',
    sedeId: null,
    grupo: '',
    archivado: false,
    carga: { tipo: 'peso' },
    esfuerzo: { tipo: 'repeticiones' },
    esfuerzoExtra: null,
    formula1RM: 'personal',
    musculos: { principales: [], secundarios: [] },
    series: [],
    notas: '',
  };
  // Un ejercicio nuevo arranca con la regla que recomendamos: la doble
  // progresion. Sube repeticiones y, al llegar arriba, sube el peso; no
  // necesita ni 1RM ni ciclo montado. Se cambia en un toque.
  base.series = planesPorDefecto(estado.datos(), base);
  return base;
}

const VISTAS_FICHA = { progreso: 'Progreso', todo: 'Ficha completa', paso: 'Paso a paso' };
const vistaFicha = new Map();    // id del ejercicio → vista elegida
let musculosAbiertos = false;   // «Músculos» de la ficha abierto al repintar
const pasoFicha = new Map();     // id del ejercicio → paso en el que ibas
const abiertosFicha = new Map(); // id del ejercicio → bloques abiertos
const modoRM = new Map();        // id del ejercicio → cómo quieres sacar tu 1RM
const igualesFicha = new Map();  // id del ejercicio → ¿todas sus series iguales?
// Un ejercicio nuevo que dejaste a medias: al volver a «+ Nuevo» sigues con él.
let borradorNuevo = null;

// Abre la ficha en «Paso a paso», directamente en la pregunta de cómo progresa.
export function abrirFichaEnProgresion(id) {
  vistaFicha.set(id, 'paso');
  pasoFicha.set(id, 'progresion');
  location.hash = `#/ejercicio/${id}`;
}

export function vistaFormularioEjercicio(contenedor, { id, paraSesion = null }) {
  const d = estado.datos();
  const existente = id !== 'nuevo' ? d.ejercicios.find((e) => e.id === id) : null;
  if (id !== 'nuevo' && !existente) {
    anadir(contenedor, h('p', {}, 'Este ejercicio no existe.'));
    return;
  }
  // Se edita un borrador que se guarda solo a cada cambio, en cuanto tiene
  // nombre: salir de la pantalla no pierde nada.
  const retomado = !existente && !paraSesion && Boolean(borradorNuevo);
  const borrador = existente ? structuredClone(existente) : paraSesion ? ejercicioVacio() : (borradorNuevo ??= ejercicioVacio());
  borrador.series ??= [];
  // Más de 50 series no tiene sentido y bloquea el móvil al pintarlas.
  if (borrador.series.length > 50) borrador.series.length = 50;
  borrador.musculos ??= { principales: [], secundarios: [] };
  const grupos = [...new Set([...GRUPOS, ...d.ejercicios.map((e) => e.grupo).filter(Boolean)])];
  const peso = d.perfil.pesoCorporalKg;
  let creado = Boolean(existente) || d.ejercicios.some((e) => e.id === borrador.id);

  function persistir() {
    if (!borrador.nombre.trim()) return false;
    estado.cambiar((datos) => {
      const copia = structuredClone(borrador);
      copia.nombre = copia.nombre.trim();
      const i = datos.ejercicios.findIndex((e) => e.id === borrador.id);
      if (i >= 0) datos.ejercicios[i] = copia;
      else datos.ejercicios.push(copia);
    }, { tecleo: true });
    creado = true;
    return true;
  }

  const zona = h('div');
  zona.addEventListener('input', () => persistir());
  const imagenFicha = existente ? imagenDe(existente.nombre) : null;
  // Tres formas de ver la ficha: el progreso, la ficha entera o paso a paso.
  // Se recuerda la elegida (y el paso) mientras la app esté abierta.
  const clave = existente?.id ?? 'nuevo';
  const conHistorial = existente && d.sesiones.some((s) => !s.borrada
    && s.ejercicios.some((x) => x.ejercicioId === existente.id && x.series.some((y) => y.hecha)));
  // Por defecto: con series, el progreso; sin ellas, paso a paso.
  const vista = () => vistaFicha.get(clave) ?? (conHistorial ? 'progreso' : 'paso');
  const vistas = Object.entries(VISTAS_FICHA).filter(([k]) => k !== 'progreso' || existente);
  const cabecera = h('div');
  function pintarCabecera() {
    cabecera.replaceChildren(...[
      h('div', { class: 'fila-marcas compacta vistas-ficha', role: 'group', 'aria-label': 'Cómo ver la ficha' },
        vistas.map(([k, texto]) => h('button', { type: 'button', class: `boton-marca${vista() === k ? ' activo' : ''}`,
          'aria-pressed': String(vista() === k), onclick: () => { vistaFicha.set(clave, k); pintarCabecera(); repintar(); } }, texto))),
      vista() === 'progreso' && (seccionProgreso(d, existente) ?? h('p', { class: 'suave' }, 'Aún no hay progreso que enseñar.')),
      vista() === 'progreso' && accionesEjercicio(),
    ].filter(Boolean));
  }

  // Archivar y borrar: en las tres vistas (en paso a paso, en el último paso).
  function accionesEjercicio() {
    if (!existente) return null;
    return h('div', { class: 'acciones-ejercicio' },
      h('button', { type: 'button', class: 'boton secundario', onclick: archivar },
        borrador.archivado ? 'Recuperar ejercicio' : 'Archivar ejercicio'),
      h('button', { type: 'button', class: 'boton peligro-contorno', onclick: borrarEjercicio }, 'Borrar ejercicio'));
  }
  pintarCabecera();
  anadir(contenedor,
    h('h1', {}, existente ? borrador.nombre || 'Editar ejercicio' : 'Nuevo ejercicio'),
    retomado && h('p', { class: 'nota' }, 'Sigues con el que dejaste a medias. ',
      h('button', { type: 'button', class: 'boton enlace', onclick: () => {
        borradorNuevo = null; pasoFicha.delete('nuevo'); abiertosFicha.delete('nuevo');
        dispatchEvent(new HashChangeEvent('hashchange'));
      } }, 'Empezar otro')),
    imagenFicha && h('figure', { class: 'imagen-ejercicio' },
      h('img', { src: imagenFicha.archivo, alt: `Ilustración de ${existente.nombre}`, loading: 'lazy' })),
    cabecera,
    zona);

  function repintar() {
    // Paso a paso con todas las series iguales: la primera manda en las demás.
    if (vista() === 'paso' && borrador.series.length > 1 && sonIguales()) copiarPrimeraSerie();
    persistir();
    const scroll = window.scrollY;
    zona.replaceChildren(vista() === 'progreso' ? h('div') : formulario());
    window.scrollTo(0, scroll);
  }

  // Lista de ejercicios habituales, para no escribirlo todo a mano.
  function elegirDelCatalogo() {
    elegirEjercicio({ titulo: 'Ejercicios habituales', mios: [], alElegirCatalogo: aplicar, etiquetaCatalogo: null });
  }

  function aplicar(x) {
    borrador.nombre = x.nombre;
    borrador.grupo = x.grupo;
    borrador.carga = { tipo: x.carga || 'peso' };
    borrador.esfuerzo = { tipo: x.esfuerzo || 'repeticiones' };
    borrador.esfuerzoExtra = x.distancia ? { tipo: 'distancia', opcional: true } : null;
    borrador.medidas = null;
    borrador.maquinaPlacas = esMaquinaDePlacas(x);
    borrador.musculos = { principales: [...(x.musculos?.principales ?? [])], secundarios: [...(x.musculos?.secundarios ?? [])] };
    for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
    repintar();
  }

  // Cómo se carga y qué se apunta: dos preguntas claras en vez de tres
  // (carga, casilla de placas y medida). Se traducen a carga.tipo,
  // maquinaPlacas y esfuerzo.tipo, que es lo que usa el resto de la app.
  const CARGAS = {
    libre: { etiqueta: 'Peso libre', descripcion: 'Barra, mancuernas, kettlebell. Apuntas los kilos.' },
    placas: { etiqueta: 'Máquina de placas o polea', descripcion: 'El peso va de placa en placa: la app solo te pedirá pesos que existan.' },
    pesoCorporal: { etiqueta: 'Mi peso corporal', descripcion: 'Flexiones, dominadas, fondos. Apuntas solo el lastre, si llevas.' },
    asistida: { etiqueta: 'Máquina asistida', descripcion: 'La máquina te quita peso. Apuntas los kilos de ayuda.' },
    altura: { etiqueta: 'Distancia/Altura', descripcion: 'La del cajón, la del ladrillo del yoga… Eliges la unidad.' },
    ninguna: { etiqueta: 'Sin peso', descripcion: 'Cardio, estiramientos, abdominales sin carga.' },
  };
  const cargaActual = () => (borrador.carga.tipo === 'peso' ? (borrador.maquinaPlacas ? 'placas' : 'libre') : borrador.carga.tipo);
  // Los tipos de peso, para cuando se apunta peso.
  const TIPOS_PESO = Object.fromEntries(['libre', 'placas', 'pesoCorporal', 'asistida'].map((k) => [k, CARGAS[k]]));
  const conPeso = () => ['peso', 'pesoCorporal', 'asistida'].includes(borrador.carga.tipo);
  // Lo que se puede apuntar en cada serie, en una sola lista.
  const APUNTABLES = [['peso', 'Peso'], ['altura', 'Distancia/Altura'], ['repeticiones', 'Repeticiones'], ['tiempo', 'Tiempo'], ['distancia', 'Distancia']];
  const apuntaDe = (clave) => (clave === 'peso' ? conPeso() : clave === 'altura' ? borrador.carga.tipo === 'altura' : medidasElegidas().includes(clave));
  function alternarApunte(clave, poner) {
    if (clave === 'peso' || clave === 'altura') {
      // El peso y la distancia/altura son lo que «pesa» la serie: uno u otro.
      borrador.carga = { tipo: poner ? clave : 'ninguna' };
      borrador.maquinaPlacas = false;
      if (clave === 'peso' && poner) cambiandoCarga = true;
      for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
      repintar();
      return;
    }
    const lista = medidasElegidas().filter((x) => x !== clave);
    if (poner) lista.push(clave);
    if (!lista.length) { aviso('Marca al menos repeticiones, tiempo o distancia.'); return; }
    fijarMedidas(lista);
  }
  // Se pueden marcar varias: la primera marcada es la principal (la que
  // llevan las reglas) y las demás se apuntan al lado en cada serie.
  const medidasElegidas = () => medidasDe(borrador);
  function fijarMedidas(lista) {
    const orden = ['repeticiones', 'tiempo', 'distancia'];
    const limpia = orden.filter((x) => lista.includes(x));
    if (!limpia.length) return;
    borrador.medidas = limpia;
    borrador.esfuerzo = { tipo: limpia[0] };
    borrador.esfuerzoExtra = limpia[1] ? { tipo: limpia[1], opcional: true } : null;
    for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
    repintar();
  }

  function formulario() {
    const estira = ['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(borrador));
    const hijos = [
      !existente && h('button', { type: 'button', class: 'boton secundario', onclick: elegirDelCatalogo },
        'Elegir de la lista de ejercicios'),
      campo('Nombre', h('input', { type: 'text', required: true, value: borrador.nombre, autocomplete: 'off',
        placeholder: 'Press banca', oninput: (e) => { borrador.nombre = e.target.value; } })),

      campoGrupo(),

      // Una sola lista con todo lo que se apunta en cada serie (el peso o la
      // distancia/altura, las repeticiones, el tiempo, la distancia), cada
      // cosa con su unidad. El ciclo, más abajo, solo pregunta cuáles suben.
      h('fieldset', {},
        h('legend', {}, '¿Qué apuntas en cada serie?'),
        h('p', { class: 'nota' }, 'Marca todo lo que apuntes. La primera de repeticiones, tiempo o distancia es la que manda en el ciclo.'),
        h('div', { class: 'fila-marcas' }, APUNTABLES.map(([clave, etiqueta]) => {
          const puesta = apuntaDe(clave);
          return h('button', { type: 'button', class: `boton-marca ${puesta ? 'activo' : ''}`, 'aria-pressed': String(puesta),
            onclick: () => alternarApunte(clave, !puesta) }, etiqueta);
        })),
        borrador.carga.tipo === 'altura' && campoUnidad('altura'),
        medidasElegidas().includes('distancia') && campoUnidad('distancia')),

      // Si apuntas peso: de qué tipo (libre, máquina, tu peso, asistida).
      conPeso() && h('fieldset', {},
        h('legend', {}, '¿Qué peso?'),
        // Elegido uno, los demás se pliegan para que no estorben al leer.
        opciones(cambiandoCarga ? TIPOS_PESO : { [cargaActual()]: TIPOS_PESO[cargaActual()] }, cargaActual(), (c) => {
          if (!cambiandoCarga) { cambiandoCarga = true; repintar(); return; }
          borrador.carga = { tipo: c === 'libre' || c === 'placas' ? 'peso' : c };
          borrador.maquinaPlacas = c === 'placas' || (c === 'asistida' && borrador.maquinaPlacas);
          for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
          cambiandoCarga = false;
          repintar();
        }),
        !cambiandoCarga && h('button', { type: 'button', class: 'boton enlace', onclick: () => { cambiandoCarga = true; repintar(); } }, 'Cambiar'),
        borrador.maquinaPlacas && seccionPesosMaquina(),
        borrador.carga.tipo === 'asistida' && h('p', { class: 'nota' },
          peso ? `Apuntarás los kilos que marca la máquina; la carga real es tu peso (${formatearNumero(peso)} kg) menos esa ayuda.`
            : 'Indica tu peso corporal en Ajustes para calcular la carga real.'),
        borrador.carga.tipo === 'pesoCorporal' && campoFraccionCorporal()),

      h('details', { class: 'tarjeta explicacion desplegable-musculos', open: musculosAbiertos || !borrador.musculos.principales.length || undefined,
        ontoggle: (e) => { musculosAbiertos = e.target.open; } },
        h('summary', {}, borrador.musculos.principales.length
          ? `Músculos: ${borrador.musculos.principales.map((m) => nombreMusculo(m, { corto: true })).join(', ')}`
            + (borrador.musculos.secundarios.length ? ` (y ${borrador.musculos.secundarios.map((m) => nombreMusculo(m, { corto: true })).join(', ')})` : '')
          : '⚠ Músculos: sin marcar'),
        !borrador.musculos.principales.length && h('p', { class: 'aviso-texto' },
          'Sin músculo principal, este ejercicio no aparecerá en el mapa de recuperación ni en el volumen semanal.'),
        h('p', { class: 'nota' }, 'Sirve para el mapa de recuperación y para los avisos de volumen. Los secundarios cuentan la mitad.'),
        sugerenciaDelCatalogo(),
        selectorMusculos('Principales', borrador.musculos.principales, borrador.musculos.secundarios),
        selectorMusculos('Secundarios', borrador.musculos.secundarios, borrador.musculos.principales),
        conAgarre() && campoAgarre()),

      estira && h('fieldset', {},
        h('legend', {}, '¿Cómo lo haces normalmente?'),
        h('p', { class: 'nota' }, 'Sale así en cada serie; en el entrenamiento puedes cambiarlo ese día. Qué es cada técnica: en Aprender.'),
        campo('Técnica', selector([['', 'Sin indicar'], ...Object.entries(TECNICAS_ESTIRAMIENTO).map(([k, v]) => [k, v.etiqueta])],
          borrador.estiramiento?.tecnica ?? '', (v) => { borrador.estiramiento = { ...borrador.estiramiento, tecnica: v || null }; repintar(); },
          { titulo: 'Técnica' })),
        borrador.estiramiento?.tecnica && h('small', { class: 'nota' }, TECNICAS_ESTIRAMIENTO[borrador.estiramiento.tecnica].descripcion),
        campo('Ayuda', selector([['', 'Sin indicar'], ...Object.entries(ASISTENCIAS).map(([k, v]) => [k, v])],
          borrador.estiramiento?.asistencia ?? '', (v) => { borrador.estiramiento = { ...borrador.estiramiento, asistencia: v || null }; repintar(); },
          { titulo: 'Ayuda' })),
        h('small', { class: 'nota' }, 'Con «Apoyo con la mano» apuntas en cada serie en qué punto de la escala estás (surf, pulgar, puño, mano abierta, '
          + 'tres, dos y un dedo, sin mano). Para la altura del ladrillo, elige «Altura» en el peso.')),

      h('fieldset', {},
        h('legend', {}, '¿Cómo te lleva la app? ', ayuda('Cómo te lleva la app', [
          'Cada vez que entrenes, la app te dice el peso y el objetivo de cada serie según esta regla. Tú solo apuntas lo que haces.',
          'Si el ejercicio lleva series distintas (una Bilbo y luego una con drop set, por ejemplo), añade otra serie con otra '
            + 'regla: cada una aparece al entrenar y sigue la suya.'])),
        borrador.series.map((plan, i) => tarjetaPlan(plan, i)),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => {
          borrador.series.push(serieNuevaPlantilla(borrador, { tipo: 'libre' }));
          repintar();
        } }, '+ Otra serie con otra regla')),

      h('details', { class: 'tarjeta explicacion' },
        h('summary', {}, 'Ajustes finos'),
        sedesActivas(d).length > 0 && campo('Dónde se hace', selector([['', 'Igual en todos los sitios'],
          ...sedesActivas(d).map((s) => [s.id, `Solo en ${nombreSede(d, s.id)}`])], borrador.sedeId ?? '',
        (v) => { borrador.sedeId = v || null; repintar(); }, { titulo: 'Dónde se hace' }),
        h('small', { class: 'nota' }, 'Si una máquina no pesa igual en dos gimnasios, cada uno debe llevar su propio ejercicio.'),
        existente && !existente.sedeId && sedesActivas(d).length > 1 && h('button', { type: 'button', class: 'boton enlace',
          onclick: separar }, 'Separar en un ejercicio por sitio (reparte su historial)')),
        existente && h('button', { type: 'button', class: 'boton enlace', onclick: partirEnVariante },
          'Partir en dos: este y una variante (máquina y mancuernas, por ejemplo)'),
        !['ninguna', 'altura'].includes(borrador.carga.tipo) && seccionFormula(),
        borrador.esfuerzo.tipo === 'repeticiones' && campo('Repeticiones en recámara por defecto en este ejercicio',
          numeroInput(borrador.recamaraPorDefecto, (v) => { borrador.recamaraPorDefecto = v; }),
          h('small', { class: 'nota' }, `Vacío = lo de Ajustes (${d.perfil.recamaraPorDefecto ?? 1}).`)),
        campo('Notas', h('textarea', { rows: 3, value: borrador.notas || '',
          oninput: (e) => { borrador.notas = e.target.value; } }))),

      h('p', { class: 'nota centrado' }, existente || creado
        ? 'Los cambios se guardan solos.'
        : 'En cuanto le pongas nombre, se guarda solo.'),
      h('div', { class: 'fila-botones' },
        !existente && h('button', { type: 'button', class: 'boton secundario', onclick: descartar }, 'Descartar'),
        h('button', { class: 'boton', type: 'submit' }, 'Listo')),

      accionesEjercicio()];
    const form = (...contenido) => h('form', { class: 'formulario', onsubmit: (e) => { e.preventDefault(); guardar(); } }, ...contenido);
    if (vista() !== 'paso') return form(...hijos);

    // Paso a paso: una pregunta cada vez, sin nada más a la vista.
    const [catalogo, nombre, grupo, apuntas, tipoPeso, musculos, estiramiento, , finos, nota, botones] = hijos;
    if (finos) finos.open = true;
    if (musculos) musculos.open = true;
    const maquina = tipoPeso?.querySelector?.('.pesos-maquina');
    maquina?.remove();
    const n = borrador.series.length;
    const iguales = sonIguales();
    const pasos = [
      ['¿Qué ejercicio es?', [catalogo, nombre, grupo]],
      ['¿Qué apuntas en cada serie?', [apuntas]],
      tipoPeso && ['¿Qué peso?', [tipoPeso]],
      maquina && ['Los pesos de la máquina', [maquina]],
      ['¿Qué músculos trabaja?', [musculos]],
      estira && ['¿Cómo lo haces?', [estiramiento]],
      ['¿Cuántas series quieres?', [pasoCuantasSeries()]],
      ...(iguales || n === 1
        ? [[n > 1 ? `¿Cómo progresan las ${n} series?` : '¿Cómo quieres progresar?', [tarjetaPlan(borrador.series[0], 0)]]]
        : borrador.series.map((plan, k) => [`Serie ${k + 1} de ${n}: ¿cómo progresa?`, [tarjetaPlan(plan, k)]])),
      finos && ['Ajustes finos (opcional)', [finos]],
    ].filter(Boolean);
    const guardado = pasoFicha.get(clave);
    const i = guardado === 'progresion' ? Math.max(0, pasos.findIndex(([t]) => /progres/.test(t)))
      : Math.min(guardado ?? 0, pasos.length - 1);
    const ir = (n) => {
      if (n > i && i === 0 && !borrador.nombre.trim()) { aviso('Ponle un nombre al ejercicio', { tipo: 'error' }); return; }
      pasoFicha.set(clave, n); repintar(); window.scrollTo(0, 0);
    };
    const ultimo = i === pasos.length - 1;
    return form(
      h('p', { class: 'paso-de suave' }, `Paso ${i + 1} de ${pasos.length}`),
      h('h2', {}, pasos[i][0]),
      ...pasos[i][1].map((x) => { x?.querySelector?.(':scope > legend')?.remove(); return x; }),
      ultimo && nota,
      h('div', { class: 'fila-botones' },
        i > 0 && h('button', { type: 'button', class: 'boton secundario', onclick: () => ir(i - 1) }, '‹ Atrás'),
        ultimo ? botones.querySelector('[type=submit]') : h('button', { type: 'button', class: 'boton', onclick: () => ir(i + 1) }, 'Siguiente ›')),
      ultimo && accionesEjercicio());
  }

  // Máquina con sus pesos: la app solo propone pesos que existen (drop sets,
  // subidas de la doble progresión, ciclos). Se generan de golpe y se pueden
  // copiar de otro ejercicio de la misma máquina.
  function seccionPesosMaquina() {
    const pesos = borrador.pesosMaquina ?? [];
    const gen = { desde: pesos[0] ?? 5, hasta: pesos.at(-1) ?? 100, paso: pesos.length > 1 ? pesos[1] - pesos[0] : 5 };
    const otros = d.ejercicios.filter((e) => e.id !== borrador.id && !e.archivado && e.pesosMaquina?.length);
    const nuevo = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Añadir un peso (kg)', 'aria-label': 'Añadir un peso' });
    function generar() {
      const lista = pesosDeMaquina(gen.desde, gen.hasta, gen.paso);
      if (!lista.length) { aviso('Revisa los tres números', { tipo: 'error' }); return; }
      borrador.pesosMaquina = [...new Set([...lista])].sort((a, b) => a - b);
      repintar();
    }
    return h('div', { class: 'campo pesos-maquina' },
      h('span', { class: 'etiqueta-campo' }, 'Pesos de la máquina'),
      pesos.length
        ? h('div', { class: 'tecnicas' }, pesos.map((p) => h('span', { class: 'chip' }, formatearNumero(p),
          h('button', { type: 'button', class: 'chip-quitar', 'aria-label': `Quitar ${p} kg`,
            onclick: () => { borrador.pesosMaquina = pesos.filter((x) => x !== p); repintar(); } }, '✕'))))
        : h('p', { class: 'nota' }, 'Sin pesos: la app redondeará a 2,5 kg. Mete los de la máquina para que solo te proponga pesos que existan.'),
      h('div', { class: 'fila-campos' },
        campo('Del primero', numeroInput(gen.desde, (v) => { gen.desde = v; }, { onchange: generar })),
        campo('Al último', numeroInput(gen.hasta, (v) => { gen.hasta = v; }, { onchange: generar })),
        campo('De … en …', numeroInput(gen.paso, (v) => { gen.paso = v; }, { onchange: generar }))),
      h('small', { class: 'nota' }, 'La lista se hace sola con estos tres números. Luego puedes quitar pesos (✕) o añadir sueltos.'),
      h('div', { class: 'fila-botones' },
        h('label', { class: 'campo crece' }, nuevo,
          h('button', { type: 'button', class: 'boton enlace', onclick: () => {
            const v = leerNumero(nuevo.value);
            if (v == null) return;
            borrador.pesosMaquina = [...new Set([...pesos, v])].sort((a, b) => a - b);
            repintar();
          } }, '+ Añadir'))),
      otros.length > 0 && selector(otros.map((o, i) => [i, `${o.nombre}: ${o.pesosMaquina.length} pesos (${formatearNumero(o.pesosMaquina[0])} a ${formatearNumero(o.pesosMaquina.at(-1))} kg)`]),
        null, (i) => {
          const elegido = otros[i];
          borrador.pesosMaquina = [...elegido.pesosMaquina];
          repintar();
          aviso(`Pesos de ${elegido.nombre} copiados.`);
        }, { titulo: 'Copiar los pesos de otro ejercicio de la misma máquina', lista: true }),
      pesos.length > 0 && h('small', { class: 'nota' }, `${pesos.length} pesos, de ${formatearNumero(pesos[0])} a ${formatearNumero(pesos.at(-1))} kg. `
        + 'Los drop sets, las subidas y los ciclos usarán solo estos.'));
  }

  // Agarre: en los ejercicios donde agarras (tirones, peso muerto, curls),
  // cambia qué cara del antebrazo trabaja. Con las palmas hacia abajo (prono)
  // o enfrentadas (neutro) entra la cara de los nudillos (extensores y
  // braquiorradial); con las palmas hacia arriba (supino), sobre todo la de
  // la palma. Se marca solo como secundario; lo principal no se toca.
  function conAgarre() {
    const m = [...borrador.musculos.principales, ...borrador.musculos.secundarios];
    return borrador.grupo === 'tirón' || m.some((x) => x.startsWith('antebrazo'));
  }
  function campoAgarre() {
    // Dicho como se ve al hacerlo: hacia dónde miran las palmas o los nudillos.
    const AGARRES = [['supino', 'Palmas hacia ti'], ['prono', 'Nudillos hacia ti'], ['neutro', 'Palmas una frente a otra'], ['mixto', 'Una palma y unos nudillos']];
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Agarre ', ayuda('Agarre', [
        'Mira tus manos cogiendo la barra o el agarre: ¿qué ves, las palmas o los nudillos?',
        'Palmas hacia ti (supino, como en un curl de bíceps): trabaja sobre todo la cara de la palma del antebrazo.',
        'Nudillos hacia ti (prono, como en un peso muerto normal) o palmas una frente a otra (neutro, como en un curl martillo): trabaja también la cara de los nudillos.',
        'Una palma y unos nudillos (mixto): lo de los dos. La app lo añade solo a los secundarios.'])),
      selector([[null, 'Sin indicar'], ...AGARRES], borrador.agarre ?? null, (v) => {
        borrador.agarre = v;
        const sec = borrador.musculos.secundarios.filter((x) => x !== 'antebrazoExtensor' && x !== 'antebrazoFlexor');
        const pri = borrador.musculos.principales;
        const anadirSi = (m, si) => { if (si && !pri.includes(m)) sec.push(m); };
        anadirSi('antebrazoFlexor', v != null);
        anadirSi('antebrazoExtensor', v === 'prono' || v === 'neutro' || v === 'mixto');
        borrador.musculos.secundarios = sec;
        repintar();
      }, { titulo: 'Agarre', botones: true }));
  }

  // Peso corporal: qué parte de tu peso levantas. En cada serie solo se
  // apunta el lastre; la carga sale sola.
  function campoFraccionCorporal() {
    borrador.fraccionCorporal ??= FRACCION_CORPORAL_POR_NOMBRE(borrador.nombre);
    const pct = Math.round(borrador.fraccionCorporal * 100);
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Qué parte de tu peso levantas (%)'),
      numeroInput(pct, (v) => { borrador.fraccionCorporal = v != null ? Math.max(1, Math.min(200, v)) / 100 : 1; }),
      h('small', { class: 'nota' }, peso
        ? `Con tu peso (${formatearNumero(peso)} kg): ${formatearNumero(Math.round(peso * borrador.fraccionCorporal))} kg, más el lastre que apuntes.`
        : 'Pon tu peso corporal en Ajustes para que la carga salga sola.'),
      fraccionSinDato(borrador.nombre) && h('p', { class: 'aviso-texto' },
        'Esta variante no se ha medido en ningún estudio: el porcentaje es una aproximación. Cámbialo si te parece que no cuadra.'),
      h('div', { class: 'fila-marcas compacta' }, [['Flexiones', 64], ['Flexiones con rodillas', 49], ['Flexiones con pies en alto (cajón de 30 cm)', 70],
        ['Flexiones con pies en alto (cajón de 60 cm)', 74], ['Flexiones con manos en alto (cajón de 30 cm)', 55],
        ['Flexiones con manos en alto (cajón de 60 cm)', 41], ['Dominadas y fondos', 100]].map(([texto, n]) => h('button', { type: 'button', class: `boton-marca${pct === n ? ' activo' : ''}`,
        onclick: () => { borrador.fraccionCorporal = n / 100; repintar(); } }, `${texto}: ${n} %`))),
      h('small', { class: 'nota' }, 'Pesos sacados de Ebben (2011) ',
        h('button', { type: 'button', class: 'que-es', 'aria-label': 'Ver la fuente',
          onclick: (e) => { e.preventDefault(); abrirAlLlegar('ap-de-donde-sale-cada-cosa', idApartado('Cuánto de tu peso levantas')); location.hash = '#/aprender'; } }, '?')));
  }

  // La unidad de una medida: km, m o cm en la distancia; cm o m en la altura.
  function campoUnidad(tipo) {
    const actual = unidadMedida(borrador, tipo);
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, tipo === 'altura' ? 'Unidad de la distancia/altura' : 'Unidad de la distancia'),
      selector(UNIDADES[tipo].map((u) => [u, u]), actual, (u) => {
        borrador.unidades = { ...borrador.unidades, [tipo]: u };
        repintar();
      }, { titulo: 'Unidad', compacto: true }),
      existente && h('small', { class: 'nota' }, 'Cambiarla no convierte lo que ya tienes apuntado.'));
  }

  // Grupo: los habituales y los tuyos, más «Otro…» para escribir uno nuevo.
  let grupoOtro = false;
  // ¿Se ven todos los tipos de peso? Al principio sí, si aún no hay uno elegido a propósito.
  let cambiandoCarga = !existente && !borrador.nombre;
  function campoGrupo() {
    const actual = borrador.grupo || '';
    const enLista = !actual || grupos.includes(actual);
    const escribir = grupoOtro || !enLista;
    const texto = h('input', { type: 'text', value: enLista ? '' : actual, placeholder: 'Nombre del grupo',
      hidden: !escribir, oninput: (e) => { borrador.grupo = e.target.value.trim(); } });
    const select = selector([['', 'Sin grupo'], ...grupos.map((g) => [g, g.charAt(0).toUpperCase() + g.slice(1)]), ['__otro', 'Otro…']],
      escribir ? '__otro' : actual, (v) => {
        grupoOtro = v === '__otro';
        if (!grupoOtro) borrador.grupo = v;
        repintar();
        if (grupoOtro) setTimeout(() => document.querySelector('input[placeholder="Nombre del grupo"]')?.focus(), 0);
      }, { titulo: 'Grupo' });
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Grupo'),
      select, texto,
      h('small', { class: 'nota' }, 'Ordena la lista de ejercicios y sirve para los filtros (empuje, tirón, pierna…).'));
  }

  // Qué fórmula estima el 1RM y, si es la personal, cómo va su calibración.
  // Tu 1RM, si lo sabes. Sirve para que la app proponga pesos desde el
  // primer día; en cuanto apuntas una serie, manda lo que sale de tus series.
  // Tu 1RM en este ejercicio. Sin series todavía, la app pregunta: ¿lo
  // estimas ahora con una prueba, lo pones a mano o lo dejas para el primer
  // día? En cuanto hay series, manda lo que sale de ellas.
  function campo1RM() {
    const conHistorial = existente && d.sesiones.some((s) => !s.borrada && s.ejercicios.some((x) => x.ejercicioId === existente.id
      && x.series.some((y) => y.hecha)));
    const titulo = h('div', { class: 'titulo-con-ayuda' },
      h('span', { class: 'etiqueta-campo' }, 'Tu 1RM'),
      ayuda('Tu 1RM', [
        'El 1RM es el peso que podrías levantar una sola vez. Con él, la app te dice qué peso toca desde el primer día.',
        'No hace falta levantarlo: con una serie cualquiera hasta el fallo, la fórmula lo calcula.',
        'En cuanto apuntas series de este ejercicio, manda lo que sale de ellas.']));
    if (conHistorial) {
      const rm = rmDeReferencia(d, borrador)?.valor;
      return h('div', { class: 'campo tarjeta-1rm' }, titulo,
        h('p', {}, rm ? `${formatearNumero(Math.round(rm * 10) / 10)} kg, calculado con tus series.` : 'Lo calcula la app con tus series.'));
    }
    const modo = modoRM.get(clave) ?? (borrador.rmManual > 0 ? 'mano' : null);
    const elegir = (m) => { modoRM.set(clave, m); if (m === 'dia') { borrador.rmManual = null; fijarInicioPrimerCiclo('prueba'); } repintar(); };
    const guardarRM = (v) => {
      borrador.rmManual = v > 0 ? Math.round(v * 2) / 2 : null;
      fijarInicioPrimerCiclo(borrador.rmManual ? 'porcentaje' : 'prueba');
    };

    // Prueba ahora: una serie cualquiera hasta el fallo, y la fórmula calcula el 1RM.
    const prueba = { peso: null, reps: null };
    const resultado = h('p', { class: 'resultado-prueba' });
    const calcular = () => {
      const rm = prueba.peso && prueba.reps ? estimar1RM(modeloDe(d, borrador), prueba.peso, prueba.reps, 0) : null;
      resultado.textContent = rm ? `Tu 1RM estimado: ${formatearNumero(Math.round(rm * 2) / 2)} kg` : '';
      return rm;
    };

    return h('div', { class: 'campo tarjeta-1rm' }, titulo,
      !modo && h('p', {}, 'Aún no tienes 1RM estimado en este ejercicio. ¿Quieres estimarlo ahora con una prueba?'),
      h('div', { class: 'fila-marcas compacta' },
        [['ahora', 'Sí, ahora'], ['mano', 'No, lo meto a mano'], ['dia', 'Lo haré el primer día']].map(([k, texto]) =>
          h('button', { type: 'button', class: `boton-marca${modo === k ? ' activo' : ''}`, 'aria-pressed': String(modo === k),
            onclick: () => elegir(k) }, texto))),
      modo === 'ahora' && [
        h('p', { class: 'nota' }, 'Calienta, pon un peso cualquiera y haz todas las repeticiones que puedas, hasta que no salga ni una más. Apúntalo aquí:'),
        h('div', { class: 'fila-campos' },
          campo(`Peso (${unidadMedida(borrador, borrador.carga.tipo) || 'kg'})`, numeroInput(null, (v) => { prueba.peso = v; calcular(); })),
          campo('Repeticiones', numeroInput(null, (v) => { prueba.reps = v; calcular(); }))),
        resultado,
        h('button', { type: 'button', class: 'boton', onclick: () => {
          const rm = calcular();
          if (!rm) { aviso('Pon el peso y las repeticiones', { tipo: 'error' }); return; }
          guardarRM(rm); modoRM.set(clave, 'mano'); repintar();
          aviso(`Guardado: tu 1RM estimado es ${formatearNumero(borrador.rmManual)} kg.`);
        } }, 'Guardar mi 1RM')],
      modo === 'mano' && campo('Tu 1RM (kg)', numeroInput(borrador.rmManual, (v) => { borrador.rmManual = v; },
        { etiqueta: 'Tu 1RM en kilos', onchange: () => { guardarRM(borrador.rmManual); repintar(); } })),
      modo === 'dia' && h('p', { class: 'nota' }, 'El primer día que lo entrenes, la primera serie será la prueba: un peso cualquiera y todas las que puedas. Desde el día siguiente, la app te dice qué toca.'));
  }

  // ¿Todas las series del ejercicio son iguales (salvo su identificador)?
  function sonIguales() {
    if (igualesFicha.has(clave)) return igualesFicha.get(clave);
    const sinId = (p) => JSON.stringify({ ...p, id: null });
    return borrador.series.every((p) => sinId(p) === sinId(borrador.series[0]));
  }

  function copiarPrimeraSerie() {
    const [primera, ...resto] = borrador.series;
    borrador.series = [primera, ...resto.map((p) => ({ ...structuredClone(primera), id: p.id }))];
  }

  // Cuántas series y si son iguales o cada una a su manera.
  function pasoCuantasSeries() {
    const n = borrador.series.length;
    const fijar = (m) => {
      while (borrador.series.length < m) borrador.series.push({ ...structuredClone(borrador.series.at(-1) ?? serieNuevaPlantilla(borrador)), id: nuevoId('pl') });
      borrador.series.length = Math.max(1, m);
      repintar();
    };
    return h('div', {},
      h('div', { class: 'fila-marcas compacta cuantas-series' },
        [1, 2, 3, 4, 5, 6].map((k) => h('button', { type: 'button',
          class: `boton-marca${k === n ? ' activo' : ''}`, 'aria-pressed': String(k === n), onclick: () => fijar(k) }, String(k))),
        h('button', { type: 'button', class: `boton-marca${n > 6 ? ' activo' : ''}`, 'aria-label': 'Otro número de series', onclick: () => {
          const caja = h('input', { type: 'text', inputmode: 'numeric', value: n > 6 ? String(n) : '', 'aria-label': 'Número de series' });
          const cerrar = modal('¿Cuántas series?', h('div', { class: 'formulario' },
            h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Series (hasta 50)'), caja),
            h('button', { class: 'boton', onclick: () => {
              const m = Math.round(leerNumero(caja.value) ?? 0);
              if (!(m >= 1 && m <= 50)) { aviso('Entre 1 y 50', { tipo: 'error' }); return; }
              cerrar();
              fijar(m);
            } }, 'Hecho')));
          setTimeout(() => caja.focus(), 50);
        } }, n > 6 ? String(n) : '+')),
      n > 1 && h('p', {}, '¿Todas iguales o cada una a su manera?'),
      n > 1 && h('div', { class: 'fila-marcas compacta' }, [[true, 'Todas iguales'], [false, 'Distintas']].map(([v, texto]) =>
        h('button', { type: 'button', class: `boton-marca${sonIguales() === v ? ' activo' : ''}`, 'aria-pressed': String(sonIguales() === v),
          onclick: () => { igualesFicha.set(clave, v); repintar(); } }, texto))),
      h('small', { class: 'nota' }, n > 1 && sonIguales()
        ? 'En el siguiente paso eliges cómo progresan, y vale para todas.'
        : n > 1 ? 'En los siguientes pasos, una a una.' : 'Una serie por entrenamiento de este ejercicio.'));
  }

  // Cambia cómo empieza el primer ciclo de las series que aún no han empezado.
  function fijarInicioPrimerCiclo(modo) {
    for (const plan of borrador.series) {
      const prog = plan.progresion;
      if (prog?.tipo !== 'bilbo' || prog.sobre !== 'carga') continue;
      const actual = prog.inicio?.modo;
      if (modo === 'porcentaje' && actual && actual !== 'prueba') continue;
      if (modo === 'prueba' && actual === 'mismo') continue;
      prog.inicio = { ...prog.inicio, modo };
    }
  }

  function seccionFormula() {
    borrador.formula1RM ??= 'personal';
    const estadoCalibracion = existente && borrador.formula1RM === 'personal' ? calibrar(d, existente) : null;
    const modelo = existente ? modeloDe(d, { ...existente, formula1RM: borrador.formula1RM }) : null;
    if (borrador.formula1RM === 'epley') borrador.formula1RM = 'personal';
    const explicacion = estadoCalibracion ? textoCalibracion(estadoCalibracion) : null;
    const ejemplo = modelo && [[60, 20], [80, 8]].map(([p, r]) => `${p} kg × ${r} ≈ ${Math.round(estimar1RM(modelo, p, r, 1))} kg`).join(' · ');
    return h('fieldset', {},
      h('legend', {}, 'Fórmula del 1RM'),
      campo1RM(),
      opciones(FORMULAS, borrador.formula1RM, (f) => { borrador.formula1RM = f; repintar(); }),
      pista('ficha-formula', 'El 1RM es el peso que podrías levantar una sola vez. La app lo estima a partir de cada serie '
        + 'y con él propone pesos. «Se ajusta a ti» corrige la fórmula con tus propias series.'),
      h('details', { class: 'explicacion' },
        h('summary', {}, 'Saber más'),
        explicacion && h('p', { class: 'nota' }, explicacion),
        ejemplo && h('p', { class: 'nota' }, `Ejemplo con 1 en recámara: ${ejemplo}.`),
        explicaciones1RM()));
  }

  // Si el ejercicio se llama como uno del catálogo, se ofrecen sus músculos.
  // También si ya tiene músculos pero la lista los tiene distintos (por
  // ejemplo, desde que existe el hombro posterior).
  function sugerenciaDelCatalogo() {
    const nombre = normalizar(borrador.nombre);
    if (!nombre) return null;
    const enCatalogo = CATALOGO.find((x) => normalizar(x.nombre) === nombre)
      ?? (!borrador.musculos.principales.length
        ? CATALOGO.find((x) => nombre.includes(normalizar(x.nombre)) || normalizar(x.nombre).includes(nombre))
        : null);
    if (!enCatalogo?.musculos?.principales?.length) return null;
    const igual = (a, b) => [...a].sort().join() === [...b].sort().join();
    if (igual(enCatalogo.musculos.principales, borrador.musculos.principales)
      && igual(enCatalogo.musculos.secundarios ?? [], borrador.musculos.secundarios)) return null;
    const nombres = (lista) => lista.map((m) => nombreMusculo(m)).join(', ');
    return h('div', { class: 'tarjeta aviso-tarjeta' },
      h('p', {}, `En la lista, «${enCatalogo.nombre}» trabaja ${nombres(enCatalogo.musculos.principales)}`
        + (enCatalogo.musculos.secundarios?.length ? ` y, de secundarios, ${nombres(enCatalogo.musculos.secundarios)}.` : '.')),
      h('button', { type: 'button', class: 'boton secundario', onclick: () => {
        borrador.musculos = {
          principales: [...enCatalogo.musculos.principales],
          secundarios: [...(enCatalogo.musculos.secundarios ?? [])],
        };
        repintar();
      } }, 'Usar los del catálogo'));
  }

  // Chips de músculos: al tocar uno se añade o se quita. Un músculo no puede
  // ser principal y secundario a la vez.
  function selectorMusculos(etiqueta, lista, otraLista) {
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, etiqueta),
      h('div', { class: 'tecnicas' },
        ORDEN_MUSCULOS.map((m) => h('button', {
          type: 'button',
          class: `chip seleccionable ${lista.includes(m) ? 'activo' : ''}`,
          'aria-pressed': String(lista.includes(m)),
          onclick: () => {
            const i = lista.indexOf(m);
            if (i >= 0) lista.splice(i, 1);
            else {
              lista.push(m);
              const j = otraLista.indexOf(m);
              if (j >= 0) otraLista.splice(j, 1);
            }
            repintar();
          },
        }, nombreMusculo(m)))));
  }

  // Qué reglas puede llevar una serie según cómo se mide el ejercicio.
  // Qué hace la app con esta serie. Cuatro opciones y nada más: casi todo
  // es un ciclo (una escalera que sube y, cuando se acaba, vuelve a empezar
  // más arriba), y los prehechos clásicos son ciclos con sus números puestos.
  const REGLAS = {
    ciclo: { etiqueta: 'Sobrecarga progresiva (mejorar)', descripcion: 'Personalizable. La app te dice el peso y el objetivo de cada sesión.' },
    'maximo-trabajo': { etiqueta: 'Máximo trabajo', descripcion: 'Experimental: el peso con el que más kilos totales mueves.' },
    calentamiento: { etiqueta: 'Calentamiento', descripcion: 'No progresa ni cuenta para récords ni recuperación.' },
    libre: { etiqueta: 'Solo apuntar', descripcion: 'La app no propone nada; tú decides.' },
  };

  // Los prehechos, todos en la misma lista y en este orden: primero
  // «Personalizar» (en blanco), luego el recomendado y después los clásicos.
  // Cada uno deja puestos los números de los bloques de abajo, y desde ahí se
  // cambia lo que quieras.
  function prehechosPara() {
    const conCarga = borrador.carga.tipo !== 'ninguna';
    const reps = medidasDe(borrador)[0] === 'repeticiones';
    const cardio = tipoDeEjercicio(borrador) === 'cardio';
    const lista = {};
    lista.mia = { etiqueta: 'Personalizar', tipo: 'bilbo', preset: 'personalizado',
      explica: 'En blanco: pones tú qué mejora, cuándo se acaba el ciclo y por dónde empieza el siguiente.' };
    if (conCarga && reps) {
      lista.doble = { etiqueta: 'De 6 a 10 · recomendado', grupo: 'Hipertrofia', tipo: 'carga', rango: [6, 10],
        explica: 'Entre 6 y 10 repeticiones con el mismo peso. Cuando llegas a 10 en todas las series, la app sube el peso y vuelves a 6. '
          + 'El músculo crece con series cerca del fallo, sin necesidad de llegar a él (metaanálisis de Refalo 2023).' };
      lista.bilbo = { etiqueta: 'Bilbo / incremento lineal', grupo: 'Fuerza', tipo: 'bilbo', preset: 'bilbo',
        explica: 'Empieza ligero, con muchas repeticiones rápidas, y cada sesión sube 2,5 kg hasta pesos de fuerza. '
          + 'Cuando ya no llegas a 15, el ciclo se acaba y el siguiente empieza al 50 % del mejor 1RM que hiciste en él. '
          + 'Un ensayo (González-Alcázar 2025) muestra que una serie así no perjudica el 1RM; las cifras son decisiones prácticas del método.' };
      if (!cardio) {
        lista.cincoPorCinco = { etiqueta: '5×5', grupo: 'Fuerza', tipo: 'programa', programa: '5x5',
          explica: 'Cinco series de cinco con el mismo peso. Si las completas, sube; si fallas tres sesiones seguidas, baja un 10 %.' };
        lista.cincoTresUno = { etiqueta: '5/3/1', grupo: 'Fuerza', tipo: 'programa', programa: '531',
          explica: 'Cuatro «semanas»: de 5, de 3, de 5/3/1 y descarga, con porcentajes del 90 % de tu 1RM, que sube cada vuelta.' };
        lista.hst = { etiqueta: 'HST', grupo: 'Hipertrofia', tipo: 'programa', programa: 'hst',
          explica: 'Tres bloques de seis sesiones, a 15, a 10 y a 5 repeticiones, con el peso subiendo dentro de cada bloque.' };
      }
    }
    // Con tu peso: tú eliges si el ciclo sube lastre (los de arriba) o repeticiones.
    if (borrador.carga.tipo === 'pesoCorporal' && reps) lista.repeticiones = { etiqueta: 'Más repeticiones (sin lastre)', grupo: 'Hipertrofia',
      tipo: 'bilbo', preset: 'repeticiones',
      explica: 'Con tu peso, una repetición más cada sesión hasta llegar a 20; entonces pon lastre o pasa a una variante más difícil. '
        + 'Llegando cerca del fallo, muchas repeticiones también hacen crecer el músculo (Kikuchi 2017: flexiones frente a press de banca).' };
    if (borrador.esfuerzo.tipo === 'tiempo') lista.tiempo = { etiqueta: 'Más tiempo', grupo: 'Aguante', tipo: 'bilbo', preset: 'tiempo',
      explica: 'Diez segundos más cada sesión hasta llegar a dos minutos. Para planchas, isométricos y estiramientos.' };
    return lista;
  }

  // Cuál de los prehechos está puesto ahora mismo, si es que hay alguno.
  function prehechoActual(plan) {
    const p = plan.progresion;
    const lista = prehechosPara();
    for (const [clave, x] of Object.entries(lista)) {
      if (x.tipo !== p.tipo) continue;
      if (x.tipo === 'programa' && x.programa !== p.programa) continue;
      if (x.tipo === 'bilbo' && x.preset !== p.preset) continue;
      return clave;
    }
    return null;
  }

  function aplicarPrehecho(plan, clave) {
    const x = prehechosPara()[clave];
    if (!x) return;
    plan.progresion = progresionPorDefecto(x.tipo, borrador);
    if (x.rango) plan.progresion.objetivoEsfuerzo = [...x.rango];
    if (x.tipo === 'programa') plan.progresion.programa = x.programa;
    if (x.tipo === 'bilbo') {
      plan.progresion.preset = x.preset;
      if (x.preset !== 'personalizado') aplicarPreset(plan.progresion, x.preset, borrador);
    }
    plan.tipo = tipoDePlan(plan);
    repintar();
  }

  // ¿Aún no hay ninguna serie apuntada de este ejercicio?
  const sinHistorial = () => !existente || !d.sesiones.some((s) => !s.borrada
    && s.ejercicios.some((x) => x.ejercicioId === existente.id && x.series.some((y) => y.hecha)));

  // Qué regla lleva esta serie, sacada de lo guardado.
  function reglaDe(plan) {
    if (plan.calentamiento) return 'calentamiento';
    if (plan.progresion?.tipo === 'maximo-trabajo') return 'maximo-trabajo';
    if (plan.progresion?.tipo === 'libre') return 'libre';
    return 'ciclo';
  }

  function fijarRegla(plan, regla) {
    plan.calentamiento = regla === 'calentamiento';
    if (regla === 'calentamiento' || regla === 'libre') plan.progresion = progresionPorDefecto('libre', borrador);
    else if (regla === 'maximo-trabajo') plan.progresion = progresionPorDefecto('maximo-trabajo', borrador);
    else if (plan.progresion?.tipo === 'libre' || plan.progresion?.tipo === 'maximo-trabajo') {
      aplicarPrehecho(plan, prehechosPara().doble ? 'doble' : 'mia');
      return;
    }
    plan.tipo = tipoDePlan(plan);
    repintar();
  }

  // Un bloque plegado: el título y, al lado, lo que tiene puesto ahora en
  // corto. Así la ficha no abruma y se ve todo de un vistazo. Lo abierto se
  // recuerda mientras editas, para que no se cierre al tocar un número.
  if (!abiertosFicha.has(clave)) abiertosFicha.set(clave, new Set());
  const abiertos = abiertosFicha.get(clave);
  function bloque(titulo, resumen, ...contenido) {
    // Si lo primero del contenido es un «?», va en el título, junto al nombre.
    const conAyuda = contenido[0]?.classList?.contains('ayuda') ? contenido.shift() : null;
    const caja = h('details', { class: 'bloque-ciclo plegable', open: abiertos.has(titulo) || undefined,
      ontoggle: (e) => { if (e.target.open) abiertos.add(titulo); else abiertos.delete(titulo); } },
    h('summary', {}, h('strong', {}, titulo), conAyuda, resumen && h('span', { class: 'resumen-bloque' }, resumen)),
    ...contenido);
    return caja;
  }

  // El tipo de la serie sale de lo elegido: no se pide aparte.
  function tipoDePlan(plan) {
    if (plan.calentamiento) return 'calentamiento';
    if (plan.progresion?.tipo === 'bilbo') return 'bilbo';
    if (plan.tecnicas?.length) return 'intensidad';
    return 'libre';
  }

  function tarjetaPlan(plan, i) {
    plan.tecnicas ??= [];
    plan.calentamiento = plan.calentamiento ?? (plan.tipo === 'calentamiento');
    plan.tipo = tipoDePlan(plan);
    const tramos = tramosDe(plan.tecnicas);
    const regla = reglaDe(plan);
    const prehechos = prehechosPara();
    const puesto = prehechoActual(plan);
    const estira = ['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(borrador));

    return h('article', { class: 'tarjeta plan-serie' },
      h('div', { class: 'cabecera-tarjeta' },
        h('span', { class: 'titulo-con-ayuda' }, h('strong', {}, borrador.series.length > 1 ? `Serie ${i + 1}` : 'Regla'),
          ayuda('Las reglas', null, { lista: Object.values(REGLAS).map((r) => [r.etiqueta, r.descripcion]) })),
        borrador.series.length > 1 && h('button', { type: 'button', class: 'boton-icono papelera', 'aria-label': 'Quitar serie',
          onclick: async () => {
            if (!await confirmar(`¿Quitar la serie ${i + 1} de este ejercicio? Lo ya apuntado en entrenamientos pasados se conserva, `
              + 'y podrás deshacerlo en el aviso de abajo o saliendo de la ficha sin guardar.', { si: 'Quitar', peligro: true })) return;
            const [quitada] = borrador.series.splice(i, 1);
            repintar();
            aviso(`Serie ${i + 1} quitada.`, { accion: { texto: 'Deshacer', fn: () => { borrador.series.splice(i, 0, quitada); repintar(); } } });
          } }, '🗑')),

      opciones(REGLAS, regla, (r) => fijarRegla(plan, r), { compacto: true }),
      // Donde se presenta el ciclo, su «?»: qué es la sobrecarga progresiva.
      regla === 'ciclo' && h('p', { class: 'nota centrado' }, '¿Qué es la sobrecarga progresiva? ',
        h('button', { type: 'button', class: 'que-es', 'aria-label': 'Qué es la sobrecarga progresiva',
          onclick: (e) => { e.preventDefault(); explicar('sobrecarga'); } }, '?')),

      regla !== 'libre' && regla !== 'calentamiento' && sinHistorial() && !['ninguna', 'altura'].includes(borrador.carga.tipo) && campo1RM(),

      regla === 'ciclo' && h('div', {},
        h('div', { class: 'titulo-con-ayuda' }, h('span', { class: 'etiqueta-campo' }, 'Prehechos'),
          ayuda('Los prehechos', 'Cada uno deja puestos los números de los bloques de abajo; luego cambias lo que quieras.', {
            lista: Object.values(prehechos).filter((x) => x.explica).map((x) => [x.etiqueta, x.explica]) })),
        // Por grupos: hipertrofia, fuerza y aguante; «Personalizar» aparte.
        [...new Set(Object.values(prehechos).map((x) => x.grupo ?? ''))].map((grupo) => h('div', { class: 'grupo-prehechos' },
          grupo && h('span', { class: 'titulo-grupo' }, grupo),
          h('div', { class: 'chips prehechos' }, Object.entries(prehechos).filter(([, x]) => (x.grupo ?? '') === grupo).map(([k, x]) => h('button', {
            type: 'button', class: `chip seleccionable ${puesto === k ? 'activo' : ''}`, 'aria-pressed': String(puesto === k),
            onclick: () => aplicarPrehecho(plan, k),
          }, x.etiqueta))))),
        detalleProgresion(plan)),

      // Cómo es la serie: las técnicas valen para cualquier regla, también
      // dentro de un ciclo. Un drop set es una forma de hacer la serie, no
      // una progresión.
      regla !== 'libre' && !estira && tipoDeEjercicio(borrador) !== 'cardio'
      && bloque('¿Añadir técnica avanzada de intensidad?',
        plan.tecnicas.length ? plan.tecnicas.map((k) => TECNICAS[k]?.etiqueta ?? k).join(' + ') : 'ninguna',
        selectorTecnicas(plan.tecnicas, (nuevas) => {
          plan.tecnicas = nuevas;
          if (!tramosDe(nuevas)) plan.tramosPrevistos = null;
          plan.tipo = tipoDePlan(plan);
          repintar();
        }),
        tramos && seccionTramos(plan, tramos)));
  }

  // Cómo se rellenan los tramos cada vez que el ejercicio entra en un
  // entrenamiento: como la última vez, con los ajustes generales o con lo
  // que se guarde aquí. Y, en máquinas de placas, una secuencia de pesos fija.
  // Cómo se rellenan las bajadas (o miniseries) cada vez que el ejercicio
  // entra en un entrenamiento. Una sola pregunta: de dónde salen los pesos.
  // Debajo, los números: cuántas, por dónde empieza y cuánto baja cada vez.
  function seccionTramos(plan, tramos) {
    const defecto = tramosPorDefecto(d.perfil, tramos.tecnica);
    const esDrop = tramos.tecnica === 'drop-set';
    const fijos = Boolean(plan.tramosFijos?.length);
    plan.tramosModo ??= 'ultima';

    // El modo que se enseña sale de lo guardado: los pesos fijos mandan, y
    // si no, la plantilla se parte en «los calcula la app» y «a mano».
    const modoActual = fijos || plan.pedirFijos ? 'fijos'
      : plan.tramosModo !== 'plantilla' ? 'ultima'
        : ((plan.modoCarga ?? d.perfil.dropSet?.modoCarga ?? 'rm') === 'kg' ? 'mano' : 'auto');

    const modos = {
      ultima: { etiqueta: 'Como la última vez', descripcion: `Los mismos pesos y ${tramos.nombre.toLowerCase()}s que la última vez que lo hiciste.` },
      auto: { etiqueta: 'Que los calcule la app', descripcion: esDrop
        ? 'Arranca a un porcentaje de tu 1RM del día y va bajando. Si cambias el peso de la serie de arriba, las bajadas se recalculan solas.'
        : 'Los mismos números en cada entrenamiento, calculados con tu 1RM del día.' },
      mano: { etiqueta: 'Los kilos que yo ponga', descripcion: 'Se quedan como los dejes, sin recalcular.' },
    };
    if (esDrop) modos.fijos = { etiqueta: 'Pesos fijos de la máquina', descripcion: 'Una lista de pesos, siempre la misma.' };

    const elegir = (modo) => {
      if (modo === 'fijos') { plan.tramosModo = 'plantilla'; plan.pedirFijos = true; plan.tramosFijos ??= null; }
      else if (modo === 'ultima') { plan.tramosModo = 'ultima'; plan.tramosFijos = null; plan.pedirFijos = false; }
      else {
        plan.tramosModo = 'plantilla';
        plan.tramosFijos = null;
        plan.pedirFijos = false;
        plan.modoCarga = modo === 'mano' ? 'kg' : 'rm';
      }
      repintar();
    };

    const conNumeros = modoActual === 'auto' || modoActual === 'mano';
    const unidadSalto = modoActual === 'auto' ? '% del 1RM' : (unidadMedida(borrador, borrador.carga.tipo) || 'kg');

    return h('div', { class: 'campo' },
      h('div', { class: 'titulo-con-ayuda' }, h('span', { class: 'etiqueta-campo' }, `${tramos.nombre}s: de dónde salen los pesos`),
        ayuda(`${tramos.nombre}s`, [
          `Si dejas vacíos los números, se usa lo de Ajustes (${d.perfil.dropSet?.bajadas ?? 4} bajadas, empieza al `
            + `${d.perfil.dropSet?.inicioPorcentaje ?? 80} % y baja ${d.perfil.dropSet?.salto ?? 10} cada vez).`,
          'Los pesos fijos se escriben separados por espacios, con coma para los decimales, y también se pueden fijar desde el entrenamiento.'],
        { lista: Object.values(modos).map((m) => [m.etiqueta, m.descripcion]) })),
      opciones(modos, modoActual, elegir, { compacto: true }),
      conNumeros && h('div', { class: 'fila-campos' },
        campo(`${tramos.nombre}s`, numeroInput(plan.tramosPrevistos ?? defecto.tramos,
          (v) => { plan.tramosPrevistos = v == null ? null : Math.max(1, Math.round(v)); })),
        esDrop && modoActual === 'auto' && campo('Empieza al (% del 1RM)',
          numeroInput(plan.tramoInicio ?? d.perfil.dropSet?.inicioPorcentaje ?? 80, (v) => { plan.tramoInicio = v; })),
        !esDrop && campo('Repeticiones por miniserie',
          numeroInput(plan.tramoReps ?? defecto.reps, (v) => { plan.tramoReps = v; })),
        tramos.salto > 0 && campo(`Baja cada vez (${unidadSalto})`,
          numeroInput(plan.tramoSalto ?? defecto.salto, (v) => { plan.tramoSalto = v; }))),

      // Con los pesos de la máquina metidos, se eligen tocándolos.
      modoActual === 'fijos' && borrador.pesosMaquina?.length > 0 && h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Toca los pesos de las bajadas'),
        h('div', { class: 'fila-marcas compacta' }, [...borrador.pesosMaquina].reverse().map((kg) => {
          const puesto = (plan.tramosFijos ?? []).includes(kg);
          return h('button', { type: 'button', class: `boton-marca${puesto ? ' activo' : ''}`, 'aria-pressed': String(puesto),
            onclick: () => {
              const lista = puesto ? plan.tramosFijos.filter((x) => x !== kg) : [...(plan.tramosFijos ?? []), kg];
              plan.tramosFijos = lista.length ? lista.sort((a, b) => b - a) : null;
              plan.tramosPrevistos = lista.length || null;
              repintar();
            } }, formatearNumero(kg));
        }))),
      modoActual === 'fijos' && campo(borrador.pesosMaquina?.length ? 'O escríbelos' : 'Pesos fijos (máquina de placas)',
        h('input', { type: 'text', placeholder: 'Por ejemplo: 50 42,5 35 27,5',
          value: (plan.tramosFijos || []).map((x) => formatearNumero(x)).join(' '),
          oninput: (e) => {
            const pesos = e.target.value.split(/[;/\s]+/).map((x) => leerNumero(x)).filter((x) => x != null);
            plan.tramosFijos = pesos.length ? pesos : null;
          } }),
        pesosDeOtros(plan)));
  }

  // Máquinas compartidas (abductores y aductores en la misma, por ejemplo):
  // traer la secuencia de pesos fijos que ya tenga otro ejercicio.
  function pesosDeOtros(plan) {
    const otros = d.ejercicios.flatMap((e) => (e.id === borrador.id || e.archivado ? [] : (e.series || [])
      .filter((p) => p.tramosFijos?.length)
      .map((p) => ({ nombre: e.nombre, pesos: p.tramosFijos }))));
    if (!otros.length) return null;
    return selector(otros.map((o, i) => [i, `${o.nombre}: ${o.pesos.map((x) => formatearNumero(x)).join(' → ')} kg`]), null, (i) => {
      const elegido = otros[i];
      plan.tramosFijos = [...elegido.pesos];
      plan.tramosPrevistos = elegido.pesos.length;
      repintar();
      aviso(`Pesos de ${elegido.nombre} copiados y guardados.`);
    }, { titulo: 'Traer los pesos fijos de otro ejercicio', lista: true });
  }

  function detalleProgresion(plan) {
    const p = plan.progresion;
    const sobre = p.sobre || sobrePorDefecto(borrador);
    const unidad = sobre === 'carga'
      ? unidadMedida(borrador, borrador.carga.tipo)
      : unidadMedida(borrador, borrador.esfuerzo.tipo);
    const queSube = sobre === 'carga' ? 'la carga' : TIPOS_ESFUERZO[borrador.esfuerzo.tipo].etiqueta.toLowerCase();

    if (p.tipo === 'bilbo') return seccionBilbo(plan, sobre, unidad);
    if (p.tipo === 'programa') return seccionPrograma(plan);
    if (p.tipo === 'carga') {
      p.objetivoEsfuerzo ??= [8, 12];
      return h('div', {},
        h('div', { class: 'fila-campos' },
          campo('De (reps)', numeroInput(p.objetivoEsfuerzo[0], (v) => { p.objetivoEsfuerzo[0] = v; })),
          campo('A (reps)', numeroInput(p.objetivoEsfuerzo[1], (v) => { p.objetivoEsfuerzo[1] = v; })),
          campo(`Y entonces sube (${unidad})`, numeroInput(p.incremento, (v) => { p.incremento = v; }))));
    }
    if (p.tipo === 'esfuerzo') {
      const conCarga = borrador.carga.tipo !== 'ninguna';
      const formas = {
        esfuerzo: { etiqueta: `Más ${TIPOS_ESFUERZO[borrador.esfuerzo.tipo].etiqueta.toLowerCase()}`, descripcion: 'Con el mismo peso.' },
        carga: { etiqueta: 'Más peso', descripcion: `Con ${TIPOS_ESFUERZO[borrador.esfuerzo.tipo].etiqueta.toLowerCase()} iguales.` },
      };
      const actual = conCarga && p.sobre === 'carga' ? 'carga' : 'esfuerzo';
      return h('div', {},
        conCarga && opciones(formas, actual, (f) => {
          p.sobre = f;
          p.incremento = f === 'carga' ? 2.5 : 1;
          repintar();
        }),
        campo(`Aumento cada vez (${unidadMedida(borrador, actual === 'carga' ? borrador.carga.tipo : borrador.esfuerzo.tipo)})`,
          numeroInput(p.incremento, (v) => { p.incremento = v; })));
    }
    return null;
  }

  // Programas clásicos: cuál, el peso inicial y desde cuándo se cuenta.
  function seccionPrograma(plan) {
    const p = plan.progresion;
    p.programa ??= '5x5';
    p.desde ??= hoyISO();
    const info = PROGRAMAS[p.programa];
    const calculado = existente ? inicialDelPrograma(d, existente, p) : null;
    const muestra = p.inicial != null || calculado != null ? seriesDelPrograma(borrador, { ...p, inicial: p.inicial ?? calculado }, 0) : null;
    // Cuál de los tres se elige arriba, con los demás prehechos.
    return h('div', {},
      h('div', { class: 'titulo-con-ayuda' }, h('span', { class: 'etiqueta-campo' }, info.etiqueta),
        ayuda(info.etiqueta, [info.descripcion,
          'El peso de partida lo calcula la app con tu 1RM si dejas la casilla vacía.',
          p.programa === '531'
            ? 'La «semana» del programa avanza cada tantas sesiones de este ejercicio como veces lo hagas a la semana.'
            : p.programa === 'hst'
              ? 'Cada bloque son seis sesiones de este ejercicio: dos semanas si lo haces tres veces por semana.'
              : 'Avanza por sesiones de este ejercicio: cada vez que completas las cinco series, sube.'])),
      h('div', { class: 'fila-campos' },
        campo(`${info.inicial} (kg)`, numeroInput(p.inicial, (v) => { p.inicial = v; }, { onchange: repintar }),
          calculado != null && h('small', { class: 'nota' }, `Vacío: ${formatearNumero(calculado)} kg`)),
        campo('Incremento (kg)', numeroInput(p.incremento ?? 2.5, (v) => { p.incremento = v; })),
        p.programa === '5x5' && campo('Series de 5', numeroInput(p.series ?? 5,
          (v) => { p.series = Math.max(1, Math.min(10, Math.round(v ?? 5))); }, { onchange: repintar })),
        p.programa === '531' && campo('Veces a la semana que haces este ejercicio',
          numeroInput(p.porSemana ?? 1, (v) => { p.porSemana = Math.max(1, Math.round(v ?? 1)); }, { onchange: repintar }))),
      muestra && h('p', { class: 'nota' }, `Primera sesión: ${muestra.series.map((s) => `${formatearNumero(s.carga)} × ${s.reps}${s.amrap ? '+' : ''}`).join(' · ')}.`),
      h('p', { class: 'nota' }, `Contando desde el ${p.desde}. `,
        h('button', { type: 'button', class: 'boton enlace', onclick: () => { p.desde = hoyISO(); repintar(); aviso('El programa empieza de nuevo desde hoy.'); } },
          'Empezar de nuevo desde hoy')),
      );
  }

  // El ciclo, en tres preguntas: qué mejora, cuándo se acaba y por dónde
  // empieza el siguiente. Arriba, prehechos para no empezar de cero.
  function seccionBilbo(plan, sobre, unidad) {
    const p = plan.progresion;
    p.diasPorCiclo ??= DIAS_CICLO_POR_DEFECTO;
    p.ciclos ??= [];
    completarCiclo(p, d.perfil);
    if (sobre === 'esfuerzo' && p.preset === 'bilbo' && !p.ciclos.length) aplicarPreset(p, 'repeticiones', borrador);
    if (!p.ciclos.length) {
      p.ciclos.push({ n: 1, inicio: null, fin: null,
        generador: { inicial: sobre === 'carga' ? inicioBilbo() ?? 20 : 10, incremento: sobre === 'carga' ? 2.5 : 1, cada: 1 },
        escalera: [] });
      p.cicloActual = 1;
    }
    const ciclo = cicloActual(plan) || p.ciclos.at(-1);
    const gen = ciclo.generador ??= { inicial: ciclo.escalera[0] ?? 0, incremento: 2.5, cada: 1 };
    if (!ciclo.escalera?.length) ciclo.escalera = generarEscalera({ ...gen, dias: p.diasPorCiclo });
    const asistida = borrador.carga.tipo === 'asistida' && sobre === 'carga';
    const hechos = existente
      ? new Map(registrosDelCiclo(d, existente, plan, ciclo.n).map((r) => [r.dia, r]))
      : new Map();

    const regenerar = () => {
      p.corte.sesiones = p.diasPorCiclo;
      ciclo.escalera = escaleraDe(borrador, gen, p.diasPorCiclo);
      repintar();
    };
    // ¿El ciclo aún no ha empezado? Entonces se elige por dónde empieza.
    const primerCiclo = p.ciclos.length === 1 && !ciclo.inicio && !hechos.size;

    // Por dónde empieza el primer ciclo: las mismas opciones que los
    // siguientes, más «No lo sé», que hace una prueba el primer día.
    function campoInicio() {
      const rm = rmDeReferencia(d, borrador)?.valor;
      const inicio = inicioDe(p, Boolean(rm));
      const recalcular = () => {
        const valor = inicio.modo === 'mismo' ? gen.inicial
          : !rm ? null
            : inicio.modo === 'reps' ? pesoParaReps(modeloDeEjercicio(d, borrador), rm, inicio.reps ?? 20, 0)
              : rm * ((inicio.porcentaje ?? d.perfil.bilboInicioPorcentaje ?? 50) / 100);
        if (valor != null) { gen.inicial = aPesoDisponible(borrador, valor); ciclo.escalera = escaleraDe(borrador, gen, p.diasPorCiclo); }
      };
      const fijar = (cambio) => { p.inicio = { ...inicio, ...cambio }; toca(); recalcular(); repintar(); };
      // Se recalcula cada vez: así cuenta el 1RM que acabas de escribir.
      recalcular();
      return h('div', { class: 'campo inicio-ciclo' },
        h('div', { class: 'titulo-con-ayuda' }, h('span', { class: 'etiqueta-campo' }, '¿Por dónde empieza?'),
          ayuda('Por dónde empieza', null, { lista: Object.values(MODOS_INICIO).map((m) => [m.etiqueta, m.descripcion]) })),
        selector(Object.entries(MODOS_INICIO).map(([k, m]) => [k, m.etiqueta]), inicio.modo, (m) => fijar({ modo: m }),
          { titulo: 'Por dónde empieza', lista: true }),
        inicio.modo === 'porcentaje' && campo('% de tu 1RM', numeroInput(inicio.porcentaje ?? d.perfil.bilboInicioPorcentaje ?? 50,
          (v) => { p.inicio = { ...inicio, porcentaje: v }; }, { onchange: () => { toca(); recalcular(); repintar(); } })),
        inicio.modo === 'reps' && campo(`Empezar haciendo (${uEsf})`, numeroInput(inicio.reps ?? 20,
          (v) => { p.inicio = { ...inicio, reps: v }; }, { onchange: () => { toca(); recalcular(); repintar(); } })),
        inicio.modo === 'mismo' && campo(`Empieza en (${unidad})`, numeroInput(gen.inicial,
          (v) => { gen.inicial = v ?? 0; toca(); }, { onchange: regenerar })),
        inicio.modo === 'prueba'
          ? h('small', { class: 'nota' }, 'El primer día: pon un peso con el que hagas de 3 a 10 repeticiones y haz todas las que puedas. Desde el día siguiente, la app te dice qué toca.')
          : inicio.modo !== 'mismo' && (rm
            ? h('small', { class: 'nota' }, `Con tu 1RM de ${formatearNumero(Math.round(rm))} kg, empieza en ${formatearNumero(gen.inicial)} ${unidad}.`)
            : h('small', { class: 'aviso-error-texto' }, 'Para esto hace falta tu 1RM: ponlo arriba o elige «No lo sé».')));
    }
    const toca = () => { p.preset = 'personalizado'; };
    const uEsf = unidadMedida(borrador, borrador.esfuerzo.tipo) || 'reps';
    const nEsf = TIPOS_ESFUERZO[borrador.esfuerzo.tipo]?.etiqueta.toLowerCase() ?? 'repeticiones';
    const conCarga = borrador.carga.tipo !== 'ninguna';
    // Qué sube. Se puede dejar todo sin marcar mientras editas: en vez de
    // encender otra cosa a la fuerza, sale un aviso en rojo y no deja guardar.
    const subeCarga = !p.sinMejora && sobre === 'carga';
    const subeEsfuerzo = !p.sinMejora && (sobre !== 'carga' || Boolean(gen.incrementoEsfuerzo));
    const tiempo = borrador.esfuerzo.tipo === 'tiempo';
    const fijarMejora = (peso, rep) => {
      if (!peso && !rep) { p.sinMejora = true; toca(); repintar(); return; }
      p.sinMejora = false;
      if (peso) {
        if (p.sobre !== 'carga') { p.sobre = 'carga'; gen.inicial = inicioBilbo() ?? 20; gen.incremento = 2.5; }
        if (rep) { gen.incrementoEsfuerzo ??= tiempo ? 10 : 1; gen.inicialEsfuerzo ??= tiempo ? 30 : 8; } else gen.incrementoEsfuerzo = null;
      } else {
        if (p.sobre !== 'esfuerzo') { p.sobre = 'esfuerzo'; gen.inicial = tiempo ? 30 : 10; gen.incremento = tiempo ? 10 : 1; }
        gen.incrementoEsfuerzo = null;
      }
      toca(); regenerar();
    };

    // Un botón que se queda marcado, con su número al lado. Si lo apagas, el
    // número se borra y la app deja de mirar esa condición.
    const condicion = (marcada, etiqueta, valor, alCambiar, porDefecto, unidadTexto) => h('div', { class: 'condicion' },
      h('button', { type: 'button', class: `boton-marca ${marcada ? 'activo' : ''}`, 'aria-pressed': String(marcada),
        onclick: () => { alCambiar(marcada ? null : (valor ?? porDefecto)); toca(); repintar(); } }, etiqueta),
      marcada && h('span', { class: 'condicion-valor' },
        numeroInput(valor, (v) => { alCambiar(v); toca(); }, { etiqueta }),
        h('small', {}, unidadTexto)));

    const resumenMejora = () => {
      if (p.sinMejora) return 'nada marcado';
      const partes = [];
      if (subeCarga) partes.push(`${borrador.carga.tipo === 'altura' ? 'distancia/altura' : 'peso'} +${formatearNumero(gen.incremento ?? 0)} ${unidad}`);
      if (subeEsfuerzo) partes.push(subeCarga ? `${nEsf} +${formatearNumero(gen.incrementoEsfuerzo ?? 0)}` : `${nEsf} +${formatearNumero(gen.incremento ?? 0)}`);
      for (const [m, x] of Object.entries(gen.extras ?? {})) if (x) partes.push(`${TIPOS_ESFUERZO[m]?.etiqueta.toLowerCase() ?? m} +${formatearNumero(x.incremento ?? 0)}`);
      return partes.join(' · ');
    };
    const resumenCorte = () => {
      const c = p.corte;
      const partes = [];
      if (c.esfuerzoMin != null) partes.push(`solo ${c.esfuerzoMin} ${uEsf}`);
      if (c.esfuerzoMax != null) partes.push(`llegar a ${c.esfuerzoMax} ${uEsf}`);
      if (c.cargaMax != null) partes.push(`${formatearNumero(c.cargaMax)} ${unidad}`);
      if (c.rmPct != null) partes.push(`${c.rmPct} % del 1RM`);
      partes.push(`tope ${p.diasPorCiclo} sesiones`);
      return partes.join(' · ');
    };

    // Cuántas condiciones de corte hay marcadas (el tope de sesiones no cuenta:
    // ese va siempre).
    const cuantasMarcadas = () => [p.corte.esfuerzoMin, p.corte.esfuerzoMax, p.corte.cargaMax, p.corte.rmPct]
      .filter((x) => x != null).length;

    const opcionesCuantas = () => {
      const n = cuantasMarcadas();
      const lista = { 1: { etiqueta: 'La primera que pase' } };
      for (let k = 2; k < n; k++) lista[k] = { etiqueta: `Cuando pasen ${k}` };
      lista.todas = { etiqueta: 'Todas a la vez' };
      return lista;
    };

    // Una fila de «qué mejoras»: el botón que se queda marcado y, debajo, sus
    // números. Vale para el peso, para la medida principal y para las demás.
    const filaMejora = ({ clave, etiqueta, activa, bloqueada = false, alternar, campos }) => h('div', { class: 'mejora' },
      h('button', { type: 'button', class: `boton-marca ${activa ? 'activo' : ''}`, 'aria-pressed': String(activa),
        disabled: bloqueada, 'data-mejora': clave,
        onclick: () => alternar(!activa) }, etiqueta),
      campos && h('div', { class: 'fila-campos' }, campos.map(([et, valor, alCambiar, onchange]) => campo(et,
        numeroInput(valor, alCambiar, onchange ? { onchange } : {})))));

    return h('div', { class: 'bilbo' },
      // 1 · Qué mejora -----------------------------------------------------
      // Una fila por cada cosa que mide el ejercicio: el peso y cada medida
      // que hayas marcado arriba. Marcas las que quieras que suban.
      bloque('¿Qué mejoras cada sesión?', resumenMejora(),
        ayuda('Qué mejoras cada sesión', [
          'Marca lo que quieres que suba sesión a sesión: el peso, las repeticiones, o las dos cosas a la vez.',
          'Si solo sube el peso, tu meta es hacer todas las repeticiones que puedas; la app te dice cuántas igualarían el día anterior.',
          'Si sube también la repetición, mandas tú: cada sesión pide más peso y más repeticiones.',
          'Si solo suben las repeticiones (peso a 0), el peso se queda y cada sesión pide una más.',
          'Repeticiones por fases: cada fase pide sus repeticiones durante tantas sesiones (15, luego 10, luego 5, como el HST). '
            + 'Se cuentan sesiones de este ejercicio, no semanas; al acabar la última se vuelve a la primera.',
          'Si el ejercicio apunta también tiempo o distancia, cada una tiene su fila y su objetivo del día.']),
        pista('ficha-mejora', 'Marca lo que quieres que suba sesión a sesión: el peso, las repeticiones, o las dos cosas a la vez.', { siempre: true }),
        p.sinMejora && h('p', { class: 'aviso-error-texto' }, 'Marca al menos una cosa que mejore.'),
        conCarga && filaMejora({
          clave: 'carga',
          etiqueta: `${borrador.carga.tipo === 'altura' ? 'La distancia/altura' : 'El peso'} (${unidadMedida(borrador, borrador.carga.tipo) || 'kg'})`,
          activa: subeCarga,
          alternar: (marcada) => fijarMejora(marcada, subeEsfuerzo),
          campos: subeCarga ? [
            ...(primerCiclo ? [] : [[`Empieza en (${unidad})`, gen.inicial, (v) => { gen.inicial = v ?? 0; toca(); }, regenerar]]),
            [`Sube (${unidad})`, gen.incremento, (v) => { gen.incremento = v ?? 0; toca(); }, regenerar],
            ['Cada (sesiones)', gen.cada, (v) => { gen.cada = Math.max(1, Math.round(v ?? 1)); toca(); }, regenerar],
          ] : null,
        }),
        subeCarga && primerCiclo && campoInicio(),
        // La medida principal: si no sube el peso, es ella la que hace la
        // escalera; si sube el peso, puede subir además con sus números.
        filaMejora({
          clave: 'principal',
          etiqueta: `${nEsf.charAt(0).toUpperCase()}${nEsf.slice(1)} (${uEsf})`,
          activa: subeEsfuerzo,
          alternar: (marcada) => fijarMejora(conCarga && subeCarga, marcada),
          campos: !subeCarga ? [
            [`Empieza en (${uEsf})`, gen.inicial, (v) => { gen.inicial = v ?? 0; toca(); }, regenerar],
            [`Sube (${uEsf})`, gen.incremento, (v) => { gen.incremento = v ?? 0; toca(); }, regenerar],
            ['Cada (sesiones)', gen.cada, (v) => { gen.cada = Math.max(1, Math.round(v ?? 1)); toca(); }, regenerar],
          ] : subeEsfuerzo ? [
            [`Empiezan en (${uEsf})`, gen.inicialEsfuerzo ?? 8, (v) => { gen.inicialEsfuerzo = v; toca(); }],
            [`Suben (${uEsf})`, gen.incrementoEsfuerzo, (v) => { gen.incrementoEsfuerzo = v; toca(); }],
          ] : null,
        }),
        // Repeticiones por fases: en vez de igualar el día anterior, cada fase
        // pide sus repeticiones durante tantas sesiones (15, 10 y 5, como el HST).
        subeCarga && borrador.esfuerzo.tipo === 'repeticiones' && h('div', { class: 'mejora' },
          h('button', { type: 'button', class: `boton-marca ${gen.fases?.length ? 'activo' : ''}`, 'aria-pressed': String(Boolean(gen.fases?.length)),
            onclick: () => {
              gen.fases = gen.fases?.length ? null : [{ reps: 15, sesiones: 6 }, { reps: 10, sesiones: 6 }, { reps: 5, sesiones: 6 }];
              if (gen.fases) gen.incrementoEsfuerzo = null;
              toca(); repintar();
            } }, 'Repeticiones por fases (por ejemplo 15, luego 10, luego 5)'),
          gen.fases?.length > 0 && h('div', { class: 'fases' },
            gen.fases.map((f, k) => h('div', { class: 'fila-campos fase' },
              campo(`Fase ${k + 1}: repeticiones`, numeroInput(f.reps, (v) => { f.reps = v; toca(); })),
              campo('Durante (sesiones)', numeroInput(f.sesiones, (v) => { f.sesiones = Math.max(1, Math.round(v ?? 1)); toca(); })),
              gen.fases.length > 1 && h('button', { type: 'button', class: 'boton-icono', 'aria-label': `Quitar la fase ${k + 1}`,
                onclick: () => { gen.fases.splice(k, 1); toca(); repintar(); } }, '✕'))),
            h('button', { type: 'button', class: 'boton enlace', onclick: () => {
              const ultima = gen.fases.at(-1);
              gen.fases.push({ reps: Math.max(1, (ultima?.reps ?? 10) - 2), sesiones: ultima?.sesiones ?? 6 });
              toca(); repintar();
            } }, '+ Fase'),
            )),

        // Las demás medidas del ejercicio (distancia, tiempo…): su objetivo
        // también puede subir sesión a sesión.
        medidasDe(borrador).slice(1).map((medida) => {
          gen.extras ??= {};
          const x = gen.extras[medida];
          const u = unidadMedida(borrador, medida);
          return filaMejora({
            clave: medida,
            etiqueta: `${TIPOS_ESFUERZO[medida]?.etiqueta ?? medida} (${u})`,
            activa: Boolean(x),
            alternar: (marcada) => {
              gen.extras[medida] = marcada ? { inicial: medida === 'tiempo' ? 60 : 1, incremento: medida === 'tiempo' ? 10 : 0.5 } : null;
              toca(); repintar();
            },
            campos: x ? [
              [`Empieza en (${u})`, x.inicial, (v) => { x.inicial = v; toca(); }],
              [`Sube (${u})`, x.incremento, (v) => { x.incremento = v; toca(); }],
            ] : null,
          });
        }),
      ),

      // 2 · Cuándo se acaba -------------------------------------------------
      bloque('¿Cuándo se acaba el ciclo?', resumenCorte(),
        ayuda('Cuándo se acaba el ciclo', [
          'Marca las condiciones que quieras. Con dos o más, eliges si basta con la primera que pase, con varias o con todas a la vez.',
          '«Mínimo»: el peso ha subido tanto que ya no llegas a esas repeticiones; es lo de Bilbo.',
          '«Máximo»: llegas a esas repeticiones, así que ya es demasiado fácil.',
          'El tope de sesiones va aparte y siempre manda: sin él, un ciclo podría no acabarse nunca.']),
        subeCarga && condicion(p.corte.esfuerzoMin != null, `Mínimo: cuando ya no llegas a`,
          p.corte.esfuerzoMin, (v) => { p.corte.esfuerzoMin = v; }, 15, uEsf),
        condicion(p.corte.esfuerzoMax != null, `Máximo: cuando llegas a`,
          p.corte.esfuerzoMax, (v) => { p.corte.esfuerzoMax = v; }, 20, uEsf),
        subeCarga && condicion(p.corte.cargaMax != null, 'Cuando el peso llega a',
          p.corte.cargaMax, (v) => { p.corte.cargaMax = v; },
          aPesoDisponible(borrador, (gen.inicial ?? 20) + (gen.incremento ?? 2.5) * Math.min(10, p.diasPorCiclo)), unidad),
        subeCarga && condicion(p.corte.rmPct != null, 'Cuando el peso pasa de este % de tu 1RM',
          p.corte.rmPct, (v) => { p.corte.rmPct = v; }, 90, '%'),
        cuantasMarcadas() > 1 && h('div', { class: 'campo' },
          h('span', { class: 'etiqueta-campo' }, 'Se acaba con'),
          opciones(opcionesCuantas(), String(p.corte.cuantas ?? 1),
            (v) => { p.corte.cuantas = v === 'todas' ? 'todas' : Number(v); toca(); repintar(); }, { compacto: true })),
        h('div', { class: 'condicion' },
          h('span', {}, 'Como muy tarde, a las'),
          h('span', { class: 'condicion-valor' },
            numeroInput(p.diasPorCiclo, (v) => { p.diasPorCiclo = Math.max(1, Math.round(v ?? 17)); toca(); }, { onchange: regenerar, etiqueta: 'Sesiones como mucho' }),
            h('small', {}, 'sesiones')))),

      // 3 · Por dónde empieza el siguiente ----------------------------------
      bloque('¿Por dónde empieza el siguiente?', MODOS_REINICIO[p.reinicio.modo]?.etiqueta ?? '',
        ayuda('Por dónde empieza el siguiente ciclo', null, { lista: Object.values(MODOS_REINICIO).map((m) => [m.etiqueta, m.descripcion]) }),
        opciones(subeCarga
          ? Object.fromEntries(Object.entries(MODOS_REINICIO).filter(([k, m]) => !m.antiguo || k === p.reinicio.modo))
          : { mismo: MODOS_REINICIO.mismo, manual: MODOS_REINICIO.manual }, p.reinicio.modo,
          (m) => { p.reinicio.modo = m; toca(); repintar(); }, { compacto: true }),
        ['porcentaje', 'ultimo', 'rm-ciclo'].includes(p.reinicio.modo)
          && campo('Porcentaje', numeroInput(p.reinicio.porcentaje ?? (p.reinicio.modo === 'ultimo' ? 90 : 50),
            (v) => { p.reinicio.porcentaje = v; toca(); })),
        p.reinicio.modo === 'reps' && campo(`Empezar haciendo (${uEsf})`,
          numeroInput(p.reinicio.reps ?? 20, (v) => { p.reinicio.reps = v; toca(); }))),

      h('p', { class: 'nota resumen-ciclo' }, `En resumen: ${describirCiclo(p, subeCarga ? unidad : uEsf, nEsf)}`),
      h('p', { class: 'nota' }, `Ciclo ${ciclo.n} · ${hechos.size} de ${ciclo.escalera.length} sesiones`),
      h('div', { class: 'barra-progreso', role: 'img',
        'aria-label': `${hechos.size} de ${ciclo.escalera.length} días hechos` },
      h('span', { style: `width:${(hechos.size / ciclo.escalera.length) * 100}%` })),

      h('details', { class: 'explicacion' },
        h('summary', {}, `Las ${ciclo.escalera.length} sesiones del ciclo, una a una`),
        h('div', { class: 'escalera' },
          ciclo.escalera.map((valor, i) => {
            const hecho = hechos.get(i + 1);
            const esActual = !hecho && hechos.size === i;
            return h('label', { class: `peldano ${hecho ? 'hecho' : ''} ${esActual ? 'actual' : ''}` },
              h('span', {}, `Día ${i + 1}`),
              numeroInput(valor, (v) => { ciclo.escalera[i] = v; }, { etiqueta: `Valor del día ${i + 1}` }),
              hecho
                ? h('small', { class: 'suave' }, `✓ ${formatearNumero(hecho.serie.esfuerzo)}`)
                : asistida && peso != null && h('small', { class: 'suave' }, `máq ${formatearNumero(lecturaDesdeCarga(valor, peso))}`));
          }))),

      h('div', { class: 'fila-botones' },
        p.ciclos.length > 1 && selector(p.ciclos.map((c) => [c.n, `Ciclo ${c.n}`]), p.cicloActual,
          (n) => { p.cicloActual = n; repintar(); }, { titulo: 'Ciclo mostrado', compacto: true }),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => { alargarCiclo(borrador, plan, 5); repintar(); aviso('Ciclo alargado 5 sesiones.'); } }, '+5 sesiones'),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => nuevoCiclo(plan) }, 'Cortar y empezar otro')));
  }

  // Peso de arranque de un ciclo Bilbo: un porcentaje de tu mejor 1RM
  // estimado en este ejercicio (el de Ajustes; 50 % por defecto).
  function inicioBilbo() {
    // Con el borrador y no con lo guardado: así cuenta el 1RM que acabas de escribir.
    const rm = rmDeReferencia(d, borrador)?.valor;
    return rm ? aPesoDisponible(borrador, (rm * (d.perfil.bilboInicioPorcentaje ?? 50)) / 100) : null;
  }

  function nuevoCiclo(plan) {
    // Nada de esto es definitivo hasta que guardas la ficha, y además se
    // puede deshacer desde el propio aviso.
    const antes = JSON.stringify(plan.progresion);
    const ciclo = empezarCicloNuevo(d, existente ?? borrador, plan);
    aviso(`Ciclo ${ciclo.n} preparado, empezando en ${formatearNumero(ciclo.generador.inicial)}. Revísalo si quieres.`,
      { accion: { texto: 'Deshacer', fn: () => { plan.progresion = JSON.parse(antes); repintar(); aviso('Ciclo cortado deshecho.'); } } });
    repintar();
  }

  function guardar() {
    borrador.nombre = borrador.nombre.trim();
    if (!borrador.nombre) { aviso('Ponle un nombre al ejercicio', { tipo: 'error' }); return; }
    if (borrador.series.some((s) => s.progresion?.sinMejora)) {
      aviso('En «¿Qué mejoras cada sesión?» no hay nada marcado: marca al menos una cosa.', { tipo: 'error' });
      return;
    }
    // Se permiten nombres repetidos a propósito: «Flexiones» de repeticiones y
    // «Flexiones» isométricas son dos ejercicios distintos para la app.
    const repetido = d.ejercicios.some((e) => e.id !== borrador.id && !e.archivado
      && e.nombre.toLowerCase() === borrador.nombre.toLowerCase());
    if (repetido) aviso('Ojo: ya tenías otro ejercicio con ese nombre', { ms: 5000 });

    persistir();
    if (!existente) { borradorNuevo = null; pasoFicha.delete('nuevo'); abiertosFicha.delete('nuevo'); }
    if (paraSesion) {
      // Creado desde el entrenamiento: se añade a él y se vuelve allí.
      estado.cambiar((datos) => {
        const sesion = datos.sesiones.find((s) => s.id === paraSesion);
        const ej = datos.ejercicios.find((e) => e.id === borrador.id);
        if (sesion && ej && !sesion.ejercicios.some((x) => x.ejercicioId === ej.id)) {
          sesion.ejercicios.push(entradaDeEjercicio(datos, ej, { excluirSesion: paraSesion }));
        }
      });
      aviso(`${borrador.nombre} guardado y añadido al entrenamiento`);
      location.hash = `#/sesion/${paraSesion}`;
      return;
    }
    estado.emitir('datos');
    location.hash = '#/ejercicios';
  }

  // Un ejercicio nuevo que se descarta se quita, aunque ya se hubiera
  // guardado solo al ponerle nombre.
  function descartar() {
    if (!existente) borradorNuevo = null;
    if (creado) estado.cambiar((datos) => { datos.ejercicios = datos.ejercicios.filter((e) => e.id !== borrador.id); });
    location.hash = paraSesion ? `#/sesion/${paraSesion}` : '#/ejercicios';
  }

  // Separar por sitio: se eligen en cuáles. Los sitios que no marques siguen
  // usando el ejercicio original (así las flexiones del gimnasio y las de
  // casa pueden seguir siendo el mismo ejercicio).
  function separar() {
    const sedes = sedesActivas(d);
    const marcadas = new Set(sedes.map((s) => s.id));
    const cerrar = modal('Separar por sitio', h('div', { class: 'formulario' },
      h('p', {}, `«${existente.nombre}» pasará a ser un ejercicio distinto en cada sitio que marques. Cada entrenamiento pasado se `
        + 'queda con el del sitio donde se hizo, y las rutinas de un sitio usarán el suyo. Los sitios sin marcar siguen con el original.'),
      sedes.map((s) => h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: true, onchange: (e) => { if (e.target.checked) marcadas.add(s.id); else marcadas.delete(s.id); } }),
        nombreSede(d, s.id))),
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton secundario', onclick: () => cerrar() }, 'Cancelar'),
        h('button', { class: 'boton', onclick: () => {
          if (marcadas.size < 2) { aviso('Marca al menos dos sitios', { tipo: 'error' }); return; }
          let n = 0;
          estado.cambiar((datos) => { n = separarPorSede(datos, existente.id, [...marcadas]); });
          cerrar();
          aviso(`Separado en ${n} ejercicios, uno por sitio.`);
          location.hash = '#/ejercicios';
        } }, 'Separar'))));
  }

  // El mismo movimiento hecho con máquina y con mancuernas no es el mismo
  // ejercicio: los pesos no se parecen y el 1RM sale mal si se mezclan. Esto
  // crea la variante con la misma ficha y, si quieres, se lleva los
  // entrenamientos desde una fecha (la app no puede adivinar con qué hiciste
  // cada serie, así que la fecha la pones tú).
  function partirEnVariante() {
    const campoNombre = h('input', { type: 'text', value: `${existente.nombre} (variante)`, autocomplete: 'off',
      'aria-label': 'Nombre de la variante' });
    const campoDesde = h('input', { type: 'date', value: '', 'aria-label': 'Llevarse los entrenamientos desde' });
    const cerrar = modal('Partir en dos', h('div', { class: 'formulario' },
      h('p', {}, `Se crea un ejercicio nuevo con la misma ficha que «${existente.nombre}»: mismos músculos, mismas series y `
        + 'mismas reglas. Luego le cambias lo que haga falta (la carga, los pesos de la máquina…).'),
      campo('Nombre de la variante', campoNombre),
      campo('Llevarse los entrenamientos desde (opcional)', campoDesde,
        h('small', { class: 'nota' }, 'Si a partir de una fecha ya hacías la variante, ponla aquí y esos entrenamientos pasan al nuevo. '
          + 'En blanco, el historial se queda entero en el original y la variante empieza limpia.')),
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton secundario', onclick: () => cerrar() }, 'Cancelar'),
        h('button', { class: 'boton', onclick: () => {
          const nombre = campoNombre.value.trim();
          if (!nombre) { aviso('Ponle nombre a la variante', { tipo: 'error' }); return; }
          const desde = campoDesde.value || null;
          let movidas = 0;
          const nuevoIdEj = nuevoId('ej');
          estado.cambiar((datos) => {
            const base = datos.ejercicios.find((x) => x.id === existente.id);
            const copia = structuredClone(base);
            copia.id = nuevoIdEj;
            copia.nombre = nombre;
            copia.borrado = null;
            copia.archivado = false;
            // Series nuevas: si compartieran identificador, los dos ejercicios
            // se pisarían los ciclos y el historial.
            copia.series = (copia.series || []).map((s) => ({ ...structuredClone(s), id: `pl_${Math.random().toString(36).slice(2, 9)}` }));
            datos.ejercicios.push(copia);
            if (!desde) return;
            for (const s of datos.sesiones) {
              if (s.borrada || s.fecha < desde) continue;
              for (const e of s.ejercicios) {
                if (e.ejercicioId !== base.id) continue;
                e.ejercicioId = nuevoIdEj;
                for (const serie of e.series) serie.planId = null;
                movidas += 1;
              }
            }
          });
          cerrar();
          aviso(desde
            ? `«${nombre}» creado, con ${movidas} ${movidas === 1 ? 'entrenamiento' : 'entrenamientos'} desde el ${desde}.`
            : `«${nombre}» creado, con la misma ficha y sin historial.`);
          location.hash = `#/ejercicio/${nuevoIdEj}`;
        } }, 'Partir'))));
  }

  // Borrar: desaparece de todas las listas, pero los entrenamientos pasados
  // conservan sus series. Se recupera desde Ajustes.
  async function borrarEjercicio() {
    const usado = d.sesiones.some((s) => s.ejercicios.some((x) => x.ejercicioId === borrador.id));
    const si = await confirmarEscribiendo(usado
      ? `¿Borrar «${borrador.nombre}»? Desaparece de tus listas y rutinas; los entrenamientos pasados conservan sus series. Se puede recuperar en Ajustes.`
      : `¿Borrar «${borrador.nombre}»? No tiene historial, así que se elimina del todo.`, 'borrar');
    if (!si) return;
    estado.cambiar((datos) => {
      if (!usado) { datos.ejercicios = datos.ejercicios.filter((e) => e.id !== borrador.id); return; }
      const e = datos.ejercicios.find((x) => x.id === borrador.id);
      if (e) { e.archivado = true; e.borrado = hoyISO(); }
      for (const r of datos.rutinas) for (const dia of r.dias) dia.ejercicios = dia.ejercicios.filter((x) => x.ejercicioId !== borrador.id);
    });
    aviso(usado ? 'Ejercicio borrado. Se puede recuperar en Ajustes.' : 'Ejercicio eliminado.');
    location.hash = '#/ejercicios';
  }

  async function archivar() {
    const archivarlo = !borrador.archivado;
    if (archivarlo && !await confirmar('¿Archivar este ejercicio? Su historial se conserva y puedes recuperarlo cuando quieras.', { si: 'Archivar' })) return;
    estado.cambiar((datos) => {
      const e = datos.ejercicios.find((x) => x.id === borrador.id);
      if (e) e.archivado = archivarlo;
    });
    location.hash = '#/ejercicios';
  }

  repintar();
}

// ---------------------------------------------------------------------------
// Piezas de formulario, reutilizadas por otras pantallas
// ---------------------------------------------------------------------------

export function campo(etiqueta, ...control) {
  // Solo es <label> si envuelve una casilla de texto: con botones dentro, tocar
  // el título pulsaría el primero.
  const conCasilla = control.some((c) => c instanceof HTMLElement && c.matches('input, textarea'));
  return h(conCasilla ? 'label' : 'div', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, etiqueta), ...control);
}

export function numeroInput(valor, alCambiar, { onchange, etiqueta } = {}) {
  return h('input', {
    type: 'text', inputmode: 'decimal', value: valor ?? '', 'aria-label': etiqueta,
    oninput: (e) => alCambiar(leerNumero(e.target.value)),
    onchange,
  });
}

export function opciones(catalogo, actual, alElegir, { compacto = false } = {}) {
  return h('div', { class: `opciones ${compacto ? 'compacto' : ''}`, role: 'radiogroup' },
    Object.entries(catalogo).map(([clave, info]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(clave === actual),
      class: `opcion ${clave === actual ? 'elegida' : ''}`,
      onclick: () => alElegir(clave),
    },
    h('strong', {}, info.etiqueta),
    !compacto && info.descripcion && h('small', {}, info.descripcion))));
}

// Las explicaciones de la fórmula, cada una en su desplegable.
export function explicaciones1RM() {
  return h('div', { class: 'explicaciones' }, EXPLICACIONES_1RM.map((x) => h('details', { class: 'explicacion' },
    h('summary', {}, x.titulo),
    h('p', {}, x.texto))));
}
