// Asistente «Añadir series»: una pregunta cada vez. Lo ya contestado queda
// en una línea (toca para cambiarlo) y solo se abre la siguiente pregunta.
// Lo que tiene una respuesta razonable (recámara, cuántas, cómo son, dónde)
// viene ya contestado, para no hacer diez preguntas por ejercicio.
//
// El árbol (Dan, 17-10-2026):
//   ¿La app te lleva el progreso?
//     · No, solo apuntar → qué serie es (de trabajo, calentamiento, máxima) y
//       un objetivo orientativo. Al entrenar ves lo del último día.
//     · Sí → qué mejoras (peso, repeticiones, tiempo, distancia) → cómo
//       (doble progresión, sube al completarlas, según tu 1RM, por ciclos o
//       un prehecho tuyo) → el rango → recámara, cuántas, cómo son (iguales,
//       descendente, ascendentes, miorrepeticiones, rest-pause) y dónde.
//
// Sirve en la rutina, en la ficha del ejercicio y en el entreno. Devuelve una
// «forma» (ver rapidas.js) a `alAceptar`.

import { h, leerNumero, modal } from '../ui.js';
import {
  CICLOS_ASISTENTE, PORCENTAJES, RANGOS_MAXIMA, RANGOS_REPS, REPS_FIJAS, TIEMPOS, conPeso, conPesoYReps, mideTiempo, repsAscendentes,
  textoForma, textoTiempo,
} from '../rapidas.js';

const rangoTexto = (r, tiempo) => (r == null ? 'sin objetivo'
  : r[0] === r[1] ? (tiempo ? textoTiempo(r[0]) : String(r[0])) : tiempo ? `${textoTiempo(r[0])}-${textoTiempo(r[1])}` : `${r[0]}-${r[1]}`);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function preguntas(ej, datos, contexto, conRutina) {
  const peso = conPeso(ej);
  const repsConPeso = conPesoYReps(ej);
  const tiempo = mideTiempo(ej);
  const mios = (datos.perfil?.prehechos ?? []).filter((m) => !(m.progresion?.sobre === 'carga' && !peso));
  const si = (f) => f.progreso === 'si';
  const conCargaModo = (f) => si(f) && ['doble', 'lineal', 'rm'].includes(f.modo);
  return [
    { clave: 'progreso', titulo: contexto === 'entreno' ? '¿Estas series nuevas llevan progresión?' : '¿La app te lleva el progreso?', corto: 'Progreso',
      opciones: () => [
        ['si', 'Sí, que me diga qué toca', 'Cada día te pone el peso y el objetivo para superarte.'],
        ['no', 'No, solo apuntar', 'Ves lo que hiciste el último día e intentas superarlo a tu aire.'],
      ] },
    { clave: 'tipo', titulo: '¿Qué serie es?', corto: 'Serie', aplica: (f) => f.progreso === 'no',
      opciones: () => [
        ['trabajo', 'De trabajo', 'Cuenta para tu progreso y tu recuperación.'],
        ['calentamiento', 'Calentamiento', 'De aproximación: no cuenta para récords ni recuperación.'],
        repsConPeso && ['maxima', 'Serie máxima', 'Una o dos pesadas: de aquí sale tu 1RM más fiable.'],
      ].filter(Boolean) },
    { clave: 'mejora', titulo: '¿Qué quieres ir mejorando?', corto: 'Mejoras', aplica: si,
      opciones: () => [
        repsConPeso && ['peso', 'El peso', 'Con las mismas repeticiones, más kilos.'],
        !tiempo && ['reps', 'Las repeticiones', repsConPeso ? 'Con el mismo peso, más repeticiones; luego sube el peso.' : 'Más repeticiones cada vez.'],
        tiempo && ['tiempo', 'El tiempo', 'Aguantar más.'],
        ej.esfuerzoExtra?.tipo === 'distancia' && ['distancia', 'La distancia', 'Llegar más lejos.'],
      ].filter(Boolean) },
    { clave: 'modo', titulo: '¿Cómo te lleva la app?', corto: 'Cómo', aplica: si,
      opciones: (f) => [
        f.mejora === 'peso' && ['lineal', 'Sube al completarlas', 'Repeticiones fijas. Cuando las sacas todas, la próxima vez +2,5 kg; si no, repites el peso.'],
        f.mejora === 'reps' && repsConPeso && ['doble', 'Doble progresión', 'Mismo peso hasta llegar arriba del rango; entonces sube el peso y vuelves abajo.'],
        repsConPeso && ['rm', 'Según tu fuerza (1RM)', 'El peso lo calcula la app con tu mejor 1RM de las últimas 8 semanas: si te haces más fuerte, sube solo. Te dice cuántas hacer para superar la última vez.'],
        (!repsConPeso) && ['mas', 'Un poco más cada vez', 'Te pide algo más que la última vez.'],
        ['ciclo', 'Por ciclos', 'Lo que mejoras sube cada sesión durante un ciclo; al acabar, vuelve a empezar más arriba. Bilbo, 5×5, 5/3/1…'],
        ...mios.map((m) => [`mio:${m.id}`, m.nombre, m.descripcion]),
      ].filter(Boolean) },
    { clave: 'ciclo', titulo: '¿Qué ciclo?', corto: 'Ciclo', aplica: (f) => si(f) && f.modo === 'ciclo',
      opciones: () => CICLOS_ASISTENTE.filter((c) => (c.conPeso ? repsConPeso : true) && (c.tiempo ? tiempo : true) && (c.sinPeso ? !peso : true))
        .map((c) => [c.clave, c.etiqueta, c.explica]) },
    // El rango (o el valor fijo), según el modo.
    { clave: 'rango', titulo: '¿Entre cuántas repeticiones?', corto: 'Repeticiones',
      aplica: (f) => (f.progreso === 'no') || (si(f) && ['doble', 'mas'].includes(f.modo) && !(f.modo === 'mas' && tiempo)),
      titulo2: (f) => (f.tipo === 'maxima' && f.progreso === 'no' ? '¿Cuántas en la serie máxima?' : f.tipo === 'calentamiento' ? '¿Cuántas repeticiones?'
        : f.progreso === 'no' ? '¿Algún objetivo orientativo?' : tiempo ? '¿Cuánto tiempo?' : '¿Entre cuántas repeticiones?'),
      chips: (f) => (f.tipo === 'maxima' && f.progreso === 'no' ? RANGOS_MAXIMA
        : tiempo ? TIEMPOS.map((s) => [s, s])
          : f.tipo === 'calentamiento' ? [[5, 5], [8, 8], [10, 10], [12, 12]]
            : f.progreso === 'no' ? [null, ...RANGOS_REPS] : [[1, 2], ...RANGOS_REPS]),
      libre: true },
    { clave: 'reps', titulo: '¿Cuántas repeticiones?', corto: 'Repeticiones', aplica: (f) => si(f) && f.modo === 'lineal',
      chips: () => REPS_FIJAS.map((r) => [r, r]) },
    { clave: 'fija', titulo: '¿Qué fijas tú?', corto: 'Fijas', aplica: (f) => si(f) && f.modo === 'rm',
      opciones: () => [['reps', 'Las repeticiones', 'La app busca el peso con el que harías esas repeticiones.'],
        ['pct', 'El % del 1RM', 'La app pone ese porcentaje de tu máximo y te dice cuántas hacer.']] },
    { clave: 'valor', titulo: '¿Cuántas?', corto: (f) => (f.fija === 'pct' ? '% del 1RM' : 'Repeticiones'), aplica: (f) => si(f) && f.modo === 'rm' && f.fija,
      titulo2: (f) => (f.fija === 'pct' ? '¿A qué porcentaje?' : '¿Cuántas repeticiones?'),
      chips: (f) => (f.fija === 'pct' ? PORCENTAJES.map((p) => [p, p]) : REPS_FIJAS.map((r) => [r, r])),
      textoChip: (f, c) => (f.fija === 'pct' ? `${c[0]} %` : String(c[0])) },
    { clave: 'recamara', titulo: '¿Cuántas te dejas en recámara?', corto: 'Recámara', aplica: (f) => peso && !tiempo && conCargaModo(f),
      opciones: () => [[0, 'Ninguna (al fallo)'], [1, '1'], [2, '2'], [3, '3']], compacta: true,
      defecto: (f) => ((f.rango?.[1] ?? f.reps ?? f.valor ?? 10) <= 6 || (f.fija === 'pct' && f.valor >= 80) ? 2 : 1) },
    { clave: 'n', titulo: '¿Cuántas series?', corto: 'Series', contador: true,
      aplica: (f) => !(si(f) && f.modo === 'ciclo' && ['bilbo', '5x5', '531', 'hst'].includes(f.ciclo)),
      defecto: (f) => (f.tipo === 'maxima' || (f.rango && f.rango[1] <= 2) ? 1 : f.tipo === 'calentamiento' ? 2 : 3) },
    { clave: 'forma', titulo: '¿Cómo son las series?', corto: 'Forma', aplica: (f) => repsConPeso && f.tipo !== 'calentamiento'
      && (conCargaModo(f) || (f.progreso === 'no' && f.tipo === 'trabajo')),
      opciones: (f) => [['normal', 'Todas iguales'],
        ['descendente', 'Descendente en la última', 'La última sigue bajando el peso sin descansar.'],
        (f.n ?? 3) >= 2 && f.modo !== 'lineal' && (f.rango || f.modo === 'rm') && ['ascendente', 'Ascendentes', 'Cada serie con más peso y menos repeticiones (pirámide).'],
        ['miorrepeticiones', 'Miorrepeticiones en la última', 'Al acabar, miniseries de pocas repeticiones con 3-5 respiraciones entre medias.'],
        ['rest-pause', 'Rest-pause en la última', 'Al acabar, 15-20 s de pausa y unas pocas más, un par de veces.']].filter(Boolean),
      defecto: () => 'normal' },
    { clave: 'donde', titulo: '¿Dónde valen?', corto: 'Dónde', aplica: () => contexto === 'rutina' || (contexto === 'entreno' && conRutina),
      opciones: () => [['rutina', 'Solo en esta rutina', 'Al entrenar sin rutina este ejercicio usa las suyas.'],
        ['ejercicio', contexto === 'entreno' ? 'Siempre en este ejercicio' : 'También sin rutina', 'Pasan a ser las series del ejercicio.']], compacta: true },
  ];
}

export function abrirAsistenteSeries({ ej, datos, contexto = 'rutina', donde = 'rutina', conRutina = false, alAceptar }) {
  const f = { donde };
  const lista = preguntas(ej, datos, contexto, conRutina);
  let abierta = null;
  const zona = h('div', { class: 'asistente' });
  const nota = contexto === 'entreno' && h('p', { class: 'nota centrado' }, 'Series nuevas para este ejercicio. Las que ya tienes siguen igual, con su progresión.');
  const cerrar = modal(`${contexto === 'entreno' ? 'Programar series' : 'Añadir series'}: ${ej.nombre}`, nota ? h('div', {}, nota, zona) : zona);
  const tiempo = mideTiempo(ej);

  const aplica = (q) => !q.aplica || q.aplica(f);
  function rellenar() {
    if (f.progreso === 'si') f.tipo = 'trabajo';
    for (const q of lista) {
      if (!aplica(q)) continue;
      if (f[q.clave] !== undefined) continue;
      const ops = q.opciones?.(f);
      if (ops?.length === 1) { f[q.clave] = ops[0][0]; continue; }
      const d = q.defecto?.(f);
      if (d !== undefined) f[q.clave] = d;
    }
  }
  function contestar(q, valor) {
    f[q.clave] = valor;
    const i = lista.indexOf(q);
    for (const otra of lista.slice(i + 1)) if (!['n', 'donde'].includes(otra.clave)) delete f[otra.clave];
    if (q.clave === 'progreso') delete f.tipo;
    abierta = null;
    pintar();
  }
  const actual = () => abierta ?? lista.find((q) => aplica(q) && f[q.clave] === undefined)?.clave ?? null;

  function valorTexto(q) {
    const v = f[q.clave];
    if (q.contador) return String(v);
    if (q.chips) {
      if (q.clave === 'rango') return rangoTexto(v, tiempo);
      return q.textoChip ? q.textoChip(f, [v]) : String(v);
    }
    return q.opciones(f).find(([k]) => k === v)?.[1] ?? String(v);
  }

  function expandida(q) {
    const titulo = q.titulo2?.(f) ?? q.titulo;
    let cuerpo;
    if (q.contador) {
      const n = f.n ?? q.defecto(f);
      cuerpo = h('div', { class: 'paso-a-paso' },
        h('button', { type: 'button', class: 'boton secundario', 'aria-label': 'Una menos', disabled: n <= 1, onclick: () => { f.n = n - 1; abierta = 'n'; pintar(); } }, '−'),
        h('strong', { class: 'numero-grande' }, String(n)),
        h('button', { type: 'button', class: 'boton secundario', 'aria-label': 'Una más', disabled: n >= 20, onclick: () => { f.n = n + 1; abierta = 'n'; pintar(); } }, '+'),
        h('button', { type: 'button', class: 'boton', onclick: () => { f.n = n; abierta = null; pintar(); } }, 'Vale'));
    } else if (q.chips) {
      const chips = q.chips(f);
      cuerpo = h('div', {},
        h('div', { class: 'chips rangos' }, chips.map((c) => {
          const valor = c == null ? null : q.clave === 'rango' ? [c[0], c[1]] : c[0];
          const texto = c == null ? 'Sin objetivo' : q.textoChip ? q.textoChip(f, c) : q.clave === 'rango' ? rangoTexto(valor, tiempo) : String(c[0]);
          return h('button', { type: 'button', class: `chip seleccionable${igual(f[q.clave], valor) ? ' activo' : ''}`,
            onclick: () => contestar(q, valor) }, texto);
        })),
        q.libre && !tiempo && otroRango(q));
    } else {
      cuerpo = h('div', { class: `opciones-asistente${q.compacta ? ' compacta' : ''}` }, q.opciones(f).map(([k, texto, explica]) => h('button', {
        type: 'button', class: `boton-marca${f[q.clave] === k ? ' activo' : ''}`, onclick: () => contestar(q, k) },
      h('strong', {}, texto), explica && !q.compacta && h('small', { class: 'bloque suave' }, explica))));
    }
    return h('div', { class: 'pregunta-asistente' }, h('p', { class: 'titulo-pregunta' }, titulo), cuerpo);
  }

  function otroRango(q) {
    const de = h('input', { type: 'text', inputmode: 'numeric', class: 'numero-corto', 'aria-label': 'Desde', placeholder: 'de' });
    const a = h('input', { type: 'text', inputmode: 'numeric', class: 'numero-corto', 'aria-label': 'Hasta', placeholder: 'a' });
    return h('div', { class: 'fila-rapida' }, h('span', {}, 'Otro:'), de, h('span', {}, 'a'), a,
      h('button', { type: 'button', class: 'boton secundario', onclick: () => {
        const x = Math.round(leerNumero(de.value) ?? 0); const y = Math.round(leerNumero(a.value) ?? x);
        if (!(x >= 1)) return;
        contestar(q, [Math.min(x, y), Math.max(x, y)]);
      } }, 'Usar'));
  }

  function pintar() {
    rellenar();
    const toca = actual();
    const filas = [];
    const iToca = lista.findIndex((q) => q.clave === toca);
    for (const [k, q] of lista.entries()) {
      if (!aplica(q)) continue;
      if (q.clave === toca) { filas.push(expandida(q)); continue; }
      if (f[q.clave] === undefined) continue;
      if (iToca >= 0 && k > iToca && abierta == null) continue;
      filas.push(h('button', { type: 'button', class: 'respuesta', onclick: () => { abierta = q.clave; pintar(); } },
        h('span', { class: 'respuesta-pregunta' }, typeof q.corto === 'function' ? q.corto(f) : q.corto), h('strong', {}, valorTexto(q)),
        h('span', { class: 'respuesta-cambiar', 'aria-hidden': 'true' }, 'Cambiar')));
    }
    const listo = !toca;
    const forma = { ...f, n: f.n ?? 1, rango: f.rango ?? (f.reps ? [f.reps, f.reps] : f.rango) };
    if (forma.forma === 'ascendente' && forma.modo === 'rm' && !forma.rango) forma.rango = [Math.max(1, (f.valor ?? 5) - 3), f.valor ?? 5];
    zona.replaceChildren(...[
      ...filas,
      listo && forma.forma === 'ascendente' && forma.rango
        && h('p', { class: 'nota centrado' }, `Repeticiones de cada serie: ${repsAscendentes(forma.rango[0], forma.rango[1], forma.n).join(', ')}; el peso sube en cada una.`),
      listo && h('button', { type: 'button', class: 'boton grande', onclick: () => { if (alAceptar(forma) !== false) cerrar(); } },
        `Añadir ${textoForma(forma, ej)}`),
    ].filter(Boolean));
  }
  pintar();
  return cerrar;
}
