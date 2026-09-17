// Cronómetro de descanso entre series.
//
// Arranca solo al apuntar una serie y se ve en la pantalla de entrenamiento.
// Es una cuenta atrás por hora de fin, no por sumar segundos: así sigue
// siendo correcta aunque el móvil bloquee la pantalla.

import { h } from '../ui.js';

let finMs = null;
let intervalo = null;
const cajas = new Set();

export function arrancarDescanso(segundos) {
  if (!segundos) return;
  finMs = Date.now() + segundos * 1000;
  pintar();
  clearInterval(intervalo);
  intervalo = setInterval(pintar, 1000);
}

export function pararDescanso() {
  finMs = null;
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
    caja.classList.toggle('acabado', segundos === 0);
  }
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

export function barraDescanso() {
  const caja = h('div', { class: 'descanso', hidden: !finMs },
    h('span', { class: 'descanso-tiempo' }, formatear(restante())),
    h('span', { class: 'suave' }, 'de descanso'),
    h('button', { class: 'boton enlace', onclick: () => arrancarDescanso(60) }, '+1 min'),
    h('button', { class: 'boton enlace', onclick: pararDescanso }, 'Saltar'));
  cajas.add(caja);
  return caja;
}
