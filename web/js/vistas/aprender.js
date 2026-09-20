// «Aprender»: todo lo que explica la app, fuera de Ajustes para no
// cargarlo. El tutorial (guía y notas), el glosario, cómo decide la app qué
// te toca (progresiones y programas), las técnicas de estiramiento y de
// dónde sale cada recomendación.

import { BIBLIOGRAFIA } from '../bibliografia.js';
import { ASISTENCIAS, ESCALA_MANO, TECNICAS_ESTIRAMIENTO } from '../esquema.js';
import * as estado from '../estado.js';
import { anadir, aviso, h } from '../ui.js';
import { hacerCuestionario } from './cuestionario.js';
import { listaGlosario, queEs } from './glosario.js';
import { NIVELES, fijarNivel, iniciarGuia, nivelTutorial, reiniciarPistas } from './tutorial.js';

function apartado(titulo, ...contenido) {
  return h('details', { class: 'tarjeta formulario apartado' }, h('summary', {}, titulo), ...contenido);
}

const parrafos = (...textos) => textos.map((t) => h('p', {}, t));

// Cómo decide la app el peso y las repeticiones de hoy, explicado con
// ejemplos. Es lo que Dan quería que entendiera todo el mundo.
function comoDecideLaApp() {
  return apartado('Cómo decide la app qué te toca',
    parrafos(
      'Cada serie de cada ejercicio lleva una regla. Tú apuntas lo que has hecho y la regla calcula el peso y las repeticiones de la próxima vez. '
      + 'La regla se elige en la ficha del ejercicio (o viene ya puesta si la rutina es prehecha). Estas son las que hay:'),
    h('dl', { class: 'reglas' },
      h('dt', {}, 'Ciclo (Bilbo y otros)'),
      h('dd', {}, 'Una escalera de sesiones. Cada día el peso viene fijado y sube un poco (en Bilbo, 2,5 kg por sesión durante 17). '
        + 'Tu meta cada día es hacer más repeticiones de las que marca el objetivo. Ejemplo: día 1, 40 kg, objetivo 20 repeticiones; '
        + 'día 2, 42,5 kg, objetivo 19… Cuando el objetivo baja del mínimo (15 en Bilbo) el ciclo se corta solo y empieza otro '
        + 'más ligero. No tienes que pensar nada: la app te dice el peso y a cuántas llegar.'),
      h('dt', {}, 'Doble progresión'),
      h('dd', {}, 'Trabajas entre dos números de repeticiones, por ejemplo de 8 a 12. Con el mismo peso vas subiendo repeticiones; '
        + 'el día que llegas a 12 en todas las series, la app sube el peso y vuelves a empezar por 8. Es la más sencilla y la '
        + 'que recomendamos si empiezas.'),
      h('dt', {}, 'A más cada vez'),
      h('dd', {}, 'Cada vez un poco más que la última: una repetición más con el mismo peso, o un poco más de peso con las mismas '
        + 'repeticiones. Tú eliges cuál de las dos cosas sube.'),
      h('dt', {}, 'Programa (5×5, 5/3/1, HST)'),
      h('dd', {}, 'Programas clásicos con las series y los pesos ya decididos para cada sesión, a partir de tu 1RM. '
        + 'Si conoces alguno y quieres seguirlo tal cual, es esto.'),
      h('dt', {}, 'Máximo trabajo'),
      h('dd', {}, 'Experimental. Busca en tu historial con qué peso mueves más kilos en total (peso por repeticiones) y te '
        + 'mantiene ahí, subiendo cuando ves que puedes.'),
      h('dt', {}, 'Libre'),
      h('dd', {}, 'La app solo apunta y te recuerda lo último que hiciste. No propone nada. Vale para calentamientos y para '
        + 'ejercicios que no quieres llevar con regla.')),
    h('p', { class: 'nota' }, 'Cuándo se corta un ciclo, cómo empieza el siguiente y cuánto sube cada vez se ajusta en la ficha del '
      + 'ejercicio, con prehechos («Bilbo», «lineal», «sube cada semana») o «a mi manera».'),
    h('p', {}, queEs('rm'), ' ', queEs('recamara'), ' ', queEs('fallo'), ' ', queEs('bilbo'), ' ', queEs('doble-progresion')));
}

function estirar() {
  return apartado('Estiramientos: técnicas, ayudas y medición',
    parrafos(
      'Estirar es llevar un músculo cerca de su tope de recorrido y quedarse ahí, o moverse hasta él. Hay varias formas de hacerlo:'),
    h('dl', { class: 'reglas' },
      Object.values(TECNICAS_ESTIRAMIENTO).flatMap((t) => [h('dt', {}, t.etiqueta), h('dd', {}, t.descripcion)])),
    h('p', {}, h('strong', {}, 'Pasivo o activo. '), 'En el pasivo te dejas llevar: la gravedad, una pared, una cinta o tu mano te sostienen en la postura. '
      + 'En el activo es tu propio músculo el que te mantiene ahí (por ejemplo, subir la pierna y aguantarla en el aire). '
      + 'El dinámico es otra cosa: no te quedas quieto, te mueves de forma controlada hasta el final del recorrido.'),
    h('p', {}, h('strong', {}, 'FNP. '), 'Siglas de «facilitación neuromuscular propioceptiva». Suena raro y es simple: empujas unos segundos contra '
      + 'algo que no cede, sueltas y el músculo te deja llegar un poco más lejos. CRAC es la variante en la que, al soltar, aprietas '
      + 'el músculo contrario para ganar aún más.'),
    h('p', {}, h('strong', {}, 'Ayudas. '), Object.values(ASISTENCIAS).join(', ') + '. Se marcan en cada serie del estiramiento.'),
    h('p', {}, h('strong', {}, 'La escala de la mano. '), 'Para medir hasta dónde llegas sin cinta métrica: apoyas la mano en el suelo y '
      + 'miras qué parte te sostiene. De más alto a más bajo: ',
      Object.values(ESCALA_MANO).join(' → ') + '. Cada vez que bajas un escalón, has ganado.'));
}

function tutorial(d) {
  return apartado('Tutorial',
    h('p', { class: 'nota' }, 'La guía te pasea por las pantallas; las notas explican cada pantalla la primera vez y se cierran con ✕.'),
    h('div', { class: 'opciones' }, Object.entries(NIVELES).map(([clave, n]) => h('button', {
      type: 'button', class: `opcion ${(nivelTutorial(d) ?? 'basico') === clave ? 'elegida' : ''}`,
      onclick: () => { fijarNivel(clave); aviso('Tutorial cambiado'); },
    }, h('strong', {}, n.etiqueta), h('small', {}, n.descripcion)))),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => { if (nivelTutorial(d) === 'ninguno') fijarNivel('basico'); iniciarGuia(); } },
        'Ver la guía paso a paso'),
      h('button', { class: 'boton secundario', onclick: () => { reiniciarPistas(); aviso('Las notas volverán a salir.'); } },
        'Volver a mostrar las notas'),
      h('button', { class: 'boton secundario', onclick: () => hacerCuestionario() }, 'Repetir el cuestionario de bienvenida')));
}

export function vistaAprender(contenedor) {
  const d = estado.datos();
  anadir(contenedor,
    h('div', { class: 'cabecera-vista' }, h('h1', {}, 'Aprender'), h('a', { class: 'boton enlace', href: '#/ajustes' }, 'Ajustes')),
    h('p', { class: 'suave' }, 'Todo lo que la app explica, junto: el tutorial, qué significa cada palabra y cómo decide lo que te toca.'),
    tutorial(d),
    apartado('Glosario', h('p', { class: 'nota' }, 'Qué significa cada palabra, explicado desde cero.'), listaGlosario()),
    comoDecideLaApp(),
    estirar(),
    apartado('De dónde sale cada cosa',
      h('p', { class: 'nota' }, 'Qué recomienda la app, con qué respaldo y dónde falla.'),
      BIBLIOGRAFIA.map((x) => h('details', { class: 'fuente' },
        h('summary', {}, x.tema),
        h('p', {}, x.dice),
        h('p', { class: 'nota' }, x.matiz),
        x.fuentes.length
          ? h('ul', {}, x.fuentes.map((f) => h('li', {}, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.texto))))
          : h('p', { class: 'nota' }, 'Sin respaldo científico directo: es una decisión práctica.')))));
}
