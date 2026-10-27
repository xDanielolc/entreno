// Cómo se mide cada estiramiento (Dan, 27-10-2026: «no sé medir la mayoría»).
//
// Cada uno dice qué medir y cómo, en una línea. Hay dos maneras:
//   'cm'   con una cinta métrica o un metro de costura;
//   'mano' con la escala de la mano: qué forma de la mano cabe en el hueco
//          (de 1 · surf, el hueco más grande, a 8 · sin mano, sin hueco).
// Los que no tienen una medida sencilla y fiable no piden nada: basta con
// hacerlos. Lo que no está en la lista tampoco pide medida, salvo que en el
// ejercicio elijas una (`ej.estiramiento.medida`) o uses la mano como ayuda.

import { normalizar } from './catalogo.js';

const cm = (como) => ({ mide: 'cm', como });
const mano = (como) => ({ mide: 'mano', como });

const TABLA = {
  'Estiramiento de isquios (Janu Sirsasana)': cm('lo que te falta de la punta de los dedos a la planta del pie, con la espalda recta (0 si llegas; con un menos delante si la pasas)'),
  'Cabeza a la rodilla (Janu Sirsasana)': cm('lo que te falta de la punta de los dedos a la planta del pie (0 si llegas; con un menos si la pasas)'),
  'Estiramiento del oeste (Paschimottanasana)': cm('lo que te falta de la punta de los dedos a la planta de los pies (0 si llegas; con un menos si la pasas)'),
  'Flexión de tronco de pie (Uttanasana)': cm('lo que te falta de la punta de los dedos al suelo, rodillas estiradas (0 si tocas; con un menos si apoyas la palma)'),
  'Flexión de tronco en postura amplia (Prasarita Padottanasana)': cm('de la coronilla al suelo'),
  'Estiramiento de cuádriceps': mano('el hueco entre el talón y el glúteo'),
  'Estiramiento de aductores en mariposa (Baddha Konasana)': mano('el hueco entre el suelo y la rodilla más alta'),
  'Ángulo ligado (Baddha Konasana)': mano('el hueco entre el suelo y la rodilla más alta'),
  'Postura del sastre, apertura lateral (Upavistha Konasana)': cm('la distancia entre los talones, con las rodillas mirando al techo (más es mejor)'),
  'Sentada en ángulo amplio (Upavistha Konasana)': cm('la distancia entre los talones, con las rodillas mirando al techo (más es mejor)'),
  'Zancada hacia el split frontal (Hanumanasana)': cm('de la ingle al suelo en la zancada más baja; si no llegas a medir, de la rodilla de delante al suelo'),
  'Mono (Hanumanasana)': cm('de la ingle al suelo'),
  'Tobillo con rodilla a la pared': cm('del dedo gordo a la pared, en la postura más lejana en la que la rodilla aún toca la pared sin levantar el talón'),
  'Estiramiento de sóleo en pared': cm('del dedo gordo a la pared, en la postura más lejana en la que la rodilla aún toca la pared sin levantar el talón'),
  'Rotaciones de hombro con palo': cm('la separación entre las manos en el palo con la que puedes pasarlo por detrás sin doblar los codos (menos es mejor)'),
  'Rotación interna de hombro con toalla': cm('lo que separa una mano de la otra por la espalda, una desde arriba y otra desde abajo (0 si se tocan)'),
  'Estiramiento de tríceps': cm('lo que separa una mano de la otra por la espalda, una desde arriba y otra desde abajo (0 si se tocan)'),
  'Cara de vaca (Gomukhasana)': cm('lo que separa una mano de la otra por la espalda (0 si se tocan)'),
  'Sentadilla profunda mantenida (Malasana)': mano('el hueco entre el talón y el suelo (sin mano si los dos talones apoyan)'),
  'Estiramiento del sofá (couch stretch)': mano('el hueco entre el talón y el glúteo con el tronco erguido'),
  'Rey de los bailarines (Natarajasana)': mano('el hueco entre el talón y el glúteo'),
};

const porClave = new Map(Object.entries(TABLA).map(([k, v]) => [normalizar(k), v]));

export const MEDIDAS = {
  ninguna: 'Sin medida',
  mano: 'Escala de la mano',
  cm: 'Centímetros',
};

// { mide: 'cm' | 'mano' | null, como: texto | null } de un ejercicio.
export function medidaDe(ej) {
  const elegida = ej.estiramiento?.medida;
  const deTabla = porClave.get(normalizar(ej.nombre ?? '')) ?? null;
  if (elegida === 'ninguna') return { mide: null, como: null };
  if (elegida === 'cm' || elegida === 'mano') {
    return { mide: elegida, como: deTabla?.mide === elegida ? deTabla.como : (elegida === 'cm' ? 'los centímetros a los que llegas' : 'el hueco que te queda, con la mano') };
  }
  if (deTabla) return deTabla;
  const ayudas = ej.estiramiento?.asistencias ?? (ej.estiramiento?.asistencia ? [ej.estiramiento.asistencia] : []);
  if (ayudas.includes('mano')) return { mide: 'mano', como: 'el hueco que te queda, con la mano' };
  return { mide: null, como: null };
}

// ¿Ya está apuntada la medida en esta serie?
export function medidaApuntada(ej, serie) {
  const { mide } = medidaDe(ej);
  const e = serie.estiramiento ?? {};
  if (mide === 'cm') return e.cm != null;
  if (mide === 'mano') return Boolean(e.nivel);
  return true;
}
