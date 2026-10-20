// Pantalla «Diario» (#/diario): el peso y el sueño de cada día, la sensación
// al levantarte y, debajo, la semana resumida junto a tus repeticiones en los
// básicos. La sensación se guarda como dato, pero no decide nada sola.
import * as estado from '../estado.js';
import { formatearNumero } from '../calculos.js';
import { apuntarPeso, quitarPeso } from '../peso.js';
import {
  ALCOHOL, NECESIDAD_SUENO_POR_DEFECTO, SENSACIONES, apuntarEnDiario, calcularSueno, entradaDe, lunesDe, resumenSemana,
  semanaAnterior, textoHoras,
} from '../diario.js';
import { colores, graficaLineas } from './graficas.js';
import { anadir, aviso, ayuda, fechaCorta, h, hoyISO, leerNumero } from '../ui.js';

// El día que se edita arriba (por defecto, hoy). Se elige tocando una fila.
let diaElegido = null;

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

  anadir(contenedor,
    h('h1', {}, 'Diario'),
    h('section', { class: 'tarjeta diario-dia' },
      h('div', { class: 'cabecera-tarjeta' },
        h('h2', { class: 'crece' }, fecha === hoy ? 'Hoy' : fechaCorta(fecha)),
        fecha !== hoy && h('button', { type: 'button', class: 'boton secundario', onclick: () => { diaElegido = null; estado.emitir('vista'); } }, 'Volver a hoy')),
      h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Peso'), h('span', { class: 'con-unidad' }, pesoCaja, h('small', { class: 'suave' }, 'kg'))),

      h('h3', {}, 'Esta noche'),
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
    h('label', { class: 'campo necesidad-sueno' },
      h('span', { class: 'etiqueta-campo' }, 'Lo que necesitas dormir (horas)'),
      h('input', { type: 'text', inputmode: 'decimal', id: 'diario-necesidad', value: String(necesidad).replace('.', ','),
        onchange: (ev) => {
          const v = leerNumero(ev.target.value);
          if (v >= 4 && v <= 12) estado.cambiar((x) => { x.perfil.necesidadSuenoH = v; });
        } }),
      h('small', { class: 'nota' }, 'Por defecto 8,5. Es la línea discontinua de la gráfica.')));
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

// Esta semana frente a la anterior.
function resumen(d, hoy) {
  const lunes = lunesDe(hoy);
  const a = resumenSemana(d, lunes);
  const b = resumenSemana(d, semanaAnterior(lunes));
  if (!a.dias && !b.dias) return null;
  const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
  const signo = (x) => (x == null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${textoHoras(Math.abs(x))}`);
  const filas = [
    ['Sueño real (media)', textoHoras(a.sueno), textoHoras(b.sueno)],
    ['Eficiencia', pct(a.eficiencia), pct(b.eficiencia)],
    ['Pulso nocturno', a.pulso ? `${Math.round(a.pulso)} lpm` : '—', b.pulso ? `${Math.round(b.pulso)} lpm` : '—'],
    ['Cómo te levantas', a.sensacion ? formatearNumero(Math.round(a.sensacion * 10) / 10) : '—', b.sensacion ? formatearNumero(Math.round(b.sensacion * 10) / 10) : '—'],
    ['Fin de semana frente a laborables', signo(a.findeExtra), signo(b.findeExtra)],
    ['Repeticiones en básicos', a.reps ? `${a.reps}${a.cambioReps != null ? ` (${a.cambioReps >= 0 ? '+' : '−'}${Math.round(Math.abs(a.cambioReps) * 100)} %)` : ''}` : '—',
      b.reps ? `${b.reps}${b.cambioReps != null ? ` (${b.cambioReps >= 0 ? '+' : '−'}${Math.round(Math.abs(b.cambioReps) * 100)} %)` : ''}` : '—'],
  ];
  return h('section', { class: 'tarjeta' },
    h('div', { class: 'titulo-con-ayuda' }, h('h2', {}, 'Tu semana'),
      ayuda('Tu semana', [
        'Sueño real: tiempo en cama menos lo que tardas en dormirte, lo que estás despierto y lo que remoloneas. Eficiencia normal: 85 % o más (Ohayon 2004).',
        'Fin de semana frente a laborables: si duermes más de una hora de más el fin de semana, arrastras deuda de sueño (Roenneberg 2012).',
        'Repeticiones en básicos: las de tus series de trabajo de banca, sentadilla, peso muerto, remo y press militar, y en paréntesis el cambio frente a la semana anterior. Dormir poco se nota antes en el volumen que aguantas que en tu 1RM (Cook 2012; Knowles 2022).',
      ])),
    h('table', { class: 'tabla-musculos tabla-semana' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Esta semana'), h('th', {}, 'La anterior'))),
      h('tbody', {}, filas.map(([t, x, y]) => h('tr', {}, h('td', {}, t), h('td', {}, x), h('td', {}, y))))));
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
