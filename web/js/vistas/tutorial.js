// Tutorial: una guía paso a paso por las pantallas y «pistas», notas
// pequeñas que explican una pantalla la primera vez y se cierran con ✕ para
// no volver. Lo visto se guarda en el perfil, así va con la cuenta.
//
// Niveles:
//   'basico'   te lo explica todo: siete pasos con explicaciones, notas en
//              cada pantalla y un primer entrenamiento guiado casilla a casilla.
//   'avanzado' solo dónde está cada cosa: los mismos siete pasos, en corto,
//              sin notas (salvo la de la recámara, que es cosa de esta app).
//   'ninguno'  nada.
// Lo que va de conceptos (progresiones, programas, técnicas…) vive en la
// pantalla «Aprender», no en la guía.

import * as estado from '../estado.js';
import { h, anadir, modal, nuevoId, hoyISO } from '../ui.js';
import { queEs } from './glosario.js';

export const NIVELES = {
  basico: { etiqueta: 'Explícamelo todo', descripcion: 'Un paseo de siete pasos por las pantallas, una nota corta en cada una la primera vez y un primer entrenamiento guiado casilla a casilla.' },
  avanzado: { etiqueta: 'Solo dime dónde está cada cosa', descripcion: 'El mismo paseo, en corto y sin explicar conceptos. Solo queda la nota de la recámara, que es particular de esta app.' },
  ninguno: { etiqueta: 'Sin tutorial', descripcion: 'Ninguna guía ni nota. Siempre puedes activarlas en Aprender.' },
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

// Una pista, o null si no toca enseñarla. En el nivel «solo dónde está
// cada cosa» solo sale la de la recámara.
export function pista(clave, texto) {
  const t = config();
  const nivel = t.nivel ?? 'basico';
  if (nivel === 'ninguno') return null;
  if (nivel === 'avanzado' && clave !== 'sesion-datos') return null;
  if (t.vistos?.[clave]) return null;
  const caja = h('div', { class: 'pista', role: 'note' },
    h('span', { class: 'pista-icono', 'aria-hidden': 'true' }, '💡'),
    h('span', { class: 'pista-texto' }, texto),
    h('button', { class: 'pista-cerrar', 'aria-label': 'Entendido, no volver a enseñar',
      onclick: () => { marcarVista(clave); caja.remove(); } }, '✕'));
  return caja;
}

// Cartel para elegir cuánto quieres que te guíe (desde Aprender).
export function elegirNivel({ alElegir } = {}) {
  const cerrar = modal('¿Cuánto te explico?', h('div', { class: 'tutorial-niveles' },
    Object.entries(NIVELES).map(([clave, n]) => h('button', { class: 'tarjeta fila-enlace', onclick: () => {
      fijarNivel(clave);
      cerrar();
      alElegir?.(clave);
      if (clave !== 'ninguno') iniciarGuia();
    } },
    h('div', {}, h('strong', {}, n.etiqueta), h('div', { class: 'suave' }, n.descripcion))))));
  return cerrar;
}

// ---------------------------------------------------------------------------
// Guía paso a paso: un panel abajo que te lleva por las pantallas
// ---------------------------------------------------------------------------

// Cada paso tiene el texto largo (explícamelo todo) y el corto (solo dónde
// está cada cosa). `selector` es lo que parpadea en esa pantalla.
const PASOS = [
  { ruta: '#/', titulo: 'Hoy', selector: 'main .boton.grande',
    texto: 'Esta es tu pantalla de inicio. Arriba te dice qué toca hoy según tu rutina y debajo cómo va tu recuperación. '
      + 'Cada entrenamiento se empieza con el botón que parpadea.',
    corto: 'Inicio: qué toca hoy, tu recuperación y el botón para empezar.' },
  { ruta: '#/rutinas', titulo: 'Rutinas', selector: '.plantilla button',
    texto: 'Una rutina son tus días de entrenamiento, en orden. Abajo hay rutinas ya hechas: con «Añadir a mis rutinas» '
      + 'te llevas la rutina y sus ejercicios en un toque. Si no sabes cuál, la que te recomendé en Hoy.',
    corto: 'Rutinas: las tuyas arriba, las prehechas abajo. Puedes tener varias activas y fijar días de la semana.' },
  { ruta: '#/ejercicios', titulo: 'Ejercicios', selector: '.cabecera-vista .boton',
    texto: 'Aquí están tus ejercicios. Tocando uno cambias sus series, sus músculos y cómo quieres que suba el peso. '
      + 'Con el botón que parpadea añades uno de la lista o creas el tuyo. Se guarda todo solo.',
    corto: 'Ejercicios: la ficha de cada uno (series, progresión, músculos, máquina). «+ Nuevo» para añadir de la lista.' },
  { ruta: '#/', titulo: 'Tu primer entrenamiento', prueba: true,
    texto: 'Lo mejor es probarlo. El botón de abajo abre un entrenamiento de prueba con flexiones y te voy diciendo qué '
      + 'escribir en cada casilla. Al terminar decides si lo guardas o lo borras.',
    corto: 'Un entrenamiento de prueba, para ver cómo se apunta una serie y cómo arranca el descanso. Puedes saltarlo.' },
  { ruta: '#/cuerpo', titulo: 'Cuerpo', selector: '.cuerpos',
    texto: 'El mapa: verde, listo; naranja, a medias; rojo, aún tocado. Debajo, cuántas series has hecho de cada músculo '
      + 'esta semana y consejos. Todo lo calcula la app con lo que apuntas.',
    corto: 'Cuerpo: recuperación por músculo, volumen semanal y consejos.', glosario: ['recuperacion', 'volumen'] },
  { ruta: '#/historial', titulo: 'Historial', selector: '.cabecera-vista .boton',
    texto: 'Todos tus entrenamientos. Con el botón que parpadea apuntas uno de otro día. Lo que borres va a una papelera '
      + 'y se puede recuperar.',
    corto: 'Historial: entrenamientos pasados, «+ De otro día» y la papelera.' },
  { ruta: '#/ajustes', titulo: 'Ajustes y Aprender', selector: '.apartado',
    texto: 'Arriba, tu nombre, tu peso y la cuenta de Google. Lo demás va por apartados plegados: descansos, drop sets, '
      + 'sitios donde entrenas y la zona de peligro. Ya puedes entrenar. Lo que quieras entender (progresiones, programas, '
      + 'técnicas de estiramiento, el glosario) está en «Aprender».',
    corto: 'Ajustes: perfil, cuenta, descansos, drop sets, sitios y zona de peligro. En «Aprender», el glosario y las explicaciones.' },
];

let panel = null;
let subpaso = 0;   // dentro del entrenamiento de prueba: qué casilla toca

// Un entrenamiento de prueba con flexiones (se crea el ejercicio si no lo
// tienes). Al terminarlo, la app pregunta si guardarlo o borrarlo.
async function entrenamientoDePrueba() {
  for (const m of document.querySelectorAll('.modal-fondo')) m.remove();
  const abierta = estado.datos().sesiones.find((s) => s.tutorial && s.estado === 'en-curso' && !s.borrada);
  if (abierta) { location.hash = `#/sesion/${abierta.id}`; return; }
  const { CATALOGO, normalizar } = await import('../catalogo.js');
  const { ejercicioDesdeCatalogo } = await import('./selector-ejercicios.js');
  const { entradaDeEjercicio } = await import('../series.js');
  const { sedeInicial } = await import('../sedes.js');
  const id = nuevoId('ses');
  subpaso = 0;
  estado.cambiar((datos) => {
    let ej = datos.ejercicios.find((e) => normalizar(e.nombre) === normalizar('Flexiones') && !e.archivado);
    if (!ej) {
      ej = ejercicioDesdeCatalogo(CATALOGO.find((x) => x.nombre === 'Flexiones'));
      datos.ejercicios.push(ej);
    }
    const entrada = entradaDeEjercicio(datos, ej, { excluirSesion: id });
    entrada.series = entrada.series.slice(0, 1);   // una sola serie: es una prueba
    datos.sesiones.push({
      id, fecha: hoyISO(), sedeId: sedeInicial(datos, null), rutinaId: null, diaRutinaId: null, tutorial: true,
      estado: 'en-curso', inicio: new Date().toISOString(), fin: null, notas: '', borrada: null, sensacionesCerrada: true,
      vista: { modo: 'todo', pos: null },
      ejercicios: [entrada],
    });
  });
  location.hash = `#/sesion/${id}`;
}

// Al acabar el entrenamiento de prueba (guardado o borrado), la guía pasa
// sola al paso siguiente.
export function guiaTrasPrueba() {
  const t = estado.datos()?.perfil?.tutoriales;
  if (t?.paso == null) return;
  const k = PASOS.findIndex((p) => p.prueba);
  if (k < 0 || t.paso !== k) return;
  estado.cambiar((x) => { x.perfil.tutoriales.paso = k + 1; }, { tecleo: true });
  const destino = PASOS[k + 1];
  if (destino && !(destino.ruta === '#/' ? enInicio() : location.hash === destino.ruta)) location.hash = destino.ruta;
  else pintarGuia();
}

const enInicio = () => location.hash === '' || location.hash === '#' || location.hash === '#/';

export function iniciarGuia() {
  subpaso = 0;
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
    // Un entrenamiento de prueba sin terminar no se queda colgado.
    x.sesiones = x.sesiones.filter((s) => !(s.tutorial && s.estado === 'en-curso'));
  });
  if (/^#\/sesion\//.test(location.hash)) location.hash = '#/';
  pintarGuia();
}

// Dentro del entrenamiento de prueba: qué casilla toca ahora y qué decir.
// Se mira el estado real de la serie, así el texto va con lo que haces.
function subpasoDePrueba(sesion) {
  const serie = sesion.ejercicios[0]?.series[0];
  const hechas = serie?.esfuerzo != null;
  if (!hechas) {
    return { selector: '#vista .serie input[aria-label="Repeticiones"]',
      texto: ['Haz una serie de flexiones: todas las que puedas con buena forma. Luego escribe cuántas ', queEs('repeticion', 'repeticiones'),
        ' has hecho en la casilla que parpadea. Si llevabas algún peso encima, va en «lastre»; si no, déjalo.'] };
  }
  if (subpaso < 1) {
    return { selector: '#vista .serie input[aria-label="Repeticiones en recámara"]', boton: 'Ya está',
      texto: ['En la casilla «+» va la ', queEs('recamara', 'recámara'), ': cuántas más podrías haber hecho. Viene puesto 1 porque es lo que ',
        'recomendamos (quedarse a una del fallo). Si te dejaste 3, pon 3; si no podías más, 0. Abajo ya corre el descanso.'] };
  }
  return { selector: '#vista .boton.grande.terminar-entreno',
    texto: 'Cuando acabe el descanso harías la siguiente serie. Hoy basta con una: toca «Terminar entrenamiento» y elige si lo guardas o lo borras.' };
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
  const corto = t.nivel === 'avanzado';
  const paso = PASOS[Math.min(n, PASOS.length - 1)];
  if (!panel || !panel.isConnected) {
    panel = h('aside', { class: 'guia', role: 'dialog', 'aria-label': 'Guía paso a paso' });
    document.body.append(panel);
  }
  const ir = (k) => {
    if (k >= PASOS.length) { terminarGuia(); return; }
    estado.cambiar((x) => { x.perfil.tutoriales.paso = k; }, { tecleo: true });
    const destino = PASOS[k];
    const yaAlli = destino.ruta === '#/' ? enInicio() : location.hash === destino.ruta;
    if (yaAlli) pintarGuia(); else location.hash = destino.ruta;
    window.scrollTo(0, 0);
  };

  // Dentro del entrenamiento de prueba, el panel va casilla a casilla.
  const sesionPrueba = paso.prueba && /^#\/sesion\//.test(location.hash)
    ? d.sesiones.find((s) => s.tutorial && s.estado === 'en-curso' && location.hash === `#/sesion/${s.id}`)
    : null;
  const sub = sesionPrueba ? subpasoDePrueba(sesionPrueba) : null;

  // Solo parpadea algo si estamos en la pantalla del paso: fuera de ella
  // (por ejemplo, dentro de otro entrenamiento) no hay nada que señalar.
  const enSuRuta = paso.ruta === '#/' ? enInicio() : location.hash === paso.ruta;
  for (const el of document.querySelectorAll('.parpadea')) el.classList.remove('parpadea');
  const selector = sub ? sub.selector : (enSuRuta ? paso.selector : null);
  const objetivo = selector ? document.querySelector(selector) : null;
  objetivo?.classList.add('parpadea');

  const hayPrueba = paso.prueba && d.sesiones.some((s) => s.tutorial && s.estado === 'en-curso' && !s.borrada);
  panel.replaceChildren();
  anadir(panel,
    h('div', { class: 'guia-cabecera' },
      h('strong', {}, paso.titulo),
      h('span', { class: 'suave' }, `paso ${n + 1} de ${PASOS.length}`)),
    h('p', {}, sub ? sub.texto : (corto ? paso.corto : paso.texto)),
    !corto && !sub && paso.glosario && h('p', { class: 'guia-glosario' }, paso.glosario.map((g) => queEs(g))),
    paso.prueba && !sub && h('button', { class: 'boton secundario parpadea', onclick: entrenamientoDePrueba },
      hayPrueba ? 'Volver al entrenamiento de prueba' : 'Hacer el entrenamiento de prueba'),
    sub?.boton && h('button', { class: 'boton secundario', onclick: () => { subpaso = 1; pintarGuia(); } }, sub.boton),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton enlace', onclick: terminarGuia }, 'Salir'),
      n > 0 && !sub && h('button', { class: 'boton secundario', onclick: () => ir(n - 1) }, 'Anterior'),
      !sub && h('button', { class: 'boton', onclick: () => ir(n + 1) },
        n + 1 >= PASOS.length ? 'Terminar' : (paso.prueba ? 'Saltar la prueba' : 'Siguiente'))));
  // La pantalla deja sitio para el panel, y el elemento del que habla el
  // paso se pone a la vista (después de que la app coloque el scroll).
  if (principal) principal.style.paddingBottom = `${panel.offsetHeight + 24}px`;
  if (objetivo) setTimeout(() => objetivo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
}
