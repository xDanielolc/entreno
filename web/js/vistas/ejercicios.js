import {
  aPesoDisponible, cicloActual, formatearNumero, generarEscalera, lecturaDesdeCarga, pesosDeMaquina, registrosDelCiclo,
  rmDeReferencia, seriesDelPrograma,
} from '../calculos.js';
import * as estado from '../estado.js';
import {
  ASISTENCIAS, DIAS_CICLO_POR_DEFECTO, TECNICAS_ESTIRAMIENTO, TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_PROGRESION, TIPOS_SERIE,
  progresionPorDefecto, serieNuevaPlantilla, sobrePorDefecto, tramosDe,
} from '../esquema.js';
import { tramosPorDefecto } from '../calculos.js';
import { EXPLICACIONES_1RM, FORMULAS, calibrar, estimar1RM, modeloDe, textoCalibracion } from '../formula1rm.js';
import { FRACCION_CORPORAL_POR_NOMBRE, PROGRAMAS } from '../esquema.js';
import { MODOS_REINICIO, PRESETS_CICLO, alargarCiclo, aplicarPreset, completarCiclo, describirCiclo, empezarCicloNuevo, escaleraDe } from '../ciclos.js';
import { hoyISO } from '../ui.js';
import { CATALOGO, esMaquinaDePlacas, normalizar, tipoDeEjercicio } from '../catalogo.js';
import { ORDEN_MUSCULOS, nombreMusculo } from '../musculos.js';
import { entradaDeEjercicio } from '../series.js';
import { nombreSede, sedesActivas, separarPorSede } from '../sedes.js';
import { seccionProgreso } from './graficas.js';
import { imagenDe, textoCredito } from '../imagenes.js';
import { anadir, aviso, confirmar, h, leerNumero, modal, nuevoId } from '../ui.js';
import { pista } from './tutorial.js';
import { barraFiltros, cajaLista, elegirEjercicio, filtrar, tarjetaItem } from './selector-ejercicios.js';
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
    const lista = filtrar(d.ejercicios.filter((e) => !e.borrado && (verArchivados || !e.archivado)))
      .sort((a, b) => (a.grupo || '~').localeCompare(b.grupo || '~') || a.nombre.localeCompare(b.nombre));

    const grupos = new Map();
    for (const e of lista) {
      // «Empuje» y «empuje» son el mismo grupo.
      const g = (e.grupo || 'Sin grupo').trim().toLowerCase();
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(e);
    }

    zona.replaceChildren();
    if (!lista.length) {
      anadir(zona, h('p', { class: 'suave' }, d.ejercicios.length
        ? 'Ningún ejercicio coincide con los filtros.'
        : 'Crea tu primer ejercicio: eliges qué mide y cómo progresa cada una de sus series.'));
      return;
    }
    anadir(zona, [...grupos].map(([grupo, ejercicios]) => h('section', {},
      h('h2', {}, grupo.charAt(0).toUpperCase() + grupo.slice(1)),
      anadir(cajaLista(), ejercicios.map((e) => tarjetaEjercicio(d, e))))));
  }
  pintarLista();
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
  base.series = [serieNuevaPlantilla(base, { tipo: 'bilbo', progresion: 'bilbo' })];
  return base;
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
  const borrador = existente ? structuredClone(existente) : ejercicioVacio();
  borrador.series ??= [];
  borrador.musculos ??= { principales: [], secundarios: [] };
  const grupos = [...new Set([...GRUPOS, ...d.ejercicios.map((e) => e.grupo).filter(Boolean)])];
  const peso = d.perfil.pesoCorporalKg;
  let creado = Boolean(existente);

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
  anadir(contenedor,
    h('h1', {}, existente ? borrador.nombre || 'Editar ejercicio' : 'Nuevo ejercicio'),
    imagenFicha && h('figure', { class: 'imagen-ejercicio' },
      h('img', { src: imagenFicha.archivo, alt: `Ilustración de ${existente.nombre}`, loading: 'lazy' }),
      h('figcaption', { class: 'nota' }, textoCredito(imagenFicha))),
    existente && seccionProgreso(d, existente),
    zona);

  function repintar() {
    persistir();
    const scroll = window.scrollY;
    zona.replaceChildren(formulario());
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
    placas: { etiqueta: 'Máquina de placas o polea', descripcion: 'Los pesos van de placa en placa: la app solo propone pesos que existan.' },
    pesoCorporal: { etiqueta: 'Mi peso corporal', descripcion: 'Flexiones, dominadas, fondos. Apuntas solo el lastre, si llevas.' },
    asistida: { etiqueta: 'Máquina asistida', descripcion: 'La máquina te quita peso. Apuntas los kilos de ayuda.' },
    altura: { etiqueta: 'Altura o distancia de salto', descripcion: 'Saltos al cajón, pliometría, ladrillo del yoga. Apuntas centímetros.' },
    ninguna: { etiqueta: 'Sin peso', descripcion: 'Cardio, estiramientos, abdominales sin carga.' },
  };
  const MEDIDAS = {
    repeticiones: { etiqueta: 'Repeticiones', descripcion: 'Cuántas veces.' },
    tiempo: { etiqueta: 'Tiempo', descripcion: 'Segundos o minutos.' },
    distancia: { etiqueta: 'Distancia', descripcion: 'Kilómetros o metros.' },
    'tiempo-distancia': { etiqueta: 'Tiempo y distancia', descripcion: 'Los minutos y, si quieres, los kilómetros.' },
  };
  const cargaActual = () => (borrador.carga.tipo === 'peso' ? (borrador.maquinaPlacas ? 'placas' : 'libre') : borrador.carga.tipo);
  const medidaActual = () => (borrador.esfuerzo.tipo === 'tiempo' && borrador.esfuerzoExtra ? 'tiempo-distancia' : borrador.esfuerzo.tipo);

  function formulario() {
    const estira = ['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(borrador));
    return h('form', { class: 'formulario', onsubmit: (e) => { e.preventDefault(); guardar(); } },
      !existente && h('button', { type: 'button', class: 'boton secundario', onclick: elegirDelCatalogo },
        'Elegir de la lista de ejercicios'),
      campo('Nombre', h('input', { type: 'text', required: true, value: borrador.nombre, autocomplete: 'off',
        placeholder: 'Press banca', oninput: (e) => { borrador.nombre = e.target.value; } })),

      campoGrupo(),

      h('fieldset', {},
        h('legend', {}, '¿Con qué peso se hace?'),
        opciones(CARGAS, cargaActual(), (c) => {
          borrador.carga = { tipo: c === 'libre' || c === 'placas' ? 'peso' : c };
          borrador.maquinaPlacas = c === 'placas' || (c === 'asistida' && borrador.maquinaPlacas);
          for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
          repintar();
        }),
        borrador.maquinaPlacas && seccionPesosMaquina(),
        borrador.carga.tipo === 'asistida' && h('p', { class: 'nota' },
          peso ? `Apuntarás los kilos que marca la máquina; la carga real es tu peso (${formatearNumero(peso)} kg) menos esa ayuda.`
            : 'Indica tu peso corporal en Ajustes para calcular la carga real.'),
        borrador.carga.tipo === 'pesoCorporal' && campoFraccionCorporal()),

      h('fieldset', {},
        h('legend', {}, '¿Qué apuntas en cada serie?'),
        h('p', { class: 'nota' }, borrador.carga.tipo === 'ninguna' ? 'Además del peso no hay nada: solo esto.' : 'Además del peso.'),
        opciones(MEDIDAS, medidaActual(), (m) => {
          borrador.esfuerzo = { tipo: m === 'tiempo-distancia' ? 'tiempo' : m };
          borrador.esfuerzoExtra = m === 'tiempo-distancia' ? { tipo: 'distancia', opcional: true } : null;
          for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
          repintar();
        }, { compacto: true })),

      h('details', { class: 'tarjeta explicacion desplegable-musculos', open: !borrador.musculos.principales.length || undefined },
        h('summary', {}, borrador.musculos.principales.length
          ? `Músculos: ${borrador.musculos.principales.map((m) => nombreMusculo(m, { corto: true })).join(', ')}`
            + (borrador.musculos.secundarios.length ? ` (y ${borrador.musculos.secundarios.map((m) => nombreMusculo(m, { corto: true })).join(', ')})` : '')
          : '⚠ Músculos: sin marcar'),
        !borrador.musculos.principales.length && h('p', { class: 'aviso-texto' },
          'Sin músculo principal, este ejercicio no aparecerá en el mapa de recuperación ni en el volumen semanal.'),
        h('p', { class: 'nota' }, 'Sirve para el mapa de recuperación y para los avisos de volumen. Los secundarios cuentan la mitad.'),
        sugerenciaDelCatalogo(),
        selectorMusculos('Principales', borrador.musculos.principales, borrador.musculos.secundarios),
        selectorMusculos('Secundarios', borrador.musculos.secundarios, borrador.musculos.principales)),

      estira && h('fieldset', {},
        h('legend', {}, '¿Cómo lo haces normalmente?'),
        h('p', { class: 'nota' }, 'Sale así en cada serie; en el entrenamiento puedes cambiarlo ese día. Qué es cada técnica: en Aprender.'),
        campo('Técnica', h('select', { onchange: (e) => { borrador.estiramiento = { ...borrador.estiramiento, tecnica: e.target.value || null }; repintar(); } },
          h('option', { value: '' }, 'Sin indicar'),
          Object.entries(TECNICAS_ESTIRAMIENTO).map(([k, v]) => h('option', { value: k, selected: k === borrador.estiramiento?.tecnica }, v.etiqueta)))),
        borrador.estiramiento?.tecnica && h('small', { class: 'nota' }, TECNICAS_ESTIRAMIENTO[borrador.estiramiento.tecnica].descripcion),
        campo('Ayuda', h('select', { onchange: (e) => { borrador.estiramiento = { ...borrador.estiramiento, asistencia: e.target.value || null }; } },
          h('option', { value: '' }, 'Sin indicar'),
          Object.entries(ASISTENCIAS).map(([k, v]) => h('option', { value: k, selected: k === borrador.estiramiento?.asistencia }, v)))),
        h('small', { class: 'nota' }, 'Con «Apoyo con la mano» apuntas en cada serie en qué punto de la escala estás (surf, pulgar, puño, mano abierta, '
          + 'tres, dos y un dedo, sin mano). Para la altura del ladrillo, elige «Altura» en el peso.')),

      h('fieldset', {},
        h('legend', {}, '¿Cómo te lleva la app?'),
        h('p', { class: 'nota' }, borrador.series.length > 1
          ? 'Cada serie de abajo aparece al añadir el ejercicio a un entrenamiento, y cada una sigue su regla.'
          : 'Cada vez que entrenes, la app te dice el peso y las repeticiones según esta regla. Tú solo apuntas.'),
        borrador.series.map((plan, i) => tarjetaPlan(plan, i)),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => {
          borrador.series.push(serieNuevaPlantilla(borrador, { tipo: 'libre' }));
          repintar();
        } }, '+ Otra serie con otra regla'),
        h('small', { class: 'nota' },
          'Solo hace falta más de una si el ejercicio lleva de verdad series distintas: por ejemplo, una Bilbo y después una con drop set.')),

      h('details', { class: 'tarjeta explicacion' },
        h('summary', {}, 'Ajustes finos'),
        sedesActivas(d).length > 0 && campo('Dónde se hace', h('select', {
          onchange: (e) => { borrador.sedeId = e.target.value || null; repintar(); } },
        h('option', { value: '' }, 'Igual en todos los sitios'),
        sedesActivas(d).map((s) => h('option', { value: s.id, selected: s.id === borrador.sedeId }, `Solo en ${nombreSede(d, s.id)}`))),
        h('small', { class: 'nota' }, 'Si una máquina no pesa igual en dos gimnasios, cada uno debe llevar su propio ejercicio.'),
        existente && !existente.sedeId && sedesActivas(d).length > 1 && h('button', { type: 'button', class: 'boton enlace',
          onclick: separar }, 'Separar en un ejercicio por sitio (reparte su historial)')),
        borrador.carga.tipo !== 'ninguna' && seccionFormula(),
        campo('Notas', h('textarea', { rows: 3, value: borrador.notas || '',
          oninput: (e) => { borrador.notas = e.target.value; } }))),

      h('p', { class: 'nota centrado' }, existente || creado
        ? 'Los cambios se guardan solos.'
        : 'En cuanto le pongas nombre, se guarda solo.'),
      h('div', { class: 'fila-botones' },
        !existente && h('button', { type: 'button', class: 'boton secundario', onclick: descartar }, 'Descartar'),
        h('button', { class: 'boton', type: 'submit' }, 'Listo')),

      existente && h('button', { type: 'button', class: 'boton enlace', onclick: archivar },
        borrador.archivado ? 'Recuperar ejercicio' : 'Archivar ejercicio'),
      existente && h('button', { type: 'button', class: 'boton enlace peligro-texto', onclick: borrarEjercicio }, 'Borrar ejercicio'));
  }

  // Máquina con sus pesos: la app solo propone pesos que existen (drop sets,
  // subidas de la doble progresión, ciclos). Se generan de golpe y se pueden
  // copiar de otro ejercicio de la misma máquina.
  function seccionPesosMaquina() {
    const pesos = borrador.pesosMaquina ?? [];
    const gen = { desde: pesos[0] ?? 5, hasta: pesos.at(-1) ?? 100, paso: pesos.length > 1 ? pesos[1] - pesos[0] : 5 };
    const otros = d.ejercicios.filter((e) => e.id !== borrador.id && !e.archivado && e.pesosMaquina?.length);
    const nuevo = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Añadir un peso (kg)', 'aria-label': 'Añadir un peso' });
    return h('div', { class: 'campo pesos-maquina' },
      h('span', { class: 'etiqueta-campo' }, 'Pesos de la máquina'),
      pesos.length
        ? h('div', { class: 'tecnicas' }, pesos.map((p) => h('span', { class: 'chip' }, formatearNumero(p),
          h('button', { type: 'button', class: 'chip-quitar', 'aria-label': `Quitar ${p} kg`,
            onclick: () => { borrador.pesosMaquina = pesos.filter((x) => x !== p); repintar(); } }, '✕'))))
        : h('p', { class: 'nota' }, 'Sin pesos: la app redondeará a 2,5 kg. Mete los de la máquina para que solo te proponga pesos que existan.'),
      h('div', { class: 'fila-campos' },
        campo('Del primero', numeroInput(gen.desde, (v) => { gen.desde = v; })),
        campo('Al último', numeroInput(gen.hasta, (v) => { gen.hasta = v; })),
        campo('De … en …', numeroInput(gen.paso, (v) => { gen.paso = v; }))),
      h('div', { class: 'fila-botones' },
        h('button', { type: 'button', class: 'boton secundario', onclick: () => {
          const lista = pesosDeMaquina(gen.desde, gen.hasta, gen.paso);
          if (!lista.length) { aviso('Revisa los tres números', { tipo: 'error' }); return; }
          borrador.pesosMaquina = [...new Set([...lista])].sort((a, b) => a - b);
          repintar();
        } }, 'Generar la lista'),
        h('label', { class: 'campo crece' }, nuevo,
          h('button', { type: 'button', class: 'boton enlace', onclick: () => {
            const v = leerNumero(nuevo.value);
            if (v == null) return;
            borrador.pesosMaquina = [...new Set([...pesos, v])].sort((a, b) => a - b);
            repintar();
          } }, '+ Añadir'))),
      otros.length > 0 && h('select', { 'aria-label': 'Copiar los pesos de otro ejercicio', onchange: (e) => {
        const elegido = otros[Number(e.target.value)];
        if (!elegido) return;
        borrador.pesosMaquina = [...elegido.pesosMaquina];
        repintar();
        aviso(`Pesos de ${elegido.nombre} copiados.`);
      } },
      h('option', { value: '' }, 'Copiar los pesos de otro ejercicio de la misma máquina…'),
      otros.map((o, i) => h('option', { value: i }, `${o.nombre}: ${o.pesosMaquina.length} pesos (${formatearNumero(o.pesosMaquina[0])} a ${formatearNumero(o.pesosMaquina.at(-1))} kg)`))),
      pesos.length > 0 && h('small', { class: 'nota' }, `${pesos.length} pesos, de ${formatearNumero(pesos[0])} a ${formatearNumero(pesos.at(-1))} kg. `
        + 'Los drop sets, las subidas y los ciclos usarán solo estos.'));
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
        ? `Con tu peso (${formatearNumero(peso)} kg) la carga de cada serie sale sola: ${formatearNumero(Math.round(peso * borrador.fraccionCorporal))} kg, `
          + 'más el lastre que apuntes. En flexiones normales es un 64 % (Ebben 2011); con rodillas, 49 %; con los pies en alto, 74 %. '
          + 'En dominadas o fondos, el 100 %.'
        : 'Pon tu peso corporal en Ajustes para que la carga salga sola.'));
  }

  // Grupo: un desplegable con los habituales y los tuyos, más «Otro…» para
  // escribir uno nuevo.
  function campoGrupo() {
    const actual = borrador.grupo || '';
    const enLista = !actual || grupos.includes(actual);
    const texto = h('input', { type: 'text', value: enLista ? '' : actual, placeholder: 'Nombre del grupo',
      hidden: enLista, oninput: (e) => { borrador.grupo = e.target.value.trim(); } });
    const select = h('select', { onchange: (e) => {
      if (e.target.value === '__otro') { texto.hidden = false; texto.focus(); return; }
      texto.hidden = true;
      borrador.grupo = e.target.value;
      persistir();
    } },
    h('option', { value: '', selected: !actual }, 'Sin grupo'),
    grupos.map((g) => h('option', { value: g, selected: g === actual }, g.charAt(0).toUpperCase() + g.slice(1))),
    h('option', { value: '__otro', selected: !enLista }, 'Otro…'));
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Grupo'),
      select, texto,
      h('small', { class: 'nota' }, 'Ordena la lista de ejercicios y sirve para los filtros (empuje, tirón, pierna…).'));
  }

  // Qué fórmula estima el 1RM y, si es la personal, cómo va su calibración.
  function seccionFormula() {
    borrador.formula1RM ??= 'personal';
    const estadoCalibracion = existente && borrador.formula1RM === 'personal' ? calibrar(d, existente) : null;
    const modelo = existente ? modeloDe(d, { ...existente, formula1RM: borrador.formula1RM }) : null;
    if (borrador.formula1RM === 'epley') borrador.formula1RM = 'personal';
    const explicacion = estadoCalibracion ? textoCalibracion(estadoCalibracion) : null;
    const ejemplo = modelo && [[60, 20], [80, 8]].map(([p, r]) => `${p} kg × ${r} ≈ ${Math.round(estimar1RM(modelo, p, r, 1))} kg`).join(' · ');
    return h('fieldset', {},
      h('legend', {}, 'Fórmula del 1RM'),
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
  function progresionesPara() {
    const conCarga = borrador.carga.tipo !== 'ninguna';
    const reps = borrador.esfuerzo.tipo === 'repeticiones';
    const lista = {};
    if (conCarga && reps) lista.carga = { etiqueta: 'Que decida la app (doble progresión)', descripcion: 'Entre 8 y 12 repeticiones: subes repeticiones y, al llegar arriba, la app sube el peso. Lo recomendado.' };
    lista.bilbo = { etiqueta: 'Ciclo (Bilbo y otros)', descripcion: conCarga
      ? 'Una escalera: cada sesión su peso, y un objetivo de repeticiones que superar. Se corta y empieza otro solo.'
      : 'Una escalera: cada sesión un objetivo un poco mayor. Se corta al llegar al tope.' };
    lista.esfuerzo = { etiqueta: 'Un poco más cada vez', descripcion: conCarga ? 'Una repetición más, o un poco más de peso, que la última vez.' : 'Un poco más que la última vez.' };
    if (conCarga && reps) lista.programa = { etiqueta: 'Programa (5×5, 5/3/1, HST)', descripcion: 'Un programa clásico con las series de cada sesión ya decididas.' };
    if (conCarga && reps) lista['maximo-trabajo'] = { etiqueta: 'Máximo trabajo', descripcion: 'Experimental: el peso con el que más kilos totales mueves.' };
    lista.libre = { etiqueta: 'Yo decido', descripcion: 'La app solo apunta y te recuerda lo último.' };
    return lista;
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
    plan.calentamiento = plan.tipo === 'calentamiento';
    plan.tipo = tipoDePlan(plan);
    const tramos = tramosDe(plan.tecnicas);
    const reglas = progresionesPara();
    if (!reglas[plan.progresion.tipo]) plan.progresion = progresionPorDefecto(Object.keys(reglas)[0], borrador);
    return h('article', { class: 'tarjeta plan-serie' },
      h('div', { class: 'cabecera-tarjeta' },
        h('strong', {}, borrador.series.length > 1 ? `Serie ${i + 1}` : 'Regla'),
        borrador.series.length > 1 && h('button', { type: 'button', class: 'boton-icono papelera', 'aria-label': 'Quitar serie',
          onclick: async () => {
            if (!await confirmar(`¿Quitar la serie ${i + 1} de este ejercicio? Lo ya apuntado en entrenamientos pasados se conserva.`,
              { si: 'Quitar', peligro: true })) return;
            borrador.series.splice(i, 1);
            repintar();
          } }, '🗑')),

      // La regla elegida, en una línea; las demás, plegadas.
      h('details', { class: 'explicacion regla', open: !existente || undefined },
        h('summary', {}, h('strong', {}, reglas[plan.progresion.tipo]?.etiqueta ?? plan.progresion.tipo), ' · cambiar'),
        opciones(reglas, plan.progresion.tipo, (tipo) => {
          if (tipo !== plan.progresion.tipo) plan.progresion = progresionPorDefecto(tipo, borrador);
          plan.tipo = tipoDePlan(plan);
          repintar();
        })),
      h('small', { class: 'nota' }, reglas[plan.progresion.tipo]?.descripcion ?? ''),
      detalleProgresion(plan),

      h('details', { class: 'explicacion', open: plan.tecnicas.length > 0 || undefined },
        h('summary', {}, plan.tecnicas.length ? `Técnicas: ${plan.tecnicas.map((k) => TECNICAS[k]?.etiqueta ?? k).join(', ')}` : 'Técnicas de intensidad (opcional)'),
        selectorTecnicas(plan.tecnicas, (nuevas) => {
          plan.tecnicas = nuevas;
          if (!tramosDe(nuevas)) plan.tramosPrevistos = null;
          plan.tipo = tipoDePlan(plan);
          repintar();
        }),
        h('small', { class: 'nota' }, 'Se pueden combinar: unilateral, rest-pause y un isométrico final en la misma serie.'),
        tramos && seccionTramos(plan, tramos)),

      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: Boolean(plan.calentamiento),
          onchange: (e) => { plan.calentamiento = e.target.checked; plan.tipo = tipoDePlan(plan); persistir(); } }),
        'Es de calentamiento (no cuenta para récords ni para la recuperación)'));
  }

  // Cómo se rellenan los tramos cada vez que el ejercicio entra en un
  // entrenamiento: como la última vez, con los ajustes generales o con lo
  // que se guarde aquí. Y, en máquinas de placas, una secuencia de pesos fija.
  function seccionTramos(plan, tramos) {
    const defecto = tramosPorDefecto(d.perfil, tramos.tecnica);
    plan.tramosModo ??= 'ultima';
    const esDrop = tramos.tecnica === 'drop-set';
    const fijos = Boolean(plan.tramosFijos?.length);
    // Una sola pregunta: de dónde salen las bajadas (o miniseries) cada vez.
    const modos = {
      ultima: { etiqueta: 'Como la última vez', descripcion: 'Mismos tramos y pesos que la última vez que lo hiciste.' },
      ajustes: { etiqueta: 'Lo de Ajustes', descripcion: `${defecto.tramos} ${tramos.nombre.toLowerCase()}s`
        + (defecto.reps ? ` de ${defecto.reps} repeticiones` : '') + (defecto.salto ? `, bajando ${defecto.salto}` : '') + '.' },
      plantilla: { etiqueta: 'Lo que ponga aquí', descripcion: 'Los valores de debajo, siempre.' },
    };
    if (esDrop) modos.fijos = { etiqueta: 'Pesos fijos de la máquina', descripcion: 'Una lista de pesos, siempre la misma.' };
    const modoActual = fijos ? 'fijos' : plan.tramosModo;
    const modosCarga = {
      '': { etiqueta: 'Lo de Ajustes' },
      rm: { etiqueta: '% del 1RM de hoy' },
      kg: { etiqueta: 'Kilos a mano' },
    };
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, `${tramos.nombre}s: de dónde salen cada vez`),
      opciones(modos, modoActual, (modo) => {
        if (modo === 'fijos') { plan.tramosFijos ??= []; if (!plan.tramosFijos.length) plan.tramosFijos = null; plan.tramosModo = 'plantilla'; plan.pedirFijos = true; }
        else { plan.tramosModo = modo; plan.tramosFijos = null; plan.pedirFijos = false; }
        repintar();
      }),
      modoActual === 'plantilla' && !plan.pedirFijos && h('div', { class: 'fila-campos' },
        campo(`${tramos.nombre}s`, numeroInput(plan.tramosPrevistos ?? defecto.tramos,
          (v) => { plan.tramosPrevistos = v == null ? null : Math.max(1, Math.round(v)); })),
        tramos.tecnica !== 'drop-set' && campo('Repeticiones por miniserie',
          numeroInput(plan.tramoReps ?? defecto.reps, (v) => { plan.tramoReps = v; })),
        tramos.salto > 0 && campo(`Se baja cada vez (${(plan.modoCarga ?? d.perfil.dropSet?.modoCarga ?? 'rm') === 'rm' ? '% del 1RM' : 'kg'})`,
          numeroInput(plan.tramoSalto ?? defecto.salto, (v) => { plan.tramoSalto = v; }))),
      esDrop && modoActual !== 'fijos' && h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Los kilos de cada bajada se calculan por'),
        opciones(modosCarga, plan.modoCarga ?? '', (m) => { plan.modoCarga = m || null; repintar(); }, { compacto: true }),
        h('small', { class: 'nota' }, 'Por % del 1RM, los kilos salen de lo que hagas ese día en la serie de arriba; a mano, se quedan como los dejes.')),
      (modoActual === 'fijos' || plan.pedirFijos) && campo('Pesos fijos (máquina de placas)',
        h('input', { type: 'text', placeholder: 'Por ejemplo: 50 42,5 35 27,5',
          value: (plan.tramosFijos || []).map((p) => formatearNumero(p)).join(' '),
          oninput: (e) => {
            const pesos = e.target.value.split(/[;/\s]+/).map((x) => leerNumero(x)).filter((x) => x != null);
            plan.tramosFijos = pesos.length ? pesos : null;
          } }),
        h('small', { class: 'nota' }, 'Separados por espacios, con coma para los decimales. Cada drop set sale con estos pesos, sin recalcular. '
          + 'También se pueden fijar desde el entrenamiento.'),
        pesosDeOtros(plan)));
  }

  // Máquinas compartidas (abductores y aductores en la misma, por ejemplo):
  // traer la secuencia de pesos fijos que ya tenga otro ejercicio.
  function pesosDeOtros(plan) {
    const otros = d.ejercicios.flatMap((e) => (e.id === borrador.id || e.archivado ? [] : (e.series || [])
      .filter((p) => p.tramosFijos?.length)
      .map((p) => ({ nombre: e.nombre, pesos: p.tramosFijos }))));
    if (!otros.length) return null;
    return h('select', { 'aria-label': 'Traer pesos fijos de otro ejercicio',
      onchange: (e) => {
        const elegido = otros[Number(e.target.value)];
        if (!elegido) return;
        plan.tramosFijos = [...elegido.pesos];
        plan.tramosPrevistos = elegido.pesos.length;
        repintar();
        aviso(`Pesos de ${elegido.nombre} copiados y guardados.`);
      } },
    h('option', { value: '' }, 'Traer los pesos fijos de otro ejercicio…'),
    otros.map((o, i) => h('option', { value: i }, `${o.nombre}: ${o.pesos.map((x) => formatearNumero(x)).join(' → ')} kg`)));
  }

  function detalleProgresion(plan) {
    const p = plan.progresion;
    const sobre = p.sobre || sobrePorDefecto(borrador);
    const unidad = sobre === 'carga'
      ? (TIPOS_CARGA[borrador.carga.tipo]?.unidad || '')
      : (TIPOS_ESFUERZO[borrador.esfuerzo.tipo]?.unidad || '');
    const queSube = sobre === 'carga' ? 'la carga' : TIPOS_ESFUERZO[borrador.esfuerzo.tipo].etiqueta.toLowerCase();

    if (p.tipo === 'bilbo') return seccionBilbo(plan, sobre, unidad);
    if (p.tipo === 'programa') return seccionPrograma(plan);
    if (p.tipo === 'carga') {
      p.objetivoEsfuerzo ??= [8, 12];
      return h('div', {},
        h('div', { class: 'fila-campos' },
          campo('De (reps)', numeroInput(p.objetivoEsfuerzo[0], (v) => { p.objetivoEsfuerzo[0] = v; })),
          campo('A (reps)', numeroInput(p.objetivoEsfuerzo[1], (v) => { p.objetivoEsfuerzo[1] = v; })),
          campo(`Y entonces sube (${unidad})`, numeroInput(p.incremento, (v) => { p.incremento = v; }))),
        h('small', { class: 'nota' }, `Con el mismo peso subes repeticiones de ${p.objetivoEsfuerzo[0]} a ${p.objetivoEsfuerzo[1]}; al llegar, sube ${queSube} y vuelves a empezar.`));
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
        campo(`Aumento cada vez (${actual === 'carga' ? TIPOS_CARGA[borrador.carga.tipo].unidad : TIPOS_ESFUERZO[borrador.esfuerzo.tipo].unidad})`,
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
    const muestra = p.inicial != null ? seriesDelPrograma(borrador, p, 0) : null;
    return h('div', {},
      opciones(Object.fromEntries(Object.entries(PROGRAMAS).map(([k, v]) => [k, { etiqueta: v.etiqueta }])), p.programa,
        (k) => { p.programa = k; repintar(); }, { compacto: true }),
      h('p', { class: 'nota' }, info.descripcion),
      h('div', { class: 'fila-campos' },
        campo(`${info.inicial} (kg)`, numeroInput(p.inicial, (v) => { p.inicial = v; }, { onchange: repintar })),
        campo('Incremento (kg)', numeroInput(p.incremento ?? 2.5, (v) => { p.incremento = v; }))),
      muestra && h('p', { class: 'nota' }, `Primera sesión: ${muestra.series.map((s) => `${formatearNumero(s.carga)} × ${s.reps}${s.amrap ? '+' : ''}`).join(' · ')}.`),
      h('p', { class: 'nota' }, `Contando desde el ${p.desde}. `,
        h('button', { type: 'button', class: 'boton enlace', onclick: () => { p.desde = hoyISO(); repintar(); aviso('El programa empieza de nuevo desde hoy.'); } },
          'Empezar de nuevo desde hoy')),
      p.programa === '531' && existente && rmDeReferencia(d, existente) && h('p', { class: 'nota' },
        `Tu mejor 1RM estimado aquí es ${formatearNumero(Math.round(rmDeReferencia(d, existente).valor))} kg: el 90 % son `
        + `${formatearNumero(aPesoDisponible(borrador, rmDeReferencia(d, existente).valor * 0.9))} kg.`));
  }

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
    const toca = () => { p.preset = 'personalizado'; };
    const presets = Object.fromEntries(Object.entries(PRESETS_CICLO).filter(([k, x]) => k !== 'personalizado' && (!x.sobre || x.sobre === sobre)).map(([k, x]) => [k, { etiqueta: x.etiqueta }]));
    const unidadEsfuerzo = TIPOS_ESFUERZO[borrador.esfuerzo.tipo]?.unidad ?? 'reps';

    return h('div', { class: 'bilbo' },
      h('p', { class: 'nota' }, 'Rellena los números tú o empieza desde uno prehecho y cámbialo:'),
      h('div', { class: 'chips' }, Object.entries(presets).map(([k, x]) => h('button', {
        type: 'button', class: `chip seleccionable ${p.preset === k ? 'activo' : ''}`, 'aria-pressed': String(p.preset === k),
        onclick: () => { aplicarPreset(p, k, borrador); repintar(); },
      }, x.etiqueta))),
      p.preset in PRESETS_CICLO && p.preset !== 'personalizado' && h('small', { class: 'nota' }, PRESETS_CICLO[p.preset].descripcion),

      h('div', { class: 'fila-campos' },
        campo(`Empieza en (${unidad})`, numeroInput(gen.inicial, (v) => { gen.inicial = v ?? 0; toca(); }, { onchange: regenerar })),
        campo(`Sube (${unidad})`, numeroInput(gen.incremento, (v) => { gen.incremento = v ?? 0; toca(); }, { onchange: regenerar })),
        campo('Cada (sesiones)', numeroInput(gen.cada, (v) => { gen.cada = Math.max(1, Math.round(v ?? 1)); toca(); }, { onchange: regenerar })),
        campo('Sesiones en total', numeroInput(p.diasPorCiclo, (v) => { p.diasPorCiclo = Math.max(1, Math.round(v ?? 17)); toca(); }, { onchange: regenerar }))),

      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Se corta antes de acabar las sesiones si… (vacío = no se mira)'),
        h('div', { class: 'fila-campos' },
          sobre === 'carga' && campo(`El objetivo baja de (${unidadEsfuerzo})`, numeroInput(p.corte.esfuerzoMin, (v) => { p.corte.esfuerzoMin = v; toca(); })),
          campo(`Llegas a (${unidadEsfuerzo})`, numeroInput(p.corte.esfuerzoMax, (v) => { p.corte.esfuerzoMax = v; toca(); })),
          sobre === 'carga' && campo(`El peso llega a (${unidad})`, numeroInput(p.corte.cargaMax, (v) => { p.corte.cargaMax = v; toca(); })),
          sobre === 'carga' && campo('El peso pasa del (% de tu 1RM)', numeroInput(p.corte.rmPct, (v) => { p.corte.rmPct = v; toca(); })))),
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Y el siguiente ciclo empieza'),
        opciones(sobre === 'carga' ? MODOS_REINICIO : { mismo: MODOS_REINICIO.mismo, manual: MODOS_REINICIO.manual }, p.reinicio.modo,
          (m) => { p.reinicio.modo = m; toca(); repintar(); }, { compacto: true }),
        ['porcentaje', 'ultimo'].includes(p.reinicio.modo) && campo('Porcentaje', numeroInput(p.reinicio.porcentaje ?? (p.reinicio.modo === 'ultimo' ? 90 : 50),
          (v) => { p.reinicio.porcentaje = v; toca(); })),
        h('small', { class: 'nota' }, MODOS_REINICIO[p.reinicio.modo]?.descripcion ?? '')),

      h('p', { class: 'nota' }, `En resumen: ${describirCiclo(p, sobre === 'carga' ? unidad : unidadEsfuerzo)}`),
      h('p', { class: 'nota' },
        `Ciclo ${ciclo.n} de ${p.ciclos.length}. ${hechos.size === 1 ? '1 sesión hecha' : `${hechos.size} sesiones hechas`} de ${ciclo.escalera.length}. `
        + 'Cada casilla se puede cambiar a mano.'),
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
        p.ciclos.length > 1 && h('select', { 'aria-label': 'Ciclo mostrado',
          onchange: (e) => { p.cicloActual = Number(e.target.value); repintar(); } },
        p.ciclos.map((c) => h('option', { value: c.n, selected: c.n === p.cicloActual }, `Ciclo ${c.n}`))),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => { alargarCiclo(borrador, plan, 5); repintar(); aviso('Ciclo alargado 5 sesiones.'); } }, '+5 sesiones'),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => nuevoCiclo(plan) }, 'Cortar y empezar otro')));
  }

  // Peso de arranque de un ciclo Bilbo: un porcentaje de tu mejor 1RM
  // estimado en este ejercicio (el de Ajustes; 50 % por defecto).
  function inicioBilbo() {
    const rm = existente ? rmDeReferencia(d, existente)?.valor : null;
    return rm ? aPesoDisponible(borrador, (rm * (d.perfil.bilboInicioPorcentaje ?? 50)) / 100) : null;
  }

  function nuevoCiclo(plan) {
    const ciclo = empezarCicloNuevo(d, existente ?? borrador, plan);
    aviso(`Ciclo ${ciclo.n} preparado, empezando en ${formatearNumero(ciclo.generador.inicial)}. Revísalo si quieres.`);
    repintar();
  }

  function guardar() {
    borrador.nombre = borrador.nombre.trim();
    if (!borrador.nombre) { aviso('Ponle un nombre al ejercicio', { tipo: 'error' }); return; }
    // Se permiten nombres repetidos a propósito: «Flexiones» de repeticiones y
    // «Flexiones» isométricas son dos ejercicios distintos para la app.
    const repetido = d.ejercicios.some((e) => e.id !== borrador.id && !e.archivado
      && e.nombre.toLowerCase() === borrador.nombre.toLowerCase());
    if (repetido) aviso('Ojo: ya tenías otro ejercicio con ese nombre', { ms: 5000 });

    persistir();
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

  // Borrar: desaparece de todas las listas, pero los entrenamientos pasados
  // conservan sus series. Se recupera desde Ajustes.
  async function borrarEjercicio() {
    const usado = d.sesiones.some((s) => s.ejercicios.some((x) => x.ejercicioId === borrador.id));
    const si = await confirmar(usado
      ? `¿Borrar «${borrador.nombre}»? Desaparece de tus listas y rutinas; los entrenamientos pasados conservan sus series. Se puede recuperar en Ajustes.`
      : `¿Borrar «${borrador.nombre}»? No tiene historial, así que se elimina del todo.`, { si: 'Borrar', peligro: true });
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
  return h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, etiqueta), ...control);
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
