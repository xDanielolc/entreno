// Estado de la app en memoria: los datos del usuario abierto.
//
// Toda modificación pasa por cambiar(). Así cada cambio sube la revisión,
// se guarda en el dispositivo y avisa a quien esté escuchando (la interfaz
// para redibujarse y la sincronización para subirlo a Drive).

import * as local from './almacen-local.js';
import { archivoNuevo, migrar, necesitaMigrar, validar } from './esquema.js';

export const USUARIO_SIN_CUENTA = 'sin-cuenta';

let registro = null;            // { usuario, datos, meta }
const oyentes = new Set();
let temporizadorGuardado = null;

export const usuario = () => registro?.usuario ?? null;
export const datos = () => registro?.datos ?? null;
export const meta = () => registro?.meta ?? null;
export const esSinCuenta = () => registro?.usuario === USUARIO_SIN_CUENTA;

// motivo: 'usuario' | 'datos' | 'tecleo' | 'datos-remotos' | 'sincronizacion'
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function emitir(motivo) {
  for (const fn of oyentes) fn(motivo);
}

export async function abrirUsuario(id, { nombre = '', correo = null } = {}) {
  let r = await local.leerUsuario(id);
  if (!r) {
    r = { usuario: id, datos: archivoNuevo({ nombre, correo }),
      meta: { fileId: null, revisionRemota: null, pendiente: true } };
  } else {
    validar(r.datos);
    if (necesitaMigrar(r.datos)) {
      r.datos = migrar(r.datos);
      r.meta.pendiente = true;
    }
  }
  if (correo && !r.datos.perfil.correo) r.datos.perfil.correo = correo;
  if (nombre && !r.datos.perfil.nombre) r.datos.perfil.nombre = nombre;
  registro = r;
  local.recordarUsuario(id);
  await local.guardarUsuario(registro);
  emitir('usuario');
}

export function cerrarUsuario() {
  guardarYa();
  registro = null;
  local.recordarUsuario(null);
  emitir('usuario');
}

// Aplica una modificación. Con { tecleo: true } no se redibuja la pantalla,
// para no quitar el foco del campo en el que se está escribiendo.
export function cambiar(fn, { tecleo = false } = {}) {
  if (!registro) throw new Error('No hay ningún usuario abierto');
  fn(registro.datos);
  registro.datos.revision += 1;
  registro.datos.actualizado = new Date().toISOString();
  registro.datos.origen = dispositivo();
  registro.meta.pendiente = true;
  programarGuardado();
  emitir(tecleo ? 'tecleo' : 'datos');
}

// Sustituye los datos por los que vienen de Drive. Se emite un motivo propio
// para que la sincronización no lo tome como un cambio que hay que subir.
export function reemplazarDatos(nuevos, nuevaMeta) {
  registro.datos = nuevos;
  Object.assign(registro.meta, nuevaMeta);
  guardarYa();
  emitir('datos-remotos');
}

export function actualizarMeta(parcial) {
  Object.assign(registro.meta, parcial);
  guardarYa();
}

function programarGuardado() {
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(guardarYa, 300);
}

export function guardarYa() {
  clearTimeout(temporizadorGuardado);
  if (registro) local.guardarUsuario(registro).catch((e) => console.error('No se pudo guardar en el dispositivo', e));
}

function dispositivo() {
  const ua = navigator.userAgent;
  return /Android/i.test(ua) ? 'android' : /iPhone|iPad/i.test(ua) ? 'ios' : 'ordenador';
}
