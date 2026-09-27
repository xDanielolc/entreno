import * as estado from '../estado.js';
import { sedeInicial } from '../sedes.js';
import { anadir, fechaLarga, h, hoyISO, modal, nuevoId, selector } from '../ui.js';
import { TIPOS_EJERCICIO, normalizar, tipoDeEjercicio } from '../catalogo.js';
import { MUSCULOS, ORDEN_MUSCULOS } from '../musculos.js';

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

export function resumenSesion(datos, sesion) {
  const rutina = datos.rutinas.find((r) => r.id === sesion.rutinaId);
  const dia = rutina?.dias.find((x) => x.id === sesion.diaRutinaId);
  const nombres = sesion.ejercicios
    .map((e) => datos.ejercicios.find((x) => x.id === e.ejercicioId)?.nombre ?? 'Ejercicio borrado');
  const series = sesion.ejercicios.reduce((n, e) => n + e.series.filter((s) => s.hecha).length, 0);
  return h('a', { class: 'tarjeta fila-enlace', href: `#/sesion/${sesion.id}` },
    h('div', {},
      h('strong', {}, fechaLarga(sesion.fecha)),
      sesion.estado === 'en-curso' && h('span', { class: 'etiqueta' }, 'En curso'),
      dia && h('div', {}, dia.nombre),
      h('div', { class: 'suave' }, nombres.length ? nombres.join(', ') : 'Sin ejercicios')),
    h('span', { class: 'contador' }, `${series} ${series === 1 ? 'serie' : 'series'}`));
}

export function masRecienteAntes(a, b) {
  return (b.fecha + (b.inicio || '')).localeCompare(a.fecha + (a.inicio || ''));
}

export function vistaHistorial(contenedor) {
  const d = estado.datos();
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
  const plegable = h('details', { class: 'filtros-plegables', open: filtrosAbiertos,
    ontoggle: (e) => { filtrosAbiertos = e.target.open; } });
  const cambio = () => { pintarFiltros(); pintarLista(); };
  const opcion = (clave, opciones, titulo) => selector(opciones, filtro[clave], (v) => { filtro[clave] = v; cambio(); },
    { titulo, lista: true });
  const meses = [...new Set(sesiones.map((s) => s.fecha.slice(0, 7)))];
  const rutinasUsadas = d.rutinas.filter((r) => sesiones.some((s) => s.rutinaId === r.id));

  function pintarFiltros() {
    const activos = ['rutina', 'tipo', 'musculo', 'mes'].filter((k) => filtro[k]).length;
    plegable.replaceChildren(
      h('summary', {}, activos ? `Filtros (${activos})` : 'Filtros'),
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
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Historial'),
      h('button', { class: 'boton secundario', onclick: anadirPasado }, '+ De otro día')),
    sesiones.length > 3 && h('div', { class: 'filtros-ejercicios' },
      h('input', { type: 'search', class: 'buscador', placeholder: 'Buscar: día, rutina, ejercicio…', value: filtro.texto,
        oninput: (e) => { filtro.texto = e.target.value; pintarLista(); } }),
      plegable),
    lista,
    papelera.length > 0 && h('details', { class: 'papelera' },
      h('summary', {}, `Papelera (${papelera.length})`),
      h('p', { class: 'nota' }, 'Los entrenamientos borrados se quedan aquí. Ábrelos para recuperarlos.'),
      papelera.map((s) => resumenSesion(d, s))));
}
