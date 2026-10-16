// Tu peso corporal, apuntado con fecha (como en las apps de dieta, sin
// comidas). El último manda en `perfil.pesoCorporalKg`, que es el que usan
// flexiones, dominadas y máquinas asistidas.

import { hoyISO } from './ui.js';

// Cambia `datos` (dentro de estado.cambiar). Un solo valor por día: el último.
export function apuntarPeso(datos, kg, fecha = hoyISO()) {
  if (!(kg > 0)) return;
  datos.perfil.pesos ??= [];
  datos.perfil.pesos = datos.perfil.pesos.filter((p) => p.fecha !== fecha);
  datos.perfil.pesos.push({ fecha, kg });
  datos.perfil.pesos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  datos.perfil.pesoCorporalKg = datos.perfil.pesos.at(-1).kg;
}

export function quitarPeso(datos, fecha) {
  datos.perfil.pesos = (datos.perfil.pesos ?? []).filter((p) => p.fecha !== fecha);
  if (datos.perfil.pesos.length) datos.perfil.pesoCorporalKg = datos.perfil.pesos.at(-1).kg;
}

// Días desde la última vez que te pesaste (null si nunca).
export function diasDesdePeso(datos, ahora = new Date()) {
  const ultima = datos.perfil.pesos?.at(-1)?.fecha;
  if (!ultima) return null;
  return Math.floor((ahora - new Date(`${ultima}T12:00:00`)) / 86_400_000);
}
