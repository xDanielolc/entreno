// Hábitos (esquema v41): la lista de hábitos (`habitos[]`) y lo que contestaste cada día (`registroHabitos[]`).
// Aquí solo hay cuentas y datos; la pantalla está en `vistas/habitos.js`.
//
// - Un hábito: { id, nombre, minimo, dias: [0-6] (0 = lunes), bloque: 'construccion' | 'mantenimiento', orden,
//   desde: 'AAAA-MM-DD' (antes de ese día no cuenta), borrado?: true }. Borrar es blando, para no perder el historial.
// - Un día: { id: 'rh_AAAA-MM-DD', fecha, r: { [idHabito]: 'si' | 'no' } }. El id sale de la fecha, así que el móvil
//   y el ordenador escriben en el mismo registro y la fusión junta las respuestas hábito a hábito.

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

export function respuestasDe(datos, fecha) {
  return (datos.registroHabitos ?? []).find((x) => x.fecha === fecha)?.r ?? {};
}

// valor: 'si', 'no' o null (quitar la respuesta).
export function responder(datos, fecha, idHabito, valor) {
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
  const r = respuestasDe(datos, fecha);
  return delDia(datos, fecha).filter((x) => !r[x.id]);
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
  const lista = habitosActivos(datos);
  for (const x of lista) porHabito.set(x.id, { posibles: 0, si: 0, no: 0, vacio: 0 });
  const fin = hasta < hoy ? hasta : hoy;
  for (let f = desde; f <= fin; f = sumarDias(f, 1)) {
    const r = respuestasDe(datos, f);
    for (const x of lista) {
      if (!toca(x, f)) continue;
      const c = porHabito.get(x.id);
      const v = r[x.id] === 'si' ? 'si' : r[x.id] === 'no' ? 'no' : 'vacio';
      c.posibles++; c[v]++;
      total.posibles++; total[v]++;
    }
  }
  return { total, porHabito };
}

export const porcentaje = (c) => (c.posibles ? Math.round((100 * c.si) / c.posibles) : null);

// Lista pegada: una línea por hábito, con los campos separados por «|»:
//   Nombre | lo mínimo | días | bloque
// Días: «todos», letras sueltas («L X V») o un tramo («L-V», «V-L»). Bloque: «construcción» o «mantenimiento».
export function leerLista(texto) {
  const salida = [];
  for (const linea of String(texto).split(/\r?\n/)) {
    const partes = linea.split('|').map((s) => s.trim());
    if (!partes[0]) continue;
    salida.push({
      nombre: partes[0],
      minimo: partes[1] || '',
      dias: leerDias(partes[2] || ''),
      bloque: /constru/i.test(partes[3] || '') ? 'construccion' : 'mantenimiento',
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
