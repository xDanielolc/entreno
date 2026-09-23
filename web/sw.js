// Service worker: permite abrir la app sin conexión.
//
// Estrategia «primero la red»: si hay internet se descarga siempre el código
// más reciente (así las actualizaciones llegan solas en cada visita) y se
// guarda una copia; sin internet se usa esa copia.
//
// Solo se ocupa del CÓDIGO de la app. Los datos del usuario nunca pasan por
// aquí: viven en el dispositivo (IndexedDB) y en su Google Drive.

const VERSION = '0.24.2';
const CACHE = `entreno-${VERSION}`;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './privacidad.html',
  './css/estilo.css',
  './iconos/icono.svg',
  './iconos/icono-192.png',
  './js/app.js',
  './js/almacen-local.js',
  './js/bibliografia.js',
  './js/calculos.js',
  './js/ciclos.js',
  './js/catalogo.js',
  './js/musculos.js',
  './js/recuperacion.js',
  './js/config.js',
  './js/drive.js',
  './js/esquema.js',
  './js/exportar.js',
  './js/formula1rm.js',
  './js/recomendaciones.js',
  './js/sedes.js',
  './js/plantillas.js',
  './js/modo-prueba.js',
  './js/imagenes.js',
  './js/series.js',
  './js/estado.js',
  './js/google-auth.js',
  './js/sincronizacion.js',
  './js/ui.js',
  './js/version.js',
  './js/vistas/ajustes.js',
  './js/vistas/bienvenida.js',
  './js/vistas/cuerpo.js',
  './js/vistas/descanso.js',
  './js/vistas/ejercicios.js',
  './js/vistas/graficas.js',
  './js/vistas/historial.js',
  './js/vistas/inicio.js',
  './js/vistas/instalar.js',
  './js/vistas/resumen-sesion.js',
  './js/vistas/rutinas.js',
  './js/vistas/selector-ejercicios.js',
  './js/vistas/sesion.js',
  './js/vistas/tecnicas.js',
  './js/vistas/tutorial.js',
  './js/vistas/aprender.js',
  './js/vistas/glosario.js',
  './js/vistas/intervalos.js',
  './js/vistas/cuestionario.js',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  const url = new URL(peticion.url);
  // Google (inicio de sesión y Drive) y cualquier otro dominio: sin tocar.
  if (peticion.method !== 'GET' || url.origin !== self.location.origin) return;

  evento.respondWith((async () => {
    try {
      // Con cobertura mala no se espera eternamente: a los 4 s se usa la copia.
      const respuesta = await fetch(peticion, { cache: 'no-cache', signal: AbortSignal.timeout(4000) });
      if (respuesta.ok) {
        const cache = await caches.open(CACHE);
        cache.put(peticion, respuesta.clone());
      }
      return respuesta;
    } catch {
      const guardada = await caches.match(peticion, { ignoreSearch: true });
      if (guardada) return guardada;
      if (peticion.mode === 'navigate') return caches.match('./index.html');
      throw new Error('Sin conexión y sin copia guardada');
    }
  })());
});
