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

    pista('ejercicios-lista', 'Cada ejercicio guarda cómo progresa: tócalo para cambiar sus series, técnicas y músculos. '
      + 'Con «+ Nuevo» eliges uno de la lista general o lo creas a mano.'),
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

  function formulario() {
    return h('form', { class: 'formulario', onsubmit: (e) => { e.preventDefault(); guardar(); } },
      !existente && h('button', { type: 'button', class: 'boton secundario', onclick: elegirDelCatalogo },
        'Elegir de la lista de ejercicios'),
      campo('Nombre', h('input', { type: 'text', required: true, value: borrador.nombre, autocomplete: 'off',
        placeholder: 'Press banca', oninput: (e) => { borrador.nombre = e.target.value; } })),

      sedesActivas(d).length > 0 && campo('Dónde se hace', h('select', {
        onchange: (e) => { borrador.sedeId = e.target.value || null; repintar(); } },
      h('option', { value: '' }, 'Igual en todos los sitios'),
      sedesActivas(d).map((s) => h('option', { value: s.id, selected: s.id === borrador.sedeId }, `Solo en ${nombreSede(d, s.id)}`))),
      h('small', { class: 'nota' }, 'Si una máquina no pesa igual en dos gimnasios, cada uno debe llevar su propio ejercicio.'),
      existente && !existente.sedeId && sedesActivas(d).length > 1 && h('button', { type: 'button', class: 'boton enlace',
        onclick: separar }, 'Separar en un ejercicio por sitio (reparte su historial)')),

      campoGrupo(),

      h('fieldset', {},
        h('legend', {}, '¿Qué carga usa?'),
        opciones(TIPOS_CARGA, borrador.carga.tipo, (tipo) => {
          borrador.carga = { tipo };
          // Sin carga, la progresión pasa a actuar sobre lo que se mide.
          for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
          repintar();
        }),
        ['peso', 'asistida'].includes(borrador.carga.tipo) && h('label', { class: 'casilla' },
          h('input', { type: 'checkbox', checked: Boolean(borrador.maquinaPlacas),
            onchange: (e) => { borrador.maquinaPlacas = e.target.checked; repintar(); } }),
          'Máquina de placas o polea: los pesos van de placa en placa'),
        borrador.maquinaPlacas && seccionPesosMaquina(),
        borrador.carga.tipo === 'asistida' && h('p', { class: 'nota' },
          peso ? `Apuntarás los kilos que marca la máquina; la carga real es tu peso (${formatearNumero(peso)} kg) menos esa ayuda.`
            : 'Indica tu peso corporal en Ajustes para calcular la carga real.'),
        borrador.carga.tipo === 'pesoCorporal' && campoFraccionCorporal()),

      h('fieldset', {},
        h('legend', {}, '¿Qué apuntas en cada serie?'),
        opciones(TIPOS_ESFUERZO, borrador.esfuerzo.tipo, (tipo) => { borrador.esfuerzo = { tipo }; repintar(); }, { compacto: true }),
        borrador.esfuerzo.tipo === 'tiempo' && h('label', { class: 'casilla' },
          h('input', { type: 'checkbox', checked: Boolean(borrador.esfuerzoExtra),
            onchange: (e) => { borrador.esfuerzoExtra = e.target.checked ? { tipo: 'distancia', opcional: true } : null; } }),
          'Apuntar también la distancia (opcional en cada serie)')),

      borrador.carga.tipo !== 'ninguna' && seccionFormula(),

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

      ['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(borrador)) && h('fieldset', {},
        h('legend', {}, '¿Cómo lo haces normalmente?'),
        h('p', { class: 'nota' }, 'Sale así en cada serie; en el entrenamiento puedes cambiarlo ese día.'),
        campo('Técnica', h('select', { onchange: (e) => { borrador.estiramiento = { ...borrador.estiramiento, tecnica: e.target.value || null }; repintar(); } },
          h('option', { value: '' }, 'Sin indicar'),
          Object.entries(TECNICAS_ESTIRAMIENTO).map(([k, v]) => h('option', { value: k, selected: k === borrador.estiramiento?.tecnica }, v.etiqueta)))),
        borrador.estiramiento?.tecnica && h('small', { class: 'nota' }, TECNICAS_ESTIRAMIENTO[borrador.estiramiento.tecnica].descripcion),
        campo('Ayuda', h('select', { onchange: (e) => { borrador.estiramiento = { ...borrador.estiramiento, asistencia: e.target.value || null }; } },
          h('option', { value: '' }, 'Sin indicar'),
          Object.entries(ASISTENCIAS).map(([k, v]) => h('option', { value: k, selected: k === borrador.estiramiento?.asistencia }, v)))),
        h('small', { class: 'nota' }, 'Para la altura del ladrillo, elige «Altura» en la carga. Con «Apoyo con la mano» '
          + 'apuntas en cada serie en qué punto de la escala estás: puño, surf, pulgar, mano abierta, tres, dos y un dedo, y sin mano.')),

      h('fieldset', {},
        h('legend', {}, 'Series de este ejercicio'),
        h('p', { class: 'nota' },
          'Son las series que aparecerán al añadirlo a un entrenamiento. Cada una progresa a su manera: '
          + 'por ejemplo, una Bilbo con su ciclo y una de intensidad con drop set.'),
        borrador.series.map((plan, i) => tarjetaPlan(plan, i)),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => {
          borrador.series.push(serieNuevaPlantilla(borrador, { tipo: 'libre' }));
          repintar();
        } }, '+ Añadir serie'),
        h('small', { class: 'nota' },
          'Solo hacen falta varias si el ejercicio lleva de verdad más de una serie: '
          + 'una Bilbo y una de intensidad, por ejemplo.')),

      campo('Notas', h('textarea', { rows: 3, value: borrador.notas || '',
        oninput: (e) => { borrador.notas = e.target.value; } })),

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
        + 'y con él propone pesos. «Se ajusta a ti» corrige la fórmula con tus propias series.', { avanzada: true }),
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

  function tarjetaPlan(plan, i) {
    plan.tecnicas ??= [];
    const tramos = tramosDe(plan.tecnicas);
    return h('article', { class: 'tarjeta plan-serie' },
      h('div', { class: 'cabecera-tarjeta' },
        h('strong', {}, `Serie ${i + 1}`),
        borrador.series.length > 1 && h('button', { type: 'button', class: 'boton-icono papelera', 'aria-label': 'Quitar serie',
          onclick: async () => {
            if (!await confirmar(`¿Quitar la serie ${i + 1} de este ejercicio? Lo ya apuntado en entrenamientos pasados se conserva.`,
              { si: 'Quitar', peligro: true })) return;
            borrador.series.splice(i, 1);
            repintar();
          } }, '🗑')),

      campo('Tipo', h('select', { onchange: (e) => {
        plan.tipo = e.target.value;
        // Una serie de intensidad no sigue un ciclo Bilbo; una Bilbo, sí.
        if (plan.tipo === 'intensidad' && plan.progresion.tipo === 'bilbo') plan.progresion = progresionPorDefecto('libre', borrador);
        if (plan.tipo === 'bilbo' && plan.progresion.tipo !== 'bilbo') plan.progresion = progresionPorDefecto('bilbo', borrador);
        repintar();
      } },
      Object.entries(TIPOS_SERIE).map(([k, v]) => h('option', { value: k, selected: k === plan.tipo }, v)))),

      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Técnicas'),
        selectorTecnicas(plan.tecnicas, (nuevas) => {
          plan.tecnicas = nuevas;
          if (!tramosDe(nuevas)) plan.tramosPrevistos = null;
          repintar();
        }),
        h('small', { class: 'nota' }, 'Se pueden combinar: unilateral, rest-pause y un isométrico final en la misma serie.')),

      tramos && seccionTramos(plan, tramos),

      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Progresión'),
        opciones(progresionesPara(plan), plan.progresion.tipo, (tipo) => {
          if (tipo !== plan.progresion.tipo) plan.progresion = progresionPorDefecto(tipo, borrador);
          repintar();
        }, { compacto: true }),
        h('small', { class: 'nota' }, TIPOS_PROGRESION[plan.progresion.tipo].descripcion)),

      detalleProgresion(plan));
  }

  // Qué progresiones puede llevar una serie según su tipo: la Bilbo solo en
  // series Bilbo (en una de intensidad no tiene sentido).
  function progresionesPara(plan) {
    if (plan.tipo === 'intensidad') {
      const { bilbo, ...resto } = TIPOS_PROGRESION;
      return resto;
    }
    return TIPOS_PROGRESION;
  }

  // Cómo se rellenan los tramos cada vez que el ejercicio entra en un
  // entrenamiento: como la última vez, con los ajustes generales o con lo
  // que se guarde aquí. Y, en máquinas de placas, una secuencia de pesos fija.
  function seccionTramos(plan, tramos) {
    const defecto = tramosPorDefecto(d.perfil, tramos.tecnica);
    plan.tramosModo ??= 'ultima';
    const modos = {
      ultima: { etiqueta: 'Como la última vez', descripcion: 'Mismos tramos y pesos que la última vez que lo hiciste.' },
      ajustes: { etiqueta: 'Por defecto', descripcion: `Lo de Ajustes: ${defecto.tramos} ${tramos.nombre.toLowerCase()}s`
        + (defecto.reps ? ` de ${defecto.reps} repeticiones` : '') + (defecto.salto ? `, bajando ${defecto.salto} kg` : '') + '.' },
      plantilla: { etiqueta: 'Lo de aquí', descripcion: 'Los valores que pongas debajo, siempre.' },
    };
    const fijos = Boolean(plan.tramosFijos?.length);
    const modosCarga = {
      '': { etiqueta: 'Lo de Ajustes', descripcion: '' },
      rm: { etiqueta: '% del 1RM', descripcion: '' },
      kg: { etiqueta: 'Kilos a mano', descripcion: '' },
    };
    return h('div', { class: 'campo' },
      !fijos && h('span', { class: 'etiqueta-campo' }, `${tramos.nombre}s: de dónde salen cada vez`),
      !fijos && opciones(modos, plan.tramosModo, (modo) => { plan.tramosModo = modo; repintar(); }),
      !fijos && plan.tramosModo === 'plantilla' && h('div', { class: 'fila-campos' },
        campo(`${tramos.nombre}s`, numeroInput(plan.tramosPrevistos ?? defecto.tramos,
          (v) => { plan.tramosPrevistos = v == null ? null : Math.max(1, Math.round(v)); })),
        tramos.tecnica !== 'drop-set' && campo('Repeticiones por miniserie',
          numeroInput(plan.tramoReps ?? defecto.reps, (v) => { plan.tramoReps = v; }))),
      !fijos && tramos.salto > 0 && h('div', { class: 'fila-campos' },
        campo('Se baja cada vez (kg)', numeroInput(plan.tramoSalto ?? defecto.salto, (v) => { plan.tramoSalto = v; }))),
      !fijos && tramos.tecnica === 'drop-set' && h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Los pesos del drop set, por'),
        opciones(modosCarga, plan.modoCarga ?? '', (m) => { plan.modoCarga = m || null; repintar(); }, { compacto: true }),
        h('small', { class: 'nota' }, 'Por % del 1RM, los kilos se recalculan con lo que hagas ese día en la serie de arriba; '
          + 'a mano, se quedan como los dejes. Se puede cambiar también en cada rutina y en cada serie del día.')),
      fijos && h('p', { class: 'nota' }, 'Con pesos fijos, cada drop set sale con estos pesos y no hace falta nada más.'),
      tramos.tecnica === 'drop-set' && campo('Pesos fijos (máquina de placas)',
        h('input', { type: 'text', placeholder: 'Por ejemplo: 50 42,5 35 27,5',
          value: (plan.tramosFijos || []).map((p) => formatearNumero(p)).join(' '),
          oninput: (e) => {
            const pesos = e.target.value.split(/[;/\s]+/).map((x) => leerNumero(x)).filter((x) => x != null);
            plan.tramosFijos = pesos.length ? pesos : null;
          } }),
        h('small', { class: 'nota' }, 'Separados por espacios (o punto y coma), con coma para los decimales. Si los pones, cada drop set '
          + 'sale con estos pesos y no se recalcula con el 1RM. También se pueden fijar desde el entrenamiento.'),
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
          campo('Mínimo', numeroInput(p.objetivoEsfuerzo[0], (v) => { p.objetivoEsfuerzo[0] = v; })),
          campo('Máximo', numeroInput(p.objetivoEsfuerzo[1], (v) => { p.objetivoEsfuerzo[1] = v; })),
          campo(`Sube (${unidad})`, numeroInput(p.incremento, (v) => { p.incremento = v; }))),
        h('small', { class: 'nota' }, `Al llegar al máximo sube ${queSube}.`));
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
      ciclo.escalera = generarEscalera({ ...gen, dias: p.diasPorCiclo });
      if (borrador.pesosMaquina?.length && sobre === 'carga') ciclo.escalera = ciclo.escalera.map((v) => aPesoDisponible(borrador, v));
      repintar();
    };

    return h('div', { class: 'bilbo' },
      h('p', { class: 'nota' },
        `Ciclo ${ciclo.n} de ${p.ciclos.length}. ${hechos.size} días hechos de ${ciclo.escalera.length}. `
        + `Cada día tiene su ${sobre === 'carga' ? 'carga fijada' : 'objetivo fijado'}; puedes cambiar cualquier casilla.`),

      h('div', { class: 'barra-progreso', role: 'img',
        'aria-label': `${hechos.size} de ${ciclo.escalera.length} días hechos` },
      h('span', { style: `width:${(hechos.size / ciclo.escalera.length) * 100}%` })),

      h('div', { class: 'fila-campos' },
        campo(`Inicio (${unidad})`, numeroInput(gen.inicial, (v) => { gen.inicial = v ?? 0; }, { onchange: regenerar })),
        campo('Incremento', numeroInput(gen.incremento, (v) => { gen.incremento = v ?? 0; }, { onchange: regenerar })),
        campo('Sube cada (días)', numeroInput(gen.cada, (v) => { gen.cada = Math.max(1, Math.round(v ?? 1)); }, { onchange: regenerar })),
        campo('Días del ciclo', numeroInput(p.diasPorCiclo, (v) => { p.diasPorCiclo = Math.max(1, Math.round(v ?? 17)); }, { onchange: regenerar }))),

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
        })),

      h('div', { class: 'fila-botones' },
        p.ciclos.length > 1 && h('select', { 'aria-label': 'Ciclo mostrado',
          onchange: (e) => { p.cicloActual = Number(e.target.value); repintar(); } },
        p.ciclos.map((c) => h('option', { value: c.n, selected: c.n === p.cicloActual }, `Ciclo ${c.n}`))),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => nuevoCiclo(plan) }, 'Empezar un ciclo nuevo')));
  }

  // Peso de arranque de un ciclo Bilbo: un porcentaje de tu mejor 1RM
  // estimado en este ejercicio (el de Ajustes; 50 % por defecto).
  function inicioBilbo() {
    const rm = existente ? rmDeReferencia(d, existente)?.valor : null;
    return rm ? aPesoDisponible(borrador, (rm * (d.perfil.bilboInicioPorcentaje ?? 50)) / 100) : null;
  }

  function nuevoCiclo(plan) {
    const p = plan.progresion;
    const anterior = cicloActual(plan) || p.ciclos.at(-1);
    const n = Math.max(0, ...p.ciclos.map((c) => c.n)) + 1;
    const generador = { ...(anterior?.generador || { inicial: 20, incremento: 2.5, cada: 1 }) };
    // Un ciclo nuevo arranca a un porcentaje de tu 1RM de ahora (50 % por defecto).
    const inicio = (p.sobre || sobrePorDefecto(borrador)) === 'carga' ? inicioBilbo() : null;
    if (inicio != null) generador.inicial = inicio;
    p.ciclos.push({ n, inicio: null, fin: null, generador,
      escalera: generarEscalera({ ...generador, dias: p.diasPorCiclo }) });
    p.cicloActual = n;
    aviso(inicio != null
      ? `Ciclo ${n} preparado, empezando en ${formatearNumero(inicio)} kg (el ${d.perfil.bilboInicioPorcentaje ?? 50} % de tu 1RM). Revísalo y guarda.`
      : `Ciclo ${n} preparado. Ajusta el valor inicial y guarda.`);
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
