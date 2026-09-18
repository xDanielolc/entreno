// Comparaciones serie a serie y resumen al terminar el entrenamiento.
//
// Al terminar sale una ventana con:
//   · los récords del día y cómo te ha ido frente a la última vez y frente al
//     mismo día del ciclo anterior;
//   · el volumen de la semana de los músculos que has entrenado hoy, con
//     ánimo si vas corto y con alguna pulla si te pasas;
//   · si has cambiado algo respecto a la rutina, la pregunta de si es solo
//     para hoy o para siempre.

import { esfuerzoTotal, formatearNumero, records, redondear, seriesDeEjercicio, trabajoSerie } from '../calculos.js';
import { serieNuevaPlantilla, TIPOS_SERIE } from '../esquema.js';
import * as estado from '../estado.js';
import { rmDeSerie } from '../formula1rm.js';
import { recomendacionesDeSesion } from '../recomendaciones.js';
import { aviso, h, modal } from '../ui.js';
import { listaRecomendaciones } from './cuerpo.js';


// ---------------------------------------------------------------------------
// Comparación de una serie con la anterior y con el ciclo anterior
// ---------------------------------------------------------------------------

// Lo que se compara: el 1RM estimado si hay carga, el trabajo en un drop set
// y lo que midas (tiempo, repeticiones) si no hay carga.
function medida(datos, ej, serie) {
  if (ej.carga?.tipo === 'ninguna') {
    const v = esfuerzoTotal(serie);
    return v ? { valor: v, nombre: 'total' } : null;
  }
  if (serie.tramos?.length) {
    const v = trabajoSerie(serie);
    return v ? { valor: v, nombre: 'trabajo' } : null;
  }
  const v = rmDeSerie(datos, ej, serie, esfuerzoTotal(serie));
  return v ? { valor: v, nombre: '1RM', unidad: 'kg' } : null;
}

function diferencia(ahora, antes) {
  const pct = Math.round(((ahora - antes) / antes) * 100);
  if (pct > 0) return `▲ ${pct} %`;
  if (pct < 0) return `▼ ${Math.abs(pct)} %`;
  return '= igual';
}

export function comparacionSerie(datos, ej, serie, { excluirSesion } = {}) {
  if (!serie.hecha) return '';
  const hoy = medida(datos, ej, serie);
  if (!hoy) return '';
  const historial = seriesDeEjercicio(datos, ej.id, { excluirSesion, planId: serie.planId || undefined })
    .filter((x) => Boolean(x.serie.tramos?.length) === Boolean(serie.tramos?.length))
    // Una serie suelta (sin plantilla) solo se compara con otras sueltas del mismo tipo.
    .filter((x) => serie.planId || (!x.serie.planId && x.serie.tipo === serie.tipo));
  const anterior = historial.at(-1);
  const delCicloAnterior = serie.cicloN > 1 && serie.diaCiclo
    ? historial.filter((x) => x.entrada.cicloN === serie.cicloN - 1 && x.entrada.diaCiclo === serie.diaCiclo).at(-1)
    : null;

  const partes = [`${hoy.nombre} ${formatearNumero(redondear(hoy.valor, 1))}${hoy.unidad ? ` ${hoy.unidad}` : ''}`];
  const mAnterior = anterior && medida(datos, ej, anterior.serie);
  if (mAnterior) partes.push(`${diferencia(hoy.valor, mAnterior.valor)} frente a la última vez`);
  const mCiclo = delCicloAnterior && medida(datos, ej, delCicloAnterior.serie);
  if (mCiclo) partes.push(`${diferencia(hoy.valor, mCiclo.valor)} frente al día ${serie.diaCiclo} del ciclo ${serie.cicloN - 1}`);
  if (!mAnterior && !mCiclo) partes.push('primera vez: aún no hay con qué comparar');
  return partes.join(' · ');
}

// ---------------------------------------------------------------------------
// Resumen al terminar
// ---------------------------------------------------------------------------

export function mostrarResumen(datos, sesionId) {
  const sesion = datos.sesiones.find((s) => s.id === sesionId);
  if (!sesion) return;
  const cambios = cambiosRespectoARutina(datos, sesion);

  const cerrar = modal('Entrenamiento terminado', h('div', { class: 'resumen-sesion' },
    seccionRecords(datos, sesion),
    seccionMejoras(datos, sesion),
    seccionVolumen(datos, sesion),
    cambios.length > 0 && seccionCambios(cambios),
    h('div', { class: 'fila-botones' },
      cambios.length > 0
        ? [h('button', { class: 'boton secundario', onclick: () => cerrar() }, 'Solo para hoy'),
          h('button', { class: 'boton', onclick: () => { aplicarCambios(cambios); cerrar(); } }, 'Guardar lo marcado')]
        : h('button', { class: 'boton', onclick: () => cerrar() }, 'Hecho'))));
}

function seccionRecords(datos, sesion) {
  const sin = { ...datos, sesiones: datos.sesiones.filter((s) => s.id !== sesion.id) };
  const lineas = [];
  for (const entrada of sesion.ejercicios) {
    const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
    if (!ej || lineas.some((l) => l.ej === ej)) continue;
    const antes = records(sin, ej.id);
    const ahora = records(datos, ej.id);
    if (ahora.mejor1RM && antes.mejor1RM && ahora.mejor1RM.valor > antes.mejor1RM.valor) {
      lineas.push({ ej, texto: `${ej.nombre}: 1RM estimado de ${formatearNumero(ahora.mejor1RM.valor)} kg `
        + `(antes ${formatearNumero(antes.mejor1RM.valor)} kg)` });
    }
    if (ahora.mejorTrabajo && antes.mejorTrabajo && ahora.mejorTrabajo.valor > antes.mejorTrabajo.valor) {
      lineas.push({ ej, texto: `${ej.nombre}: trabajo de ${formatearNumero(ahora.mejorTrabajo.valor)} kg×reps en una serie `
        + `(antes ${formatearNumero(antes.mejorTrabajo.valor)})` });
    }
  }
  if (!lineas.length) return null;
  return h('section', {},
    h('h3', {}, lineas.length > 1 ? `¡${lineas.length} récords!` : '¡Récord!'),
    h('ul', {}, lineas.map((l) => h('li', {}, l.texto))));
}

function seccionMejoras(datos, sesion) {
  const lineas = [];
  for (const entrada of sesion.ejercicios) {
    const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
    if (!ej) continue;
    for (const serie of entrada.series) {
      const texto = comparacionSerie(datos, ej, serie, { excluirSesion: sesion.id });
      if (texto && !texto.includes('primera vez')) {
        lineas.push(`${ej.nombre}${entrada.series.length > 1 ? ` (${TIPOS_SERIE[serie.tipo] ?? 'serie'})` : ''}: ${texto}`);
      }
    }
  }
  if (!lineas.length) return null;
  return h('section', {},
    h('h3', {}, 'Frente a otras veces'),
    h('ul', {}, lineas.map((l) => h('li', {}, l))));
}

// Qué conviene hacer tras esta sesión: volumen de la semana, distancia entre
// entrenamientos, esfuerzo y duración (ver recomendaciones.js).
function seccionVolumen(datos, sesion) {
  const lista = recomendacionesDeSesion(datos, sesion);
  if (!lista.length) return null;
  return h('section', {},
    h('h3', {}, 'Qué conviene hacer'),
    listaRecomendaciones(lista));
}

// ---------------------------------------------------------------------------
// Cambios respecto a la rutina: ¿solo hoy o para siempre?
// ---------------------------------------------------------------------------

function cambiosRespectoARutina(datos, sesion) {
  const cambios = [];
  const rutina = datos.rutinas.find((r) => r.id === sesion.rutinaId);
  const dia = rutina?.dias.find((x) => x.id === sesion.diaRutinaId);
  const nombreEj = (ejId) => datos.ejercicios.find((e) => e.id === ejId)?.nombre ?? 'Ejercicio';

  if (dia) {
    for (const entrada of sesion.ejercicios) {
      if (!dia.ejercicios.some((x) => x.ejercicioId === entrada.ejercicioId)) {
        cambios.push({ tipo: 'anadir-al-dia', texto: `Añadir ${nombreEj(entrada.ejercicioId)} a «${dia.nombre}»`,
          rutinaId: rutina.id, diaId: dia.id, ejercicioId: entrada.ejercicioId });
      }
    }
    for (const item of dia.ejercicios) {
      const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
      if (!ej || ej.archivado) continue;
      if (!sesion.ejercicios.some((x) => x.ejercicioId === item.ejercicioId)) {
        cambios.push({ tipo: 'quitar-del-dia', texto: `Quitar ${ej.nombre} de «${dia.nombre}»`,
          rutinaId: rutina.id, diaId: dia.id, ejercicioId: item.ejercicioId });
      }
    }
  }

  // Series de más (sin plantilla) o planes de la plantilla que no has hecho.
  for (const entrada of sesion.ejercicios) {
    const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
    if (!ej) continue;
    const vistos = new Set();
    const extra = entrada.series.filter((s) => {
      if (!s.planId || vistos.has(s.planId)) return true;
      vistos.add(s.planId);
      return false;
    }).filter((s) => s.hecha);
    if (extra.length) {
      cambios.push({ tipo: 'anadir-series', ejercicioId: ej.id, series: extra.map((s) => ({ tipo: s.tipo, tecnicas: [...(s.tecnicas || [])] })),
        texto: `Añadir ${extra.length} serie${extra.length > 1 ? 's' : ''} más a ${ej.nombre} para siempre` });
    }
    const item = dia?.ejercicios.find((x) => x.ejercicioId === ej.id);
    if (item) {
      const previstos = (ej.series || []).filter((p) => !item.series || item.series.includes(p.id));
      const quitados = previstos.filter((p) => !vistos.has(p.id));
      if (quitados.length && quitados.length < previstos.length) {
        cambios.push({ tipo: 'quitar-series', rutinaId: rutina.id, diaId: dia.id, ejercicioId: ej.id,
          quedan: previstos.filter((p) => vistos.has(p.id)).map((p) => p.id),
          texto: `En «${dia.nombre}», no hacer más ${quitados.map((p) => `la serie ${TIPOS_SERIE[p.tipo] ?? ''}`.trim()).join(' ni ')} de ${ej.nombre}` });
      }
    }
  }
  return cambios;
}

function seccionCambios(cambios) {
  return h('section', {},
    h('h3', {}, 'Has cambiado cosas respecto a la rutina'),
    h('p', { class: 'nota' }, 'Marca lo que quieras que se quede para siempre. Lo que no marques, solo ha sido por hoy.'),
    cambios.map((c) => h('label', { class: 'casilla' },
      h('input', { type: 'checkbox', onchange: (e) => { c.marcado = e.target.checked; } }),
      c.texto)));
}

function aplicarCambios(cambios) {
  const marcados = cambios.filter((c) => c.marcado);
  if (!marcados.length) return;
  estado.cambiar((datos) => {
    for (const c of marcados) {
      const dia = datos.rutinas.find((r) => r.id === c.rutinaId)?.dias.find((x) => x.id === c.diaId);
      const ej = datos.ejercicios.find((e) => e.id === c.ejercicioId);
      if (c.tipo === 'anadir-al-dia' && dia) dia.ejercicios.push({ ejercicioId: c.ejercicioId, opcional: false, series: null });
      if (c.tipo === 'quitar-del-dia' && dia) dia.ejercicios = dia.ejercicios.filter((x) => x.ejercicioId !== c.ejercicioId);
      if (c.tipo === 'anadir-series' && ej) {
        for (const s of c.series) {
          const plan = serieNuevaPlantilla(ej, { tipo: s.tipo === 'bilbo' ? 'libre' : s.tipo, tecnicas: s.tecnicas });
          ej.series.push(plan);
          // Si algún día de rutina elige series concretas, la nueva también entra.
          for (const r of datos.rutinas) {
            for (const d of r.dias) {
              for (const item of d.ejercicios) if (item.ejercicioId === ej.id && item.series) item.series.push(plan.id);
            }
          }
        }
      }
      if (c.tipo === 'quitar-series' && dia) {
        const item = dia.ejercicios.find((x) => x.ejercicioId === c.ejercicioId);
        if (item) item.series = c.quedan;
      }
    }
  });
  aviso(`Guardado para siempre: ${marcados.length} cambio${marcados.length > 1 ? 's' : ''}.`);
}

