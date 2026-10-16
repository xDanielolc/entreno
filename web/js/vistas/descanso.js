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
// Segundos entre estiramientos (perfil.descansoEstiramientos si se cambia).
export const DESCANSO_ESTIRAMIENTOS_POR_DEFECTO = 20;

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
  if (permiso !== 'granted') { aviso('El móvil no ha dado permiso para avisar. Se cambia en los ajustes del navegador.', { tipo: 'error' }); return false; }
  estado.cambiar((x) => { x.perfil.avisarDescanso = true; });
  aviso('Te avisaré con una notificación (y vibración) cuando acabe cada descanso.');
  return true;
}

// Al entrenar, mientras no se haya contestado: «¿Te aviso cuando acabe cada
// descanso?». Con la pantalla apagada, la app no puede vibrar sola: hace
// falta el permiso de notificaciones.
export function preguntaAvisos() {
  const perfil = estado.datos()?.perfil;
  if (!puedeNotificar() || perfil?.avisarDescanso !== undefined) return null;
  if (Notification.permission === 'denied') return null;
  const caja = h('div', { class: 'tarjeta pregunta-avisos' },
    h('p', {}, h('strong', {}, '¿Te aviso cuando acabe cada descanso?'),
      h('small', { class: 'bloque suave' }, 'Con una notificación que vibra, aunque tengas el móvil bloqueado. Mientras, te dice cuánto queda.')),
    h('div', { class: 'fila-botones' },
      h('button', { type: 'button', class: 'boton secundario', onclick: () => { estado.cambiar((x) => { x.perfil.avisarDescanso = false; }); caja.remove(); } }, 'Sin avisos, gracias'),
      h('button', { type: 'button', class: 'boton', onclick: async () => { if (await activarNotificaciones()) caja.remove(); } }, '¡Avísame!')));
  return caja;
}

async function notificar(titulo, cuerpo, { silencio = false, vibrar = null } = {}) {
  if (!notificacionesActivas()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(titulo, {
      body: cuerpo, tag: 'descanso', renotify: !silencio, silent: silencio, icon: './iconos/icono-192.png', badge: './iconos/icono-192.png',
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
    avisar();
    if (entreSeries()) notificar('¡Descanso terminado!', 'A por la siguiente serie.');
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
    caja.querySelector('.descanso-alargar').textContent = pasoAlargar() === 30 ? '+30 s' : '+1 min';
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

// Un pitido corto, sin archivos de sonido, y una vibración si el móvil puede.
function avisar() {
  try {
    navigator.vibrate?.([600, 200, 600, 200, 900]);
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const vol = audio.createGain();
    osc.frequency.value = 880;
    vol.gain.setValueAtTime(0.0001, audio.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.5);
    osc.connect(vol).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.5);
    setTimeout(() => audio.close(), 800);
  } catch { /* si el navegador no deja sonar, no pasa nada */ }
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
  aviso(ej ? texto.replace('el descanso entre series', `el descanso de ${ej.nombre}`) : texto, { accion: { texto: `Sí, ${segundos} s`, fn: () => {
    estado.cambiar((x) => {
      const e = ej && x.ejercicios.find((y) => y.id === ej.id);
      if (e) e.descansoSegundos = segundos; else x.perfil.descansoSegundos = segundos;
    });
    aviso(ej ? `Descanso de ${ej.nombre}: ${segundos} s. Se cambia en su ficha (Ajustes finos).` : `Descanso entre series: ${segundos} s.`);
  } } });
}

function saltar() {
  const quedaban = restante();
  const usado = Math.max(0, totalSeg + alargadoSeg - quedaban);
  const era = entreSeries();
  pararDescanso();
  if (!era || !totalSeg) return;
  const propuesto = Math.max(15, Math.round(usado / 15) * 15);
  // Se ofrece siempre que lo cortes con margen (10 s o más antes de acabar).
  if (usado >= 10 && quedaban >= 10 && propuesto < totalSeg) {
    proponer(propuesto, `Descanso saltado a los ${usado} s de ${totalSeg}. ¿Dejar el descanso entre series en ${propuesto} s?`);
  }
}

// Con descansos cortos (estiramientos, bajadas) se añaden 30 s; si no, un minuto.
const pasoAlargar = () => (totalSeg && totalSeg < 60 ? 30 : 60);

function alargar() {
  if (!finMs) return;
  const paso = pasoAlargar();
  finMs = Math.max(finMs, Date.now()) + paso * 1000;
  alargadoSeg += paso;
  clearInterval(intervalo);
  intervalo = setInterval(pintar, 1000);
  pintar();
  if (entreSeries() && totalSeg) {
    proponer(totalSeg + alargadoSeg, `Un minuto más. ¿Dejar el descanso entre series en ${totalSeg + alargadoSeg} s?`);
  }
}

export function barraDescanso() {
  const caja = h('div', { class: 'descanso', hidden: !finMs },
    h('span', { class: 'descanso-tiempo' }, formatear(restante())),
    h('span', { class: 'suave descanso-motivo' }, motivo),
    h('div', { class: 'respira', hidden: true },
      h('span', { class: 'circulo-respira', 'aria-hidden': 'true' }),
      h('span', { class: 'texto-respira' })),
    h('button', { class: 'boton enlace descanso-alargar', onclick: alargar }, pasoAlargar() === 30 ? '+30 s' : '+1 min'),
    h('button', { class: 'boton enlace', onclick: saltar }, 'Saltar'));
  cajas.add(caja);
  return caja;
}
