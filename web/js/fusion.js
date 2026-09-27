// Fusión de dos copias de los datos que han cambiado a la vez: el móvil con
// cambios sin subir (sin cobertura o con el permiso de Google caducado) y el
// ordenador, que subió los suyos antes, por ejemplo.
//
// Se compara cada copia con la última versión que las dos compartían (la
// base, la última que se subió o bajó de Drive). Lo que solo ha cambiado en
// un lado se queda tal cual. Si los dos lados cambiaron lo mismo, gana el de
// este dispositivo, y quien llama guarda la otra copia aparte en Drive.
//
// Sin base (dispositivos de antes de esta versión) se juntan las dos: lo que
// esté en un solo lado se conserva, y lo que esté en los dos y no coincida
// cuenta como choque.

const COLECCIONES = ['sedes', 'ejercicios', 'rutinas', 'sesiones'];

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esObjeto = (x) => x != null && typeof x === 'object' && !Array.isArray(x);

// Devuelve { datos, choques }: los datos juntos y la lista de lo que había
// cambiado en los dos lados (vacía si no hubo nada).
export function fusionar(base, local, remoto) {
  const choques = [];
  const datos = structuredClone(remoto);
  for (const c of COLECCIONES) {
    datos[c] = fusionarLista(base ? base[c] ?? [] : null, local[c] ?? [], remoto[c] ?? [], c, choques);
  }
  datos.perfil = fusionarObjeto(base ? base.perfil ?? {} : null, local.perfil ?? {}, remoto.perfil ?? {}, 'perfil', choques);
  datos.revision = Math.max(local.revision ?? 0, remoto.revision ?? 0) + 1;
  return { datos, choques };
}

function fusionarLista(base, local, remoto, nombre, choques) {
  const porId = (lista) => new Map(lista.map((x) => [x.id, x]));
  const b = base ? porId(base) : null;
  const l = porId(local);
  const r = porId(remoto);
  // El orden de Drive, y detrás lo nuevo de aquí.
  const ids = [...new Set([...r.keys(), ...l.keys()])];
  const salida = [];
  for (const id of ids) {
    const x = elegir(b ? b.get(id) : undefined, l.get(id), r.get(id), Boolean(b), `${nombre}:${id}`, choques);
    if (x !== undefined) salida.push(x);
  }
  return salida;
}

function fusionarObjeto(base, local, remoto, nombre, choques) {
  const salida = {};
  for (const k of new Set([...Object.keys(remoto), ...Object.keys(local)])) {
    const v = elegir(base ? base[k] : undefined, local[k], remoto[k], Boolean(base), `${nombre}.${k}`, choques);
    if (v !== undefined) salida[k] = v;
  }
  return salida;
}

// undefined significa «no existe» (nunca estuvo o se borró).
function elegir(base, local, remoto, hayBase, clave, choques) {
  if (igual(local, remoto)) return local;
  // Dos objetos (el ajuste de recuperación, por ejemplo): se mira por dentro,
  // para que un músculo ajustado en el móvil y otro en el ordenador valgan los dos.
  if (esObjeto(local) && esObjeto(remoto) && (!hayBase || esObjeto(base) || base === undefined)) {
    return fusionarObjeto(hayBase ? (esObjeto(base) ? base : {}) : null, local, remoto, clave, choques);
  }
  if (!hayBase) {
    if (local === undefined) return remoto;
    if (remoto === undefined) return local;
    choques.push(clave);
    return local;
  }
  if (igual(local, base)) return remoto;   // solo cambió fuera (o se borró fuera)
  if (igual(remoto, base)) return local;   // solo cambió aquí (o se borró aquí)
  choques.push(clave);
  // Borrado en un lado y cambiado en el otro: se conserva lo cambiado.
  if (local === undefined) return remoto;
  if (remoto === undefined) return local;
  return local;
}
