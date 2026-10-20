import { icono } from '../iconos.js';
import { abrirFichaEnProgresion } from './ejercicios.js';
import { seccionProgreso } from './graficas.js';
import { abrirAsistenteSeries } from './configurar-series.js';
import { crearPlanesRapidos } from '../rapidas.js';
import { nombreRegla, planesDeItem, seriesDesdePlan } from '../series.js';
import {
  aPesoDisponible, cargaCorporal, cargaDesdeLectura, esfuerzoTotal, formatearNumero,
  pesoDePlan, redondear, rmDelEjercicio, rmDeReferencia, seriesDeEjercicio, sugerenciaSerie, trabajoSerie, tramosPropuestos, usaTramos,
} from '../calculos.js';
import { modeloDe, pesoParaReps, rmDeSerie } from '../formula1rm.js';
import { guiaTrasPrueba, marcarVista, pintarGuia, pista } from './tutorial.js';
import { queEs } from './glosario.js';
import { relojEnMarcha, relojSerie } from './reloj-serie.js';
import { duracionTexto } from './intervalos.js';
import { ayuda, modal, selector } from '../ui.js';
import { aplicarPreset } from '../ciclos.js';
import { renovarAlTocar } from '../sincronizacion.js';
import * as estado from '../estado.js';
import {
  TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_SERIE, camposDe, recamaraDe, serieNuevaPlantilla, tipoDeFallo, tramosDe,
} from '../esquema.js';
import { imagenDeEjercicio } from '../imagenes.js';
import {
  avisoPrimeraBajada, crearSerieDesdePlan, entradaDeEjercicio, modoCargaDe, origenModoCarga, recalcularTramos, saltoDeTramo,
  serieSuelta,
} from '../series.js';
import { anadir, aviso, confirmar, deslizarParaConfirmar, fechaLarga, h, formatearTiempo, leerNumero, leerTiempo } from '../ui.js';
import { DESCANSO_ESTIRAMIENTOS_POR_DEFECTO, arrancarDescanso, arrancarRespiracion, barraDescanso, descansoDeTramo, preguntaAvisos } from './descanso.js';
import { cuentaParaFatiga, tipoDeEjercicio } from '../catalogo.js';
import { ASISTENCIAS, ESCALA_MANO, PROGRAMAS, TECNICAS_ESTIRAMIENTO, extraDeSerie, medidasDe, unidadMedida } from '../esquema.js';
import { ORDEN_MUSCULOS, nombreMusculo } from '../musculos.js';
import { ESCALA_RECUPERACION, factorPersonal, puntuacionSentida, recuperacionPorMusculo } from '../recuperacion.js';
import { comparacionSerie, mostrarResumen } from './resumen-sesion.js';
import { ejercicioEnSede, nombreSede, sedesActivas } from '../sedes.js';
import { hoyISO } from '../ui.js';
import { ejercicioDesdeCatalogo, elegirEjercicio as abrirSelector } from './selector-ejercicios.js';
import { desplegableTecnicas, textoTecnicas } from './tecnicas.js';

// Cómo se va por el entrenamiento: 'serie' (una serie cada vez), 'ejercicio'
// (un ejercicio cada vez) o 'todo'. Se recuerda por sesión mientras la app
// esté abierta, y la elección queda en el perfil para la próxima vez.
const guiado = new Map();     // id de sesión → { modo, pos }
const preguntandoVista = new Set();   // sesiones con el cartel de vista a punto de salir
const vistaPreguntada = new Set();    // sesiones a las que ya se les preguntó: no se insiste
// Entrenamientos ya terminados que has abierto para editar. Sin esto, un día
// del historial se abre en resumen, sin nada que se pueda tocar sin querer.
const editando = new Set();
// Serie que espera a que montes su ciclo en la ficha: al volver se rehace.
let cicloPendiente = null;

export const MODOS_ENTRENO = {
  serie: { etiqueta: 'Solo la serie que toca', descripcion: 'Una serie en pantalla: deslizas para pasar a la siguiente. Lo más limpio.' },
  ejercicio: { etiqueta: 'Solo el ejercicio en el que estoy', descripcion: 'Con todas sus series; pasas al siguiente cuando acabas.' },
  todo: { etiqueta: 'Todos los ejercicios', descripcion: 'La lista entera, para moverte libremente.' },
};

// Qué es cada tipo de serie, en una línea (sale al elegirlo).
const EXPLICA_TIPO = {
  bilbo: 'Sobrecarga progresiva: la app te dice el peso y el objetivo, según la progresión de cargas.',
  intensidad: 'Con una técnica: serie descendente, rest-pause, miorrepeticiones…',
  calentamiento: 'No cuenta para la recuperación ni para las series de la semana.',
  libre: 'Cuenta como una serie normal, pero sin objetivo: apuntas lo que hagas.',
};

// Las fotos del entreno, una por ejercicio: al cambiar de serie se reutiliza
// la misma imagen, así el dibujo no parpadea ni vuelve a empezar.
const fotosVivas = new Map();
// Hacia dónde entra la serie nueva (modo «serie»): solo se anima la serie.
let serieEntra = null;

// Calentamientos abiertos para cambiar sus pesos («sesión:ejercicio»).

// Hacia dónde se deslizó la última tarjeta (para animar la siguiente).
let direccionPendiente = null;

export function vistaSesion(contenedor, { id }) {
  const d = estado.datos();
  const sesion = d.sesiones.find((s) => s.id === id);
  if (!sesion) {
    anadir(contenedor, h('p', {}, 'Este entrenamiento no existe.'), h('a', { href: '#/' }, 'Volver'));
    return;
  }
  const ejercicioDe = (ejId) => d.ejercicios.find((e) => e.id === ejId);
  if (cicloPendiente?.sesion === id) {
    const { ej: ejId, i, j } = cicloPendiente;
    const plan = (ejercicioDe(ejId)?.series || []).find((p) => p.progresion?.tipo === 'bilbo');
    const vieja = sesion.ejercicios[i]?.series[j];
    if (plan && vieja && !vieja.hecha) {
      cicloPendiente = null;
      estado.cambiar((datos) => {
        const s = datos.sesiones.find((x) => x.id === id);
        const e = datos.ejercicios.find((x) => x.id === ejId);
        s.ejercicios[i].series[j] = { ...crearSerieDesdePlan(datos, e, e.series.find((p) => p.id === plan.id), { excluirSesion: id }), id: vieja.id };
      });
      return;
    }
    if (!plan) cicloPendiente = null;
  }
  if (sesion.estado === 'terminada' && !editando.has(id)) {
    resumenDelDia(contenedor, d, sesion);
    return;
  }
  // La vista elegida se guarda en la sesión: si el móvil cierra la app y
  // vuelves, sigues donde estabas.
  if (!guiado.has(id) && sesion.vista?.modo) guiado.set(id, { modo: sesion.vista.modo, pos: sesion.vista.pos ?? null, serie: sesion.vista.serie ?? null });
  const eleccion = guiado.get(id) ?? null;
  const modo = eleccion?.modo ?? 'todo';
  const posicion = eleccion?.pos ?? null;     // null = ver el entrenamiento entero
  const serieElegida = eleccion?.serie ?? null;   // modo «serie»: cuál se ve (null = la primera sin hacer)
  let direccionDeslizar = direccionPendiente;
  direccionPendiente = null;
  const algoHecho = sesion.ejercicios.some((e) => e.series.some((s) => s.hecha));

  // Modifica esta sesión. Se busca de nuevo dentro de cambiar() por si los
  // datos se han sustituido desde Drive mientras tanto.
  const cambiarSesion = (fn, opciones) => estado.cambiar((datos) => {
    const s = datos.sesiones.find((x) => x.id === id);
    if (s) fn(s, datos);
  }, opciones);

  const enCurso = sesion.estado === 'en-curso';
  const movil = matchMedia('(max-width: 699px)').matches;
  if (enCurso) contenedor.classList.add('con-barra-entreno');
  // En el móvil, el entreno ocupa la pantalla: fuera las pestañas de abajo
  // (se vuelve a ellas desde «⋯» o con la banda de arriba de las demás pantallas).
  document.body.classList.toggle('entreno-a-pantalla', enCurso && movil);
  document.body.classList.toggle('hay-barra-entreno', enCurso);
  const unaSerie = modo === 'serie' && posicion != null;
  const visibles = posicion == null
    ? sesion.ejercicios.map((entrada, i) => [entrada, i])
    : sesion.ejercicios.slice(posicion, posicion + 1).map((entrada) => [entrada, posicion]);

  const notasSesion = h('label', { class: 'campo notas-sesion', hidden: enCurso && !sesion.notas },
    h('span', { class: 'etiqueta-campo' }, 'Comentarios del entrenamiento'),
    h('textarea', { rows: 2, value: sesion.notas || '',
      oninput: (e) => cambiarSesion((s) => { s.notas = e.target.value; }, { tecleo: true }) }));

  anadir(contenedor,
    sesion.borrada && h('div', { class: 'tarjeta aviso-tarjeta' },
      h('p', {}, 'Este entrenamiento está en la papelera: no cuenta para tu progresión.'),
      h('button', { class: 'boton', onclick: recuperar }, 'Recuperar entrenamiento')),

    !enCurso && h('h1', {}, 'Entrenamiento'),
    h('div', { class: 'fila-cabecera-entreno' },
      h('input', { type: 'date', class: 'fecha', value: sesion.fecha, 'aria-label': 'Fecha',
        onchange: (e) => e.target.value && cambiarSesion((s) => moverFecha(s, e.target.value)) }),
      sedesActivas(d).length > 0 && selector([['', 'Lugar sin indicar'], ...sedesActivas(d).map((s) => [s.id, nombreSede(d, s.id)])], sesion.sedeId ?? '',
        (v) => cambiarSesion((s) => { s.sedeId = v || null; }), { titulo: 'Dónde entrenas hoy', lista: true }),
      enCurso && sesion.ejercicios.length > 0 && h('button', { type: 'button', class: 'boton-icono boton-vista',
        'aria-label': `Cómo ver el entrenamiento (ahora: ${MODOS_ENTRENO[modo]?.etiqueta.toLowerCase() ?? 'todos los ejercicios'})`,
        title: 'Cómo verlo', onclick: () => elegirVista() }, icono('ojo'))),

    sesion.diaRutinaId && h('p', { class: 'suave' }, nombreDelDia(d, sesion)),

    enCurso && (posicion == null || posicion === 0) && tarjetaComoLlegas(),

    barraDescanso(),
    enCurso && !sesion.tutorial && preguntaAvisos(),

    // Móvil, de uno en uno: puntitos (uno por ejercicio) y, la primera vez,
    // la nota de que se desliza. En el ordenador, nada arriba.
    enCurso && posicion != null && movil && puntosEjercicios(),
    enCurso && posicion != null && movil && (unaSerie
      ? pista('deslizar-series', 'Desliza la tarjeta a los lados para pasar de serie. Después de la última serie, pasas al siguiente ejercicio.',
        { siempre: true, icono: '⇆', clase: 'pista-deslizar' })
      : pista('deslizar-ejercicios', 'Desliza la tarjeta a los lados para cambiar de ejercicio.', { siempre: true, icono: '⇆', clase: 'pista-deslizar' })),
    !enCurso && posicion != null && pasoEntreEjercicios(),

    visibles.map(([entrada, i]) => tarjetaEjercicio(entrada, i)),

    // En el ordenador, «+ Añadir ejercicio» va debajo del ejercicio; en el
    // móvil está en la barra fija.
    (!enCurso || !movil) && h('button', { class: 'boton secundario grande anadir-ejercicio', onclick: elegirEjercicio }, '+ Añadir ejercicio'),

    // Comentarios del entrenamiento (desde «⋯»; abiertos si ya hay).
    notasSesion,

    enCurso
      ? medirBarra(barraEntreno())
      : [h('p', { class: 'nota' }, 'Cada cambio se guarda al momento. Si te equivocas, toca «Deshacer» en el aviso que sale abajo.'),
        h('button', { class: 'boton grande', onclick: () => { editando.delete(id); dispatchEvent(new HashChangeEvent('hashchange')); } }, 'Hecho, dejar de editar')],

    !sesion.borrada && posicion == null && !enCurso
      && h('button', { class: 'boton enlace peligro-texto', onclick: borrar }, 'Mover este entrenamiento a la papelera'));

  // El ejercicio no tiene ciclo: se elige uno aquí mismo (queda en su ficha)
  // o se abre la ficha para montarlo paso a paso.
  function elegirCiclo(ej, i, j) {
    const crear = (preset) => {
      cerrar();
      estado.cambiar((datos) => {
        const e = datos.ejercicios.find((x) => x.id === ej.id);
        if (!e) return;
        const plan = serieNuevaPlantilla(e, { tipo: 'bilbo', progresion: 'bilbo' });
        plan.progresion.preset = preset;
        aplicarPreset(plan.progresion, preset, e);
        e.series = [...(e.series || []), plan];
        const s = datos.sesiones.find((x) => x.id === id);
        const vieja = s.ejercicios[i].series[j];
        s.ejercicios[i].series[j] = { ...crearSerieDesdePlan(datos, e, plan, { excluirSesion: id }), id: vieja.id };
      });
      aviso('Ciclo añadido a la ficha del ejercicio.');
    };
    const corporal = ej.carga?.tipo === 'pesoCorporal' && medidasDe(ej)[0] === 'repeticiones';
    const cerrar = modal('¿Qué ciclo?', h('div', { class: 'lista-selector' },
      h('p', { class: 'nota' }, `${ej.nombre} aún no tiene ciclo. Elige uno y se queda en su ficha:`),
      h('button', { type: 'button', class: 'boton-marca', onclick: () => crear('bilbo') },
        h('strong', {}, corporal ? 'Bilbo con lastre' : 'Bilbo'),
        h('small', { class: 'bloque suave' }, corporal ? 'Fuerza: empieza con poco lastre y sube 2,5 kg cada sesión.'
          : 'Fuerza: empieza ligero con muchas repeticiones y sube 2,5 kg cada sesión.')),
      corporal && h('button', { type: 'button', class: 'boton-marca', onclick: () => crear('repeticiones') },
        h('strong', {}, 'Más repeticiones (sin lastre)'),
        h('small', { class: 'bloque suave' }, 'Con tu peso: una repetición más cada sesión hasta llegar a 20.')),
      h('button', { type: 'button', class: 'boton-marca', onclick: () => { cerrar(); cicloPendiente = { sesion: id, ej: ej.id, i, j }; abrirFichaEnProgresion(ej.id); } },
        h('strong', {}, 'Otro: montarlo en la ficha'), h('small', { class: 'bloque suave' }, 'Se abre el ejercicio para elegirlo paso a paso.'))));
  }

  // La barra fija de abajo. En el móvil: «+ Añadir ejercicio» y «⋯» a la
  // misma altura, y «Terminar» a todo el ancho cuando toca (último ejercicio,
  // todo hecho o viendo todos). En el ordenador: ‹, «Siguiente» y «⋯».
  function barraEntreno() {
    const n = sesion.ejercicios.length;
    const ultimo = posicion == null || posicion >= n - 1;
    const todoHecho = sesion.ejercicios.length > 0 && sesion.ejercicios.every((x) => x.series.every((s) => s.hecha));
    const mas = h('button', { type: 'button', class: 'boton secundario barra-mas', 'aria-label': 'Más opciones', onclick: masOpciones }, '⋯');
    const botonTerminar = h('button', { type: 'button', class: 'boton grande barra-terminar', onclick: terminar }, 'Terminar entrenamiento');
    if (movil) {
      return h('div', { class: 'barra-entreno' },
        h('div', { class: 'barra-entreno-fila' },
          h('button', { type: 'button', class: 'boton secundario barra-anadir', onclick: elegirEjercicio }, '+ Añadir ejercicio'), mas),
        ((ultimo && (!unaSerie || !sesion.ejercicios[posicion] || indiceSerie(sesion.ejercicios[posicion]) >= trabajoDe(sesion.ejercicios[posicion]).length - 1))
          || todoHecho) && deslizarParaTerminar());
    }
    if (posicion == null) {
      return h('div', { class: 'barra-entreno' }, h('div', { class: 'barra-entreno-fila' }, botonTerminar, mas));
    }
    const nombreSiguiente = d.ejercicios.find((x) => x.id === sesion.ejercicios[posicion + 1]?.ejercicioId)?.nombre ?? '';
    const entradaActual = sesion.ejercicios[posicion];
    const otraSerie = unaSerie && entradaActual && indiceSerie(entradaActual) < trabajoDe(entradaActual).length - 1;
    return h('div', { class: 'barra-entreno' },
      h('div', { class: 'barra-entreno-fila' },
        h('button', { type: 'button', class: 'boton secundario boton-paso-grande', 'aria-label': 'Anterior',
          disabled: posicion === 0 && (!unaSerie || indiceSerie(entradaActual) === 0),
          onclick: () => avanzar(-1) }, '‹'),
        ultimo && !otraSerie ? botonTerminar
          : h('button', { type: 'button', class: 'boton grande boton-siguiente', onclick: () => avanzar(1) },
            h('span', {}, otraSerie ? 'Siguiente serie ›' : 'Siguiente ›'), h('small', {}, otraSerie ? '' : nombreSiguiente)),
        mas));
  }

  // «Desliza para terminar» (lo eligió Dan).
  function deslizarParaTerminar() {
    return deslizarParaConfirmar('Desliza para terminar', terminar);
  }

  // Las series que se pasan de una en una (sus índices): todas, también los
  // calentamientos (Dan: «el calentamiento se ve como una serie»).
  function trabajoDe(entrada) {
    return (entrada?.series ?? []).map((s, j) => j);
  }

  // La serie que se ve en el modo «serie» (su posición entre las de
  // trabajo): la elegida o la primera sin hacer.
  function indiceSerie(entrada) {
    const t = trabajoDe(entrada);
    const n = t.length;
    if (!n) return 0;
    if (serieElegida != null) return Math.max(0, Math.min(n - 1, serieElegida === 'ultima' ? n - 1 : serieElegida));
    const sinHacer = t.findIndex((j) => !entrada.series[j].hecha);
    return sinHacer >= 0 ? sinHacer : n - 1;
  }

  // Pasar a lo siguiente (+1) o a lo anterior (-1): en el modo «serie», de
  // serie en serie y, al acabar las de un ejercicio, al siguiente; si no, de
  // ejercicio en ejercicio.
  function avanzar(paso) {
    if (posicion == null) return;
    if (unaSerie) {
      const entrada = sesion.ejercicios[posicion];
      const k = indiceSerie(entrada) + paso;
      if (entrada && k >= 0 && k < trabajoDe(entrada).length) {
        // La pantalla no se mueve y la foto se queda: solo entra la serie nueva.
        serieEntra = paso > 0 ? 'izquierda' : 'derecha';
        direccionDeslizar = null;
        const y = window.scrollY;
        guardarVista('serie', posicion, k);
        estado.emitir('vista');
        requestAnimationFrame(() => window.scrollTo(0, y));
        return;
      }
    }
    const nueva = posicion + paso;
    if (nueva < 0 || nueva >= sesion.ejercicios.length) return;
    irA(nueva, { serie: paso < 0 && unaSerie ? 'ultima' : null });
    window.scrollTo(0, 0);
  }

  // El alto de la barra fija, para que la flecha de volver arriba y el final
  // de la pantalla queden por encima de ella.
  function medirBarra(barra) {
    const raiz = document.documentElement;
    new ResizeObserver(() => { if (barra.isConnected) raiz.style.setProperty('--alto-barra-entreno', `${barra.offsetHeight}px`); }).observe(barra);
    return barra;
  }

  // Los puntitos de arriba: uno por ejercicio; el de ahora, alargado. Se
  // pueden tocar para saltar.
  function puntosEjercicios() {
    return h('div', { class: 'puntos-ejercicios', role: 'tablist', 'aria-label': 'Ejercicios' },
      sesion.ejercicios.map((x, k) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === posicion),
        'aria-label': ejercicioDe(x.ejercicioId)?.nombre ?? `Ejercicio ${k + 1}`, class: `${k === posicion ? 'activo' : ''}${x.series.length && x.series.every((s) => s.hecha) ? ' hecho' : ''}`,
        onclick: () => { irA(k); window.scrollTo(0, 0); } })));
  }

  // Deslizar la tarjeta del ejercicio: a la izquierda, el siguiente; a la
  // derecha, el anterior. Solo si el gesto es claramente horizontal.
  function deslizable(tarjeta) {
    let x0 = null, y0 = null;
    tarjeta.addEventListener('touchstart', (ev) => {
      if (ev.target.closest('input, textarea, button.chip')) { x0 = null; return; }
      x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY;
    }, { passive: true });
    tarjeta.addEventListener('touchend', (ev) => {
      if (x0 == null) return;
      const dx = ev.changedTouches[0].clientX - x0; const dy = ev.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      direccionDeslizar = dx < 0 ? 'izquierda' : 'derecha';
      // Ya sabe deslizar: fuera la tarjeta que lo explica.
      const clave = unaSerie ? 'deslizar-series' : 'deslizar-ejercicios';
      if (!d.perfil.tutoriales?.vistos?.[clave]) marcarVista(clave);
      avanzar(dx < 0 ? 1 : -1);
    });
    if (direccionDeslizar) { tarjeta.classList.add(`entra-${direccionDeslizar}`); direccionDeslizar = null; }
    return tarjeta;
  }

  // «⋯»: lo que no se usa en cada serie.
  function masOpciones() {
    const opciones = [
      posicion == null ? ['Ver de uno en uno', 'ojo', () => irA(0)] : ['Ver todos los ejercicios', 'ojo', () => irA(null)],
      ['Cómo verlo', 'ajustes', () => elegirVista()],
      ['Comentario del entrenamiento', 'bocadillo', () => { notasSesion.hidden = false; notasSesion.scrollIntoView({ block: 'center' }); notasSesion.querySelector('textarea').focus(); }],
      movil ? ['Ir a la app (el entreno sigue)', 'inicio', () => { location.hash = '#/'; }] : null,
      movil ? null : ['+ Añadir ejercicio', null, () => elegirEjercicio()],
      ['Terminar entrenamiento', 'reloj', () => terminar()],
      ['Cancelar entrenamiento', 'cerrar', () => cancelar(), true],
    ].filter(Boolean);
    const cerrar = modal('Más opciones', h('div', { class: 'lista-selector lista-con-iconos' },
      opciones.map(([texto, ic, fn, peligro]) => h('button', { type: 'button', class: `boton-marca${peligro ? ' peligro-texto' : ''}`,
        onclick: () => { cerrar(); fn(); } }, ic && icono(ic), h('span', {}, texto)))));
  }

  function pasoEntreEjercicios({ grande = false } = {}) {
    const n = sesion.ejercicios.length;
    const ultimo = posicion >= n - 1;
    const anterior = () => { irA(posicion - 1); window.scrollTo(0, 0); };
    const siguiente = () => { irA(posicion + 1); window.scrollTo(0, 0); };
    if (!grande) {
      return h('div', { class: 'guiado-cabecera' },
        h('button', { class: 'boton-paso', 'aria-label': 'Ejercicio anterior', disabled: posicion === 0, onclick: anterior }, '‹'),
        h('button', { class: 'boton enlace', onclick: () => irA(null) }, `Ejercicio ${posicion + 1} de ${n}`),
        h('button', { class: 'boton-paso', 'aria-label': 'Ejercicio siguiente', disabled: ultimo, onclick: siguiente }, '›'));
    }
    const nombreSiguiente = ultimo ? '' : (d.ejercicios.find((x) => x.id === sesion.ejercicios[posicion + 1]?.ejercicioId)?.nombre ?? '');
    return h('div', { class: 'paso-grande' },
      h('div', { class: 'paso-grande-fila' },
        h('button', { class: 'boton secundario boton-paso-grande', 'aria-label': 'Ejercicio anterior', disabled: posicion === 0, onclick: anterior }, '‹'),
        ultimo
          ? h('button', { class: 'boton grande', onclick: terminar }, 'Terminar entrenamiento')
          : h('button', { class: 'boton grande boton-siguiente', onclick: siguiente },
            h('span', {}, 'Siguiente ejercicio ›'), h('small', {}, nombreSiguiente))),
      h('button', { class: 'boton enlace', onclick: () => irA(null) }, `Ejercicio ${posicion + 1} de ${n} · ver todos`));
  }

  // «¿Cómo llegas?»: tu sensación de cada músculo que vas a entrenar, junto a
  // lo que calcula la app. Con varias respuestas, la app te dirá si te
  // recuperas antes o después de lo normal (pestaña Cuerpo).
  function tarjetaComoLlegas() {
    if (sesion.sensacionesCerrada || d.perfil.preguntarComoLlegas === false) return null;
    const musculos = new Set();
    for (const entrada of sesion.ejercicios) {
      const ej = ejercicioDe(entrada.ejercicioId);
      if (ej && cuentaParaFatiga(ej)) for (const m of ej.musculos?.principales ?? []) musculos.add(m);
    }
    if (!musculos.size) return null;
    const previsto = recuperacionPorMusculo(d, sesion.inicio ? new Date(sesion.inicio) : new Date());
    const respuestas = sesion.sensaciones ?? {};
    const lista = ORDEN_MUSCULOS.filter((m) => musculos.has(m));
    const todas = lista.every((m) => respuestas[m]);
    if (todas) {
      const quedan = Math.ceil(10 - (Date.now() - (sesion.sensacionesListas ?? 0)) / 1000);
      if (quedan <= 0) return null;
      const texto = h('span', {}, `Cómo llegas: apuntado. Esto se cierra en ${quedan} s`);
      const caja = h('div', { class: 'tarjeta como-llegas apuntado' }, texto,
        h('button', { type: 'button', class: 'boton secundario', onclick: () => cambiarSesion((x) => {
          delete x.sensaciones; delete x.sensacionesListas;
        }) }, 'Deshacer'));
      let n = quedan;
      const reloj = setInterval(() => {
        n -= 1;
        if (!caja.isConnected) { clearInterval(reloj); return; }
        if (n <= 0) { clearInterval(reloj); caja.remove(); return; }
        texto.textContent = `Cómo llegas: apuntado. Esto se cierra en ${n} s`;
      }, 1000);
      return caja;
    }
    return h('details', { class: 'tarjeta como-llegas', open: true },
      h('summary', {}, todas ? 'Cómo llegas: apuntado' : '¿Cómo llegas hoy? (opcional)'),
      h('p', { class: 'nota' }, 'Puntúa de 0 a 10 cómo de recuperado notas cada músculo: 0, nada; 5, a medias; 10, del todo. '
        + 'Sirve para ajustar el mapa de recuperación a tu ritmo.'),
      lista.map((m) => {
        const puesta = respuestas[m] ? puntuacionSentida(respuestas[m]) : null;
        return h('div', { class: 'fila-sensacion' },
          h('div', { class: 'cabecera-sensacion' },
            h('strong', {}, nombreMusculo(m, { corto: true })),
            h('small', { class: 'suave' }, `la app calcula ${Math.round(previsto[m].porcentaje / 10)} de 10`)),
          h('div', { class: 'escala-0-10', role: 'radiogroup', 'aria-label': `Recuperación de ${nombreMusculo(m)}` },
            Array.from({ length: 11 }, (_, n) => h('button', {
              class: `paso-escala ${puesta === n ? 'activo' : ''}`, role: 'radio', 'aria-checked': String(puesta === n),
              title: ESCALA_RECUPERACION[n] ?? String(n),
              onclick: () => {
                cambiarSesion((x) => {
                  x.sensaciones ??= {};
                  x.sensaciones[m] = { sentida: n, prevista: previsto[m].porcentaje, factor: factorPersonal(d, m) };
                  if (lista.every((y) => x.sensaciones[y])) x.sensacionesListas = Date.now();
                });
                estado.cambiar((x) => { x.perfil.comoLlegasSaltos = 0; }, { tecleo: true });
              },
            }, n))),
          h('div', { class: 'extremos-escala suave' }, h('span', {}, 'Nada'), h('span', {}, 'A medias'), h('span', {}, 'Del todo')));
      }),
      h('button', { class: 'boton enlace', onclick: () => {
        cambiarSesion((x) => { x.sensacionesCerrada = true; });
        // Dos veces seguidas «hoy no»: se ofrece quitar la pregunta.
        const saltos = (d.perfil.comoLlegasSaltos ?? 0) + 1;
        estado.cambiar((x) => { x.perfil.comoLlegasSaltos = saltos; }, { tecleo: true });
        if (saltos >= 2) {
          aviso('Te lo has saltado dos veces. ¿Quito la pregunta? (Si la quieres luego, está en Ajustes.)', { accion: { texto: 'Sí, quítala', fn: () => {
            estado.cambiar((x) => { x.perfil.preguntarComoLlegas = false; x.perfil.comoLlegasSaltos = 0; });
          } } });
        }
      } }, 'Hoy no'));
  }

  // Al empezar: series de una en una, ejercicios de uno en uno o todo.
  // Cómo ver el entrenamiento. Sale a pantalla completa al empezar y se
  // puede cambiar en cualquier momento desde «Vista: … · cambiar».
  function elegirVista() {
    const preferido = guiado.get(id)?.modo ?? d.perfil.modoEntreno ?? 'ejercicio';
    const cerrar = modal('¿Cómo quieres verlo?', h('div', { class: 'como-ir' },
      h('p', { class: 'nota' }, 'Se puede cambiar cuando quieras desde el final del entrenamiento («Vista: … · cambiar»).'),
      Object.entries(MODOS_ENTRENO).map(([clave, m]) => h('button', {
        class: `tarjeta fila-enlace ${clave === preferido ? 'preferido' : ''}`,
        onclick: () => {
          cerrar();
          const actual = guiado.get(id)?.pos ?? 0;
          const pos = clave === 'todo' ? null : Math.min(actual, Math.max(0, sesion.ejercicios.length - 1));
          estado.cambiar((x) => { x.perfil.modoEntreno = clave; }, { tecleo: true });
          guardarVista(clave, pos);
          estado.emitir('vista');
        } },
      h('div', {}, h('strong', {}, m.etiqueta), h('div', { class: 'suave' }, m.descripcion)),
      clave === preferido && h('span', { class: 'etiqueta' }, 'Actual'))),
      h('button', { class: 'boton enlace', onclick: () => {
        estado.cambiar((x) => { x.perfil.preguntarVista = false; });
        cerrar();
        aviso('No se volverá a preguntar: se usará la vista que tengas puesta. Se recupera en Ajustes → Entrenamiento y series.');
      } }, 'No volver a preguntarme esto')));
  }

  function guardarVista(modo, pos, serie = null) {
    guiado.set(id, { modo, pos, serie });
    cambiarSesion((s) => { s.vista = { modo, pos, serie }; }, { tecleo: true });
  }

  // Si la pantalla se vuelve a pintar antes de que salga el cartel (por
  // ejemplo, al llegar datos), no se abre dos veces.
  // En el entrenamiento de prueba del tutorial no se pregunta: ya hay bastante en pantalla.
  if (enCurso && !eleccion && d.perfil.preguntarVista !== false && sesion.ejercicios.length > 0 && !algoHecho && !sesion.tutorial
    && !document.querySelector('.modal-fondo') && !preguntandoVista.has(id) && !vistaPreguntada.has(id)) {
    preguntandoVista.add(id);
    vistaPreguntada.add(id);
    setTimeout(() => {
      preguntandoVista.delete(id);
      if (!guiado.has(id) && !document.querySelector('.modal-fondo')) elegirVista();
    }, 50);
  }

  function irA(nueva, { serie = null } = {}) {
    direccionPendiente = direccionDeslizar;
    const modoActual = guiado.get(id)?.modo ?? d.perfil.modoEntreno ?? 'ejercicio';
    if (nueva == null) guardarVista('todo', null);
    else guardarVista(modoActual === 'todo' ? 'ejercicio' : modoActual, Math.max(0, Math.min(nueva, sesion.ejercicios.length - 1)), serie);
    estado.emitir('vista');
  }

  // -------------------------------------------------------------------------

  function tarjetaEjercicio(entrada, indice) {
    const ej = ejercicioDe(entrada.ejercicioId);
    if (!ej) return h('div', { class: 'tarjeta' }, 'Ejercicio borrado');
    // Modo «serie»: solo se ve una serie; las demás, deslizando. Los
    // calentamientos van en su orden, como una serie más.
    const trabajo = trabajoDe(entrada);
    const k = unaSerie ? indiceSerie(entrada) : null;
    const visible = k == null ? null : trabajo[k];
    const vacia = entrada.series.length === 0;
    const foto = imagenDeEjercicio(ej);
    const grande = posicion != null;
    const tarjeta = h('article', { class: `tarjeta ejercicio-sesion ${modo === 'serie' ? 'de-una-en-una' : ''}${grande ? ' una' : ''}`, 'data-entrada': indice },
      grande && foto && h('button', { type: 'button', class: 'foto-ejercicio', 'aria-label': `Cómo vas en ${ej.nombre}`, onclick: () => verProgreso(ej) },
        fotoViva(foto.archivo)),
      grande && foto && enCurso && pista('foto-estadisticas', 'Toca el dibujo del ejercicio para ver cómo vas: tus récords y la gráfica.'),
      h('div', { class: 'cabecera-tarjeta' },
        !grande && foto && h('button', { type: 'button', class: 'miniatura-boton', 'aria-label': `Cómo vas en ${ej.nombre}`, onclick: () => verProgreso(ej) },
          h('img', { class: 'miniatura', src: foto.archivo, alt: '', loading: 'lazy' })),
        h('h2', { class: 'crece' }, ej.nombre),
        // Las notas de la rutina para este ejercicio (cómo se hace, descansos), en un «?».
        itemDeRutina(ej.id)?.nota && ayuda(`${ej.nombre}: cómo se hace hoy`, itemDeRutina(ej.id).nota.split(/;\s*/).map((x) => x.charAt(0).toUpperCase() + x.slice(1) + (/[.!?]$/.test(x) ? '' : '.'))),
        h('button', { class: 'boton-icono', 'aria-label': `Quitar ${ej.nombre}`,
          onclick: () => quitarEjercicio(indice, ej) }, icono('cerrar'))),

      ej.notas && h('p', { class: 'nota' }, ej.notas),

      referencia1RM(ej),

      indice === 0 && enCurso && !sesion.tutorial && pista('sesion-datos', ['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(ej))
        ? 'Apunta cada estiramiento al acabarlo: los segundos que has aguantado y, si te apoyas con la mano, hasta dónde llegas. '
          + 'Al escribirlos arranca el descanso.'
        : ej.esfuerzo?.tipo === 'tiempo'
          ? 'Toca «Empezar» en el reloj: al acabar, el tiempo se apunta solo. También puedes escribirlo en las casillas.'
          : 'Apunta la serie al acabarla: con el peso y las repeticiones puestos arranca el descanso. '
            + 'Cada casilla lleva encima lo que va dentro (toca «?» para saber más).'),

      unaSerie && trabajo.length > 1 && puntosSeries(entrada, k, trabajo),
      entrada.series.map((serie, j) => {
        if (visible != null && j !== visible) return null;
        const bloque = bloqueSerie(ej, entrada, indice, j, serie);
        if (visible != null && serieEntra) { bloque.classList.add(`entra-${serieEntra}`); serieEntra = null; }
        return bloque;
      }),

      // Sin series: qué hacer, claro. Con series: una más igual o programar.
      vacia && h('p', { class: 'nota centrado sin-series' }, 'Este ejercicio no tiene series. Añade una suelta o prográmalas (con su progresión).'),
      h('div', { class: 'fila-botones fila-mas-series' },
        h('button', { class: 'boton secundario', onclick: () => anadirSerie(indice, ej, entrada) }, vacia ? '+ Serie suelta' : '+ Otra serie'),
        enCurso && h('button', { class: `boton ${vacia ? '' : 'secundario'}`, onclick: () => asistenteEnEntreno(indice, ej) }, 'Programar series')));
    if (enCurso) setTimeout(() => reajustarDebajo(ej, indice), 0);
    return grande && enCurso && movil ? deslizable(tarjeta) : tarjeta;
  }

  function fotoViva(archivo) {
    let img = fotosVivas.get(archivo);
    if (!img) { img = h('img', { src: archivo, alt: '' }); fotosVivas.set(archivo, img); }
    return img;
  }

  // Modo «serie»: «Calentamiento 2 de 4» o «Serie 1 de 5», y un puntito por
  // serie (los de calentar, más pequeños; se pueden tocar).
  function puntosSeries(entrada, k, trabajo) {
    const esCal = (j) => entrada.series[j].tipo === 'calentamiento';
    const grupo = trabajo.filter((j) => esCal(j) === esCal(trabajo[k]));
    const n = grupo.indexOf(trabajo[k]) + 1;
    return h('div', { class: 'contador-series' },
      h('span', { class: 'suave' }, `${esCal(trabajo[k]) ? 'Calentamiento' : 'Serie'} ${n} de ${grupo.length}`),
      h('div', { class: 'puntos-ejercicios puntos-series' }, trabajo.map((j, n) => h('button', { type: 'button',
        'aria-label': `${esCal(j) ? 'Calentamiento' : 'Serie'} ${n + 1}`, class: `${n === k ? 'activo' : ''}${entrada.series[j].hecha ? ' hecho' : ''}${esCal(j) ? ' cal' : ''}`,
        onclick: () => { guardarVista('serie', posicion, n); estado.emitir('vista'); } }))));
  }

  // Las estadísticas del ejercicio en un cartel, sin salir del entreno.
  function verProgreso(ej) {
    modal(ej.nombre, h('div', { class: 'progreso-en-cartel' },
      seccionProgreso(d, ej) ?? h('p', { class: 'suave centrado' }, 'Aún no hay entrenamientos de este ejercicio con los que hacer gráficas.')));
  }

  // El asistente de series también al entrenar: crea las series en el
  // ejercicio (o solo para esta rutina) y las pone ya en el entreno de hoy.
  function asistenteEnEntreno(i, ej) {
    abrirAsistenteSeries({ ej, datos: d, contexto: 'entreno', conRutina: Boolean(sesion.rutinaId), donde: sesion.rutinaId ? 'rutina' : 'ejercicio',
      alAceptar: (f) => {
        estado.cambiar((datos) => {
          const propio = datos.ejercicios.find((x) => x.id === ej.id);
          const planes = crearPlanesRapidos(datos, propio, f);
          const soloRutina = f.donde === 'rutina' && sesion.rutinaId ? sesion.rutinaId : null;
          for (const p of planes) { p.soloRutina = soloRutina; propio.series.push(p); }
          if (soloRutina) {
            const item = datos.rutinas.find((r) => r.id === sesion.rutinaId)?.dias.find((x) => x.id === sesion.diaRutinaId)
              ?.ejercicios.find((x) => x.ejercicioId === ej.id);
            if (item) item.series = [...planesDeItem(propio, item).map((p) => p.id).filter((pid) => !planes.some((q) => q.id === pid)), ...planes.map((p) => p.id)];
          }
          const s = datos.sesiones.find((x) => x.id === id);
          const antes = trabajoDe(s.ejercicios[i]).length;
          for (const p of planes) s.ejercicios[i].series.push(...seriesDesdePlan(datos, propio, p, { excluirSesion: id }));
          if (unaSerie) { guiado.set(id, { modo, pos: posicion, serie: antes }); s.vista = { modo, pos: posicion, serie: antes }; }
        });
        aviso('Series añadidas al ejercicio y al entreno de hoy.');
      } });
  }

  // El 1RM del ejercicio: uno solo, el mismo con el que se calculan los
  // pesos y los porcentajes de esta pantalla, y de dónde sale.
  function referencia1RM(ej) {
    if (['ninguna', 'altura'].includes(ej.carga?.tipo) || ej.esfuerzo?.tipo !== 'repeticiones') return null;
    const rm = rmDelEjercicio(d, ej, { sesion });
    if (!rm && ej.carga?.tipo === 'pesoCorporal') return null;
    const origen = !rm ? '' : rm.origen === 'hoy' ? `sale de tu serie de hoy: ${textoSerie(ej, rm.serie)}`
      : rm.origen === 'manual' ? 'el que pusiste a mano' : 'tu mejor serie de las últimas semanas';
    return h('div', { class: 'linea-1rm' },
      h('span', {}, 'Tu 1RM: ', h('strong', {}, rm ? `${formatearNumero(Math.round(rm.valor))} kg` : 'aún no lo sabe la app'),
        rm ? h('small', { class: 'suave bloque' }, origen) : null),
      ayuda('Tu 1RM en este ejercicio', [
        'El 1RM es el peso con el que harías una sola repetición. La app usa uno solo por ejercicio para calcular los pesos y los porcentajes.',
        'Sale de tu mejor serie de las últimas 8 semanas. Si nunca has hecho el ejercicio, vale el que pongas a mano; si tampoco hay, la primera serie hace de prueba.',
        'Si hoy haces una serie que da más, manda la de hoy, y las series de debajo cuyo peso puso la app se ajustan solas (las que hayas cambiado tú, no).',
        'No cuentan los calentamientos ni las series con más de 5 en recámara: lejos del fallo, la estimación se equivoca mucho.']),
      (!rm || rm.origen === 'manual') && ej.carga?.tipo !== 'pesoCorporal'
        && h('button', { type: 'button', class: 'boton enlace', onclick: () => ponerRMaMano(ej, null) }, rm ? 'Cambiar' : 'Lo sé'));
  }

  // La línea de qué toca, con un «?» en la esquina que cuenta por qué.
  function lineaSugerencia(ej, serie, entrada = null, j = 0, i = null) {
    const linea = lineaSugerenciaBase(ej, serie, entrada, j, i);
    if (!linea || !linea.classList?.contains('sugerencia')) return linea;
    const razones = porQueHoy(ej, serie, entrada, j, i);
    if (razones.length) {
      linea.classList.add('con-porque');
      linea.append(h('span', { class: 'porque' }, ayuda('Por qué hoy esto', razones)));
    }
    return linea;
  }

  // Por qué toca hoy lo que toca, en llano, según la regla de la serie.
  function porQueHoy(ej, serie, entrada, j, i) {
    const plan = planDe(ej, serie);
    if (!plan) return [];
    const s = sugerenciaSerie(d, ej, plan, { excluirSesion: id });
    const prog = plan.progresion ?? {};
    const uC = unidadCarga(ej);
    const uE = unidadEsfuerzo(ej);
    const n = (x) => formatearNumero(x);
    const rango = s.rango ?? prog.objetivoEsfuerzo ?? plan.objetivoEsfuerzo;
    const tr = rango ? (rango[0] === rango[1] ? `${rango[0]}` : `${rango[0]} a ${rango[1]}`) : null;
    const idx = i ?? sesion.ejercicios.indexOf(entrada);
    const rm = entrada ? rmDelEjercicio(d, ej, { sesion, antesDe: { i: idx, j } }) : null;
    const deDonde = !rm ? '' : rm.origen === 'hoy' ? ' (sale de una serie de hoy)' : rm.origen === 'manual' ? ' (el que pusiste a mano)' : ' (tu mejor serie de las últimas 8 semanas)';
    const rec = prog.recamaraMin;
    const lista = [];
    if (serie.tipo === 'calentamiento') {
      lista.push(s.pct > 0 && rm ? `Calentamiento al ${s.pct} % de tu 1RM de ${n(Math.round(rm.valor))} kg${deDonde}.`
        : s.pct === 0 ? 'Calentamiento con la barra sola.' : 'Calentamiento: un peso ligero.');
      lista.push('Las series de aproximación suben poco a poco hasta cerca del peso de trabajo, muy lejos del fallo: preparan sin cansar. No cuentan para tu progreso ni para tu 1RM.');
      return lista;
    }
    if (prog.tipo === 'bilbo') {
      lista.push('Esta serie va en un ciclo (Bilbo): cada sesión el peso sube un poco y haces todas las que puedas.');
      if (s.ultimaDelCiclo || s.refAnterior) lista.push('El objetivo son las repeticiones que, con el peso de hoy, igualan el 1RM que sacaste la última vez: si las haces, eres más fuerte.');
      else if (serie.objetivo != null) lista.push(`Es la primera sesión del ciclo: el objetivo son las repeticiones que igualan tu 1RM${rm ? ` de ${n(Math.round(rm.valor))} kg` : ''} con este peso.`);
      lista.push('Cuando el objetivo baja de 15 repeticiones, el ciclo se acaba y empieza otro más ligero, partiendo de lo mejor que hiciste.');
      return lista;
    }
    if (prog.tipo === 'programa') {
      lista.push(`Programa ${PROGRAMAS[prog.programa]?.etiqueta ?? ''}: el peso y las repeticiones de hoy los marca el programa según la sesión en la que vas.`);
      return lista;
    }
    if (prog.tipo === 'carga' && prog.porRM) {
      lista.push(`El peso sale de tu mejor 1RM de las últimas ${prog.porRM.semanas ?? 8} semanas${rm ? ` (${n(Math.round(rm.valor))} kg)` : ''}: ${prog.porRM.fija === 'pct' ? `el ${prog.porRM.valor} % de él` : `el que te deja hacer ${prog.porRM.valor}${rec ? ` dejando ${rec} en recámara` : ''}`}.`);
      lista.push('Si te haces más fuerte, el 1RM sube y el peso sube solo.');
      return lista;
    }
    if (prog.tipo === 'carga') {
      const fija = rango && rango[0] === rango[1];
      lista.push(fija
        ? `Repeticiones fijas (${tr}). Si haces todas${rec ? ` dejando ${rec} en recámara` : ''}, la próxima vez sube el peso; si no, repites el mismo. Eso es «sube el peso al completarlas».`
        : `Doble progresión: con el mismo peso vas sumando repeticiones dentro del rango (${tr}). Al llegar arriba${rec ? ` dejando ${rec} en recámara` : ''}, sube el peso y vuelves a empezar por abajo.`);
      if (!s.ultima) {
        lista.push(serie.carga != null && rm
          ? `Es la primera vez con esta serie: el peso es el que te deja hacer ${rango?.[1] ?? '?'}${rec ? ` dejando ${rec} en recámara` : ''} con tu 1RM de ${n(Math.round(rm.valor))} kg${deDonde}, según la fórmula del 1RM.`
          : 'Es la primera vez con esta serie y la app aún no sabe tu 1RM: por eso pide una prueba.');
      } else if (s.sube) {
        lista.push(`La última vez hiciste ${textoSerie(ej, s.ultima.serie)}: llegaste arriba del rango, así que hoy sube a ${n(s.carga)} ${uC}.`);
      } else {
        lista.push(`La última vez hiciste ${textoSerie(ej, s.ultima.serie)}. Hasta llegar a ${rango?.[1] ?? '?'} ${uE}${rec ? ` con ${rec} en recámara` : ''}, el peso se queda igual.`
          + (s.faltaRecamara ? ' Llegaste, pero apurando más de la cuenta: por eso no sube todavía.' : ''));
      }
      if (s.ultima) lista.push('En gris, dentro de las casillas vacías, ves lo que hiciste la última vez en esta serie.');
      return lista;
    }
    if (prog.tipo === 'esfuerzo') lista.push('Un poco más cada vez: hoy, algo más que la última vez.');
    else lista.push('Solo apuntar: la app no te pone objetivo. Ves lo de la última vez (en gris) e intentas superarlo a tu aire.');
    return lista;
  }

  // Cabecera de cada serie: qué toca hoy y cómo fue la última vez. Nunca
  // «primera vez» en cada serie: si el ejercicio es nuevo, dice qué toca hoy.
  function lineaSugerenciaBase(ej, serie, entrada = null, j = 0, i = null) {
    const plan = (ej.series || []).find((p) => p.id === serie.planId);
    const uCarga = unidadCarga(ej);
    const uEsf = unidadEsfuerzo(ej);
    const textoRango = (r) => (r ? (r[0] === r[1] ? String(r[0]) : `${r[0]}-${r[1]}`) : '');

    // Calentamiento: el peso (si sale de tu 1RM) y ningún objetivo.
    if (serie.tipo === 'calentamiento') {
      if (!plan?.calentamiento) return h('p', { class: 'sugerencia' }, 'Calentamiento: no cuenta para tu progreso ni para tu 1RM.');
      const s = sugerenciaSerie(d, ej, plan, { excluirSesion: id });
      // Medido en tiempo (el cardio o la movilidad del principio): «15 min».
      if (esTiempo(ej)) {
        const seg = plan.objetivoEsfuerzo?.[1];
        return h('p', { class: 'sugerencia' }, `Calentamiento${seg ? `: ${duracionTexto(seg)}` : ''}. Toca «Empezar» y se apunta solo al acabar.`);
      }
      const reps = textoRango(plan.objetivoEsfuerzo);
      const peso = serie.carga != null ? `${formatearNumero(serie.carga)} ${uCarga}` : s.pct === 0 ? 'la barra sola' : 'un peso ligero';
      const pctTrabajo = plan.progresion?.porRM?.fija === 'pctTrabajo' ? plan.progresion.porRM.valor : null;
      return h('p', { class: 'sugerencia' }, `Calentamiento: ${peso}${reps ? ` × ${reps}` : ''}`
        + (s.pct > 0 ? ` (${s.pct} % de tu 1RM)` : pctTrabajo ? ` (${pctTrabajo} % del peso de trabajo)` : ''));
    }
    if (!plan) return null;
    const s = sugerenciaSerie(d, ej, plan, { excluirSesion: id });
    const idx = i ?? sesion.ejercicios.indexOf(entrada);
    const rmAntes = entrada ? rmDelEjercicio(d, ej, { sesion, antesDe: { i: idx, j } }) : null;
    const primeraDeTrabajo = entrada ? entrada.series.findIndex((x) => x.tipo !== 'calentamiento') : -1;
    const tarjetaPrueba = (texto) => h('div', { class: 'tarjeta-prueba' }, h('p', {}, texto),
      h('button', { type: 'button', class: 'boton enlace', onclick: () => ponerRMaMano(ej, serie) }, 'Ya sé mi 1RM: lo meto a mano'));

    // Sin ningún 1RM (ni de antes ni de hoy): la primera serie de trabajo es
    // la prueba y las demás esperan a ella.
    if (s.modo === 'carga' && s.sinRM && entrada) {
      if (!rmAntes && !serie.hecha) {
        if (j === primeraDeTrabajo) {
          const [, max] = plan.progresion?.objetivoEsfuerzo ?? plan.objetivoEsfuerzo ?? [];
          return tarjetaPrueba((max ?? 10) <= 3
            ? `Pon un peso con el que hagas ${max} dejando ${plan.progresion?.recamaraMin ?? 1} en recámara. De aquí sale tu 1RM y el peso de las demás series.`
            : 'Pon un peso con el que hagas de 3 a 10 y haz todas las que puedas. De aquí sale tu 1RM y el peso de las demás series.');
        }
        return h('p', { class: 'sugerencia' }, 'Espera a la prueba de arriba: con ella se pone el peso de esta serie.');
      }
      if (serie.hecha && j === primeraDeTrabajo && !rmAntes) {
        const rm = rmDelEjercicio(d, ej, { sesion, antesDe: { i: idx, j: j + 1 } });
        if (rm) return h('p', { class: 'sugerencia' }, `Prueba hecha: tu 1RM sale en ${formatearNumero(Math.round(rm.valor))} kg; las series de debajo ya llevan su peso.`);
      }
    }

    const partes = [];
    const lineas = [];
    if (s.prueba && !serie.hecha && !rmAntes) {
      return tarjetaPrueba('Aún no tienes 1RM en este ejercicio. Esta serie es la prueba: pon un peso con el que hagas de 3 a 10 y haz todas las que puedas. Con ella la app calcula tu 1RM y monta el ciclo.');
    }

    if (s.modo === 'bilbo') {
      if (s.sinCiclo) {
        if (plan.progresion?.sobre === 'esfuerzo') partes.push('Hoy: haz todas las que puedas; desde ahí el ciclo irá subiendo');
        else if (!serie.hecha && !rmAntes) {
          return tarjetaPrueba('Sin 1RM todavía: pon un peso con el que hagas de 3 a 10 y haz todas las que puedas. De aquí sale tu 1RM y el ciclo.');
        } else partes.push(serie.hecha ? 'Hecha: con ella se monta el ciclo' : 'Montando el ciclo con tu 1RM de hoy…');
      } else if (s.cicloTerminado) partes.push(`Ciclo ${s.cicloN} terminado: prepara el siguiente en la ficha (o pon el reinicio en automático)`);
      else {
        partes.push(`Ciclo ${s.cicloN} · sesión ${serie.diaCiclo ?? s.dia}`);
        if (s.fase) partes.push(`fase ${s.fase.n} de ${s.fase.deN}`);
        if (s.pesoBajo) partes.push('peso muy bajo para tu 1RM: revisa el ciclo en la ficha');
        if (s.cicloAgotado) partes.push('el ciclo se acaba aquí: la próxima vez empieza el siguiente, más ligero');
        if (serie.carga != null && s.sobre === 'carga') partes.push(`${formatearNumero(serie.carga)} ${uCarga}`);
        // Con una vez anterior: «para superar la última vez». La primera vez
        // no hay última vez: el objetivo son las repeticiones que igualan tu 1RM.
        const ult = s.ultimaDelCiclo ?? (s.refAnterior ? { serie: s.refAnterior } : null);
        if (ult) {
          lineas.push(h('span', { class: 'compara' }, '↑ Para superar la última vez', ` (${textoSerie(ej, ult.serie)})`, ': ',
            h('strong', {}, serie.objetivo != null ? `${formatearNumero(serie.objetivo)} ${uEsf}` : '—')));
        } else if (serie.objetivo != null) {
          const rmObj = serie.rmObjetivo ?? s.rmObjetivo;
          lineas.push(h('span', { class: 'compara' }, '↑ Objetivo: ', h('strong', {}, `${formatearNumero(serie.objetivo)} ${uEsf}`),
            rmObj ? ` (las que igualan tu 1RM de ${formatearNumero(Math.round(rmObj))} kg)` : ''));
        }
        if (s.cicloPrevio) {
          const p = s.cicloPrevio;
          lineas.push(h('span', { class: 'compara' }, `↑ Ciclo ${p.cicloN} ${p.mismoPeso ? `con ${formatearNumero(p.carga)} ${uCarga}` : `en la sesión ${p.dia} (${formatearNumero(p.carga)} ${uCarga})`}: `,
            h('strong', {}, `${formatearNumero(p.esfuerzo)} ${uEsf}`), p.mismoPeso ? ' · para superarlo, una más' : ''));
        }
      }
    } else if (s.modo === 'programa') {
      if (s.sinPrograma) partes.push('Programa sin configurar: revisa la ficha');
      else {
        partes.push(`${PROGRAMAS[s.programa]?.etiqueta ?? s.programa} · ${s.nombreSesion}`);
        if (s.inicialEstimado) partes.push('peso inicial estimado (cámbialo en la ficha)');
        if (serie.programaSet) partes.push(`serie ${serie.programaSet} de ${s.seriesPrograma.length}`);
        if (serie.carga != null) partes.push(`${formatearNumero(serie.carga)} ${uCarga} × ${formatearNumero(serie.objetivo)}${serie.amrap ? ' o más' : ''}`);
      }
    } else if (s.modo === 'maximo-trabajo') {
      if (s.pocosDatos && !s.carga) partes.push('Máximo trabajo: aún faltan datos, entrena con el peso que quieras');
      else {
        partes.push(`Máximo trabajo: ${formatearNumero(s.carga)} ${uCarga}`);
        if (s.esfuerzoObjetivo) partes.push(`unas ${formatearNumero(s.esfuerzoObjetivo)} ${uEsf}`);
        if (s.aviso) partes.push(s.aviso.toLowerCase());
        if (s.mejorReal) partes.push(`tu récord: ${formatearNumero(s.mejorReal.trabajo)} (${formatearNumero(s.mejorReal.carga)} ${uCarga} × ${formatearNumero(s.mejorReal.esfuerzo)})`);
      }
    } else if (s.porRM && serie.carga != null) {
      const base = serie.rmUsado?.valor ?? s.rmUsado;
      partes.push(`Hoy ${formatearNumero(serie.carga)} ${uCarga}`
        + (s.esfuerzoObjetivo ? ` × ${s.esfuerzoObjetivo}` : '')
        + (base ? ` (${Math.round((serie.carga / base) * 100)} % de tu 1RM de ${formatearNumero(Math.round(base))} kg)` : ''));
      if (s.objetivoSuperar) lineas.push(h('span', { class: 'compara' }, '↑ Para superar la última vez: ', h('strong', {}, `${s.objetivoSuperar} ${uEsf}`)));
    } else if (s.modo === 'carga' && !s.ultima) {
      // Serie nueva: el peso sale de tu 1RM (el de la cabecera).
      const rango = textoRango(s.rango);
      const rec = s.recamaraMin ? ` dejando ${s.recamaraMin} en recámara` : '';
      if (serie.carga != null && ej.carga?.tipo !== 'pesoCorporal') {
        const base = serie.rmUsado?.valor ?? s.rmUsado;
        partes.push(`Hoy: ${formatearNumero(serie.carga)} ${uCarga}${rango ? ` × ${rango}` : ''}${rec}`
          + (base && !serie.hecha && !serie.cargaAMano ? ` (con tu 1RM de ${formatearNumero(Math.round(base))} kg)` : ''));
      } else partes.push(`Hoy: ${rango ? `${rango} ${uEsf}` : 'apunta lo que hagas'}${rec}`);
    } else if (!s.ultima && !s.referencia) {
      // Solo apuntar, sin nada de antes: el rango y, si hay 1RM, un peso orientativo.
      const r = s.rango ?? plan.objetivoEsfuerzo;
      const conPesoYReps = !['ninguna', 'altura', 'pesoCorporal'].includes(ej.carga?.tipo) && ej.esfuerzo?.tipo === 'repeticiones';
      const orientativo = conPesoYReps && r && rmAntes ? pesoDePlan(d, ej, { progresion: { objetivoEsfuerzo: r } }, rmAntes.valor) : null;
      partes.push(r ? `Hoy: ${textoRango(r)} ${uEsf}` : 'Apunta lo que hagas');
      if (orientativo) partes.push(`con tu 1RM, unos ${formatearNumero(orientativo)} ${uCarga}`);
    } else {
      const u = (s.ultima ?? s.referencia).serie;
      partes.push(`${s.ultima ? 'Última vez' : 'Última vez (en otra serie)'}: ${textoSerie(ej, u)}`);
      if (s.modo === 'carga' && s.sube) partes.push(`hoy sube a ${formatearNumero(s.carga)} ${uCarga}`
        + (s.rango ? ` × ${textoRango(s.rango)}` : ''));
      if (s.modo === 'carga' && !s.sube && s.rango) partes.push(`objetivo ${s.rango[1]} ${uEsf}`
        + (s.recamaraMin ? ` con ${s.recamaraMin} en recámara` : '') + ': al llegar, sube el peso'
        + (s.faltaRecamara ? ' (la última vez llegaste, pero apurando)' : ''));
      if (s.modo === 'esfuerzo') partes.push(`hoy intenta ${formatearNumero(s.esfuerzoObjetivo)} ${uEsf}`);
    }
    if (!partes.length && !lineas.length) return null;
    if (!lineas.length) return h('p', { class: 'sugerencia' }, partes.join(' · '));
    return h('div', { class: 'sugerencia' }, partes.length ? h('span', {}, partes.join(' · ')) : null, h('span', { class: 'comparativas' }, lineas));
  }

  // Al apuntar una serie (al salir de la casilla) o al pintar, las de debajo
  // que aún no has hecho se ajustan al 1RM de ahora:
  //   · las de peso puesto por la app con tu 1RM (o sin peso), si el 1RM ha
  //     cambiado (una serie de hoy da más, o has hecho la prueba);
  //   · un ciclo que esperaba un 1RM se monta con el de hoy.
  // Las que has cambiado tú a mano no se tocan. Solo se repinta si cambia algo.
  const pruebasVistas = new Map();
  function ajustes(datos, s, e, i, aplicar) {
    const entrada = s?.ejercicios[i];
    if (!entrada) return false;
    let cambio = false;
    entrada.series.forEach((serie, j) => {
      if (serie.tipo === 'calentamiento' && !serie.hecha && !serie.cargaAMano) {
        const porRM = (e.series || []).find((pp) => pp.id === serie.planId)?.progresion?.porRM;
        if (porRM?.fija !== 'pctTrabajo') return;
        const trabajo = entrada.series.find((x) => x.tipo !== 'calentamiento' && x.carga > 0);
        if (!trabajo) return;
        const peso = aPesoDisponible(e, (trabajo.carga * porRM.valor) / 100);
        if (peso === serie.carga) return;
        cambio = true;
        if (aplicar) { serie.carga = peso; serie.cargaAuto = true; }
        return;
      }
      if (serie.hecha || serie.tramos?.length || serie.cargaAMano || serie.tipo === 'calentamiento') return;
      const plan = (e.series || []).find((p) => p.id === serie.planId);
      if (!plan) return;
      const prog = plan.progresion ?? {};
      const rm = rmDelEjercicio(datos, e, { sesion: s, antesDe: { i, j } });
      if (!rm) return;
      if (prog.tipo === 'bilbo' && prog.sobre !== 'esfuerzo' && serie.cicloN == null) {
        if (!sugerenciaSerie(datos, e, plan, { excluirSesion: id }).sinCiclo) return;
        cambio = true;
        if (aplicar) {
          const nueva = crearSerieDesdePlan(datos, e, plan, { excluirSesion: id, rmHoy: rm.valor });
          entrada.series[j] = { ...nueva, id: serie.id, recamara: serie.recamara ?? nueva.recamara };
        }
        return;
      }
      if (['pesoCorporal', 'asistida'].includes(e.carga?.tipo) || e.esfuerzo?.tipo !== 'repeticiones') return;
      if (serie.carga != null && !serie.cargaAuto) return;
      const nuevo = prog.porRM || (prog.tipo === 'carga' && !sugerenciaSerie(datos, e, plan, { excluirSesion: id }).ultima);
      if (!nuevo) return;
      if (serie.carga != null && serie.rmUsado?.valor && Math.abs(serie.rmUsado.valor - rm.valor) < 0.5) return;
      const peso = pesoDePlan(datos, e, plan, rm.valor);
      if (!(peso > 0) || (peso === serie.carga && serie.rmUsado?.valor === rm.valor)) return;
      cambio = true;
      if (aplicar) {
        serie.carga = peso;
        serie.cargaAuto = true;
        serie.rmUsado = { valor: rm.valor, deHoy: rm.origen === 'hoy' };
        if (e.carga?.tipo === 'asistida') serie.lectura = null;
      }
    });
    return cambio;
  }
  // Lo que hiciste la última vez en esta serie (para el gris de las casillas vacías).
  function ultimaDe(ej, serie) {
    const plan = planDe(ej, serie);
    return plan ? sugerenciaSerie(d, ej, plan, { excluirSesion: id }).ultima?.serie ?? null : null;
  }

  function reajustarDebajo(ej, i) {
    const datos = estado.datos();
    const s = datos.sesiones.find((x) => x.id === id);
    const e = datos.ejercicios.find((x) => x.id === ej.id);
    if (!s || !e || s.estado !== 'en-curso') return;
    // También se repinta si la prueba se ha rellenado o vaciado: el cartel
    // «espera a la prueba» aparece y desaparece con ella.
    const prueba = s.ejercicios[i]?.series.find((x) => x.tipo !== 'calentamiento');
    const estadoPrueba = `${Boolean(prueba?.hecha)}`;
    const cambiaPrueba = pruebasVistas.has(i) && pruebasVistas.get(i) !== estadoPrueba;
    pruebasVistas.set(i, estadoPrueba);
    if (!ajustes(datos, s, e, i, false) && !cambiaPrueba) return;
    estado.cambiar((x) => {
      const s2 = x.sesiones.find((y) => y.id === id);
      const e2 = x.ejercicios.find((y) => y.id === ej.id);
      ajustes(x, s2, e2, i, true);
    });
  }

  // El 1RM a mano desde el entrenamiento: se guarda en el ejercicio (con su
  // hora, para que mande sobre las series de hoy ya hechas) y las series que
  // aún no has hecho se rehacen con el peso que toca.
  function ponerRMaMano(ej, serie) {
    const caja = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Tu 1RM en kilos' });
    const cerrar = modal('Tu 1RM en este ejercicio', h('div', { class: 'formulario' },
      h('p', { class: 'nota' }, 'El peso con el que harías una sola repetición. Si no lo sabes, deja que la primera serie haga de prueba.'),
      h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Tu 1RM (kg)'), caja),
      h('button', { class: 'boton', onclick: () => {
        const rm = leerNumero(caja.value);
        if (!(rm > 0)) { aviso('Pon un número', { tipo: 'error' }); return; }
        cerrar();
        estado.cambiar((datos) => {
          const e = datos.ejercicios.find((x) => x.id === ej.id);
          if (!e) return;
          e.rmManual = rm;
          e.rmManualEn = new Date().toISOString();
          for (const plan of e.series || []) {
            if (plan.progresion?.tipo === 'bilbo' && plan.progresion.inicio?.modo === 'prueba') plan.progresion.inicio.modo = 'porcentaje';
          }
          const s = datos.sesiones.find((x) => x.id === id);
          for (const entrada of s?.ejercicios ?? []) {
            if (entrada.ejercicioId !== ej.id) continue;
            entrada.series = entrada.series.map((x) => {
              const plan = (e.series || []).find((p) => p.id === x.planId);
              const rehacer = plan && !x.hecha && !x.tramos?.length && (!x.cargaAMano || x.id === serie?.id) && x.tipo !== 'calentamiento';
              return rehacer ? { ...crearSerieDesdePlan(datos, e, plan, { excluirSesion: id, rmHoy: rm }), id: x.id } : x;
            });
            const conCiclo = entrada.series.find((x) => x.cicloN != null);
            if (conCiclo) { entrada.cicloN = conCiclo.cicloN; entrada.diaCiclo = conCiclo.diaCiclo; }
          }
        });
        aviso(`Guardado: 1RM de ${formatearNumero(rm)} kg. Las series que te quedan ya llevan su peso.`);
      } }, 'Guardar')));
    setTimeout(() => caja.focus(), 50);
  }

  function bloqueSerie(ej, entrada, i, j, serie) {
    serie.tecnicas ??= [];
    serie.detalle ??= {};
    const tramos = tramosDe(serie.tecnicas);
    return h('div', { class: `serie ${serie.hecha ? 'hecha' : ''}`, 'data-serie': j },
      lineaSugerencia(ej, serie, entrada, j, i),
      cabeceraSerie(ej, i, j, serie, entrada),
      relojDeSerie(ej, entrada, i, j, serie),
      tramos ? tramosSerie(ej, i, j, serie, tramos) : valoresSerie(ej, i, j, serie),
      hechoDeUnToque(ej, entrada, i, j, serie),
      camposTecnicas(ej, i, j, serie),
      camposEstiramiento(ej, i, j, serie),
      h('p', { class: 'comparacion' }, comparacionSerie(d, ej, serie, { excluirSesion: id })),
      comentarioSerie(ej, i, j, serie));
  }

  // El reloj de una serie medida en tiempo, dentro de ella: cuenta atrás con
  // lo programado, cronómetro o intervalos. Sale en la serie que toca (la
  // primera sin hacer, o la que se ve en el modo «serie»).
  function relojDeSerie(ej, entrada, i, j, serie) {
    if (!enCurso || !entrada || serie.hecha || !mideTiempo(ej) || serie.tramos?.length) return null;
    const principal = esTiempo(ej);
    const sinTiempo = (x) => !x.hecha && (principal ? x.esfuerzo == null : extraDeSerie(x, 'tiempo') == null);
    const laQueToca = unaSerie || entrada.series.findIndex(sinTiempo) === j || relojEnMarcha(serie.id);
    if (!laQueToca || !sinTiempo(serie)) return null;
    const plan = planDe(ej, serie);
    const ultima = ultimaDe(ej, serie);
    const objetivo = principal
      ? serie.objetivo ?? plan?.objetivoEsfuerzo?.[1] ?? plan?.progresion?.objetivoEsfuerzo?.[1] ?? ultima?.esfuerzo ?? null
      : serie.objetivosExtra?.tiempo ?? (ultima ? extraDeSerie(ultima, 'tiempo') : null);
    return relojSerie({ sesionId: id, serieId: serie.id, objetivo: objetivo > 0 ? objetivo : null,
      despues: () => {
        const x = estado.datos().sesiones.find((s) => s.id === id)?.ejercicios[i]?.series.find((y) => y.id === serie.id);
        if (x) descansoEntreSeries(ej, x);
        pasarTrasHecha(i, j);
      } });
  }

  // En el modo «serie», al acabar una de un toque (reloj o «Hecho») se pasa
  // a la siguiente; tras la última, al siguiente ejercicio.
  function pasarTrasHecha(i, j) {
    if (!unaSerie || posicion !== i) return;
    const t = trabajoDe(sesion.ejercicios[i]);
    const k = t.indexOf(j) + 1;
    setTimeout(() => {
      if (k > 0 && k < t.length) { serieEntra = 'izquierda'; guardarVista('serie', posicion, k); estado.emitir('vista'); }
      else if (posicion + 1 < sesion.ejercicios.length) { irA(posicion + 1); window.scrollTo(0, 0); }
    }, 350);
  }

  // Un calentamiento se marca de un toque con lo previsto («✓ Hecho: 55 kg × 5»);
  // se puede cambiar antes en las casillas. En el modo «serie», pasa al siguiente.
  function hechoDeUnToque(ej, entrada, i, j, serie) {
    if (!enCurso || serie.hecha || serie.tipo !== 'calentamiento' || esTiempo(ej)) return null;
    const plan = planDe(ej, serie);
    const reps = serie.esfuerzo ?? plan?.objetivoEsfuerzo?.[1] ?? serie.objetivo ?? ultimaDe(ej, serie)?.esfuerzo ?? null;
    const u = unidadCarga(ej);
    const peso = serie.carga != null && !['ninguna', 'pesoCorporal'].includes(ej.carga?.tipo) ? `${formatearNumero(serie.carga)} ${u}` : '';
    const texto = [peso, reps != null ? `${formatearNumero(reps)}${peso ? '' : ' repeticiones'}` : ''].filter(Boolean).join(' × ');
    return h('button', { type: 'button', class: 'boton grande hecho-rapido', onclick: () => {
      let hecha = null;
      cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        x.esfuerzo ??= reps;
        x.hecha = true;
        x.hechaA = new Date().toISOString();
        hecha = x;
      });
      if (hecha) descansoEntreSeries(ej, hecha);
      pasarTrasHecha(i, j);
    } }, texto ? `✓ Hecho: ${texto}` : '✓ Hecho');
  }

  // Un comentario por serie («agarre cerrado», «me molestó el hombro»…), y el
  // de la última vez en esa misma serie, para tenerlo delante.
  function comentarioSerie(ej, i, j, serie) {
    const plan = planDe(ej, serie);
    const antes = plan ? sugerenciaSerie(d, ej, plan, { excluirSesion: id }).ultima?.serie?.nota : null;
    const caja = h('textarea', { rows: 2, class: 'nota-serie', placeholder: 'Comentario de esta serie', value: serie.nota ?? '', hidden: !serie.nota,
      oninput: (e) => cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        if (e.target.value.trim()) x.nota = e.target.value; else delete x.nota;
      }, { tecleo: true }) });
    return h('div', { class: 'comentario-serie' },
      antes && h('p', { class: 'nota' }, `La otra vez: ${antes}`),
      caja);
  }

  // Lo apuntado en una medida que no es la principal. Se guarda por nombre,
  // para que quepan varias (tiempo y distancia, o reps y distancia).
  function guardarExtra(serie, tipo, valor) {
    serie.extras ??= {};
    serie.extras[tipo] = valor;
    if (tipo === 'distancia') serie.esfuerzoExtra = valor;   // formato antiguo
  }

  // El tiempo, en tres huecos: horas, minutos y segundos. El teclado del
  // móvil es numérico y no tiene dos puntos, así que nada de «12:30».
  function campoTiempo(etiqueta, segundos, alCambiar) {
    const total = segundos ?? 0;
    const inicial = { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: Math.round(total % 60) };
    const vacio = segundos == null;
    const cajas = {};
    const leerTodo = (caja) => {
      const vacias = Object.values(cajas).every((x) => x.value.trim() === '');
      const n = (clave) => Math.max(0, Math.round(leerNumero(cajas[clave].value) ?? 0));
      alCambiar(vacias ? null : n('h') * 3600 + n('m') * 60 + n('s'), caja);
    };
    const hueco = (clave, nombre) => {
      const caja = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': `${etiqueta}: ${nombre}`,
        value: vacio ? '' : String(inicial[clave]),
        oninput: (e) => leerTodo(e.target) });
      cajas[clave] = caja;
      return h('label', { class: 'trozo-tiempo' }, h('small', {}, nombre), caja);
    };
    return h('div', { class: 'valor tiempo' },
      h('span', { class: 'et' }, etiqueta),
      h('div', { class: 'trozos-tiempo' }, hueco('h', 'h'), hueco('m', 'min'), hueco('s', 's')));
  }

  // Casillas propias de cada técnica: los segundos del isométrico final, las
  // excéntricas lentas y sus segundos de bajada.
  function camposTecnicas(ej, i, j, serie) {
    const campos = camposDe(serie.tecnicas);
    if (!campos.length) return null;
    const actualizar = (fn) => { cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true }); if (sesion.tutorial) pintarGuia(); };
    return h('div', { class: 'serie-valores extras' },
      campos.map((c) => h('label', { class: 'valor' },
        h('span', { class: 'et' }, `${c.etiqueta} (${c.unidad})`),
        h('input', { type: 'text', inputmode: 'decimal', value: serie.detalle?.[c.tecnica]?.[c.clave] ?? '',
          'aria-label': `${c.etiqueta} (${c.unidad})`,
          oninput: (e) => actualizar((x) => {
            x.detalle ??= {};
            x.detalle[c.tecnica] ??= {};
            x.detalle[c.tecnica][c.clave] = leerNumero(e.target.value);
          }) }))));
  }

  // Estiramientos, movilidad y yoga: con qué técnica, con qué ayuda y, si
  // te apoyas con la mano, en qué punto de la escala (del puño a sin mano).
  function camposEstiramiento(ej, i, j, serie) {
    // Un calentamiento (la movilidad dinámica del principio) no lleva ayudas ni escala.
    if (!['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(ej)) || serie.tipo === 'calentamiento') return null;
    const actual = { ...ej.estiramiento, ...serie.estiramiento };
    const guardar = (clave, valor) => cambiarSesion((s) => {
      const x = s.ejercicios[i].series[j];
      x.estiramiento = { ...ej.estiramiento, ...x.estiramiento, [clave]: valor === '' || valor == null ? null : valor };
    });
    const desplegable = (clave, catalogo, vacio) => selector([['', vacio], ...Object.entries(catalogo).map(([k, v]) => [k, v.etiqueta ?? v])],
      actual[clave] ?? '', (v) => guardar(clave, v), { titulo: vacio, lista: true });
    // Las ayudas se pueden combinar (cinta y pared, por ejemplo) y se puede
    // medir por varios sitios a la vez: la escala de la mano y centímetros.
    const ayudas = actual.asistencias ?? (actual.asistencia ? [actual.asistencia] : []);
    const cambiarAyuda = (clave, marcada) => {
      const nuevas = ayudas.filter((x) => x !== clave && x !== 'ninguna');
      if (marcada && clave !== 'ninguna') nuevas.push(clave);
      cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        x.estiramiento = { ...ej.estiramiento, ...x.estiramiento, asistencias: nuevas, asistencia: nuevas[0] ?? null };
      });
    };
    return h('div', { class: 'serie-estiramiento' },
      desplegable('tecnica', TECNICAS_ESTIRAMIENTO, 'Técnica'),
      h('div', { class: 'chips' }, Object.entries(ASISTENCIAS).filter(([k]) => k !== 'ninguna').map(([k, v]) => h('button', {
        type: 'button', class: `chip seleccionable ${ayudas.includes(k) ? 'activo' : ''}`,
        'aria-pressed': String(ayudas.includes(k)),
        onclick: () => cambiarAyuda(k, !ayudas.includes(k)),
      }, v.etiqueta ?? v))),
      ayudas.includes('mano') && desplegable('nivel', ESCALA_MANO, 'Apoyo de la mano'),
      h('label', { class: 'valor' },
        h('span', { class: 'et' }, 'Hasta dónde llegas (cm)'),
        h('input', { type: 'text', inputmode: 'decimal', value: actual.cm ?? '', 'aria-label': 'Centímetros que te faltan o que llegas',
          oninput: (e) => guardar('cm', leerNumero(e.target.value)) })),
      actual.tecnica && h('small', { class: 'nota bloque' }, TECNICAS_ESTIRAMIENTO[actual.tecnica]?.descripcion));
  }

  // ¿Es esta la serie de prueba del 1RM? La primera de trabajo de un
  // ejercicio sin 1RM, mientras no se haya hecho ninguna serie hoy.
  function esPrueba(ej, entrada, j, i) {
    if (!entrada) return false;
    const serie = entrada.series[j];
    const plan = planDe(ej, serie);
    if (plan?.progresion?.tipo !== 'carga' || ['ninguna', 'altura', 'pesoCorporal'].includes(ej.carga?.tipo)) return false;
    if (j !== entrada.series.findIndex((x) => x.tipo !== 'calentamiento')) return false;
    const s = sugerenciaSerie(d, ej, plan, { excluirSesion: id });
    return Boolean(s.sinRM) && !rmDelEjercicio(d, ej, { sesion, antesDe: { i, j } });
  }

  function cabeceraSerie(ej, i, j, serie, entrada) {
    if (esPrueba(ej, entrada, j, i)) {
      return h('div', { class: 'serie-cabecera' },
        h('span', { class: 'insignia-prueba' }, serie.hecha ? 'Prueba de 1RM hecha' : 'Prueba de 1RM'),
        marcaObjetivo(serie));
    }
    const plan = planDe(ej, serie);
    const nombreLibre = plan && !plan.calentamiento ? nombreRegla(plan).split(':')[0] : 'Sin objetivo';
    return h('div', { class: 'serie-cabecera' },
      selector(Object.entries(TIPOS_SERIE).map(([k, t]) => [k, k === 'libre' ? nombreLibre : t,
        k === 'libre' && plan && !plan.calentamiento ? nombreRegla(plan) : EXPLICA_TIPO[k]]), serie.tipo, (v) => {
        // «Ciclo» en un ejercicio que aún no tiene ninguno: la app pregunta cuál.
        if (v === 'bilbo' && !(ej.series || []).some((p) => p.progresion?.tipo === 'bilbo')) { elegirCiclo(ej, i, j); return; }
        cambiarSesion((s) => {
          const x = s.ejercicios[i].series[j];
          // Una serie que pasa a calentamiento deja su regla (no cuenta para
          // el ciclo ni para «la última vez»); si vuelve, la recupera.
          if (v === 'calentamiento' && x.planId && !planDe(ej, x)?.calentamiento) {
            x.planIdAntes = x.planId; x.planId = null; x.objetivoAntes = x.objetivo; x.objetivo = null;
          } else if (v !== 'calentamiento' && x.planIdAntes && !x.planId) {
            x.planId = x.planIdAntes; x.objetivo = x.objetivoAntes ?? null; delete x.planIdAntes; delete x.objetivoAntes;
          }
          x.tipo = v;
          if (x.tipo !== 'intensidad') { x.tecnicas = []; x.tramos = null; }
        });
      }, { titulo: 'Tipo de serie', lista: true }),

      serie.tipo === 'intensidad' && desplegableTecnicas(serie.tecnicas, (nuevas) => cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        x.tecnicas = nuevas;
        x.recamara = recamaraDe(nuevas, ej.recamaraPorDefecto ?? d.perfil.recamaraPorDefecto ?? 1);
        x.tramos = tramosDe(nuevas) ? (x.tramos ?? tramosPropuestos(x, planDe(ej, x), null, d.perfil)) : null;
      })),

      marcaObjetivo(serie),

      h('button', { type: 'button', class: 'boton-icono boton-bocadillo', 'aria-label': 'Comentario de esta serie', title: 'Comentar',
        onclick: (e) => {
          const caja = e.currentTarget.closest('.serie')?.querySelector('.nota-serie');
          if (!caja) return;
          caja.hidden = !caja.hidden;
          if (!caja.hidden) caja.focus();
        } }, icono('bocadillo')),
      h('button', { class: 'boton-icono borrar-serie', 'aria-label': 'Borrar serie', onclick: () => borrarSerie(i, j) }, icono('papelera')));
  }

  function marcaObjetivo(serie) {
    const marca = h('span', { class: 'marca' });
    pintarMarca(marca, serie);
    return marca;
  }

  // «Superado» solo si había una vez anterior; la primera vez, «objetivo».
  // Un calentamiento no lleva marca.
  function pintarMarca(marca, serie) {
    const esfuerzo = esfuerzoTotal(serie);
    if (serie.objetivo == null || esfuerzo == null || serie.tipo === 'calentamiento') { marca.textContent = ''; marca.className = 'marca'; return; }
    const ok = esfuerzo >= serie.objetivo;
    marca.textContent = serie.objetivoDe === 'rm' ? (ok ? '✓ objetivo cumplido' : '✗ por debajo del objetivo') : (ok ? '✓ superado' : '✗ no superado');
    marca.className = `marca ${ok ? 'bien' : 'mal'}`;
  }

  function valoresSerie(ej, i, j, serie) {
    const peso = d.perfil.pesoCorporalKg;
    const tipoCarga = ej.carga.tipo;
    const asistida = tipoCarga === 'asistida';
    const cargaReal = h('small', { class: 'suave' },
      asistida && serie.carga != null ? `= ${formatearNumero(serie.carga)} kg reales` : '');
    const actualizar = (fn) => { cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true }); if (sesion.tutorial) pintarGuia(); };

    const corporal = tipoCarga === 'pesoCorporal' && (serie.lastre != null || serie.carga == null);
    const cargaCorporalTexto = h('small', { class: 'suave' },
      corporal ? (serie.carga != null ? `= ${formatearNumero(serie.carga)} kg` : 'pon tu peso en Ajustes') : '');

    return h('div', { class: 'serie-valores' },
      corporal && h('label', { class: 'valor' },
        h('span', { class: 'et' }, 'Lastre (kg)'),
        h('input', { type: 'text', inputmode: 'decimal', value: serie.lastre ?? 0, 'aria-label': 'Lastre (kg)',
          oninput: (e) => {
            actualizar((x) => {
              x.lastre = leerNumero(e.target.value) ?? 0;
              x.carga = cargaCorporal(ej, peso, x.lastre);
              cargaCorporalTexto.textContent = x.carga != null ? `= ${formatearNumero(x.carga)} kg` : 'pon tu peso en Ajustes';
            });
            recalcularAbajo(ej, i);
          } }),
        cargaCorporalTexto),
      tipoCarga !== 'ninguna' && !corporal && (asistida
        ? h('label', { class: 'valor' },
          h('span', { class: 'et' }, 'kg de la máquina'),
          h('input', { type: 'text', inputmode: 'decimal', value: serie.lectura ?? '', 'aria-label': 'Kilos que marca la máquina',
            oninput: (e) => {
              actualizar((x) => {
                x.lectura = leerNumero(e.target.value);
                x.carga = cargaDesdeLectura(x.lectura, peso);
                cargaReal.textContent = x.carga != null ? `= ${formatearNumero(x.carga)} kg reales` : '';
              });
              recalcularAbajo(ej, i);
            } }),
          cargaReal)
        : campoCargaConPorcentaje(ej, i, j, serie)),

      esTiempo(ej)
        ? campoTiempo('Tiempo', serie.esfuerzo, (segundos, caja) => {
          actualizar((x) => {
            const antes = serieCompleta(ej, x);
            x.esfuerzo = segundos;
            marcarHecha(caja, x, ej);
            if (!antes && serieCompleta(ej, x)) descansoEntreSeries(ej, x);
          });
          recalcularAbajo(ej, i);
        })
        : h('label', { class: 'valor' },
          h('span', { class: 'et' }, unidadEsfuerzo(ej)),
          h('input', { type: 'text', inputmode: 'decimal', 'aria-label': TIPOS_ESFUERZO[ej.esfuerzo.tipo].etiqueta,
            value: serie.esfuerzo ?? '',
            placeholder: serie.esfuerzo == null ? (serie.objetivo != null ? formatearNumero(serie.objetivo) : ultimaDe(ej, serie)?.esfuerzo ?? '') : '',
            oninput: (e) => {
              actualizar((x) => {
                const antes = serieCompleta(ej, x);
                x.esfuerzo = leerNumero(e.target.value);
                marcarHecha(e.target, x, ej);
                if (!antes && serieCompleta(ej, x)) descansoEntreSeries(ej, x);
              });
              recalcularAbajo(ej, i);
              avisarRecord(ej, serie.id);
            },
            // Al salir de la casilla, las series de debajo se ajustan al 1RM de ahora.
            onchange: () => reajustarDebajo(ej, i) })),

      // «En recámara»: las repeticiones que podrías haber hecho y no hiciste.
      ej.esfuerzo.tipo === 'repeticiones' && serie.tipo !== 'calentamiento' && (() => {
        const cercania = h('small', {}, serie.recamara != null ? (tipoDeFallo(serie.recamara) || '') : '');
        return h('label', { class: 'valor recamara' },
          h('span', { class: 'et' }, 'Recámara', queEs('recamara', '?')),
          h('input', { type: 'text', inputmode: 'decimal', value: serie.recamara ?? '', 'aria-label': 'Repeticiones en recámara',
            oninput: (e) => {
              const v = leerNumero(e.target.value);
              cercania.textContent = v != null ? (tipoDeFallo(v) || '') : '';
              actualizar((x) => { x.recamara = v; });
              recalcularAbajo(ej, i);
            },
            onchange: (e) => { ofrecerRecamara(ej, leerNumero(e.target.value)); reajustarDebajo(ej, i); } }),
          cercania);
      })(),

      medidasDe(ej).slice(1).map((tipo) => (tipo === 'tiempo'
        ? campoTiempo('Tiempo', extraDeSerie(serie, tipo), (segundos) => actualizar((x) => { guardarExtra(x, tipo, segundos); }))
        : h('label', { class: 'valor' },
          h('span', { class: 'et' }, `${TIPOS_ESFUERZO[tipo].etiqueta} (${unidadMedida(ej, tipo)})`),
          h('input', { type: 'text', inputmode: 'decimal', value: extraDeSerie(serie, tipo) ?? '',
            'aria-label': TIPOS_ESFUERZO[tipo].etiqueta,
            placeholder: serie.objetivosExtra?.[tipo] != null ? formatearNumero(serie.objetivosExtra[tipo]) : null,
            oninput: (e) => actualizar((x) => { guardarExtra(x, tipo, leerNumero(e.target.value)); }) }),
          serie.objetivosExtra?.[tipo] != null
            && h('small', {}, `objetivo ${formatearNumero(serie.objetivosExtra[tipo])}`)))));
  }

  // Kilos y porcentaje del 1RM, enlazados: escribes en uno y se rellena el
  // otro. En un tramo se guarda el porcentaje, para poder recalcular los
  // kilos si cambia el 1RM (modo «% del 1RM»).
  function campoCargaConPorcentaje(ej, i, j, serie, tramo = null) {
    const destino = () => (tramo == null ? serie : serie.tramos[tramo]);
    const rm = tramo != null ? (serie.rmUsado?.valor ?? rmDeReferencia(d, ej, { cicloN: serie.cicloN })?.valor ?? null)
      : (rmDelEjercicio(d, ej, { sesion, antesDe: { i, j } })?.valor ?? null);
    const antes = tramo == null && serie.carga == null ? ultimaDe(ej, serie)?.carga : null;
    const valido = (v) => (Number.isFinite(v) ? v : null);
    const coma = (v) => (v == null ? '' : String(v).replace('.', ','));
    const kilos = h('input', { type: 'text', inputmode: 'decimal', value: coma(valido(destino().carga)),
      'data-campo': 'kilos', placeholder: antes != null ? formatearNumero(antes) : '',
      'aria-label': tramo == null ? TIPOS_CARGA[ej.carga.tipo].etiqueta : `Carga de la bajada ${tramo + 1}` });
    const porcentaje = h('input', { type: 'text', inputmode: 'decimal', class: 'porcentaje', 'data-campo': 'porcentaje',
      value: valido(destino().carga) != null && rm ? Math.round((destino().carga / rm) * 100) : '',
      placeholder: rm ? '' : '—', 'aria-label': 'Porcentaje del 1RM' });
    const rmActual = () => Number(porcentaje.dataset.rm) || rm;
    if (rm) porcentaje.dataset.rm = rm;

    const guardar = (fn) => cambiarSesion((s) => {
      const x = s.ejercicios[i].series[j];
      fn(tramo == null ? x : x.tramos[tramo]);
    }, { tecleo: true });

    kilos.addEventListener('input', () => {
      const v = leerNumero(kilos.value);
      const r = rmActual();
      const antes = tramo == null && serieCompleta(ej, serie);
      guardar((x) => {
        x.carga = v;
        if (tramo != null) x.pct = v != null && r ? redondear((v / r) * 100, 1) : null;
        else { x.cargaAMano = true; delete x.cargaAuto; }
      });
      if (porcentaje) porcentaje.value = v != null && r ? Math.round((v / r) * 100) : '';
      if (tramo == null) {
        recalcularAbajo(ej, i);
        // El descanso arranca cuando están el peso y las repeticiones, en el orden que sea.
        if (!antes && serieCompleta(ej, serie)) descansoEntreSeries(ej, serie);
      }
    });
    kilos.addEventListener('change', () => { if (tramo == null) reajustarDebajo(ej, i); });
    porcentaje.addEventListener('input', () => {
      const p = leerNumero(porcentaje.value);
      const r = rmActual();
      const v = p != null && r ? aPesoDisponible(ej, (r * p) / 100) : null;
      guardar((x) => { x.carga = v; if (tramo != null) x.pct = p; else { x.cargaAMano = true; delete x.cargaAuto; } });
      kilos.value = coma(v);
      if (tramo == null) recalcularAbajo(ej, i);
    });

    if (ej.carga.tipo === 'altura') {
      return h('label', { class: 'valor' }, h('span', { class: 'et' }, `Distancia/Altura (${unidadCarga(ej)})`), kilos);
    }
    return h('div', { class: 'carga-con-porcentaje' },
      h('label', { class: 'valor' }, tramo == null && h('span', { class: 'et' }, unidadCarga(ej)), kilos),
      h('label', { class: 'valor' }, tramo == null && h('span', { class: 'et' }, '% 1RM'), porcentaje));
  }

  // Serie descendente, rest-pause y miorrepeticiones: una línea por bajada, con lo que
  // hiciste la última vez en gris dentro de cada casilla de repeticiones.
  function tramosSerie(ej, i, j, serie, tramos) {
    serie.tramos ??= tramosPropuestos(serie, planDe(ej, serie), null, d.perfil);
    const plan = planDe(ej, serie);
    const anterior = plan ? sugerenciaSerie(d, ej, plan, { excluirSesion: id }).ultima?.serie : null;
    const modoCarga = modoCargaDe(d, ej, serie, sesion);
    // Lo de la otra vez va en su columna, a la izquierda; abajo, la fila de total.
    const conAntes = false;
    const antes = (t) => (t ? `${t.carga != null ? `${formatearNumero(t.carga)}×` : ''}${formatearNumero(t.esfuerzo) || '—'}` : '');
    const totalReps = h('span', { class: 'total-reps' });
    const totalTexto = h('span', { class: 'total-etiqueta' });
    const pintarTotal = () => {
      const t = trabajoSerie(serie);
      const reps = esfuerzoTotal(serie);
      totalReps.textContent = reps ? textoEsfuerzo(ej, reps) : '—';
      totalTexto.textContent = t ? `Total · ${formatearNumero(t)} kg de trabajo` : 'Total';
    };
    pintarTotal();
    const actualizar = (fn) => { cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true }); if (sesion.tutorial) pintarGuia(); };
    const conCarga = ej.carga.tipo !== 'ninguna';

    return h('div', { class: 'tramos' },
      conCarga && !plan?.tramosFijos?.length && h('div', { class: 'modo-carga' },
        h('span', { class: 'suave' }, 'Carga:'),
        // Un desplegable, como el de la técnica: no tres botones a la vista.
        selector([['kg', 'A mano'], ['rm', (d.perfil.dropSet?.modoCarga ?? 'rm') === 'rm' ? '% del 1RM (automático)' : '% del 1RM'],
          ...(anterior?.tramos?.length ? [['ultima', 'Como la última vez']] : [])],
        serie.cargaComoUltima ? 'ultima' : modoCarga, (clave) => {
          cambiarSesion((s) => {
            const x = s.ejercicios[i].series[j];
            if (clave === 'ultima') {
              // Los mismos pesos que la otra vez, y desde ahí, a mano.
              x.modoCarga = 'kg';
              x.tramos = anterior.tramos.map((t, k) => ({ ...(x.tramos[k] ?? {}), carga: t.carga, pct: null, esfuerzo: x.tramos[k]?.esfuerzo ?? null }));
              x.cargaComoUltima = true;
              return;
            }
            x.modoCarga = clave;
            delete x.cargaComoUltima;
            if (clave === 'rm') for (const tr of x.tramos) tr.pct = null;
          });
          if (clave === 'rm') recalcularAbajo(ej, i, { repintar: true });
        }, { titulo: 'Carga de las bajadas', lista: true }),
        // Qué hace cada modo y de dónde salen hoy los kilos, solo si se pide.
        ayuda('Elegir carga por', [textoRelleno(ej, serie),
          'A mano: escribes los kilos tú y no cambian aunque cambie tu 1RM.',
          '% del 1RM: la app pone los kilos según tu 1RM, y los recalcula al apuntar la serie de arriba.'])),
      h('p', { class: 'aviso-texto aviso-bajada' }, avisoPrimeraBajada(d, ej, serie) ?? ''),
      // Cabecera y filas en la misma rejilla: cada título queda justo encima
      // de su columna (y un hueco encima de las ✕).
      h('div', { class: `tramo cabecera-tramos${conCarga ? '' : ' sin-carga'}${conAntes ? ' con-antes' : ''}`, 'aria-hidden': 'true' },
        conAntes && h('span', { class: 'crece' }, 'La otra vez'),
        conCarga && h('span', { class: 'crece' }, unidadCarga(ej)),
        conCarga && h('span', { class: 'crece' }, '% 1RM'),
        h('span', { class: 'crece' }, unidadEsfuerzo(ej)),
        h('span', {})),
      serie.tramos.map((tramo, k) => h('div', { class: `tramo${conCarga ? '' : ' sin-carga'}${conAntes ? ' con-antes' : ''}`, 'data-tramo': k },
        h('span', { class: 'tramo-n', title: `${tramos.nombre} ${k + 1}` }, k + 1),
        conAntes && h('span', { class: 'tramo-antes' }, antes(anterior.tramos[k])),
        conCarga && campoCargaConPorcentaje(ej, i, j, serie, k),
        h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: tramo.esfuerzo ?? '', 'aria-label': `Repeticiones de la bajada ${k + 1}`,
            // Lo de la otra vez, dentro de la casilla en gris muy tenue.
            placeholder: anterior?.tramos?.[k]?.esfuerzo != null ? formatearNumero(anterior.tramos[k].esfuerzo) : '—',
            oninput: (e) => actualizar((x) => {
              const antes = x.tramos[k].esfuerzo;
              x.tramos[k].esfuerzo = leerNumero(e.target.value);
              x.hecha = x.tramos.some((t) => t.esfuerzo != null);
              pintarTotal();
              marcarHecha(e.target, x, ej);
              if (k === 0) {
                const caja = e.target.closest('.serie')?.querySelector('.aviso-bajada');
                if (caja) caja.textContent = avisoPrimeraBajada(d, ej, x) ?? '';
              }
              // Al apuntar un tramo, descanso corto hasta el siguiente; al
              // apuntar el último, el descanso normal entre series.
              if (antes == null && x.tramos[k].esfuerzo != null) {
                if (k < x.tramos.length - 1) {
                  if (tramos.tecnica === 'miorepeticiones') arrancarRespiracion(d.perfil);
                  else {
                    arrancarDescanso(descansoDeTramo(d.perfil, tramos.tecnica), {
                      texto: tramos.tecnica === 'drop-set' ? 'para cambiar el peso' : 'para recuperar el aliento' });
                  }
                } else descansoEntreSeries(ej, x);
              }
            }) })),
        serie.tramos.length > 1 ? h('button', { class: 'boton-icono', 'aria-label': `Quitar ${tramos.nombre.toLowerCase()} ${k + 1}`,
          onclick: () => cambiarSesion((s) => { s.ejercicios[i].series[j].tramos.splice(k, 1); }) }, icono('cerrar')) : h('span', {}))),
      h('div', { class: `tramo fila-total${conCarga ? '' : ' sin-carga'}${conAntes ? ' con-antes' : ''}` },
        conAntes && h('span', { class: 'tramo-antes' }, textoEsfuerzo(ej, esfuerzoTotal(anterior))),
        conCarga ? totalTexto : h('span', { class: 'oculto' }),
        totalReps, h('span', {})),

      h('button', { class: 'boton enlace', onclick: () => cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        const ultimo = x.tramos.at(-1);
        const salto = saltoDeTramo(d, ej, x);
        const carga = Number.isFinite(ultimo?.carga) ? Math.max(0, redondear(ultimo.carga - salto, 2)) : null;
        const rm = x.rmUsado?.valor;
        x.tramos.push({ carga, esfuerzo: null, pct: carga != null && rm ? redondear((carga / rm) * 100, 1) : null });
      }) }, `+ ${tramos.nombre}`),
      tramos.tecnica === 'drop-set' && serie.planId && ej.maquinaPlacas
        && h('button', { class: 'boton enlace', onclick: () => fijarPesos(ej, serie) },
          plan?.tramosFijos?.length ? 'Cambiar los pesos fijos por estos' : 'Fijar estos pesos para siempre (máquina de placas)'));
  }

  // Máquinas de placas: la secuencia de pesos siempre es la misma. Se guarda
  // en el ejercicio y la próxima vez sale tal cual.
  function fijarPesos(ej, serie) {
    const pesos = serie.tramos.map((t) => t.carga).filter((c) => Number.isFinite(c));
    if (!pesos.length) { aviso('Pon primero los pesos de las bajadas'); return; }
    estado.cambiar((datos) => {
      const plan = datos.ejercicios.find((e) => e.id === ej.id)?.series.find((p) => p.id === serie.planId);
      if (plan) plan.tramosFijos = pesos;
    });
    aviso(`Pesos fijos guardados: ${pesos.map((p) => formatearNumero(p)).join(' → ')} kg. Se quitan en la ficha del ejercicio.`);
  }

  // Texto que explica de dónde salen los pesos de los tramos.
  function textoRelleno(ej, serie) {
    if (planDe(ej, serie)?.tramosFijos?.length) return 'Pesos fijos de la máquina (se cambian en la ficha del ejercicio).';
    const origen = origenModoCarga(d, ej, serie, sesion);
    if (modoCargaDe(d, ej, serie, sesion) === 'kg') return `Pesos a mano (${origen}): no cambian aunque cambie tu 1RM.`;
    if (!serie.rmUsado) return `Por % del 1RM (${origen}): los kilos salen al apuntar la serie de arriba.`;
    const fatiga = serie.rmUsado.deHoy && serie.rmUsado.fatiga && serie.rmUsado.fatiga !== 1
      ? ` ×${String(serie.rmUsado.fatiga).replace('.', ',')} por el cansancio`
      : '';
    return `Kilos por el 1RM ${serie.rmUsado.deHoy ? 'de hoy' : 'de tu historial'} (${formatearNumero(serie.rmUsado.base ?? serie.rmUsado.valor)} kg${fatiga}).`;
  }

  // Entre estiramientos el descanso es otro, más corto (se cambia en Ajustes).
  // Si en este entrenamiento cambias la recámara de un ejercicio dos veces
  // al mismo número, la app ofrece dejarlo así siempre en ese ejercicio.
  const recamarasTocadas = new Map();   // ejercicioId → { valor, veces }
  function ofrecerRecamara(ej, valor) {
    const porDefecto = ej.recamaraPorDefecto ?? d.perfil.recamaraPorDefecto ?? 1;
    if (valor == null || valor === porDefecto) return;
    const previo = recamarasTocadas.get(ej.id);
    const veces = previo?.valor === valor ? previo.veces + 1 : 1;
    recamarasTocadas.set(ej.id, { valor, veces });
    if (veces !== 2) return;
    aviso(`Has puesto ${valor} de recámara dos veces en ${ej.nombre}. ¿Lo dejo así siempre en este ejercicio?`, { accion: { texto: 'Sí', fn: () => {
      estado.cambiar((x) => { const e = x.ejercicios.find((y) => y.id === ej.id); if (e) e.recamaraPorDefecto = valor; });
      aviso(`${ej.nombre}: ${valor} en recámara por defecto. Se cambia en su ficha (Ajustes finos).`);
    } } });
  }

  // Récord al momento, como en Hevy: dos segundos después de escribir las
  // repeticiones, si esa serie supera tu mejor 1RM (o tus repeticiones con
  // ese peso), sale el aviso. Una vez por serie y valor.
  const esperaRecord = new Map();
  const recordsAvisados = new Set();
  function avisarRecord(ej, serieId) {
    clearTimeout(esperaRecord.get(serieId));
    esperaRecord.set(serieId, setTimeout(() => {
      const datos = estado.datos();
      const serie = datos.sesiones.find((s) => s.id === id)?.ejercicios.flatMap((e) => e.series).find((x) => x.id === serieId);
      if (!serie?.hecha || serie.tramos?.length || serie.tipo === 'calentamiento' || !(serie.carga > 0)) return;
      const otras = seriesDeEjercicio(datos, ej.id).filter((x) => x.serie.id !== serieId && !x.serie.tramos?.length);
      if (!otras.length) return;
      const rm = rmDeSerie(datos, ej, serie, esfuerzoTotal(serie));
      const mejor = Math.max(0, ...otras.map((x) => rmDeSerie(datos, ej, x.serie, esfuerzoTotal(x.serie)) ?? 0));
      const clave = `${serieId}:${serie.carga}:${serie.esfuerzo}`;
      if (recordsAvisados.has(clave)) return;
      if (rm && mejor && rm >= mejor + 0.5) {
        recordsAvisados.add(clave);
        aviso(`🏆 ¡Récord en ${ej.nombre}! 1RM estimado ${formatearNumero(redondear(rm, 1))} kg, `
          + `${formatearNumero(redondear(rm - mejor, 1))} kg más que el anterior.`, { tipo: 'exito', ms: 6000 });
        return;
      }
      const conEsePeso = otras.filter((x) => x.serie.carga === serie.carga).map((x) => esfuerzoTotal(x.serie) ?? 0);
      if (conEsePeso.length && esfuerzoTotal(serie) > Math.max(...conEsePeso)) {
        recordsAvisados.add(clave);
        aviso(`🏆 ¡Récord de repeticiones con ${formatearNumero(serie.carga)} kg en ${ej.nombre}!`, { tipo: 'exito', ms: 6000 });
      }
    }, 2000));
  }

  // Superserie: el ejercicio marcado en la rutina se alterna con el
  // siguiente, sin descanso entre los dos.
  function itemDeRutina(ejId) {
    return sesion.rutinaId
      ? d.rutinas.find((r) => r.id === sesion.rutinaId)?.dias.find((x) => x.id === sesion.diaRutinaId)?.ejercicios.find((x) => x.ejercicioId === ejId)
      : null;
  }

  function descansoEntreSeries(ej, serie = null) {
    const i = sesion.ejercicios.findIndex((e) => e.ejercicioId === ej.id);
    // Calentamientos: las aproximaciones ligeras van seguidas (solo cambiar
    // discos); antes de una pesada (80 % o más) y antes de la primera serie de
    // trabajo, 2-3 min. Si era lo último del ejercicio (el cardio o la
    // movilidad del principio), sin descanso: al siguiente.
    if (serie?.tipo === 'calentamiento') {
      const lista = estado.datos().sesiones.find((s) => s.id === id)?.ejercicios[i]?.series ?? [];
      const siguiente = lista[lista.findIndex((x) => x.id === serie.id) + 1];
      if (!siguiente) return;
      const pesada = siguiente.tipo !== 'calentamiento' || (planDe(ej, siguiente)?.progresion?.porRM?.valor ?? 0) >= 80;
      if (pesada && ej.carga?.tipo !== 'ninguna') arrancarDescanso(DESCANSO_ANTES_DE_PESADA, { texto: siguiente.tipo !== 'calentamiento' ? 'antes de la primera serie' : 'antes de la pesada' });
      return;
    }
    const siguiente = sesion.ejercicios[i + 1];
    if (itemDeRutina(ej.id)?.superserie && siguiente) {
      const otro = ejercicioDe(siguiente.ejercicioId);
      aviso(`Superserie: ahora ${otro?.nombre ?? 'el siguiente'}, sin descanso.`,
        { accion: posicion != null ? { texto: 'Ir', fn: () => irA(i + 1) } : null });
      return;
    }
    const anterior = sesion.ejercicios[i - 1];
    const vuelta = anterior && itemDeRutina(anterior.ejercicioId)?.superserie ? { texto: 'Volver', fn: () => irA(i - 1) } : null;
    if (vuelta && posicion != null) aviso(`Descansa y vuelve a ${ejercicioDe(anterior.ejercicioId)?.nombre ?? 'la superserie'}.`, { accion: vuelta });
    if (['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(ej))) {
      const seg = d.perfil.descansoEstiramientos ?? DESCANSO_ESTIRAMIENTOS_POR_DEFECTO;
      if (seg) arrancarDescanso(seg, { texto: 'entre estiramientos' });
      return;
    }
    // Cada ejercicio puede tener su descanso (ficha, Ajustes finos). Si no,
    // lo pide la serie: tras una serie máxima, 4 min (3-5); entre series de
    // fuerza (6 o menos con 2 en recámara), 3 min; si no, el de Ajustes.
    const seg = ej.descansoSegundos ?? descansoDeSerie(ej, serie) ?? d.perfil.descansoSegundos;
    if (seg) arrancarDescanso(seg, { ejercicio: { id: ej.id, nombre: ej.nombre } });
  }

  function descansoDeSerie(ej, serie) {
    const plan = serie ? planDe(ej, serie) : null;
    const prog = plan?.progresion ?? {};
    const max = (prog.objetivoEsfuerzo ?? plan?.objetivoEsfuerzo)?.[1] ?? prog.porRM?.valor;
    if (!plan || prog.tipo !== 'carga' || max == null) return null;
    if (max <= 2) return 240;
    if (max <= 6 && (prog.recamaraMin ?? 0) >= 2) return 180;
    return null;
  }

  // Tras tocar una serie normal (peso, porcentaje, repeticiones o recámara),
  // las series con tramos de abajo que aún no has empezado recalculan sus
  // kilos con el 1RM de hoy.
  function recalcularAbajo(ej, i, { repintar = false } = {}) {
    const datos = estado.datos();
    const s = datos.sesiones.find((x) => x.id === id);
    const entrada = s?.ejercicios[i];
    if (!entrada) return;
    const tocadas = recalcularTramos(datos, ej, entrada, { excluirSesion: id, sesion: s });
    if (!tocadas.length) return;
    cambiarSesion(() => {}, { tecleo: !repintar });
    if (repintar) return;
    const tarjeta = document.querySelector(`[data-entrada="${i}"]`);
    for (const j of tocadas) {
      const serie = entrada.series[j];
      const caja = tarjeta?.querySelector(`[data-serie="${j}"]`);
      if (!caja) continue;
      serie.tramos.forEach((t, k) => {
        const fila = caja.querySelector(`[data-tramo="${k}"]`);
        const kilos = fila?.querySelector('[data-campo="kilos"]');
        const pct = fila?.querySelector('[data-campo="porcentaje"]');
        if (kilos) kilos.value = t.carga == null ? '' : String(t.carga).replace('.', ',');
        if (pct) {
          pct.dataset.rm = serie.rmUsado.valor;
          pct.value = t.carga != null ? Math.round((t.carga / serie.rmUsado.valor) * 100) : '';
        }
      });
      const nota = caja.querySelector('.nota-relleno');
      if (nota) nota.textContent = textoRelleno(ej, serie);
    }
  }

  // Una serie está apuntada del todo cuando tiene las repeticiones (o el
  // tiempo) y, si el ejercicio lleva peso, también el peso.
  function serieCompleta(ej, x) {
    if (x.esfuerzo == null) return false;
    if (['ninguna', 'pesoCorporal', 'asistida'].includes(ej.carga?.tipo)) return true;
    return x.carga != null;
  }

  function marcarHecha(input, serie, ej) {
    serie.hecha = serie.tramos?.length ? serie.tramos.some((t) => t.esfuerzo != null) : serie.esfuerzo != null;
    // La hora a la que la acabas: con ella se ve cuánto descansas entre series.
    if (serie.hecha) serie.hechaA ??= new Date().toISOString(); else serie.hechaA = null;
    const caja = input.closest('.serie');
    caja?.classList.toggle('hecha', serie.hecha);
    const marca = caja?.querySelector('.marca');
    if (marca) pintarMarca(marca, serie);
    const comparacion = caja?.querySelector('.comparacion');
    if (comparacion && ej) comparacion.textContent = comparacionSerie(d, ej, serie, { excluirSesion: id });
  }

  // -------------------------------------------------------------------------

  function anadirEjercicio(ej) {
    cambiarSesion((s, datos) => {
      s.ejercicios.push(entradaDeEjercicio(datos, ej, { excluirSesion: id }));
    });
    if (posicion != null) irA(sesion.ejercicios.length - 1);
  }

  // «+ Serie» mete la siguiente serie de la plantilla del ejercicio: si ya
  // hiciste la Bilbo, aparece la de intensidad con su técnica.
  function anadirSerie(i, ej, entrada) {
    cambiarSesion((s, datos) => {
      if (unaSerie) { const nueva = trabajoDe(s.ejercicios[i]).length; guiado.set(id, { modo, pos: posicion, serie: nueva }); s.vista = { modo, pos: posicion, serie: nueva }; }
      const puestas = new Set(s.ejercicios[i].series.map((x) => x.planId).filter(Boolean));
      const siguiente = (ej.series || []).find((plan) => !puestas.has(plan.id));
      if (siguiente) {
        s.ejercicios[i].series.push(crearSerieDesdePlan(datos, ej, siguiente, { excluirSesion: id }));
        return;
      }
      const anterior = s.ejercicios[i].series.at(-1);
      // Una Bilbo no se repite: la serie de más es libre, sin plantilla, para
      // no contar dos veces en el ciclo.
      const esBilbo = anterior?.tipo === 'bilbo' || planDe(ej, anterior ?? {})?.progresion?.tipo === 'bilbo';
      const copia = serieSuelta({ tipo: esBilbo ? 'libre' : anterior?.tipo ?? 'libre', tecnicas: anterior?.tecnicas ?? [],
        carga: anterior?.carga ?? null, recamara: anterior?.recamara ?? null });
      copia.planId = esBilbo ? null : anterior?.planId ?? null;
      copia.lectura = anterior?.lectura ?? null;
      if (usaTramos(copia.tecnicas)) copia.tramos = tramosPropuestos(copia, planDe(ej, copia), anterior, datos.perfil);
      s.ejercicios[i].series.push(copia);
    });
  }

  // Borrar series y ejercicios no pide confirmación (sería lento en pleno
  // entrenamiento), pero se puede deshacer durante unos segundos.
  function borrarSerie(i, j) {
    let quitada;
    cambiarSesion((s) => { [quitada] = s.ejercicios[i].series.splice(j, 1); });
    aviso('Serie borrada', { accion: { texto: 'Deshacer',
      fn: () => cambiarSesion((s) => { s.ejercicios[i]?.series.splice(j, 0, quitada); }) } });
  }

  function quitarEjercicio(i, ej) {
    let quitada;
    cambiarSesion((s) => { [quitada] = s.ejercicios.splice(i, 1); });
    if (posicion != null && posicion >= sesion.ejercicios.length) irA(sesion.ejercicios.length - 1);
    aviso(`${ej.nombre} quitado`, { accion: { texto: 'Deshacer',
      fn: () => cambiarSesion((s) => { s.ejercicios.splice(i, 0, quitada); }) } });
  }

  // Tus ejercicios y, debajo, los de la lista general; si eliges uno de la
  // lista, se pregunta antes de añadirlo a los tuyos.
  function elegirEjercicio() {
    const disponibles = d.ejercicios.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const cerrar = abrirSelector({
      titulo: 'Añadir ejercicio',
      // Primero los de este sitio (o de cualquier sitio); los de otros, al final.
      mios: [...disponibles.filter((e) => ejercicioEnSede(e, sesion.sedeId)),
        ...disponibles.filter((e) => !ejercicioEnSede(e, sesion.sedeId))],
      marcarMio: (e) => (sesion.ejercicios.some((x) => x.ejercicioId === e.id) && 'Ya añadido')
        || (!ejercicioEnSede(e, sesion.sedeId) && `Es de ${nombreSede(d, e.sedeId)}`),
      alElegirMio: anadirEjercicio,
      alElegirCatalogo: async (x) => {
        const si = await confirmar(`«${x.nombre}» no está en tus ejercicios. ¿Lo añado a los tuyos tal y como viene en la lista?`,
          { si: 'Añadir a mis ejercicios' });
        if (!si) return;
        const nuevo = ejercicioDesdeCatalogo(x);
        estado.cambiar((datos) => { datos.ejercicios.push(nuevo); });
        anadirEjercicio(nuevo);
      },
      pie: h('a', { class: 'boton secundario', href: `#/ejercicio/nuevo/para/${id}`, onclick: () => cerrar() },
        'Crear ejercicio nuevo'),
    });
  }

  // Al terminar se cierra el entrenamiento y sale un resumen: récords,
  // mejoras, volumen de la semana y, si has cambiado algo respecto a la
  // rutina, si lo quieres solo para hoy o para siempre.
  // Cancelar: por si has entrado sin querer. Sin nada apuntado se borra; con
  // algo apuntado, va a la papelera (recuperable desde el historial).
  async function cancelar() {
    const algo = sesion.ejercicios.some((e) => e.series.some((s) => s.hecha));
    if (!await confirmar(algo ? '¿Cancelar el entrenamiento? Lo apuntado irá a la papelera del historial.'
      : '¿Cancelar el entrenamiento? No has apuntado nada.', { si: 'Cancelar entrenamiento', no: 'Seguir', peligro: true })) return;
    guiado.delete(id);
    estado.cambiar((datos) => {
      if (algo) {
        const s = datos.sesiones.find((x) => x.id === id);
        if (s) { s.estado = 'terminada'; s.fin = new Date().toISOString(); s.borrada = new Date().toISOString(); }
      } else {
        datos.sesiones = datos.sesiones.filter((x) => x.id !== id);
      }
    });
    location.hash = '#/';
  }

  function terminar() {
    renovarAlTocar();
    cambiarSesion((s) => {
      s.estado = 'terminada';
      // Un entrenamiento de otro día (pasado a mano) acaba ese día, no hoy.
      s.fin = s.fecha === hoyISO() ? new Date().toISOString() : horaEnFecha(s.inicio, s.fecha, 60);
    });
    guiado.delete(id);
    location.hash = '#/';
    if (sesion.tutorial) {
      const cerrar = modal('Entrenamiento de prueba terminado', h('div', {},
        h('p', {}, 'Era el del tutorial. ¿Lo guardo como un entrenamiento de verdad o lo borro?'),
        h('div', { class: 'fila-botones' },
          h('button', { class: 'boton secundario', onclick: () => {
            estado.cambiar((x) => { x.sesiones = x.sesiones.filter((s) => s.id !== id); });
            cerrar();
            aviso('Entrenamiento de prueba borrado.');
            guiaTrasPrueba();
          } }, 'Borrarlo'),
          h('button', { class: 'boton', onclick: () => { cerrar(); guiaTrasPrueba(); mostrarResumen(estado.datos(), id); } }, 'Guardarlo'))));
      return;
    }
    mostrarResumen(estado.datos(), id);
  }

  // Un entrenamiento nunca se borra del todo: va a la papelera del historial.
  async function borrar() {
    if (!await confirmar('¿Mover este entrenamiento a la papelera? Dejará de contar para tu progresión, pero podrás recuperarlo desde el historial.', { si: 'Mover a la papelera', peligro: true })) return;
    cambiarSesion((s) => { s.borrada = new Date().toISOString(); });
    location.hash = '#/historial';
    aviso('Entrenamiento en la papelera', { accion: { texto: 'Deshacer', fn: recuperar } });
  }

  function recuperar() {
    cambiarSesion((s) => { s.borrada = null; });
    aviso('Entrenamiento recuperado');
  }
}

// Cambiar la fecha de un entrenamiento mueve también sus horas de inicio y
// fin a ese día, para que la recuperación y el volumen cuenten bien.
function moverFecha(sesion, fecha) {
  sesion.fecha = fecha;
  if (sesion.inicio) sesion.inicio = horaEnFecha(sesion.inicio, fecha);
  if (sesion.fin) sesion.fin = horaEnFecha(sesion.fin, fecha);
}

function horaEnFecha(iso, fecha, minutosMas = 0) {
  const base = iso ? new Date(iso) : new Date(`${fecha}T19:00:00`);
  const [a, m, d] = fecha.split('-').map(Number);
  const nueva = new Date(a, m - 1, d, base.getHours(), base.getMinutes() + minutosMas);
  return nueva.toISOString();
}

// Entre aproximaciones ligeras, solo lo que se tarda en cambiar discos (sin
// temporizador); antes de una pesada o de la primera de trabajo, 2-3 min.
const DESCANSO_ANTES_DE_PESADA = 150;

function planDe(ej, serie) {
  return (ej.series || []).find((p) => p.id === serie.planId) ?? null;
}

// Un día del historial, para leerlo: qué hiciste, serie a serie, sin nada
// que se pueda cambiar sin querer. Para cambiarlo, «Editar».
function resumenDelDia(contenedor, d, sesion) {
  const duracion = sesion.inicio && sesion.fin
    ? Math.round((new Date(sesion.fin) - new Date(sesion.inicio)) / 60_000) : null;
  const series = sesion.ejercicios.reduce((n, e) => n + e.series.filter((s) => s.hecha).length, 0);
  anadir(contenedor,
    sesion.borrada && h('p', { class: 'tarjeta aviso-tarjeta' }, 'Este entrenamiento está en la papelera: no cuenta para tu progresión.'),
    h('h1', {}, fechaLarga(sesion.fecha)),
    h('p', { class: 'suave' }, [nombreDelDia(d, sesion), sesion.sedeId && nombreSede(d, sesion.sedeId),
      `${series} ${series === 1 ? 'serie' : 'series'}`, duracion && `${duracion} min`].filter(Boolean).join(' · ')),
    sesion.ejercicios.map((entrada) => {
      const ej = d.ejercicios.find((e) => e.id === entrada.ejercicioId);
      const hechas = entrada.series.filter((s) => s.hecha);
      return h('section', { class: 'tarjeta resumen-ejercicio' },
        h('h2', {}, ej?.nombre ?? 'Ejercicio borrado'),
        hechas.length && ej
          ? h('ol', { class: 'series-resumen' }, hechas.map((s) => h('li', {}, textoSerie(ej, s),
            s.tipo === 'calentamiento' && h('small', { class: 'suave' }, ' · calentamiento'),
            s.nota && h('small', { class: 'bloque suave' }, `«${s.nota}»`))))
          : h('p', { class: 'suave' }, 'Sin series apuntadas'),
        entrada.nota && h('p', { class: 'nota' }, entrada.nota));
    }),
    sesion.notas && h('p', { class: 'tarjeta nota' }, sesion.notas),
    h('div', { class: 'acciones-hoy' },
      h('button', { class: 'boton', onclick: () => { editando.add(sesion.id); dispatchEvent(new HashChangeEvent('hashchange')); } }, 'Editar'),
      // Las estadísticas también son donde se hacen permanentes los cambios de ese día.
      h('button', { class: 'boton secundario', onclick: () => mostrarResumen(estado.datos(), sesion.id) }, 'Estadísticas y cambios'),
      sesion.borrada
        ? h('button', { class: 'boton secundario', onclick: () => estado.cambiar((x) => {
          const s = x.sesiones.find((y) => y.id === sesion.id); if (s) s.borrada = null;
        }) }, 'Recuperar entrenamiento')
        : null),
    !sesion.borrada && deslizarParaConfirmar('Desliza para mover a la papelera', () => {
      estado.cambiar((x) => { const s = x.sesiones.find((y) => y.id === sesion.id); if (s) s.borrada = new Date().toISOString(); });
      location.hash = '#/historial';
      aviso('Entrenamiento en la papelera', { accion: { texto: 'Deshacer', fn: () => estado.cambiar((x) => {
        const s = x.sesiones.find((y) => y.id === sesion.id); if (s) s.borrada = null;
      }) } });
    }, { peligro: true }));
}

function nombreDelDia(datos, sesion) {
  const rutina = datos.rutinas.find((r) => r.id === sesion.rutinaId);
  const dia = rutina?.dias.find((x) => x.id === sesion.diaRutinaId);
  return dia ? `${rutina.nombre} · ${dia.nombre}` : '';
}

export function textoSerie(ej, serie) {
  const partes = [];
  if (serie.tramos?.length) {
    return serie.tramos.map((t) => `${formatearNumero(t.carga)}×${formatearNumero(t.esfuerzo)}`).join(' → ');
  }
  if (serie.carga != null) partes.push(`${formatearNumero(serie.carga)} ${unidadCarga(ej)}`);
  if (serie.esfuerzo != null) {
    partes.push(esTiempo(ej) ? textoEsfuerzo(ej, serie.esfuerzo)
      : `${formatearNumero(serie.esfuerzo)} ${unidadEsfuerzo(ej)}${serie.recamara ? ` (${formatearNumero(serie.recamara)} en recámara)` : ''}`);
  }
  for (const tipo of medidasDe(ej).slice(1)) {
    const v = extraDeSerie(serie, tipo);
    if (v != null) partes.push(tipo === 'tiempo' ? formatearTiempo(v) : `${formatearNumero(v)} ${unidadMedida(ej, tipo)}`);
  }
  const tec = textoTecnicas(serie.tecnicas);
  return partes.join(' × ') + (tec ? ` (${tec})` : '');
}

export function unidadCarga(ej) {
  return ej.carga.tipo === 'asistida' ? 'kg' : unidadMedida(ej, ej.carga.tipo);
}

export function unidadEsfuerzo(ej) {
  if (esTiempo(ej)) return 'min:s';
  return unidadMedida(ej, ej.esfuerzo.tipo);
}

const esTiempo = (ej) => ej.esfuerzo?.tipo === 'tiempo';
// El cronómetro vale en cuanto el ejercicio apunte tiempo, aunque no sea su
// medida principal (flexiones con repeticiones, tiempo y distancia).
const mideTiempo = (ej) => medidasDe(ej).includes('tiempo');

// «12 reps», «1,5 km» o «45 s» / «1:02:30».
export function textoEsfuerzo(ej, valor) {
  if (valor == null) return '';
  if (esTiempo(ej)) return valor < 60 ? `${Math.round(valor)} s` : formatearTiempo(valor);
  return `${formatearNumero(valor)} ${unidadMedida(ej, ej.esfuerzo.tipo)}`.trim();
}

