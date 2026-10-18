# Guía de estilo de Entreno

Versión 2 (17-10-2026). Cómo se ve, se mueve y habla la app. Cualquier
pantalla nueva se hace con estas normas; si una vieja no las cumple, es un
fallo que hay que arreglar.

- **Guía viva:** abre `#/guia-estilo` en la app. Enseña cada color, tipo,
  botón, icono y componente con los estilos de verdad, en claro u oscuro.
- **Código:** las variables (tokens) están al principio de
  `web/css/estilo.css`; los iconos, en `web/js/iconos.js`.

## 1. Principios

1. **Una mano y mala luz.** Se diseña a 375 px de ancho. Todo lo que se toca
   mide 44 px o más; los botones principales, de 48 a 60 px.
2. **Una cosa cada vez.** Lo que se configura va en preguntas de una en una.
   Lo contestado queda en una línea («Recámara · 2 · Cambiar») y solo se
   abre la siguiente pregunta. Lo que tiene una respuesta razonable viene ya
   contestado.
3. **Poco texto.** Una línea por cosa como mucho; lo largo, detrás de un «?».
4. **Botones y centrado.** Toda acción es un botón, nunca un enlace suelto.
   Títulos, botones y tablas van centrados.
5. **La app decide por ti.** Pesos, objetivos y avisos los pone la app; tú
   apuntas lo que haces.
6. **Un número, una vez.** Cada dato sale en un solo sitio y con un solo
   valor (el 1RM del ejercicio, en su cabecera); nada de repetirlo en cada
   fila con cifras distintas.
7. **Sin zoom.** La página no se amplía con dos dedos; lo que de verdad
   necesita verse en grande (el mapa del cuerpo) se abre grande al tocarlo.

## 2. Color

Dos temas: claro (papel) y oscuro (noche). Los nombres son los de la paleta;
entre paréntesis, la variable CSS.

### Marca

| Nombre | Claro | Oscuro | Para qué |
|---|---|---|---|
| Tinta (`--acento`) | `#15171C` | `#F2F3F6` | La acción principal: botón principal, pestaña activa, marca |
| Tinta fuerte (`--acento-fuerte`) | `#000000` | `#FFFFFF` | Parte baja del degradado del botón principal |
| Sobre tinta (`--acento-texto`) | `#FFFFFF` | `#0E1014` | El texto encima de un botón principal |
| Tinta suave (`--acento-suave`) | `#E8E6E0` | `#2A2F39` | Lo marcado: opción elegida, chip activo, sugerencia |

### Superficies y texto

| Nombre | Claro | Oscuro | Para qué |
|---|---|---|---|
| Papel / Noche (`--fondo`) | `#F3F2ED` | `#0E1014` | Fondo de la app |
| Tarjeta (`--superficie`) | `#FFFFFF` | `#171A20` | Tarjetas y carteles |
| Arena / Pizarra (`--superficie-2`) | `#EBE9E3` | `#21252D` | Campos, filas dentro de tarjetas |
| Borde (`--borde`) | `#E1DFD8` | `#2B303A` | Separadores y bordes finos |
| Texto (`--texto`) | `#15171C` | `#EEF0F4` | Todo lo que se lee |
| Texto suave (`--texto-suave`) | `#5F6470` | `#9AA1AD` | Notas, etiquetas, lo secundario |

### Estados (solo para estados, nunca para decorar)

| Nombre | Claro | Oscuro | Para qué |
|---|---|---|---|
| Verde (`--bien`) | `#1E8F57` | `#5FD38E` | Superado, recuperado, hecho |
| Ámbar (`--aviso`) | `#96600A` | `#FFD47A` | Atención, a medias, prueba de 1RM |
| Ámbar suave (`--aviso-fondo`) | `#FFF2D2` | `#33301F` | Fondo de avisos y pistas |
| Rojo (`--mal`, `--peligro`) | `#C0392B` | `#FF8A7E` | No superado, peligro, borrar |

### Mapa del cuerpo (iguales en los dos temas)

| Nombre | Valor | Para qué |
|---|---|---|
| Recuperado (`--mapa-verde`) | `#23824A` | Músculo listo |
| A medias (`--mapa-ambar`) | `#E8A317` | Recuperándose |
| Tocado (`--mapa-rojo`) | `#B3261E` | Aún cansado |
| Te pasas (`--mapa-azul`) | `#2F6FD0` | Más series que tu objetivo |
| Te pasas mucho (`--mapa-morado`) | `#7C4DD8` | Muy por encima del objetivo |

### Gráficas (datos, no interfaz)

Azul `#2A78D6`, naranja `#EB6834`, verde `#1BAF7A`, ámbar `#EDA100` (en
oscuro, algo más vivos). Solo dentro de las gráficas.

### Reglas de color

- Un solo color de acción: la tinta. Nada de azules ni otros colores de
  marca en botones.
- El verde, el ámbar y el rojo siempre van con texto al lado (también se
  entienden sin distinguir colores).
- Contraste mínimo 4,5:1 para el texto (los pares de arriba lo cumplen).
- Probar siempre en claro, en oscuro y con el oscurecido forzado del
  navegador (Ecosia invierte imágenes).

## 3. Tipografía

**Manrope** (licencia OFL, dentro de la app, va sin conexión). Números
tabulares en todas partes. **Sin cortes con guion**: las palabras saltan
enteras a la línea siguiente.

| Uso | Tamaño | Peso | Interlineado |
|---|---|---|---|
| Título de pantalla (h1) | 28 px | 800 | 1,15 |
| Título de sección (h2) | 17,6 px | 700 | 1,3 |
| Texto | 16 px | 400 | 1,45 |
| Etiqueta de campo | 14,7 px | 600 | 1,3 |
| Nota | 14,4 px | 400 | 1,4 |
| Casilla de la serie (número) | 20 px | 700 | 1 |
| Botón | 16 px | 700 | 1,2 |

Las casillas de texto, siempre a 16 px o más (si no, el móvil hace zoom).

## 4. Espacio y forma

- **Rejilla de 4 px:** 4, 8, 12, 16, 24 y 32.
- Margen lateral de la pantalla: 16 px. Entre tarjetas: 12 px. Dentro de una
  tarjeta: 16-18 px.
- **Radios:** 12 px campos y filas (`--radio-pequeno`), 18 px tarjetas
  (`--radio`), 22 px hojas (carteles), 999 px botones y chips.
- **Sombras:** `--sombra` para tarjetas (en oscuro, solo un filo de luz) y
  `--sombra-alta` para carteles.

## 5. Componentes

| Componente | Aspecto | Cuándo |
|---|---|---|
| Botón principal | píldora de tinta, texto en 700 | lo que toca ahora (uno por pantalla) |
| Botón secundario | píldora con borde | alternativas |
| Botón discreto | sin relleno | ver más, ir a otra parte |
| Botón de peligro | rojo | borrar, cancelar el entreno |
| Botón marcado | se queda marcado en tinta suave | elegir una opción entre pocas |
| Chip | píldora pequeña | rangos, filtros, valores rápidos |
| Desplegable | botoncito redondo con «+» / «−» | explicaciones y detalles |
| Apartado | fila grande con «›» | secciones de Ajustes y Aprender |
| Tarjeta | blanca, sin borde en claro | cada bloque de contenido |
| Sugerencia | tinta suave con filo a la izquierda | lo que toca hoy en una serie |
| Insignia | píldora ámbar en mayúsculas | «Prueba de 1RM» |
| Pista | ámbar suave con bombilla y cierre | ayudas que salen una vez |
| Respuesta | fila con pregunta, valor y «Cambiar» | lo ya contestado en un asistente |
| Hoja | cartel que sube desde abajo | elegir, confirmar, ver detalles |
| Aviso | píldora de tinta abajo, con «Deshacer» | confirmar lo hecho |
| Barra del entreno | fija abajo, translúcida; en el móvil sustituye a las pestañas | añadir ejercicio, «⋯», siguiente, terminar |

- Nunca un desplegable del sistema (`<select>`): botones marcados o una hoja.
- Todo lo que se quita se puede recuperar («Deshacer» o «sin usar»), y las
  pantallas de edición tienen «Deshacer los cambios».

## 6. Iconos

De trazo, 24 × 24, grosor 2, puntas y uniones redondas, del color del texto
(`icono('nombre')`). Nunca emojis en botones; excepciones a propósito: la
escala de la mano y la copa del récord. Hay: inicio, cuerpo, ejercicios,
historial, aprender, ajustes, marca, papelera, bocadillo, ojo, reloj,
repetir, cerrar, bombilla, campana y aviso. Uno nuevo se dibuja con el
mismo trazo.

## 7. Movimiento

- Corto y con intención: 0,15-0,3 s, con salida suave.
- Los carteles suben desde abajo en el móvil; las tarjetas del entreno se
  deslizan de lado.
- La presentación al abrir es la única animación larga (2,5 s) y se quita
  con un toque.
- Con «reducir movimiento» del móvil, solo fundidos.

## 8. Imágenes

- **Ejercicios:** solo libres (CC-BY-SA de wger y Everkinetic) o propias,
  con su autor en los créditos. Animadas en dos posturas (inicio y final).
  Las de webs comerciales no, aunque estén en wger.
- **Temas previstos:** «Cartoon» (por defecto: dibujos de línea simpáticos,
  también el muñeco del cuerpo) y «Anatómico» (figura gris con los músculos
  en rojo, como la guía de Ángel7Real). Encargo en
  `docs/encargo-para-design.md`.

## 9. Cómo se escribe

- Español de España y de tú: «Pon un peso», «Haz todas las que puedas».
- Frases cortas; nada de jerga sin su «?».
- La app propone, no exige ni riñe: «Hoy 90 kg × 4», no «Tienes que hacer…».
- Los números con coma decimal y espacio antes del %: «82,5 kg», «77 %».
