import { BIBLIOGRAFIA } from '../bibliografia.js';
import { creditosCargados } from '../imagenes.js';
import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { desconectar, sincronizar, situacionActual } from '../sincronizacion.js';
import { VERSION_APP } from '../version.js';
import { anadir, confirmar, h, hoyISO, leerNumero } from '../ui.js';
import { DESCANSO_TRAMOS_POR_DEFECTO, RESPIRACION_POR_DEFECTO } from './descanso.js';
import { TIPOS_SEDE, nuevaSede, sedesActivas } from '../sedes.js';
import { calibrar, textoCalibracion } from '../formula1rm.js';
import { TEXTO_AVISO, guardarPruebaEnCuenta } from '../modo-prueba.js';
import { explicaciones1RM } from './ejercicios.js';
import { tramosPorDefecto } from '../calculos.js';

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
        h('span', { class: 'etiqueta-campo' }, 'Repeticiones en recámara por defecto'),
        h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.recamaraPorDefecto ?? '',
          oninput: (e) => estado.cambiar((x) => { x.perfil.recamaraPorDefecto = leerNumero(e.target.value); }, { tecleo: true }) }),
        h('small', { class: 'nota' },
          'Las que sueles dejarte sin hacer al acabar una serie. Aparecen ya puestas en cada serie, '
          + 'y se apuntan aparte: «45 kg × 12 + 1».')),

      h('label', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Descanso entre series (segundos)'),
        h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.descansoSegundos ?? '',
          oninput: (e) => estado.cambiar((x) => { x.perfil.descansoSegundos = leerNumero(e.target.value); }, { tecleo: true }) }),
        h('small', { class: 'nota' }, 'El cronómetro arranca solo al apuntar una serie, y al apuntar la última bajada de un drop set. '
          + 'Ponlo a 0 para desactivarlo.')),

      h('label', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Peso corporal (kg)'),
        h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.pesoCorporalKg ?? '',
          oninput: (e) => estado.cambiar((x) => { x.perfil.pesoCorporalKg = leerNumero(e.target.value); }, { tecleo: true }) }),
        h('small', { class: 'nota' },
          'Se usa en las máquinas asistidas (dominadas, fondos): la carga real es tu peso menos la ayuda de la máquina. ',
          'Cambiarlo no altera las series ya guardadas.')),

      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Descanso dentro de una serie (segundos)'),
        h('div', { class: 'fila-campos' },
          [['drop-set', 'Entre bajadas'], ['rest-pause', 'Rest-pause']]
            .map(([clave, texto]) => h('label', { class: 'campo' },
              h('span', { class: 'etiqueta-campo' }, texto),
              h('input', { type: 'text', inputmode: 'decimal',
                value: d.perfil.descansoTramos?.[clave] ?? DESCANSO_TRAMOS_POR_DEFECTO[clave],
                oninput: (e) => estado.cambiar((x) => {
                  x.perfil.descansoTramos = { ...DESCANSO_TRAMOS_POR_DEFECTO, ...x.perfil.descansoTramos, [clave]: leerNumero(e.target.value) };
                }, { tecleo: true }) })))),
        h('small', { class: 'nota' }, 'Al apuntar una bajada arranca esta cuenta corta: lo justo para cambiar el disco '
          + 'o recuperar el aliento entre miniseries. Al apuntar la última, el descanso normal.'))),

    h('section', { class: 'tarjeta formulario' },
      h('h2', {}, 'Ciclos Bilbo'),
      numeroAjuste('Un ciclo nuevo empieza al (% de tu 1RM)', d.perfil.bilboInicioPorcentaje ?? 50,
        (x, v) => { x.perfil.bilboInicioPorcentaje = v; }),
      h('details', { class: 'explicacion' }, h('summary', {}, 'Por qué'),
        h('p', {}, 'Al empezar un ciclo, el primer día va a este porcentaje de tu mejor 1RM estimado en ese ejercicio y cada día '
          + 'sube un poco. Empezar bajo (50 %) deja margen para superarte muchos días seguidos con series largas.'))),

    h('section', { class: 'tarjeta formulario' },
      h('h2', {}, 'Rest-pause y miorrepeticiones por defecto'),
      h('p', { class: 'nota' }, 'Lo que propone la app al crear estas series. Cada ejercicio puede usar esto, '
        + 'repetir lo de la última vez o tener sus propios valores (en su ficha).'),
      h('div', { class: 'fila-campos' },
        numeroAjuste('Miniseries de rest-pause', tramosPorDefecto(d.perfil, 'rest-pause').tramos,
          (x, v) => { x.perfil.tramosPorDefecto = { ...x.perfil.tramosPorDefecto, 'rest-pause': { ...x.perfil.tramosPorDefecto?.['rest-pause'], tramos: v } }; }),
        numeroAjuste('Tramos de miorrepeticiones (activación + miniseries)', tramosPorDefecto(d.perfil, 'miorepeticiones').tramos,
          (x, v) => { x.perfil.tramosPorDefecto = { ...x.perfil.tramosPorDefecto, miorepeticiones: { ...x.perfil.tramosPorDefecto?.miorepeticiones, tramos: v } }; }),
        numeroAjuste('Repeticiones por miniserie', tramosPorDefecto(d.perfil, 'miorepeticiones').reps,
          (x, v) => { x.perfil.tramosPorDefecto = { ...x.perfil.tramosPorDefecto, miorepeticiones: { ...x.perfil.tramosPorDefecto?.miorepeticiones, reps: v } }; })),
      h('p', { class: 'nota' }, 'Entre miniseries de miorrepeticiones no sale un reloj, sino una guía de respiración: '
        + 'un círculo que crece al coger aire y mengua al soltarlo.'),
      h('div', { class: 'fila-campos' },
        numeroAjuste('Respiraciones', d.perfil.respiracion?.veces ?? RESPIRACION_POR_DEFECTO.veces,
          (x, v) => { x.perfil.respiracion = { ...RESPIRACION_POR_DEFECTO, ...x.perfil.respiracion, veces: v }; }),
        numeroAjuste('Coger aire (s)', d.perfil.respiracion?.inspirar ?? RESPIRACION_POR_DEFECTO.inspirar,
          (x, v) => { x.perfil.respiracion = { ...RESPIRACION_POR_DEFECTO, ...x.perfil.respiracion, inspirar: v }; }),
        numeroAjuste('Soltarlo (s)', d.perfil.respiracion?.espirar ?? RESPIRACION_POR_DEFECTO.espirar,
          (x, v) => { x.perfil.respiracion = { ...RESPIRACION_POR_DEFECTO, ...x.perfil.respiracion, espirar: v }; }))),

    seccionSedes(d),

    h('section', { class: 'tarjeta' },
      h('h2', {}, 'Cómo se estima tu 1RM'),
      h('p', { class: 'nota' }, 'Con la fórmula de Marzagao (2026) y un factor propio de cada ejercicio que se ajusta solo con tus series. '
        + 'Toca cada apartado para ver los detalles.'),
      explicaciones1RM(),
      h('details', { class: 'explicacion' },
        h('summary', {}, 'Tu factor en cada ejercicio'),
        h('ul', { class: 'lista-factores' }, d.ejercicios
          .filter((e) => !e.archivado && e.carga?.tipo !== 'ninguna' && (e.formula1RM ?? 'personal') !== 'peso')
          .map((e) => ({ e, c: calibrar(d, e) }))
          .sort((a, b) => b.c.ventanas - a.c.ventanas || a.e.nombre.localeCompare(b.e.nombre))
          .map(({ e, c }) => h('li', {}, h('a', { href: `#/ejercicio/${e.id}` }, e.nombre), `: ${textoCalibracion(c)}`))))),

    h('section', { class: 'tarjeta formulario' },
      h('h2', {}, 'Drop sets por defecto'),
      h('p', { class: 'nota' }, 'Lo que propone la app al crear un drop set. Se puede cambiar en cada ejercicio.'),
      h('div', { class: 'fila-campos' },
        h('label', { class: 'campo' },
          h('span', { class: 'etiqueta-campo' }, 'Bajadas'),
          h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.dropSet?.bajadas ?? 4,
            oninput: (e) => estado.cambiar((x) => { x.perfil.dropSet = { ...x.perfil.dropSet, bajadas: leerNumero(e.target.value) }; }, { tecleo: true }) })),
        h('label', { class: 'campo' },
          h('span', { class: 'etiqueta-campo' }, 'Kilos por bajada'),
          h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.dropSet?.salto ?? 10,
            oninput: (e) => estado.cambiar((x) => { x.perfil.dropSet = { ...x.perfil.dropSet, salto: leerNumero(e.target.value) }; }, { tecleo: true }) })),
        h('label', { class: 'campo' },
          h('span', { class: 'etiqueta-campo' }, 'Arranca al (% del 1RM)'),
          h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.dropSet?.inicioPorcentaje ?? 80,
            oninput: (e) => estado.cambiar((x) => { x.perfil.dropSet = { ...x.perfil.dropSet, inicioPorcentaje: leerNumero(e.target.value) }; }, { tecleo: true }) }))),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: d.perfil.dropSet?.autoRellenar !== false,
          onchange: (e) => estado.cambiar((x) => { x.perfil.dropSet = { ...x.perfil.dropSet, autoRellenar: e.target.checked }; }) }),
        'Rellenar los pesos del drop set con el 1RM que acabas de hacer en la serie de arriba'),
      h('small', { class: 'nota' }, 'Por ejemplo: haces la Bilbo con 60 kg × 20 y el drop set de debajo se rellena solo '
        + 'al porcentaje de arriba. Si tocas un peso a mano, se respeta.')),

    h('section', { class: 'tarjeta' },
      h('h2', {}, 'De dónde sale cada cosa'),
      h('p', { class: 'nota' }, 'Qué recomienda la app, con qué respaldo y dónde falla.'),
      BIBLIOGRAFIA.map((x) => h('details', { class: 'fuente' },
        h('summary', {}, x.tema),
        h('p', {}, x.dice),
        h('p', { class: 'nota' }, x.matiz),
        x.fuentes.length
          ? h('ul', {}, x.fuentes.map((f) => h('li', {}, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.texto))))
          : h('p', { class: 'nota' }, 'Sin respaldo científico directo: es una decisión práctica.')))),

    h('section', { class: 'tarjeta' },
      h('h2', {}, 'Cuenta y copia de seguridad'),
      sinCuenta
        ? [h('p', {}, TEXTO_AVISO),
          h('button', { class: 'boton', onclick: guardarPruebaEnCuenta }, 'Entrar con Google y guardar lo hecho')]
        : [
          h('p', {}, 'Conectado como ', h('strong', {}, estado.usuario())),
          h('p', { class: 'suave' }, textoSituacion(situacion), detalle && ` ${detalle}`),
          h('button', { class: 'boton secundario', onclick: () => sincronizar({ interactivo: true }) }, 'Sincronizar ahora'),
        ],
      h('button', { class: 'boton secundario', onclick: descargarCopia }, 'Descargar una copia de mis datos'),
      h('button', { class: 'boton enlace', onclick: salir }, sinCuenta ? 'Salir del modo de prueba' : 'Salir de la cuenta')),

    h('section', { class: 'tarjeta' },
      h('h2', {}, 'Créditos de las imágenes'),
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
        + `y ${Object.keys(creditosCargados()?.musculos ?? {}).length} capas de músculo.`)),

    h('p', { class: 'nota centrado' },
      `Versión ${VERSION_APP} · formato de datos v${d.version} · revisión ${formatearNumero(d.revision)}`));
}

// Sitios donde entrenas. El de por defecto es el que se pone al empezar un
// entrenamiento sin rutina (las rutinas pueden tener el suyo).
function seccionSedes(d) {
  const sedes = sedesActivas(d);
  const cambiarSede = (id, fn, opciones) => estado.cambiar((x) => {
    const s = x.sedes.find((y) => y.id === id);
    if (s) fn(s, x);
  }, opciones);
  return h('section', { class: 'tarjeta formulario' },
    h('h2', {}, 'Dónde entrenas'),
    h('p', { class: 'nota' }, 'Gimnasios, casa, la calle… Cada entrenamiento apunta dónde se hizo, y cada ejercicio puede ser '
      + 'igual en todos los sitios o de uno solo (en su ficha).'),
    sedes.map((s) => h('div', { class: 'fila-sede' },
      h('input', { type: 'text', value: s.nombre, 'aria-label': 'Nombre del sitio',
        oninput: (e) => cambiarSede(s.id, (y) => { y.nombre = e.target.value; }, { tecleo: true }) }),
      h('select', { 'aria-label': 'Tipo de sitio', onchange: (e) => cambiarSede(s.id, (y) => { y.tipo = e.target.value; }) },
        Object.entries(TIPOS_SEDE).map(([k, v]) => h('option', { value: k, selected: k === s.tipo }, `${v.icono} ${v.etiqueta}`))),
      h('label', { class: 'casilla' },
        h('input', { type: 'radio', name: 'sede-defecto', checked: d.perfil.sedePorDefecto === s.id,
          onchange: () => estado.cambiar((x) => { x.perfil.sedePorDefecto = s.id; }) }),
        'Por defecto'),
      h('button', { class: 'boton-icono', 'aria-label': `Quitar ${s.nombre}`,
        onclick: () => cambiarSede(s.id, (y, x) => {
          y.archivado = true;
          if (x.perfil.sedePorDefecto === y.id) x.perfil.sedePorDefecto = null;
        }) }, '🗑'))),
    h('button', { class: 'boton secundario', onclick: () => estado.cambiar((x) => {
      x.sedes.push(nuevaSede(sedes.length ? `Sitio ${sedes.length + 1}` : 'Mi gimnasio'));
    }) }, '+ Añadir sitio'));
}

// Casilla numérica de Ajustes que guarda al teclear.
function numeroAjuste(etiqueta, valor, guardar) {
  return h('label', { class: 'campo' },
    h('span', { class: 'etiqueta-campo' }, etiqueta),
    h('input', { type: 'text', inputmode: 'decimal', value: valor ?? '',
      oninput: (e) => estado.cambiar((x) => guardar(x, leerNumero(e.target.value)), { tecleo: true }) }));
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
