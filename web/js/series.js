// Crea una serie a partir de su plantilla en el ejercicio, ya rellena con lo
// que toca hoy: la carga del día del ciclo, el objetivo a superar y, en un
// drop set, las bajadas propuestas.

import {
  aPasoDeDisco, epley, esfuerzoTotal, lecturaDesdeCarga, redondear, rmDeReferencia, sugerenciaSerie,
  tramosPropuestos, usaTramos,
} from './calculos.js';
import { recamaraDe, tramosDe } from './esquema.js';
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
  if (usaTramos(plan.tecnicas)) {
    // Un drop set suele arrancar a un porcentaje del 1RM (80 % por defecto).
    const inicio = plan.tramoInicio ?? datos.perfil.dropSet?.inicioPorcentaje ?? null;
    if (serie.carga == null && inicio) {
      const rm = rmDeReferencia(datos, ejercicio, { cicloN: serie.cicloN, excluirSesion });
      if (rm) serie.carga = aPasoDeDisco((rm.valor * inicio) / 100);
    }
    serie.tramos = tramosPropuestos(serie, { ...plan, dropSet: datos.perfil.dropSet }, s.ultima?.serie ?? null);
    // Mientras no toques sus pesos, la app puede recalcularlos con lo que
    // hagas hoy en las series de arriba.
    serie.cargaAutomatica = true;
  }
  return serie;
}

export function serieSuelta({ tipo = 'libre', carga = null, tecnicas = [], recamara = null } = {}) {
  return {
    id: nuevoId('s'), planId: null, tipo, tecnicas: [...tecnicas], detalle: {}, recamara,
    carga, lectura: null, esfuerzo: null, esfuerzoExtra: null, objetivo: null,
    hecha: false, tramos: null, cicloN: null, diaCiclo: null,
  };
}

// El ejercicio tal y como entra en un entrenamiento: con todas las series de
// su plantilla ya preparadas.
export function entradaDeEjercicio(datos, ej, { excluirSesion } = {}) {
  const planes = ej.series?.length ? ej.series : [];
  const entrada = {
    ejercicioId: ej.id, cicloN: null, diaCiclo: null, notas: '',
    series: planes.map((plan) => crearSerieDesdePlan(datos, ej, plan, { excluirSesion })),
  };
  const bilbo = entrada.series.find((x) => x.cicloN != null);
  if (bilbo) { entrada.cicloN = bilbo.cicloN; entrada.diaCiclo = bilbo.diaCiclo; }
  if (!entrada.series.length) entrada.series.push(serieSuelta());
  return entrada;
}

// Cuánto se baja en cada tramo nuevo: en un drop set, los kilos fijados en el
// ejercicio o en Ajustes; en rest-pause y miorrepeticiones, nada.
export function saltoDeTramo(datos, ejercicio, serie) {
  const config = tramosDe(serie.tecnicas);
  if (!config?.salto) return 0;
  const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
  return plan?.tramoSalto ?? datos.perfil.dropSet?.salto ?? config.salto;
}

// Drop sets de un ejercicio que aún no has empezado: se rellenan al
// porcentaje del 1RM que acabas de demostrar en las series de arriba (la
// Bilbo, normalmente). Devuelve qué series ha tocado, para avisar.
export function rellenarDropSets(datos, ejercicio, entrada) {
  if (datos.perfil.dropSet?.autoRellenar === false) return [];
  const tocadas = [];
  entrada.series.forEach((serie, j) => {
    if (!serie.tramos?.length || !serie.cargaAutomatica) return;
    if (serie.tramos.some((t) => t.esfuerzo != null)) return;
    const arriba = entrada.series.slice(0, j).filter((x) => !x.tramos?.length && x.tipo !== 'calentamiento');
    const rms = arriba.map((x) => epley(x.carga, esfuerzoTotal(x))).filter(Boolean);
    if (!rms.length) return;
    const rm = Math.max(...rms);
    const plan = (ejercicio.series || []).find((p) => p.id === serie.planId);
    const porcentaje = plan?.tramoInicio ?? datos.perfil.dropSet?.inicioPorcentaje ?? 80;
    const salto = saltoDeTramo(datos, ejercicio, serie);
    const inicio = aPasoDeDisco((rm * porcentaje) / 100);
    serie.carga = inicio;
    serie.tramos = serie.tramos.map((t, k) => ({ ...t, carga: Math.max(0, redondear(inicio - salto * k, 2)) }));
    serie.rellenoDesde = { rm: redondear(rm, 1), porcentaje };
    tocadas.push(j);
  });
  return tocadas;
}
