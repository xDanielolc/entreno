// Pantalla «Diario» (#/diario): el peso y el sueño de cada día, la sensación
// al levantarte y, debajo, el resumen de los últimos 7 días con datos (medias,
// jet lag social, regularidad y tus repeticiones en los básicos). La sensación
// se guarda como dato, pero no decide nada sola.
//
// De aquí salen también las dos tarjetas de Inicio: la hora de acostarse de
// esta semana (`tarjetaHoraAcostarse`) y el recordatorio del test de atención
// (`tarjetaPvtPendiente`). El test en sí está en `vistas/pvt.js` y el cribado
// del sueño, que se hace una vez, en `vistas/cribado.js`.
import * as estado from '../estado.js';
import { formatearNumero } from '../calculos.js';
import { apuntarPeso, quitarPeso } from '../peso.js';
import {
  ADELANTO_SEMANAL_MIN, ALCOHOL, MODOS_PVT, MODO_PVT_POR_DEFECTO, NECESIDAD_SUENO_POR_DEFECTO, SENSACIONES, SUENO_MINIMO_H,
  apuntarEnDiario, calcularSueno, datosModoPVT, entradaDe, faltaPvtHoy, horaAcostarse, horaAvisoPvt, modoPVT, pvtDelDia,
  resumenUltimos7, testsPVT, textoHoras,
} from '../diario.js';
import { colores, graficaLineas } from './graficas.js';
import { abrirPVT, activarAvisoPvt, avisoPvtActivo, faltaPermisoPvt, ofrecerPvtTrasDiario, programarAvisoPvt, puedeAvisarPvt } from './pvt.js';
import { tarjetaCribado } from './cribado.js';
import { abrirHistoricoPVT, modosConTests } from './historico-pvt.js';
import { anadir, aviso, ayuda, fechaCorta, h, hoyISO, leerNumero } from '../ui.js';

// El día que se edita arriba (por defecto, hoy). Se elige tocando una fila.
let diaElegido = null;

// El cartel del test se ofrece al llegar a esta pantalla, no en cada
// repintado: la vista se repinta al tocar una estrella, al cambiar de día o
// al guardar, y un cartel saltando mientras escribes sería insufrible.
let acabaDeLlegar = true;
window.addEventListener('hashchange', () => { acabaDeLlegar = true; });

// `titulo-con-ayuda` es una fila flexible: para centrar el título con su «?»
// hace falta esto. Va en línea porque `estilo.css` lo lleva otra tanda.
const CENTRAR = 'justify-content: center';

export function vistaDiario(contenedor) {
  const d = estado.datos();
  const hoy = hoyISO();
  // Con la app abierta, el aviso de la mañana se programa aquí (y en Hoy).
  programarAvisoPvt();
  const fecha = diaElegido ?? hoy;
  const e = entradaDe(d, fecha) ?? {};
  const peso = (d.perfil.pesos ?? []).find((p) => p.fecha === fecha)?.kg ?? null;
  const necesidad = d.perfil.necesidadSuenoH ?? NECESIDAD_SUENO_POR_DEFECTO;

  // Cada casilla se guarda al momento (sin repintar mientras escribes).
  const guardar = (campo, valor, { repintar = false } = {}) => {
    estado.cambiar((x) => apuntarEnDiario(x, fecha, campo, valor), { tecleo: !repintar });
    pintarCalculo();
  };
  const numero = (campo, etiqueta, unidad, extra = {}) => h('label', { class: 'campo' },
    h('span', { class: 'etiqueta-campo' }, etiqueta),
    h('span', { class: 'con-unidad' },
      h('input', { type: 'text', inputmode: 'numeric', id: `diario-${campo}`, value: e[campo] ?? '', ...extra,
        oninput: (ev) => guardar(campo, leerNumero(ev.target.value)) }),
      h('small', { class: 'suave' }, unidad)));
  const hora = (campo, etiqueta) => h('label', { class: 'campo' },
    h('span', { class: 'etiqueta-campo' }, etiqueta),
    h('input', { type: 'time', id: `diario-${campo}`, value: e[campo] ?? '', oninput: (ev) => guardar(campo, ev.target.value || null) }));

  const calculo = h('p', { class: 'calculo-sueno' });
  function pintarCalculo() {
    const x = calcularSueno(entradaDe(estado.datos(), fecha) ?? {});
    calculo.replaceChildren(...(x ? [
      h('span', {}, 'En cama ', h('strong', {}, textoHoras(x.enCama))),
      h('span', {}, 'Sueño real ', h('strong', {}, textoHoras(x.real))),
      h('span', { class: x.eficiencia >= 0.85 ? 'bien' : 'aviso' }, 'Eficiencia ', h('strong', {}, `${Math.round(x.eficiencia * 100)} %`)),
    ] : [h('span', { class: 'suave' }, 'Pon a qué hora apagaste la luz y a qué hora te levantaste.')]));
  }
  pintarCalculo();

  const pesoCaja = h('input', { type: 'text', inputmode: 'decimal', id: 'diario-peso', value: peso != null ? String(peso).replace('.', ',') : '',
    onchange: (ev) => {
      const kg = leerNumero(ev.target.value);
      estado.cambiar((x) => { if (kg > 20 && kg < 400) apuntarPeso(x, kg, fecha); else if (kg == null) quitarPeso(x, fecha); }, { tecleo: true });
    } });

  const fila = (...hijos) => h('div', { class: 'fila-campos' }, ...hijos);

  // Días pasados (Dan: «ayer se me olvidó pero lo recuerdo perfectamente»): flechas de día en día,
  // calendario para saltar a cualquier fecha y «Ayer» de un toque. No se puede ir más allá de hoy.
  const irA = (iso) => { diaElegido = !iso || iso >= hoy ? null : iso; estado.emitir('vista'); };
  const ayer = desplazarDia(hoy, -1);
  const tituloDia = fecha === hoy ? 'Hoy' : fecha === ayer ? `Ayer, ${fechaCorta(fecha)}` : fechaCorta(fecha);

  anadir(contenedor,
    // Sin título: la pestaña de abajo ya lo dice (Dan, 27-10-2026).
    h('section', { class: 'tarjeta diario-peso' },
      h('div', { class: 'cabecera-tarjeta' }, h('h2', { class: 'crece' }, tituloDia)),
      h('div', { class: 'diario-navegar' },
        h('button', { type: 'button', class: 'boton secundario', 'aria-label': 'Día anterior', onclick: () => irA(desplazarDia(fecha, -1)) }, '‹'),
        h('input', { type: 'date', class: 'diario-fecha', 'aria-label': 'Elegir el día', value: fecha, max: hoy,
          onchange: (ev) => irA(ev.target.value) }),
        h('button', { type: 'button', class: 'boton secundario', 'aria-label': 'Día siguiente', disabled: fecha === hoy,
          onclick: () => irA(desplazarDia(fecha, 1)) }, '›')),
      h('div', { class: 'fila-botones diario-atajos' },
        fecha !== ayer && h('button', { type: 'button', class: 'boton secundario', onclick: () => irA(ayer) }, 'Apuntar ayer'),
        fecha !== hoy && h('button', { type: 'button', class: 'boton secundario', onclick: () => irA(null) }, 'Volver a hoy')),
      h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Peso'), h('span', { class: 'con-unidad' }, pesoCaja, h('small', { class: 'suave' }, 'kg')))),
    h('section', { class: 'tarjeta diario-dia' },
      h('h2', {}, 'Esta noche'),
      h('p', { class: 'nota' }, 'Apúntalo cada mañana, al levantarte. Se guarda solo según escribes.'),
      fila(hora('luzApagada', 'Apagaste la luz'), hora('levantado', 'Te levantaste')),
      fila(numero('latenciaMin', 'Hasta dormirte', 'min'), numero('despiertoMin', 'Despierto de noche', 'min'), numero('remoloneoMin', 'Remoloneando', 'min')),
      calculo,

      h('div', { class: 'titulo-con-ayuda' }, h('span', { class: 'etiqueta-campo' }, 'Cómo te levantaste'),
        ayuda('Cómo te levantaste', 'Es un dato, no un criterio: la sensación de cansancio se acostumbra a dormir poco mientras el rendimiento sigue cayendo (Van Dongen 2003). Por eso la app la apunta, pero no decide nada solo con ella.')),
      h('div', { class: 'estrellas', role: 'radiogroup', 'aria-label': 'Cómo te levantaste, de 1 a 5' },
        [1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(e.sensacion === n),
          class: `estrella${(e.sensacion ?? 0) >= n ? ' activa' : ''}`, 'aria-label': `${n}: ${SENSACIONES[n]}`, title: SENSACIONES[n],
          onclick: () => guardar('sensacion', e.sensacion === n ? null : n, { repintar: true }) }, '★'))),
      e.sensacion && h('p', { class: 'nota centrado' }, SENSACIONES[e.sensacion]),

      h('span', { class: 'etiqueta-campo' }, 'Alcohol ayer'),
      h('div', { class: 'fila-marcas compacta' }, Object.entries(ALCOHOL).map(([k, t]) => h('button', { type: 'button',
        class: `boton-marca${e.alcohol === k ? ' activo' : ''}`, 'aria-pressed': String(e.alcohol === k),
        onclick: () => guardar('alcohol', e.alcohol === k ? null : k, { repintar: true }) }, t))),
      fila(hora('cafeinaHora', 'Último café o té'), numero('pulsoNocturno', 'Pulso nocturno', 'lpm'), numero('siestaMin', 'Siesta', 'min')),
      h('p', { class: 'nota' }, 'Lo del reloj, a mano y solo esto: horas, pulso medio de la noche. Sus fases y puntuaciones no son fiables.'),
      // Se guarda solo, pero un botón da tranquilidad: confirma y lleva a la tabla.
      h('button', { type: 'button', class: 'boton grande', onclick: () => {
        document.activeElement?.blur?.();
        // Es el momento de «ya he acabado de rellenarlo»: si con esto el
        // diario de hoy queda lleno, aquí sale el cartel del test, y entonces
        // es él quien confirma (el aviso de abajo quedaría detrás del cartel).
        if (fecha === hoy && ofrecerPvtTrasDiario({ alCerrar: () => estado.emitir('vista') })) return;
        aviso(entradaDe(estado.datos(), fecha) ? `Guardado: ${fecha === hoy ? 'hoy' : fechaCorta(fecha)}.` : 'No hay nada que guardar todavía.');
        document.querySelector('.tabla-diario')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } }, 'Guardar el día')),

    tarjetaPVT(d, fecha, hoy),
    tarjetaCribado(d),
    tablaDias(d, fecha),
    resumen(d, hoy),
    graficas(d, necesidad),
    // Dentro de su tarjeta, como lo demás (suelta al final parecía olvidada).
    h('section', { class: 'tarjeta' }, h('label', { class: 'campo necesidad-sueno' },
      h('span', { class: 'etiqueta-campo' }, 'Lo que necesitas dormir (horas)'),
      h('input', { type: 'text', inputmode: 'decimal', id: 'diario-necesidad', value: String(necesidad).replace('.', ','),
        onchange: (ev) => {
          const v = leerNumero(ev.target.value);
          if (v >= 4 && v <= 12) estado.cambiar((x) => { x.perfil.necesidadSuenoH = v; });
        } }),
      h('small', { class: 'nota' }, (d.diario ?? []).filter((x) => calcularSueno(x)).length >= 2
        ? 'Por defecto 8,5. Es la línea discontinua de la gráfica del sueño.' : 'Por defecto 8,5.'))));

  // Si el diario de hoy ya está lleno y el test de hoy sigue sin hacer, el
  // cartel del test (con su cuenta atrás) sale al llegar aquí. Solo una vez
  // al día: de eso se encarga `ofrecerPvtTrasDiario`.
  if (acabaDeLlegar) {
    acabaDeLlegar = false;
    ofrecerPvtTrasDiario({ alCerrar: () => estado.emitir('vista') });
  }
}

// «2026-10-23» más o menos n días (a mediodía, para que el cambio de hora no salte un día).
function desplazarDia(iso, n) {
  const t = new Date(`${iso}T12:00:00`);
  t.setDate(t.getDate() + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// Los últimos 14 días con algo apuntado; tocar uno lo abre arriba.
function tablaDias(d, elegida) {
  const pesos = new Map((d.perfil.pesos ?? []).map((p) => [p.fecha, p.kg]));
  const fechas = [...new Set([...(d.diario ?? []).map((x) => x.fecha), ...pesos.keys()])].sort().reverse().slice(0, 14);
  if (!fechas.length) return h('p', { class: 'nota centrado' }, 'Aquí saldrán tus días en cuanto apuntes el primero.');
  return h('section', { class: 'tarjeta' },
    h('h2', {}, 'Últimos días'),
    h('div', { class: 'tabla-desliza' }, h('table', { class: 'tabla-diario' },
      h('thead', {}, h('tr', {}, ['Día', 'Sueño', 'Efic.', 'Sensación', 'Peso'].map((t) => h('th', {}, t)))),
      h('tbody', {}, fechas.map((f) => {
        const e = entradaDe(d, f) ?? {};
        const s = calcularSueno(e);
        return h('tr', { class: f === elegida ? 'elegida' : '', tabindex: '0', role: 'button', 'aria-label': `Editar el ${fechaCorta(f)}`,
          onclick: () => { diaElegido = f; window.scrollTo(0, 0); estado.emitir('vista'); },
          onkeydown: (ev) => { if (ev.key === 'Enter') { diaElegido = f; estado.emitir('vista'); } } },
        h('td', {}, fechaCorta(f).slice(0, 5)),
        h('td', {}, s ? textoHoras(s.real) : '—'),
        h('td', {}, s ? `${Math.round(s.eficiencia * 100)} %` : '—'),
        h('td', {}, e.sensacion ? '★'.repeat(e.sensacion) : '—'),
        h('td', {}, pesos.has(f) ? formatearNumero(pesos.get(f)) : '—'));
      })))));
}

// ---------------------------------------------------------------------------
// Test de atención (PVT)
// ---------------------------------------------------------------------------

const AYUDA_PVT = [
  'Sale un contador en el centro de la pantalla en momentos al azar y tocas lo antes posible. Mide lo despierto que estás de verdad, que es otra cosa que lo despierto que te sientes: la sensación se acostumbra a dormir poco mientras el rendimiento sigue cayendo (Van Dongen 2003).',
  'El dato principal es la velocidad de respuesta (respuestas por segundo: la media de 1 dividido entre cada tiempo de reacción). Los lapsos, que son las reacciones tan lentas que cuentan como despiste, se apuntan pero sirven de poco en alguien descansado: con 7 h en cama la velocidad baja y los lapsos no suben (Belenky 2003), así que mirando solo los lapsos un recorte de sueño parece gratis cuando no lo es.',
  'Tres duraciones: 3, 5 y 10 minutos. Viene marcada la de 5 porque es la única con un cambio mínimo detectable publicado (Thompson 2022): por debajo de un 11-12 % de diferencia no es un cambio, es ruido. Sus números no se mezclan nunca entre sí: en gente descansada el de 3 min y el de 10 ni siquiera se parecen (r = 0,134; Antler 2022, 83 adultos).',
  'No hay baremos publicados de ninguna versión (Taillard 2024, PMID 38401239): te comparas contigo y con nadie más. Y tocar una pantalla táctil añade unos 68 ms (Arsintescu 2017), así que hazlo siempre con el mismo móvil y en la misma postura, a la misma hora, antes del té o el café.',
  'La app decide sobre la media de tus últimos 7 tests, nunca sobre un día suelto. Y tu línea base la forman tus primeros 5 tests, sin plazo: si acaban repartidos en más de 21 días, la app te lo dice al compararte.',
];

// En el día de hoy: el botón para hacerlo, lo que hayas hecho ya y el aviso de
// la mañana. En un día pasado, solo lo que hubo (el test se hace en directo).
function tarjetaPVT(d, fecha, hoy) {
  const hechos = pvtDelDia(d, fecha);
  const esHoy = fecha === hoy;
  const porDefecto = datosModoPVT(MODO_PVT_POR_DEFECTO);
  return h('section', { class: 'tarjeta' },
    h('div', { class: 'titulo-con-ayuda', style: CENTRAR }, h('h2', {}, 'Test de atención'),
      ayuda('Test de atención', AYUDA_PVT)),
    hechos.length ? tablaPVT(hechos) : h('p', { class: 'nota' }, esHoy
      ? `Hoy todavía no lo has hecho. Son ${porDefecto.minutos} minutos (o 3, o 10: lo eliges al empezar).`
      : 'Ese día no hiciste ninguno.'),
    esHoy
      ? h('button', { type: 'button', class: 'boton grande', onclick: () => abrirPVT({ alCerrar: () => estado.emitir('vista') }) },
        hechos.length ? 'Hacer otro test' : 'Hacer el test')
      : h('p', { class: 'nota' }, 'El test se apunta en el día en que se hace.'),
    modosConTests(d).length
      ? h('button', { type: 'button', class: 'boton secundario', onclick: () => abrirHistoricoPVT() }, 'Ver el histórico')
      : null,
    esHoy && filaAvisoPVT(d));
}

// Velocidad con coma decimal, que es como escribe los números la app.
const velocidadTexto = (v) => (v > 0 ? formatearNumero(Math.round(v * 100) / 100) : '—');

// Los falsos toques no salen aquí (sí en los resultados del test): con seis
// columnas la tabla no cabe en 375 px.
function tablaPVT(hechos) {
  return h('div', { class: 'tabla-desliza' }, h('table', { class: 'tabla-musculos' },
    h('thead', {}, h('tr', {}, ['Hora', 'Dura', 'Velocidad', 'Reacción', 'Lapsos'].map((t) => h('th', {}, t)))),
    h('tbody', {}, hechos.map((t) => h('tr', {},
      h('td', {}, t.hora ?? '—'),
      h('td', {}, datosModoPVT(modoPVT(t)).corto),
      h('td', {}, velocidadTexto(t.velocidad)),
      h('td', {}, t.mediaMs != null ? `${t.mediaMs} ms` : '—'),
      h('td', {}, String(t.lapsos ?? '—')))))));
}

// Activar aquí el aviso de la mañana, que es donde se nombra el test (regla de
// Dan: una opción va donde se nombra). El interruptor completo, con su hora,
// está en Ajustes → Descansos; aquí no se repite para no tener dos mandos de
// lo mismo. Los textos no prometen más de lo que una web puede: con el
// navegador cerrado el aviso puede no llegar, y entonces queda la tarjeta.
function filaAvisoPVT(d) {
  if (!puedeAvisarPvt()) return null;
  const hora = horaAvisoPvt(d);
  if (avisoPvtActivo()) {
    return h('p', { class: 'nota' }, hora
      ? `Te aviso a las ${hora} si no lo has hecho. Se cambia en Ajustes → Descansos.`
      : 'Aviso puesto. Para saber a qué hora, pon la hora de levantarte en Ajustes → Perfil.');
  }
  return h('div', {},
    h('button', { type: 'button', class: 'boton secundario', onclick: () => activarAvisoPvt() },
      faltaPermisoPvt() ? 'Falta el permiso en este aparato: darlo' : 'Avísame por la mañana'),
    h('p', { class: 'nota' }, hora
      ? `Te avisaría a las ${hora}, si no lo has hecho ya.`
      : 'Para saber a qué hora, pon la hora de levantarte en Ajustes → Perfil.'));
}

// La tarjeta de Hoy: lo único que no falla nunca. Solo aparece si ya usas el
// test (si no, el Diario es quien lo propone) y mientras no esté hecho.
export function tarjetaPvtPendiente(d, hoy = hoyISO()) {
  programarAvisoPvt();
  if (!testsPVT(d).length || !faltaPvtHoy(d, hoy)) return null;
  return h('section', { class: 'tarjeta aviso-tarjeta', style: 'text-align: center' },
    h('div', { class: 'antetitulo' }, 'Test de atención'),
    h('p', {}, `Hoy no lo has hecho todavía. Son ${datosModoPVT(MODO_PVT_POR_DEFECTO).minutos} minutos, antes del té o el café.`),
    h('button', { type: 'button', class: 'boton', onclick: () => abrirPVT({ alCerrar: () => estado.emitir('vista') }) }, 'Hacer el test'));
}

// Resumen semanal: los últimos 7 días con datos, un número por línea.
function resumen(d, hoy) {
  const r = resumenUltimos7(d, hoy);
  if (!r.dias) return null;
  const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
  const conSigno = (min) => (min == null ? '—' : `${min > 0 ? '+' : ''}${textoHoras(min)}`);
  const cambio = r.cambioReps == null ? '' : ` (${r.cambioReps >= 0 ? '+' : '−'}${Math.round(Math.abs(r.cambioReps) * 100)} %)`;
  const filas = [
    ['Sueño real (media)', textoHoras(r.real)],
    ['Tiempo en cama', textoHoras(r.enCama)],
    ['Eficiencia', pct(r.eficiencia)],
    ['Pulso nocturno', r.pulso ? `${Math.round(r.pulso)} lpm` : '—'],
    ['Cómo te levantas', r.sensacion ? `${formatearNumero(Math.round(r.sensacion * 10) / 10)} de 5` : '—'],
    ['Jet lag social', conSigno(r.jetLagSocial)],
    ['Se mueve: acostarse', textoHoras(r.variacionAcostarse)],
    ['Se mueve: levantarse', textoHoras(r.variacionLevantarse)],
    ['Reps en básicos', r.reps == null ? '—' : `${r.reps}${cambio}`],
  ];
  // Los tests de atención, cada duración en su línea: un lapso de 3 min no es
  // un lapso de 10 min, así que no se promedian juntos ni se mezclan. Primero
  // la velocidad, que es el dato que se mueve cuando se duerme poco.
  for (const [clave, m] of Object.entries(MODOS_PVT)) {
    const x = r.pvt?.[clave];
    if (!x) continue;
    filas.push([`Velocidad (${m.corto})`, x.velocidad == null ? '—' : `${velocidadTexto(x.velocidad)} resp/s`]);
    filas.push([`Reacción (${m.corto})`, x.mediaMs == null ? '—' : `${Math.round(x.mediaMs)} ms`]);
    filas.push([`Lapsos (${m.corto})`, x.lapsos == null ? '—' : formatearNumero(Math.round(x.lapsos * 10) / 10)]);
  }
  return h('section', { class: 'tarjeta' },
    // Los estilos van en línea: `estilo.css` lo lleva otra tanda de cambios.
    h('div', { class: 'titulo-con-ayuda', style: CENTRAR }, h('h2', {}, 'Resumen semanal'),
      ayuda('Resumen semanal', [
        `Los últimos 7 días que tienes apuntados (ahora ${r.dias}${r.dias === 1 ? ' día' : ' días'}).`,
        'Sueño real: tiempo en cama menos lo que tardas en dormirte, lo que estás despierto y lo que remoloneas. Eficiencia normal: 85 % o más (Ohayon 2004).',
        'Jet lag social: el punto medio del sueño del fin de semana (las noches del viernes y del sábado) menos el de los días laborables. El punto medio es la hora a la que te duermes más la mitad del sueño real. Dormir más de 1 h extra el fin de semana indica deuda de sueño acumulada (Roenneberg 2012).',
        'Se mueve: cuánto bailan la hora de acostarse y la de levantarse en esos 7 días (la más tardía menos la más temprana). Importa más de lo que parece: la regularidad del sueño predice la mortalidad mejor que la duración (Windred 2024, UK Biobank, 60 977 personas con acelerómetro).',
        'Reps en básicos: las repeticiones de tus series de trabajo de press de banca, sentadilla, peso muerto, remo con barra y press militar, y entre paréntesis el cambio frente a los 7 días anteriores. Dormir poco se nota antes en el volumen que aguantas que en tu 1RM (Cook 2012; Knowles 2022).',
        'Test de atención: la velocidad (respuestas por segundo), la reacción media y los lapsos de esos días, con una línea por duración. Las duraciones no se promedian nunca juntas: sus umbrales de lapso son distintos (355 y 500 ms) y en gente descansada el de 3 min y el de 10 ni siquiera se parecen (Antler 2022). La velocidad va primero porque es la que baja al dormir menos, mientras que los lapsos pueden no moverse (Belenky 2003).',
      ])),
    h('table', { class: 'tabla-musculos tabla-semana' },
      h('tbody', {}, filas.map(([t, x]) => h('tr', {}, h('td', {}, t), h('td', {}, x))))),
    h('p', { class: 'nota' }, r.desde === r.hasta
      ? `Un solo día apuntado: ${fechaCorta(r.desde)}.`
      : `Del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}.`));
}

// La tarjeta de Inicio con la hora de acostarse de esta semana y las dos que
// la acompañan. Si faltan los ajustes o no hay noches suficientes, dice qué
// falta; nunca da un número inventado.
export function tarjetaHoraAcostarse(d, hoy = hoyISO()) {
  const p = horaAcostarse(d, hoy);
  if (p.falta === 'ajustes') {
    // Sin los ajustes puestos, la tarjeta solo aparece si ya usas el diario.
    if (!(d.diario ?? []).length) return null;
    const que = p.sinHora && p.sinInicio ? 'la hora a la que quieres levantarte y la fecha de inicio del plan'
      : p.sinHora ? 'la hora a la que quieres levantarte' : 'la fecha de inicio del plan';
    return h('section', { class: 'tarjeta aviso-tarjeta' },
      h('div', { class: 'antetitulo' }, 'Hora de acostarse'),
      h('p', {}, `Para calcularla falta ${que}, en Ajustes → Perfil.`),
      h('a', { class: 'boton', href: '#/ajustes' }, 'Ir a Ajustes'));
  }
  if (p.falta === 'datos') {
    return h('section', { class: 'tarjeta aviso-tarjeta' },
      h('div', { class: 'antetitulo' }, 'Hora de acostarse'),
      h('p', {}, `Hacen falta al menos 3 noches apuntadas para saber a qué hora te acuestas de verdad (llevas ${p.noches}).`),
      h('a', { class: 'boton', href: '#/diario' }, 'Apuntar la noche'));
  }
  return h('section', { class: 'tarjeta', style: 'text-align: center' },
    h('div', { class: 'antetitulo' }, p.semanas ? `Hora de acostarse · semana ${p.semanas + 1}` : 'Hora de acostarse'),
    h('h2', { style: 'margin: 2px 0 6px; font-size: 2rem; font-variant-numeric: tabular-nums' }, p.hora),
    h('p', { class: 'calculo-sueno' },
      h('span', {}, 'Pantallas fuera ', h('strong', {}, p.pantallas)),
      h('span', {}, 'Cenar antes de ', h('strong', {}, p.cena)),
      h('span', {}, 'Arriba a las ', h('strong', {}, p.levantarse))),
    p.recortada && h('p', { class: 'aviso-texto' },
      `Más tarde no: con tu hora de levantarte, acostarte a las ${p.hora} ya es el límite para dormir ${SUENO_MINIMO_H} h de verdad.`),
    h('div', { class: 'titulo-con-ayuda', style: CENTRAR },
      h('span', { class: 'etiqueta-campo' }, 'De dónde sale'),
      ayuda('Hora de acostarse', [
        `Se parte de la hora a la que te acuestas de verdad (${p.base}, la media de tu primera semana apuntada) y se adelanta ${ADELANTO_SEMANAL_MIN} min por semana desde la fecha de inicio del plan, hasta llegar a las ${p.objetivo} (tu hora de levantarte menos lo que necesitas dormir). Redondeado a múltiplos de 5 min.`,
        'Las tres cosas van juntas porque juntas se probaron: hora fija de acostarse, pantallas fuera 2 h antes y cenar temprano adelantaron unas 2 h la fase de 22 personas en 3 semanas, sin que perdieran sueño (Facer-Childs 2019).',
        `Nunca se propone una hora que deje menos de ${SUENO_MINIMO_H} h de sueño real, el mínimo del consenso de la American Academy of Sleep Medicine (Watson 2015). Con esta hora te quedan ${textoHoras(p.enCama)} en cama y unas ${textoHoras(p.real)} de sueño real, descontando los ${p.perdidas} min que sueles perder entre dormirte, despertares y remoloneo.`,
      ])));
}

// Sueño real de cada noche con la línea de lo que necesitas y, aparte, el pulso.
function graficas(d, necesidad) {
  const dias = (d.diario ?? []).slice(-30);
  const sueno = dias.map((e, i) => ({ x: i + 1, s: calcularSueno(e) })).filter((p) => p.s).map((p) => ({ x: p.x, y: Math.round((p.s.real / 60) * 10) / 10 }));
  const pulso = dias.map((e, i) => ({ x: i + 1, y: e.pulsoNocturno })).filter((p) => p.y > 0);
  if (sueno.length < 2 && pulso.length < 2) return null;
  const paleta = colores();
  return h('section', { class: 'tarjeta' },
    sueno.length >= 2 && graficaLineas({ titulo: 'Sueño real por noche', unidad: 'h', etiquetaX: 'Noche', series: [
      { nombre: 'Sueño real', color: paleta[0], puntos: sueno },
      { nombre: 'Lo que necesitas', color: paleta[1], discontinua: true,
        puntos: [{ x: sueno[0].x, y: necesidad }, { x: sueno.at(-1).x, y: necesidad }] }] }),
    pulso.length >= 2 && graficaLineas({ titulo: 'Pulso nocturno', unidad: 'lpm', etiquetaX: 'Noche', series: [
      { nombre: 'Pulso nocturno', color: paleta[2], puntos: pulso }] }));
}
