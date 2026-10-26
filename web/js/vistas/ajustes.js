import { icono } from '../iconos.js';
import { apuntarPeso } from '../peso.js';
import { creditosCargados } from '../imagenes.js';
import { BILBO_RECAMARA_POR_DEFECTO, BILBO_REPS_MAX_POR_DEFECTO, REDONDEO_MANCUERNAS_POR_DEFECTO, REDONDEO_POR_DEFECTO, formatearNumero } from '../calculos.js';
import * as estado from '../estado.js';
import { apartarCopia, copiasAparte, desconectar, eliminarCuenta, juntarCopia, rehacerCopiasLegibles, sincronizar, situacionActual } from '../sincronizacion.js';
import { apartadoPlegable, ayuda, modal, selector } from '../ui.js';
import { ADELANTO_SEMANAL_MIN, NECESIDAD_SUENO_POR_DEFECTO, SUENO_MINIMO_H, horaAvisoPvt } from '../diario.js';
import { activarAvisoPvt, programarAvisoPvt, quitarAvisoPvt } from './pvt.js';
import { VERSION_APP } from '../version.js';
import { anadir, aviso, confirmar, h, hoyISO, leerNumero } from '../ui.js';
import { DESCANSO_ESTIRAMIENTOS_POR_DEFECTO, DESCANSO_TRAMOS_POR_DEFECTO, RESPIRACION_POR_DEFECTO, activarNotificaciones, probarAviso, puedeNotificar } from './descanso.js';
import { TIPOS_SEDE, nuevaSede, sedesActivas } from '../sedes.js';
import { calibrar, textoCalibracion } from '../formula1rm.js';
import { TEXTO_AVISO, guardarPruebaEnCuenta } from '../modo-prueba.js';
import { explicaciones1RM, opciones } from './ejercicios.js';
import { tramosPorDefecto } from '../calculos.js';
import { FORMAS_DROP_SET, FORMA_DROP_SET_POR_DEFECTO } from '../recuperacion.js';
import { MODOS_GLOSARIO, modoGlosario } from './glosario.js';
import { pista } from './tutorial.js';
import { botonImportar } from './importar.js';
import { MODOS_ENTRENO } from './sesion.js';
import { TEMAS, aplicarTema, hacerCuestionario } from './cuestionario.js';

// Aviso de la mañana para hacer el test de atención del Diario. Una web no se
// despierta sola con el navegador cerrado, así que el texto no promete más de
// lo que puede: con la app abierta suena a su hora y, si no, queda la tarjeta
// de «hoy no lo has hecho» en Hoy y en el Diario.
function avisoTestAtencion(d) {
  const permiso = puedeNotificar() ? Notification.permission : 'no';
  const activo = Boolean(d.perfil.avisarPvt) && permiso === 'granted';
  const hora = horaAvisoPvt(d);
  const texto = activo ? `¡Te aviso a las ${hora ?? '--:--'} para el test de atención!`
    : d.perfil.avisarPvt && permiso === 'denied' ? 'Este móvil tiene bloqueados los avisos de la app'
      : d.perfil.avisarPvt ? 'Falta el permiso en este móvil: tocar para darlo'
        : 'Sin aviso del test de atención: tocar para activarlo';
  return [
    h('h3', {}, 'Test de atención por la mañana'),
    h('div', { class: 'fila-marcas compacta' },
      h('button', { type: 'button', class: `boton-marca${activo ? ' activo' : ''}`, 'aria-pressed': String(activo),
        onclick: async () => { if (activo) { quitarAvisoPvt(); return; } await activarAvisoPvt(); } }, texto)),
    activo && h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Hora del aviso'),
      h('input', { type: 'time', value: hora ?? '',
        onchange: (ev) => { estado.cambiar((x) => { x.perfil.avisarPvtHora = ev.target.value || null; }); programarAvisoPvt(); } })),
    h('small', { class: 'nota' }, !hora
      ? 'Sin hora: pon en Perfil la hora a la que quieres levantarte y el aviso saldrá media hora después.'
      : 'Media hora después de tu hora de levantarte, salvo que pongas otra. Solo avisa si ese día aún no has hecho el test. '
        + 'Con el navegador cerrado puede no llegar; entonces lo verás en Hoy y en el Diario al abrir la app.'),
  ];
}

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
  const apartado = apartadoPlegable;

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
          onchange: (e) => estado.cambiar((x) => { apuntarPeso(x, leerNumero(e.target.value)); }) }),
        h('small', { class: 'nota' },
          'Para calcular la carga en flexiones, dominadas y máquinas asistidas. Se apunta con la fecha de hoy; el historial, en Cuerpo.')),
      camposSueno(d)),

    apartado('Personalización',
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Tema'),
        opciones(TEMAS, d.perfil.tema ?? 'sistema',
          (t) => { estado.cambiar((x) => { x.perfil.tema = t; }); aplicarTema(t); }, { compacto: true }),
        h('small', { class: 'nota' }, 'Claro, oscuro o como el móvil, y seis con más carácter. Los de fantasía son un primer intento: '
          + 'si alguno se lee mal en tu móvil, dímelo con una captura.'))),

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
      !sinCuenta && h('p', { class: 'nota' }, 'En tu Google Drive, en la carpeta «App de entrenamiento», están el archivo de datos y tres hojas de cálculo '
        + 'legibles (la de progresión como tus Excel, la de entrenamientos y la de ejercicios y rutinas) que se rehacen solas como mucho cada media hora. '
        + 'Si alguno queda suelto en «Mi unidad», la app lo recoge al abrirse.'),
      !sinCuenta && h('button', { class: 'boton enlace', onclick: async () => {
        try { await rehacerCopiasLegibles(); aviso('Hojas legibles actualizadas en Google Drive.'); } catch (e) { aviso(`No se ha podido: ${e.message}`, { tipo: 'error' }); }
      } }, 'Rehacer ahora las hojas legibles'),
      !sinCuenta && estado.meta().csvIds?.progresionXlsx && h('a', { class: 'boton secundario', target: '_blank', rel: 'noopener',
        href: `https://drive.google.com/file/d/${estado.meta().csvIds.progresionXlsx}/view` }, 'Abrir el Excel de progresión'),
      h('button', { class: 'boton secundario', onclick: async () => {
        const { xlsxProgresion } = await import('../exportar.js');
        const url = URL.createObjectURL(new Blob([xlsxProgresion(estado.datos())], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const a = h('a', { href: url, download: 'Progresión por ejercicio.xlsx' });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } }, 'Descargar el Excel de progresión'),
      !sinCuenta && h('button', { class: 'boton enlace', onclick: verCopiasAparte }, 'Recuperar algo de una copia guardada aparte'),
      h('p', { class: 'nota' }, 'Si llevabas tus entrenamientos en hojas de cálculo, puedes cargar su historial (el archivo que prepara el '
        + 'programa de importar). Se junta con lo que ya tienes, sin pisar nada.'),
      botonImportar(),
      h('button', { class: 'boton enlace', onclick: salir }, sinCuenta ? 'Salir del modo de prueba' : 'Salir de la cuenta')),

    // Los intervalos que guardaste desde el cronómetro de HIIT: aquí se ven
    // todos y se quitan, además de desde el propio cartel.
    apartado('Intervalos (HIIT)',
      h('p', { class: 'nota' }, 'Se usan desde el botón «Intervalos» de cualquier ejercicio que se mida en tiempo. Los tuyos se '
        + 'guardan allí con «Guardar estos intervalos como míos».'),
      (d.perfil.hiitPropios ?? []).length
        ? h('ul', { class: 'lista-enlaces' }, d.perfil.hiitPropios.map((x) => h('li', { class: 'fila-ejercicio' },
          h('span', {}, `${x.trabajo} s de trabajo, ${x.descanso} s de descanso, ${x.rondas} rondas`),
          h('button', { class: 'boton enlace peligro-texto', onclick: () => {
            estado.cambiar((y) => { y.perfil.hiitPropios = (y.perfil.hiitPropios ?? []).filter((z) => z.nombre !== x.nombre); });
            aviso('Intervalos quitados.');
          } }, 'Quitar'))))
        : h('p', { class: 'suave' }, 'Aún no has guardado ninguno.')),

    apartado('Descansos',
      numeroAjuste('Entre series (segundos)', d.perfil.descansoSegundos, (x, v) => { x.perfil.descansoSegundos = v; }),
      numeroAjuste('Entre estiramientos (segundos)', d.perfil.descansoEstiramientos ?? DESCANSO_ESTIRAMIENTOS_POR_DEFECTO,
        (x, v) => { x.perfil.descansoEstiramientos = v; }),
      h('small', { class: 'nota' }, 'El cronómetro arranca solo al apuntar el peso y las repeticiones de una serie, y al apuntar la última bajada de una serie descendente. '
        + 'Ponlo a 0 para desactivarlo. Si lo saltas o le añades tiempo, la app te ofrece cambiarlo desde allí.'),
      // El permiso es de cada móvil: «activado» solo si además este móvil lo ha dado.
      (() => {
        const permiso = puedeNotificar() ? Notification.permission : 'no';
        const activo = Boolean(d.perfil.avisarDescanso) && permiso === 'granted';
        const texto = activo ? '¡Te aviso cuando acaben los descansos!'
          : d.perfil.avisarDescanso && permiso === 'denied' ? 'Este móvil tiene bloqueados los avisos de la app'
            : d.perfil.avisarDescanso ? 'Falta el permiso en este móvil: tocar para darlo'
              : 'Sin avisos al acabar el descanso: tocar para activarlos';
        return [h('div', { class: 'fila-marcas compacta' },
          h('button', { type: 'button', class: `boton-marca${activo ? ' activo' : ''}`, 'aria-pressed': String(activo),
            onclick: async () => {
              if (activo) { estado.cambiar((x) => { x.perfil.avisarDescanso = false; }); return; }
              await activarNotificaciones();
            } }, texto)),
        permiso === 'denied' && h('small', { class: 'nota' }, 'Para desbloquearlos: en los ajustes del móvil → Aplicaciones → la app (o Chrome) → Notificaciones → permitir.')];
      })(),
      h('small', { class: 'nota' }, puedeNotificar()
        ? 'Con la app instalada: mientras dura el descanso, la notificación va diciendo cuánto queda; al acabar, suena y vibra aunque tengas la pantalla apagada.'
        : 'Este navegador no admite notificaciones; en el móvil, con la app instalada, sí.'),
      h('button', { type: 'button', class: 'boton secundario', onclick: probarAviso }, 'Probar la vibración'),
      h('small', { class: 'nota' }, 'Suena y vibra al tocar y, con los avisos puestos, otra vez a los 10 s (bloquea el móvil para ver la notificación). '
        + 'Con la app delante suena el sonido propio de la app; con el móvil bloqueado, el de las notificaciones, que se cambia en los ajustes del móvil (Notificaciones → la app → sonido). '
        + 'Si no vibra, es cosa del móvil: en sus Ajustes → Notificaciones → la app (o Chrome), que las notificaciones vibren; '
        + 'y en Sonido y vibración, que la vibración de notificaciones y de toques no esté a cero.'),
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
          (x, v) => { x.perfil.respiracion = { ...RESPIRACION_POR_DEFECTO, ...x.perfil.respiracion, espirar: v }; })),
      // --- Aviso del test de atención (PVT), por la mañana. Mismo patrón que
      // el aviso del descanso de aquí arriba: el permiso es de este móvil y el
      // ajuste viaja con la cuenta. El test está en el Diario.
      avisoTestAtencion(d)),

    apartado('Entrenamiento y series',
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Cómo ir por el entrenamiento'),
        opciones(MODOS_ENTRENO, d.perfil.modoEntreno ?? 'ejercicio', (m) => estado.cambiar((x) => { x.perfil.modoEntreno = m; }), { compacto: true }),
        h('small', { class: 'nota' }, 'Es lo que sale marcado al empezar cada entrenamiento; allí puedes elegir otra cosa.')),
      numeroAjuste('Repeticiones en recámara por defecto', d.perfil.recamaraPorDefecto, (x, v) => { x.perfil.recamaraPorDefecto = v; }),
      h('small', { class: 'nota' }, 'Las que sueles dejarte sin hacer al acabar una serie. Viene puesto 1 porque es lo que recomendamos '
        + '(quedarse a una del fallo rinde casi igual y cansa menos). Aparece ya puesto y se apunta aparte: «45 kg × 12 + 1».'),
      numeroAjuste('Los pesos que propone la app van de (kg)', d.perfil.redondeoKg ?? REDONDEO_POR_DEFECTO,
        (x, v) => { x.perfil.redondeoKg = v > 0 ? v : REDONDEO_POR_DEFECTO; }),
      numeroAjuste('Las mancuernas van de (kg)', d.perfil.redondeoMancuernasKg ?? REDONDEO_MANCUERNAS_POR_DEFECTO,
        (x, v) => { x.perfil.redondeoMancuernasKg = v > 0 ? v : REDONDEO_MANCUERNAS_POR_DEFECTO; }),
      h('small', { class: 'nota' }, `Viene puesto ${formatearNumero(REDONDEO_POR_DEFECTO)}: el disco más pequeño habitual (1,25 kg) por los dos lados. `
        + 'Pon 0,25 si tienes microdiscos, 5 si en tu gimnasio no hay menos. Cada ejercicio puede llevar el suyo en «Ajustes finos» '
        + 'de su ficha (mancuernas de 2 en 2, por ejemplo).'),
      (d.perfil.prehechos ?? []).length > 0 && h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Mis prehechos (reglas guardadas)'),
        h('ul', { class: 'lista-prehechos' }, d.perfil.prehechos.map((m) => h('li', {},
          h('span', {}, h('strong', {}, m.nombre), h('small', { class: 'bloque suave' }, m.descripcion)),
          h('button', { type: 'button', class: 'boton-icono papelera', 'aria-label': `Quitar ${m.nombre}`, onclick: async () => {
            if (!await confirmar(`¿Quitar el prehecho «${m.nombre}»? Las series que ya lo usan no cambian.`, { si: 'Quitar', peligro: true })) return;
            estado.cambiar((x) => { x.perfil.prehechos = x.perfil.prehechos.filter((y) => y.id !== m.id); });
          } }, icono('papelera'))))),
        h('small', { class: 'nota' }, 'Se guardan desde la ficha de un ejercicio, con «Guardar esta regla como prehecho mío».')),
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Los «?» que explican las palabras'),
        opciones(MODOS_GLOSARIO, modoGlosario(d), (m) => estado.cambiar((x) => { x.perfil.glosario = m; }), { compacto: true }),
        h('small', { class: 'nota' }, 'Salen detrás de palabras como 1RM, recámara o serie descendente. También se quitan desde el propio cartel.')),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: d.perfil.preguntarVista !== false,
          onchange: (e) => estado.cambiar((x) => { x.perfil.preguntarVista = e.target.checked; }) }),
        'Preguntar «¿cómo quieres verlo?» al empezar cada entrenamiento'),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: d.perfil.preguntarComoLlegas !== false,
          onchange: (e) => estado.cambiar((x) => { x.perfil.preguntarComoLlegas = e.target.checked; x.perfil.comoLlegasSaltos = 0; }) }),
        'Preguntar «¿cómo llegas hoy?» al empezar (tu sensación de cada músculo, para afinar la recuperación)'),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: d.perfil.calentamientoRedondo !== false,
          onchange: (e) => estado.cambiar((x) => { x.perfil.calentamientoRedondo = e.target.checked; }) }),
        'Calentamientos con pesos redondos, de 10 en 10 kg (sin cuentas; si lo quitas, van con el % exacto)'),
      [['recamara', 'Avisarme si se me olvida apuntar la recámara'], ['saltos', 'Avisarme si me salto un ejercicio'],
        ['rmHoy', 'Proponerme otro peso si mi 1RM de hoy cambia a mitad del ejercicio'],
        ['recuperacion', 'Avisarme en un ejercicio si sus músculos aún no están recuperados']].map(([clave, texto]) => h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: d.perfil.avisosEntreno?.[clave] !== false,
          onchange: (e) => estado.cambiar((x) => { x.perfil.avisosEntreno = { ...x.perfil.avisosEntreno, [clave]: e.target.checked }; }) }),
        texto)),
      h('h3', {}, 'Series descendentes'),
      h('div', { class: 'fila-campos' },
        numeroAjuste('Bajadas', d.perfil.dropSet?.bajadas ?? 4, (x, v) => { x.perfil.dropSet = { ...x.perfil.dropSet, bajadas: v }; }),
        numeroAjuste('Kilos por bajada', d.perfil.dropSet?.salto ?? 10, (x, v) => { x.perfil.dropSet = { ...x.perfil.dropSet, salto: v }; }),
        numeroAjuste('Arranca al (% del 1RM)', d.perfil.dropSet?.inicioPorcentaje ?? 80, (x, v) => { x.perfil.dropSet = { ...x.perfil.dropSet, inicioPorcentaje: v }; })),
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Cuánto cuenta una serie descendente'),
        opciones(FORMAS_DROP_SET, d.perfil.cuentaDropSet ?? FORMA_DROP_SET_POR_DEFECTO, (m) => estado.cambiar((x) => { x.perfil.cuentaDropSet = m; }), { compacto: true }),
        h('small', { class: 'nota' }, FORMAS_DROP_SET[d.perfil.cuentaDropSet ?? FORMA_DROP_SET_POR_DEFECTO].descripcion)),
      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Los pesos de la serie descendente, por'),
        opciones({ rm: { etiqueta: '% del 1RM' }, kg: { etiqueta: 'Kilos a mano' } }, d.perfil.dropSet?.modoCarga ?? 'rm',
          (m) => estado.cambiar((x) => { x.perfil.dropSet = { ...x.perfil.dropSet, modoCarga: m, autoRellenar: m === 'rm' }; }), { compacto: true }),
        h('small', { class: 'nota' }, 'Por % del 1RM: haces la Bilbo con 60 kg × 20 y la serie descendente de debajo se rellena solo al porcentaje de arriba. '
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
      h('small', { class: 'nota' }, 'Cuando el peso del día pide menos repeticiones que estas, la app avisa de que toca ciclo nuevo.'),
      numeroAjuste('Como mucho, repeticiones en un día', d.perfil.bilboRepsMax ?? BILBO_REPS_MAX_POR_DEFECTO,
        (x, v) => { x.perfil.bilboRepsMax = v; }),
      h('small', { class: 'nota' }, 'El peso de un día nunca baja del que te daría estas repeticiones: así no te toca una serie de 30.'),
      numeroAjuste('Recámara en los ciclos', d.perfil.bilboRecamara ?? BILBO_RECAMARA_POR_DEFECTO,
        (x, v) => { x.perfil.bilboRecamara = v; }),
      h('small', { class: 'nota' }, 'Las repeticiones que dejas sin hacer en cada serie de un ciclo. Con 2 cansa menos y el objetivo ya las descuenta.')),

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

    h('a', { class: 'boton secundario boton-privacidad', href: 'privacidad.html', target: '_blank', rel: 'noopener' }, 'Política de privacidad'),

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
      selector(Object.entries(TIPOS_SEDE).map(([k, v]) => [k, v.etiqueta]), s.tipo,
        (v) => cambiarSede(s.id, (y) => { y.tipo = v; }), { titulo: 'Tipo de sitio', lista: true }),
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
        } }, icono('papelera')))),
    h('button', { class: 'boton secundario', onclick: () => estado.cambiar((x) => {
      x.sedes.push(nuevaSede(sedes.length ? `Sitio ${sedes.length + 1}` : 'Mi gimnasio'));
    }) }, '+ Añadir sitio'));
}

// El plan de sueño: a qué hora quieres levantarte, cuándo empieza el plan y
// cuánto necesitas dormir. Con esas tres cosas, Inicio calcula la hora de
// acostarse de esta semana (`horaAcostarse` en `diario.js`).
function camposSueno(d) {
  const necesidad = d.perfil.necesidadSuenoH ?? NECESIDAD_SUENO_POR_DEFECTO;
  return [
    // El estilo va en línea (centrar el título con su «?»): `estilo.css` lo
    // lleva otra tanda de cambios.
    h('div', { class: 'titulo-con-ayuda', style: 'justify-content: center' },
      h('span', { class: 'etiqueta-campo' }, 'Plan de sueño'),
      ayuda('Plan de sueño', [
        'Con la hora a la que quieres levantarte y la fecha de inicio, Inicio te dice a qué hora acostarte esta semana: '
        + `parte de la hora a la que te acuestas de verdad y la adelanta ${ADELANTO_SEMANAL_MIN} min cada semana, hasta `
        + 'llegar a tu hora de levantarte menos lo que necesitas dormir.',
        'Van con ella las dos horas que la acompañan: pantallas fuera 2 h antes y cenar antes de las 21:00. Juntas '
        + 'adelantaron unas 2 h la fase de 22 personas en 3 semanas, sin que perdieran sueño (Facer-Childs 2019).',
        `Nunca se propone una hora que deje menos de ${SUENO_MINIMO_H} h de sueño real (Watson 2015).`,
      ])),
    h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Hora de levantarse objetivo'),
      h('input', { type: 'time', value: d.perfil.levantarseObjetivo ?? '',
        onchange: (e) => estado.cambiar((x) => { x.perfil.levantarseObjetivo = e.target.value || null; }) })),
    h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Fecha de inicio del plan'),
      h('input', { type: 'date', value: d.perfil.inicioPlanSueno ?? '',
        onchange: (e) => estado.cambiar((x) => { x.perfil.inicioPlanSueno = e.target.value || null; }) })),
    h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Lo que necesitas dormir (horas)'),
      h('input', { type: 'text', inputmode: 'decimal', value: String(necesidad).replace('.', ','),
        onchange: (e) => {
          const v = leerNumero(e.target.value);
          if (v >= 4 && v <= 12) estado.cambiar((x) => { x.perfil.necesidadSuenoH = v; });
          else aviso('Pon entre 4 y 12 horas.', { tipo: 'error' });
        } }),
      h('small', { class: 'nota' }, 'Por defecto 8,5. Es la misma casilla que hay en el Diario.')),
    h('a', { class: 'boton secundario', href: '#/diario' }, 'Ir al Diario'),
  ];
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

// Copias que la app guardó aparte en Drive (cuando había cambios en dos
// dispositivos a la vez, o antes de actualizar el formato). Se juntan con lo
// de ahora y dejan de salir en la lista.
async function verCopiasAparte() {
  let copias;
  try {
    copias = await copiasAparte();
  } catch (e) {
    aviso(`No se ha podido mirar Drive: ${e.message}`, { tipo: 'error' });
    return;
  }
  const fecha = (nombre) => {
    const m = nombre.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
    if (!m) return nombre;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    return d.toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };
  const cerrar = modal('Copias guardadas aparte', h('div', { class: 'formulario' },
    copias.length
      ? [h('ul', { class: 'nota' },
        h('li', {}, 'Son versiones de tus datos que la app guardó por seguridad: cuando dos dispositivos cambiaron cosas a la vez, o antes de actualizarse.'),
        h('li', {}, '«Juntar» añade a lo de ahora todo lo que tenga la copia: no se borra nada.'),
        h('li', {}, 'Si un mismo entrenamiento o ajuste está en las dos y no coincide, se queda el de la copia.')),
        copias.map((c) => h('div', { class: 'fila-copia' },
          h('span', {}, fecha(c.name)),
          h('button', { class: 'boton', onclick: async () => {
            try {
              await juntarCopia(c.id);
              cerrar();
              aviso('Copia juntada con lo de ahora.');
            } catch (e) {
              aviso(`No se ha podido: ${e.message}`, { tipo: 'error' });
            }
          } }, 'Juntar'),
          h('button', { class: 'boton enlace', onclick: async (e) => {
            try { await apartarCopia(c.id); e.target.closest('.fila-copia').remove(); } catch (err) { aviso(`No se ha podido: ${err.message}`, { tipo: 'error' }); }
          } }, 'Ya está: quitar')))]
      : h('p', {}, 'No hay ninguna copia por juntar.')));
}
