// Sincronización entre la copia del dispositivo y Google Drive.
//
// Reglas (docs/esquema-datos.md, sección 10):
//   - Siempre se trabaja sobre la copia local; Drive es la copia de seguridad
//     compartida entre dispositivos.
//   - Si Drive tiene una revisión más nueva que la última conocida, se descarga.
//   - Si además había cambios locales sin subir, antes de sustituirlos se
//     guarda una copia de ellos en Drive. Nunca se pierde nada en silencio.
//   - Antes de migrar un archivo de una versión antigua, se guarda una copia.

import { fusionar } from './fusion.js';
import { CONFIG } from './config.js';
import * as drive from './drive.js';
import { migrar, necesitaMigrar, validar } from './esquema.js';
import * as estado from './estado.js';
import { completarDesdeCatalogo } from './catalogo.js';
import { hayPase, minutosDeToken, olvidarToken, pedirToken, renovarConPase, tokenVigente } from './google-auth.js';
import { NOMBRES_CSV, csvEjerciciosYRutinas, csvEntrenamientos } from './exportar.js';
import * as local from './almacen-local.js';

// 'sin-cuenta' | 'desconectada' | 'sincronizando' | 'al-dia' | 'pendiente' | 'sin-internet' | 'error'
let situacion = 'desconectada';
let ordenado = false;
let detalle = '';
let enCurso = null;
let temporizador = null;

export function situacionActual() {
  if (estado.esSinCuenta()) return { situacion: 'sin-cuenta', detalle: '' };
  return { situacion, detalle };
}

function fijar(nueva, texto = '') {
  situacion = nueva;
  detalle = texto;
  estado.emitir('sincronizacion');
}

export function programar(ms = 3000) {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => sincronizar(), ms);
}

// interactivo: la llamada viene de un toque del usuario, así que se puede
// abrir la ventana de Google si hace falta.
export function sincronizar({ interactivo = false } = {}) {
  enCurso ??= ejecutar(interactivo).finally(() => { enCurso = null; });
  return enCurso;
}

export function desconectar() {
  olvidarToken();
  fijar('desconectada');
}

async function ejecutar(interactivo) {
  if (!estado.usuario()) return;
  if (estado.esSinCuenta()) return fijar('sin-cuenta');
  if (!navigator.onLine) return fijar('sin-internet');

  // Con el renovador, el permiso caducado se renueva solo, sin ventanas.
  if (!tokenVigente() && hayPase()) await renovarConPase();
  if (!tokenVigente()) {
    if (!interactivo) {
      return fijar(estado.meta().pendiente ? 'pendiente' : 'desconectada');
    }
    try {
      await pedirToken({ pista: estado.usuario() });
    } catch (e) {
      return fijar('desconectada', e.message);
    }
  }

  fijar('sincronizando');
  try {
    const conflicto = await sincronizarArchivo();
    fijar(estado.meta().pendiente ? 'pendiente' : 'al-dia',
      conflicto ? 'Había cambios en dos sitios y se han juntado. Donde no cuadraban, manda lo de este dispositivo; lo de Drive queda en una copia.' : '');
    if (estado.meta().pendiente) programar(1000);
  } catch (e) {
    console.error(e);
    if (e.estado === 401) {
      olvidarToken();
      fijar('desconectada', 'La conexión con Google ha caducado: toca el indicador de arriba o desliza hacia abajo para recargar.');
    } else if (e.estado === 0) {
      fijar('sin-internet');
    } else {
      fijar('error', e.message);
    }
  }
}

async function sincronizarArchivo() {
  const meta = estado.meta();
  let { fileId } = meta;
  let remoto = null;

  if (fileId) {
    try {
      remoto = await drive.metadatos(fileId);
      if (remoto.trashed) { fileId = null; remoto = null; }
    } catch (e) {
      if (e.estado !== 404) throw e;
      fileId = null;
    }
  }
  if (!fileId) {
    remoto = await drive.buscarArchivo(CONFIG.nombreArchivoDatos);
    fileId = remoto?.id ?? null;
  }

  // Primera vez: no hay nada en Drive, se sube lo que haya en el dispositivo.
  // Si este dispositivo ya conocía un archivo y ha desaparecido (borrado
  // desde otro dispositivo con «Borrar todos mis datos» o «Eliminar mi
  // cuenta»), se pregunta antes de volver a subir lo de aquí.
  if (!fileId) {
    if (meta.fileId && (estado.datos().sesiones.length || estado.datos().ejercicios.length)) {
      const subir = await preguntarArchivoDesaparecido();
      if (!subir) {
        estado.vaciarDatos();
        estado.actualizarMeta({ fileId: null, revisionRemota: null });
      }
    }
    const d = estado.datos();
    const copia = structuredClone(d);
    const creado = await drive.crear(CONFIG.nombreArchivoDatos, copia, propiedades(copia));
    estado.actualizarMeta({ fileId: creado.id, revisionRemota: copia.revision, base: copia,
      pendiente: estado.datos().revision !== copia.revision });
    return false;
  }

  // Una vez por sesión de la app, se comprueba que todo esté en la carpeta.
  if (!ordenado) {
    ordenado = true;
    drive.ordenarCarpeta().catch(() => { ordenado = false; });
  }
  const revisionRemota = Number(remoto.appProperties?.revision ?? -1);
  const conocida = meta.fileId === fileId ? meta.revisionRemota : null;
  let conflicto = false;

  if (conocida == null || revisionRemota > conocida) {
    let descargado = validar(await drive.descargar(fileId));
    let migrado = false;
    if (necesitaMigrar(descargado)) {
      await drive.crear(`entrenamiento-v${descargado.version}-copia-${marcaTiempo()}.json`,
        descargado, { copia: 'migracion' });
      descargado = migrar(descargado);
      migrado = true;
    }
    if (completarDesdeCatalogo(descargado) > 0) migrado = true;
    const local = estado.datos();
    const localVacio = !local.ejercicios.length && !local.sesiones.length;

    if (meta.pendiente && !localVacio) {
      // Cambios aquí y en Drive a la vez: se juntan. Antes ganaba siempre
      // Drive y lo de aquí solo quedaba en una copia aparte.
      const { datos: juntos, choques } = fusionar(meta.base ?? null, local, descargado);
      if (choques.length) {
        // Lo que había cambiado en los dos sitios se queda como aquí; la
        // versión de Drive se guarda aparte, por si acaso.
        await drive.crear(`entrenamiento-conflicto-${marcaTiempo()}.json`, descargado, { copia: 'conflicto' });
        conflicto = true;
      }
      estado.reemplazarDatos(juntos, { fileId, revisionRemota, pendiente: true, base: structuredClone(descargado) });
    } else {
      estado.reemplazarDatos(descargado, { fileId, revisionRemota, pendiente: migrado, base: structuredClone(descargado) });
    }
  }

  if (estado.meta().pendiente) {
    const copia = structuredClone(estado.datos());
    await drive.actualizar(fileId, copia, propiedades(copia));
    estado.actualizarMeta({ fileId, revisionRemota: copia.revision, base: copia,
      pendiente: estado.datos().revision !== copia.revision });
  }
  await subirCopiasLegibles();
  return conflicto;
}

// Las dos hojas legibles se rehacen como mucho cada media hora, y solo si
// los datos han cambiado desde la última vez.
const MEDIA_HORA = 30 * 60_000;
async function subirCopiasLegibles({ forzar = false } = {}) {
  const meta = estado.meta();
  const d = estado.datos();
  if (!forzar && (meta.csvRevision === d.revision || Date.now() - (meta.csvHora ?? 0) < MEDIA_HORA)) return;
  const ids = { ...(meta.csvIds || {}) };
  const hojas = { entrenamientos: csvEntrenamientos(d), ejercicios: csvEjerciciosYRutinas(d) };
  for (const [clave, texto] of Object.entries(hojas)) {
    const nombre = NOMBRES_CSV[clave];
    try {
      if (ids[clave]) {
        await drive.actualizar(ids[clave], texto, {}, 'text/csv');
      } else {
        const existente = await drive.buscarPorNombre(nombre);
        if (existente) { await drive.actualizar(existente.id, texto, {}, 'text/csv'); ids[clave] = existente.id; }
        else ids[clave] = (await drive.crear(nombre, texto, { copia: 'legible' }, 'text/csv')).id;
      }
    } catch (e) {
      if (e.estado === 404) { delete ids[clave]; continue; }
      throw e;
    }
  }
  estado.actualizarMeta({ csvIds: ids, csvRevision: d.revision, csvHora: Date.now() });
}

export function rehacerCopiasLegibles() {
  return subirCopiasLegibles({ forzar: true });
}

// Borra en Drive todo lo que creó la app (datos, copias, hojas y carpeta),
// retira el permiso y quita la copia del dispositivo. Devuelve cuántos
// archivos ha borrado. Se llama desde Ajustes, con varias confirmaciones.
export async function eliminarCuenta() {
  const usuario = estado.usuario();
  let borrados = 0;
  if (!estado.esSinCuenta()) {
    await pedirToken({ silencioso: true, pista: usuario });
    const archivos = await drive.listarTodo();
    // Primero los archivos y al final las carpetas.
    archivos.sort((a, b) => (a.mimeType.includes('folder') ? 1 : 0) - (b.mimeType.includes('folder') ? 1 : 0));
    for (const a of archivos) {
      try { await drive.borrar(a.id); borrados += 1; } catch (e) { if (e.estado !== 404) throw e; }
    }
    olvidarToken({ revocar: true });
  }
  estado.cerrarUsuario();
  await local.borrarUsuario(usuario);
  fijar('desconectada');
  return borrados;
}

async function preguntarArchivoDesaparecido() {
  const { h, modal } = await import('./ui.js');
  return new Promise((resolver) => {
    const cerrar = modal('Tus datos de Google Drive han desaparecido', h('div', {},
      h('p', {}, 'Seguramente los borraste desde otro dispositivo con «Borrar todos mis datos» o «Eliminar mi cuenta». '
        + 'Este dispositivo aún tiene una copia. ¿Qué hacemos con ella?'),
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton secundario peligro-texto', onclick: () => { cerrar(); resolver(false); } }, 'Vaciar este dispositivo también'),
        h('button', { class: 'boton', onclick: () => { cerrar(); resolver(true); } }, 'Subir esta copia a Drive'))));
  });
}

function propiedades(d) {
  return { revision: String(d.revision), version: String(d.version) };
}

function marcaTiempo() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

// Subir los cambios poco después de hacerlos, y al recuperar la conexión.
estado.suscribir((motivo) => {
  if (motivo === 'datos' || motivo === 'tecleo') programar(motivo === 'tecleo' ? 4000 : 1500);
});
window.addEventListener('online', () => programar(500));

// El pase de Google dura una hora y, sin un servidor propio, no se puede
// alargar sin abrir un instante la ventana de Google; el navegador solo lo
// deja si viene de un toque. Así que no hay avisos: se renueva solo cuando
// tocas algo que de todas formas conviene guardar (Empezar y Terminar
// entrenamiento). Mientras tanto todo se guarda en el móvil.
export function renovarAlTocar() {
  if (!estado.usuario() || estado.esSinCuenta() || !navigator.onLine) return;
  if (hayPase()) { if (!tokenVigente()) renovarConPase().then(() => sincronizar()); return; }
  const minutos = minutosDeToken();
  if (minutos != null && minutos > 20) return;
  pedirToken({ silencioso: true, forzar: true, pista: estado.usuario() })
    .then(() => sincronizar())
    .catch(() => { /* el indicador de arriba sigue sirviendo para reintentar */ });
}

// Al salir de la app se guarda en el móvil y, si hay pase, se sube.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    estado.guardarYa();
    if (estado.meta()?.pendiente && tokenVigente()) sincronizar();
  } else if (estado.meta()?.pendiente && tokenVigente()) {
    sincronizar();
  }
});

// Copias que la app ha guardado aparte en Drive (conflictos y migraciones),
// de la más nueva a la más vieja.
export async function copiasAparte() {
  const todo = await drive.listarTodo();
  return todo.filter((f) => /^entrenamiento-(conflicto|v\d+-copia)-.*\.json$/.test(f.name) && f.appProperties?.juntada !== 'si')
    .sort((a, b) => b.name.localeCompare(a.name));
}

// Quita una copia de la lista sin juntarla (sigue en Drive).
export async function apartarCopia(id) {
  await drive.marcar(id, { juntada: 'si' });
}

// Junta una copia con los datos de ahora: todo lo que esté en una sola se
// añade (entrenamientos, ejercicios, ajustes…). Si un mismo entrenamiento o
// ajuste está en las dos y no coincide, se queda el de la copia, que es lo
// que se quiere recuperar. Después la copia se marca como juntada y deja de
// salir en la lista (sigue en Drive, por si acaso).
export async function juntarCopia(id) {
  let copia = validar(await drive.descargar(id));
  if (necesitaMigrar(copia)) copia = migrar(copia);
  const ahora = estado.datos();
  const { datos } = fusionar(null, copia, ahora);
  datos.revision = Math.max(ahora.revision, copia.revision ?? 0) + 1;
  estado.reemplazarDatos(datos, { pendiente: true });
  await drive.marcar(id, { juntada: 'si' }).catch(() => {});
  programar(500);
}
