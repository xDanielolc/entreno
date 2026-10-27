# Dibujos que no salieron bien (repetir)
- press-declinado: Gemini dibuja el banco plano aunque se le pida declinado (2 intentos).
- dominadas-supinas: salen piernas sueltas junto a cada figura (borrador guardado como borrador-dominadas-supinas.jpg).
- curl-de-muneca: Gemini dibuja un curl de bíceps en la postura final y no lo corrige; se queda el muñeco de antes.
- subida-al-cajon: Gemini dibuja las dos fases iguales (un pie en el cajón) y no lo corrige.
- curl-nordico: la postura final sale a cuatro patas (cadera doblada), no con el cuerpo recto; no se usa.
- elevacion-de-tibiales: dibuja la postura final de puntillas (al revés); no se usa.
- plancha-copenhague: las dos figuras no son la plancha Copenhague (una de lado y otra boca abajo); no se usa.
- hiperextensiones: las dos posturas mal (los pies se sueltan y no baja el tronco); no se usa.
- press-arnold: la figura de inicio sale más pequeña que la final; no se usa.
- giros-rusos: sale con texto (INICIO/FINAL) y la figura reflejada; no se usa.
- posicion-hueca: sale una V (como la barca), no la posición hueca; no se usa.
- sentadilla-a-una-pierna: el pie de apoyo cambia de sitio entre las dos fases y no se puede encajar (borrador guardado).
- press-pallof: estira los brazos hacia el lado y no hacia delante; no se usa.
- rodillas-al-pecho: Gemini sube la misma pierna en las dos figuras (no se ve la alternancia).
- escaleras: Gemini lo dibujó con camiseta y zapatillas.
- estiramiento-de-lumbares-con-rodillas-al-pecho: una pierna estirada y la otra doblada de forma imposible.
- curl-invertido: se usa, pero Gemini pintó el pantalón relleno de negro; repetir cuando haya cupo.
- estiramiento-del-empeine: sale sentado de lado con una rodilla arriba, no sobre los talones.
- estiramiento-de-los-dedos-del-pie: sale en zancada de rodillas, no sentado sobre los talones (Gemini lo reconoce).
- rotacion-90-90: sale con las piernas cruzadas, no en 90/90.

## Revisión de Dan (21-10-2026, página «Dibujos de Entreno»)

Regla nueva: donde había un dibujo hecho por una persona (Everkinetic, wger) se queda ese
(`hecho_por_persona` en imagenes_ia.py) salvo que en la comparativa elija el nuevo
(`"usar": "ia"` en peticiones.json; `"usar": "antes"` fuerza el de antes). Comparativa:
https://claude.ai/artifact/KjxMo32vHkVN25pGW69Vdi (colección `comparar`).

Errores típicos de la IA (ya van en el texto de `peticion_ia.py`): el aparato cambia entre las dos
figuras (banco, barra, patas de la máquina), las placas no se mueven, aparecen poleas, los pies se
«teletransportan», la figura crece o encoge, el agarre cambia, nariz y orejas, poco músculo.
Gemini: 73 buenos de 126; ChatGPT: 1 de 10 (le tocaron las máquinas difíciles). Se usa Gemini.

Pendiente de la revisión:
- Animaciones de 4 fotogramas: curl alterno (un brazo y luego el otro; el curl normal queda con
  los dos), bicho muerto (los dos lados), mountain climbers (las dos piernas).
- Para los que salen «todo mal» (elevación de gemelos, de pie y sentado, extensión de cuádriceps,
  máquinas): adjuntar, además del estilo, una foto real del ejercicio en dos fases.
- Más definición muscular en casi todos (cruces en polea, dominadas con lastre…).
- Cara lisa de maniquí en todos: al final, después de la comparativa.
- Dominadas negativas: usar la dominada buena con la animación invertida.
- Zancadas hacia atrás: puede usar la animación de las zancadas.
- Extensión de tríceps sobre la cabeza: con los dos brazos y de frente.
- yoga-chaturanga: sale en plancha alta con los brazos estirados, no con los codos a 90 grados. Segundo intento (codos a 90 grados en mayúsculas): sigue casi estirado. Tercero (punto más bajo de una flexión): igual. Gemini no sabe dibujarla; queda el muñeco.
- yoga-rueda: sale boca abajo con la espalda arqueada, no boca arriba. Resuelto el 22-10 con una petición más detallada.
- yoga-oreja-a-la-rodilla: sale un puente, no las piernas por encima de la cabeza. Resuelto el 22-10 con una petición más detallada.
- yoga-sobre-los-hombros-sin-brazos: sale con las manos en la espalda (igual que la vela normal). Resuelto el 22-10 con una petición más detallada.
- yoga-grulla-lateral: sale de pie, sin la postura. Resuelto el 22-10 con una petición más detallada.
- yoga-tortuga-tumbada: sale sentado y encogido abrazando las rodillas, sin las piernas detrás de la nuca. Segundo intento (piernas de bufanda): postura imposible. Gemini no sabe; queda el muñeco.

## Comparativa del 22-10-2026 (sus 59 elecciones)

Aplicado: `"usar"` en peticiones.json según lo que eligió; los dibujos de IA que descartó (eligió el de
antes y no pidió conservar los dos) están en `imagenes-ia/descartes/`. El dibujo nuevo de fondos, solo
para «Fondos de tríceps» (`"sinAlias"`); el antiguo de asistidos pasa a «Fondos de pecho» (`OTRO_DIBUJO`).
Los dibujos de Everkinetic que venían cortados (piernas a medias) se completan con Gemini sin tocar lo
demás: `completo-<nombre del anim>.png` en gemini/, sustituyen al de antes donde se use.

Pendiente de lo que pidió:
- Conservar los dos como variantes (ejercicios nuevos en el catálogo): crunch inverso / elevación de
  piernas en el suelo; peso muerto rumano con mancuernas / peso muerto con mancuernas; encogimientos con
  y sin mancuernas; press de hombro unilateral / bilateral; jalón cerrado (el de antes) / abierto (el nuevo,
  corregirlo mucho); fondos de tríceps / fondos de tríceps en banco; crunch, curl martillo, elevaciones
  laterales, press cerrado y press francés (le gustan los dos).
- Teletransporte en dibujos de antes: abductores y aductores en máquina, elevación de piernas en el suelo,
  fondos en banco. En los nuevos que eligió: flexiones en pica, fondos de tríceps.
- Placas que no se mueven: aperturas de pecho (nuevo). Extensión de tríceps en máquina (nuevo): máquina que
  cambia de tamaño, placas, agarre, más músculo y línea gruesa; si no se arregla, volver al de antes.
- Dominadas: el nuevo, sin que el muñeco cambie de tamaño ni la barra se mueva; negativas = la dominada al
  revés; supinas: corregir la barra del nuevo.
- Prensa de piernas: animada al revés (debe moverse la persona y quedarse fija la máquina, o al revés: preguntar).
- Plancha lateral: la de antes por defecto y en la dinámica; en la estática, que no se mueva.
- Elevación de gemelos sentado: completar la máquina. Curl femoral sentado: el nuevo era de cuádriceps.
- Rehacer: elevaciones laterales en polea, flexiones en pino (la foto de referencia mostraba dos vistas, no
  dos fases), fondos asistidos (el de antes es de paralelas).
- Línea gruesa como la de Everkinetic en los de IA (crunch, elevaciones laterales).
- flexiones-en-pino (22-10, con la pared): en la segunda fase el cuerpo se inclina y los pies resbalan por la pared, y la pared cambia de distancia. Descartado.

## 27-10-2026 (rutinas de estirar de Dan)
- rotacion-90-90: otra vez con las piernas cruzadas (Gemini no entiende la Z de las dos piernas). Sigue el muñeco.
- rotacion-toracica-en-cuadrupedia: primero tres brazos; luego las dos posturas iguales. Sigue el muñeco.
- estiramiento-de-los-dedos-del-pie: otra vez de rodillas en zancada, no sentado sobre los talones. Sigue el muñeco.
- Sin intentar (misma familia, previsiblemente igual): estiramiento-del-empeine, flexion-y-extension-de-dedos-del-pie, rotacion-tibial-con-rodilla-flexionada. Probar con ChatGPT o con una foto de modelo.
- Truco que sí funcionó: si la IA inclina las dos cabezas al mismo lado, espejo de una figura entera (flexión lateral de cuello) o solo de la cabeza, centrada en el cuello (deslizamiento neural cervical).

## 27-10-2026 (noche): muñecos que faltaban
- tortuga-tumbada (Supta Kurmasana): Gemini dibuja la tortuga normal (Kurmasana) o posturas imposibles. Sigue el muñeco.
- tibial-con-disco: Gemini estira la rodilla en la segunda figura (no es solo el tobillo): se usa solo la primera, quieta.
- giros-rusos y giros-en-landmine: Gemini pinta la segunda figura en espejo entera (piernas y ancla incluidas): solo la primera, quieta.
- liberacion-con-rodillo: las dos figuras salieron iguales: quieta.
- press-pallof: la polea cambiaba de altura entre figuras: se usa solo la segunda (brazos estirados), quieta.
- press-arnold: el inicio es más un press de hombros (codos abiertos) que el de Arnold (codos delante de la cara).
- movilidad-de-muneca (ChatGPT): los dedos apuntan hacia delante, no hacia las rodillas.
- rotacion-tibial-con-rodilla-flexionada (ChatGPT): lleva dos flechitas junto al pie.
- Orejas: sentadilla-en-multipower y encogimientos-de-trapecio salieron con el trazo fino y gris al quitarlas (descartes/orejas-*): se quedan como estaban.
  deslizamiento-neural-cervical: al alisar las cabezas Gemini enderezaba la inclinación: se queda el de antes (las cabezas ya eran lisas).
- ChatGPT agotado hasta el 28-10 a las 22:44; Gemini (cuenta 1) hasta las 23:38 del 27-10.
