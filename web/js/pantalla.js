// Pantalla encendida mientras entrenas (Dan, 26-11-2026). Con la app delante, el fin de cada descanso lo avisa la
// propia app, que suena y vibra siempre, también con el móvil en silencio (las notificaciones con la app cerrada las
// decide Android: con el móvil en silencio, solo vibran). Se suelta sola al terminar el entreno, al salir de la app
// (el navegador la suelta y aquí se vuelve a pedir al volver) o con el ajuste apagado (`perfil.pantallaEncendida`).
import * as estado from './estado.js';

let cerrojo = null;
let pidiendo = false;

function quiereEncendida() {
  const d = estado.datos();
  return Boolean(d && d.perfil?.pantallaEncendida !== false && document.visibilityState === 'visible'
    && d.sesiones?.some((s) => s.estado === 'en-curso' && !s.borrada && !s.tutorial));
}

export async function actualizarPantalla() {
  if (!('wakeLock' in navigator)) return;
  const quiere = quiereEncendida();
  if (quiere && !cerrojo && !pidiendo) {
    pidiendo = true;
    try {
      cerrojo = await navigator.wakeLock.request('screen');
      cerrojo.addEventListener('release', () => { cerrojo = null; });
    } catch { cerrojo = null; } finally { pidiendo = false; }
    if (!quiereEncendida()) actualizarPantalla();
  } else if (!quiere && cerrojo) {
    const c = cerrojo;
    cerrojo = null;
    c.release().catch(() => {});
  }
}

estado.suscribir((motivo) => { if (motivo !== 'tecleo' && motivo !== 'sincronizacion') actualizarPantalla(); });
document.addEventListener('visibilitychange', () => actualizarPantalla());
