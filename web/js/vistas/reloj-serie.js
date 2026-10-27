// El reloj de una serie medida en tiempo, dentro de la propia serie (sin
// carteles por encima): cuenta atrás con lo programado, cronómetro o
// intervalos (HIIT). Un anillo se va llenando y, al acabar, el tiempo se
// apunta solo en la serie.
//
// Va por horas, no sumando segundos: sigue bien aunque el móvil apague la
// pantalla o la app se repinte. Lo que está en marcha vive aquí, por serie,
// así que repintar la pantalla no lo para.

import * as estado from '../estado.js';
import { h } from '../ui.js';
import { icono } from '../iconos.js';
import { PRESETS_HIIT, abrirIntervalos, duracionTexto, pitar } from './intervalos.js';
import { saltarDescanso } from './descanso.js';

const relojes = new Map();   // serieId → reloj en marcha
const elegidos = new Map();  // serieId → { modo, hiit } elegido antes de empezar
let tic = null;
let wakeLock = null;

const RADIO = 64;
const VUELTA = 2 * Math.PI * RADIO;

const dos = (n) => String(n).padStart(2, '0');
function reloj(seg) {
  const s = Math.max(0, Math.round(seg));
  const horas = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return horas ? `${horas}:${dos(m)}:${dos(s % 60)}` : `${m}:${dos(s % 60)}`;
}

const transcurrido = (r) => Math.max(0, ((r.pausadoEn ?? Date.now()) - r.inicio - r.restado) / 1000);

// Las fases de unos intervalos: trabajo y descanso por rondas.
function fasesDe(config) {
  const fases = [];
  let t = 0;
  for (let ronda = 1; ronda <= config.rondas; ronda++) {
    fases.push({ tipo: 'trabajo', ronda, desde: t, seg: config.trabajo }); t += config.trabajo;
    if (config.descanso > 0 && ronda < config.rondas) { fases.push({ tipo: 'descanso', ronda, desde: t, seg: config.descanso }); t += config.descanso; }
  }
  return fases;
}

// Dónde va un HIIT a los t segundos: fase, lo que le queda y el trabajo hecho.
function puntoHiit(r, t) {
  const fases = r.fases;
  const k = fases.findIndex((f) => t < f.desde + f.seg);
  const trabajo = fases.filter((f) => f.tipo === 'trabajo').reduce((n, f) => n + Math.max(0, Math.min(f.seg, t - f.desde)), 0);
  if (k < 0) return { fin: true, trabajo };
  const f = fases[k];
  return { k, fase: f, queda: f.desde + f.seg - t, progreso: (t - f.desde) / f.seg, trabajo };
}

function arrancarTic() {
  if (tic) return;
  tic = setInterval(latido, 250);
  navigator.wakeLock?.request?.('screen').then((w) => { wakeLock = w; }).catch(() => {});
}

function pararTicSiNoHay() {
  if (relojes.size) return;
  clearInterval(tic); tic = null;
  wakeLock?.release?.(); wakeLock = null;
}

// Cada cuarto de segundo: pitidos, final y repintar los relojes a la vista.
function latido() {
  for (const r of [...relojes.values()]) {
    if (r.pausadoEn == null) {
      const t = transcurrido(r);
      if (r.modo === 'atras') {
        const queda = Math.ceil(r.objetivo - t);
        if (queda <= 3 && queda > 0 && !r.avisados.has(queda)) { r.avisados.add(queda); pitar(880, 0.1); }
        if (t >= r.objetivo) { acabar(r, r.objetivo, null, { completo: true }); continue; }
      } else if (r.modo === 'crono') {
        // Al llegar a lo programado suena una vez, pero sigue contando.
        if (r.objetivo && t >= r.objetivo && !r.avisados.has('objetivo')) { r.avisados.add('objetivo'); pitar(660, 0.4, 0.3); }
      } else {
        const p = puntoHiit(r, t);
        if (p.fin) { acabar(r, p.trabajo, notaHiit(r, true), { completo: true }); continue; }
        if (p.k !== r.faseAntes) { if (r.faseAntes != null) pitar(p.fase.tipo === 'trabajo' ? 990 : 440, 0.4, 0.35); r.faseAntes = p.k; }
        const queda = Math.ceil(p.queda);
        if (queda <= 3 && queda > 0 && !r.avisados.has(`${p.k}-${queda}`)) { r.avisados.add(`${p.k}-${queda}`); pitar(880, 0.1); }
      }
    }
    for (const el of document.querySelectorAll(`.reloj-serie[data-serie="${r.serieId}"]`)) el.pintar?.();
  }
  pararTicSiNoHay();
}

function notaHiit(r, completo) {
  const c = r.hiit;
  const ronda = completo ? c.rondas : (puntoHiit(r, transcurrido(r)).fase?.ronda ?? c.rondas);
  return `Intervalos ${c.trabajo}/${c.descanso} × ${completo ? c.rondas : ronda}${completo ? '' : ` (parado en la ronda ${ronda})`}`;
}

// Apunta el tiempo en la serie (por su id, aunque la pantalla ya no esté).
function acabar(r, segundos, nota, { completo = false } = {}) {
  relojes.delete(r.serieId);
  elegidos.delete(r.serieId);
  pararTicSiNoHay();
  if (completo) pitar(440, 0.6, 0.35);
  try { navigator.vibrate?.([300, 120, 300]); } catch { /* nada */ }
  const seg = Math.round(segundos);
  if (seg < 1) { estado.emitir('vista'); return; }
  estado.cambiar((datos) => {
    const s = datos.sesiones.find((x) => x.id === r.sesionId);
    for (const e of s?.ejercicios ?? []) {
      const serie = e.series.find((x) => x.id === r.serieId);
      if (!serie) continue;
      const ej = datos.ejercicios.find((x) => x.id === e.ejercicioId);
      if (ej?.esfuerzo?.tipo === 'tiempo') serie.esfuerzo = seg;
      else { serie.extras ??= {}; serie.extras.tiempo = seg; }
      serie.hecha = true;
      serie.hechaA = new Date().toISOString();
      if (nota) serie.nota = [serie.nota, nota].filter(Boolean).join(' · ');
    }
  });
  r.despues?.(seg);
}

export const relojEnMarcha = (serieId) => relojes.has(serieId);

// Los intervalos que se ofrecen: los de siempre y los tuyos.
function intervalosDisponibles() {
  const propios = (estado.datos()?.perfil?.hiitPropios ?? []).map((x) => [`mio-${x.nombre}`, { ...x, etiqueta: x.nombre }]);
  return [...Object.entries(PRESETS_HIIT).filter(([k]) => k !== 'personalizado'), ...propios];
}

// El reloj de una serie. `objetivo`: los segundos programados (si hay).
// `despues(segundos)`: lo que hace la pantalla al apuntarlo (el descanso).
export function relojSerie({ sesionId, serieId, objetivo = null, despues = null }) {
  const enMarcha = relojes.get(serieId);
  const ultimoHiit = estado.datos()?.perfil?.hiit;
  const elegido = elegidos.get(serieId) ?? { modo: objetivo ? 'atras' : 'crono', hiit: null };
  const modo = enMarcha?.modo ?? elegido.modo;
  const hiit = enMarcha?.hiit ?? elegido.hiit ?? (ultimoHiit?.trabajo ? ultimoHiit : { ...PRESETS_HIIT.tabata, preset: 'tabata' });

  const repintar = () => { const nuevo = relojSerie({ sesionId, serieId, objetivo, despues }); caja.replaceWith(nuevo); };
  const elegir = (cambio) => { elegidos.set(serieId, { ...elegido, ...cambio }); repintar(); };

  const svg = (nombre, atributos) => {
    const nodo = document.createElementNS('http://www.w3.org/2000/svg', nombre);
    for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, v);
    return nodo;
  };
  const progreso = svg('circle', { class: 'progreso-anillo', cx: 80, cy: 80, r: RADIO, 'stroke-dasharray': VUELTA, 'stroke-dashoffset': VUELTA });
  const anillo = svg('svg', { viewBox: '0 0 160 160', 'aria-hidden': 'true' });
  anillo.append(svg('circle', { class: 'pista-anillo', cx: 80, cy: 80, r: RADIO }), progreso);
  const tiempo = h('div', { class: 'reloj-tiempo' });
  const etiqueta = h('div', { class: 'reloj-etiqueta' });

  const empezar = () => {
    saltarDescanso(); // empezar la serie siguiente corta el descanso
    const r = { modo, sesionId, serieId, objetivo, despues, inicio: Date.now(), pausadoEn: null, restado: 0, avisados: new Set() };
    if (modo === 'hiit') {
      r.hiit = hiit; r.fases = fasesDe(hiit); r.faseAntes = null;
      if (!r.fases.length) return;
      estado.cambiar((x) => { x.perfil.hiit = { preset: hiit.preset, trabajo: hiit.trabajo, descanso: hiit.descanso, rondas: hiit.rondas }; }, { tecleo: true });
    }
    pitar(660, 0.1);   // también desbloquea el sonido (hace falta un toque)
    relojes.set(serieId, r);
    arrancarTic();
    repintar();
  };
  const pausar = () => {
    const r = relojes.get(serieId);
    if (!r) return;
    if (r.pausadoEn == null) r.pausadoEn = Date.now();
    else { r.restado += Date.now() - r.pausadoEn; r.pausadoEn = null; }
    repintar();
  };
  const terminar = () => {
    const r = relojes.get(serieId);
    if (!r) return;
    const t = transcurrido(r);
    if (r.modo === 'hiit') acabar(r, puntoHiit(r, t).trabajo, notaHiit(r, false));
    else acabar(r, t, null);
  };
  const descartar = () => { relojes.delete(serieId); pararTicSiNoHay(); repintar(); };

  const chip = (texto, activo, fn) => h('button', { type: 'button', class: `chip seleccionable ${activo ? 'activo' : ''}`,
    'aria-pressed': String(activo), onclick: fn }, texto);

  const caja = h('div', { class: 'reloj-serie', 'data-serie': serieId },
    // Qué reloj: solo se elige antes de empezar.
    !enMarcha && h('div', { class: 'chips reloj-modos' },
      objetivo && chip(`Cuenta atrás ${reloj(objetivo)}`, modo === 'atras', () => elegir({ modo: 'atras' })),
      chip('Cronómetro', modo === 'crono', () => elegir({ modo: 'crono' })),
      chip('Intervalos', modo === 'hiit', () => elegir({ modo: 'hiit' }))),
    !enMarcha && modo === 'hiit' && h('div', { class: 'chips reloj-hiit' },
      intervalosDisponibles().map(([k, p]) => chip(p.etiqueta, hiit.preset === k,
        () => elegir({ modo: 'hiit', hiit: { trabajo: p.trabajo, descanso: p.descanso, rondas: p.rondas, preset: k, nombre: p.etiqueta } }))),
      chip('A mi manera', hiit.preset === 'personalizado',
        () => abrirIntervalos({ alElegir: (c) => elegir({ modo: 'hiit', hiit: { ...c, preset: 'personalizado' } }) }))),
    !enMarcha && modo === 'hiit' && h('p', { class: 'nota centrado' },
      `${hiit.trabajo} s de trabajo y ${hiit.descanso} s de descanso, ${hiit.rondas} rondas: ${duracionTexto((hiit.trabajo + hiit.descanso) * hiit.rondas - hiit.descanso)}.`),

    h('div', { class: 'reloj-anillo' }, anillo, h('div', { class: 'reloj-centro' }, tiempo, etiqueta)),

    enMarcha
      ? h('div', { class: 'fila-botones' },
        h('button', { type: 'button', class: 'boton secundario', onclick: pausar }, enMarcha.pausadoEn != null ? 'Seguir' : 'Pausa'),
        h('button', { type: 'button', class: 'boton', onclick: terminar }, 'Terminar y apuntar'),
        enMarcha.pausadoEn != null && h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Descartar este tiempo', title: 'Descartar', onclick: descartar }, icono('cerrar')))
      : h('button', { type: 'button', class: 'boton grande', onclick: empezar }, 'Empezar'));

  caja.pintar = () => {
    const r = relojes.get(serieId);
    let fraccion = 0;
    if (!r) {
      tiempo.textContent = modo === 'atras' ? reloj(objetivo) : modo === 'hiit' ? reloj(hiit.trabajo) : '0:00';
      etiqueta.textContent = modo === 'atras' ? 'cuenta atrás' : modo === 'hiit' ? `${hiit.rondas} rondas` : objetivo ? `objetivo ${reloj(objetivo)}` : 'cronómetro';
      delete caja.dataset.fase;
    } else {
      const t = transcurrido(r);
      if (r.modo === 'atras') {
        tiempo.textContent = reloj(Math.ceil(r.objetivo - t));
        etiqueta.textContent = r.pausadoEn != null ? 'en pausa' : `de ${reloj(r.objetivo)}`;
        fraccion = t / r.objetivo;
      } else if (r.modo === 'crono') {
        tiempo.textContent = reloj(t);
        etiqueta.textContent = r.pausadoEn != null ? 'en pausa' : r.objetivo ? `objetivo ${reloj(r.objetivo)}` : 'en marcha';
        fraccion = r.objetivo ? t / r.objetivo : (t % 60) / 60;
      } else {
        const p = puntoHiit(r, t);
        if (!p.fin) {
          tiempo.textContent = reloj(Math.ceil(p.queda));
          etiqueta.textContent = r.pausadoEn != null ? 'en pausa' : `${p.fase.tipo === 'trabajo' ? '¡Trabajo!' : 'Descanso'} · ronda ${p.fase.ronda} de ${r.hiit.rondas}`;
          caja.dataset.fase = p.fase.tipo;
          fraccion = p.progreso;
        }
      }
    }
    progreso.setAttribute('stroke-dashoffset', String(VUELTA * (1 - Math.max(0, Math.min(1, fraccion)))));
  };
  caja.pintar();
  return caja;
}
