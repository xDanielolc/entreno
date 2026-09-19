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
import { minutosDeToken, olvidarToken, pedirToken, tokenVigente } from './google-auth.js';

// 'sin-cuenta' | 'desconectada' | 'sincronizando' | 'al-dia' | 'pendiente' | 'sin-internet' | 'error'
let situacion = 'desconectada';
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
      fijar('desconectada', 'La conexión con Google ha caducado.');
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
  if (!fileId) {
    const d = estado.datos();
    const creado = await drive.crear(CONFIG.nombreArchivoDatos, d, propiedades(d));
    estado.actualizarMeta({ fileId: creado.id, revisionRemota: d.revision,
      pendiente: estado.datos().revision !== d.revision });
    return false;
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
    estado.reemplazarDatos(descargado, { fileId, revisionRemota, pendiente: migrado });
  }

  if (estado.meta().pendiente) {
    const d = estado.datos();
    const subida = d.revision;
    await drive.actualizar(fileId, d, propiedades(d));
    estado.actualizarMeta({ fileId, revisionRemota: subida,
      pendiente: estado.datos().revision !== subida });
  }
  return conflicto;
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

// El pase de Google dura una hora. Para que no «se salga de la cuenta» a
// mitad de entrenamiento, se renueva en silencio aprovechando cualquier toque
// del usuario (el navegador solo deja abrir la ventana de Google, aunque se
// cierre sola, dentro de un toque). Si Google pidiera intervención, no se
// insiste: el indicador de arriba queda en rojo y con un toque se arregla.
let ultimaRenovacion = 0;
document.addEventListener('click', () => {
  if (!estado.usuario() || estado.esSinCuenta() || !navigator.onLine) return;
  const minutos = minutosDeToken();
  if (minutos != null && minutos > 12) return;
  if (Date.now() - ultimaRenovacion < 3 * 60_000) return;
  ultimaRenovacion = Date.now();
  pedirToken({ silencioso: true, pista: estado.usuario() })
    .then(() => sincronizar())
    .catch(() => {});
}, true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    estado.guardarYa();
    if (estado.meta()?.pendiente && tokenVigente()) sincronizar();
  }
});
