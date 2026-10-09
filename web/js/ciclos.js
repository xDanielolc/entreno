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

import { aPesoDisponible, esperaPrueba, formatearNumero, generarEscalera, mejorRMDelCiclo, modeloDeEjercicio, rmDePrueba, rmDeReferencia } from './calculos.js';
import { pesoParaReps } from './formula1rm.js';

export const PRESETS_CICLO = {
  bilbo: {
    etiqueta: 'Bilbo / incremento de peso lineal (fuerza)',
    descripcion: 'Cada sesión 2,5 kg más y todas las repeticiones que puedas. Cuando ya solo te salen 15, el ciclo se acaba y '
      + 'empieza otro al 50 % del mejor 1RM que hayas hecho en él. Las 20 sesiones son solo un tope por si nunca se llega a 15.',
    generador: { incremento: 2.5, cada: 1 }, corte: { sesiones: 20, esfuerzoMin: 15, esfuerzoMax: null },
    reinicio: { modo: 'rm-ciclo', porcentaje: 50 }, sobre: 'carga',
  },
  lineal: {
    etiqueta: 'Lineal hasta atascarse',
    descripcion: 'Sube 2,5 kg cada sesión sin límite de sesiones. Se corta cuando el objetivo baja de 5 repeticiones, y el siguiente '
      + 'empieza al 90 % del último peso.',
    generador: { incremento: 2.5, cada: 1 }, corte: { sesiones: 20, esfuerzoMin: 5, esfuerzoMax: null },
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
    generador: { incremento: 1, cada: 1 }, corte: { sesiones: 20, esfuerzoMin: null, esfuerzoMax: 20 },
    reinicio: { modo: 'mismo', porcentaje: null }, sobre: 'esfuerzo',
  },
  tiempo: {
    etiqueta: 'Más tiempo',
    descripcion: 'Diez segundos más cada sesión hasta llegar a dos minutos. Para planchas, isométricos y estiramientos.',
    generador: { incremento: 10, cada: 1 }, corte: { sesiones: 20, esfuerzoMin: null, esfuerzoMax: 120 },
    reinicio: { modo: 'mismo', porcentaje: null }, sobre: 'esfuerzo',
  },
  personalizado: { etiqueta: 'Personalizar', descripcion: 'Ajusta cada número abajo.' },
};

export const MODOS_REINICIO = {
  'rm-ciclo': { etiqueta: 'Al % del mejor 1RM de este ciclo', descripcion: 'Se mira la mejor serie de este ciclo, se calcula el 1RM que sale de ella y el siguiente ciclo empieza a ese porcentaje. Es lo de Bilbo: cada vuelta parte de lo que acabas de demostrar.' },
  porcentaje: { etiqueta: 'Al % de tu 1RM de siempre', descripcion: 'El siguiente ciclo empieza a un porcentaje de tu mejor 1RM estimado en todo el historial.' },
  reps: { etiqueta: 'Al peso con el que harías X repeticiones', descripcion: 'Dices con cuántas repeticiones quieres empezar y la app calcula el peso con la fórmula del ejercicio, a partir del mejor 1RM de este ciclo. Es lo más parecido a decir «quiero empezar haciendo series de 20».' },
  ultimo: { etiqueta: 'Al % del último valor', descripcion: 'Empieza un poco por debajo de donde se cortó.', antiguo: true },
  mismo: { etiqueta: 'Como el anterior', descripcion: 'Vuelve al mismo valor inicial.' },
  prueba: { etiqueta: 'Con una prueba', descripcion: 'El primer día del ciclo pones un peso con el que hagas de 3 a 10 repeticiones y haces todas las que puedas; con esa serie la app calcula de dónde partir.' },
  manual: { etiqueta: 'A mano', descripcion: 'La app avisa y tú lo preparas en la ficha.' },
};

// Por dónde empieza el primer ciclo: lo mismo que los siguientes, más
// «No lo sé», que hace una prueba el primer día.
export const MODOS_INICIO = {
  porcentaje: { etiqueta: 'Al % de tu 1RM', descripcion: 'Empieza a un porcentaje del 1RM que hayas puesto o que salga de tus series.' },
  reps: { etiqueta: 'Al peso con el que harías X repeticiones', descripcion: 'Dices con cuántas repeticiones quieres empezar y la app calcula el peso con la fórmula del ejercicio.' },
  mismo: { etiqueta: 'Un peso que pones tú', descripcion: 'Empieza en el peso que escribas.' },
  prueba: { etiqueta: 'No lo sé: con una prueba', descripcion: 'El primer día pones un peso con el que hagas de 3 a 10 repeticiones y haces todas las que puedas. Con esa serie la app calcula tu 1RM y desde el día siguiente te dice qué toca.' },
};

// Cómo empieza el primer ciclo si no se ha elegido: con 1RM, a su porcentaje;
// sin él, con una prueba.
export function inicioDe(prog, hayRm) {
  return prog.inicio ?? { modo: hayRm ? 'porcentaje' : 'prueba' };
}

function valorDeInicio(datos, ejercicio, inicio, rm, prog = null) {
  if (inicio.modo === 'mismo' || !rm) return null;
  if (inicio.modo === 'reps') return pesoParaReps(modeloDeEjercicio(datos, ejercicio), rm, inicio.reps ?? 20, 0);
  return conMargen(datos, ejercicio, prog, rm, rm * ((inicio.porcentaje ?? datos.perfil.bilboInicioPorcentaje ?? 50) / 100));
}

// Un ciclo no puede empezar tan pesado que el primer día ya no llegues al
// mínimo de repeticiones (se acabaría nada más empezar). En ejercicios en
// los que se aguantan pocas repeticiones con el 50 % (cruces en polea, por
// ejemplo), el inicio baja hasta el peso con el que harías el doble del
// mínimo (30 si el mínimo es 15).
function conMargen(datos, ejercicio, prog, rm, valor) {
  if (!(valor > 0) || !(rm > 0) || prog?.sobre === 'esfuerzo') return valor;
  const minimo = prog?.corte?.esfuerzoMin ?? datos.perfil.bilboMinReps ?? 15;
  const techo = pesoParaReps(modeloDeEjercicio(datos, ejercicio), rm, minimo * 2, 0);
  return techo ? Math.min(valor, techo) : valor;
}

// Antes de la primera sesión de un ciclo, su peso de partida sale de cómo
// quieras empezar y del 1RM de ese momento (el que pusiste o el de la
// prueba). Se llama al crear la serie del entrenamiento. Devuelve true si
// ese día toca la prueba.
export function prepararCiclo(datos, ejercicio, plan, { excluirSesion } = {}) {
  const prog = plan.progresion;
  if (prog?.tipo === 'bilbo' && prog.sobre === 'esfuerzo') return prepararCicloDeEsfuerzo(datos, ejercicio, plan, { excluirSesion });
  if (prog?.tipo !== 'bilbo' || prog.sobre !== 'carga') return false;
  if (esperaPrueba(datos, ejercicio, plan, { excluirSesion })) return true;
  const ciclo = prog.ciclos?.find((c) => c.n === prog.cicloActual) ?? prog.ciclos?.at(-1);
  const primero = !ciclo || (prog.ciclos.length === 1 && !ciclo.inicio);
  if (!primero && !ciclo.pendientePrueba) return false;
  if (ciclo && ultimaSesionHecha(datos, ejercicio, plan, ciclo.n) > 0) return false;
  const referencia = rmDeReferencia(datos, ejercicio, { excluirSesion });
  const inicio = primero ? inicioDe(prog, Boolean(referencia)) : { modo: 'prueba', porcentaje: prog.reinicio?.porcentaje };
  const rm = inicio.modo === 'prueba'
    ? rmDePrueba(datos, ejercicio, plan, primero ? null : ciclo.inicio, { excluirSesion })
    : referencia?.valor;
  const valor = valorDeInicio(datos, ejercicio, inicio, rm, prog);
  if (valor == null) {
    if (!ciclo && referencia) empezarCicloNuevo(datos, ejercicio, plan);
    return false;
  }
  const inicial = aPesoDisponible(ejercicio, valor);
  if (!ciclo) {
    empezarCicloNuevo(datos, ejercicio, plan, { inicial });
  } else {
    ciclo.generador = { ...ciclo.generador, inicial };
    ciclo.escalera = escaleraDe(ejercicio, ciclo.generador, prog.corte?.sesiones ?? prog.diasPorCiclo ?? 20);
    ciclo.pendientePrueba = false;
  }
  return false;
}

// Ciclos que suben repeticiones o tiempo (no peso): el primer día haces todo
// lo que puedas y el ciclo arranca desde ahí.
function prepararCicloDeEsfuerzo(datos, ejercicio, plan, { excluirSesion } = {}) {
  const prog = plan.progresion;
  if (prog.ciclos?.length) return false;
  let mejor = null;
  for (const s of datos.sesiones) {
    if (s.borrada || s.id === excluirSesion) continue;
    for (const e of s.ejercicios) {
      if (e.ejercicioId !== ejercicio.id) continue;
      for (const x of e.series) if (x.hecha && x.tipo !== 'calentamiento' && x.esfuerzo > (mejor ?? 0)) mejor = x.esfuerzo;
    }
  }
  if (mejor == null) return false;
  // El primer escalón ya es uno más que tu mejor marca.
  const g = PRESETS_CICLO[prog.preset]?.generador;
  const ciclo = empezarCicloNuevo(datos, ejercicio, plan, { inicial: mejor + (g?.incremento ?? 1) });
  if (g) ciclo.generador = { ...ciclo.generador, incremento: g.incremento, cada: g.cada };
  ciclo.escalera = escaleraDe(null, ciclo.generador, prog.corte?.sesiones ?? 20);
  return false;
}

// Rellena lo que falte en una progresión de ciclo antigua.
export function completarCiclo(prog, perfil = {}) {
  prog.corte ??= { sesiones: prog.diasPorCiclo ?? 17, esfuerzoMin: perfil.bilboMinReps ?? 15, esfuerzoMax: null };
  prog.corte.sesiones ??= prog.diasPorCiclo ?? 17;
  prog.reinicio ??= { modo: 'rm-ciclo', porcentaje: perfil.bilboInicioPorcentaje ?? 50 };
  prog.preset ??= 'bilbo';
  prog.diasPorCiclo = prog.corte.sesiones;
  return prog;
}

export function aplicarPreset(prog, clave, ejercicio) {
  const p = PRESETS_CICLO[clave];
  prog.preset = clave;
  // Los que suben repeticiones o tiempo no tocan el peso.
  if (p.sobre === 'esfuerzo') prog.sobre = 'esfuerzo';
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
export function inicialSiguiente(datos, ejercicio, prog, ultimoValor, plan = null) {
  const r = prog.reinicio ?? { modo: 'rm-ciclo', porcentaje: 50 };
  const anterior = prog.ciclos?.at(-1)?.generador?.inicial ?? ultimoValor ?? 20;
  if (r.modo === 'mismo') return anterior;
  if (r.modo === 'ultimo' && ultimoValor != null) return aPesoDisponible(ejercicio, ultimoValor * ((r.porcentaje ?? 90) / 100));
  if (r.modo === 'reps' && plan) {
    // Tú dices las repeticiones y la app busca el peso que las da.
    const rm = mejorRMDelCiclo(datos, ejercicio, plan, prog.cicloActual) ?? rmDeReferencia(datos, ejercicio)?.valor;
    const peso = rm ? pesoParaReps(modeloDeEjercicio(datos, ejercicio), rm, r.reps ?? 20, 0) : null;
    if (peso) return aPesoDisponible(ejercicio, peso);
  }
  if (r.modo === 'rm-ciclo' && plan) {
    // Lo de Bilbo: el ciclo que acaba deja un 1RM nuevo, y el siguiente
    // arranca a un porcentaje de ese, no del de todo el historial.
    const rm = mejorRMDelCiclo(datos, ejercicio, plan, prog.cicloActual);
    if (rm) return aPesoDisponible(ejercicio, conMargen(datos, ejercicio, prog, rm, rm * ((r.porcentaje ?? 50) / 100)));
  }
  if (r.modo === 'porcentaje' || r.modo === 'rm-ciclo') {
    const rm = rmDeReferencia(datos, ejercicio)?.valor;
    if (rm) return aPesoDisponible(ejercicio, conMargen(datos, ejercicio, prog, rm, rm * ((r.porcentaje ?? 50) / 100)));
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
  generador.inicial = inicial ?? (prog.sobre === 'carga' ? inicialSiguiente(datos, ejercicio, prog, ultimoValor, plan) : generador.inicial);
  if (anterior) anterior.fin = new Date().toISOString().slice(0, 10);
  const ciclo = { n, inicio: new Date().toISOString().slice(0, 10), fin: null, generador,
    escalera: escaleraDe(ejercicio, generador, prog.corte.sesiones) };
  // «Con una prueba»: el primer día del ciclo es la prueba y el peso sale de ella.
  if (anterior && prog.reinicio?.modo === 'prueba' && inicial == null) ciclo.pendientePrueba = true;
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
export function describirCiclo(prog, unidad, nombreEsfuerzo = 'repeticiones') {
  const c = prog.corte ?? {};
  const g = prog.ciclos?.find((x) => x.n === prog.cicloActual)?.generador ?? {};
  const cada = g.cada === 1 || !g.cada ? 'cada sesión' : `cada ${g.cada} sesiones`;
  // Qué sube de verdad: con 0 kg de subida y una repetición más, el ciclo va
  // por repeticiones, no por peso, y así hay que contarlo.
  const sube = [];
  if (prog.sobre === 'esfuerzo') sube.push(`${formatearNumero(g.incremento ?? 0)} ${unidad}`);
  else {
    if ((g.incremento ?? 0) > 0) sube.push(`${formatearNumero(g.incremento)} ${unidad}`);
    const singular = { repeticiones: 'repetición' }[nombreEsfuerzo] ?? nombreEsfuerzo;
    if (g.incrementoEsfuerzo) sube.push(`${formatearNumero(g.incrementoEsfuerzo)} ${g.incrementoEsfuerzo === 1 ? singular : nombreEsfuerzo}`);
  }
  const partes = [sube.length ? `sube ${sube.join(' y ')} ${cada}` : 'mismo peso cada sesión'];
  if (g.fases?.length) partes.push(`con ${nombreEsfuerzo} por fases (${g.fases.map((f) => f.reps).join(', ')})`);
  const cortes = [];
  if (c.esfuerzoMin) cortes.push(`cuando ya solo te salgan ${c.esfuerzoMin}`);
  if (c.sesiones) cortes.push(`como muy tarde a las ${c.sesiones} sesiones`);
  if (c.esfuerzoMax) cortes.push(`si llegas a ${c.esfuerzoMax}`);
  if (c.cargaMax) cortes.push(`si el peso llega a ${formatearNumero(c.cargaMax)} ${unidad}`);
  if (c.rmPct) cortes.push(`si el peso pasa del ${c.rmPct} % de tu 1RM`);
  if (cortes.length) partes.push(`se corta ${cortes.join(' o ')}`);
  const r = prog.reinicio ?? {};
  partes.push(r.modo === 'manual' ? 'y avisa para que prepares el siguiente'
    : r.modo === 'prueba' ? 'y empieza otro con una prueba'
    : r.modo === 'mismo' ? 'y vuelve a empezar igual'
      : r.modo === 'ultimo' ? `y empieza otro al ${r.porcentaje} % del último valor`
        : r.modo === 'reps' ? `y empieza otro por el peso al que harías ${r.reps ?? 20} repeticiones`
          : r.modo === 'rm-ciclo' ? `y empieza otro al ${r.porcentaje} % del mejor 1RM de este ciclo`
          : `y empieza otro al ${r.porcentaje} % de tu 1RM de siempre`);
  return partes.join(', ') + '.';
}
