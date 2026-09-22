// Tutorial: guías paso a paso por las pantallas y «pistas», notas pequeñas
// que explican una pantalla la primera vez y se cierran con ✕ para no
// volver. Lo visto se guarda en el perfil, así va con la cuenta.
//
// Hay tres guías, y se hacen en este orden o sueltas:
//   'bienvenida' de qué va la app, lo que ya viene hecho, los ajustes que
//                te ahorran trabajo y un primer entrenamiento guiado;
//   'ejercicios' cómo es la ficha de un ejercicio y cómo crear el tuyo;
//   'rutinas'    cómo montar tus días y ponerles ejercicios.
//
// Niveles:
//   'basico'   te lo explica todo;
//   'avanzado' solo dónde está cada cosa, sin explicar conceptos;
//   'ninguno'  nada.
// Lo que va de conceptos (progresiones, programas, técnicas…) vive en la
// pantalla «Aprender», no en la guía.

import * as estado from '../estado.js';
import { h, anadir, modal, nuevoId, hoyISO } from '../ui.js';
import { queEs } from './glosario.js';

export const NIVELES = {
  basico: { etiqueta: 'Explícamelo todo', descripcion: 'Cada paso con su explicación, notas cortas en cada pantalla la primera vez y un primer entrenamiento guiado casilla a casilla.' },
  avanzado: { etiqueta: 'Solo dime dónde está cada cosa', descripcion: 'Los mismos pasos, en corto y sin explicar conceptos. Solo queda la nota de la recámara, que es particular de esta app.' },
  ninguno: { etiqueta: 'Sin tutorial', descripcion: 'Ninguna guía ni nota. Siempre puedes activarlas en Aprender.' },
};

function config(d = estado.datos()) {
  return d?.perfil?.tutoriales ?? { nivel: null, vistos: {} };
}

export function nivelTutorial(d) {
  return config(d).nivel ?? null;
}

// repintar: false deja la pantalla como está, para que no se cierre el
// apartado abierto mientras cambias de nivel.
export function fijarNivel(nivel, { repintar = true } = {}) {
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.nivel = nivel;
  }, repintar ? {} : { tecleo: true });
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
// Guías paso a paso: un panel abajo que te lleva por las pantallas
// ---------------------------------------------------------------------------

// Cada paso tiene el texto largo (explícamelo todo) y el corto (solo dónde
// está cada cosa). `selector` es lo que parpadea en esa pantalla.
export const GUIAS = {
  bienvenida: {
    titulo: 'Bienvenida',
    resumen: 'De qué va la app, lo que ya viene hecho y tu primer entrenamiento guiado. Empieza por aquí.',
    pasos: [
      { ruta: '#/', titulo: 'Hoy', selector: 'main .boton.grande',
        texto: 'Esta es la idea de la app: entras, te dice qué toca hoy y tú solo apuntas lo que haces. El peso y las '
          + 'repeticiones los calcula ella con tu historial. No tienes que acordarte de nada ni llevar cuentas.',
        corto: 'Inicio: qué toca hoy, tu recuperación y el botón para empezar.' },

      { ruta: '#/rutinas', titulo: 'No tienes que montar nada', selector: '.anadir-plantilla',
        texto: 'Antes de crear nada: aquí abajo hay rutinas ya hechas, con sus días y sus ejercicios explicados. Con '
          + '«Añadir a mis rutinas» te llevas la rutina entera y sus ejercicios de un toque. En Ejercicios pasa igual: hay '
          + 'una lista general con más de trescientos. Crear los tuyos es para cuando quieras algo que no esté.',
        corto: 'Rutinas: las tuyas arriba, las prehechas abajo. Buscador y filtros por fuerza, cardio y yoga.' },

      { ruta: '#/ajustes', titulo: 'Ponlo a tu gusto una sola vez', selector: '#ap-entrenamiento-y-series',
        texto: 'Esto es lo que más tiempo ahorra y casi nadie lo ve. En estos apartados dices cuánto descansas, cuántas '
          + 'repeticiones te dejas en recámara, cómo son tus drop sets y cómo empiezan tus ciclos. A partir de ahí, cualquier '
          + 'rutina prehecha que cargues y cualquier ejercicio que añadas salen ya con tus números. Ajustes primero y una '
          + 'rutina prehecha después: tienes tu rutina en dos minutos.',
        corto: 'Ajustes: descansos, recámara, drop sets y ciclos. Lo que pongas aquí es lo que traen los ejercicios nuevos.' },

      { ruta: '#/ejercicios', titulo: 'Ejercicios', selector: '.buscador',
        texto: 'Aquí están los tuyos. Si escribes en el buscador que parpadea, debajo salen también los de la lista general, '
          + 'y se añaden con un toque. Tocando un ejercicio abres su ficha: sus series, sus músculos y cómo quieres que suba '
          + 'el peso. Para uno que no exista, «+ Nuevo» (hay una guía aparte para eso).',
        corto: 'Ejercicios: el buscador encuentra los tuyos y los de la lista general. Toca uno para su ficha.' },

      { ruta: '#/', titulo: 'Tu primer entrenamiento', prueba: true,
        texto: 'Ahora lo pruebas. El botón de abajo abre un entrenamiento de prueba con flexiones y te voy diciendo qué '
          + 'escribir en cada casilla. Al terminar decides si lo guardas o lo borras.',
        corto: 'Un entrenamiento de prueba, para ver cómo se apunta una serie y cómo arranca el descanso. Puedes saltarlo.' },

      { ruta: '#/cuerpo', titulo: 'Cuerpo', selector: '.cuerpos',
        texto: 'El mapa: verde, listo; naranja, a medias; rojo, aún tocado. Debajo, cuántas series has hecho de cada músculo '
          + 'esta semana y consejos. Todo lo calcula la app con lo que apuntas.',
        corto: 'Cuerpo: recuperación por músculo, volumen semanal y consejos.', glosario: ['recuperacion', 'volumen'] },

      { ruta: '#/historial', titulo: 'Historial', selector: '.cabecera-vista .boton',
        texto: 'Todos tus entrenamientos. El botón que parpadea sirve para apuntar uno de otro día: tócalo y te enseño cómo '
          + 'se hace; si no te hace falta, dale a «Siguiente» y seguimos. Lo que borres va a una papelera y se recupera.',
        corto: 'Historial: entrenamientos pasados, «+ De otro día» y la papelera.' },

      { ruta: '#/aprender', titulo: 'Aprender', selector: '#ap-glosario',
        texto: 'Ya puedes entrenar. Lo que quieras entender está aquí: qué significa cada palabra, cómo decide la app el peso '
          + 'de hoy, las técnicas de estiramiento y de dónde sale cada recomendación. También están las otras dos guías: '
          + 'crear tus ejercicios y montar tus rutinas.',
        corto: 'Aprender: glosario, cómo decide la app, estiramientos, fuentes y las otras guías.' },
    ],
  },

  ejercicios: {
    titulo: 'Crear tus propios ejercicios',
    resumen: 'Qué es cada pregunta de la ficha y cómo dejarla como quieres.',
    pasos: [
      { ruta: '#/ejercicios', titulo: 'Antes de crear', selector: '.buscador',
        texto: 'Búscalo primero: si está en la lista general, se añade con un toque y viene con sus músculos puestos. '
          + 'Solo hace falta crearlo cuando no exista o cuando quieras una variante tuya.',
        corto: 'Busca antes de crear: la lista general trae más de trescientos.' },
      { ruta: '#/ejercicio/nuevo', titulo: 'Con qué peso se hace', selector: 'fieldset',
        texto: 'La primera pregunta: peso libre, máquina de placas, tu peso corporal, máquina asistida, altura o distancia de '
          + 'salto, o sin peso. De aquí sale cómo se apuntan los kilos y qué pesos te propone la app.',
        corto: 'Primera pregunta: con qué peso se hace.' },
      { ruta: '#/ejercicio/nuevo', titulo: 'Qué apuntas', selector: 'fieldset:nth-of-type(2)',
        texto: 'La segunda: repeticiones, tiempo, distancia, o varias a la vez. La primera que marcas es la que llevan las '
          + 'reglas; las demás se apuntan al lado, por si quieres guardar también los metros o los minutos.',
        corto: 'Segunda pregunta: qué se apunta en cada serie. Se pueden marcar varias.' },
      { ruta: '#/ejercicio/nuevo', titulo: 'Cómo te lleva la app', selector: '.plan-serie',
        texto: 'La tercera, y la que hace el trabajo: una regla por serie. La más sencilla es la doble progresión (subes '
          + 'repeticiones y, al llegar arriba, la app sube el peso). El ciclo a escalera son tres preguntas: qué mejora cada '
          + 'sesión, cuándo se acaba el ciclo y por dónde empieza el siguiente, con prehechos para no pensar.',
        corto: 'Tercera pregunta: la regla de cada serie. El ciclo va en tres bloques con prehechos.',
        glosario: ['doble-progresion', 'bilbo'] },
      { ruta: '#/ejercicio/nuevo', titulo: 'Lo demás está plegado', selector: 'details',
        texto: 'Los músculos, las técnicas de intensidad y los «Ajustes finos» (dónde se hace, fórmula del 1RM, tu recámara '
          + 'para este ejercicio, notas) están plegados: ábrelos solo si los necesitas. Todo se guarda solo, y si te '
          + 'equivocas puedes deshacer o salir sin guardar.',
        corto: 'Músculos, técnicas y ajustes finos van plegados. Se guarda solo.' },
    ],
  },

  rutinas: {
    titulo: 'Crear tus propias rutinas',
    resumen: 'Montar tus días, ponerles ejercicios y decidir cuándo toca cada uno.',
    pasos: [
      { ruta: '#/rutinas', titulo: 'Copia antes de montar', selector: '.anadir-plantilla',
        texto: 'Lo más rápido: añade una prehecha parecida a lo que quieres y luego cámbiale lo que no te encaje. Trae los '
          + 'días, los ejercicios y una explicación de por qué es así.',
        corto: 'Añade una prehecha y cámbiala: más rápido que empezar de cero.' },
      { ruta: '#/rutina/nueva', titulo: 'Los días', selector: '.formulario',
        texto: 'Una rutina son días en orden: «empuje», «tirón», «pierna»… Ponles el nombre que quieras. La app te propondrá '
          + 'el siguiente al último que hiciste.',
        corto: 'Días en orden, con el nombre que quieras.' },
      { ruta: '#/rutina/nueva', titulo: 'Los ejercicios de cada día', selector: '.formulario',
        texto: 'Dentro de cada día añades ejercicios, tuyos o de la lista general. El orden es el que verás al entrenar, y se '
          + 'puede cambiar luego.',
        corto: 'Cada día lleva sus ejercicios, en el orden en que los harás.' },
      { ruta: '#/rutina/nueva', titulo: 'Cuándo toca', selector: '.formulario',
        texto: 'Puedes fijar días de la semana (lunes y jueves, por ejemplo) o no poner ninguno. Sin días fijos, la app elige '
          + 'la rutina que mejor recuperada tengas. Y puedes tener varias activas a la vez: fuerza y estiramientos, por ejemplo.',
        corto: 'Días de la semana o, si no pones ninguno, manda la recuperación.' },
    ],
  },
};

let panel = null;
let subpaso = 0;   // dentro del entrenamiento de prueba: qué casilla toca

function guiaActual(t) {
  return GUIAS[t?.guia] ?? GUIAS.bienvenida;
}

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
  const pasos = guiaActual(t).pasos;
  const k = pasos.findIndex((p) => p.prueba);
  if (k < 0 || t.paso !== k) return;
  estado.cambiar((x) => { x.perfil.tutoriales.paso = k + 1; }, { tecleo: true });
  const destino = pasos[k + 1];
  if (destino && !(destino.ruta === '#/' ? enInicio() : location.hash === destino.ruta)) location.hash = destino.ruta;
  else pintarGuia();
}

const enInicio = () => location.hash === '' || location.hash === '#' || location.hash === '#/';

export function iniciarGuia(clave = 'bienvenida') {
  subpaso = 0;
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.guia = clave;
    x.perfil.tutoriales.paso = 0;
  }, { tecleo: true });
  const destino = (GUIAS[clave] ?? GUIAS.bienvenida).pasos[0].ruta;
  if (!(destino === '#/' ? enInicio() : location.hash === destino)) location.hash = destino;
  window.scrollTo(0, 0);
  pintarGuia();
}

function terminarGuia() {
  const clave = estado.datos()?.perfil?.tutoriales?.guia ?? 'bienvenida';
  estado.cambiar((x) => {
    x.perfil.tutoriales ??= { nivel: null, vistos: {} };
    x.perfil.tutoriales.paso = null;
    x.perfil.tutoriales.hechas ??= {};
    x.perfil.tutoriales.hechas[clave] = true;
    if (clave === 'bienvenida') x.perfil.tutoriales.guiaHecha = true;
    // Un entrenamiento de prueba sin terminar no se queda colgado.
    x.sesiones = x.sesiones.filter((s) => !(s.tutorial && s.estado === 'en-curso'));
  });
  if (/^#\/sesion\//.test(location.hash)) location.hash = '#/';
  pintarGuia();
}

// Dentro del entrenamiento de prueba: qué casilla toca ahora y qué decir.
// Se mira el estado real de la serie, así el texto va con lo que haces y no
// se pasa de casilla hasta que la rellenas.
function subpasoDePrueba(sesion) {
  const serie = sesion.ejercicios[0]?.series[0];
  if (serie?.esfuerzo == null) {
    return { selector: '#vista .serie input[aria-label="Repeticiones"]',
      texto: ['Haz una serie de flexiones: todas las que puedas con buena forma. Luego escribe cuántas ', queEs('repeticion', 'repeticiones'),
        ' has hecho en la casilla que parpadea. Cada casilla lleva encima su nombre.'] };
  }
  if (subpaso < 1) {
    return { selector: '#vista .serie input[aria-label="Repeticiones en recámara"]', boton: 'Ya está',
      texto: ['Debajo va la ', queEs('recamara', 'recámara'), ': cuántas más podrías haber hecho. Viene puesta 1 porque es lo que ',
        'recomendamos (quedarse a una del fallo). Si te dejaste 3, pon 3; si no podías más, 0. Arriba ya está corriendo el descanso: '
        + 'puedes alargarlo o saltarlo.'] };
  }
  if (subpaso < 2) {
    return { selector: '#vista .boton.secundario.grande', boton: 'Sigo',
      texto: 'Si un día te apetece hacer algo que no estaba en la rutina, con este botón lo añades al entrenamiento, aunque '
        + 'no sea tuyo todavía: lo buscas y entra con sus músculos puestos. Hoy no hace falta.' };
  }
  return { selector: '#vista .boton.grande.terminar-entreno',
    texto: 'Ya está. Toca «Terminar entrenamiento» y elige si lo guardas o lo borras: al ser de prueba, no cuenta para tus récords '
      + 'ni para la recuperación si lo borras.' };
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
  const guia = guiaActual(t);
  const PASOS = guia.pasos;
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
  const enSuRuta = paso.ruta === '#/' ? enInicio() : location.hash.startsWith(paso.ruta);
  for (const el of document.querySelectorAll('.parpadea')) el.classList.remove('parpadea');
  const selector = sub ? sub.selector : (enSuRuta ? paso.selector : null);
  const objetivo = selector ? document.querySelector(selector) : null;
  objetivo?.classList.add('parpadea');

  const hayPrueba = paso.prueba && d.sesiones.some((s) => s.tutorial && s.estado === 'en-curso' && !s.borrada);
  panel.replaceChildren();
  anadir(panel,
    h('div', { class: 'guia-cabecera' },
      h('strong', {}, paso.titulo),
      h('span', { class: 'suave' }, `${guia.titulo} · paso ${n + 1} de ${PASOS.length}`)),
    h('p', {}, sub ? sub.texto : (corto ? paso.corto : paso.texto)),
    !corto && !sub && paso.glosario && h('p', { class: 'guia-glosario' }, paso.glosario.map((g) => queEs(g))),
    paso.prueba && !sub && h('button', { class: 'boton grande parpadea guia-prueba', onclick: entrenamientoDePrueba },
      hayPrueba ? 'Volver al entrenamiento de prueba' : 'Hacer el entrenamiento de prueba'),
    sub?.boton && h('button', { class: 'boton secundario', onclick: () => { subpaso += 1; pintarGuia(); } }, sub.boton),
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
