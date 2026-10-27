// Test de atención (PVT): una pantalla oscura y, cuando aparece un contador,
// hay que tocar cuanto antes. Mide lo despierto que estás de verdad, que es
// otra cosa que lo despierto que te sientes (la sensación se acostumbra a
// dormir poco mientras el rendimiento sigue cayendo, Van Dongen 2003).
//
// Palabras que salen en pantalla:
//   · PVT: psychomotor vigilance task, «tarea de vigilancia psicomotora».
//   · Velocidad de respuesta: cuántas respuestas te saldrían por segundo a ese
//     ritmo. Es el dato principal (el porqué está en `diario.js`).
//   · Lapso: una reacción tan lenta que cuenta como un despiste.
//   · Falso toque: tocar cuando no hay contador en pantalla.
//
// Las tres duraciones, el umbral de cambio real y la línea base están en
// `diario.js` (MODOS_PVT), que es también donde se guardan y se promedian los
// resultados. Aquí solo está el test y su pantalla.
//
// Decisiones de medida, para que los números signifiquen algo:
//   · Los tiempos se miden con `performance.now()` (reloj monótono, en
//     milisegundos), nunca con `Date`: la hora del sistema puede dar saltos.
//   · El contador se cronometra desde que está pintado de verdad (dos pasos de
//     `requestAnimationFrame`); si el navegador va lento y aún no ha pintado,
//     se mide desde que se puso en pantalla, que como mucho sobra unos
//     milisegundos. Nunca al revés: un toque de verdad no puede acabar
//     contando como falso.
//   · Por debajo de 100 ms no es una reacción, es una anticipación: cuenta
//     como falso toque y no entra en la media.
//   · Si se pasa la espera máxima sin tocar (10 s en el de 3 min, 30 s en los
//     largos, como el PVT clásico), se cuenta como lapso y no entra en la
//     media.
//   · Mantener el dedo apoyado no sirve de nada: solo cuenta un toque nuevo
//     (`pointerdown`), así que un dedo quieto encima no reacciona a nada y
//     además va sumando falsos toques.
//   · Si se sale a mitad, o si la app se va a segundo plano (pantalla apagada,
//     otra app), el test se descarta: no se guarda nada a medias.

import * as estado from '../estado.js';
import { formatearNumero } from '../calculos.js';
import {
  ANTICIPACION_PVT_MS, DIA_FIN_BASE, MODOS_PVT, MODO_PVT_POR_DEFECTO,
  TESTS_MEDIA_MOVIL, TESTS_MINIMOS_BASE, apuntarPVT, baseDePVT, calcularSueno, compararConBase, datosModoPVT, entradaDe,
  faltaPvtHoy, horaAvisoPvt, mediaMovilPVT, velocidadDeTiempos,
} from '../diario.js';
import { anadir, aviso, ayuda, confirmar, fechaCorta, h, hoyISO, modal } from '../ui.js';

const RESULTADO_MS = 500;
const FALSO_MS = 700;
// Lo que añade tocar una pantalla táctil frente a pulsar un botón de verdad
// (Arsintescu 2017): por eso los números solo valen frente a los tuyos.
const RETRASO_TACTIL_MS = 68;

// Los estilos van en línea y no en `estilo.css` porque ese archivo lo lleva
// otra tanda de cambios (reparto del 26-10-2026). Los colores son los tokens
// del cartel, que en los ocho temas de la app son fondo oscuro con texto
// claro: así la pantalla sale oscura sin inventarse ningún color.
const CAPA = `position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px; padding: 56px 16px 22px; box-sizing: border-box;
  background: var(--cartel-fondo); color: var(--cartel-texto); text-align: center; overflow-y: auto;
  overscroll-behavior: contain; touch-action: manipulation; user-select: none; -webkit-user-select: none;`;
const CUERPO = 'width: 100%; max-width: 420px; display: flex; flex-direction: column; align-items: center; gap: 12px;';
const ESCENA = `height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; font-variant-numeric: tabular-nums;`;
const CONTADOR = 'font-size: 3.4rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;';
const LINEA = 'margin: 0; opacity: .82; line-height: 1.35;';

// Botones legibles sobre el fondo oscuro: la clase `.boton` da la forma y el
// tamaño, y el color se pone aquí (en el tema claro el acento es casi negro y
// sobre este fondo no se vería).
function claro(texto, onclick, { secundario = false, grande = false, pequeno = false } = {}) {
  const color = secundario
    ? 'background: transparent; color: var(--cartel-texto); border: 1px solid currentColor; box-shadow: none;'
    : 'background: var(--cartel-texto); color: var(--cartel-fondo); box-shadow: none;';
  const medida = pequeno ? 'min-height: 40px; padding: 6px 16px; font-size: .9rem;' : '';
  return h('button', { type: 'button', class: `boton${grande ? ' grande' : ''}`, style: color + medida, onclick }, texto);
}

// Botón que se queda marcado, para elegir la duración (como los
// `.boton-marca` de la app, pero con los colores del fondo oscuro).
function marca(texto, activo, onclick) {
  return h('button', {
    type: 'button', 'aria-pressed': String(activo), onclick,
    style: `flex: 1 1 0; min-height: 46px; padding: 8px 6px; font: inherit; font-weight: 700; cursor: pointer;
      border-radius: 999px; border: 1px solid currentColor; color: ${activo ? 'var(--cartel-fondo)' : 'var(--cartel-texto)'};
      background: ${activo ? 'var(--cartel-texto)' : 'transparent'};`,
  }, texto);
}

// Un «?» que se vea sobre el fondo oscuro (el de `ui.js` usa el color de acento).
function ayudaClara(titulo, texto) {
  const boton = ayuda(titulo, texto);
  boton.style.color = 'var(--cartel-texto)';
  boton.style.borderColor = 'currentColor';
  return boton;
}

const velocidadTexto = (v) => (v > 0 ? formatearNumero(Math.round(v * 100) / 100) : '—');
// El umbral, dicho como lo dice la fuente: el error típico de Thompson 2022 da
// un cambio mínimo detectable de entre el 11 % y el 12 %.
const UMBRAL_TEXTO = '11-12 %';

const POR_QUE_ASI = [
  'No hay baremos publicados de ninguna versión de este test (Taillard 2024, Neurophysiol Clin, PMID 38401239): no existe un «esto es lo normal». La comparación es siempre contigo mismo.',
  `Tocar una pantalla táctil añade unos ${RETRASO_TACTIL_MS} ms frente a pulsar un botón de verdad (Arsintescu 2017). Para que tus números se puedan comparar entre sí, hazlo siempre con el mismo móvil, en la misma postura y con el mismo dedo, y no los compares con los de ningún estudio.`,
  'El dato principal es la velocidad de respuesta: la media de 1 dividido entre cada tiempo de reacción en segundos. Con 7 h en cama la velocidad baja pero los lapsos no suben (Belenky 2003), así que mirando solo los lapsos un recorte de sueño parece gratis cuando no lo es.',
  `Las tres duraciones no se mezclan nunca: en gente descansada el de 3 min y el de 10 ni siquiera se parecen (r = 0,134; Antler 2022). El de 5 min viene marcado porque es el único con un cambio mínimo detectable publicado (Thompson 2022): por debajo de un ${UMBRAL_TEXTO} de diferencia es ruido, no un cambio.`,
  `Por eso la app decide sobre la media de tus últimos ${TESTS_MEDIA_MOVIL} tests, nunca sobre un día suelto. Y tu línea base la forman tus primeros ${TESTS_MINIMOS_BASE} tests, con un plazo de ${DIA_FIN_BASE} días desde el primero para hacerlos.`,
];

// Con `directo: true` el test empieza sin pasar por la pantalla de la
// duración: es el camino que viene del diario, donde la duración ya está
// decidida (la de siempre) y preguntarla otra vez sería un paso de más.
export function abrirPVT({ modo = MODO_PVT_POR_DEFECTO, directo = false, alCerrar } = {}) {
  const capa = h('div', { class: 'pvt-capa', role: 'application', 'aria-label': 'Test de atención', style: CAPA });
  const cuerpo = h('div', { style: CUERPO });
  const barra = h('span', { style: 'display: block; height: 100%; width: 0; background: var(--cartel-texto); opacity: .35; transition: width .4s linear;' });
  const progreso = h('div', { style: 'position: absolute; left: 0; right: 0; bottom: 0; height: 3px;' }, barra);
  const botonSalir = claro('Salir', () => pedirSalir(), { secundario: true, pequeno: true });
  botonSalir.style.position = 'absolute';
  botonSalir.style.top = 'calc(10px + env(safe-area-inset-top))';
  botonSalir.style.right = '12px';
  anadir(capa, botonSalir, cuerpo, progreso);

  // Mientras el test está delante, la página de debajo no se mueve.
  const scrollAntes = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.body.append(capa);

  let elegido = MODOS_PVT[modo] ? modo : MODO_PVT_POR_DEFECTO;
  let fase = 'intro';          // intro | espera | estimulo | resultado | pausa | fin
  let t0 = null;               // cuándo se pintó el contador
  let tPuesto = null;          // cuándo se puso en pantalla (respaldo de t0)
  let inicio = null;           // cuándo empezó el test
  let temporizador = null;     // el siguiente paso (contador o fin de la pausa)
  let temporizadorFalso = null;
  let fotograma = null;        // el contador corriendo
  let reloj = null;            // la barra de abajo
  let wakeLock = null;         // que no se apague la pantalla, si el navegador lo permite
  const rts = [];              // reacciones válidas, en ms
  let sinRespuesta = 0;
  let falsos = 0;

  const escena = h('div', { style: ESCENA });
  const ajustes = () => datosModoPVT(elegido);

  function pintarIntro() {
    fase = 'intro';
    escena.replaceChildren();
    const cual = ajustes();
    cuerpo.replaceChildren(
      h('h1', { style: 'margin: 0; font-size: 1.4rem;' }, 'Test de atención'),
      h('div', { style: 'display: flex; gap: 8px; width: 100%;' },
        Object.entries(MODOS_PVT).map(([clave, m]) => marca(m.etiqueta, clave === elegido, () => { elegido = clave; pintarIntro(); }))),
      h('div', { style: 'display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;' },
        h('span', { style: `${LINEA} font-size: .9rem;` }, elegido === MODO_PVT_POR_DEFECTO
          ? 'El de 5 min es el único que sabe distinguir un cambio de verdad del ruido'
          : 'Los números de cada duración van por su lado: no se mezclan nunca'),
        ayudaClara('Cómo se lee este test', POR_QUE_ASI)),
      h('ul', { style: 'list-style: none; margin: 0; padding: 0; display: grid; gap: 10px;' },
        [
          `Cada ${cual.isiMinMs / 1000} a ${cual.isiMaxMs / 1000} segundos aparece un contador en el centro de la pantalla.`,
          'En cuanto lo veas, toca la pantalla lo antes posible: el contador se para en tu tiempo de reacción.',
          'Si tocas cuando no hay contador, cuenta como falso toque. Dejar el dedo apoyado no vale: cada toque tiene que ser nuevo.',
          `Dura ${cual.minutos} minutos. Un lapso es pasarse de ${cual.lapsoMs} ms.`,
          'Hazlo siempre a la misma hora y con el mismo móvil, antes del té o el café.',
        ].map((t) => h('li', { style: LINEA }, t))),
      claro(`Empezar (${cual.corto})`, empezar, { grande: true }),
    );
  }

  function empezar() {
    inicio = performance.now();
    // Que no se apague la pantalla durante el test, si el navegador lo
    // permite; si no existe o lo deniega, el test va igual.
    try { navigator.wakeLock?.request?.('screen').then((w) => { wakeLock = w; }).catch(() => {}); } catch { /* sin wake lock */ }
    document.addEventListener('visibilitychange', alIrseAlFondo);
    cuerpo.replaceChildren(escena, h('p', { style: `${LINEA} opacity: .5; font-size: .9rem;` }, 'Toca en cuanto salga el número.'));
    reloj = setInterval(pintarProgreso, 500);
    pintarProgreso();
    programarEstimulo();
  }

  function pintarProgreso() {
    barra.style.width = `${Math.min(1, (performance.now() - inicio) / ajustes().duracionMs) * 100}%`;
  }

  const quedaTiempo = () => performance.now() - inicio < ajustes().duracionMs;

  function programarEstimulo() {
    const { duracionMs, isiMinMs, isiMaxMs } = ajustes();
    // Si ya no cabe ni la pausa más corta, el test se ha terminado.
    if (performance.now() - inicio > duracionMs - isiMinMs) { terminar(); return; }
    fase = 'espera';
    t0 = null;
    tPuesto = null;
    escena.replaceChildren(h('div', { style: 'font-size: 2rem; opacity: .22;', 'aria-hidden': 'true' }, '·'));
    temporizador = setTimeout(mostrarEstimulo, isiMinMs + Math.random() * (isiMaxMs - isiMinMs));
  }

  function mostrarEstimulo() {
    if (!quedaTiempo()) { terminar(); return; }
    fase = 'estimulo';
    t0 = null;
    const numero = h('div', { style: CONTADOR, role: 'timer' }, '0');
    escena.replaceChildren(numero);
    tPuesto = performance.now();
    // El cronómetro arranca cuando el contador ya está pintado: el primer
    // `requestAnimationFrame` entra antes de pintar; el segundo, ya después.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (fase !== 'estimulo') return;
      t0 = performance.now();
      const correr = () => {
        if (fase !== 'estimulo') return;
        numero.textContent = String(Math.round(performance.now() - t0));
        fotograma = requestAnimationFrame(correr);
      };
      correr();
    }));
    temporizador = setTimeout(() => {
      // Se pasó la espera máxima sin tocar: lapso, y no entra en la media.
      sinRespuesta += 1;
      detenerContador();
      fase = 'resultado';
      escena.replaceChildren(h('div', { style: CONTADOR }, '—'), h('p', { style: `${LINEA} opacity: .6;` }, 'Sin respuesta'));
      temporizador = setTimeout(seguir, RESULTADO_MS);
    }, ajustes().esperaMaxMs);
  }

  function detenerContador() {
    clearTimeout(temporizador);
    temporizador = null;
    if (fotograma) cancelAnimationFrame(fotograma);
    fotograma = null;
  }

  function seguir() {
    if (quedaTiempo()) programarEstimulo();
    else terminar();
  }

  function responder(ms) {
    detenerContador();
    fase = 'resultado';
    if (ms < ANTICIPACION_PVT_MS) {
      // Antes de 100 ms nadie reacciona: es haber tocado adelantándose.
      falsos += 1;
      escena.replaceChildren(h('div', { style: 'font-size: 1.5rem; font-weight: 800; color: var(--peligro);' }, 'Demasiado pronto'));
      temporizador = setTimeout(seguir, FALSO_MS);
      return;
    }
    rts.push(ms);
    escena.replaceChildren(h('div', { style: CONTADOR }, String(Math.round(ms))), h('p', { style: `${LINEA} opacity: .5;` }, 'ms'));
    temporizador = setTimeout(seguir, RESULTADO_MS);
  }

  function falsoToque() {
    falsos += 1;
    // El aviso va aparte del contador: así no borra el tiempo que acabas de ver.
    clearTimeout(temporizadorFalso);
    const linea = h('p', { style: `${LINEA} color: var(--peligro); font-weight: 700;` }, 'Espera a que salga el número');
    escena.append(linea);
    temporizadorFalso = setTimeout(() => linea.remove(), FALSO_MS);
  }

  function reaccionar() {
    // `tPuesto` es el respaldo: si el navegador aún no ha pintado (pantallas
    // lentas), el toque cuenta igual, midiendo desde que se puso.
    const desde = t0 ?? tPuesto;
    if (fase === 'estimulo' && desde != null) responder(performance.now() - desde);
    else if (['espera', 'estimulo', 'resultado'].includes(fase)) falsoToque();
  }

  // Un toque: con el dedo o con el ratón, los dos pasan por `pointerdown`.
  capa.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('button')) return;         // los botones hacen lo suyo
    ev.preventDefault();
    reaccionar();
  });
  // En el ordenador también vale la barra espaciadora. `ev.repeat` deja fuera
  // la tecla mantenida, igual que el dedo apoyado.
  const alTeclear = (ev) => {
    if (fase === 'intro' || fase === 'fin' || ev.repeat) return;
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    if (ev.target.closest?.('button')) return;
    ev.preventDefault();
    reaccionar();
  };
  document.addEventListener('keydown', alTeclear);

  function pararTodo() {
    detenerContador();
    clearTimeout(temporizadorFalso);
    clearInterval(reloj);
    reloj = null;
    document.removeEventListener('visibilitychange', alIrseAlFondo);
    document.removeEventListener('keydown', alTeclear);
    try { wakeLock?.release?.()?.catch?.(() => {}); } catch { /* ya liberado */ }
    wakeLock = null;
  }

  function cerrar() {
    pararTodo();
    document.documentElement.style.overflow = scrollAntes;
    capa.remove();
    alCerrar?.();
  }

  async function pedirSalir() {
    if (fase === 'intro' || fase === 'fin') { cerrar(); return; }
    fase = 'pausa';
    detenerContador();
    const desde = performance.now();
    const si = await confirmar('¿Dejar el test? No se guarda nada de lo hecho.', { si: 'Dejarlo', no: 'Seguir' });
    if (si) { cerrar(); return; }
    if (fase !== 'pausa') return;   // mientras tanto se interrumpió por otra cosa
    // Seguir: lo que ha durado el cartel no cuenta (el test dura sus minutos
    // enteros) y se vuelve a programar el siguiente contador, porque el que
    // estaba en marcha ya daría un tiempo falseado.
    inicio += performance.now() - desde;
    programarEstimulo();
  }

  // Si la app se va al fondo, los temporizadores del navegador se frenan y los
  // tiempos dejan de valer: el test se descarta entero.
  function alIrseAlFondo() {
    if (document.visibilityState !== 'hidden' || fase === 'fin') return;
    pararTodo();
    fase = 'fin';
    escena.replaceChildren();
    cuerpo.replaceChildren(
      h('h1', { style: 'margin: 0; font-size: 1.3rem;' }, 'Test interrumpido'),
      h('p', { style: LINEA }, 'La app se ha ido a segundo plano y los tiempos ya no valen. No se ha guardado nada.'),
      claro('Cerrar', cerrar, { grande: true }));
  }

  function terminar() {
    pararTodo();
    fase = 'fin';
    barra.style.width = '100%';
    const velocidad = velocidadDeTiempos(rts);
    const test = {
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      modo: elegido,
      velocidad: velocidad == null ? null : Math.round(velocidad * 1000) / 1000,
      mediaMs: rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null,
      lapsos: rts.filter((x) => x >= ajustes().lapsoMs).length + sinRespuesta,
      falsos,
    };
    const fecha = hoyISO();
    // Con `tecleo: true` la pantalla de debajo no se repinta mientras el test
    // está delante; al cerrar se refresca con `alCerrar`.
    estado.cambiar((x) => apuntarPVT(x, fecha, test), { tecleo: true });
    pintarResultados({ ...test, fecha });
  }

  function pintarResultados(test) {
    escena.replaceChildren();
    const d = estado.datos();
    const cual = datosModoPVT(test.modo);
    const movil = mediaMovilPVT(d, test.modo);
    const base = baseDePVT(d, test.modo);
    const frente = compararConBase(movil?.velocidad, base);
    // Con `anadir` y no con `replaceChildren`: aquí hay hijos condicionales y
    // el navegador escribiría «false» tal cual (ya pasó una vez).
    cuerpo.replaceChildren();
    anadir(cuerpo,
      h('h1', { style: 'margin: 0; font-size: 1.4rem;' }, 'Resultados'),
      h('p', { style: `${LINEA} font-size: .9rem; opacity: .7;` }, `Test de ${cual.corto}`),
      // El dato principal, grande: la velocidad de respuesta.
      h('div', { style: 'display: flex; flex-direction: column; align-items: center; gap: 2px;' },
        h('strong', { style: 'font-size: 3rem; line-height: 1; font-variant-numeric: tabular-nums;' }, velocidadTexto(test.velocidad)),
        h('span', { style: `${LINEA} font-size: .9rem;` }, 'respuestas por segundo (velocidad)')),
      h('div', { style: 'display: grid; gap: 8px; width: 100%;' },
        cifra('Tiempo de reacción medio', test.mediaMs == null ? '—' : `${test.mediaMs} ms`),
        cifra('Lapsos', String(test.lapsos)),
        cifra('Falsos toques', String(test.falsos))),
      movil && movil.tests > 1 && h('p', { style: `${LINEA} font-size: .95rem;` },
        `Media de tus últimos ${movil.tests} tests de ${cual.corto}: `,
        h('strong', {}, `${velocidadTexto(movil.velocidad)} resp/s`),
        movil.mediaMs ? ` (${Math.round(movil.mediaMs)} ms)` : ''),
      h('p', { style: `${LINEA} font-size: .95rem;` }, lineaBase(frente, base, cual)),
      h('div', { style: 'display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;' },
        h('span', { style: `${LINEA} font-size: .85rem; opacity: .75;` }, 'No hay baremos publicados: te comparas contigo'),
        ayudaClara('Cómo se lee este test', POR_QUE_ASI)),
      h('p', { style: `${LINEA} font-size: .85rem; opacity: .7;` }, `Guardado en el diario de hoy, a las ${test.hora}.`),
      claro('Cerrar', cerrar, { grande: true }));
  }

  // La línea del veredicto: siempre sobre la media de los últimos tests, nunca
  // sobre el día suelto, y sin alarmas.
  function lineaBase(frente, base, cual) {
    if (!frente) {
      if (base?.falta === 'tests' && base.desde) {
        const faltan = TESTS_MINIMOS_BASE - base.tests;
        const cuantos = faltan === 1 ? 'el que falta' : `los ${faltan} que faltan`;
        return `Todavía no tienes línea base: hacen falta ${TESTS_MINIMOS_BASE} tests y llevas ${base.tests}. Tienes hasta el ${fechaCorta(base.hasta)} para hacer ${cuantos}, y no hace falta uno cada día.`;
      }
      return `Aún no hay línea base: se hace con los primeros ${TESTS_MINIMOS_BASE} tests de ${cual.corto} que hagas.`;
    }
    const pct = Math.round(Math.abs(frente.cambio) * 100);
    const base5 = `tu base de ${cual.corto} son ${velocidadTexto(frente.base.velocidad)} resp/s (${frente.base.dias} días)`;
    if (!frente.real) return `Dentro de tu variación normal: ${pct} % frente a tu base, por debajo del ${UMBRAL_TEXTO} de margen que haría falta para llamarlo cambio. Para el dato, ${base5}.`;
    return frente.masLento
      ? `Más lento que tu base: un ${pct} % por debajo, que ya pasa del ${UMBRAL_TEXTO} de margen. Es un dato, no una alarma: ${base5}.`
      : `Más rápido que tu base: un ${pct} % por encima, que ya pasa del ${UMBRAL_TEXTO} de margen. Para el dato, ${base5}.`;
  }

  function cifra(nombre, valor) {
    return h('div', { style: 'display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding-bottom: 6px; border-bottom: 1px solid color-mix(in srgb, currentColor 22%, transparent);' },
      h('span', { style: 'font-size: .9rem; text-align: left; opacity: .85;' }, nombre),
      h('strong', { style: 'font-size: 1.2rem; font-variant-numeric: tabular-nums; white-space: nowrap;' }, valor));
  }

  if (directo) empezar(); else pintarIntro();
  return cerrar;
}

// ---------------------------------------------------------------------------
// El test justo después del diario (la rutina de la mañana)
// ---------------------------------------------------------------------------
//
// Dan, 26-10-2026: «molaría que inicie el contador al llenar mi diario de
// sueño para hacer el test». Son las dos cosas de la mañana, encadenadas:
// apunta la noche y se encuentra el test delante sin buscarlo.
//
// Nunca de golpe, y esto no es un detalle: el test mide tiempos de reacción,
// así que pillarle desprevenido con el móvil en la mano estropea la medida y
// deja un dato malo en el historial. Por eso sale un cartel que dice lo que
// toca, cuenta hasta cinco a la vista y arranca solo al llegar a cero. Se
// cancela con «Ahora no», con la X o tocando fuera, y si lo deja no se
// insiste más: queda la tarjeta de siempre de «hoy no lo has hecho».
//
// Una vez al día y se acabó. El día en que se ofreció se guarda en este
// aparato (localStorage) y no en los datos de la cuenta: es una decisión del
// momento, no historial, y así no cambia la forma del archivo.
export const CUENTA_ATRAS_PVT_S = 5;
const CLAVE_OFRECIDO = 'entreno-pvt-ofrecido';
let ofrecidoEnSesion = null;   // respaldo si el navegador no deja guardar

function ofrecidoHoy(hoy) {
  if (ofrecidoEnSesion === hoy) return true;
  try { return localStorage.getItem(CLAVE_OFRECIDO) === hoy; } catch { return false; }
}

function apuntarOfrecido(hoy) {
  ofrecidoEnSesion = hoy;
  try { localStorage.setItem(CLAVE_OFRECIDO, hoy); } catch { /* sin localStorage: queda el de esta sesión */ }
}

// Saca el cartel si toca: el diario de hoy tiene las horas de la noche (las
// que hacen falta para calcular el sueño), hoy no hay ningún test hecho y hoy
// no se ha ofrecido ya. Devuelve si ha salido.
export function ofrecerPvtTrasDiario({ alCerrar } = {}) {
  const hoy = hoyISO();
  const d = estado.datos();
  if (!calcularSueno(entradaDe(d ?? {}, hoy) ?? {})) return false;
  if (!faltaPvtHoy(d, hoy) || ofrecidoHoy(hoy)) return false;
  // Si ya hay otro cartel o el propio test delante, ni se ofrece ni se gasta
  // el turno del día: se volverá a mirar la próxima vez.
  if (document.querySelector('.modal-fondo, .pvt-capa')) return false;
  apuntarOfrecido(hoy);

  const cual = datosModoPVT(MODO_PVT_POR_DEFECTO);
  // La cuenta atrás, grande y en su propia línea. Va en línea porque
  // `estilo.css` lo lleva otra tanda de cambios (reparto del 26-10-2026).
  // Sin `aria-live`: un número que cambia cada segundo lo cantaría cinco
  // veces seguidas. El lector de pantalla lee la línea de abajo, que dice lo
  // mismo con palabras.
  const cuenta = h('p', { style: 'margin: 14px 0 0; font-size: 1.7rem; font-weight: 800; font-variant-numeric: tabular-nums;' },
    `Empieza en ${CUENTA_ATRAS_PVT_S}…`);
  const fin = Date.now() + CUENTA_ATRAS_PVT_S * 1000;
  let reloj = null;
  const parar = () => { clearInterval(reloj); reloj = null; };
  const lanzar = () => { parar(); cerrar(); abrirPVT({ directo: true, alCerrar }); };

  const cerrar = modal('Te toca el test de atención', h('div', { style: 'text-align: center' },
    h('p', { class: 'nota' }, avisoPvtActivo()
      ? 'Es el test de hoy, el mismo del aviso de la mañana.'
      : 'Es el test de hoy. Va justo después del diario, antes del té o el café.'),
    h('p', {}, `Son ${cual.minutos} minutos. Toca la pantalla en cuanto veas el número.`),
    cuenta,
    h('p', { class: 'nota' }, 'Empieza solo al llegar a cero. Si no te viene bien, «Ahora no» o toca fuera del cartel.'),
    h('button', { type: 'button', class: 'boton grande', onclick: lanzar }, `Empezar ya (${cual.corto})`),
    // A todo el ancho, debajo del grande: los dos botones del cartel se tocan
    // igual de fácil y no compiten por el sitio a 375 px.
    h('button', { type: 'button', class: 'boton secundario', style: 'width: 100%', onclick: () => { parar(); cerrar(); } }, 'Ahora no')));

  reloj = setInterval(() => {
    // Cerrado con la X o tocando fuera: `modal` no avisa de eso, pero el
    // cartel ya no está en la página. Se mira antes de lanzar nada.
    if (!cuenta.isConnected) { parar(); return; }
    const quedan = Math.ceil((fin - Date.now()) / 1000);
    if (quedan <= 0) { lanzar(); return; }
    cuenta.textContent = `Empieza en ${quedan}…`;
  }, 200);
  return true;
}

// ---------------------------------------------------------------------------
// Recordatorio de la mañana
// ---------------------------------------------------------------------------
//
// Lo que una página web puede y lo que no: con la app abierta, el aviso se
// programa aquí y suena a su hora. Con el navegador cerrado, una web no se
// despierta sola de forma fiable; si el navegador admite el registro
// periódico del service worker (Chrome, con la app instalada), se apunta y
// podrá avisar con la app cerrada, y si no, no pasa nada. Lo que no falla
// nunca es la tarjeta de «hoy no lo has hecho» en Hoy y en el Diario, así que
// los textos prometen eso y no más.
//
// El permiso es de cada móvil y el ajuste viaja con la cuenta, igual que en
// los avisos del descanso (`vistas/descanso.js`).

export const puedeAvisarPvt = () => 'Notification' in window && 'serviceWorker' in navigator;
export const avisoPvtActivo = () => puedeAvisarPvt() && Notification.permission === 'granted'
  && estado.datos()?.perfil?.avisarPvt === true;
export const faltaPermisoPvt = () => puedeAvisarPvt() && estado.datos()?.perfil?.avisarPvt === true
  && Notification.permission !== 'granted';

let temporizadorManana = null;
let avisadoEn = null;   // el día que ya se avisó en esta sesión de la app

// Pide el permiso (hay que llamarlo desde un toque) y deja el aviso puesto.
export async function activarAvisoPvt() {
  if (!puedeAvisarPvt()) { aviso('Este navegador no admite notificaciones.', { tipo: 'error' }); return false; }
  const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permiso !== 'granted') {
    aviso(permiso === 'denied'
      ? 'Los avisos de esta página están bloqueados. Se cambia en los ajustes del navegador (el candado junto a la dirección).'
      : 'No ha habido permiso para avisar. Mientras, el Diario y Hoy te lo recuerdan al abrir la app.', { tipo: 'error' });
    return false;
  }
  estado.cambiar((x) => { x.perfil.avisarPvt = true; });
  const hora = horaAvisoPvt(estado.datos());
  aviso(hora ? `Te avisaré a las ${hora} si no has hecho el test.` : 'Aviso activado. Pon la hora de levantarte en Ajustes → Perfil para que sepa a qué hora avisarte.');
  programarAvisoPvt();
  return true;
}

export function quitarAvisoPvt() {
  estado.cambiar((x) => { x.perfil.avisarPvt = false; });
  clearTimeout(temporizadorManana);
  temporizadorManana = null;
}

// Se llama al pintar Hoy y el Diario: si el aviso está activado, hay hora y
// hoy falta el test, se programa para esa hora. No molesta si ya pasó.
export function programarAvisoPvt() {
  clearTimeout(temporizadorManana);
  temporizadorManana = null;
  if (!avisoPvtActivo()) return;
  registrarAvisoPeriodico();
  const d = estado.datos();
  const hora = horaAvisoPvt(d);
  const hoy = hoyISO();
  if (!hora || avisadoEn === hoy || !faltaPvtHoy(d, hoy)) return;
  const [hh, mm] = hora.split(':').map(Number);
  const cuando = new Date();
  cuando.setHours(hh, mm, 0, 0);
  const falta = cuando.getTime() - Date.now();
  if (falta <= 0) return;   // la hora ya pasó: de eso se encarga la tarjeta
  temporizadorManana = setTimeout(() => {
    avisadoEn = hoyISO();
    if (faltaPvtHoy(estado.datos(), avisadoEn)) notificarPvt();
  }, falta);
}

// Si el navegador lo admite, una tarea periódica para poder avisar con la app
// cerrada. Hace falta además que `sw.js` escuche `periodicsync` (eso lo publica
// la otra sesión); mientras no lo haga, esto no hace nada y tampoco molesta.
async function registrarAvisoPeriodico() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg?.periodicSync) return;
    const permiso = await navigator.permissions?.query?.({ name: 'periodic-background-sync' });
    if (permiso && permiso.state !== 'granted') return;
    const tags = await reg.periodicSync.getTags();
    if (!tags.includes('pvt-manana')) await reg.periodicSync.register('pvt-manana', { minInterval: 20 * 60 * 60 * 1000 });
  } catch { /* el navegador no lo admite: queda la tarjeta de la app */ }
}

async function notificarPvt() {
  if (!avisoPvtActivo()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    for (const n of await reg.getNotifications({ tag: 'pvt' })) n.close();
    await reg.showNotification('Test de atención', {
      body: 'Hoy aún no lo has hecho. Son 5 minutos, antes del té o el café.',
      tag: 'pvt', renotify: true, icon: './iconos/icono-v2-192.png', badge: './iconos/icono-v2-192.png',
      vibrate: [400, 200, 400], data: { url: `${location.origin}${location.pathname}#/diario` },
    });
  } catch { /* sin service worker: queda la tarjeta de la app */ }
}
