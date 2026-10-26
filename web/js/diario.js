// Diario: una entrada por día con el sueño de la noche anterior (la fecha es
// la del día en que te levantas), la sensación al levantarte y lo que puede
// influir en el sueño. El peso sigue en `perfil.pesos` (peso.js).
//
// El sueño real es el tiempo en cama menos lo que tardas en dormirte, lo que
// estás despierto por la noche y lo que remoloneas; la eficiencia es sueño
// real entre tiempo en cama. Normal: 85 % o más; en jóvenes sanos, más del
// 90 % (Ohayon 2004). Nada de fases ni puntuaciones del reloj: aciertan
// cuándo duermes y fallan cuándo estás despierto (Chinoy 2021).

import { esfuerzoTotal } from './calculos.js';
import { normalizar } from './catalogo.js';
import { hoyISO } from './ui.js';

export const NECESIDAD_SUENO_POR_DEFECTO = 8.5;
// Suelo de seguridad: nunca se propone una hora que deje menos de 7 h de
// sueño real (consenso de la American Academy of Sleep Medicine, Watson 2015).
export const SUENO_MINIMO_H = 7;
// Cuánto se adelanta la hora de acostarse por cada semana del plan. Es el
// paquete de Facer-Childs 2019, que adelantó unas 2 h la fase de 22 personas
// en 3 semanas sin que perdieran sueño.
export const ADELANTO_SEMANAL_MIN = 15;
export const ALCOHOL = { no: 'No', poco: '1-2 bebidas', mucho: '3 o más' };
export const SENSACIONES = ['', 'Fatal', 'Mal', 'Regular', 'Bien', 'Genial'];

// Los básicos con los que se mira si el sueño te está costando: el volumen
// tolerado cae antes que el 1RM (Cook 2012; Knowles 2022). Se reconocen por el
// nombre del catálogo tolerando variantes («press de banca inclinado», «peso
// muerto sumo», «remo con barra Pendlay»), y se dejan fuera los estiramientos
// y las posturas de yoga que llevan esas mismas palabras.
const BASICOS = [
  /\bpress\b.*\bbanca\b/,
  /\bsentadilla\b/,
  /\bpeso muerto\b/,
  /\bremo\b.*\bbarra\b/,
  /\bpress\b.*\bmilitar\b/,
];
const NO_BASICOS = /estiramiento|asana|mantenid|movilidad/;
export function esBasico(ej) {
  const n = normalizar(ej?.nombre ?? '');
  return Boolean(n) && !NO_BASICOS.test(n) && BASICOS.some((re) => re.test(n));
}

const minutos = (hhmm) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Minutos del día → «HH:MM», dando la vuelta al reloj si hace falta.
export function textoHora(min) {
  if (min == null) return '—';
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Las horas de acostarse se comparan en una escala de «noche»: lo que cae
// antes del mediodía se cuenta como del día siguiente, así las 01:10 van
// después de las 23:50 y no diez horas antes.
const escalaNoche = (min) => (min < 12 * 60 ? min + 1440 : min);

// Cuánto se mueve un grupo de horas: la más tardía menos la más temprana,
// medido como la vuelta de reloj más corta que las abarca todas. Así 23:50 y
// 01:10 distan 80 min, no 1360.
function rangoHoras(mins) {
  if (mins.length < 2) return null;
  let mejor = null;
  for (const base of mins) {
    let max = 0;
    for (const m of mins) {
      const d = (m - base + 1440) % 1440;
      if (d > max) max = d;
    }
    if (mejor == null || max < mejor) mejor = max;
  }
  return mejor;
}

// { enCama, real, eficiencia } en minutos (eficiencia de 0 a 1), o null si
// faltan las horas.
export function calcularSueno(e) {
  const luz = minutos(e?.luzApagada);
  const arriba = minutos(e?.levantado);
  if (luz == null || arriba == null) return null;
  let enCama = arriba - luz;
  if (enCama <= 0) enCama += 24 * 60;
  const real = Math.max(0, enCama - (e.latenciaMin ?? 0) - (e.despiertoMin ?? 0) - (e.remoloneoMin ?? 0));
  return { enCama, real, eficiencia: enCama ? real / enCama : null };
}

export function textoHoras(min) {
  if (min == null) return '—';
  const signo = min < 0 ? '−' : '';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  if (!h) return `${signo}${m} min`;
  return m ? `${signo}${h} h ${m} min` : `${signo}${h} h`;
}

export function entradaDe(datos, fecha) {
  return (datos.diario ?? []).find((x) => x.fecha === fecha) ?? null;
}

// La entrada de ese día, creándola si no existe (dentro de estado.cambiar).
function entradaOCrear(datos, fecha) {
  datos.diario ??= [];
  let e = datos.diario.find((x) => x.fecha === fecha);
  if (!e) { e = { id: fecha, fecha }; datos.diario.push(e); datos.diario.sort((a, b) => a.fecha.localeCompare(b.fecha)); }
  return e;
}

// Cambia `datos` (dentro de estado.cambiar). Crea la entrada si no existe y
// la quita si se queda sin nada.
export function apuntarEnDiario(datos, fecha, campo, valor) {
  const e = entradaOCrear(datos, fecha);
  if (valor == null || valor === '') delete e[campo]; else e[campo] = valor;
  if (Object.keys(e).every((k) => k === 'id' || k === 'fecha')) datos.diario = datos.diario.filter((x) => x !== e);
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const masDias = (fechaISO, n) => { const d = new Date(`${fechaISO}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const diaSemana = (fechaISO) => new Date(`${fechaISO}T12:00:00`).getDay();

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Repeticiones de las series de trabajo de los básicos entre dos fechas.
// Devuelve null (y no 0) si no tienes ninguno de los básicos: así el resumen
// enseña un guion en vez de dar a entender que esa semana no entrenaste.
function repsBasicos(datos, desde, hasta) {
  const basicos = new Set((datos.ejercicios ?? []).filter(esBasico).map((e) => e.id));
  if (!basicos.size) return null;
  let total = 0;
  for (const s of datos.sesiones ?? []) {
    if (s.borrada || s.fecha < desde || s.fecha > hasta) continue;
    for (const entrada of s.ejercicios ?? []) {
      if (!basicos.has(entrada.ejercicioId)) continue;
      for (const serie of entrada.series ?? []) {
        if (serie.hecha && serie.tipo !== 'calentamiento') total += esfuerzoTotal(serie) ?? 0;
      }
    }
  }
  return total;
}

// Las entradas del diario que tienen algo apuntado, de la más antigua a la más
// reciente.
function entradasConAlgo(datos) {
  return (datos.diario ?? [])
    .filter((e) => Object.keys(e).some((k) => k !== 'id' && k !== 'fecha'))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Resumen de los últimos 7 días con datos (los 7 últimos apuntes del diario,
// aunque entre ellos haya algún hueco). Lleva:
//   · medias de sueño real, tiempo en cama, eficiencia, pulso y sensación;
//   · jet lag social: el punto medio del sueño del fin de semana (las noches
//     del viernes y del sábado, que son las que acaban sábado y domingo) menos
//     el de los días laborables. Más de 1 h indica deuda acumulada
//     (Roenneberg 2012);
//   · regularidad: cuánto se mueven la hora de acostarse y la de levantarse,
//     que predice la mortalidad mejor que la duración (Windred 2024);
//   · repeticiones de trabajo en los básicos de los últimos 7 días frente a
//     los 7 anteriores.
export function resumenUltimos7(datos, hoy = hoyISO()) {
  const dias = entradasConAlgo(datos).slice(-7);
  const ancla = dias.at(-1)?.fecha ?? hoy;
  const suenos = dias.map((e) => ({ e, s: calcularSueno(e) })).filter((x) => x.s);

  const esFinde = (f) => [6, 0].includes(diaSemana(f));
  // Punto medio del sueño: la hora a la que te duermes (apagar la luz más lo
  // que tardas en dormirte) más la mitad del sueño real.
  const puntoMedio = ({ e, s }) => escalaNoche((minutos(e.luzApagada) + (e.latenciaMin ?? 0)) % 1440) + s.real / 2;
  const medioFinde = media(suenos.filter((x) => esFinde(x.e.fecha)).map(puntoMedio));
  const medioLaborables = media(suenos.filter((x) => !esFinde(x.e.fecha)).map(puntoMedio));

  const reps = repsBasicos(datos, masDias(ancla, -6), ancla);
  const repsAntes = repsBasicos(datos, masDias(ancla, -13), masDias(ancla, -7));

  return {
    dias: dias.length,
    noches: suenos.length,
    desde: dias[0]?.fecha ?? null,
    hasta: dias.at(-1)?.fecha ?? null,
    real: media(suenos.map((x) => x.s.real)),
    enCama: media(suenos.map((x) => x.s.enCama)),
    eficiencia: media(suenos.map((x) => x.s.eficiencia)),
    pulso: media(dias.map((e) => e.pulsoNocturno).filter((v) => v > 0)),
    sensacion: media(dias.map((e) => e.sensacion).filter((v) => v > 0)),
    jetLagSocial: medioFinde != null && medioLaborables != null ? medioFinde - medioLaborables : null,
    variacionAcostarse: rangoHoras(dias.map((e) => minutos(e.luzApagada)).filter((v) => v != null)),
    variacionLevantarse: rangoHoras(dias.map((e) => minutos(e.levantado)).filter((v) => v != null)),
    reps,
    repsAntes,
    cambioReps: reps != null && repsAntes ? (reps - repsAntes) / repsAntes : null,
    // Los tests de atención de esos mismos días, cada versión por su lado.
    pvt: mediasPVT(dias.flatMap((e) => (e.pvt ?? []).map((t) => ({ ...t, fecha: e.fecha })))),
  };
}

// La hora de acostarse de esta semana del plan. Parte de la hora a la que te
// acuestas de verdad (la media de la primera semana con datos) y la adelanta
// 15 min por cada semana transcurrida desde la fecha de inicio, sin pasarse de
// la hora objetivo (la de levantarte menos lo que necesitas dormir) y
// redondeando a múltiplos de 5 min. Con ella van las dos horas que la
// acompañan: cortar pantallas 2 h antes y cenar antes de las 21:00 (paquete de
// Facer-Childs 2019).
//
// Devuelve { falta: 'ajustes' | 'datos' } cuando no se puede calcular: antes
// que un número inventado, ningún número.
export function horaAcostarse(datos, hoy = hoyISO()) {
  const p = datos.perfil ?? {};
  const levantarse = minutos(p.levantarseObjetivo);
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(p.inicioPlanSueno ?? '') ? p.inicioPlanSueno : null;
  if (levantarse == null || !inicio) {
    return { falta: 'ajustes', sinHora: levantarse == null, sinInicio: !inicio };
  }

  const conHora = entradasConAlgo(datos).filter((e) => minutos(e.luzApagada) != null);
  if (conHora.length < 3) return { falta: 'datos', noches: conHora.length };

  // Todo en la escala de «noche»: la hora de levantarse es la de la mañana
  // siguiente, por eso va un día entero por delante.
  const base = media(conHora.slice(0, 7).map((e) => escalaNoche(minutos(e.luzApagada))));
  const arriba = levantarse + 1440;
  const necesidadMin = (p.necesidadSuenoH ?? NECESIDAD_SUENO_POR_DEFECTO) * 60;
  const objetivo = arriba - necesidadMin;
  const semanas = Math.max(0, Math.floor((new Date(`${hoy}T12:00:00`) - new Date(`${inicio}T12:00:00`)) / (7 * 86_400_000)));

  // Si ya te acuestas antes que la hora objetivo, no hay nada que adelantar.
  let propuesta = base <= objetivo ? base : Math.max(objetivo, base - ADELANTO_SEMANAL_MIN * semanas);
  propuesta = Math.round(propuesta / 5) * 5;

  // Tope de seguridad: 7 h de sueño real como mínimo. Lo que se pierde cada
  // noche (dormirte, despertares, remoloneo) sale de tus últimas noches.
  const perdidas = media(entradasConAlgo(datos).filter((e) => calcularSueno(e)).slice(-7)
    .map((e) => (e.latenciaMin ?? 0) + (e.despiertoMin ?? 0) + (e.remoloneoMin ?? 0))) ?? 0;
  const tope = Math.round((arriba - SUENO_MINIMO_H * 60 - perdidas) / 5) * 5;
  const recortada = propuesta > tope;
  if (recortada) propuesta = tope;

  return {
    hora: textoHora(propuesta),
    pantallas: textoHora(propuesta - 120),
    cena: '21:00',
    base: textoHora(base),
    objetivo: textoHora(objetivo),
    levantarse: textoHora(levantarse),
    semanas,
    recortada,
    perdidas: Math.round(perdidas),
    enCama: arriba - propuesta,
    real: Math.max(0, arriba - propuesta - perdidas),
  };
}

// ---------------------------------------------------------------------------
// Test de atención (PVT): tres duraciones y la velocidad como dato principal
// ---------------------------------------------------------------------------
//
// PVT es «psychomotor vigilance task», tarea de vigilancia psicomotora: sale
// un contador en momentos al azar y hay que tocar cuanto antes.
//
// Por qué está montado así, que no es un capricho:
//   · **No hay baremos publicados** de ninguna versión del PVT (Taillard 2024,
//     Neurophysiol Clin, PMID 38401239). No existe el «300 ms es lo normal»:
//     cada uno se compara consigo mismo y con nada más.
//   · **Tres duraciones**: 3 min (intervalos de 1 a 4 s, lapso por encima de
//     355 ms), 5 min y 10 min (intervalos de 2 a 10 s, lapso por encima de
//     500 ms). Por defecto, 5 min: es la única versión con un cambio mínimo
//     detectable publicado (Thompson 2022: fiabilidad 0,79-0,83 y error
//     típico del 4,1-4,4 %), o sea, la única con la que se puede decir si una
//     diferencia es de verdad o es ruido. En gente descansada el de 3 min y
//     el de 10 no se parecen (r = 0,134, sin significación; Antler 2022, 83
//     adultos), así que sus números NO se mezclan nunca: cada duración va por
//     su lado en el resumen, en la media móvil y en la línea base.
//   · **La velocidad manda**: es la media de 1 dividido entre cada tiempo de
//     reacción en segundos (respuestas por segundo; se promedian los
//     inversos, no se invierte la media, que es como se hace en el PVT). Los
//     lapsos no sirven para seguir a alguien descansado: la mediana es de 0 o
//     1 por sesión y Thompson 2022 no pudo ni estimar su fiabilidad. Y, sobre
//     todo, con 7 h en cama la velocidad baja pero los lapsos no suben
//     (Belenky 2003): mirando lapsos, un recorte de sueño parece gratis
//     cuando no lo es.
//   · **Se decide sobre medias de 7 tests, no sobre un día suelto**, y solo se
//     llama cambio a lo que pasa del 11-12 % respecto a la base (2,77 × el
//     error típico de Thompson 2022, el cambio mínimo detectable).
//   · **La línea base son los días 1 al 21** (decisión de Dan, 26-10-2026). El
//     PVT no tiene curva de aprendizaje (Langner 2023; Graw 2004), pero los
//     primeros días hay ruido de familiarización y no hay nada publicado
//     sobre cuántos hacen falta.
export const MODOS_PVT = {
  min3: { etiqueta: '3 min', corto: '3 min', minutos: 3, duracionMs: 3 * 60 * 1000, isiMinMs: 1000, isiMaxMs: 4000, lapsoMs: 355, esperaMaxMs: 10_000 },
  min5: { etiqueta: '5 min', corto: '5 min', minutos: 5, duracionMs: 5 * 60 * 1000, isiMinMs: 2000, isiMaxMs: 10_000, lapsoMs: 500, esperaMaxMs: 30_000 },
  min10: { etiqueta: '10 min', corto: '10 min', minutos: 10, duracionMs: 10 * 60 * 1000, isiMinMs: 2000, isiMaxMs: 10_000, lapsoMs: 500, esperaMaxMs: 30_000 },
};
export const MODO_PVT_POR_DEFECTO = 'min5';
// Por debajo de esto no hay reacción posible: es haberse adelantado.
export const ANTICIPACION_PVT_MS = 100;
// Cambio mínimo detectable: 2,77 × el error típico del 4,1-4,4 % de Thompson
// 2022. Por debajo, es la variación normal de uno mismo.
export const CAMBIO_REAL_PVT = 0.115;
// Sobre cuántos tests se decide, y qué días forman la línea base.
export const TESTS_MEDIA_MOVIL = 7;
export const DIA_INICIO_BASE = 1;
export const DIA_FIN_BASE = 21;
export const TESTS_MINIMOS_BASE = 5;
// El aviso de la mañana, si no se pone otra hora: media hora después de la
// hora de levantarse que ya está en el perfil.
export const AVISO_PVT_TRAS_LEVANTARSE_MIN = 30;

export const modoPVT = (test) => (MODOS_PVT[test?.modo] ? test.modo : MODO_PVT_POR_DEFECTO);
export const datosModoPVT = (modo) => MODOS_PVT[modo] ?? MODOS_PVT[MODO_PVT_POR_DEFECTO];

// Velocidad de respuesta en respuestas por segundo, a partir de los tiempos de
// reacción en milisegundos. Se promedian los inversos (1/TR), que es como se
// calcula en el PVT; no se invierte la media.
export function velocidadDeTiempos(ms) {
  const buenos = ms.filter((x) => x > 0);
  return buenos.length ? media(buenos.map((x) => 1000 / x)) : null;
}

// Guarda un test en el día que toque (dentro de estado.cambiar). Es una lista:
// puede haber más de uno al día (uno por la mañana y otro por la tarde).
export function apuntarPVT(datos, fecha, test) {
  const e = entradaOCrear(datos, fecha);
  (e.pvt ??= []).push(test);
}

// Todos los tests apuntados, del más antiguo al más reciente, cada uno con su
// fecha. Con `modo`, solo los de esa duración.
export function testsPVT(datos, modo = null) {
  return (datos?.diario ?? [])
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .flatMap((e) => (e.pvt ?? []).map((t) => ({ ...t, fecha: e.fecha })))
    .filter((t) => !modo || modoPVT(t) === modo);
}

// Los tests de un día concreto, en el orden en que se hicieron.
export function pvtDelDia(datos, fecha) {
  return (entradaDe(datos ?? {}, fecha)?.pvt ?? []).map((t) => ({ ...t, fecha }));
}

function resumirTests(tests) {
  return {
    tests: tests.length,
    velocidad: media(tests.map((t) => t.velocidad).filter((v) => v > 0)),
    mediaMs: media(tests.map((t) => t.mediaMs).filter((v) => v > 0)),
    lapsos: media(tests.map((t) => t.lapsos).filter((v) => v != null)),
  };
}

// Medias de una lista de tests, cada duración por su lado. Devuelve un objeto
// con una entrada por modo, null en los que no tengan ningún test.
export function mediasPVT(tests) {
  const salida = {};
  for (const modo of Object.keys(MODOS_PVT)) {
    const suyos = tests.filter((t) => modoPVT(t) === modo);
    salida[modo] = suyos.length ? resumirTests(suyos) : null;
  }
  return salida;
}

// La media móvil: los últimos 7 tests de esa duración, el de hoy incluido. Es
// sobre esto sobre lo que se mira si algo ha cambiado, nunca sobre un día.
export function mediaMovilPVT(datos, modo) {
  const suyos = testsPVT(datos, modo).slice(-TESTS_MEDIA_MOVIL);
  return suyos.length ? { ...resumirTests(suyos), desde: suyos[0].fecha, hasta: suyos.at(-1).fecha } : null;
}

// Tu línea base de una duración: los tests de los días 1 al 21 contando desde
// el primero que hiciste de esa duración. Dan eligió el 26-10-2026 contar desde
// el primer día en vez de tirar la primera semana, para tener base antes; el
// test no tiene curva de aprendizaje (Langner 2023; Graw 2004), así que el
// riesgo es solo el ruido de los primeros días. Devuelve
// { falta: 'dias' | 'tests', … } mientras no se pueda calcular: antes que un
// número flojo, ninguno.
export function baseDePVT(datos, modo) {
  const todos = testsPVT(datos, modo);
  if (!todos.length) return { falta: 'dias', tests: 0, dias: 0 };
  const primero = todos[0].fecha;
  const desde = masDias(primero, DIA_INICIO_BASE - 1);
  const hasta = masDias(primero, DIA_FIN_BASE - 1);
  const dentro = todos.filter((t) => t.fecha >= desde && t.fecha <= hasta && t.velocidad > 0);
  if (dentro.length < TESTS_MINIMOS_BASE) {
    return { falta: 'tests', desde, hasta, primero, tests: dentro.length };
  }
  // Primero se promedia cada día (puede tener dos tests) y luego los días.
  const porDia = new Map();
  for (const t of dentro) {
    if (!porDia.has(t.fecha)) porDia.set(t.fecha, []);
    porDia.get(t.fecha).push(t);
  }
  const dias = [...porDia.values()];
  return {
    modo,
    dias: dias.length,
    tests: dentro.length,
    desde,
    hasta,
    primero,
    velocidad: media(dias.map((ts) => media(ts.map((t) => t.velocidad)))),
    mediaMs: media(dias.map((ts) => media(ts.map((t) => t.mediaMs).filter((v) => v > 0))).filter((v) => v != null)),
    lapsos: media(dias.map((ts) => media(ts.map((t) => t.lapsos ?? 0)))),
  };
}

// Una velocidad frente a la línea base. `cambio` es la diferencia relativa
// (positivo = más rápido que la base) y `real` dice si pasa del cambio mínimo
// detectable; por debajo de eso es la variación normal de cualquiera.
export function compararConBase(velocidad, base) {
  if (!(velocidad > 0) || !base || base.falta || !(base.velocidad > 0)) return null;
  const cambio = (velocidad - base.velocidad) / base.velocidad;
  return { base, cambio, real: Math.abs(cambio) >= CAMBIO_REAL_PVT, masLento: cambio < 0 };
}

// La hora del aviso de la mañana: la que se haya puesto o, si no, media hora
// después de la hora de levantarse objetivo del perfil. null si no hay ninguna
// de las dos (entonces no se puede avisar y la app no lo promete).
export function horaAvisoPvt(datos) {
  const p = datos?.perfil ?? {};
  if (/^\d{1,2}:\d{2}$/.test(p.avisarPvtHora ?? '')) return p.avisarPvtHora;
  const arriba = minutos(p.levantarseObjetivo);
  return arriba == null ? null : textoHora(arriba + AVISO_PVT_TRAS_LEVANTARSE_MIN);
}

// ¿Falta el test de hoy? Cuenta cualquiera de las duraciones: el recordatorio
// es para no olvidarse, no para exigir una en concreto.
export function faltaPvtHoy(datos, fecha = hoyISO()) {
  return pvtDelDia(datos, fecha).length === 0;
}
