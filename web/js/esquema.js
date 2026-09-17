// Forma de los datos y migraciones entre versiones.
// La referencia completa está en docs/esquema-datos.md.
//
// Regla de oro: cuando cambie la forma de los datos, se sube VERSION_ACTUAL
// y se añade una función a MIGRACIONES que convierta de la versión anterior
// a la nueva. Nunca se modifica una migración ya publicada.

export const VERSION_ACTUAL = 1;

export const TIPOS_CARGA = {
  peso:         { etiqueta: 'Peso',            unidad: 'kg', descripcion: 'Kilos de barra, mancuernas o máquina' },
  asistida:     { etiqueta: 'Máquina asistida', unidad: 'kg', descripcion: 'La máquina te ayuda: se resta de tu peso corporal (dominadas o fondos asistidos)' },
  pesoCorporal: { etiqueta: 'Peso corporal',   unidad: 'kg', descripcion: 'Tu propio peso, con lastre opcional' },
  altura:       { etiqueta: 'Altura',          unidad: 'cm', descripcion: 'Una medida de dificultad, como la altura del ladrillo' },
  ninguna:      { etiqueta: 'Sin carga',       unidad: '',   descripcion: 'Estiramientos, cardio, abdominales sin peso' },
};

export const TIPOS_ESFUERZO = {
  repeticiones: { etiqueta: 'Repeticiones', unidad: 'reps' },
  tiempo:       { etiqueta: 'Tiempo',       unidad: 's' },
  distancia:    { etiqueta: 'Distancia',    unidad: 'km' },
};

export const TIPOS_PROGRESION = {
  bilbo:    { etiqueta: 'Bilbo',     descripcion: 'Ciclo de días con el peso de cada día fijado de antemano. Cada día intentas superar tu 1RM anterior.' },
  carga:    { etiqueta: 'Por carga', descripcion: 'Cuando llegas al máximo de repeticiones, subes peso.' },
  esfuerzo: { etiqueta: 'Por esfuerzo', descripcion: 'El peso no cambia; intentas hacer algo más cada vez.' },
  libre:    { etiqueta: 'Libre',     descripcion: 'La app solo registra y te recuerda lo último que hiciste.' },
};

export const TIPOS_SERIE = {
  bilbo:         'Bilbo',
  intensidad:    'Intensidad',
  calentamiento: 'Calentamiento',
  libre:         'Libre',
};

export const TECNICAS = {
  'drop-set':           'Drop set',
  'rest-pause':         'Rest-pause',
  'isometrico-final':   'Isométrico final',
  'excentricas-lentas': 'Excéntricas lentas',
  'unilateral':         'Unilateral',
  'fallo-tecnico':      'Fallo técnico',
  'fallo-absoluto':     'Fallo absoluto',
};

export function archivoNuevo({ nombre = '', correo = null } = {}) {
  const ahora = new Date().toISOString();
  return {
    version: VERSION_ACTUAL,
    creado: ahora,
    actualizado: ahora,
    revision: 0,
    origen: null,
    perfil: {
      nombre,
      correo,
      pesoCorporalKg: null,
      unidadPeso: 'kg',
      sedePorDefecto: null,
      tema: 'sistema',
    },
    sedes: [],
    ejercicios: [],
    rutinas: [],
    sesiones: [],
  };
}

// Cada entrada convierte un archivo de la versión N a la N + 1.
// Ejemplo para el futuro:
//   1: (datos) => { datos.nuevoCampo = []; datos.version = 2; return datos; },
const MIGRACIONES = {};

export function necesitaMigrar(datos) {
  return datos.version < VERSION_ACTUAL;
}

export function migrar(original) {
  if (original.version > VERSION_ACTUAL) {
    throw new Error(
      `Estos datos son de una versión más nueva de la app (${original.version}). ` +
      'Recarga la página para actualizarla.');
  }
  let datos = structuredClone(original);
  while (datos.version < VERSION_ACTUAL) {
    const paso = MIGRACIONES[datos.version];
    if (!paso) throw new Error(`Falta la migración desde la versión ${datos.version}`);
    datos = paso(datos);
  }
  return datos;
}

// Comprobación mínima: evita abrir como datos algo que no lo es.
export function validar(datos) {
  const ok = datos && typeof datos === 'object'
    && Number.isInteger(datos.version)
    && ['ejercicios', 'rutinas', 'sesiones', 'sedes'].every((k) => Array.isArray(datos[k]))
    && datos.perfil && typeof datos.perfil === 'object';
  if (!ok) throw new Error('El archivo de datos no tiene un formato reconocible');
  return datos;
}
