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
      h('dd', {}, 'El peso sube 2,5 kg cada sesión y tú haces todas las repeticiones que puedas dejando 2 en recámara; el objetivo '
        + 'es superar el 1RM de la Bilbo anterior (una repetición más de las que lo igualarían). El ciclo empieza con el peso que te '
        + 'da unas 24 repeticiones (nunca más de 25) y, cuando el objetivo baja de 15, se acaba y el siguiente vuelve a empezar desde '
        + 'el mejor 1RM que hayas hecho en él. Los números se cambian en Ajustes → Ciclos. Respaldo: un solo ensayo '
        + '(González-Alcázar 2025) muestra que una serie ligera y rápida no perjudica el 1RM en entrenados; no que sea mejor ni que '
        + 'el ciclo completo funcione. Las cifras (50 %, 2,5 kg, 15) son decisiones prácticas, y juntarlo con un 3×5 también: '
        + 'la parte que sube el 1RM con más respaldo es la pesada.'),
      h('dt', {}, 'Serie máxima y series de bajada (según tu 1RM)'),
      h('dd', {}, 'La serie máxima son 1-2 repeticiones que acaban a 1-2 del fallo, con el peso que te da tu 1RM; si te sobran 3 o '
        + 'más, la app te propone subir un 5-10 % y hacer otra sola, y vale la última. Es la que mide tu 1RM. Las de bajada van a un '
        + 'porcentaje de ese 1RM (el 80 %, por ejemplo) con un rango de repeticiones: que salgan menos por el cansancio es normal. '
        + 'A mitad del ejercicio el peso no sube; entre sesiones, la recámara lo corrige: todas arriba con 3 o más en recámara, un '
        + 'salto más; alguna por debajo, se repite; dos veces seguidas, un salto menos.'),
      h('dt', {}, '5×5'),
      h('dd', {}, 'Cinco series de cinco con el mismo peso. Si las completas, la próxima sesión sube; si fallas tres seguidas, '
        + 'baja un 10 %. Es la regla de StrongLifts 5×5; el 5×5 original de Bill Starr (1976) iba subiendo el peso de serie en serie '
        + 'hasta una última más pesada. El primer peso lo calcula la app: el que te dejaría 3 repeticiones en recámara haciendo 5.'),
      h('dt', {}, '5/3/1'),
      h('dd', {}, 'Cuatro «semanas»: de 5, de 3, de 5/3/1 y descarga, con porcentajes de tu máximo de entrenamiento (el 90 % de '
        + 'tu 1RM), y la última serie de cada semana, todas las que puedas. Cada vuelta, Wendler sube ese máximo 2,5 kg en los '
        + 'ejercicios de torso y 5 kg en los de pierna (en la ficha, el incremento). La semana avanza cada tantas sesiones de ese '
        + 'ejercicio como veces lo hagas a la semana (se pone en la ficha).'),
      h('dt', {}, 'HST'),
      h('dd', {}, 'Tres bloques de seis sesiones: a 15, a 10 y a 5 repeticiones, con el peso subiendo dentro de cada bloque. '
        + 'El peso de partida es tu 15RM, calculado con tu 1RM. Seis sesiones son dos semanas si lo haces tres veces por semana. '
        + 'El HST de Haycock añade un cuarto bloque (más de 5 o negativas) y, al acabar, 7 a 10 días sin entrenar (el '
        + '«desentrenamiento estratégico»); la app hace los tres primeros y vuelve a empezar, y el descanso lo decides tú.'),
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
    // Sin título: la pestaña de abajo ya lo dice (Dan, 27-10-2026).
    h('p', { class: 'suave' }, 'Todo lo que la app explica, junto: el tutorial, qué significa cada palabra y cómo decide lo que te toca.'),
    tutorial(d),
    apartado('Glosario', h('p', { class: 'nota' }, 'Qué significa cada palabra, explicado desde cero.'), listaGlosario()),
    comoDecideLaApp(),
    estirar(),
    comoSeEstimaTuRM(d),
    apartado('Cómo calentar',
      h('p', {}, 'En este orden: cardio o bici suave, movilidad de pie y, justo antes de cada básico, sus aproximaciones. Después, las series de trabajo.'),
      h('ul', { class: 'nota' },
        h('li', {}, 'General, solo al empezar: los días de pierna, 10 min de cardio suave (son los dos ratos de cardio de la semana); los de torso, 5 min de bici o andar rápido.'),
        h('li', {}, 'Movilidad, 3 min, todo de pie y sin pausas. Torso: círculos de brazos, 10 en cada sentido; palo, barra vacía o toalla por encima de la cabeza, 10; giros de tronco con el palo en los hombros, 10 por lado. '
          + 'Pierna: balanceos adelante y atrás y laterales, 10 por pierna; sentadilla profunda sin peso con 2 s abajo, 8; bisagra de cadera sin peso, 8; el día del sumo, también sentadilla sumo sin peso, 8.'),
        h('li', {}, 'Aproximaciones: como mucho 3 por ejercicio, contando la barra sola. El primer básico del día con serie máxima: 30 % × 5 (nunca menos que la barra), 60 % × 3 y 80 % × 1 '
          + '(en el sumo se tira desde el suelo: si el 30 % se queda corto, la primera va con los discos grandes más ligeros del gimnasio). El segundo con máxima (el militar del día 3): 60 % × 3 y 80 % × 1. '
          + 'Una sola, a un 50 % × 5: la sentadilla del día 4 y el rumano del día 2. Ninguna: la Bilbo (sus primeras repeticiones ya lo son), el rumano del día 4 (llegas caliente del sumo) y los accesorios.'),
        h('li', {}, 'Van muy lejos del fallo y no cuentan como volumen ni para tu 1RM.'),
        h('li', {}, 'Sus pesos se redondean de 10 en 10 kg (55 → 50, 77,5 → 80) para calentar rápido y sin cuentas. Es una decisión práctica: '
          + 'si prefieres los porcentajes exactos, desmarca el botón de aquí debajo (también está en Ajustes → Entrenamiento y series). '
          + 'Las series de trabajo sí van con el % exacto de tu 1RM (al disco más cercano); si prefieres pesos más redondos para ir más rápido, '
          + 'sube «Los pesos que propone la app van de» en esos Ajustes (5, por ejemplo).',
          (() => {
            const redondo = d.perfil.calentamientoRedondo !== false;
            return h('div', { class: 'fila-marcas compacta' },
              h('button', { type: 'button', class: `boton-marca${redondo ? ' activo' : ''}`, 'aria-pressed': String(redondo),
                onclick: () => {
                  estado.cambiar((x) => { x.perfil.calentamientoRedondo = !redondo; });
                  aviso(redondo ? 'Calentamientos con el % exacto.' : 'Calentamientos de 10 en 10 kg.');
                } }, redondo ? 'Calentamientos de 10 en 10 kg' : 'Calentamientos con el % exacto: tocar para redondear'));
          })()),
        h('li', {}, 'Descansos: las aproximaciones, seguidas, solo lo que tardes en cambiar discos; 2-3 min entre la última y la serie máxima; 3-5 min tras la máxima.'),
        h('li', {}, 'Nunca estires un músculo 60 s o más seguidos antes de un básico pesado: si lo pide, menos de 60 s y después las aproximaciones. Los estiramientos largos, al terminar.')),
      h('p', { class: 'nota' }, 'Lo que dice la evidencia: calentar mejoró el rendimiento en el 79 % de lo medido y casi nunca lo empeoró (Fradkin 2010); '
        + 'añadir 20 min de bici suave a dos aproximaciones subió el 1RM un 8,4 % (Abad 2011), y tres aproximaciones como máximo encajan con lo que usan los estudios; '
        + 'una aproximación más solo afinó un poco la estimación del 1RM (Perez 2021); en series al fallo, ningún calentamiento cambió las repeticiones '
        + '(Ribeiro 2014; Souza 2024), por eso la Bilbo y los accesorios no llevan aproximación; el estiramiento estático de 60 s o más quita fuerza y el de menos de 60 s casi nada (Behm 2016; Warneke y Lohmann 2024).'),
      h('p', { class: 'nota' }, 'Decisión práctica, sin estudio: el 60 % y el 80 % de las aproximaciones, el máximo de 3, redondear de 10 en 10 kg, hacerlas seguidas, '
        + 'los 10 min de cardio y la lista de movimientos. Las guías de test de 1RM usan un esquema parecido (unas repeticiones ligeras y luego 3-5 más pesadas).')),
    apartado('Por qué la serie máxima va primero',
      h('ul', { class: 'nota' },
        h('li', {}, 'Se hace lo más pesado sin cansancio: el músculo y el sistema nervioso están frescos. Es mecánica: no hay un ensayo que lo compare con hacerla al final.'),
        h('li', {}, 'Mide: una serie de 1-2 con 1-2 en recámara da el 1RM estimado más fiable, porque las fórmulas aciertan más con pocas repeticiones (Mayhew 2008), y practicar el 1RM también se entrena: es una habilidad (Mattocks 2017). De esa medida salen los kilos de todo lo demás.'),
        h('li', {}, 'Las series de bajada ponen el volumen: en powerlifters, una serie muy pesada sola tenía menos probabilidades de dar mejoras claras, y añadirle 2-3 series de bajada pudo dar más fuerza en 6 semanas (Androulakis-Korakakis 2021). Cuanto más se baja respecto a la máxima, más volumen sale (Helms 2018).'),
        h('li', {}, 'La bajada de esta rutina: máxima a un 90 % y series de bajada al 80 % del 1RM, es decir, al ~89 % del peso de la máxima, más exigente que el ~80 % de Androulakis-Korakakis. No hay estudio que diga cuál es mejor; se mantiene porque la prioridad es la fuerza y se trabaja con 2 en recámara.'),
        h('li', {}, 'Cuántas series de bajada: el estudio usó 2-3. La sentadilla, el remo y el sumo llevan 3 (con 4, el primer día de sentadilla acabaste sin fuerzas a mitad); la banca se queda en 4 × 4 mientras no dé problemas. Es una decisión práctica.'),
        h('li', {}, 'La «potenciación» (que la serie pesada haga rendir más a las siguientes) no es la razón: en saltos no añadió nada a un buen calentamiento (Rappelt 2024).'))),
    apartado('Cómo progresa esta rutina',
      h('p', {}, 'Básicos (banca, remo, militar, sentadilla y peso muerto): porcentaje del 1RM estimado, corregido por la recámara.'),
      h('ul', { class: 'nota' },
        h('li', {}, 'Cada serie pesada da un 1RM estimado con el peso, las repeticiones y la recámara (repeticiones más recámara: las que harías al fallo). El de la serie máxima de la semana es el más fiable y es el que manda.'),
        h('li', {}, 'La app usa el máximo de tus series de las últimas semanas. Las series largas (la Bilbo, más de 12) suelen dar un 1RM más bajo, porque la recámara se calcula peor por encima de 12 repeticiones (Halperin 2022): '
          + 'casi nunca mandan, pero si una da más, cuenta. Eso explica un salto grande el primer día con serie máxima (la sentadilla pasó de 109,6 a 130,7 kg): no es fuerza ganada en una sesión, es que el 1RM viejo salía de series largas y se quedaba corto.'),
        h('li', {}, 'Los kilos salen de ese 1RM: series de bajada al 80 %, día moderado al 70-75 %, aproximaciones al 60-80 %. Si tu 1RM sube, todos los pesos suben solos.'),
        h('li', {}, 'Si la serie anterior da otro 1RM a mitad del ejercicio, la app te propone el peso que saldría para las siguientes y tú decides.'),
        h('li', {}, 'La recámara corrige: si te sobran (3 o más en recámara, o una repetición más con las mismas 2), ese dato sube tu 1RM y la próxima vez el peso sube; '
          + 'así se puede llegar al 85 %. Si vas justo, el 1RM no sube y el peso se repite; si dos sesiones seguidas va peor, el 1RM de esas dos semanas baja y el peso también.'),
        h('li', {}, 'Para saber si progresas, mira la gráfica del 1RM estimado de cada básico (toca su dibujo en el entreno).')),
      h('p', {}, 'Día moderado (Bilbo y normales; sentadilla al 70-75 %), rumano y accesorios: doble progresión.'),
      h('ul', { class: 'nota' },
        h('li', {}, 'Series normales y rumano: cuando todas llegan arriba del rango con la recámara pedida, más peso y vuelta al mínimo del rango. Accesorios, igual, con 1 en recámara.'),
        h('li', {}, 'Bilbo: su propio ciclo; cuando pasa de 30 repeticiones, sube el peso.'),
        h('li', {}, 'Con tu peso: dominadas en racimo de 6 × 1-2 a 5 × 3 y luego series normales; negativas, primero bajada más lenta (3 → 5 s) y luego más repeticiones; fondos, de 6 a 10 y luego con lastre.')),
      h('p', { class: 'nota' }, 'Respaldo: elegir la carga por esfuerzo rindió igual o algo mejor que solo por porcentaje (Helms 2018) y los métodos que se autorregulan superaron al porcentaje fijo en fuerza (Huang 2025). Aquí se combinan: porcentaje para poner el peso y recámara para corregirlo. '
        + 'Decisión práctica: la doble progresión (no hay un ensayo que la compare con otros métodos) y los 2,5 kg. '
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
