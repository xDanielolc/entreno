# Pendientes de código (Claude Code)

Lo de dibujo y estética está aparte, en `pendientes-design.md`.

Todo lo que está hablado y aún no está hecho. Se anota aquí en cuanto se
decide, aunque no toque hacerlo ahora: es la memoria del proyecto, para que
nada se quede solo en una conversación.

Orden: primero lo que impide usar la app con gusto, después lo que la mejora,
y al final lo que es decoración o depende de terceros.

---

## 1. La app funcionando en condiciones

Es lo primero. Dan lo dijo así el 23-09-2026: *«Me rindo con el tutorial hasta
que la app funcione en condiciones. Centrémonos en eso»*.

- [ ] **Probar de verdad un ciclo entero** con la ficha nueva: que los cuatro
      bloques abarquen todo lo que él tiene apuntado.
- [ ] **Que las demás medidas (distancia, tiempo) puedan mandar en la
      progresión**, no solo tener objetivo del día. Hoy la escalera del ciclo
      la hace el peso o la medida principal.
- [x] Partir un ejercicio en dos variantes (0.24.1).
- [x] Ventana de Google: ya no se abre sola nunca (0.24.1). Queda comprobar en
      el móvil que el cartel con el botón «Renovar» sí la deja abrir.
- [x] Borrar los intervalos guardados (0.24.0).

### Lista del 3-10-2026 (tras probar la 0.37)

- [ ] **Probar borrar un ejercicio** (Dan): que no desaparezca de los
      entrenamientos pasados, recuperarlo en Ajustes y ver que vuelve bien.
- [ ] **Confirmar en su móvil los colores del cuerpo** pintados en lienzo
      (0.38.0). Si siguen saliendo marrones, el lienzo tampoco se libra del
      oscurecido de Ecosia y habrá que buscar otra vía.
- [ ] **Antebrazo en dos** (flexores, cara de la palma; extensores, cara de
      los nudillos): músculos nuevos en `musculos.js`, repartir los ejercicios
      del catálogo y migrar los que digan «antebrazo». Espera a decidirlo con
      Dan y al dibujo de Design.
- [ ] **Opción unilateral** en «Ajustes finos» del ejercicio (a una pierna o
      un brazo), cuando exista el muñeco de lado.
- [ ] Exportar a las hojas de Drive los comentarios por serie y del
      entrenamiento (pendiente de que Dan diga si los quiere).
- [ ] Renovador de Cloudflare: Dan lo crea con `docs/cloudflare.md` y me pasa
      la dirección; antes, pasar la app a «En producción» en Google.

- [ ] **Revisar cómo se apuntan las demás técnicas de alta intensidad**
      (rest-pause, miorrepeticiones, isométrico final, excéntricas lentas,
      unilateral). A Dan no le convence del todo cómo se apuntan, aunque le
      falta probarlas. Pedido el 25-09-2026.
- [ ] **Mirar las apps Lyfta y Hevy** y apuntar qué cosas suyas merecería la
      pena traer aquí. Pedido el 25-09-2026.
- [ ] **Más visual, más intuitivo, menos texto.** Repaso general de la ficha
      del ejercicio y del entrenamiento con ese criterio (25-09-2026: «falta
      pulir y que sea más visual, intuitivo, con menos texto, más sencillo»).
- [x] Drop set: por defecto X−1 (Fink 2018); Ozaki (1 + media por bajada) queda
      como opción en Ajustes y Aprender. Decidido el 27-09-2026.
- [x] «Máximo trabajo»: suelo del 30 % del 1RM (0.27.0).
- [x] Ejercicios antiguos en «solo apuntar»: se quedan así (va a borrar sus
      datos de prueba al empezar de verdad).

### Lista del 27-09-2026 (mensaje largo tras probar la 0.28)

Hoy
- [x] «Entrenar sin rutina» pegado a recuperación: separarlo.
- [x] Recuperación de Hoy: el porcentaje a la derecha de la palabra no es estético.
- [x] Quitar la fecha de arriba y la lista de ejercicios del día.
- [x] «Por qué esta y no otra» y «por qué es así» dentro de un «Más info» plegado, al final.
- [x] «Otras rutinas activas»: botón como los demás, debajo del recuadro junto a
      «Entrenar sin rutina» y «Ver rutinas».

Cuerpo
- [x] Recomendaciones: hacerlo visual. Tres botones sobre el mismo dibujo del
      cuerpo: recuperación, qué necesita más entrenamiento esta semana, qué
      sueles entrenar menos (dos meses). Minileyenda en el recuadro.
- [x] «Mi ritmo de recuperación» → «Ajustar ritmo de recuperación»; en cada
      músculo, además del multiplicador, «Automático» con el multiplicador que
      sale de sus entrenamientos. Descripción plegada.
- [x] «Series por músculo en los últimos 7 días»: series como x/6, objetivos
      ajustables a mano; ordenados de más a menos; colores rojo-amarillo-verde,
      y al pasarse vuelve a amarillo y luego rojo (avisar, sobre todo si no se
      recupera). Explicación corta en viñetas y plegada; barras plegadas; sin
      «vas corto» ni «no has entrenado».
- [x] «De dónde salen estos números» debe abrir la explicación, no solo Ajustes.

Ejercicios
- [x] Abrir por defecto en «solo imagen».
- [x] Salir de un ejercicio a medias sin perder lo editado.
- [x] Gráfica: quitar «C1» del dibujo (dejarlo en la leyenda). Poder ver solo
      ciclos o todo el historial, informes y tendencia del 1RM.
- [x] «Altura o distancia»: no llamarlo salto; unidad elegible (km, m, cm).
      Si marca altura, que no salga el peso en cm: opciones propias por medida.
- [x] Pesos de máquina: avisar de que sin «Generar lista» se usa primero-último
      con los saltos.
- [x] Peso corporal: referencias de cuánto suele pesar cada cosa, en viñetas.
- [x] «Qué apuntas en cada serie además del peso» en una línea; la explicación
      corta bajo el título (0.30).
- [x] Unificar «qué apuntas» (0.33.0, a prueba: si no convence, volver a v0.32.0).
- [x] «Consejos» fuera de Cuerpo: como mucho dos avisos en Hoy, que se
      cierran con la ✕ (vuelven la semana siguiente si siguen pasando); el
      estancamiento de un ejercicio sale en su Progreso (0.33.2).
- [ ] Google Play: cuando a Dan le guste la estética y estén los pendientes.
      De momento, instalada desde Ecosia.
- [x] Botones de corte («llegas a tantas» / «te salen tantas»): reescribir como
      máximo o mínimo que corta.
- [x] Progreso y «cómo suelo programarlo» por separado: poder elegir qué ver.
- [x] Grupo del ejercicio: sigue saliendo «Anterior / Siguiente» (desplegables:
      revisarlo en toda la app).
- [x] Papelera de la serie: en el móvil sale debajo del título, no en la esquina.
- [x] Al modificar un ejercicio: ver todo, ver el informe de progreso o que la
      app guíe pregunta a pregunta.
- [x] Drop set: no deja marcar solo pesos fijos de máquina.
- [x] Tarjeta la primera vez: «Marca lo que quieres que suba sesión a sesión…».
- [x] Por dónde empieza la primera serie: opción «No lo sé» (prueba de 1RM), y
      mismas opciones para la primera y para las siguientes. Quitar «% del
      último valor».
- [x] Botón «hacer prueba» para dejar el 1RM apuntado.
- [x] Explicar fuerza (técnica y repeticiones con carga) e hipertrofia (carga
      mecánica con poca fatiga) con un metaanálisis; una línea en el «?» y más
      en Aprender.
- [x] Filtros plegados en el buscador.

Historial
- [x] Al abrir un día, resumen; editar solo con un botón.
- [x] Buscador y filtros: día, rutina, tipo, ejercicio, músculo.

Ajustes y general
- [x] Política de privacidad en un botón aparte.
- [x] Flecha de volver arriba abajo a la derecha, sin tapar pestañas ni botones.
- [x] Créditos solo en Aprender, no bajo cada imagen.

## 2. Tutorial y explicaciones

Aparcado por decisión suya hasta que lo de arriba esté. No se tira nada de lo
hecho; se retoma entero cuando toque.

- [ ] Revisar el orden y los textos de las tres guías con la app ya estable.
- [ ] Repasar **todas** las descripciones de las progresiones contrastándolas
      con las fuentes (libros, artículos, guías). Solo está hecho lo de Bilbo.
- [ ] Decidir si los «?» del glosario quedan como están.

## 3. Imágenes y estética

Pasado a `pendientes-design.md`. Se deja aquí lo que ya había, como historia.

- [ ] Los botones ‹ Ejercicio x de y › de abajo, al entrenar: funcionan pero no
      convencen de aspecto (2-10-2026).

- [ ] **Dibujos de técnica para todos los ejercicios**, del estilo del que hay
      en «Prensa de piernas»: figura anatómica en 3D, fondo blanco, músculos
      trabajados en rojo. Hay 97 imágenes para 300 ejercicios del catálogo. Las
      que faltan hay que encargarlas a Claude Design (ver
      `encargo-para-design.md`). Ojo con la licencia: las de wger y Everkinetic
      son CC-BY-SA y se citan; las nuevas serían propias. Gemelos en
      multipower, prensa y burro: sin imagen, la que tomaban prestada no
      se correspondía (2-10-2026).
- [ ] **Nombre e icono de la app**, y los seis temas del encargo de Design
      («luego ya decoramos»).

## 4. Cosas de Dan, fuera del código

- [ ] Publicar la app en la consola de Google (quitar el aviso de «app sin
      verificar»). Ver `google-cloud.md`.

---

## Preguntas abiertas

- ¿Una serie de calentamiento debe contar para la recuperación? Hoy no cuenta.
  Con 5 o 6 repeticiones de recámara y un 20 % del 1RM la fatiga es pequeña,
  pero no es cero. Pendiente de decidir con las fuentes delante.
- ¿Hasta dónde llega la app web? Dan preguntó si esto podrá ser «una app
  genuina» algún día. Respuesta corta: sí, y sin rehacerla (ver la nota en
  CLAUDE.md). Queda anotado por si algún día quiere darle ese paso.
