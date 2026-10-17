// Guía de estilo viva (#/guia-estilo): la paleta, la tipografía, los
// espacios y los componentes de la app, pintados con los estilos de verdad.
// Los colores se leen de las variables CSS, así que siempre coinciden con lo
// que se ve (en claro o en oscuro, según el tema). No sale en ningún menú.
import { anadir, aviso, h } from '../ui.js';
import { icono } from '../iconos.js';

const PALETA = [
  { grupo: 'Marca', colores: [
    ['--acento', 'Tinta', 'La acción principal: botones, pestaña activa, marca. Negro en claro, blanco en oscuro.'],
    ['--acento-texto', 'Sobre tinta', 'El texto encima de un botón principal.'],
    ['--acento-suave', 'Tinta suave', 'Lo marcado: opción elegida, chip activo, sugerencia.'],
  ] },
  { grupo: 'Superficies', colores: [
    ['--fondo', 'Papel / Noche', 'El fondo de la app: papel cálido en claro, azul noche en oscuro.'],
    ['--superficie', 'Tarjeta', 'Tarjetas y carteles.'],
    ['--superficie-2', 'Arena / Pizarra', 'Campos de texto, filas dentro de tarjetas.'],
    ['--borde', 'Borde', 'Separadores y bordes finos.'],
  ] },
  { grupo: 'Texto', colores: [
    ['--texto', 'Texto', 'Todo lo que se lee.'],
    ['--texto-suave', 'Texto suave', 'Notas, etiquetas, lo secundario.'],
  ] },
  { grupo: 'Estados (solo para estados)', colores: [
    ['--bien', 'Verde', 'Superado, recuperado, hecho.'],
    ['--aviso', 'Ámbar', 'Atención: a medias, avisos, prueba de 1RM.'],
    ['--aviso-fondo', 'Ámbar suave', 'Fondo de avisos y pistas.'],
    ['--mal', 'Rojo', 'No superado, peligro, borrar.'],
  ] },
  { grupo: 'Mapa del cuerpo', colores: [
    ['--mapa-verde', 'Recuperado', 'Músculo listo.'],
    ['--mapa-ambar', 'A medias', 'Músculo recuperándose.'],
    ['--mapa-rojo', 'Tocado', 'Músculo aún cansado.'],
    ['--mapa-azul', 'Te pasas', 'Más series de las de tu objetivo.'],
    ['--mapa-morado', 'Te pasas mucho', 'Muy por encima del objetivo.'],
  ] },
];

const TIPOS = [
  ['h1', 'Título de pantalla', 'Manrope 800 · 28 px · interlineado 1,15'],
  ['h2', 'Título de sección', 'Manrope 700 · 17,6 px'],
  ['p', 'Texto normal para leer: frases cortas, una idea por línea.', 'Manrope 400 · 16 px · interlineado 1,45'],
  ['nota', 'Nota o explicación breve, en gris.', 'Manrope 400 · 14,4 px · texto suave'],
  ['numero', '102,5', 'Manrope 700 · 20 px · números tabulares (casillas de la serie)'],
];

const ESPACIOS = [4, 8, 12, 16, 24, 32];
const RADIOS = [['--radio-pequeno', 'Campos y filas'], ['--radio', 'Tarjetas'], ['22px', 'Hojas (carteles)'], ['999px', 'Botones y chips']];
const ICONOS = ['inicio', 'cuerpo', 'ejercicios', 'historial', 'aprender', 'ajustes', 'marca', 'papelera', 'bocadillo', 'ojo', 'reloj', 'repetir',
  'cerrar', 'bombilla', 'campana', 'aviso'];

const leer = (v) => (v.startsWith('--') ? getComputedStyle(document.documentElement).getPropertyValue(v).trim() : v);

export function vistaGuiaEstilo(contenedor) {
  const seccion = (titulo, ...hijos) => h('section', { class: 'tarjeta guia-seccion' }, h('h2', {}, titulo), ...hijos);
  anadir(contenedor,
    h('h1', {}, 'Guía de estilo'),
    h('p', { class: 'nota centrado' }, 'Así se ve y se comporta Entreno. Los colores son los de verdad: cambia a claro u oscuro en Ajustes y mira cómo cambian.'),

    seccion('Principios',
      h('ol', { class: 'puntos' },
        h('li', {}, h('strong', {}, 'Una mano, mala luz: '), 'todo lo que se toca mide 44 px o más; contraste alto.'),
        h('li', {}, h('strong', {}, 'Una cosa cada vez: '), 'preguntas de una en una; lo contestado, en una línea.'),
        h('li', {}, h('strong', {}, 'Poco texto: '), 'una línea por cosa; lo largo, detrás de un «?».'),
        h('li', {}, h('strong', {}, 'Botones y centrado: '), 'toda acción es un botón; títulos y botones, centrados.'),
        h('li', {}, h('strong', {}, 'La app decide: '), 'pesos y objetivos los pone la app; tú apuntas.'))),

    seccion('Color',
      PALETA.map((g) => h('div', { class: 'guia-grupo' },
        h('p', { class: 'etiqueta-campo' }, g.grupo),
        h('div', { class: 'guia-muestras' }, g.colores.map(([v, nombre, uso]) => h('button', { type: 'button', class: 'guia-muestra',
          onclick: () => { navigator.clipboard?.writeText(leer(v)); aviso(`${nombre}: ${leer(v)} (copiado)`); } },
          h('span', { class: 'guia-color', style: `background: var(${v})` }),
          h('strong', {}, nombre), h('code', {}, leer(v)), h('small', { class: 'suave' }, uso)))))),
      h('p', { class: 'nota' }, 'El verde, el ámbar y el rojo solo dicen cómo está algo: nunca decoran. Las gráficas llevan su propia paleta (son datos).')),

    seccion('Tipografía',
      h('p', { class: 'nota' }, 'Manrope (licencia libre, dentro de la app). Sin cortes con guion: las palabras saltan enteras.'),
      TIPOS.map(([tipo, muestra, ficha]) => h('div', { class: 'guia-tipo' },
        tipo === 'h1' ? h('h1', {}, muestra) : tipo === 'h2' ? h('h2', {}, muestra) : tipo === 'nota' ? h('p', { class: 'nota' }, muestra)
          : tipo === 'numero' ? h('span', { class: 'guia-numero' }, muestra) : h('p', {}, muestra),
        h('small', { class: 'suave' }, ficha)))),

    seccion('Espacio y forma',
      h('p', { class: 'nota' }, 'Todo va en múltiplos de 4 px.'),
      h('div', { class: 'guia-espacios' }, ESPACIOS.map((n) => h('div', {}, h('span', { style: `width:${n}px;height:${n}px` }), h('small', {}, `${n}`)))),
      h('div', { class: 'guia-radios' }, RADIOS.map(([v, uso]) => h('div', {},
        h('span', { style: `border-radius:${v.startsWith('--') ? `var(${v})` : v}` }), h('small', {}, `${leer(v)} · ${uso}`))))),

    seccion('Botones',
      h('div', { class: 'guia-botones' },
        h('button', { type: 'button', class: 'boton' }, 'Principal'),
        h('button', { type: 'button', class: 'boton secundario' }, 'Secundario'),
        h('button', { type: 'button', class: 'boton enlace' }, 'Discreto'),
        h('button', { type: 'button', class: 'boton peligro' }, 'Peligro')),
      h('div', { class: 'fila-marcas compacta' },
        h('button', { type: 'button', class: 'boton-marca activo' }, 'Marcado'), h('button', { type: 'button', class: 'boton-marca' }, 'Sin marcar')),
      h('div', { class: 'chips' }, h('button', { type: 'button', class: 'chip seleccionable activo' }, '6-8'), h('button', { type: 'button', class: 'chip seleccionable' }, '8-10')),
      h('details', { class: 'explicacion' }, h('summary', {}, 'Lo que se abre y se cierra'), h('p', {}, 'Un botoncito redondo con «+» y «−», nunca el triángulo del navegador.')),
      h('p', { class: 'nota' }, 'Un solo principal por pantalla: lo que toca ahora. Elegir entre pocas cosas: botones marcados, nunca desplegables del sistema.')),

    seccion('Iconos',
      h('p', { class: 'nota' }, 'De trazo, 24 × 24, grosor 2, puntas redondas, del color del texto. Nunca emojis en botones (salvo la escala de la mano).'),
      h('div', { class: 'guia-iconos' }, ICONOS.map((n) => h('div', {}, icono(n), h('small', {}, n))))),

    seccion('Componentes',
      h('p', { class: 'sugerencia' }, 'Hoy 90 kg × 4 dejando 2 en recámara'),
      h('span', { class: 'insignia-prueba' }, 'Prueba de 1RM'),
      h('div', { class: 'pista' }, h('span', { class: 'pista-icono' }, icono('bombilla')), h('span', { class: 'pista-texto' }, 'Pista: se cierra y no vuelve a salir.')),
      h('div', { class: 'tarjeta aviso-tarjeta' }, 'Aviso importante en una tarjeta ámbar.'),
      h('button', { type: 'button', class: 'respuesta' }, h('span', { class: 'respuesta-pregunta' }, 'Recámara'), h('strong', {}, '2'), h('span', { class: 'respuesta-cambiar' }, 'Cambiar'))),

    seccion('Movimiento',
      h('ul', { class: 'puntos' },
        h('li', {}, 'Corto y con intención: 0,15 a 0,3 s.'),
        h('li', {}, 'Los carteles suben desde abajo en el móvil; las tarjetas del entreno se deslizan.'),
        h('li', {}, 'La presentación al abrir es la única animación larga (2,5 s) y se quita con un toque.'),
        h('li', {}, 'Con «reducir movimiento» del móvil, solo fundidos.'))),

    seccion('Cómo se escribe',
      h('ul', { class: 'puntos' },
        h('li', {}, 'Español de España y de tú: «Pon un peso», «Haz todas las que puedas».'),
        h('li', {}, 'Frases cortas; nada de jerga sin su «?».'),
        h('li', {}, 'La app no da órdenes ni riñe: propone («Hoy 90 kg × 4»), no exige.'))));
}
