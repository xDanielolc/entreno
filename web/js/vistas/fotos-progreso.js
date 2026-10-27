// Fotos de progreso: añadir, ver en grande, comparar dos y borrar. Las
// imágenes se guardan en el móvil y en tu Drive (web/js/fotos.js).

import { icono } from '../iconos.js';
import * as estado from '../estado.js';
import { anadirFoto, borrarFoto, direccionDe } from '../fotos.js';
import { ampliar, aviso, confirmar, fechaCorta, h, modal } from '../ui.js';

let comparando = null;   // id de la primera foto elegida para comparar

export function vistaFotos(contenedor) {
  const d = estado.datos();
  const fotos = (d.fotos ?? []).filter((f) => !f.borrada).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  const entrada = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      await anadirFoto(archivo);
      aviso(estado.esSinCuenta() ? 'Foto guardada en este dispositivo.' : 'Foto guardada. Se sube a tu Google Drive.');
    } catch (err) {
      aviso(`No se ha podido guardar la foto: ${err.message}`, { tipo: 'error' });
    }
  } });

  contenedor.append(
    h('section', { class: 'tarjeta centrado' },
      h('h2', {}, 'Fotos de progreso'),
      h('p', { class: 'nota' }, 'Consejo: hazte las fotos cada semana o cada dos, con la misma luz, la misma ropa y desde el mismo ángulo. '
        + 'Solo las ves tú: se guardan en el móvil y en la carpeta de la app de tu Google Drive.'),
      h('button', { type: 'button', class: 'boton con-icono', onclick: () => entrada.click() }, icono('camara'), 'Añadir foto'),
      entrada),
    fotos.length > 1 && h('p', { class: 'nota centrado' }, comparando
      ? 'Ahora toca la otra foto para compararlas.'
      : 'Mantén pulsada una foto (o toca «Comparar» en una) para ponerla al lado de otra.'),
    fotos.length
      ? h('div', { class: 'rejilla-fotos' }, fotos.map((f) => miniatura(f, fotos)))
      : h('p', { class: 'suave centrado' }, 'Aún no tienes fotos.'));
}

function imagen(f, clase) {
  const img = h('img', { class: clase, alt: `Foto del ${fechaCorta(f.fecha)}`, loading: 'lazy' });
  direccionDe(f).then((url) => {
    if (url) img.src = url;
    else img.replaceWith(h('span', { class: `${clase} sin-foto` }, f.driveId ? 'Conéctate a Google para verla' : 'No está en este móvil'));
  });
  return img;
}

function miniatura(f, todas) {
  const elegida = comparando === f.id;
  return h('button', { type: 'button', class: `miniatura-foto${elegida ? ' elegida' : ''}`,
    oncontextmenu: (e) => { e.preventDefault(); comparando = f.id; estado.emitir('vista'); },
    onclick: () => {
      if (comparando && comparando !== f.id) {
        const otra = todas.find((x) => x.id === comparando);
        comparando = null;
        estado.emitir('vista');
        comparar(otra, f);
        return;
      }
      abrir(f);
    } },
  imagen(f, 'foto'),
  h('span', { class: 'fecha-foto' }, fechaCorta(f.fecha)),
  !f.driveId && !estado.esSinCuenta() && h('span', { class: 'pendiente-foto', title: 'Aún no se ha subido a Drive' }, '↑'));
}

function abrir(f) {
  const nota = h('textarea', { rows: 2, placeholder: 'Nota (opcional): peso, cómo te ves, qué estabas haciendo…', value: f.nota ?? '',
    onchange: (e) => estado.cambiar((x) => { const y = x.fotos.find((z) => z.id === f.id); if (y) y.nota = e.target.value; }) });
  const cerrar = modal(fechaCorta(f.fecha), h('div', { class: 'detalle-foto' },
    h('button', { type: 'button', class: 'boton-imagen', 'aria-label': 'Ver en grande',
      onclick: () => ampliar(fechaCorta(f.fecha), () => imagen(f, 'imagen-grande')) }, imagen(f, 'foto-grande')),
    nota,
    h('p', { class: 'nota centrado' }, f.driveId ? 'Guardada también en tu Google Drive.' : estado.esSinCuenta()
      ? 'Guardada solo en este dispositivo (modo prueba).' : 'Se subirá a tu Google Drive en cuanto haya conexión.'),
    h('div', { class: 'fila-botones' },
      h('button', { type: 'button', class: 'boton secundario', onclick: () => { comparando = f.id; cerrar(); estado.emitir('vista'); } }, 'Comparar'),
      h('button', { type: 'button', class: 'boton peligro-contorno con-icono', onclick: async () => {
        if (!(await confirmar('¿Borrar esta foto?', { si: 'Borrar', peligro: true }))) return;
        await borrarFoto(f.id);
        cerrar();
        aviso('Foto borrada.');
      } }, icono('papelera'), 'Borrar'))));
}

function comparar(a, b) {
  const [antes, despues] = a.fecha <= b.fecha ? [a, b] : [b, a];
  const dias = Math.round((new Date(despues.fecha) - new Date(antes.fecha)) / 86_400_000);
  ampliar(`${dias} ${dias === 1 ? 'día' : 'días'} de diferencia`, () => h('div', { class: 'comparar-fotos' },
    h('figure', {}, imagen(antes, 'foto-grande'), h('figcaption', {}, fechaCorta(antes.fecha))),
    h('figure', {}, imagen(despues, 'foto-grande'), h('figcaption', {}, fechaCorta(despues.fecha)))));
}
