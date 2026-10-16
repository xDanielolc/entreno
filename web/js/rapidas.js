// Series «rápidas»: las formas de serie que se añaden desde el editor de
// rutinas (y desde una rutina pegada como texto) con dos toques: «3 × 8-10»,
// «serie máxima», «Bilbo», «drop set en la última»… Cada forma crea los
// planes (plantillas de serie) del ejercicio.

import { progresionPorDefecto, serieNuevaPlantilla } from './esquema.js';
import { planPorDefecto } from './series.js';

// Las formas, en el orden en que se ofrecen. `conPeso`: solo tienen sentido
// con peso y repeticiones.
export const FORMAS = {
  normal: { etiqueta: 'Normales', n: 3, de: 8, a: 10,
    explica: 'Doble progresión: con el mismo peso subes repeticiones; cuando llegas al máximo en todas, sube el peso.' },
  fuerza: { etiqueta: 'Fuerza (2 en recámara)', n: 4, de: 3, a: 5, recamaraMin: 2, conPeso: true,
    explica: 'Pesado y sin apurar: el peso sube cuando haces el máximo dejándote 2 en recámara. Con 4 × 4, sube cuando salen las 4 holgadas.' },
  'ultima-drop': { etiqueta: 'Drop set en la última', n: 2, de: 8, a: 12,
    explica: 'Igual que las normales, y la última sigue bajando el peso sin descansar (drop set).' },
  bilbo: { etiqueta: 'Bilbo', n: 1, conPeso: true,
    explica: 'Una serie Bilbo: 20-30 repeticiones al principio y el peso sube cada sesión.' },
  maxima: { etiqueta: 'Serie máxima', n: 1, de: 1, a: 2, recamaraMin: 1, conPeso: true,
    explica: 'Una serie pesada de pocas repeticiones (1-2 con 1 o 2 en recámara): tu 1RM sale de aquí.' },
  calentamiento: { etiqueta: 'Calentamiento', n: 2, de: 8, a: 8,
    explica: 'Series de aproximación: no progresan ni cuentan para récords ni recuperación.' },
};

// Rangos habituales de repeticiones, para elegirlos con un toque.
export const RANGOS_REPS = [[1, 2], [3, 5], [4, 6], [5, 8], [6, 8], [6, 10], [8, 10], [8, 12], [10, 15], [12, 15], [15, 20], [20, 30]];
// Tiempos habituales, en segundos.
export const TIEMPOS = [20, 30, 45, 60, 90, 120, 300, 600, 900, 1200, 1800];

export const mideTiempo = (ej) => ej.esfuerzo?.tipo === 'tiempo';
export const conPesoYReps = (ej) => ej.carga?.tipo !== 'ninguna' && ej.esfuerzo?.tipo === 'repeticiones';

// Las formas que admite un ejercicio, más los prehechos del usuario.
export function formasPara(ej, perfil) {
  const salida = {};
  for (const [k, f] of Object.entries(FORMAS)) {
    if (f.conPeso && !conPesoYReps(ej)) continue;
    if (mideTiempo(ej) && k === 'ultima-drop') continue;
    salida[k] = f;
  }
  for (const m of perfil?.prehechos ?? []) {
    if (m.progresion?.sobre === 'carga' && ej.carga?.tipo === 'ninguna') continue;
    const r = m.progresion?.objetivoEsfuerzo;
    salida[`mio:${m.id}`] = { etiqueta: m.nombre, n: 1, de: r?.[0] ?? 8, a: r?.[1] ?? 10, mio: m, explica: m.descripcion };
  }
  return salida;
}

// Lo que se ofrece al abrir el formulario para un ejercicio.
export function formaInicial(ej) {
  if (mideTiempo(ej)) return { tipo: 'normal', n: 1, de: 60, a: 60 };
  return { tipo: 'normal', n: 3, de: 8, a: 10 };
}

// Crea los planes de una forma: { tipo, n, de, a }. No los guarda: eso lo
// hace quien llama (los mete en `ej.series`).
export function crearPlanesRapidos(datos, ej, forma) {
  const f = formasPara(ej, datos.perfil)[forma.tipo] ?? FORMAS.normal;
  const de = Math.min(forma.de ?? f.de ?? 8, forma.a ?? f.a ?? 10);
  const a = Math.max(forma.de ?? f.de ?? 8, forma.a ?? f.a ?? 10);
  const n = Math.max(1, Math.min(20, Math.round(forma.n ?? f.n ?? 1)));
  if (forma.tipo === 'bilbo') return [planPorDefecto({ perfil: { cuestionario: { objetivo: 'fuerza' } } }, ej)];
  if (f.mio) {
    return Array.from({ length: n }, () => {
      const plan = serieNuevaPlantilla(ej, { tipo: 'libre', tecnicas: [...(f.mio.tecnicas ?? [])], progresion: 'libre' });
      plan.progresion = structuredClone(f.mio.progresion);
      if (plan.progresion.tipo === 'bilbo') { plan.progresion.cicloActual = 1; plan.progresion.ciclos = []; }
      plan.progresion.deMio = f.mio.id;
      if (plan.progresion.tipo === 'carga') { plan.progresion.objetivoEsfuerzo = [de, a]; plan.objetivoEsfuerzo = [de, a]; }
      plan.tipo = plan.progresion.tipo === 'bilbo' ? 'bilbo' : plan.tecnicas.length ? 'intensidad' : 'libre';
      return plan;
    });
  }
  const uno = () => {
    if (forma.tipo === 'calentamiento') {
      const plan = serieNuevaPlantilla(ej, { tipo: 'calentamiento', progresion: 'libre' });
      plan.calentamiento = true;
      plan.objetivoEsfuerzo = [de, a];
      return plan;
    }
    // Sin peso (cardio, estiramientos): solo apuntar, con el objetivo escrito.
    if (ej.carga?.tipo === 'ninguna') {
      const plan = serieNuevaPlantilla(ej, { tipo: 'libre', progresion: 'libre' });
      plan.objetivoEsfuerzo = [de, a];
      return plan;
    }
    const plan = serieNuevaPlantilla(ej, { tipo: 'libre', progresion: 'carga' });
    plan.progresion = { ...progresionPorDefecto('carga', ej), objetivoEsfuerzo: [de, a] };
    const recamara = forma.recamaraMin ?? f.recamaraMin;
    if (recamara != null) plan.progresion.recamaraMin = recamara;
    plan.objetivoEsfuerzo = [de, a];
    return plan;
  };
  const planes = Array.from({ length: n }, uno);
  if (forma.tipo === 'ultima-drop') { planes.at(-1).tecnicas = ['drop-set']; planes.at(-1).tipo = 'intensidad'; }
  return planes;
}

export function textoTiempo(seg) {
  if (seg < 60) return `${seg} s`;
  return seg % 60 ? `${Math.floor(seg / 60)} min ${seg % 60} s` : `${seg / 60} min`;
}

// Texto corto de una forma: «4 × 3-5 fuerza», «Bilbo», «2 × 8-12, drop set en la última».
export function textoForma(forma, ej) {
  if (forma.tipo === 'bilbo') return 'Bilbo';
  const tiempo = mideTiempo(ej) || forma.tiempo;
  const v = (x) => (tiempo ? textoTiempo(x) : String(x));
  const reps = forma.de === forma.a ? v(forma.de) : `${v(forma.de)}-${v(forma.a)}`;
  const base = `${forma.n} × ${reps}`;
  const recamara = forma.recamaraMin ?? (forma.tipo === 'fuerza' ? 2 : null);
  const conRecamara = recamara != null && forma.tipo !== 'maxima' ? ` con ${recamara} en recámara` : '';
  if (forma.tipo === 'maxima') return `serie máxima ${reps}`;
  if (forma.tipo === 'ultima-drop') return `${base}${conRecamara}, drop set en la última`;
  if (forma.tipo === 'calentamiento') return `${base} de calentamiento`;
  return `${base}${conRecamara}`;
}
