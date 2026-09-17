// Cálculos de entrenamiento. Funciones puras: no leen ni guardan nada.

import { TECNICAS } from './esquema.js';

// Fórmula de Epley, la misma de tus Excel: 1RM = carga × reps × 0,03 + carga.
export function epley(carga, repeticiones) {
  if (!(carga > 0) || !(repeticiones > 0)) return null;
  return carga * repeticiones * 0.03 + carga;
}

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

export function redondear(n, decimales = 2) {
  if (n == null || Number.isNaN(n)) return null;
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

// Trabajo de una serie: carga × esfuerzo, sumando los tramos si los tiene
// (un drop set son varias bajadas, cada una con su peso y sus repeticiones).
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

export function usaTramos(tecnica) {
  return Boolean(tecnica && TECNICAS[tecnica]?.tramos);
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
export function sugerenciaSerie(datos, ejercicio, plan, { excluirSesion } = {}) {
  const prog = plan.progresion || { tipo: 'libre' };
  const sobre = prog.sobre || (ejercicio.carga?.tipo === 'ninguna' ? 'esfuerzo' : 'carga');
  const historial = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion, planId: plan.id });
  const ultima = historial.at(-1) ?? null;
  // Si esta serie es nueva pero el ejercicio ya se ha hecho, se parte de la
  // última carga conocida: así un drop set recién creado no sale vacío.
  const referencia = ultima
    ?? seriesDeEjercicio(datos, ejercicio.id, { excluirSesion }).filter((x) => x.serie.carga != null).at(-1)
    ?? null;
  const base = { modo: prog.tipo, sobre, ultima, referencia, primeraVez: !ultima };

  if (prog.tipo === 'bilbo') return { ...base, ...sugerenciaBilbo(datos, ejercicio, plan, { excluirSesion, sobre }) };

  if (prog.tipo === 'carga') {
    const [, max] = prog.objetivoEsfuerzo || [];
    if (!ultima) return { ...base, rango: prog.objetivoEsfuerzo, carga: referencia?.serie.carga ?? null };
    const valorUltimo = sobre === 'carga' ? ultima.serie.carga : esfuerzoTotal(ultima.serie);
    const sube = max != null && esfuerzoTotal(ultima.serie) >= max;
    const siguiente = sube ? redondear((valorUltimo ?? 0) + (prog.incremento || 0)) : valorUltimo;
    return {
      ...base,
      rango: prog.objetivoEsfuerzo,
      sube,
      carga: sobre === 'carga' ? siguiente : ultima.serie.carga,
      esfuerzoObjetivo: sobre === 'carga' ? (sube ? prog.objetivoEsfuerzo?.[0] : null) : siguiente,
    };
  }

  if (prog.tipo === 'esfuerzo') {
    if (!ultima) return { ...base, carga: referencia?.serie.carga ?? null };
    return {
      ...base,
      carga: ultima.serie.carga,
      esfuerzoObjetivo: redondear((esfuerzoTotal(ultima.serie) ?? 0) + (prog.incremento || 1)),
    };
  }

  return { ...base, carga: ultima?.serie.carga ?? referencia?.serie.carga ?? null };
}

function sugerenciaBilbo(datos, ejercicio, plan, { excluirSesion, sobre }) {
  const prog = plan.progresion;
  const ciclo = cicloActual(plan);
  if (!ciclo || !ciclo.escalera?.length) return { sinCiclo: true };

  const registros = registrosDelCiclo(datos, ejercicio, plan, ciclo.n, { excluirSesion });
  const ultimaDelCiclo = registros.reduce((mejor, x) => (!mejor || x.dia >= mejor.dia ? x : mejor), null);
  const dia = ultimaDelCiclo ? ultimaDelCiclo.dia + 1 : 1;
  if (dia > ciclo.escalera.length) return { cicloN: ciclo.n, cicloTerminado: true, ultimaDelCiclo };

  const valor = ciclo.escalera[dia - 1];
  const resultado = { cicloN: ciclo.n, dia, diasCiclo: ciclo.escalera.length, ultimaDelCiclo };

  if (sobre === 'esfuerzo') {
    // Sin carga: la escalera son minutos, segundos o repeticiones.
    return { ...resultado, carga: null, esfuerzoObjetivo: valor };
  }
  const rmAnterior = ultimaDelCiclo
    ? epley(ultimaDelCiclo.serie.carga, esfuerzoTotal(ultimaDelCiclo.serie))
    : null;
  const objetivoSuperar = rmAnterior && valor > 0
    ? redondear((rmAnterior - valor) / (valor * 0.03), 1)
    : null;
  return { ...resultado, carga: valor, objetivoSuperar };
}

// Redondea a medios discos: en el gimnasio no hay 25,6 kg.
export function aPasoDeDisco(kg, paso = 2.5) {
  if (kg == null) return null;
  return redondear(Math.round(kg / paso) * paso, 2);
}

// Pesos propuestos para las bajadas de un drop set, a partir de la carga de
// la serie y de la última vez que se hizo.
export function tramosPropuestos(serie, plan, ultima) {
  const previstos = plan?.tramosPrevistos || ultima?.tramos?.length || 3;
  const bajada = TECNICAS[serie.tecnica]?.bajada ?? 0;
  const tramos = [];
  for (let i = 0; i < previstos; i++) {
    const deUltima = ultima?.tramos?.[i];
    const carga = deUltima?.carga
      ?? (serie.carga != null ? aPasoDeDisco(serie.carga * (1 - bajada) ** i) : null);
    tramos.push({ carga, esfuerzo: null });
  }
  return tramos;
}

// ---------------------------------------------------------------------------
// Récords
// ---------------------------------------------------------------------------

export function records(datos, ejercicioId) {
  const series = seriesDeEjercicio(datos, ejercicioId);
  let mejorTrabajo = null;
  let mejor1RM = null;
  for (const x of series) {
    const trabajo = trabajoSerie(x.serie);
    if (trabajo != null && (!mejorTrabajo || trabajo > mejorTrabajo.valor)) {
      mejorTrabajo = { valor: trabajo, fecha: x.sesion.fecha, serie: x.serie };
    }
    const rm = epley(x.serie.carga, esfuerzoTotal(x.serie));
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
