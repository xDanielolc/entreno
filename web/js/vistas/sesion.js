import {
  cargaDesdeLectura, formatearNumero, lecturaDesdeCarga, sugerenciaBilbo, sugerenciaSimple,
} from '../calculos.js';
import * as estado from '../estado.js';
import { TECNICAS, TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_SERIE } from '../esquema.js';
import { anadir, confirmar, h, leerNumero, modal, nuevoId } from '../ui.js';

export function vistaSesion(contenedor, { id }) {
  const d = estado.datos();
  const sesion = d.sesiones.find((s) => s.id === id);
  if (!sesion) {
    anadir(contenedor, h('p', {}, 'Este entrenamiento no existe.'), h('a', { href: '#/' }, 'Volver'));
    return;
  }
  const ejercicioDe = (ejId) => d.ejercicios.find((e) => e.id === ejId);

  // Modifica esta sesión. Se busca de nuevo dentro de cambiar() por si los
  // datos se han sustituido desde Drive mientras tanto.
  const cambiarSesion = (fn, opciones) => estado.cambiar((datos) => {
    const s = datos.sesiones.find((x) => x.id === id);
    if (s) fn(s, datos);
  }, opciones);

  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, sesion.estado === 'en-curso' ? 'Entrenando' : 'Entrenamiento'),
      h('input', { type: 'date', class: 'fecha', value: sesion.fecha, 'aria-label': 'Fecha',
        onchange: (e) => e.target.value && cambiarSesion((s) => { s.fecha = e.target.value; }) })),

    sesion.ejercicios.map((entrada, i) => tarjetaEjercicio(entrada, i)),

    h('button', { class: 'boton secundario grande', onclick: elegirEjercicio }, '+ Añadir ejercicio'),

    h('label', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, 'Notas del entrenamiento'),
      h('textarea', { rows: 2, value: sesion.notas || '',
        oninput: (e) => cambiarSesion((s) => { s.notas = e.target.value; }, { tecleo: true }) })),

    sesion.estado === 'en-curso'
      ? h('button', { class: 'boton grande', onclick: terminar }, 'Terminar entrenamiento')
      : h('a', { class: 'boton secundario', href: '#/historial' }, 'Volver al historial'),

    h('button', { class: 'boton enlace peligro-texto', onclick: borrar }, 'Borrar este entrenamiento'));

  // -------------------------------------------------------------------------

  function tarjetaEjercicio(entrada, indice) {
    const ej = ejercicioDe(entrada.ejercicioId);
    if (!ej) return h('div', { class: 'tarjeta' }, 'Ejercicio borrado');
    return h('article', { class: 'tarjeta ejercicio-sesion' },
      h('div', { class: 'cabecera-tarjeta' },
        h('h2', {}, ej.nombre),
        h('button', { class: 'boton-icono', 'aria-label': `Quitar ${ej.nombre}`,
          onclick: () => quitarEjercicio(indice, ej) }, '✕')),
      lineaSugerencia(ej, entrada),
      h('div', { class: 'series' },
        entrada.series.map((serie, j) => filaSerie(ej, indice, j, serie))),
      h('button', { class: 'boton secundario', onclick: () => anadirSerie(indice, ej) }, '+ Serie'));
  }

  function lineaSugerencia(ej, entrada) {
    const peso = d.perfil.pesoCorporalKg;
    if (ej.progresion.tipo === 'bilbo') {
      if (entrada.cicloN == null) {
        const s = sugerenciaBilbo(d, ej, { excluirSesion: id });
        return h('p', { class: 'sugerencia' }, s.cicloTerminado
          ? `Has terminado el ciclo ${s.cicloN}. Prepara el siguiente desde la ficha del ejercicio.`
          : 'Series libres, fuera del ciclo.');
      }
      const serieBilbo = entrada.series.find((x) => x.tipo === 'bilbo');
      const carga = serieBilbo?.carga;
      const partes = [`Ciclo ${entrada.cicloN} · día ${entrada.diaCiclo}`];
      if (carga != null) {
        partes.push(ej.carga.tipo === 'asistida' && peso != null
          ? `${formatearNumero(carga)} kg reales (máquina en ${formatearNumero(lecturaDesdeCarga(carga, peso))})`
          : `${formatearNumero(carga)} ${unidadCarga(ej)}`);
      }
      if (serieBilbo?.objetivo != null) partes.push(`supera ${formatearNumero(serieBilbo.objetivo)} ${unidadEsfuerzo(ej)}`);
      return h('p', { class: 'sugerencia' }, partes.join(' · '));
    }
    const s = sugerenciaSimple(d, ej, { excluirSesion: id });
    if (s.primeraVez) return h('p', { class: 'sugerencia' }, 'Primera vez con este ejercicio.');
    const ultima = `Última vez: ${formatearNumero(s.ultima.carga)} ${unidadCarga(ej)} × ${formatearNumero(s.ultima.esfuerzo)} ${unidadEsfuerzo(ej)}`;
    if (ej.progresion.tipo === 'carga') {
      return h('p', { class: 'sugerencia' }, s.sube
        ? `${ultima}. Llegaste al máximo: hoy prueba con ${formatearNumero(s.carga)} ${unidadCarga(ej)}.`
        : `${ultima}. Mantén la carga hasta llegar a ${s.rango?.[1]} ${unidadEsfuerzo(ej)}.`);
    }
    if (ej.progresion.tipo === 'esfuerzo') {
      return h('p', { class: 'sugerencia' }, `${ultima}. Hoy intenta ${formatearNumero(s.esfuerzo)}.`);
    }
    return h('p', { class: 'sugerencia' }, ultima);
  }

  function filaSerie(ej, i, j, serie) {
    const peso = d.perfil.pesoCorporalKg;
    const tipoCarga = ej.carga.tipo;
    const conCarga = tipoCarga !== 'ninguna';
    const asistida = tipoCarga === 'asistida';

    const marcaObjetivo = h('span', { class: 'marca' });
    const cargaReal = h('small', { class: 'suave' });
    pintarMarca();
    pintarCargaReal();

    function pintarMarca() {
      if (serie.objetivo == null || serie.esfuerzo == null) { marcaObjetivo.textContent = ''; return; }
      const superado = serie.esfuerzo > serie.objetivo;
      marcaObjetivo.textContent = superado ? '✓ superado' : '✗ no superado';
      marcaObjetivo.className = `marca ${superado ? 'bien' : 'mal'}`;
    }
    function pintarCargaReal() {
      cargaReal.textContent = asistida && serie.carga != null ? `= ${formatearNumero(serie.carga)} kg reales` : '';
    }
    const actualizar = (fn) => cambiarSesion((s) => fn(s.ejercicios[i].series[j]), { tecleo: true });

    return h('div', { class: `serie ${serie.hecha ? 'hecha' : ''}` },
      h('div', { class: 'serie-cabecera' },
        h('select', { class: 'tipo-serie', 'aria-label': 'Tipo de serie',
          onchange: (e) => cambiarSesion((s) => {
            const x = s.ejercicios[i].series[j];
            x.tipo = e.target.value;
            if (x.tipo !== 'intensidad') x.tecnica = null;
          }) },
        Object.entries(TIPOS_SERIE).map(([k, v]) => h('option', { value: k, selected: k === serie.tipo }, v))),
        serie.tipo === 'intensidad' && h('select', { 'aria-label': 'Técnica',
          onchange: (e) => actualizar((x) => { x.tecnica = e.target.value || null; }) },
        h('option', { value: '' }, 'Técnica…'),
        Object.entries(TECNICAS).map(([k, v]) => h('option', { value: k, selected: k === serie.tecnica }, v))),
        marcaObjetivo,
        h('button', { class: 'boton-icono', 'aria-label': 'Borrar serie', onclick: () => cambiarSesion((s) => {
          s.ejercicios[i].series.splice(j, 1);
        }) }, '🗑')),

      h('div', { class: 'serie-valores' },
        conCarga && (asistida
          ? h('label', { class: 'valor' },
            h('input', { type: 'text', inputmode: 'decimal', value: serie.lectura ?? '', 'aria-label': 'Kilos que marca la máquina',
              oninput: (e) => actualizar((x) => {
                x.lectura = leerNumero(e.target.value);
                x.carga = cargaDesdeLectura(x.lectura, peso);
                serie.carga = x.carga;
                pintarCargaReal();
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
              x.hecha = x.esfuerzo != null;
              if (x.objetivo != null) x.superado = x.esfuerzo != null && x.esfuerzo > x.objetivo;
              serie.esfuerzo = x.esfuerzo;
              e.target.closest('.serie').classList.toggle('hecha', x.hecha);
              pintarMarca();
            }) }),
          h('span', {}, unidadEsfuerzo(ej))),

        ej.esfuerzoExtra && h('label', { class: 'valor' },
          h('input', { type: 'text', inputmode: 'decimal', value: serie.esfuerzoExtra ?? '', 'aria-label': 'Distancia',
            oninput: (e) => actualizar((x) => { x.esfuerzoExtra = leerNumero(e.target.value); }) }),
          h('span', {}, TIPOS_ESFUERZO[ej.esfuerzoExtra.tipo].unidad))));
  }

  // -------------------------------------------------------------------------

  function nuevaSerie(ej, { tipo, carga = null, objetivo = null }) {
    const peso = d.perfil.pesoCorporalKg;
    return {
      id: nuevoId('s'), tipo, tecnica: null,
      carga, lectura: ej.carga.tipo === 'asistida' ? lecturaDesdeCarga(carga, peso) : null,
      esfuerzo: null, esfuerzoExtra: null, objetivo, hecha: false,
    };
  }

  function anadirEjercicio(ej) {
    cambiarSesion((s, datos) => {
      const entrada = { ejercicioId: ej.id, cicloN: null, diaCiclo: null, series: [], notas: '' };
      if (ej.progresion.tipo === 'bilbo') {
        const yaEsta = s.ejercicios.some((x) => x.ejercicioId === ej.id && x.cicloN != null);
        const sug = sugerenciaBilbo(datos, ej, { excluirSesion: s.id });
        if (!yaEsta && sug.dia) {
          entrada.cicloN = sug.cicloN;
          entrada.diaCiclo = sug.dia;
          entrada.series.push(nuevaSerie(ej, { tipo: 'bilbo', carga: sug.carga, objetivo: sug.objetivo }));
        } else {
          entrada.series.push(nuevaSerie(ej, { tipo: 'libre' }));
        }
      } else {
        const sug = sugerenciaSimple(datos, ej, { excluirSesion: s.id });
        entrada.series.push(nuevaSerie(ej, { tipo: 'libre', carga: sug.carga ?? null }));
      }
      s.ejercicios.push(entrada);
    });
  }

  function anadirSerie(i, ej) {
    cambiarSesion((s) => {
      const series = s.ejercicios[i].series;
      const anterior = series.at(-1);
      const tipo = anterior?.tipo === 'bilbo' ? 'intensidad' : (anterior?.tipo ?? 'libre');
      series.push(nuevaSerie(ej, { tipo, carga: anterior?.carga ?? null }));
    });
  }

  async function quitarEjercicio(i, ej) {
    const conDatos = sesion.ejercicios[i].series.some((x) => x.hecha);
    if (conDatos && !await confirmar(`¿Quitar ${ej.nombre} de este entrenamiento? Se borran sus series.`, { si: 'Quitar', peligro: true })) return;
    cambiarSesion((s) => { s.ejercicios.splice(i, 1); });
  }

  function elegirEjercicio() {
    const disponibles = d.ejercicios.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const lista = h('div', { class: 'lista-eleccion' });
    const pintar = (filtro = '') => {
      const f = filtro.trim().toLowerCase();
      lista.replaceChildren(...disponibles
        .filter((e) => !f || e.nombre.toLowerCase().includes(f))
        .map((e) => h('button', { class: 'tarjeta fila-enlace', onclick: () => { cerrar(); anadirEjercicio(e); } },
          h('strong', {}, e.nombre),
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
    cambiarSesion((s) => {
      s.estado = 'terminada';
      s.fin = new Date().toISOString();
      // Las series vacías que proponía la app y no se hicieron se conservan
      // marcadas como no hechas: también es información.
    });
    location.hash = '#/';
  }

  async function borrar() {
    if (!await confirmar('¿Borrar este entrenamiento entero? No se puede deshacer.', { si: 'Borrar', peligro: true })) return;
    estado.cambiar((datos) => { datos.sesiones = datos.sesiones.filter((s) => s.id !== id); });
    location.hash = '#/';
  }
}

function unidadCarga(ej) {
  return ej.carga.tipo === 'asistida' ? 'kg' : TIPOS_CARGA[ej.carga.tipo]?.unidad ?? '';
}

function unidadEsfuerzo(ej) {
  return TIPOS_ESFUERZO[ej.esfuerzo.tipo]?.unidad ?? '';
}

