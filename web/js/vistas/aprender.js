// «Aprender»: todo lo que explica la app, fuera de Ajustes para no
// cargarlo. El tutorial (guía y notas), el glosario, cómo decide la app qué
// te toca (progresiones y programas), las técnicas de estiramiento y de
// dónde sale cada recomendación.

import { BIBLIOGRAFIA } from '../bibliografia.js';
import { calibrar, textoCalibracion } from '../formula1rm.js';
import { creditosCargados } from '../imagenes.js';
import { explicaciones1RM } from './ejercicios.js';
import { ASISTENCIAS, ESCALA_MANO, TECNICAS_ESTIRAMIENTO } from '../esquema.js';
import * as estado from '../estado.js';
import { anadir, aviso, h, idApartado } from '../ui.js';
import { hacerCuestionario } from './cuestionario.js';
import { listaGlosario, queEs } from './glosario.js';
import { GUIAS, NIVELES, fijarNivel, iniciarGuia, nivelTutorial, reiniciarPistas } from './tutorial.js';

function apartado(titulo, ...contenido) {
  return h('details', { class: 'tarjeta formulario apartado', id: idApartado(titulo) }, h('summary', {}, titulo), ...contenido);
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
      h('dt', {}, 'Ciclo a escalera (Bilbo y otros)'),
      h('dd', {}, 'Una escalera de sesiones: el peso lo pone la app y sube un poco cada vez (en Bilbo, 2,5 kg). '
        + 'Tú no persigues un número de repeticiones: haces todas las que puedas. El objetivo que ves en pantalla es solo la '
        + 'referencia de lo que hiciste el día anterior, para saber si has mejorado. Ejemplo: día 1, 40 kg y te salen 22; '
        + 'día 2, 42,5 kg y te salen 20; el peso sube y las repeticiones bajan solas. '
        + 'Cuando el peso ya solo te deja 15, el ciclo se ha acabado: la app mide el mejor 1RM que has hecho en ese ciclo y '
        + 'arranca el siguiente a la mitad de ese peso. Así cada vuelta empieza más arriba que la anterior.'),
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
    h('p', { class: 'nota' }, 'En la ficha del ejercicio, el ciclo son tres preguntas: qué mejora cada sesión, cuándo se acaba '
      + 'el ciclo y por dónde empieza el siguiente. Hay prehechos («Bilbo», «lineal», «sube cada semana») y luego puedes cambiar '
      + 'cada número. Nada es definitivo: los cambios se pueden deshacer.'),
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
      Object.values(ESCALA_MANO).join(' → ') + '. Cada vez que bajas un escalón, has ganado.'),
    h('p', { class: 'nota' }, 'Si no te imaginas la postura de la mano, se ve muy claro en los vídeos de ',
      h('a', { href: 'https://www.youtube.com/@Matthewismith', target: '_blank', rel: 'noopener' }, 'Matthew Ismith'),
      ', que es de donde viene la idea de medir así.'));
}

// Cómo se estima el 1RM y con qué factor propio. Venía de Ajustes: es una
// explicación, así que su sitio es este.
function comoSeEstimaTuRM(d) {
  return apartado('Cómo se estima tu 1RM',
    h('p', { class: 'nota' }, 'Con la fórmula de Marzagao (2026) y, si el ejercicio lo tiene en «Se ajusta a ti», un factor propio '
      + 'que se calcula solo con tus series.'),
    explicaciones1RM(),
    h('details', { class: 'explicacion' },
      h('summary', {}, 'Tu factor en cada ejercicio'),
      h('ul', { class: 'lista-factores' }, d.ejercicios
        .filter((e) => !e.archivado && e.carga?.tipo !== 'ninguna' && (e.formula1RM ?? 'personal') !== 'peso')
        .map((e) => ({ e, c: calibrar(d, e) }))
        .sort((a, b) => b.c.ventanas - a.c.ventanas || a.e.nombre.localeCompare(b.e.nombre))
        .map(({ e, c }) => h('li', {}, h('a', { href: `#/ejercicio/${e.id}` }, e.nombre), `: ${textoCalibracion(c)}`)))));
}

// Los dibujos no son nuestros: quién los hizo y con qué licencia.
function creditos() {
  return apartado('Créditos de las imágenes',
    h('p', { class: 'nota' },
      'Los dibujos del cuerpo y de los ejercicios vienen de ',
      h('a', { href: 'https://wger.de', target: '_blank', rel: 'noopener' }, 'wger.de'),
      ' y de ',
      h('a', { href: 'https://github.com/everkinetic/data', target: '_blank', rel: 'noopener' }, 'Everkinetic'),
      ', con licencia Creative Commons Atribución-CompartirIgual (CC-BY-SA). '
      + 'Se usan citando a sus autores y manteniendo esa licencia. Las capas de antebrazo, hombro posterior, '
      + 'lumbares, aductores, abductores, cuello y tibial, y los muñecos de yoga, estiramientos, movilidad y cardio, son dibujos propios de la app.'),
    h('p', { class: 'nota' },
      `Imágenes incluidas: ${Object.keys(creditosCargados()?.ejercicios ?? {}).length} de ejercicios `
      + `y ${Object.keys(creditosCargados()?.musculos ?? {}).length} capas de músculo.`));
}

function tutorial(d) {
  return apartado('Tutorial',
    h('p', { class: 'nota' }, 'Las guías te pasean por las pantallas; las notas explican cada pantalla la primera vez y se cierran con ✕.'),
    h('p', { class: 'etiqueta-campo' }, '¿Cuánto te explico?'),
    (() => {
      // Se marca la elegida a mano, sin repintar la pantalla: si no, se
      // cerraría el apartado en cuanto tocas otra.
      const caja = h('div', { class: 'opciones' });
      const botones = Object.entries(NIVELES).map(([clave, n]) => h('button', {
        type: 'button', class: `opcion ${(nivelTutorial(d) ?? 'basico') === clave ? 'elegida' : ''}`,
        'data-nivel': clave,
        onclick: () => {
          fijarNivel(clave, { repintar: false });
          for (const b of botones) b.classList.toggle('elegida', b.dataset.nivel === clave);
          aviso(`Tutorial: ${n.etiqueta.toLowerCase()}.`);
        },
      }, h('strong', {}, n.etiqueta), h('small', {}, n.descripcion)));
      anadir(caja, botones);
      return caja;
    })(),
    h('p', { class: 'etiqueta-campo' }, 'Hacer un tutorial'),
    Object.entries(GUIAS).map(([clave, g]) => h('button', {
      class: 'tarjeta fila-enlace', type: 'button',
      onclick: () => { if (nivelTutorial(d) === 'ninguno') fijarNivel('basico', { repintar: false }); iniciarGuia(clave); },
    },
    h('div', {}, h('strong', {}, g.titulo), h('div', { class: 'suave' }, g.resumen)),
    d.perfil?.tutoriales?.hechas?.[clave] && h('span', { class: 'etiqueta' }, 'Hecho'))),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => { reiniciarPistas(); aviso('Las notas volverán a salir.'); } },
        'Recuperar los consejos en notitas'),
      h('button', { class: 'boton secundario', onclick: () => hacerCuestionario() }, 'Rehacer el cuestionario inicial')));
}

export function vistaAprender(contenedor) {
  const d = estado.datos();
  anadir(contenedor,
    h('h1', {}, 'Aprender'),
    h('p', { class: 'suave' }, 'Todo lo que la app explica, junto: el tutorial, qué significa cada palabra y cómo decide lo que te toca.'),
    tutorial(d),
    apartado('Glosario', h('p', { class: 'nota' }, 'Qué significa cada palabra, explicado desde cero.'), listaGlosario()),
    comoDecideLaApp(),
    estirar(),
    comoSeEstimaTuRM(d),
    creditos(),
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
