// La presentación al abrir la app (la pesa que salta y la caja que la
// atrapa) y sus sonidos. La animación espera quieta hasta que este código la
// pone en marcha («en-marcha»), y en ese mismo momento se programan los
// sonidos: así suenan cuando se ve el golpe. Sale al arrancar y también al
// volver a la app tras un buen rato fuera (si el móvil la tenía guardada en
// segundo plano, abrirla desde el icono no la arrancaba de nuevo).

const CLAVE = 'entreno-presentacion';
export const DURACION_MS = 4400;
// Fuera más de esto, al volver se repite la presentación.
const AUSENCIA_PARA_REPETIR_MS = 20 * 60 * 1000;

// Cuándo suena cada cosa, en segundos desde que arranca. Salen de los
// fotogramas clave del CSS (estilo.css, «Presentación al abrir»): la pesa
// toca el suelo en el 30, 60 y 84 % de su 1,8 s de saltos; la caja sale a
// los 1,75 s.
const BOTES = [['bote', 1.8 * 0.30, 480], ['bote', 1.8 * 0.60, 560], ['bote', 1.8 * 0.84, 640]];
const SONIDOS = {
  // Cae del cielo (1,3 s): la esquina choca al 30 % (golpe seco), bota al 58 %
  // (golpecito) y cae a plano al 78 % (golpe sordo, más grave y más largo).
  cae: [...BOTES, ['seco', 1.75 + 1.3 * 0.30, 1], ['seco', 1.75 + 1.3 * 0.58, 0.35], ['plano', 1.75 + 1.3 * 0.78, 1]],
  // Entra por la derecha (1,2 s): choca al 32 % y se asienta al 66 %.
  derecha: [...BOTES, ['seco', 1.75 + 1.2 * 0.32, 1], ['plano', 1.75 + 1.2 * 0.66, 0.8]],
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
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const arrancar = (sonidos) => {
    p.classList.add('en-marcha');
    sonidos?.();
    setTimeout(quitar, quieto ? 1300 : DURACION_MS);
  };
  if (quieto) { arrancar(null); return; }
  // Animación y sonido salen juntos: se espera (como mucho 0,2 s) a que el
  // audio esté listo y en ese instante arrancan los dos.
  preparar(p.className.trim() || variante).then(arrancar);
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
// audio, descontando lo que tarda el altavoz en sonar (en Android, a menudo
// 0,1 s o más). El navegador solo deja sonar si ya has tocado la app alguna
// vez; si no, la animación sale igual, muda.
function preparar(variante) {
  let audio;
  try { audio = new AudioContext({ latencyHint: 'interactive' }); } catch { return Promise.resolve(null); }
  const salida = audio.destination;
  // Ruido blanco corto: la parte «seca» de un golpe.
  const ruido = (t, dur, filtroHz, fuerza) => {
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / datos.length) ** 3;
    const fuente = audio.createBufferSource(); fuente.buffer = buffer;
    const filtro = audio.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = filtroHz;
    const v = audio.createGain(); v.gain.value = fuerza;
    fuente.connect(filtro).connect(v).connect(salida);
    fuente.start(t);
  };
  // Un tono que cae: el cuerpo grave del golpe o el «boing» del bote.
  const tono = (t, desde, hasta, dur, fuerza, tipo = 'sine', ataque = 0.004) => {
    const o = audio.createOscillator(); const v = audio.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(desde, t);
    o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(fuerza, t + ataque);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(v).connect(salida); o.start(t); o.stop(t + dur + 0.02);
  };
  const sonidos = {
    // La pesa rebotando: un «boing» corto y agudo.
    bote: (t, f) => { tono(t, f * 0.6, f, 0.05, 0.16); tono(t + 0.05, f, f * 0.8, 0.1, 0.08); },
    // La caja tocando el suelo con la esquina: «pim», un toque agudo y limpio.
    seco: (t, x) => { tono(t, 1320, 1180, 0.18, 0.22 * x, 'sine', 0.002); tono(t, 2640, 2400, 0.08, 0.06 * x, 'sine', 0.002); },
    // La caja cayendo a plano: «paf», un golpe de aire, sordo y corto.
    plano: (t, x) => { ruido(t, 0.12, 900, 0.7 * x); tono(t, 120, 60, 0.12, 0.25 * x, 'sine', 0.004); },
  };
  const programar = () => {
    if (audio.state !== 'running') { audio.close().catch(() => {}); return; }
    const retraso = (audio.outputLatency || 0) + (audio.baseLatency || 0);
    const ahora = audio.currentTime;
    for (const [tipo, momento, x] of SONIDOS[variante] ?? SONIDOS.cae) {
      const t = ahora + momento - retraso;
      if (t > ahora) sonidos[tipo](t, x);
    }
    setTimeout(() => audio.close().catch(() => {}), DURACION_MS);
  };
  if (audio.state === 'running') return Promise.resolve(programar);
  return Promise.race([
    audio.resume().then(() => programar).catch(() => programar),
    new Promise((ok) => setTimeout(() => ok(programar), 200)),
  ]);
}
