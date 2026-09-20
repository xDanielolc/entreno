import * as drive from '../drive.js';
import * as estado from '../estado.js';
import { pedirToken } from '../google-auth.js';
import { sincronizar } from '../sincronizacion.js';
import { anadir, aviso, h, modal } from '../ui.js';
import * as local from '../almacen-local.js';
import { avisarModoPrueba } from '../modo-prueba.js';
import { tarjetaInstalar } from './instalar.js';

export function vistaBienvenida(contenedor) {
  let ocupado = false;

  async function entrarConGoogle(boton) {
    if (ocupado) return;
    ocupado = true;
    boton.disabled = true;
    boton.textContent = 'Conectando…';
    try {
      await pedirToken();
      const cuenta = await drive.usuarioActual();
      await estado.abrirUsuario(cuenta.emailAddress,
        { nombre: cuenta.displayName?.split(' ')[0] || '', correo: cuenta.emailAddress });
      await sincronizar();
      location.hash = '#/';
    } catch (e) {
      aviso(e.message, { tipo: 'error', ms: 6000 });
      boton.disabled = false;
      boton.textContent = 'Entrar con Google';
    } finally {
      ocupado = false;
    }
  }

  async function probarSinCuenta() {
    // Si quedó una prueba anterior en este dispositivo, se elige.
    const anterior = await local.leerUsuario(estado.USUARIO_SIN_CUENTA);
    const conDatos = anterior && (anterior.datos.sesiones.length || anterior.datos.ejercicios.length);
    if (conDatos) {
      const cerrar = modal('Ya hay una prueba anterior', h('div', {},
        h('p', {}, `En este dispositivo quedó una prueba con ${anterior.datos.ejercicios.length} ejercicios y ${anterior.datos.sesiones.length} entrenamientos.`),
        h('div', { class: 'fila-botones' },
          h('button', { class: 'boton secundario', onclick: async () => { cerrar(); await local.borrarUsuario(estado.USUARIO_SIN_CUENTA); await abrirPrueba(); } }, 'Empezar de cero'),
          h('button', { class: 'boton', onclick: async () => { cerrar(); await abrirPrueba(); } }, 'Continuar la prueba'))));
      return;
    }
    await abrirPrueba();
  }

  async function abrirPrueba() {
    await estado.abrirUsuario(estado.USUARIO_SIN_CUENTA);
    location.hash = '#/';
    avisarModoPrueba();
  }

  const botonGoogle = h('button', { class: 'boton grande', onclick: () => entrarConGoogle(botonGoogle) },
    'Entrar con Google');

  anadir(contenedor,
    h('section', { class: 'bienvenida' },
      h('div', { class: 'logo', 'aria-hidden': 'true' }, '🏋️'),
      h('h1', {}, 'App de entrenamiento'),
      h('p', { class: 'suave' },
        'Registra tus series, sigue tu progresión y lleva tus rutinas contigo, también sin cobertura.'),
      botonGoogle,
      h('p', { class: 'nota' },
        'Tus datos se guardan en tu propio Google Drive, en una carpeta que crea la app. ',
        'La app no puede ver nada más de tu Drive. ',
        h('a', { href: 'privacidad.html', target: '_blank', rel: 'noopener' }, 'Política de privacidad'), '.'),
      h('button', { class: 'boton enlace', onclick: probarSinCuenta }, 'Probar sin cuenta (no se guarda en ninguna cuenta)')),
    tarjetaInstalar());
}
