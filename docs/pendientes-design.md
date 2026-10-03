# Pendientes para Claude Design

Todo lo que es dibujo, estética o identidad de la app. Lo de código está en
`pendientes.md`. Los textos listos para pegar en Design están en
`encargo-para-design.md`.

Dan lo dijo así: «luego ya decoramos». Se hace cuando la app funcione bien.

---

## 1. El cuerpo (mapa de músculos)

- [ ] **Muñeco de lado**, además de frente y espalda: para los ejercicios a
      una pierna o un brazo, el hombro lateral y el cuello (3-10-2026).
- [ ] Abdomen en cuadraditos con la línea alba fina, hombro anterior más
      alto y tibial en lágrima: hechos a mano en la 0.39.0, provisionales.
      La línea clara del centro del tronco es del dibujo de wger: solo se va
      con un cuerpo nuevo.
- [ ] Antebrazo en dos (palma y nudillos): capas provisionales en la 0.39.0.
- [ ] Iconos pequeños del cuerpo para cada eje del gráfico «Equilibrio»,
      como los de Lyfta (cada uno con su zona en rojo).
- [ ] Gemelo y sóleo ya están separados con capas propias provisionales; que
      Design los dibuje bien.
- [ ] Que el dibujo aguante que el navegador lo invierta (ver «Lección» abajo).

## 2. Dibujos de técnica de los ejercicios

- [ ] **Uno para cada ejercicio del catálogo**, del estilo del de «Prensa de
      piernas»: figura en 3D, fondo blanco, músculos trabajados en rojo. Hay
      unas 100 imágenes para 300 ejercicios.
- [ ] Gemelos en multipower, prensa y tipo burro: desde la 0.38.0 llevan una
      imagen provisional (la de multipower es con barra libre).
- [ ] Pulir los 122 muñecos propios (`web/imagenes/munecos`) para igualarlos
      al estilo de wger.

## 3. Identidad y temas

- [ ] **Nombre e icono de la app.**
- [ ] Los seis temas: Fallout años 50, pixel art, arcano, heavy metal,
      terminal con toque Matrix y gimnasio ochentero.
- [ ] Los botones ‹ Ejercicio x de y › de abajo, al entrenar: funcionan pero
      no convencen de aspecto (2-10-2026).

---

## Lección: por qué los colores del cuerpo fallaron tres veces

Para que a Design no le pase lo mismo.

- El navegador del móvil de Dan (Ecosia) **oscurece las webs por su cuenta**
  y de paso **invierte los colores de las imágenes**: el negro pasa a blanco y el amarillo, que es un color claro,
  pasa a marrón. El rojo, el verde y el azul cambian poco, por eso solo
  fallaba el ámbar.
- El ordenador no hace eso. Por eso en el ordenador «se veía bien» y cada
  arreglo (más opaco, ámbar más claro, transparencia) no cambiaba nada en el
  móvil: el problema no eran los colores, era quién los repintaba.
- La salida (0.38.0, pendiente de confirmar en su móvil): pintar el mapa en
  un lienzo (`<canvas>`), que el navegador no debería tocar. Para Design: **el SVG del cuerpo no debe llevar colores**, y la
  silueta tiene que verse bien también invertida (gris medio, sin blancos ni
  negros puros de fondo).
- La cebra que no salía era otra cosa: «Ver las series» no es una tabla sino
  una lista de barras, y la cebra solo se había puesto en las tablas.
