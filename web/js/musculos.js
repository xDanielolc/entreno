// Mapa de músculos: catálogo y dibujo del cuerpo.
//
// El cuerpo y la mayoría de capas vienen de wger (licencia Creative Commons
// BY-SA, atribución en Ajustes). Las capas que wger no trae (antebrazo, hombro
// posterior, lumbares, aductores, abductores, cuello, tibial, gemelo y sóleo)
// son dibujos propios, hechos con herramientas/dibujar_capas_extra.py.
//
// Cada capa se pinta del color que toque usando una máscara, así que sigue
// los temas de la app. `vistas` dice en qué cara del cuerpo se ve cada una;
// las capas propias se llaman «músculo-vista.svg».

export const MUSCULOS = {
  cuello:          { nombre: 'Cuello',           grupo: 'core',   tamano: 'pequeno', vistas: ['delante', 'detras'], propia: true },
  trapecio:        { nombre: 'Trapecio',         grupo: 'tirón',  tamano: 'medio',   vistas: ['detras'] },
  hombro:          { nombre: 'Hombro anterior y lateral', corto: 'Hombros', grupo: 'empuje', tamano: 'pequeno', vistas: ['delante'], propia: true },
  hombroPosterior: { nombre: 'Hombro posterior', grupo: 'tirón',  tamano: 'pequeno', vistas: ['detras'], propia: true },
  pecho:           { nombre: 'Pecho',            grupo: 'empuje', tamano: 'grande',  vistas: ['delante'], propia: true },
  biceps:          { nombre: 'Bíceps',           grupo: 'tirón',  tamano: 'pequeno', vistas: ['delante'] },
  triceps:         { nombre: 'Tríceps',          grupo: 'empuje', tamano: 'pequeno', vistas: ['detras'] },
  // El antebrazo, en dos: la cara de la palma (flexores de la muñeca y los
  // dedos: agarre, curl de muñeca) y la de los nudillos (extensores: curl
  // invertido, extensión de muñeca).
  antebrazoFlexor:   { nombre: 'Antebrazo interior (flexores)', corto: 'Antebrazo interior', grupo: 'tirón', tamano: 'pequeno', vistas: ['delante'], propia: true },
  antebrazoExtensor: { nombre: 'Antebrazo exterior (extensores)', corto: 'Antebrazo exterior', grupo: 'tirón', tamano: 'pequeno', vistas: ['detras'], propia: true },
  abdomen:         { nombre: 'Abdomen',          grupo: 'core',   tamano: 'medio',   vistas: ['delante'], propia: true },
  oblicuos:        { nombre: 'Oblicuos',         grupo: 'core',   tamano: 'pequeno', vistas: ['delante'], propia: true },
  dorsal:          { nombre: 'Dorsal',           grupo: 'tirón',  tamano: 'grande',  vistas: ['detras'] },
  lumbar:          { nombre: 'Lumbares',         grupo: 'core',   tamano: 'medio',   vistas: ['detras'], propia: true },
  gluteo:          { nombre: 'Glúteo',           grupo: 'pierna', tamano: 'grande',  vistas: ['detras'] },
  abductores:      { nombre: 'Abductores',       grupo: 'pierna', tamano: 'medio',   vistas: ['detras'], propia: true },
  cuadriceps:      { nombre: 'Cuádriceps',       grupo: 'pierna', tamano: 'grande',  vistas: ['delante'] },
  aductores:       { nombre: 'Aductores',        grupo: 'pierna', tamano: 'medio',   vistas: ['delante'], propia: true },
  isquios:         { nombre: 'Isquios',          grupo: 'pierna', tamano: 'grande',  vistas: ['detras'], propia: true },
  // El gemelo se entrena con la rodilla estirada (de pie); el sóleo, con la
  // rodilla doblada (sentado). Por eso van por separado.
  gemelo:          { nombre: 'Gemelo (gastrocnemio)', corto: 'Gemelo',          grupo: 'pierna', tamano: 'pequeno', vistas: ['detras'], propia: true },
  soleo:           { nombre: 'Gemelo (sóleo)', corto: 'Sóleo', grupo: 'pierna', tamano: 'pequeno', vistas: ['detras'], propia: true },
  tibial:          { nombre: 'Tibial',           grupo: 'pierna', tamano: 'pequeno', vistas: ['delante'], propia: true },
};

export const ORDEN_MUSCULOS = Object.keys(MUSCULOS);

// Músculos del tren superior e inferior, para los filtros del catálogo.
export const TREN_SUPERIOR = ['cuello', 'trapecio', 'hombro', 'hombroPosterior', 'pecho', 'biceps', 'triceps', 'antebrazoFlexor', 'antebrazoExtensor', 'dorsal'];
export const TREN_INFERIOR = ['gluteo', 'abductores', 'cuadriceps', 'aductores', 'isquios', 'gemelo', 'soleo', 'tibial'];

export function nombreMusculo(clave, { corto = false } = {}) {
  const info = MUSCULOS[clave];
  if (!info) return clave;
  return corto ? info.corto ?? info.nombre : info.nombre;
}

export function archivoCapa(clave, vista) {
  return MUSCULOS[clave].propia ? `imagenes/musculos/${clave}-${vista}.svg` : `imagenes/musculos/${clave}.svg`;
}

// Dibuja el cuerpo de una cara con sus músculos coloreados.
// estadoPorMusculo: { pecho: { clase: 'cansado', titulo: 'Pecho: 20 %' }, … }
// `lado` ('izq' | 'der', el de la persona) colorea solo ese lado: para las
// medidas de un brazo o una pierna.
export function siluetaCuerpo({ vista = 'delante', estadoPorMusculo = {}, alPulsar = null, lado = null } = {}) {
  const caja = document.createElement('div');
  caja.className = `cuerpo cuerpo-${vista}`;

  const fondo = document.createElement('img');
  fondo.src = `imagenes/musculos/cuerpo-${vista}.svg`;
  fondo.alt = vista === 'delante' ? 'Cuerpo visto de frente' : 'Cuerpo visto de espaldas';
  fondo.loading = 'lazy';
  caja.append(fondo);

  for (const [clave, info] of Object.entries(MUSCULOS)) {
    if (!info.vistas.includes(vista)) continue;
    const estado = estadoPorMusculo[clave];
    const capa = document.createElement(alPulsar ? 'button' : 'div');
    capa.className = `capa-musculo ${estado?.clase ?? 'sin-datos'}`;
    // La ruta se resuelve contra el documento: dentro del CSS, una ruta
    // relativa se buscaría dentro de la carpeta de estilos.
    const ruta = new URL(archivoCapa(clave, vista), document.baseURI).href;
    capa.style.setProperty('--mascara', `url("${ruta}")`);
    capa.title = estado?.titulo ?? info.nombre;
    capa.dataset.musculo = clave;
    if (alPulsar) {
      capa.type = 'button';
      capa.setAttribute('aria-label', capa.title);
      capa.addEventListener('click', () => alPulsar(clave));
    }
    caja.append(capa);
  }
  pintarEnLienzo(caja, fondo, vista, lado);
  return caja;
}

// Algunos navegadores del móvil (Ecosia, Samsung Internet…) oscurecen la
// página por su cuenta aunque la app ya tenga tema oscuro, y de paso invierten
// las imágenes: el cuerpo salía gris claro y el ámbar, marrón. Lo que se pinta
// en un <canvas> no lo tocan. Por eso el mapa se dibuja ahí; las capas siguen
// encima, invisibles, para el título de cada músculo. Si algo falla, se
// quedan las capas de siempre.
const cargarImagen = (src) => new Promise((ok, mal) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = mal;
  img.src = src;
});

async function pintarEnLienzo(caja, fondo, vista, lado = null) {
  try {
    const base = await cargarImagen(fondo.src);
    // Los colores salen del CSS (temas): hay que esperar a que esté en pantalla.
    for (let i = 0; !caja.isConnected && i < 50; i++) await new Promise((r) => requestAnimationFrame(r));
    if (!caja.isConnected) { caja.classList.add('sin-lienzo'); return; }
    // Las capas no se pintan (así no asoman un instante los colores viejos);
    // su color se lee un momento con «sin-lienzo», sin llegar a pintarse.
    caja.classList.add('sin-lienzo');
    const colores = new Map([...caja.querySelectorAll('.capa-musculo:not(.sin-datos)')]
      .map((capa) => [capa, getComputedStyle(capa).backgroundColor]));
    caja.classList.remove('sin-lienzo');
    const escala = Math.min(4, Math.max(2, window.devicePixelRatio || 1));
    const ancho = Math.round((base.naturalWidth || 200) * escala);
    const alto = Math.round((base.naturalHeight || 369) * escala);
    // De frente, el dibujo de wger no es simétrico (el pecho sobre todo): se
    // usa su mitad izquierda y su espejo, como si estuviera completo.
    const cuerpo = document.createElement('canvas');
    cuerpo.width = ancho;
    cuerpo.height = alto;
    const cc = cuerpo.getContext('2d');
    cc.drawImage(base, 0, 0, ancho, alto);
    if (vista === 'delante') {
      // Del cuello para abajo: la cara en espejo quedaba rarísima.
      const eje = Math.round(98.5 * escala);
      const cuello = Math.round(58 * escala);
      const izquierda = document.createElement('canvas');
      izquierda.width = eje;
      izquierda.height = alto - cuello;
      izquierda.getContext('2d').drawImage(cuerpo, 0, cuello, eje, alto - cuello, 0, 0, eje, alto - cuello);
      cc.clearRect(eje, cuello, ancho - eje, alto - cuello);
      cc.save();
      cc.translate(2 * eje, 0);
      cc.scale(-1, 1);
      cc.drawImage(izquierda, 0, cuello);
      cc.restore();
    }
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.className = 'lienzo-cuerpo';
    lienzo.setAttribute('aria-hidden', 'true');
    const ctx = lienzo.getContext('2d');
    const opacidad = Number(getComputedStyle(fondo).opacity) || 1;
    // Silueta para recortar los colores: el cuerpo con sus huecos interiores
    // tapados (se ensancha y luego se estrecha lo mismo), para que el color no
    // se salga por fuera ni deje agujeros por dentro.
    const silueta = document.createElement('canvas');
    silueta.width = ancho;
    silueta.height = alto;
    const sc = silueta.getContext('2d');
    const r = 2.5 * escala;
    const vueltas = [...Array(16)].map((_, k) => [Math.cos((k * Math.PI) / 8) * r, Math.sin((k * Math.PI) / 8) * r]);
    sc.drawImage(cuerpo, 0, 0);
    for (const [dx, dy] of vueltas) sc.drawImage(cuerpo, dx, dy);
    const ancha = document.createElement('canvas');
    ancha.width = ancho;
    ancha.height = alto;
    ancha.getContext('2d').drawImage(silueta, 0, 0);
    sc.globalCompositeOperation = 'destination-in';
    for (const [dx, dy] of vueltas) sc.drawImage(ancha, dx, dy);
    // Debajo del dibujo, la silueta en gris: tapa los agujeros del dibujo de
    // wger (el del centro del pecho, por ejemplo).
    const relleno = document.createElement('canvas');
    relleno.width = ancho;
    relleno.height = alto;
    const rc = relleno.getContext('2d');
    rc.drawImage(silueta, 0, 0);
    rc.globalCompositeOperation = 'source-in';
    rc.fillStyle = '#4a4a4a';
    rc.fillRect(0, 0, ancho, alto);
    ctx.globalAlpha = opacidad;
    ctx.drawImage(relleno, 0, 0);
    // El hueco grande del centro del pecho, a mano.
    if (vista === 'delante') {
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.ellipse(98.5 * escala, 92 * escala, 5 * escala, 22 * escala, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(cuerpo, 0, 0);
    // Cada músculo: su dibujo hace de molde y se rellena con su color.
    const molde = document.createElement('canvas');
    molde.width = ancho;
    molde.height = alto;
    const m = molde.getContext('2d');
    for (const [capa, color] of colores) {
      const ruta = new URL(archivoCapa(capa.dataset.musculo, vista), document.baseURI).href;
      const img = await cargarImagen(ruta);
      m.globalCompositeOperation = 'source-over';
      m.clearRect(0, 0, ancho, alto);
      m.drawImage(img, 0, 0, ancho, alto);
      m.globalCompositeOperation = 'source-in';
      m.fillStyle = color;
      m.fillRect(0, 0, ancho, alto);
      // Recortado con la silueta: ningún color se sale del cuerpo.
      m.globalCompositeOperation = 'destination-in';
      m.drawImage(silueta, 0, 0);
      // Un solo lado: de frente, el izquierdo de la persona queda a la derecha
      // de quien mira; de espaldas, a la izquierda.
      if (lado) {
        const eje = (vista === 'delante' ? 98.5 : 100) * escala;
        const aLaDerecha = (lado === 'izq') === (vista === 'delante');
        m.globalCompositeOperation = 'source-over';
        if (aLaDerecha) m.clearRect(0, 0, eje, alto); else m.clearRect(eje, 0, ancho - eje, alto);
      }
      // Primero el color algo transparente y después solo su tono sobre el
      // dibujo: se ven el color y las formas del músculo debajo.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(molde, 0, 0);
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.6;
      ctx.drawImage(molde, 0, 0);
    }
    ctx.globalCompositeOperation = 'source-over';
    fondo.after(lienzo);
    caja.classList.add('con-lienzo');
  } catch {
    // Sin lienzo: se ven las capas de siempre.
    caja.classList.add('sin-lienzo');
  }
}

// ---------------------------------------------------------------------------
// Un trozo del muñeco con uno o varios músculos marcados, para los botones de
// los filtros, las medidas y el gráfico de equilibrio (idea de Lyfta: el
// pecho se reconoce antes por el dibujo que por la palabra). El recorte sale
// solo del dibujo de cada capa: se busca dónde está el músculo y se encuadra
// con algo de cuerpo alrededor.
// ---------------------------------------------------------------------------

const PROPORCION = 369 / 200;    // alto / ancho del dibujo del cuerpo
const cajasDeCapa = new Map();

function cajaDeCapa(clave, vista) {
  const k = `${clave}-${vista}`;
  if (!cajasDeCapa.has(k)) {
    cajasDeCapa.set(k, cargarImagen(new URL(archivoCapa(clave, vista), document.baseURI).href).then((img) => {
      const lienzo = document.createElement('canvas');
      lienzo.width = 100;
      lienzo.height = Math.round(100 * PROPORCION);
      const c = lienzo.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      const { data } = c.getImageData(0, 0, lienzo.width, lienzo.height);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < lienzo.height; y++) {
        for (let x = 0; x < lienzo.width; x++) {
          if (data[(y * lienzo.width + x) * 4 + 3] > 40) {
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return null;
      return { x0: x0 / 100, x1: (x1 + 1) / 100, y0: y0 / lienzo.height, y1: (y1 + 1) / lienzo.height };
    }).catch(() => null));
  }
  return cajasDeCapa.get(k);
}

// La cara del cuerpo en la que se ven mejor estos músculos.
export function vistaDe(claves) {
  const delante = claves.filter((m) => MUSCULOS[m]?.vistas.includes('delante')).length;
  const detras = claves.filter((m) => MUSCULOS[m]?.vistas.includes('detras')).length;
  return detras > delante ? 'detras' : 'delante';
}

export function musculoRecortado(claves, { vista = null, lado = null, clase = 'principal', secundarios = [], titulo = '' } = {}) {
  const lista = [].concat(claves).filter((m) => MUSCULOS[m]);
  const cara = vista ?? vistaDe(lista);
  const estados = Object.fromEntries([
    ...secundarios.map((m) => [m, { clase: 'secundario' }]),
    ...lista.map((m) => [m, { clase, titulo }])]);
  const marco = document.createElement('span');
  marco.className = 'recorte-musculo';
  marco.setAttribute('aria-hidden', 'true');
  const cuerpo = siluetaCuerpo({ vista: cara, estadoPorMusculo: estados, lado });
  marco.append(cuerpo);
  const visibles = lista.filter((m) => MUSCULOS[m].vistas.includes(cara));
  Promise.all(visibles.map((m) => cajaDeCapa(m, cara))).then((cajas) => {
    const validas = cajas.filter(Boolean);
    let x0 = 0.25, x1 = 0.75, y0 = 0.15, y1 = 0.55;
    if (validas.length) {
      x0 = Math.min(...validas.map((c) => c.x0)); x1 = Math.max(...validas.map((c) => c.x1));
      y0 = Math.min(...validas.map((c) => c.y0)); y1 = Math.max(...validas.map((c) => c.y1));
      if (lado) {
        // Solo la mitad del lado marcado.
        const derecha = (lado === 'izq') === (cara === 'delante');
        if (derecha) x0 = Math.max(x0, 0.49); else x1 = Math.min(x1, 0.51);
      }
    }
    // Un cuadrado con el músculo en medio y algo de cuerpo alrededor.
    const ancho = Math.min(1, Math.max(0.42, (x1 - x0) * 1.5, (y1 - y0) * PROPORCION * 1.35));
    const alto = ancho / PROPORCION;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const izq = Math.min(Math.max(cx - ancho / 2, 0), 1 - ancho);
    const arriba = Math.min(Math.max(cy - alto / 2, 0), 1 - alto);
    cuerpo.style.width = `${100 / ancho}%`;
    cuerpo.style.left = `${(-izq / ancho) * 100}%`;
    cuerpo.style.top = `${(-arriba * PROPORCION / ancho) * 100}%`;
    marco.classList.add('encuadrado');
  });
  return marco;
}
