// Recuperación por músculo.
//
// Cómo se calcula, y qué respalda cada parte:
//   · La síntesis de proteínas sube tras entrenar y vuelve a su sitio hacia
//     las 36 horas (MacDougall 1995).
//   · Entrenar al fallo, y sobre todo con muchas repeticiones, deja la función
//     muscular tocada hasta 48 horas (Pareja-Blanco 2020).
//   · NO hay evidencia de que cada músculo tenga su propio tiempo fijo de
//     recuperación: lo que manda es cuánto y cómo de duro entrenaste. El
//     tamaño del músculo solo ajusta un poco el resultado.
//
// Todo esto es una estimación para orientar, no una medida.

import { cuentaParaFatiga } from './catalogo.js';
import { MUSCULOS, ORDEN_MUSCULOS } from './musculos.js';

const HORAS_BASE = 36;
const HORAS_MAXIMAS = 72;

// Series efectivas de una sesión, por músculo. Con `dureza`, cada serie pesa
// según lo cerca del fallo que la dejaste (para la recuperación); sin ella,
// cada serie cuenta una (para el volumen semanal).
function fatigaDeSesion(datos, sesion, { dureza = true } = {}) {
  const porMusculo = new Map();
  for (const entrada of sesion.ejercicios) {
    const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
    if (!ej || !cuentaParaFatiga(ej)) continue;
    const principales = ej.musculos?.principales ?? [];
    const secundarios = ej.musculos?.secundarios ?? [];
    if (!principales.length && !secundarios.length) continue;

    for (const serie of entrada.series) {
      if (!serie.hecha || serie.tipo === 'calentamiento') continue;
      // Cuanto más cerca del fallo, más fatiga deja.
      const cerca = !dureza || serie.recamara == null ? 1 : serie.recamara <= 0 ? 1.3 : serie.recamara >= 3 ? 0.7 : 1;
      const hechos = (serie.tramos || []).filter((t) => t.esfuerzo != null).length;
      const tramos = hechos > 1 ? 1 + (hechos - 1) * 0.5 : 1;
      const peso = cerca * tramos;
      for (const m of principales) porMusculo.set(m, (porMusculo.get(m) ?? 0) + peso);
      for (const m of secundarios) porMusculo.set(m, (porMusculo.get(m) ?? 0) + peso * 0.5);
    }
  }
  return porMusculo;
}

function horasNecesarias(series, musculo) {
  const tamano = MUSCULOS[musculo]?.tamano ?? 'medio';
  const ajusteTamano = tamano === 'grande' ? 6 : tamano === 'pequeno' ? -6 : 0;
  const porVolumen = Math.min(24, Math.max(0, series - 3) * 4);
  return Math.min(HORAS_MAXIMAS, HORAS_BASE + ajusteTamano + porVolumen);
}

// Estado de cada músculo: 0 % recién entrenado, 100 % recuperado.
export function recuperacionPorMusculo(datos, ahora = new Date()) {
  const estado = {};
  for (const m of ORDEN_MUSCULOS) estado[m] = { musculo: m, porcentaje: 100, ultima: null, series: 0 };

  const recientes = datos.sesiones
    .filter((s) => !s.borrada && s.estado === 'terminada')
    .filter((s) => horasDesde(s, ahora) != null && horasDesde(s, ahora) <= HORAS_MAXIMAS * 1.5);

  for (const sesion of recientes) {
    const horas = horasDesde(sesion, ahora);
    for (const [musculo, series] of fatigaDeSesion(datos, sesion)) {
      if (!estado[musculo]) continue;
      const necesarias = horasNecesarias(series, musculo);
      const porcentaje = Math.max(0, Math.min(100, Math.round((horas / necesarias) * 100)));
      if (porcentaje < estado[musculo].porcentaje) {
        estado[musculo] = { musculo, porcentaje, ultima: sesion.fecha, series: Math.round(series * 10) / 10,
          horasNecesarias: Math.round(necesarias), horasRestantes: Math.max(0, Math.round(necesarias - horas)) };
      }
    }
  }
  return estado;
}

function horasDesde(sesion, ahora) {
  const marca = sesion.fin || sesion.inicio || (sesion.fecha ? `${sesion.fecha}T20:00:00` : null);
  if (!marca) return null;
  const t = new Date(marca).getTime();
  if (Number.isNaN(t)) return null;
  return (ahora.getTime() - t) / 3_600_000;
}

export function claseDeRecuperacion(porcentaje) {
  if (porcentaje >= 90) return 'listo';
  if (porcentaje >= 60) return 'medio';
  return 'cansado';
}

// Para explicar un músculo concreto: de dónde salen sus horas.
export function detalleDeRecuperacion(e) {
  if (!e.ultima) return '';
  const tamano = MUSCULOS[e.musculo]?.tamano ?? 'medio';
  const ajuste = tamano === 'grande' ? '+6 h por ser grande' : tamano === 'pequeno' ? '−6 h por ser pequeño' : 'tamaño medio';
  const extra = Math.max(0, e.series - 3) * 4;
  return `${String(e.series).replace('.', ',')} series efectivas → 36 h de base, ${ajuste}`
    + (extra ? `, +${Math.round(Math.min(24, extra))} h por las series de más` : '')
    + ` = ${e.horasNecesarias} h en total.`;
}

export function textoDeRecuperacion(e) {
  const nombre = MUSCULOS[e.musculo]?.nombre ?? e.musculo;
  if (e.porcentaje >= 100) return `${nombre}: recuperado`;
  return `${nombre}: ${e.porcentaje} %` + (e.horasRestantes ? ` · le faltan ${e.horasRestantes} h` : '');
}

// Series por músculo en los últimos 7 días, para los avisos de volumen.
export function seriesSemanales(datos, ahora = new Date()) {
  const total = {};
  for (const m of ORDEN_MUSCULOS) total[m] = 0;
  for (const sesion of datos.sesiones) {
    if (sesion.borrada || sesion.estado !== 'terminada') continue;
    const horas = horasDesde(sesion, ahora);
    if (horas == null || horas > 24 * 7) continue;
    for (const [musculo, series] of fatigaDeSesion(datos, sesion, { dureza: false })) {
      if (total[musculo] != null) total[musculo] += series;
    }
  }
  return total;
}
