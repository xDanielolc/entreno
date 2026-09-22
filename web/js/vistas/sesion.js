import {
  aPesoDisponible, cargaCorporal, cargaDesdeLectura, esfuerzoTotal, formatearNumero,
  redondear, rmDeReferencia, sugerenciaSerie, trabajoSerie, tramosPropuestos, usaTramos,
} from '../calculos.js';
import { guiaTrasPrueba, pintarGuia, pista } from './tutorial.js';
import { queEs } from './glosario.js';
import { abrirIntervalos } from './intervalos.js';
import { modal } from '../ui.js';
import * as estado from '../estado.js';
import {
  TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_SERIE, camposDe, recamaraDe, tipoDeFallo, tramosDe,
} from '../esquema.js';
import { imagenDe } from '../imagenes.js';
import {
  avisoPrimeraBajada, crearSerieDesdePlan, entradaDeEjercicio, modoCargaDe, origenModoCarga, recalcularTramos, saltoDeTramo,
  serieSuelta,
} from '../series.js';
import { anadir, aviso, confirmar, h, formatearTiempo, leerNumero, leerTiempo } from '../ui.js';
import { DESCANSO_ESTIRAMIENTOS_POR_DEFECTO, arrancarDescanso, arrancarRespiracion, barraDescanso, descansoDeTramo } from './descanso.js';
import { cuentaParaFatiga, tipoDeEjercicio } from '../catalogo.js';
import { ASISTENCIAS, ESCALA_MANO, PROGRAMAS, TECNICAS_ESTIRAMIENTO, extraDeSerie, medidasDe } from '../esquema.js';
import { ORDEN_MUSCULOS, nombreMusculo } from '../musculos.js';
import { ESCALA_RECUPERACION, puntuacionSentida, recuperacionPorMusculo } from '../recuperacion.js';
import { comparacionSerie, mostrarResumen } from './resumen-sesion.js';
import { ejercicioEnSede, nombreSede, sedesActivas } from '../sedes.js';
import { hoyISO } from '../ui.js';
import { ejercicioDesdeCatalogo, elegirEjercicio as abrirSelector } from './selector-ejercicios.js';
import { selectorTecnicas, textoTecnicas } from './tecnicas.js';

// Cómo se va por el entrenamiento: 'serie' (una serie cada vez), 'ejercicio'
// (un ejercicio cada vez) o 'todo'. Se recuerda por sesión mientras la app
// esté abierta, y la elección queda en el perfil para la próxima vez.
const guiado = new Map();     // id de sesión → { modo, pos }
const preguntandoVista = new Set();   // sesiones con el cartel de vista a punto de salir

export const MODOS_ENTRENO = {
  serie: { etiqueta: 'Solo la serie que toca', descripcion: 'Al apuntarla aparece la siguiente. Lo más limpio.' },
  ejercicio: { etiqueta: 'Solo el ejercicio en el que estoy', descripcion: 'Con todas sus series; pasas al siguiente cuando acabas.' },
  todo: { etiqueta: 'Todos los ejercicios', descripcion: 'La lista entera, para moverte libremente.' },
};

export function vistaSesion(contenedor, { id }) {
  const d = estado.datos();
  const sesion = d.sesiones.find((s) => s.id === id);
  if (!sesion) {
    anadir(contenedor, h('p', {}, 'Este entrenamiento no existe.'), h('a', { href: '#/' }, 'Volver'));
    return;
  }
  const ejercicioDe = (ejId) => d.ejercicios.find((e) => e.id === ejId);
  // La vista elegida se guarda en la sesión: si el móvil cierra la app y
  // vuelves, sigues donde estabas.
  if (!guiado.has(id) && sesion.vista?.modo) guiado.set(id, { modo: sesion.vista.modo, pos: sesion.vista.pos ?? null });
  const eleccion = guiado.get(id) ?? null;
  const modo = eleccion?.modo ?? 'todo';
  const posicion = eleccion?.pos ?? null;     // null = ver el entrenamiento entero
  const algoHecho = sesion.ejercicios.some((e) => e.series.some((s) => s.hecha));

  // Modifica esta sesión. Se busca de nuevo dentro de cambiar() por si los
  // datos se han sustituido desde Drive mientras tanto.
  const cambiarSesion = (fn, opciones) => estado.cambiar((datos) => {
    const s = datos.sesiones.find((x) => x.id === id);
    if (s) fn(s, datos);
  }, opciones);

  const enCurso = sesion.estado === 'en-curso';
  const visibles = posicion == null
    ? sesion.ejercicios.map((entrada, i) => [entrada, i])
    : sesion.ejercicios.slice(posicion, posicion + 1).map((entrada) => [entrada, posicion]);

  anadir(contenedor,
    sesion.borrada && h('div', { class: 'tarjeta aviso-tarjeta' },
      h('p', {}, 'Este entrenamiento está en la papelera: no cuenta para tu progresión.'),
      h('button', { class: 'boton', onclick: recuperar }, 'Recuperar entrenamiento')),

    h('div', { class: 'cabecera-vista' },
      h('h1', {}, enCurso ? 'Entrenando' : 'Entrenamiento'),
      h('input', { type: 'date', class: 'fecha', value: sesion.fecha, 'aria-label': 'Fecha',
        onchange: (e) => e.target.value && cambiarSesion((s) => moverFecha(s, e.target.value)) })),

    sedesActivas(d).length > 0 && h('label', { class: 'fila-sede-sesion' },
      h('span', { class: 'suave' }, 'Dónde:'),
      h('select', { onchange: (e) => cambiarSesion((s) => { s.sedeId = e.target.value || null; }) },
        h('option', { value: '' }, 'Sin indicar'),
        sedesActivas(d).map((s) => h('option', { value: s.id, selected: s.id === sesion.sedeId }, nombreSede(d, s.id))))),

    sesion.diaRutinaId && h('p', { class: 'suave' }, nombreDelDia(d, sesion)),

    enCurso && (posicion == null || posicion === 0) && tarjetaComoLlegas(),

    barraDescanso(),

    posicion != null && h('div', { class: 'guiado-cabecera' },
      h('button', { class: 'boton-paso', 'aria-label': 'Ejercicio anterior', disabled: posicion === 0,
        onclick: () => irA(posicion - 1) }, '‹'),
      h('button', { class: 'boton enlace', onclick: () => irA(null) }, `Ejercicio ${posicion + 1} de ${sesion.ejercicios.length}`),
      h('button', { class: 'boton-paso', 'aria-label': 'Ejercicio siguiente',
        disabled: posicion >= sesion.ejercicios.length - 1, onclick: () => irA(posicion + 1) }, '›')),

    visibles.map(([entrada, i]) => tarjetaEjercicio(entrada, i)),

    h('button', { class: 'boton secundario grande', onclick: elegirEjercicio }, '+ Añadir ejercicio'),

    // Cómo se ve el entrenamiento: solo aquí abajo, que arriba ya están las
    // flechas para pasar de ejercicio.
    enCurso && sesion.ejercicios.length > 0 && h('button', { class: 'boton enlace cambiar-vista', onclick: () => elegirVista() },
      `Vista: ${MODOS_ENTRENO[modo]?.etiqueta.toLowerCase() ?? 'todos los ejercicios'} · cambiar`),

    posicion == null && h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Notas del entrenamiento'),
      h('textarea', { rows: 2, value: sesion.notas || '',
        oninput: (e) => cambiarSesion((s) => { s.notas = e.target.value; }, { tecleo: true }) })),

    enCurso
      ? h('button', { class: 'boton grande terminar-entreno', onclick: terminar }, 'Terminar entrenamiento')
      : h('a', { class: 'boton secundario', href: '#/historial' }, 'Volver al historial'),

    !sesion.borrada && posicion == null
      && h('button', { class: 'boton enlace peligro-texto', onclick: borrar }, 'Mover este entrenamiento a la papelera'));

  // «¿Cómo llegas?»: tu sensación de cada músculo que vas a entrenar, junto a
  // lo que calcula la app. Con varias respuestas, la app te dirá si te
  // recuperas antes o después de lo normal (pestaña Cuerpo).
  function tarjetaComoLlegas() {
    if (sesion.sensacionesCerrada || d.perfil.preguntarComoLlegas === false) return null;
    const musculos = new Set();
    for (const entrada of sesion.ejercicios) {
      const ej = ejercicioDe(entrada.ejercicioId);
      if (ej && cuentaParaFatiga(ej)) for (const m of ej.musculos?.principales ?? []) musculos.add(m);
    }
    if (!musculos.size) return null;
    const previsto = recuperacionPorMusculo(d, sesion.inicio ? new Date(sesion.inicio) : new Date());
    const respuestas = sesion.sensaciones ?? {};
    const lista = ORDEN_MUSCULOS.filter((m) => musculos.has(m));
    const todas = lista.every((m) => respuestas[m]);
    return h('details', { class: 'tarjeta como-llegas', open: !todas },
      h('summary', {}, todas ? 'Cómo llegas: apuntado' : '¿Cómo llegas hoy? (opcional)'),
      h('p', { class: 'nota' }, 'Puntúa de 0 a 10 cómo de recuperado notas cada músculo: 0, nada; 5, a medias; 10, del todo. '
        + 'Sirve para ajustar el mapa de recuperación a tu ritmo.'),
      lista.map((m) => {
        const puesta = respuestas[m] ? puntuacionSentida(respuestas[m]) : null;
        return h('div', { class: 'fila-sensacion' },
          h('div', { class: 'cabecera-sensacion' },
            h('strong', {}, nombreMusculo(m, { corto: true })),
            h('small', { class: 'suave' }, `la app calcula ${Math.round(previsto[m].porcentaje / 10)} de 10`)),
          h('div', { class: 'escala-0-10', role: 'radiogroup', 'aria-label': `Recuperación de ${nombreMusculo(m)}` },
            Array.from({ length: 11 }, (_, n) => h('button', {
              class: `paso-escala ${puesta === n ? 'activo' : ''}`, role: 'radio', 'aria-checked': String(puesta === n),
              title: ESCALA_RECUPERACION[n] ?? String(n),
              onclick: () => {
                cambiarSesion((x) => {
                  x.sensaciones ??= {};
                  x.sensaciones[m] = { sentida: n, prevista: previsto[m].porcentaje };
                });
                estado.cambiar((x) => { x.perfil.comoLlegasSaltos = 0; }, { tecleo: true });
              },
            }, n))),
          h('div', { class: 'extremos-escala suave' }, h('span', {}, 'Nada'), h('span', {}, 'A medias'), h('span', {}, 'Del todo')));
      }),
      h('button', { class: 'boton enlace', onclick: () => {
        cambiarSesion((x) => { x.sensacionesCerrada = true; });
        // Dos veces seguidas «hoy no»: se ofrece quitar la pregunta.
        const saltos = (d.perfil.comoLlegasSaltos ?? 0) + 1;
        estado.cambiar((x) => { x.perfil.comoLlegasSaltos = saltos; }, { tecleo: true });
        if (saltos >= 2) {
          aviso('Te lo has saltado dos veces. ¿Quito la pregunta? (Si la quieres luego, está en Ajustes.)', { accion: { texto: 'Sí, quítala', fn: () => {
            estado.cambiar((x) => { x.perfil.preguntarComoLlegas = false; x.perfil.comoLlegasSaltos = 0; });
          } } });
        }
      } }, 'Hoy no'));
  }

  // Al empezar: series de una en una, ejercicios de uno en uno o todo.
  // Cómo ver el entrenamiento. Sale a pantalla completa al empezar y se
  // puede cambiar en cualquier momento desde «Vista: … · cambiar».
  function elegirVista() {
    const preferido = guiado.get(id)?.modo ?? d.perfil.modoEntreno ?? 'ejercicio';
    const cerrar = modal('¿Cómo quieres verlo?', h('div', { class: 'como-ir' },
      h('p', { class: 'nota' }, 'Se puede cambiar cuando quieras desde el final del entrenamiento («Vista: … · cambiar»).'),
      Object.entries(MODOS_ENTRENO).map(([clave, m]) => h('button', {
        class: `tarjeta fila-enlace ${clave === preferido ? 'preferido' : ''}`,
        onclick: () => {
          cerrar();
          const actual = guiado.get(id)?.pos ?? 0;
          const pos = clave === 'todo' ? null : Math.min(actual, Math.max(0, sesion.ejercicios.length - 1));
          estado.cambiar((x) => { x.perfil.modoEntreno = clave; }, { tecleo: true });
          guardarVista(clave, pos);
          estado.emitir('vista');
        } },
      h('div', {}, h('strong', {}, m.etiqueta), h('div', { class: 'suave' }, m.descripcion)),
      clave === preferido && h('span', { class: 'etiqueta' }, 'Actual'))),
      h('button', { class: 'boton enlace', onclick: () => {
        estado.cambiar((x) => { x.perfil.preguntarVista = false; });
        cerrar();
        aviso('No se volverá a preguntar: se usará la vista que tengas puesta. Se recupera en Ajustes → Entrenamiento y series.');
      } }, 'No volver a preguntarme esto')));
  }

  function guardarVista(modo, pos) {
    guiado.set(id, { modo, pos });
    cambiarSesion((s) => { s.vista = { modo, pos }; }, { tecleo: true });
  }

  // Si la pantalla se vuelve a pintar antes de que salga el cartel (por
  // ejemplo, al llegar datos), no se abre dos veces.
  // En el entrenamiento de prueba del tutorial no se pregunta: ya hay bastante en pantalla.
  if (enCurso && !eleccion && d.perfil.preguntarVista !== false && sesion.ejercicios.length > 0 && !algoHecho && !sesion.tutorial
    && !document.querySelector('.modal-fondo') && !preguntandoVista.has(id)) {
    preguntandoVista.add(id);
    setTimeout(() => {
      preguntandoVista.delete(id);
      if (!guiado.has(id) && !document.querySelector('.modal-fondo')) elegirVista();
    }, 50);
  }

  function irA(nueva) {
    const modoActual = guiado.get(id)?.modo ?? d.perfil.modoEntreno ?? 'ejercicio';
    if (nueva == null) guardarVista('todo', null);
    else guardarVista(modoActual === 'todo' ? 'ejercicio' : modoActual, Math.max(0, Math.min(nueva, sesion.ejercicios.length - 1)));
    estado.emitir('vista');
  }

  // -------------------------------------------------------------------------

  function tarjetaEjercicio(entrada, indice) {
    const ej = ejercicioDe(entrada.ejercicioId);
    if (!ej) return h('div', { class: 'tarjeta' }, 'Ejercicio borrado');
    // Series de una en una: las que van después de la primera sin hacer
    // quedan ocultas y se destapan al apuntar.
    const primeraSinHacer = entrada.series.findIndex((s) => !s.hecha);
    const oculta = (j) => modo === 'serie' && primeraSinHacer >= 0 && j > primeraSinHacer;
    const ocultas = entrada.series.filter((s, j) => oculta(j)).length;
    return h('article', { class: `tarjeta ejercicio-sesion ${modo === 'serie' ? 'de-una-en-una' : ''}`, 'data-entrada': indice },
      h('div', { class: 'cabecera-tarjeta' },
        imagenDe(ej.nombre) && h('img', { class: 'miniatura', src: imagenDe(ej.nombre).archivo, alt: '', loading: 'lazy' }),
        h('h2', { class: 'crece' }, ej.nombre),
        h('button', { class: 'boton-icono', 'aria-label': `Quitar ${ej.nombre}`,
          onclick: () => quitarEjercicio(indice, ej) }, '✕')),

      ej.notas && h('p', { class: 'nota' }, ej.notas),

      referencia1RM(ej, entrada),

      enCurso && tipoDeEjercicio(ej) === 'cardio' && ej.esfuerzo.tipo === 'tiempo'
        && h('button', { class: 'boton secundario', onclick: () => abrirIntervalos({ alTerminar: (segundos, texto) => {
          cambiarSesion((s) => {
            const e = s.ejercicios[indice];
            let serie = e.series.find((x) => !x.hecha);
            if (!serie) { serie = serieSuelta({ tipo: 'libre' }); e.series.push(serie); }
            serie.esfuerzo = segundos;
            serie.hecha = true;
            e.notas = [e.notas, texto].filter(Boolean).join(' · ');
          });
          aviso(`Apuntado: ${texto}, ${segundos >= 60 ? `${Math.round(segundos / 60)} min` : `${segundos} s`} de trabajo.`);
        } }) }, '⏱ Intervalos (HIIT)'),

      indice === 0 && enCurso && !sesion.tutorial && pista('sesion-datos', ['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(ej))
        ? 'Apunta cada estiramiento al acabarlo: los segundos que has aguantado y, si te apoyas con la mano, hasta dónde llegas. '
          + 'Al escribirlos arranca el descanso.'
        : ej.esfuerzo?.tipo === 'tiempo'
          ? 'Apunta la serie al acabarla: al escribir el tiempo arranca el descanso.'
          : 'Apunta la serie al acabarla: al escribir las repeticiones arranca el descanso. '
            + 'Cada casilla lleva encima lo que va dentro (toca «?» para saber más).'),

      entrada.series.map((serie, j) => {
        const bloque = bloqueSerie(ej, entrada, indice, j, serie);
        if (oculta(j)) bloque.classList.add('oculta');
        return bloque;
      }),
      ocultas > 0 && h('p', { class: 'nota series-ocultas' }, `${ocultas} ${ocultas === 1 ? 'serie más' : 'series más'}: aparece al apuntar esta.`),

      h('button', { class: 'boton secundario', onclick: () => anadirSerie(indice, ej, entrada) }, '+ Serie'));
  }

  // El mejor 1RM estimado del ciclo en curso, con sus porcentajes: sirve para
  // saber con cuánto empezar un drop set («al 80 %»).
  function referencia1RM(ej, entrada) {
    if (ej.carga?.tipo === 'ninguna') return null;
    const rm = rmDeReferencia(d, ej, { cicloN: entrada.cicloN });
    if (!rm) return null;
    return h('p', { class: 'nota' },
      'Tu máximo (', queEs('rm', '1RM'), `) estimado ${rm.delCiclo ? 'en este ciclo' : 'según tu historial'}: `
      + `${formatearNumero(Math.round(rm.valor))} kg.`);
  }

  // Cabecera de cada serie: qué toca y cómo fue la última vez.
  function lineaSugerencia(ej, serie) {
    const plan = (ej.series || []).find((p) => p.id === serie.planId);
    if (!plan) return null;
    const s = sugerenciaSerie(d, ej, plan, { excluirSesion: id });
    const uCarga = unidadCarga(ej);
    const uEsf = unidadEsfuerzo(ej);
    const partes = [];

    if (s.modo === 'bilbo') {
      if (s.sinCiclo) partes.push('Sin ciclo configurado');
      else if (s.cicloTerminado) partes.push(`Ciclo ${s.cicloN} terminado: prepara el siguiente en la ficha (o pon el reinicio en automático)`);
      else {
        partes.push(`Ciclo ${s.cicloN} · sesión ${serie.diaCiclo ?? s.dia}`);
        if (s.pesoBajo) partes.push('peso muy bajo para tu 1RM: revisa el ciclo en la ficha');
        if (s.cicloAgotado) partes.push('el ciclo se acaba aquí: la próxima vez empieza el siguiente, más ligero');
        if (serie.carga != null && s.sobre === 'carga') partes.push(`${formatearNumero(serie.carga)} ${uCarga}`);
        if (serie.objetivo != null) {
          partes.push(`objetivo ${formatearNumero(serie.objetivo)} ${uEsf}`);
        }
      }
    } else if (s.modo === 'programa') {
      if (s.sinPrograma) partes.push('Programa sin configurar: revisa la ficha');
      else {
        partes.push(`${PROGRAMAS[s.programa]?.etiqueta ?? s.programa} · ${s.nombreSesion}`);
        if (s.inicialEstimado) partes.push('peso inicial estimado (cámbialo en la ficha)');
        if (serie.programaSet) partes.push(`serie ${serie.programaSet} de ${s.seriesPrograma.length}`);
        if (serie.carga != null) partes.push(`${formatearNumero(serie.carga)} ${uCarga} × ${formatearNumero(serie.objetivo)}${serie.amrap ? ' o más' : ''}`);
      }
    } else if (s.modo === 'maximo-trabajo') {
      if (s.pocosDatos && !s.carga) partes.push('Máximo trabajo: aún faltan datos, entrena con el peso que quieras');
      else {
        partes.push(`Máximo trabajo: ${formatearNumero(s.carga)} ${uCarga}`);
        if (s.esfuerzoObjetivo) partes.push(`unas ${formatearNumero(s.esfuerzoObjetivo)} ${uEsf}`);
        if (s.aviso) partes.push(s.aviso.toLowerCase());
        if (s.mejorReal) partes.push(`tu récord: ${formatearNumero(s.mejorReal.trabajo)} (${formatearNumero(s.mejorReal.carga)} ${uCarga} × ${formatearNumero(s.mejorReal.esfuerzo)})`);
      }
    } else if (s.primeraVez) {
      partes.push('Primera vez con esta serie');
    } else {
      const u = (s.ultima ?? s.referencia).serie;
      partes.push(`${s.ultima ? 'Última vez' : 'Última vez (en otra serie)'}: ${textoSerie(ej, u)}`);
      if (s.modo === 'carga' && s.sube) partes.push(`hoy sube a ${formatearNumero(s.carga)} ${uCarga}`);
      if (s.modo === 'carga' && !s.sube && s.rango) partes.push(`objetivo ${s.rango[1]} ${uEsf}: al llegar, sube el peso`);
      if (s.modo === 'esfuerzo') partes.push(`hoy intenta ${formatearNumero(s.esfuerzoObjetivo)} ${uEsf}`);
    }
    return h('p', { class: 'sugerencia' }, partes.join(' · '));
  }

  function bloqueSerie(ej, entrada, i, j, serie) {
    serie.tecnicas ??= [];
    serie.detalle ??= {};
    const tramos = tramosDe(serie.tecnicas);
    return h('div', { class: `serie ${serie.hecha ? 'hecha' : ''}`, 'data-serie': j },
      lineaSugerencia(ej, serie),
      cabeceraSerie(ej, i, j, serie),
      tramos ? tramosSerie(ej, i, j, serie, tramos) : valoresSerie(ej, i, j, serie),
      camposTecnicas(ej, i, j, serie),
      camposEstiramiento(ej, i, j, serie),
      h('p', { class: 'comparacion' }, comparacionSerie(d, ej, serie, { excluirSesion: id })));
  }

  // Lo apuntado en una medida que no es la principal. Se guarda por nombre,
  // para que quepan varias (tiempo y distancia, o reps y distancia).
  function guardarExtra(serie, tipo, valor) {
    serie.extras ??= {};
    serie.extras[tipo] = valor;
    if (tipo === 'distancia') serie.esfuerzoExtra = valor;   // formato antiguo
  }

  // El tiempo, en tres huecos: horas, minutos y segundos. El teclado del
  // móvil es numérico y no tiene dos puntos, así que nada de «12:30».
  function campoTiempo(etiqueta, segundos, alCambiar) {
    const total = segundos ?? 0;
    const inicial = { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: Math.round(total % 60) };
    const vacio = segundos == null;
    const cajas = {};
    const leerTodo = (caja) => {
      const vacias = Object.values(cajas).every((x) => x.value.trim() === '');
      const n = (clave) => Math.max(0, Math.round(leerNumero(cajas[clave].value) ?? 0));
      alCambiar(vacias ? null : n('h') * 3600 + n('m') * 60 + n('s'), caja);
    };
    const hueco = (clave, nombre) => {
      const caja = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': `${etiqueta}: ${nombre}`,
        value: vacio ? '' : String(inicial[clave]),
        oninput: (e) => leerTodo(e.target) });
      cajas[clave] = caja;
      return h('label', { class: 'trozo-tiempo' }, h('small', {}, nombre), caja);
    };
    return h('div', { class: 'valor tiempo' },
      h('span', { class: 'et' }, etiqueta),
      h('div', { class: 'trozos-tiempo' }, hueco('h', 'h'), hueco('m', 'min'), hueco('s', 's')));
  }

  // Casillas propias de cada técnica: los segundos del isométrico final, las
  // excéntricas lentas y sus segundos de bajada.
  function camposTecnicas(ej, i, j, serie) {
    const campos = camposDe(serie.tecnicas);
    if (!campos.length) return null;
    const actualizar = (fn) => { cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true }); if (sesion.tutorial) pintarGuia(); };
    return h('div', { class: 'serie-valores extras' },
      campos.map((c) => h('label', { class: 'valor' },
        h('span', { class: 'et' }, `${c.etiqueta} (${c.unidad})`),
        h('input', { type: 'text', inputmode: 'decimal', value: serie.detalle?.[c.tecnica]?.[c.clave] ?? '',
          'aria-label': `${c.etiqueta} (${c.unidad})`,
          oninput: (e) => actualizar((x) => {
            x.detalle ??= {};
            x.detalle[c.tecnica] ??= {};
            x.detalle[c.tecnica][c.clave] = leerNumero(e.target.value);
          }) }))));
  }

  // Estiramientos, movilidad y yoga: con qué técnica, con qué ayuda y, si
  // te apoyas con la mano, en qué punto de la escala (del puño a sin mano).
  function camposEstiramiento(ej, i, j, serie) {
    if (!['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(ej))) return null;
    const actual = { ...ej.estiramiento, ...serie.estiramiento };
    const guardar = (clave, valor) => cambiarSesion((s) => {
      const x = s.ejercicios[i].series[j];
      x.estiramiento = { ...ej.estiramiento, ...x.estiramiento, [clave]: valor || null };
    });
    const desplegable = (clave, catalogo, vacio) => h('select', { 'aria-label': vacio, onchange: (e) => guardar(clave, e.target.value) },
      h('option', { value: '' }, vacio),
      Object.entries(catalogo).map(([k, v]) => h('option', { value: k, selected: k === actual[clave] }, v.etiqueta ?? v)));
    return h('div', { class: 'serie-estiramiento' },
      desplegable('tecnica', TECNICAS_ESTIRAMIENTO, 'Técnica'),
      desplegable('asistencia', ASISTENCIAS, 'Ayuda'),
      actual.asistencia === 'mano' && desplegable('nivel', ESCALA_MANO, 'Apoyo de la mano'),
      actual.tecnica && h('small', { class: 'nota bloque' }, TECNICAS_ESTIRAMIENTO[actual.tecnica]?.descripcion));
  }

  function cabeceraSerie(ej, i, j, serie) {
    return h('div', { class: 'serie-cabecera' },
      h('select', { class: 'tipo-serie', 'aria-label': 'Tipo de serie',
        onchange: (e) => cambiarSesion((s) => {
          const x = s.ejercicios[i].series[j];
          x.tipo = e.target.value;
          if (x.tipo !== 'intensidad') { x.tecnicas = []; x.tramos = null; }
        }) },
      Object.entries(TIPOS_SERIE).map(([k, v]) => h('option', { value: k, selected: k === serie.tipo }, v))),

      serie.tipo === 'intensidad' && selectorTecnicas(serie.tecnicas, (nuevas) => cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        x.tecnicas = nuevas;
        x.recamara = recamaraDe(nuevas, ej.recamaraPorDefecto ?? d.perfil.recamaraPorDefecto ?? 1);
        x.tramos = tramosDe(nuevas) ? (x.tramos ?? tramosPropuestos(x, planDe(ej, x), null, d.perfil)) : null;
      })),

      marcaObjetivo(serie),

      h('button', { class: 'boton-icono', 'aria-label': 'Borrar serie', onclick: () => borrarSerie(i, j) }, '🗑'));
  }

  function marcaObjetivo(serie) {
    const marca = h('span', { class: 'marca' });
    const esfuerzo = esfuerzoTotal(serie);
    if (serie.objetivo != null && esfuerzo != null) {
      const superado = esfuerzo >= serie.objetivo;
      marca.textContent = superado ? '✓ superado' : '✗ no superado';
      marca.className = `marca ${superado ? 'bien' : 'mal'}`;
    }
    return marca;
  }

  function valoresSerie(ej, i, j, serie) {
    const peso = d.perfil.pesoCorporalKg;
    const tipoCarga = ej.carga.tipo;
    const asistida = tipoCarga === 'asistida';
    const cargaReal = h('small', { class: 'suave' },
      asistida && serie.carga != null ? `= ${formatearNumero(serie.carga)} kg reales` : '');
    const actualizar = (fn) => { cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true }); if (sesion.tutorial) pintarGuia(); };

    const corporal = tipoCarga === 'pesoCorporal' && (serie.lastre != null || serie.carga == null);
    const cargaCorporalTexto = h('small', { class: 'suave' },
      corporal ? (serie.carga != null ? `= ${formatearNumero(serie.carga)} kg` : 'pon tu peso en Ajustes') : '');

    return h('div', { class: 'serie-valores' },
      corporal && h('label', { class: 'valor' },
        h('span', { class: 'et' }, 'Lastre (kg)'),
        h('input', { type: 'text', inputmode: 'decimal', value: serie.lastre ?? 0, 'aria-label': 'Lastre (kg)',
          oninput: (e) => {
            actualizar((x) => {
              x.lastre = leerNumero(e.target.value) ?? 0;
              x.carga = cargaCorporal(ej, peso, x.lastre);
              cargaCorporalTexto.textContent = x.carga != null ? `= ${formatearNumero(x.carga)} kg` : 'pon tu peso en Ajustes';
            });
            recalcularAbajo(ej, i);
          } }),
        cargaCorporalTexto),
      tipoCarga !== 'ninguna' && !corporal && (asistida
        ? h('label', { class: 'valor' },
          h('span', { class: 'et' }, 'kg de la máquina'),
          h('input', { type: 'text', inputmode: 'decimal', value: serie.lectura ?? '', 'aria-label': 'Kilos que marca la máquina',
            oninput: (e) => {
              actualizar((x) => {
                x.lectura = leerNumero(e.target.value);
                x.carga = cargaDesdeLectura(x.lectura, peso);
                cargaReal.textContent = x.carga != null ? `= ${formatearNumero(x.carga)} kg reales` : '';
              });
              recalcularAbajo(ej, i);
            } }),
          cargaReal)
        : campoCargaConPorcentaje(ej, i, j, serie)),

      esTiempo(ej)
        ? campoTiempo('Tiempo', serie.esfuerzo, (segundos, caja) => {
          actualizar((x) => {
            const antes = x.esfuerzo;
            x.esfuerzo = segundos;
            marcarHecha(caja, x, ej);
            if (antes == null && x.esfuerzo != null) descansoEntreSeries(ej);
          });
          recalcularAbajo(ej, i);
        })
        : h('label', { class: 'valor' },
          h('span', { class: 'et' }, unidadEsfuerzo(ej)),
          h('input', { type: 'text', inputmode: 'decimal', 'aria-label': TIPOS_ESFUERZO[ej.esfuerzo.tipo].etiqueta,
            value: serie.esfuerzo ?? '',
            oninput: (e) => {
              actualizar((x) => {
                const antes = x.esfuerzo;
                x.esfuerzo = leerNumero(e.target.value);
                marcarHecha(e.target, x, ej);
                if (antes == null && x.esfuerzo != null) descansoEntreSeries(ej);
              });
              recalcularAbajo(ej, i);
            } })),

      // «En recámara»: las repeticiones que podrías haber hecho y no hiciste.
      ej.esfuerzo.tipo === 'repeticiones' && h('label', { class: 'valor recamara' },
        h('span', { class: 'et' }, 'Recámara', queEs('recamara', '?')),
        h('input', { type: 'text', inputmode: 'decimal', value: serie.recamara ?? '', 'aria-label': 'Repeticiones en recámara',
          oninput: (e) => { actualizar((x) => { x.recamara = leerNumero(e.target.value); }); recalcularAbajo(ej, i); },
          onchange: (e) => ofrecerRecamara(ej, leerNumero(e.target.value)) }),
        h('small', {}, serie.recamara != null ? (tipoDeFallo(serie.recamara) || '') : '')),

      medidasDe(ej).slice(1).map((tipo) => (tipo === 'tiempo'
        ? campoTiempo('Tiempo', extraDeSerie(serie, tipo), (segundos) => actualizar((x) => { guardarExtra(x, tipo, segundos); }))
        : h('label', { class: 'valor' },
          h('span', { class: 'et' }, TIPOS_ESFUERZO[tipo].etiqueta),
          h('input', { type: 'text', inputmode: 'decimal', value: extraDeSerie(serie, tipo) ?? '',
            'aria-label': TIPOS_ESFUERZO[tipo].etiqueta,
            oninput: (e) => actualizar((x) => { guardarExtra(x, tipo, leerNumero(e.target.value)); }) })))));
  }

  // Kilos y porcentaje del 1RM, enlazados: escribes en uno y se rellena el
  // otro. En un tramo se guarda el porcentaje, para poder recalcular los
  // kilos si cambia el 1RM (modo «% del 1RM»).
  function campoCargaConPorcentaje(ej, i, j, serie, tramo = null) {
    const destino = () => (tramo == null ? serie : serie.tramos[tramo]);
    const rm = (tramo != null ? serie.rmUsado?.valor : null) ?? rmDeReferencia(d, ej, { cicloN: serie.cicloN })?.valor ?? null;
    const valido = (v) => (Number.isFinite(v) ? v : null);
    const coma = (v) => (v == null ? '' : String(v).replace('.', ','));
    const kilos = h('input', { type: 'text', inputmode: 'decimal', value: coma(valido(destino().carga)),
      'data-campo': 'kilos',
      'aria-label': tramo == null ? TIPOS_CARGA[ej.carga.tipo].etiqueta : `Carga de la bajada ${tramo + 1}` });
    const porcentaje = h('input', { type: 'text', inputmode: 'decimal', class: 'porcentaje', 'data-campo': 'porcentaje',
      value: valido(destino().carga) != null && rm ? Math.round((destino().carga / rm) * 100) : '',
      placeholder: rm ? '' : '—', 'aria-label': 'Porcentaje del 1RM' });
    const rmActual = () => Number(porcentaje.dataset.rm) || rm;
    if (rm) porcentaje.dataset.rm = rm;

    const guardar = (fn) => cambiarSesion((s) => {
      const x = s.ejercicios[i].series[j];
      fn(tramo == null ? x : x.tramos[tramo]);
    }, { tecleo: true });

    kilos.addEventListener('input', () => {
      const v = leerNumero(kilos.value);
      const r = rmActual();
      guardar((x) => { x.carga = v; if (tramo != null) x.pct = v != null && r ? redondear((v / r) * 100, 1) : null; });
      if (porcentaje) porcentaje.value = v != null && r ? Math.round((v / r) * 100) : '';
      if (tramo == null) recalcularAbajo(ej, i);
    });
    porcentaje.addEventListener('input', () => {
      const p = leerNumero(porcentaje.value);
      const r = rmActual();
      const v = p != null && r ? aPesoDisponible(ej, (r * p) / 100) : null;
      guardar((x) => { x.carga = v; if (tramo != null) x.pct = p; });
      kilos.value = coma(v);
      if (tramo == null) recalcularAbajo(ej, i);
    });

    return h('div', { class: 'carga-con-porcentaje' },
      h('label', { class: 'valor' }, tramo == null && h('span', { class: 'et' }, unidadCarga(ej)), kilos),
      h('label', { class: 'valor' }, tramo == null && h('span', { class: 'et' }, '% 1RM'), porcentaje));
  }

  // Drop set, rest-pause y miorrepeticiones: una línea por bajada, con lo que
  // hiciste la última vez en gris dentro de cada casilla de repeticiones.
  function tramosSerie(ej, i, j, serie, tramos) {
    serie.tramos ??= tramosPropuestos(serie, planDe(ej, serie), null, d.perfil);
    const plan = planDe(ej, serie);
    const anterior = plan ? sugerenciaSerie(d, ej, plan, { excluirSesion: id }).ultima?.serie : null;
    const modoCarga = modoCargaDe(d, ej, serie, sesion);
    const total = h('p', { class: 'nota' });
    const pintarTotal = () => {
      const t = trabajoSerie(serie);
      const reps = esfuerzoTotal(serie);
      total.textContent = reps ? `Hoy: ${serie.tramos.length} ${tramos.nombre.toLowerCase()}s · ${textoEsfuerzo(ej, reps)}`
        + (t ? ` · ${formatearNumero(t)} kg de trabajo` : '') : '';
    };
    pintarTotal();
    const actualizar = (fn) => { cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true }); if (sesion.tutorial) pintarGuia(); };
    const conCarga = ej.carga.tipo !== 'ninguna';

    return h('div', { class: 'tramos' },
      conCarga && !plan?.tramosFijos?.length && h('div', { class: 'modo-carga' },
        h('span', { class: 'suave' }, 'Elegir carga por:'),
        [['kg', 'kg'], ['rm', '% del 1RM (automático)']].map(([clave, texto]) => h('button', {
          class: `chip seleccionable ${modoCarga === clave ? 'activo' : ''}`, 'aria-pressed': String(modoCarga === clave),
          onclick: () => {
            cambiarSesion((s) => {
              const x = s.ejercicios[i].series[j];
              x.modoCarga = clave;
              if (clave === 'rm') for (const tr of x.tramos) tr.pct = null;
            });
            if (clave === 'rm') recalcularAbajo(ej, i, { repintar: true });
          },
        }, texto))),
      conCarga && h('p', { class: 'nota nota-relleno' }, textoRelleno(ej, serie)),
      h('p', { class: 'aviso-texto aviso-bajada' }, avisoPrimeraBajada(d, ej, serie) ?? ''),
      anterior?.tramos?.length && h('p', { class: 'nota' }, `La otra vez: ${textoSerie(ej, anterior)}`
        + ` (${textoEsfuerzo(ej, esfuerzoTotal(anterior))}`
        + `${trabajoSerie(anterior) ? `, ${formatearNumero(trabajoSerie(anterior))} kg de trabajo` : ''}).`),
      h('div', { class: 'tramo cabecera-tramos', 'aria-hidden': 'true' },
        h('span', { class: 'tramo-n vacio' }),
        conCarga && h('span', { class: 'crece' }, 'kg'),
        conCarga && h('span', { class: 'crece' }, '% 1RM'),
        h('span', { class: 'crece' }, unidadEsfuerzo(ej))),
      serie.tramos.map((tramo, k) => h('div', { class: 'tramo', 'data-tramo': k },
        h('span', { class: 'tramo-n', title: `${tramos.nombre} ${k + 1}` }, k + 1),
        conCarga && campoCargaConPorcentaje(ej, i, j, serie, k),
        h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: tramo.esfuerzo ?? '', 'aria-label': `Repeticiones de la bajada ${k + 1}`,
            placeholder: anterior?.tramos?.[k]?.esfuerzo ?? tramo.objetivo ?? '',
            oninput: (e) => actualizar((x) => {
              const antes = x.tramos[k].esfuerzo;
              x.tramos[k].esfuerzo = leerNumero(e.target.value);
              x.hecha = x.tramos.some((t) => t.esfuerzo != null);
              pintarTotal();
              marcarHecha(e.target, x, ej);
              if (k === 0) {
                const caja = e.target.closest('.serie')?.querySelector('.aviso-bajada');
                if (caja) caja.textContent = avisoPrimeraBajada(d, ej, x) ?? '';
              }
              // Al apuntar un tramo, descanso corto hasta el siguiente; al
              // apuntar el último, el descanso normal entre series.
              if (antes == null && x.tramos[k].esfuerzo != null) {
                if (k < x.tramos.length - 1) {
                  if (tramos.tecnica === 'miorepeticiones') arrancarRespiracion(d.perfil);
                  else {
                    arrancarDescanso(descansoDeTramo(d.perfil, tramos.tecnica), {
                      texto: tramos.tecnica === 'drop-set' ? 'para cambiar el peso' : 'para recuperar el aliento' });
                  }
                } else descansoEntreSeries(ej);
              }
            }) })),
        serie.tramos.length > 1 && h('button', { class: 'boton-icono', 'aria-label': `Quitar ${tramos.nombre.toLowerCase()} ${k + 1}`,
          onclick: () => cambiarSesion((s) => { s.ejercicios[i].series[j].tramos.splice(k, 1); }) }, '✕'))),

      h('button', { class: 'boton enlace', onclick: () => cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        const ultimo = x.tramos.at(-1);
        const salto = saltoDeTramo(d, ej, x);
        const carga = Number.isFinite(ultimo?.carga) ? Math.max(0, redondear(ultimo.carga - salto, 2)) : null;
        const rm = x.rmUsado?.valor;
        x.tramos.push({ carga, esfuerzo: null, pct: carga != null && rm ? redondear((carga / rm) * 100, 1) : null });
      }) }, `+ ${tramos.nombre}`),
      tramos.tecnica === 'drop-set' && serie.planId && ej.maquinaPlacas
        && h('button', { class: 'boton enlace', onclick: () => fijarPesos(ej, serie) },
          plan?.tramosFijos?.length ? 'Cambiar los pesos fijos por estos' : 'Fijar estos pesos para siempre (máquina de placas)'),
      total);
  }

  // Máquinas de placas: la secuencia de pesos siempre es la misma. Se guarda
  // en el ejercicio y la próxima vez sale tal cual.
  function fijarPesos(ej, serie) {
    const pesos = serie.tramos.map((t) => t.carga).filter((c) => Number.isFinite(c));
    if (!pesos.length) { aviso('Pon primero los pesos de las bajadas'); return; }
    estado.cambiar((datos) => {
      const plan = datos.ejercicios.find((e) => e.id === ej.id)?.series.find((p) => p.id === serie.planId);
      if (plan) plan.tramosFijos = pesos;
    });
    aviso(`Pesos fijos guardados: ${pesos.map((p) => formatearNumero(p)).join(' → ')} kg. Se quitan en la ficha del ejercicio.`);
  }

  // Texto que explica de dónde salen los pesos de los tramos.
  function textoRelleno(ej, serie) {
    if (planDe(ej, serie)?.tramosFijos?.length) return 'Pesos fijos de la máquina (se cambian en la ficha del ejercicio).';
    const origen = origenModoCarga(d, ej, serie, sesion);
    if (modoCargaDe(d, ej, serie, sesion) === 'kg') return `Pesos a mano (${origen}): no cambian aunque cambie tu 1RM.`;
    if (!serie.rmUsado) return `Por % del 1RM (${origen}): los kilos salen al apuntar la serie de arriba.`;
    const fatiga = serie.rmUsado.deHoy && serie.rmUsado.fatiga && serie.rmUsado.fatiga !== 1
      ? ` ×${String(serie.rmUsado.fatiga).replace('.', ',')} por el cansancio`
      : '';
    return `Kilos por el 1RM ${serie.rmUsado.deHoy ? 'de hoy' : 'de tu historial'} (${formatearNumero(serie.rmUsado.base ?? serie.rmUsado.valor)} kg${fatiga}).`;
  }

  // Entre estiramientos el descanso es otro, más corto (se cambia en Ajustes).
  // Si en este entrenamiento cambias la recámara de un ejercicio dos veces
  // al mismo número, la app ofrece dejarlo así siempre en ese ejercicio.
  const recamarasTocadas = new Map();   // ejercicioId → { valor, veces }
  function ofrecerRecamara(ej, valor) {
    const porDefecto = ej.recamaraPorDefecto ?? d.perfil.recamaraPorDefecto ?? 1;
    if (valor == null || valor === porDefecto) return;
    const previo = recamarasTocadas.get(ej.id);
    const veces = previo?.valor === valor ? previo.veces + 1 : 1;
    recamarasTocadas.set(ej.id, { valor, veces });
    if (veces !== 2) return;
    aviso(`Has puesto ${valor} de recámara dos veces en ${ej.nombre}. ¿Lo dejo así siempre en este ejercicio?`, { accion: { texto: 'Sí', fn: () => {
      estado.cambiar((x) => { const e = x.ejercicios.find((y) => y.id === ej.id); if (e) e.recamaraPorDefecto = valor; });
      aviso(`${ej.nombre}: ${valor} en recámara por defecto. Se cambia en su ficha (Ajustes finos).`);
    } } });
  }

  function descansoEntreSeries(ej) {
    if (['estiramiento', 'movilidad', 'yoga'].includes(tipoDeEjercicio(ej))) {
      const seg = d.perfil.descansoEstiramientos ?? DESCANSO_ESTIRAMIENTOS_POR_DEFECTO;
      if (seg) arrancarDescanso(seg, { texto: 'entre estiramientos' });
      return;
    }
    if (d.perfil.descansoSegundos) arrancarDescanso(d.perfil.descansoSegundos);
  }

  // Tras tocar una serie normal (peso, porcentaje, repeticiones o recámara),
  // las series con tramos de abajo que aún no has empezado recalculan sus
  // kilos con el 1RM de hoy.
  function recalcularAbajo(ej, i, { repintar = false } = {}) {
    const datos = estado.datos();
    const s = datos.sesiones.find((x) => x.id === id);
    const entrada = s?.ejercicios[i];
    if (!entrada) return;
    const tocadas = recalcularTramos(datos, ej, entrada, { excluirSesion: id, sesion: s });
    if (!tocadas.length) return;
    cambiarSesion(() => {}, { tecleo: !repintar });
    if (repintar) return;
    const tarjeta = document.querySelector(`[data-entrada="${i}"]`);
    for (const j of tocadas) {
      const serie = entrada.series[j];
      const caja = tarjeta?.querySelector(`[data-serie="${j}"]`);
      if (!caja) continue;
      serie.tramos.forEach((t, k) => {
        const fila = caja.querySelector(`[data-tramo="${k}"]`);
        const kilos = fila?.querySelector('[data-campo="kilos"]');
        const pct = fila?.querySelector('[data-campo="porcentaje"]');
        if (kilos) kilos.value = t.carga == null ? '' : String(t.carga).replace('.', ',');
        if (pct) {
          pct.dataset.rm = serie.rmUsado.valor;
          pct.value = t.carga != null ? Math.round((t.carga / serie.rmUsado.valor) * 100) : '';
        }
      });
      const nota = caja.querySelector('.nota-relleno');
      if (nota) nota.textContent = textoRelleno(ej, serie);
    }
  }

  function marcarHecha(input, serie, ej) {
    serie.hecha = serie.tramos?.length ? serie.tramos.some((t) => t.esfuerzo != null) : serie.esfuerzo != null;
    const caja = input.closest('.serie');
    caja?.classList.toggle('hecha', serie.hecha);
    if (serie.hecha && caja?.parentElement?.classList.contains('de-una-en-una')) {
      const siguiente = caja.nextElementSibling;
      if (siguiente?.classList.contains('serie')) siguiente.classList.remove('oculta');
      const nota = caja.parentElement.querySelector('.series-ocultas');
      const quedan = caja.parentElement.querySelectorAll('.serie.oculta').length;
      if (nota) nota.textContent = quedan ? `${quedan} ${quedan === 1 ? 'serie más' : 'series más'}: aparece al apuntar esta.` : '';
    }
    const marca = caja?.querySelector('.marca');
    if (marca && serie.objetivo != null) {
      const esfuerzo = esfuerzoTotal(serie);
      const superado = esfuerzo != null && esfuerzo >= serie.objetivo;
      marca.textContent = esfuerzo == null ? '' : (superado ? '✓ superado' : '✗ no superado');
      marca.className = `marca ${superado ? 'bien' : 'mal'}`;
    }
    const comparacion = caja?.querySelector('.comparacion');
    if (comparacion && ej) comparacion.textContent = comparacionSerie(d, ej, serie, { excluirSesion: id });
  }

  // -------------------------------------------------------------------------

  function anadirEjercicio(ej) {
    cambiarSesion((s, datos) => {
      s.ejercicios.push(entradaDeEjercicio(datos, ej, { excluirSesion: id }));
    });
    if (posicion != null) irA(sesion.ejercicios.length - 1);
  }

  // «+ Serie» mete la siguiente serie de la plantilla del ejercicio: si ya
  // hiciste la Bilbo, aparece la de intensidad con su técnica.
  function anadirSerie(i, ej, entrada) {
    cambiarSesion((s, datos) => {
      const puestas = new Set(s.ejercicios[i].series.map((x) => x.planId).filter(Boolean));
      const siguiente = (ej.series || []).find((plan) => !puestas.has(plan.id));
      if (siguiente) {
        s.ejercicios[i].series.push(crearSerieDesdePlan(datos, ej, siguiente, { excluirSesion: id }));
        return;
      }
      const anterior = s.ejercicios[i].series.at(-1);
      // Una Bilbo no se repite: la serie de más es libre, sin plantilla, para
      // no contar dos veces en el ciclo.
      const esBilbo = anterior?.tipo === 'bilbo' || planDe(ej, anterior ?? {})?.progresion?.tipo === 'bilbo';
      const copia = serieSuelta({ tipo: esBilbo ? 'libre' : anterior?.tipo ?? 'libre', tecnicas: anterior?.tecnicas ?? [],
        carga: anterior?.carga ?? null, recamara: anterior?.recamara ?? null });
      copia.planId = esBilbo ? null : anterior?.planId ?? null;
      copia.lectura = anterior?.lectura ?? null;
      if (usaTramos(copia.tecnicas)) copia.tramos = tramosPropuestos(copia, planDe(ej, copia), anterior, datos.perfil);
      s.ejercicios[i].series.push(copia);
    });
  }

  // Borrar series y ejercicios no pide confirmación (sería lento en pleno
  // entrenamiento), pero se puede deshacer durante unos segundos.
  function borrarSerie(i, j) {
    let quitada;
    cambiarSesion((s) => { [quitada] = s.ejercicios[i].series.splice(j, 1); });
    aviso('Serie borrada', { accion: { texto: 'Deshacer',
      fn: () => cambiarSesion((s) => { s.ejercicios[i]?.series.splice(j, 0, quitada); }) } });
  }

  function quitarEjercicio(i, ej) {
    let quitada;
    cambiarSesion((s) => { [quitada] = s.ejercicios.splice(i, 1); });
    if (posicion != null && posicion >= sesion.ejercicios.length) irA(sesion.ejercicios.length - 1);
    aviso(`${ej.nombre} quitado`, { accion: { texto: 'Deshacer',
      fn: () => cambiarSesion((s) => { s.ejercicios.splice(i, 0, quitada); }) } });
  }

  // Tus ejercicios y, debajo, los de la lista general; si eliges uno de la
  // lista, se pregunta antes de añadirlo a los tuyos.
  function elegirEjercicio() {
    const disponibles = d.ejercicios.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const cerrar = abrirSelector({
      titulo: 'Añadir ejercicio',
      // Primero los de este sitio (o de cualquier sitio); los de otros, al final.
      mios: [...disponibles.filter((e) => ejercicioEnSede(e, sesion.sedeId)),
        ...disponibles.filter((e) => !ejercicioEnSede(e, sesion.sedeId))],
      marcarMio: (e) => (sesion.ejercicios.some((x) => x.ejercicioId === e.id) && 'Ya añadido')
        || (!ejercicioEnSede(e, sesion.sedeId) && `Es de ${nombreSede(d, e.sedeId)}`),
      alElegirMio: anadirEjercicio,
      alElegirCatalogo: async (x) => {
        const si = await confirmar(`«${x.nombre}» no está en tus ejercicios. ¿Lo añado a los tuyos tal y como viene en la lista?`,
          { si: 'Añadir a mis ejercicios' });
        if (!si) return;
        const nuevo = ejercicioDesdeCatalogo(x);
        estado.cambiar((datos) => { datos.ejercicios.push(nuevo); });
        anadirEjercicio(nuevo);
      },
      pie: h('a', { class: 'boton secundario', href: `#/ejercicio/nuevo/para/${id}`, onclick: () => cerrar() },
        'Crear ejercicio nuevo'),
    });
  }

  // Al terminar se cierra el entrenamiento y sale un resumen: récords,
  // mejoras, volumen de la semana y, si has cambiado algo respecto a la
  // rutina, si lo quieres solo para hoy o para siempre.
  function terminar() {
    cambiarSesion((s) => {
      s.estado = 'terminada';
      // Un entrenamiento de otro día (pasado a mano) acaba ese día, no hoy.
      s.fin = s.fecha === hoyISO() ? new Date().toISOString() : horaEnFecha(s.inicio, s.fecha, 60);
    });
    guiado.delete(id);
    location.hash = '#/';
    if (sesion.tutorial) {
      const cerrar = modal('Entrenamiento de prueba terminado', h('div', {},
        h('p', {}, 'Era el del tutorial. ¿Lo guardo como un entrenamiento de verdad o lo borro?'),
        h('div', { class: 'fila-botones' },
          h('button', { class: 'boton secundario', onclick: () => {
            estado.cambiar((x) => { x.sesiones = x.sesiones.filter((s) => s.id !== id); });
            cerrar();
            aviso('Entrenamiento de prueba borrado.');
            guiaTrasPrueba();
          } }, 'Borrarlo'),
          h('button', { class: 'boton', onclick: () => { cerrar(); guiaTrasPrueba(); mostrarResumen(estado.datos(), id); } }, 'Guardarlo'))));
      return;
    }
    mostrarResumen(estado.datos(), id);
  }

  // Un entrenamiento nunca se borra del todo: va a la papelera del historial.
  async function borrar() {
    if (!await confirmar('¿Mover este entrenamiento a la papelera? Dejará de contar para tu progresión, pero podrás recuperarlo desde el historial.', { si: 'Mover a la papelera', peligro: true })) return;
    cambiarSesion((s) => { s.borrada = new Date().toISOString(); });
    location.hash = '#/historial';
    aviso('Entrenamiento en la papelera', { accion: { texto: 'Deshacer', fn: recuperar } });
  }

  function recuperar() {
    cambiarSesion((s) => { s.borrada = null; });
    aviso('Entrenamiento recuperado');
  }
}

// Cambiar la fecha de un entrenamiento mueve también sus horas de inicio y
// fin a ese día, para que la recuperación y el volumen cuenten bien.
function moverFecha(sesion, fecha) {
  sesion.fecha = fecha;
  if (sesion.inicio) sesion.inicio = horaEnFecha(sesion.inicio, fecha);
  if (sesion.fin) sesion.fin = horaEnFecha(sesion.fin, fecha);
}

function horaEnFecha(iso, fecha, minutosMas = 0) {
  const base = iso ? new Date(iso) : new Date(`${fecha}T19:00:00`);
  const [a, m, d] = fecha.split('-').map(Number);
  const nueva = new Date(a, m - 1, d, base.getHours(), base.getMinutes() + minutosMas);
  return nueva.toISOString();
}

function planDe(ej, serie) {
  return (ej.series || []).find((p) => p.id === serie.planId) ?? null;
}

function nombreDelDia(datos, sesion) {
  const rutina = datos.rutinas.find((r) => r.id === sesion.rutinaId);
  const dia = rutina?.dias.find((x) => x.id === sesion.diaRutinaId);
  return dia ? `${rutina.nombre} · ${dia.nombre}` : '';
}

export function textoSerie(ej, serie) {
  const partes = [];
  if (serie.tramos?.length) {
    return serie.tramos.map((t) => `${formatearNumero(t.carga)}×${formatearNumero(t.esfuerzo)}`).join(' → ');
  }
  if (serie.carga != null) partes.push(`${formatearNumero(serie.carga)} ${unidadCarga(ej)}`);
  if (serie.esfuerzo != null) {
    partes.push(esTiempo(ej) ? textoEsfuerzo(ej, serie.esfuerzo)
      : `${formatearNumero(serie.esfuerzo)}${serie.recamara ? ` + ${serie.recamara}` : ''} ${unidadEsfuerzo(ej)}`);
  }
  for (const tipo of medidasDe(ej).slice(1)) {
    const v = extraDeSerie(serie, tipo);
    if (v != null) partes.push(tipo === 'tiempo' ? formatearTiempo(v) : `${formatearNumero(v)} ${TIPOS_ESFUERZO[tipo].unidad}`);
  }
  const tec = textoTecnicas(serie.tecnicas);
  return partes.join(' × ') + (tec ? ` (${tec})` : '');
}

export function unidadCarga(ej) {
  return ej.carga.tipo === 'asistida' ? 'kg' : TIPOS_CARGA[ej.carga.tipo]?.unidad ?? '';
}

export function unidadEsfuerzo(ej) {
  if (esTiempo(ej)) return 'min:s';
  return TIPOS_ESFUERZO[ej.esfuerzo.tipo]?.unidad ?? '';
}

const esTiempo = (ej) => ej.esfuerzo?.tipo === 'tiempo';

// «12 reps», «1,5 km» o «45 s» / «1:02:30».
export function textoEsfuerzo(ej, valor) {
  if (valor == null) return '';
  if (esTiempo(ej)) return valor < 60 ? `${Math.round(valor)} s` : formatearTiempo(valor);
  return `${formatearNumero(valor)} ${TIPOS_ESFUERZO[ej.esfuerzo.tipo]?.unidad ?? ''}`.trim();
}

