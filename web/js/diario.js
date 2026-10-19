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

export const NECESIDAD_SUENO_POR_DEFECTO = 8.5;
export const ALCOHOL = { no: 'No', poco: '1-2 bebidas', mucho: '3 o más' };
export const SENSACIONES = ['', 'Fatal', 'Mal', 'Regular', 'Bien', 'Genial'];

// Los básicos con los que se mira si el sueño te está costando: el volumen
// tolerado cae antes que el 1RM (Cook 2012; Knowles 2022).
const BASICOS = ['press de banca', 'sentadilla', 'peso muerto', 'peso muerto sumo', 'remo con barra', 'press militar'];
export const esBasico = (ej) => BASICOS.includes(normalizar(ej?.nombre ?? ''));

const minutos = (hhmm) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

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
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
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
export function lunesDe(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}
const masDias = (fechaISO, n) => { const d = new Date(`${fechaISO}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Repeticiones de las series de trabajo de los básicos entre dos fechas.
function repsBasicos(datos, desde, hasta) {
  const basicos = new Set(datos.ejercicios.filter(esBasico).map((e) => e.id));
  let total = 0;
  for (const s of datos.sesiones) {
    if (s.borrada || s.fecha < desde || s.fecha > hasta) continue;
    for (const entrada of s.ejercicios) {
      if (!basicos.has(entrada.ejercicioId)) continue;
      for (const serie of entrada.series) if (serie.hecha && serie.tipo !== 'calentamiento') total += esfuerzoTotal(serie) ?? 0;
    }
  }
  return total;
}

// Resumen de la semana que empieza el lunes `lunes`: medias, cuánto más
// duermes el fin de semana (más de 1 h indica deuda de sueño: Roenneberg
// 2012) y las repeticiones en los básicos frente a la semana anterior.
export function resumenSemana(datos, lunes) {
  const domingo = masDias(lunes, 6);
  const dias = (datos.diario ?? []).filter((e) => e.fecha >= lunes && e.fecha <= domingo);
  const suenos = dias.map((e) => ({ e, s: calcularSueno(e), finde: [0, 6].includes(new Date(`${e.fecha}T12:00:00`).getDay()) }))
    .filter((x) => x.s);
  const finde = media(suenos.filter((x) => x.finde).map((x) => x.s.real));
  const laborables = media(suenos.filter((x) => !x.finde).map((x) => x.s.real));
  const reps = repsBasicos(datos, lunes, domingo);
  const repsAntes = repsBasicos(datos, masDias(lunes, -7), masDias(lunes, -1));
  return {
    lunes, domingo, dias: dias.length,
    sueno: media(suenos.map((x) => x.s.real)),
    eficiencia: media(suenos.map((x) => x.s.eficiencia)),
    pulso: media(dias.map((e) => e.pulsoNocturno).filter((v) => v > 0)),
    sensacion: media(dias.map((e) => e.sensacion).filter((v) => v > 0)),
    findeExtra: finde != null && laborables != null ? finde - laborables : null,
    reps, repsAntes, cambioReps: repsAntes ? (reps - repsAntes) / repsAntes : null,
  };
}

export const semanaAnterior = (lunes) => masDias(lunes, -7);
