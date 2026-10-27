// Récords, cifras del periodo y retos del mes (ideas de Lyfta, Dan,
// 27-10-2026): «que los récords estén tan accesibles es una pasada y motiva».
// Todo se calcula de las sesiones; no se guarda nada salvo qué récords salen
// en Hoy (`perfil.recordsHoy`) y si quieres retos (`perfil.retos`).

import { esfuerzoTotal, records, redondear, seriesDeEjercicio, trabajoSerie } from './calculos.js';
import { normalizar, tipoDeEjercicio } from './catalogo.js';

export const TIPOS_RECORD = {
  rm: '1RM estimado',
  peso: 'Más peso',
  reps: 'Más repeticiones',
  volumen: 'Más volumen en una serie',
  volumenDia: 'Más volumen en un día',
  tiempo: 'Más tiempo',
  distancia: 'Más distancia',
};

// Qué récords tienen sentido en un ejercicio, según lo que apunta.
export function tiposDe(ej) {
  const mide = ej.esfuerzo?.tipo ?? 'repeticiones';
  const conPeso = (ej.carga?.tipo ?? 'peso') === 'peso';
  if (mide === 'tiempo') return conPeso ? ['tiempo', 'peso'] : ['tiempo'];
  if (mide === 'distancia') return ['distancia'];
  return conPeso ? ['rm', 'peso', 'volumen', 'volumenDia', 'reps'] : ['reps', 'volumenDia'];
}

// Todos los récords de un ejercicio: { tipo: { valor, fecha, texto, detalle } }.
export function recordsDe(datos, ej) {
  const series = seriesDeEjercicio(datos, ej.id).filter((x) => x.serie.tipo !== 'calentamiento');
  if (!series.length) return {};
  const salida = {};
  const mejor = (tipo, valor, x, detalle) => {
    if (valor == null || !(valor > 0)) return;
    if (!salida[tipo] || valor > salida[tipo].valor) salida[tipo] = { valor, fecha: x.sesion.fecha, detalle };
  };
  const porDia = new Map();
  for (const x of series) {
    const s = x.serie;
    const reps = esfuerzoTotal(s);
    const carga = s.tramos?.length ? Math.max(...s.tramos.map((t) => t.carga ?? 0)) : s.carga;
    mejor('peso', carga, x, reps ? `${fmt(carga)} kg × ${fmt(reps)}` : null);
    const trabajo = trabajoSerie(s);
    mejor('volumen', trabajo, x, s.tramos?.length ? 'serie descendente' : `${fmt(s.carga)} kg × ${fmt(s.esfuerzo)}`);
    const mide = ej.esfuerzo?.tipo ?? 'repeticiones';
    if (mide === 'repeticiones') mejor('reps', reps, x, carga ? `con ${fmt(carga)} kg` : null);
    if (mide === 'tiempo') mejor('tiempo', reps, x, carga ? `con ${fmt(carga)} kg` : null);
    if (mide === 'distancia') mejor('distancia', reps, x, null);
    const dia = porDia.get(x.sesion.id) ?? { valor: 0, x };
    dia.valor += trabajo ?? (mide === 'repeticiones' ? reps ?? 0 : 0);
    porDia.set(x.sesion.id, dia);
  }
  for (const { valor, x } of porDia.values()) mejor('volumenDia', redondear(valor, 1), x, null);
  const { mejor1RM } = records(datos, ej.id);
  if (mejor1RM) salida.rm = { valor: mejor1RM.valor, fecha: mejor1RM.fecha, detalle: `${fmt(mejor1RM.serie.carga)} kg × ${fmt(esfuerzoTotal(mejor1RM.serie))}` };
  return salida;
}

const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 }));

// El valor de un récord con su unidad.
export function textoRecord(ej, tipo, r) {
  if (!r) return '—';
  if (['rm', 'peso', 'volumen'].includes(tipo)) return `${fmt(r.valor)} kg`;
  if (tipo === 'volumenDia') return ej.carga?.tipo === 'pesoCorporal' ? `${fmt(r.valor)} reps` : `${fmt(r.valor)} kg`;
  if (tipo === 'reps') return `${fmt(r.valor)} reps`;
  if (tipo === 'tiempo') {
    const s = Math.round(r.valor);
    return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`;
  }
  if (tipo === 'distancia') return `${fmt(r.valor)} ${ej.unidades?.distancia ?? 'm'}`;
  return fmt(r.valor);
}

// Los básicos, por defecto en Hoy: los que tengas hechos, hasta cuatro.
const BASICOS = ['press de banca', 'press banca', 'sentadilla', 'peso muerto', 'press militar', 'dominadas', 'remo con barra'];
export function recordsParaHoy(datos) {
  const elegidos = datos.perfil.recordsHoy;
  const conHistorial = (ej) => ej && !ej.borrado && seriesDeEjercicio(datos, ej.id).length > 0;
  if (Array.isArray(elegidos)) {
    return elegidos.map((r) => ({ ...r, ej: datos.ejercicios.find((e) => e.id === r.ejercicioId) })).filter((r) => r.ej && !r.ej.borrado);
  }
  const salida = [];
  for (const nombre of BASICOS) {
    const ej = datos.ejercicios.find((e) => normalizar(e.nombre) === nombre || normalizar(e.nombre).startsWith(`${nombre} (`));
    if (conHistorial(ej) && !salida.some((x) => x.ej.id === ej.id)) salida.push({ ejercicioId: ej.id, tipo: tiposDe(ej)[0], ej });
    if (salida.length >= 4) break;
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Cifras de un periodo: entrenamientos, volumen y minutos, por semanas.
// ---------------------------------------------------------------------------

const DIA_MS = 86_400_000;
const isoDe = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

export function sesionesHechas(datos) {
  return datos.sesiones.filter((s) => !s.borrada && !s.tutorial && s.estado !== 'en-curso'
    && s.ejercicios.some((e) => e.series.some((x) => x.hecha)));
}

export function cifrasDeSesion(datos, s) {
  let volumen = 0;
  for (const e of s.ejercicios) {
    const ej = datos.ejercicios.find((x) => x.id === e.ejercicioId);
    if (ej && tipoDeEjercicio(ej) !== 'fuerza') continue;
    for (const x of e.series) if (x.hecha && x.tipo !== 'calentamiento') volumen += trabajoSerie(x) ?? 0;
  }
  const minutos = s.inicio && s.fin ? Math.max(0, Math.round((new Date(s.fin) - new Date(s.inicio)) / 60000)) : 0;
  return { volumen, minutos: minutos > 600 ? 0 : minutos };
}

// Semanas (de lunes a domingo) de las últimas `n`, con lo de cada una, y el
// total de las `n` anteriores para comparar.
export function cifrasPorSemanas(datos, n = 12, hoy = new Date()) {
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const inicio = new Date(lunes.getTime() - (n - 1) * 7 * DIA_MS);
  const antes = new Date(inicio.getTime() - n * 7 * DIA_MS);
  const semanas = [...Array(n)].map((_, i) => ({ desde: isoDe(new Date(inicio.getTime() + i * 7 * DIA_MS)), entrenamientos: 0, volumen: 0, minutos: 0 }));
  const previo = { entrenamientos: 0, volumen: 0, minutos: 0 };
  for (const s of sesionesHechas(datos)) {
    const f = new Date(`${s.fecha}T12:00:00`);
    const c = cifrasDeSesion(datos, s);
    if (f >= inicio) {
      const i = Math.min(n - 1, Math.floor((f - inicio) / (7 * DIA_MS)));
      semanas[i].entrenamientos += 1; semanas[i].volumen += c.volumen; semanas[i].minutos += c.minutos;
    } else if (f >= antes) {
      previo.entrenamientos += 1; previo.volumen += c.volumen; previo.minutos += c.minutos;
    }
  }
  const total = (k) => semanas.reduce((t, x) => t + x[k], 0);
  return { semanas, desde: isoDe(inicio), hasta: isoDe(new Date(lunes.getTime() + 6 * DIA_MS)), previo,
    total: { entrenamientos: total('entrenamientos'), volumen: total('volumen'), minutos: total('minutos') } };
}

// ---------------------------------------------------------------------------
// Retos del mes, a tu medida: un poco por encima de tu media de los tres
// meses anteriores (Dan eligió «a tu medida» frente a retos fijos).
// ---------------------------------------------------------------------------

function totalesDelMes(datos, anioMes) {
  const t = { entrenamientos: 0, volumen: 0, minutos: 0 };
  for (const s of sesionesHechas(datos)) {
    if (!s.fecha.startsWith(anioMes)) continue;
    const c = cifrasDeSesion(datos, s);
    t.entrenamientos += 1; t.volumen += c.volumen; t.minutos += c.minutos;
  }
  return t;
}

const redondoArriba = (n, paso) => Math.max(paso, Math.ceil(n / paso) * paso);

export function retosDelMes(datos, hoy = new Date()) {
  const am = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
  const actual = am(hoy);
  const anteriores = [1, 2, 3].map((k) => totalesDelMes(datos, am(new Date(hoy.getFullYear(), hoy.getMonth() - k, 1))));
  const conDatos = anteriores.filter((t) => t.entrenamientos > 0);
  const media = (k) => (conDatos.length ? conDatos.reduce((t, x) => t + x[k], 0) / conDatos.length : 0);
  const ahora = totalesDelMes(datos, actual);
  const retos = [];
  // Entrenamientos: uno más que tu media (o 8 si aún no hay historial).
  retos.push({ clave: 'entrenamientos', texto: 'entrenamientos', meta: conDatos.length ? Math.max(4, Math.round(media('entrenamientos')) + 1) : 8, hecho: ahora.entrenamientos });
  if (media('volumen') > 0) retos.push({ clave: 'volumen', texto: 'kg levantados', meta: redondoArriba(media('volumen') * 1.1, 1000), hecho: Math.round(ahora.volumen) });
  if (media('minutos') > 0) retos.push({ clave: 'minutos', texto: 'minutos entrenando', meta: redondoArriba(media('minutos') * 1.1, 30), hecho: ahora.minutos });
  return { mes: actual, retos };
}
