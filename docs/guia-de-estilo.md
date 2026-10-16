# Guía de estilo de Entreno

Las normas visuales y de uso que valen para toda la app. Cualquier pantalla
nueva se hace con ellas; si una pantalla vieja no las cumple, es un fallo.
Están en `web/css/estilo.css` (tokens al principio) y en `web/js/iconos.js`.

## 1. Principios

1. **Móvil primero, una mano, mala luz.** Se diseña a 375 px. Todo lo que se
   toca mide 44 px o más (los botones principales, 48-60).
2. **Una cosa cada vez.** Lo que se configura va en preguntas de una en una:
   lo contestado queda en una línea («Recámara · 2 · Cambiar») y solo se abre
   la siguiente. Lo que tiene respuesta razonable viene ya contestado.
3. **Poco texto a la vista.** Una línea por cosa como mucho; la explicación,
   detrás de un «?».
4. **Botones y centrado.** Toda acción es un botón (nunca un enlace suelto) y
   todo va centrado: títulos, botones, tablas.
5. **La app decide por ti.** Pesos, objetivos y avisos los pone la app; tú
   apuntas lo que haces.

## 2. Color

- **Tinta** (`--acento`: negro en claro, blanco en oscuro) para la acción
  principal. Nada de azules ni otros colores de marca.
- **Verde, ámbar y rojo** (`--bien`, `--aviso`, `--mal` y `--mapa-*`) solo
  para estados: recuperación, superado o no, avisos. Nunca para decorar.
- Fondo papel cálido en claro (`--fondo`) y azul noche en oscuro; tarjetas en
  `--superficie`, sin borde en claro y con borde fino en oscuro.
- Las gráficas tienen su paleta propia (datos, no interfaz).
- Probar siempre en claro, oscuro y con el oscurecido forzado del navegador.

## 3. Tipografía

- **Manrope** (dentro de la app, va sin conexión). Títulos en 800, botones en
  700, texto en 400-500.
- Números tabulares (las columnas de kilos y repeticiones no bailan).
- **Sin cortes con guion** en ninguna parte: las palabras saltan enteras a la
  línea siguiente (`hyphens: manual`).

## 4. Iconos

- De trazo, 24 × 24, grosor 2, puntas redondas, del color del texto
  (`icono('nombre')` en `iconos.js`). Nunca emojis en botones.
- Excepciones a propósito: la escala de la mano (los emojis son la escala) y
  la copa del récord.
- Disponibles: inicio, cuerpo, ejercicios, historial, aprender, ajustes,
  marca, papelera, bocadillo, ojo, reloj, repetir, cerrar, bombilla,
  campana, aviso. Uno nuevo se dibuja con el mismo trazo.

## 5. Botones

| Tipo | Aspecto | Para |
|---|---|---|
| Principal | píldora de tinta, texto en negrita | lo que toca ahora (uno por pantalla) |
| Secundario | píldora con borde | alternativas |
| Discreto (`.boton.enlace`) | sin relleno | ver más, ir a otra parte |
| Peligro | rojo | borrar, cancelar el entreno |
| Marca (`.boton-marca`) | se queda marcado | elegir una opción |
| Chip | píldora pequeña | rangos, filtros, valores rápidos |

- Lo que se abre y se cierra es un **botoncito redondo** con «+» y «−»
  (nunca el triángulo del navegador). Los apartados grandes llevan «›».
- Elegir entre pocas cosas: botones que se quedan marcados, nunca un
  desplegable del sistema.

## 6. Carteles y avisos

- Los carteles suben desde abajo (hoja) en el móvil y salen centrados en
  pantalla grande. Se cierran con el icono de cerrar o tocando fuera.
- Los avisos salen abajo, en tinta, con «Deshacer» cuando se puede deshacer.
- Todo lo que se quita se puede recuperar (aviso con «Deshacer», o queda
  «sin usar»). Las pantallas de edición tienen «Deshacer los cambios».

## 7. Movimiento

- Corto y con intención (0,15-0,3 s). La presentación al abrir es la única
  animación larga (2,5 s) y se quita con un toque.
- Con «reducir movimiento» del móvil, sin animaciones (solo fundidos).

## 8. Imágenes de ejercicios

- Solo con licencia libre (CC-BY-SA de wger y Everkinetic) o dibujos propios,
  con su autor en los créditos. Las de webs comerciales no, aunque estén
  subidas a wger: el repositorio es público.
