// Crea una serie a partir de su plantilla en el ejercicio, ya rellena con lo
// que toca hoy: la carga del día del ciclo, el objetivo a superar y, en un
// drop set, las bajadas propuestas.

import { lecturaDesdeCarga, sugerenciaSerie, tramosPropuestos, usaTramos } from './calculos.js';
import { recamaraDe } from './esquema.js';
import { nuevoId } from './ui.js';

export function crearSerieDesdePlan(datos, ejercicio, plan, { excluirSesion } = {}) {
  const s = sugerenciaSerie(datos, ejercicio, plan, { excluirSesion });
  const carga = s.carga ?? null;
  const serie = {
    id: nuevoId('s'),
    planId: plan.id,
    tipo: plan.tipo,
    tecnicas: [...(plan.tecnicas || [])],
    detalle: {},
    recamara: recamaraDe(plan.tecnicas, datos.perfil.recamaraPorDefecto ?? 1),
    carga,
    lectura: ejercicio.carga.tipo === 'asistida' ? lecturaDesdeCarga(carga, datos.perfil.pesoCorporalKg) : null,
    esfuerzo: null,
    esfuerzoExtra: null,
    objetivo: s.objetivoSuperar ?? s.esfuerzoObjetivo ?? null,
    hecha: false,
    tramos: null,
    cicloN: s.cicloN ?? null,
    diaCiclo: s.dia ?? null,
  };
  if (usaTramos(plan.tecnicas)) serie.tramos = tramosPropuestos(serie, plan, s.ultima?.serie ?? null);
  return serie;
}

export function serieSuelta({ tipo = 'libre', carga = null, tecnicas = [], recamara = null } = {}) {
  return {
    id: nuevoId('s'), planId: null, tipo, tecnicas: [...tecnicas], detalle: {}, recamara,
    carga, lectura: null, esfuerzo: null, esfuerzoExtra: null, objetivo: null,
    hecha: false, tramos: null, cicloN: null, diaCiclo: null,
  };
}
