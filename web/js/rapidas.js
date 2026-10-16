// Formas de serie: lo que se elige en el asistente «Añadir series» (rutina y
// ficha del ejercicio) y lo que se lee de una rutina pegada como texto. Una
// forma se convierte en planes (plantillas de serie) del ejercicio.
//
// Una forma tiene estas piezas, que son las preguntas del asistente:
//   tipo:   'trabajo' | 'calentamiento' | 'maxima' (serie máxima, mide el 1RM) | 'bilbo'
//   mejora: 'reps' | 'peso' | 'tiempo' | 'distancia'   (qué se va mejorando)
//   modo:   'doble'  doble progresión (rango; al llegar arriba sube el peso)
//           'lineal' repeticiones fijas; al completarlas sube el peso
//           'rm'     peso según tu 1RM reciente (fijas repeticiones o %)
//           'mas'    un poco más cada vez (tiempo, distancia o repeticiones sin peso)
//           'libre'  solo apuntar: ves lo de la vez anterior e intentas superarlo
//           'mio:ID' un prehecho guardado por el usuario
//   rango:  [de, a] (repeticiones o segundos); fija/valor (modo 'rm')
//   recamara, n (cuántas), forma ('normal' | 'descendente' | 'ascendente'),
//   donde ('rutina' | 'ejercicio').

import { progresionPorDefecto, serieNuevaPlantilla } from './esquema.js';
import { planPorDefecto } from './series.js';

// Rangos que se ofrecen con un toque (Dan: «con 8 sobra»); se puede escribir otro.
export const RANGOS_REPS = [[3, 5], [4, 6], [5, 8], [6, 8], [6, 10], [8, 10], [8, 12], [12, 15]];
export const REPS_FIJAS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];
export const PORCENTAJES = [60, 65, 70, 75, 80, 85, 90];
export const TIEMPOS = [20, 30, 45, 60, 90, 120, 300, 900];
export const RANGOS_MAXIMA = [[1, 2], [1, 3], [2, 3], [3, 5]];

export const mideTiempo = (ej) => ej.esfuerzo?.tipo === 'tiempo';
export const conPeso = (ej) => !['ninguna', 'altura'].includes(ej.carga?.tipo);
export const conPesoYReps = (ej) => conPeso(ej) && ej.esfuerzo?.tipo === 'repeticiones';

export function textoTiempo(seg) {
  if (seg < 60) return `${seg} s`;
  return seg % 60 ? `${Math.floor(seg / 60)} min ${seg % 60} s` : `${seg / 60} min`;
}

// Las repeticiones de cada serie ascendente: del máximo al mínimo del rango.
export function repsAscendentes(de, a, n) {
  if (n <= 1) return [a];
  return Array.from({ length: n }, (_, i) => Math.round(a - ((a - de) * i) / (n - 1)));
}

// Planes de una forma (no los guarda: quien llama los mete en `ej.series`).
export function crearPlanesRapidos(datos, ej, forma) {
  const f = completarForma(forma, ej);
  const n = Math.max(1, Math.min(20, Math.round(f.n ?? 1)));
  if (f.tipo === 'bilbo') return [planPorDefecto({ perfil: { cuestionario: { objetivo: 'fuerza' } } }, ej)];
  const [de, a] = f.rango ?? [null, null];

  const libre = (rango) => {
    const plan = serieNuevaPlantilla(ej, { tipo: 'libre', progresion: 'libre' });
    plan.objetivoEsfuerzo = rango;
    return plan;
  };
  const conCarga = (rango) => {
    const plan = serieNuevaPlantilla(ej, { tipo: 'libre', progresion: 'carga' });
    plan.progresion = { ...progresionPorDefecto('carga', ej), objetivoEsfuerzo: rango ? [...rango] : null };
    if (f.recamara != null) plan.progresion.recamaraMin = f.recamara;
    plan.objetivoEsfuerzo = rango ? [...rango] : null;
    return plan;
  };

  if (f.tipo === 'calentamiento') {
    return Array.from({ length: n }, () => {
      const plan = libre(de != null ? [de, a] : null);
      plan.tipo = 'calentamiento';
      plan.calentamiento = true;
      return plan;
    });
  }
  if (f.tipo === 'maxima') {
    return Array.from({ length: n }, () => { const p = conCarga([de ?? 1, a ?? 2]); p.progresion.recamaraMin = f.recamara ?? 1; return p; });
  }
  if (f.modo?.startsWith('mio:')) {
    const mio = (datos.perfil?.prehechos ?? []).find((m) => `mio:${m.id}` === f.modo);
    if (mio) {
      return Array.from({ length: n }, () => {
        const plan = serieNuevaPlantilla(ej, { tipo: 'libre', tecnicas: [...(mio.tecnicas ?? [])], progresion: 'libre' });
        plan.progresion = structuredClone(mio.progresion);
        if (plan.progresion.tipo === 'bilbo') { plan.progresion.cicloActual = 1; plan.progresion.ciclos = []; }
        plan.progresion.deMio = mio.id;
        plan.tipo = plan.progresion.tipo === 'bilbo' ? 'bilbo' : plan.tecnicas.length ? 'intensidad' : 'libre';
        return plan;
      });
    }
  }
  if (f.modo === 'libre') return Array.from({ length: n }, () => libre(de != null ? [de, a] : null));
  if (f.modo === 'mas') {
    return Array.from({ length: n }, () => {
      const plan = serieNuevaPlantilla(ej, { tipo: 'libre', progresion: 'esfuerzo' });
      plan.progresion.incremento = f.mejora === 'tiempo' ? 10 : 1;
      plan.objetivoEsfuerzo = de != null ? [de, a] : null;
      return plan;
    });
  }

  // Con peso: doble progresión, lineal o según el 1RM; las ascendentes bajan
  // de repeticiones y suben de peso serie a serie.
  const asc = f.forma === 'ascendente';
  const repsDe = (i) => {
    if (asc) { const r = repsAscendentes(de, a, n)[i]; return [r, r]; }
    if (f.modo === 'lineal') return [a ?? de, a ?? de];
    if (f.modo === 'rm' && f.fija !== 'pct') return [f.valor, f.valor];
    return de != null ? [de, a] : null;
  };
  const planes = Array.from({ length: n }, (_, i) => {
    const plan = conCarga(repsDe(i));
    if (f.modo === 'rm') {
      const porReps = asc || f.fija !== 'pct';
      plan.progresion.porRM = { fija: porReps ? 'reps' : 'pct', valor: porReps ? repsDe(i)[0] : f.valor, semanas: 8 };
      if (!porReps) { plan.progresion.objetivoEsfuerzo = null; plan.objetivoEsfuerzo = null; }
    }
    return plan;
  });
  if (f.forma === 'descendente') { planes.at(-1).tecnicas = ['drop-set']; planes.at(-1).tipo = 'intensidad'; }
  return planes;
}

// Rellena lo que falte con lo que se pondría por defecto, y traduce las
// formas viejas (las de la rutina pegada: normal, fuerza, ultima-drop…).
export function completarForma(forma, ej) {
  const f = { ...forma };
  const viejo = { normal: 'trabajo', fuerza: 'trabajo', 'ultima-drop': 'trabajo' };
  if (viejo[f.tipo]) {
    if (f.tipo === 'fuerza') f.recamara ??= 2;
    if (f.tipo === 'ultima-drop') f.forma = 'descendente';
    f.tipo = 'trabajo';
  }
  if (f.recamaraMin != null) f.recamara ??= f.recamaraMin;
  if (f.de != null && !f.rango) f.rango = [f.de, f.a ?? f.de];
  f.tipo ??= 'trabajo';
  if (f.tipo === 'trabajo') {
    f.mejora ??= mideTiempo(ej) ? 'tiempo' : 'reps';
    f.modo ??= !conPeso(ej) ? (f.rango ? 'libre' : 'mas') : 'doble';
  }
  f.forma ??= 'normal';
  return f;
}

// Texto corto de una forma: «4 × 3-5 con 2 en recámara».
export function textoForma(forma, ej) {
  const f = completarForma(forma, ej);
  if (f.tipo === 'bilbo') return 'Bilbo';
  const tiempo = mideTiempo(ej) || f.mejora === 'tiempo' || f.tiempo;
  const v = (x) => (tiempo ? textoTiempo(x) : String(x));
  const [de, a] = f.rango ?? [];
  const rango = de == null ? '' : de === a ? v(de) : `${v(de)}-${v(a)}`;
  const n = f.n ?? 1;
  if (f.tipo === 'maxima') return `serie máxima ${rango || '1-2'}`;
  if (f.tipo === 'calentamiento') return `${n} × ${rango || '?'} de calentamiento`;
  const recamara = f.recamara != null && conPeso(ej) ? ` con ${f.recamara} en recámara` : '';
  let base;
  if (f.modo === 'rm') {
    base = f.forma === 'ascendente' ? `${n} ascendentes (${repsAscendentes(de, a, n).join(', ')})`
      : f.fija === 'pct' ? `${n} al ${f.valor} % del 1RM` : `${n} × ${f.valor}`;
    base += `${recamara}, peso según tu 1RM`;
  } else if (f.forma === 'ascendente') base = `${n} ascendentes (${repsAscendentes(de, a, n).join(', ')})${recamara}`;
  else if (f.modo === 'lineal') base = `${n} × ${v(a ?? de)}${recamara}, sube el peso al completarlas`;
  else if (f.modo === 'libre') base = `${n} × ${rango || 'libre'}, solo apuntar`;
  else if (f.modo === 'mas') base = `${n} × ${rango ? `${rango}, ` : ''}un poco más cada vez`;
  else base = `${n} × ${rango}${recamara}`;
  if (f.forma === 'descendente') base += ', descendente en la última';
  return base;
}
