// Acceso a Google Drive (API REST v3).
//
// Con el permiso drive.file la app solo ve los archivos que ella misma ha
// creado. Todo lo demás del Drive del usuario es invisible para ella.
//
// La revisión de los datos se guarda también en las propiedades del archivo
// (appProperties), para saber si Drive tiene algo más nuevo sin descargarlo.

import { tokenVigente } from './google-auth.js';

const API = 'https://www.googleapis.com/drive/v3';
const API_SUBIDA = 'https://www.googleapis.com/upload/drive/v3';
const TIPO_CARPETA = 'application/vnd.google-apps.folder';
const NOMBRE_CARPETA = 'App de entrenamiento';

export class ErrorDrive extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = 'ErrorDrive';
    this.estado = estado;           // 401 = hay que volver a conectar
  }
}

async function peticion(url, opciones = {}) {
  const token = tokenVigente();
  if (!token) throw new ErrorDrive('Sin conexión con Google', 401);
  let respuesta;
  try {
    respuesta = await fetch(url, {
      ...opciones,
      headers: { Authorization: `Bearer ${token}`, ...(opciones.headers || {}) },
    });
  } catch {
    throw new ErrorDrive('Sin conexión a internet', 0);
  }
  if (!respuesta.ok) {
    let detalle = '';
    try { detalle = (await respuesta.json()).error?.message || ''; } catch { /* nada */ }
    throw new ErrorDrive(`Drive respondió ${respuesta.status} ${detalle}`.trim(), respuesta.status);
  }
  return respuesta;
}

function escaparConsulta(texto) {
  return texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function usuarioActual() {
  const r = await peticion(`${API}/about?fields=user(emailAddress,displayName)`);
  return (await r.json()).user;
}

async function buscar(consulta) {
  const q = encodeURIComponent(`${consulta} and trashed = false`);
  const campos = encodeURIComponent('files(id,name,appProperties,modifiedTime)');
  const r = await peticion(`${API}/files?q=${q}&fields=${campos}&orderBy=modifiedTime desc&spaces=drive`);
  return (await r.json()).files;
}

async function carpetaDeLaApp() {
  const existentes = await buscar(`name = '${NOMBRE_CARPETA}' and mimeType = '${TIPO_CARPETA}'`);
  if (existentes.length) return existentes[0].id;
  const r = await peticion(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: NOMBRE_CARPETA, mimeType: TIPO_CARPETA }),
  });
  return (await r.json()).id;
}

export async function buscarArchivo(nombre) {
  const [archivo] = await buscar(`name = '${escaparConsulta(nombre)}' and mimeType = 'application/json'`);
  return archivo || null;
}

export async function metadatos(id) {
  const r = await peticion(`${API}/files/${id}?fields=id,name,appProperties,modifiedTime,trashed`);
  return r.json();
}

export async function descargar(id) {
  const r = await peticion(`${API}/files/${id}?alt=media`);
  return r.json();
}

// contenido: un objeto (se guarda como JSON) o un texto ya hecho (CSV…).
function cuerpoMultiparte(metadatosArchivo, contenido, mime = 'application/json') {
  const limite = `limite${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  const texto = typeof contenido === 'string' ? contenido : JSON.stringify(contenido);
  const cuerpo =
    `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadatosArchivo)}\r\n` +
    `--${limite}\r\nContent-Type: ${mime}; charset=UTF-8\r\n\r\n` +
    `${texto}\r\n--${limite}--`;
  return { cuerpo, tipo: `multipart/related; boundary=${limite}` };
}

export async function crear(nombre, contenido, propiedades = {}, mime = 'application/json') {
  const padre = await carpetaDeLaApp();
  const { cuerpo, tipo } = cuerpoMultiparte(
    { name: nombre, mimeType: mime, parents: [padre], appProperties: propiedades }, contenido, mime);
  const r = await peticion(`${API_SUBIDA}/files?uploadType=multipart&fields=id,appProperties`, {
    method: 'POST', headers: { 'Content-Type': tipo }, body: cuerpo,
  });
  return r.json();
}

export async function actualizar(id, contenido, propiedades = {}, mime = 'application/json') {
  const { cuerpo, tipo } = cuerpoMultiparte({ appProperties: propiedades }, contenido, mime);
  const r = await peticion(`${API_SUBIDA}/files/${id}?uploadType=multipart&fields=id,appProperties`, {
    method: 'PATCH', headers: { 'Content-Type': tipo }, body: cuerpo,
  });
  return r.json();
}

// Un archivo cualquiera de la app por su nombre (CSV incluidos).
export async function buscarPorNombre(nombre) {
  const [archivo] = await buscar(`name = '${escaparConsulta(nombre)}'`);
  return archivo || null;
}

// Todo lo que la app ha creado en Drive: archivos y su carpeta.
export async function listarTodo() {
  const campos = encodeURIComponent('files(id,name,mimeType)');
  const r = await peticion(`${API}/files?q=${encodeURIComponent('trashed = false')}&fields=${campos}&pageSize=200&spaces=drive`);
  return (await r.json()).files;
}

// Borrado definitivo (no va a la papelera de Drive).
export async function borrar(id) {
  await peticion(`${API}/files/${id}`, { method: 'DELETE' });
}
