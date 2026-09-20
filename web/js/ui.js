// Utilidades para construir la interfaz sin librerías.

// h('button', { class: 'boton', onclick: fn }, 'Texto') crea un elemento.
// Las propiedades que empiezan por «on» son eventos; los hijos nulos o false
// se ignoran, así se pueden escribir condiciones dentro: cond && h(...).
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

export function fechaLarga(iso) {
  if (!iso) return 'Sin fecha';
  const [a, m, d] = iso.split('-').map(Number);
  const texto = new Date(a, m - 1, d).toLocaleDateString('es-ES',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
  const porLectura = 4000 + String(texto).length * 60;
  // Con anadir() y no con replaceChildren(): sin acción, este segundo hijo
  // es undefined y el navegador lo escribiría como texto («undefined»).
  caja.replaceChildren();
  anadir(caja, h('span', { class: 'aviso-texto-caja' }, texto),
    accion && h('button', { class: 'aviso-accion', onclick: () => { ocultar(); accion.fn(); } }, accion.texto),
    h('button', { class: 'aviso-cerrar', 'aria-label': 'Cerrar aviso', onclick: ocultar }, '✕'));
  caja.className = `aviso aviso-${tipo} visible`;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(ocultar, ms ?? Math.min(15000, accion ? Math.max(10000, porLectura) : porLectura));
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

export function confirmar(pregunta, { si = 'Sí', no = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolver) => {
    const cerrar = modal(pregunta, h('div', { class: 'fila-botones' },
      h('button', { class: 'boton secundario', onclick: () => { cerrar(); resolver(false); } }, no),
      h('button', { class: `boton ${peligro ? 'peligro' : ''}`, onclick: () => { cerrar(); resolver(true); } }, si)));
  });
}
