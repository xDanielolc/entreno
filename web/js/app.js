// Punto de entrada: arranque, navegación y barra de estado.

import { icono } from './iconos.js';
import * as local from './almacen-local.js';
import * as estado from './estado.js';
import { cargarCreditos, imagenDeEjercicio } from './imagenes.js';
import { MUSCULOS, archivoCapa } from './musculos.js';
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
import { vistaPruebaColores } from './vistas/prueba-colores.js';
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
  { patron: /^#\/aprender$/, vista: vistaAprender, pestana: 'aprender' },
  { patron: /^#\/prueba-colores$/, vista: vistaPruebaColores, pestana: 'ajustes' },
];

const PESTANAS = [
  { id: 'inicio', texto: 'Hoy', href: '#/' },
  { id: 'cuerpo', texto: 'Cuerpo', href: '#/cuerpo' },
  { id: 'ejercicios', texto: 'Ejercicios', href: '#/ejercicios' },
  { id: 'historial', texto: 'Historial', href: '#/historial' },
  { id: 'aprender', texto: 'Aprender', href: '#/aprender' },
  { id: 'ajustes', texto: 'Ajustes', href: '#/ajustes' },
];

document.querySelector('.marca-app')?.prepend(icono('marca'));
// La presentación se quita sola al acabar (o antes, con un toque).
{
  const presentacion = document.getElementById('presentacion');
  if (presentacion) {
    const quitar = () => presentacion.remove();
    presentacion.addEventListener('click', quitar, { once: true });
    setTimeout(() => presentacion.querySelector('.pesa')?.classList.add('quieta'), 1780);
    setTimeout(quitar, 2800);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) sonidosPresentacion();
  }
}

// Los botes y el golpe de la caja, sintetizados (sin archivos). El navegador
// solo deja sonar si ya has tocado la app alguna vez; si no, se queda mudo.
function sonidosPresentacion() {
  let audio;
  try { audio = new AudioContext(); } catch { return; }
  const bote = (t, tono) => {
    const o = audio.createOscillator(); const v = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(tono * 0.6, audio.currentTime + t);
    o.frequency.exponentialRampToValueAtTime(tono, audio.currentTime + t + 0.06);
    o.frequency.exponentialRampToValueAtTime(tono * 0.8, audio.currentTime + t + 0.16);
    v.gain.setValueAtTime(0.0001, audio.currentTime + t);
    v.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + t + 0.015);
    v.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.18);
    o.connect(v).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.2);
  };
  const golpe = (t) => {
    const o = audio.createOscillator(); const v = audio.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(150, audio.currentTime + t);
    o.frequency.exponentialRampToValueAtTime(55, audio.currentTime + t + 0.18);
    v.gain.setValueAtTime(0.0001, audio.currentTime + t);
    v.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + t + 0.01);
    v.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.25);
    o.connect(v).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.3);
  };
  const sonar = () => {
    if (audio.state !== 'running') return;
    // Al compás de la animación, que empezó al pintarse la página.
    const ya = (document.querySelector('#presentacion .pesa')?.getAnimations?.()[0]?.currentTime ?? 0) / 1000;
    const en = (t, fn, ...x) => { if (t - ya >= 0) fn(t - ya, ...x); };
    en(0.28, bote, 520); en(0.6, bote, 600); en(0.88, bote, 680); en(1.44, golpe);
    setTimeout(() => audio.close(), 2500);
  };
  if (audio.state === 'running') sonar();
  else audio.resume().then(sonar).catch(() => {});
  setTimeout(() => { if (audio.state !== 'running') audio.close().catch(() => {}); }, 400);
}
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
  if (['ejercicios', 'historial'].includes(ruta.pestana)) recordarEnPestana(ruta.pestana, location.hash || '#/');
  pintarNavegacion(ruta.pestana);
  pintarIndicador();
  pintarBandaEntreno();
  pintarGuia();
  aplicarTema(estado.datos()?.perfil?.tema);
  recordarRuta();
  window.scrollTo(0, mismaRuta ? scroll : 0);
}

// Flecha para volver arriba: abajo a la derecha, a mano del pulgar y por
// encima de las pestañas. Solo sale al deslizar hacia arriba, cuando ya has
// bajado bastante, y se va a los dos segundos: así no tapa botones mientras
// apuntas.
const flechaArriba = h('button', { type: 'button', class: 'volver-arriba', hidden: true, 'aria-label': 'Volver arriba',
  onclick: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); flechaArriba.hidden = true; } }, '↑');
document.body.append(flechaArriba);
let ultimoScroll = 0;
let temporizadorFlecha = null;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const subiendo = y < ultimoScroll - 4;
  ultimoScroll = y;
  if (y < 600) { flechaArriba.hidden = true; return; }
  if (!subiendo) return;
  flechaArriba.hidden = false;
  clearTimeout(temporizadorFlecha);
  temporizadorFlecha = setTimeout(() => { flechaArriba.hidden = true; }, 2000);
}, { passive: true });

// Si hay un entrenamiento a medias y estás en otra pantalla, una banda fija
// arriba te lleva de vuelta: el entrenamiento no se pierde por cambiar de
// pestaña.
function pintarBandaEntreno() {
  document.querySelector('.banda-entreno')?.remove();
  const d = estado.datos();
  const enCurso = d?.sesiones?.find((s) => s.estado === 'en-curso' && !s.borrada && !s.tutorial);
  if (!enCurso || location.hash === `#/sesion/${enCurso.id}`) return;
  const banda = h('a', { class: 'banda-entreno', href: `#/sesion/${enCurso.id}` },
    h('span', { class: 'con-icono' }, icono('reloj'), 'Entrenamiento en curso'),
    h('strong', {}, 'Volver'));
  document.querySelector('.barra-superior').after(banda);
}

// Cada pestaña recuerda dónde la dejaste: si sales de un ejercicio a medias
// y vuelves a «Ejercicios», sigues en él. Tocar la pestaña en la que ya
// estás te lleva a su inicio.
const CLAVE_PESTANAS = 'entreno-ultima-por-pestana';
function ultimasPorPestana() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PESTANAS) || '{}'); } catch { return {}; }
}
function recordarEnPestana(pestana, hash) {
  try { localStorage.setItem(CLAVE_PESTANAS, JSON.stringify({ ...ultimasPorPestana(), [pestana]: hash })); } catch { /* nada */ }
}

function pintarNavegacion(activa) {
  const ultimas = ultimasPorPestana();
  navegacion.replaceChildren(...PESTANAS.map((p) => h('a', {
    href: p.id === activa ? p.href : (ultimas[p.id] || p.href),
    class: p.id === activa ? 'activa' : '', 'aria-current': p.id === activa ? 'page' : null,
  }, icono(p.id), h('span', {}, p.texto))));
}

function pintarIndicador() {
  const { situacion, detalle } = situacionActual();
  const pulsable = ['desconectada', 'pendiente', 'error'].includes(situacion);
  indicador.className = `indicador ${situacion}`;
  // Sin pase de Google no es un error: todo está guardado en el móvil.
  indicador.textContent = ['desconectada', 'pendiente'].includes(situacion) ? 'Sin subir · toca para subir'
    : textoSituacion(situacion);
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

import('./google-auth.js').then((m) => m.precargarGoogle());
arrancar();

// Imágenes sin conexión: al abrir la app con internet se guardan las de tus
// ejercicios y las capas del cuerpo (el service worker las conserva entre
// versiones). Las demás del catálogo se guardan en cuanto se ven una vez.
async function guardarImagenesParaSinConexion() {
  if (!navigator.onLine || !('caches' in window)) return;
  try {
    await cargarCreditos();
    const d = estado.datos();
    const mios = new Set((d?.ejercicios ?? []).filter((e) => !e.borrado).map((e) => imagenDeEjercicio(e)?.archivo).filter(Boolean));
    const capas = Object.entries(MUSCULOS).flatMap(([clave, m]) => m.vistas.map((v) => archivoCapa(clave, v)));
    const cuerpo = ['imagenes/musculos/cuerpo-delante.svg', 'imagenes/musculos/cuerpo-detras.svg'];
    // El mismo nombre que CACHE_IMAGENES en sw.js: si no, el service worker lo borra.
    const cache = await caches.open('entreno-imagenes-7');
    for (const ruta of [...cuerpo, ...capas, ...mios]) {
      if (!(await cache.match(ruta, { ignoreSearch: true }))) {
        const r = await fetch(ruta).catch(() => null);
        if (r?.ok) await cache.put(ruta, r);
      }
    }
  } catch { /* sin almacenamiento: se verán con conexión */ }
}
setTimeout(guardarImagenesParaSinConexion, 5000);
