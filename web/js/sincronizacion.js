// Sincronización entre la copia del dispositivo y Google Drive.
//
// Reglas (docs/esquema-datos.md, sección 10):
//   - Siempre se trabaja sobre la copia local; Drive es la copia de seguridad
//     compartida entre dispositivos.
//   - Si Drive tiene una revisión más nueva que la última conocida, se descarga.
//   - Si además había cambios locales sin subir, antes de sustituirlos se
//     guarda una copia de ellos en Drive. Nunca se pierde nada en silencio.
//   - Antes de migrar un archivo de una versión antigua, se guarda una copia.

import { CONFIG } from './config.js';
import * as drive from './drive.js';
import { migrar, necesitaMigrar, validar } from './esquema.js';
import * as estado from './estado.js';
import { completarDesdeCatalogo } from './catalogo.js';
import { minutosDeToken, olvidarToken, pedirToken, tokenVigente } from './google-auth.js';
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
      conflicto ? 'Había cambios en dos sitios: se ha guardado una copia en Drive.' : '');
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
    const creado = await drive.crear(CONFIG.nombreArchivoDatos, d, propiedades(d));
    estado.actualizarMeta({ fileId: creado.id, revisionRemota: d.revision,
      pendiente: estado.datos().revision !== d.revision });
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
    const local = estado.datos();
    const localVacio = !local.ejercicios.length && !local.sesiones.length;

    if (meta.pendiente && !localVacio) {
      await drive.crear(`entrenamiento-conflicto-${marcaTiempo()}.json`, local, { copia: 'conflicto' });
      conflicto = true;
    }
    let migrado = false;
    if (necesitaMigrar(descargado)) {
      await drive.crear(`entrenamiento-v${descargado.version}-copia-${marcaTiempo()}.json`,
        descargado, { copia: 'migracion' });
      descargado = migrar(descargado);
      migrado = true;
    }
    if (completarDesdeCatalogo(descargado) > 0) migrado = true;
    estado.reemplazarDatos(descargado, { fileId, revisionRemota, pendiente: migrado });
  }

  if (estado.meta().pendiente) {
    const d = estado.datos();
    const subida = d.revision;
    await drive.actualizar(fileId, d, propiedades(d));
    estado.actualizarMeta({ fileId, revisionRemota: subida,
      pendiente: estado.datos().revision !== subida });
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

// El pase de Google dura una hora. Renovarlo obliga a abrir la ventana de
// Google, aunque no pida nada: en el móvil sale un parpadeo y el navegador
// la bloquea si no viene de un toque. Así que la app NO la abre nunca sola.
// Cuando al pase le quedan quince minutos, sale un cartel con un botón; el
// toque en ese botón es lo que permite abrir la ventana sin que la bloqueen.
let ultimoAvisoPase = 0;

function tocaAvisar() {
  if (!estado.usuario() || estado.esSinCuenta() || !navigator.onLine) return false;
  const minutos = minutosDeToken();
  if (minutos == null || minutos > 15) return false;
  return Date.now() - ultimoAvisoPase >= 10 * 60_000;
}

async function renovarPase() {
  try {
    await pedirToken({ silencioso: true, forzar: true, pista: estado.usuario() });
    await sincronizar();
    const { aviso } = await import('./ui.js');
    aviso('Permiso renovado: otra hora por delante.');
  } catch {
    const { aviso } = await import('./ui.js');
    aviso('Google no ha dejado renovar el permiso. Se reintenta con el indicador de arriba.', { tipo: 'error' });
  }
}

async function avisarDelPase() {
  ultimoAvisoPase = Date.now();
  const minutos = Math.max(0, Math.round(minutosDeToken() ?? 0));
  const { aviso } = await import('./ui.js');
  aviso(`El permiso de Google caduca en ${minutos} min. Mientras tanto se sigue guardando en el móvil.`,
    { accion: { texto: 'Renovar', fn: renovarPase } });
}

// El aviso sale al volver a la app, no a mitad de una serie.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    estado.guardarYa();
    if (estado.meta()?.pendiente && tokenVigente()) sincronizar();
    return;
  }
  if (tocaAvisar()) avisarDelPase();
});
window.addEventListener('focus', () => { if (tocaAvisar()) avisarDelPase(); });
