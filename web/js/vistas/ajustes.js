import { creditosCargados } from '../imagenes.js';
import { formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { desconectar, eliminarCuenta, rehacerCopiasLegibles, sincronizar, situacionActual } from '../sincronizacion.js';
import { idApartado, modal } from '../ui.js';
import { VERSION_APP } from '../version.js';
import { anadir, aviso, confirmar, h, hoyISO, leerNumero } from '../ui.js';
import { DESCANSO_ESTIRAMIENTOS_POR_DEFECTO, DESCANSO_TRAMOS_POR_DEFECTO, RESPIRACION_POR_DEFECTO } from './descanso.js';
import { TIPOS_SEDE, nuevaSede, sedesActivas } from '../sedes.js';
import { calibrar, textoCalibracion } from '../formula1rm.js';
import { TEXTO_AVISO, guardarPruebaEnCuenta } from '../modo-prueba.js';
import { explicaciones1RM, opciones } from './ejercicios.js';
import { tramosPorDefecto } from '../calculos.js';
import { MODOS_GLOSARIO, modoGlosario } from './glosario.js';
import { pista } from './tutorial.js';
import { MODOS_ENTRENO } from './sesion.js';
import { aplicarTema, hacerCuestionario } from './cuestionario.js';

// Ajustes: lo importante arriba (perfil y cuenta) y el resto en apartados
// plegados, para que no se vea todo de golpe.
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
    const texto = sinCuenta
      ? '¿Salir? Los datos de prueba se quedan en este dispositivo y los verás si vuelves a «Probar sin cuenta».'
      : estado.meta().pendiente
        ? 'Hay cambios que aún no se han subido a Google Drive. Se quedan guardados en este dispositivo y se subirán la próxima vez que entres. ¿Salir?'
        : '¿Salir de la cuenta en este dispositivo?';
    if (!await confirmar(texto, { si: 'Salir' })) return;
    desconectar();
    estado.cerrarUsuario();
    location.hash = '#/';
  }

  // Un apartado plegado: título y, dentro, sus ajustes.
  // Cada apartado lleva su id (sacado del título) para que la guía pueda
  // señalarlo y para poder enlazarlo desde otra pantalla.
  const apartado = (titulo, ...contenido) => h('details', { class: 'tarjeta formulario apartado', id: idApartado(titulo) },
    h('summary', {}, titulo), ...contenido);

  anadir(contenedor,
    h('h1', {}, 'Ajustes'),
    pista('ajustes', 'Todo va en apartados plegados: toca uno para abrirlo. Las explicaciones, el glosario y el '
      + 'tutorial están en la pestaña «Aprender».'),
    apartado('Perfil',
      h('label', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Nombre'),
        h('input', { type: 'text', value: d.perfil.nombre || '',
          oninput: (e) => estado.cambiar((x) => { x.perfil.nombre = e.target.value.trim(); }, { tecleo: true }) })),
      h('label', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Peso corporal (kg)'),
        h('input', { type: 'text', inputmode: 'decimal', value: d.perfil.pesoCorporalKg ?? '',
          oninput: (e) => estado.cambiar((x) => { x.perfil.pesoCorporalKg = leerNumero(e.target.value); }, { tecleo: true }) }),
        h('small', { class: 'nota' },
          'Solo para calcular la carga en flexiones, dominadas y máquinas asistidas; esta app no va de controlar el peso.'))),

    apartado('Personalización',
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Tema'),
        opciones({ claro: { etiqueta: 'Claro' }, oscuro: { etiqueta: 'Oscuro' }, sistema: { etiqueta: 'Como el móvil' } }, d.perfil.tema ?? 'sistema',
          (t) => { estado.cambiar((x) => { x.perfil.tema = t; }); aplicarTema(t); }, { compacto: true }),
        h('small', { class: 'nota' }, 'El diseño con nombre e icono propios llegará más adelante.'))),

    apartado('Cuenta y copia de seguridad',
      sinCuenta
        ? [h('p', {}, TEXTO_AVISO),
          h('button', { class: 'boton', onclick: guardarPruebaEnCuenta }, 'Entrar con Google y guardar lo hecho')]
        : [
          h('p', {}, 'Conectado como ', h('strong', {}, estado.usuario())),
          h('p', { class: `suave ${['al-dia', 'sincronizando'].includes(situacion) ? '' : 'peligro-texto'}` }, textoSituacion(situacion), detalle && ` ${detalle}`),
          h('p', { class: 'nota' }, 'Todo lo de esta pantalla se guarda también en tu Google Drive, con tus entrenamientos.'),
          h('button', { class: 'boton secundario', onclick: () => sincronizar({ interactivo: true }) }, 'Sincronizar ahora'),
        ],
      h('button', { class: 'boton secundario', onclick: descargarCopia }, 'Descargar una copia de mis datos'),
      !sinCuenta && h('p', { class: 'nota' }, 'En tu Google Drive, en la carpeta «App de entrenamiento», están el archivo de datos y dos hojas de cálculo '
        + 'legibles (entrenamientos; ejercicios y rutinas) que se rehacen solas como mucho cada media hora. '
        + 'Si alguno queda suelto en «Mi unidad», la app lo recoge al abrirse.'),
      !sinCuenta && h('button', { class: 'boton enlace', onclick: async () => {
        try { await rehacerCopiasLegibles(); aviso('Hojas legibles actualizadas en Google Drive.'); } catch (e) { aviso(`No se ha podido: ${e.message}`, { tipo: 'error' }); }
      } }, 'Rehacer ahora las hojas legibles'),
      h('p', { class: 'nota' }, h('a', { href: 'privacidad.html', target: '_blank', rel: 'noopener' }, 'Política de privacidad')),
      h('button', { class: 'boton enlace', onclick: salir }, sinCuenta ? 'Salir del modo de prueba' : 'Salir de la cuenta')),

    apartado('Descansos',
      numeroAjuste('Entre series (segundos)', d.perfil.descansoSegundos, (x, v) => { x.perfil.descansoSegundos = v; }),
      numeroAjuste('Entre estiramientos (segundos)', d.perfil.descansoEstiramientos ?? DESCANSO_ESTIRAMIENTOS_POR_DEFECTO,
        (x, v) => { x.perfil.descansoEstiramientos = v; }),
      h('small', { class: 'nota' }, 'El cronómetro arranca solo al apuntar una serie, y al apuntar la última bajada de un drop set. '
        + 'Ponlo a 0 para desactivarlo. Si lo saltas o le añades tiempo, la app te ofrece cambiarlo desde allí.'),
      h('div', { class: 'fila-campos' },
        [['drop-set', 'Entre bajadas (s)'], ['rest-pause', 'Rest-pause (s)']]
          .map(([clave, texto]) => numeroAjuste(texto, d.perfil.descansoTramos?.[clave] ?? DESCANSO_TRAMOS_POR_DEFECTO[clave],
            (x, v) => { x.perfil.descansoTramos = { ...DESCANSO_TRAMOS_POR_DEFECTO, ...x.perfil.descansoTramos, [clave]: v }; }))),
      h('small', { class: 'nota' }, 'Dentro de una serie: lo justo para cambiar el disco o recuperar el aliento entre miniseries.'),
      h('p', { class: 'nota' }, 'Entre miniseries de miorrepeticiones no hay reloj, sino una guía de respiración.'),
      h('div', { class: 'fila-campos' },
        numeroAjuste('Respiraciones', d.perfil.respiracion?.veces ?? RESPIRACION_POR_DEFECTO.veces,
          (x, v) => { x.perfil.respiracion = { ...RESPIRACION_POR_DEFECTO, ...x.perfil.respiracion, veces: v }; }),
        numeroAjuste('Coger aire (s)', d.perfil.respiracion?.inspirar ?? RESPIRACION_POR_DEFECTO.inspirar,
          (x, v) => { x.perfil.respiracion = { ...RESPIRACION_POR_DEFECTO, ...x.perfil.respiracion, inspirar: v }; }),
        numeroAjuste('Soltarlo (s)', d.perfil.respiracion?.espirar ?? RESPIRACION_POR_DEFECTO.espirar,
          (x, v) => { x.perfil.respiracion = { ...RESPIRACION_POR_DEFECTO, ...x.perfil.respiracion, espirar: v }; }))),

    apartado('Entrenamiento y series',
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Cómo ir por el entrenamiento'),
        opciones(MODOS_ENTRENO, d.perfil.modoEntreno ?? 'ejercicio', (m) => estado.cambiar((x) => { x.perfil.modoEntreno = m; }), { compacto: true }),
        h('small', { class: 'nota' }, 'Es lo que sale marcado al empezar cada entrenamiento; allí puedes elegir otra cosa.')),
      numeroAjuste('Repeticiones en recámara por defecto', d.perfil.recamaraPorDefecto, (x, v) => { x.perfil.recamaraPorDefecto = v; }),
      h('small', { class: 'nota' }, 'Las que sueles dejarte sin hacer al acabar una serie. Viene puesto 1 porque es lo que recomendamos '
        + '(quedarse a una del fallo rinde casi igual y cansa menos). Aparece ya puesto y se apunta aparte: «45 kg × 12 + 1».'),
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Los «?» que explican las palabras'),
        opciones(MODOS_GLOSARIO, modoGlosario(d), (m) => estado.cambiar((x) => { x.perfil.glosario = m; }), { compacto: true }),
        h('small', { class: 'nota' }, 'Salen detrás de palabras como 1RM, recámara o drop set. También se quitan desde el propio cartel.')),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: d.perfil.preguntarVista !== false,
          onchange: (e) => estado.cambiar((x) => { x.perfil.preguntarVista = e.target.checked; }) }),
        'Preguntar «¿cómo quieres verlo?» al empezar cada entrenamiento'),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: d.perfil.preguntarComoLlegas !== false,
          onchange: (e) => estado.cambiar((x) => { x.perfil.preguntarComoLlegas = e.target.checked; x.perfil.comoLlegasSaltos = 0; }) }),
        'Preguntar «¿cómo llegas hoy?» al empezar (tu sensación de cada músculo, para afinar la recuperación)'),
      h('h3', {}, 'Drop sets'),
      h('div', { class: 'fila-campos' },
        numeroAjuste('Bajadas', d.perfil.dropSet?.bajadas ?? 4, (x, v) => { x.perfil.dropSet = { ...x.perfil.dropSet, bajadas: v }; }),
        numeroAjuste('Kilos por bajada', d.perfil.dropSet?.salto ?? 10, (x, v) => { x.perfil.dropSet = { ...x.perfil.dropSet, salto: v }; }),
        numeroAjuste('Arranca al (% del 1RM)', d.perfil.dropSet?.inicioPorcentaje ?? 80, (x, v) => { x.perfil.dropSet = { ...x.perfil.dropSet, inicioPorcentaje: v }; })),
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Los pesos del drop set, por'),
        opciones({ rm: { etiqueta: '% del 1RM' }, kg: { etiqueta: 'Kilos a mano' } }, d.perfil.dropSet?.modoCarga ?? 'rm',
          (m) => estado.cambiar((x) => { x.perfil.dropSet = { ...x.perfil.dropSet, modoCarga: m, autoRellenar: m === 'rm' }; }), { compacto: true }),
        h('small', { class: 'nota' }, 'Por % del 1RM: haces la Bilbo con 60 kg × 20 y el drop set de debajo se rellena solo al porcentaje de arriba. '
          + 'A mano: los kilos se quedan como los dejes. Cada ejercicio, cada rutina y cada serie del día pueden cambiarlo.')),
      h('h3', {}, 'Rest-pause y miorrepeticiones'),
      h('div', { class: 'fila-campos' },
        numeroAjuste('Miniseries de rest-pause', tramosPorDefecto(d.perfil, 'rest-pause').tramos,
          (x, v) => { x.perfil.tramosPorDefecto = { ...x.perfil.tramosPorDefecto, 'rest-pause': { ...x.perfil.tramosPorDefecto?.['rest-pause'], tramos: v } }; }),
        numeroAjuste('Tramos de miorrepeticiones', tramosPorDefecto(d.perfil, 'miorepeticiones').tramos,
          (x, v) => { x.perfil.tramosPorDefecto = { ...x.perfil.tramosPorDefecto, miorepeticiones: { ...x.perfil.tramosPorDefecto?.miorepeticiones, tramos: v } }; }),
        numeroAjuste('Repeticiones por miniserie', tramosPorDefecto(d.perfil, 'miorepeticiones').reps,
          (x, v) => { x.perfil.tramosPorDefecto = { ...x.perfil.tramosPorDefecto, miorepeticiones: { ...x.perfil.tramosPorDefecto?.miorepeticiones, reps: v } }; })),
      h('small', { class: 'nota' }, 'Lo que propone la app al crear estas series; cada ejercicio puede tener lo suyo en su ficha.')),

    apartado('Ciclos (Bilbo y otros)',
      numeroAjuste('Un ciclo nuevo empieza al (% de tu 1RM)', d.perfil.bilboInicioPorcentaje ?? 50,
        (x, v) => { x.perfil.bilboInicioPorcentaje = v; }),
      h('small', { class: 'nota' }, 'Al empezar un ciclo, el primer día va a este porcentaje de tu mejor 1RM estimado en ese ejercicio y cada día '
        + 'sube un poco. Empezar bajo deja margen para superarte muchos días seguidos con series largas.'),
      numeroAjuste('El ciclo se agota cuando el objetivo baja de (repeticiones)', d.perfil.bilboMinReps ?? 15,
        (x, v) => { x.perfil.bilboMinReps = v; }),
      h('small', { class: 'nota' }, 'Cuando el peso del día pide menos repeticiones que estas, la app avisa de que toca ciclo nuevo.')),

    seccionSedes(d, apartado),

    d.ejercicios.some((e) => e.borrado) && apartado(`Ejercicios borrados (${d.ejercicios.filter((e) => e.borrado).length})`,
      h('p', { class: 'nota' }, 'Conservan su historial. Recupéralos si borraste alguno sin querer.'),
      h('ul', { class: 'lista-enlaces' }, d.ejercicios.filter((e) => e.borrado).map((e) => h('li', { class: 'fila-ejercicio' },
        h('span', {}, e.nombre, h('small', { class: 'suave' }, ` · borrado el ${e.borrado}`)),
        h('button', { class: 'boton enlace', onclick: () => {
          estado.cambiar((x) => { const y = x.ejercicios.find((z) => z.id === e.id); if (y) { y.borrado = null; y.archivado = false; } });
          aviso(`${e.nombre} recuperado.`);
        } }, 'Recuperar'))))),

    apartado('Zona de peligro',
      h('p', { class: 'nota' }, 'Dos botones que no tienen vuelta atrás. Cada uno pide escribir una palabra para confirmar.'),
      h('button', { class: 'boton secundario peligro-texto', onclick: () => zonaPeligro('borrar') }, 'Borrar todos mis datos'),
      h('p', { class: 'nota' }, 'Se vacían ejercicios, rutinas, entrenamientos y ajustes, aquí y en Google Drive. La cuenta sigue conectada.'),
      h('button', { class: 'boton peligro', onclick: () => zonaPeligro('eliminar') }, sinCuenta ? 'Eliminar los datos de prueba' : 'Eliminar mi cuenta'),
      h('p', { class: 'nota' }, sinCuenta
        ? 'Se borra todo lo de prueba de este dispositivo.'
        : 'Se borran los archivos de la app en tu Google Drive (datos, copias y hojas), la copia de este dispositivo y el permiso '
          + 'que diste a la app. Para volver tendrías que entrar con Google otra vez, desde cero.')),

    h('p', { class: 'nota centrado' },
      `Versión ${VERSION_APP} · formato de datos v${d.version} · revisión ${formatearNumero(d.revision)}`));

  // Dos capas: un cartel que explica y una palabra que hay que escribir.
  function zonaPeligro(accion) {
    const palabra = accion === 'borrar' ? 'BORRAR' : 'ELIMINAR';
    const campo = h('input', { type: 'text', autocomplete: 'off', placeholder: `Escribe ${palabra}` });
    const botonFinal = h('button', { class: 'boton peligro', disabled: true, onclick: () => ejecutar() },
      accion === 'borrar' ? 'Borrar todos mis datos' : 'Eliminar para siempre');
    campo.addEventListener('input', () => { botonFinal.disabled = campo.value.trim().toUpperCase() !== palabra; });
    const cerrar = modal(accion === 'borrar' ? '¿Borrar todos tus datos?' : '¿Eliminar tu cuenta?', h('div', { class: 'formulario' },
      h('p', {}, accion === 'borrar'
        ? 'Se vacían todos tus ejercicios, rutinas, entrenamientos y ajustes. Se conservan tu nombre y la conexión con Google. '
          + 'El archivo de Google Drive se sobrescribe vacío en cuanto haya conexión.'
        : sinCuenta
          ? 'Se borra todo lo que has hecho en modo prueba en este dispositivo.'
          : 'Se borran los archivos de la app en tu Google Drive, la copia de este dispositivo y el permiso de la app. '
            + 'No hay copia en ningún otro sitio: si quieres conservar algo, descarga antes una copia.'),
      h('p', { class: 'nota' }, `Para confirmar, escribe ${palabra} en mayúsculas.`),
      campo,
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton secundario', onclick: () => cerrar() }, 'Cancelar'),
        botonFinal)));

    async function ejecutar() {
      botonFinal.disabled = true;
      botonFinal.textContent = 'Un momento…';
      try {
        if (accion === 'borrar') {
          estado.vaciarDatos();
          cerrar();
          if (!sinCuenta) await sincronizar({ interactivo: true });
          aviso('Todos tus datos se han borrado.');
          location.hash = '#/';
        } else {
          const n = await eliminarCuenta();
          cerrar();
          aviso(sinCuenta ? 'Datos de prueba eliminados.' : `Cuenta eliminada: ${n} archivos borrados de tu Google Drive.`, { ms: 8000 });
          location.hash = '#/';
        }
      } catch (e) {
        botonFinal.disabled = false;
        botonFinal.textContent = 'Reintentar';
        aviso(`No se ha podido: ${e.message}`, { tipo: 'error', ms: 8000 });
      }
    }
  }
}

// Sitios donde entrenas. El de por defecto es el que se pone al empezar un
// entrenamiento sin rutina (las rutinas pueden tener el suyo).
function seccionSedes(d, apartado) {
  const sedes = sedesActivas(d);
  const cambiarSede = (id, fn, opcionesCambio) => estado.cambiar((x) => {
    const s = x.sedes.find((y) => y.id === id);
    if (s) fn(s, x);
  }, opcionesCambio);
  return apartado(sedes.length ? `Dónde entrenas (${sedes.length})` : 'Dónde entrenas',
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
      h('button', { class: 'boton-icono papelera', 'aria-label': `Quitar ${s.nombre}`,
        onclick: async () => {
          if (!await confirmar(`¿Quitar «${s.nombre}»? Los entrenamientos hechos allí se conservan.`, { si: 'Quitar', peligro: true })) return;
          cambiarSede(s.id, (y, x) => {
            y.archivado = true;
            if (x.perfil.sedePorDefecto === y.id) x.perfil.sedePorDefecto = null;
          });
        } }, '🗑'))),
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
    desconectada: 'Sin guardar en Google Drive: solo en este dispositivo.',
    sincronizando: 'Guardando en Google Drive…',
    'al-dia': 'Todo guardado en Google Drive.',
    pendiente: 'Sin subir a Google Drive: solo en este dispositivo.',
    'sin-internet': 'Sin internet: se subirá a Google Drive al recuperar la conexión.',
    error: 'No se ha podido guardar en Google Drive.',
  }[situacion] ?? '';
}
