// Cálculos de entrenamiento. Funciones puras: no leen ni guardan nada.

import { PROGRAMAS, TECNICAS, recamaraDe, tramosDe } from './esquema.js';
import { modeloDe, pesoParaReps, repsParaIgualar, rmDeSerie } from './formula1rm.js';
import { CATALOGO, normalizar } from './catalogo.js';

// Las fórmulas del 1RM están en formula1rm.js (Marzagao con factor personal).

// Genera la escalera de un ciclo Bilbo (de pesos, o de repeticiones y tiempo
// cuando el ejercicio no lleva carga).
export function generarEscalera({ inicial, incremento, cada = 1, dias = 17 }) {
  const escalera = [];
  for (let dia = 1; dia <= dias; dia++) {
    const subidas = Math.ceil((dia - 1) / Math.max(1, cada));
    escalera.push(redondear(inicial + incremento * subidas));
  }
  return escalera;
}

// Carga real de una serie. En una máquina asistida se apunta la ayuda que
// marca la máquina y la carga real es tu peso corporal menos esa ayuda.
export function cargaDesdeLectura(lectura, pesoCorporalKg) {
  if (lectura == null || pesoCorporalKg == null) return null;
  return redondear(pesoCorporalKg - lectura);
}

export function lecturaDesdeCarga(carga, pesoCorporalKg) {
  if (carga == null || pesoCorporalKg == null) return null;
  return redondear(pesoCorporalKg - carga);
}

// Carga real de un ejercicio de peso corporal: la parte de tu peso que
// levantas (flexiones ≈ 64 %) más el lastre que lleves.
export function cargaCorporal(ejercicio, pesoCorporalKg, lastre = 0) {
  if (pesoCorporalKg == null) return null;
  const fraccion = ejercicio.fraccionCorporal ?? 1;
  return redondear(pesoCorporalKg * fraccion + (lastre || 0), 1);
}

export function redondear(n, decimales = 2) {
  if (n == null || Number.isNaN(n)) return null;
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

// Trabajo de una serie: carga × esfuerzo, sumando los tramos si los tiene
// (una serie descendente son varias bajadas, cada una con su peso y sus repeticiones).
export function trabajoSerie(serie) {
  if (serie.tramos?.length) {
    return serie.tramos.reduce((t, x) => t + (x.carga ?? 0) * (x.esfuerzo ?? 0), 0) || null;
  }
  if (serie.carga == null || serie.esfuerzo == null) return null;
  return redondear(serie.carga * serie.esfuerzo);
}

export function esfuerzoTotal(serie) {
  if (serie.tramos?.length) return serie.tramos.reduce((t, x) => t + (x.esfuerzo ?? 0), 0) || null;
  return serie.esfuerzo;
}

export function usaTramos(tecnicas) {
  return Boolean(tramosDe(tecnicas));
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

// Todas las series hechas de un ejercicio, en orden cronológico. Se puede
// filtrar por la serie de la plantilla (planId) y excluir una sesión.
export function seriesDeEjercicio(datos, ejercicioId, { excluirSesion, planId } = {}) {
  const resultado = [];
  const sesiones = [...datos.sesiones].sort((a, b) =>
    (a.fecha + (a.inicio || '')).localeCompare(b.fecha + (b.inicio || '')));
  for (const sesion of sesiones) {
    if (sesion.id === excluirSesion || sesion.borrada) continue;
    for (const entrada of sesion.ejercicios) {
      if (entrada.ejercicioId !== ejercicioId) continue;
      for (const serie of entrada.series) {
        if (!serie.hecha) continue;
        if (planId && serie.planId !== planId) continue;
        resultado.push({ sesion, entrada, serie });
      }
    }
  }
  return resultado;
}

export function cicloActual(plan) {
  const p = plan.progresion;
  return p?.ciclos?.find((c) => c.n === p.cicloActual) ?? null;
}

// Días registrados del ciclo, por número de día.
export function registrosDelCiclo(datos, ejercicio, plan, cicloN, { excluirSesion } = {}) {
  return seriesDeEjercicio(datos, ejercicio.id, { excluirSesion, planId: plan.id })
    .filter((x) => x.entrada.cicloN === cicloN)
    .map((x) => ({ dia: x.entrada.diaCiclo, fecha: x.sesion.fecha, serie: x.serie }));
}

// ---------------------------------------------------------------------------
// Qué toca hoy
// ---------------------------------------------------------------------------

// Devuelve siempre un objeto con la misma forma, sea cual sea la progresión:
//   modo, carga, esfuerzoObjetivo, objetivoSuperar, texto…
export function sugerenciaSerie(datos, ejercicio, plan, { excluirSesion, rmHoy = null } = {}) {
  const prog = plan.progresion || { tipo: 'libre' };
  const sobre = prog.sobre || (ejercicio.carga?.tipo === 'ninguna' ? 'esfuerzo' : 'carga');
  const historial = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion, planId: plan.id });
  const ultima = historial.at(-1) ?? null;
  // Si esta serie es nueva pero el ejercicio ya se ha hecho, se parte de la
  // última carga conocida: así una serie descendente recién creada no sale vacía.
  const referencia = ultima
    ?? seriesDeEjercicio(datos, ejercicio.id, { excluirSesion }).filter((x) => x.serie.carga != null).at(-1)
    ?? null;
  // «Primera vez» solo si el ejercicio no se ha hecho nunca, con ninguna serie.
  const base = { modo: prog.tipo, sobre, ultima, referencia, primeraVez: !ultima && !referencia };

  if (prog.tipo === 'bilbo') return { ...base, ...sugerenciaBilbo(datos, ejercicio, plan, { excluirSesion, sobre, rmHoy }) };

  if (prog.tipo === 'programa') return { ...base, ...sugerenciaPrograma(datos, ejercicio, plan, { excluirSesion }) };

  if (prog.tipo === 'maximo-trabajo') {
    return { ...base, ...maximoTrabajo(datos, ejercicio, { excluirSesion, tope: prog.topeEsfuerzo ?? 50 }) };
  }

  if (prog.tipo === 'carga' && prog.porRM && sobre === 'carga') {
    return { ...base, ...sugerenciaPorRM(datos, ejercicio, plan, { excluirSesion, ultima }) };
  }

  if (prog.tipo === 'carga') {
    const [, max] = prog.objetivoEsfuerzo || plan.objetivoEsfuerzo || [];
    if (!ultima) {
      // Sin historial de esta serie: si hay un 1RM (de otras series o puesto
      // a mano), el peso es el que da el máximo del rango con la recámara
      // pedida. Si no hay 1RM, la primera serie del día hace de prueba.
      // Con tu peso no hace falta prueba: el peso ya se sabe (el tuyo).
      const conPeso = sobre === 'carga' && !['ninguna', 'altura', 'pesoCorporal'].includes(ejercicio.carga?.tipo);
      const rm = conPeso ? rmDeReferencia(datos, ejercicio, { excluirSesion }) : null;
      let carga = referencia?.serie.carga ?? null;
      let porFormula = false;
      if (rm && max > 0) {
        const recamara = recamaraPorDefectoDe(datos, ejercicio, plan);
        const peso = pesoParaReps(modeloDe(datos, ejercicio), rm.valor, max, recamara);
        if (peso > 0) { carga = aPesoDisponible(ejercicio, peso, { rm: rm.valor }); porFormula = true; }
      }
      return { ...base, rango: prog.objetivoEsfuerzo ?? plan.objetivoEsfuerzo, recamaraMin: prog.recamaraMin ?? null, carga, porFormula,
        rmUsado: rm?.valor ?? null, sinRM: conPeso && !rm };
    }
    const valorUltimo = sobre === 'carga' ? ultima.serie.carga : esfuerzoTotal(ultima.serie);
    // Sube al llegar al máximo del rango. Si la regla pide recámara (fuerza:
    // «5 con 2 en recámara»), llegar al máximo apurando no cuenta.
    const recamaraOk = prog.recamaraMin == null || ultima.serie.recamara == null || ultima.serie.recamara >= prog.recamaraMin;
    const sube = max != null && esfuerzoTotal(ultima.serie) >= max && recamaraOk;
    const faltaRecamara = max != null && esfuerzoTotal(ultima.serie) >= max && !recamaraOk;
    // En una máquina con sus pesos, subir es pasar al siguiente peso que hay;
    // si no, se suma el incremento y se deja en un peso que exista (disco).
    const siguiente = !sube ? valorUltimo
      : sobre === 'carga' && ejercicio.pesosMaquina?.length ? aPesoDisponible(ejercicio, valorUltimo ?? 0, { hacia: 'arriba' })
        : sobre === 'carga' ? Math.max(aPesoDisponible(ejercicio, (valorUltimo ?? 0) + (prog.incremento || 0)),
          aPesoDisponible(ejercicio, valorUltimo ?? 0, { hacia: 'arriba' }))
          : redondear((valorUltimo ?? 0) + (prog.incremento || 0));
    return {
      ...base,
      rango: prog.objetivoEsfuerzo,
      recamaraMin: prog.recamaraMin ?? null,
      sube,
      faltaRecamara,
      carga: sobre === 'carga' ? siguiente : ultima.serie.carga,
      esfuerzoObjetivo: sobre === 'carga' ? (sube ? prog.objetivoEsfuerzo?.[0] : null) : siguiente,
    };
  }

  if (prog.tipo === 'esfuerzo') {
    if (!ultima) return { ...base, carga: referencia?.serie.carga ?? null };
    // «A más cada vez»: más repeticiones con el mismo peso, o más peso con
    // las mismas repeticiones.
    if (sobre === 'carga') {
      return {
        ...base,
        carga: ejercicio.pesosMaquina?.length
          ? aPesoDisponible(ejercicio, ultima.serie.carga ?? 0, { hacia: 'arriba' })
          : redondear((ultima.serie.carga ?? 0) + (prog.incremento || 2.5)),
        esfuerzoObjetivo: esfuerzoTotal(ultima.serie),
      };
    }
    return {
      ...base,
      carga: ultima.serie.carga,
      esfuerzoObjetivo: redondear((esfuerzoTotal(ultima.serie) ?? 0) + (prog.incremento || 1)),
    };
  }

  // Calentamiento al % de tu 1RM («50 % × 8»); con 0 %, la barra sola.
  if (prog.porRM?.fija === 'pct' && sobre === 'carga') {
    const rm = rmReciente(datos, ejercicio, prog.porRM.semanas ?? 8, { excluirSesion });
    const carga = prog.porRM.valor > 0 ? (rm ? aPesoDisponible(ejercicio, (rm.valor * prog.porRM.valor) / 100, { rm: rm.valor, calentamiento: Boolean(plan.calentamiento) }) : null)
      : (pesoMinimoDe(ejercicio) || null);
    return { ...base, carga, pct: prog.porRM.valor, rmUsado: rm?.valor ?? null, rango: plan.objetivoEsfuerzo };
  }
  return { ...base, carga: ultima?.serie.carga ?? referencia?.serie.carga ?? null, rango: plan.objetivoEsfuerzo ?? null };
}

// El mejor 1RM de las últimas `semanas` semanas (sin bajadas); si no hay
// series en ese plazo, el de siempre (o el puesto a mano).
export function rmReciente(datos, ejercicio, semanas = 8, { excluirSesion } = {}) {
  const desde = new Date(Date.now() - semanas * 7 * 86_400_000);
  const corte = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-${String(desde.getDate()).padStart(2, '0')}`;
  // El máximo de todas tus series del plazo: las largas (Bilbo, más de 12)
  // suelen dar un 1RM más bajo, así que solo mandan si dan más (lo decidió Dan).
  let mejor = null;
  for (const x of seriesDeEjercicio(datos, ejercicio.id, { excluirSesion })) {
    if (x.sesion.fecha < corte || x.serie.tipo === 'calentamiento') continue;
    const rm = rmSinTramos(datos, ejercicio, x.serie);
    if (rm && (!mejor || rm > mejor.valor)) mejor = { valor: redondear(rm, 1), fecha: x.sesion.fecha, serie: x.serie };
  }
  if (mejor) return mejor;
  const siempre = rmDeReferencia(datos, ejercicio, { excluirSesion });
  return siempre ? { valor: siempre.valor, fecha: null, deSiempre: true, manual: Boolean(siempre.manual) } : null;
}

// El 1RM con el que trabaja la app en un ejercicio: uno solo, el mismo en
// toda la pantalla del entreno.
//   · Base: el mejor de tus series de las últimas 8 semanas; si no hay, el
//     de siempre; si nunca has hecho el ejercicio, el que pusiste a mano.
//   · Hoy: si una serie de hoy da más, manda la de hoy. Si la base es la
//     puesta a mano, manda cualquier serie de hoy (es un dato real, no una
//     suposición).
// `antesDe` ({ i, j }) mira solo las series de hoy anteriores a esa; así el
// porcentaje de una serie ya hecha no cambia al apuntar las de debajo.
export function rmDelEjercicio(datos, ejercicio, { sesion = null, antesDe = null } = {}) {
  const base = rmReciente(datos, ejercicio, 8, { excluirSesion: sesion?.id });
  let hoy = null;
  (sesion?.ejercicios ?? []).forEach((entrada, i) => {
    if (entrada.ejercicioId !== ejercicio.id) return;
    entrada.series.forEach((s, j) => {
      if (antesDe && (i > antesDe.i || (i === antesDe.i && j >= antesDe.j))) return;
      if (!s.hecha) return;
      const rm = rmSinTramos(datos, ejercicio, s);
      if (rm && (!hoy || rm > hoy.valor)) hoy = { valor: redondear(rm, 1), serie: s };
    });
  });
  // El puesto a mano después de esas series de hoy manda (lo acabas de decir tú).
  const manualDespues = base?.manual && ejercicio.rmManualEn && hoy?.serie?.hechaA && ejercicio.rmManualEn > hoy.serie.hechaA;
  if (hoy && !manualDespues && (!base || base.manual || hoy.valor > base.valor)) return { valor: hoy.valor, origen: 'hoy', serie: hoy.serie };
  if (!base) return null;
  return { valor: base.valor, origen: base.manual ? 'manual' : 'historial', fecha: base.fecha, serie: base.serie ?? null };
}

// El peso de una serie de doble progresión o «según tu 1RM» a partir de un
// 1RM: el que da el máximo del rango (o las repeticiones fijadas) dejando la
// recámara pedida, o el porcentaje fijado.
export function pesoDePlan(datos, ejercicio, plan, rm) {
  const prog = plan.progresion ?? {};
  if (!(rm > 0)) return null;
  if (prog.porRM?.fija === 'pct') return aPesoDisponible(ejercicio, (rm * prog.porRM.valor) / 100, { rm, calentamiento: Boolean(plan.calentamiento) });
  const reps = prog.porRM?.valor ?? prog.objetivoEsfuerzo?.[1];
  if (!(reps > 0)) return null;
  const recamara = recamaraPorDefectoDe(datos, ejercicio, plan);
  const peso = pesoParaReps(modeloDe(datos, ejercicio), rm, reps, recamara);
  return peso > 0 ? aPesoDisponible(ejercicio, peso, { rm }) : null;
}

// «Peso según tu 1RM»: el peso sale de tu máximo reciente y el objetivo son
// las repeticiones que superan el 1RM de la última vez con ese peso.
function sugerenciaPorRM(datos, ejercicio, plan, { excluirSesion, ultima }) {
  const prog = plan.progresion;
  const rm = rmReciente(datos, ejercicio, prog.porRM.semanas ?? 8, { excluirSesion });
  const comun = { porRM: true, rango: prog.objetivoEsfuerzo, recamaraMin: prog.recamaraMin ?? null };
  if (!rm) return { ...comun, carga: null, sinRM: ejercicio.carga?.tipo !== 'pesoCorporal' };
  const carga = pesoDePlan(datos, ejercicio, plan, rm.valor);
  const recamara = recamaraPorDefectoDe(datos, ejercicio, plan);
  const rmUltima = ultima ? rmSinTramos(datos, ejercicio, ultima.serie) : null;
  const iguala = rmUltima && carga > 0 ? repsParaIgualar(modeloDe(datos, ejercicio), rmUltima, carga, recamara) : null;
  const objetivoSuperar = iguala != null ? Math.min(40, Math.floor(Math.max(0, iguala)) + 1) : null;
  return { ...comun, carga, rmUsado: rm.valor, rmFecha: rm.fecha, rmUltima, objetivoSuperar,
    // Con % fijo y repeticiones pedidas («3 × 4 al 80 %»), el objetivo es el mínimo del rango.
    esfuerzoObjetivo: prog.porRM.fija === 'reps' ? prog.porRM.valor : (prog.objetivoEsfuerzo?.[0] ?? null) };
}

// La fase de repeticiones que toca en la sesión `dia` del ciclo. Cada fase
// dura sus sesiones; al acabar la última se vuelve a la primera.
export function faseDelDia(fases, dia) {
  const lista = (fases ?? []).filter((f) => f && f.reps > 0 && f.sesiones > 0);
  if (!lista.length) return null;
  const total = lista.reduce((s, f) => s + f.sesiones, 0);
  let pos = (dia - 1) % total;
  for (const [i, f] of lista.entries()) {
    if (pos < f.sesiones) return { ...f, n: i + 1, deN: lista.length };
    pos -= f.sesiones;
  }
  return null;
}

// Objetivo del día para las medidas que no son la principal (la distancia de
// una carrera, por ejemplo): empiezan en un valor y suben cada tantas sesiones.
function objetivosExtra(gen, dia) {
  if (!gen?.extras) return null;
  const salida = {};
  for (const [medida, x] of Object.entries(gen.extras)) {
    if (!x || x.inicial == null) continue;
    salida[medida] = redondear((x.inicial ?? 0) + (x.incremento ?? 0) * Math.floor((dia - 1) / Math.max(1, gen.cada ?? 1)), 2);
  }
  return Object.keys(salida).length ? salida : null;
}

// El mejor 1RM estimado de las series hechas dentro de un ciclo. Es lo que
// usa el reinicio «al % del mejor 1RM de este ciclo».
export const modeloDeEjercicio = (datos, ejercicio) => modeloDe(datos, ejercicio);

// El 1RM de una serie, sin las de tramos (serie descendente, rest-pause…): su peso es
// el del primer tramo y sus repeticiones, la suma de todos; el 1RM saldría
// inflado y el siguiente serie descendente arrancaría cada vez más alto.
// Tampoco valen los calentamientos ni las series con más de 5 en recámara:
// lejos del fallo, la recámara que uno cree dejar se equivoca mucho y el 1RM
// sale torcido (Zourdos 2016; Halperin 2022).
export const RECAMARA_MAX_PARA_1RM = 5;
export function valeParaRM(serie) {
  return Boolean(serie) && !serie.tramos?.length && serie.tipo !== 'calentamiento' && !(serie.recamara > RECAMARA_MAX_PARA_1RM);
}
// El 1RM de referencia (el que pone los pesos) solo sale de series de 12
// repeticiones o menos y nunca de una Bilbo: por encima de 12 la recámara se
// calcula peor (Halperin 2022). Esas series se apuntan y siguen valiendo para
// su ciclo, pero no mueven la referencia. Si un ejercicio solo tiene series
// largas (unas laterales de 12-15), se usan esas: es lo único que hay.
export const REPS_MAX_REFERENCIA = 12;
export function esSerieBilbo(ejercicio, serie) {
  return serie?.tipo === 'bilbo' || (ejercicio?.series ?? []).find((p) => p.id === serie?.planId)?.progresion?.tipo === 'bilbo';
}
export function valeParaReferencia(ejercicio, serie) {
  return valeParaRM(serie) && !esSerieBilbo(ejercicio, serie) && (esfuerzoTotal(serie) ?? 0) <= REPS_MAX_REFERENCIA;
}
function rmSinTramos(datos, ejercicio, serie) {
  return valeParaRM(serie) ? rmDeSerie(datos, ejercicio, serie, esfuerzoTotal(serie)) : null;
}

export function mejorRMDelCiclo(datos, ejercicio, plan, cicloN) {
  let mejor = null;
  for (const r of registrosDelCiclo(datos, ejercicio, plan, cicloN)) {
    const rm = rmSinTramos(datos, ejercicio, r.serie);
    if (rm && (mejor == null || rm > mejor)) mejor = rm;
  }
  return mejor;
}

// El 1RM que sale de una prueba: la mejor serie de esta serie del ejercicio
// hecha desde que empezó el ciclo (o de siempre, si aún no ha empezado).
export function rmDePrueba(datos, ejercicio, plan, desde, { excluirSesion } = {}) {
  const rms = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion, planId: plan.id })
    .filter((x) => !desde || x.sesion.fecha >= desde)
    .map((x) => rmSinTramos(datos, ejercicio, x.serie)).filter(Boolean);
  return rms.length ? Math.max(...rms) : null;
}

// ¿Este ciclo espera a una prueba? Pasa si empieza «con una prueba» y aún no
// hay ninguna serie de la que sacar el 1RM.
export function esperaPrueba(datos, ejercicio, plan, { excluirSesion } = {}) {
  const prog = plan.progresion;
  if (prog?.tipo !== 'bilbo' || prog.sobre !== 'carga') return false;
  const ciclo = cicloActual(plan) ?? prog.ciclos?.at(-1);
  const primero = !ciclo || (prog.ciclos.length === 1 && !ciclo.inicio);
  const hayRm = Boolean(rmDeReferencia(datos, ejercicio, { excluirSesion }));
  const modo = primero ? (prog.inicio?.modo ?? (hayRm ? 'porcentaje' : 'prueba')) : (ciclo.pendientePrueba ? 'prueba' : null);
  if (modo !== 'prueba') return false;
  if (ciclo && registrosDelCiclo(datos, ejercicio, plan, ciclo.n, { excluirSesion }).length) return false;
  return !rmDePrueba(datos, ejercicio, plan, primero ? null : ciclo.inicio, { excluirSesion });
}

function sugerenciaBilbo(datos, ejercicio, plan, { excluirSesion, sobre, rmHoy = null }) {
  const prog = plan.progresion;
  const ciclo = cicloActual(plan);
  if (esperaPrueba(datos, ejercicio, plan, { excluirSesion })) return { sinCiclo: true, prueba: true };
  if (!ciclo || !ciclo.escalera?.length) return { sinCiclo: true };

  const registros = registrosDelCiclo(datos, ejercicio, plan, ciclo.n, { excluirSesion });
  const ultimaDelCiclo = registros.reduce((mejor, x) => (!mejor || x.dia >= mejor.dia ? x : mejor), null);
  const dia = ultimaDelCiclo ? ultimaDelCiclo.dia + 1 : 1;
  if (dia > ciclo.escalera.length) return { cicloN: ciclo.n, cicloTerminado: true, ultimaDelCiclo };

  const valorEscalera = ciclo.escalera[dia - 1];
  const resultado = { cicloN: ciclo.n, dia, diasCiclo: ciclo.escalera.length, ultimaDelCiclo };

  const genEsf = ciclo.generador ?? {};
  if (sobre === 'esfuerzo') {
    // Sin carga: la escalera son minutos, segundos o repeticiones. Se corta
    // al llegar al máximo del corte.
    const corte = prog.corte ?? {};
    const hechoAntes = ultimaDelCiclo ? esfuerzoTotal(ultimaDelCiclo.serie) : null;
    return { ...resultado, carga: null, esfuerzoObjetivo: valorEscalera, objetivosExtra: objetivosExtra(genEsf, dia),
      cicloAgotado: Boolean(corte.esfuerzoMax && hechoAntes != null && hechoAntes >= corte.esfuerzoMax) };
  }
  // Objetivo: las repeticiones que superan el 1RM del día anterior, con la
  // fórmula del ejercicio y descontando la recámara que sueles dejar.
  // El primer día de un ciclo nuevo se compara con la última serie del anterior.
  const referencia = ultimaDelCiclo?.serie ?? seriesDeEjercicio(datos, ejercicio.id, { excluirSesion, planId: plan.id }).at(-1)?.serie ?? null;
  // Sin ninguna serie todavía, vale el 1RM que hayas puesto en la ficha.
  // Sin series de esta serie todavía: el 1RM del ejercicio (de otras series
  // o el que pusiste a mano).
  const rmAnterior = referencia ? rmDeSerie(datos, ejercicio, referencia, esfuerzoTotal(referencia))
    : (rmHoy ?? rmDeReferencia(datos, ejercicio, { excluirSesion })?.valor ?? null);
  const recamara = recamaraDe(plan.tecnicas, recamaraBilbo(datos));
  const gen = ciclo.generador ?? {};
  // Tope de repeticiones (Dan: «no quiero 30 repes de banca»): si el peso de
  // la escalera pediría más de las máximas, ese día va al peso con el que
  // harías las máximas dejando la recámara de los ciclos. La escalera sigue
  // igual y, en cuanto vuelve a pesar más, manda ella.
  let valor = valorEscalera;
  let subidoPorTope = false;
  if (rmAnterior && valor > 0 && !gen.incrementoEsfuerzo && !gen.fases?.length) {
    const suelo = pesoParaReps(modeloDe(datos, ejercicio), rmAnterior, repsMaxBilbo(datos), recamara);
    const sueloDisponible = suelo > 0 ? aPesoDisponible(ejercicio, suelo, { hacia: 'arriba' }) : 0;
    if (sueloDisponible > valor) { valor = sueloDisponible; subidoPorTope = true; }
  }
  const reps = rmAnterior && valor > 0 ? repsParaIgualar(modeloDe(datos, ejercicio), rmAnterior, valor, recamara) : null;
  // El objetivo SUPERA el 1RM anterior (Dan: «no quiero igualar la serie
  // anterior, sino superarla»): la repetición entera siguiente a la que lo
  // iguala. Con tope de 40: por encima, el peso es demasiado bajo.
  let objetivoSuperar = reps != null ? Math.min(40, Math.floor(Math.max(0, reps) + 1e-6) + 1) : null;
  // Si además marcaste que suban las repeticiones, manda esa escalera: el
  // objetivo del día sale de lo que pusiste, no de igualar el 1RM.
  if (gen.incrementoEsfuerzo) {
    objetivoSuperar = Math.round((gen.inicialEsfuerzo ?? 8)
      + gen.incrementoEsfuerzo * Math.floor((dia - 1) / Math.max(1, gen.cada ?? 1)));
  }
  // Repeticiones por fases (15, 10, 5… como el HST): el objetivo del día es
  // el de la fase en la que cae esta sesión, y las fases se repiten.
  const fase = faseDelDia(gen.fases, dia);
  if (fase) objetivoSuperar = fase.reps;
  // El ciclo se agota cuando el objetivo baja de las repeticiones mínimas
  // del corte (15 por defecto) o cuando lo hecho llega al máximo: toca
  // empezar uno nuevo.
  const corte = prog.corte ?? {};
  const minimo = corte.esfuerzoMin ?? datos.perfil.bilboMinReps ?? 15;
  const hechoAntes = ultimaDelCiclo ? esfuerzoTotal(ultimaDelCiclo.serie) : null;
  // Cada condición marcada se mira aparte; `corte.cuantas` dice con cuántas
  // hace falta que se acabe el ciclo (1 = la primera que pase, 'todas' = todas).
  const condiciones = [
    corte.esfuerzoMin != null && objetivoSuperar != null && minimo ? objetivoSuperar < minimo : null,
    corte.esfuerzoMax != null ? hechoAntes != null && hechoAntes >= corte.esfuerzoMax : null,
    corte.cargaMax != null ? valor >= corte.cargaMax : null,
    corte.rmPct != null ? Boolean(rmAnterior) && valor >= (rmAnterior * corte.rmPct) / 100 : null,
  ].filter((x) => x !== null);
  const cumplidas = condiciones.filter(Boolean).length;
  const piden = corte.cuantas === 'todas' ? condiciones.length : Math.max(1, Number(corte.cuantas) || 1);
  // Sin ninguna condición marcada se sigue usando el mínimo de siempre, que
  // es lo que hace Bilbo.
  // El primer día de un ciclo nunca lo da por acabado: se acaba de empezar.
  const agotado = dia > 1 && (condiciones.length
    ? cumplidas >= Math.min(piden, condiciones.length)
    : Boolean(objetivoSuperar != null && minimo && objetivoSuperar < minimo));
  // Como en las hojas de Dan: lo que hiciste en el ciclo anterior con este
  // mismo peso (o, si no lo usaste, en la misma sesión del ciclo), para ver
  // si te superas también frente a él y no solo frente a la última vez.
  let cicloPrevio = null;
  for (const c of [...(prog.ciclos || [])].filter((x) => x.n < ciclo.n).sort((a, b) => b.n - a.n)) {
    const regs = registrosDelCiclo(datos, ejercicio, plan, c.n, { excluirSesion });
    if (!regs.length) continue;
    const r = regs.find((x) => x.serie.carga != null && Math.abs(x.serie.carga - valor) < 0.01)
      ?? regs.find((x) => x.dia === dia);
    if (r) cicloPrevio = { cicloN: c.n, dia: r.dia, carga: r.serie.carga, esfuerzo: esfuerzoTotal(r.serie), mismoPeso: Math.abs((r.serie.carga ?? -1) - valor) < 0.01 };
    break;
  }
  return { ...resultado, carga: valor, subidoPorTope, objetivoSuperar, objetivosExtra: objetivosExtra(gen, dia), fase, rmObjetivo: rmAnterior,
    sinAnterior: !referencia,
    pesoBajo: reps != null && reps > 40, cicloAgotado: agotado, cicloPrevio, refAnterior: referencia };
}

// ---------------------------------------------------------------------------
// Programas: 5×5, 5/3/1 y HST
// ---------------------------------------------------------------------------

// Sesiones ya hechas de este plan desde que se empezó el programa, en orden,
// con sus series (todas las de la misma sesión juntas).
function sesionesDelPrograma(datos, ejercicio, plan, { excluirSesion } = {}) {
  const desde = plan.progresion.desde ?? '';
  const porSesion = new Map();
  for (const x of seriesDeEjercicio(datos, ejercicio.id, { excluirSesion, planId: plan.id })) {
    if (x.sesion.fecha < desde) continue;
    if (!porSesion.has(x.sesion.id)) porSesion.set(x.sesion.id, []);
    porSesion.get(x.sesion.id).push(x.serie);
  }
  return [...porSesion.values()];
}

// Las series (peso y repeticiones) que tocan en la sesión n de cada programa.
export function seriesDelPrograma(ejercicio, prog, n, historial = []) {
  const inc = prog.incremento || 2.5;
  const p = (kg) => aPesoDisponible(ejercicio, kg);
  if (prog.programa === '531') {
    const semanas = [
      { pct: [0.65, 0.75, 0.85], reps: [5, 5, 5], nombre: 'semana de 5' },
      { pct: [0.70, 0.80, 0.90], reps: [3, 3, 3], nombre: 'semana de 3' },
      { pct: [0.75, 0.85, 0.95], reps: [5, 3, 1], nombre: 'semana 5/3/1' },
      { pct: [0.40, 0.50, 0.60], reps: [5, 5, 5], nombre: 'descarga' },
    ];
    // La «semana» del programa avanza cada tantas sesiones como veces hagas
    // el ejercicio a la semana (una, por defecto).
    const k = Math.floor(n / Math.max(1, prog.porSemana ?? 1));
    const semana = semanas[k % 4];
    const tm = (prog.inicial ?? 0) + inc * Math.floor(k / 4);
    return { nombre: `ciclo ${Math.floor(k / 4) + 1}, ${semana.nombre}`,
      series: semana.pct.map((x, i) => ({ carga: p(tm * x), reps: semana.reps[i], amrap: i === 2 && k % 4 !== 3 })) };
  }
  if (prog.programa === 'hst') {
    const bloque = Math.floor(n / 6) % 3;
    const paso = n % 6;
    const vuelta = Math.floor(n / 18);
    const rm15 = (prog.inicial ?? 0) + inc * vuelta;
    const maximos = [rm15, rm15 * 1.15, rm15 * 1.32];
    const reps = [15, 10, 5][bloque];
    const carga = p(maximos[bloque] * (0.75 + 0.05 * paso));
    return { nombre: `bloque de ${reps}, sesión ${paso + 1} de 6`, series: [{ carga, reps }, { carga, reps }] };
  }
  // 5×5: sube cuando completas todas; tres fallos seguidos, baja un 10 %.
  // Las series pueden ser menos de cinco (3×5 detrás de una Bilbo, por ejemplo).
  const cuantas = Math.max(1, Math.round(prog.series ?? 5));
  let carga = prog.inicial ?? 0;
  let fallos = 0;
  for (const series of historial) {
    const completa = series.length >= cuantas && series.every((s) => (esfuerzoTotal(s) ?? 0) >= 5);
    if (completa) { carga = redondear(carga + inc); fallos = 0; }
    else if (++fallos >= 3) { carga = p(carga * 0.9); fallos = 0; }
  }
  return { nombre: `sesión ${n + 1}`, series: Array.from({ length: cuantas }, () => ({ carga: p(carga), reps: 5 })) };
}

// Peso de partida de un programa, calculado con la fórmula del ejercicio a
// partir de tu 1RM estimado:
//   5/3/1: el máximo de entrenamiento, que por definición es el 90 % del 1RM;
//   HST:   tu 15RM, el peso con el que harías 15 justas;
//   5×5:   el peso con el que harías 5 dejándote 3, que aguanta cinco series.
export function inicialDelPrograma(datos, ejercicio, prog, { excluirSesion } = {}) {
  const rm = rmDeReferencia(datos, ejercicio, { excluirSesion })?.valor;
  if (!rm) return null;
  if (prog.programa === '531') return aPesoDisponible(ejercicio, rm * 0.9);
  const modelo = modeloDe(datos, ejercicio);
  const peso = prog.programa === 'hst' ? pesoParaReps(modelo, rm, 15, 0) : pesoParaReps(modelo, rm, 5, 3);
  return peso ? aPesoDisponible(ejercicio, peso) : null;
}

function sugerenciaPrograma(datos, ejercicio, plan, { excluirSesion } = {}) {
  const prog = plan.progresion;
  if (!PROGRAMAS[prog.programa]) return { sinPrograma: true, programa: prog.programa };
  // Sin peso inicial en la ficha se estima: en 5/3/1 el 90 % de tu 1RM; en
  // los demás, el 60 %; y sin historial, la barra (20 kg).
  let estimado = false;
  let progUsada = prog;
  if (prog.inicial == null) {
    progUsada = { ...prog, inicial: inicialDelPrograma(datos, ejercicio, prog, { excluirSesion }) ?? 20 };
    estimado = true;
  }
  const historial = sesionesDelPrograma(datos, ejercicio, plan, { excluirSesion });
  const n = historial.length;
  const toca = seriesDelPrograma(ejercicio, progUsada, n, historial);
  return { programa: prog.programa, sesionN: n + 1, nombreSesion: toca.nombre, seriesPrograma: toca.series, inicialEstimado: estimado,
    carga: toca.series[0]?.carga ?? null, esfuerzoObjetivo: toca.series[0]?.reps ?? null };
}

// A qué salto se redondean los pesos que propone la app: lo de Ajustes
// (`perfil.redondeoKg`, 2,5 kg si no se toca: un disco de 1,25 por lado) o
// lo del ejercicio (`ej.redondeoKg`: mancuernas de 2 en 2, por ejemplo).
// El de Ajustes se fija aquí desde el estado para no pasar `datos` a todas
// las cuentas.
export const REDONDEO_POR_DEFECTO = 2.5;
export const REDONDEOS = [0.5, 1, 1.25, 2, 2.5, 5];
let redondeoGlobal = REDONDEO_POR_DEFECTO;
export function fijarRedondeo(kg) { redondeoGlobal = kg > 0 ? kg : REDONDEO_POR_DEFECTO; }
// Las mancuernas van aparte: en el gimnasio de Dan, de 2 en 2 kg (`perfil.redondeoMancuernasKg`).
export const REDONDEO_MANCUERNAS_POR_DEFECTO = 2;
let redondeoMancuernas = REDONDEO_MANCUERNAS_POR_DEFECTO;
export function fijarRedondeoMancuernas(kg) { redondeoMancuernas = kg > 0 ? kg : REDONDEO_MANCUERNAS_POR_DEFECTO; }
// De un solo lado (un brazo o una pierna): se apuntan el peso y las
// repeticiones de un lado.
export function unLado(ejercicio) { return /(a una mano|a un brazo|a una pierna|unilateral)/i.test(ejercicio?.nombre ?? ''); }
export function conMancuernas(ejercicio) { return /mancuerna/i.test(materialDe(ejercicio) ?? '') || /mancuerna/i.test(ejercicio?.nombre ?? ''); }
// Calentamientos de 10 en 10 kg (decisión práctica de Dan: sin cuentas al
// calentar). Se quita en Ajustes y entonces van con el % exacto.
let calentamientoRedondo = true;
export function fijarCalentamientoRedondo(valor) { calentamientoRedondo = valor !== false; }

// El peso más bajo que se puede poner en un ejercicio: con barra, la barra
// vacía (20 kg por defecto; se cambia en la ficha, «Ajustes finos»). Si
// además pones un % de tu 1RM, manda lo que sea más alto ese día.
export const BARRA_POR_DEFECTO = 20;
export function pesoMinimoDe(ejercicio, rm = null) {
  const fijo = ejercicio?.pesoMinimo != null ? ejercicio.pesoMinimo
    : ejercicio?.carga?.tipo === 'peso' && !ejercicio.pesosMaquina?.length && materialDe(ejercicio) === 'barra' ? BARRA_POR_DEFECTO : 0;
  const pct = ejercicio?.pesoMinimoPct > 0 && rm > 0 ? (rm * ejercicio.pesoMinimoPct) / 100 : 0;
  return Math.max(fijo, pct);
}

// Las repeticiones en recámara que pide una serie si no lo dice su regla ni
// el ejercicio: 2 en fuerza (series de 6 o menos, o programas de fuerza) y 1
// en hipertrofia (o lo que pongas en Ajustes, si es más).
// Ciclos: repeticiones máximas de un día (el peso nunca baja del que las da)
// y recámara con la que se hacen. Valores de Dan (25-10-2026): 22 y 2.
export const BILBO_REPS_MAX_POR_DEFECTO = 22;
export const BILBO_RECAMARA_POR_DEFECTO = 2;
export function repsMaxBilbo(datos) { return datos?.perfil?.bilboRepsMax ?? BILBO_REPS_MAX_POR_DEFECTO; }
export function recamaraBilbo(datos) { return datos?.perfil?.bilboRecamara ?? BILBO_RECAMARA_POR_DEFECTO; }

export function recamaraPorDefectoDe(datos, ejercicio, plan) {
  const prog = plan?.progresion ?? {};
  if (prog.recamaraMin != null) return prog.recamaraMin;
  if (prog.tipo === 'bilbo') return recamaraBilbo(datos);
  if (ejercicio?.recamaraPorDefecto != null) return ejercicio.recamaraPorDefecto;
  const general = datos?.perfil?.recamaraPorDefecto ?? 1;
  const max = (prog.objetivoEsfuerzo ?? plan?.objetivoEsfuerzo)?.[1];
  const fuerza = (max != null && max <= 6) || ['5x5', '531'].includes(prog.programa);
  return fuerza ? Math.max(2, general) : general;
}

// El material del ejercicio; si no lo tiene apuntado, el del catálogo con
// el mismo nombre (los creados desde una rutina escrita no lo guardan).
const materialPorNombre = new Map();
export function materialDe(ejercicio) {
  if (ejercicio?.material) return ejercicio.material;
  const clave = normalizar(ejercicio?.nombre ?? '');
  if (!materialPorNombre.has(clave)) materialPorNombre.set(clave, CATALOGO.find((c) => normalizar(c.nombre) === clave)?.material ?? null);
  return materialPorNombre.get(clave);
}
export function pasoDe(ejercicio) {
  if (ejercicio?.redondeoKg > 0) return ejercicio.redondeoKg;
  return conMancuernas(ejercicio) ? redondeoMancuernas : redondeoGlobal;
}

// Redondea al salto de disco: en el gimnasio no hay 25,6 kg.
export function aPasoDeDisco(kg, paso = redondeoGlobal) {
  if (kg == null) return null;
  return redondear(Math.round(kg / paso) * paso, 2);
}

// Redondea a un peso que exista de verdad: si el ejercicio está atado a una
// máquina con sus pesos, al más cercano de ellos (o al siguiente por arriba o
// por abajo); si no, al salto de disco del ejercicio o de Ajustes.
export function aPesoDisponible(ejercicio, kg, { hacia = 'cerca', rm = null, calentamiento = false } = {}) {
  if (kg == null) return null;
  const pesos = ejercicio?.pesosMaquina?.length ? [...ejercicio.pesosMaquina].sort((a, b) => a - b) : null;
  if (!pesos) {
    const paso = pasoDe(ejercicio);
    const cerca = aPasoDeDisco(kg, paso);
    const minimo = pesoMinimoDe(ejercicio, rm);
    const conMinimo = (x) => (kg > 0 && minimo > 0 ? Math.max(minimo, x) : x);
    // Calentamiento: a la decena más cercana (55 → 50, 77,5 → 80); con poco peso, el paso de siempre.
    if (calentamiento && calentamientoRedondo && kg >= 15) return conMinimo(Math.max(10, Math.round((kg - 0.01) / 10) * 10));
    if (hacia === 'arriba' && cerca <= kg + 0.01) return conMinimo(redondear(cerca + paso, 2));
    if (hacia === 'abajo' && cerca >= kg - 0.01) return conMinimo(redondear(Math.max(0, cerca - paso), 2));
    return conMinimo(cerca);
  }
  if (hacia === 'arriba') return pesos.find((p) => p > kg + 0.01) ?? pesos.at(-1);
  if (hacia === 'abajo') return [...pesos].reverse().find((p) => p < kg - 0.01) ?? pesos[0];
  return pesos.reduce((mejor, p) => (Math.abs(p - kg) < Math.abs(mejor - kg) ? p : mejor), pesos[0]);
}

// Genera la lista de pesos de una máquina: de `desde` a `hasta` de `paso` en `paso`.
export function pesosDeMaquina(desde, hasta, paso) {
  if (!(paso > 0) || desde == null || hasta == null || hasta < desde) return [];
  const lista = [];
  for (let p = desde; p <= hasta + 1e-9 && lista.length < 200; p = redondear(p + paso, 3)) lista.push(p);
  return lista;
}

// 1RM de referencia para los porcentajes: el mejor del ciclo en curso y, si
// no hay, el mejor de todo el historial del ejercicio.
export function rmDeReferencia(datos, ejercicio, { cicloN, excluirSesion, referencia = false } = {}) {
  const series = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion });
  const delCiclo = cicloN != null ? series.filter((x) => x.entrada.cicloN === cicloN) : [];
  let candidatas = delCiclo.length ? delCiclo : series;
  // Para la referencia, mejor las de 12 o menos (sin Bilbo) si las hay.
  const cortas = referencia ? candidatas.filter((x) => valeParaReferencia(ejercicio, x.serie)) : [];
  if (cortas.length) candidatas = cortas;
  const rms = candidatas.map((x) => rmSinTramos(datos, ejercicio, x.serie)).filter(Boolean);
  // Sin series todavía, vale el 1RM que hayas puesto tú en la ficha. En
  // cuanto hay una serie apuntada, manda lo que sale de tus series.
  if (!rms.length) return ejercicio.rmManual > 0 ? { valor: ejercicio.rmManual, delCiclo: false, manual: true } : null;
  return { valor: redondear(Math.max(...rms), 1), delCiclo: Boolean(delCiclo.length), deReferencia: cortas.length > 0 };
}

// ---------------------------------------------------------------------------
// Máximo trabajo
// ---------------------------------------------------------------------------
//
// Idea: el trabajo de una serie es peso × repeticiones. Con poco peso haces
// muchas repeticiones y con mucho peso pocas, así que en medio hay un punto
// donde el trabajo es máximo. Las fórmulas del 1RM no sirven para encontrarlo
// (dicen que el máximo está en 0 kg), así que se busca en TU historial:
// se ajusta una parábola a tus pares peso-trabajo y se coge su cima.

// Resuelve un sistema 3×3 por eliminación de Gauss.
function resolver3(m) {
  for (let i = 0; i < 3; i++) {
    let piv = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[piv][i])) piv = r;
    if (Math.abs(m[piv][i]) < 1e-12) return null;
    [m[i], m[piv]] = [m[piv], m[i]];
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = m[r][i] / m[i][i];
      for (let c = i; c < 4; c++) m[r][c] -= f * m[i][c];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

// Ajusta trabajo = a·carga² + b·carga + c a los puntos del historial.
export function ajusteTrabajo(puntos) {
  if (puntos.length < 4) return null;
  const s = (f) => puntos.reduce((t, p) => t + f(p), 0);
  const m = [
    [s((p) => p.x ** 4), s((p) => p.x ** 3), s((p) => p.x ** 2), s((p) => p.y * p.x ** 2)],
    [s((p) => p.x ** 3), s((p) => p.x ** 2), s((p) => p.x), s((p) => p.y * p.x)],
    [s((p) => p.x ** 2), s((p) => p.x), puntos.length, s((p) => p.y)],
  ];
  const sol = resolver3(m);
  if (!sol) return null;
  const [a, b, c] = sol;
  return { a, b, c, trabajoEn: (x) => a * x * x + b * x + c };
}

// Por debajo del 30 % del 1RM no hay estudios que muestren la misma ganancia
// de músculo que con más peso (Schoenfeld 2017; Lopez 2021): es el suelo.
const SUELO_MAXIMO_TRABAJO = 0.3;

export function maximoTrabajo(datos, ejercicio, { excluirSesion, tope = 50 } = {}) {
  const series = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion })
    .filter((x) => x.serie.carga > 0 && esfuerzoTotal(x.serie) > 0);
  if (!series.length) return { pocosDatos: true };

  const puntos = series.map((x) => ({ x: x.serie.carga, y: trabajoSerie(x.serie) }));
  const mejorReal = series.reduce((a, b) => (trabajoSerie(b.serie) > trabajoSerie(a.serie) ? b : a));
  const resultado = {
    mejorReal: { carga: mejorReal.serie.carga, esfuerzo: esfuerzoTotal(mejorReal.serie),
      trabajo: trabajoSerie(mejorReal.serie), fecha: mejorReal.sesion.fecha },
  };

  const cargas = new Set(puntos.map((p) => p.x));
  const ajuste = cargas.size >= 4 ? ajusteTrabajo(puntos) : null;
  if (!ajuste || ajuste.a >= 0) {
    // Sin suficientes pesos distintos, o el trabajo no hace cima: se repite
    // el mejor día conocido.
    return { ...resultado, pocosDatos: !ajuste, carga: mejorReal.serie.carga,
      esfuerzoObjetivo: esfuerzoTotal(mejorReal.serie) };
  }

  const cima = -ajuste.b / (2 * ajuste.a);
  const repsEn = (x) => (x > 0 ? ajuste.trabajoEn(x) / x : null);
  let carga = aPasoDeDisco(cima);
  let aviso = null;
  if (repsEn(carga) > tope) {
    // Buscar el peso más ligero que deja la serie dentro del tope.
    let x = carga;
    while (x < cima * 3 && repsEn(x) > tope) x += 2.5;
    aviso = `El máximo teórico pediría ${Math.round(repsEn(carga))} ${'repeticiones'}; con el tope de ${tope} sale ${aPasoDeDisco(x)}`;
    carga = aPasoDeDisco(x);
  }
  const rm = rmDeReferencia(datos, ejercicio, { excluirSesion })?.valor;
  if (rm && carga < rm * SUELO_MAXIMO_TRABAJO) {
    const suelo = aPesoDisponible(ejercicio, rm * SUELO_MAXIMO_TRABAJO, { hacia: 'arriba' });
    aviso = `El máximo teórico quedaba por debajo del 30 % de tu 1RM; se sube a ${formatearNumero(suelo)}`;
    carga = suelo;
  }
  return { ...resultado, carga, esfuerzoObjetivo: redondear(repsEn(carga), 0),
    trabajoEsperado: redondear(ajuste.trabajoEn(carga), 0), cima: aPasoDeDisco(cima), aviso };
}

// Pesos propuestos para las bajadas de una serie descendente, a partir de la carga de
// la serie y de la última vez que se hizo.
// Valores por defecto de cada técnica con tramos, según Ajustes.
export function tramosPorDefecto(perfil, tecnica) {
  if (tecnica === 'drop-set') {
    return { tramos: perfil?.dropSet?.bajadas ?? 4, salto: perfil?.dropSet?.salto ?? 10, reps: null };
  }
  const propios = perfil?.tramosPorDefecto?.[tecnica] ?? {};
  const base = tecnica === 'miorepeticiones' ? { tramos: 5, reps: 5 } : { tramos: 3, reps: null };
  return { ...base, ...propios, salto: 0 };
}

// Tramos que se proponen al crear la serie. Cada ejercicio elige de dónde
// salen (plan.tramosModo):
//   · 'ultima'    como la última vez (cuántos tramos y con qué pesos);
//   · 'ajustes'   con los valores generales de Ajustes;
//   · 'plantilla' con lo guardado en el propio ejercicio.
// Si el ejercicio tiene pesos fijos (máquina de placas), mandan esos.
// Lo que baja cada tramo, sin pasarse: con poco peso, 10 kg por bajada
// llegarían a 0 kg. La última bajada no baja del 30 % del 1RM (hasta ahí
// bajaba Ozaki 2018); sin 1RM, del 30 % del peso de partida. El salto se
// recorta si hace falta.
export function saltoAjustado(salto, inicio, tramos, rm = null) {
  if (!(salto > 0) || !(inicio > 0) || tramos < 2) return salto;
  const suelo = rm > 0 ? Math.min(inicio, rm * 0.3) : inicio * 0.3;
  const tope = (inicio - suelo) / (tramos - 1);
  if (!(tope > 0)) return 1.25;
  // Recortado, en múltiplos de 1,25 kg (el disco más pequeño habitual).
  return salto <= tope ? salto : Math.max(1.25, Math.floor(tope / 1.25) * 1.25);
}

export function tramosPropuestos(serie, plan, ultima, perfil) {
  const config = tramosDe(serie.tecnicas);
  if (!config) return null;
  const defecto = tramosPorDefecto(perfil, config.tecnica);
  const modo = plan?.tramosModo ?? 'ultima';
  let n = defecto.tramos;
  let salto = plan?.tramoSalto ?? defecto.salto;
  let reps = defecto.reps;
  if (modo === 'plantilla') {
    n = plan?.tramosPrevistos ?? n;
    reps = plan?.tramoReps ?? reps;
  } else if (modo === 'ultima') {
    n = ultima?.tramos?.length || plan?.tramosPrevistos || n;
  } else {
    salto = defecto.salto;
  }
  if (!config.salto) salto = 0;
  const fijos = plan?.tramosFijos?.length ? plan.tramosFijos : null;
  if (fijos && modo !== 'ultima') n = Math.max(n, fijos.length);

  const tramos = [];
  for (let i = 0; i < n; i++) {
    let carga = fijos?.[i] ?? (modo === 'ultima' ? ultima?.tramos?.[i]?.carga : null);
    if (carga == null && serie.carga != null) carga = Math.max(0, redondear(serie.carga - saltoAjustado(salto, serie.carga, n, serie.rmUsado?.valor) * i, 2));
    // En miorrepeticiones, el primer tramo es la serie de activación (sin objetivo).
    const objetivo = config.tecnica === 'miorepeticiones' && i === 0 ? null : reps;
    tramos.push({ carga: Number.isFinite(carga) ? carga : null, esfuerzo: null, objetivo: objetivo ?? null });
  }
  return tramos;
}

// ---------------------------------------------------------------------------
// Récords
// ---------------------------------------------------------------------------

export function records(datos, ejercicioId) {
  const ejercicio = datos.ejercicios.find((e) => e.id === ejercicioId);
  const series = seriesDeEjercicio(datos, ejercicioId);
  let mejorTrabajo = null;
  let mejor1RM = null;
  for (const x of series) {
    const trabajo = trabajoSerie(x.serie);
    if (trabajo != null && (!mejorTrabajo || trabajo > mejorTrabajo.valor)) {
      mejorTrabajo = { valor: trabajo, fecha: x.sesion.fecha, serie: x.serie };
    }
    const rm = rmSinTramos(datos, ejercicio, x.serie);
    if (rm != null && (!mejor1RM || rm > mejor1RM.valor)) {
      mejor1RM = { valor: redondear(rm, 1), fecha: x.sesion.fecha, serie: x.serie };
    }
  }
  return { mejorTrabajo, mejor1RM };
}

export function formatearNumero(n) {
  if (n == null || n === '') return '';
  return Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 });
}
