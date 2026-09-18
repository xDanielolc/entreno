// Estimación del 1RM (el peso máximo para una repetición) a partir de una
// serie: peso × repeticiones.
//
// Tres fórmulas, a elegir en cada ejercicio:
//
//   · epley     1RM = peso × (1 + reps × 0,03). La de tus Excel. Es una
//               recta: cada repetición vale siempre lo mismo, y por encima de
//               15 repeticiones se desvía bastante.
//
//   · peso      1RM = peso × (1 + (reps − 1)^0,85 / k), con k = 4,58 × ln(peso) − 2,55.
//               Marzagao (2026), ajustada con 303 494 series cerca del fallo
//               de 388 ejercicios. El divisor (el «30» de Epley) cambia con el
//               peso: con poco peso (elevaciones laterales) cada repetición
//               vale más que con mucho (sentadilla). Es una curva, no una
//               recta: con 1 repetición da justo el peso, y hacen falta
//               infinitas repeticiones para llegar a peso cero.
//
//   · personal  La misma forma, pero con el divisor y la curvatura ajustados
//               a TUS series de ese ejercicio. Se usa el mismo criterio que
//               en ese estudio: dentro de dos semanas tu 1RM real apenas
//               cambia, así que la mejor fórmula es la que da el mismo 1RM
//               con series distintas (60 kg × 20 y 80 kg × 8, por ejemplo).
//               Mientras no haya datos suficientes, se usa la de «peso».
//
// En «peso» y «personal» se cuentan las repeticiones hasta el fallo: las que
// hiciste más las que dejaste en recámara. Epley usa solo las hechas, como
// en tus Excel.

const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export const FORMULAS = {
  personal: { etiqueta: 'Ajustada a ti', descripcion: 'Se calibra sola con tus series de este ejercicio. Mientras le falten datos, usa la de Marzagao.' },
  peso: { etiqueta: 'Según el peso (Marzagao 2026)', descripcion: 'Curva ajustada con 300 000 series de 388 ejercicios; el divisor cambia con el peso levantado.' },
  epley: { etiqueta: 'Epley (la de tus Excel)', descripcion: 'Recta: cada repetición vale un 3 % del peso. Se desvía por encima de 15 repeticiones.' },
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
  const k = modelo.divisor ?? divisorSegunPeso(peso);
  const g = modelo.exponente ?? EXPONENTE_ESTUDIO;
  return peso * (1 + (r - 1) ** g / k);
}

// Repeticiones que hay que hacer con un peso para igualar un 1RM. Devuelve
// las repeticiones HECHAS (ya descontada la recámara que piensas dejar).
export function repsParaIgualar(modelo, rm, peso, recamara = 0) {
  if (!(rm > 0) || !(peso > 0)) return null;
  if (modelo.tipo === 'epley') return (rm - peso) / (peso * 0.03);
  if (rm <= peso) return Math.max(0, 1 - (recamara ?? 0));
  const k = modelo.divisor ?? divisorSegunPeso(peso);
  const g = modelo.exponente ?? EXPONENTE_ESTUDIO;
  const hastaFallo = 1 + (k * (rm / peso - 1)) ** (1 / g);
  return hastaFallo - Math.max(0, recamara ?? 0);
}

// ---------------------------------------------------------------------------
// Calibración personal
// ---------------------------------------------------------------------------

const DIAS_VENTANA = 14;
const MINIMO_VENTANAS = 3;

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

// Calibra la fórmula personal de un ejercicio. Devuelve el modelo y un
// informe para enseñarlo en la ficha.
export function calibrar(datos, ejercicio) {
  const clave = `${ejercicio.id}:${datos.revision}`;
  if (memoria.has(clave)) return memoria.get(clave);

  const grupos = ventanas(seriesParaCalibrar(datos, ejercicio));
  const referencia = { tipo: 'peso' };
  let resultado = { modelo: referencia, calibrada: false, ventanas: grupos.length, faltan: Math.max(0, MINIMO_VENTANAS - grupos.length) };

  if (grupos.length >= MINIMO_VENTANAS) {
    const base = inconsistencia(referencia, grupos);
    let mejor = { divisor: null, exponente: null, error: Infinity };
    for (let divisor = 4; divisor <= 60; divisor += 0.5) {
      for (let exponente = 0.6; exponente <= 1.2001; exponente += 0.05) {
        const error = inconsistencia({ tipo: 'personal', divisor, exponente }, grupos);
        if (error < mejor.error) mejor = { divisor, exponente: redondear(exponente, 2), error };
      }
    }
    // Solo se cambia si mejora de verdad a la del estudio (un 5 % o más).
    const mejora = base > 0 ? 1 - mejor.error / base : 0;
    if (mejora >= 0.05) {
      resultado = {
        modelo: { tipo: 'personal', divisor: mejor.divisor, exponente: mejor.exponente },
        calibrada: true, ventanas: grupos.length, mejora: Math.round(mejora * 100), faltan: 0,
      };
    } else {
      resultado = { modelo: referencia, calibrada: false, ventanas: grupos.length, sinMejora: true, faltan: 0 };
    }
  }
  memoria.set(clave, resultado);
  if (memoria.size > 200) memoria.delete(memoria.keys().next().value);
  return resultado;
}

// El modelo que usa un ejercicio según la fórmula elegida en su ficha.
export function modeloDe(datos, ejercicio) {
  const formula = ejercicio?.formula1RM ?? 'personal';
  if (formula === 'epley') return { tipo: 'epley' };
  if (formula === 'peso') return { tipo: 'peso' };
  return calibrar(datos, ejercicio).modelo;
}

// 1RM estimado de una serie ya hecha, con la fórmula de su ejercicio.
export function rmDeSerie(datos, ejercicio, serie, esfuerzo) {
  return estimar1RM(modeloDe(datos, ejercicio), serie.carga, esfuerzo ?? serie.esfuerzo, serie.recamara);
}
