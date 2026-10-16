// Recomendaciones: situaciones que la app detecta en tus entrenamientos y
// qué conviene hacer en cada una. Sin bromas: cada una dice qué pasa y qué
// hacer.
//
// Respaldo de los umbrales:
//   · 10-20 series semanales por músculo (Schoenfeld 2017; Pelland 2026):
//     por encima se gana poco más y sube la fatiga.
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
  durezaSemanal, horasDesdeSesion, recuperacionPorMusculo, seriesPorMusculoDeSesion, seriesSemanales,
} from './recuperacion.js';

const MINIMO = 10;
const MINIMO_DURO = 6;
const MAXIMO = 20;
const DIA = 24;

// Cuántas series pedirle a un músculo esta semana. Las de 10 a 20 salen de
// estudios con series a 2-3 repeticiones del fallo; si tú las llevas al
// fallo o con drop sets, con bastantes menos ya hay estímulo de sobra.
function minimoDe(dureza, musculo) {
  const x = dureza[musculo];
  const duro = x && x.series > 0 && x.duras / x.series >= 0.5;
  return { minimo: duro ? MINIMO_DURO : MINIMO, duro };
}

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
  const dureza = durezaSemanal(datos);
  // El volumen semanal solo se juzga con una semana medio hecha: tras la
  // primera sesión de la semana no tiene sentido decir que falta volumen.
  const sesionesSemana = terminadas(datos).filter((s) => horasDesdeSesion(s) <= 7 * DIA).length;
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
    if (nHoy < 1 || sesionesSemana < 3) continue;
    const n = Math.round((semana[m] ?? 0) * 10) / 10;
    const { minimo } = minimoDe(dureza, m);
    if (n < minimo) {
      lista.push(r('volumen-bajo', 'consejo', `${nombre}: llevas ${formatearNumero(n)} de ${minimo} series esta semana; te faltan unas ${Math.ceil(minimo - n)}.`));
    } else if (n > MAXIMO) {
      lista.push(r('volumen-alto', 'aviso', `${nombre}: ${series(n)} en siete días. Por encima de ${MAXIMO} se gana poco más y sube la fatiga: `
        + 'recorta series o reparte la carga en más días.'));
    } else {
      lista.push(r('volumen-bien', 'bien', `${nombre}: ${series(n)} esta semana, en su sitio.`));
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
  const dureza = durezaSemanal(datos, ahora);
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
    // Solo se pide más volumen de lo que entrenas como músculo principal.
    if (n > 0 && n < minimoDe(dureza, m).minimo && conEste.length) {
      lista.push(r('volumen-bajo', 'consejo', `${nombre}: ${series(n)} en los últimos 7 días. `
        + (minimoDe(dureza, m).duro
          ? `Como las llevas al fallo o con bajadas, con unas ${MINIMO_DURO} a la semana basta.`
          : `Sube hasta al menos ${MINIMO}.`)));
    } else if (n > MAXIMO) {
      lista.push(r('volumen-alto', 'aviso', `${nombre}: ${series(n)} en 7 días. Por encima de ${MAXIMO} se gana poco más y sube la fatiga (Pelland 2026).`));
    }
    // 6. Toda la semana en una sola sesión.
    const semanaEste = recientes.filter((s) => seriesPorMusculoDeSesion(datos, s).get(m) >= 1);
    if (semanaEste.length === 1 && n >= 10) {
      lista.push(r('frecuencia-uno', 'consejo', `Todas tus series de ${nombre} de esta semana fueron en un solo día. `
        + 'Con el mismo volumen repartido en dos sesiones se suele ganar algo más.'));
    }
  }

  // 7 y 8 (recuperas más rápido o más despacio) van en su propia tarjeta,
  // con los botones para ajustar: ver vistas/cuerpo.js.

  // 9 y 10. Estancamiento y empeoramiento por ejercicio.
  lista.push(...progresoPorEjercicio(datos, sesiones, ahora, semana, dureza));

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

  // 16. Días seguidos entrenando fuerza (estirar o el cardio suave no cuentan).
  const deFuerza = (s) => s.ejercicios.some((e) => tipoDeEjercicio(datos.ejercicios.find((x) => x.id === e.ejercicioId)) === 'fuerza'
    && e.series.some((x) => x.hecha));
  const dias = new Set(sesiones.filter(deFuerza).map((s) => s.fecha));
  let seguidos = 0;
  const d = new Date(ahora);
  const local = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  while (dias.has(local(d))) { seguidos += 1; d.setDate(d.getDate() - 1); }
  if (seguidos >= 7) {
    lista.push(r('dias-seguidos', 'aviso', `Llevas ${seguidos} días seguidos entrenando fuerza. Toma al menos un día sin fuerza a la semana (estirar o pasear valen).`));
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
      + 'de 150 a 300 minutos semanales de actividad moderada, y fuerza 2 o más días por semana.'));
  }

  // 26. Fuerza menos de 2 días por semana (con al menos dos semanas de historial).
  const diasFuerza = new Set(recientes.filter(deFuerza).map((s) => s.fecha)).size;
  if (horasDesdeSesion(sesiones[0], ahora) >= 14 * DIA && diasFuerza < 2 && !haceCardio) {
    lista.push(r('fuerza-poca', 'consejo', `Esta semana llevas ${diasFuerza} ${diasFuerza === 1 ? 'día' : 'días'} de fuerza. `
      + 'La OMS recomienda fuerza 2 o más días por semana.'));
  }

  lista.push(...descansos(datos, recientes));
  lista.push(...tecnicasDeMas(datos, recientes));
  lista.push(...calentamiento(datos, sesiones.at(-1)));
  lista.push(...dolor(datos, sesiones, ahora));
  lista.push(...pesoSinActualizar(datos, recientes, ahora));
  lista.push(...llegasCansado(sesiones));

  // 20. Ciclos Bilbo terminados sin preparar el siguiente.
  for (const ej of datos.ejercicios.filter((e) => !e.archivado)) {
    for (const plan of ej.series || []) {
      const ciclo = plan.progresion?.ciclos?.find((c) => c.n === plan.progresion.cicloActual);
      if (!ciclo?.escalera?.length) continue;
      const hechos = new Set(sesiones.flatMap((s) => s.ejercicios.filter((e) => e.ejercicioId === ej.id && e.cicloN === ciclo.n)
        .map((e) => e.diaCiclo)));
      const quedan = ciclo.escalera.length - hechos.size;
      if (hechos.size && quedan > 0 && quedan <= 2) {
        lista.push(r('ciclo-acaba', 'consejo', `A ${ej.nombre} le ${quedan === 1 ? 'queda 1 sesión' : 'quedan 2 sesiones'} de ciclo.`,
          { enlace: `#/ejercicio/${ej.id}` }));
      }
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

// Mejor 1RM de cada sesión de un ejercicio: si baja, si se estanca o si
// sube rápido, y por qué puede ser (consejos 1-11 de la lista de Dan).
function progresoPorEjercicio(datos, sesiones, ahora, semana, dureza) {
  const lista = [];
  for (const ej of datos.ejercicios.filter((e) => !e.archivado && e.carga?.tipo !== 'ninguna')) {
    const puntos = sesiones
      .filter((s) => horasDesdeSesion(s, ahora) <= 42 * DIA)
      .map((s) => {
        const hechas = s.ejercicios.filter((e) => e.ejercicioId === ej.id)
          .flatMap((e) => e.series.filter((x) => x.hecha && !x.tramos?.length && x.tipo !== 'calentamiento'));
        const rms = hechas.map((x) => rmDeSerie(datos, ej, x, esfuerzoTotal(x))).filter(Boolean);
        return rms.length ? { s, rm: Math.max(...rms), hechas } : null;
      }).filter(Boolean);
    if (puntos.length < 4) continue;
    const [a, b, c] = puntos.slice(-3).map((x) => x.rm);
    const antes = Math.max(...puntos.slice(0, -3).map((x) => x.rm));
    const m = ej.musculos?.principales?.[0];
    const musculo = m ? nombreMusculo(m, { corto: true }).toLowerCase() : 'ese músculo';
    const nSemana = m ? Math.round((semana[m] ?? 0) * 10) / 10 : 0;
    const { minimo } = m ? minimoDe(dureza, m) : { minimo: MINIMO };
    const maximo = Math.max(minimo, datos.perfil.objetivoSeries?.[m] ?? MAXIMO);
    const sentida = m ? puntos.at(-1).s.sensaciones?.[m]?.sentida : null;
    const cansado = sentida != null && sentida <= 4;
    const enlace = { enlace: `#/ejercicio/${ej.id}` };
    const dice = (clave, nivel, texto) => lista.push(r(clave, nivel, `${ej.nombre}: ${texto}`, enlace));

    if (b < a * 0.95 && c < b * 0.95) {
      // Baja dos sesiones seguidas.
      const pausa = Math.round((new Date(puntos.at(-1).s.fecha) - new Date(puntos.at(-2).s.fecha)) / 86_400_000);
      const caida = `tu 1RM ha bajado dos sesiones seguidas (${Math.round((1 - c / a) * 100)} % en total).`;
      if (pausa >= 7) dice('empeora-pausa', 'consejo', `${caida} Es normal tras ${pausa} días sin entrenarlo: en una o dos semanas vuelves a tu nivel.`);
      else if (nSemana > maximo) dice('empeora-volumen', 'aviso', `${caida} Haces ${series(nSemana)} de ${musculo} esta semana, más de tu objetivo: puede ser cansancio acumulado. Quita 1 o 2 series esta semana.`);
      else if (nSemana < minimo) dice('empeora-poco', 'consejo', `${caida} Te faltan series: añade 1 o 2 de ${musculo} esta semana.`);
      else if (cansado) dice('empeora-cansado', 'aviso', `${caida} Llegas cansado: hoy no fuerces y revisa sueño y estrés.`);
      else dice('empeora', 'aviso', `${caida} Puede ser el sueño, la comida o el estrés. Si sigue otra semana, haz una semana de descarga.`);
    } else if (Math.max(a, b, c) <= antes) {
      // Tres sesiones sin superar lo de antes.
      const ultimas = puntos.slice(-3).flatMap((x) => x.hechas).filter((x) => x.recamara != null);
      const recamara = ultimas.length ? ultimas.reduce((t, x) => t + x.recamara, 0) / ultimas.length : null;
      const base = 'lleva 3 sesiones sin superar tu mejor 1RM de las semanas anteriores.';
      // ¿Mismo esquema desde hace 6 semanas? (las mismas series de la ficha)
      const planes = (s) => [...new Set(s.ejercicios.filter((e) => e.ejercicioId === ej.id).flatMap((e) => e.series.map((x) => x.planId)))].sort().join();
      const primera = sesiones.find((s) => s.ejercicios.some((e) => e.ejercicioId === ej.id));
      const mismoEsquema = primera && horasDesdeSesion(primera, ahora) >= 42 * DIA && puntos.every((x) => planes(x.s) === planes(puntos[0].s));
      if (recamara != null && recamara >= 3) dice('estancado-lejos', 'consejo', `${base} Dejas ${formatearNumero(Math.round(recamara))} o más en recámara: acércate más al fallo, deja 1 o 2.`);
      else if (recamara != null && recamara <= 0.5 && nSemana >= maximo * 0.75) dice('estancado-fallo', 'consejo', `${base} Siempre al fallo y con muchas series es mucha fatiga: deja 1 o 2 en recámara o haz una semana de descarga.`);
      else if (nSemana < minimo) dice('estancado-poco', 'consejo', `${base} Prueba a añadir una serie de este ejercicio.`);
      else if (mismoEsquema) dice('estancado-esquema', 'consejo', `${base} Llevas 6 semanas o más igual: cambia el estímulo con cabeza (otro rango de repeticiones u otra variante del ejercicio), no al azar.`);
      else dice('estancado', 'consejo', `${base} Revisa el descanso y el sueño, o haz una semana de descarga.`);
    } else {
      // Sube: ¿5 % o más en dos semanas?
      const hace2 = puntos.filter((x) => horasDesdeSesion(x.s, ahora) >= 14 * DIA).at(-1)?.rm;
      if (hace2 && c >= hace2 * 1.05) {
        if (nSemana > MAXIMO && cansado) dice('sube-cansado', 'consejo', 'funciona, pero con muchas series y llegando cansado: vigila la recuperación y no subas más series.');
        else dice('vas-bien', 'bien', `tu 1RM ha subido un ${Math.round((c / hace2 - 1) * 100)} % en dos semanas. Vas muy bien: mantén lo que haces.`);
      }
    }
  }
  return lista;
}

// Palabras de dolor en los comentarios (consejo 27). Lista larga a
// propósito: «molestia», «pinchazo», «tirón», «me cruje»…
const DOLOR = /\b(duel[eo]n?|dolor(es|ido|ida)?|molest(a|an|ia|ias|o)|pinch(a|azo|azos|ó)|tir[oó]n|tir[ae]|lesi[oó]n|lesionad[oa]|contractura|sobrecarga(do|da)?|tendin|inflamad[oa]|hinchad[oa]|cruj[ei]|chasquid|calambre|hormigue|adormecid|resentid[oa]|me he hecho daño|daño|agarrotad[oa]|tocad[oa] del|lumbago|ci[aá]tic)/i;

// 19. Descansos cortos en los ejercicios pesados (8 repeticiones o menos).
// Necesita la hora de cada serie (`hechaA`), que se apunta desde la 0.45.
function descansos(datos, recientes) {
  const huecos = [];
  for (const s of recientes) {
    for (const e of s.ejercicios) {
      const ej = datos.ejercicios.find((x) => x.id === e.ejercicioId);
      if (tipoDeEjercicio(ej) !== 'fuerza' || ej.esfuerzo?.tipo !== 'repeticiones') continue;
      const hechas = e.series.filter((x) => x.hecha && x.hechaA && !x.tramos?.length && x.tipo !== 'calentamiento');
      for (let k = 1; k < hechas.length; k++) {
        const segundos = (new Date(hechas[k].hechaA) - new Date(hechas[k - 1].hechaA)) / 1000;
        if (hechas[k - 1].esfuerzo <= 8 && segundos > 0 && segundos < 900) huecos.push(segundos);
      }
    }
  }
  if (huecos.length < 4) return [];
  const mediana = huecos.sort((x, y) => x - y)[Math.floor(huecos.length / 2)];
  if (mediana >= 75) return [];
  return [r('descanso-corto', 'consejo', `En los ejercicios pesados descansas poco más de un minuto entre series (${Math.round(mediana)} s de media). `
    + 'En los básicos, 2 o 3 minutos dan más fuerza y algo más de músculo (Schoenfeld 2016; Grgic 2017).')];
}

// 21. Técnicas de intensidad en casi todos los ejercicios de la semana.
function tecnicasDeMas(datos, recientes) {
  const entradas = recientes.flatMap((s) => s.ejercicios).filter((e) => e.series.some((x) => x.hecha)
    && tipoDeEjercicio(datos.ejercicios.find((x) => x.id === e.ejercicioId)) === 'fuerza');
  if (entradas.length < 6) return [];
  const con = entradas.filter((e) => e.series.some((x) => x.hecha && x.tecnicas?.length)).length;
  if (con / entradas.length < 0.7) return [];
  return [r('tecnicas', 'consejo', `Esta semana has usado drop sets u otras técnicas en ${Math.round((con / entradas.length) * 100)} % de los ejercicios. `
    + 'Ahorran tiempo, pero no dan más músculo que las series normales: déjalas para 1 o 2 ejercicios por sesión.')];
}

// 25. El primer ejercicio pesado sin serie de calentamiento.
function calentamiento(datos, sesion) {
  if (!sesion) return [];
  for (const e of sesion.ejercicios) {
    const ej = datos.ejercicios.find((x) => x.id === e.ejercicioId);
    const hechas = e.series.filter((x) => x.hecha);
    if (!hechas.length) continue;
    if (tipoDeEjercicio(ej) !== 'fuerza' || ej.carga?.tipo === 'ninguna') return [];
    if (hechas[0].tipo === 'calentamiento' || !(hechas[0].esfuerzo <= 8)) return [];
    return [r('sin-calentar', 'consejo', `El último día empezaste con ${ej.nombre} pesado y sin serie de calentamiento. `
      + 'Haz 1 o 2 series suaves antes: calentar mejora el rendimiento (Fradkin 2010). Cómo, en Aprender.', { enlace: '#/aprender' })];
  }
  return [];
}

// 27. Comentarios de dolor repetidos en un ejercicio (6 semanas).
function dolor(datos, sesiones, ahora) {
  const veces = new Map();
  for (const s of sesiones.filter((x) => horasDesdeSesion(x, ahora) <= 42 * DIA)) {
    for (const e of s.ejercicios) {
      const textos = [e.notas, ...e.series.map((x) => x.nota)].filter(Boolean).join(' ');
      if (DOLOR.test(textos)) veces.set(e.ejercicioId, (veces.get(e.ejercicioId) ?? 0) + 1);
    }
  }
  const lista = [];
  for (const [ejId, n] of veces) {
    if (n < 3) continue;
    const ej = datos.ejercicios.find((x) => x.id === ejId);
    lista.push(r('dolor', 'aviso', `Has apuntado molestias en ${ej?.nombre ?? 'un ejercicio'} ${n} veces en seis semanas. `
      + 'Baja el peso o cambia de variante; si sigue, consulta con un profesional.', { enlace: `#/ejercicio/${ejId}` }));
  }
  return lista;
}

// 28. Ejercicios con tu peso y el peso sin actualizar en 30 días.
function pesoSinActualizar(datos, recientes, ahora) {
  const usaPeso = recientes.some((s) => s.ejercicios.some((e) => ['pesoCorporal', 'asistida']
    .includes(datos.ejercicios.find((x) => x.id === e.ejercicioId)?.carga?.tipo)));
  if (!usaPeso) return [];
  const ultima = datos.perfil.pesos?.at(-1)?.fecha;
  const dias = ultima ? Math.floor((ahora - new Date(`${ultima}T12:00:00`)) / (DIA * 3_600_000)) : null;
  if (dias != null && dias < 30) return [];
  return [r('peso', 'consejo', `${dias == null ? 'Aún no has apuntado tu peso' : `Hace ${dias} días que no apuntas tu peso`}: `
    + 'tus flexiones, dominadas y fondos se calculan con él. Apúntalo en Cuerpo.', { enlace: '#/cuerpo' })];
}

// 29. Llegas cansado a varios músculos en varias sesiones seguidas.
function llegasCansado(sesiones) {
  const conSensaciones = sesiones.filter((s) => s.sensaciones && Object.keys(s.sensaciones).length).slice(-4);
  if (conSensaciones.length < 3) return [];
  const malas = conSensaciones.filter((s) => Object.values(s.sensaciones).filter((x) => x.sentida <= 4).length >= 3).length;
  if (malas < 3) return [];
  return [r('descarga', 'consejo', `En ${malas} de tus últimas ${conSensaciones.length} sesiones llegabas cansado a varios músculos. `
    + 'Puede que necesites una semana de descarga: menos series o menos peso durante unos días (Bell 2023).')];
}

function ordenar(lista) {
  const peso = { aviso: 0, consejo: 1, bien: 2 };
  return lista.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
