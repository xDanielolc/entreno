// La presentación al abrir la app (la pesa que salta y la caja que la
// atrapa) y sus sonidos. Sale al arrancar y también al volver a la app tras
// un buen rato fuera: si el móvil la tenía guardada en segundo plano, abrirla
// desde el icono no la arranca de nuevo y la presentación no salía.

const CLAVE = 'entreno-presentacion';
export const DURACION_MS = 2850;
// Fuera más de esto, al volver se repite la presentación.
const AUSENCIA_PARA_REPETIR_MS = 20 * 60 * 1000;

// Cuándo suena cada cosa, en segundos desde que empieza la animación. Salen
// de los fotogramas clave del CSS (estilo.css, «Presentación al abrir»):
// la pesa toca el suelo en el 28, 60 y 88 % de su segundo de saltos; la caja
// empieza a moverse a los 1,05 s.
const SONIDOS = {
  // Cae del cielo (0,95 s): la esquina toca el suelo al 30 %, el botecito
  // vuelve a tocar al 58 % y queda plana al 78 %.
  cae: [['bote', 0.28, 520], ['bote', 0.60, 600], ['bote', 0.88, 680],
    ['golpe', 1.05 + 0.95 * 0.30, 1], ['golpe', 1.05 + 0.95 * 0.58, 0.45], ['golpe', 1.05 + 0.95 * 0.78, 0.8]],
  // Entra por la derecha (0,9 s): choca al 32 % y se asienta al 66 %.
  derecha: [['bote', 0.28, 520], ['bote', 0.60, 600], ['bote', 0.88, 680],
    ['golpe', 1.05 + 0.9 * 0.32, 1], ['golpe', 1.05 + 0.9 * 0.66, 0.5]],
};

export function variantePresentacion() {
  try { return localStorage.getItem(CLAVE) || 'cae'; } catch { return 'cae'; }
}

const PLANTILLA = (variante) => `<div id="presentacion" class="${variante}" aria-hidden="true"><div class="escena"><div class="caja"></div>
  <div class="pesa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6.5 7.5v9M3.5 10v4"/><path d="M17.5 7.5v9M20.5 10v4"/><path d="M6.5 12h11"/></svg></div><div class="nombre">Entreno</div></div></div>`;

// Pone en marcha la presentación que ya está en la página (la de index.html)
// o crea una nueva.
export function mostrarPresentacion(variante = variantePresentacion(), { nueva = false } = {}) {
  if (nueva) {
    document.getElementById('presentacion')?.remove();
    document.body.insertAdjacentHTML('afterbegin', PLANTILLA(variante));
  }
  const p = document.getElementById('presentacion');
  if (!p) return;
  const quitar = () => p.remove();
  p.addEventListener('click', quitar, { once: true });
  setTimeout(quitar, DURACION_MS);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) sonar(p, p.className || variante);
}

// Al volver a la app tras más de 20 minutos fuera, se repite.
export function repetirAlVolver() {
  let fuera = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { fuera = Date.now(); return; }
    if (fuera && Date.now() - fuera > AUSENCIA_PARA_REPETIR_MS) mostrarPresentacion(undefined, { nueva: true });
    fuera = null;
  });
}

// Los sonidos, sintetizados (sin archivos). Se programan con el reloj del
// audio, a partir de lo que lleva ya la animación, y descontando lo que
// tarda el altavoz en sonar (en Android, a menudo 0,1 s o más): así cada
// golpe suena cuando se ve. El navegador solo deja sonar si ya has tocado la
// app alguna vez; si no, se queda mudo.
function sonar(presentacion, variante) {
  let audio;
  try { audio = new AudioContext({ latencyHint: 'interactive' }); } catch { return; }
  const bote = (t, tono) => {
    const o = audio.createOscillator(); const v = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(tono * 0.6, t);
    o.frequency.exponentialRampToValueAtTime(tono, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(tono * 0.8, t + 0.14);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(0.18, t + 0.006);
    v.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(v).connect(audio.destination); o.start(t); o.stop(t + 0.18);
  };
  const golpe = (t, fuerza) => {
    const o = audio.createOscillator(); const v = audio.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(0.35 * fuerza, t + 0.004);
    v.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(v).connect(audio.destination); o.start(t); o.stop(t + 0.26);
  };
  const programar = () => {
    if (audio.state !== 'running') return;
    const anim = presentacion.querySelector('.pesa')?.getAnimations?.()[0];
    const lleva = (anim?.currentTime ?? 0) / 1000;
    const retraso = (audio.outputLatency || 0) + (audio.baseLatency || 0);
    const ahora = audio.currentTime;
    for (const [tipo, momento, x] of SONIDOS[variante] ?? SONIDOS.cae) {
      const t = ahora + momento - lleva - retraso;
      if (t < ahora) continue;   // ya pasó: mejor callado que a destiempo
      (tipo === 'bote' ? bote : golpe)(t, x);
    }
    setTimeout(() => audio.close().catch(() => {}), DURACION_MS);
  };
  if (audio.state === 'running') programar();
  else audio.resume().then(programar).catch(() => {});
  setTimeout(() => { if (audio.state !== 'running') audio.close().catch(() => {}); }, 400);
}
