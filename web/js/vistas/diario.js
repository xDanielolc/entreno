// Pantalla «Diario» (#/diario): el peso y el sueño de cada día, la sensación
// al levantarte y, debajo, el resumen de los últimos 7 días con datos (medias,
// jet lag social, regularidad y tus repeticiones en los básicos). La sensación
// se guarda como dato, pero no decide nada sola.
//
// De aquí sale también la tarjeta de Inicio con la hora de acostarse de esta
// semana (`tarjetaHoraAcostarse`).
import * as estado from '../estado.js';
import { formatearNumero } from '../calculos.js';
import { apuntarPeso, quitarPeso } from '../peso.js';
import {
  ADELANTO_SEMANAL_MIN, ALCOHOL, NECESIDAD_SUENO_POR_DEFECTO, SENSACIONES, SUENO_MINIMO_H, apuntarEnDiario, calcularSueno,
  entradaDe, horaAcostarse, resumenUltimos7, textoHoras,
} from '../diario.js';
import { colores, graficaLineas } from './graficas.js';
import { anadir, aviso, ayuda, fechaCorta, h, hoyISO, leerNumero } from '../ui.js';

// El día que se edita arriba (por defecto, hoy). Se elige tocando una fila.
let diaElegido = null;

// `titulo-con-ayuda` es una fila flexible: para centrar el título con su «?»
// hace falta esto. Va en línea porque `estilo.css` lo lleva otra tanda.
const CENTRAR = 'justify-content: center';

export function vistaDiario(contenedor) {
  const d = estado.datos();
  const hoy = hoyISO();
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
    h('h1', {}, 'Diario'),
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
        aviso(entradaDe(estado.datos(), fecha) ? `Guardado: ${fecha === hoy ? 'hoy' : fechaCorta(fecha)}.` : 'No hay nada que guardar todavía.');
        document.querySelector('.tabla-diario')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } }, 'Guardar el día')),

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
  return h('section', { class: 'tarjeta' },
    // Los estilos van en línea: `estilo.css` lo lleva otra tanda de cambios.
    h('div', { class: 'titulo-con-ayuda', style: CENTRAR }, h('h2', {}, 'Resumen semanal'),
      ayuda('Resumen semanal', [
        `Los últimos 7 días que tienes apuntados (ahora ${r.dias}${r.dias === 1 ? ' día' : ' días'}).`,
        'Sueño real: tiempo en cama menos lo que tardas en dormirte, lo que estás despierto y lo que remoloneas. Eficiencia normal: 85 % o más (Ohayon 2004).',
        'Jet lag social: el punto medio del sueño del fin de semana (las noches del viernes y del sábado) menos el de los días laborables. El punto medio es la hora a la que te duermes más la mitad del sueño real. Dormir más de 1 h extra el fin de semana indica deuda de sueño acumulada (Roenneberg 2012).',
        'Se mueve: cuánto bailan la hora de acostarse y la de levantarse en esos 7 días (la más tardía menos la más temprana). Importa más de lo que parece: la regularidad del sueño predice la mortalidad mejor que la duración (Windred 2024, UK Biobank, 60 977 personas con acelerómetro).',
        'Reps en básicos: las repeticiones de tus series de trabajo de press de banca, sentadilla, peso muerto, remo con barra y press militar, y entre paréntesis el cambio frente a los 7 días anteriores. Dormir poco se nota antes en el volumen que aguantas que en tu 1RM (Cook 2012; Knowles 2022).',
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
