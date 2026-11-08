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

// El audio de hipnosis antes de dormir, para poder comparar las noches con
// audio y las noches sin él. Sin este registro la prueba no se puede leer: lo
// único que descuenta la expectativa es alternar y comparar.
//
// Qué se apunta y por qué «hasta dónde llegaste despierto»: la sugestión
// central del audio va del minuto 6:44 al 9:47, después de la inducción. Una
// noche en la que te duermas en el minuto cuatro no es una noche con
// sugestión, y contarla como tal diluye el efecto que se busca.
export const AUDIO_HIPNOSIS = {
  no: 'No',
  entero: 'Sí, entero',
  sugestion: 'Sí, pasada la sugestión',
  antes: 'Sí, me dormí antes',
};

// Cuál de los audios. Los bloques de la sugestión del audio 2 no se volvieron a
// generar: son los MISMOS archivos de voz del audio 1, así que entre una
// versión y otra solo cambia la inducción y la profundización. Eso es lo que
// permite preguntarse si el envoltorio influye, con la sugestión constante.
// En el audio 1 la sugestión va de 6:44 a 9:47; en el 2, de 6:26 a 9:29.
export const VERSIONES_AUDIO = {
  1: 'El 1 (cuerpo y escalera)',
  2: 'El 2 (párpados y ojo de la mente)',
};

// El entrenamiento de ilusiones: cuatro ítems por sesión, siempre en el mismo
// orden y de menos a más difícil para él (el oído y la vista son los que le
// cuestan). Se puntúan de 0 a 3 y van en el día en que se hace la sesión.
//
// Por qué se mide en vez de darlo por hecho: dos semanas escuchando hipnosis
// no subieron la sugestionabilidad en el único experimento que lo probó
// (Rasch y Cordi 2023, Front Psychol 14:1293070), y el programa clásico para
// entrenarla sube el autoinforme pero no la respuesta observada, con el efecto
// explicado entero por la expectativa (Gearan y Kirsch 1993, PMID 8468105).
export const ITEMS_ILUSIONES = { Motor: 'Cuerpo', Tacto: 'Tacto', Oido: 'Oído', Vista: 'Vista' };
export const NIVELES_ILUSIONES = [1, 2, 3, 4, 5, 6];
export const NOTAS_ILUSIONES = [0, 1, 2, 3];

// El total de la sesión, de 0 a 12. Devuelve null si falta algún ítem: media
// sesión no es comparable con una entera.
export function totalIlusiones(entrada) {
  const notas = Object.keys(ITEMS_ILUSIONES).map((k) => entrada?.['ilusion' + k]);
  return notas.every((n) => typeof n === 'number') ? notas.reduce((a, b) => a + b, 0) : null;
}

// Si ese día hubo sesión de ilusiones (hay nivel apuntado, con notas o sin ellas).
export const huboIlusiones = (entrada) => entrada?.ilusionNivel != null;

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
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86_400_000);
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
//   · **La línea base son los primeros 5 tests**, sin plazo (decisión de Dan,
//     26 y 27-10-2026). El PVT no tiene curva de aprendizaje (Langner 2023;
//     Graw 2004), así que no hay por qué tirar los primeros días, y no hay
//     nada publicado sobre cuántos tests hacen falta: 5 es una decisión de la
//     app, no una cifra de la literatura.
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
// Sobre cuántos tests se decide y cuáles forman la línea base.
export const TESTS_MEDIA_MOVIL = 7;
export const TESTS_MINIMOS_BASE = 5;
// La base no tiene plazo: son los primeros 5 tests, lleguen cuando lleguen
// (decisión de Dan, 27-10-2026). Antes había una ventana de 21 días y, si no
// se llegaba a 5 dentro de ella, la base no se calculaba nunca: un punto
// muerto. Lo que queda del número es solo un aviso: si esos 5 tests acaban
// repartidos en más de 21 días, la base retrata dos épocas en vez de una y la
// app lo dice al compararte.
export const DIAS_BASE_SEGUIDA = 21;
// El aviso de la mañana, si no se pone otra hora: tres cuartos de hora después
// de la hora de levantarse que ya está en el perfil.
//
// Eran 30 minutos y subió a 45 el 08-11-2026, al mirar los 12 primeros tests
// de Dan: los hizo todos entre 8 y 28 minutos después de levantarse (media
// 13), o sea dentro de la inercia del sueño, que es la franja del día con peor
// rendimiento y más variable. El resultado es que su velocidad no correlaciona
// con lo que durmió esa noche (r = +0,08 sobre 12 tests). A los 45 minutos ya
// se ha salido de la parte empinada de la inercia y el dato sigue siendo
// comparable de un día a otro, que es lo que importa aquí.
export const AVISO_PVT_TRAS_LEVANTARSE_MIN = 45;

// El segundo test del día, por la tarde. Es el que recoge el cansancio
// acumulado sin la inercia del sueño encima: la inercia se mide en minutos
// desde que te levantas y a media tarde ya no queda nada de ella, mientras que
// el efecto de dormir poco se acumula a lo largo de semanas (Van Dongen 2003,
// Sleep 26(2):117-126, PMID 12683469). Con un solo test por la mañana los dos
// efectos van mezclados y no se pueden separar.
export const AVISO_PVT_TARDE_POR_DEFECTO = '18:00';

// Los dos momentos del día en que se hace el test. El corte está a las 14:00:
// por debajo cuenta como el de la mañana y por encima como el de la tarde.
export const MOMENTOS_PVT = { manana: 'Mañana', tarde: 'Tarde' };
export const CORTE_MOMENTO_PVT_MIN = 14 * 60;

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

// Apunta si había tomado cafeína antes del último test de ese día. Se pregunta
// en la pantalla de resultados, no antes, para no meterle la idea en la cabeza
// justo cuando va a hacer el test.
export function marcarCafeinaUltimoPVT(datos, fecha, valor) {
  const lista = entradaDe(datos, fecha)?.pvt;
  if (lista?.length) lista.at(-1).cafeina = valor;
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

// Tu línea base de una duración: tus primeros 5 tests de esa duración, sin
// plazo. Dan eligió el 26-10-2026 contar desde el primer test en vez de tirar
// la primera semana (el test no tiene curva de aprendizaje: Langner 2023;
// Graw 2004) y el 27-10-2026 quitar la ventana de 21 días, que podía dejar la
// base sin calcular para siempre. Si los 5 acaban repartidos en más de
// DIAS_BASE_SEGUIDA días, se marca `repartida` para avisar al compararse.
// Devuelve { falta: 'dias' | 'tests', … } mientras no se pueda calcular:
// antes que un número flojo, ninguno.
export function baseDePVT(datos, modo) {
  const todos = testsPVT(datos, modo).filter((t) => t.velocidad > 0);
  if (!todos.length) return { falta: 'dias', tests: 0, dias: 0 };
  const primero = todos[0].fecha;
  if (todos.length < TESTS_MINIMOS_BASE) {
    return { falta: 'tests', primero, tests: todos.length, faltan: TESTS_MINIMOS_BASE - todos.length };
  }
  const dentro = todos.slice(0, TESTS_MINIMOS_BASE);
  const desde = dentro[0].fecha;
  const hasta = dentro.at(-1).fecha;
  const abarca = diasEntre(desde, hasta) + 1;
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
    abarca,
    repartida: abarca > DIAS_BASE_SEGUIDA,
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

// La hora del aviso de la mañana: la que se haya puesto a mano o, si no, 45
// minutos después de la hora a la que te has levantado HOY (la de «levantado»
// del diario). Si aún no la has apuntado, 45 minutos después de la hora de
// levantarse objetivo del perfil. null si no hay ninguna (entonces no se puede
// avisar y la app no lo promete). Desde el 09-11-2026: Dan hace días sin
// despertador y se levanta a horas distintas; con una hora fija, la inercia
// del sueño en el momento del test cambiaba de un día a otro.
export function horaAvisoPvt(datos, fecha = hoyISO()) {
  const p = datos?.perfil ?? {};
  if (/^\d{1,2}:\d{2}$/.test(p.avisarPvtHora ?? '')) return p.avisarPvtHora;
  const arriba = minutos(entradaDe(datos ?? {}, fecha)?.levantado) ?? minutos(p.levantarseObjetivo);
  return arriba == null ? null : textoHora(arriba + AVISO_PVT_TRAS_LEVANTARSE_MIN);
}

// Minutos desde que te levantaste hoy hasta `ahora`, según la hora de
// «levantado» del diario. null si no está apuntada.
export function minutosTrasLevantarse(datos, fecha = hoyISO(), ahora = new Date()) {
  const arriba = minutos(entradaDe(datos ?? {}, fecha)?.levantado);
  if (arriba == null) return null;
  const dif = ahora.getHours() * 60 + ahora.getMinutes() - arriba;
  return dif < 0 ? dif + 1440 : dif;
}

// Cuánto dura la ventana del test de la mañana a partir de esos 45 minutos.
// Pasada, el de la mañana ya no toca ese día: un test a las 13:00 de alguien
// que se levantó a las 8:00 entraría en los datos como «de la mañana» sin
// serlo (conversación del sueño, 09-11-2026).
export const VENTANA_PVT_MANANA_MIN = 120;

// ¿Toca ya el test de la mañana? Hace falta que hayan pasado
// AVISO_PVT_TRAS_LEVANTARSE_MIN desde la hora de «levantado» de hoy, y no más
// de esa ventana. Sin esa hora no se sabe, y no se frena a nadie.
// Devuelve { listo, hora, pasado }: `hora` es a partir de cuándo toca y
// `pasado`, que hoy la ventana ya se cerró.
//
// OJO al comparar: los 12 primeros tests de Dan (hasta el 08-11-2026) se
// hicieron entre 8 y 28 minutos después de levantarse; desde el 09-11-2026 van
// a los 45 o más. Los nuevos son comparables entre sí, no con aquellos. Cada
// test guarda `minTrasLevantarse` (null si no había hora apuntada) para poder
// separarlos o corregirlos en el análisis.
export function listoParaPvt(datos, fecha = hoyISO(), ahora = new Date()) {
  const tras = minutosTrasLevantarse(datos, fecha, ahora);
  if (tras == null) return { listo: true, hora: null, pasado: false };
  const arriba = minutos(entradaDe(datos ?? {}, fecha)?.levantado);
  const pasado = tras > AVISO_PVT_TRAS_LEVANTARSE_MIN + VENTANA_PVT_MANANA_MIN;
  return { listo: tras >= AVISO_PVT_TRAS_LEVANTARSE_MIN && !pasado, pasado,
    hora: textoHora(arriba + AVISO_PVT_TRAS_LEVANTARSE_MIN) };
}

// La hora del aviso de la tarde: la que se haya puesto o, si no, las 18:00.
export function horaAvisoPvtTarde(datos) {
  const p = datos?.perfil ?? {};
  return /^\d{1,2}:\d{2}$/.test(p.avisarPvtTardeHora ?? '') ? p.avisarPvtTardeHora : AVISO_PVT_TARDE_POR_DEFECTO;
}

// A qué momento del día pertenece un test. Si se guardó con `momento`, ese; si
// no (los tests de antes del 08-11-2026), se deduce de la hora.
export function momentoPVT(test) {
  if (MOMENTOS_PVT[test?.momento]) return test.momento;
  const m = minutos(test?.hora);
  return m == null || m < CORTE_MOMENTO_PVT_MIN ? 'manana' : 'tarde';
}

// Los tests de un día repartidos por momento: { manana: [...], tarde: [...] }.
export function pvtDelDiaPorMomento(datos, fecha) {
  const salida = { manana: [], tarde: [] };
  for (const t of pvtDelDia(datos, fecha)) salida[momentoPVT(t)].push(t);
  return salida;
}

// ¿Falta el test de hoy? Cuenta cualquiera de las duraciones: el recordatorio
// es para no olvidarse, no para exigir una en concreto.
export function faltaPvtHoy(datos, fecha = hoyISO()) {
  return pvtDelDia(datos, fecha).length === 0;
}

// ¿Falta el de la mañana o el de la tarde? El aviso de cada momento solo salta
// si ese momento está sin hacer: haber hecho el de la mañana no calla el de la
// tarde, que es justo el que aporta el dato nuevo.
export function faltaPvtMomento(datos, fecha = hoyISO(), momento = 'manana') {
  return pvtDelDiaPorMomento(datos, fecha)[momento]?.length === 0;
}

// ¿Está activado el segundo test del día? Mientras no lo esté, la app se
// comporta como antes: un solo test y un solo aviso.
export const dosTestsAlDia = (datos) => Boolean(datos?.perfil?.avisarPvtTarde);

// ---------------------------------------------------------------------------
// Cribado del sueño: ¿hay algo que arreglar antes de tocar las horas?
// ---------------------------------------------------------------------------
//
// Sale de la investigación del 27-10-2026 (informe 07 de «Investigación
// sueño»). Lo que este cribado NO es: un diagnóstico. La guía de la American
// Academy of Sleep Medicine es explícita y con recomendación fuerte en que los
// cuestionarios no deben usarse para diagnosticar apnea sin una prueba del
// sueño (Kapur 2017, J Clin Sleep Med, PMID 28162150). Esto solo decide si
// merece la pena pedir cita.
//
// Lo segundo que conviene tener claro antes de contestarlo: corregir lo que
// salga aquí no va a quitarte horas de sueño. El único estudio que ha medido
// la duración habitual antes y después de tratar un trastorno del sueño (57
// pacientes con apnea, actigrafía 7 días, 3 meses de CPAP) no encontró cambio
// de grupo: 354,0 min antes y 353,0 min después, p = 0,87, y eso con la
// eficiencia y la fragmentación ya mejoradas (Tachikawa 2017, Ann Am Thorac
// Soc, PMID 28326793). Lo que se gana es el día siguiente.
//
// Los ocho primeros son el STOP-BANG (Chung 2008, Anesthesiology, PMID
// 18431116): ronquido, cansancio, apneas observadas y tensión, más índice de
// masa corporal, edad, cuello y sexo. Aviso importante para quien lo conteste
// siendo joven, delgado y hombre: por ser hombre ya se suma un punto y cuatro
// de los ocho son inalcanzables, así que el cuestionario funciona peor justo
// en ese perfil. Su especificidad agrupada es de 0,40 (Li 2024, Sleep Breath,
// PMID 39601864): un resultado positivo es un «no descartado», no un
// «probable».
//
// Los de las piernas son los cuatro criterios esenciales del síndrome de
// piernas inquietas, más una pregunta sobre patadas observadas, que es el
// único indicio casero de los movimientos periódicos de las piernas: el
// hallazgo que mejor encaja con «duermo mucho y no descanso» (índice > 15/h:
// 7,1 h de sueño frente a 6,9 h, sueño profundo del 17,6 % frente al 20,6 %,
// microdespertares 26,5/h frente a 19,2/h, y sin somnolencia que lo delate;
// Haba-Rubio 2018, Sleep Med, PMID 29425577).

export const CRIBADO_SUENO = [
  { clave: 'apnea', titulo: 'Respiración por la noche', nota: 'Las ocho primeras son el cuestionario STOP-BANG.', preguntas: [
    { clave: 'ronca', texto: '¿Roncas fuerte?', ayuda: 'Fuerte quiere decir que se oye a través de una puerta cerrada, o que alguien te lo ha dicho.' },
    { clave: 'cansancio', texto: '¿Estás cansado o con sueño durante el día casi todos los días?' },
    { clave: 'apneas', texto: '¿Alguien te ha visto dejar de respirar mientras duermes?', ayuda: 'Es la pregunta de más peso de todas. Si duermes solo y no puedes saberlo, contesta que no.' },
    { clave: 'tension', texto: '¿Tienes la tensión alta o tomas algo para ella?' },
    { clave: 'imc', texto: '¿Tu índice de masa corporal pasa de 35?', ayuda: 'Es tu peso en kilos dividido entre tu altura en metros al cuadrado. Con 1,80 m de altura, 35 son unos 113 kg.' },
    { clave: 'edad', texto: '¿Tienes más de 50 años?' },
    { clave: 'cuello', texto: '¿Tu cuello mide más de 40 cm de contorno?', ayuda: 'Con una cinta métrica, a la altura de la nuez.' },
    { clave: 'varon', texto: '¿Eres hombre?' },
    { clave: 'atragantado', texto: '¿Te despiertas de noche atragantado o con sensación de ahogo?', ayuda: 'Esta y las dos siguientes no puntúan en el STOP-BANG, pero son las que más dicen en alguien joven y delgado.' },
    { clave: 'bocaSeca', texto: '¿Te despiertas con la boca muy seca?' },
    { clave: 'cabeza', texto: '¿Te despiertas con dolor de cabeza?' },
  ] },
  { clave: 'piernas', titulo: 'Las piernas', preguntas: [
    { clave: 'urgencia', texto: '¿Sientes una necesidad imperiosa de mover las piernas, normalmente con una sensación desagradable?' },
    { clave: 'reposo', texto: '¿Esa necesidad aparece o empeora cuando estás quieto o en reposo?' },
    { clave: 'alivio', texto: '¿Se alivia, al menos en parte, si te mueves o andas?' },
    { clave: 'noche', texto: '¿Es peor por la tarde o por la noche que por la mañana?' },
    { clave: 'patadas', texto: '¿Te han dicho que das patadas mientras duermes, o amaneces con las sábanas revueltas por los pies?', ayuda: 'Es el único indicio casero de los movimientos periódicos de las piernas, que no se detectan con un reloj.' },
  ] },
  { clave: 'nariz', titulo: 'La nariz', preguntas: [
    { clave: 'tapada', texto: '¿Se te tapa la nariz por la noche?' },
    { clave: 'boca', texto: '¿Duermes o te despiertas respirando por la boca?' },
  ] },
  { clave: 'sustancias', titulo: 'Lo que tomas', preguntas: [
    { clave: 'alcohol', texto: '¿Bebes alcohol tres noches o más por semana?' },
    { clave: 'cannabis', texto: '¿Fumas cannabis casi a diario?' },
    { clave: 'antihistaminicos', texto: '¿Tomas antihistamínicos para dormir?' },
    { clave: 'antidepresivos', texto: '¿Tomas antidepresivos?', ayuda: 'No para que los dejes, que eso no se hace por una app. Es que son un predictor independiente de los movimientos periódicos de las piernas.' },
  ] },
];

export const PREGUNTAS_CRIBADO = CRIBADO_SUENO.flatMap((g) => g.preguntas.map((p) => `${g.clave}.${p.clave}`));
const ITEMS_STOP_BANG = ['ronca', 'cansancio', 'apneas', 'tension', 'imc', 'edad', 'cuello', 'varon'];

export const cribadoCompleto = (datos) => {
  const r = datos?.cribadoSueno?.respuestas;
  return !!r && PREGUNTAS_CRIBADO.every((k) => typeof r[k] === 'boolean');
};

// El veredicto. Devuelve avisos ordenados por urgencia, cada uno con su porqué
// y su fuente, y nunca un diagnóstico. `prioridad`: 'alta' es «pide cita»,
// 'media' es «coméntalo», 'baja' es «esto lo arreglas tú».
export function veredictoCribado(respuestas) {
  const si = (k) => respuestas?.[k] === true;
  const avisos = [];
  const stopBang = ITEMS_STOP_BANG.filter((k) => si(`apnea.${k}`)).length;

  if (si('apnea.apneas') || si('apnea.atragantado')) {
    avisos.push({ prioridad: 'alta', titulo: 'Pide cita y una prueba del sueño',
      texto: 'Que alguien te vea dejar de respirar, o despertarte atragantado, no es un síntoma menor: solo el 6 % de la población lo refiere, y es el ítem de más peso del cuestionario. Lo que toca es una poligrafía respiratoria en casa o una polisomnografía, no más autoevaluación.',
      fuente: 'Durán 2001, Am J Respir Crit Care Med, PMID 11254524; Chung 2008, PMID 18431116' });
  } else if (stopBang >= 3 && (si('apnea.ronca') || si('apnea.bocaSeca') || si('apnea.cabeza'))) {
    avisos.push({ prioridad: 'alta', titulo: `Coméntalo con tu médico: ${stopBang} puntos de 8 y síntomas de noche`,
      texto: 'Con 3 puntos ya se considera riesgo, aunque en alguien joven y delgado el cuestionario infla el resultado (por ser hombre ya suma 1 y cuatro ítems son inalcanzables). Y la apnea no se descarta por estar delgado: el 23,5 % de quienes la tienen está en peso normal y el 44,4 % solo en sobrepeso.',
      fuente: 'Esmaeili 2025, EClinicalMedicine, PMID 40330547; Nagappa 2015, PLoS One, PMID 26658438' });
  } else if (stopBang >= 3) {
    avisos.push({ prioridad: 'media', titulo: `${stopBang} puntos de 8 en el cuestionario de apnea`,
      texto: 'Puntúa, pero sin ningún síntoma nocturno que lo acompañe. Vale la pena mencionarlo si vas al médico por otra cosa, no pedir cita solo por esto.',
      fuente: 'Li 2024, Sleep Breath, PMID 39601864 (especificidad de 0,40: positivo significa «no descartado»)' });
  }

  const criterios = ['urgencia', 'reposo', 'alivio', 'noche'].filter((k) => si(`piernas.${k}`)).length;
  if (criterios === 4) {
    avisos.push({ prioridad: 'alta', titulo: 'Cumples los cuatro criterios del síndrome de piernas inquietas',
      texto: 'Es un diagnóstico clínico, sin prueba: se cumple o no en la entrevista. Pide cita y que te miren de paso la ferritina y el índice de saturación de transferrina. En el estudio poblacional más grande, solo el 6,2 % de quienes lo sufrían tenía el diagnóstico puesto.',
      fuente: 'Allen 2005 (estudio REST), Sleep Med, PMID 15956009; criterios esenciales del IRLSSG' });
  } else if (criterios === 3) {
    avisos.push({ prioridad: 'media', titulo: 'Cumples tres de los cuatro criterios de piernas inquietas',
      texto: 'Con tres no se cumple la definición, pero conviene volver a mirarlo dentro de unas semanas por si aparece el cuarto.',
      fuente: 'Criterios esenciales del IRLSSG' });
  }

  if (si('piernas.patadas')) {
    avisos.push({ prioridad: 'alta', titulo: 'Las patadas de noche piden una polisomnografía completa',
      texto: 'Los movimientos periódicos de las piernas son el único hallazgo asociado a dormir más horas y descansar menos: más sueño superficial, menos sueño profundo, muchos más microdespertares y, lo peor para detectarlo, sin somnolencia de día que lo delate. No se miden con un reloj ni con una poligrafía respiratoria: hacen falta electrodos en las piernas.',
      fuente: 'Haba-Rubio 2018, Sleep Med, PMID 29425577' });
  }

  if (si('sustancias.antidepresivos') && (criterios >= 3 || si('piernas.patadas'))) {
    avisos.push({ prioridad: 'media', titulo: 'Dilo en la consulta: tomas antidepresivos',
      texto: 'Son un predictor independiente de los movimientos periódicos de las piernas. No se tocan por tu cuenta ni por lo que diga una app, pero quien te trate tiene que saberlo.',
      fuente: 'Haba-Rubio 2016, Ann Neurol, PMID 26703954' });
  }

  if (si('nariz.tapada') || si('nariz.boca')) {
    avisos.push({ prioridad: 'media', titulo: 'La nariz, con expectativas realistas',
      texto: 'Tratar una rinitis mejora la calidad del sueño de forma pequeña (d = 0,29) y no mejora nada la somnolencia de día (p = 0,907). Merece la pena por lo primero; no esperes lo segundo.',
      fuente: 'Tabata 2025, Int Arch Allergy Immunol, PMID 39471798' });
  }

  if (si('sustancias.alcohol')) {
    avisos.push({ prioridad: 'baja', titulo: 'El alcohol, las noches que lo haya',
      texto: 'Rompe el sueño REM ya a dos copas y sube el pulso nocturno. Esto no necesita médico: necesita noches sin él, y verlo en tu propio diario.',
      fuente: 'Gardiner 2025, Sleep Med Rev, PMID 39631226' });
  }
  if (si('sustancias.cannabis')) {
    avisos.push({ prioridad: 'baja', titulo: 'El cannabis a diario',
      texto: 'El consumo diario se asocia a un 21 % más de tiempo despierto dentro de la noche.',
      fuente: 'Velzeboer 2026, Sleep, PMID 41408729' });
  }
  if (si('sustancias.antihistaminicos')) {
    avisos.push({ prioridad: 'baja', titulo: 'Los antihistamínicos para dormir no son una solución',
      texto: 'Dejan resaca al día siguiente y a los tres días ya no sedan: el cuerpo se acostumbra. Lo que queda es el efecto de la mañana.',
      fuente: 'Katayose 2012, PMID 22806823; Richardson 2002, PMID 12352276' });
  }

  return { stopBang, criteriosPiernas: criterios, avisos };
}
