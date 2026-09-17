import {
  cargaDesdeLectura, esfuerzoTotal, formatearNumero, records, sugerenciaSerie,
  trabajoSerie, tramosPropuestos, usaTramos,
} from '../calculos.js';
import * as estado from '../estado.js';
import { TECNICAS, TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_SERIE } from '../esquema.js';
import { crearSerieDesdePlan, serieSuelta } from '../series.js';
import { anadir, aviso, confirmar, h, leerNumero, modal, nuevoId } from '../ui.js';
import { arrancarDescanso, barraDescanso } from './descanso.js';

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

  function irA(nueva) {
    if (nueva == null) guiado.delete(id);
    else guiado.set(id, Math.max(0, Math.min(nueva, sesion.ejercicios.length - 1)));
    estado.emitir('vista');
  }

  // -------------------------------------------------------------------------

  function tarjetaEjercicio(entrada, indice) {
    const ej = ejercicioDe(entrada.ejercicioId);
    if (!ej) return h('div', { class: 'tarjeta' }, 'Ejercicio borrado');
    return h('article', { class: 'tarjeta ejercicio-sesion' },
      h('div', { class: 'cabecera-tarjeta' },
        h('h2', {}, ej.nombre),
        h('button', { class: 'boton-icono', 'aria-label': `Quitar ${ej.nombre}`,
          onclick: () => quitarEjercicio(indice, ej) }, '✕')),

      ej.notas && h('p', { class: 'nota' }, ej.notas),

      entrada.series.map((serie, j) => bloqueSerie(ej, entrada, indice, j, serie)),

      h('button', { class: 'boton secundario', onclick: () => anadirSerie(indice, ej, entrada) }, '+ Serie'));
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
            ? `supera ${formatearNumero(serie.objetivo)} ${uEsf}`
            : `objetivo ${formatearNumero(serie.objetivo)} ${uEsf}`);
        }
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
    const conTramos = usaTramos(serie.tecnica);
    return h('div', { class: `serie ${serie.hecha ? 'hecha' : ''}` },
      lineaSugerencia(ej, serie),
      cabeceraSerie(ej, i, j, serie),
      conTramos ? tramosSerie(ej, i, j, serie) : valoresSerie(ej, i, j, serie));
  }

  function cabeceraSerie(ej, i, j, serie) {
    const actualizar = (fn) => cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true });
    return h('div', { class: 'serie-cabecera' },
      h('select', { class: 'tipo-serie', 'aria-label': 'Tipo de serie',
        onchange: (e) => cambiarSesion((s) => {
          const x = s.ejercicios[i].series[j];
          x.tipo = e.target.value;
          if (x.tipo !== 'intensidad') { x.tecnica = null; x.tramos = null; }
        }) },
      Object.entries(TIPOS_SERIE).map(([k, v]) => h('option', { value: k, selected: k === serie.tipo }, v))),

      serie.tipo === 'intensidad' && h('select', { 'aria-label': 'Técnica',
        onchange: (e) => cambiarSesion((s) => {
          const x = s.ejercicios[i].series[j];
          x.tecnica = e.target.value || null;
          x.tramos = usaTramos(x.tecnica) ? tramosPropuestos(x, null, null) : null;
        }) },
      h('option', { value: '' }, 'Técnica…'),
      Object.entries(TECNICAS).map(([k, v]) => h('option', { value: k, selected: k === serie.tecnica }, v.etiqueta))),

      marcaObjetivo(serie),

      h('button', { class: 'boton-icono', 'aria-label': 'Borrar serie', onclick: () => borrarSerie(i, j) }, '🗑'));
  }

  function marcaObjetivo(serie) {
    const marca = h('span', { class: 'marca' });
    const esfuerzo = esfuerzoTotal(serie);
    if (serie.objetivo != null && esfuerzo != null) {
      const superado = esfuerzo > serie.objetivo;
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
        : h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: serie.carga ?? '', 'aria-label': TIPOS_CARGA[tipoCarga].etiqueta,
            oninput: (e) => actualizar((x) => { x.carga = leerNumero(e.target.value); }) }),
          h('span', {}, unidadCarga(ej)))),

      h('label', { class: 'valor' },
        h('input', { type: 'text', inputmode: 'decimal', value: serie.esfuerzo ?? '', 'aria-label': TIPOS_ESFUERZO[ej.esfuerzo.tipo].etiqueta,
          oninput: (e) => actualizar((x) => {
            x.esfuerzo = leerNumero(e.target.value);
            marcarHecha(e.target, x);
          }) }),
        h('span', {}, unidadEsfuerzo(ej))),

      ej.esfuerzoExtra && h('label', { class: 'valor' },
        h('input', { type: 'text', inputmode: 'decimal', value: serie.esfuerzoExtra ?? '', 'aria-label': 'Distancia',
          oninput: (e) => actualizar((x) => { x.esfuerzoExtra = leerNumero(e.target.value); }) }),
        h('span', {}, TIPOS_ESFUERZO[ej.esfuerzoExtra.tipo].unidad)));
  }

  // Drop set, rest-pause y miorrepeticiones: una línea por bajada.
  function tramosSerie(ej, i, j, serie) {
    serie.tramos ??= tramosPropuestos(serie, null, null);
    const total = h('p', { class: 'nota' });
    const pintarTotal = () => {
      const t = trabajoSerie(serie);
      const reps = esfuerzoTotal(serie);
      total.textContent = reps ? `${serie.tramos.length} tramos · ${formatearNumero(reps)} ${unidadEsfuerzo(ej)} en total`
        + (t ? ` · ${formatearNumero(t)} kg de trabajo` : '') : '';
    };
    pintarTotal();
    const actualizar = (fn) => cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true });

    return h('div', { class: 'tramos' },
      serie.tramos.map((tramo, k) => h('div', { class: 'tramo' },
        h('span', { class: 'tramo-n' }, k + 1),
        ej.carga.tipo !== 'ninguna' && h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: tramo.carga ?? '', 'aria-label': `Carga de la bajada ${k + 1}`,
            oninput: (e) => actualizar((x) => { x.tramos[k].carga = leerNumero(e.target.value); pintarTotal(); }) }),
          h('span', {}, unidadCarga(ej))),
        h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: tramo.esfuerzo ?? '', 'aria-label': `Repeticiones de la bajada ${k + 1}`,
            oninput: (e) => actualizar((x) => {
              x.tramos[k].esfuerzo = leerNumero(e.target.value);
              x.hecha = x.tramos.some((t) => t.esfuerzo != null);
              pintarTotal();
              marcarHecha(e.target, x);
            }) }),
          h('span', {}, unidadEsfuerzo(ej))),
        serie.tramos.length > 1 && h('button', { class: 'boton-icono', 'aria-label': `Quitar bajada ${k + 1}`,
          onclick: () => cambiarSesion((s) => { s.ejercicios[i].series[j].tramos.splice(k, 1); }) }, '✕'))),

      h('button', { class: 'boton enlace', onclick: () => cambiarSesion((s) => {
        const x = s.ejercicios[i].series[j];
        const ultimo = x.tramos.at(-1);
        const bajada = TECNICAS[x.tecnica]?.bajada ?? 0;
        x.tramos.push({ carga: ultimo?.carga != null ? Math.round(ultimo.carga * (1 - bajada)) : null, esfuerzo: null });
      }) }, '+ Bajada'),
      total);
  }

  function marcarHecha(input, serie) {
    serie.hecha = serie.tramos?.length ? serie.tramos.some((t) => t.esfuerzo != null) : serie.esfuerzo != null;
    const caja = input.closest('.serie');
    caja?.classList.toggle('hecha', serie.hecha);
    const marca = caja?.querySelector('.marca');
    if (marca && serie.objetivo != null) {
      const esfuerzo = esfuerzoTotal(serie);
      const superado = esfuerzo != null && esfuerzo > serie.objetivo;
      marca.textContent = esfuerzo == null ? '' : (superado ? '✓ superado' : '✗ no superado');
      marca.className = `marca ${superado ? 'bien' : 'mal'}`;
    }
    if (serie.hecha && d.perfil.descansoSegundos) arrancarDescanso(d.perfil.descansoSegundos);
  }

  // -------------------------------------------------------------------------

  function anadirEjercicio(ej) {
    cambiarSesion((s, datos) => {
      const planes = ej.series?.length ? ej.series : [];
      const entrada = {
        ejercicioId: ej.id,
        cicloN: null,
        diaCiclo: null,
        series: planes.map((plan) => crearSerieDesdePlan(datos, ej, plan, { excluirSesion: id })),
        notas: '',
      };
      const bilbo = entrada.series.find((x) => x.cicloN != null);
      if (bilbo) { entrada.cicloN = bilbo.cicloN; entrada.diaCiclo = bilbo.diaCiclo; }
      if (!entrada.series.length) entrada.series.push(serieSuelta());
      s.ejercicios.push(entrada);
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
      const copia = serieSuelta({ tipo: anterior?.tipo ?? 'libre', tecnica: anterior?.tecnica ?? null,
        carga: anterior?.carga ?? null });
      copia.planId = anterior?.planId ?? null;
      copia.lectura = anterior?.lectura ?? null;
      if (usaTramos(copia.tecnica)) copia.tramos = tramosPropuestos(copia, null, anterior);
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

  function elegirEjercicio() {
    const disponibles = d.ejercicios.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const lista = h('div', { class: 'lista-eleccion' });
    const pintar = (filtro = '') => {
      const f = filtro.trim().toLowerCase();
      lista.replaceChildren(...disponibles
        .filter((e) => !f || `${e.nombre} ${e.grupo || ''}`.toLowerCase().includes(f))
        .map((e) => h('button', { class: 'tarjeta fila-enlace', onclick: () => { cerrar(); anadirEjercicio(e); } },
          h('div', {},
            h('strong', {}, e.nombre),
            h('div', { class: 'suave' }, e.grupo || '')),
          sesion.ejercicios.some((x) => x.ejercicioId === e.id) && h('span', { class: 'etiqueta' }, 'Ya añadido'))));
      if (!lista.children.length) lista.append(h('p', { class: 'suave' }, 'Ningún ejercicio coincide.'));
    };
    pintar();
    const cerrar = modal('Añadir ejercicio', h('div', {},
      disponibles.length > 6 && h('input', { type: 'search', placeholder: 'Buscar', class: 'buscador',
        oninput: (e) => pintar(e.target.value) }),
      lista,
      h('a', { class: 'boton secundario', href: '#/ejercicio/nuevo', onclick: () => cerrar() }, 'Crear ejercicio nuevo')));
  }

  function terminar() {
    const nuevosRecords = [];
    for (const entrada of sesion.ejercicios) {
      const ej = ejercicioDe(entrada.ejercicioId);
      if (!ej) continue;
      const previos = records({ ...d, sesiones: d.sesiones.filter((s) => s.id !== id) }, ej.id);
      const ahora = records(d, ej.id);
      if (ahora.mejorTrabajo && (!previos.mejorTrabajo || ahora.mejorTrabajo.valor > previos.mejorTrabajo.valor)
        && sesion.ejercicios.some((e) => e.ejercicioId === ej.id)) {
        nuevosRecords.push(`${ej.nombre}: récord de trabajo (${formatearNumero(ahora.mejorTrabajo.valor)})`);
      }
    }
    cambiarSesion((s) => {
      s.estado = 'terminada';
      s.fin = new Date().toISOString();
    });
    guiado.delete(id);
    location.hash = '#/';
    if (nuevosRecords.length) aviso(`¡Récord! ${nuevosRecords[0]}`, { ms: 6000 });
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
  if (serie.esfuerzo != null) partes.push(`${formatearNumero(serie.esfuerzo)} ${unidadEsfuerzo(ej)}`);
  return partes.join(' × ');
}

export function unidadCarga(ej) {
  return ej.carga.tipo === 'asistida' ? 'kg' : TIPOS_CARGA[ej.carga.tipo]?.unidad ?? '';
}

export function unidadEsfuerzo(ej) {
  return TIPOS_ESFUERZO[ej.esfuerzo.tipo]?.unidad ?? '';
}

