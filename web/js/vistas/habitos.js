// Pantalla «Hábitos» (#/habitos), desde la 0.92.0.
// Arriba, una tarjeta con el siguiente hábito del día y tres botones: Sí, No y Luego. Nada más.
// Debajo, el cuadrante del mes (un hábito por fila, un día por columna) con el porcentaje global delante.
// Al final, la lista de hábitos para editarla o pegar una entera.
import * as estado from '../estado.js';
import {
  BLOQUES, DIAS_SEMANA, TODOS_LOS_DIAS, aplazar, cuentas, delDia, diaDeHabitos, diaSemana, habitosActivos, leerLista,
  pendientes, porcentaje, responder, respuestasDe, siguienteTarjeta, sumarDias, textoDias, toca,
} from '../habitos.js';
import { aviso, confirmar, fechaLarga, h, nuevoId } from '../ui.js';

// «Luego» y «deshacer» viven en el dispositivo, no en los datos: si cierras la app, lo aparcado vuelve a su sitio.
const CLAVE_LUEGO = 'entreno-habitos-luego';
function leerLuego(fecha) {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE_LUEGO) || 'null');
    return x?.fecha === fecha ? x.lista : [];
  } catch { return []; }
}
function guardarLuego(fecha, lista) {
  try { localStorage.setItem(CLAVE_LUEGO, JSON.stringify({ fecha, lista })); } catch { /* nada */ }
}
let deshacer = [];      // [{ fecha, id }] de lo contestado con las tarjetas, lo último al final
let mesElegido = null;  // 'AAAA-MM' del cuadrante

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre'];

export function vistaHabitos(contenedor) {
  const d = estado.datos();
  const hoy = diaDeHabitos();
  contenedor.append(
    habitosActivos(d).length ? tarjetaDelDia(d, hoy) : tarjetaPrimeraVez(),
    habitosActivos(d).length ? cuadrante(d, hoy) : '',
    editor(d, hoy));
}

// ---------------------------------------------------------------- la tarjeta
function tarjetaDelDia(d, hoy) {
  const lista = pendientes(d, hoy);
  const total = delDia(d, hoy).length;
  const hechas = total - lista.length;
  const aplazados = leerLuego(hoy);
  const actual = siguienteTarjeta(lista, aplazados, hechas);

  if (!actual) {
    const r = respuestasDe(d, hoy);
    const si = delDia(d, hoy).filter((x) => r[x.id] === 'si').length;
    return h('section', { class: 'tarjeta habitos-tarjeta centrado' },
      h('p', { class: 'habitos-progreso' }, fechaLarga(hoy)),
      h('h2', {}, total ? 'Día completo' : 'Hoy no toca ningún hábito'),
      total ? h('p', { class: 'habitos-resumen-dia' }, `${si} de ${total} hechos`) : '',
      botonDeshacer());
  }

  // Antes de `estado.cambiar`, que repinta al momento: si no, el repintado no vería ni el «deshacer» ni lo aparcado.
  const contestar = (valor) => {
    guardarLuego(hoy, leerLuego(hoy).filter((a) => a.id !== actual.id));
    deshacer.push({ fecha: hoy, id: actual.id });
    estado.cambiar((x) => responder(x, hoy, actual.id, valor));
  };
  const luego = () => {
    guardarLuego(hoy, aplazar(leerLuego(hoy), actual.id, hechas));
    estado.emitir('vista');
  };
  return h('section', { class: 'tarjeta habitos-tarjeta centrado' },
    h('p', { class: 'habitos-progreso' }, `${hechas + 1} de ${total} · ${BLOQUES[actual.bloque] ?? ''}`),
    h('h2', { class: 'habitos-nombre' }, actual.nombre),
    actual.minimo ? h('p', { class: 'habitos-minimo' }, actual.minimo) : '',
    h('div', { class: 'habitos-botones' },
      h('button', { type: 'button', class: 'boton grande habitos-si', onclick: () => contestar('si') }, 'Sí'),
      h('button', { type: 'button', class: 'boton grande habitos-no', onclick: () => contestar('no') }, 'No'),
      h('button', { type: 'button', class: 'boton secundario habitos-luego', onclick: luego }, 'Luego')),
    botonDeshacer());
}

function botonDeshacer() {
  if (!deshacer.length) return '';
  return h('button', { type: 'button', class: 'boton enlace', onclick: () => {
    const { fecha, id } = deshacer.pop();
    // Lo deshecho vuelve a salir el primero.
    guardarLuego(fecha, [{ id, marca: -1 }, ...leerLuego(fecha).filter((a) => a.id !== id)]);
    estado.cambiar((x) => responder(x, fecha, id, null));
  } }, 'Deshacer la última');
}

function tarjetaPrimeraVez() {
  return h('section', { class: 'tarjeta centrado' },
    h('h2', {}, 'Tus hábitos'),
    h('p', {}, 'Cada día te sale una tarjeta por hábito: Sí, No o Luego. Abajo verás el cuadrante del mes.'),
    h('p', { class: 'suave' }, 'Empieza añadiendo tus hábitos uno a uno o pegando una lista, en «Mis hábitos».'));
}

// ---------------------------------------------------------------- el cuadrante
function cuadrante(d, hoy) {
  const mes = mesElegido ?? hoy.slice(0, 7);
  const [a, m] = mes.split('-').map(Number);
  const primero = `${mes}-01`;
  const nDias = new Date(a, m, 0).getDate();
  const ultimo = `${mes}-${String(nDias).padStart(2, '0')}`;
  const lista = habitosActivos(d);
  const { total, porHabito } = cuentas(d, primero, ultimo, hoy);
  const lunes = sumarDias(hoy, -diaSemana(hoy));
  const semana = cuentas(d, lunes, sumarDias(lunes, 6), hoy).total;

  const irMes = (n) => {
    const f = new Date(a, m - 1 + n, 1);
    mesElegido = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    estado.emitir('vista');
  };
  const cifra = (c) => (c.posibles ? `${porcentaje(c)} %` : '—');
  const detalle = (c) => (c.posibles ? `${c.si} de ${c.posibles}` + (c.vacio ? ` · ${c.vacio} sin apuntar` : '') : 'sin días');

  const dias = Array.from({ length: nDias }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
  const cabecera = h('tr', {}, h('th', { class: 'habitos-col-nombre' }, ''),
    ...dias.map((f) => h('th', { class: f === hoy ? 'hoy' : '' },
      h('span', {}, String(Number(f.slice(8)))), h('small', {}, DIAS_SEMANA[diaSemana(f)]))),
    h('th', {}, '%'));
  const filas = lista.map((x) => {
    const c = porHabito.get(x.id);
    return h('tr', {}, h('th', { class: 'habitos-col-nombre' }, x.nombre),
      ...dias.map((f) => celda(d, x, f, hoy)),
      h('td', { class: 'habitos-pct' }, c.posibles ? String(porcentaje(c)) : '—'));
  });

  return h('section', { class: 'tarjeta centrado' },
    h('div', { class: 'fila-botones habitos-mes' },
      h('button', { type: 'button', class: 'boton secundario', 'aria-label': 'Mes anterior', onclick: () => irMes(-1) }, '‹'),
      h('h2', {}, `${MESES[m - 1].charAt(0).toUpperCase()}${MESES[m - 1].slice(1)} ${a}`),
      h('button', { type: 'button', class: 'boton secundario', 'aria-label': 'Mes siguiente', disabled: mes >= hoy.slice(0, 7),
        onclick: () => irMes(1) }, '›')),
    h('div', { class: 'habitos-global' },
      h('div', {}, h('strong', {}, cifra(total)), h('span', {}, 'este mes'), h('small', { class: 'suave' }, detalle(total))),
      mes === hoy.slice(0, 7)
        ? h('div', {}, h('strong', {}, cifra(semana)), h('span', {}, 'esta semana'), h('small', { class: 'suave' }, detalle(semana)))
        : ''),
    desplazadoAHoy(h('div', { class: 'habitos-cuadrante' }, h('table', {}, h('thead', {}, cabecera), h('tbody', {}, ...filas)))),
    h('p', { class: 'suave habitos-leyenda' },
      h('span', { class: 'habitos-muestra si' }), ' sí  ', h('span', { class: 'habitos-muestra no' }), ' no  ',
      h('span', { class: 'habitos-muestra vacio' }), ' sin apuntar  ', h('span', { class: 'habitos-muestra no-toca' }), ' no toca'),
    h('p', { class: 'suave' }, 'Toca una casilla para corregirla: sí, no, sin apuntar.'));
}

// En el móvil no cabe el mes entero: el cuadrante se abre con hoy a la vista, a la derecha.
function desplazadoAHoy(caja) {
  setTimeout(() => {
    const hoy = caja.isConnected && caja.querySelector('th.hoy');
    if (!hoy) return;
    const exceso = hoy.getBoundingClientRect().right - caja.getBoundingClientRect().right;
    if (exceso > 0) caja.scrollLeft += exceso + 40;
  }, 30);
  return caja;
}

function celda(d, x, f, hoy) {
  if (f > hoy) return h('td', { class: 'futuro' });
  if (!toca(x, f)) return h('td', { class: 'no-toca' });
  const v = respuestasDe(d, f)[x.id];
  const siguiente = v === 'si' ? 'no' : v === 'no' ? null : 'si';
  return h('td', { class: v ?? 'vacio' },
    h('button', { type: 'button', 'aria-label': `${x.nombre}, ${f}: ${v === 'si' ? 'sí' : v === 'no' ? 'no' : 'sin apuntar'}`,
      onclick: () => estado.cambiar((y) => responder(y, f, x.id, siguiente)) }));
}

// ---------------------------------------------------------------- la lista
function editor(d, hoy) {
  const lista = habitosActivos(d);
  const mover = (id, paso) => estado.cambiar((y) => {
    const orden = habitosActivos(y);
    const i = orden.findIndex((z) => z.id === id);
    const j = i + paso;
    if (j < 0 || j >= orden.length) return;
    [orden[i], orden[j]] = [orden[j], orden[i]];
    orden.forEach((z, k) => { z.orden = k; });
  });
  const cambiar = (id, fn, opciones) => estado.cambiar((y) => { const z = (y.habitos ?? []).find((w) => w.id === id); if (z) fn(z); }, opciones);

  const fichas = lista.map((x, i) => h('details', { class: 'explicacion habitos-ficha' },
    h('summary', {}, x.nombre, h('small', { class: 'suave' }, ` · ${textoDias(x.dias)}`)),
    h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Nombre'),
      h('input', { type: 'text', value: x.nombre, oninput: (e) => cambiar(x.id, (z) => { z.nombre = e.target.value; }, { tecleo: true }),
        onchange: () => estado.emitir('vista') })),
    h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Lo mínimo que cuenta'),
      h('input', { type: 'text', value: x.minimo ?? '', oninput: (e) => cambiar(x.id, (z) => { z.minimo = e.target.value; }, { tecleo: true }) })),
    h('div', { class: 'fila-marcas compacta' }, DIAS_SEMANA.map((letra, k) => {
      const dias = x.dias?.length ? x.dias : TODOS_LOS_DIAS;
      const activo = dias.includes(k);
      return h('button', { type: 'button', class: `boton-marca${activo ? ' activo' : ''}`, 'aria-pressed': String(activo),
        onclick: () => cambiar(x.id, (z) => {
          const actual = z.dias?.length ? z.dias : [...TODOS_LOS_DIAS];
          const nuevos = activo ? actual.filter((n) => n !== k) : [...actual, k].sort((p, q) => p - q);
          z.dias = nuevos.length ? nuevos : [...TODOS_LOS_DIAS];
        }) }, letra);
    })),
    h('div', { class: 'fila-marcas compacta' }, Object.entries(BLOQUES).map(([clave, texto]) => h('button', { type: 'button',
      class: `boton-marca${x.bloque === clave ? ' activo' : ''}`, onclick: () => cambiar(x.id, (z) => { z.bloque = clave; }) }, texto))),
    h('div', { class: 'fila-botones' },
      h('button', { type: 'button', class: 'boton secundario', disabled: i === 0, onclick: () => mover(x.id, -1) }, 'Subir'),
      h('button', { type: 'button', class: 'boton secundario', disabled: i === lista.length - 1, onclick: () => mover(x.id, 1) }, 'Bajar'),
      h('button', { type: 'button', class: 'boton peligro', onclick: async () => {
        if (await confirmar(`¿Quitar «${x.nombre}»? Lo que ya apuntaste se guarda.`, { si: 'Quitar', peligro: true })) {
          cambiar(x.id, (z) => { z.borrado = true; });
        }
      } }, 'Quitar'))));

  const anadir = (nuevos) => estado.cambiar((y) => {
    y.habitos ??= [];
    let orden = habitosActivos(y).length;
    for (const n of nuevos) {
      y.habitos.push({ id: nuevoId('hab'), nombre: n.nombre, minimo: n.minimo ?? '', dias: n.dias ?? [...TODOS_LOS_DIAS],
        bloque: n.bloque ?? 'mantenimiento', orden: orden++, desde: hoy });
    }
  });
  const nombreNuevo = h('input', { type: 'text', placeholder: 'Nombre del hábito', 'aria-label': 'Nombre del hábito nuevo' });
  const pegado = h('textarea', { rows: '6', 'aria-label': 'Lista de hábitos',
    placeholder: 'Meditar | 2 min al despertar | todos | construcción\nGym | Ir, aunque sea corto | V-L | construcción\nPuntualidad | | todos | mantenimiento' });

  return h('details', { class: 'tarjeta formulario apartado' },
    h('summary', {}, `Mis hábitos (${lista.length})`),
    ...fichas,
    h('div', { class: 'fila-campos' }, nombreNuevo,
      h('button', { type: 'button', class: 'boton', onclick: () => {
        const nombre = nombreNuevo.value.trim();
        if (!nombre) return aviso('Escribe el nombre del hábito', { tipo: 'error' });
        anadir([{ nombre }]);
      } }, 'Añadir')),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Pegar una lista entera'),
      h('p', { class: 'suave' }, 'Una línea por hábito: nombre | lo mínimo | días | bloque. Días: «todos», letras sueltas '
        + '(L M X J V S D) o un tramo («L-V», «V-L»). Bloque: «construcción» o «mantenimiento». Se añaden detrás de los que ya tienes.'),
      pegado,
      h('button', { type: 'button', class: 'boton', onclick: () => {
        const nuevos = leerLista(pegado.value);
        if (!nuevos.length) return aviso('No hay ninguna línea con nombre', { tipo: 'error' });
        anadir(nuevos);
        aviso(`Añadidos ${nuevos.length} hábitos`);
      } }, 'Añadir estos hábitos')));
}
