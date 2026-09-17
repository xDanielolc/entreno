import { formatearNumero, generarEscalera, lecturaDesdeCarga } from '../calculos.js';
import * as estado from '../estado.js';
import { TIPOS_CARGA, TIPOS_ESFUERZO, TIPOS_PROGRESION } from '../esquema.js';
import { anadir, aviso, confirmar, h, leerNumero, nuevoId } from '../ui.js';

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

let verArchivados = false;

export function vistaEjercicios(contenedor) {
  const d = estado.datos();
  const lista = d.ejercicios
    .filter((e) => verArchivados || !e.archivado)
    .sort((a, b) => (a.grupo || '~').localeCompare(b.grupo || '~') || a.nombre.localeCompare(b.nombre));

  const grupos = new Map();
  for (const e of lista) {
    const g = e.grupo || 'Sin grupo';
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(e);
  }
  const hayArchivados = d.ejercicios.some((e) => e.archivado);

  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Ejercicios'),
      h('a', { class: 'boton', href: '#/ejercicio/nuevo' }, '+ Nuevo')),
    !lista.length && h('p', { class: 'suave' },
      'Crea un ejercicio y elige cómo quieres que progrese: con ciclos Bilbo, subiendo carga, haciendo más repeticiones o libre.'),
    [...grupos].map(([grupo, ejercicios]) => h('section', {},
      h('h2', {}, grupo.charAt(0).toUpperCase() + grupo.slice(1)),
      ejercicios.map((e) => h('a', { class: `tarjeta fila-enlace ${e.archivado ? 'archivado' : ''}`, href: `#/ejercicio/${e.id}` },
        h('div', {},
          h('strong', {}, e.nombre),
          h('div', { class: 'suave' },
            `${TIPOS_PROGRESION[e.progresion.tipo]?.etiqueta ?? ''} · ${TIPOS_CARGA[e.carga.tipo]?.etiqueta ?? ''} · ${TIPOS_ESFUERZO[e.esfuerzo.tipo]?.etiqueta ?? ''}`)),
        e.archivado && h('span', { class: 'etiqueta' }, 'Archivado'))))),
    hayArchivados && h('button', { class: 'boton enlace', onclick: () => { verArchivados = !verArchivados; estado.emitir('vista'); } },
      verArchivados ? 'Ocultar archivados' : 'Ver archivados'));
}

// ---------------------------------------------------------------------------
// Formulario de crear o editar
// ---------------------------------------------------------------------------

function ejercicioVacio() {
  return {
    id: nuevoId('ej'),
    nombre: '',
    sedeId: null,
    grupo: '',
    archivado: false,
    carga: { tipo: 'peso' },
    esfuerzo: { tipo: 'repeticiones' },
    esfuerzoExtra: null,
    formula1RM: 'epley',
    progresion: progresionPorDefecto('bilbo'),
    notas: '',
  };
}

function progresionPorDefecto(tipo) {
  switch (tipo) {
    case 'bilbo': {
      const generador = { inicial: 20, incremento: 2.5, cada: 1 };
      return { tipo, diasPorCiclo: 17, cicloActual: 1,
        ciclos: [{ n: 1, inicio: null, fin: null, generador, escalera: generarEscalera({ ...generador, dias: 17 }) }] };
    }
    case 'carga': return { tipo, objetivoEsfuerzo: [8, 12], incremento: 2.5 };
    case 'esfuerzo': return { tipo, incremento: 1 };
    default: return { tipo: 'libre' };
  }
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
  const grupos = [...new Set(d.ejercicios.map((e) => e.grupo).filter(Boolean))];
  const peso = d.perfil.pesoCorporalKg;

  const zona = h('div');
  anadir(contenedor,
    h('h1', {}, existente ? 'Editar ejercicio' : 'Nuevo ejercicio'),
    zona);

  function repintar() {
    const scroll = window.scrollY;
    zona.replaceChildren(formulario());
    window.scrollTo(0, scroll);
  }

  function cicloActual() {
    const p = borrador.progresion;
    return p.ciclos.find((c) => c.n === p.cicloActual);
  }

  function formulario() {
    const p = borrador.progresion;
    return h('form', { class: 'formulario', onsubmit: (e) => { e.preventDefault(); guardar(); } },
      campo('Nombre', h('input', { type: 'text', required: true, value: borrador.nombre, autocomplete: 'off',
        placeholder: 'Press banca', oninput: (e) => { borrador.nombre = e.target.value; } })),

      campo('Grupo', h('input', { type: 'text', value: borrador.grupo || '', list: 'grupos', placeholder: 'empuje, pierna, tirón…',
        oninput: (e) => { borrador.grupo = e.target.value.trim(); } }),
      h('datalist', { id: 'grupos' }, grupos.map((g) => h('option', { value: g })))),

      h('fieldset', {},
        h('legend', {}, '¿Qué carga usa?'),
        opciones(TIPOS_CARGA, borrador.carga.tipo, (tipo) => { borrador.carga = { tipo }; repintar(); }),
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
        h('legend', {}, '¿Cómo progresa?'),
        opciones(TIPOS_PROGRESION, p.tipo, (tipo) => {
          if (tipo !== p.tipo) borrador.progresion = progresionPorDefecto(tipo);
          repintar();
        }),
        p.tipo === 'bilbo' && seccionBilbo(),
        p.tipo === 'carga' && h('div', { class: 'fila-campos' },
          campo('Reps mínimas', numeroInput(p.objetivoEsfuerzo[0], (v) => { p.objetivoEsfuerzo[0] = v; })),
          campo('Reps máximas', numeroInput(p.objetivoEsfuerzo[1], (v) => { p.objetivoEsfuerzo[1] = v; })),
          campo('Sube (kg)', numeroInput(p.incremento, (v) => { p.incremento = v; }))),
        p.tipo === 'esfuerzo' && campo(`Aumento cada vez (${TIPOS_ESFUERZO[borrador.esfuerzo.tipo].unidad})`,
          numeroInput(p.incremento, (v) => { p.incremento = v; }))),

      campo('Notas', h('textarea', { rows: 3, value: borrador.notas || '',
        oninput: (e) => { borrador.notas = e.target.value; } })),

      h('div', { class: 'fila-botones' },
        h('a', { class: 'boton secundario', href: '#/ejercicios' }, 'Cancelar'),
        h('button', { class: 'boton', type: 'submit' }, 'Guardar')),

      existente && h('button', { type: 'button', class: 'boton enlace', onclick: archivar },
        borrador.archivado ? 'Recuperar ejercicio' : 'Archivar ejercicio'));
  }

  function seccionBilbo() {
    const p = borrador.progresion;
    const ciclo = cicloActual();
    const gen = ciclo.generador ??= { inicial: ciclo.escalera[0] ?? 0, incremento: 2.5, cada: 1 };
    const asistida = borrador.carga.tipo === 'asistida';

    const regenerar = () => {
      ciclo.escalera = generarEscalera({ ...gen, dias: p.diasPorCiclo });
      repintar();
    };

    return h('div', { class: 'bilbo' },
      h('p', { class: 'nota' },
        `Ciclo ${ciclo.n}. Cada día tiene su carga fijada. Rellena los datos y se calcula la escalera; luego puedes cambiar cualquier casilla.`),
      h('div', { class: 'fila-campos' },
        campo(asistida ? 'Carga real inicial (kg)' : 'Carga inicial', numeroInput(gen.inicial, (v) => { gen.inicial = v ?? 0; }, { onchange: regenerar })),
        campo('Incremento', numeroInput(gen.incremento, (v) => { gen.incremento = v ?? 0; }, { onchange: regenerar })),
        campo('Sube cada (días)', numeroInput(gen.cada, (v) => { gen.cada = Math.max(1, Math.round(v ?? 1)); }, { onchange: regenerar })),
        campo('Días del ciclo', numeroInput(p.diasPorCiclo, (v) => { p.diasPorCiclo = Math.max(1, Math.round(v ?? 17)); }, { onchange: regenerar }))),
      h('div', { class: 'escalera' },
        ciclo.escalera.map((carga, i) => h('label', { class: 'peldano' },
          h('span', {}, `Día ${i + 1}`),
          numeroInput(carga, (v) => { ciclo.escalera[i] = v; }, { etiqueta: `Carga del día ${i + 1}` }),
          asistida && peso != null && h('small', { class: 'suave' }, `máq ${formatearNumero(lecturaDesdeCarga(carga, peso))}`)))),
      existente && h('button', { type: 'button', class: 'boton secundario', onclick: nuevoCiclo }, 'Empezar un ciclo nuevo'));
  }

  function nuevoCiclo() {
    const p = borrador.progresion;
    const anterior = cicloActual();
    const n = Math.max(...p.ciclos.map((c) => c.n)) + 1;
    const generador = { ...(anterior.generador || { inicial: anterior.escalera[0] ?? 0, incremento: 2.5, cada: 1 }) };
    p.ciclos.push({ n, inicio: null, fin: null, generador, escalera: generarEscalera({ ...generador, dias: p.diasPorCiclo }) });
    p.cicloActual = n;
    aviso(`Ciclo ${n} preparado. Ajusta la carga inicial y guarda.`);
    repintar();
  }

  function guardar() {
    borrador.nombre = borrador.nombre.trim();
    if (!borrador.nombre) { aviso('Ponle un nombre al ejercicio', { tipo: 'error' }); return; }
    const repetido = d.ejercicios.some((e) => e.id !== borrador.id && !e.archivado
      && e.nombre.toLowerCase() === borrador.nombre.toLowerCase());
    if (repetido) { aviso('Ya tienes un ejercicio con ese nombre', { tipo: 'error' }); return; }

    estado.cambiar((datos) => {
      const i = datos.ejercicios.findIndex((e) => e.id === borrador.id);
      if (i >= 0) datos.ejercicios[i] = borrador;
      else datos.ejercicios.push(borrador);
    });
    aviso('Ejercicio guardado');
    location.hash = '#/ejercicios';
  }

  async function archivar() {
    const archivar = !borrador.archivado;
    if (archivar && !await confirmar('¿Archivar este ejercicio? Su historial se conserva y puedes recuperarlo cuando quieras.', { si: 'Archivar' })) return;
    estado.cambiar((datos) => {
      const e = datos.ejercicios.find((x) => x.id === borrador.id);
      if (e) e.archivado = archivar;
    });
    location.hash = '#/ejercicios';
  }

  repintar();
}

// ---------------------------------------------------------------------------
// Piezas de formulario
// ---------------------------------------------------------------------------

function campo(etiqueta, ...control) {
  return h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, etiqueta), ...control);
}

function numeroInput(valor, alCambiar, { onchange, etiqueta } = {}) {
  return h('input', {
    type: 'text', inputmode: 'decimal', value: valor ?? '', 'aria-label': etiqueta,
    oninput: (e) => alCambiar(leerNumero(e.target.value)),
    onchange,
  });
}

function opciones(catalogo, actual, alElegir, { compacto = false } = {}) {
  return h('div', { class: `opciones ${compacto ? 'compacto' : ''}`, role: 'radiogroup' },
    Object.entries(catalogo).map(([clave, info]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(clave === actual),
      class: `opcion ${clave === actual ? 'elegida' : ''}`,
      onclick: () => alElegir(clave),
    },
    h('strong', {}, info.etiqueta),
    !compacto && info.descripcion && h('small', {}, info.descripcion))));
}
