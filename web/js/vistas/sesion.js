import {
  aPasoDeDisco, cargaDesdeLectura, esfuerzoTotal, formatearNumero,
  redondear, rmDeReferencia, sugerenciaSerie, trabajoSerie, tramosPropuestos, usaTramos,
} from '../calculos.js';
import * as estado from '../estado.js';
import {
  TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_SERIE, camposDe, recamaraDe, tipoDeFallo, tramosDe,
} from '../esquema.js';
import { imagenDe } from '../imagenes.js';
import {
  crearSerieDesdePlan, entradaDeEjercicio, rellenarDropSets, saltoDeTramo, serieSuelta,
} from '../series.js';
import { anadir, aviso, confirmar, h, leerNumero } from '../ui.js';
import { arrancarDescanso, arrancarRespiracion, barraDescanso, descansoDeTramo } from './descanso.js';
import { cuentaParaFatiga, tipoDeEjercicio } from '../catalogo.js';
import { ASISTENCIAS, ESCALA_MANO, TECNICAS_ESTIRAMIENTO } from '../esquema.js';
import { ORDEN_MUSCULOS, nombreMusculo } from '../musculos.js';
import { SENSACIONES, recuperacionPorMusculo } from '../recuperacion.js';
import { comparacionSerie, mostrarResumen } from './resumen-sesion.js';
import { ejercicioDesdeCatalogo, elegirEjercicio as abrirSelector } from './selector-ejercicios.js';
import { selectorTecnicas, textoTecnicas } from './tecnicas.js';

// En modo guiado se ve un ejercicio cada vez. Se recuerda por sesión.
const guiado = new Map();

export function vistaSesion(contenedor, { id }) {
  const d = estado.datos();
  const sesion = d.sesiones.find((s) => s.id === id);
  if (!sesion) {
    anadir(contenedor, h('p', {}, 'Este entrenamiento no existe.'), h('a', { href: '#/' }, 'Volver'));
    return;
  }
  const ejercicioDe = (ejId) => d.ejercicios.find((e) => e.id === ejId);
  const posicion = guiado.get(id) ?? null;     // null = ver el entrenamiento entero

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
        onchange: (e) => e.target.value && cambiarSesion((s) => { s.fecha = e.target.value; }) })),

    sesion.diaRutinaId && h('p', { class: 'suave' }, nombreDelDia(d, sesion)),

    enCurso && posicion == null && tarjetaComoLlegas(),

    barraDescanso(),

    posicion != null && h('div', { class: 'guiado-cabecera' },
      h('button', { class: 'boton-icono', 'aria-label': 'Ejercicio anterior', disabled: posicion === 0,
        onclick: () => irA(posicion - 1) }, '‹'),
      h('span', {}, `Ejercicio ${posicion + 1} de ${sesion.ejercicios.length}`),
      h('button', { class: 'boton-icono', 'aria-label': 'Ejercicio siguiente',
        disabled: posicion >= sesion.ejercicios.length - 1, onclick: () => irA(posicion + 1) }, '›')),

    visibles.map(([entrada, i]) => tarjetaEjercicio(entrada, i)),

    h('button', { class: 'boton secundario grande', onclick: elegirEjercicio }, '+ Añadir ejercicio'),

    enCurso && sesion.ejercicios.length > 0 && (posicion == null
      ? h('button', { class: 'boton grande', onclick: () => irA(0) }, 'Empezar: ir de uno en uno')
      : h('button', { class: 'boton secundario grande', onclick: () => irA(null) }, 'Ver el entrenamiento entero')),

    posicion == null && h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Notas del entrenamiento'),
      h('textarea', { rows: 2, value: sesion.notas || '',
        oninput: (e) => cambiarSesion((s) => { s.notas = e.target.value; }, { tecleo: true }) })),

    enCurso
      ? h('button', { class: 'boton grande', onclick: terminar }, 'Terminar entrenamiento')
      : h('a', { class: 'boton secundario', href: '#/historial' }, 'Volver al historial'),

    !sesion.borrada && posicion == null
      && h('button', { class: 'boton enlace peligro-texto', onclick: borrar }, 'Mover este entrenamiento a la papelera'));

  // «¿Cómo llegas?»: tu sensación de cada músculo que vas a entrenar, junto a
  // lo que calcula la app. Con varias respuestas, la app te dirá si te
  // recuperas antes o después de lo normal (pestaña Cuerpo).
  function tarjetaComoLlegas() {
    if (sesion.sensacionesCerrada) return null;
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
      h('p', { class: 'nota' }, 'Toca cómo notas cada músculo. Sirve para ajustar el mapa de recuperación a tu ritmo.'),
      lista.map((m) => h('div', { class: 'fila-sensacion' },
        h('span', {}, nombreMusculo(m, { corto: true }), h('small', { class: 'suave bloque' }, `la app calcula ${previsto[m].porcentaje} %`)),
        h('div', { class: 'botones-sensacion' }, Object.entries(SENSACIONES).map(([clave, s]) => h('button', {
          class: `chip seleccionable ${respuestas[m]?.sentida === clave ? 'activo' : ''}`,
          'aria-pressed': String(respuestas[m]?.sentida === clave),
          onclick: () => cambiarSesion((x) => {
            x.sensaciones ??= {};
            x.sensaciones[m] = { sentida: clave, prevista: previsto[m].porcentaje };
          }),
        }, `${s.icono} ${s.texto}`))))),
      h('button', { class: 'boton enlace', onclick: () => cambiarSesion((x) => { x.sensacionesCerrada = true; }) },
        'Hoy no'));
  }

  function irA(nueva) {
    if (nueva == null) guiado.delete(id);
    else guiado.set(id, Math.max(0, Math.min(nueva, sesion.ejercicios.length - 1)));
    estado.emitir('vista');
  }

  // -------------------------------------------------------------------------

  function tarjetaEjercicio(entrada, indice) {
    const ej = ejercicioDe(entrada.ejercicioId);
    if (!ej) return h('div', { class: 'tarjeta' }, 'Ejercicio borrado');
    return h('article', { class: 'tarjeta ejercicio-sesion', 'data-entrada': indice },
      h('div', { class: 'cabecera-tarjeta' },
        imagenDe(ej.nombre) && h('img', { class: 'miniatura', src: imagenDe(ej.nombre).archivo, alt: '', loading: 'lazy' }),
        h('h2', { class: 'crece' }, ej.nombre),
        h('button', { class: 'boton-icono', 'aria-label': `Quitar ${ej.nombre}`,
          onclick: () => quitarEjercicio(indice, ej) }, '✕')),

      ej.notas && h('p', { class: 'nota' }, ej.notas),

      referencia1RM(ej, entrada),

      entrada.series.map((serie, j) => bloqueSerie(ej, entrada, indice, j, serie)),

      h('button', { class: 'boton secundario', onclick: () => anadirSerie(indice, ej, entrada) }, '+ Serie'));
  }

  // El mejor 1RM estimado del ciclo en curso, con sus porcentajes: sirve para
  // saber con cuánto empezar un drop set («al 80 %»).
  function referencia1RM(ej, entrada) {
    if (ej.carga?.tipo === 'ninguna') return null;
    const rm = rmDeReferencia(d, ej, { cicloN: entrada.cicloN });
    if (!rm) return null;
    return h('p', { class: 'nota' },
      `1RM estimado ${rm.delCiclo ? 'del ciclo' : '(histórico)'}: ${formatearNumero(Math.round(rm.valor))} kg · `
      + `80 % = ${formatearNumero(aPasoDeDisco(rm.valor * 0.8))} · 70 % = ${formatearNumero(aPasoDeDisco(rm.valor * 0.7))} · `
      + `60 % = ${formatearNumero(aPasoDeDisco(rm.valor * 0.6))}`);
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
      else if (s.cicloTerminado) partes.push(`Ciclo ${s.cicloN} terminado: prepara el siguiente en la ficha`);
      else {
        partes.push(`Ciclo ${s.cicloN} · día ${serie.diaCiclo ?? s.dia} de ${s.diasCiclo}`);
        if (serie.carga != null && s.sobre === 'carga') partes.push(`${formatearNumero(serie.carga)} ${uCarga}`);
        if (serie.objetivo != null) {
          partes.push(s.sobre === 'carga'
            ? `llega a ${formatearNumero(serie.objetivo)} ${uEsf}`
            : `objetivo ${formatearNumero(serie.objetivo)} ${uEsf}`);
        }
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
      const u = s.ultima.serie;
      partes.push(`Última vez: ${textoSerie(ej, u)}`);
      if (s.modo === 'carga' && s.sube) partes.push(`hoy sube a ${formatearNumero(s.carga)} ${uCarga}`);
      if (s.modo === 'carga' && !s.sube && s.rango) partes.push(`llega a ${s.rango[1]} ${uEsf} para subir`);
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

  // Casillas propias de cada técnica: los segundos del isométrico final, las
  // excéntricas lentas y sus segundos de bajada.
  function camposTecnicas(ej, i, j, serie) {
    const campos = camposDe(serie.tecnicas);
    if (!campos.length) return null;
    const actualizar = (fn) => cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true });
    return h('div', { class: 'serie-valores extras' },
      campos.map((c) => h('label', { class: 'valor' },
        h('input', { type: 'text', inputmode: 'decimal', value: serie.detalle?.[c.tecnica]?.[c.clave] ?? '',
          'aria-label': `${c.etiqueta} (${c.unidad})`,
          oninput: (e) => actualizar((x) => {
            x.detalle ??= {};
            x.detalle[c.tecnica] ??= {};
            x.detalle[c.tecnica][c.clave] = leerNumero(e.target.value);
          }) }),
        h('span', {}, `${c.etiqueta} (${c.unidad})`))));
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
        x.recamara = recamaraDe(nuevas, d.perfil.recamaraPorDefecto ?? 1);
        x.tramos = tramosDe(nuevas) ? (x.tramos ?? tramosPropuestos(x, planDe(ej, x), null, d.perfil)) : null;
        if (x.tramos) x.cargaAutomatica = true;
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
    const actualizar = (fn) => cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true });

    return h('div', { class: 'serie-valores' },
      tipoCarga !== 'ninguna' && (asistida
        ? h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: serie.lectura ?? '', 'aria-label': 'Kilos que marca la máquina',
            oninput: (e) => actualizar((x) => {
              x.lectura = leerNumero(e.target.value);
              x.carga = cargaDesdeLectura(x.lectura, peso);
              cargaReal.textContent = x.carga != null ? `= ${formatearNumero(x.carga)} kg reales` : '';
            }) }),
          h('span', {}, 'kg máq'), cargaReal)
        : campoCargaConPorcentaje(ej, i, j, serie)),

      h('label', { class: 'valor' },
        h('input', { type: 'text', inputmode: 'decimal', value: serie.esfuerzo ?? '', 'aria-label': TIPOS_ESFUERZO[ej.esfuerzo.tipo].etiqueta,
          oninput: (e) => {
            actualizar((x) => {
              const antes = x.esfuerzo;
              x.esfuerzo = leerNumero(e.target.value);
              marcarHecha(e.target, x, ej);
              if (antes == null && x.esfuerzo != null) descansoEntreSeries();
            });
            rellenarDeAbajo(ej, i);
          } }),
        h('span', {}, unidadEsfuerzo(ej))),

      // «En recámara»: las repeticiones que podrías haber hecho y no hiciste.
      ej.esfuerzo.tipo === 'repeticiones' && h('label', { class: 'valor recamara' },
        h('span', {}, '+'),
        h('input', { type: 'text', inputmode: 'decimal', value: serie.recamara ?? '', 'aria-label': 'Repeticiones en recámara',
          oninput: (e) => actualizar((x) => { x.recamara = leerNumero(e.target.value); }) }),
        h('span', {}, serie.recamara != null ? (tipoDeFallo(serie.recamara) || 'recámara') : 'recámara')),

      ej.esfuerzoExtra && h('label', { class: 'valor' },
        h('input', { type: 'text', inputmode: 'decimal', value: serie.esfuerzoExtra ?? '', 'aria-label': 'Distancia',
          oninput: (e) => actualizar((x) => { x.esfuerzoExtra = leerNumero(e.target.value); }) }),
        h('span', {}, TIPOS_ESFUERZO[ej.esfuerzoExtra.tipo].unidad)));
  }

  // Kilos y porcentaje del 1RM, enlazados: escribes en uno y se rellena el
  // otro. Manda lo último que hayas escrito.
  function campoCargaConPorcentaje(ej, i, j, serie, tramo = null) {
    const destino = () => (tramo == null ? serie : serie.tramos[tramo]);
    const rm = rmDeReferencia(d, ej, { cicloN: serie.cicloN })?.valor ?? null;
    const valido = (v) => (Number.isFinite(v) ? v : null);
    const kilos = h('input', { type: 'text', inputmode: 'decimal', value: valido(destino().carga) ?? '',
      'data-campo': 'kilos',
      'aria-label': tramo == null ? TIPOS_CARGA[ej.carga.tipo].etiqueta : `Carga de la bajada ${tramo + 1}` });
    const porcentaje = rm
      ? h('input', { type: 'text', inputmode: 'decimal', class: 'porcentaje', 'data-campo': 'porcentaje', 'data-rm': rm,
        value: valido(destino().carga) != null ? Math.round((destino().carga / rm) * 100) : '',
        'aria-label': 'Porcentaje del 1RM' })
      : null;

    // Si tocas a mano el peso de un tramo, la app deja de recalcularlo.
    const guardar = (fn) => cambiarSesion((s) => {
      const x = s.ejercicios[i].series[j];
      if (tramo != null) x.cargaAutomatica = false;
      fn(tramo == null ? x : x.tramos[tramo]);
    }, { tecleo: true });

    kilos.addEventListener('input', () => {
      const v = leerNumero(kilos.value);
      guardar((x) => { x.carga = v; });
      destino().carga = v;
      if (porcentaje) porcentaje.value = v != null && rm ? Math.round((v / rm) * 100) : '';
      if (tramo == null) rellenarDeAbajo(ej, i);
    });
    porcentaje?.addEventListener('input', () => {
      const p = leerNumero(porcentaje.value);
      const v = p != null && rm ? aPasoDeDisco((rm * p) / 100) : null;
      guardar((x) => { x.carga = v; });
      destino().carga = v;
      kilos.value = v ?? '';
    });

    return h('div', { class: 'carga-con-porcentaje' },
      h('label', { class: 'valor' }, kilos, h('span', {}, unidadCarga(ej))),
      porcentaje && h('label', { class: 'valor' }, porcentaje, h('span', {}, '% 1RM')));
  }

  // Drop set, rest-pause y miorrepeticiones: una línea por bajada.
  function tramosSerie(ej, i, j, serie, tramos) {
    serie.tramos ??= tramosPropuestos(serie, planDe(ej, serie), null, d.perfil);
    const total = h('p', { class: 'nota' });
    const pintarTotal = () => {
      const t = trabajoSerie(serie);
      const reps = esfuerzoTotal(serie);
      total.textContent = reps ? `${serie.tramos.length} ${tramos.nombre.toLowerCase()}s · ${formatearNumero(reps)} ${unidadEsfuerzo(ej)} en total`
        + (t ? ` · ${formatearNumero(t)} kg de trabajo` : '') : '';
    };
    pintarTotal();
    const actualizar = (fn) => cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true });

    return h('div', { class: 'tramos' },
      h('p', { class: 'nota nota-relleno' }, textoRelleno(serie)),
      serie.tramos.map((tramo, k) => h('div', { class: 'tramo', 'data-tramo': k },
        h('span', { class: 'tramo-n', title: `${tramos.nombre} ${k + 1}` }, k + 1),
        ej.carga.tipo !== 'ninguna' && campoCargaConPorcentaje(ej, i, j, serie, k),
        h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: tramo.esfuerzo ?? '', 'aria-label': `Repeticiones de la bajada ${k + 1}`,
            placeholder: tramo.objetivo ?? '',
            oninput: (e) => actualizar((x) => {
              const antes = x.tramos[k].esfuerzo;
              x.tramos[k].esfuerzo = leerNumero(e.target.value);
              x.hecha = x.tramos.some((t) => t.esfuerzo != null);
              pintarTotal();
              marcarHecha(e.target, x, ej);
              // Al apuntar un tramo, descanso corto hasta el siguiente; al
              // apuntar el último, el descanso normal entre series.
              if (antes == null && x.tramos[k].esfuerzo != null) {
                if (k < x.tramos.length - 1) {
                  if (tramos.tecnica === 'miorepeticiones') arrancarRespiracion(d.perfil);
                  else {
                    arrancarDescanso(descansoDeTramo(d.perfil, tramos.tecnica), {
                      texto: tramos.tecnica === 'drop-set' ? 'para cambiar el peso' : 'para recuperar el aliento' });
                  }
                } else descansoEntreSeries();
              }
            }) }),
          h('span', {}, unidadEsfuerzo(ej))),
        serie.tramos.length > 1 && h('button', { class: 'boton-icono', 'aria-label': `Quitar ${tramos.nombre.toLowerCase()} ${k + 1}`,
          onclick: () => cambiarSesion((s) => { s.ejercicios[i].series[j].tramos.splice(k, 1); }) }, '✕'))),

      h('button', { class: 'boton enlace', onclick: () => cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        const ultimo = x.tramos.at(-1);
        const salto = saltoDeTramo(d, ej, x);
        x.tramos.push({
          carga: Number.isFinite(ultimo?.carga) ? Math.max(0, redondear(ultimo.carga - salto, 2)) : null,
          esfuerzo: null,
        });
      }) }, `+ ${tramos.nombre}`),
      tramos.tecnica === 'drop-set' && serie.planId && ej.carga.tipo !== 'ninguna'
        && h('button', { class: 'boton enlace', onclick: () => fijarPesos(ej, serie) },
          planDe(ej, serie)?.tramosFijos?.length ? 'Cambiar los pesos fijos por estos' : 'Fijar estos pesos para siempre (máquina de placas)'),
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

  // Texto que explica de dónde salen los pesos del drop set.
  function textoRelleno(serie) {
    if (!serie.rellenoDesde || !serie.cargaAutomatica) return '';
    return `Pesos al ${serie.rellenoDesde.porcentaje} % del 1RM que acabas de hacer arriba `
      + `(${formatearNumero(serie.rellenoDesde.rm)} kg). Si tocas un peso, se queda como lo pongas.`;
  }

  function descansoEntreSeries() {
    if (d.perfil.descansoSegundos) arrancarDescanso(d.perfil.descansoSegundos);
  }

  // Tras apuntar una serie normal, los drop sets de abajo que aún no has
  // empezado se recalculan con el 1RM que acabas de demostrar.
  function rellenarDeAbajo(ej, i) {
    const datos = estado.datos();
    const s = datos.sesiones.find((x) => x.id === id);
    const entrada = s?.ejercicios[i];
    if (!entrada) return;
    const tocadas = rellenarDropSets(datos, ej, entrada);
    if (!tocadas.length) return;
    cambiarSesion(() => {}, { tecleo: true });
    const tarjeta = document.querySelector(`[data-entrada="${i}"]`);
    for (const j of tocadas) {
      const serie = entrada.series[j];
      const caja = tarjeta?.querySelector(`[data-serie="${j}"]`);
      if (!caja) continue;
      serie.tramos.forEach((t, k) => {
        const fila = caja.querySelector(`[data-tramo="${k}"]`);
        const kilos = fila?.querySelector('[data-campo="kilos"]');
        const pct = fila?.querySelector('[data-campo="porcentaje"]');
        if (kilos) kilos.value = t.carga ?? '';
        const rm = Number(pct?.dataset.rm);
        if (pct && rm) pct.value = t.carga != null ? Math.round((t.carga / rm) * 100) : '';
      });
      const nota = caja.querySelector('.nota-relleno');
      if (nota) nota.textContent = textoRelleno(serie);
    }
  }

  function marcarHecha(input, serie, ej) {
    serie.hecha = serie.tramos?.length ? serie.tramos.some((t) => t.esfuerzo != null) : serie.esfuerzo != null;
    const caja = input.closest('.serie');
    caja?.classList.toggle('hecha', serie.hecha);
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
      const copia = serieSuelta({ tipo: anterior?.tipo ?? 'libre', tecnicas: anterior?.tecnicas ?? [],
        carga: anterior?.carga ?? null, recamara: anterior?.recamara ?? null });
      copia.planId = anterior?.planId ?? null;
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
      mios: disponibles,
      marcarMio: (e) => sesion.ejercicios.some((x) => x.ejercicioId === e.id) && 'Ya añadido',
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
      s.fin = new Date().toISOString();
    });
    guiado.delete(id);
    location.hash = '#/';
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
    partes.push(`${formatearNumero(serie.esfuerzo)}${serie.recamara ? ` + ${serie.recamara}` : ''} ${unidadEsfuerzo(ej)}`);
  }
  const tec = textoTecnicas(serie.tecnicas);
  return partes.join(' × ') + (tec ? ` (${tec})` : '');
}

export function unidadCarga(ej) {
  return ej.carga.tipo === 'asistida' ? 'kg' : TIPOS_CARGA[ej.carga.tipo]?.unidad ?? '';
}

export function unidadEsfuerzo(ej) {
  return TIPOS_ESFUERZO[ej.esfuerzo.tipo]?.unidad ?? '';
}

