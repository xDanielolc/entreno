const esp = (ms = 700) => new Promise(r => setTimeout(r, ms));
const raizActual = () => { const ms = [...document.querySelectorAll('.modal-fondo')]; return ms.length ? ms[ms.length - 1] : document; };
const visibles = (sel = 'button,a,[role=button],summary') => [...raizActual().querySelectorAll(sel)].filter(x => x.offsetParent !== null);
const toca = async (t, { exacto = false, n = 0, espera = 700 } = {}) => {
  const lista = visibles().filter(x => { const s = (x.innerText || x.getAttribute('aria-label') || '').trim(); return exacto ? s === t : s.includes(t); });
  const b = lista[n];
  if (!b) return 'NO ENCUENTRO: ' + t;
  b.click(); await esp(espera); return 'ok';
};
const ver = (n = 2500) => { const m = raizActual(); return ((m !== document ? '[CARTEL] ' + m.innerText : document.querySelector('main').innerText)).slice(0, n); };
const botones = () => visibles().map(x => (x.innerText || x.getAttribute('aria-label') || x.title || '(icono)').trim().replace(/\s+/g, ' ').slice(0, 50));
const escribe = async (el, valor) => {
  if (typeof el === 'string') el = raizActual().querySelector(el);
  if (!el) return 'NO HAY CAMPO';
  el.focus(); el.value = valor;
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur();
  await esp(300); return 'ok';
};
const campos = () => [...raizActual().querySelectorAll('input,textarea')].filter(x => x.offsetParent !== null).map(x => ({ tipo: x.type, ph: x.placeholder, v: x.value, et: (x.closest('label')?.innerText || x.getAttribute('aria-label') || '').trim().slice(0, 40) }));
const desbordes = () => { const w = innerWidth; return [...document.querySelectorAll('main *, .modal-fondo *, nav *')].filter(e => e.offsetParent !== null).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1); }).slice(0, 12).map(e => e.tagName + '.' + e.className + ' [' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().right) + '] ' + (e.innerText || '').slice(0, 30)); };
const recortados = () => [...document.querySelectorAll('button, .chip, .boton')].filter(e => e.offsetParent !== null && (e.scrollWidth > e.clientWidth + 2)).slice(0, 12).map(e => (e.innerText || '').slice(0, 40));
const donde = (t, n = 0) => { const b = visibles().filter(x => (x.innerText || x.getAttribute('aria-label') || '').trim().includes(t))[n]; if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)].join(' '); };
