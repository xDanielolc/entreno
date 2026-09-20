import * as estado from '../estado.js';
import { sedeInicial } from '../sedes.js';
import { barraModoPrueba } from '../modo-prueba.js';
import { seriesDesdePlan } from '../series.js';
import { anadir, fechaLarga, h, hoyISO, modal, nuevoId } from '../ui.js';
import { tarjetaRecuperacion, tarjetaSugerenciasAjuste } from './cuerpo.js';
import { tarjetaInstalar } from './instalar.js';
import { pista } from './tutorial.js';
import { cuestionarioHecho, hacerCuestionario, rutinaRecomendada } from './cuestionario.js';
import { PLANTILLAS } from '../plantillas.js';
import { cuentaParaFatiga } from '../catalogo.js';
import { nombreMusculo } from '../musculos.js';
import { recuperacionPorMusculo } from '../recuperacion.js';

let preguntandoTutorial = false;
import { masRecienteAntes, resumenSesion } from './historial.js';
import { empezarDia, enPuntos, queToca, rutinasActivas } from './rutinas.js';

// ¿Toca de verdad entrenar hoy? Mira los músculos del día que toca y, si
// alguno sigue tocado, dice cuándo estará listo. Y si llevas más días parado
// de lo que sueles, lo dice también.
function avisoCuandoToca(d, rutina, dia) {
  const ahora = new Date();
  const rec = recuperacionPorMusculo(d, ahora);
  const musculos = new Set();
  for (const item of dia.ejercicios) {
    const ej = d.ejercicios.find((e) => e.id === item.ejercicioId);
    if (ej && !ej.archivado && cuentaParaFatiga(ej)) for (const m of ej.musculos?.principales ?? []) musculos.add(m);
  }
  const tocados = [...musculos].map((m) => rec[m]).filter((x) => x && x.porcentaje < 60 && x.horasRestantes > 0)
    .sort((a, b) => a.porcentaje - b.porcentaje);
  const lineas = [];
  if (tocados.length) {
    const peor = tocados[0];
    const listo = new Date(ahora.getTime() + peor.horasRestantes * 3_600_000);
    lineas.push(`${nombreMusculo(peor.musculo)} está al ${peor.porcentaje} %: le faltan unas ${peor.horasRestantes} h. `
      + `Mejor ${cuandoTexto(listo, ahora)}` + (tocados.length > 1 ? ` (también ${tocados.slice(1).map((x) => nombreMusculo(x.musculo, { corto: true })).join(', ')}).` : '.'));
  }
  // Días parado respecto a tu ritmo con esta rutina.
  const fechas = [...new Set(d.sesiones.filter((s) => !s.borrada && s.estado === 'terminada' && s.rutinaId === rutina.id).map((s) => s.fecha))].sort();
  if (fechas.length >= 3) {
    const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86_400_000);
    const huecos = fechas.slice(1).map((f, i) => dias(fechas[i], f)).sort((a, b) => a - b);
    const habitual = huecos[Math.floor(huecos.length / 2)];
    const desdeUltima = dias(fechas.at(-1), hoyISO());
    if (desdeUltima >= Math.max(4, habitual * 2)) {
      lineas.push(`Llevas ${desdeUltima} días sin esta rutina y sueles dejar ${habitual}. Toca ya: si te cuesta, empieza con algo menos de peso.`);
    }
  }
  if (!lineas.length) return null;
  return h('p', { class: 'aviso-texto' }, lineas.join(' '));
}

function cuandoTexto(fecha, ahora) {
  const mismoDia = fecha.toDateString() === ahora.toDateString();
  const manana = new Date(ahora); manana.setDate(manana.getDate() + 1);
  const hora = fecha.getHours();
  const tramo = hora < 12 ? 'por la mañana' : hora < 20 ? 'por la tarde' : 'por la noche';
  if (mismoDia) return `hoy ${tramo}`;
  if (fecha.toDateString() === manana.toDateString()) return `mañana ${tramo}`;
  return `el ${fecha.toLocaleDateString('es-ES', { weekday: 'long' })} ${tramo}`;
}

// Un saludo distinto cada vez (cambia cada hora, no en cada toque).
const SALUDOS = [
  'Hola, {n}. La barra no se va a levantar sola.',
  '{n}, hoy también cuenta.',
  'Buenas, {n}. Un día más es un día más fuerte.',
  '{n}, el mejor entrenamiento es el que se hace.',
  'Hola, {n}. Poco a poco y sin parar.',
  '{n}, lo difícil ya lo has hecho: abrir la app.',
  'Hola, {n}. Hoy, una repetición más que ayer.',
  '{n}, tu yo de dentro de un año te lo agradecerá.',
  'Buenas, {n}. Calienta bien, que luego nos quejamos.',
  '{n}, si dudas, empieza por la primera serie.',
  'Hola, {n}. Descansar también es entrenar.',
  '{n}, la constancia gana a la motivación.',
  'Hola, {n}. Hoy toca lo que toca, y ya está.',
  '{n}, apunta las series: lo que no se mide no mejora.',
  'Buenas, {n}. Cada serie, con intención.',
  '{n}, sin prisa: el peso subirá.',
];

function saludo(nombre) {
  const base = SALUDOS[Math.floor(Date.now() / 3_600_000) % SALUDOS.length];
  // Sin nombre, la frase se queda sin el hueco: «Buenas. Un día más…».
  const texto = nombre ? base.replace('{n}', nombre) : base.replace(', {n}.', '.').replace('{n}, ', '');
  return texto.replace(/\s{2,}/g, ' ').replace(/^(\p{L})/u, (m) => m.toUpperCase());
}

// Con el cuestionario hecho y sin rutinas: la prehecha que mejor encaja.
function tarjetaRecomendacion(d) {
  const plantilla = PLANTILLAS.find((p) => p.id === rutinaRecomendada(d.perfil));
  if (!plantilla) return null;
  return h('section', { class: 'tarjeta aviso-tarjeta' },
    h('p', {}, h('strong', {}, 'Para empezar te recomiendo: '), plantilla.nombre, '. ', plantilla.resumen),
    h('a', { class: 'boton', href: '#/rutinas' }, 'Ver las rutinas prehechas'));
}

export function vistaInicio(contenedor) {
  const d = estado.datos();
  const enCurso = d.sesiones.find((s) => s.estado === 'en-curso' && !s.borrada);
  const activos = d.ejercicios.filter((e) => !e.archivado);
  const recientes = d.sesiones.filter((s) => s.estado === 'terminada' && !s.borrada)
    .sort(masRecienteAntes).slice(0, 3);
  const necesitaPeso = d.perfil.pesoCorporalKg == null
    && activos.some((e) => ['asistida', 'pesoCorporal'].includes(e.carga.tipo));
  const toca = queToca(d, recuperacionPorMusculo(d));
  const rutina = toca?.rutina ?? null;
  const dia = toca?.dia ?? null;
  const otras = (toca?.alternativas ?? []).filter((a) => a.rutina.id !== rutina?.id);

  // Primera vez: ¿cuánto tutorial quieres? (no encima de otro cartel)
  // Primera vez: el cuestionario de bienvenida (nivel, objetivo, dónde,
  // tema). Si hay otro cartel abierto (el de modo prueba), espera.
  if (!cuestionarioHecho(d) && !preguntandoTutorial) {
    preguntandoTutorial = true;
    const intento = setInterval(() => {
      if (document.querySelector('.modal-fondo')) return;
      clearInterval(intento);
      if (cuestionarioHecho(estado.datos())) { preguntandoTutorial = false; return; }
      hacerCuestionario({ alTerminar: () => { preguntandoTutorial = false; } });
    }, 400);
  }

  function empezarSuelto() {
    const id = nuevoId('ses');
    estado.cambiar((datos) => {
      datos.sesiones.push({
        id, fecha: hoyISO(), sedeId: sedeInicial(datos, null), rutinaId: null, diaRutinaId: null,
        estado: 'en-curso', inicio: new Date().toISOString(), fin: null, ejercicios: [], notas: '', borrada: null,
      });
    });
    location.hash = `#/sesion/${id}`;
  }

  function empezarConRutina(elegido, deRutina = rutina) {
    const id = empezarDia(deRutina, elegido, (datos, ej, plan) => seriesDesdePlan(datos, ej, plan));
    location.hash = `#/sesion/${id}`;
  }

  // Cualquier día de cualquier rutina activa.
  function elegirDia() {
    const activas = rutinasActivas(d);
    const cerrar = modal('Elegir día', h('div', { class: 'lista-eleccion' },
      activas.map((r) => [
        activas.length > 1 && h('p', { class: 'nota' }, r.nombre),
        r.dias.map((x) => h('button', { class: 'tarjeta fila-enlace', onclick: () => { cerrar(); empezarConRutina(x, r); } },
          h('div', {},
            h('strong', {}, x.nombre),
            h('div', { class: 'suave' }, `${x.ejercicios.length} ejercicios`)),
          r.id === rutina.id && x.id === dia.id && h('span', { class: 'etiqueta' }, 'Toca hoy'))),
      ])));
  }

  anadir(contenedor,
    estado.esSinCuenta() && barraModoPrueba(),
    h('p', { class: 'fecha-hoy' }, fechaLarga(hoyISO())),
    h('h1', {}, saludo(d.perfil.nombre)),
    tarjetaInstalar(),
    pista('hoy', 'Qué toca hoy y cómo va tu recuperación. Si quieres más ayuda, en Ajustes → Tutorial están la guía y el glosario.'),

    necesitaPeso && h('a', { class: 'tarjeta aviso-tarjeta', href: '#/ajustes' },
      'Indica tu peso corporal en Ajustes: lo necesitan tus ejercicios con máquina asistida.'),

    enCurso?.tutorial
      ? h('section', { class: 'tarjeta' },
        h('p', {}, 'Tienes a medias el entrenamiento de prueba del tutorial.'),
        h('div', { class: 'fila-botones' },
          h('a', { class: 'boton', href: `#/sesion/${enCurso.id}` }, 'Seguir con la prueba'),
          h('button', { class: 'boton secundario', onclick: () => estado.cambiar((x) => { x.sesiones = x.sesiones.filter((s) => s.id !== enCurso.id); }) }, 'Borrar la prueba')))
      : enCurso
      ? h('a', { class: 'boton grande', href: `#/sesion/${enCurso.id}` }, 'Continuar entrenamiento')
      : dia
        ? h('section', { class: 'tarjeta' },
          h('p', { class: 'suave' }, `${rutina.nombre} · ${toca.descansoHoy ? 'siguiente' : 'hoy toca'}`
            + (toca.motivo ? ` (${toca.motivo})` : '')),
          h('h2', {}, dia.nombre),
          h('p', { class: 'suave' }, dia.ejercicios.length
            ? dia.ejercicios.map((x) => d.ejercicios.find((e) => e.id === x.ejercicioId)?.nombre ?? '—').join(', ')
            : 'Este día no tiene ejercicios todavía'),
          avisoCuandoToca(d, rutina, dia),
          rutina.descripcion && h('details', { class: 'explicacion' },
            h('summary', {}, 'Por qué esta rutina es así y cómo se hace'),
            rutina.descripcion.split('\n\n').map((p) => enPuntos(p))),
          h('button', { class: 'boton grande', onclick: () => empezarConRutina(dia) }, toca.descansoHoy ? 'Empezar igualmente' : 'Empezar'),
          otras.length > 0 && h('p', { class: 'nota' }, 'Otras rutinas activas: ',
            otras.map((a, i) => [i > 0 && ' · ', h('a', { href: '#/', onclick: (e) => { e.preventDefault(); empezarConRutina(a.dia, a.rutina); } },
              `${a.rutina.nombre} (${a.dia.nombre})`)])),
          h('button', { class: 'boton secundario', onclick: elegirDia }, 'Otro día de la rutina'))
        : h('button', { class: 'boton grande', onclick: empezarSuelto }, 'Empezar entrenamiento'),
    !enCurso && dia && h('button', { class: 'boton enlace', onclick: empezarSuelto }, 'Entrenar sin rutina (elijo yo los ejercicios)'),

    !d.rutinas.length && cuestionarioHecho(d) && tarjetaRecomendacion(d),

    !activos.length && h('div', { class: 'tarjeta' },
      h('p', {}, 'Aún no tienes ejercicios. Puedes añadir una rutina prehecha (trae sus ejercicios) o crear el primero.'),
      h('div', { class: 'fila-botones' },
        h('a', { class: 'boton', href: '#/rutinas' }, 'Rutinas prehechas'),
        h('a', { class: 'boton secundario', href: '#/ejercicio/nuevo' }, 'Crear ejercicio'))),

    activos.length > 0 && !rutina && h('a', { class: 'boton enlace', href: '#/rutinas' },
      'Elegir o crear una rutina para que te diga qué toca cada día'),
    rutina && h('a', { class: 'boton enlace', href: '#/rutinas' }, 'Ver mis rutinas'),

    tarjetaSugerenciasAjuste(d),
    tarjetaRecuperacion(d, { compacta: true }),

    recientes.length > 0 && h('section', {},
      h('h2', {}, 'Últimos entrenamientos'),
      recientes.map((s) => resumenSesion(d, s))));
}
