// Cronómetro de descanso entre series.
//
// Arranca solo al apuntar una serie y se ve en la pantalla de entrenamiento.
// Hay dos clases de descanso:
//   · entre series: el de Ajustes (2 minutos por defecto);
//   · dentro de una serie con tramos: el justo para cambiar el peso en un
//     serie descendente o para recuperar el aliento en rest-pause;
//   · en miorrepeticiones, en vez de reloj, una guía de respiración: un
//     círculo que crece al coger aire y mengua al soltarlo (3 respiraciones
//     de 4 + 4 segundos, por defecto).
// Es una cuenta atrás por hora de fin, no por sumar segundos: así sigue
// siendo correcta aunque el móvil bloquee la pantalla.

import * as estado from '../estado.js';
import { aviso, h } from '../ui.js';

let finMs = null;
let intervalo = null;
let motivo = 'de descanso';
let totalSeg = 0;          // lo que duraba este descanso al arrancar
let alargadoSeg = 0;       // cuánto se le ha añadido con «+1 min»
let ofrecido = false;      // ya se ha ofrecido cambiar el ajuste en esta sesión
let respiracion = null;   // { veces, inspirar, espirar, inicioMs } mientras se respira
const cajas = new Set();

export const RESPIRACION_POR_DEFECTO = { veces: 3, inspirar: 4, espirar: 4 };

// Guía de respiración entre miniseries de miorrepeticiones.
export function arrancarRespiracion(perfil) {
  const r = { ...RESPIRACION_POR_DEFECTO, ...perfil.respiracion };
  const total = r.veces * (r.inspirar + r.espirar);
  if (!total) return;
  arrancarDescanso(total, { texto: 'respira' });
  respiracion = { ...r, inicioMs: Date.now(), fase: null };
  clearInterval(intervalo);
  intervalo = setInterval(pintar, 250);
  pintar();
}

// Descanso que toca dentro de una serie, según su técnica.
export const DESCANSO_TRAMOS_POR_DEFECTO = { 'drop-set': 30, 'rest-pause': 20, miorepeticiones: 20 };
// Segundos entre estiramientos (perfil.descansoEstiramientos si se cambia):
// solo para cambiar de postura (antes 20; Dan preguntó por qué tanto).
export const DESCANSO_ESTIRAMIENTOS_POR_DEFECTO = 10;

export function descansoDeTramo(perfil, tecnica) {
  return perfil.descansoTramos?.[tecnica] ?? DESCANSO_TRAMOS_POR_DEFECTO[tecnica] ?? 20;
}

// El ejercicio del descanso entre series: si lo saltas o lo alargas, la
// propuesta de cambiarlo es para ese ejercicio (no para todos).
let ejercicioDescanso = null;

export function arrancarDescanso(segundos, { texto = 'de descanso', ejercicio = null } = {}) {
  if (!segundos) return;
  ejercicioDescanso = ejercicio;
  respiracion = null;
  motivo = texto;
  totalSeg = segundos;
  alargadoSeg = 0;
  finMs = Date.now() + segundos * 1000;
  pintar();
  clearInterval(intervalo);
  intervalo = setInterval(pintar, 1000);
  if (texto === 'de descanso') notificar(`Descanso: ${formatear(segundos)}`, 'Te aviso cuando acabe.', { silencio: true });
}

export function pararDescanso() {
  finMs = null;
  respiracion = null;
  clearInterval(intervalo);
  intervalo = null;
  pintar();
  cerrarNotificacion();
}

// ---------------------------------------------------------------------------
// Notificaciones del descanso: con el permiso dado y el ajuste activado, una
// notificación (la misma, que se actualiza) dice cuánto queda y, al acabar,
// avisa y hace vibrar el móvil aunque la app esté detrás. Van por el service
// worker, que es como el móvil deja enseñarlas desde una app instalada.
// ---------------------------------------------------------------------------
export const puedeNotificar = () => 'Notification' in window && 'serviceWorker' in navigator;
export const notificacionesActivas = () => puedeNotificar() && Notification.permission === 'granted'
  && estado.datos()?.perfil?.avisarDescanso === true;

// Pide el permiso (hay que llamarlo desde un toque) y deja el ajuste puesto.
export async function activarNotificaciones() {
  if (!puedeNotificar()) { aviso('Este navegador no admite notificaciones.', { tipo: 'error' }); return false; }
  const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permiso !== 'granted') {
    const quien = enMovil() ? 'El móvil' : 'El navegador';
    aviso(permiso === 'denied'
      ? `${quien} tiene bloqueados los avisos de esta página. Se cambia en los ajustes del navegador (el candado junto a la dirección).`
      : `${quien} no ha dado permiso para avisar. Puedes volver a intentarlo desde Ajustes → Descansos.`, { tipo: 'error' });
    return false;
  }
  estado.cambiar((x) => { x.perfil.avisarDescanso = true; });
  aviso('Te avisaré con una notificación (y vibración) cuando acabe cada descanso.');
  return true;
}

// Al entrenar, mientras no se haya contestado: «¿Te aviso cuando acabe cada
// descanso?». Con la pantalla apagada, la app no puede vibrar sola: hace
// falta el permiso de notificaciones.
// El permiso es de cada móvil, pero el ajuste viaja con tu cuenta: si en este
// móvil falta el permiso, se vuelve a preguntar aquí aunque el ajuste diga «sí».
// En el ordenador no se pregunta: los avisos con vibración son cosa del móvil
// (Dan veía la tarjeta y el error en el ordenador; en el móvil, bien).
const enMovil = () => { try { return matchMedia('(pointer: coarse)').matches; } catch { return true; } };
let preguntaDescartada = false;

export function preguntaAvisos() {
  const perfil = estado.datos()?.perfil;
  if (!enMovil() || preguntaDescartada || !puedeNotificar() || perfil?.avisarDescanso === false || Notification.permission !== 'default') return null;
  const caja = h('div', { class: 'tarjeta pregunta-avisos' },
    h('p', {}, h('strong', {}, '¿Te aviso cuando acabe cada descanso?'),
      h('small', { class: 'bloque suave' }, 'Con una notificación que vibra, aunque tengas el móvil bloqueado. Al tocar «¡Avísame!», el móvil te pide permiso: acéptalo.')),
    h('div', { class: 'fila-botones' },
      h('button', { type: 'button', class: 'boton secundario', onclick: () => { estado.cambiar((x) => { x.perfil.avisarDescanso = false; }); caja.remove(); } }, 'Sin avisos, gracias'),
      // Si el permiso no llega, la tarjeta se va hasta que vuelvas a abrir la app: no insiste.
      h('button', { type: 'button', class: 'boton', onclick: async () => { await activarNotificaciones(); preguntaDescartada = true; caja.remove(); } }, '¡Avísame!')));
  return caja;
}

async function notificar(titulo, cuerpo, { silencio = false, vibrar = null } = {}) {
  if (!notificacionesActivas()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(titulo, {
      body: cuerpo, tag: 'descanso', renotify: !silencio, silent: silencio, icon: './iconos/icono-v2-192.png', badge: './iconos/icono-v2-192.png',
      vibrate: vibrar ?? (silencio ? [] : [700, 250, 700, 250, 1000, 250, 1000]), requireInteraction: !silencio, data: { url: location.href },
    });
  } catch { /* sin service worker (navegador de escritorio sin instalar): nada */ }
}

async function cerrarNotificacion() {
  if (!puedeNotificar()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    for (const n of await reg.getNotifications({ tag: 'descanso' })) n.close();
  } catch { /* nada */ }
}

function restante() {
  return finMs ? Math.max(0, Math.round((finMs - Date.now()) / 1000)) : 0;
}

function pintar() {
  const segundos = restante();
  if (finMs && segundos === 0) {
    clearInterval(intervalo);
    intervalo = null;
    // Con la app delante, su propio sonido y la vibración; la notificación
    // (con el sonido del móvil) solo si no se ve la app o no ha podido vibrar.
    const vibro = avisar();
    if (entreSeries() && (document.visibilityState !== 'visible' || !vibro)) notificar('¡Descanso terminado!', 'A por la siguiente serie.');
    // Si lo habías cambiado con −30 s / +30 s, al acabar se ofrece quedárselo (Dan: «solo me
    // ofrece cambiar el descanso si lo salto, pero no si lo modifico»).
    if (entreSeries() && totalSeg && Math.abs(alargadoSeg) >= 15) ofrecerCambiado(totalSeg + alargadoSeg);
    // A los 3 s de acabar, la barra se va sola (Dan: «es molesto tenerle que dar
    // a Saltar para que me deje de seguir»). La notificación se queda.
    const fin = finMs;
    setTimeout(() => { if (finMs === fin && restante() === 0) { finMs = null; respiracion = null; pintar(); } }, 3000);
  } else if (finMs && entreSeries() && segundos % 15 === 0) {
    // Cada 15 s se actualiza la misma notificación con lo que queda.
    notificar(`Descanso: ${formatear(segundos)}`, 'Te aviso cuando acabe.', { silencio: true });
  }
  for (const caja of cajas) {
    if (!caja.isConnected) { cajas.delete(caja); continue; }
    caja.hidden = !finMs;
    if (!finMs) continue;
    caja.querySelector('.descanso-tiempo').textContent = formatear(segundos);
    caja.querySelector('.descanso-motivo').textContent = motivo;
    caja.classList.toggle('acabado', segundos === 0);
    pintarRespiracion(caja);
  }
}

// Qué toca ahora: coger aire o soltarlo, y cuántas van.
function pintarRespiracion(caja) {
  const guia = caja.querySelector('.respira');
  guia.hidden = !respiracion || restante() === 0;
  if (guia.hidden) return;
  const ciclo = respiracion.inspirar + respiracion.espirar;
  const pasado = (Date.now() - respiracion.inicioMs) / 1000;
  const n = Math.min(respiracion.veces, Math.floor(pasado / ciclo) + 1);
  const dentro = pasado % ciclo;
  const inspira = dentro < respiracion.inspirar;
  const fase = `${n}-${inspira}`;
  const circulo = guia.querySelector('.circulo-respira');
  if (guia.dataset.fase !== fase) {
    guia.dataset.fase = fase;
    const dura = inspira ? respiracion.inspirar - dentro : ciclo - dentro;
    circulo.style.transition = `transform ${Math.max(0.2, dura)}s ease-in-out`;
    circulo.style.transform = `scale(${inspira ? 1 : 0.45})`;
  }
  guia.querySelector('.texto-respira').textContent =
    `${inspira ? 'Coge aire' : 'Suéltalo'} · respiración ${n} de ${respiracion.veces}`;
}

function formatear(segundos) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

// Para comprobar que el móvil vibra: ahora mismo y, si hay avisos, con una
// notificación a los 10 s (da tiempo a bloquear la pantalla).
export function probarAviso() {
  avisar();
  if (notificacionesActivas()) setTimeout(() => notificar('Prueba del aviso', 'Así te avisa la app cuando acaba un descanso.'), 10_000);
}

// El sonido propio del fin del descanso (tres notas que suben, como un
// «¡vamos!»), sin archivos de sonido, y una vibración si el móvil puede.
// Devuelve si el móvil aceptó vibrar.
function avisar() {
  let vibro = false;
  try { vibro = Boolean(navigator.vibrate?.([800, 200, 800, 200, 1200])); } catch { /* nada */ }
  try {
    const audio = new AudioContext();
    [[660, 0], [880, 0.16], [1320, 0.32]].forEach(([frecuencia, desde], k) => {
      const osc = audio.createOscillator();
      const vol = audio.createGain();
      const t = audio.currentTime + desde;
      const dura = k === 2 ? 0.55 : 0.14;
      osc.type = 'triangle';
      osc.frequency.value = frecuencia;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.3, t + 0.015);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + dura);
      osc.connect(vol).connect(audio.destination);
      osc.start(t);
      osc.stop(t + dura + 0.02);
    });
    setTimeout(() => audio.close(), 1500);
  } catch { /* si el navegador no deja sonar, no pasa nada */ }
  return vibro;
}

// Saltar o alargar el descanso entre series ofrece cambiar el ajuste desde
// aquí mismo, sin ir a Ajustes. Solo una vez por sesión de la app, y solo si
// la diferencia es de verdad (no por 10 segundos).
const entreSeries = () => motivo === 'de descanso' && !respiracion;

function proponer(segundos, texto) {
  const ej = ejercicioDescanso;
  const clave = `${ej?.id ?? 'todos'}-${segundos}`;
  if (ofrecido === clave) return;
  ofrecido = clave;
  // Se guarda en ese tipo de serie (la máxima, las de bajada…), no en todo el
  // ejercicio: Dan cambia el de la máxima y el de las bajadas por separado.
  const donde = ej ? `${ej.etiqueta ? `${ej.etiqueta} de ` : ''}${ej.nombre}` : null;
  aviso(ej ? texto.replace('el descanso entre series', `el descanso ${donde}`) : texto, { accion: { texto: `Sí, ${formatear(segundos)}`, fn: () => {
    estado.cambiar((x) => {
      const e = ej && x.ejercicios.find((y) => y.id === ej.id);
      if (!e) { x.perfil.descansoSegundos = segundos; return; }
      const planes = (e.series || []).filter((p) => ej.planes?.includes(p.id));
      if (planes.length) for (const p of planes) p.descansoSegundos = segundos;
      else e.descansoSegundos = segundos;
    });
    aviso(ej ? `Descanso ${donde}: ${formatear(segundos)} a partir de ahora.` : `Descanso entre series: ${formatear(segundos)}.`);
  } } });
}

function ofrecerCambiado(segundos) {
  const seg = Math.max(15, Math.round(segundos / 15) * 15);
  if (seg === totalSeg) return;
  proponer(seg, `Has dejado el descanso en ${formatear(seg)} en vez de ${formatear(totalSeg)}. ¿Quedártelo así para el descanso entre series?`);
}

function saltar() {
  const quedaban = restante();
  const usado = Math.max(0, totalSeg + alargadoSeg - quedaban);
  const era = entreSeries();
  pararDescanso();
  if (!era || !totalSeg) return;
  const propuesto = Math.max(15, Math.round(usado / 15) * 15);
  // Se ofrece siempre que lo cortes con margen (10 s o más antes de acabar).
  if (usado >= 10 && quedaban >= 10 && propuesto !== totalSeg) {
    proponer(propuesto, `Has descansado ${formatear(usado)} de ${formatear(totalSeg)}. ¿Dejar el descanso entre series en ${formatear(propuesto)}?`);
  } else if (Math.abs(alargadoSeg) >= 15) ofrecerCambiado(totalSeg + alargadoSeg);
}

// Empezar la serie siguiente con el descanso en marcha cuenta como saltarlo
// (con la misma propuesta de cambiar el descanso).
export function saltarDescanso() {
  if (finMs && restante() > 0) saltar();
}

// −30 s y +30 s a los lados del tiempo (estilo A, elegido por Dan el 22-10-2026).
function alargar(paso = 30) {
  if (!finMs) return;
  finMs = Math.max(finMs, Date.now()) + paso * 1000;
  alargadoSeg += paso;
  clearInterval(intervalo);
  intervalo = setInterval(pintar, 1000);
  pintar();
}

function acortar() {
  if (!finMs) return;
  if (restante() <= 30) { saltar(); return; }
  finMs -= 30_000;
  alargadoSeg -= 30;
  pintar();
}

export function barraDescanso() {
  const caja = h('div', { class: 'descanso', hidden: !finMs },
    h('button', { class: 'boton descanso-boton', onclick: acortar, 'aria-label': 'Treinta segundos menos' }, '−30 s'),
    h('div', { class: 'descanso-centro' },
      h('span', { class: 'descanso-motivo' }, motivo),
      h('span', { class: 'descanso-tiempo' }, formatear(restante()))),
    h('button', { class: 'boton descanso-boton', onclick: () => alargar(30), 'aria-label': 'Treinta segundos más' }, '+30 s'),
    h('button', { class: 'boton descanso-boton descanso-saltar', onclick: saltar }, 'Saltar'),
    h('div', { class: 'respira', hidden: true },
      h('span', { class: 'circulo-respira', 'aria-hidden': 'true' }),
      h('span', { class: 'texto-respira' })));
  cajas.add(caja);
  return caja;
}
