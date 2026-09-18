// Crea una serie a partir de su plantilla en el ejercicio, ya rellena con lo
// que toca hoy: la carga del día del ciclo, el objetivo a superar y, en un
// drop set, las bajadas propuestas.

import {
  aPasoDeDisco, esfuerzoTotal, lecturaDesdeCarga, redondear, rmDeReferencia, sugerenciaSerie,
  tramosPropuestos, usaTramos,
} from './calculos.js';
import { recamaraDe, tramosDe } from './esquema.js';
import { rmDeSerie } from './formula1rm.js';
import { nuevoId } from './ui.js';

export function crearSerieDesdePlan(datos, ejercicio, plan, { excluirSesion } = {}) {
  const s = sugerenciaSerie(datos, ejercicio, plan, { excluirSesion });
  const carga = s.carga ?? null;
  const serie = {
    id: nuevoId('s'),
    planId: plan.id,
    tipo: plan.tipo,
    tecnicas: [...(plan.tecnicas || [])],
    detalle: {},
    recamara: recamaraDe(plan.tecnicas, datos.perfil.recamaraPorDefecto ?? 1),
    carga,
    lectura: ejercicio.carga.tipo === 'asistida' ? lecturaDesdeCarga(carga, datos.perfil.pesoCorporalKg) : null,
    esfuerzo: null,
    esfuerzoExtra: null,
    objetivo: s.objetivoSuperar ?? s.esfuerzoObjetivo ?? null,
    hecha: false,
    tramos: null,
    cicloN: s.cicloN ?? null,
    diaCiclo: s.dia ?? null,
  };
  if (usaTramos(plan.tecnicas)) {
    // Un drop set suele arrancar a un porcentaje del 1RM (80 % por defecto).
    const inicio = plan.tramoInicio ?? datos.perfil.dropSet?.inicioPorcentaje ?? null;
    if (serie.carga == null && inicio) {
      const rm = rmDeReferencia(datos, ejercicio, { cicloN: serie.cicloN, excluirSesion });
      if (rm) serie.carga = aPasoDeDisco((rm.valor * inicio) / 100);
    }
    serie.tramos = tramosPropuestos(serie, plan, s.ultima?.serie ?? null, datos.perfil);
    // Cada tramo guarda su porcentaje del 1RM: así, cuando hoy hagas la serie
    // de arriba, los kilos se ajustan a tu 1RM de hoy.
    const rm = rmDeReferencia(datos, ejercicio, { cicloN: serie.cicloN, excluirSesion });
    if (rm) for (const tramo of serie.tramos) if (tramo.carga != null) tramo.pct = redondear((tramo.carga / rm.valor) * 100, 1);
  }
  return serie;
}

export function serieSuelta({ tipo = 'libre', carga = null, tecnicas = [], recamara = null } = {}) {
  return {
    id: nuevoId('s'), planId: null, tipo, tecnicas: [...tecnicas], detalle: {}, recamara,
    carga, lectura: null, esfuerzo: null, esfuerzoExtra: null, objetivo: null,
    hecha: false, tramos: null, cicloN: null, diaCiclo: null,
  };
}

// El ejercicio tal y como entra en un entrenamiento: con todas las series de
// su plantilla ya preparadas.
export function entradaDeEjercicio(datos, ej, { excluirSesion } = {}) {
  const planes = ej.series?.length ? ej.series : [];
  const entrada = {
    ejercicioId: ej.id, cicloN: null, diaCiclo: null, notas: '',
    series: planes.map((plan) => crearSerieDesdePlan(datos, ej, plan, { excluirSesion })),
  };
  const bilbo = entrada.series.find((x) => x.cicloN != null);
  if (bilbo) { entrada.cicloN = bilbo.cicloN; entrada.diaCiclo = bilbo.diaCiclo; }
  if (!entrada.series.length) entrada.series.push(serieSuelta());
  return entrada;
}

// Cuánto se baja en cada tramo nuevo: en un drop set, los kilos fijados en el
// ejercicio o en Ajustes; en rest-pause y miorrepeticiones, nada.
export function saltoDeTramo(datos, ejercicio, serie) {
  const config = tramosDe(serie.tecnicas);
  if (!config?.salto) return 0;
  const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
  return plan?.tramoSalto ?? datos.perfil.dropSet?.salto ?? config.salto;
}

// 1RM de referencia para una serie con tramos: el mejor de las series de
// arriba que ya has hecho hoy; si aún no hay, el de tu historial.
export function rmParaTramos(datos, ejercicio, entrada, j, { excluirSesion } = {}) {
  const arriba = entrada.series.slice(0, j).filter((x) => x.hecha && !x.tramos?.length && x.tipo !== 'calentamiento');
  const rms = arriba.map((x) => rmDeSerie(datos, ejercicio, x, esfuerzoTotal(x))).filter(Boolean);
  if (rms.length) return { valor: redondear(Math.max(...rms), 1), deHoy: true };
  const historial = rmDeReferencia(datos, ejercicio, { cicloN: entrada.cicloN, excluirSesion });
  return historial ? { valor: historial.valor, deHoy: false } : null;
}

// «Elegir carga por»: en 'rm' cada tramo guarda su porcentaje del 1RM y los
// kilos se recalculan cuando cambia el 1RM; en 'kg' los kilos son fijos.
// Con pesos fijos de máquina de placas, siempre kilos.
export function modoCargaDe(datos, ejercicio, serie) {
  const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
  if (plan?.tramosFijos?.length) return 'kg';
  return serie.modoCarga ?? (datos.perfil.dropSet?.autoRellenar === false ? 'kg' : 'rm');
}

// Recalcula los kilos de los tramos en modo 'rm' de las series que aún no
// has empezado. Da igual en qué orden hayas tocado las casillas: los kilos
// siempre salen de porcentaje × 1RM. Devuelve las series que ha tocado.
export function recalcularTramos(datos, ejercicio, entrada, { excluirSesion } = {}) {
  const tocadas = [];
  entrada.series.forEach((serie, j) => {
    if (!serie.tramos?.length || modoCargaDe(datos, ejercicio, serie) !== 'rm') return;
    if (serie.tramos.some((t) => t.esfuerzo != null)) return;
    const rm = rmParaTramos(datos, ejercicio, entrada, j, { excluirSesion });
    if (!rm) return;
    const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
    const inicio = plan?.tramoInicio ?? datos.perfil.dropSet?.inicioPorcentaje ?? 80;
    const salto = saltoDeTramo(datos, ejercicio, serie);
    // Los tramos sin porcentaje bajan desde el primero, de salto en salto.
    const primero = serie.tramos[0]?.pct ?? inicio;
    const base = aPasoDeDisco((rm.valor * primero) / 100);
    serie.tramos.forEach((tramo, k) => {
      if (tramo.pct == null) {
        const kilos = tramo.carga ?? Math.max(0, base - salto * k);
        tramo.pct = redondear((kilos / rm.valor) * 100, 1);
      }
      tramo.carga = aPasoDeDisco((rm.valor * tramo.pct) / 100);
    });
    serie.carga = serie.tramos[0]?.carga ?? serie.carga;
    serie.rmUsado = rm;
    tocadas.push(j);
  });
  return tocadas;
}
