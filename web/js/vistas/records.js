// Récords personales: una página con todos (Cuerpo → Récords) y una tarjeta
// en Hoy con los que tú elijas (por defecto, los básicos). Dan: «que los
// récords estén tan accesibles es una pasada y motiva» (27-10-2026).

import { icono } from '../iconos.js';
import * as estado from '../estado.js';
import { imagenDeEjercicio } from '../imagenes.js';
import { TIPOS_RECORD, recordsDe, recordsParaHoy, textoRecord, tiposDe } from '../records.js';
import { seriesDeEjercicio } from '../calculos.js';
import { fechaCorta, h, modal } from '../ui.js';

const miniatura = (ej) => {
  const img = imagenDeEjercicio(ej);
  return img ? h('img', { class: 'miniatura', src: img.archivo, alt: '', loading: 'lazy' }) : h('span', { class: 'miniatura sin-imagen' });
};

// Tarjeta de Hoy: tus récords elegidos, cada uno con su valor y su fecha.
export function tarjetaRecordsHoy(d, { enPagina = false } = {}) {
  const lista = recordsParaHoy(d);
  const filas = lista.map(({ ej, tipo }) => {
    const r = recordsDe(d, ej)[tipo];
    return h('a', { class: 'fila-record', href: `#/ejercicio/${ej.id}` },
      miniatura(ej),
      h('span', { class: 'crece' }, h('strong', {}, ej.nombre), h('small', { class: 'bloque suave' },
        TIPOS_RECORD[tipo] + (r ? ` · ${fechaCorta(r.fecha)}` : ''))),
      h('span', { class: 'valor-record' }, textoRecord(ej, tipo, r)));
  });
  return h('section', { class: 'tarjeta records-hoy' },
    h('h2', { class: 'con-icono' }, icono('trofeo'), 'Tus récords'),
    filas.length ? filas : h('p', { class: 'nota centrado' }, 'Cuando entrenes los básicos (banca, sentadilla, peso muerto…) saldrán aquí tus récords. También puedes elegirlos tú.'),
    h('div', { class: 'fila-botones' },
      h('button', { type: 'button', class: 'boton secundario', onclick: () => elegirRecordsHoy(d) }, 'Elegir cuáles'),
      !enPagina && h('a', { class: 'boton secundario', href: '#/cuerpo/records' }, 'Ver todos')));
}

// Elegir qué récords salen en Hoy y de qué tipo (peso, repeticiones…).
function elegirRecordsHoy(d) {
  const caja = h('div', { class: 'elegir-records' });
  const cerrar = modal('Récords en Hoy', caja);
  const pintar = () => {
    const actuales = recordsParaHoy(estado.datos()).map(({ ejercicioId, tipo }) => ({ ejercicioId, tipo }));
    const guardar = (lista) => estado.cambiar((x) => { x.perfil.recordsHoy = lista; });
    const conHistorial = estado.datos().ejercicios.filter((e) => !e.borrado && !e.archivado && seriesDeEjercicio(estado.datos(), e.id).length)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    caja.replaceChildren(
      h('p', { class: 'nota centrado' }, 'Toca el tipo de récord que quieres ver de cada ejercicio; tócalo otra vez para quitarlo.'),
      ...conHistorial.map((ej) => h('div', { class: 'fila-elegir-record' },
        h('strong', {}, ej.nombre),
        h('div', { class: 'rejilla-chips' }, tiposDe(ej).map((tipo) => {
          const activo = actuales.some((r) => r.ejercicioId === ej.id && r.tipo === tipo);
          return h('button', { type: 'button', class: `chip seleccionable${activo ? ' activo' : ''}`, 'aria-pressed': String(activo),
            onclick: () => {
              guardar(activo ? actuales.filter((r) => !(r.ejercicioId === ej.id && r.tipo === tipo)) : [...actuales, { ejercicioId: ej.id, tipo }]);
              pintar();
            } }, TIPOS_RECORD[tipo]);
        })))),
      h('div', { class: 'fila-botones' },
        h('button', { type: 'button', class: 'boton secundario', onclick: () => { estado.cambiar((x) => { delete x.perfil.recordsHoy; }); pintar(); } }, 'Los básicos'),
        h('button', { type: 'button', class: 'boton', onclick: () => cerrar() }, 'Listo')));
  };
  pintar();
}

// La página con todos: un bloque por ejercicio con todos sus récords.
export function vistaRecords(contenedor) {
  const d = estado.datos();
  const ultimaVez = (ej) => seriesDeEjercicio(d, ej.id).at(-1)?.sesion.fecha ?? '';
  const ejercicios = d.ejercicios.filter((e) => !e.borrado && seriesDeEjercicio(d, e.id).length)
    .map((ej) => ({ ej, ultima: ultimaVez(ej), r: recordsDe(d, ej) }))
    .filter((x) => Object.keys(x.r).length)
    .sort((a, b) => b.ultima.localeCompare(a.ultima));
  const enHoy = new Set(recordsParaHoy(d).map((x) => x.ejercicioId));
  contenedor.append(
    tarjetaRecordsHoy(d, { enPagina: true }),
    ejercicios.length
      ? h('section', { class: 'tarjeta' },
        h('h2', {}, 'Todos tus récords'),
        h('p', { class: 'nota centrado' }, 'Del más reciente al más antiguo. Toca uno para abrir el ejercicio.'),
        ejercicios.map(({ ej, r }) => h('a', { class: 'bloque-record', href: `#/ejercicio/${ej.id}` },
          h('div', { class: 'cabecera-record' }, miniatura(ej), h('strong', { class: 'crece' }, ej.nombre),
            enHoy.has(ej.id) && h('span', { class: 'etiqueta' }, 'En Hoy')),
          h('table', { class: 'tabla-musculos' }, h('tbody', {}, tiposDe(ej).filter((t) => r[t]).map((t) => h('tr', {},
            h('td', {}, TIPOS_RECORD[t], r[t].detalle && h('small', { class: 'bloque suave' }, r[t].detalle)),
            h('td', { class: 'num' }, h('strong', {}, textoRecord(ej, t, r[t]))),
            h('td', { class: 'num suave' }, fechaCorta(r[t].fecha)))))))))
      : h('p', { class: 'suave centrado' }, 'Aún no hay récords: entrena y aparecerán aquí.'));
}
