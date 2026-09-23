// Cronómetro de intervalos (HIIT): trabajo y descanso por rondas, con
// pitidos distintos para cada fase y aviso en los últimos tres segundos.
// Al terminar devuelve los segundos totales para apuntarlos en la serie.
//
// Va por hora de fin, no sumando segundos: sigue bien aunque el móvil
// apague la pantalla. Pide mantener la pantalla encendida si el navegador
// lo permite (Wake Lock).

import * as estado from '../estado.js';
import { h, modal } from '../ui.js';
import { queEs } from './glosario.js';

export const PRESETS_HIIT = {
  tabata: { etiqueta: 'Tabata', trabajo: 20, descanso: 10, rondas: 8, descripcion: '8 rondas de 20 s a tope y 10 s de descanso: 4 minutos.' },
  '30-30': { etiqueta: '30 / 30', trabajo: 30, descanso: 30, rondas: 10, descripcion: '10 rondas de 30 s de trabajo y 30 s de descanso: 10 minutos.' },
  '40-20': { etiqueta: '40 / 20', trabajo: 40, descanso: 20, rondas: 10, descripcion: '10 rondas de 40 s de trabajo y 20 s de descanso: 10 minutos.' },
  emom: { etiqueta: 'EMOM 10', trabajo: 60, descanso: 0, rondas: 10, descripcion: '10 minutos: al empezar cada minuto haces tu bloque (por ejemplo, 10 burpees) y descansas lo que sobre.' },
  sprints: { etiqueta: 'Sprints 15 / 45', trabajo: 15, descanso: 45, rondas: 8, descripcion: '8 sprints de 15 s con 45 s de recuperación.' },
  personalizado: { etiqueta: 'A mi manera', trabajo: 30, descanso: 30, rondas: 8, descripcion: 'Pon tus segundos y rondas.' },
};

let audio = null;

// «4 min», «6 s» o «2 min 30 s».
function duracionTexto(seg) {
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60), s = seg % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

// Pitido: corto y agudo para avisar, largo y grave al cambiar de fase.
function pitar(frecuencia = 880, duracion = 0.15, volumen = 0.25) {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const osc = audio.createOscillator();
    const vol = audio.createGain();
    osc.frequency.value = frecuencia;
    vol.gain.setValueAtTime(0.0001, audio.currentTime);
    vol.gain.exponentialRampToValueAtTime(volumen, audio.currentTime + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duracion);
    osc.connect(vol).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duracion);
  } catch { /* sin sonido */ }
  try { navigator.vibrate?.(duracion > 0.3 ? [300] : [80]); } catch { /* nada */ }
}

// Abre el cronómetro. alTerminar(segundosTotales, descripcion) se llama al
// acabar todas las rondas o al parar con algo hecho.
export function abrirIntervalos({ alTerminar } = {}) {
  const perfil = estado.datos()?.perfil ?? {};
  const guardado = perfil.hiit ?? { preset: 'tabata' };
  // Los tuyos, guardados desde aquí, salen junto a los de siempre.
  const mios = () => estado.datos()?.perfil?.hiitPropios ?? [];
  const todos = () => ({
    ...PRESETS_HIIT,
    ...Object.fromEntries(mios().map((x, i) => [`mio-${i}`, { ...x, etiqueta: x.nombre, descripcion: `Tuyo: ${x.trabajo} s de trabajo y ${x.descanso} s de descanso, ${x.rondas} rondas.` }])),
  });
  const base = todos()[guardado.preset] ?? PRESETS_HIIT.tabata;
  const config = { ...base, ...(guardado.preset === 'personalizado' ? guardado : {}), preset: guardado.preset ?? 'tabata' };

  let cerrar = null;
  const pintarConfig = () => {
    cerrar?.();
    const campo = (etiqueta, clave) => h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, etiqueta),
      h('input', { type: 'text', inputmode: 'decimal', value: config[clave],
        oninput: (e) => { config[clave] = Math.max(0, Math.round(Number(String(e.target.value).replace(',', '.')) || 0)); config.preset = 'personalizado'; } }));
    cerrar = modal('Intervalos', h('div', { class: 'formulario intervalos-config' },
      h('p', { class: 'nota' }, 'Tramos cortos a tope y descansos, varias veces seguidas. Elige uno o pon el tuyo. ', queEs('hiit')),
      h('div', { class: 'opciones compacto', role: 'radiogroup' }, Object.entries(todos()).map(([k, p]) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(k === config.preset), class: `opcion ${k === config.preset ? 'elegida' : ''}`,
        onclick: () => { Object.assign(config, { trabajo: p.trabajo, descanso: p.descanso, rondas: p.rondas, preset: k }); pintarConfig(); },
      }, h('strong', {}, p.etiqueta),
      // Los tuyos se pueden quitar desde aquí mismo.
      k.startsWith('mio-') && h('span', { class: 'quitar-mio', role: 'button', tabindex: '0', title: 'Quitar estos intervalos',
        onclick: (e) => {
          e.preventDefault(); e.stopPropagation();
          estado.cambiar((x) => { x.perfil.hiitPropios = (x.perfil.hiitPropios ?? []).filter((y) => y.nombre !== p.nombre); }, { tecleo: true });
          if (config.preset === k) config.preset = 'tabata';
          pintarConfig();
        } }, '✕')))),
      h('p', { class: 'nota' }, todos()[config.preset]?.descripcion ?? ''),
      h('div', { class: 'fila-campos' },
        campo('Trabajo (s)', 'trabajo'), campo('Descanso (s)', 'descanso'), campo('Rondas', 'rondas')),
      h('p', { class: 'nota' }, `Total: ${duracionTexto((config.trabajo + config.descanso) * config.rondas)}. Suena un pitido en cada cambio y tres avisos antes.`),
      h('button', { class: 'boton enlace', type: 'button', onclick: () => {
        const nombre = `${config.trabajo}/${config.descanso} × ${config.rondas}`;
        estado.cambiar((x) => {
          x.perfil.hiitPropios = [...(x.perfil.hiitPropios ?? []).filter((y) => y.nombre !== nombre),
            { nombre, trabajo: config.trabajo, descanso: config.descanso, rondas: config.rondas }];
        }, { tecleo: true });
        config.preset = `mio-${(estado.datos().perfil.hiitPropios ?? []).length - 1}`;
        pintarConfig();
      } }, 'Guardar estos intervalos como míos'),
      h('button', { class: 'boton grande', onclick: () => {
        if (!(config.trabajo > 0) || !(config.rondas > 0)) return;
        estado.cambiar((x) => { x.perfil.hiit = { preset: config.preset, trabajo: config.trabajo, descanso: config.descanso, rondas: config.rondas }; }, { tecleo: true });
        cerrar();
        pitar(660, 0.1);
        correr(config, alTerminar);
      } }, 'Empezar')));
  };
  pintarConfig();
}

function correr(config, alTerminar) {
  const fases = [];
  for (let r = 1; r <= config.rondas; r++) {
    fases.push({ tipo: 'trabajo', seg: config.trabajo, ronda: r });
    if (config.descanso > 0 && r < config.rondas) fases.push({ tipo: 'descanso', seg: config.descanso, ronda: r });
  }
  let i = 0;
  let finMs = Date.now() + fases[0].seg * 1000;
  let pausadoEn = null;
  let avisados = new Set();
  let hechoSeg = 0;
  let wakeLock = null;
  navigator.wakeLock?.request?.('screen').then((w) => { wakeLock = w; }).catch(() => {});

  const tiempo = h('div', { class: 'intervalos-tiempo' });
  const fase = h('div', { class: 'intervalos-fase' });
  const ronda = h('div', { class: 'suave' });
  const barra = h('span');
  const botonPausa = h('button', { class: 'boton secundario', onclick: () => pausar() }, 'Pausa');
  const caja = h('div', { class: 'intervalos' }, fase, tiempo, ronda,
    h('div', { class: 'barra-progreso' }, barra),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => saltar() }, 'Saltar fase'),
      botonPausa,
      h('button', { class: 'boton peligro', onclick: () => terminar(false) }, 'Parar')));
  const cerrar = modal('Intervalos', caja);
  const intervalo = setInterval(pintar, 200);

  function restante() { return Math.max(0, Math.ceil((finMs - Date.now()) / 1000)); }

  function pintar() {
    if (pausadoEn != null) return;
    const f = fases[i];
    const seg = restante();
    caja.dataset.fase = f.tipo;
    fase.textContent = f.tipo === 'trabajo' ? '¡Trabajo!' : 'Descanso';
    tiempo.textContent = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    ronda.textContent = `Ronda ${f.ronda} de ${config.rondas}`;
    barra.style.width = `${(1 - seg / f.seg) * 100}%`;
    if (seg <= 3 && seg > 0 && !avisados.has(`${i}-${seg}`)) { avisados.add(`${i}-${seg}`); pitar(880, 0.1); }
    if (seg === 0) siguiente();
  }

  function siguiente() {
    const f = fases[i];
    if (f.tipo === 'trabajo') hechoSeg += f.seg;
    i += 1;
    if (i >= fases.length) { pitar(440, 0.6, 0.35); terminar(true); return; }
    pitar(fases[i].tipo === 'trabajo' ? 990 : 440, 0.4, 0.35);
    finMs = Date.now() + fases[i].seg * 1000;
    avisados = new Set();
    pintar();
  }

  function saltar() {
    const f = fases[i];
    if (f.tipo === 'trabajo') hechoSeg += f.seg - restante();
    i += 1;
    if (i >= fases.length) { terminar(true); return; }
    finMs = Date.now() + fases[i].seg * 1000;
    pintar();
  }

  function pausar() {
    if (pausadoEn == null) { pausadoEn = Date.now(); botonPausa.textContent = 'Seguir'; fase.textContent = 'En pausa'; }
    else { finMs += Date.now() - pausadoEn; pausadoEn = null; botonPausa.textContent = 'Pausa'; pintar(); }
  }

  function terminar(completo) {
    clearInterval(intervalo);
    wakeLock?.release?.();
    cerrar();
    if (!completo && fases[i]?.tipo === 'trabajo') hechoSeg += fases[i].seg - restante();
    const rondasHechas = completo ? config.rondas : Math.max(0, fases[Math.min(i, fases.length - 1)]?.ronda - (fases[i]?.tipo === 'trabajo' ? 1 : 0));
    const texto = `Intervalos ${config.trabajo}/${config.descanso} × ${rondasHechas}${completo ? '' : ` (parado en la ronda ${fases[i]?.ronda ?? config.rondas})`}`;
    if (hechoSeg > 0) alTerminar?.(hechoSeg, texto);
  }
}


// ---------------------------------------------------------------------------
// Cronómetro sencillo: cuenta hacia arriba y apunta el tiempo al pararlo
// ---------------------------------------------------------------------------
//
// Para cardio continuo (caminar, correr, bici) y para cualquier serie que se
// mida en tiempo. Va por hora de inicio, así que sigue bien aunque el móvil
// apague la pantalla.
export function abrirCronometro({ alTerminar } = {}) {
  const inicio = Date.now();
  let pausadoEn = null;
  let restado = 0;
  let wakeLock = null;
  navigator.wakeLock?.request?.('screen').then((w) => { wakeLock = w; }).catch(() => {});

  const transcurrido = () => Math.floor(((pausadoEn ?? Date.now()) - inicio - restado) / 1000);
  const tiempo = h('div', { class: 'intervalos-tiempo' });
  const botonPausa = h('button', { class: 'boton secundario', onclick: () => pausar() }, 'Pausa');
  const caja = h('div', { class: 'intervalos' },
    h('div', { class: 'intervalos-fase' }, 'En marcha'),
    tiempo,
    h('p', { class: 'nota' }, 'Al parar se apunta el tiempo en la serie.'),
    h('div', { class: 'fila-botones' },
      botonPausa,
      h('button', { class: 'boton', onclick: () => parar() }, 'Parar y apuntar')));
  const cerrar = modal('Cronómetro', caja);
  const reloj = setInterval(pintar, 250);
  pintar();

  function pintar() {
    const s = Math.max(0, transcurrido());
    const h1 = Math.floor(s / 3600);
    tiempo.textContent = (h1 ? `${h1}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}` : `${Math.floor(s / 60)}`)
      + `:${String(s % 60).padStart(2, '0')}`;
  }

  function pausar() {
    if (pausadoEn == null) { pausadoEn = Date.now(); botonPausa.textContent = 'Seguir'; }
    else { restado += Date.now() - pausadoEn; pausadoEn = null; botonPausa.textContent = 'Pausa'; }
  }

  function parar() {
    clearInterval(reloj);
    wakeLock?.release?.();
    cerrar();
    const s = Math.max(0, transcurrido());
    if (s > 0) alTerminar?.(s);
  }
}
