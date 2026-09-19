# Encargo para Claude Design

Este archivo tiene dos cosas: el **texto listo para pegar** en Claude Design, y
abajo la explicación de por qué pide lo que pide, por si quieres cambiarlo.

---

## Texto para pegar (temas visuales)

> Estoy haciendo una app web de registro de entrenamientos, ya funcionando, en
> HTML, CSS y JavaScript sin librerías. Quiero que le des una identidad visual
> y que diseñes seis temas intercambiables.
>
> **Cómo está montada la app:** todos los colores salen de variables CSS
> declaradas en `:root`. Cambiar de tema es cambiar esos valores, nada más. Los
> nombres son estos y hay que mantenerlos:
>
> `--fondo`, `--superficie`, `--superficie-2`, `--borde`, `--texto`,
> `--texto-suave`, `--acento`, `--acento-texto`, `--acento-suave`,
> `--peligro`, `--bien`, `--mal`, `--aviso`, `--aviso-fondo`, `--sombra`,
> `--radio`, `--radio-pequeno`, `--alto-toque`, `--fuente`.
>
> **Los seis temas:**
> 1. **Años 50 tipo Fallout:** ámbar y verde oliva, aire de manual técnico antiguo.
> 2. **Pixel art:** colores planos, bordes duros, tipografía de bloques.
> 3. **Arcano:** morados profundos, dorado, aire de grimorio.
> 4. **Heavy metal:** negro, plata y rojo sangre, tipografía contundente.
> 5. **Terminal con toque Matrix:** verde fósforo sobre negro, monoespaciada, cursor.
> 6. **Gimnasio ochentero:** neones rosa y cian sobre azul noche.
>
> **Reglas que no se pueden romper:**
> - Se usa **en el gimnasio, con una mano y a veces con mala luz**: botones de
>   48 píxeles de alto como mínimo, texto de 16 píxeles o más en los campos
>   (si es menor, el móvil hace zoom solo), y contraste alto de verdad.
> - Los colores de estado (**verde recuperado, ámbar a medias, rojo cansado**)
>   tienen que distinguirse también para daltonismo, y no deben ser el único
>   indicador: siempre van con texto al lado.
> - Todo tiene que seguir siendo legible en claro y en oscuro.
> - Nada de imágenes externas ni fuentes de pago: fuentes del sistema o de
>   Google Fonts.
>
> **Pantallas que hay que vestir:** inicio («hoy toca X»), entrenamiento en
> curso (tarjetas de ejercicio con casillas grandes de peso y repeticiones),
> ficha de ejercicio con gráficas, mapa del cuerpo con músculos coloreados,
> historial y ajustes.
>
> Dame el bloque de variables CSS de cada tema y una muestra de cómo quedaría
> la pantalla de entrenamiento con dos de ellos.

---

## Texto para pegar (dibujo del cuerpo, solo si hace falta)

> Necesito una ilustración del cuerpo humano en SVG, de frente y de espaldas,
> pensada para colorear cada músculo por separado según lo recuperado que esté.
> Estilo limpio y plano, de app moderna, no una lámina de anatomía.
>
> Requisitos técnicos:
> - Dos SVG (frente y espalda) en el mismo lienzo y a la misma escala, de forma
>   que las dos siluetas se puedan poner una al lado de la otra.
> - Cada músculo, un grupo `<g>` con un identificador exacto de esta lista:
>   `cuello`, `trapecio`, `hombro` (deltoides anterior y lateral),
>   `hombroPosterior`, `pecho`, `biceps`, `triceps`, `antebrazo`, `abdomen`,
>   `oblicuos`, `dorsal`, `lumbar`, `gluteo`, `abductores` (glúteo medio),
>   `cuadriceps`, `aductores`, `isquios`, `gemelo`, `tibial`.
> - Los músculos simétricos incluyen los dos lados dentro del mismo grupo.
> - Sin colores fijos: los rellenos deben usar `fill="currentColor"` o una
>   variable CSS, para poder pintarlos desde la app.
> - El cuerpo de fondo, en un grupo aparte llamado `silueta`.
> - Sin texto, sin degradados, sin filtros: solo trazados.
>
> Defectos del dibujo actual (wger) que conviene evitar: la silueta de frente
> tiene un hueco claro en el centro del pecho, y no está centrada exactamente
> (el cuello queda 1,5 px a la derecha del eje), lo que obliga a desplazar
> capas a mano.

---

## Por qué pide esto

- **Las variables.** La app ya está escrita contra esos nombres. Si Design
  devuelve otros, hay que traducirlos a mano; si mantiene estos, un tema nuevo
  es pegar un bloque en `web/css/estilo.css` y añadirlo al selector de temas.
- **48 píxeles y 16 píxeles.** Son las medidas mínimas recomendadas para tocar
  con el dedo y para que el navegador del móvil no amplíe la pantalla al
  escribir. Ya están así en la app.
- **El daltonismo.** El mapa del cuerpo usa color para decir si un músculo está
  recuperado. Los colores actuales están comprobados con un validador; los
  nuevos deberían pasar lo mismo.
- **Los identificadores del SVG.** La app busca cada músculo por ese nombre
  exacto. Si cambian, no se pinta nada.

Mientras tanto, el mapa usa la silueta de wger (Creative Commons BY-SA), que
funciona y es legal, así que el dibujo propio es una mejora, no una urgencia.
