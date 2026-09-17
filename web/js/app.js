// Punto de entrada: arranque, navegación y barra de estado.

import * as local from './almacen-local.js';
import * as estado from './estado.js';
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

// Rutas: el fragmento de la dirección (#/…) decide qué pantalla se ve.
const RUTAS = [
  { patron: /^#?\/?$/, vista: vistaInicio, pestana: 'inicio' },
  { patron: /^#\/ejercicios$/, vista: vistaEjercicios, pestana: 'ejercicios' },
  { patron: /^#\/ejercicio\/([\w-]+)$/, vista: vistaFormularioEjercicio, pestana: 'ejercicios', params: ['id'] },
  { patron: /^#\/sesion\/([\w-]+)$/, vista: vistaSesion, pestana: 'inicio', params: ['id'] },
  { patron: /^#\/cuerpo$/, vista: vistaCuerpo, pestana: 'inicio' },
  { patron: /^#\/rutinas$/, vista: vistaRutinas, pestana: 'inicio' },
  { patron: /^#\/rutina\/([\w-]+)$/, vista: vistaFormularioRutina, pestana: 'inicio', params: ['id'] },
  { patron: /^#\/historial$/, vista: vistaHistorial, pestana: 'historial' },
  { patron: /^#\/ajustes$/, vista: vistaAjustes, pestana: 'ajustes' },
];

const PESTANAS = [
  { id: 'inicio', texto: 'Hoy', icono: '🏠', href: '#/' },
  { id: 'ejercicios', texto: 'Ejercicios', icono: '🏋️', href: '#/ejercicios' },
  { id: 'historial', texto: 'Historial', icono: '📅', href: '#/historial' },
  { id: 'ajustes', texto: 'Ajustes', icono: '⚙️', href: '#/ajustes' },
];

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
  pintarNavegacion(ruta.pestana);
  pintarIndicador();
  window.scrollTo(0, mismaRuta ? scroll : 0);
}

function pintarNavegacion(activa) {
  navegacion.replaceChildren(...PESTANAS.map((p) => h('a', {
    href: p.href, class: p.id === activa ? 'activa' : '', 'aria-current': p.id === activa ? 'page' : null,
  }, h('span', { 'aria-hidden': 'true' }, p.icono), h('span', {}, p.texto))));
}

function pintarIndicador() {
  const { situacion, detalle } = situacionActual();
  const pulsable = ['desconectada', 'pendiente', 'error'].includes(situacion);
  indicador.className = `indicador ${situacion}`;
  indicador.textContent = situacion === 'desconectada' ? 'Conectar con Google' : textoSituacion(situacion);
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
  const ultimo = local.ultimoUsuario();
  if (ultimo) {
    try {
      await estado.abrirUsuario(ultimo);
    } catch (e) {
      console.error(e);
      aviso(`No se han podido abrir tus datos: ${e.message}`, { tipo: 'error', ms: 8000 });
    }
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
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !habiaVersionAnterior) return;
    recargando = true;
    estado.guardarYa();
    if (document.visibilityState === 'hidden' || !document.activeElement?.matches('input, textarea, select')) {
      location.reload();
    }
  });
}

arrancar();
