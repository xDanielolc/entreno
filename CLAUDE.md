# Entreno: contexto para Claude Code

App web instalable (PWA) de registro de entrenamientos. Ver `README.md` para
la estructura y `docs/esquema-datos.md` para el formato de los datos.

## Con quién trabajas

- El propietario no es programador. Explica cada término técnico nuevo en una
  línea la primera vez. Español de España (RAE).
- Termina cada respuesta con un resumen breve y las decisiones pendientes
  numeradas.
- Ciclo: él propone, se construye, lo prueba en uso real, devuelve
  observaciones concretas. No adelantes trabajo grande sin que haya probado.
- Hay notas privadas (rutas de su ordenador, cuentas) en
  `datos-privados/notas.md`, fuera de Git. Léelas al empezar.

## Decisiones tomadas (no reabrir sin motivo)

- JavaScript sin compilación ni dependencias: lo que hay en `web/` es lo que
  se publica. Sin Node.
- Datos: primero en el dispositivo (IndexedDB) y sincronizados con un JSON en
  el Google Drive de cada usuario, permiso `drive.file`. Sin servidor propio.
- Esquema versionado: cualquier cambio de forma de los datos sube
  `VERSION_ACTUAL` en `web/js/esquema.js` y añade una migración. Nunca se
  modifica una migración publicada.
- Colores solo mediante variables CSS: el diseño y los temas (claro, oscuro y
  4 o 5 más) se harán después en Claude Design.
- Repositorio **público** (GitHub Pages gratis): nada personal en el código,
  la documentación ni los commits. El autor de Git es la dirección noreply.

## Publicar

Subir la versión en `web/js/version.js` y en `web/sw.js` (deben coincidir),
commit y `git push`. GitHub Actions publica `web/` en
https://xdanielolc.github.io/entreno/.

## Cómo verificar

- `Probar la app en el ordenador.bat` sirve la app en http://localhost:8000
  (origen autorizado en Google Cloud).
- El navegador integrado de Claude no admite service workers: compruébalos en
  Chrome.
- Los cálculos Bilbo deben coincidir con las hojas de cálculo originales:
  1RM = carga × reps × 0,03 + carga; objetivo del día siguiente =
  (1RM anterior − carga de hoy) / (carga de hoy × 0,03).

## Pendiente

- Temas visuales (al final, con Claude Design): Fallout años 50, pixel art,
  arcano, heavy metal, terminal con toque Matrix y gimnasio ochentero. El
  encargo ya está escrito en `docs/encargo-para-design.md`.
- Dibujo propio del cuerpo: el actual es de wger y funciona; mejorarlo con
  Design usando el segundo encargo de ese mismo archivo.
- Pulir con Design los 122 muñecos propios (`web/imagenes/munecos`, generados
  con `herramientas/dibujar_munecos.py`) para igualarlos al estilo de wger.
- Importar el historial de las hojas de cálculo (`herramientas/importar_excel.py`
  ya genera el JSON; falta la pantalla para cargarlo). Aparcado a petición suya.
- Publicar la pantalla de consentimiento de Google (ahora en «Prueba») cuando
  la usen familiares y amigos.

## Hecho (no rehacer)

Rutinas con día automático y modo de uno en uno; series con progresión propia
por ejercicio; técnicas de intensidad combinables con sus medidas; recámara;
progresión «máximo trabajo»; gráficas de 1RM y trabajo por ciclos; cronómetro
de descanso; catálogo de ejercicios predefinidos; papelera y deshacer.
0.9.0: 19 músculos en el mapa (7 capas propias en `herramientas/dibujar_capas_extra.py`),
catálogo de 200 ejercicios con yoga (español y sánscrito, índice de Kaminoff),
buscador con filtros y tres vistas, drop set rellenado con el 1RM de la serie
de arriba, descansos cortos entre bajadas, resumen al terminar con récords,
mejoras, volumen y «¿solo hoy o para siempre?», explicación del cálculo de
recuperación.
0.10.0: recuperación según cercanía al fallo con curva de volumen y factor
personal por músculo (con «¿Cómo llegas?» y sugerencias), guía de respiración
en miorrepeticiones, tramos «como la última vez / por defecto / lo de aquí»,
pesos fijos de drop set, técnica y ayuda en estiramientos, imagen para todo
(wger, Everkinetic y muñecos propios).
0.11.0: 1RM con fórmula por ejercicio (personal calibrada / Marzagao 2026 / Epley),
recomendaciones con ~20 situaciones, «elegir carga por kg o % 1RM» en tramos,
lo de la última vez en los tramos, máquina de placas, sitios (gimnasio, casa,
calle) con «separar por sitio», entrenamientos de otro día. OJO: los objetivos
Bilbo solo coinciden con los Excel si el ejercicio usa Epley.
0.12.0: se quita Epley (decisión suya: mejor la fórmula buena más ajuste). El
ajuste personal es UN factor sobre el divisor de Marzagao, buscado por
consistencia en quincenas y encogido hacia 1 (confianza n/(n+3)).
Explicaciones plegables en Ajustes y en la ficha. Rutinas prehechas
(`web/js/plantillas.js`): la suya y cinco de Heavy Duty resumidas con
palabras propias. Traer pesos fijos de otro ejercicio.
0.13.0: ciclo Bilbo nuevo al 50 % del 1RM (ajustable), factor 1RM con
confianza n/(n+1), corrección de fatiga del drop set (`fatigaTrasSerie`) y aviso
si la primera bajada se aleja de lo esperado, modo prueba con cartel y paso a
la cuenta (`modo-prueba.js`, fusiona sin duplicar), cinco rutinas prehechas más
(PPL 3 días suya de 11-2025, torso/pierna con pautas de Ángel7Real, sin máquinas,
principiantes, calistenia).
0.13.1 (tras su prueba en el móvil): pase de Google en localStorage y renovado
en silencio con cada toque (se «salía de la cuenta» al caducar); indicador en
rojo y con «Google Drive»; fichas de ejercicio y rutina se guardan solas (sin
botón Guardar: «Listo»/«Descartar»); papeleras rojas con confirmación; grupo como
desplegable; «primera vez» solo si nunca se hizo el ejercicio; curva de volumen
de la recuperación más pendiente (1 serie = 57 %); volumen semanal solo con ≥3
sesiones; aviso de drop set al 75 %/125 %; Hoy sin cuerpo pero con recuperación,
rutinas y sugerencias de ajuste aunque no haya ejercicios; tarjeta de instalar
(`vistas/instalar.js`: el aviso «app no segura» es de Samsung Internet, no
nuestro); quitada la rutina de Ángel7Real (su guía no trae rutina); muñecos
de cardio (corazón) y rueda abdominal; cuello delantero desplazado 1,5 px.
0.14.0: esquema v10. Tutorial por niveles con pistas cerrables
(`vistas/tutorial.js`, `pista(clave, texto)`), Ajustes en apartados plegados
con perfil y cuenta arriba, fórmula con dos opciones y «Saber más», músculos
en desplegable con aviso, «¿Cómo quieres ir?» al empezar (series de una en
una / ejercicios / todo, recordado en `perfil.modoEntreno`), descanso: al
saltar o alargar ofrece cambiar el ajuste (sin pullas), resumen ofrece quitar
las series saltadas también sin rutina, peso corporal automático con fracción
(Ebben 2011) y lastre, drop set por kg/% en cuatro niveles (`modoCargaDe`),
«A más cada vez» en repeticiones o en peso, sin Bilbo en series de intensidad,
bajadas ocultas con pesos fijos, aviso en Hoy de cuándo toca (músculos aún
tocados y días parado).
0.15.0: varias rutinas activas con `queToca()` (días fijos de la semana o
propuesta por recuperación; `diasSemana` en la rutina), explicación de la
rutina visible en Hoy, Rutinas en activas / mías / prehechas, +45 ejercicios
de la guía de Ángel7Real y Mentzer (catálogo 174), borrar ejercicio (blando:
`borrado`, se recupera en Ajustes; sin historial se elimina), máquinas con sus
pesos (`pesosMaquina`, `aPesoDisponible()` en drop sets, doble progresión,
ciclos), separar por sitio eligiendo sitios, progresión «programa» (5×5,
5/3/1, HST: `PROGRAMAS`, `seriesDelPrograma`, un plan genera varias series con
`programaSet`), rutinas prehechas 5×5 y 5/3/1 y filosofía en todas.
0.16.0: cuenta. Zona de peligro en Ajustes: «Borrar todos mis datos»
(`estado.vaciarDatos()`, se sobrescribe Drive) y «Eliminar mi cuenta»
(`eliminarCuenta()`: borra todo lo de la app en Drive, revoca el pase y quita
la copia local), ambas escribiendo BORRAR / ELIMINAR. Hojas legibles CSV en la
carpeta de Drive (`exportar.js`, se rehacen cada media hora si hay cambios;
meta.csvIds/csvRevision/csvHora). `drive.js` admite cualquier tipo, lista y
borra. Saludo aleatorio por hora en Hoy. `web/privacidad.html` enlazada
desde la entrada y Ajustes; pasos de verificación en docs/google-cloud.md
(los tiene que dar él en la consola). El texto «Anterior / Siguiente» que
vio en el móvil lo pone el navegador sobre los desplegables, no la app.
0.16.1: guía paso a paso real (`iniciarGuia`/`pintarGuia` en tutorial.js: panel
fijo abajo, 7 pasos básicos + 4 avanzados, `perfil.tutoriales.paso`), el
cartel «¿Te guío?» espera a que se cierre el de modo prueba, tarjeta de
instalar arriba de Hoy y en la pantalla de entrada, y la app ya NO se recarga
sola con la pantalla a la vista al llegar una versión nueva (cortaba el
acceso de Google y obligaba a entrar dos veces): avisa con «Actualizar».
0.16.2 (probado por Claude en el Chrome de Dan, modo prueba): grupos de la
lista sin distinguir mayúsculas («Empuje» y «empuje» eran dos), objetivo Bilbo
entero y con tope 40 (avisa «peso muy bajo»), «+ Serie» tras una Bilbo crea
una libre sin plantilla (no duplica el día del ciclo), programa sin peso
inicial estima uno (60 % del 1RM, 90 % en 5/3/1, o 20 kg). Google Drive no se
puede probar desde la extensión de Chrome: bloquea la ventana de Google.
0.17.0 (tras su segunda prueba): cuestionario de bienvenida (`vistas/
cuestionario.js`: experiencia, objetivo, dónde, tema → `perfil.cuestionario`,
`perfil.tema` aplicado con data-tema, rutina recomendada en Hoy); glosario con
«¿Qué es…?» (`vistas/glosario.js`); guía con «entrenamiento de prueba»
(sesion.tutorial: al terminar, guardar o borrar); elección de vista a pantalla
completa y reversible («Vista: … · cambiar», guardada en sesion.vista) y
última pantalla recordada al reabrir; resumen reescrito («Estadísticas y
consejos», tabla, «Has hecho N series menos… ¿las quito?»); avisos con ✕;
Google: el pase ya no se revoca al caducar ni al salir (solo al eliminar la
cuenta); «Borrar todos mis datos» mantiene la revisión subiendo y, si el
archivo de Drive desaparece, la app pregunta antes de volver a subir lo local;
modo prueba pregunta si continuar la anterior o empezar de cero; descanso
ofrece cambiar el ajuste cada vez; ciclo Bilbo «agotado» por debajo de 15
repeticiones (`perfil.bilboMinReps`); CSV de entrenamientos con una fila por
ejercicio y las series en columnas; filosofía de las rutinas en puntos;
overflow horizontal cortado.
0.18.0: ciclos configurables (`web/js/ciclos.js`): la progresión «bilbo» es
ahora «Ciclo (Bilbo y otros)» con prehechos (Bilbo 17, lineal, semanal, más
repeticiones, más tiempo, a mi manera), corte por sesiones / objetivo mínimo /
esfuerzo máximo, reinicio automático (al % del 1RM, al % del último, igual o
a mano) con `renovarSiToca()` al crear la serie del día, «+5 sesiones» y
«Cortar y empezar otro». El día 1 de un ciclo compara con la última serie
del anterior.
0.19.0: cronómetro de intervalos HIIT (`vistas/intervalos.js`): prehechos
Tabata, 30/30, 40/20, EMOM, sprints y a mi manera; pitidos por fase y en los
últimos 3 s; pausa, saltar, parar; Wake Lock; al acabar apunta los segundos
de trabajo en la serie y el detalle en las notas. Botón «⏱ Intervalos» en los
ejercicios de cardio medidos en tiempo. Catálogo: HIIT, Tabata, Burpees,
Jumping jacks, Rodillas al pecho, con muñeco.
0.20.0: +23 estiramientos y ejercicios de movilidad con muñeco, dos rutinas
prehechas nuevas sacadas de sus documentos de OneDrive (generalizadas, sin
datos médicos): «Flexibilidad: tres sesiones» y «Movilidad para sentarse a
meditar» (helper `t(seg)` en plantillas.js). Los 45 ejercicios de la guía
llevan imagen por alias (`aliasDe` en creditos.json, misma foto que el
ejercicio base). La guía hace parpadear el botón del que habla
(`selector` en cada paso, clase `.parpadea`). Quitada `epley()` (sin uso).
0.20.1-0.20.2: Drive: `carpetaDeLaApp()` cacheada, `asegurarEnCarpeta()` y
`ordenarCarpeta()` (una vez por sesión de la app recoge en la carpeta todo lo
que la app tenga suelto: él veía los archivos en «Mi unidad»). Estiramientos
de prueba (sastre, split, isquios) con `asistencia: 'mano'` de fábrica → la
escala de la mano sale como desplegable en cada serie. Filas del drop set con
cabecera única (kg / % 1RM / reps) y decimales con coma. El cardio sin
músculo principal ya no sale como «falta músculo».
0.20.3-0.20.10 (rondas sin supervisión, 20-09-2026): parpadeo de la guía
visible (halo naranja; con «reducir animaciones» activo en el móvil también
parpadea, antes no: ese era su «no parpadea»), sin «undefined» en el panel
(`anadir()` en vez de `replaceChildren` con hijos), la pantalla deja sitio al
panel y el objetivo se pone a la vista; tras el entrenamiento de prueba la
guía pasa sola al paso siguiente (`guiaTrasPrueba()`) y no pregunta la vista.
`conGlosario(texto)` (glosario.js) pone «?» tras la primera aparición de cada
término (1RM, fallo, recámara, drop set, volumen, Bilbo, descarga, HIIT…) en
consejos, récords, rutinas prehechas y descripciones. `completarDesdeCatalogo()`
(catalogo.js) rellena al abrir (y al descargar de Drive) los ejercicios en
blanco cuyo nombre esté en el catálogo (los de las rutinas de yoga quedaron sin
músculos). Descanso entre estiramientos aparte (`perfil.descansoEstiramientos`,
20 s) y «+30 s» en descansos cortos. Cartel «¿Cómo quieres verlo?» sin
duplicar (`preguntandoVista`). Textos en llano: línea del 1RM del ciclo, tabla
«Frente a otras veces» («7 % más que la última vez»), récord de trabajo en kg,
fechas dd/mm/aaaa (`fechaCorta` en ui.js), total exacto del HIIT y frase de
introducción con glosario, saludo sin nombre, plural «1 sesión hecha».
El «diagnóstico gym» lo dio él por cerrado (no era de la app).
PENDIENTE: nombre e icono con Design («luego ya decoramos»); que él confirme
que Drive recoge los archivos sueltos en la carpeta.
