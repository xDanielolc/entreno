// Tutorial: una guía paso a paso por las pantallas y «pistas», notas
// pequeñas que explican una pantalla la primera vez y se cierran con ✕ para
// no volver. Lo visto se guarda en el perfil, así va con la cuenta.
//
// Niveles: 'basico' (guía de siete pasos y pistas básicas), 'avanzado'
// (además, cuatro pasos y pistas sobre los cálculos) y 'ninguno'.

import * as estado from '../estado.js';
import { h, anadir, modal, nuevoId, hoyISO } from '../ui.js';
import { queEs } from './glosario.js';

export const NIVELES = {
  basico: { etiqueta: 'Guíame por lo básico', descripcion: 'Un paseo de siete pasos por las pantallas, y una nota corta en cada una la primera vez.' },
  avanzado: { etiqueta: 'Quiero entenderlo todo', descripcion: 'El paseo básico más cuatro pasos sobre los cálculos: 1RM, drop sets, recuperación y programas.' },
  ninguno: { etiqueta: 'Sin tutorial', descripcion: 'Ninguna guía ni nota. Siempre puedes activarlas en Ajustes.' },
};

function config(d = estado.datos()) {
  return d?.perfil?.tutoriales ?? { nivel: null, vistos: {} };
}

export function nivelTutorial(d) {
  return config(d).nivel ?? null;
}

export function fijarNivel(nivel) {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.nivel = nivel;
  });
}

export function marcarVista(clave) {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.vistos ??= {};
    x.perfil.tutoriales.vistos[clave] = true;
  }, { tecleo: true });
}

// Vuelven a salir todas las pistas.
export function reiniciarPistas() {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.vistos = {};
  });
}

// Una pista, o null si no toca enseñarla.
export function pista(clave, texto, { avanzada = false } = {}) {
  const t = config();
  const nivel = t.nivel ?? 'basico';
  if (nivel === 'ninguno') return null;
  if (avanzada && nivel !== 'avanzado') return null;
  if (t.vistos?.[clave]) return null;
  const caja = h('div', { class: 'pista', role: 'note' },
    h('span', { class: 'pista-icono', 'aria-hidden': 'true' }, '💡'),
    h('span', { class: 'pista-texto' }, texto),
    h('button', { class: 'pista-cerrar', 'aria-label': 'Entendido, no volver a enseñar',
      onclick: () => { marcarVista(clave); caja.remove(); } }, '✕'));
  return caja;
}

// Cartel de bienvenida al tutorial: la app es grande, elige cuánto quieres
// que te guíe. Sale una vez, al entrar por primera vez. Al elegir un nivel
// con guía, la guía empieza en el acto.
export function elegirNivel({ alElegir } = {}) {
  const cerrar = modal('¿Te guío?', h('div', { class: 'tutorial-niveles' },
    h('p', {}, 'La app es grande: registra series, calcula tu 1RM, propone pesos, mide tu recuperación y más. '
      + 'No hace falta entenderlo todo el primer día.'),
    Object.entries(NIVELES).map(([clave, n]) => h('button', { class: 'tarjeta fila-enlace', onclick: () => {
      fijarNivel(clave);
      cerrar();
      alElegir?.(clave);
      if (clave !== 'ninguno') iniciarGuia();
    } },
    h('div', {}, h('strong', {}, n.etiqueta), h('div', { class: 'suave' }, n.descripcion)))),
    h('p', { class: 'nota' }, 'Se puede cambiar en Ajustes, en «Tutorial», donde también se puede repetir la guía.')));
  return cerrar;
}

// ---------------------------------------------------------------------------
// Guía paso a paso: un panel abajo que te lleva por las pantallas
// ---------------------------------------------------------------------------

const PASOS_BASICOS = [
  { ruta: '#/', titulo: 'Hoy', texto: 'Esta es tu pantalla de inicio. Arriba, qué toca hoy según tu rutina; debajo, cómo va tu recuperación. '
    + 'Desde aquí se empieza cada entrenamiento con el botón que parpadea.', selector: 'main .boton.grande' },
  { ruta: '#/rutinas', titulo: 'Rutinas', texto: 'Una rutina son tus días de entrenamiento en orden. Abajo hay rutinas prehechas: con «Añadir a mis rutinas» '
    + 'te llevas la rutina y sus ejercicios en un toque. Puedes tener varias activas.', selector: '.plantilla button' },
  { ruta: '#/ejercicios', titulo: 'Ejercicios', texto: 'Aquí están tus ejercicios. Cada uno guarda cómo progresa (Bilbo, doble progresión, un programa…), '
    + 'qué músculos trabaja y sus series. Tócalo para cambiarlo; se guarda solo.', selector: '.cabecera-vista .boton' },
  { ruta: '#/', titulo: 'Apuntar un entrenamiento', texto: 'Lo mejor es probarlo: el botón de abajo abre un entrenamiento de prueba con '
    + 'flexiones. Apunta una serie (peso, repeticiones y cuántas te quedaban) y mira cómo arranca el descanso. Al terminar podrás '
    + 'guardarlo o borrarlo.', prueba: true, glosario: ['serie', 'recamara', 'rm'] },
  { ruta: '#/cuerpo', titulo: 'Cuerpo', texto: 'El mapa: verde recuperado, rojo aún tocado. Debajo, las series de la semana por músculo y consejos. '
    + 'Tu recuperación depende de lo dura que fue la sesión, de cuántas series hiciste y de tu genética.', glosario: ['recuperacion', 'volumen'], selector: '.cuerpos' },
  { ruta: '#/historial', titulo: 'Historial', texto: 'Todos tus entrenamientos. Con «+ De otro día» apuntas uno pasado. Lo borrado va a una papelera y se recupera.', selector: '.cabecera-vista .boton' },
  { ruta: '#/ajustes', titulo: 'Ajustes', texto: 'Arriba, tu nombre, tu peso y la cuenta de Google. Lo demás está plegado por apartados: descansos, drop sets, '
    + 'ciclos, sitios, cómo se estima el 1RM, este tutorial y la zona de peligro. Fin de lo básico: ya puedes entrenar.', selector: '.apartado' },
];

const PASOS_AVANZADOS = [
  { ruta: '#/ajustes', titulo: 'El 1RM', texto: 'El 1RM es lo que podrías levantar una sola vez. La app lo estima con cada serie (fórmula de Marzagao) y, '
    + 'si el ejercicio está en «Se ajusta a ti», corrige la fórmula con tus propios datos. En Ajustes, «Cómo se estima tu 1RM» lo explica.' },
  { ruta: '#/ajustes', titulo: 'Drop sets y máquinas', texto: 'Un drop set se rellena solo a un porcentaje del 1RM que acabas de hacer arriba, o con kilos a mano; '
    + 'se elige en Ajustes, en el ejercicio, en la rutina o en la serie del día. Si atas un ejercicio a una máquina con su lista de pesos, '
    + 'la app solo propone pesos que existen.', glosario: ['drop-set', 'rest-pause', 'fallo'] },
  { ruta: '#/cuerpo', titulo: 'Recuperación', texto: 'Las horas que pide cada músculo salen de lo cerca del fallo que acabaste las series (lo que más pesa), '
    + 'del número de series (cada vez menos) y de tu ajuste personal. «¿Cómo se calculan…?» lo desglosa.' },
  { ruta: '#/rutinas', titulo: 'Progresiones y programas', texto: 'Bilbo: un ciclo con el peso de cada día fijado y un objetivo de repeticiones que superar. '
    + 'Doble progresión: sube repeticiones y luego peso. Programa: 5×5, 5/3/1 o HST con las series de cada sesión ya decididas. '
    + 'Todo se elige en cada serie de la ficha del ejercicio. Fin del tutorial avanzado.' },
];

let panel = null;

// Un entrenamiento de prueba con flexiones (se crea el ejercicio si no lo
// tienes). Al terminarlo, la app pregunta si guardarlo o borrarlo.
async function entrenamientoDePrueba() {
  const { CATALOGO, normalizar } = await import('../catalogo.js');
  const { ejercicioDesdeCatalogo } = await import('./selector-ejercicios.js');
  const { entradaDeEjercicio } = await import('../series.js');
  const { sedeInicial } = await import('../sedes.js');
  const id = nuevoId('ses');
  estado.cambiar((datos) => {
    let ej = datos.ejercicios.find((e) => normalizar(e.nombre) === normalizar('Flexiones') && !e.archivado);
    if (!ej) {
      ej = ejercicioDesdeCatalogo(CATALOGO.find((x) => x.nombre === 'Flexiones'));
      datos.ejercicios.push(ej);
    }
    datos.sesiones.push({
      id, fecha: hoyISO(), sedeId: sedeInicial(datos, null), rutinaId: null, diaRutinaId: null, tutorial: true,
      estado: 'en-curso', inicio: new Date().toISOString(), fin: null, notas: '', borrada: null, sensacionesCerrada: true,
      ejercicios: [entradaDeEjercicio(datos, ej, { excluirSesion: id })],
    });
  });
  location.hash = `#/sesion/${id}`;
}

function pasosDe(nivel) {
  return nivel === 'avanzado' ? [...PASOS_BASICOS, ...PASOS_AVANZADOS] : PASOS_BASICOS;
}

const enInicio = () => location.hash === '' || location.hash === '#' || location.hash === '#/';

export function iniciarGuia() {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.paso = 0;
  }, { tecleo: true });
  if (!enInicio()) location.hash = '#/';
  window.scrollTo(0, 0);
  pintarGuia();
}

function terminarGuia() {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.paso = null;
    x.perfil.tutoriales.guiaHecha = true;
  }, { tecleo: true });
  pintarGuia();
}

// Se llama después de pintar cada pantalla: enseña el panel si la guía va
// por algún paso, o lo quita.
export function pintarGuia() {
  const d = estado.datos();
  const t = d?.perfil?.tutoriales;
  const n = t?.paso;
  const principal = document.getElementById('vista');
  if (!estado.usuario() || n == null || t.nivel === 'ninguno') {
    panel?.remove(); panel = null;
    if (principal) principal.style.paddingBottom = '';
    for (const el of document.querySelectorAll('.parpadea')) el.classList.remove('parpadea');
    return;
  }
  const pasos = pasosDe(t.nivel);
  const paso = pasos[Math.min(n, pasos.length - 1)];
  if (!panel || !panel.isConnected) {
    panel = h('aside', { class: 'guia', role: 'dialog', 'aria-label': 'Guía paso a paso' });
    document.body.append(panel);
  }
  const ir = (k) => {
    if (k >= pasos.length) { terminarGuia(); return; }
    estado.cambiar((x) => { x.perfil.tutoriales.paso = k; }, { tecleo: true });
    const destino = pasos[k];
    const yaAlli = destino.ruta === '#/' ? enInicio() : location.hash === destino.ruta;
    if (yaAlli) pintarGuia(); else location.hash = destino.ruta;
    window.scrollTo(0, 0);
  };
  // El elemento del que habla el paso parpadea para que se vea dónde tocar.
  for (const el of document.querySelectorAll('.parpadea')) el.classList.remove('parpadea');
  const objetivo = paso.selector ? document.querySelector(paso.selector) : null;
  objetivo?.classList.add('parpadea');
  panel.replaceChildren();
  anadir(panel,
    h('div', { class: 'guia-cabecera' },
      h('strong', {}, paso.titulo),
      h('span', { class: 'suave' }, `paso ${n + 1} de ${pasos.length}`)),
    h('p', {}, paso.texto),
    paso.glosario && h('p', { class: 'guia-glosario' }, paso.glosario.map((g) => queEs(g))),
    paso.prueba && h('button', { class: 'boton secundario parpadea', onclick: entrenamientoDePrueba }, 'Hacer un entrenamiento de prueba'),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton enlace', onclick: terminarGuia }, 'Salir'),
      n > 0 && h('button', { class: 'boton secundario', onclick: () => ir(n - 1) }, 'Anterior'),
      h('button', { class: 'boton', onclick: () => ir(n + 1) }, n + 1 >= pasos.length ? 'Terminar' : 'Siguiente')));
  // La pantalla deja sitio para el panel, y el elemento del que habla el
  // paso se pone a la vista (después de que la app coloque el scroll).
  if (principal) principal.style.paddingBottom = `${panel.offsetHeight + 24}px`;
  if (objetivo) setTimeout(() => objetivo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
}
