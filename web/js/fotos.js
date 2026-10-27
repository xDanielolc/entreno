// Fotos de progreso (idea de Lyfta, Dan, 27-10-2026). La lista (fecha, nota,
// id en Drive) va con los demás datos en `datos.fotos`; cada imagen, aparte:
// reducida a unos 300 KB, en el móvil (IndexedDB, «entreno-fotos») y en la
// carpeta de la app en tu Google Drive, para verlas en otro dispositivo y no
// perderlas. Solo las ves tú: la app solo puede ver lo que ella misma sube.

import * as drive from './drive.js';
import * as estado from './estado.js';
import { tokenVigente } from './google-auth.js';
import { hoyISO, nuevoId } from './ui.js';

const BD = 'entreno-fotos';
const ALMACEN = 'fotos';
const LADO_MAXIMO = 1280;
const CALIDAD = 0.82;

function abrir() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

async function operar(modo, fn) {
  const bd = await abrir();
  return new Promise((ok, mal) => {
    const tx = bd.transaction(ALMACEN, modo);
    const peticion = fn(tx.objectStore(ALMACEN));
    tx.oncomplete = () => { bd.close(); ok(peticion?.result); };
    tx.onerror = () => { bd.close(); mal(tx.error); };
  });
}

const guardarLocal = (id, blob) => operar('readwrite', (s) => s.put(blob, id));
const leerLocal = (id) => operar('readonly', (s) => s.get(id));
const borrarLocal = (id) => operar('readwrite', (s) => s.delete(id));
export const borrarTodasLocales = () => operar('readwrite', (s) => s.clear());

// La foto, girada como se hizo y reducida a 1280 px por el lado largo.
async function reducir(archivo) {
  const imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', CALIDAD));
}

export async function anadirFoto(archivo, { fecha = hoyISO(), nota = '' } = {}) {
  const blob = await reducir(archivo);
  const id = nuevoId('foto');
  await guardarLocal(id, blob);
  estado.cambiar((d) => {
    d.fotos ??= [];
    d.fotos.push({ id, fecha, nota, driveId: null, borrada: null });
  });
  subirPendientes();
  return id;
}

// La dirección para enseñarla: la del móvil o, si no está, la baja de Drive
// (y la guarda para la próxima vez). null si no se puede.
const direcciones = new Map();
export async function direccionDe(foto) {
  if (direcciones.has(foto.id)) return direcciones.get(foto.id);
  let blob = await leerLocal(foto.id).catch(() => null);
  if (!blob && foto.driveId && tokenVigente()) {
    try {
      blob = await drive.descargarBinario(foto.driveId);
      await guardarLocal(foto.id, blob);
    } catch { blob = null; }
  }
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  direcciones.set(foto.id, url);
  return url;
}

export async function borrarFoto(id) {
  estado.cambiar((d) => {
    const f = d.fotos?.find((x) => x.id === id);
    if (f) f.borrada = hoyISO();
  });
  await borrarLocal(id).catch(() => {});
  direcciones.delete(id);
  subirPendientes();
}

// Sube a Drive las que faltan y quita de Drive las borradas. Si no hay
// conexión con Google, espera a la próxima vez.
let subiendo = false;
export async function subirPendientes() {
  if (subiendo || estado.esSinCuenta() || !tokenVigente()) return;
  subiendo = true;
  try {
    for (const f of estado.datos()?.fotos ?? []) {
      if (f.borrada && f.driveId) {
        try { await drive.borrar(f.driveId); } catch (e) { if (e.estado !== 404) continue; }
        estado.cambiar((d) => { const x = d.fotos.find((y) => y.id === f.id); if (x) x.driveId = null; });
      } else if (!f.borrada && !f.driveId) {
        const blob = await leerLocal(f.id).catch(() => null);
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const r = await drive.crear(`foto-de-progreso-${f.fecha}-${f.id}.jpg`, bytes, { tipo: 'foto', fotoId: f.id }, 'image/jpeg');
        estado.cambiar((d) => { const x = d.fotos.find((y) => y.id === f.id); if (x) x.driveId = r.id; });
      }
    }
  } catch { /* sin conexión: otra vez será */ } finally {
    subiendo = false;
  }
}

// «Borrar todos mis datos»: las del móvil y las de Drive.
export async function borrarTodas(idsEnDrive = []) {
  await borrarTodasLocales().catch(() => {});
  direcciones.clear();
  for (const id of idsEnDrive) await drive.borrar(id).catch(() => {});
}
