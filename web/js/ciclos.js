// Ciclos configurables (la progresión «Bilbo» generalizada).
//
// Un ciclo es una escalera: cada sesión tiene su valor (peso, o repeticiones
// y tiempo cuando no hay carga) y sube poco a poco. Lo que se puede
// configurar, con prehechos para no pensar:
//   · qué sube y cuánto: `generador` { inicial, incremento, cada };
//   · cuándo se corta: `corte` { sesiones, esfuerzoMin, esfuerzoMax };
//     - sesiones: al llegar a tantas sesiones;
//     - esfuerzoMin: cuando el objetivo (o lo hecho) baja de tantas
//       repeticiones o segundos (el peso ya pesa demasiado);
//     - esfuerzoMax: cuando lo hecho llega a tantas (ya es demasiado fácil);
//   · cómo empieza el siguiente: `reinicio` { modo: 'porcentaje' (del 1RM) |
//     'mismo' (igual que el anterior) | 'ultimo' (un porcentaje del último
//     valor) | 'manual', porcentaje }.
// Además se puede cortar o alargar a mano desde la ficha.

import { aPesoDisponible, formatearNumero, generarEscalera, rmDeReferencia } from './calculos.js';

export const PRESETS_CICLO = {
  bilbo: {
    etiqueta: 'Bilbo (17 sesiones)',
    descripcion: 'Sube 2,5 kg cada sesión durante 17. Se corta antes si el objetivo baja de 15 repeticiones. El siguiente empieza al 50 % de tu 1RM.',
    generador: { incremento: 2.5, cada: 1 }, corte: { sesiones: 17, esfuerzoMin: 15, esfuerzoMax: null },
    reinicio: { modo: 'porcentaje', porcentaje: 50 }, sobre: 'carga',
  },
  lineal: {
    etiqueta: 'Lineal hasta atascarse',
    descripcion: 'Sube 2,5 kg cada sesión sin límite de sesiones. Se corta cuando el objetivo baja de 5 repeticiones, y el siguiente '
      + 'empieza al 90 % del último peso.',
    generador: { incremento: 2.5, cada: 1 }, corte: { sesiones: 60, esfuerzoMin: 5, esfuerzoMax: null },
    reinicio: { modo: 'ultimo', porcentaje: 90 }, sobre: 'carga',
  },
  semanal: {
    etiqueta: 'Sube cada semana',
    descripcion: 'El mismo peso tres sesiones y luego 2,5 kg más, hasta 12 semanas o hasta que el objetivo baje de 8 repeticiones.',
    generador: { incremento: 2.5, cada: 3 }, corte: { sesiones: 36, esfuerzoMin: 8, esfuerzoMax: null },
    reinicio: { modo: 'ultimo', porcentaje: 90 }, sobre: 'carga',
  },
  repeticiones: {
    etiqueta: 'Más repeticiones',
    descripcion: 'Sin cambiar el peso: una repetición más cada sesión hasta llegar a 20. Entonces vuelve a empezar (y toca subir peso a mano).',
    generador: { incremento: 1, cada: 1 }, corte: { sesiones: 60, esfuerzoMin: null, esfuerzoMax: 20 },
    reinicio: { modo: 'mismo', porcentaje: null }, sobre: 'esfuerzo',
  },
  tiempo: {
    etiqueta: 'Más tiempo',
    descripcion: 'Diez segundos más cada sesión hasta llegar a dos minutos. Para planchas, isométricos y estiramientos.',
    generador: { incremento: 10, cada: 1 }, corte: { sesiones: 60, esfuerzoMin: null, esfuerzoMax: 120 },
    reinicio: { modo: 'mismo', porcentaje: null }, sobre: 'esfuerzo',
  },
  personalizado: { etiqueta: 'A mi manera', descripcion: 'Ajusta cada número abajo.' },
};

export const MODOS_REINICIO = {
  porcentaje: { etiqueta: 'Al % de tu 1RM', descripcion: 'El siguiente ciclo empieza a un porcentaje de tu mejor 1RM (el de Ajustes).' },
  ultimo: { etiqueta: 'Al % del último valor', descripcion: 'Empieza un poco por debajo de donde se cortó.' },
  mismo: { etiqueta: 'Como el anterior', descripcion: 'Vuelve al mismo valor inicial.' },
  manual: { etiqueta: 'A mano', descripcion: 'La app avisa y tú lo preparas en la ficha.' },
};

// Rellena lo que falte en una progresión de ciclo antigua.
export function completarCiclo(prog, perfil = {}) {
  prog.corte ??= { sesiones: prog.diasPorCiclo ?? 17, esfuerzoMin: perfil.bilboMinReps ?? 15, esfuerzoMax: null };
  prog.corte.sesiones ??= prog.diasPorCiclo ?? 17;
  prog.reinicio ??= { modo: 'porcentaje', porcentaje: perfil.bilboInicioPorcentaje ?? 50 };
  prog.preset ??= 'bilbo';
  prog.diasPorCiclo = prog.corte.sesiones;
  return prog;
}

export function aplicarPreset(prog, clave, ejercicio) {
  const p = PRESETS_CICLO[clave];
  prog.preset = clave;
  if (!p.generador) return prog;
  prog.corte = { ...p.corte };
  prog.reinicio = { ...p.reinicio };
  prog.diasPorCiclo = p.corte.sesiones;
  const ciclo = prog.ciclos?.find((c) => c.n === prog.cicloActual) ?? prog.ciclos?.at(-1);
  if (ciclo) {
    ciclo.generador = { ...ciclo.generador, incremento: p.generador.incremento, cada: p.generador.cada };
    ciclo.escalera = escaleraDe(ejercicio, ciclo.generador, prog.corte.sesiones);
  }
  return prog;
}

export function escaleraDe(ejercicio, generador, sesiones) {
  let escalera = generarEscalera({ ...generador, dias: sesiones });
  if (ejercicio?.pesosMaquina?.length) escalera = escalera.map((v) => aPesoDisponible(ejercicio, v));
  return escalera;
}

// Valor inicial del ciclo siguiente según el modo de reinicio.
export function inicialSiguiente(datos, ejercicio, prog, ultimoValor) {
  const r = prog.reinicio ?? { modo: 'porcentaje', porcentaje: 50 };
  const anterior = prog.ciclos?.at(-1)?.generador?.inicial ?? ultimoValor ?? 20;
  if (r.modo === 'mismo') return anterior;
  if (r.modo === 'ultimo' && ultimoValor != null) return aPesoDisponible(ejercicio, ultimoValor * ((r.porcentaje ?? 90) / 100));
  if (r.modo === 'porcentaje') {
    const rm = rmDeReferencia(datos, ejercicio)?.valor;
    if (rm) return aPesoDisponible(ejercicio, rm * ((r.porcentaje ?? 50) / 100));
  }
  return anterior;
}

// Añade un ciclo nuevo a la progresión (mutando). Devuelve el ciclo.
export function empezarCicloNuevo(datos, ejercicio, plan, { inicial = null } = {}) {
  const prog = completarCiclo(plan.progresion, datos.perfil);
  const anterior = prog.ciclos.find((c) => c.n === prog.cicloActual) ?? prog.ciclos.at(-1);
  const n = Math.max(0, ...prog.ciclos.map((c) => c.n)) + 1;
  const generador = { ...(anterior?.generador ?? { inicial: 20, incremento: 2.5, cada: 1 }) };
  const ultimoValor = anterior?.escalera?.length ? anterior.escalera[Math.max(0, Math.min(anterior.escalera.length, ultimaSesionHecha(datos, ejercicio, plan, anterior.n)) - 1)] : null;
  generador.inicial = inicial ?? (prog.sobre === 'carga' ? inicialSiguiente(datos, ejercicio, prog, ultimoValor) : generador.inicial);
  if (anterior) anterior.fin = new Date().toISOString().slice(0, 10);
  const ciclo = { n, inicio: new Date().toISOString().slice(0, 10), fin: null, generador,
    escalera: escaleraDe(ejercicio, generador, prog.corte.sesiones) };
  prog.ciclos.push(ciclo);
  prog.cicloActual = n;
  return ciclo;
}

// Alarga el ciclo actual con más sesiones, siguiendo la misma escalera.
export function alargarCiclo(ejercicio, plan, sesionesMas = 5) {
  const prog = plan.progresion;
  const ciclo = prog.ciclos.find((c) => c.n === prog.cicloActual);
  if (!ciclo) return;
  const total = ciclo.escalera.length + sesionesMas;
  ciclo.escalera = escaleraDe(ejercicio, ciclo.generador, total);
  prog.corte.sesiones = Math.max(prog.corte.sesiones ?? 0, total);
  prog.diasPorCiclo = prog.corte.sesiones;
}

function ultimaSesionHecha(datos, ejercicio, plan, cicloN) {
  let mayor = 0;
  for (const s of datos.sesiones) {
    if (s.borrada) continue;
    for (const e of s.ejercicios) {
      if (e.ejercicioId !== ejercicio.id || e.cicloN !== cicloN) continue;
      if (e.series.some((x) => x.planId === plan.id && x.hecha)) mayor = Math.max(mayor, e.diaCiclo ?? 0);
    }
  }
  return mayor;
}

// Si el ciclo está terminado o agotado y el reinicio no es manual, prepara
// el siguiente. Se llama al crear la serie del día (dentro de estado.cambiar).
// Devuelve true si ha empezado uno nuevo.
export function renovarSiToca(datos, ejercicio, plan, sugerencia) {
  const prog = plan.progresion;
  if (prog?.tipo !== 'bilbo') return false;
  completarCiclo(prog, datos.perfil);
  if (prog.reinicio.modo === 'manual') return false;
  if (!sugerencia.cicloTerminado && !sugerencia.cicloAgotado) return false;
  empezarCicloNuevo(datos, ejercicio, plan);
  return true;
}

// Texto corto para la ficha: qué hace este ciclo.
export function describirCiclo(prog, unidad) {
  const c = prog.corte ?? {};
  const g = prog.ciclos?.find((x) => x.n === prog.cicloActual)?.generador ?? {};
  const partes = [`sube ${formatearNumero(g.incremento ?? 0)} ${unidad} cada ${g.cada === 1 || !g.cada ? 'sesión' : `${g.cada} sesiones`}`];
  const cortes = [];
  if (c.sesiones) cortes.push(`a las ${c.sesiones} sesiones`);
  if (c.esfuerzoMin) cortes.push(`si el objetivo baja de ${c.esfuerzoMin}`);
  if (c.esfuerzoMax) cortes.push(`si llegas a ${c.esfuerzoMax}`);
  if (cortes.length) partes.push(`se corta ${cortes.join(' o ')}`);
  const r = prog.reinicio ?? {};
  partes.push(r.modo === 'manual' ? 'y avisa para que prepares el siguiente'
    : r.modo === 'mismo' ? 'y vuelve a empezar igual'
      : r.modo === 'ultimo' ? `y empieza otro al ${r.porcentaje} % del último valor`
        : `y empieza otro al ${r.porcentaje} % de tu 1RM`);
  return partes.join(', ') + '.';
}
