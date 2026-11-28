// Hábitos (esquema v41): la lista de hábitos (`habitos[]`) y lo que contestaste cada día (`registroHabitos[]`).
// Aquí solo hay cuentas y datos; la pantalla está en `vistas/habitos.js`.
//
// - Un hábito: { id, nombre, minimo, dias: [0-6] (0 = lunes), bloque: 'construccion' | 'mantenimiento', orden,
//   desde: 'AAAA-MM-DD' (antes de ese día no cuenta), borrado?: true }. Borrar es blando, para no perder el historial.
// - Un día: { id: 'rh_AAAA-MM-DD', fecha, r: { [idHabito]: 'si' | 'no' } }. El id sale de la fecha, así que el móvil
//   y el ordenador escriben en el mismo registro y la fusión junta las respuestas hábito a hábito.
// - Un hábito puede ir enlazado al diario del sueño (`enlace: 'alcohol' | 'sensacion'`, desde el 20-11-2026): su
//   respuesta no va a `registroHabitos`, sino al campo del diario de ese mismo día (el día en que te levantas, igual que
//   «Noche»). Así el resumen y las gráficas del sueño siguen leyendo lo de siempre, y en Sueño solo quedan los datos
//   del reloj. El alcohol cuenta como hecho si fue «nada»; las estrellas no son un hábito y no entran en el porcentaje.

import { ALCOHOL, SENSACIONES, apuntarEnDiario, entradaDe } from './diario.js';

export const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6];
export const BLOQUES = { construccion: 'En construcción', mantenimiento: 'Ya va solo' };

// El día de los hábitos cambia a las 5 de la mañana: lo que contestas a la 1 de la madrugada (el pijama, la nidra)
// es de la noche anterior, no del día que acaba de empezar.
export const HORA_CAMBIO_DIA = 5;

const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function diaDeHabitos(ahora = new Date()) {
  return iso(new Date(ahora.getTime() - HORA_CAMBIO_DIA * 3600000));
}

export function diaSemana(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return (new Date(a, m - 1, d).getDay() + 6) % 7;
}

export function sumarDias(fecha, n) {
  const [a, m, d] = fecha.split('-').map(Number);
  return iso(new Date(a, m - 1, d + n, 12));
}

export function habitosActivos(datos) {
  return (datos.habitos ?? []).filter((x) => !x.borrado).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

export function toca(habito, fecha) {
  if (habito.desde && fecha < habito.desde) return false;
  return (habito.dias?.length ? habito.dias : TODOS_LOS_DIAS).includes(diaSemana(fecha));
}

// melatonina (0.95.1, 28-11-2026): experimento de dejarla. Va al diario (`diario.melatonina`: 'si' la tomó, 'no' no
// la tomó) para que la conversación del sueño compare las noches con y sin ella. Cuenta como hecho no tomarla.
export const ENLACES = {
  alcohol: { campo: 'alcohol', opciones: [['no', 'Nada'], ['poco', ALCOHOL.poco], ['mucho', ALCOHOL.mucho]] },
  melatonina: { campo: 'melatonina', opciones: [['no', 'No la tomé'], ['si', 'La tomé']] },
  sensacion: { campo: 'sensacion', estrellas: true, nombres: SENSACIONES },
};
const enlaceDe = (habito) => ENLACES[habito?.enlace] ?? null;
export const esEstrellas = (habito) => Boolean(enlaceDe(habito)?.estrellas);
// ¿Entra en el porcentaje? Todo menos las estrellas.
export const cuenta = (habito) => !esEstrellas(habito);

// Lo guardado tal cual: 'si' / 'no' en los normales; el valor del diario en los enlazados.
export function valorDe(datos, habito, fecha) {
  const enlace = enlaceDe(habito);
  if (enlace) return entradaDe(datos, fecha)?.[enlace.campo] ?? null;
  return respuestasDe(datos, fecha)[habito.id] ?? null;
}

// 'si', 'no' o null, para el cuadrante y las cuentas. Las estrellas no son ni sí ni no.
export function estadoDe(datos, habito, fecha) {
  const v = valorDe(datos, habito, fecha);
  if (v == null || esEstrellas(habito)) return null;
  // En los enlazados con opciones (alcohol, melatonina), cuenta como hecho la primera.
  const opciones = enlaceDe(habito)?.opciones;
  if (opciones) return v === opciones[0][0] ? 'si' : 'no';
  return v === 'si' ? 'si' : v === 'no' ? 'no' : null;
}

export function respuestasDe(datos, fecha) {
  return (datos.registroHabitos ?? []).find((x) => x.fecha === fecha)?.r ?? {};
}

// valor: 'si', 'no' o null (quitar la respuesta).
// En los enlazados, el valor del campo del diario (o null para quitarlo).
export function responder(datos, fecha, idHabito, valor) {
  const enlace = enlaceDe((datos.habitos ?? []).find((x) => x.id === idHabito));
  if (enlace) { apuntarEnDiario(datos, fecha, enlace.campo, valor ?? null); return; }
  datos.registroHabitos ??= [];
  let dia = datos.registroHabitos.find((x) => x.fecha === fecha);
  if (!dia) {
    dia = { id: `rh_${fecha}`, fecha, r: {} };
    datos.registroHabitos.push(dia);
  }
  if (valor) dia.r[idHabito] = valor;
  else delete dia.r[idHabito];
}

export function delDia(datos, fecha) {
  return habitosActivos(datos).filter((x) => toca(x, fecha));
}

export function pendientes(datos, fecha) {
  return delDia(datos, fecha).filter((x) => valorDe(datos, x, fecha) == null);
}

// La tarjeta que sale ahora. «Luego» aparca un hábito: vuelve a salir después del siguiente que contestes con Sí o
// No. `aplazados` es [{ id, marca }], con marca = cuántas respuestas llevabas al aparcarlo.
export function siguienteTarjeta(lista, aplazados, respondidas) {
  const ids = new Set(lista.map((x) => x.id));
  const vivos = aplazados.filter((a) => ids.has(a.id));
  const toca = vivos.find((a) => respondidas > a.marca);
  if (toca) return lista.find((x) => x.id === toca.id);
  const aparcados = new Set(vivos.map((a) => a.id));
  const nuevo = lista.find((x) => !aparcados.has(x.id));
  if (nuevo) return nuevo;
  // Solo quedan aparcados: van por turnos, empezando por el que lleva más tiempo esperando.
  return vivos.length ? lista.find((x) => x.id === vivos[0].id) : null;
}

export function aplazar(aplazados, id, respondidas) {
  return [...aplazados.filter((a) => a.id !== id), { id, marca: respondidas }];
}

// Cuentas entre dos fechas (incluidas), sin pasar de `hoy`. «Posibles» son los días en que tocaba: lo que no
// apuntaste cuenta como no hecho en el porcentaje, y se dice aparte cuántos son.
export function cuentas(datos, desde, hasta, hoy) {
  const total = { posibles: 0, si: 0, no: 0, vacio: 0 };
  const porHabito = new Map();
  const lista = habitosActivos(datos).filter(cuenta);
  for (const x of lista) porHabito.set(x.id, { posibles: 0, si: 0, no: 0, vacio: 0 });
  const fin = hasta < hoy ? hasta : hoy;
  for (let f = desde; f <= fin; f = sumarDias(f, 1)) {
    for (const x of lista) {
      if (!toca(x, f)) continue;
      const c = porHabito.get(x.id);
      const v = estadoDe(datos, x, f) ?? 'vacio';
      c.posibles++; c[v]++;
      total.posibles++; total[v]++;
    }
  }
  return { total, porHabito };
}

// Media de estrellas entre dos fechas (sin pasar de hoy), o null.
export function mediaEstrellas(datos, habito, desde, hasta, hoy) {
  const fin = hasta < hoy ? hasta : hoy;
  const vs = [];
  for (let f = desde; f <= fin; f = sumarDias(f, 1)) {
    const v = valorDe(datos, habito, f);
    if (toca(habito, f) && v > 0) vs.push(v);
  }
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
}

export const porcentaje = (c) => (c.posibles ? Math.round((100 * c.si) / c.posibles) : null);

// ---------------------------------------------------------------- fases (0.95.0, sin cambio de esquema: campos opcionales)
// Como en sus hojas de papel: cada hábito puede tener una escalera de fases, cada una con su mínimo. Se sube a la
// siguiente cuando llevas X días seguidos hechos O X días hechos en total desde que empezaste la fase (lo eligió Dan
// el 26-11-2026: 7 seguidos o 10 en total por defecto). La app no sube sola: pregunta en la tarjeta.
// Campos del hábito (todos opcionales):
//   fases: [{ minimo }]           la escalera; sin ella el hábito no tiene fases y vale `minimo`
//   fase: 0                       la fase actual (índice en `fases`)
//   faseDesde: 'AAAA-MM-DD'       desde qué día cuenta la fase actual
//   subirRacha: 7, subirTotal: 10 cuántos seguidos o cuántos en total hacen falta para subir
//   faseNoHasta: 'AAAA-MM-DD'     dijo «Todavía no» ese día: no se vuelve a preguntar hasta el siguiente
//   historialFases: [{ fase, desde }]
// `minimo` se mantiene igual al mínimo de la fase actual, para lo que lo lea sin saber de fases.
export const SUBIR_RACHA = 7;
export const SUBIR_TOTAL = 10;

export const tieneFases = (habito) => Array.isArray(habito?.fases) && habito.fases.length > 0;
export const faseActual = (habito) => (tieneFases(habito) ? Math.min(Math.max(habito.fase ?? 0, 0), habito.fases.length - 1) : 0);

export function minimoDe(habito) {
  return tieneFases(habito) ? habito.fases[faseActual(habito)]?.minimo ?? '' : habito?.minimo ?? '';
}

// Días seguidos y días en total hechos en la fase actual, hasta hoy. Un día que tocaba y se quedó en «no» o sin
// apuntar rompe la racha; hoy, mientras no esté contestado, no la rompe.
export function progresoFase(datos, habito, hoy) {
  const desde = habito.faseDesde ?? habito.desde ?? hoy;
  let racha = 0;
  let total = 0;
  for (let f = desde; f <= hoy; f = sumarDias(f, 1)) {
    if (!toca(habito, f)) continue;
    const v = estadoDe(datos, habito, f);
    if (v === 'si') { racha++; total++; } else if (v === 'no' || f < hoy) racha = 0;
  }
  return { racha, total, faltaRacha: habito.subirRacha ?? SUBIR_RACHA, faltaTotal: habito.subirTotal ?? SUBIR_TOTAL };
}

export function listoParaSubir(datos, habito, hoy) {
  if (!tieneFases(habito) || faseActual(habito) >= habito.fases.length - 1) return false;
  if (habito.faseNoHasta && habito.faseNoHasta >= hoy) return false;
  const p = progresoFase(datos, habito, hoy);
  return p.racha >= p.faltaRacha || p.total >= p.faltaTotal;
}

// Pone el hábito en la fase `n` desde `hoy` (subir, bajar o corregir a mano).
export function ponerFase(habito, n, hoy) {
  if (!tieneFases(habito)) return;
  const nueva = Math.min(Math.max(n, 0), habito.fases.length - 1);
  habito.fase = nueva;
  habito.faseDesde = hoy;
  delete habito.faseNoHasta;
  habito.minimo = habito.fases[nueva].minimo ?? '';
  habito.historialFases = [...(habito.historialFases ?? []), { fase: nueva, desde: hoy }];
}

// Escribe la escalera a partir de un texto (una fase por línea). Si el hábito no tenía fases, el mínimo que tuviera
// pasa a ser la primera si la lista empieza vacía.
export function ponerEscalera(habito, texto, hoy) {
  const lineas = String(texto).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!lineas.length) {
    delete habito.fases; delete habito.fase; delete habito.faseDesde; delete habito.faseNoHasta;
    return;
  }
  const antes = tieneFases(habito);
  habito.fases = lineas.map((minimo) => ({ minimo }));
  if (!antes) { habito.fase = 0; habito.faseDesde = hoy; }
  habito.fase = faseActual(habito);
  habito.minimo = habito.fases[habito.fase].minimo;
}

// Lista pegada: una línea por hábito, con los campos separados por «|»:
//   Nombre | lo mínimo | días | bloque | fases (opcional, separadas por « / »)
// Días: «todos», letras sueltas («L X V») o un tramo («L-V», «V-L»). Bloque: «construcción» o «mantenimiento».
// Con fases, la primera es el mínimo de partida.
export function leerLista(texto) {
  const salida = [];
  for (const linea of String(texto).split(/\r?\n/)) {
    const partes = linea.split('|').map((s) => s.trim());
    if (!partes[0]) continue;
    const fases = (partes[4] || '').split(' / ').map((s) => s.trim()).filter(Boolean);
    salida.push({
      nombre: partes[0],
      minimo: fases[0] || partes[1] || '',
      dias: leerDias(partes[2] || ''),
      bloque: /constru/i.test(partes[3] || '') ? 'construccion' : 'mantenimiento',
      ...(fases.length ? { fases: fases.map((minimo) => ({ minimo })) } : {}),
    });
  }
  return salida;
}

export function leerDias(texto) {
  const t = texto.trim().toUpperCase();
  if (!t || /TODOS/.test(t)) return [...TODOS_LOS_DIAS];
  const tramo = /^([LMXJVSD])\s*-\s*([LMXJVSD])$/.exec(t);
  if (tramo) {
    const a = DIAS_SEMANA.indexOf(tramo[1]);
    const b = DIAS_SEMANA.indexOf(tramo[2]);
    const dias = [];
    for (let i = a; ; i = (i + 1) % 7) { dias.push(i); if (i === b) break; }
    return dias.sort((x, y) => x - y);
  }
  const sueltos = [...new Set((t.match(/[LMXJVSD]/g) || []).map((l) => DIAS_SEMANA.indexOf(l)))];
  return sueltos.length ? sueltos.sort((x, y) => x - y) : [...TODOS_LOS_DIAS];
}

export function textoDias(dias) {
  if (!dias?.length || dias.length === 7) return 'Todos los días';
  return dias.map((d) => DIAS_SEMANA[d]).join(' ');
}
