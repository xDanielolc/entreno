// Tema Terminal: al cambiar de pantalla cae un momento la lluvia de letras
// de Matrix (lo pidió Dan el 26-10). Un lienzo encima de todo que no recoge
// toques y se va solo en menos de un segundo. Solo cuando cambia la pestaña
// o la pantalla, no al repintar la misma; nada si el móvil pide no moverse.

const LETRAS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
const DURA_MS = 750;
let pantallaAntes = null;

function pantallaDe(hash) {
  return (hash || '#/').replace(/^#\/?/, '').split(/[/?]/)[0] || 'hoy';
}

export function lluviaAlCambiar() {
  const pantalla = pantallaDe(location.hash);
  const cambia = pantallaAntes != null && pantalla !== pantallaAntes;
  pantallaAntes = pantalla;
  if (!cambia || document.documentElement.dataset.tema !== 'matrix') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  lluvia();
}

function lluvia() {
  document.querySelector('.lluvia-matrix')?.remove();
  const lienzo = document.createElement('canvas');
  lienzo.className = 'lluvia-matrix';
  lienzo.setAttribute('aria-hidden', 'true');
  const escala = Math.min(2, devicePixelRatio || 1);
  lienzo.width = innerWidth * escala;
  lienzo.height = innerHeight * escala;
  document.body.append(lienzo);
  const c = lienzo.getContext('2d');
  c.scale(escala, escala);
  const paso = 16;
  const columnas = Math.ceil(innerWidth / paso);
  // Cada columna empieza a una altura distinta y cae a su ritmo.
  const gotas = Array.from({ length: columnas }, () => ({ y: Math.random() * innerHeight * 0.5, v: 30 + Math.random() * 30 }));
  c.font = `${paso - 2}px Consolas, "Lucida Console", monospace`;
  const inicio = performance.now();
  const cuadro = (ahora) => {
    const t = ahora - inicio;
    c.fillStyle = 'rgb(0 0 0 / 22%)';
    c.fillRect(0, 0, innerWidth, innerHeight);
    gotas.forEach((g, i) => {
      const letra = LETRAS[Math.floor(Math.random() * LETRAS.length)];
      c.fillStyle = '#c8ffd9';
      c.fillText(letra, i * paso, g.y);
      c.fillStyle = '#3dff7a';
      c.fillText(LETRAS[Math.floor(Math.random() * LETRAS.length)], i * paso, g.y - paso);
      g.y += g.v;
    });
    // La segunda mitad se desvanece y deja ver la pantalla nueva.
    lienzo.style.opacity = String(Math.max(0, Math.min(1, 2 - (2 * t) / DURA_MS)));
    if (t < DURA_MS) requestAnimationFrame(cuadro);
    else lienzo.remove();
  };
  requestAnimationFrame(cuadro);
}
