// Página de prueba (#/prueba-botones): cuatro formas de ordenar los botones
// de abajo del entrenamiento, simuladas con los estilos de verdad, para que
// Dan las pruebe en el móvil y en el ordenador y elija. No sale en ningún menú.
import { anadir, aviso, h, modal } from '../ui.js';
import { icono } from '../iconos.js';

const EJERCICIOS = ['Press de banca', 'Remo con barra', 'Press militar', 'Dominadas negativas', 'Curl martillo', 'Elevaciones laterales'];
const OPCIONES = {
  A: { nombre: 'Barra fija abajo', explica: 'Como Hevy y Strong: una barra pegada encima de las pestañas con ‹ y «Siguiente». Todo lo demás, en «⋯».' },
  B: { nombre: 'Menú ⋯ arriba', explica: 'Como Lyfta: terminar, comentario, ver todos y cancelar en un «⋯» arriba a la derecha. Abajo solo ‹ y «Siguiente».' },
  C: { nombre: 'Terminar al final', explica: '«Terminar» solo sale en el último ejercicio, donde estaba «Siguiente». Comentario y cancelar, iconos pequeños arriba.' },
  D: { nombre: 'Deslizar', explica: 'Como un carrusel: deslizas el dedo para cambiar de ejercicio. Abajo, puntitos y «⋯».' },
};

export function vistaPruebaBotones(contenedor) {
  let opcion = 'A';
  let pos = 0;
  const zona = h('div', { class: 'simulacion' });

  const hoja = () => {
    const cerrar = modal('Más opciones', h('div', { class: 'lista-selector' },
      [['Ver todos los ejercicios', 'ojo'], ['Comentario del entrenamiento', 'bocadillo'], ['+ Añadir ejercicio', null],
        ['Terminar entrenamiento', 'reloj'], ['Cancelar entrenamiento', 'cerrar']].map(([t, i]) => h('button', {
        type: 'button', class: `boton-marca${t.startsWith('Cancelar') ? ' peligro-texto' : ''}`,
        onclick: () => { cerrar(); aviso(`(simulación) ${t}`); } }, i && icono(i), ' ', t))));
  };
  const ir = (k) => { pos = Math.max(0, Math.min(EJERCICIOS.length - 1, pos + k)); pintar(); };
  const ultimo = () => pos === EJERCICIOS.length - 1;

  function tarjeta() {
    return h('article', { class: 'tarjeta sim-tarjeta' },
      h('h2', {}, EJERCICIOS[pos]),
      h('p', { class: 'sugerencia' }, 'Hoy 90 kg × 4 dejando 2 en recámara'),
      h('div', { class: 'serie-valores' }, ['kg', 'reps', 'Recámara'].map((et, k) => h('label', { class: 'valor' },
        h('span', { class: 'et' }, et), h('input', { type: 'text', inputmode: 'decimal', value: ['90', '', '2'][k] })))),
      h('button', { type: 'button', class: 'boton secundario' }, '+ Serie'));
  }
  const siguiente = (texto = 'Siguiente ›') => (ultimo()
    ? h('button', { type: 'button', class: 'boton grande', onclick: () => aviso('(simulación) Terminar entrenamiento') }, 'Terminar ✓')
    : h('button', { type: 'button', class: 'boton grande boton-siguiente', onclick: () => ir(1) },
      h('span', {}, texto), h('small', {}, EJERCICIOS[pos + 1])));
  const atras = () => h('button', { type: 'button', class: 'boton secundario boton-paso-grande', disabled: pos === 0, onclick: () => ir(-1) }, '‹');
  const anadirEj = () => h('button', { type: 'button', class: 'boton secundario sim-anadir' }, '+ Añadir ejercicio');

  function simulacion() {
    const cabecera = (extra) => h('div', { class: 'sim-cabecera' }, h('span', { class: 'suave' }, 'Ejercicio ' + (pos + 1) + ' de ' + EJERCICIOS.length), extra);
    if (opcion === 'A') {
      return [cabecera(), tarjeta(), anadirEj(),
        h('div', { class: 'sim-barra-fija' }, atras(), siguiente(),
          h('button', { type: 'button', class: 'boton secundario boton-paso-grande', 'aria-label': 'Más opciones', onclick: hoja }, '⋯'))];
    }
    if (opcion === 'B') {
      return [cabecera(h('button', { type: 'button', class: 'boton-icono sim-mas', 'aria-label': 'Más opciones', onclick: hoja }, '⋯')),
        tarjeta(), anadirEj(), h('div', { class: 'paso-grande-fila sim-fila' }, atras(), siguiente())];
    }
    if (opcion === 'C') {
      return [cabecera(h('span', { class: 'sim-iconos' },
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Comentario', onclick: () => aviso('(simulación) Comentario') }, icono('bocadillo')),
        h('button', { type: 'button', class: 'boton-icono boton-cancelar-x', 'aria-label': 'Cancelar', onclick: () => aviso('(simulación) Cancelar') }, icono('cerrar')))),
      tarjeta(), anadirEj(), h('div', { class: 'paso-grande-fila sim-fila' }, atras(), siguiente()),
      h('button', { type: 'button', class: 'boton enlace' }, 'Ver todos los ejercicios')];
    }
    // D: carrusel.
    const carrusel = h('div', { class: 'sim-carrusel' }, tarjeta());
    let x0 = null;
    carrusel.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    carrusel.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
    });
    carrusel.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') x0 = e.clientX; });
    carrusel.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse' || x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
    });
    return [h('div', { class: 'sim-puntos' }, EJERCICIOS.map((_, k) => h('span', { class: k === pos ? 'activo' : '' }))),
      carrusel,
      h('p', { class: 'nota centrado' }, 'Desliza la tarjeta a izquierda o derecha (en el ordenador, arrastra con el ratón).'),
      anadirEj(),
      h('div', { class: 'sim-fila-d' },
        ultimo() ? h('button', { type: 'button', class: 'boton', onclick: () => aviso('(simulación) Terminar') }, 'Terminar ✓') : h('span'),
        h('button', { type: 'button', class: 'boton secundario boton-paso-grande', 'aria-label': 'Más opciones', onclick: hoja }, '⋯'))];
  }

  function pintar() {
    zona.replaceChildren(...[
      h('div', { class: 'fila-marcas compacta sim-opciones' }, Object.entries(OPCIONES).map(([k, o]) => h('button', {
        type: 'button', class: `boton-marca${opcion === k ? ' activo' : ''}`, onclick: () => { opcion = k; pos = 0; pintar(); } }, `${k} · ${o.nombre}`))),
      h('p', { class: 'nota centrado' }, OPCIONES[opcion].explica),
      h('div', { class: `sim-pantalla sim-${opcion}` }, ...simulacion()),
    ]);
  }

  anadir(contenedor, h('h1', {}, 'Botones del entreno'),
    h('p', { class: 'nota centrado' }, 'Simulación: nada de esto se guarda. Prueba las cuatro y dime cuál.'),
    zona);
  pintar();
}
