// Sitios donde entrenas: gimnasios, casa, la calle…
//
// Cada entrenamiento guarda dónde se hizo. Un ejercicio puede ser igual en
// todos los sitios (sedeId = null: flexiones, sentadilla con barra) o de uno
// solo (la prensa de un gimnasio no pesa como la de otro). Si un ejercicio
// que hacías en todos lados resulta que cambia según el sitio, «separar por
// sitio» lo parte en uno por sitio y reparte su historial según dónde se hizo
// cada entrenamiento.

import { nuevoId } from './ui.js';

export const TIPOS_SEDE = {
  gimnasio: { etiqueta: 'Gimnasio', icono: '🏋️' },
  casa: { etiqueta: 'Casa', icono: '🏠' },
  calle: { etiqueta: 'Calle o parque', icono: '🌳' },
  otro: { etiqueta: 'Otro', icono: '📍' },
};

export function sedesActivas(datos) {
  return (datos.sedes || []).filter((s) => !s.archivado);
}

export function nombreSede(datos, id) {
  const s = (datos.sedes || []).find((x) => x.id === id);
  return s ? `${TIPOS_SEDE[s.tipo]?.icono ?? '📍'} ${s.nombre}` : 'Sin indicar';
}

export function nuevaSede(nombre, tipo = 'gimnasio') {
  return { id: nuevoId('sede'), nombre, tipo, archivado: false };
}

// Dónde empieza un entrenamiento: el sitio de la rutina, el de por defecto o
// el del último entrenamiento.
export function sedeInicial(datos, rutina) {
  if (rutina?.sedeId) return rutina.sedeId;
  if (datos.perfil.sedePorDefecto) return datos.perfil.sedePorDefecto;
  const ultima = [...datos.sesiones].filter((s) => !s.borrada && s.sedeId)
    .sort((a, b) => (a.fecha + (a.inicio || '')).localeCompare(b.fecha + (b.inicio || ''))).at(-1);
  return ultima?.sedeId ?? null;
}

// ¿Se puede hacer este ejercicio en este sitio?
export function ejercicioEnSede(ej, sedeId) {
  return !ej.sedeId || !sedeId || ej.sedeId === sedeId;
}

// Parte un ejercicio «igual en todos los sitios» en uno por sitio. El
// original se queda con el primer sitio (y con lo que no tenga sitio); las
// copias, con el resto. Cambia `datos` directamente (dentro de estado.cambiar).
export function separarPorSede(datos, ejercicioId, sedeIds = null) {
  const original = datos.ejercicios.find((e) => e.id === ejercicioId);
  const sedes = sedesActivas(datos).filter((s) => !sedeIds || sedeIds.includes(s.id));
  if (!original || original.sedeId || sedes.length < 2) return 0;
  const copias = new Map([[sedes[0].id, original]]);
  original.sedeId = sedes[0].id;
  for (const sede of sedes.slice(1)) {
    const copia = structuredClone(original);
    copia.id = nuevoId('ej');
    copia.sedeId = sede.id;
    datos.ejercicios.push(copia);
    copias.set(sede.id, copia);
  }
  for (const sesion of datos.sesiones) {
    const destino = copias.get(sesion.sedeId);
    if (!destino) continue;
    for (const entrada of sesion.ejercicios) if (entrada.ejercicioId === ejercicioId) entrada.ejercicioId = destino.id;
  }
  // En las rutinas de un sitio concreto, el ejercicio pasa a ser el de ese sitio.
  for (const rutina of datos.rutinas) {
    const destino = copias.get(rutina.sedeId);
    if (!destino) continue;
    for (const dia of rutina.dias) for (const item of dia.ejercicios) if (item.ejercicioId === ejercicioId) item.ejercicioId = destino.id;
  }
  return copias.size;
}
