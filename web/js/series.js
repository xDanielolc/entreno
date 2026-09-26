// Crea una serie a partir de su plantilla en el ejercicio, ya rellena con lo
// que toca hoy: la carga del día del ciclo, el objetivo a superar y, en un
// drop set, las bajadas propuestas.

import {
  aPesoDisponible, cargaCorporal, esfuerzoTotal, lecturaDesdeCarga, redondear, rmDeReferencia, sugerenciaSerie,
  tramosPropuestos, usaTramos,
} from './calculos.js';
import { recamaraDe, tramosDe } from './esquema.js';
import { modeloDe, repsParaIgualar, rmDeSerie } from './formula1rm.js';
import { nuevoId } from './ui.js';
import { aplicarPreset, empezarCicloNuevo, renovarSiToca } from './ciclos.js';
import { progresionPorDefecto, serieNuevaPlantilla } from './esquema.js';

// La regla de un ejercicio que aún no tiene ninguna: si en el cuestionario
// dijiste que buscas fuerza, Bilbo; si no, el rango de hipertrofia (6-10).
// Los que no llevan peso y repeticiones se quedan en «solo apuntar».
export function planPorDefecto(datos, ejercicio) {
  const conPeso = ejercicio.carga?.tipo !== 'ninguna' && ejercicio.esfuerzo?.tipo === 'repeticiones';
  if (!conPeso) return serieNuevaPlantilla(ejercicio, { tipo: 'libre', progresion: 'libre' });
  if (datos.perfil?.cuestionario?.objetivo === 'fuerza') {
    const plan = serieNuevaPlantilla(ejercicio, { tipo: 'bilbo', progresion: 'bilbo' });
    plan.progresion.preset = 'bilbo';
    aplicarPreset(plan.progresion, 'bilbo', ejercicio);
    return plan;
  }
  const plan = serieNuevaPlantilla(ejercicio, { tipo: 'libre', progresion: 'carga' });
  plan.progresion = { ...progresionPorDefecto('carga', ejercicio), objetivoEsfuerzo: [6, 10] };
  return plan;
}

export function crearSerieDesdePlan(datos, ejercicio, plan, { excluirSesion } = {}) {
  // Un ciclo sin montar (Bilbo puesto por defecto, por ejemplo) se monta en
  // cuanto hay un 1RM del que partir. La primera vez no lo hay: haces lo que
  // puedas y con eso queda montado para la siguiente.
  if (plan.progresion?.tipo === 'bilbo' && !plan.progresion.ciclos?.length
    && rmDeReferencia(datos, ejercicio, { excluirSesion })) {
    empezarCicloNuevo(datos, ejercicio, plan);
  }
  let s = sugerenciaSerie(datos, ejercicio, plan, { excluirSesion });
  // Un ciclo terminado o agotado empieza el siguiente solo (si no es manual).
  if (renovarSiToca(datos, ejercicio, plan, s)) s = sugerenciaSerie(datos, ejercicio, plan, { excluirSesion });
  const carga = s.carga ?? null;
  const serie = {
    id: nuevoId('s'),
    planId: plan.id,
    tipo: plan.tipo,
    tecnicas: [...(plan.tecnicas || [])],
    detalle: {},
    recamara: recamaraDe(plan.tecnicas, ejercicio.recamaraPorDefecto ?? datos.perfil.recamaraPorDefecto ?? 1),
    carga,
    lectura: ejercicio.carga.tipo === 'asistida' ? lecturaDesdeCarga(carga, datos.perfil.pesoCorporalKg) : null,
    esfuerzo: null,
    esfuerzoExtra: null,
    objetivo: s.objetivoSuperar ?? s.esfuerzoObjetivo ?? null,
    // Objetivo del día de las demás medidas (la distancia, por ejemplo).
    objetivosExtra: s.objetivosExtra ?? null,
    hecha: false,
    tramos: null,
    cicloN: s.cicloN ?? null,
    diaCiclo: s.dia ?? null,
    lastre: null,
  };
  // Peso corporal: la carga sale de tu peso (y del lastre de la última vez).
  if (ejercicio.carga.tipo === 'pesoCorporal') {
    serie.lastre = s.ultima?.serie.lastre ?? 0;
    serie.carga = cargaCorporal(ejercicio, datos.perfil.pesoCorporalKg, serie.lastre) ?? carga;
  }
  if (usaTramos(plan.tecnicas)) {
    // Un drop set suele arrancar a un porcentaje del 1RM (80 % por defecto).
    const inicio = plan.tramoInicio ?? datos.perfil.dropSet?.inicioPorcentaje ?? null;
    if (serie.carga == null && inicio) {
      const rm = rmDeReferencia(datos, ejercicio, { cicloN: serie.cicloN, excluirSesion });
      if (rm) serie.carga = aPesoDisponible(ejercicio, (rm.valor * inicio) / 100);
    }
    serie.tramos = tramosPropuestos(serie, plan, s.ultima?.serie ?? null, datos.perfil);
    // Cada tramo guarda su porcentaje del 1RM: así, cuando hoy hagas la serie
    // de arriba, los kilos se ajustan a tu 1RM de hoy.
    const rm = rmDeReferencia(datos, ejercicio, { cicloN: serie.cicloN, excluirSesion });
    if (rm) for (const tramo of serie.tramos) if (tramo.carga != null) tramo.pct = redondear((tramo.carga / rm.valor) * 100, 1);
  }
  return serie;
}

// Un plan de programa (5×5, 5/3/1, HST) mete varias series de golpe, cada
// una con su peso y sus repeticiones.
export function seriesDesdePlan(datos, ejercicio, plan, { excluirSesion } = {}) {
  const base = crearSerieDesdePlan(datos, ejercicio, plan, { excluirSesion });
  if (plan.progresion?.tipo !== 'programa') return [base];
  const s = sugerenciaSerie(datos, ejercicio, plan, { excluirSesion });
  if (!s.seriesPrograma?.length) return [base];
  return s.seriesPrograma.map((x, k) => ({
    ...structuredClone(base), id: nuevoId('s'), carga: x.carga, objetivo: x.reps, programaSet: k + 1, amrap: Boolean(x.amrap),
  }));
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
  // Un ejercicio sin regla recibe la de por defecto la primera vez que entra
  // en un entrenamiento, y se queda guardada en su ficha.
  if (!ej.series?.length) {
    const propio = datos.ejercicios?.find((x) => x.id === ej.id) ?? ej;
    propio.series = [planPorDefecto(datos, propio)];
    ej = propio;
  }
  const planes = ej.series?.length ? ej.series : [];
  const entrada = {
    ejercicioId: ej.id, cicloN: null, diaCiclo: null, notas: '',
    series: planes.flatMap((plan) => seriesDesdePlan(datos, ej, plan, { excluirSesion })),
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

// Cuánto rindes en la primera bajada respecto al 1RM que acabas de hacer en
// la serie de arriba: no es lo mismo tu 1RM en la primera serie que tras
// ella. Se aprende de tus drop sets anteriores de esta serie (el 1RM que
// «dice» su primera bajada, entre el de la serie de arriba) y se aplica con
// prudencia: con un drop set, la mitad del ajuste; con tres, el 75 %.
export function fatigaTrasSerie(datos, ejercicio, planId, { excluirSesion } = {}) {
  const ratios = [];
  const sesiones = datos.sesiones.filter((s) => !s.borrada && s.id !== excluirSesion)
    .sort((a, b) => (b.fecha + (b.inicio || '')).localeCompare(a.fecha + (a.inicio || '')));
  for (const sesion of sesiones) {
    for (const entrada of sesion.ejercicios) {
      if (entrada.ejercicioId !== ejercicio.id) continue;
      for (const s of entrada.series) {
        const primera = s.tramos?.[0];
        const base = s.rmUsado?.base ?? s.rmUsado?.valor;
        if (s.planId !== planId || !s.rmUsado?.deHoy || !base || !(primera?.carga > 0) || !(primera?.esfuerzo > 0)) continue;
        const rm = rmDeSerie(datos, ejercicio, { carga: primera.carga, esfuerzo: primera.esfuerzo, recamara: 0 }, primera.esfuerzo);
        if (rm) ratios.push(rm / base);
      }
    }
    if (ratios.length >= 5) break;
  }
  if (!ratios.length) return { factor: 1, veces: 0 };
  const media = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const factor = Math.min(1.05, Math.max(0.7, 1 + (media - 1) * (ratios.length / (ratios.length + 1))));
  return { factor: redondear(factor, 2), veces: ratios.length };
}

// ¿La primera bajada ha salido muy lejos de lo que esperaba la fórmula?
// Devuelve un aviso (o null) para enseñarlo bajo la serie.
export function avisoPrimeraBajada(datos, ejercicio, serie) {
  const primera = serie.tramos?.[0];
  if (!serie.rmUsado?.valor || !(primera?.carga > 0) || primera.esfuerzo == null) return null;
  const esperadas = repsParaIgualar(modeloDe(datos, ejercicio), serie.rmUsado.valor, primera.carga, 0);
  if (!(esperadas >= 4)) return null;
  const hechas = primera.esfuerzo;
  const redondo = Math.round(esperadas);
  if (hechas < esperadas * 0.75) {
    return `Con ${primera.carga} kg la fórmula esperaba unas ${redondo} repeticiones y han salido ${hechas}. Puede que la fórmula esté `
      + 'desajustada en este ejercicio, que vengas cansado de la serie anterior o que no estés bien recuperado. '
      + 'La app lo tendrá en cuenta: la próxima vez propondrá algo menos de peso en la primera bajada.';
  }
  if (hechas > esperadas * 1.25) {
    return `Con ${primera.carga} kg la fórmula esperaba unas ${redondo} repeticiones y han salido ${hechas}: has rendido bastante más. `
      + 'La próxima vez la primera bajada irá con algo más de peso.';
  }
  return null;
}

// 1RM de referencia para una serie con tramos: el mejor de las series de
// arriba que ya has hecho hoy, corregido por lo que sueles rendir tras
// ellas; si aún no hay, el de tu historial.
export function rmParaTramos(datos, ejercicio, entrada, j, { excluirSesion } = {}) {
  const arriba = entrada.series.slice(0, j).filter((x) => x.hecha && !x.tramos?.length && x.tipo !== 'calentamiento');
  const rms = arriba.map((x) => rmDeSerie(datos, ejercicio, x, esfuerzoTotal(x))).filter(Boolean);
  if (rms.length) {
    const base = Math.max(...rms);
    const fatiga = fatigaTrasSerie(datos, ejercicio, entrada.series[j]?.planId, { excluirSesion });
    return { valor: redondear(base * fatiga.factor, 1), base: redondear(base, 1), fatiga: fatiga.factor, deHoy: true };
  }
  const historial = rmDeReferencia(datos, ejercicio, { cicloN: entrada.cicloN, excluirSesion });
  return historial ? { valor: historial.valor, deHoy: false } : null;
}

// «Elegir carga por»: en 'rm' cada tramo guarda su porcentaje del 1RM y los
// kilos se recalculan cuando cambia el 1RM; en 'kg' los kilos son fijos.
// Se decide en cuatro niveles, del más concreto al más general: la serie de
// hoy, el ejercicio dentro de la rutina, el ejercicio y Ajustes. Con pesos
// fijos de máquina de placas, siempre kilos.
export function modoCargaDe(datos, ejercicio, serie, sesion = null) {
  const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
  if (plan?.tramosFijos?.length) return 'kg';
  const item = sesion?.rutinaId
    ? datos.rutinas.find((r) => r.id === sesion.rutinaId)?.dias.find((x) => x.id === sesion.diaRutinaId)
      ?.ejercicios.find((x) => x.ejercicioId === ejercicio.id)
    : null;
  return serie.modoCarga ?? item?.modoCarga ?? plan?.modoCarga ?? datos.perfil.dropSet?.modoCarga
    ?? (datos.perfil.dropSet?.autoRellenar === false ? 'kg' : 'rm');
}

// De dónde viene el modo que se está aplicando, para explicarlo en pantalla.
export function origenModoCarga(datos, ejercicio, serie, sesion = null) {
  const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
  if (plan?.tramosFijos?.length) return 'pesos fijos de la máquina';
  if (serie.modoCarga) return 'elegido hoy';
  const item = sesion?.rutinaId
    ? datos.rutinas.find((r) => r.id === sesion.rutinaId)?.dias.find((x) => x.id === sesion.diaRutinaId)
      ?.ejercicios.find((x) => x.ejercicioId === ejercicio.id)
    : null;
  if (item?.modoCarga) return 'de la rutina';
  if (plan?.modoCarga) return 'de la ficha del ejercicio';
  return 'de Ajustes';
}

// Recalcula los kilos de los tramos en modo 'rm' de las series que aún no
// has empezado. Da igual en qué orden hayas tocado las casillas: los kilos
// siempre salen de porcentaje × 1RM. Devuelve las series que ha tocado.
export function recalcularTramos(datos, ejercicio, entrada, { excluirSesion, sesion = null } = {}) {
  const tocadas = [];
  entrada.series.forEach((serie, j) => {
    if (!serie.tramos?.length || modoCargaDe(datos, ejercicio, serie, sesion) !== 'rm') return;
    if (serie.tramos.some((t) => t.esfuerzo != null)) return;
    const rm = rmParaTramos(datos, ejercicio, entrada, j, { excluirSesion });
    if (!rm) return;
    const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
    const inicio = plan?.tramoInicio ?? datos.perfil.dropSet?.inicioPorcentaje ?? 80;
    const salto = saltoDeTramo(datos, ejercicio, serie);
    // Los tramos sin porcentaje bajan desde el primero, de salto en salto.
    const primero = serie.tramos[0]?.pct ?? inicio;
    const base = aPesoDisponible(ejercicio, (rm.valor * primero) / 100);
    serie.tramos.forEach((tramo, k) => {
      if (tramo.pct == null) {
        const kilos = tramo.carga ?? Math.max(0, base - salto * k);
        tramo.pct = redondear((kilos / rm.valor) * 100, 1);
      }
      tramo.carga = aPesoDisponible(ejercicio, (rm.valor * tramo.pct) / 100);
    });
    serie.carga = serie.tramos[0]?.carga ?? serie.carga;
    serie.rmUsado = rm;
    tocadas.push(j);
  });
  return tocadas;
}
