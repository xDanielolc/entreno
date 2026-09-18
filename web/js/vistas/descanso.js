// Cronómetro de descanso entre series.
//
// Arranca solo al apuntar una serie y se ve en la pantalla de entrenamiento.
// Hay dos clases de descanso:
//   · entre series: el de Ajustes (2 minutos por defecto);
//   · dentro de una serie con tramos: el justo para cambiar el peso en un
//     drop set o para recuperar el aliento en rest-pause;
//   · en miorrepeticiones, en vez de reloj, una guía de respiración: un
//     círculo que crece al coger aire y mengua al soltarlo (3 respiraciones
//     de 4 + 4 segundos, por defecto).
// Es una cuenta atrás por hora de fin, no por sumar segundos: así sigue
// siendo correcta aunque el móvil bloquee la pantalla.

import { aviso as avisoPulla, h } from '../ui.js';

let finMs = null;
let intervalo = null;
let motivo = 'de descanso';
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

export function descansoDeTramo(perfil, tecnica) {
  return perfil.descansoTramos?.[tecnica] ?? DESCANSO_TRAMOS_POR_DEFECTO[tecnica] ?? 20;
}

export function arrancarDescanso(segundos, { texto = 'de descanso' } = {}) {
  if (!segundos) return;
  respiracion = null;
  motivo = texto;
  finMs = Date.now() + segundos * 1000;
  pintar();
  clearInterval(intervalo);
  intervalo = setInterval(pintar, 1000);
}

export function pararDescanso() {
  finMs = null;
  respiracion = null;
  clearInterval(intervalo);
  intervalo = null;
  pintar();
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

// Un pitido corto, sin archivos de sonido, y una vibración si el móvil puede.
function avisar() {
  try {
    navigator.vibrate?.([200, 100, 200]);
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

// Saltarse el descanso tiene respuesta, pero nunca bloquea nada.
const PULLAS = [
  'Descanso saltado. Tus fibras musculares han tomado nota.',
  'Saltado. Seguro que esta serie sale igual de bien. Seguro.',
  'Sin descanso. El ácido láctico te lo agradecerá luego, con intereses.',
  'Prisa registrada. La barra no se va a ir a ningún lado, pero tú sí.',
  'Saltado otra vez. Vamos a llamarlo «entrenamiento metabólico» y quedamos bien.',
];

function saltar() {
  pararDescanso();
  avisoPulla(PULLAS[Math.floor(Math.random() * PULLAS.length)], { ms: 9000 });
}

export function barraDescanso() {
  const caja = h('div', { class: 'descanso', hidden: !finMs },
    h('span', { class: 'descanso-tiempo' }, formatear(restante())),
    h('span', { class: 'suave descanso-motivo' }, motivo),
    h('div', { class: 'respira', hidden: true },
      h('span', { class: 'circulo-respira', 'aria-hidden': 'true' }),
      h('span', { class: 'texto-respira' })),
    h('button', { class: 'boton enlace', onclick: () => arrancarDescanso(60) }, '+1 min'),
    h('button', { class: 'boton enlace', onclick: saltar }, 'Saltar'));
  cajas.add(caja);
  return caja;
}
