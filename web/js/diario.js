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

// Cambia `datos` (dentro de estado.cambiar). Crea la entrada si no existe y
// la quita si se queda sin nada.
export function apuntarEnDiario(datos, fecha, campo, valor) {
  datos.diario ??= [];
  let e = datos.diario.find((x) => x.fecha === fecha);
  if (!e) { e = { id: fecha, fecha }; datos.diario.push(e); datos.diario.sort((a, b) => a.fecha.localeCompare(b.fecha)); }
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
