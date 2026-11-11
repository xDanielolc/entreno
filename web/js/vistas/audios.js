// Pantalla de audios: los de hipnosis para dormir y los de entrenamiento de
// ilusiones, con su reproductor.
//
// Por qué se descarga entero antes de sonar, en vez de dárselo al <audio> por
// su dirección: así la petición es un GET normal y el service worker puede
// guardarla para siempre (las peticiones por tramos que hace el navegador al
// reproducir no se pueden guardar). La primera noche tarda unos segundos; a
// partir de ahí suena sin conexión.
//
// Y por qué se apunta solo en el diario: él no quiere apuntar nada que no esté
// en la app, y «cuál de los dos» es justo el dato que se olvida por la mañana.
// La app apunta lo que SABE (qué versión sonó y hasta qué segundo llegó a
// sonar), no lo que no puede saber (hasta dónde llegó él despierto): eso lo
// sigue contestando él en el diario.

import * as estado from '../estado.js';
import { AUDIOS, audioPorId, audiosDe, reloj, fechaDeLaNoche } from '../audios.js';
import { apuntarEnDiario } from '../diario.js';
import { anadir, aviso, ayuda, h } from '../ui.js';

// Mientras suena no se apunta nada hasta pasado este rato: un toque sin querer
// no es una noche con audio.
const MINIMO_PARA_APUNTAR_SEG = 30;
// Cada cuánto se guarda lo que lleva sonando, por si el móvil se apaga.
const CADA_CUANTO_SE_GUARDA_SEG = 30;

// Un solo reproductor para toda la app: dos audios a la vez no tienen sentido
// y, si se pasa de uno a otro, el anterior se para. Vive fuera de la vista a
// propósito: el audio de dormir TIENE que seguir sonando aunque él salga de
// esta pantalla o apague la pantalla del móvil.
let sonando = null;          // { id, tipo, version, audio, url, maximo, fecha }
let latido = null;           // el intervalo de cada segundo
let repintar = null;


// El contador se refresca solo él, sin repintar la pantalla entera: repintar
// cada segundo haría saltar el desplazamiento y perder el foco. Los nodos se
// buscan por su id en cada vuelta a propósito: la pantalla se repinta entera
// al poner o parar, así que guardarse una referencia dejaría actualizando un
// trozo de pantalla que ya no está puesto (pasó: el contador se quedaba a 0).
function refrescar() {
  if (!sonando) return;
  const a = audioPorId(sonando.id);
  const llena = document.getElementById(`barra-${sonando.id}`);
  const tiempo = document.getElementById(`tiempo-${sonando.id}`);
  if (!a || !llena || !tiempo) return;
  const s = sonando.audio.currentTime;
  llena.style.width = `${a.duracion ? Math.min(100, (s / a.duracion) * 100) : 0}%`;
  tiempo.textContent = `${reloj(s)} de ${reloj(a.duracion)}`
    + (a.sugestion && s > a.sugestion[1] ? ' · la sugestión ya ha pasado' : '');
}

function parar() {
  if (latido) { clearInterval(latido); latido = null; }
  if (!sonando) return;
  guardarAvance();
  const { audio, url } = sonando;
  sonando = null;
  try { audio.pause(); } catch { /* nada */ }
  audio.remove();
  try { URL.revokeObjectURL(url); } catch { /* nada */ }
}

// Lo que la app sabe de cierto: qué versión sonó esa noche y hasta qué segundo
// llegó a sonar. Va a la entrada del día en que se levanta.
function guardarAvance() {
  if (sonando?.tipo !== 'dormir') return;
  const segundos = Math.round(sonando.maximo);
  if (segundos < MINIMO_PARA_APUNTAR_SEG) return;
  const { fecha, version } = sonando;
  estado.cambiar((x) => {
    apuntarEnDiario(x, fecha, 'audioVersion', version);
    apuntarEnDiario(x, fecha, 'audioSonoHasta', segundos);
  }, { tecleo: true });
}

export function vistaAudios(contenedor) {
  const pintar = () => {
    contenedor.replaceChildren();
    anadir(contenedor,
      h('section', { class: 'tarjeta' },
        h('div', { class: 'titulo-con-ayuda' }, h('h2', { class: 'crece' }, 'Audios'),
          ayuda('Los audios', 'Los de dormir se ponen ya en la cama, con la luz apagada y el volumen bajo: tiene que oírse sin esfuerzo, no llenar '
            + 'la habitación. No pasa nada si te duermes antes del final, y puedes apagar la pantalla, que sigue sonando. Rótalos por noches, '
            + 'sin repetir el de la noche anterior. El de ilusiones NO es para dormir: se hace sentado y despierto, una vez por semana, por la tarde y después del test de las 18:00.')),
        h('p', { class: 'nota' }, 'La primera vez que pones uno se descarga entero y se guarda. A partir de ahí suena sin conexión.')),
      h('section', { class: 'tarjeta' },
        h('h2', {}, 'Para dormir'),
        h('p', { class: 'nota' }, 'La sugestión es la misma grabación en todos: solo cambia cómo se llega hasta ella. Ve rotándolos por noches, sin repetir el de la noche anterior.'),
        ...audiosDe('dormir').map((a) => fichaAudio(a, pintar))),
      h('section', { class: 'tarjeta' },
        h('h2', {}, 'Ilusiones'),
        h('p', { class: 'nota' }, 'Sentado y despierto. Al terminar, las cuatro notas van al diario.'),
        ...audiosDe('ilusiones').map((a) => fichaAudio(a, pintar))),
      h('p', { class: 'nota centrado' }, `${AUDIOS.length} audios.`));
  };
  pintar();
  repintar = () => { if (document.body.contains(contenedor)) pintar(); };
}

function fichaAudio(a, pintar) {
  const activo = sonando?.id === a.id;
  const llena = h('div', { class: 'audio-barra-llena', id: `barra-${a.id}`, style: 'width: 0%' });
  const tiempo = h('p', { class: 'nota centrado', id: `tiempo-${a.id}` }, `0:00 de ${reloj(a.duracion)}`);

  const poner = async () => {
    if (activo) { parar(); pintar(); return; }
    parar();
    const boton = document.getElementById(`poner-${a.id}`);
    if (boton) { boton.disabled = true; boton.textContent = 'Cargando…'; }
    try {
      const respuesta = await fetch(a.archivo);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const url = URL.createObjectURL(await respuesta.blob());
      // El <audio> va en la página, y no suelto en memoria: así el navegador
      // lo trata como un reproductor de verdad (mandos de la pantalla de
      // bloqueo) y se puede encontrar si algo va mal.
      const audio = h('audio', { src: url, preload: 'auto', style: 'display: none' });
      document.body.append(audio);
      sonando = { id: a.id, tipo: a.tipo, version: a.version, audio, url, maximo: 0, fecha: fechaDeLaNoche() };
      audio.addEventListener('ended', () => { parar(); pintar(); });
      await audio.play();
      let desdeElUltimoGuardado = 0;
      latido = setInterval(() => {
        if (sonando?.id !== a.id) return;
        sonando.maximo = Math.max(sonando.maximo, sonando.audio.currentTime);
        refrescar();
        if (++desdeElUltimoGuardado >= CADA_CUANTO_SE_GUARDA_SEG) { desdeElUltimoGuardado = 0; guardarAvance(); }
      }, 1000);
      pintar();
    } catch (e) {
      parar();
      aviso(`No se ha podido poner el audio: ${e.message}`, { tipo: 'error' });
      pintar();
    }
  };

  const ficha = h('div', { class: 'audio-ficha' },
    h('strong', {}, a.nombre),
    h('p', { class: 'nota' }, a.descripcion),
    h('p', { class: 'nota suave' }, `Dura ${reloj(a.duracion)}.`
      + (a.sugestion ? ` La sugestión va del ${reloj(a.sugestion[0])} al ${reloj(a.sugestion[1])}.` : '')),
    activo && h('div', { class: 'audio-barra', role: 'progressbar', 'aria-label': 'Lo que lleva sonando' }, llena),
    activo && tiempo,
    h('button', { type: 'button', id: `poner-${a.id}`, class: `boton grande${activo ? ' secundario' : ''}`, onclick: poner },
      activo ? 'Parar' : 'Escuchar'),
    a.tipo === 'ilusiones' && h('a', { class: 'boton secundario', href: '#/diario' }, 'Apuntar las notas'));
  if (activo) refrescar();
  return ficha;
}
