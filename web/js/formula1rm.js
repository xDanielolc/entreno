// Estimación del 1RM (el peso máximo para una repetición) a partir de una
// serie: peso × repeticiones hasta el fallo (las hechas más las que dejaste
// en recámara).
//
// La fórmula es la de Marzagao (2026), ajustada con 303 494 series cerca del
// fallo de 388 ejercicios:
//
//     1RM = peso × (1 + (reps − 1)^0,85 / k)      con  k = 4,58 × ln(peso) − 2,55
//
// El divisor k (el «30» de Epley) cambia con el peso: con poco peso cada
// repetición vale más que con mucho. Es una curva: con 1 repetición da justo
// el peso, y harían falta infinitas repeticiones para llegar a peso cero.
//
// Ajuste personal: cada ejercicio multiplica ese divisor por un factor suyo
// (k × factor). El factor se calcula solo con tu historial, sin IA:
//   1. Se juntan tus series cerca del fallo (2 o menos en recámara) de cada
//      quincena: en dos semanas tu 1RM real apenas cambia.
//   2. Se prueban factores del 0,40 al 2,50 y se elige el que hace que las
//      series de una misma quincena den el mismo 1RM (el mismo criterio del
//      estudio).
//   3. Con pocos datos no se fía del todo: el factor final se acerca a 1 (la
//      fórmula del estudio) en proporción a los datos que faltan. Con 1
//      quincena se aplica la mitad del ajuste; con 3, el 75 %; con 9, el 90 %.
//
// Un factor por encima de 1 quiere decir que en ese ejercicio aguantas más
// repeticiones de las que predice el estudio con el mismo porcentaje; por
// debajo de 1, menos.

const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export const FORMULAS = {
  personal: { etiqueta: 'Ajustada a ti', descripcion: 'La fórmula del estudio con un factor propio de este ejercicio que se calcula solo con tus series.' },
  peso: { etiqueta: 'La del estudio, sin ajustar', descripcion: 'Marzagao (2026) tal cual, igual para todo el mundo.' },
};

const EXPONENTE_ESTUDIO = 0.85;

function divisorSegunPeso(peso) {
  return Math.max(0.5, 4.58 * Math.log(peso) - 2.55);
}

// Repeticiones que cuenta la fórmula: hasta el fallo, salvo en Epley.
function repsDeSerie(modelo, reps, recamara) {
  if (modelo.tipo === 'epley') return reps;
  return reps + Math.max(0, recamara ?? 0);
}

export function estimar1RM(modelo, peso, reps, recamara = 0) {
  if (!(peso > 0) || !(reps > 0)) return null;
  const r = repsDeSerie(modelo, reps, recamara);
  if (modelo.tipo === 'epley') return peso * (1 + r * 0.03);
  const k = modelo.divisor ?? divisorSegunPeso(peso) * (modelo.factor ?? 1);
  const g = modelo.exponente ?? EXPONENTE_ESTUDIO;
  return peso * (1 + (r - 1) ** g / k);
}

// Repeticiones que hay que hacer con un peso para igualar un 1RM. Devuelve
// las repeticiones HECHAS (ya descontada la recámara que piensas dejar).
export function repsParaIgualar(modelo, rm, peso, recamara = 0) {
  if (!(rm > 0) || !(peso > 0)) return null;
  if (modelo.tipo === 'epley') return (rm - peso) / (peso * 0.03);
  if (rm <= peso) return Math.max(0, 1 - (recamara ?? 0));
  const k = modelo.divisor ?? divisorSegunPeso(peso) * (modelo.factor ?? 1);
  const g = modelo.exponente ?? EXPONENTE_ESTUDIO;
  const hastaFallo = 1 + (k * (rm / peso - 1)) ** (1 / g);
  return hastaFallo - Math.max(0, recamara ?? 0);
}

// ---------------------------------------------------------------------------
// Calibración personal
// ---------------------------------------------------------------------------

const DIAS_VENTANA = 14;
// Cuántas quincenas hacen falta para fiarse a medias del ajuste.
const PRUDENCIA = 1;

// Series útiles para calibrar: hechas, sin tramos, con peso, cerca del fallo
// (2 o menos en recámara) y de 30 repeticiones o menos.
function seriesParaCalibrar(datos, ejercicio) {
  const salida = [];
  for (const sesion of datos.sesiones) {
    if (sesion.borrada || !sesion.fecha) continue;
    for (const entrada of sesion.ejercicios) {
      if (entrada.ejercicioId !== ejercicio.id) continue;
      for (const s of entrada.series) {
        if (!s.hecha || s.tramos?.length || s.tipo === 'calentamiento') continue;
        const recamara = s.recamara ?? 0;
        if (!(s.carga > 0) || !(s.esfuerzo > 0) || recamara > 2 || s.esfuerzo + recamara > 30) continue;
        salida.push({ fecha: sesion.fecha, peso: s.carga, reps: s.esfuerzo, recamara });
      }
    }
  }
  return salida;
}

// Grupos de series de la misma quincena con pesos y repeticiones distintos:
// son las que permiten saber qué fórmula acierta más.
function ventanas(series) {
  const grupos = new Map();
  for (const s of series) {
    const dia = Math.floor(new Date(`${s.fecha}T12:00:00`).getTime() / 86_400_000);
    const clave = Math.floor(dia / DIAS_VENTANA);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(s);
  }
  return [...grupos.values()].filter((g) =>
    new Set(g.map((s) => s.peso)).size >= 2 && new Set(g.map((s) => s.reps + s.recamara)).size >= 2);
}

// Cuánto discrepan entre sí los 1RM de una misma quincena (desviación del
// logaritmo, como en el estudio). Cuanto menos, mejor fórmula.
function inconsistencia(modelo, grupos) {
  let total = 0;
  for (const g of grupos) {
    const logs = g.map((s) => Math.log(estimar1RM(modelo, s.peso, s.reps, s.recamara)));
    const media = logs.reduce((a, b) => a + b, 0) / logs.length;
    total += Math.sqrt(logs.reduce((a, b) => a + (b - media) ** 2, 0) / logs.length);
  }
  return total / grupos.length;
}

const memoria = new Map();

// Calibra el factor personal de un ejercicio. Devuelve el modelo y un
// informe para enseñarlo en la ficha y en Ajustes.
export function calibrar(datos, ejercicio) {
  const clave = `${ejercicio.id}:${datos.revision}`;
  if (memoria.has(clave)) return memoria.get(clave);

  const grupos = ventanas(seriesParaCalibrar(datos, ejercicio));
  let resultado = { modelo: { tipo: 'personal', factor: 1 }, factor: 1, factorDatos: null, ventanas: 0, confianza: 0 };
  if (grupos.length) {
    let mejor = { factor: 1, error: inconsistencia({ tipo: 'personal', factor: 1 }, grupos) };
    for (let f = 0.4; f <= 2.5001; f += 0.01) {
      const error = inconsistencia({ tipo: 'personal', factor: f }, grupos);
      if (error < mejor.error - 1e-9) mejor = { factor: f, error };
    }
    const confianza = grupos.length / (grupos.length + PRUDENCIA);
    const factor = redondear(1 + (mejor.factor - 1) * confianza, 2);
    resultado = {
      modelo: { tipo: 'personal', factor }, factor, factorDatos: redondear(mejor.factor, 2),
      ventanas: grupos.length, confianza: Math.round(confianza * 100),
    };
  }
  memoria.set(clave, resultado);
  if (memoria.size > 200) memoria.delete(memoria.keys().next().value);
  return resultado;
}

// El modelo que usa un ejercicio según la fórmula elegida en su ficha.
export function modeloDe(datos, ejercicio) {
  const formula = ejercicio?.formula1RM ?? 'personal';
  if (formula === 'peso') return { tipo: 'peso' };
  return calibrar(datos, ejercicio).modelo;
}

// 1RM estimado de una serie ya hecha, con la fórmula de su ejercicio.
export function rmDeSerie(datos, ejercicio, serie, esfuerzo) {
  return estimar1RM(modeloDe(datos, ejercicio), serie.carga, esfuerzo ?? serie.esfuerzo, serie.recamara);
}

// ---------------------------------------------------------------------------
// Explicaciones (se enseñan plegadas en la ficha y en Ajustes)
// ---------------------------------------------------------------------------

export const EXPLICACIONES_1RM = [
  { titulo: 'Qué fórmula usa', texto: 'La de Marzagao (2026): 1RM = peso × (1 + (repeticiones − 1)^0,85 / k), con k = 4,58 × ln(peso) − 2,55. '
    + 'Salió de 303 494 series cerca del fallo de 388 ejercicios y acierta más que Epley, Brzycki, Mayhew o Wathan en todos ellos. '
    + 'A diferencia de Epley (una recta), es una curva: con una repetición da justo el peso, y para llegar a peso cero harían falta '
    + 'infinitas repeticiones. Además, el divisor k cambia con el peso: con poco peso cada repetición vale más. '
    + 'Aviso: es un preprint, todavía sin revisión por pares.' },
  { titulo: 'Qué repeticiones cuenta', texto: 'Las hechas más las que dejaste en recámara: 60 kg × 20 con 1 en recámara cuenta como 21 '
    + 'hasta el fallo. Por eso importa apuntar bien la recámara.' },
  { titulo: 'Cómo se ajusta a ti', texto: 'Cada ejercicio tiene un factor que multiplica el divisor k. La app junta tus series de cada '
    + 'quincena que acabaste a 2 o menos del fallo (en dos semanas tu 1RM real apenas cambia) y prueba factores del 0,40 al 2,50. '
    + 'Se queda con el que hace que series distintas de la misma quincena (60 kg × 20 y 80 kg × 8, por ejemplo) den el mismo 1RM. '
    + 'Es el mismo criterio que usó el estudio, aplicado solo a tus datos. No hay IA: es una búsqueda del mejor número.' },
  { titulo: 'Qué pasa con pocos datos', texto: 'Empieza a ajustar desde la primera quincena, pero sin fiarse del todo: el factor final se '
    + 'queda a medio camino entre 1 (la fórmula del estudio) y el que dicen tus datos. Con 1 quincena aplica la mitad del ajuste, con 3 '
    + 'el 75 %, con 9 el 90 %. Así una semana rara no te descoloca los objetivos.' },
  { titulo: 'Dentro de cada entrenamiento', texto: 'Tu 1RM de hoy sale de la primera serie (la Bilbo, normalmente). El drop set '
    + 'de debajo no parte de ese 1RM tal cual: la app aprende de tus drop sets anteriores cuánto rindes tras la primera serie '
    + '(por el cansancio) y lo corrige. Si la primera bajada sale muy lejos de lo esperado (menos del 60 % o más del 150 % de las '
    + 'repeticiones previstas), te avisa: puede ser la fórmula, el cansancio de la serie anterior o que no estés recuperado.' },
  { titulo: 'Qué significa el factor', texto: 'Por encima de 1: en ese ejercicio aguantas más repeticiones de las que predice el estudio '
    + 'con el mismo porcentaje de tu 1RM (pasa, por ejemplo, en prensa). Por debajo de 1: menos. Los ciclos Bilbo ya dan los datos que '
    + 'hacen falta; una serie corta de 3 a 5 repeticiones de vez en cuando ayuda a afinar.' },
];

export function textoCalibracion(c) {
  if (!c.ventanas) return 'Aún sin datos para ajustar: usa la fórmula del estudio tal cual (factor 1).';
  const coma = (n) => String(n).replace('.', ',');
  return `Factor ${coma(c.factor)}, con ${c.ventanas} ${c.ventanas === 1 ? 'quincena' : 'quincenas'} de datos `
    + `(tus datos dicen ${coma(c.factorDatos)}; se aplica el ${c.confianza} % del ajuste mientras haya pocos).`;
}
