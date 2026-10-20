// «Aprender»: todo lo que explica la app, fuera de Ajustes para no
// cargarlo. El tutorial (guía y notas), el glosario, cómo decide la app qué
// te toca (progresiones y programas), las técnicas de estiramiento y de
// dónde sale cada recomendación.

import { BIBLIOGRAFIA } from '../bibliografia.js';
import { calibrar, textoCalibracion } from '../formula1rm.js';
import { creditosCargados, textoCredito } from '../imagenes.js';
import { explicaciones1RM, opciones } from './ejercicios.js';
import { FORMAS_DROP_SET, FORMA_DROP_SET_POR_DEFECTO } from '../recuperacion.js';
import { ASISTENCIAS, ESCALA_MANO, TECNICAS_ESTIRAMIENTO } from '../esquema.js';
import * as estado from '../estado.js';
import { anadir, apartadoPlegable, aviso, h, idApartado, llevarAlDestino } from '../ui.js';
import { hacerCuestionario } from './cuestionario.js';
import { listaGlosario, queEs } from './glosario.js';
import { GUIAS, NIVELES, fijarNivel, iniciarGuia, nivelTutorial, reiniciarPistas } from './tutorial.js';

const apartado = apartadoPlegable;

const parrafos = (...textos) => textos.map((t) => h('p', {}, t));

// Cómo decide la app el peso y las repeticiones de hoy, explicado con
// ejemplos. Es lo que Dan quería que entendiera todo el mundo.
function comoDecideLaApp() {
  return apartado('Cómo decide la app qué te toca',
    parrafos(
      'Cada serie lleva una regla. Tú apuntas lo que haces y la regla calcula el peso y el objetivo de la próxima vez. '
      + 'Casi todo es un ciclo de sobrecarga progresiva: una escalera que sube sesión a sesión y, cuando se acaba, vuelve a '
      + 'empezar un poco más arriba. Los prehechos son ciclos con los números ya puestos:'),
    h('dl', { class: 'reglas' },
      h('dt', {}, 'Rango de hipertrofia (el recomendado)'),
      h('dd', {}, 'Entre 6 y 10 repeticiones (de 10 a 15 si empiezas). Con el mismo peso subes repeticiones; cuando llegas '
        + 'arriba en todas las series, la app sube el peso y vuelves abajo.'),
      h('dt', {}, 'Bilbo / incremento de peso lineal (fuerza)'),
      h('dd', {}, 'El peso sube 2,5 kg cada sesión y tú haces todas las repeticiones que puedas. Cuando ya solo te salen 15, '
        + 'el ciclo se acaba y el siguiente empieza al 50 % del mejor 1RM que hayas hecho en él. Respaldo: un solo ensayo '
        + '(González-Alcázar 2025) muestra que una serie ligera y rápida no perjudica el 1RM en entrenados; no que sea mejor ni que '
        + 'el ciclo completo funcione. Las cifras (50 %, 2,5 kg, 15) son decisiones prácticas, y juntarlo con un 3×5 también: '
        + 'la parte que sube el 1RM con más respaldo es la pesada.'),
      h('dt', {}, '5×5'),
      h('dd', {}, 'Cinco series de cinco con el mismo peso. Si las completas, la próxima sesión sube; si fallas tres seguidas, '
        + 'baja un 10 %. El primer peso lo calcula la app: el que te dejaría 3 repeticiones en recámara haciendo 5.'),
      h('dt', {}, '5/3/1'),
      h('dd', {}, 'Cuatro «semanas»: de 5, de 3, de 5/3/1 y descarga, con porcentajes del 90 % de tu 1RM. La semana avanza '
        + 'cada tantas sesiones de ese ejercicio como veces lo hagas a la semana (se pone en la ficha).'),
      h('dt', {}, 'HST'),
      h('dd', {}, 'Tres bloques de seis sesiones: a 15, a 10 y a 5 repeticiones, con el peso subiendo dentro de cada bloque. '
        + 'El peso de partida es tu 15RM, calculado con tu 1RM. Seis sesiones son dos semanas si lo haces tres veces por semana.'),
      h('dt', {}, 'Personalizar'),
      h('dd', {}, 'En blanco: eliges qué mejora cada sesión (peso, repeticiones, tiempo, distancia, o repeticiones por fases '
        + 'como 15, 10 y 5), cuándo se acaba el ciclo (con cuántas condiciones) y por dónde empieza el siguiente.')),
    h('p', {}, h('strong', {}, 'Cómo sabe la app en qué punto vas. '), 'Cuenta las sesiones que has hecho de ese ejercicio desde '
      + 'que empezó el ciclo o el programa, no las semanas del calendario. Por eso no hace falta decirle cuántas veces entrenas: '
      + 'si un día no vas, no se salta nada. Lo único que depende de la semana es el 5/3/1, y para eso está la casilla de veces '
      + 'por semana.'),
    h('p', {}, h('strong', {}, 'Fuera del ciclo. '), 'Máximo trabajo (experimental: el peso con el que más kilos totales mueves), '
      + 'calentamiento (no progresa ni cuenta para récords) y solo apuntar (la app no propone nada).'),
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
      + `y ${Object.keys(creditosCargados()?.musculos ?? {}).length} capas de músculo.`),
    // El autor de cada imagen, aquí y no debajo de cada dibujo.
    h('details', { class: 'fuente' }, h('summary', {}, 'Autor de cada imagen'),
      h('ul', { class: 'nota' }, Object.entries(creditosCargados()?.ejercicios ?? {})
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([nombre, img]) => h('li', {}, `${nombre}: ${textoCredito(img).replace(/^Imagen: /, '')}`)))));
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
    apartado('Cómo calentar',
      h('p', {}, 'En este orden: calentamiento general, movilidad dinámica y, justo antes de cada básico, sus series de aproximación.'),
      h('ul', { class: 'nota' },
        h('li', {}, 'General, solo al empezar: unos minutos de algo suave (bici o andar rápido). Los días de pierna de la rutina de fuerza son 15 min de cardio, que hacen de calentamiento y de cardio de la semana.'),
        h('li', {}, 'Movilidad dinámica, 3 min y de pie: círculos de brazos, palo por encima de la cabeza y giros de tronco; o balanceos de pierna, sentadilla profunda sin peso y bisagra de cadera.'),
        h('li', {}, 'Aproximaciones: el primer básico con serie máxima, barra × 10 (si quieres), 50 % × 5, 70 % × 3 y 85 % × 1; el segundo con máxima, 60 % × 3 y 80 % × 1; un básico moderado, 50 % × 5; rumano y curl femoral, una serie suave. La Bilbo y los accesorios, ninguna: sus primeras repeticiones ya lo son.'),
        h('li', {}, 'Van muy lejos del fallo (las de 5 al 50 % las harías 20 o 30 veces) y no cuentan como volumen ni para tu 1RM.'),
        h('li', {}, 'Descansos: las ligeras, seguidas (solo cambiar discos); 2-3 min antes de la de 85 % y antes de la máxima; 3-5 min después de la máxima; 3 min entre las de bajada.'),
        h('li', {}, 'Nunca estires un músculo 60 s o más seguidos antes de un básico pesado: si lo pide, menos de 60 s y después las aproximaciones. Los estiramientos largos, al terminar.')),
      h('p', { class: 'nota' }, 'Respaldo: calentar mejoró el rendimiento en el 79 % de lo medido (Fradkin 2010); cardio más aproximaciones subieron el 1RM un 8,4 % frente a solo aproximaciones (Abad 2011); el estiramiento estático de 60 s o más quita fuerza y el de menos de 60 s casi nada (Behm 2016; Warneke y Lohmann 2024). '
        + 'Decisión práctica, sin estudio que la fije: los porcentajes exactos, cuántas aproximaciones, hacer las ligeras seguidas y la lista de movimientos.')),
    apartado('Por qué la serie máxima va primero',
      h('ul', { class: 'nota' },
        h('li', {}, 'Se hace lo más pesado sin cansancio: el músculo y el sistema nervioso están frescos.'),
        h('li', {}, 'Mide: una serie de 1-2 con 1-2 en recámara da el 1RM estimado más fiable, porque las fórmulas aciertan más con pocas repeticiones (Mayhew 2008), y practicar el 1RM también entrena (Mattocks 2017). De ahí salen los kilos de todo lo demás.'),
        h('li', {}, 'Las series de bajada ponen el volumen: añadir 2-3 series de bajada a una serie muy pesada pudo dar más fuerza que la serie pesada sola (Androulakis-Korakakis 2021), y cuanto más se baja, más volumen sale (Helms 2018).'),
        h('li', {}, 'La bajada de esta rutina es pequeña (máxima al ~90 % y bajada al 80-85 % del 1RM): más exigente que en los estudios. Es una decisión práctica por priorizar la fuerza.'),
        h('li', {}, 'La «potenciación» (que la serie pesada haga rendir más a las siguientes) no es la razón: en saltos no añadió nada a un buen calentamiento (Rappelt 2024).'))),
    apartado('Cómo progresan los básicos',
      h('ul', { class: 'nota' },
        h('li', {}, 'Cada serie pesada da un 1RM estimado con el peso, las repeticiones y la recámara. La app usa el de tus series de las últimas dos semanas, que suele salir de la serie máxima.'),
        h('li', {}, 'Los kilos salen de ese 1RM: la máxima, para 1-2 con 1 en recámara (~90 %); las de bajada, para 4 con 2 en recámara (80-85 %). Si tu 1RM sube, todos los pesos suben solos.'),
        h('li', {}, 'La recámara corrige: si te sobran (3 o más en recámara, o una repetición más), ese dato sube tu 1RM y la próxima vez el peso sube; si vas justo, el 1RM no sube y el peso se repite; si dos sesiones seguidas va peor, el 1RM de esas dos semanas baja y el peso también.'),
        h('li', {}, 'El día moderado (Bilbo y normales) y los accesorios van en doble progresión: al llegar arriba del rango en todas las series, más peso y vuelta abajo.'),
        h('li', {}, 'Para saber si progresas, mira la gráfica del 1RM estimado de cada básico (toca su dibujo en el entreno).')),
      h('p', { class: 'nota' }, 'Respaldo: elegir la carga por esfuerzo rindió igual o algo mejor que solo por porcentaje (Helms 2018) y los métodos que se autorregulan superaron al porcentaje fijo en fuerza (Huang 2025). Aquí se combinan: porcentaje para poner el peso y recámara para corregirlo. '
        + 'Diferencia con el papel: la rutina dice «+2,5 kg» o «−2,5 kg»; la app no suma ni resta saltos fijos, recalcula el peso con tu 1RM, que hace lo mismo de forma continua.')),
    apartado('Cuánto cuenta una serie descendente',
      h('p', {}, 'Para saber cuánto has trabajado cada músculo, la app convierte las series descendentes en series normales.'),
      h('ul', { class: 'nota' },
        h('li', {}, 'Por defecto: todos los tramos menos uno. Sale de Fink 2018: una serie con 3 bajadas hizo crecer el músculo como 3 series de 12.'),
        h('li', {}, 'La otra forma sale de Ozaki 2018: una serie con 4 bajadas rindió como 3 series, o sea una serie más media por bajada.'),
        h('li', {}, 'Los dos estudios son pequeños y ninguno es mejor que el otro: elige la que prefieras.')),
      h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Cuánto cuenta una serie descendente'),
      opciones(FORMAS_DROP_SET, d.perfil.cuentaDropSet ?? FORMA_DROP_SET_POR_DEFECTO, (m) => estado.cambiar((x) => { x.perfil.cuentaDropSet = m; }), { compacto: true }),
      h('small', { class: 'nota' }, FORMAS_DROP_SET[d.perfil.cuentaDropSet ?? FORMA_DROP_SET_POR_DEFECTO].descripcion))),
    creditos(),
    apartado('De dónde sale cada cosa',
      h('p', { class: 'nota' }, 'Qué recomienda la app, con qué respaldo y dónde falla.'),
      BIBLIOGRAFIA.map((x) => h('details', { class: 'fuente', id: idApartado(x.tema) },
        h('summary', {}, x.tema),
        h('p', {}, x.dice),
        h('p', { class: 'nota' }, x.matiz),
        x.fuentes.length
          ? h('ul', {}, x.fuentes.map((f) => h('li', {}, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.texto))))
          : h('p', { class: 'nota' }, 'Sin respaldo científico directo: es una decisión práctica.')))));
  llevarAlDestino();
}
