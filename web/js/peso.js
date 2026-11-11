// Tu peso corporal, apuntado con fecha (como en las apps de dieta, sin
// comidas). El último manda en `perfil.pesoCorporalKg`, que es el que usan
// flexiones, dominadas y máquinas asistidas.

import * as estado from './estado.js';
import { aviso, h, hoyISO, leerNumero, modal } from './ui.js';

// Cambia `datos` (dentro de estado.cambiar). Un solo valor por día: el último.
export function apuntarPeso(datos, kg, fecha = hoyISO()) {
  if (!(kg > 0)) return;
  datos.perfil.pesos ??= [];
  datos.perfil.pesos = datos.perfil.pesos.filter((p) => p.fecha !== fecha);
  datos.perfil.pesos.push({ fecha, kg });
  datos.perfil.pesos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  datos.perfil.pesoCorporalKg = datos.perfil.pesos.at(-1).kg;
}

export function quitarPeso(datos, fecha) {
  datos.perfil.pesos = (datos.perfil.pesos ?? []).filter((p) => p.fecha !== fecha);
  if (datos.perfil.pesos.length) datos.perfil.pesoCorporalKg = datos.perfil.pesos.at(-1).kg;
}

// «Tu peso corporal» en un cartel, allí donde se echa en falta (Entrenar y la serie que lo necesita): una opción va
// donde se nombra, sin mandar a Ajustes. `alGuardar(kg)` por si quien lo abre tiene algo que rehacer.
export function pedirPesoCorporal({ alGuardar = null } = {}) {
  const caja = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Tu peso en kilos' });
  const guardar = () => {
    const kg = leerNumero(caja.value);
    if (!(kg > 0)) { aviso('Pon un número', { tipo: 'error' }); return; }
    cerrar();
    estado.cambiar((x) => { apuntarPeso(x, kg); });
    alGuardar?.(kg);
  };
  const cerrar = modal('Tu peso corporal', h('div', { class: 'formulario' },
    h('label', { class: 'campo' }, h('span', { class: 'etiqueta-campo' }, 'Peso (kg)'), caja),
    h('p', { class: 'nota' }, 'Solo para calcular la carga de flexiones, dominadas y máquinas asistidas.'),
    h('button', { class: 'boton', onclick: guardar }, 'Guardar')));
  caja.addEventListener('keydown', (e) => { if (e.key === 'Enter') guardar(); });
  setTimeout(() => caja.focus(), 50);
}
