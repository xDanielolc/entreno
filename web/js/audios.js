// Catálogo de los audios de hipnosis que viajan con la app.
//
// Los archivos están en web/audios/ y se publican con el resto: así se abren
// de un toque en cualquier dispositivo, sin importar nada. El service worker
// los guarda la primera vez que suenan, de modo que la segunda noche ya no
// hace falta conexión.
//
// REGLA DEL EXPERIMENTO: entre las versiones de dormir solo cambia la
// inducción y la profundización. Los bloques de la sugestión del audio 2 no se
// volvieron a generar: son los MISMOS archivos de voz del 1, así que esa parte
// es idéntica latido a latido. Por eso se puede preguntar si el envoltorio
// influye con la sugestión constante. Si algún día se cambia la sugestión,
// será otra fase y habrá que marcarlo aquí.

export const AUDIOS = [
  {
    id: 'dormir-1',
    tipo: 'dormir',
    version: 1,
    nombre: 'Dormir 1 · el cuerpo y la escalera',
    descripcion: 'Repaso del cuerpo de arriba abajo y una escalera de piedra de diez escalones que baja al agua.',
    archivo: 'audios/dormir-1.mp3',
    duracion: 688,
    sugestion: [404, 587],
  },
  // El 2 se rehízo el 09-11-2026 porque no le gustó: la cuenta iba muy rápida y
  // sin silencios, y el «ojo de la mente» le resultó confuso. Ahora cuenta de
  // diez a uno con un número por trozo y unos ocho segundos entre ellos, y en
  // lugar del ojo de la mente hay una manta pesada. La sugestión sigue siendo la
  // misma grabación. El archivo cambia de nombre (dormir-2b) para que los
  // móviles que guardaron el viejo bajen el nuevo. OJO AL ANALIZAR: la noche del
  // 08 al 09-11-2026 sonó la versión vieja del 2, fuera de la app.
  {
    id: 'dormir-2',
    tipo: 'dormir',
    version: 2,
    nombre: 'Dormir 2 · la cuenta lenta y la manta',
    descripcion: 'Una cuenta de diez a uno, muy despacio, con silencio entre número y número; luego una habitación oscura y una manta pesada.',
    archivo: 'audios/dormir-2b.mp3',
    duracion: 568,
    sugestion: [285, 467],
  },
  {
    id: 'dormir-4',
    tipo: 'dormir',
    version: 4,
    nombre: 'Dormir 4 · el tren de noche',
    descripcion: 'Tumbado en la litera de un tren de noche: el balanceo, las ruedas, las luces que pasan y un túnel. No te pide nada.',
    archivo: 'audios/dormir-4.mp3',
    duracion: 588,
    sugestion: [305, 487],
  },
  {
    id: 'ilusiones-1',
    tipo: 'ilusiones',
    nivel: 1,
    nombre: 'Ilusiones · nivel 1',
    descripcion: 'Manos imantadas, calor en una mano, un grifo que gotea lejos y un resplandor de color. Sentado y despierto.',
    archivo: 'audios/ilusiones-1.mp3',
    duracion: 488,
  },
  {
    id: 'ilusiones-2',
    tipo: 'ilusiones',
    nivel: 2,
    nombre: 'Ilusiones · nivel 2',
    descripcion: 'El brazo que pesa tanto que no se levanta, frío en una mano, una radio al otro lado de la pared y un círculo quieto en lo oscuro.',
    archivo: 'audios/ilusiones-2.mp3',
    duracion: 448,
  },
];

export const audioPorId = (id) => AUDIOS.find((a) => a.id === id) ?? null;
export const audiosDe = (tipo) => AUDIOS.filter((a) => a.tipo === tipo);

// Minutos y segundos, para enseñar duraciones y marcas de tiempo.
export function reloj(segundos) {
  const s = Math.max(0, Math.round(segundos || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// A qué día del diario pertenece lo que suene AHORA.
//
// El diario apunta la noche en la entrada del día en que te LEVANTAS, así que
// un audio puesto a las 23:30 del lunes pertenece al martes, y uno puesto a la
// 1:00 del martes también. El corte está en las 17:00: antes de esa hora se
// entiende que es una escucha del mismo día (una siesta, una prueba), y a
// partir de ahí, la noche que empieza.
export function fechaDeLaNoche(ahora = new Date()) {
  const d = new Date(ahora);
  if (d.getHours() >= 17) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
