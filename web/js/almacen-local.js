// Copia local en el dispositivo (IndexedDB).
//
// Es la fuente que se lee primero al abrir la app: instantánea y sin
// cobertura. Guarda un registro por usuario, así varias personas pueden
// usar el mismo móvil sin mezclar sus datos.
//
// Cada registro: { usuario, datos, meta }
//   meta.fileId           id del archivo en Drive (si ya existe)
//   meta.revisionRemota   revisión que tenía Drive la última vez que coincidimos
//   meta.pendiente        hay cambios locales que aún no están en Drive

const NOMBRE_BD = 'app-entrenamiento';
const ALMACEN = 'usuarios';
const CLAVE_ULTIMO = 'ultimoUsuario';

let conexion;

function abrir() {
  conexion ??= new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(NOMBRE_BD, 1);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN, { keyPath: 'usuario' });
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
  return conexion;
}

async function operacion(modo, fn) {
  const bd = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const peticion = fn(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(peticion?.result);
    tx.onerror = () => rechazar(tx.error);
  });
}

export function leerUsuario(usuario) {
  return operacion('readonly', (almacen) => almacen.get(usuario));
}

export function guardarUsuario(registro) {
  return operacion('readwrite', (almacen) => almacen.put(structuredClone(registro)));
}

export function borrarUsuario(usuario) {
  return operacion('readwrite', (almacen) => almacen.delete(usuario));
}

// El último usuario que abrió la app en este dispositivo.
export function ultimoUsuario() {
  try { return localStorage.getItem(CLAVE_ULTIMO); } catch { return null; }
}

export function recordarUsuario(usuario) {
  try {
    if (usuario) localStorage.setItem(CLAVE_ULTIMO, usuario);
    else localStorage.removeItem(CLAVE_ULTIMO);
  } catch { /* navegación privada: se pedirá entrar de nuevo */ }
}
