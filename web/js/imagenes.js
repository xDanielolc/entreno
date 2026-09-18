// Imágenes de los ejercicios. Vienen de tres sitios:
//   · wger y Everkinetic, con licencia Creative Commons BY-SA
//     (herramientas/descargar_imagenes.py);
//   · muñecos propios para lo que ninguno dibuja: yoga, estiramientos,
//     movilidad, cardio… (herramientas/dibujar_munecos.py).
//
// El archivo de créditos se lee una vez y se guarda en memoria. Si no está
// (por ejemplo, sin conexión la primera vez), la app sigue funcionando sin
// imágenes.

let creditos = null;
let cargando = null;

export async function cargarCreditos() {
  if (creditos) return creditos;
  cargando ??= fetch('imagenes/creditos.json')
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((datos) => { creditos = datos ?? { ejercicios: {}, musculos: {} }; return creditos; });
  return cargando;
}

export function creditosCargados() {
  return creditos;
}

// Busca la imagen por el nombre del ejercicio, tolerando mayúsculas y tildes.
export function imagenDe(nombre) {
  if (!creditos?.ejercicios || !nombre) return null;
  const limpio = normalizar(nombre);
  for (const [clave, datos] of Object.entries(creditos.ejercicios)) {
    if (normalizar(clave) === limpio) return datos;
  }
  return null;
}

function normalizar(texto) {
  return texto.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Pie de foto con el autor y la licencia de cada imagen.
export function textoCredito(imagen) {
  if (imagen.fuente === 'propia') return 'Dibujo propio de la app, provisional hasta que lo pulamos con Design';
  if (imagen.fuente === 'everkinetic') return 'Imagen: Everkinetic · CC-BY-SA';
  return `Imagen: ${imagen.autor} · wger, CC-BY-SA`;
}
