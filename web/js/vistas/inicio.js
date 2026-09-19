import * as estado from '../estado.js';
import { sedeInicial } from '../sedes.js';
import { barraModoPrueba } from '../modo-prueba.js';
import { crearSerieDesdePlan } from '../series.js';
import { anadir, fechaLarga, h, hoyISO, modal, nuevoId } from '../ui.js';
import { tarjetaRecuperacion, tarjetaSugerenciasAjuste } from './cuerpo.js';
import { tarjetaInstalar } from './instalar.js';
import { elegirNivel, nivelTutorial, pista } from './tutorial.js';
import { cuentaParaFatiga } from '../catalogo.js';
import { nombreMusculo } from '../musculos.js';
import { recuperacionPorMusculo } from '../recuperacion.js';

let preguntandoTutorial = false;
import { masRecienteAntes, resumenSesion } from './historial.js';
import { empezarDia, proximoDia, rutinaActiva } from './rutinas.js';

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

export function vistaInicio(contenedor) {
  const d = estado.datos();
  const enCurso = d.sesiones.find((s) => s.estado === 'en-curso' && !s.borrada);
  const activos = d.ejercicios.filter((e) => !e.archivado);
  const recientes = d.sesiones.filter((s) => s.estado === 'terminada' && !s.borrada)
    .sort(masRecienteAntes).slice(0, 3);
  const necesitaPeso = d.perfil.pesoCorporalKg == null
    && activos.some((e) => ['asistida', 'pesoCorporal'].includes(e.carga.tipo));
  const rutina = rutinaActiva(d);
  const dia = rutina ? proximoDia(d, rutina) : null;

  // Primera vez: ¿cuánto tutorial quieres? (no encima de otro cartel)
  if (nivelTutorial(d) == null && !preguntandoTutorial) {
    preguntandoTutorial = true;
    setTimeout(() => {
      if (document.querySelector('.modal-fondo')) { preguntandoTutorial = false; return; }
      elegirNivel({ alElegir: () => { preguntandoTutorial = false; } });
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

  function empezarConRutina(elegido) {
    const id = empezarDia(rutina, elegido, (datos, ej, plan) => crearSerieDesdePlan(datos, ej, plan));
    location.hash = `#/sesion/${id}`;
  }

  function elegirDia() {
    const cerrar = modal('Elegir día', h('div', { class: 'lista-eleccion' },
      rutina.dias.map((x) => h('button', { class: 'tarjeta fila-enlace', onclick: () => { cerrar(); empezarConRutina(x); } },
        h('div', {},
          h('strong', {}, x.nombre),
          h('div', { class: 'suave' }, `${x.ejercicios.length} ejercicios`)),
        x.id === dia.id && h('span', { class: 'etiqueta' }, 'Toca hoy')))));
  }

  anadir(contenedor,
    estado.esSinCuenta() && barraModoPrueba(),
    h('p', { class: 'fecha-hoy' }, fechaLarga(hoyISO())),
    h('h1', {}, d.perfil.nombre ? `Hola, ${d.perfil.nombre}` : 'Hola'),
    pista('hoy', 'Aquí ves qué toca hoy según tu rutina y cómo va tu recuperación. Abajo: Cuerpo (mapa y volumen), '
      + 'Ejercicios, Historial y Ajustes.'),

    necesitaPeso && h('a', { class: 'tarjeta aviso-tarjeta', href: '#/ajustes' },
      'Indica tu peso corporal en Ajustes: lo necesitan tus ejercicios con máquina asistida.'),

    enCurso
      ? h('a', { class: 'boton grande', href: `#/sesion/${enCurso.id}` }, 'Continuar entrenamiento')
      : dia
        ? h('section', { class: 'tarjeta' },
          h('p', { class: 'suave' }, `${rutina.nombre} · hoy toca`),
          h('h2', {}, dia.nombre),
          h('p', { class: 'suave' }, dia.ejercicios.length
            ? dia.ejercicios.map((x) => d.ejercicios.find((e) => e.id === x.ejercicioId)?.nombre ?? '—').join(', ')
            : 'Este día no tiene ejercicios todavía'),
          avisoCuandoToca(d, rutina, dia),
          h('button', { class: 'boton grande', onclick: () => empezarConRutina(dia) }, 'Empezar'),
          h('div', { class: 'fila-botones' },
            h('button', { class: 'boton secundario', onclick: elegirDia }, 'Otro día'),
            h('button', { class: 'boton secundario', onclick: empezarSuelto }, 'Sin rutina')))
        : h('button', { class: 'boton grande', onclick: empezarSuelto }, 'Empezar entrenamiento'),

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
    tarjetaInstalar(),

    recientes.length > 0 && h('section', {},
      h('h2', {}, 'Últimos entrenamientos'),
      recientes.map((s) => resumenSesion(d, s))));
}
