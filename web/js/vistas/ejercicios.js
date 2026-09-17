import {
  cicloActual, formatearNumero, generarEscalera, lecturaDesdeCarga, registrosDelCiclo,
} from '../calculos.js';
import * as estado from '../estado.js';
import {
  DIAS_CICLO_POR_DEFECTO, TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_PROGRESION, TIPOS_SERIE,
  progresionPorDefecto, serieNuevaPlantilla, sobrePorDefecto, tramosDe,
} from '../esquema.js';
import { CATALOGO, buscarEnCatalogo } from '../catalogo.js';
import { MUSCULOS, ORDEN_MUSCULOS } from '../musculos.js';
import { seccionProgreso } from './graficas.js';
import { imagenDe } from '../imagenes.js';
import { anadir, aviso, confirmar, h, leerNumero, modal, nuevoId } from '../ui.js';
import { selectorTecnicas } from './tecnicas.js';

// ---------------------------------------------------------------------------
// Lista, con buscador
// ---------------------------------------------------------------------------

let verArchivados = false;
let busqueda = '';

export function vistaEjercicios(contenedor) {
  const d = estado.datos();
  const hayArchivados = d.ejercicios.some((e) => e.archivado);
  const zona = h('div', { id: 'lista-ejercicios' });

  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Ejercicios'),
      h('a', { class: 'boton', href: '#/ejercicio/nuevo' }, '+ Nuevo')),

    d.ejercicios.length > 5 && h('input', {
      type: 'search', class: 'buscador', placeholder: 'Buscar ejercicio', value: busqueda,
      oninput: (e) => { busqueda = e.target.value; pintarLista(); },
    }),

    zona,

    hayArchivados && h('button', { class: 'boton enlace', onclick: () => { verArchivados = !verArchivados; estado.emitir('vista'); } },
      verArchivados ? 'Ocultar archivados' : 'Ver archivados'));

  function pintarLista() {
    const texto = busqueda.trim().toLowerCase();
    const lista = d.ejercicios
      .filter((e) => (verArchivados || !e.archivado)
        && (!texto || `${e.nombre} ${e.grupo || ''}`.toLowerCase().includes(texto)))
      .sort((a, b) => (a.grupo || '~').localeCompare(b.grupo || '~') || a.nombre.localeCompare(b.nombre));

    const grupos = new Map();
    for (const e of lista) {
      const g = e.grupo || 'Sin grupo';
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(e);
    }

    zona.replaceChildren();
    if (!lista.length) {
      anadir(zona, h('p', { class: 'suave' }, d.ejercicios.length
        ? 'Ningún ejercicio coincide con la búsqueda.'
        : 'Crea tu primer ejercicio: eliges qué mide y cómo progresa cada una de sus series.'));
      return;
    }
    anadir(zona, [...grupos].map(([grupo, ejercicios]) => h('section', {},
      h('h2', {}, grupo.charAt(0).toUpperCase() + grupo.slice(1)),
      ejercicios.map((e) => tarjetaEjercicio(d, e)))));
  }
  pintarLista();
}

function tarjetaEjercicio(datos, ej) {
  const partes = (ej.series || []).map((plan) => {
    const prog = TIPOS_PROGRESION[plan.progresion?.tipo]?.etiqueta ?? 'Libre';
    const ciclo = plan.progresion?.tipo === 'bilbo' ? cicloActual(plan) : null;
    if (!ciclo?.escalera?.length) return `${TIPOS_SERIE[plan.tipo]}: ${prog}`;
    const hechos = registrosDelCiclo(datos, ej, plan, ciclo.n).length;
    return `${TIPOS_SERIE[plan.tipo]}: ciclo ${ciclo.n}, día ${Math.min(hechos + 1, ciclo.escalera.length)} de ${ciclo.escalera.length}`;
  });
  const imagen = imagenDe(ej.nombre);
  return h('a', { class: `tarjeta fila-enlace ${ej.archivado ? 'archivado' : ''}`, href: `#/ejercicio/${ej.id}` },
    imagen && h('img', { class: 'miniatura', src: imagen.archivo, alt: '', loading: 'lazy' }),
    h('div', { class: 'crece' },
      h('strong', {}, ej.nombre),
      h('div', { class: 'suave' }, partes.join(' · ') || 'Sin series configuradas')),
    ej.archivado && h('span', { class: 'etiqueta' }, 'Archivado'));
}

// ---------------------------------------------------------------------------
// Ficha: crear o editar
// ---------------------------------------------------------------------------

function ejercicioVacio() {
  const base = {
    id: nuevoId('ej'),
    nombre: '',
    sedeId: null,
    grupo: '',
    archivado: false,
    carga: { tipo: 'peso' },
    esfuerzo: { tipo: 'repeticiones' },
    esfuerzoExtra: null,
    formula1RM: 'epley',
    musculos: { principales: [], secundarios: [] },
    series: [],
    notas: '',
  };
  base.series = [serieNuevaPlantilla(base, { tipo: 'bilbo', progresion: 'bilbo' })];
  return base;
}

export function vistaFormularioEjercicio(contenedor, { id }) {
  const d = estado.datos();
  const existente = id !== 'nuevo' ? d.ejercicios.find((e) => e.id === id) : null;
  if (id !== 'nuevo' && !existente) {
    anadir(contenedor, h('p', {}, 'Este ejercicio no existe.'));
    return;
  }
  // Se edita un borrador: nada se guarda hasta pulsar «Guardar».
  const borrador = existente ? structuredClone(existente) : ejercicioVacio();
  borrador.series ??= [];
  borrador.musculos ??= { principales: [], secundarios: [] };
  const grupos = [...new Set(d.ejercicios.map((e) => e.grupo).filter(Boolean))];
  const peso = d.perfil.pesoCorporalKg;

  const zona = h('div');
  const imagenFicha = existente ? imagenDe(existente.nombre) : null;
  anadir(contenedor,
    h('h1', {}, existente ? borrador.nombre || 'Editar ejercicio' : 'Nuevo ejercicio'),
    imagenFicha && h('figure', { class: 'imagen-ejercicio' },
      h('img', { src: imagenFicha.archivo, alt: `Ilustración de ${existente.nombre}`, loading: 'lazy' }),
      h('figcaption', { class: 'nota' }, `Imagen: ${imagenFicha.autor} · wger, CC-BY-SA`)),
    existente && seccionProgreso(d, existente),
    zona);

  function repintar() {
    const scroll = window.scrollY;
    zona.replaceChildren(formulario());
    window.scrollTo(0, scroll);
  }

  // Lista de ejercicios habituales, para no escribirlo todo a mano.
  function elegirDelCatalogo() {
    const lista = h('div', { class: 'lista-eleccion' });
    const pintar = (filtro = '') => {
      lista.replaceChildren(...buscarEnCatalogo(filtro).map((x) => h('button', {
        type: 'button', class: 'tarjeta fila-enlace', onclick: () => { cerrar(); aplicar(x); },
      },
      h('div', {},
        h('strong', {}, x.nombre),
        h('div', { class: 'suave' }, `${x.grupo} · ${x.material} · ${x.musculos}`)))));
    };
    pintar();
    const cerrar = modal('Ejercicios habituales', h('div', {},
      h('input', { type: 'search', class: 'buscador', placeholder: 'Buscar', oninput: (e) => pintar(e.target.value) }),
      lista));
  }

  function aplicar(x) {
    borrador.nombre = x.nombre;
    borrador.grupo = x.grupo;
    borrador.carga = { tipo: x.carga || 'peso' };
    borrador.esfuerzo = { tipo: x.esfuerzo || 'repeticiones' };
    borrador.esfuerzoExtra = x.distancia ? { tipo: 'distancia', opcional: true } : null;
    borrador.musculos = { principales: [...(x.musculos?.principales ?? [])], secundarios: [...(x.musculos?.secundarios ?? [])] };
    for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
    repintar();
  }

  function formulario() {
    return h('form', { class: 'formulario', onsubmit: (e) => { e.preventDefault(); guardar(); } },
      !existente && h('button', { type: 'button', class: 'boton secundario', onclick: elegirDelCatalogo },
        'Elegir de la lista de ejercicios'),
      campo('Nombre', h('input', { type: 'text', required: true, value: borrador.nombre, autocomplete: 'off',
        placeholder: 'Press banca', oninput: (e) => { borrador.nombre = e.target.value; } })),

      campo('Grupo', h('input', { type: 'text', value: borrador.grupo || '', list: 'grupos', placeholder: 'empuje, pierna, tirón…',
        oninput: (e) => { borrador.grupo = e.target.value.trim(); } }),
      h('datalist', { id: 'grupos' }, grupos.map((g) => h('option', { value: g })))),

      h('fieldset', {},
        h('legend', {}, '¿Qué carga usa?'),
        opciones(TIPOS_CARGA, borrador.carga.tipo, (tipo) => {
          borrador.carga = { tipo };
          // Sin carga, la progresión pasa a actuar sobre lo que se mide.
          for (const plan of borrador.series) plan.progresion.sobre = sobrePorDefecto(borrador);
          repintar();
        }),
        borrador.carga.tipo === 'asistida' && h('p', { class: 'nota' },
          peso ? `Apuntarás los kilos que marca la máquina; la carga real es tu peso (${formatearNumero(peso)} kg) menos esa ayuda.`
            : 'Indica tu peso corporal en Ajustes para calcular la carga real.')),

      h('fieldset', {},
        h('legend', {}, '¿Qué apuntas en cada serie?'),
        opciones(TIPOS_ESFUERZO, borrador.esfuerzo.tipo, (tipo) => { borrador.esfuerzo = { tipo }; repintar(); }, { compacto: true }),
        borrador.esfuerzo.tipo === 'tiempo' && h('label', { class: 'casilla' },
          h('input', { type: 'checkbox', checked: Boolean(borrador.esfuerzoExtra),
            onchange: (e) => { borrador.esfuerzoExtra = e.target.checked ? { tipo: 'distancia', opcional: true } : null; } }),
          'Apuntar también la distancia (opcional en cada serie)')),

      h('fieldset', {},
        h('legend', {}, '¿Qué músculos trabaja?'),
        h('p', { class: 'nota' }, 'Sirve para el mapa de recuperación y para los avisos de volumen. '
          + 'Los secundarios cuentan la mitad.'),
        sugerenciaDelCatalogo(),
        selectorMusculos('Principales', borrador.musculos.principales, borrador.musculos.secundarios),
        selectorMusculos('Secundarios', borrador.musculos.secundarios, borrador.musculos.principales)),

      h('fieldset', {},
        h('legend', {}, 'Series de este ejercicio'),
        h('p', { class: 'nota' },
          'Son las series que aparecerán al añadirlo a un entrenamiento. Cada una progresa a su manera: '
          + 'por ejemplo, una Bilbo con su ciclo y una de intensidad con drop set.'),
        borrador.series.map((plan, i) => tarjetaPlan(plan, i)),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => {
          borrador.series.push(serieNuevaPlantilla(borrador, { tipo: 'libre' }));
          repintar();
        } }, '+ Añadir serie'),
        h('small', { class: 'nota' },
          'Solo hacen falta varias si el ejercicio lleva de verdad más de una serie: '
          + 'una Bilbo y una de intensidad, por ejemplo.')),

      campo('Notas', h('textarea', { rows: 3, value: borrador.notas || '',
        oninput: (e) => { borrador.notas = e.target.value; } })),

      h('div', { class: 'fila-botones' },
        h('a', { class: 'boton secundario', href: '#/ejercicios' }, 'Cancelar'),
        h('button', { class: 'boton', type: 'submit' }, 'Guardar')),

      existente && h('button', { type: 'button', class: 'boton enlace', onclick: archivar },
        borrador.archivado ? 'Recuperar ejercicio' : 'Archivar ejercicio'));
  }

  // Si el ejercicio se llama como uno del catálogo, se ofrecen sus músculos.
  function sugerenciaDelCatalogo() {
    if (borrador.musculos.principales.length) return null;
    const nombre = (borrador.nombre || '').trim().toLowerCase();
    if (!nombre) return null;
    const enCatalogo = CATALOGO.find((x) => x.nombre.toLowerCase() === nombre)
      ?? CATALOGO.find((x) => nombre.includes(x.nombre.toLowerCase()) || x.nombre.toLowerCase().includes(nombre));
    if (!enCatalogo?.musculos?.principales?.length) return null;
    return h('div', { class: 'tarjeta aviso-tarjeta' },
      h('p', {}, `En la lista, «${enCatalogo.nombre}» trabaja `
        + `${enCatalogo.musculos.principales.map((m) => MUSCULOS[m].nombre).join(', ')}.`),
      h('button', { type: 'button', class: 'boton secundario', onclick: () => {
        borrador.musculos = {
          principales: [...enCatalogo.musculos.principales],
          secundarios: [...(enCatalogo.musculos.secundarios ?? [])],
        };
        repintar();
      } }, 'Usar los del catálogo'));
  }

  // Chips de músculos: al tocar uno se añade o se quita. Un músculo no puede
  // ser principal y secundario a la vez.
  function selectorMusculos(etiqueta, lista, otraLista) {
    return h('div', { class: 'campo' },
      h('span', { class: 'etiqueta-campo' }, etiqueta),
      h('div', { class: 'tecnicas' },
        ORDEN_MUSCULOS.map((m) => h('button', {
          type: 'button',
          class: `chip seleccionable ${lista.includes(m) ? 'activo' : ''}`,
          'aria-pressed': String(lista.includes(m)),
          onclick: () => {
            const i = lista.indexOf(m);
            if (i >= 0) lista.splice(i, 1);
            else {
              lista.push(m);
              const j = otraLista.indexOf(m);
              if (j >= 0) otraLista.splice(j, 1);
            }
            repintar();
          },
        }, MUSCULOS[m].nombre))));
  }

  function tarjetaPlan(plan, i) {
    plan.tecnicas ??= [];
    const tramos = tramosDe(plan.tecnicas);
    return h('article', { class: 'tarjeta plan-serie' },
      h('div', { class: 'cabecera-tarjeta' },
        h('strong', {}, `Serie ${i + 1}`),
        borrador.series.length > 1 && h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Quitar serie',
          onclick: () => { borrador.series.splice(i, 1); repintar(); } }, '🗑')),

      campo('Tipo', h('select', { onchange: (e) => { plan.tipo = e.target.value; repintar(); } },
        Object.entries(TIPOS_SERIE).map(([k, v]) => h('option', { value: k, selected: k === plan.tipo }, v)))),

      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Técnicas'),
        selectorTecnicas(plan.tecnicas, (nuevas) => {
          plan.tecnicas = nuevas;
          plan.tramosPrevistos = tramosDe(nuevas) ? (plan.tramosPrevistos || 3) : null;
          repintar();
        }),
        h('small', { class: 'nota' }, 'Se pueden combinar: unilateral, rest-pause y un isométrico final en la misma serie.')),

      tramos && h('div', { class: 'fila-campos' },
        campo(`${tramos.nombre}s previstas`,
          numeroInput(plan.tramosPrevistos, (v) => { plan.tramosPrevistos = Math.max(1, Math.round(v ?? 4)); })),
        tramos.salto != null && campo('Se baja cada vez (kg)',
          numeroInput(plan.tramoSalto ?? tramos.salto, (v) => { plan.tramoSalto = v; }))),

      h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Progresión'),
        opciones(TIPOS_PROGRESION, plan.progresion.tipo, (tipo) => {
          if (tipo !== plan.progresion.tipo) plan.progresion = progresionPorDefecto(tipo, borrador);
          repintar();
        }, { compacto: true }),
        h('small', { class: 'nota' }, TIPOS_PROGRESION[plan.progresion.tipo].descripcion)),

      detalleProgresion(plan));
  }

  function detalleProgresion(plan) {
    const p = plan.progresion;
    const sobre = p.sobre || sobrePorDefecto(borrador);
    const unidad = sobre === 'carga'
      ? (TIPOS_CARGA[borrador.carga.tipo]?.unidad || '')
      : (TIPOS_ESFUERZO[borrador.esfuerzo.tipo]?.unidad || '');
    const queSube = sobre === 'carga' ? 'la carga' : TIPOS_ESFUERZO[borrador.esfuerzo.tipo].etiqueta.toLowerCase();

    if (p.tipo === 'bilbo') return seccionBilbo(plan, sobre, unidad);
    if (p.tipo === 'carga') {
      p.objetivoEsfuerzo ??= [8, 12];
      return h('div', {},
        h('div', { class: 'fila-campos' },
          campo('Mínimo', numeroInput(p.objetivoEsfuerzo[0], (v) => { p.objetivoEsfuerzo[0] = v; })),
          campo('Máximo', numeroInput(p.objetivoEsfuerzo[1], (v) => { p.objetivoEsfuerzo[1] = v; })),
          campo(`Sube (${unidad})`, numeroInput(p.incremento, (v) => { p.incremento = v; }))),
        h('small', { class: 'nota' }, `Al llegar al máximo sube ${queSube}.`));
    }
    if (p.tipo === 'esfuerzo') {
      return campo(`Aumento cada vez (${TIPOS_ESFUERZO[borrador.esfuerzo.tipo].unidad})`,
        numeroInput(p.incremento, (v) => { p.incremento = v; }));
    }
    return null;
  }

  function seccionBilbo(plan, sobre, unidad) {
    const p = plan.progresion;
    p.diasPorCiclo ??= DIAS_CICLO_POR_DEFECTO;
    p.ciclos ??= [];
    if (!p.ciclos.length) {
      p.ciclos.push({ n: 1, inicio: null, fin: null,
        generador: { inicial: sobre === 'carga' ? 20 : 10, incremento: sobre === 'carga' ? 2.5 : 1, cada: 1 },
        escalera: [] });
      p.cicloActual = 1;
    }
    const ciclo = cicloActual(plan) || p.ciclos.at(-1);
    const gen = ciclo.generador ??= { inicial: ciclo.escalera[0] ?? 0, incremento: 2.5, cada: 1 };
    if (!ciclo.escalera?.length) ciclo.escalera = generarEscalera({ ...gen, dias: p.diasPorCiclo });
    const asistida = borrador.carga.tipo === 'asistida' && sobre === 'carga';
    const hechos = existente
      ? new Map(registrosDelCiclo(d, existente, plan, ciclo.n).map((r) => [r.dia, r]))
      : new Map();

    const regenerar = () => { ciclo.escalera = generarEscalera({ ...gen, dias: p.diasPorCiclo }); repintar(); };

    return h('div', { class: 'bilbo' },
      h('p', { class: 'nota' },
        `Ciclo ${ciclo.n} de ${p.ciclos.length}. ${hechos.size} días hechos de ${ciclo.escalera.length}. `
        + `Cada día tiene su ${sobre === 'carga' ? 'carga fijada' : 'objetivo fijado'}; puedes cambiar cualquier casilla.`),

      h('div', { class: 'barra-progreso', role: 'img',
        'aria-label': `${hechos.size} de ${ciclo.escalera.length} días hechos` },
      h('span', { style: `width:${(hechos.size / ciclo.escalera.length) * 100}%` })),

      h('div', { class: 'fila-campos' },
        campo(`Inicio (${unidad})`, numeroInput(gen.inicial, (v) => { gen.inicial = v ?? 0; }, { onchange: regenerar })),
        campo('Incremento', numeroInput(gen.incremento, (v) => { gen.incremento = v ?? 0; }, { onchange: regenerar })),
        campo('Sube cada (días)', numeroInput(gen.cada, (v) => { gen.cada = Math.max(1, Math.round(v ?? 1)); }, { onchange: regenerar })),
        campo('Días del ciclo', numeroInput(p.diasPorCiclo, (v) => { p.diasPorCiclo = Math.max(1, Math.round(v ?? 17)); }, { onchange: regenerar }))),

      h('div', { class: 'escalera' },
        ciclo.escalera.map((valor, i) => {
          const hecho = hechos.get(i + 1);
          const esActual = !hecho && hechos.size === i;
          return h('label', { class: `peldano ${hecho ? 'hecho' : ''} ${esActual ? 'actual' : ''}` },
            h('span', {}, `Día ${i + 1}`),
            numeroInput(valor, (v) => { ciclo.escalera[i] = v; }, { etiqueta: `Valor del día ${i + 1}` }),
            hecho
              ? h('small', { class: 'suave' }, `✓ ${formatearNumero(hecho.serie.esfuerzo)}`)
              : asistida && peso != null && h('small', { class: 'suave' }, `máq ${formatearNumero(lecturaDesdeCarga(valor, peso))}`));
        })),

      h('div', { class: 'fila-botones' },
        p.ciclos.length > 1 && h('select', { 'aria-label': 'Ciclo mostrado',
          onchange: (e) => { p.cicloActual = Number(e.target.value); repintar(); } },
        p.ciclos.map((c) => h('option', { value: c.n, selected: c.n === p.cicloActual }, `Ciclo ${c.n}`))),
        h('button', { type: 'button', class: 'boton secundario', onclick: () => nuevoCiclo(plan) }, 'Empezar un ciclo nuevo')));
  }

  function nuevoCiclo(plan) {
    const p = plan.progresion;
    const anterior = cicloActual(plan) || p.ciclos.at(-1);
    const n = Math.max(0, ...p.ciclos.map((c) => c.n)) + 1;
    const generador = { ...(anterior?.generador || { inicial: 20, incremento: 2.5, cada: 1 }) };
    p.ciclos.push({ n, inicio: null, fin: null, generador,
      escalera: generarEscalera({ ...generador, dias: p.diasPorCiclo }) });
    p.cicloActual = n;
    aviso(`Ciclo ${n} preparado. Ajusta el valor inicial y guarda.`);
    repintar();
  }

  function guardar() {
    borrador.nombre = borrador.nombre.trim();
    if (!borrador.nombre) { aviso('Ponle un nombre al ejercicio', { tipo: 'error' }); return; }
    // Se permiten nombres repetidos a propósito: «Flexiones» de repeticiones y
    // «Flexiones» isométricas son dos ejercicios distintos para la app.
    const repetido = d.ejercicios.some((e) => e.id !== borrador.id && !e.archivado
      && e.nombre.toLowerCase() === borrador.nombre.toLowerCase());
    if (repetido) aviso('Ojo: ya tenías otro ejercicio con ese nombre', { ms: 5000 });

    estado.cambiar((datos) => {
      const i = datos.ejercicios.findIndex((e) => e.id === borrador.id);
      if (i >= 0) datos.ejercicios[i] = borrador;
      else datos.ejercicios.push(borrador);
    });
    aviso('Ejercicio guardado');
    location.hash = '#/ejercicios';
  }

  async function archivar() {
    const archivarlo = !borrador.archivado;
    if (archivarlo && !await confirmar('¿Archivar este ejercicio? Su historial se conserva y puedes recuperarlo cuando quieras.', { si: 'Archivar' })) return;
    estado.cambiar((datos) => {
      const e = datos.ejercicios.find((x) => x.id === borrador.id);
      if (e) e.archivado = archivarlo;
    });
    location.hash = '#/ejercicios';
  }

  repintar();
}

// ---------------------------------------------------------------------------
// Piezas de formulario, reutilizadas por otras pantallas
// ---------------------------------------------------------------------------

export function campo(etiqueta, ...control) {
  return h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, etiqueta), ...control);
}

export function numeroInput(valor, alCambiar, { onchange, etiqueta } = {}) {
  return h('input', {
    type: 'text', inputmode: 'decimal', value: valor ?? '', 'aria-label': etiqueta,
    oninput: (e) => alCambiar(leerNumero(e.target.value)),
    onchange,
  });
}

export function opciones(catalogo, actual, alElegir, { compacto = false } = {}) {
  return h('div', { class: `opciones ${compacto ? 'compacto' : ''}`, role: 'radiogroup' },
    Object.entries(catalogo).map(([clave, info]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(clave === actual),
      class: `opcion ${clave === actual ? 'elegida' : ''}`,
      onclick: () => alElegir(clave),
    },
    h('strong', {}, info.etiqueta),
    !compacto && info.descripcion && h('small', {}, info.descripcion))));
}
