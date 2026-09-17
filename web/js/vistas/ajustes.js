import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { desconectar, sincronizar, situacionActual } from '../sincronizacion.js';
import { VERSION_APP } from '../version.js';
import { anadir, confirmar, h, hoyISO, leerNumero } from '../ui.js';

export function vistaAjustes(contenedor) {
  const d = estado.datos();
  const sinCuenta = estado.esSinCuenta();
  const { situacion, detalle } = situacionActual();

  function descargarCopia() {
    const blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `entrenamiento-copia-${hoyISO()}.json`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  }

  async function salir() {
    const aviso = sinCuenta
      ? '¿Salir? Los datos de prueba se quedan en este dispositivo y los verás si vuelves a «Probar sin cuenta».'
      : estado.meta().pendiente
        ? 'Hay cambios que aún no se han subido a Drive. Se quedan guardados en este dispositivo y se subirán la próxima vez que entres. ¿Salir?'
        : '¿Salir de la cuenta en este dispositivo?';
    if (!await confirmar(aviso, { si: 'Salir' })) return;
    desconectar();
    estado.cerrarUsuario();
    location.hash = '#/';
  }

  anadir(contenedor,
    h('h1', {}, 'Ajustes'),

    h('section', { class: 'tarjeta formulario' },
      h('h2', {}, 'Perfil'),
      h('label', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Nombre'),
        h('input', { type: 'text', value: d.perfil.nombre || '',
          oninput: (e) => estado.cambiar((x) => { x.perfil.nombre = e.target.value.trim(); }, { tecleo: true }) })),
      h('label', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Peso corporal (kg)'),
        h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.pesoCorporalKg ?? '',
          oninput: (e) => estado.cambiar((x) => { x.perfil.pesoCorporalKg = leerNumero(e.target.value); }, { tecleo: true }) }),
        h('small', { class: 'nota' },
          'Se usa en las máquinas asistidas (dominadas, fondos): la carga real es tu peso menos la ayuda de la máquina. ',
          'Cambiarlo no altera las series ya guardadas.'))),

    h('section', { class: 'tarjeta' },
      h('h2', {}, 'Cuenta y copia de seguridad'),
      sinCuenta
        ? h('p', {}, 'Estás probando sin cuenta: los datos solo están en este dispositivo y se pierden si borras los datos del navegador.')
        : [
          h('p', {}, 'Conectado como ', h('strong', {}, estado.usuario())),
          h('p', { class: 'suave' }, textoSituacion(situacion), detalle && ` ${detalle}`),
          h('button', { class: 'boton secundario', onclick: () => sincronizar({ interactivo: true }) }, 'Sincronizar ahora'),
        ],
      h('button', { class: 'boton secundario', onclick: descargarCopia }, 'Descargar una copia de mis datos'),
      h('button', { class: 'boton enlace', onclick: salir }, sinCuenta ? 'Salir del modo de prueba' : 'Salir de la cuenta')),

    h('p', { class: 'nota centrado' },
      `Versión ${VERSION_APP} · formato de datos v${d.version} · revisión ${formatearNumero(d.revision)}`));
}

export function textoSituacion(situacion) {
  return {
    'sin-cuenta': 'Solo en este dispositivo.',
    desconectada: 'Sin conectar con Google.',
    sincronizando: 'Guardando en Drive…',
    'al-dia': 'Todo guardado en Drive.',
    pendiente: 'Hay cambios sin subir a Drive.',
    'sin-internet': 'Sin internet: se subirá al recuperar la conexión.',
    error: 'No se ha podido guardar en Drive.',
  }[situacion] ?? '';
}
