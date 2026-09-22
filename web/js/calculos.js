// Cálculos de entrenamiento. Funciones puras: no leen ni guardan nada.

import { PROGRAMAS, TECNICAS, recamaraDe, tramosDe } from './esquema.js';
import { modeloDe, repsParaIgualar, rmDeSerie } from './formula1rm.js';

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
  // «Primera vez» solo si el ejercicio no se ha hecho nunca, con ninguna serie.
  const base = { modo: prog.tipo, sobre, ultima, referencia, primeraVez: !ultima && !referencia };

  if (prog.tipo === 'bilbo') return { ...base, ...sugerenciaBilbo(datos, ejercicio, plan, { excluirSesion, sobre }) };

  if (prog.tipo === 'programa') return { ...base, ...sugerenciaPrograma(datos, ejercicio, plan, { excluirSesion }) };

  if (prog.tipo === 'maximo-trabajo') {
    return { ...base, ...maximoTrabajo(datos, ejercicio, { excluirSesion, tope: prog.topeEsfuerzo ?? 50 }) };
  }

  if (prog.tipo === 'carga') {
    const [, max] = prog.objetivoEsfuerzo || [];
    if (!ultima) return { ...base, rango: prog.objetivoEsfuerzo, carga: referencia?.serie.carga ?? null };
    const valorUltimo = sobre === 'carga' ? ultima.serie.carga : esfuerzoTotal(ultima.serie);
    const sube = max != null && esfuerzoTotal(ultima.serie) >= max;
    // En una máquina con sus pesos, subir es pasar al siguiente peso que hay.
    const siguiente = !sube ? valorUltimo
      : sobre === 'carga' && ejercicio.pesosMaquina?.length ? aPesoDisponible(ejercicio, valorUltimo ?? 0, { hacia: 'arriba' })
        : redondear((valorUltimo ?? 0) + (prog.incremento || 0));
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

  return { ...base, carga: ultima?.serie.carga ?? referencia?.serie.carga ?? null };
}

// El mejor 1RM estimado de las series hechas dentro de un ciclo. Es lo que
// usa el reinicio «al % del mejor 1RM de este ciclo».
export function mejorRMDelCiclo(datos, ejercicio, plan, cicloN) {
  let mejor = null;
  for (const r of registrosDelCiclo(datos, ejercicio, plan, cicloN)) {
    const rm = rmDeSerie(datos, ejercicio, r.serie, esfuerzoTotal(r.serie));
    if (rm && (mejor == null || rm > mejor)) mejor = rm;
  }
  return mejor;
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
    // Sin carga: la escalera son minutos, segundos o repeticiones. Se corta
    // al llegar al máximo del corte.
    const corte = prog.corte ?? {};
    const hechoAntes = ultimaDelCiclo ? esfuerzoTotal(ultimaDelCiclo.serie) : null;
    return { ...resultado, carga: null, esfuerzoObjetivo: valor,
      cicloAgotado: Boolean(corte.esfuerzoMax && hechoAntes != null && hechoAntes >= corte.esfuerzoMax) };
  }
  // Objetivo: las repeticiones que igualan el 1RM del día anterior, con la
  // fórmula del ejercicio y descontando la recámara que sueles dejar.
  // El primer día de un ciclo nuevo se compara con la última serie del anterior.
  const referencia = ultimaDelCiclo?.serie ?? seriesDeEjercicio(datos, ejercicio.id, { excluirSesion, planId: plan.id }).at(-1)?.serie ?? null;
  const rmAnterior = referencia ? rmDeSerie(datos, ejercicio, referencia, esfuerzoTotal(referencia)) : null;
  const recamara = recamaraDe(plan.tecnicas, ejercicio.recamaraPorDefecto ?? datos.perfil.recamaraPorDefecto ?? 1);
  const reps = rmAnterior && valor > 0 ? repsParaIgualar(modeloDe(datos, ejercicio), rmAnterior, valor, recamara) : null;
  // Repeticiones enteras y con tope: por encima de 40 el peso es demasiado bajo.
  let objetivoSuperar = reps != null ? Math.min(40, Math.ceil(Math.max(0, reps))) : null;
  // Si además marcaste que suban las repeticiones, manda esa escalera: el
  // objetivo del día sale de lo que pusiste, no de igualar el 1RM.
  const gen = ciclo.generador ?? {};
  if (gen.incrementoEsfuerzo) {
    objetivoSuperar = Math.round((gen.inicialEsfuerzo ?? 8)
      + gen.incrementoEsfuerzo * Math.floor((dia - 1) / Math.max(1, gen.cada ?? 1)));
  }
  // El ciclo se agota cuando el objetivo baja de las repeticiones mínimas
  // del corte (15 por defecto) o cuando lo hecho llega al máximo: toca
  // empezar uno nuevo.
  const corte = prog.corte ?? {};
  const minimo = corte.esfuerzoMin ?? datos.perfil.bilboMinReps ?? 15;
  const hechoAntes = ultimaDelCiclo ? esfuerzoTotal(ultimaDelCiclo.serie) : null;
  const agotado = (objetivoSuperar != null && minimo && objetivoSuperar < minimo)
    || (corte.esfuerzoMax && hechoAntes != null && hechoAntes >= corte.esfuerzoMax)
    || (corte.cargaMax && valor >= corte.cargaMax)
    || (corte.rmPct && rmAnterior && valor >= (rmAnterior * corte.rmPct) / 100);
  return { ...resultado, carga: valor, objetivoSuperar, pesoBajo: reps != null && reps > 40, cicloAgotado: agotado };
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
    const semana = semanas[n % 4];
    const tm = (prog.inicial ?? 0) + inc * Math.floor(n / 4);
    return { nombre: `ciclo ${Math.floor(n / 4) + 1}, ${semana.nombre}`,
      series: semana.pct.map((x, i) => ({ carga: p(tm * x), reps: semana.reps[i], amrap: i === 2 && n % 4 !== 3 })) };
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
  // 5×5: sube cuando completas las cinco; tres fallos seguidos, baja un 10 %.
  let carga = prog.inicial ?? 0;
  let fallos = 0;
  for (const series of historial) {
    const completa = series.length >= 5 && series.every((s) => (esfuerzoTotal(s) ?? 0) >= 5);
    if (completa) { carga = redondear(carga + inc); fallos = 0; }
    else if (++fallos >= 3) { carga = p(carga * 0.9); fallos = 0; }
  }
  return { nombre: `sesión ${n + 1}`, series: Array.from({ length: 5 }, () => ({ carga: p(carga), reps: 5 })) };
}

function sugerenciaPrograma(datos, ejercicio, plan, { excluirSesion } = {}) {
  const prog = plan.progresion;
  if (!PROGRAMAS[prog.programa]) return { sinPrograma: true, programa: prog.programa };
  // Sin peso inicial en la ficha se estima: en 5/3/1 el 90 % de tu 1RM; en
  // los demás, el 60 %; y sin historial, la barra (20 kg).
  let estimado = false;
  let progUsada = prog;
  if (prog.inicial == null) {
    const rm = rmDeReferencia(datos, ejercicio, { excluirSesion })?.valor;
    const inicial = rm ? aPesoDisponible(ejercicio, rm * (prog.programa === '531' ? 0.9 : 0.6)) : 20;
    progUsada = { ...prog, inicial };
    estimado = true;
  }
  const historial = sesionesDelPrograma(datos, ejercicio, plan, { excluirSesion });
  const n = historial.length;
  const toca = seriesDelPrograma(ejercicio, progUsada, n, historial);
  return { programa: prog.programa, sesionN: n + 1, nombreSesion: toca.nombre, seriesPrograma: toca.series, inicialEstimado: estimado,
    carga: toca.series[0]?.carga ?? null, esfuerzoObjetivo: toca.series[0]?.reps ?? null };
}

// Redondea a medios discos: en el gimnasio no hay 25,6 kg.
export function aPasoDeDisco(kg, paso = 2.5) {
  if (kg == null) return null;
  return redondear(Math.round(kg / paso) * paso, 2);
}

// Redondea a un peso que exista de verdad: si el ejercicio está atado a una
// máquina con sus pesos, al más cercano de ellos (o al siguiente por arriba o
// por abajo); si no, a medios discos.
export function aPesoDisponible(ejercicio, kg, { hacia = 'cerca' } = {}) {
  if (kg == null) return null;
  const pesos = ejercicio?.pesosMaquina?.length ? [...ejercicio.pesosMaquina].sort((a, b) => a - b) : null;
  if (!pesos) return aPasoDeDisco(kg);
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
export function rmDeReferencia(datos, ejercicio, { cicloN, excluirSesion } = {}) {
  const series = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion });
  const delCiclo = cicloN != null ? series.filter((x) => x.entrada.cicloN === cicloN) : [];
  const candidatas = delCiclo.length ? delCiclo : series;
  const rms = candidatas.map((x) => rmDeSerie(datos, ejercicio, x.serie, esfuerzoTotal(x.serie))).filter(Boolean);
  if (!rms.length) return null;
  return { valor: redondear(Math.max(...rms), 1), delCiclo: Boolean(delCiclo.length) };
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
  return { ...resultado, carga, esfuerzoObjetivo: redondear(repsEn(carga), 0),
    trabajoEsperado: redondear(ajuste.trabajoEn(carga), 0), cima: aPasoDeDisco(cima), aviso };
}

// Pesos propuestos para las bajadas de un drop set, a partir de la carga de
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
    if (carga == null && serie.carga != null) carga = Math.max(0, redondear(serie.carga - salto * i, 2));
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
    const rm = x.serie.tramos?.length ? null : rmDeSerie(datos, ejercicio, x.serie, esfuerzoTotal(x.serie));
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
