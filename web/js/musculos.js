// Mapa de músculos: catálogo y dibujo del cuerpo.
//
// El cuerpo y la mayoría de capas vienen de wger (licencia Creative Commons
// BY-SA, atribución en Ajustes). Las capas que wger no trae (antebrazo, hombro
// posterior, lumbares, aductores, abductores, cuello y tibial) son dibujos
// propios, hechos con herramientas/dibujar_capas_extra.py.
//
// Cada capa se pinta del color que toque usando una máscara, así que sigue
// los temas de la app. `vistas` dice en qué cara del cuerpo se ve cada una;
// las capas propias se llaman «músculo-vista.svg».

export const MUSCULOS = {
  cuello:          { nombre: 'Cuello',           grupo: 'core',   tamano: 'pequeno', vistas: ['delante', 'detras'], propia: true },
  trapecio:        { nombre: 'Trapecio',         grupo: 'tirón',  tamano: 'medio',   vistas: ['detras'] },
  hombro:          { nombre: 'Hombro anterior y lateral', corto: 'Hombros', grupo: 'empuje', tamano: 'pequeno', vistas: ['delante'] },
  hombroPosterior: { nombre: 'Hombro posterior', grupo: 'tirón',  tamano: 'pequeno', vistas: ['detras'], propia: true },
  pecho:           { nombre: 'Pecho',            grupo: 'empuje', tamano: 'grande',  vistas: ['delante'] },
  biceps:          { nombre: 'Bíceps',           grupo: 'tirón',  tamano: 'pequeno', vistas: ['delante'] },
  triceps:         { nombre: 'Tríceps',          grupo: 'empuje', tamano: 'pequeno', vistas: ['detras'] },
  antebrazo:       { nombre: 'Antebrazo',        grupo: 'tirón',  tamano: 'pequeno', vistas: ['delante', 'detras'], propia: true },
  abdomen:         { nombre: 'Abdomen',          grupo: 'core',   tamano: 'medio',   vistas: ['delante'] },
  oblicuos:        { nombre: 'Oblicuos',         grupo: 'core',   tamano: 'pequeno', vistas: ['delante'] },
  dorsal:          { nombre: 'Dorsal',           grupo: 'tirón',  tamano: 'grande',  vistas: ['detras'] },
  lumbar:          { nombre: 'Lumbares',         grupo: 'core',   tamano: 'medio',   vistas: ['detras'], propia: true },
  gluteo:          { nombre: 'Glúteo',           grupo: 'pierna', tamano: 'grande',  vistas: ['detras'] },
  abductores:      { nombre: 'Abductores',       grupo: 'pierna', tamano: 'medio',   vistas: ['detras'], propia: true },
  cuadriceps:      { nombre: 'Cuádriceps',       grupo: 'pierna', tamano: 'grande',  vistas: ['delante'] },
  aductores:       { nombre: 'Aductores',        grupo: 'pierna', tamano: 'medio',   vistas: ['delante'], propia: true },
  isquios:         { nombre: 'Isquios',          grupo: 'pierna', tamano: 'grande',  vistas: ['detras'] },
  gemelo:          { nombre: 'Gemelos',          grupo: 'pierna', tamano: 'pequeno', vistas: ['detras'] },
  tibial:          { nombre: 'Tibial',           grupo: 'pierna', tamano: 'pequeno', vistas: ['delante'], propia: true },
};

export const ORDEN_MUSCULOS = Object.keys(MUSCULOS);

// Músculos del tren superior e inferior, para los filtros del catálogo.
export const TREN_SUPERIOR = ['cuello', 'trapecio', 'hombro', 'hombroPosterior', 'pecho', 'biceps', 'triceps', 'antebrazo', 'dorsal'];
export const TREN_INFERIOR = ['gluteo', 'abductores', 'cuadriceps', 'aductores', 'isquios', 'gemelo', 'tibial'];

export function nombreMusculo(clave, { corto = false } = {}) {
  const info = MUSCULOS[clave];
  if (!info) return clave;
  return corto ? info.corto ?? info.nombre : info.nombre;
}

function archivoCapa(clave, vista) {
  return MUSCULOS[clave].propia ? `imagenes/musculos/${clave}-${vista}.svg` : `imagenes/musculos/${clave}.svg`;
}

// Dibuja el cuerpo de una cara con sus músculos coloreados.
// estadoPorMusculo: { pecho: { clase: 'cansado', titulo: 'Pecho: 20 %' }, … }
export function siluetaCuerpo({ vista = 'delante', estadoPorMusculo = {}, alPulsar = null } = {}) {
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
  return caja;
}
