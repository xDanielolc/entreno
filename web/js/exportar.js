// Copias legibles de tus datos: dos hojas de cálculo (CSV, que Excel abre
// con doble clic) que la app deja en tu carpeta de Google Drive junto al
// archivo de datos. Solo son para mirar: la app nunca las lee.
//
// Separador «;» y coma decimal, como espera Excel en español. Empiezan con
// la marca UTF-8 para que las tildes salgan bien.

import { esfuerzoTotal } from './calculos.js';
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
  cabecera.push('Mejor 1RM del día', 'Notas');
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
        ...celdas, rms.length ? Math.round(Math.max(...rms) * 10) / 10 : '', entrada.notas || s.notas || '']);
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

export const NOMBRES_CSV = {
  entrenamientos: 'Entrenamientos (legible).csv',
  ejercicios: 'Ejercicios y rutinas (legible).csv',
};
