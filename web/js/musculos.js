// Mapa de músculos: catálogo y dibujo del cuerpo.
//
// El cuerpo y las capas de cada músculo vienen de wger (licencia Creative
// Commons BY-SA, atribución en Ajustes). Cada capa se pinta del color que
// toque usando una máscara, así que sigue los temas de la app.

export const MUSCULOS = {
  trapecio:    { nombre: 'Trapecio',   grupo: 'tirón',  tamano: 'medio',   vista: 'detras' },
  hombro:      { nombre: 'Hombros',    grupo: 'empuje', tamano: 'pequeno', vista: 'delante' },
  pecho:       { nombre: 'Pecho',      grupo: 'empuje', tamano: 'grande',  vista: 'delante' },
  biceps:      { nombre: 'Bíceps',     grupo: 'tirón',  tamano: 'pequeno', vista: 'delante' },
  triceps:     { nombre: 'Tríceps',    grupo: 'empuje', tamano: 'pequeno', vista: 'detras' },
  antebrazo:   { nombre: 'Antebrazo',  grupo: 'tirón',  tamano: 'pequeno', vista: null },
  abdomen:     { nombre: 'Abdomen',    grupo: 'core',   tamano: 'medio',   vista: 'delante' },
  oblicuos:    { nombre: 'Oblicuos',   grupo: 'core',   tamano: 'pequeno', vista: 'delante' },
  dorsal:      { nombre: 'Dorsal',     grupo: 'tirón',  tamano: 'grande',  vista: 'detras' },
  lumbar:      { nombre: 'Lumbares',   grupo: 'tirón',  tamano: 'medio',   vista: null },
  gluteo:      { nombre: 'Glúteo',     grupo: 'pierna', tamano: 'grande',  vista: 'detras' },
  cuadriceps:  { nombre: 'Cuádriceps', grupo: 'pierna', tamano: 'grande',  vista: 'delante' },
  isquios:     { nombre: 'Isquios',    grupo: 'pierna', tamano: 'grande',  vista: 'detras' },
  aductores:   { nombre: 'Aductores',  grupo: 'pierna', tamano: 'medio',   vista: null },
  abductores:  { nombre: 'Abductores', grupo: 'pierna', tamano: 'medio',   vista: null },
  gemelo:      { nombre: 'Gemelos',    grupo: 'pierna', tamano: 'pequeno', vista: 'detras' },
};

export const ORDEN_MUSCULOS = Object.keys(MUSCULOS);

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
    if (info.vista !== vista) continue;
    const estado = estadoPorMusculo[clave];
    const capa = document.createElement(alPulsar ? 'button' : 'div');
    capa.className = `capa-musculo ${estado?.clase ?? 'sin-datos'}`;
    // La ruta se resuelve contra el documento: dentro del CSS, una ruta
    // relativa se buscaría dentro de la carpeta de estilos.
    const ruta = new URL(`imagenes/musculos/${clave}.svg`, document.baseURI).href;
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
