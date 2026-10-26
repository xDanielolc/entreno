// Cargar el historial de las hojas de cálculo (los Excel de Dan) que
// convierte herramientas/importar_excel.py. El archivo es un JSON con la
// forma de los datos de la app (versión 1): aquí se pone al día con las
// migraciones y se junta con lo que ya tienes, sin pisar nada.
//
// Reglas (26-10-2026, decididas para no mover tus pesos de ahora):
//   · Los básicos de peso libre se juntan con tu ejercicio de la app del mismo
//     gesto (banca, militar, sentadilla, remo con barra, curl martillo y el
//     pájaro con codo doblado). Lo demás (casi todo máquinas del gimnasio de
//     antes) entra como ejercicios archivados, con su sitio en el nombre.
//   · Lo importado sale en el historial, las gráficas y los récords, pero no
//     cuenta para tu 1RM de referencia ni para el ajuste personal de la
//     fórmula (calculos.js y formula1rm.js miran `sesion.origen`).
//   · Cargar dos veces el mismo archivo no duplica nada (`importId`).
//   · Antes de cargar, la app guarda en tu Drive una copia de tus datos.

import * as estado from '../estado.js';
import { migrar, necesitaMigrar, validar } from '../esquema.js';
import { CATALOGO, normalizar } from '../catalogo.js';
import { guardarCopiaAparte } from '../sincronizacion.js';
import { aviso, confirmar, fechaCorta, h, modal, nuevoId, selector } from '../ui.js';

export const ORIGEN_EXCEL = 'importado-excel';

// Nombre de los Excel → nombre del ejercicio de la app con el que se junta.
const JUNTAR_CON = {
  'press banca': 'Press de banca',
  'press militar': 'Press militar',
  sentadilla: 'Sentadilla',
  'remo barra': 'Remo con barra',
  'remo en barra': 'Remo con barra',
  'curl biceps martillo': 'Curl martillo',
  'curl de biceps martillo': 'Curl martillo',
  'pajaro con codo doblado': 'Pájaro con codo doblado',
};

// Cada nombre de los Excel con su ejercicio del catálogo: de ahí salen el
// dibujo y los músculos de los que entran aparte (con los nombres de los
// Excel no se encontraba ninguno). «Dominadas» y «Fondos de tríceps» eran en
// máquina asistida (apuntaba los «Kg máq»).
export const COMO_EN_CATALOGO = {
  'Abducción GLUTEO': 'Abductores en máquina',
  'Abductores en máquina': 'Abductores en máquina',
  'Abs libres': 'Crunch en suelo',
  'Abs rueda': 'Rueda abdominal',
  'Adducción': 'Aductores en máquina',
  'Aductores en máquina': 'Aductores en máquina',
  'Biceps banco 45º': 'Curl inclinado',
  'Bíceps máquina': 'Curl de bíceps en máquina',
  'Crunch abdominal': 'Crunch abdominal',
  'Crunch abdominal EN DISCOS': 'Crunch lastrado',
  'Curl bíceps martillo': 'Curl martillo',
  'Curl bíceps máquina': 'Curl de bíceps en máquina',
  'Curl bíceps pesas': 'Curl de bíceps con mancuernas',
  'Curl de bíceps en polea': 'Curl en polea',
  'Curl de bíceps martillo': 'Curl martillo',
  'Curl isquios sentado': 'Curl femoral sentado',
  'Curl isquios tumbado': 'Curl femoral tumbado',
  'Dominada polea una mano': 'Jalón unilateral en polea',
  'Dominadas': 'Dominadas asistidas',
  'Dominadas VIEJAS': 'Dominadas asistidas',
  'Dominadas libres': 'Dominadas',
  'Elevación de gemelo recto': 'Elevación de gemelos',
  'Facepull': 'Face pull',
  'Flexiones': 'Flexiones',
  'Flexiones a una mano': 'Flexiones a una mano',
  'Flexiones de rodillas': 'Flexiones',
  'Fondos de triceps VIEJO nor sive mal hecho': 'Fondos asistidos',
  'Fondos de tríceps': 'Fondos asistidos',
  'Gemelo doblado barra': 'Elevación de gemelos sentado',
  'Gemelo doblado máquina': 'Elevación de gemelos sentado',
  'Gemelo prensa': 'Elevación de gemelos en prensa',
  'Gemelo recto prensa': 'Elevación de gemelos en prensa',
  'Hiperextensión': 'Hiperextensiones',
  'Jalón al pecho': 'Jalón al pecho',
  'Jalón en polea': 'Jalón al pecho',
  'Lateral de hombro mancuerna': 'Elevaciones laterales',
  'Laterales de hombro': 'Elevaciones laterales',
  'Laterales de hombro en máquina': 'Elevaciones laterales en máquina',
  'Laterales de hombro en polea': 'Elevaciones laterales en polea',
  'Laterales de hombro máquina': 'Elevaciones laterales en máquina',
  'Leg curl isquios': 'Curl femoral tumbado',
  'Leñador con poleas': 'Leñador en polea',
  'Leñador en polea': 'Leñador en polea',
  'Máquina de abs': 'Crunch en polea',
  'Máquina de glúteos': 'Máquina de glúteo',
  'Máquina espalda baja': 'Hiperextensiones',
  'Paseos del granjero': 'Paseo del granjero',
  'Peso muerto': 'Peso muerto',
  'Peso muerto VIEJO': 'Peso muerto',
  'Prensa': 'Prensa de piernas',
  'Prensa HORIZONTAL': 'Prensa de piernas',
  'Prensa SOLO SI ES PRIMERO': 'Prensa de piernas',
  'Press banca': 'Press de banca',
  'Press militar': 'Press militar',
  'Press militar en máquina': 'Press de hombro en máquina',
  'Press pallof': 'Press pallof',
  'Pulldown': 'Pullover en polea',
  'Pájaro con codo doblado': 'Pájaro con codo doblado',
  'Pájaros en máquina': 'Pájaros en máquina',
  'Pájaros en polea': 'Pájaros en polea',
  'Remo barra': 'Remo con barra',
  'Remo en barra': 'Remo con barra',
  'Remo en máquina NEUTRA': 'Remo en máquina',
  'Remo en polea': 'Remo en polea',
  'Remo libre': 'Remo invertido',
  'Remo neutro máquina': 'Remo en máquina',
  'Remo pendlay dorsal cerrado erectores': 'Remo con barra',
  'Remo pendlay mancuerna': 'Remo con mancuerna',
  'Remo upper back': 'Remo abierto en polea',
  'Remo upper back en polea': 'Remo abierto en polea',
  'Remos en polea': 'Remo en polea',
  'Remos en polea 2 trapecio escapulas': 'Remo en polea',
  'Sentadilla': 'Sentadilla',
  'Sentadillas libres': 'Air squat',
  'Tirón vertical en máquina': 'Jalón al pecho',
  'Trapecio en barra': 'Encogimientos de trapecio con barra',
  'Trapecios multipower NO CUENTA BARRA': 'Encogimientos de trapecio',
  'Tríceps en máquina': 'Extensión de tríceps en máquina',
};

// Rellena el dibujo (fotoDe), los músculos, el grupo y el material de los
// ejercicios cargados de los Excel que no los tengan. Devuelve cuántos.
export function completarImportados(x) {
  let n = 0;
  for (const e of x.ejercicios) {
    if (!e.importId) continue;
    const base = (e.nombre ?? '').replace(/ \((Madrid|Asturias)\)$/, '');
    const nombre = COMO_EN_CATALOGO[base];
    const c = nombre && CATALOGO.find((y) => normalizar(y.nombre) === normalizar(nombre));
    if (!c) continue;
    e.fotoDe = c.nombre;
    if (!e.musculos?.principales?.length) e.musculos = structuredClone(c.musculos);
    e.material ??= c.material;
    if (!e.grupo) e.grupo = c.grupo;
    n += 1;
  }
  return n;
}

// Nombre que se enseña de cada sitio de los Excel.
const NOMBRE_SITIO = { sede_habitual: 'Madrid', sede_asturias: 'Asturias' };

export function botonImportar() {
  const entrada = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: () => {
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (archivo) leer(archivo);
  } });
  return h('div', { class: 'importar-excel' },
    h('button', { type: 'button', class: 'boton secundario', onclick: () => entrada.click() }, 'Cargar el historial de mis Excel'),
    entrada);
}

async function leer(archivo) {
  let importado;
  try {
    importado = validar(JSON.parse(await archivo.text()));
    if (necesitaMigrar(importado)) importado = migrar(importado);
  } catch (e) {
    aviso(`Ese archivo no se puede cargar: ${e.message}`, { tipo: 'error' });
    return;
  }
  vistaPrevia(importado);
}

// Qué ejercicios del archivo tienen series y a qué ejercicio de la app van.
function propuesta(importado, datos) {
  const series = new Map();
  for (const s of importado.sesiones) for (const e of s.ejercicios) series.set(e.ejercicioId, (series.get(e.ejercicioId) ?? 0) + e.series.length);
  const tuyos = datos.ejercicios.filter((e) => !e.borrado);
  return importado.ejercicios.filter((e) => series.get(e.id)).map((e) => {
    const destino = JUNTAR_CON[normalizar(e.nombre)];
    const tuyo = destino && tuyos.find((t) => normalizar(t.nombre) === normalizar(destino));
    return { ej: e, series: series.get(e.id), destino: tuyo?.id ?? 'aparte' };
  }).sort((a, b) => b.series - a.series);
}

function vistaPrevia(importado) {
  // Algunos navegadores avisan dos veces del archivo elegido: un solo cartel.
  if (document.querySelector('.modal-fondo .lista-importar')) return;
  const datos = estado.datos();
  const ya = new Set(datos.sesiones.map((s) => s.importId).filter(Boolean));
  const nuevas = importado.sesiones.filter((s) => !ya.has(s.id));
  const filas = propuesta(importado, datos);
  const notas = notasPorPoner(structuredClone(datos), importado, filas);
  const fechas = importado.sesiones.map((s) => s.fecha).filter(Boolean).sort();
  const opciones = [['aparte', 'Aparte (archivado)'],
    ...datos.ejercicios.filter((e) => !e.borrado).map((e) => [e.id, e.nombre]).sort((a, b) => a[1].localeCompare(b[1], 'es'))];
  const lista = h('div', { class: 'lista-importar' });
  const pintar = () => lista.replaceChildren(...filas.map((f) => h('div', { class: 'fila-importar' },
    h('span', {}, h('strong', {}, f.ej.nombre), h('small', { class: 'suave' }, ` · ${NOMBRE_SITIO[f.ej.sedeId] ?? 'cualquier sitio'} · ${f.series} series`)),
    selector(opciones, f.destino, (v) => { f.destino = v; pintar(); }, { titulo: `¿Con qué ejercicio va «${f.ej.nombre}»?`, lista: true }))));
  pintar();
  const cerrar = modal('Historial de tus Excel', h('div', { class: 'formulario' },
    h('p', {}, `${importado.sesiones.length} días entrenados, del ${fechaCorta(fechas[0])} al ${fechaCorta(fechas.at(-1))}.`
      + (nuevas.length < importado.sesiones.length ? ` Ya tenías cargados ${importado.sesiones.length - nuevas.length}; se añaden ${nuevas.length}.` : '')
      + (notas ? ` Y ${notas} comentarios de tus celdas que aún no tenías.` : '')),
    h('p', { class: 'nota' }, 'Los básicos de peso libre se juntan con tu ejercicio de ahora; lo demás entra aparte, archivado, con su sitio en el nombre. '
      + 'Lo cargado se ve en el historial y las gráficas, pero no cambia tu 1RM de referencia ni el ajuste de la fórmula. Antes de cargar se guarda una copia de tus datos en Drive.'),
    lista,
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => cerrar() }, 'Cancelar'),
      h('button', { class: 'boton', disabled: !nuevas.length && !notas, onclick: async () => {
        if (!(await confirmar(nuevas.length ? `¿Cargar ${nuevas.length} días de tus Excel?` : `¿Añadir ${notas} comentarios de tus Excel?`, { si: 'Cargar' }))) return;
        cerrar();
        await cargar(importado, filas);
      } }, nuevas.length || notas ? 'Cargar' : 'Ya está todo cargado'))));
}

async function cargar(importado, filas) {
  if (estado.usuario()) {
    try {
      await guardarCopiaAparte('antes-de-importar');
    } catch (e) {
      aviso(`No se ha podido guardar la copia en Drive (${e.message}). No he cargado nada.`, { tipo: 'error' });
      return;
    }
  }
  let resultado = null;
  estado.cambiar((x) => { resultado = juntarImportado(x, importado, filas); });
  aviso(`Cargados ${resultado.sesiones} días y ${resultado.series} series; ${resultado.ejerciciosNuevos} ejercicios nuevos, archivados.`
    + (resultado.notas ? ` ${resultado.notas} comentarios de tus celdas añadidos.` : ''));
}

// Junta el historial importado con los datos (dentro de estado.cambiar).
// Exportada para poder probarla aparte.
export function juntarImportado(x, importado, filas) {
  const ya = new Set(x.sesiones.map((s) => s.importId).filter(Boolean));
  // Los sitios de los Excel, como sitios archivados (no salen al elegir dónde entrenas).
  const sitio = new Map();
  for (const s of importado.sedes ?? []) {
    const nombre = s.id === 'sede_habitual' ? 'Madrid (gimnasio de antes)' : (NOMBRE_SITIO[s.id] ?? s.nombre);
    let mio = x.sedes.find((m) => m.importId === s.id);
    if (!mio) {
      mio = { ...structuredClone(s), id: nuevoId('sede'), nombre, archivado: true, importId: s.id };
      x.sedes.push(mio);
    }
    sitio.set(s.id, mio.id);
  }
  const destino = new Map();
  let ejerciciosNuevos = 0;
  for (const f of filas) {
    if (f.destino !== 'aparte') { destino.set(f.ej.id, f.destino); continue; }
    let mio = x.ejercicios.find((e) => e.importId === f.ej.id);
    if (!mio) {
      const lugar = NOMBRE_SITIO[f.ej.sedeId];
      mio = { ...structuredClone(f.ej), id: nuevoId('ej'), nombre: lugar ? `${f.ej.nombre} (${lugar})` : f.ej.nombre,
        sedeId: sitio.get(f.ej.sedeId) ?? null, archivado: true, importId: f.ej.id, fotoDe: f.ej.nombre };
      x.ejercicios.push(mio);
      ejerciciosNuevos += 1;
    }
    destino.set(f.ej.id, mio.id);
  }
  completarImportados(x);
  let sesiones = 0;
  let series = 0;
  for (const s of importado.sesiones) {
    if (ya.has(s.id)) continue;
    const juntado = destino;
    const ejercicios = s.ejercicios.filter((e) => juntado.has(e.ejercicioId)).map((e) => {
      const aparte = filas.find((f) => f.ej.id === e.ejercicioId)?.destino === 'aparte';
      return { ...structuredClone(e), ejercicioId: juntado.get(e.ejercicioId),
        // Los ciclos de los Excel solo valen en su ejercicio aparte: en el tuyo de
        // ahora se mezclarían con los ciclos de la app.
        cicloN: aparte ? e.cicloN : null, diaCiclo: aparte ? e.diaCiclo : null,
        series: e.series.map((z) => ({ ...z, id: nuevoId('s'), planId: aparte ? z.planId ?? null : null })) };
    });
    if (!ejercicios.length) continue;
    x.sesiones.push({ ...structuredClone(s), id: nuevoId('ses'), importId: s.id, origen: ORIGEN_EXCEL,
      sedeId: sitio.get(s.sedeId) ?? null, rutinaId: null, diaRutinaId: null, estado: 'terminada', ejercicios });
    sesiones += 1;
    series += ejercicios.reduce((n, e) => n + e.series.length, 0);
  }
  const notas = ponerNotas(x, importado, destino);
  return { sesiones, series, ejerciciosNuevos, notas };
}

// Los comentarios de las celdas de los Excel (desde la 0.66.0) en lo que ya
// estaba cargado: misma sesión, mismo ejercicio y misma serie, por orden. No
// pisa un comentario que ya tenga la serie.
function ponerNotas(x, importado, destino) {
  let puestas = 0;
  for (const s of importado.sesiones) {
    const mia = x.sesiones.find((m) => m.importId === s.id);
    if (!mia) continue;
    const entradas = s.ejercicios.filter((e) => destino.has(e.ejercicioId));
    entradas.forEach((e, k) => {
      const suya = mia.ejercicios[k];
      if (!suya || suya.ejercicioId !== destino.get(e.ejercicioId)) return;
      e.series.forEach((z, j) => {
        if (z.nota && suya.series[j] && !suya.series[j].nota) { suya.series[j].nota = z.nota; puestas += 1; }
      });
    });
  }
  return puestas;
}

// Cuántos comentarios añadiría cargar este archivo (sobre una copia).
function notasPorPoner(copia, importado, filas) {
  const destino = new Map();
  for (const f of filas) {
    const id = f.destino !== 'aparte' ? f.destino : copia.ejercicios.find((e) => e.importId === f.ej.id)?.id;
    if (id) destino.set(f.ej.id, id);
  }
  return ponerNotas(copia, importado, destino);
}
