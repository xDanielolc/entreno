# Encargo: bibliografía revisada (9 de octubre de 2026)

Viene de una investigación hecha fuera de la app («Fuerza e hipertrofia: qué dice la ciencia»), con auditoría de `web/js/bibliografia.js`. Esa conversación no tocó la app: deja este encargo para la próxima conversación de la app. Al terminarlo, borra el aviso de `CLAUDE.md` y marca la línea de `docs/pendientes.md`.

Todos los DOI están comprobados en Crossref. Si algún texto choca con una decisión ya tomada en la app, pregunta a Dan antes de cambiarlo.

## 1. Sustituir la bibliografía (decidido por Dan: entran todas las entradas)

- Copia `docs/bibliografia_propuesta.js` sobre `web/js/bibliografia.js`, quitando el comentario largo de la cabecera (lista de cambios A-L) o dejándolo resumido.
- Son 27 entradas: las 12 de antes corregidas (enlaces de consensus.app, editoriales y ResearchGate cambiados por `https://doi.org/…`, y diez matices de contenido) y 15 nuevas (cercanía al fallo y recámara, descanso, velocidad y tempo, recorrido y posición estirada, orden, programas con nombre, recuperación en horas, novatos y avanzados, variabilidad, progresión, descargas, calentamiento, técnicas de intensidad, proteína, OMS).
- Comprueba que la pantalla «Aprender» las pinta bien en 375 px (temas largos, listas de fuentes de hasta 7 elementos) y que ningún otro archivo importa algo que haya cambiado de nombre.
- Actualiza `Literatura/Artículos/Índice de artículos.md` con las fuentes nuevas (DOI en la propia entrada) y unifica Pelland como 2026.

## 2. Textos del método Bilbo en la app

Hallazgo de la investigación: Bilbo tiene **un** ensayo publicado. González-Alcázar FJ, Jiménez-Martínez P, Alix-Fages C, Ruiz-Ariza A, Casuso RA, Varela-Goicoechea J, García-Ramos A, Jerez-Martínez A (2025), *Applied Sciences* 15(4):1974, DOI 10.3390/app15041974. 26 powerlifters, 12 semanas. Solo cambiaba la primera serie de press de banca: 45-60 % del 1RM «con muy altas repeticiones» frente a 75-90 %, ambas a 4 repeticiones del fallo y a máxima velocidad; el resto del entrenamiento, idéntico. 1RM +8,4 % frente a +2,2 % (diferencia no significativa, p = 0,072); ventaja pequeña del grupo ligero en velocidad al 80 % y perímetro de brazo. Jesús Varela (creador del método) es coautor.

Qué hay que reflejar donde la app explique Bilbo (`web/js/vistas/glosario.js` entrada `bilbo`, `web/js/vistas/aprender.js` «Bilbo / incremento de peso lineal», filosofía de las rutinas en `web/js/plantillas.js` y cualquier «?» de la ficha del ciclo):
- Que hay un ensayo que prueba que una serie ligera y rápida sin llegar al fallo no perjudica el 1RM en entrenados, no que sea mejor, y que no prueba el ciclo completo.
- Que el 50 %, los 2,5 kg por sesión y el corte a 15 repeticiones son decisiones prácticas del método; los 2,5 kg no aparecen en ninguna fuente del método (las fuentes divulgativas dicen «subir peso cada sesión»).
- Que combinarlo con un 3×5 es una combinación práctica sin estudio: la parte con respaldo para el 1RM es la pesada.
- La plantilla PLPL dice que las series Bilbo van «sin cargar demasiado las articulaciones»: no hay estudio de eso; quitarlo o decirlo como opinión.

## 3. Datos que la app calcula mal (decidido por Dan: hacerlo igual que lo demás)

- **Fracción del peso corporal en flexiones** (`FRACCION_CORPORAL_POR_NOMBRE` en `web/js/esquema.js`). Ebben et al. 2011 (DOI 10.1519/JSC.0b013e31820c8587) midió: normal 64 %, rodillas 49 %, pies en cajón de 30 cm 70 %, de 61 cm 74 %, manos en cajón de 30 cm 55 %, de 61 cm 41 %. Hoy la app da 0,41 a «inclinada / manos en alto / pared» (solo vale para 61 cm) y 0,74 a «pica / pino», que el estudio no midió. Propuesta: manos en alto o inclinada 0,55 por defecto; pared, sin dato (dejar 0,41 avisando de que es una aproximación o preguntar); pica y pino, sin dato del estudio: avisar de que es una suposición. La estatura no influyó: quitar cualquier «varía con la longitud de brazos y piernas». Si cambia la fracción de datos guardados, hace falta migración (regla de `CLAUDE.md`).
- **«Epley» en los Excel**: la fórmula de las hojas de cálculo (1RM = carga × reps × 0,03 + carga) no es Epley, que es carga × (1 + reps / 30), es decir 0,0333. Donde la app o `CLAUDE.md` llamen «Epley» a la de los Excel, decir «variante de Epley con 0,03». En `CLAUDE.md`, sección «Cómo verificar», añadir esa precisión.

## 4. Otros puntos de la auditoría (pendientes de que Dan los apruebe)

No los ha decidido todavía: proponlos, no los hagas sin preguntar.
- `web/js/recuperacion.js`: la frase «el volumen total apenas cambia el tiempo» es de Morán-Navarro 2017 (DOI 10.1007/s00421-017-3725-7), no de Pareja-Blanco 2019; y las horas 36, 42 y 60 son interpolaciones de la app (los estudios miden a 6, 24, 48 y 72 h).
- Glosario y `recomendaciones.js`: «por encima de 20 series no se gana más» es falso; se gana poco más y sube la fatiga (Pelland 2026, DOI 10.1007/s40279-025-02344-w).
- `saltoAjustado()` en `calculos.js`: en Ozaki 2018 la última bajada llega al 30 % del 1RM, no al 30 % del peso de partida.
- Modo prueba del 1RM con 5-15 repeticiones: las ecuaciones aciertan más por debajo de 10 (Mayhew 2008, DOI 10.1519/JSC.0b013e31817b02ad); valorar «de 3 a 10».
- Aviso de la OMS: añadir «y fuerza 2 o más días por semana».
