// Glosario: qué significa cada palabra de entrenamiento, explicado para
// quien nunca ha entrenado. Se enseña en un cartel al tocar «¿Qué es…?».

import { h, modal } from '../ui.js';

export const GLOSARIO = {
  rm: { pregunta: '¿Qué es el 1RM?', termino: '1RM', texto: 'El peso máximo que podrías levantar una sola vez en un ejercicio. La app no te pide que lo pruebes: lo '
    + 'calcula a partir de cualquier serie (por ejemplo, 60 kg × 10 repeticiones dan un 1RM de unos 80 kg). Sirve para proponerte pesos: '
    + '«el 80 % de tu 1RM».' },
  recamara: { pregunta: '¿Qué es la recámara?', termino: 'Recámara', texto: 'Las repeticiones que te quedaban por hacer cuando paraste. Si haces 12 y podrías haber hecho 2 más, '
    + 'la recámara es 2 (se apunta en la casilla «+»). Con 0 has llegado al fallo. Cuanto menor, más dura la serie y más descanso pide. '
    + 'También se llama RIR.' },
  fallo: { pregunta: '¿Qué es el fallo?', termino: 'Fallo', texto: 'Llegar al punto en que no puedes hacer ni una repetición más con buena técnica. No hace falta ir '
    + 'al fallo para ganar músculo: quedarse a 1-3 repeticiones da casi lo mismo y cansa menos.' },
  serie: { pregunta: '¿Qué es una serie?', termino: 'Serie', texto: 'Un grupo de repeticiones seguidas, sin soltar. «3 series de 10» son diez repeticiones, descanso, '
    + 'diez más, descanso y diez más.' },
  'drop-set': { pregunta: '¿Qué es un drop set?', termino: 'Drop set', texto: 'Una serie en la que, al no poder más, bajas el peso y sigues sin descansar, varias veces. '
    + 'Cada bajada se apunta aparte. Es una técnica de intensidad: exprime el músculo en poco tiempo.' },
  'rest-pause': { pregunta: '¿Qué es el rest-pause?', termino: 'Rest-pause', texto: 'Haces una serie, descansas solo 15-20 segundos y repites con el mismo peso, dos o tres '
    + 'veces. Cada miniserie se apunta aparte.' },
  miorepeticiones: { pregunta: '¿Qué son las miorrepeticiones?', termino: 'Miorrepeticiones', texto: 'Una serie larga de activación y después varias miniseries cortas (3-5 repeticiones) '
    + 'con el mismo peso, respirando unas pocas veces entre ellas.' },
  bilbo: { pregunta: '¿Qué es una serie Bilbo?', termino: 'Serie Bilbo', texto: 'Un ciclo de 17 días en el que el peso de cada día está fijado y sube poco a poco. Cada día intentas '
    + 'superar (en repeticiones, con ese peso) el 1RM del día anterior. Cuando el objetivo baja de 15 repeticiones, el ciclo se ha agotado.' },
  'doble-progresion': { pregunta: '¿Qué es la doble progresión?', termino: 'Doble progresión', texto: 'Trabajas en un rango, por ejemplo de 8 a 12 repeticiones. Con el mismo peso subes '
    + 'repeticiones hasta llegar a 12; entonces subes el peso y vuelves a empezar por 8.' },
  volumen: { pregunta: '¿Qué es el volumen?', termino: 'Volumen', texto: 'Cuántas series haces de cada músculo a la semana. Entre 10 y 20 por músculo es lo que más '
    + 'músculo da; por encima cansa más sin ganar más.' },
  recuperacion: { pregunta: '¿Cómo va la recuperación?', termino: 'Recuperación', texto: 'El tiempo que un músculo tarda en estar listo otra vez. Depende de lo dura que fue la '
    + 'sesión (lo cerca del fallo), de cuántas series hiciste y de tu genética. La app lo estima y tú puedes ajustar tu ritmo.' },
  'peso-corporal': { pregunta: '¿Para qué pido tu peso?', termino: 'Peso corporal', texto: 'Tu peso se usa para calcular la carga de las flexiones, dominadas o fondos, y para '
    + 'las máquinas asistidas. No es para controlar el peso: esta app va de entrenar.' },
  intensidad: { pregunta: '¿Qué es una serie de intensidad?', termino: 'Serie de intensidad', texto: 'Una serie dura con alguna técnica (drop set, rest-pause, isométrico…) que lleva '
    + 'el músculo al límite. Con una o dos por ejercicio basta.' },
};

// Enlace pequeño «¿Qué es…?» que abre la explicación.
export function queEs(clave, texto = null) {
  const g = GLOSARIO[clave];
  if (!g) return null;
  return h('button', { type: 'button', class: 'que-es', onclick: (e) => { e.preventDefault(); e.stopPropagation(); explicar(clave); } },
    texto ?? g.pregunta);
}

export function explicar(clave) {
  const g = GLOSARIO[clave];
  if (!g) return;
  const cerrar = modal(g.termino, h('div', {},
    h('p', {}, g.texto),
    h('button', { class: 'boton', onclick: () => cerrar() }, 'Entendido')));
}

// Lista completa, para Ajustes → Tutorial.
export function listaGlosario() {
  return h('div', { class: 'glosario' }, Object.entries(GLOSARIO).map(([k, g]) => h('details', { class: 'explicacion' },
    h('summary', {}, g.termino), h('p', {}, g.texto))));
}
