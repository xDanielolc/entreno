// Punto de entrada: arranque, navegación y barra de estado.

import * as local from './almacen-local.js';
import * as estado from './estado.js';
import { cargarCreditos } from './imagenes.js';
import { sincronizar, situacionActual } from './sincronizacion.js';
import { aviso, h } from './ui.js';
import { textoSituacion, vistaAjustes } from './vistas/ajustes.js';
import { vistaBienvenida } from './vistas/bienvenida.js';
import { vistaEjercicios, vistaFormularioEjercicio } from './vistas/ejercicios.js';
import { vistaHistorial } from './vistas/historial.js';
import { vistaInicio } from './vistas/inicio.js';
import { vistaCuerpo } from './vistas/cuerpo.js';
import { vistaFormularioRutina, vistaRutinas } from './vistas/rutinas.js';
import { vistaSesion } from './vistas/sesion.js';
import { pintarGuia } from './vistas/tutorial.js';
import { vistaAprender } from './vistas/aprender.js';
import { aplicarTema } from './vistas/cuestionario.js';

// La última pantalla se recuerda: si el móvil cierra la app en mitad de un
// entrenamiento, al volver se abre donde estabas.
const CLAVE_RUTA = 'entreno-ultima-ruta';
function recordarRuta() {
  try { localStorage.setItem(CLAVE_RUTA, location.hash); } catch { /* nada */ }
}
function rutaRecordada() {
  try { return localStorage.getItem(CLAVE_RUTA) || ''; } catch { return ''; }
}

// Rutas: el fragmento de la dirección (#/…) decide qué pantalla se ve.
const RUTAS = [
  { patron: /^#?\/?$/, vista: vistaInicio, pestana: 'inicio' },
  { patron: /^#\/ejercicios$/, vista: vistaEjercicios, pestana: 'ejercicios' },
  { patron: /^#\/ejercicio\/nuevo\/para\/([\w-]+)$/, pestana: 'inicio', params: ['paraSesion'],
    vista: (contenedor, { paraSesion }) => vistaFormularioEjercicio(contenedor, { id: 'nuevo', paraSesion }) },
  { patron: /^#\/ejercicio\/([\w-]+)$/, vista: vistaFormularioEjercicio, pestana: 'ejercicios', params: ['id'] },
  { patron: /^#\/sesion\/([\w-]+)$/, vista: vistaSesion, pestana: 'inicio', params: ['id'] },
  { patron: /^#\/cuerpo$/, vista: vistaCuerpo, pestana: 'cuerpo' },
  { patron: /^#\/rutinas$/, vista: vistaRutinas, pestana: 'inicio' },
  { patron: /^#\/rutina\/([\w-]+)$/, vista: vistaFormularioRutina, pestana: 'inicio', params: ['id'] },
  { patron: /^#\/historial$/, vista: vistaHistorial, pestana: 'historial' },
  { patron: /^#\/ajustes$/, vista: vistaAjustes, pestana: 'ajustes' },
  { patron: /^#\/aprender$/, vista: vistaAprender, pestana: 'ajustes' },
];

const PESTANAS = [
  { id: 'inicio', texto: 'Hoy', icono: '🏠', href: '#/' },
  { id: 'cuerpo', texto: 'Cuerpo', icono: '🧍', href: '#/cuerpo' },
  { id: 'ejercicios', texto: 'Ejercicios', icono: '🏋️', href: '#/ejercicios' },
  { id: 'historial', texto: 'Historial', icono: '📅', href: '#/historial' },
  { id: 'ajustes', texto: 'Ajustes', icono: '⚙️', href: '#/ajustes' },
];

const principal = document.getElementById('vista');
const navegacion = document.getElementById('navegacion');
const indicador = document.getElementById('estado-sincronizacion');

function renderizar() {
  const scroll = window.scrollY;
  const mismaRuta = renderizar.ultimaRuta === location.hash;
  renderizar.ultimaRuta = location.hash;
  principal.replaceChildren();

  if (!estado.usuario()) {
    navegacion.hidden = true;
    indicador.hidden = true;
    vistaBienvenida(principal);
    return;
  }
  navegacion.hidden = false;
  indicador.hidden = false;

  const ruta = RUTAS.find((r) => r.patron.test(location.hash)) ?? RUTAS[0];
  const coincidencia = location.hash.match(ruta.patron) || [];
  const params = Object.fromEntries((ruta.params || []).map((nombre, i) => [nombre, coincidencia[i + 1]]));

  try {
    ruta.vista(principal, params);
  } catch (e) {
    console.error(e);
    principal.append(h('p', { class: 'tarjeta' }, `Algo ha fallado al mostrar esta pantalla: ${e.message}`));
  }
  pintarNavegacion(ruta.pestana);
  pintarIndicador();
  pintarBandaEntreno();
  pintarGuia();
  aplicarTema(estado.datos()?.perfil?.tema);
  recordarRuta();
  window.scrollTo(0, mismaRuta ? scroll : 0);
}

// Si hay un entrenamiento a medias y estás en otra pantalla, una banda fija
// arriba te lleva de vuelta: el entrenamiento no se pierde por cambiar de
// pestaña.
function pintarBandaEntreno() {
  document.querySelector('.banda-entreno')?.remove();
  const d = estado.datos();
  const enCurso = d?.sesiones?.find((s) => s.estado === 'en-curso' && !s.borrada && !s.tutorial);
  if (!enCurso || location.hash === `#/sesion/${enCurso.id}`) return;
  const banda = h('a', { class: 'banda-entreno', href: `#/sesion/${enCurso.id}` },
    h('span', {}, '⏱ Entrenamiento en curso'),
    h('strong', {}, 'Volver'));
  document.querySelector('.barra-superior').after(banda);
}

function pintarNavegacion(activa) {
  navegacion.replaceChildren(...PESTANAS.map((p) => h('a', {
    href: p.href, class: p.id === activa ? 'activa' : '', 'aria-current': p.id === activa ? 'page' : null,
  }, h('span', { 'aria-hidden': 'true' }, p.icono), h('span', {}, p.texto))));
}

function pintarIndicador() {
  const { situacion, detalle } = situacionActual();
  const pulsable = ['desconectada', 'pendiente', 'error'].includes(situacion);
  indicador.className = `indicador ${situacion}`;
  indicador.textContent = situacion === 'desconectada' ? 'Sin guardar en Google Drive: toca para conectar' : textoSituacion(situacion);
  indicador.title = detalle || '';
  indicador.disabled = !pulsable;
}

indicador.addEventListener('click', () => sincronizar({ interactivo: true }));

estado.suscribir((motivo) => {
  if (motivo === 'sincronizacion') {
    pintarIndicador();
    const { detalle } = situacionActual();
    if (detalle) aviso(detalle, { tipo: 'info', ms: 5000 });
  } else if (motivo !== 'tecleo') {
    renderizar();
  }
});

window.addEventListener('hashchange', renderizar);

async function arrancar() {
  registrarServiceWorker();
  cargarCreditos().then(() => estado.emitir('vista'));
  const ultimo = local.ultimoUsuario();
  if (ultimo) {
    try {
      await estado.abrirUsuario(ultimo);
    } catch (e) {
      console.error(e);
      aviso(`No se han podido abrir tus datos: ${e.message}`, { tipo: 'error', ms: 8000 });
    }
  }
  // Sin dirección concreta, vuelve a la última pantalla si era un
  // entrenamiento en curso.
  if (estado.usuario() && (location.hash === '' || location.hash === '#' || location.hash === '#/')) {
    const anterior = rutaRecordada();
    const id = anterior.match(/^#\/sesion\/([\w-]+)$/)?.[1];
    const sesion = id && estado.datos().sesiones.find((s) => s.id === id && s.estado === 'en-curso' && !s.borrada);
    if (sesion) location.hash = anterior;
  }
  renderizar();
  if (estado.usuario()) sincronizar();
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker no registrado', e));
  // Cuando llega una versión nueva del código, se recarga una sola vez para
  // usarla, salvo que se esté a mitad de entrenamiento escribiendo.
  // En la primera visita no hay versión anterior y no hace falta recargar.
  const habiaVersionAnterior = Boolean(navigator.serviceWorker.controller);
  let recargando = false;
  // Nunca se recarga sola con la pantalla a la vista (cortaba el acceso de
  // Google a medias): si está en segundo plano se recarga; si no, avisa.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !habiaVersionAnterior) return;
    recargando = true;
    estado.guardarYa();
    if (document.visibilityState === 'hidden') location.reload();
    else aviso('Hay una versión nueva de la app. Al actualizar no pierdes nada.', { ms: 60000, accion: { texto: 'Actualizar', fn: () => location.reload() } });
  });
}

arrancar();
