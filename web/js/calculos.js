// Cálculos de entrenamiento. Funciones puras: no leen ni guardan nada.

// Fórmula de Epley, la misma de tus Excel: 1RM = carga × reps × 0,03 + carga.
export function epley(carga, repeticiones) {
  if (!(carga > 0) || !(repeticiones > 0)) return null;
  return carga * repeticiones * 0.03 + carga;
}

// Genera la escalera de pesos de un ciclo Bilbo.
// «cada» es cada cuántos días sube el peso: con cada = 2 sale 40, 45, 45, 50, 50…
export function generarEscalera({ inicial, incremento, cada = 1, dias = 17 }) {
  const escalera = [];
  for (let dia = 1; dia <= dias; dia++) {
    const subidas = Math.ceil((dia - 1) / Math.max(1, cada));
    escalera.push(redondear(inicial + incremento * subidas));
  }
  return escalera;
}

// Carga real de una serie. En una máquina asistida se apunta la ayuda que
// marca la máquina y la carga real es tu peso corporal menos esa ayuda.
export function cargaDesdeLectura(lectura, pesoCorporalKg) {
  if (lectura == null || pesoCorporalKg == null) return null;
  return redondear(pesoCorporalKg - lectura);
}

export function lecturaDesdeCarga(carga, pesoCorporalKg) {
  if (carga == null || pesoCorporalKg == null) return null;
  return redondear(pesoCorporalKg - carga);
}

export function redondear(n, decimales = 2) {
  if (n == null || Number.isNaN(n)) return null;
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

// Todas las series hechas de un ejercicio, en orden cronológico.
// Se puede excluir una sesión (la que se está editando).
export function seriesDeEjercicio(datos, ejercicioId, { excluirSesion } = {}) {
  const resultado = [];
  const sesiones = [...datos.sesiones].sort((a, b) =>
    (a.fecha + (a.inicio || '')).localeCompare(b.fecha + (b.inicio || '')));
  for (const sesion of sesiones) {
    if (sesion.id === excluirSesion) continue;
    for (const entrada of sesion.ejercicios) {
      if (entrada.ejercicioId !== ejercicioId) continue;
      for (const serie of entrada.series) {
        if (serie.hecha) resultado.push({ sesion, entrada, serie });
      }
    }
  }
  return resultado;
}

// Qué toca hoy en un ejercicio con progresión Bilbo.
export function sugerenciaBilbo(datos, ejercicio, { excluirSesion } = {}) {
  const prog = ejercicio.progresion;
  const ciclo = prog.ciclos.find((c) => c.n === prog.cicloActual);
  if (!ciclo) return { sinCiclo: true };

  const delCiclo = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion })
    .filter((x) => x.serie.tipo === 'bilbo' && x.entrada.cicloN === ciclo.n);
  const ultima = delCiclo.reduce((mejor, x) =>
    (!mejor || x.entrada.diaCiclo >= mejor.entrada.diaCiclo ? x : mejor), null);

  const dia = ultima ? ultima.entrada.diaCiclo + 1 : 1;
  if (dia > ciclo.escalera.length) {
    return { cicloN: ciclo.n, cicloTerminado: true, ultima };
  }
  const carga = ciclo.escalera[dia - 1];
  const rmAnterior = ultima ? epley(ultima.serie.carga, ultima.serie.esfuerzo) : null;
  const objetivo = rmAnterior && carga > 0 ? redondear((rmAnterior - carga) / (carga * 0.03), 1) : null;

  return { cicloN: ciclo.n, dia, diasCiclo: ciclo.escalera.length, carga, objetivo, ultima };
}

// Sugerencia para progresión por carga o por esfuerzo: parte de la última vez.
export function sugerenciaSimple(datos, ejercicio, { excluirSesion } = {}) {
  const series = seriesDeEjercicio(datos, ejercicio.id, { excluirSesion })
    .filter((x) => x.serie.tipo !== 'calentamiento');
  if (!series.length) return { primeraVez: true };

  const ultimaSesionId = series.at(-1).sesion.id;
  const deUltima = series.filter((x) => x.sesion.id === ultimaSesionId).map((x) => x.serie);
  const mejor = deUltima.reduce((a, b) =>
    ((b.carga ?? 0) > (a.carga ?? 0) || ((b.carga ?? 0) === (a.carga ?? 0) && b.esfuerzo > a.esfuerzo) ? b : a));

  const prog = ejercicio.progresion;
  const r = { ultimaFecha: series.at(-1).sesion.fecha, ultima: mejor, carga: mejor.carga, esfuerzo: null };
  if (prog.tipo === 'carga') {
    const [, max] = prog.objetivoEsfuerzo || [];
    const sube = max != null && mejor.esfuerzo >= max;
    r.carga = sube ? redondear((mejor.carga ?? 0) + (prog.incremento || 0)) : mejor.carga;
    r.sube = sube;
    r.rango = prog.objetivoEsfuerzo;
  } else if (prog.tipo === 'esfuerzo') {
    r.esfuerzo = redondear((mejor.esfuerzo ?? 0) + (prog.incremento || 1));
  }
  return r;
}

export function formatearNumero(n) {
  if (n == null || n === '') return '';
  return Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 });
}
