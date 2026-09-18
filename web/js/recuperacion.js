// Recuperación por músculo.
//
// Qué respalda cada parte (y qué no):
//   · Lo que más alarga la recuperación es lo cerca del fallo que acabas las
//     series, más que el número de series. Con 3 o más repeticiones en
//     recámara, la fuerza vuelve en unas 24 h; al fallo, tarda hasta 48 h, y
//     más si el fallo llega con muchas repeticiones (Morán-Navarro 2017,
//     Pareja-Blanco 2019 y 2020). De ahí salen las 24, 36, 48 y 60 horas.
//   · El volumen total apenas cambia ese tiempo (Pareja-Blanco 2019): cada
//     serie de más añade cada vez menos. Eso se modela con una curva que se
//     aplana (la primera serie cuenta el 70 %, a partir de 6 casi el 100 %).
//     La forma exacta de la curva es una aproximación nuestra.
//   · No hay evidencia de un tiempo fijo por músculo. Sí la hay de que cada
//     persona se recupera a su ritmo y de que la sensación de recuperación es
//     un buen indicador (escala de Laurent 2011). Por eso cada músculo tiene
//     un factor personal que tú ajustas, y la app te propone cambiarlo según
//     cómo dices llegar a cada entrenamiento.
//
// Todo esto es una estimación para orientar, no una medida.

import { cuentaParaFatiga } from './catalogo.js';
import { MUSCULOS, ORDEN_MUSCULOS } from './musculos.js';

const HORAS_MAXIMAS = 96;

// Horas que pide una serie según lo cerca del fallo que la dejaste.
function horasDeSerie(serie) {
  const rir = serie.recamara;
  const conTramos = (serie.tramos || []).filter((t) => t.esfuerzo != null).length > 1;
  if (rir == null) return 36;
  if (rir >= 3) return 24;
  if (rir >= 1) return conTramos ? 42 : 36;
  const muchas = (serie.esfuerzo ?? 0) > 15;
  return conTramos || muchas ? 60 : 48;
}

// Cuánto pesa el volumen: 1 serie = 70 %, 3 = 87 %, 6 = 96 %, 10 o más ≈ 100 %.
function factorVolumen(series) {
  return 0.55 + 0.45 * (1 - Math.exp(-series / 2.5));
}

// Series de una sesión por músculo, con las horas que pide cada una. En un
// drop set o rest-pause, cada tramo de más cuenta media serie; un músculo
// secundario recibe la mitad.
function cargaDeSesion(datos, sesion) {
  const porMusculo = new Map();
  const sumar = (m, series, horas) => {
    const x = porMusculo.get(m) ?? { series: 0, sumaHoras: 0, maxHoras: 0 };
    x.series += series;
    x.sumaHoras += horas * series;
    x.maxHoras = Math.max(x.maxHoras, horas);
    porMusculo.set(m, x);
  };
  for (const entrada of sesion.ejercicios) {
    const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
    if (!ej || !cuentaParaFatiga(ej)) continue;
    const principales = ej.musculos?.principales ?? [];
    const secundarios = ej.musculos?.secundarios ?? [];
    for (const serie of entrada.series) {
      if (!serie.hecha || serie.tipo === 'calentamiento') continue;
      const hechos = (serie.tramos || []).filter((t) => t.esfuerzo != null).length;
      const series = hechos > 1 ? 1 + (hechos - 1) * 0.5 : 1;
      const horas = horasDeSerie(serie);
      for (const m of principales) sumar(m, series, horas);
      for (const m of secundarios) sumar(m, series * 0.5, horas);
    }
  }
  return porMusculo;
}

export function factorPersonal(datos, musculo) {
  return datos.perfil.recuperacion?.factores?.[musculo] ?? 1;
}

// Horas que necesita un músculo tras una sesión: la dureza media y la de la
// serie más dura, a partes iguales; por el volumen; y por tu factor.
function horasNecesarias(datos, musculo, carga) {
  const media = carga.sumaHoras / carga.series;
  const base = (media + carga.maxHoras) / 2;
  const horas = base * factorVolumen(carga.series) * factorPersonal(datos, musculo);
  return { horas: Math.min(HORAS_MAXIMAS, horas), base, volumen: factorVolumen(carga.series) };
}

// Estado de cada músculo: 0 % recién entrenado, 100 % recuperado.
export function recuperacionPorMusculo(datos, ahora = new Date()) {
  const estado = {};
  for (const m of ORDEN_MUSCULOS) estado[m] = { musculo: m, porcentaje: 100, ultima: null, series: 0 };

  const recientes = datos.sesiones
    .filter((s) => !s.borrada && s.estado === 'terminada')
    .filter((s) => horasDesde(s, ahora) != null && horasDesde(s, ahora) >= 0 && horasDesde(s, ahora) <= HORAS_MAXIMAS * 1.5);

  for (const sesion of recientes) {
    const pasadas = horasDesde(sesion, ahora);
    for (const [musculo, carga] of cargaDeSesion(datos, sesion)) {
      if (!estado[musculo]) continue;
      const n = horasNecesarias(datos, musculo, carga);
      const porcentaje = Math.max(0, Math.min(100, Math.round((pasadas / n.horas) * 100)));
      if (porcentaje < estado[musculo].porcentaje) {
        estado[musculo] = {
          musculo, porcentaje, ultima: sesion.fecha, series: Math.round(carga.series * 10) / 10,
          horasBase: Math.round(n.base), factorVolumen: n.volumen, factor: factorPersonal(datos, musculo),
          horasNecesarias: Math.round(n.horas), horasRestantes: Math.max(0, Math.round(n.horas - pasadas)),
        };
      }
    }
  }
  return estado;
}

function horasDesde(sesion, ahora) {
  const marca = sesion.fin || sesion.inicio || (sesion.fecha ? `${sesion.fecha}T20:00:00` : null);
  if (!marca) return null;
  const t = new Date(marca).getTime();
  if (Number.isNaN(t)) return null;
  return (ahora.getTime() - t) / 3_600_000;
}

export function claseDeRecuperacion(porcentaje) {
  if (porcentaje >= 90) return 'listo';
  if (porcentaje >= 60) return 'medio';
  return 'cansado';
}

const coma = (n) => String(n).replace('.', ',');

// Para explicar un músculo concreto: de dónde salen sus horas.
export function detalleDeRecuperacion(e) {
  if (!e.ultima) return '';
  return `${coma(e.series)} series; por lo cerca del fallo, ${e.horasBase} h; `
    + `por el volumen, ×${coma(Math.round(e.factorVolumen * 100) / 100)}`
    + (e.factor !== 1 ? `; tu ajuste personal, ×${coma(e.factor)}` : '')
    + ` = ${e.horasNecesarias} h.`;
}

export function textoDeRecuperacion(e) {
  const nombre = MUSCULOS[e.musculo]?.nombre ?? e.musculo;
  if (e.porcentaje >= 100) return `${nombre}: recuperado`;
  return `${nombre}: ${e.porcentaje} %` + (e.horasRestantes ? ` · le faltan ${e.horasRestantes} h` : '');
}

// Series por músculo en los últimos 7 días, para los avisos de volumen.
export function seriesSemanales(datos, ahora = new Date()) {
  const total = {};
  for (const m of ORDEN_MUSCULOS) total[m] = 0;
  for (const sesion of datos.sesiones) {
    if (sesion.borrada || sesion.estado !== 'terminada') continue;
    const horas = horasDesde(sesion, ahora);
    if (horas == null || horas > 24 * 7) continue;
    for (const [musculo, carga] of cargaDeSesion(datos, sesion)) {
      if (total[musculo] != null) total[musculo] += carga.series;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Cómo llegas: tu sensación frente a lo que calcula la app
// ---------------------------------------------------------------------------
//
// Al empezar un entrenamiento puedes decir cómo notas cada músculo (cargado,
// normal o fresco). Si varias veces te notas fresco cuando la app te daba por
// cansado, te recuperas más rápido de lo que calcula; si te notas cargado
// cuando te daba por recuperado, más despacio. Con eso se propone cambiar
// tu factor personal.

export const SENSACIONES = {
  cargado: { texto: 'Cargado', icono: '😣' },
  normal: { texto: 'Normal', icono: '🙂' },
  fresco: { texto: 'Fresco', icono: '💪' },
};

export const FACTORES = [
  { valor: 0.7, texto: 'Mucho más rápido' },
  { valor: 0.85, texto: 'Más rápido' },
  { valor: 1, texto: 'Normal' },
  { valor: 1.2, texto: 'Más lento' },
  { valor: 1.4, texto: 'Mucho más lento' },
];

const MINIMO_RESPUESTAS = 3;

export function sugerenciasDeAjuste(datos) {
  const desde = datos.perfil.recuperacion?.desde ?? {};
  const porMusculo = new Map();
  for (const sesion of datos.sesiones) {
    if (sesion.borrada || !sesion.sensaciones) continue;
    for (const [m, s] of Object.entries(sesion.sensaciones)) {
      if (desde[m] && sesion.fecha < desde[m]) continue;
      if (!porMusculo.has(m)) porMusculo.set(m, []);
      porMusculo.get(m).push(s);
    }
  }
  const sugerencias = [];
  for (const [m, lista] of porMusculo) {
    if (lista.length < MINIMO_RESPUESTAS || !MUSCULOS[m]) continue;
    const lento = lista.filter((s) => s.prevista >= 90 && s.sentida === 'cargado').length;
    const rapido = lista.filter((s) => s.prevista <= 70 && s.sentida === 'fresco').length;
    const actual = factorPersonal(datos, m);
    const i = FACTORES.findIndex((f) => f.valor === actual);
    if (lento >= 2 && lento > rapido && i < FACTORES.length - 1) {
      sugerencias.push({ musculo: m, nuevo: FACTORES[i + 1].valor, sentido: 'lento', veces: lento, total: lista.length });
    } else if (rapido >= 2 && rapido > lento && i > 0) {
      sugerencias.push({ musculo: m, nuevo: FACTORES[i - 1].valor, sentido: 'rapido', veces: rapido, total: lista.length });
    }
  }
  return sugerencias;
}
