// Una rutina pegada como texto. Sirve para traer la rutina que has escrito
// (o que te ha escrito una IA) sin meterla ejercicio a ejercicio. Admite dos
// formas, y se pueden mezclar:
//
//   Día 1: Torso, banca pesada
//   Press de banca: máxima 1-2 + 4 × 4 fuerza
//   Remo con barra: Bilbo + 2 × 8-10
//   Curl martillo: 2 × 8-12, drop set en la última
//   Cardio suave: 15 min (opcional)
//
// o una tabla (como las que escriben las IA), con las columnas sesión,
// ejercicio, series × repeticiones y tipo:
//
//   | 1. Torso | Press de banca | 1 × 1-2 + 4 × 4 | serie máxima + normales |
//   |          | Remo con barra | 1 × 20-30 + 2 × 8-10 | Bilbo + normales |
//
// Palabras que entiende en las series: Bilbo, máxima, fuerza (2 en
// recámara), drop (set en la última), calentamiento, min / s (tiempo),
// opcional y superserie.

import { CATALOGO, normalizar } from './catalogo.js';
import { crearPlanesRapidos, textoForma } from './rapidas.js';
import { ejercicioDesdeCatalogo } from './vistas/selector-ejercicios.js';
import { nuevoId } from './ui.js';

export const EJEMPLO = `Día 1: Torso
Press de banca: máxima 1-2 + 4 × 4 fuerza
Remo con barra: Bilbo + 2 × 8-10
Curl martillo con mancuernas: 2 × 8-12, drop set en la última
Cardio suave: 15 min (opcional)

Día 2: Pierna
Sentadilla: máxima + 4 × 4 fuerza
Peso muerto rumano: 3 × 6-8
Rueda abdominal: 2 × 8-12`;

const limpiar = (s) => s.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim();

// Una pieza de serie: «4 × 8-10», «1 × 1-2», «15 min», «máxima 1-2», «Bilbo».
function analizarPieza(texto, tipoTexto = '', comoTexto = '') {
  const t = normalizar(`${texto} ${tipoTexto}`);
  const conComo = normalizar(`${t} ${comoTexto}`);
  const forma = { tipo: 'normal', n: 1, de: null, a: null };
  const conN = texto.match(/(\d+)\s*[×x*]\s*(\d+)(?:\s*[-–a]\s*(\d+))?\s*(min|minutos|seg|s\b)?/i);
  const soloTiempo = !conN && texto.match(/(\d+)\s*(min|minutos|seg|s\b)/i);
  const soloReps = !conN && !soloTiempo && texto.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (conN) {
    forma.n = Number(conN[1]);
    forma.de = Number(conN[2]);
    forma.a = conN[3] != null ? Number(conN[3]) : forma.de;
    if (conN[4] && /min/i.test(conN[4])) { forma.de *= 60; forma.a *= 60; }
  } else if (soloTiempo) {
    forma.de = forma.a = Number(soloTiempo[1]) * (/min/i.test(soloTiempo[2]) ? 60 : 1);
    forma.tiempo = true;
  } else if (soloReps) {
    forma.de = Number(soloReps[1]);
    forma.a = soloReps[2] != null ? Number(soloReps[2]) : forma.de;
  }
  if (/bilbo/.test(t)) forma.tipo = 'bilbo';
  else if (/maxim/.test(t)) { forma.tipo = 'maxima'; forma.de ??= 1; forma.a ??= 2; }
  else if (/drop/.test(t)) forma.tipo = 'ultima-drop';
  else if (/calent/.test(t)) forma.tipo = 'calentamiento';
  else if (/fuerza/.test(t)) forma.tipo = 'fuerza';
  // «2 en recámara» (o «2-3 en recámara»): el peso sube solo si te dejas esas.
  const recamara = conComo.match(/(\d)(?:\s*-\s*\d)?\s*en recamara/);
  if (recamara && forma.tipo !== 'maxima' && forma.tipo !== 'bilbo') forma.recamaraMin = Number(recamara[1]);
  if (forma.de == null && forma.tipo !== 'bilbo') return null;
  if (forma.de != null && forma.a != null && forma.de > forma.a) [forma.de, forma.a] = [forma.a, forma.de];
  return forma;
}

// «1 × 1-2 + 4 × 4» con «serie máxima + normales» → dos formas.
function analizarSeries(seriesTexto, tipoTexto = '', comoTexto = '') {
  const piezas = seriesTexto.split(/\s*[+,;]\s*/).map((x) => x.trim()).filter(Boolean);
  const tipos = tipoTexto.split(/\s*[+,;]\s*/).map((x) => x.trim()).filter(Boolean);
  // El «cómo» va por frases («máxima…; después 80-85 %, 2 en recámara»):
  // una por pieza si cuadran, y si no, la misma para todas.
  const comos = comoTexto.split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);
  const formas = [];
  const todo = `${seriesTexto} ${tipoTexto} ${comoTexto}`;
  const marcas = { opcional: /opcional/i.test(todo), superserie: /superserie/i.test(todo) };
  piezas.forEach((pieza, i) => {
    const tipo = tipos.length === piezas.length ? tipos[i] : tipos.join(' ');
    const como = comos.length === piezas.length ? comos[i] : comos.join(' ');
    const forma = analizarPieza(pieza, tipo, como);
    if (forma) formas.push(forma);
    else if (formas.length && /drop|maxim|fuerza|recamara|calent/i.test(pieza)) {
      // «2 × 8-12, drop set en la última»: la palabra va con la pieza anterior.
      const ultima = formas.at(-1);
      if (/drop/i.test(pieza)) ultima.tipo = 'ultima-drop';
      else if (/maxim/i.test(pieza)) ultima.tipo = 'maxima';
      else if (/fuerza|recamara/i.test(pieza)) ultima.tipo = 'fuerza';
      else if (/calent/i.test(pieza)) ultima.tipo = 'calentamiento';
    }
  });
  return { formas, ...marcas };
}

const esCabeceraDia = (linea) => /^(#+\s*|d[ií]a\b|sesi[oó]n\b)/i.test(linea);
const nombreDeDia = (linea) => limpiar(linea.replace(/^#+\s*/, '').replace(/^\*+/, '')) || 'Día';

// Analiza el texto. Devuelve { nombre, dias: [{ nombre, ejercicios: [{ nombre,
// formas, opcional, superserie, linea }] }], avisos }.
export function analizarRutina(texto) {
  const dias = [];
  const avisos = [];
  let nombre = '';
  const diaActual = () => { if (!dias.length) dias.push({ nombre: 'Día 1', ejercicios: [] }); return dias.at(-1); };
  const lineas = texto.split(/\r?\n/).map(limpiar);
  const esSeparador = (l) => l.startsWith('|') && l.split('|').slice(1, -1).map(limpiar).every((c) => /^:?-+:?$/.test(c));
  // Una tabla vale si su cabecera (la fila sobre la de «---») habla de
  // ejercicios; así se salta un resumen de series y tiempos, por ejemplo.
  let tablaValida = true;
  for (const [i, linea] of lineas.entries()) {
    if (!linea) continue;
    // Fila de tabla: | sesión | ejercicio | series | tipo | …
    if (linea.startsWith('|')) {
      if (esSeparador(linea)) continue;
      if (esSeparador(lineas[i + 1] ?? '')) { tablaValida = /ejercicio/i.test(linea); continue; }
      if (!tablaValida) continue;
      const celdas = linea.split('|').slice(1, -1).map(limpiar);
      if (celdas.length < 3 || (/ejercicio/i.test(celdas[1]) && /serie/i.test(celdas[2]))) continue;
      const [sesion, ejercicio, series, tipo = '', como = ''] = celdas;
      if (sesion) dias.push({ nombre: nombreDeDia(sesion.replace(/^\d+[.)]\s*/, '')), ejercicios: [] });
      if (!ejercicio) continue;
      const { formas, opcional, superserie } = analizarSeries(series, tipo, como);
      if (!formas.length) avisos.push(`«${ejercicio}»: no entiendo las series «${series}»; entra sin series.`);
      diaActual().ejercicios.push({ nombre: ejercicio, formas, opcional, superserie, linea, nota: como || null });
      continue;
    }
    const rutina = linea.match(/^rutina\s*:\s*(.+)$/i);
    if (rutina) { nombre = rutina[1].trim(); continue; }
    if (esCabeceraDia(linea)) { dias.push({ nombre: nombreDeDia(linea), ejercicios: [] }); continue; }
    const partes = linea.match(/^(.+?)\s*(?::|\s[-–—]\s)\s*(.+)$/);
    if (!partes) {
      // Sin dos puntos ni números: el nombre de un día («Torso A»).
      if (!/\d/.test(linea)) dias.push({ nombre: nombreDeDia(linea), ejercicios: [] });
      else avisos.push(`No entiendo la línea «${linea}».`);
      continue;
    }
    const [, nombreEj, conParentesis] = partes;
    // Lo que va entre paréntesis es una nota («en racimo: 45 s entre series»),
    // salvo «opcional» y «superserie», que son marcas.
    const notas = [];
    const resto = conParentesis.replace(/\(([^)]*)\)/g, (_, dentro) => {
      if (/^\s*(opcional|superserie)\s*$/i.test(dentro)) return ` ${dentro} `;
      notas.push(dentro.trim());
      return ' ';
    });
    const { formas, opcional, superserie } = analizarSeries(resto);
    if (!formas.length) avisos.push(`«${nombreEj}»: no entiendo las series «${resto}»; entra sin series.`);
    diaActual().ejercicios.push({ nombre: nombreEj.replace(/^[-•*]\s*/, ''), formas, opcional, superserie, linea, nota: notas.join('; ') || null });
  }
  return { nombre, dias: dias.filter((x) => x.ejercicios.length), avisos };
}

// Con qué ejercicio tuyo o de la lista general cuadra un nombre:
// { tuyo } | { catalogo } | { nuevo: true }.
export function cuadrarEjercicio(datos, nombre, formas = []) {
  const clave = normalizar(nombre);
  const mios = datos.ejercicios.filter((e) => !e.archivado && !e.borrado);
  const exacto = mios.find((e) => normalizar(e.nombre) === clave);
  if (exacto) return { tuyo: exacto };
  const enCatalogo = CATALOGO.find((c) => normalizar(c.nombre) === clave);
  if (enCatalogo) return { catalogo: enCatalogo };
  // Parecido: uno contiene al otro («Fondos de tríceps» ↔ «Fondos de tríceps
  // (paralelas)») o comparten la mayoría de las palabras que importan
  // («Tríceps con mancuerna sobre la cabeza» ↔ «Extensión de tríceps sobre
  // la cabeza»). Primero entre los tuyos, luego en la lista general.
  const parecido = (lista, nombreDe) => {
    let mejor = null;
    for (const x of lista) {
      const n = normalizar(nombreDe(x));
      const puntos = parecidoDeNombres(clave, n);
      if (puntos >= 0.4 && (!mejor || puntos > mejor.puntos)) mejor = { x, puntos };
    }
    return mejor?.x ?? null;
  };
  const mio = parecido(mios, (e) => e.nombre);
  if (mio) return { tuyo: mio, parecido: true };
  const cat = parecido(CATALOGO, (c) => c.nombre);
  if (cat) return { catalogo: cat, parecido: true };
  return { nuevo: true, tiempo: formas.some((f) => f.tiempo) };
}

const VACIAS = new Set(['de', 'del', 'con', 'en', 'la', 'el', 'los', 'las', 'a', 'al', 'y', 'o', 'sobre', 'por', 'para', 'un', 'una', 'tipo']);
const raiz = (w) => w.replace(/(es|s)$/, '');
function palabrasClave(n) {
  return new Set(n.replace(/[()]/g, ' ').split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !VACIAS.has(w)).map(raiz));
}
// De 0 a 1: cuánto se parecen dos nombres ya normalizados.
export function parecidoDeNombres(a, b) {
  if (a === b) return 1;
  const pa = palabrasClave(a), pb = palabrasClave(b);
  if (!pa.size || !pb.size) return 0;
  const comunes = [...pa].filter((w) => pb.has(w)).length;
  const jaccard = comunes / (pa.size + pb.size - comunes);
  // Contener al otro entero vale casi tanto como ser iguales, y entre dos
  // que contienen, gana el más corto (menos palabras de más).
  if (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a))) return 0.9 - Math.abs(a.length - b.length) / 200;
  return jaccard;
}

// Crea la rutina (y los ejercicios que falten). Cambia `datos` dentro de
// estado.cambiar y devuelve el id de la rutina.
export function crearRutinaDesdeTexto(datos, analisis, { nombre, activa = true, elegidos = {} } = {}) {
  const rutina = { id: nuevoId('rut'), nombre: nombre || analisis.nombre || 'Rutina pegada', activa, diasSemana: null, sedeId: null, dias: [] };
  const creados = new Map();
  const ejercicioPara = (item) => {
    const clave = normalizar(item.nombre);
    if (creados.has(clave)) return creados.get(clave);
    const cuadre = elegidos[clave] ?? cuadrarEjercicio(datos, item.nombre, item.formas);
    let ej;
    if (cuadre.tuyo) ej = datos.ejercicios.find((e) => e.id === cuadre.tuyo.id);
    else {
      const base = cuadre.catalogo ?? { nombre: item.nombre, grupo: cuadre.tiempo ? 'cardio' : '', material: '',
        carga: cuadre.tiempo ? 'ninguna' : 'peso', esfuerzo: cuadre.tiempo ? 'tiempo' : 'repeticiones' };
      ej = ejercicioDesdeCatalogo(base);
      if (!cuadre.catalogo) ej.nombre = item.nombre;
      ej.series = [];
      datos.ejercicios.push(ej);
    }
    creados.set(clave, ej);
    return ej;
  };
  for (const dia of analisis.dias) {
    const nuevoDia = { id: nuevoId('dia'), nombre: dia.nombre, ejercicios: [] };
    for (const item of dia.ejercicios) {
      const ej = ejercicioPara(item);
      const planes = item.formas.flatMap((f) => crearPlanesRapidos(datos, ej, f));
      // Si el ejercicio no tenía series propias, estas pasan a ser las suyas;
      // si ya las tenía, estas son «solo en esta rutina».
      const propias = !(ej.series || []).some((p) => !p.soloRutina);
      for (const p of planes) { p.soloRutina = propias ? null : rutina.id; ej.series.push(p); }
      nuevoDia.ejercicios.push({ ejercicioId: ej.id, opcional: Boolean(item.opcional), superserie: Boolean(item.superserie),
        series: propias ? null : planes.map((p) => p.id), nota: item.nota ?? null });
    }
    rutina.dias.push(nuevoDia);
  }
  datos.rutinas.push(rutina);
  return rutina.id;
}

export function textoFormas(formas, ej) {
  if (!formas.length) return 'sin series';
  return formas.map((f) => textoForma(f, ej ?? { esfuerzo: { tipo: 'repeticiones' } })).join(' + ');
}
