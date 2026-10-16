// Copias legibles de tus datos: dos hojas de cálculo (CSV, que Excel abre
// con doble clic) que la app deja en tu carpeta de Google Drive junto al
// archivo de datos. Solo son para mirar: la app nunca las lee.
//
// Separador «;» y coma decimal, como espera Excel en español. Empiezan con
// la marca UTF-8 para que las tildes salgan bien.

import { esfuerzoTotal, seriesDeEjercicio, trabajoSerie } from './calculos.js';
import { TIPOS_CARGA, TIPOS_PROGRESION, TIPOS_SERIE } from './esquema.js';
import { rmDeSerie } from './formula1rm.js';
import { nombreMusculo } from './musculos.js';
import { nombreSede } from './sedes.js';
import { textoTecnicas } from './vistas/tecnicas.js';
import { xlsx } from './xlsx.js';

const BOM = '﻿';

function celda(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(Math.round(v * 100) / 100).replace('.', ',');
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function filas(lineas) {
  return BOM + lineas.map((l) => l.map(celda).join(';')).join('\r\n') + '\r\n';
}

const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '');

// Una fila por ejercicio y día, con cada serie en su columna, como en una
// hoja de gimnasio: «60 kg × 12 + 1» (peso × repeticiones + recámara); un
// serie descendente se escribe «60×8 → 50×6 → 40×5».
const coma = (n) => (n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ','));

function textoSerieCorto(ej, serie) {
  if (serie.tramos?.length) {
    return serie.tramos.filter((t) => t.esfuerzo != null).map((t) => `${coma(t.carga)}×${coma(t.esfuerzo)}`).join(' → ');
  }
  const partes = [];
  if (ej.carga?.tipo !== 'ninguna' && serie.carga != null) partes.push(`${coma(serie.carga)} kg`);
  if (serie.esfuerzo != null) partes.push(`${coma(serie.esfuerzo)}${serie.recamara ? ` + ${serie.recamara}` : ''}`);
  const tec = textoTecnicas(serie.tecnicas);
  return partes.join(' × ') + (tec ? ` (${tec})` : '');
}

export function csvEntrenamientos(datos) {
  const MAX = 8;
  const cabecera = ['Fecha', 'Rutina', 'Día', 'Sitio', 'Ejercicio'];
  for (let i = 1; i <= MAX; i++) cabecera.push(`Serie ${i}`);
  cabecera.push('Mejor 1RM del día', 'Comentarios de las series', 'Comentarios del entrenamiento');
  const lineas = [['Cada serie: peso × repeticiones + las que te quedaban. Una serie descendente: 60×8 → 50×6.'], cabecera];
  const sesiones = [...datos.sesiones].filter((s) => !s.borrada)
    .sort((a, b) => (a.fecha + (a.inicio || '')).localeCompare(b.fecha + (b.inicio || '')));
  for (const s of sesiones) {
    const rutina = datos.rutinas.find((r) => r.id === s.rutinaId);
    const dia = rutina?.dias.find((x) => x.id === s.diaRutinaId);
    for (const entrada of s.ejercicios) {
      const ej = datos.ejercicios.find((e) => e.id === entrada.ejercicioId);
      if (!ej) continue;
      const hechas = entrada.series.filter((x) => x.hecha);
      if (!hechas.length) continue;
      const celdas = hechas.slice(0, MAX).map((x) => textoSerieCorto(ej, x));
      if (hechas.length > MAX) celdas[MAX - 1] += ` (+${hechas.length - MAX} más)`;
      while (celdas.length < MAX) celdas.push('');
      const rms = ej.carga?.tipo !== 'ninguna'
        ? hechas.filter((x) => !x.tramos?.length).map((x) => rmDeSerie(datos, ej, x, esfuerzoTotal(x))).filter(Boolean) : [];
      lineas.push([s.fecha, rutina?.nombre ?? '', dia?.nombre ?? '', s.sedeId ? nombreSede(datos, s.sedeId) : '', ej.nombre,
        ...celdas, rms.length ? Math.round(Math.max(...rms) * 10) / 10 : '',
        // «Serie 2: me costó» por cada serie comentada, y lo del ejercicio.
        [...hechas.map((x, k) => x.nota && `Serie ${k + 1}: ${x.nota}`), entrada.nota].filter(Boolean).join(' · '),
        s.notas || '']);
    }
  }
  return filas(lineas);
}

// Ejercicios (una fila por serie de su plantilla) y, debajo, rutinas.
export function csvEjerciciosYRutinas(datos) {
  const lineas = [['EJERCICIOS'], ['Ejercicio', 'Grupo', 'Sitio', 'Carga', 'Músculos principales', 'Músculos secundarios',
    'Serie', 'Tipo', 'Técnicas', 'Progresión', 'Detalle', 'Pesos de la máquina', 'Archivado']];
  for (const ej of [...datos.ejercicios].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    if (ej.borrado) continue;
    const fijo = [ej.nombre, ej.grupo || '', ej.sedeId ? nombreSede(datos, ej.sedeId) : 'Todos', TIPOS_CARGA[ej.carga?.tipo]?.etiqueta ?? '',
      (ej.musculos?.principales ?? []).map((m) => nombreMusculo(m)).join(', '),
      (ej.musculos?.secundarios ?? []).map((m) => nombreMusculo(m)).join(', ')];
    const planes = ej.series?.length ? ej.series : [null];
    planes.forEach((plan, i) => {
      const p = plan?.progresion;
      let detalle = '';
      if (p?.tipo === 'bilbo') {
        const ciclo = p.ciclos?.find((c) => c.n === p.cicloActual);
        detalle = ciclo ? `ciclo ${ciclo.n}: ${ciclo.escalera?.join(' → ')}` : '';
      } else if (p?.tipo === 'carga') detalle = `de ${p.objetivoEsfuerzo?.[0]} a ${p.objetivoEsfuerzo?.[1]}, sube ${p.incremento}`;
      else if (p?.tipo === 'programa') detalle = `${p.programa}, inicial ${p.inicial ?? '?'}, +${p.incremento}`;
      else if (p?.tipo === 'esfuerzo') detalle = `+${p.incremento} de ${p.sobre === 'carga' ? 'peso' : 'repeticiones'}`;
      lineas.push([...(i === 0 ? fijo : fijo.map((x, k) => (k === 0 ? x : ''))), plan ? i + 1 : '', plan ? TIPOS_SERIE[plan.tipo] ?? plan.tipo : '',
        plan ? textoTecnicas(plan.tecnicas) : '', p ? TIPOS_PROGRESION[p.tipo]?.etiqueta ?? p.tipo : '', detalle,
        i === 0 ? (ej.pesosMaquina || []).join(' ') : '', i === 0 && ej.archivado ? 'sí' : '']);
    });
  }
  lineas.push([], ['RUTINAS'], ['Rutina', 'Activa', 'Días fijos', 'Día', 'Orden', 'Ejercicio', 'Opcional', 'Nota']);
  const semana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  for (const r of datos.rutinas) {
    r.dias.forEach((dia) => {
      dia.ejercicios.forEach((item, k) => {
        const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
        lineas.push([r.nombre, r.activa ? 'sí' : '', (r.diasSemana || []).map((d) => semana[d]).join(' '), dia.nombre, k + 1,
          ej?.nombre ?? '(borrado)', item.opcional ? 'sí' : '', item.nota || '']);
      });
    });
  }
  return filas(lineas);
}

// Como las hojas de Dan: un Excel con una pestaña por ejercicio; dentro, cada
// ciclo en su bloque de columnas de color (Fecha, Día, Peso, Reps, Trabajo,
// 1RM, Comentario) y una fila por día. Las repeticiones, en amarillo.
const COLORES_BLOQUE = [['00B0F0', 'DDEBF7'], ['ED7D31', 'FCE4D6'], ['70AD47', 'E2EFDA'], ['7030A0', 'E4DFEC'], ['C00000', 'F8CBAD'], ['00B050', 'D9F2E6']];
const ESTILOS_XLSX = [
  {},                                                                  // 0 normal
  { negrita: true, tamano: 16 },                                       // 1 título
  { color: '595959', tamano: 9 },                                      // 2 nota
  { centro: true, borde: true, fondo: 'F2F2F2' },                      // 3 fecha
  { negrita: true, centro: true, borde: true, fondo: 'FFFF66' },       // 4 repeticiones
  { borde: true, ajustar: true },                                      // 5 comentario
  { centro: true, borde: true },                                       // 6 número
  ...COLORES_BLOQUE.flatMap(([fuerte, suave]) => [
    { negrita: true, color: 'FFFFFF', fondo: fuerte, centro: true, borde: true },   // cabecera del bloque
    { centro: true, borde: true, fondo: suave },                                   // trabajo y 1RM
  ]),
];

// Bloques de una hoja: uno por ciclo (Fecha, Día, Peso, Reps, Trabajo, 1RM,
// Comentario) y, si entrenas también fuera de ciclos (un 3×5, series de
// hipertrofia…), uno «Otras series» con todas las series de cada día.
function bloquesDeProgresion(datos, ej) {
  const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const rm = (s) => (ej.carga?.tipo !== 'ninguna' && !s.tramos?.length ? rmDeSerie(datos, ej, s, esfuerzoTotal(s)) : null);
  const redondo = (n) => (n != null ? Math.round(n * 10) / 10 : null);
  const planDe = (s) => (ej.series || []).find((p) => p.id === s.planId);
  const cicloDe = (x) => x.serie.cicloN ?? (planDe(x.serie)?.progresion?.tipo === 'bilbo' ? x.entrada.cicloN : null) ?? null;
  const todas = seriesDeEjercicio(datos, ej.id).filter((x) => x.serie.tipo !== 'calentamiento');
  const porCiclo = new Map();
  const otras = new Map();
  for (const x of todas) {
    const n = cicloDe(x);
    const destino = n != null ? (porCiclo.get(n) ?? porCiclo.set(n, new Map()).get(n)) : otras;
    if (!destino.has(x.sesion.id)) destino.set(x.sesion.id, { x, series: [] });
    destino.get(x.sesion.id).series.push(x.serie);
  }
  const ciclos = [...porCiclo.entries()].sort((p, q) => p[0] - q[0]).map(([n, dias]) => ({
    titulo: `Ciclo ${n}`,
    columnas: [['Fecha', 12, 'fecha'], ['Día', 6, 'num'], ['Peso', 9, 'num'], ['Reps', 8, 'reps'], ['Trabajo', 10, 'tinte'], ['1RM', 9, 'tinte'], ['Comentario', 28, 'nota']],
    filas: [...dias.values()].map(({ x, series }, k) => {
      const s = [...series].sort((p, q) => (rm(q) ?? 0) - (rm(p) ?? 0))[0];
      return [fecha(x.sesion.fecha), x.entrada.diaCiclo ?? s.diaCiclo ?? k + 1,
        s.tramos?.length ? textoSerieCorto(ej, s) : (s.carga ?? null), s.tramos?.length ? null : (s.esfuerzo ?? null),
        trabajoSerie(s) || null, redondo(rm(s)), [...series.map((y) => y.nota), x.entrada.nota].filter(Boolean).join(' · ')];
    }),
  }));
  const bloques = [];
  if (otras.size) {
    const dias = [...otras.values()];
    const maxSeries = Math.min(8, Math.max(...dias.map((d) => d.series.length)));
    bloques.push({
      titulo: porCiclo.size ? 'Otras series' : 'Series',
      columnas: [['Fecha', 12, 'fecha'], ...Array.from({ length: maxSeries }, (_, i) => [`Serie ${i + 1}`, 10, 'reps']),
        ['Mejor 1RM', 10, 'tinte'], ['Comentario', 28, 'nota']],
      filas: dias.map(({ x, series }) => {
        const celdas = series.slice(0, maxSeries).map((s) => textoSerieCorto(ej, s));
        while (celdas.length < maxSeries) celdas.push(null);
        const mejor = Math.max(0, ...series.map((s) => rm(s) ?? 0));
        return [fecha(x.sesion.fecha), ...celdas, mejor ? redondo(mejor) : null,
          [...series.map((y) => y.nota), x.entrada.nota].filter(Boolean).join(' · ')];
      }),
    });
  }
  return { otras: bloques, ciclos };
}

export function xlsxProgresion(datos) {
  const col = (n) => { let s = ''; for (let x = n + 1; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s; return s; };
  // Cada ciclo hace de bloque; cuando hay muchos (un macrociclo entero), se
  // abren más pestañas: «Press de banca», «Press de banca (2)»…
  const POR_PESTANA = 6;
  const pintarHoja = (nombre, titulo, bloques) => {
    const filas = [[{ v: titulo, e: 1 }], [{ v: 'Cada bloque, un ciclo (o tus otras series); una fila por día. Las repeticiones, en amarillo.', e: 2 }], []];
    const titulos = []; const cabecera = []; const uniones = ['A1:G1']; const anchos = [];
    let c = 0;
    bloques.forEach((b, k) => {
      const e = 7 + (k % COLORES_BLOQUE.length) * 2;
      const n = b.columnas.length;
      titulos.push({ v: b.titulo, e }, ...Array(n - 1).fill({ v: '', e }), null);
      cabecera.push(...b.columnas.map(([v]) => ({ v, e })), null);
      anchos.push(...b.columnas.map(([, w]) => w), 2);
      if (n > 1) uniones.push(`${col(c)}4:${col(c + n - 1)}4`);
      c += n + 1;
    });
    filas.push(titulos, cabecera);
    const alto = Math.max(0, ...bloques.map((b) => b.filas.length));
    for (let i = 0; i < alto; i++) {
      filas.push(bloques.flatMap((b, k) => {
        const tinte = 8 + (k % COLORES_BLOQUE.length) * 2;
        const f = b.filas[i];
        if (!f) return [...b.columnas.map(() => null), null];
        const estilo = { fecha: 3, num: 6, reps: 4, tinte, nota: 5 };
        return [...f.map((v, j) => ({ v, e: estilo[b.columnas[j][2]] ?? 6 })), null];
      }));
    }
    return { nombre, columnas: anchos, filas, uniones };
  };
  const hojas = [];
  for (const ej of [...datos.ejercicios].filter((e) => !e.borrado).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const { otras, ciclos } = bloquesDeProgresion(datos, ej);
    if (!otras.length && !ciclos.length) continue;
    const tandas = [];
    for (let i = 0; i < Math.max(1, ciclos.length); i += POR_PESTANA) tandas.push(ciclos.slice(i, i + POR_PESTANA));
    tandas.forEach((tanda, k) => {
      const nombre = k ? `${ej.nombre} (${k + 1})` : ej.nombre;
      hojas.push(pintarHoja(nombre, k ? `${ej.nombre}, ciclos ${tanda[0].titulo.replace('Ciclo ', '')} en adelante` : ej.nombre,
        k ? tanda : [...otras, ...tanda]));
    });
  }
  if (!hojas.length) hojas.push({ nombre: 'Sin datos', filas: [[{ v: 'Aún no hay entrenamientos apuntados.', e: 2 }]] });
  return xlsx(hojas, ESTILOS_XLSX);
}

export const NOMBRES_CSV = {
  progresionXlsx: 'Progresión por ejercicio (como tus Excel).xlsx',
  entrenamientos: 'Entrenamientos (legible).csv',
  ejercicios: 'Ejercicios y rutinas (legible).csv',
};
