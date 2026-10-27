import * as estado from '../estado.js';
import { sedeInicial } from '../sedes.js';
import { anadir, fechaLarga, h, hoyISO, modal, nuevoId, selector, horario } from '../ui.js';
import { TIPOS_EJERCICIO, normalizar, tipoDeEjercicio } from '../catalogo.js';
import { MUSCULOS, ORDEN_MUSCULOS } from '../musculos.js';
import { tiraInferior } from './tira.js';

// Lo que buscas en el historial se recuerda mientras la app esté abierta.
const filtro = { texto: '', rutina: '', tipo: '', musculo: '', mes: '' };
let filtrosAbiertos = false;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombreMes = (am) => `${MESES[Number(am.slice(5, 7)) - 1]} de ${am.slice(0, 4)}`;

function pasaFiltro(d, s) {
  const ejercicios = s.ejercicios.map((e) => d.ejercicios.find((x) => x.id === e.ejercicioId)).filter(Boolean);
  if (filtro.rutina && s.rutinaId !== filtro.rutina) return false;
  if (filtro.mes && !s.fecha.startsWith(filtro.mes)) return false;
  if (filtro.tipo && !ejercicios.some((e) => tipoDeEjercicio(e) === filtro.tipo)) return false;
  if (filtro.musculo && !ejercicios.some((e) => [...(e.musculos?.principales ?? []), ...(e.musculos?.secundarios ?? [])]
    .includes(filtro.musculo))) return false;
  if (filtro.texto) {
    const rutina = d.rutinas.find((r) => r.id === s.rutinaId);
    const dia = rutina?.dias.find((x) => x.id === s.diaRutinaId);
    const texto = normalizar([fechaLarga(s.fecha), s.fecha, rutina?.nombre, dia?.nombre, s.notas,
      ...ejercicios.map((e) => e.nombre)].filter(Boolean).join(' '));
    if (!normalizar(filtro.texto).split(/\s+/).every((p) => texto.includes(p))) return false;
  }
  return true;
}

// Una tarjeta por entrenamiento; toca y se abre. En breve: fecha, día de la
// rutina y series; con detalle, también los ejercicios.
export function resumenSesion(datos, sesion, { breve = false } = {}) {
  const rutina = datos.rutinas.find((r) => r.id === sesion.rutinaId);
  const dia = rutina?.dias.find((x) => x.id === sesion.diaRutinaId);
  const nombres = sesion.ejercicios
    .map((e) => datos.ejercicios.find((x) => x.id === e.ejercicioId)?.nombre ?? 'Ejercicio borrado');
  const series = sesion.ejercicios.reduce((n, e) => n + e.series.filter((s) => s.hecha).length, 0);
  const titulo = dia ? dia.nombre : (nombres.length ? `Sin rutina · ${nombres.length} ${nombres.length === 1 ? 'ejercicio' : 'ejercicios'}` : 'Sin ejercicios');
  return h('a', { class: `tarjeta fila-enlace${breve ? ' breve' : ''}`, href: `#/sesion/${sesion.id}` },
    h('div', {},
      h('strong', {}, fechaLarga(sesion.fecha)),
      sesion.estado === 'en-curso' && h('span', { class: 'etiqueta' }, 'En curso'),
      h('div', {}, titulo),
      horario(sesion) && h('div', { class: 'suave' }, horario(sesion)),
      !breve && h('div', { class: 'suave' }, nombres.length ? nombres.join(', ') : 'Sin ejercicios')),
    h('span', { class: 'contador' }, `${series} ${series === 1 ? 'serie' : 'series'}`));
}

export function masRecienteAntes(a, b) {
  return (b.fecha + (b.inicio || '')).localeCompare(a.fecha + (a.inicio || ''));
}

export function vistaHistorial(contenedor, { apartado } = {}) {
  const d = estado.datos();
  // Dos apartados en la tira de abajo: la lista y el calendario (Dan, 27-10-2026).
  const tira = tiraInferior([
    { texto: 'Lista', icono: 'lista', href: '#/historial', activo: apartado !== 'calendario' },
    { texto: 'Calendario', icono: 'calendario', href: '#/historial/calendario', activo: apartado === 'calendario' },
  ], { etiqueta: 'Apartados del historial' });
  if (apartado === 'calendario') { anadir(contenedor, vistaCalendario(d), tira); return; }
  const sesiones = d.sesiones.filter((s) => !s.borrada).sort(masRecienteAntes);
  const papelera = d.sesiones.filter((s) => s.borrada).sort(masRecienteAntes);
  // Para pasar a la app entrenamientos de otros días (cardio antiguo, por
  // ejemplo): se crea en esa fecha y se rellena como uno normal.
  function anadirPasado() {
    const fecha = h('input', { type: 'date', value: hoyISO(), max: hoyISO() });
    const hora = h('input', { type: 'time', value: '19:00' });
    const cerrar = modal('Entrenamiento de otro día', h('div', { class: 'formulario' },
      h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Día'), fecha),
      h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Hora de inicio'), hora),
      h('button', { class: 'boton', onclick: () => {
        if (!fecha.value) return;
        const id = nuevoId('ses');
        const [a, m, dd] = fecha.value.split('-').map(Number);
        const [hh, mm] = (hora.value || '19:00').split(':').map(Number);
        estado.cambiar((datos) => {
          datos.sesiones.push({
            id, fecha: fecha.value, sedeId: sedeInicial(datos, null), rutinaId: null, diaRutinaId: null,
            estado: 'en-curso', inicio: new Date(a, m - 1, dd, hh, mm).toISOString(), fin: null,
            ejercicios: [], notas: '', borrada: null, sensacionesCerrada: true,
          });
        });
        cerrar();
        location.hash = `#/sesion/${id}`;
      } }, 'Crear y rellenar')));
  }

  // Buscador y filtros: solo se repinta la lista, para no perder el teclado.
  const lista = h('div', {});
  const plegable = h('div', { class: 'panel-filtros', hidden: !filtrosAbiertos });
  const boton = h('button', { type: 'button', class: 'boton-filtros', onclick: () => { filtrosAbiertos = !filtrosAbiertos; plegable.hidden = !filtrosAbiertos; } });
  const cambio = () => { pintarFiltros(); pintarLista(); };
  const opcion = (clave, opciones, titulo) => selector(opciones, filtro[clave], (v) => { filtro[clave] = v; cambio(); },
    { titulo, lista: true });
  const meses = [...new Set(sesiones.map((s) => s.fecha.slice(0, 7)))];
  const rutinasUsadas = d.rutinas.filter((r) => sesiones.some((s) => s.rutinaId === r.id));

  function pintarFiltros() {
    const activos = ['rutina', 'tipo', 'musculo', 'mes'].filter((k) => filtro[k]).length;
    boton.textContent = activos ? `Filtros (${activos})` : 'Filtros';
    boton.classList.toggle('activo', activos > 0);
    plegable.replaceChildren(); anadir(plegable,
      h('div', { class: 'fila-filtros' },
        opcion('mes', [['', 'Cualquier mes'], ...meses.map((m) => [m, nombreMes(m)])], 'Mes'),
        rutinasUsadas.length > 0 && opcion('rutina', [['', 'Cualquier rutina'], ...rutinasUsadas.map((r) => [r.id, r.nombre])], 'Rutina'),
        opcion('tipo', [['', 'Cualquier tipo'], ...Object.entries(TIPOS_EJERCICIO)], 'Tipo de entrenamiento'),
        opcion('musculo', [['', 'Cualquier músculo'], ...ORDEN_MUSCULOS.map((m) => [m, MUSCULOS[m].nombre])], 'Músculo')),
      activos > 0 && h('button', { type: 'button', class: 'boton enlace', onclick: () => {
        Object.assign(filtro, { rutina: '', tipo: '', musculo: '', mes: '' }); cambio();
      } }, 'Quitar filtros'));
  }

  function pintarLista() {
    const vistas = sesiones.filter((s) => pasaFiltro(d, s));
    lista.replaceChildren(...(vistas.length
      ? vistas.map((s) => resumenSesion(d, s))
      : [h('p', { class: 'suave' }, sesiones.length ? 'Ningún entrenamiento coincide.' : 'Todavía no hay entrenamientos registrados.')]));
  }
  pintarFiltros();
  pintarLista();

  anadir(contenedor,
    // Sin título: la pestaña de abajo ya dice «Historial».
    h('div', { class: 'cabecera-vista sin-titulo' },
      h('button', { class: 'boton secundario', onclick: anadirPasado }, '+ De otro día')),
    sesiones.length > 3 && h('div', { class: 'filtros-ejercicios' },
      h('div', { class: 'fila-buscador' },
        h('input', { type: 'search', class: 'buscador', placeholder: 'Buscar: día, rutina, ejercicio…', value: filtro.texto,
          oninput: (e) => { filtro.texto = e.target.value; pintarLista(); } }),
        boton),
      plegable),
    lista,
    papelera.length > 0 && h('details', { class: 'papelera' },
      h('summary', {}, `Papelera (${papelera.length})`),
      h('p', { class: 'nota' }, 'Los entrenamientos borrados se quedan aquí. Ábrelos para recuperarlos.'),
      papelera.map((s) => resumenSesion(d, s))),
    tira);
}

// ---------------------------------------------------------------------------
// Calendario del mes con los días entrenados y la racha de semanas (como en
// Lyfta). Se pasa de mes con las flechas; tocar un día entrenado lo abre.
// ---------------------------------------------------------------------------

let mesCalendario = null;     // «YYYY-MM» que se ve; null = el de hoy
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const iso = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
const lunesDe = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate() - ((f.getDay() + 6) % 7));

// Semanas seguidas con al menos un entrenamiento, contando esta (si ya has
// entrenado) o la anterior.
export function rachaDeSemanas(fechas) {
  const semanas = new Set([...fechas].map((x) => iso(lunesDe(new Date(`${x}T12:00:00`)))));
  let lunes = lunesDe(new Date());
  if (!semanas.has(iso(lunes))) lunes = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7);
  let n = 0;
  while (semanas.has(iso(lunes))) { n += 1; lunes = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7); }
  return n;
}

function vistaCalendario(d) {
  const caja = h('div', {});
  const sesiones = d.sesiones.filter((s) => !s.borrada && !s.tutorial && s.ejercicios.some((e) => e.series.some((x) => x.hecha)));
  const porDia = new Map();
  for (const s of sesiones) porDia.set(s.fecha, [...(porDia.get(s.fecha) ?? []), s]);
  const racha = rachaDeSemanas(porDia.keys());
  const pintar = () => {
    const hoy = new Date();
    const [a, m] = (mesCalendario ?? iso(hoy).slice(0, 7)).split('-').map(Number);
    const primero = new Date(a, m - 1, 1);
    const inicio = lunesDe(primero);
    const am = `${a}-${String(m).padStart(2, '0')}`;
    const delMes = sesiones.filter((s) => s.fecha.startsWith(am)).length;
    const filas = [];
    for (let lunes = inicio; lunes.getMonth() === m - 1 || lunes < primero; lunes = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7)) {
      const dias = [...Array(7)].map((_, k) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + k));
      const entrenada = dias.some((x) => porDia.has(iso(x)));
      filas.push(h('div', { class: 'semana-calendario' },
        dias.map((x) => {
          const clave = iso(x);
          const del = porDia.get(clave);
          const fuera = x.getMonth() !== m - 1;
          const clase = `dia-calendario${fuera ? ' fuera' : ''}${del ? ' entrenado' : ''}${clave === iso(hoy) ? ' hoy' : ''}`;
          return del
            ? h('a', { class: clase, href: `#/sesion/${del.at(-1).id}`, 'aria-label': `${fechaLarga(clave)}: ${del.length} ${del.length === 1 ? 'entrenamiento' : 'entrenamientos'}` }, String(x.getDate()))
            : h('span', { class: clase }, String(x.getDate()));
        }),
        h('span', { class: `racha-semana${entrenada ? ' si' : ''}`, 'aria-label': entrenada ? 'Semana entrenada' : 'Semana sin entrenar' }, entrenada ? '✓' : '')));
      if (filas.length > 6) break;
    }
    const mover = (k) => { const f = new Date(a, m - 1 + k, 1); mesCalendario = iso(f).slice(0, 7); pintar(); };
    caja.replaceChildren(
      h('div', { class: 'cifras-calendario' },
        h('div', { class: 'tarjeta cifra-calendario' }, h('strong', {}, String(racha)), h('span', {}, racha === 1 ? 'semana seguida entrenando' : 'semanas seguidas entrenando')),
        h('div', { class: 'tarjeta cifra-calendario' }, h('strong', {}, String(delMes)), h('span', {}, delMes === 1 ? 'entrenamiento este mes' : 'entrenamientos este mes'))),
      h('section', { class: 'tarjeta calendario' },
        h('div', { class: 'cabecera-calendario' },
          h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Mes anterior', onclick: () => mover(-1) }, '‹'),
          h('h2', {}, `${MESES[m - 1].charAt(0).toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`),
          h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Mes siguiente', disabled: am >= iso(hoy).slice(0, 7), onclick: () => mover(1) }, '›')),
        h('div', { class: 'semana-calendario cabecera' }, DIAS_SEMANA.map((x) => h('span', {}, x)), h('span', { 'aria-hidden': 'true' }, '')),
        filas,
        h('p', { class: 'nota centrado' }, 'Toca un día marcado para abrir ese entrenamiento. A la derecha, las semanas en las que entrenaste.')));
  };
  pintar();
  return caja;
}
