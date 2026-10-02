// Utilidades para construir la interfaz sin librerías.

// h('button', { class: 'boton', onclick: fn }, 'Texto') crea un elemento.
// Las propiedades que empiezan por «on» son eventos; los hijos nulos o false
// se ignoran, así se pueden escribir condiciones dentro: cond && h(...).
// Apartado plegable que recuerda si lo dejaste abierto: al tocar algo dentro
// la pantalla se repinta, y sin esto se cerraría solo.
const apartadosAbiertos = new Set();

// Para enlazar a una explicación desde otra pantalla: se deja abierto el
// apartado (y, dentro, el detalle) y, al llegar, se pone a la vista.
let destino = null;
export function abrirAlLlegar(apartado, detalle = null) {
  apartadosAbiertos.add(apartado);
  destino = { apartado, detalle };
}
// Un <details> que recuerda si lo dejaste abierto, por su clave.
export function plegable(clave, resumen, props, ...contenido) {
  return h('details', { class: 'explicacion', ...props, open: apartadosAbiertos.has(clave),
    ontoggle: (e) => { if (e.target.open) apartadosAbiertos.add(clave); else apartadosAbiertos.delete(clave); } },
  h('summary', {}, resumen), ...contenido);
}

export function llevarAlDestino() {
  if (!destino) return;
  const { apartado, detalle } = destino;
  destino = null;
  setTimeout(() => {
    const d = detalle && document.getElementById(detalle);
    if (d) d.open = true;
    (d ?? document.getElementById(apartado))?.scrollIntoView({ block: 'start' });
  }, 60);
}
export function apartadoPlegable(titulo, ...contenido) {
  const id = idApartado(titulo);
  return h('details', { class: 'tarjeta formulario apartado', id, open: apartadosAbiertos.has(id),
    ontoggle: (e) => { if (e.target.open) apartadosAbiertos.add(id); else apartadosAbiertos.delete(id); } },
  h('summary', {}, titulo), ...contenido);
}

export function h(etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props || {})) {
    if (valor == null || valor === false) continue;
    if (clave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(clave.slice(2), valor);
    } else if (clave === 'class') {
      el.className = valor;
    } else if (clave === 'value') {
      el.value = valor;
    } else if (clave === 'checked' || clave === 'selected' || clave === 'disabled') {
      el[clave] = Boolean(valor);
    } else if (clave === 'dataset') {
      Object.assign(el.dataset, valor);
    } else {
      el.setAttribute(clave, valor === true ? '' : valor);
    }
  }
  anadir(el, ...hijos);
  return el;
}

// Añade hijos a un elemento, saltándose los nulos y los false.
export function anadir(padre, ...hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false) continue;
    padre.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return padre;
}

export function nuevoId(prefijo) {
  const aleatorio = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  return `${prefijo}_${Date.now().toString(36)}${aleatorio}`;
}

// Fecha de hoy en hora local, formato AAAA-MM-DD.
export function hoyISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// «20/09/2026» a partir de «2026-09-20».
export function fechaCorta(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : String(iso);
}

export function fechaLarga(iso) {
  if (!iso) return 'Sin fecha';
  const [a, m, d] = iso.split('-').map(Number);
  const texto = new Date(a, m - 1, d).toLocaleDateString('es-ES',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Segundos desde «90», «1:30», «1:02:30» o «45 min». null si está vacío.
export function leerTiempo(texto) {
  if (texto == null) return null;
  const limpio = String(texto).trim().toLowerCase().replace(',', '.');
  if (limpio === '') return null;
  const min = limpio.match(/^(\d+(?:\.\d+)?)\s*min$/);
  if (min) return Math.round(Number(min[1]) * 60);
  if (limpio.includes(':')) {
    const partes = limpio.split(':').map((x) => Number(x));
    if (partes.some((x) => Number.isNaN(x))) return null;
    return partes.reduce((t, x) => t * 60 + x, 0);
  }
  const n = Number(limpio);
  return Number.isNaN(n) ? null : n;
}

// «45», «1:30» o «1:02:30» a partir de segundos.
export function formatearTiempo(seg) {
  if (seg == null || Number.isNaN(seg)) return '';
  const s = Math.round(seg);
  if (s < 60) return String(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dos = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${dos(m)}:${dos(r)}` : `${m}:${dos(r)}`;
}

// Número desde un campo de texto, admitiendo coma decimal.
export function leerNumero(texto) {
  if (texto == null) return null;
  const limpio = String(texto).trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

let temporizadorAviso;
// accion: { texto: 'Deshacer', fn } añade un botón al aviso (y lo alarga).
// El tiempo crece con la longitud del texto, para que dé tiempo a leerlo, y
// tocando el aviso se cierra antes.
export function aviso(texto, { tipo = 'info', ms, accion } = {}) {
  let caja = document.getElementById('aviso');
  if (!caja) {
    caja = h('div', { id: 'aviso', role: 'status', 'aria-live': 'polite' });
    caja.addEventListener('click', (e) => { if (!e.target.closest('button')) caja.classList.remove('visible'); });
    document.body.append(caja);
  }
  const ocultar = () => caja.classList.remove('visible');
  const porLectura = 5000 + String(texto).length * 90;
  // Con anadir() y no con replaceChildren(): sin acción, este segundo hijo
  // es undefined y el navegador lo escribiría como texto («undefined»).
  caja.replaceChildren();
  anadir(caja, h('span', { class: 'aviso-texto-caja' }, texto),
    accion && h('button', { class: 'aviso-accion', onclick: () => { ocultar(); accion.fn(); } }, accion.texto),
    h('button', { class: 'aviso-cerrar', 'aria-label': 'Cerrar aviso', onclick: ocultar }, '✕'));
  caja.className = `aviso aviso-${tipo} visible`;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(ocultar, ms ?? (accion ? Math.min(40000, Math.max(14000, porLectura)) : Math.min(25000, porLectura)));
}

// Ventana modal sencilla. Devuelve una función para cerrarla.
export function modal(titulo, contenido) {
  const fondo = h('div', { class: 'modal-fondo', onclick: (e) => { if (e.target === fondo) cerrar(); } });
  const caja = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
    h('div', { class: 'modal-cabecera' },
      h('h2', {}, titulo),
      h('button', { class: 'boton-icono', 'aria-label': 'Cerrar', onclick: () => cerrar() }, '✕')),
    contenido);
  fondo.append(caja);
  document.body.append(fondo);
  function cerrar() { fondo.remove(); }
  return cerrar;
}

// Elegir una opción sin desplegables: en el móvil, un <select> saca la barra
// de «Anterior / Siguiente» y se entiende mal. Con pocas opciones salen
// botones que se quedan marcados; con muchas, un botón con lo elegido que abre
// la lista en un cartel. `opciones` es una lista de [valor, texto].
export function selector(opciones, actual, alElegir, { titulo = 'Elige', compacto = false, lista = false, botones = false } = {}) {
  const marcar = (v) => (e) => { e?.preventDefault?.(); alElegir(v); };
  if (botones || (!lista && opciones.length <= 5)) {
    return h('div', { class: `fila-marcas${compacto ? ' compacta' : ''}`, role: 'group', 'aria-label': titulo },
      opciones.map(([v, t]) => h('button', { type: 'button', class: `boton-marca${v === actual ? ' activo' : ''}`,
        'aria-pressed': String(v === actual), onclick: marcar(v) }, t)));
  }
  const texto = opciones.find(([v]) => v === actual)?.[1] ?? titulo;
  return h('button', { type: 'button', class: 'boton-marca selector-abrir', 'aria-label': titulo, onclick: () => {
    // Cada opción puede llevar una línea que la explica: [valor, texto, explicación].
    const cerrar = modal(titulo, h('div', { class: 'lista-selector' },
      opciones.map(([v, t, explica]) => h('button', { type: 'button', class: `boton-marca${v === actual ? ' activo' : ''}`,
        onclick: () => { cerrar(); alElegir(v); } }, explica ? [h('strong', {}, t), h('small', { class: 'bloque suave' }, explica)] : t))));
  } }, texto, h('span', { class: 'suave', 'aria-hidden': 'true' }, ' ▾'));
}

export function confirmar(pregunta, { si = 'Sí', no = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolver) => {
    const cerrar = modal(pregunta, h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => { cerrar(); resolver(false); } }, no),
      h('button', { class: `boton ${peligro ? 'peligro' : ''}`, onclick: () => { cerrar(); resolver(true); } }, si)));
  });
}

// Para lo que no se puede deshacer sin querer: hay que escribir una palabra.
export function confirmarEscribiendo(pregunta, palabra, { si = 'Borrar' } = {}) {
  return new Promise((resolver) => {
    const boton = h('button', { class: 'boton peligro', disabled: true, onclick: () => { cerrar(); resolver(true); } }, si);
    const caja = h('input', { type: 'text', autocomplete: 'off', 'aria-label': `Escribe ${palabra}`, placeholder: palabra,
      oninput: (e) => { boton.disabled = e.target.value.trim().toLowerCase() !== palabra; } });
    const cerrar = modal(pregunta, h('div', {},
      h('p', { class: 'nota' }, `Para confirmar, escribe «${palabra}»:`), caja,
      h('div', { class: 'fila-botones' },
        h('button', { class: 'boton secundario', onclick: () => { cerrar(); resolver(false); } }, 'Cancelar'), boton)));
    setTimeout(() => caja.focus(), 50);
  });
}

// Un id estable a partir de un título, para poder señalar un apartado desde
// la guía o enlazarlo: «Entrenamiento y series» → «ap-entrenamiento-y-series».
export function idApartado(titulo) {
  const limpio = String(titulo).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return `ap-${limpio.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

// Un «?» que abre una explicación. A diferencia de los del glosario, estos
// salen siempre, se contestara lo que se contestara en el cuestionario: son
// la forma de quitar texto de pantalla sin esconder cómo funciona cada cosa.
// `texto` puede ser un párrafo o una lista de párrafos; `lista`, pares de
// [nombre, explicación] que salen como una lista.
export function ayuda(titulo, texto = null, { lista = null } = {}) {
  return h('button', {
    type: 'button', class: 'que-es ayuda', 'aria-label': `Cómo funciona: ${titulo}`,
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parrafos = texto == null ? [] : (Array.isArray(texto) ? texto : [texto]);
      const cerrar = modal(titulo, h('div', { class: 'ayuda-texto' },
        parrafos.map((p) => h('p', {}, p)),
        lista && h('dl', { class: 'reglas' }, lista.flatMap(([nombre, que]) => [h('dt', {}, nombre), h('dd', {}, que)])),
        h('button', { class: 'boton', onclick: () => cerrar() }, 'Entendido')));
    },
  }, '?');
}
