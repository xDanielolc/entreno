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
// drop set se escribe «60×8 → 50×6 → 40×5».
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
  const lineas = [['Cada serie: peso × repeticiones + las que te quedaban. Un drop set: 60×8 → 50×6.'], cabecera];
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

function bloquesDeProgresion(datos, ej) {
  const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const rm = (s) => (ej.carga?.tipo !== 'ninguna' && !s.tramos?.length ? rmDeSerie(datos, ej, s, esfuerzoTotal(s)) : null);
  const todas = seriesDeEjercicio(datos, ej.id).filter((x) => x.serie.tipo !== 'calentamiento');
  const bloques = new Map();
  for (const x of todas) {
    const clave = x.entrada.cicloN ? `Ciclo ${x.entrada.cicloN}` : 'Historial';
    if (!bloques.has(clave)) bloques.set(clave, new Map());
    const dias = bloques.get(clave);
    if (!dias.has(x.sesion.id)) dias.set(x.sesion.id, { x, series: [] });
    dias.get(x.sesion.id).series.push(x.serie);
  }
  return [...bloques.entries()].map(([titulo, dias]) => ({
    titulo,
    filas: [...dias.values()].map(({ x, series }, k) => {
      // La serie del día que manda: la de mayor 1RM (o la primera).
      const s = [...series].sort((p, q) => (rm(q) ?? 0) - (rm(p) ?? 0))[0];
      const r = rm(s);
      return {
        fecha: fecha(x.sesion.fecha), dia: x.entrada.diaCiclo ?? k + 1,
        peso: s.tramos?.length ? textoSerieCorto(ej, s) : (s.carga ?? null),
        reps: s.tramos?.length ? null : (s.esfuerzo ?? null),
        trabajo: trabajoSerie(s) || null, rm: r != null ? Math.round(r * 10) / 10 : null,
        nota: [...series.map((y) => y.nota), x.entrada.nota].filter(Boolean).join(' · '),
      };
    }),
  }));
}

export function xlsxProgresion(datos) {
  const ancho = [12, 6, 9, 8, 10, 9, 28, 2];
  const col = (n) => { let s = ''; for (let x = n + 1; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s; return s; };
  const hojas = [];
  for (const ej of [...datos.ejercicios].filter((e) => !e.borrado).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const bloques = bloquesDeProgresion(datos, ej);
    if (!bloques.length) continue;
    const filas = [[{ v: ej.nombre, e: 1 }], [{ v: 'Cada ciclo en su bloque de columnas; una fila por día. Las repeticiones, en amarillo.', e: 2 }], []];
    const titulos = []; const cabecera = []; const uniones = ['A1:G1'];
    bloques.forEach((b, k) => {
      const e = 7 + (k % COLORES_BLOQUE.length) * 2;
      titulos.push({ v: b.titulo, e }, ...Array(6).fill({ v: '', e }), null);
      cabecera.push(...['Fecha', 'Día', 'Peso', 'Reps', 'Trabajo', '1RM', 'Comentario'].map((v) => ({ v, e })), null);
      uniones.push(`${col(k * 8)}4:${col(k * 8 + 6)}4`);
    });
    filas.push(titulos, cabecera);
    const alto = Math.max(...bloques.map((b) => b.filas.length));
    for (let i = 0; i < alto; i++) {
      filas.push(bloques.flatMap((b, k) => {
        const f = b.filas[i];
        const tinte = 8 + (k % COLORES_BLOQUE.length) * 2;
        if (!f) return [null, null, null, null, null, null, null, null];
        return [{ v: f.fecha, e: 3 }, { v: f.dia, e: 6 }, { v: f.peso, e: 6 }, { v: f.reps, e: 4 },
          { v: f.trabajo, e: tinte }, { v: f.rm, e: tinte }, { v: f.nota, e: 5 }, null];
      }));
    }
    hojas.push({ nombre: ej.nombre, columnas: bloques.flatMap(() => ancho), filas, uniones });
  }
  if (!hojas.length) hojas.push({ nombre: 'Sin datos', filas: [[{ v: 'Aún no hay entrenamientos apuntados.', e: 2 }]] });
  return xlsx(hojas, ESTILOS_XLSX);
}

export const NOMBRES_CSV = {
  progresionXlsx: 'Progresión por ejercicio (como tus Excel).xlsx',
  entrenamientos: 'Entrenamientos (legible).csv',
  ejercicios: 'Ejercicios y rutinas (legible).csv',
};
