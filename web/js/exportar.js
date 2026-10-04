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

// Como las hojas de Dan: un bloque por ejercicio, uno debajo de otro; dentro,
// cada ciclo en su grupo de columnas (Fecha, Día, Peso, Reps, Trabajo, 1RM,
// Comentario) y una fila por día del ciclo. Se lee por columnas.
export function csvProgresion(datos) {
  const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const rm = (ej, s) => (ej.carga?.tipo !== 'ninguna' && !s.tramos?.length ? rmDeSerie(datos, ej, s, esfuerzoTotal(s)) : null);
  const lineas = [['Una hoja por ejercicio, como tus Excel: cada ciclo en sus columnas y una fila por día.']];
  for (const ej of [...datos.ejercicios].filter((e) => !e.borrado).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const todas = seriesDeEjercicio(datos, ej.id).filter((x) => x.serie.tipo !== 'calentamiento');
    if (!todas.length) continue;
    lineas.push([], [ej.nombre.toUpperCase()]);
    // Bloques: uno por ciclo; lo que no va en ciclo, en «Historial» (lo mejor de cada día).
    const bloques = new Map();
    for (const x of todas) {
      const clave = x.entrada.cicloN ? `Ciclo ${x.entrada.cicloN}` : 'Historial';
      if (!bloques.has(clave)) bloques.set(clave, new Map());
      const dias = bloques.get(clave);
      const dia = `${x.sesion.id}`;
      if (!dias.has(dia)) dias.set(dia, { x, series: [] });
      dias.get(dia).series.push(x.serie);
    }
    const CABECERA = ['Fecha', 'Día', 'Peso', 'Reps', 'Trabajo', '1RM', 'Comentario'];
    const columnas = [...bloques.entries()].map(([titulo, dias]) => ({
      titulo,
      filas: [...dias.values()].map(({ x, series }, k) => {
        // La serie del día que manda: la de mayor 1RM (o la primera).
        const s = [...series].sort((a, b) => (rm(ej, b) ?? 0) - (rm(ej, a) ?? 0))[0];
        const notas = [...series.map((y) => y.nota), x.entrada.nota].filter(Boolean).join(' · ');
        return [fecha(x.sesion.fecha), x.entrada.diaCiclo ?? k + 1,
          s.tramos?.length ? textoSerieCorto(ej, s) : s.carga ?? '', s.tramos?.length ? '' : s.esfuerzo ?? '',
          trabajoSerie(s) || '', rm(ej, s) != null ? Math.round(rm(ej, s) * 10) / 10 : '', notas];
      }),
    }));
    const hueco = Array(CABECERA.length).fill('');
    lineas.push(columnas.flatMap((c) => [c.titulo, ...hueco.slice(1), '']));
    lineas.push(columnas.flatMap(() => [...CABECERA, '']));
    const alto = Math.max(...columnas.map((c) => c.filas.length));
    for (let i = 0; i < alto; i++) lineas.push(columnas.flatMap((c) => [...(c.filas[i] ?? hueco), '']));
  }
  return filas(lineas);
}

export const NOMBRES_CSV = {
  progresion: 'Progresión por ejercicio (como tus Excel).csv',
  entrenamientos: 'Entrenamientos (legible).csv',
  ejercicios: 'Ejercicios y rutinas (legible).csv',
};
