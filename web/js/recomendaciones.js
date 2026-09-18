// Recomendaciones: situaciones que la app detecta en tus entrenamientos y
// qué conviene hacer en cada una. Sin bromas: cada una dice qué pasa y qué
// hacer.
//
// Respaldo de los umbrales:
//   · 10-20 series semanales por músculo (Schoenfeld 2017; Pelland 2024).
//   · Dos sesiones por músculo y semana rinden algo más que una con el mismo
//     volumen (Schoenfeld 2016).
//   · Entrenar al fallo no es necesario para ganar músculo y fatiga más;
//     quedarse a 0-3 del fallo basta (Refalo 2023; Grgic 2022).
//   · Cercanía al fallo y recuperación: Pareja-Blanco 2019 y 2020.
//   · 150-300 minutos semanales de actividad moderada (OMS 2020).
//   · El resto de umbrales (días seguidos, duración, desequilibrios) son
//     criterios prácticos, no cifras de un estudio.

import { esfuerzoTotal, formatearNumero } from './calculos.js';
import { cuentaParaFatiga, tipoDeEjercicio } from './catalogo.js';
import { rmDeSerie } from './formula1rm.js';
import { ORDEN_MUSCULOS, nombreMusculo } from './musculos.js';
import {
  horasDesdeSesion, recuperacionPorMusculo, seriesPorMusculoDeSesion, seriesSemanales,
} from './recuperacion.js';

const MINIMO = 10;
const MAXIMO = 20;
const DIA = 24;

// nivel: 'aviso' (conviene cambiar algo), 'consejo' (mejorable) o 'bien'.
const r = (clave, nivel, texto, extra = {}) => ({ clave, nivel, texto, ...extra });
const series = (n) => `${formatearNumero(n)} ${n === 1 ? 'serie' : 'series'}`;

function terminadas(datos) {
  return datos.sesiones
    .filter((s) => !s.borrada && s.estado === 'terminada')
    .sort((a, b) => (a.fecha + (a.inicio || '')).localeCompare(b.fecha + (b.inicio || '')));
}

// ---------------------------------------------------------------------------
// De una sesión concreta (al terminar)
// ---------------------------------------------------------------------------

export function recomendacionesDeSesion(datos, sesion) {
  const lista = [];
  const hoy = seriesPorMusculoDeSesion(datos, sesion);
  const semana = seriesSemanales(datos);
  const inicio = sesion.inicio ? new Date(sesion.inicio) : new Date();
  const antes = recuperacionPorMusculo({ ...datos, sesiones: datos.sesiones.filter((s) => s.id !== sesion.id) }, inicio);

  for (const m of ORDEN_MUSCULOS) {
    const nHoy = hoy.get(m);
    if (!nHoy) continue;
    const nombre = nombreMusculo(m);
    const previo = antes[m]?.porcentaje ?? 100;
    // 1. Poca distancia entre entrenamientos (en lumbares, también como secundario).
    if (previo < 60 && (nHoy >= 1 || m === 'lumbar')) {
      lista.push(r('poca-distancia', 'aviso', `${nombre} estaba al ${previo} % cuando lo volviste a entrenar. `
        + 'Deja más tiempo entre las sesiones que lo cargan: espera a que el mapa lo marque en verde.'));
    }
    // 5. Demasiadas series de un músculo en una sola sesión.
    if (nHoy > 10) {
      lista.push(r('sesion-cargada', 'consejo', `Hoy has hecho ${series(Math.round(nHoy * 10) / 10)} de ${nombre}. `
        + 'Pasadas unas 10 en la misma sesión, rinden menos: repártelas en dos días.'));
    }
    // 3 y 4. Volumen de la semana (solo de lo que ha sido principal hoy).
    if (nHoy < 1) continue;
    const n = Math.round((semana[m] ?? 0) * 10) / 10;
    if (n < MINIMO) {
      lista.push(r('volumen-bajo', 'consejo', `${nombre}: ${series(n)} esta semana. Lo recomendado son de ${MINIMO} a ${MAXIMO}; `
        + `te faltan unas ${Math.ceil(MINIMO - n)} repartidas en tus próximas sesiones.`));
    } else if (n > MAXIMO) {
      lista.push(r('volumen-alto', 'aviso', `${nombre}: ${series(n)} en siete días. Por encima de ${MAXIMO} no se gana más `
        + 'músculo y la fatiga sube: recorta series o reparte la carga en más días.'));
    } else {
      lista.push(r('volumen-bien', 'bien', `${nombre}: ${series(n)} esta semana, dentro del rango recomendado.`));
    }
  }

  // 18. Duración.
  const minutos = sesion.inicio && sesion.fin ? (new Date(sesion.fin) - new Date(sesion.inicio)) / 60000 : null;
  if (minutos > 120) {
    lista.push(r('sesion-larga', 'consejo', `Este entrenamiento ha durado ${Math.round(minutos)} minutos. Más allá de hora y media `
      + 'suele bajar la calidad de las últimas series; si te pasa a menudo, reparte ejercicios en otro día.'));
  }
  // 11 y 12. Cercanía al fallo de hoy.
  lista.push(...esfuerzo(datos, [sesion], 'hoy'));
  return ordenar(lista);
}

// ---------------------------------------------------------------------------
// Generales (pestaña Cuerpo)
// ---------------------------------------------------------------------------

export function recomendacionesGenerales(datos, ahora = new Date()) {
  const lista = [];
  const sesiones = terminadas(datos);
  const semana = seriesSemanales(datos, ahora);
  const recientes = sesiones.filter((s) => horasDesdeSesion(s, ahora) <= 7 * DIA);
  if (!sesiones.length) return lista;

  // Volumen, frecuencia y distancia, músculo a músculo.
  for (const m of ORDEN_MUSCULOS) {
    const nombre = nombreMusculo(m);
    const n = Math.round((semana[m] ?? 0) * 10) / 10;
    const conEste = sesiones.filter((s) => seriesPorMusculoDeSesion(datos, s).get(m) >= 1);
    const ultima = conEste.at(-1);
    const dias = ultima ? Math.floor(horasDesdeSesion(ultima, ahora) / DIA) : null;
    // 2. Demasiada distancia: lo entrenabas y lleva más de 8 días parado.
    if (ultima && dias > 8 && dias <= 30) {
      lista.push(r('mucha-distancia', 'consejo', `Llevas ${dias} días sin entrenar ${nombre}. Para progresar, cada músculo `
        + 'conviene tocarlo al menos una vez por semana, mejor dos.'));
      continue;
    }
    if (n > 0 && n < MINIMO) {
      lista.push(r('volumen-bajo', 'consejo', `${nombre}: ${series(n)} en los últimos 7 días. Sube hasta al menos ${MINIMO}.`));
    } else if (n > MAXIMO) {
      lista.push(r('volumen-alto', 'aviso', `${nombre}: ${series(n)} en 7 días. Por encima de ${MAXIMO} no se gana más y la fatiga sube.`));
    }
    // 6. Toda la semana en una sola sesión.
    const semanaEste = recientes.filter((s) => seriesPorMusculoDeSesion(datos, s).get(m) >= 1);
    if (semanaEste.length === 1 && n >= 8) {
      lista.push(r('frecuencia-uno', 'consejo', `Todas tus series de ${nombre} de esta semana fueron en un solo día. `
        + 'Con el mismo volumen repartido en dos sesiones se suele ganar algo más.'));
    }
  }

  // 7 y 8 (recuperas más rápido o más despacio) van en su propia tarjeta,
  // con los botones para ajustar: ver vistas/cuerpo.js.

  // 9 y 10. Estancamiento y empeoramiento por ejercicio.
  lista.push(...progresoPorEjercicio(datos, sesiones, ahora));

  // 11 y 12. Cercanía al fallo en la semana.
  lista.push(...esfuerzo(datos, recientes, 'semana'));

  // 13 y 14. Desequilibrios.
  const suma = (ms) => ms.reduce((t, m) => t + (semana[m] ?? 0), 0);
  const empuje = suma(['pecho', 'hombro']);
  const tiron = suma(['dorsal', 'hombroPosterior']);
  if (empuje >= 8 && empuje > tiron * 1.5) {
    lista.push(r('empuje-tiron', 'consejo', `Esta semana empujas bastante más de lo que tiras (${formatearNumero(Math.round(empuje))} series `
      + `de pecho y hombro frente a ${formatearNumero(Math.round(tiron))} de espalda). Equilibrarlo protege los hombros.`));
  }
  const cuad = semana.cuadriceps ?? 0;
  const isq = semana.isquios ?? 0;
  if (cuad >= 8 && cuad > isq * 2) {
    lista.push(r('cuadriceps-isquios', 'consejo', `Haces más del doble de series de cuádriceps que de isquios `
      + `(${formatearNumero(Math.round(cuad))} frente a ${formatearNumero(Math.round(isq))}). Añade algo de curl femoral o peso muerto rumano.`));
  }

  // 16. Días seguidos entrenando.
  const dias = new Set(sesiones.map((s) => s.fecha));
  let seguidos = 0;
  const d = new Date(ahora);
  const local = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  while (dias.has(local(d))) { seguidos += 1; d.setDate(d.getDate() - 1); }
  if (seguidos >= 6) {
    lista.push(r('dias-seguidos', 'aviso', `Llevas ${seguidos} días seguidos entrenando. Toma al menos un día de descanso completo a la semana.`));
  }

  // 17. Mucho tiempo sin entrenar.
  const ultimaSesion = sesiones.at(-1);
  const sinEntrenar = Math.floor(horasDesdeSesion(ultimaSesion, ahora) / DIA);
  if (sinEntrenar >= 10) {
    lista.push(r('parado', 'consejo', `Llevas ${sinEntrenar} días sin entrenar. Al volver, empieza con algo menos de peso o de series durante una o dos sesiones.`));
  }

  // 19. Cardio.
  const minutosCardio = recientes.flatMap((s) => s.ejercicios.map((e) => [s, e]))
    .filter(([, e]) => tipoDeEjercicio(datos.ejercicios.find((x) => x.id === e.ejercicioId)) === 'cardio')
    .reduce((t, [, e]) => t + e.series.filter((x) => x.hecha).reduce((u, x) => u + (x.esfuerzo ?? 0), 0), 0) / 60;
  const haceCardio = sesiones.some((s) => s.ejercicios.some((e) => tipoDeEjercicio(datos.ejercicios.find((x) => x.id === e.ejercicioId)) === 'cardio'));
  if (haceCardio && minutosCardio < 150) {
    lista.push(r('cardio', 'consejo', `Esta semana llevas ${Math.round(minutosCardio)} minutos de cardio. La OMS recomienda `
      + 'de 150 a 300 minutos semanales de actividad moderada.'));
  }

  // 20. Ciclos Bilbo terminados sin preparar el siguiente.
  for (const ej of datos.ejercicios.filter((e) => !e.archivado)) {
    for (const plan of ej.series || []) {
      const ciclo = plan.progresion?.ciclos?.find((c) => c.n === plan.progresion.cicloActual);
      if (!ciclo?.escalera?.length) continue;
      const hechos = new Set(sesiones.flatMap((s) => s.ejercicios.filter((e) => e.ejercicioId === ej.id && e.cicloN === ciclo.n)
        .map((e) => e.diaCiclo)));
      if (hechos.size >= ciclo.escalera.length) {
        lista.push(r('ciclo-terminado', 'consejo', `${ej.nombre}: has terminado el ciclo ${ciclo.n} de Bilbo. Prepara el siguiente en su ficha.`,
          { enlace: `#/ejercicio/${ej.id}` }));
      }
    }
  }
  return ordenar(lista);
}

// Series al fallo y series muy lejos del fallo.
function esfuerzo(datos, sesiones, periodo) {
  const series = sesiones.flatMap((s) => s.ejercicios.flatMap((e) => {
    const ej = datos.ejercicios.find((x) => x.id === e.ejercicioId);
    if (!ej || !cuentaParaFatiga(ej) || tipoDeEjercicio(ej) !== 'fuerza') return [];
    return e.series.filter((x) => x.hecha && x.tipo !== 'calentamiento' && x.recamara != null);
  }));
  if (series.length < 8) return [];
  const alFallo = series.filter((x) => x.recamara <= 0).length / series.length;
  const lejos = series.filter((x) => x.recamara >= 4).length / series.length;
  const cuando = periodo === 'hoy' ? 'Hoy' : 'Esta semana';
  if (alFallo >= 0.6) {
    return [r('mucho-fallo', 'consejo', `${cuando}, el ${Math.round(alFallo * 100)} % de tus series han ido al fallo. `
      + 'Dejando 1 o 2 en recámara se gana casi lo mismo y te recuperas antes.')];
  }
  if (lejos >= 0.7) {
    return [r('poco-esfuerzo', 'consejo', `${cuando}, el ${Math.round(lejos * 100)} % de tus series se quedaron a 4 o más del fallo. `
      + 'Para ganar músculo conviene acabar a 3 o menos.')];
  }
  return [];
}

// Mejor 1RM de cada sesión de un ejercicio, para ver si avanza.
function progresoPorEjercicio(datos, sesiones, ahora) {
  const lista = [];
  for (const ej of datos.ejercicios.filter((e) => !e.archivado && e.carga?.tipo !== 'ninguna')) {
    const puntos = sesiones
      .filter((s) => horasDesdeSesion(s, ahora) <= 42 * DIA)
      .map((s) => {
        const rms = s.ejercicios.filter((e) => e.ejercicioId === ej.id)
          .flatMap((e) => e.series.filter((x) => x.hecha && !x.tramos?.length))
          .map((x) => rmDeSerie(datos, ej, x, esfuerzoTotal(x))).filter(Boolean);
        return rms.length ? Math.max(...rms) : null;
      }).filter(Boolean);
    if (puntos.length < 4) continue;
    const [a, b, c] = puntos.slice(-3);
    const antes = Math.max(...puntos.slice(0, -3));
    if (b < a * 0.95 && c < b * 0.95) {
      lista.push(r('empeora', 'aviso', `${ej.nombre}: tu 1RM ha bajado dos sesiones seguidas (${Math.round((1 - c / a) * 100)} % en total). `
        + 'Suele ser fatiga acumulada: descansa un día más o haz una semana más suave.', { enlace: `#/ejercicio/${ej.id}` }));
    } else if (Math.max(a, b, c) <= antes) {
      lista.push(r('estancado', 'consejo', `${ej.nombre} lleva 3 sesiones sin superar tu mejor 1RM de las semanas anteriores. `
        + 'Prueba a cambiar el rango de repeticiones, revisa el descanso o haz una semana de descarga.', { enlace: `#/ejercicio/${ej.id}` }));
    }
  }
  return lista;
}

function ordenar(lista) {
  const peso = { aviso: 0, consejo: 1, bien: 2 };
  return lista.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
