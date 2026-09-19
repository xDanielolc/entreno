// Modo prueba: la app sin cuenta de Google.
//
// Todo se guarda solo en el navegador de este dispositivo. Si se borran los
// datos del navegador, se desinstala la app o el móvil se estropea, se
// pierde. En cualquier momento se puede entrar con Google y pasar a la cuenta
// lo que se haya hecho en prueba (ejercicios, rutinas, sitios y entrenamientos).

import * as drive from './drive.js';
import * as estado from './estado.js';
import { pedirToken } from './google-auth.js';
import { sincronizar } from './sincronizacion.js';
import { normalizar } from './catalogo.js';
import { aviso, h, modal } from './ui.js';

export const TEXTO_AVISO = 'Estás en modo prueba: nada se guarda en tu cuenta. Todo queda solo en este navegador, así que si '
  + 'borras sus datos, desinstalas la app o se te estropea el móvil, perderás estos entrenamientos. Puedes entrar con Google '
  + 'cuando quieras y lo que hayas hecho hasta ahora se guardará en tu Drive.';

// Cartel grande al entrar en modo prueba.
export function avisarModoPrueba() {
  const cerrar = modal('Modo prueba', h('div', { class: 'aviso-prueba' },
    h('p', { class: 'grande' }, '⚠ Nada de lo que hagas se guarda en tu cuenta.'),
    h('p', {}, TEXTO_AVISO),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => cerrar() }, 'Entendido, solo probar'),
      h('button', { class: 'boton', onclick: () => { cerrar(); guardarPruebaEnCuenta(); } }, 'Entrar con Google'))));
}

// Barra fija arriba de la pantalla de inicio mientras se está en prueba.
export function barraModoPrueba() {
  return h('section', { class: 'tarjeta aviso-tarjeta aviso-prueba' },
    h('p', {}, h('strong', {}, 'Modo prueba. '), 'Nada se guarda en tu cuenta: si se borra el navegador o se estropea el móvil, '
      + 'se pierden estos entrenamientos.'),
    h('button', { class: 'boton', onclick: guardarPruebaEnCuenta }, 'Entrar con Google y guardar lo hecho'));
}

// Entra con Google y añade a la cuenta lo hecho en prueba.
export async function guardarPruebaEnCuenta() {
  const prueba = structuredClone(estado.datos());
  try {
    await pedirToken();
    const cuenta = await drive.usuarioActual();
    await estado.abrirUsuario(cuenta.emailAddress,
      { nombre: cuenta.displayName?.split(' ')[0] || '', correo: cuenta.emailAddress });
    await sincronizar();
    let resumen = null;
    estado.cambiar((datos) => { resumen = fusionar(datos, prueba); });
    await sincronizar();
    location.hash = '#/';
    const n = (x, uno, varios) => `${x} ${x === 1 ? uno : varios}`;
    const cerrar = modal('Guardado en tu cuenta', h('div', {},
      h('p', {}, `Lo que hiciste en modo prueba ya está en tu Google Drive: ${n(resumen.sesiones, 'entrenamiento', 'entrenamientos')}, `
        + `${n(resumen.ejercicios, 'ejercicio nuevo', 'ejercicios nuevos')} y ${n(resumen.rutinas, 'rutina', 'rutinas')}. `
        + 'Los ejercicios que ya tenías con el mismo nombre no se han duplicado.'),
      h('button', { class: 'boton', onclick: () => cerrar() }, 'Entendido')));
  } catch (e) {
    aviso(`No se ha podido entrar con Google: ${e.message}`, { tipo: 'error', ms: 8000 });
  }
}

// Añade a `datos` (la cuenta) lo de `prueba` que aún no tenga. Un ejercicio
// que ya exista con el mismo nombre y sitio se usa en vez de duplicarlo.
export function fusionar(datos, prueba) {
  const resumen = { ejercicios: 0, rutinas: 0, sesiones: 0 };
  const cambioId = new Map();
  const clave = (e) => `${normalizar(e.nombre)}|${e.sedeId ?? ''}`;
  const existentes = new Map(datos.ejercicios.map((e) => [clave(e), e]));
  const ids = new Set(datos.ejercicios.map((e) => e.id));

  for (const sede of prueba.sedes || []) {
    if (!datos.sedes.some((s) => s.id === sede.id)) datos.sedes.push(sede);
  }
  for (const ej of prueba.ejercicios) {
    if (ids.has(ej.id)) continue;
    const igual = existentes.get(clave(ej));
    if (igual) { cambioId.set(ej.id, igual.id); continue; }
    datos.ejercicios.push(ej);
    resumen.ejercicios += 1;
  }
  const nuevoId = (id) => cambioId.get(id) ?? id;
  for (const rutina of prueba.rutinas) {
    if (datos.rutinas.some((r) => r.id === rutina.id)) continue;
    for (const dia of rutina.dias) for (const item of dia.ejercicios) item.ejercicioId = nuevoId(item.ejercicioId);
    datos.rutinas.push(rutina);
    resumen.rutinas += 1;
  }
  for (const sesion of prueba.sesiones) {
    if (datos.sesiones.some((s) => s.id === sesion.id)) continue;
    for (const entrada of sesion.ejercicios) entrada.ejercicioId = nuevoId(entrada.ejercicioId);
    datos.sesiones.push(sesion);
    resumen.sesiones += 1;
  }
  return resumen;
}
