// Rutinas: plantillas de días de entrenamiento.
//
// La rutina dice qué ejercicios lleva cada día y, si quieres, con cuáles de
// sus series. No dice en qué fecha cae: el día siguiente se deduce del último
// entrenamiento hecho, y siempre puedes elegir otro.

import { icono } from '../iconos.js';
import * as estado from '../estado.js';
import { nombreSede, sedeInicial, sedesActivas } from '../sedes.js';
import { anadir, aviso, confirmar, h, hoyISO, leerNumero, modal, nuevoId, selector } from '../ui.js';
import { imagenDeEjercicio } from '../imagenes.js';
import { planesDeItem, resumenPlanes, serieSuelta, textoPlan } from '../series.js';
import { crearPlanesRapidos } from '../rapidas.js';
import { abrirAsistenteSeries } from './configurar-series.js';
import { EJEMPLO, analizarRutina, crearRutinaDesdeTexto, cuadrarEjercicio, textoFormas } from '../rutina-texto.js';
import { ayuda } from '../ui.js';
import { campo } from './ejercicios.js';
import { ejercicioDesdeCatalogo, elegirEjercicio as abrirSelector } from './selector-ejercicios.js';
import { tipoDePlantilla, tipoDeRutina, PLANTILLAS, actualizarDesdePlantilla, anadirPlantilla, ejerciciosNuevos, plantillaNueva } from '../plantillas.js';
import { cuentaParaFatiga, normalizar } from '../catalogo.js';
import { nombreMusculo } from '../musculos.js';
import { pista } from './tutorial.js';
import { conGlosario } from './glosario.js';

export function rutinaActiva(datos) {
  return datos.rutinas.find((r) => r.activa && r.dias.length) ?? null;
}

// Puede haber varias rutinas activas a la vez (una de gimnasio y otra de
// casa, por ejemplo).
export function rutinasActivas(datos) {
  return datos.rutinas.filter((r) => r.activa && r.dias.length);
}

export const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const NOMBRES_DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Qué toca hoy entre las rutinas activas. Dos formas de repartir, que se
// pueden mezclar:
//   · una rutina con días fijos de la semana (diasSemana: 0 = lunes … 6 =
//     domingo) toca en esos días y solo en esos;
//   · las que no los tienen, las propone la app: la de su próximo día con
//     los músculos más recuperados y, en empate, la que lleve más tiempo
//     sin hacerse.
// Devuelve { rutina, dia, motivo, alternativas } o null.
export function queToca(datos, recuperacion = null, ahora = new Date()) {
  const activas = rutinasActivas(datos);
  if (!activas.length) return null;
  const hoyIndice = (ahora.getDay() + 6) % 7;
  const conDias = activas.filter((r) => r.diasSemana?.length);
  const libres = activas.filter((r) => !r.diasSemana?.length);
  const opcion = (rutina, motivo) => ({ rutina, dia: proximoDia(datos, rutina), motivo });
  const alternativas = activas.map((r) => opcion(r, ''));

  const deHoy = conDias.find((r) => r.diasSemana.includes(hoyIndice));
  if (deHoy) return { ...opcion(deHoy, `hoy es ${NOMBRES_DIAS[hoyIndice]}`), alternativas };

  if (libres.length) {
    const puntuacion = (r) => {
      const dia = proximoDia(datos, r);
      const musculos = new Set();
      for (const item of dia.ejercicios) {
        const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
        for (const m of ej?.musculos?.principales ?? []) musculos.add(m);
      }
      const pct = [...musculos].map((m) => recuperacion?.[m]?.porcentaje ?? 100);
      const minimo = pct.length ? Math.min(...pct) : 100;
      const ultima = datos.sesiones.filter((s) => !s.borrada && s.rutinaId === r.id).map((s) => s.fecha).sort().at(-1) ?? '';
      return { minimo, ultima };
    };
    const ordenadas = libres.map((r) => ({ r, ...puntuacion(r) }))
      .sort((a, b) => b.minimo - a.minimo || a.ultima.localeCompare(b.ultima));
    const mejor = ordenadas[0];
    const motivo = libres.length > 1
      ? (mejor.minimo >= 90 ? 'sus músculos están recuperados' : 'es la que mejor recuperada tienes')
      : '';
    return { ...opcion(mejor.r, motivo), alternativas };
  }

  // Todas tienen días fijos y hoy no toca ninguna: la más próxima.
  const proxima = conDias.map((r) => {
    const faltan = Math.min(...r.diasSemana.map((d) => (d - hoyIndice + 7) % 7 || 7));
    return { r, faltan };
  }).sort((a, b) => a.faltan - b.faltan)[0];
  const cuando = proxima.faltan === 1 ? 'mañana' : `el ${NOMBRES_DIAS[(hoyIndice + proxima.faltan) % 7]}`;
  return { ...opcion(proxima.r, `hoy no toca según tus días; la siguiente es ${cuando}`), descansoHoy: true, alternativas };
}

// Día que toca: el siguiente al del último entrenamiento terminado de esa rutina.
export function proximoDia(datos, rutina) {
  const hechas = datos.sesiones
    .filter((s) => !s.borrada && s.rutinaId === rutina.id && s.diaRutinaId)
    .sort((a, b) => (a.fecha + (a.inicio || '')).localeCompare(b.fecha + (b.inicio || '')));
  const ultimo = hechas.at(-1);
  const i = rutina.dias.findIndex((x) => x.id === ultimo?.diaRutinaId);
  return rutina.dias[(i + 1) % rutina.dias.length] ?? rutina.dias[0];
}

// Crea la sesión de un día de rutina, con sus ejercicios y series ya puestas.
export function empezarDia(rutina, dia, crearSerie) {
  const id = nuevoId('ses');
  estado.cambiar((datos) => {
    const sesion = {
      id, fecha: hoyISO(), sedeId: sedeInicial(datos, rutina),
      rutinaId: rutina.id, diaRutinaId: dia.id, estado: 'en-curso',
      inicio: new Date().toISOString(), fin: null, ejercicios: [], notas: '', borrada: null,
    };
    for (const item of dia.ejercicios) {
      const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
      if (!ej || ej.archivado) continue;
      const planes = planesDeItem(ej, item);
      const entrada = { ejercicioId: ej.id, cicloN: null, diaCiclo: null, notas: '',
        series: planes.flatMap((plan) => { const s = crearSerie(datos, ej, plan, id); return Array.isArray(s) ? s : [s]; }) };
      if (!entrada.series.length) entrada.series.push(serieSuelta());
      const bilbo = entrada.series.find((x) => x.cicloN != null);
      if (bilbo) { entrada.cicloN = bilbo.cicloN; entrada.diaCiclo = bilbo.diaCiclo; }
      sesion.ejercicios.push(entrada);
    }
    datos.sesiones.push(sesion);
  });
  return id;
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

const TIPOS_RUTINA = { todas: 'Todas', fuerza: 'Fuerza e hipertrofia', cardio: 'Cardio', flexibilidad: 'Yoga, estirar y movilidad' };
const filtroRutinas = { tipo: 'todas', texto: '' };

export function vistaRutinas(contenedor) {
  const d = estado.datos();
  const zona = h('div');
  const nombreDe = (id) => d.ejercicios.find((e) => e.id === id)?.nombre ?? '';
  const cuadra = (tipo, texto) => (filtroRutinas.tipo === 'todas' || tipo === filtroRutinas.tipo)
    && (!filtroRutinas.texto || normalizar(texto).includes(normalizar(filtroRutinas.texto)));

  function pintarLista() {
    const mias = d.rutinas.filter((r) => cuadra(tipoDeRutina(d, r),
      `${r.nombre} ${r.dias.map((x) => `${x.nombre} ${x.ejercicios.map((e) => nombreDe(e.ejercicioId)).join(' ')}`).join(' ')}`));
    const prehechas = PLANTILLAS.filter((p) => cuadra(tipoDePlantilla(p),
      `${p.nombre} ${p.resumen} ${p.dias.map((x) => `${x.nombre} ${x.ejercicios.map((e) => e.nombre).join(' ')}`).join(' ')}`));
    zona.replaceChildren();
    anadir(zona,
      mias.some((r) => r.activa) && h('h2', {}, 'Activas'),
      mias.filter((r) => r.activa).map((r) => tarjetaRutina(r)),
      mias.some((r) => !r.activa) && h('h2', {}, 'Mías, sin activar'),
      mias.filter((r) => !r.activa).map((r) => tarjetaRutina(r)),
      h('h2', {}, 'Rutinas prehechas'),
      h('p', { class: 'nota' }, 'Añádelas a tus rutinas si te encajan; si no, ignóralas. Sus ejercicios se crean solo si no los tienes ya.'),
      prehechas.map((p) => tarjetaPlantilla(d, p)),
      !mias.length && !prehechas.length && h('p', { class: 'suave' }, 'Nada que cuadre con ese filtro.'));
  }

  anadir(contenedor,
    h('div', { class: 'cabecera-vista' },
      h('h1', {}, 'Rutinas'),
      h('a', { class: 'boton', href: '#/rutina/nueva' }, '+ Nueva')),
    h('button', { type: 'button', class: 'boton secundario', onclick: () => pegarRutina(d) }, 'Pegar una rutina escrita (texto o tabla)'),
    pista('rutinas', 'Tus días de entrenamiento en orden. Las activas son las que te propone Hoy. Abajo, prehechas para empezar ya.'),
    !d.rutinas.length && h('p', { class: 'suave' },
      'Una rutina son tus días de entrenamiento en orden. La app te propondrá el siguiente cada vez que entrenes.'),
    h('input', { type: 'search', class: 'buscador', placeholder: 'Buscar rutina o ejercicio…', value: filtroRutinas.texto,
      'aria-label': 'Buscar rutina', oninput: (e) => { filtroRutinas.texto = e.target.value; pintarLista(); } }),
    h('div', { class: 'chips filtros-rutinas' }, Object.entries(TIPOS_RUTINA).map(([k, v]) => h('button', {
      type: 'button', class: `chip seleccionable ${filtroRutinas.tipo === k ? 'activo' : ''}`, 'aria-pressed': String(filtroRutinas.tipo === k),
      onclick: () => { filtroRutinas.tipo = k; pintarLista(); },
    }, v))),
    zona);
  pintarLista();
}

// Un texto largo, frase a frase, como lista: se lee más fácil.
export function enPuntos(texto) {
  const frases = (texto || '').split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ«¿¡0-9])/).map((f) => f.trim()).filter(Boolean);
  const usadas = new Set();
  if (frases.length < 2) return h('p', {}, conGlosario(texto, usadas));
  return h('ul', { class: 'puntos' }, frases.map((f) => h('li', {}, conGlosario(f, usadas))));
}

function tarjetaRutina(r) {
  const dias = r.diasSemana?.length ? r.diasSemana.map((i) => DIAS_SEMANA[i]).join(' ') : null;
  return h('a', { class: 'tarjeta fila-enlace', href: `#/rutina/${r.id}` },
    h('div', {},
      h('strong', {}, r.nombre),
      h('div', { class: 'suave' }, r.dias.map((x) => x.nombre).join(' · ') || 'Sin días'),
      dias && h('div', { class: 'suave' }, `Días fijos: ${dias}`)),
    r.activa && h('span', { class: 'etiqueta' }, 'Activa'));
}

function tarjetaPlantilla(d, plantilla) {
  const yaEsta = d.rutinas.some((r) => r.plantilla === plantilla.id);
  async function anadir() {
    const nuevos = ejerciciosNuevos(d, plantilla);
    const si = await confirmar(`¿Añadir «${plantilla.nombre}» a tus rutinas?`
      + (nuevos.length ? ` Se crearán ${nuevos.length} ejercicios que aún no tienes: ${nuevos.join(', ')}.` : ' Ya tienes todos sus ejercicios.'),
    { si: 'Añadir' });
    if (!si) return;
    let id;
    estado.cambiar((datos) => { id = anadirPlantilla(datos, plantilla); });
    aviso('Rutina añadida. Revisa los pesos de partida en cada ejercicio.');
    location.hash = `#/rutina/${id}`;
  }
  return h('article', { class: 'tarjeta plantilla' },
    h('strong', {}, plantilla.nombre),
    h('div', { class: 'suave' }, plantilla.autor),
    h('p', {}, conGlosario(plantilla.resumen)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Por qué es así'), enPuntos(plantilla.porQue)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Cómo se hace'), enPuntos(plantilla.comoSeHace)),
    h('details', { class: 'explicacion' }, h('summary', {}, 'Días y ejercicios'),
      plantilla.dias.map((dia) => h('div', {},
        h('p', {}, h('strong', {}, dia.nombre)),
        h('ul', {}, dia.ejercicios.map((x) => h('li', {}, x.nombre + (x.opcional ? ' (opcional)' : '') + (x.nota ? ` · ${x.nota}` : ''))))))),
    h('button', { class: 'boton secundario anadir-plantilla', onclick: anadir }, yaEsta ? 'Añadir otra copia' : 'Añadir a mis rutinas'));
}

// ---------------------------------------------------------------------------
// Pegar una rutina escrita
// ---------------------------------------------------------------------------

const AYUDA_PEGAR = [
  'Pega la rutina tal y como la tengas escrita: una línea por ejercicio («Press de banca: máxima 1-2 + 4 × 4 fuerza») con los '
    + 'días como cabecera («Día 1: Torso»), o una tabla con columnas sesión, ejercicio, series × repeticiones y tipo (la que suelen '
    + 'escribir las IA). Antes de crear nada te enseño lo que he entendido.',
  'Palabras que entiendo en las series: Bilbo, máxima (1-2 pesadas), fuerza (2 en recámara), descendente (en la última), ascendente, '
    + 'calentamiento, min o s (tiempo), opcional y superserie. Las series van con «×» o «x»: «3 × 8-10», «1 × 20-30», «15 min».',
  'Los ejercicios que ya tienes se usan tal cual; los de la lista general se crean con su foto y sus músculos; el resto se crean '
    + 'en blanco y los completas en su ficha.',
];

function pegarRutina(d) {
  const caja = h('textarea', { rows: 10, placeholder: EJEMPLO, 'aria-label': 'Rutina escrita', spellcheck: 'false' });
  const nombre = h('input', { type: 'text', placeholder: 'Nombre de la rutina', 'aria-label': 'Nombre de la rutina' });
  const zona = h('div', { class: 'formulario pegar-rutina' });
  const cerrar = modal('Pegar una rutina', zona);

  function pintarEntrada() {
    zona.replaceChildren(...[
      h('p', { class: 'nota centrado' }, 'Una línea por ejercicio o una tabla. Cómo se escribe ', ayuda('Pegar una rutina', AYUDA_PEGAR)),
      campo('Nombre', nombre),
      caja,
      h('div', { class: 'fila-botones' },
        h('button', { type: 'button', class: 'boton secundario', onclick: () => { caja.value = EJEMPLO; } }, 'Poner un ejemplo'),
        h('button', { type: 'button', class: 'boton', onclick: () => {
          const analisis = analizarRutina(caja.value);
          if (!analisis.dias.length) { aviso('No he encontrado ningún ejercicio. Mira el «?» para ver cómo se escribe.', { tipo: 'error' }); return; }
          pintarVistaPrevia(analisis);
        } }, 'Ver qué he entendido')),
    ]);
    setTimeout(() => caja.focus(), 50);
  }

  function pintarVistaPrevia(analisis) {
    const cuadres = new Map();
    const cuadreDe = (item) => {
      const clave = normalizar(item.nombre);
      if (!cuadres.has(clave)) cuadres.set(clave, cuadrarEjercicio(d, item.nombre, item.formas));
      return cuadres.get(clave);
    };
    const etiqueta = (c) => (c.tuyo ? (c.parecido ? `tuyo: ${c.tuyo.nombre}` : 'tuyo')
      : c.catalogo ? (c.parecido ? `de la lista: ${c.catalogo.nombre}` : 'de la lista general') : 'nuevo, en blanco');
    const nuevos = [...cuadres.values()].filter((c) => c.nuevo).length;
    zona.replaceChildren(...[
      h('p', { class: 'nota centrado' }, `${analisis.dias.length} ${analisis.dias.length === 1 ? 'día' : 'días'} y `
        + `${analisis.dias.reduce((n, x) => n + x.ejercicios.length, 0)} ejercicios. Si algo no cuadra, vuelve atrás y corrige el texto.`),
      analisis.avisos.length > 0 && h('div', { class: 'aviso-texto' }, analisis.avisos.map((a) => h('p', {}, a))),
      analisis.dias.map((dia) => h('div', { class: 'tarjeta dia-previo' },
        h('strong', {}, dia.nombre),
        h('ul', { class: 'lineas-series' }, dia.ejercicios.map((item) => {
          const c = cuadreDe(item);
          return h('li', {}, h('span', {},
            h('strong', {}, item.nombre), h('small', { class: `bloque ${c.nuevo ? 'aviso-color' : 'suave'}` }, etiqueta(c)),
            h('small', { class: 'bloque' }, textoFormas(item.formas, c.tuyo ?? null)
              + (item.opcional ? ' · opcional' : '') + (item.superserie ? ' · superserie' : ''))));
        })))),
      nuevos > 0 && h('p', { class: 'nota centrado' }, `${nuevos} ${nuevos === 1 ? 'ejercicio se creará' : 'ejercicios se crearán'} en blanco `
        + '(con peso y repeticiones, o tiempo si son minutos): luego pon su tipo y sus músculos en la ficha.'),
      h('div', { class: 'fila-botones' },
        h('button', { type: 'button', class: 'boton secundario', onclick: pintarEntrada }, '← Corregir'),
        h('button', { type: 'button', class: 'boton', onclick: () => {
          let id;
          estado.cambiar((datos) => { id = crearRutinaDesdeTexto(datos, analisis, { nombre: nombre.value.trim() || analisis.nombre || 'Rutina pegada' }); });
          cerrar();
          aviso('Rutina creada. Revisa cada día y toca un ejercicio para cambiar sus series.');
          location.hash = `#/rutina/${id}`;
        } }, 'Crear la rutina')),
    ].flat().filter(Boolean));
  }
  pintarEntrada();
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

// Rutina nueva a medias (sin nombre todavía): se conserva al repintar, para
// que no se pierda lo añadido (un ejercicio de la lista general, por ejemplo).
let rutinaNueva = null;
let fotoRutina = null;
// Ejercicios abiertos en el editor y lo escrito en «añadir series», por
// día y ejercicio: sobreviven al repintar.
const abiertosRutina = new Set();
const formasRapidas = new Map();

export function vistaFormularioRutina(contenedor, { id }) {
  const d = estado.datos();
  const existente = id !== 'nueva' ? d.rutinas.find((r) => r.id === id) : null;
  if (id !== 'nueva' && !existente) {
    anadir(contenedor, h('p', {}, 'Esta rutina no existe.'));
    return;
  }
  const borrador = existente ? structuredClone(existente) : (rutinaNueva ??= {
    id: nuevoId('rut'), nombre: '', activa: true, dias: [], diasSemana: null,
  });
  const nombreEj = (ejId) => d.ejercicios.find((e) => e.id === ejId)?.nombre ?? 'Ejercicio borrado';
  // Cómo estaba todo al entrar, para «Deshacer los cambios de ahora».
  fotoRutina ??= { id: borrador.id, rutina: existente ? structuredClone(existente) : null, ejercicios: structuredClone(d.ejercicios) };
  if (fotoRutina.id !== borrador.id) fotoRutina = { id: borrador.id, rutina: existente ? structuredClone(existente) : null, ejercicios: structuredClone(d.ejercicios) };
  let creada = Boolean(existente);

  // Se guarda solo a cada cambio, en cuanto tiene nombre.
  function persistir() {
    if (!borrador.nombre.trim()) return false;
    estado.cambiar((datos) => {
      const copia = structuredClone(borrador);
      copia.nombre = copia.nombre.trim();
      const i = datos.rutinas.findIndex((r) => r.id === copia.id);
      if (i >= 0) datos.rutinas[i] = copia;
      else datos.rutinas.push(copia);
    }, { tecleo: true });
    creada = true;
    return true;
  }

  const zona = h('div');
  zona.addEventListener('input', () => persistir());
  anadir(contenedor, h('h1', {}, existente ? 'Editar rutina' : 'Nueva rutina'),
    existente && avisoPlantillaNueva(existente),
    borrador.descripcion && h('details', { class: 'tarjeta explicacion' },
      h('summary', {}, 'Por qué es así y cómo se hace'),
      borrador.descripcion.split('\n\n').map((p) => enPuntos(p))),
    zona);

  function repintar() {
    persistir();
    const scroll = window.scrollY;
    zona.replaceChildren(formulario());
    window.scrollTo(0, scroll);
  }

  function formulario() {
    return h('form', { class: 'formulario', onsubmit: (e) => { e.preventDefault(); guardar(); } },
      campo('Nombre', h('input', { type: 'text', required: true, value: borrador.nombre,
        placeholder: 'PLPL Bilbo + Heavy Duty', oninput: (e) => { borrador.nombre = e.target.value; } })),

      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: borrador.activa,
          onchange: (e) => { borrador.activa = e.target.checked; persistir(); } }),
        'Rutina activa: Hoy te la propone (puedes tener varias activas)'),

      borrador.activa && h('div', { class: 'campo' },
        h('span', { class: 'etiqueta-campo' }, 'Días fijos de la semana (opcional)'),
        h('div', { class: 'tecnicas' }, DIAS_SEMANA.map((letra, i) => h('button', {
          type: 'button', class: `chip seleccionable ${borrador.diasSemana?.includes(i) ? 'activo' : ''}`,
          'aria-pressed': String(Boolean(borrador.diasSemana?.includes(i))), 'aria-label': NOMBRES_DIAS[i],
          onclick: () => {
            const dias = new Set(borrador.diasSemana ?? []);
            if (dias.has(i)) dias.delete(i); else dias.add(i);
            borrador.diasSemana = dias.size ? [...dias].sort() : null;
            repintar();
          } }, letra))),
        h('small', { class: 'nota' }, 'Sin días fijos, la app propone esta rutina cuando sus músculos están recuperados. '
          + 'Con días fijos, solo esos días. Sirve para combinar dos rutinas activas: una con días fijos y otra libre, por ejemplo.')),

      sedesActivas(d).length > 0 && campo('Dónde se hace', selector([['', 'En cualquier sitio'],
        ...sedesActivas(d).map((s) => [s.id, nombreSede(d, s.id)])], borrador.sedeId ?? '',
      (v) => { borrador.sedeId = v || null; repintar(); }, { titulo: 'Dónde se hace' })),

      avisoChoques(),

      borrador.dias.map((dia, i) => tarjetaDia(dia, i)),

      h('button', { type: 'button', class: 'boton secundario', onclick: () => {
        borrador.dias.push({ id: nuevoId('dia'), nombre: `Día ${borrador.dias.length + 1}`, ejercicios: [] });
        repintar();
      } }, '+ Añadir día'),

      h('p', { class: 'nota centrado' }, existente || creada ? 'Los cambios se guardan solos.' : 'En cuanto le pongas nombre, se guarda sola.'),
      h('div', { class: 'fila-botones' },
        h('button', { type: 'button', class: 'boton secundario', onclick: deshacerTodo }, existente ? 'Deshacer los cambios' : 'Descartar'),
        h('button', { class: 'boton', type: 'submit' }, 'Listo')),

      existente && h('button', { type: 'button', class: 'boton enlace peligro-texto', onclick: borrar }, 'Borrar rutina'));
  }

  // Dos días seguidos que cargan los mismos músculos no se pueden hacer en
  // días seguidos: conviene saberlo al montarla, no al chocarse con ello.
  function avisoChoques() {
    const principales = (dia) => {
      const musculos = new Set();
      for (const item of dia.ejercicios) {
        const ej = d.ejercicios.find((e) => e.id === item.ejercicioId);
        if (!ej || !cuentaParaFatiga(ej)) continue;
        for (const m of ej.musculos?.principales ?? []) musculos.add(m);
      }
      return musculos;
    };
    const choques = [];
    // Con dos días solo hay una pareja; con tres o más se mira también la
    // vuelta del último al primero, que es la que se repite cada semana.
    const parejas = borrador.dias.length < 2 ? 0
      : borrador.dias.length === 2 ? 1 : borrador.dias.length;
    for (let i = 0; i < parejas; i++) {
      const a = borrador.dias[i];
      const b = borrador.dias[(i + 1) % borrador.dias.length];
      if (a === b) continue;
      const enB = principales(b);
      const comunes = [...principales(a)].filter((m) => enB.has(m));
      if (comunes.length >= 1) choques.push({ a, b, comunes });
    }
    if (!choques.length) return null;
    return h('div', { class: 'tarjeta aviso-tarjeta' },
      h('p', {}, 'Ojo con el orden: hay días seguidos que cargan los mismos músculos, así que no podrás hacerlos un día detrás de otro.'),
      h('ul', {}, choques.map((c) => h('li', {},
        `${c.a.nombre} y ${c.b.nombre}: ${c.comunes.map((m) => nombreMusculo(m)).join(', ')}.`))),
      h('p', { class: 'nota' }, 'No es un error: puedes dejar un día de descanso entre medias o cambiar el orden. '
        + 'La app, de todas formas, te propondrá el día que mejor recuperado tengas.'));
  }

  function tarjetaDia(dia, i) {
    return h('article', { class: 'tarjeta dia-rutina' },
      h('div', { class: 'cabecera-tarjeta' },
        h('input', { type: 'text', value: dia.nombre, 'aria-label': 'Nombre del día',
          oninput: (e) => { dia.nombre = e.target.value; } }),
        h('button', { type: 'button', class: 'boton-icono papelera', 'aria-label': 'Quitar día',
          onclick: async () => {
            if (!await confirmar(`¿Quitar «${dia.nombre}» de la rutina?`, { si: 'Quitar', peligro: true })) return;
            borrador.dias.splice(i, 1);
            repintar();
          } }, icono('papelera'))),
      !dia.ejercicios.length && h('p', { class: 'suave centrado' }, 'Sin ejercicios todavía.'),
      dia.ejercicios.map((item, j) => filaEjercicio(dia, item, j)),
      h('button', { type: 'button', class: 'boton secundario', onclick: () => elegirEjercicio(dia) }, '+ Ejercicio'));
  }

  // Cada ejercicio, con su foto y lo que se hace ese día. Al tocarlo se
  // despliega para elegir sus series.
  function filaEjercicio(dia, item, j) {
    const ej = d.ejercicios.find((e) => e.id === item.ejercicioId);
    const clave = `${dia.id}:${item.ejercicioId}`;
    const abierto = abiertosRutina.has(clave);
    const imagen = ej && imagenDeEjercicio(ej);
    const resumen = ej ? resumenPlanes(planesDeItem(ej, item), ej) : '';
    const nombre = ej?.nombre ?? 'Ejercicio borrado';
    return h('div', { class: `ej-rutina${abierto ? ' abierto' : ''}` },
      h('button', { type: 'button', class: 'ej-rutina-cabecera', 'aria-expanded': String(abierto),
        onclick: () => { if (abierto) abiertosRutina.delete(clave); else abiertosRutina.add(clave); repintar(); } },
        imagen ? h('img', { class: 'miniatura', src: imagen.archivo, alt: '', loading: 'lazy' })
          : h('span', { class: 'miniatura sin-imagen', 'aria-hidden': 'true' }, nombre.slice(0, 2).toUpperCase()),
        h('span', { class: 'ej-rutina-texto' },
          h('strong', {}, nombre),
          h('small', { class: 'suave' }, [resumen || 'Aún sin series', item.opcional && 'opcional',
            item.superserie && 'superserie con el siguiente', item.nota].filter(Boolean).join(' · '))),
        h('span', { class: 'ej-rutina-flecha', 'aria-hidden': 'true' }, abierto ? '▴' : '▾')),
      abierto && detalleEjercicio(dia, item, j, ej, clave));
  }

  function detalleEjercicio(dia, item, j, ej, clave) {
    const quitar = h('button', { type: 'button', class: 'boton secundario peligro-texto', onclick: () => {
      dia.ejercicios.splice(j, 1); abiertosRutina.delete(clave); repintar();
    } }, 'Quitar del día');
    const mover = (k) => { dia.ejercicios.splice(j + k, 0, dia.ejercicios.splice(j, 1)[0]); repintar(); };
    const orden = h('div', { class: 'fila-botones ej-rutina-orden' },
      h('button', { type: 'button', class: 'boton secundario', disabled: j === 0, onclick: () => mover(-1) }, '↑ Subir'),
      h('button', { type: 'button', class: 'boton secundario', disabled: j === dia.ejercicios.length - 1, onclick: () => mover(1) }, '↓ Bajar'));
    if (!ej) return h('div', { class: 'ej-rutina-detalle' }, orden, quitar);
    const usadas = planesDeItem(ej, item);
    const usadasIds = new Set(usadas.map((p) => p.id));
    // Las que podrían entrar en este día y hoy no están: las del ejercicio
    // y las «solo aquí» de esta rutina que ningún día usa.
    const sinUsar = (ej.series || []).filter((p) => !usadasIds.has(p.id) && (!p.soloRutina || p.soloRutina === borrador.id))
      .filter((p) => !p.soloRutina || !borrador.dias.some((x) => x.ejercicios.some((y) => y.ejercicioId === ej.id && y.series?.includes(p.id))));
    return h('div', { class: 'ej-rutina-detalle' },
      h('p', { class: 'etiqueta-campo' }, 'Series de este día'),
      usadas.length
        ? h('ul', { class: 'lineas-series' }, agrupar(usadas, ej).map((g) => h('li', {},
          h('span', {}, g.texto, g.planes[0].soloRutina ? '' : h('small', { class: 'suave' }, ' · del ejercicio')),
          h('button', { type: 'button', class: 'boton-icono', 'aria-label': `Quitar ${g.texto} de este día`,
            onclick: () => quitarDelDia(item, ej, g.planes) }, icono('cerrar')))))
        : h('p', { class: 'suave centrado' }, 'Aún sin series: añade las de este día.'),
      h('button', { type: 'button', class: 'boton', onclick: () => abrirAnadir(item, ej) }, '+ Añadir series'),
      sinUsar.length > 0 && h('div', { class: 'sin-usar' },
        h('small', { class: 'nota' }, 'Series de este ejercicio que hoy no hace este día. Toca una para ponerla:'),
        h('div', { class: 'fila-marcas compacta' }, agrupar(sinUsar, ej).map((g) => h('button', { type: 'button', class: 'boton-marca',
          onclick: () => { item.series = [...usadasIds, ...g.planes.map((p) => p.id)]; normalizarItem(item, ej); repintar(); } },
        `+ ${g.texto}`)))),
      usadas.some((p) => (p.tecnicas || []).includes('drop-set')) && campo('Pesos de la serie descendente', selector([
        ['', 'Como en el ejercicio'], ['rm', 'Automáticos (% de tu 1RM)'], ['kg', 'Los pongo yo']],
      item.modoCarga ?? '', (v) => { item.modoCarga = v || null; repintar(); }, { titulo: 'Pesos de la serie descendente en esta rutina' })),
      h('div', { class: 'fila-marcas compacta' },
        h('button', { type: 'button', class: `boton-marca${item.opcional ? ' activo' : ''}`, 'aria-pressed': String(Boolean(item.opcional)),
          onclick: () => { item.opcional = !item.opcional; repintar(); } }, 'Opcional'),
        j < dia.ejercicios.length - 1 && h('button', { type: 'button', class: `boton-marca${item.superserie ? ' activo' : ''}`,
          'aria-pressed': String(Boolean(item.superserie)),
          onclick: () => { item.superserie = !item.superserie; repintar(); } }, 'Superserie con el siguiente')),
      item.superserie && h('small', { class: 'nota' }, 'Alternas una serie de cada uno sin descanso entre los dos; descansas después del segundo.'),
      campo('Nota para este día', h('input', { type: 'text', value: item.nota ?? '', placeholder: 'Agarre estrecho, pies en alto…',
        oninput: (e) => { item.nota = e.target.value || null; } })),
      orden,
      h('div', { class: 'fila-botones' },
        h('a', { class: 'boton secundario', href: `#/ejercicio/${ej.id}` }, 'Abrir el ejercicio'),
        quitar));
  }

  // Series iguales seguidas, en una línea: «4 × 4 (2 en recámara)».
  function agrupar(planes, ej) {
    const grupos = [];
    for (const p of planes) {
      const t = textoPlan(p, ej);
      const ultimo = grupos.at(-1);
      if (ultimo && ultimo.t === t && Boolean(ultimo.planes[0].soloRutina) === Boolean(p.soloRutina)) ultimo.planes.push(p);
      else grupos.push({ t, planes: [p] });
    }
    return grupos.map((g) => ({ ...g, texto: resumenPlanes(g.planes, ej) }));
  }

  // Si el día usa exactamente las series del ejercicio, vuelve a «las del
  // ejercicio» (null) y así sigue sus cambios.
  function normalizarItem(item, ej) {
    const delEjercicio = (ej.series || []).filter((p) => !p.soloRutina).map((p) => p.id);
    const elegidas = item.series ?? delEjercicio;
    const iguales = elegidas.length === delEjercicio.length && elegidas.every((id) => delEjercicio.includes(id));
    item.series = iguales ? null : elegidas;
  }

  // Quitar unas series del día: las del ejercicio solo se desmarcan; las
  // «solo aquí» que ningún otro día usa se borran del ejercicio (si ya
  // tienen historial, se retiran sin borrarlas).
  function quitarDelDia(item, ej, planes) {
    const ids = new Set(planes.map((p) => p.id));
    item.series = planesDeItem(ej, item).filter((p) => !ids.has(p.id)).map((p) => p.id);
    const antes = item.series;
    normalizarItem(item, ej);
    repintar();
    // No se borra nada: la serie queda abajo, en «Sin usar este día».
    aviso(`Quitado de este día: ${resumenPlanes(planes, ej)}.`, { accion: { texto: 'Deshacer', fn: () => { item.series = antes; normalizarItem(item, ej); repintar(); } } });
  }

  // «Añadir series»: el asistente de una pregunta cada vez.
  function abrirAnadir(item, ej) {
    abrirAsistenteSeries({ ej, datos: d, contexto: 'rutina',
      donde: (ej.series || []).some((p) => !p.soloRutina) ? 'rutina' : 'ejercicio',
      alAceptar: (f) => crearRapidas(item, ej, f) });
  }

  function crearRapidas(item, ej, f) {
    const nuevos = crearPlanesRapidos(d, ej, f);
    const antes = planesDeItem(ej, item).map((p) => p.id);
    cambiarConRutina((datos) => {
      const propio = datos.ejercicios.find((e) => e.id === ej.id);
      for (const p of nuevos) { p.soloRutina = f.donde === 'rutina' ? borrador.id : null; propio.series.push(p); }
      // El día se queda con lo que tenía más lo nuevo.
      if (f.donde === 'rutina' || item.series) item.series = [...antes, ...nuevos.map((p) => p.id)];
    });
    aviso(`Añadido: ${resumenPlanes(nuevos, ej)}`);
    repintar();
    return true;
  }

  // Cambia ejercicios y, a la vez, guarda la rutina (si ya tiene nombre):
  // así el repintado no pierde lo que acabas de poner en el día.
  function cambiarConRutina(fn) {
    estado.cambiar((datos) => {
      fn(datos);
      if (borrador.nombre.trim()) {
        const copia = structuredClone(borrador);
        copia.nombre = copia.nombre.trim();
        const i = datos.rutinas.findIndex((r) => r.id === copia.id);
        if (i >= 0) datos.rutinas[i] = copia; else datos.rutinas.push(copia);
        creada = true;
      }
    });
  }

  // Al montar la rutina se puede coger cualquier ejercicio tuyo o de la lista
  // general. Si es de la lista, se pregunta antes de añadirlo a los tuyos.
  function elegirEjercicio(dia) {
    abrirSelector({
      titulo: 'Añadir ejercicio al día',
      mios: d.ejercicios.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      marcarMio: (e) => dia.ejercicios.some((x) => x.ejercicioId === e.id) && 'Ya en este día',
      alElegirMio: (e) => anadirAlDia(dia, e.id),
      alElegirCatalogo: (x) => desdeCatalogo(dia, x),
    });
  }

  function anadirAlDia(dia, ejercicioId) {
    dia.ejercicios.push({ ejercicioId, opcional: false, series: null });
    abiertosRutina.add(`${dia.id}:${ejercicioId}`);
    repintar();
  }

  // Un ejercicio de la lista general: va a tus ejercicios y al día a la vez.
  // Antes se guardaba el ejercicio, la pantalla se repintaba y el día se
  // quedaba sin él.
  function desdeCatalogo(dia, x) {
    const nuevo = ejercicioDesdeCatalogo(x);
    // Sin series de por defecto: las de cada día se ponen aquí. Si alguna
    // vez se entrena sin rutina, entonces sí recibe las de por defecto.
    nuevo.series = [];
    dia.ejercicios.push({ ejercicioId: nuevo.id, opcional: false, series: null });
    abiertosRutina.add(`${dia.id}:${nuevo.id}`);
    cambiarConRutina((datos) => { datos.ejercicios.push(nuevo); });
    aviso(`${x.nombre} añadido al día y a tus ejercicios`);
  }

  // Vuelve la rutina y sus ejercicios a como estaban al entrar. Los
  // entrenamientos no se tocan.
  async function deshacerTodo() {
    if (!existente) { descartar(); return; }
    if (!await confirmar('¿Deshacer todo lo que has cambiado en esta rutina (y en sus series) desde que la abriste?', { si: 'Deshacer' })) return;
    const foto = fotoRutina;
    estado.cambiar((datos) => {
      const i = datos.rutinas.findIndex((r) => r.id === foto.id);
      if (i >= 0 && foto.rutina) datos.rutinas[i] = structuredClone(foto.rutina);
      const usados = new Set(datos.sesiones.flatMap((s) => s.ejercicios.map((x) => x.ejercicioId)));
      const antes = new Map(foto.ejercicios.map((x) => [x.id, x]));
      // Los ejercicios que existían vuelven como estaban; los creados ahora
      // se quitan si no se han usado en ningún entrenamiento.
      datos.ejercicios = datos.ejercicios.filter((x) => antes.has(x.id) || usados.has(x.id))
        .map((x) => (antes.has(x.id) ? structuredClone(antes.get(x.id)) : x));
    });
    fotoRutina = null;
    abiertosRutina.clear();
    aviso('Rutina como estaba al abrirla.');
    location.hash = '#/rutinas';
  }

  function guardar() {
    fotoRutina = null;
    borrador.nombre = borrador.nombre.trim();
    if (!borrador.nombre) { aviso('Ponle un nombre a la rutina', { tipo: 'error' }); return; }
    persistir();
    rutinaNueva = null;
    location.hash = '#/rutinas';
  }

  function descartar() {
    fotoRutina = null;
    if (creada) estado.cambiar((datos) => { datos.rutinas = datos.rutinas.filter((r) => r.id !== borrador.id); });
    rutinaNueva = null;
    location.hash = '#/rutinas';
  }

  async function borrar() {
    if (!await confirmar('¿Borrar esta rutina? Los entrenamientos ya hechos se conservan.', { si: 'Borrar', peligro: true })) return;
    estado.cambiar((datos) => { datos.rutinas = datos.rutinas.filter((r) => r.id !== borrador.id); });
    rutinaNueva = null;
    location.hash = '#/rutinas';
  }

  repintar();
}

// Cuando la prehecha de la que salió una rutina tiene versión nueva, un
// recuadro con un botón para ponerla al día (sin tocar lo entrenado).
export function avisoPlantillaNueva(rutina) {
  const p = plantillaNueva(rutina);
  if (!p) return null;
  return h('div', { class: 'tarjeta aviso-tarjeta' },
    h('p', {}, h('strong', {}, 'Hay una versión nueva de esta rutina. '), 'Tus entrenamientos y tus pesos se quedan como están; cambian los días y sus series.'),
    h('button', { type: 'button', class: 'boton', onclick: async () => {
      if (!await confirmar(`¿Poner «${rutina.nombre}» al día con la última versión?`, { si: 'Actualizar' })) return;
      estado.cambiar((datos) => { actualizarDesdePlantilla(datos, rutina.id); });
      aviso('Rutina actualizada. Tus entrenamientos siguen ahí.');
    } }, 'Actualizar mi rutina'));
}
