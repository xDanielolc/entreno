// Comparaciones serie a serie y resumen al terminar el entrenamiento.
//
// Al terminar sale una ventana con:
//   · tres cifras (minutos, series, récords) y los récords del día;
//   · una fila por ejercicio frente a la última vez, con su flecha;
//   · los consejos, plegados;
//   · si has cambiado algo respecto a la rutina, si es solo para hoy o para siempre.

import { esfuerzoTotal, formatearNumero, records as recordsDe, redondear, seriesDeEjercicio, trabajoSerie } from '../calculos.js';
import { serieNuevaPlantilla } from '../esquema.js';
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
  // ¿Error al teclear? Una serie que da un 1RM muy por encima de tu récord.
  if (hoy.nombre === '1RM') {
    const previos = historial.map((x) => medida(datos, ej, x.serie)).filter((m) => m?.nombre === '1RM').map((m) => m.valor);
    const record = previos.length ? Math.max(...previos) : null;
    if (record && hoy.valor > record * 1.5) {
      return `⚠ ¿Está bien escrito? Da un 1RM de ${formatearNumero(Math.round(hoy.valor))} kg y tu récord es ${formatearNumero(Math.round(record))}. Revisa el peso y las repeticiones.`;
    }
  }
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
  const lista = recordsDeSesion(datos, sesion);
  const comparacion = comparacionPorEjercicio(datos, sesion);
  const consejos = recomendacionesDeSesion(datos, sesion).filter((x) => x.nivel !== 'bien');
  const series = sesion.ejercicios.reduce((n, e) => n + e.series.filter((s) => s.hecha).length, 0);
  const minutos = sesion.inicio && sesion.fin ? Math.round((new Date(sesion.fin) - new Date(sesion.inicio)) / 60_000) : null;

  // Arriba, tres números grandes; debajo, una fila por ejercicio con su
  // flecha; lo largo (consejos y serie a serie), plegado.
  const cerrar = modal('Entrenamiento terminado', h('div', { class: 'resumen-sesion' },
    h('div', { class: 'cifras' },
      cifra(minutos != null ? `${minutos}` : '—', 'minutos'),
      cifra(String(series), series === 1 ? 'serie' : 'series'),
      cifra(String(lista.filter((r) => !r.raro).length), lista.filter((r) => !r.raro).length === 1 ? 'récord' : 'récords', lista.some((r) => !r.raro))),
    lista.length > 0 && h('div', { class: 'records' }, lista.map((r) => h('div', { class: 'record-nuevo' },
      h('span', { class: 'suave' }, r.ej.nombre),
      h('strong', {}, `${formatearNumero(r.valor)} kg`),
      h('small', {}, `${r.que} · antes ${formatearNumero(r.antes)}`)))),
    comparacion.length > 0 && h('table', { class: 'tabla-musculos' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Ejercicio'), h('th', { class: 'num' }, 'Hoy'), h('th', { class: 'num' }, 'Frente a la última vez'))),
      h('tbody', {}, comparacion.map((c) => h('tr', {},
        h('td', {}, c.nombre),
        h('td', { class: 'num' }, c.que === '1RM' ? `1RM ${c.valor}` : `${c.que} ${c.valor}`),
        h('td', { class: `num cambio-${c.clase}` }, c.texto))))),
    consejos.length > 0 && h('details', { class: 'explicacion' },
      h('summary', {}, `Consejos (${consejos.length})`),
      listaRecomendaciones(consejos)),
    cambios.length > 0 && seccionCambios(cambios),
    h('div', { class: 'fila-botones' },
      cambios.length > 0
        ? [h('button', { class: 'boton secundario', onclick: () => cerrar() }, 'Solo para hoy'),
          h('button', { class: 'boton', onclick: () => { aplicarCambios(cambios); cerrar(); } }, 'Guardar lo marcado')]
        : h('button', { class: 'boton', onclick: () => cerrar() }, 'Hecho'))));
}

function cifra(valor, texto, destacada = false) {
  return h('div', { class: `cifra${destacada ? ' destacada' : ''}` }, h('strong', {}, valor), h('span', {}, texto));
}

// Récords de esta sesión: 1RM estimado y trabajo en una serie.
function recordsDeSesion(datos, sesion) {
  const sin = { ...datos, sesiones: datos.sesiones.filter((s) => s.id !== sesion.id) };
  const lista = [];
  const vistos = new Set();
  for (const entrada of sesion.ejercicios) {
    const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
    if (!ej || vistos.has(ej.id)) continue;
    vistos.add(ej.id);
    const antes = recordsDe(sin, ej.id);
    const ahora = recordsDe(datos, ej.id);
    if (ahora.mejor1RM && antes.mejor1RM && ahora.mejor1RM.valor > antes.mejor1RM.valor) {
      // Más de un 50 % de golpe no es un récord: casi seguro es un error al teclear.
      const raro = ahora.mejor1RM.valor > antes.mejor1RM.valor * 1.5;
      lista.push({ ej, que: raro ? '⚠ ¿error al teclear? Revisa la serie' : '1RM estimado', valor: ahora.mejor1RM.valor, antes: antes.mejor1RM.valor, raro });
    } else if (ahora.mejorTrabajo && antes.mejorTrabajo && ahora.mejorTrabajo.valor > antes.mejorTrabajo.valor) {
      lista.push({ ej, que: 'trabajo en una serie', valor: ahora.mejorTrabajo.valor, antes: antes.mejorTrabajo.valor });
    }
  }
  return lista;
}

// Una fila por ejercicio: la mejor serie de hoy frente a la de la última vez.
function comparacionPorEjercicio(datos, sesion) {
  const filas = [];
  for (const entrada of sesion.ejercicios) {
    const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
    if (!ej) continue;
    // Se compara lo mismo con lo mismo: el 1RM si lo hay; si no (solo drop
    // sets, o sin peso), el trabajo o lo que midas, sin colores.
    const medidas = (series) => series.map((s) => medida(datos, ej, s)).filter(Boolean);
    const hoyTodas = medidas(entrada.series.filter((s) => s.hecha));
    if (!hoyTodas.length) continue;
    const nombre = hoyTodas.some((m) => m.nombre === '1RM') ? '1RM' : hoyTodas[0].nombre;
    const hoy = hoyTodas.filter((m) => m.nombre === nombre);
    const antes = seriesDeEjercicio(datos, ej.id, { excluirSesion: sesion.id })
      .filter((x) => x.sesion.fecha <= sesion.fecha);
    const ultimaFecha = antes.at(-1)?.sesion.id;
    const deEseDia = medidas(antes.filter((x) => x.sesion.id === ultimaFecha).map((x) => x.serie)).filter((m) => m.nombre === nombre);
    const mejorHoy = Math.max(...hoy.map((m) => m.valor));
    const valor = `${formatearNumero(redondear(mejorHoy, 1))}${nombre === '1RM' ? ' kg' : ''}`;
    if (!deEseDia.length) { filas.push({ nombre: ej.nombre, que: nombre, valor, texto: 'primera vez', clase: '' }); continue; }
    const mejorAntes = Math.max(...deEseDia.map((m) => m.valor));
    const pct = Math.round(((mejorHoy - mejorAntes) / mejorAntes) * 100);
    const color = nombre === '1RM';
    filas.push({ nombre: ej.nombre, que: nombre, valor, texto: pct > 0 ? `▲ ${pct} %` : pct < 0 ? `▼ ${-pct} %` : '=',
      clase: !color ? '' : pct > 0 ? 'sube' : pct < 0 ? 'baja' : '' });
  }
  return filas;
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
        cambios.push({ tipo: 'anadir-al-dia', texto: `Hoy has hecho ${nombreEj(entrada.ejercicioId)}, que no estaba en «${dia.nombre}». ¿Lo añado a ese día?`,
          rutinaId: rutina.id, diaId: dia.id, ejercicioId: entrada.ejercicioId });
      }
    }
    for (const item of dia.ejercicios) {
      const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
      if (!ej || ej.archivado) continue;
      // No estaba en la sesión, o estaba pero no se hizo ninguna serie.
      const entrada = sesion.ejercicios.find((x) => x.ejercicioId === item.ejercicioId);
      if (!entrada || !entrada.series.some((s) => s.hecha)) {
        cambios.push({ tipo: 'quitar-del-dia', texto: `Hoy no has hecho ${ej.nombre}. ¿Lo quito de «${dia.nombre}»?`,
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
        texto: `En ${ej.nombre} has hecho ${extra.length} ${extra.length > 1 ? 'series' : 'serie'} más de lo planeado. ¿Las añado a los próximos entrenos?` });
    }
    // Series de la plantilla que hoy no has hecho (saltadas): se ofrece
    // quitarlas del día de la rutina o, sin rutina, del propio ejercicio.
    const hechas = new Set(entrada.series.filter((s) => s.hecha && s.planId).map((s) => s.planId));
    if (!hechas.size) continue;
    // En un programa (5×5, 5/3/1…) las series las fija el programa: no se ofrece quitarlas.
    if ((ej.series || []).every((p) => p.progresion?.tipo === 'programa')) continue;
    const item = dia?.ejercicios.find((x) => x.ejercicioId === ej.id);
    const previstos = (ej.series || []).filter((p) => !item?.series || item.series.includes(p.id));
    const quitados = previstos.filter((p) => !hechas.has(p.id));
    const n = quitados.length;
    const texto = `En ${ej.nombre} has hecho ${n} ${n > 1 ? 'series' : 'serie'} menos de lo planeado. ¿${n > 1 ? 'Las' : 'La'} quito de los próximos entrenos?`;
    if (n && n < previstos.length) {
      if (item) {
        cambios.push({ tipo: 'quitar-series', rutinaId: rutina.id, diaId: dia.id, ejercicioId: ej.id, n,
          quedan: previstos.filter((p) => hechas.has(p.id)).map((p) => p.id), texto });
      } else {
        cambios.push({ tipo: 'quitar-planes', ejercicioId: ej.id, n, ids: quitados.map((p) => p.id), texto });
      }
    }
  }
  for (const c of cambios) c.nombre = nombreEj(c.ejercicioId);
  return cambios;
}

// True si el ejercicio no tiene ninguna serie hecha en otra sesión terminada.
function e_primeraVez(datos, ej, sesion) {
  return !datos.sesiones.some((s) => s.id !== sesion.id && !s.borrada && s.estado === 'terminada'
    && s.ejercicios.some((e) => e.ejercicioId === ej.id && e.series.some((x) => x.hecha)));
}

// Los cambios, agrupados: una frase por tipo y, debajo, los ejercicios como
// botones que se quedan marcados. Sin repetir la misma frase en cada uno.
function seccionCambios(cambios) {
  const grupos = [
    ['anadir-al-dia', 'Hechos hoy sin estar en el día de la rutina. ¿Los añado?', (c) => c.nombre],
    ['quitar-del-dia', 'No los has hecho hoy. ¿Los quito del día de la rutina?', (c) => c.nombre],
    ['anadir-series', 'Series de más. ¿Las dejo para los próximos entrenos?', (c) => `${c.nombre} (+${c.series.length})`],
    ['quitar-', 'Series de menos. ¿Las quito de los próximos entrenos?', (c) => `${c.nombre} (−${c.n})`],
  ];
  return h('section', {},
    h('h3', {}, 'Cambios respecto a lo planeado'),
    h('p', { class: 'nota' }, 'Toca lo que quieras que se quede. Lo que no toques, solo ha sido hoy.'),
    grupos.map(([tipo, frase, etiqueta]) => {
      const lista = cambios.filter((c) => (tipo.endsWith('-') ? c.tipo.startsWith(tipo) && c.tipo !== 'quitar-del-dia' : c.tipo === tipo));
      if (!lista.length) return null;
      return h('div', { class: 'grupo-cambios' },
        h('p', {}, frase),
        h('div', { class: 'fila-marcas compacta' }, lista.map((c) => h('button', { type: 'button', class: 'boton-marca', 'aria-pressed': 'false',
          onclick: (e) => {
            c.marcado = !c.marcado;
            e.currentTarget.classList.toggle('activo', c.marcado);
            e.currentTarget.setAttribute('aria-pressed', String(c.marcado));
          } }, etiqueta(c)))));
    }));
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
      if (c.tipo === 'quitar-planes' && ej) {
        ej.series = (ej.series || []).filter((p) => !c.ids.includes(p.id));
        for (const r of datos.rutinas) {
          for (const d of r.dias) {
            for (const item of d.ejercicios) if (item.ejercicioId === ej.id && item.series) item.series = item.series.filter((x) => !c.ids.includes(x));
          }
        }
      }
    }
  });
  aviso(`Guardado para siempre: ${marcados.length} cambio${marcados.length > 1 ? 's' : ''}.`);
}

