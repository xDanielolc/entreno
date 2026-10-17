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
- **Botones y centrado por defecto**: toda acción es un botón (nunca un enlace
  de texto suelto) y todo va centrado (títulos, botones, tablas con cebra),
  como en una app del móvil. Dan lo ha tenido que corregir muchas veces.
- **Móvil primero**: todo se diseña para 375 px de ancho; ningún texto se
  sale de su botón; las explicaciones largas, detrás de un «?».
- **Colores**: el navegador de su móvil (Ecosia) oscurece la página e invierte
  imágenes. Probar los cambios de color con Chrome en oscuro forzado
  (`--blink-settings=forceDarkModeEnabled=true`) y no darlos por buenos sin
  su captura. El mapa del cuerpo se pinta en un `<canvas>` por eso.
- Pendientes en dos listas: `docs/pendientes.md` (código, Claude Code) y
  `docs/pendientes-design.md` (dibujos y estética, Claude Design).
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
  (1RM anterior − carga de hoy) / (carga de hoy × 0,03). Es una **variante de
  Epley con 0,03**: Epley de verdad es carga × (1 + reps / 30), es decir 0,0333.

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
Bilbo solo coinciden con los Excel si el ejercicio usa la variante de Epley con 0,03.
0.12.0: se quita la variante de Epley con 0,03 (decisión suya: mejor la fórmula buena más ajuste). El
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
0.20.12-0.21.3 (tras su prueba del 20-09-2026, todo pedido por él): avisos
negros a casi todo el ancho; carteles (`.modal-fondo`) centrados y la guía
oculta mientras hay uno (`body:has(.modal-fondo) .guia`); escala de la mano
con emojis y orden real (surf, pulgar, puño, mano abierta, 3-2-1 dedos, sin
mano); tiempo en «mm:ss» (`leerTiempo`/`formatearTiempo` en ui.js,
`textoEsfuerzo` en sesion.js); «¿cómo llegas?» en cualquier vista, con oferta
de quitarla al segundo «hoy no» (`perfil.preguntarComoLlegas`); sesión de
prueba del tutorial que no se cuelga; peso muerto con barra (alias del rumano)
y «Peso muerto con mancuernas» nuevo; banda verde «Entrenamiento en curso ·
Volver» en cualquier pantalla (app.js `pintarBandaEntreno`); nota «primera vez
con X» en el resumen. Tutorial reescrito: `PASOS` con texto largo y `corto`,
niveles basico («explícamelo todo») / avanzado («solo dónde está cada cosa»:
sin pistas salvo `sesion-datos`, sin glosario), primer entrenamiento guiado
casilla a casilla (`subpasoDePrueba`: reps → recámara → terminar, la sesión
llama a `pintarGuia()` al teclear), sin PASOS_AVANZADOS. Pantalla «Aprender»
(`vistas/aprender.js`, ruta `#/aprender`, enlace desde Ajustes): tutorial,
glosario, «Cómo decide la app qué te toca» (progresiones y programas en llano),
estiramientos (técnicas, pasivo/activo, FNP/CRAC, ayudas, escala de la mano) y
fuentes (antes en Ajustes). Rutinas: buscador y chips por tipo
(`tipoDePlantilla`, `tipoDeRutina`), plantilla «Cardio: tres días». Ficha del
ejercicio reestructurada (ejercicios.js): «¿Con qué peso se hace?» (peso
libre / máquina de placas / peso corporal / asistida / altura o distancia de
salto / sin peso → carga.tipo + maquinaPlacas), «¿Qué apuntas?» (reps / tiempo
/ distancia / tiempo y distancia), «¿Cómo te lleva la app?» con una regla por
serie (`progresionesPara()` según medida; `plan.tipo` sale de `tipoDePlan()`:
calentamiento (casilla `plan.calentamiento`) / bilbo / intensidad / libre; ya
no se elige el tipo), drop set con una sola pregunta (modos ultima / ajustes /
plantilla / fijos), ciclo siempre «a mi manera» con chips de prehechos y corte
también por `corte.cargaMax` y `corte.rmPct` (calculos.js), «Ajustes finos»
plegados (sede, fórmula, `ej.recamaraPorDefecto`, notas). Recámara: al poner
dos veces el mismo valor en un ejercicio, la sesión ofrece fijarlo
(`ofrecerRecamara`). Pliometría en el catálogo (7 entradas, imagen por alias).
Página de pruebas del artefacto ahora guarda en `pruebas/v021` (26 puntos).
## Rondas 0.22.0 a 0.23.2 (22-09-2026): la lista larga de Dan

Casillas de la serie: rejilla `repeat(auto-fit, minmax(84px, 1fr))` con el
nombre encima de cada una (`span.et`), como la tabla de las bajadas; el
`.carga-con-porcentaje` usa `display: contents` dentro de la serie. Carteles
negros: tokens propios `--cartel-fondo/-texto/-borde` por tema (en oscuro ya
no salen blancos), se reparten solos (`min-width: min(100%, 20em)` en el
texto) y duran más. «Aprender» es una pestaña (`pestana: 'aprender'`, seis
columnas en la barra) y recoge «Cómo se estima tu 1RM» y los créditos de las
imágenes; Ajustes queda entero plegado, con Perfil y Personalización aparte.
Los apartados llevan `id` (`idApartado()` en ui.js: «ap-entrenamiento-y-
series»), que es lo que señala la guía.

Ciclos: la ficha los parte en tres bloques («¿Qué mejoras cada sesión?»,
«¿Cuándo se acaba el ciclo?» con casilla por condición, «¿Por dónde empieza el
siguiente?»). Nuevo modo de reinicio `rm-ciclo` (al % del mejor 1RM logrado en
ese ciclo, `mejorRMDelCiclo()` en calculos.js), que es lo que hace Bilbo de
verdad; las sesiones son un tope, no la meta. `ciclo.generador.inicialEsfuerzo`
y `.incrementoEsfuerzo` permiten que suban peso y repeticiones a la vez. Los
textos dejan de dar órdenes («objetivo X», no «llega a X»). Cortar un ciclo y
quitar una serie se deshacen desde el aviso.

Medidas: `ej.medidas` (lista ordenada; la primera manda) y `serie.extras`
(por nombre de medida); `medidasDe()` y `extraDeSerie()` en esquema.js leen
también el formato viejo (`esfuerzo` + `esfuerzoExtra`). El tiempo se escribe
en tres huecos (h/min/s, `campoTiempo()` en sesion.js): el teclado del móvil
no tiene dos puntos.

Buscar en la pestaña Ejercicios encuentra también los del catálogo que aún no
tienes, con «+ Añadir» (`tarjetaCatalogo`). Drop set: una sola pregunta («de
dónde salen los pesos»: ultima / auto / mano / fijos) y se expone
`plan.tramoInicio` (el % del 1RM por el que arranca). Glosario: `perfil.glosario`
= siempre | primera | ninguno (por defecto siempre; avanzado = ninguno), y el
propio cartel lleva «No me pongas más «?»». Sesión: fuera el botón grande de
«Siguiente ejercicio» (quedan las flechas, ahora `.boton-paso`), la línea de
vista solo al final, y el cartel de «¿cómo quieres verlo?» se puede quitar
(`perfil.preguntarVista`). Volumen: el mínimo de 10 series baja a 6 en los
músculos que entrenas al fallo o con bajadas (`durezaSemanal()`,
`serieDura()`), que era la queja de «no me convence lo de las 10 series».

Tutorial: tres guías (`GUIAS`: bienvenida / ejercicios / rutinas), la de
bienvenida en orden lógico (lo que ya viene hecho → los ajustes que ahorran
trabajo → ejercicios → entrenar → cuerpo → historial → aprender), y el
entrenamiento de prueba va casilla a casilla incluido «+ Añadir ejercicio».
El cuestionario de bienvenida ahora cambia cosas de verdad (crea la sede, fija
`perfil.glosario`, la recámara si eres novato y la rutina recomendada) y al
acabar dice qué ha cambiado.

Cardio: cronómetro (`abrirCronometro`) además de los intervalos, en cualquier
ejercicio medido en tiempo; intervalos propios (`perfil.hiitPropios`); quince
tipos de cardio más en el catálogo; ni técnicas de intensidad ni programas en
cardio. Google: el pase se renueva a los quince minutos de margen, con
`pedirToken({ forzar: true })` (antes no renovaba nada porque el token seguía
«vigente»), como mucho cada diez minutos, nunca mientras escribes, y avisando
antes: era el «parpadeo de la pantalla de Google» a mitad de entrenamiento.

Estiramientos: `estiramiento.asistencias` (chips, varias a la vez) y
`estiramiento.cm`, para medir por la mano y por centímetros en la misma serie.
Al montar una rutina, `avisoChoques()` señala los días seguidos que comparten
músculo principal. Un ejercicio nuevo arranca en doble progresión, no en ciclo.

## Rondas 0.24.0 a 0.24.2 (23-09-2026): la regla de la serie, reestructurada

Dan lo dijo claro: «todo son ciclos». La regla de una serie son cuatro
opciones (`REGLAS` en ejercicios.js): **un ciclo**, **máximo trabajo**,
**calentamiento** (que sube al principio y no progresa) y **solo apuntar**.
Dentro de «un ciclo» están todos los prehechos juntos (`prehechosPara()`:
doble progresión, Bilbo, lineal, sube cada semana, 5×5, 5/3/1, HST, más
repeticiones, más tiempo, a mi manera), que por debajo siguen siendo
`progresion.tipo` 'carga' | 'bilbo' | 'programa'. Debajo, los bloques:
1 · qué mejoras cada sesión (una fila por medida del ejercicio, incluidas
distancia y tiempo, con `generador.extras`), 2 · cómo es la serie (las
técnicas, drop set incluido, ahora **dentro** del ciclo: un drop set es una
forma de hacer la serie, no una progresión), 3 · cuándo se acaba el ciclo y
4 · por dónde empieza el siguiente.

Corte: cada condición es un botón que se queda marcado (`.boton-marca`, no
casillas: él las quiere así en toda la app) y `corte.cuantas` dice con
cuántas hace falta (1, 2… o 'todas'); el tope de sesiones va aparte y siempre
manda. Reinicio: modo `reps` («al peso con el que harías X repeticiones»),
que usa `pesoParaReps()` en formula1rm.js, una bisección sobre `estimar1RM`.

Serie en el entreno: una línea, columnas de 62px mínimo, nombre centrado
encima y `align-items: start` con alturas fijas para `.et` y `small`, que es
lo que estaba descuadrando las casillas. Fuera el número de cada bajada.

Otros: partir un ejercicio en dos variantes (`partirEnVariante`, con fecha
desde la que se lleva el historial), el cronómetro sale si el ejercicio mide
tiempo aunque no sea su medida principal (`mideTiempo`), `extraDeSerie` solo
respalda el formato viejo para la distancia, el buscador busca solo por
nombre, y la ventana de Google **ya no se abre sola nunca**: sale un cartel
con botón «Renovar» a los quince minutos, porque el navegador bloquea la
ventana si no viene de un toque.

Pendientes y encargos: `docs/pendientes.md` (lo que está hablado y sin
hacer) y `docs/encargo-para-design.md` (temas, silueta y ahora los dibujos de
técnica de todos los ejercicios).

## Ronda 0.25.0 (25-09-2026): prehechos a su gusto

Prehechos (`prehechosPara()`), en este orden: Personalizar (preset
'personalizado', en blanco), «Rango de hipertrofia (músculo) · recomendado»
(tipo 'carga', 6-10 reps; 10-15 si `perfil.cuestionario.experiencia` es
'novato'), «Bilbo / incremento de peso lineal (fuerza)» (absorbe lineal y
«sube cada semana», que ya no se ofrecen aunque siguen en PRESETS_CICLO para
lo guardado), 5×5, 5/3/1, HST, más repeticiones, más tiempo. Topes de 20
sesiones (`DIAS_CICLO_POR_DEFECTO`). `inicialDelPrograma()` calcula el primer
peso con la fórmula: 5/3/1 = 90 % del 1RM, HST = 15RM, 5×5 = peso para 5 con 3
en recámara. 5/3/1 lleva `prog.porSemana`. Personalizar admite
`generador.fases` ([{ reps, sesiones }], `faseDelDia()`), que manda sobre el
objetivo del día. Los programas y los ciclos cuentan **sesiones del
ejercicio**, no semanas: Dan preguntó cómo sabe la app en qué semana va.

Ficha: bloques plegados con resumen (`bloque()` en ejercicios.js, recuerda
los abiertos al repintar), `p.sinMejora` deja todo sin marcar con aviso rojo
y bloquea «Listo», las técnicas son chips (tecnicas.js ya no usa `<select>`:
el del móvil sacaba una barra «Anterior/Siguiente»). Ajustes tiene el
apartado «Intervalos (HIIT)».

## Ronda 0.26.0 (26-09-2026): «?» en vez de texto

Regla de Dan: en el ciclo, como mucho una línea visible por cosa además del
«?» y del resumen. `ayuda(titulo, texto, { lista })` en ui.js es un «?» que
sale siempre (no depende de `perfil.glosario`). Las opciones (reglas,
reinicio, bajadas) van en `opciones(…, { compacto: true })` y su explicación
en el «?»; `bloque()` pone el «?» en el título si es lo primero del contenido.
Fuera «Más repeticiones»; hipertrofia siempre 6-10. `describirCiclo(prog,
unidad, nombreEsfuerzo)` cuenta lo que sube de verdad (0 kg y una repetición =
«sube 1 repetición cada sesión»). `planPorDefecto()` en series.js: objetivo
«fuerza» → Bilbo; si no, hipertrofia 6-10; sin peso → solo apuntar. Se usa
al crear ejercicio a mano, al añadirlo del catálogo y al entrar en un
entrenamiento un ejercicio sin reglas; Bilbo sin 1RM monta el ciclo en la
segunda sesión (la primera: «haz todas las que puedas»).

## Ronda 0.27.0 (26-09-2026): tu 1RM si lo sabes

`ej.rmManual`: el 1RM que pones en la ficha (campo `campo1RM()`, en la
fórmula del 1RM y, mientras el ejercicio no tenga series, en la propia
regla). `rmDeReferencia` y el objetivo de Bilbo lo usan solo si no hay
ninguna serie; cambiarlo recalcula un ciclo que aún no ha empezado. Sin él,
la primera sesión dice «pon un peso con el que hagas de 5 a 15 y haz todas
las que puedas». Máximo trabajo tiene suelo del 30 % del 1RM
(`SUELO_MAXIMO_TRABAJO`): por debajo no hay estudios de que se gane músculo
igual.

## Ronda 0.28.0 (27-09-2026): cómo cuenta un drop set

`perfil.cuentaDropSet`: 'ozaki' (por defecto, 1 + 0,5 por tramo de más) o
'x-1' (tramos menos uno). `seriesDeTramos()` en recuperacion.js; se elige en
Ajustes → Entrenamiento y series y en Aprender. Máximo trabajo ya ajusta una
parábola (U invertida) a sus series y va a la cima; el suelo solo actúa si la
cima cae por debajo del 30 %. Los apartados de Ajustes y Aprender recuerdan
si estaban abiertos (`apartadoPlegable` en ui.js).

## Rondas 0.29.0 y 0.30.0 (27-09-2026): la lista larga de Dan

- Drop set por defecto X−1 (Fink 2018), Ozaki como opción.
- Sin `<select>` en toda la app: `selector()` en ui.js (botones que se quedan
  marcados; con muchas opciones, un botón que abre la lista). `campo()` solo
  es `<label>` si envuelve una casilla de texto.
- `plegable()` y `apartadoPlegable()` recuerdan lo abierto; `abrirAlLlegar()`
  + `llevarAlDestino()` abren una explicación desde otra pantalla.
- Historial: un día terminado se abre en resumen (`resumenDelDia` en
  sesion.js); «Editar» lo pasa al set `editando`. Buscador y filtros.
- Cuerpo: mapa con tres modos (recuperación, semana, dos meses), objetivos de
  series por músculo (`perfil.objetivoSeries`), colores `claseSeries()`.
  Ritmo de recuperación automático (`factorAutomatico`, sale de «¿Cómo
  llegas?»; cada sensación guarda el `factor` de ese día); a mano sigue en
  `perfil.recuperacion.factores`.
- Ficha: vistas Progreso / Ficha completa / Paso a paso; borrador nuevo a
  medias (`borradorNuevo`); bloques abiertos por ejercicio. Unidades por
  ejercicio (`ej.unidades`, `unidadMedida()`).
- Inicio de ciclo: `prog.inicio` ({modo: porcentaje | reps | mismo | prueba})
  y reinicio 'prueba' (`ciclo.pendientePrueba`). `prepararCiclo()` fija el
  peso del primer día al crear la serie; `esperaPrueba()` hace que la
  sugerencia pida la prueba. «% del último valor» queda solo para datos viejos.
- Progreso: todo el historial con tendencia del 1RM (mínimos cuadrados, kg/mes)
  o por ciclos.

## Ronda 0.31.0 (28-09-2026): la sincronización ya no pisa lo del móvil

Fallo grave que vio Dan: con cambios sin subir en el móvil (permiso de Google
caducado) y el ordenador subiendo antes, ganaba Drive y lo del móvil solo
quedaba en `entrenamiento-conflicto-*.json`. Ahora `fusion.js` hace una
fusión a tres bandas contra `meta.base` (la última versión compartida, que se
guarda al subir y al bajar): lo cambiado en un solo lado se queda; si cambió
en los dos, manda este dispositivo y la versión de Drive va a una copia. Los
objetos (perfil, factores de recuperación…) se funden por dentro. Ajustes →
Cuenta → «Recuperar algo de una copia guardada aparte» junta una copia con lo
de ahora, eligiendo quién manda.

## Ronda 0.32.0 (28-09-2026): notas de la 0.30

Tu 1RM en la ficha es una pregunta (Sí, ahora con una prueba / a mano / el
primer día); la prueba ahora calcula con `estimar1RM` al momento. En el
entrenamiento, una serie que espera prueba sale como tarjeta con «No, lo meto
a mano» (`ponerRMaMano`, rehace la serie). Paso a paso: pesos de la máquina
en su propio paso, «¿Cuántas series?» y si son iguales (`igualesFicha`,
`copiarPrimeraSerie`). Tipo de peso plegado una vez elegido
(`cambiandoCarga`). Las pestañas Ejercicios e Historial recuerdan su última
pantalla (`entreno-ultima-por-pestana`). Resumen al terminar rehecho (cifras,
récords, tabla, consejos plegados, cambios con botones). Cuerpo: modos en tres
columnas, tablas en vez de frases, «Qué entrenar» colorea todos los músculos.
Hoy: «Más info» es un botón que abre un cartel. «Distancia/Altura».

## Ronda 0.33.0 (28-09-2026): una sola lista de lo que se apunta

Cambio aislado a propósito (Dan: «si no, volvemos»; la 0.32.0 tiene la
etiqueta `v0.32.0` en Git). «¿Con qué peso se hace?» y «¿Qué apuntas?» son
una sola lista (`APUNTABLES`: peso, distancia/altura, repeticiones, tiempo,
distancia); si hay peso, «¿Qué peso?» pregunta el tipo. El modelo de datos
no cambia (`carga.tipo` + `medidas`). Para volver: `git revert` del commit de
esta ronda, o volver a publicar desde `v0.32.0` subiendo la versión.

## Ronda 0.33.2 (28-09-2026): fotos del móvil

Bajadas del drop set con `saltoAjustado()` (la última no baja del 30 % del
peso de partida, en múltiplos de 1,25 kg). Técnicas en su propia fila en la
cabecera de la serie. Flecha de volver arriba solo al deslizar hacia arriba,
dos segundos. Consejos: fuera de Cuerpo; `avisosDeHoy()` en inicio.js (dos
como mucho, `pista` con clave por semana). Barra de recuperación fina.

## Ronda 0.34.0 (29-09-2026): notas de la 0.33

- Google: sin avisos de «caduca en X min»; `renovarAlTocar()` renueva al
  tocar Empezar o Terminar. Sin servidor propio no se puede más (el pase dura
  una hora). Indicador tranquilo: «En el móvil · toca para subir».
- Imágenes sin conexión: almacén `entreno-imagenes` que no se borra al
  actualizar, primero la copia; `guardarImagenesParaSinConexion()` en app.js.
- Copias aparte: un solo «Juntar» (manda la copia) y se marcan
  `juntada: 'si'` en Drive (`drive.marcar`), o «Ya está: quitar».
- Resumen al terminar: compara 1RM con 1RM (trabajo solo si no hay 1RM, sin
  color); cambios agrupados por tipo con botones.
- Mapa: tokens `--mapa-*`; en «Qué entrenar», azul (te pasas) y morado (te
  pasas mucho). Tablas en cebra.
- Prehechos por grupos (Hipertrofia, Fuerza, Aguante). `planesPorDefecto()`:
  con «fuerza», Bilbo + 3×5 (`progresion.series` en el 5×5).
- Gemelo y sóleo por separado (capas propias en dibujar_capas_extra.py).
- Catálogo de la lista general por grupos plegados. Hasta 20 series en el
  paso a paso; «Ajustes finos» como último paso. Tu peso desde Hoy.

## Rondas 0.34.1-0.35.0 (1-10-2026)

- Sin tope del 1RM ni «récords sospechosos»: Dan lo rechazó (si mejoras mucho,
  la app no se mete). Se quedan: `conMargen()` (un ciclo empieza como mucho
  en el peso de 2 × el mínimo de repeticiones, 30 si el mínimo es 15; es el
  «indicador universal» de Bilbo) y que el día 1 nunca agote el ciclo.
- Renovador de Google en Cloudflare listo (`herramientas/cloudflare/`,
  `docs/cloudflare.md`, `CONFIG.urlRenovador` vacío hasta que Dan lo cree).
- Las capas de wger tenían opacidad 0,52: se pusieron a 1 (todas iguales).
  Almacén de imágenes `entreno-imagenes-2`: subir el número si cambian.
- Resumen al terminar: «Frente a la última vez» con insignias (más fuerte, más
  aguante…), sin consejos; cambios «Toca los cambios de hoy que quieras
  hacer permanentes» con botones cortos.
- Tipo de serie con explicación; «Ciclo» en vez de «Bilbo»; si el ejercicio
  no tiene ciclo, `elegirCiclo()` pregunta.
- Buscadores: botón «Filtros» a la derecha, orden alfabético por defecto (o
  por grupo o músculo). Bajadas en rejilla con la cabecera alineada.
- Navegación entre ejercicios también abajo. Series sin tope.

PENDIENTE: nombre e icono con Design («luego ya decoramos»); publicar la app
en la consola de Google (es cosa suya); repasar las descripciones de las
progresiones contrastándolas con las fuentes, que él pidió y solo está hecho
lo de Bilbo.

## Ronda 0.44.0 (15-10-2026): rutinas por día y «¿Voy hoy?»

Esquema v13. Editor de rutinas rehecho (`filaEjercicio`, `detalleEjercicio`,
`anadirRapido` en rutinas.js): foto y resumen (`resumenPlanes`/`textoPlan`
en series.js), series del día marcables y «añadir series» rápido. Las que
se añaden «solo en esta rutina» llevan `plan.soloRutina` y no salen en la
ficha del ejercicio ni al entrenar sin rutina (`planesDeItem`). «¿Voy hoy?»
(`vistas/voy-hoy.js`): solo suma cansancio; la pereza es «sin ganas con el
cuerpo bien»; sin pulso. Su árbol original v5 está en la carpeta «Test y
árboles de decisión HTML», al lado del proyecto. `imagenDeEjercicio(ej)`
usa `ej.fotoDe` en las variantes partidas.

## Ronda 0.45.0 (16-10-2026): consejos, peso y superseries

Esquema v14. Consejos de la lista v044 en recomendaciones.js
(`progresoPorEjercicio` diagnostica por qué baja o se estanca; `descansos`
usa `serie.hechaA`; `tecnicasDeMas`, `calentamiento`, `dolor` con la lista
`DOLOR`, `pesoSinActualizar`, `llegasCansado`). Fuera los consejos 20 y 30
(Dan). Récord al momento en el entreno (`avisarRecord` en sesion.js, a los
2 s de escribir las repeticiones). Peso con fecha (`peso.js`, tarjeta en
Cuerpo). Superserie: `item.superserie`; tras una serie del primero no hay
descanso y se avisa del segundo. Las preguntas a Dan, siempre con la
herramienta de test (AskUserQuestion), no en lista de texto.

## Ronda 0.45.1 (16-10-2026): capas del cuerpo repasadas

Todas las capas propias de `herramientas/dibujar_capas_extra.py` se
redibujaron sobre el dibujo ampliado (pecho bajo la clavícula, por el
esternón y hasta la línea del hombro; aductores sin meterse entre las
piernas; abdomen, antebrazos, tibial, abductores y sóleo ajustados) e
isquios pasa a capa propia (wger solo pintaba el bíceps femoral). Para
repasar una capa: renderizar el SVG del cuerpo ampliado con rejilla y las
capas encima (Chrome sin ventana) y trazar sobre las líneas que se ven.
Almacén de imágenes `entreno-imagenes-7`, el mismo nombre en `sw.js` y en
`app.js` (antes app.js usaba otro y el service worker lo borraba).

## Ronda 0.46.0 (16-10-2026): meter una rutina sin sufrir

Esquema v15. Dan va a meter su rutina nueva de fuerza (cuatro días, series
máxima + 4 × 4 con 2 en recámara, Bilbo + normales, drop set en la última).
Lo que cambió para que eso sea fácil:
- `web/js/rapidas.js`: las «formas» de serie (normales, fuerza con 2 en
  recámara, drop set en la última, Bilbo, serie máxima, calentamiento y los
  prehechos del usuario) y `crearPlanesRapidos()`, que usan el editor de
  rutinas y la rutina pegada.
- Editor de rutinas: las series del día son una lista con ✕ (`quitarDelDia`:
  las del ejercicio solo se desmarcan; las «solo aquí» sin otro día se
  borran) y «+ Añadir series» abre un cartel con un toque por cosa (forma,
  cuántas con − y +, rango de repeticiones o tiempo en chips). Un ejercicio
  de la lista general entra en la rutina **sin series** (`nuevo.series = []`);
  las primeras que se le añaden son las suyas y las demás, «solo aquí».
- `web/js/rutina-texto.js`: «Pegar una rutina escrita»: líneas
  «Ejercicio: 1 × 1-2 máxima + 4 × 4 fuerza» o una tabla con sesión,
  ejercicio, series, tipo y cómo (la que escriben las IA); entiende Bilbo,
  máxima, fuerza, drop, calentamiento, min/s, opcional, superserie y «N en
  recámara». Cuadra nombres con los tuyos y el catálogo por palabras
  (`parecidoDeNombres`); el resto se crean en blanco. Vista previa antes de
  crear. Su tabla real (borrador 10) entra entera sin avisos.
- Doble progresión con `recamaraMin` (sube solo si dejaste esas en recámara)
  y el salto al disco disponible. Prehecho «De 3 a 5 con 2 en recámara ·
  fuerza»; Bilbo pasa al grupo Hipertrofia (series de 15-30 cerca del fallo).
- Prehechos míos: `perfil.prehechos`, «Guardar esta regla como prehecho mío»
  en la ficha (grupo «Míos»), se quitan en Ajustes.
- Redondeo: `perfil.redondeoKg` (Ajustes) y `ej.redondeoKg` (Ajustes finos);
  `fijarRedondeo()` en calculos.js lo recibe desde `estado.emitir`.
- Hoy: «¿Voy hoy?» dentro de la tarjeta Recuperación, una pregunta cada vez
  con barra de progreso; últimos entrenamientos en breve (fecha y día) con
  «Con detalle» recordado en localStorage.

## Ronda 0.46.1 (16-10-2026): su rutina como prehecha

«Fuerza sin máquinas: cuatro días» en `plantillas.js`, escrita en el formato
de texto (`deTexto()`; `anadirPlantilla` usa `crearRutinaDesdeTexto` si la
plantilla trae `texto`): así cada día lleva sus propias series del mismo
ejercicio. Las notas entre paréntesis de cada línea van a `item.nota` (y la
columna «cómo» de una tabla también). «Gemelo de pie con barra» en el
catálogo con la foto de la elevación de gemelos. El redondeo es un número
libre (0,25 con microdiscos), 2,5 por defecto.

## Ronda 0.47.0 (16-10-2026): identidad visual

Dan pidió «hacerla más bonita, como un diseñador con rienda suelta». Hecho
en CSS, sin Design: papel cálido de fondo en claro y azul noche en oscuro,
acento azul cobalto (no se confunde con el verde, ámbar y rojo de los
estados), tarjetas sin borde con sombra suave, botones píldora con un poco
de relieve, campos con fondo suave y anillo de foco, barra superior y
navegación translúcidas con desenfoque, iconos de trazo propios
(`web/js/iconos.js`, antes emojis) con la pestaña activa en una píldora, la
marca con su icono, carteles como hoja que sube desde abajo en el móvil
(centrados en pantalla grande), números de las series más grandes y
tabulares. Token nuevo `--acento-fuerte` y `--sombra-alta`. Los temas de
fantasía (Fallout, pixel art…) siguen pendientes para Design. El service
worker tenía sin listar `peso.js`, `voy-hoy.js`, `rapidas.js`,
`rutina-texto.js` e `iconos.js` (sin conexión habrían fallado): ya están.

## Ronda 0.47.1 (16-10-2026): fuente y presentación

Fuente Manrope (OFL, variable, `web/fuentes/Manrope.ttf`, 165 KB, en el
service worker; Dan autorizó la descarga). Presentación al abrir
(`#presentacion` en index.html, CSS al final de estilo.css): la pesa entra a
saltos desde la izquierda aplastándose al caer (origen de transformación
abajo, por eso al encoger se sube 24 px), la caja del logo se cierra sobre
ella y aparece el nombre; dura 1,85 s, un toque la quita y con «reducir
movimiento» solo hay un fundido. Pidió «rollo Pixar, como la lámpara».

## Ronda 0.48.0 (16-10-2026): su primer día real

Esquema v16. Lo que vio Dan en el gimnasio y cómo quedó:
- La rutina «entraba sin progresión»: una serie de doble progresión sin
  historial no proponía peso. Ahora `sugerenciaSerie` (carga) sin historial
  calcula el peso con el 1RM (`pesoParaReps(rm, máximo del rango,
  recamaraMin)`) y, sin 1RM, la **primera serie del día es la prueba**
  (tarjeta como la de Bilbo, una sola vez); las demás dicen «espera a la
  prueba» y, al apuntarla (`onchange` del peso o las repeticiones,
  `rellenarDesdePrueba` en sesion.js), cogen su peso del 1RM de hoy
  (`rmDeHoy`: mejor serie hecha arriba, si no el historial).
- El descanso arranca solo cuando están el peso y las repeticiones
  (`serieCompleta`), en el orden que sea.
- Notificación del descanso (`descanso.js`: `activarNotificaciones`,
  `notificar` por `showNotification` del service worker con `tag:
  'descanso'`, actualizada cada 15 s en silencio y con vibración al acabar;
  `notificationclick` en sw.js vuelve a la app). Se activa en Ajustes →
  Descansos o con la campana de la barra; requiere un toque (permiso).
- Botones del entreno de uno en uno: abajo, «Siguiente ejercicio › nombre»
  grande (o «Terminar» en el último); «Terminar entrenamiento» pasa a
  secundario mientras queden ejercicios.
- Colores: el azul chocaba con el verde. Acento **tinta** (negro en claro,
  blanco en oscuro); verde, ámbar y rojo solo para estados y cuerpo.
- Presentación: el nombre sale debajo de la caja y después de que la pesa
  entre (2,3 s en total).
- Catálogo: «Elevación de piernas colgado» (por defecto, piernas estiradas,
  muñeco propio), «Elevación de rodillas colgado» (muñeco) y «Elevación de
  piernas en el suelo» (foto de Everkinetic); el nombre viejo «Elevaciones
  de piernas» conserva su foto por alias. Fracciones del peso corporal:
  piernas 0,32 (Winter 2009), curl nórdico 0,65 (estimación);
  `FRACCION_CORPORAL_POR_NOMBRE` y migración v16 para los ya creados.
- 0.48.1: la recámara de una serie nueva sale de la regla (`recamaraMin`, 2
  en fuerza) antes que del ejercicio o de Ajustes; la barra del descanso
  vuelve a caber en una línea (`.boton.enlace` tenía un `min-width` de 14em
  que la rompía); tras la prueba, la serie dice el 1RM que ha salido. Las
  gráficas siguen con su paleta propia (azul, naranja, verde, ámbar): datos,
  no interfaz.

## Ronda 0.49.0 (17-10-2026): la programación, por fin sencilla

Esquema v17. Dan: «la programación me da más problemas que el papel». Hecho:
- **Asistente de series** (`vistas/configurar-series.js`, `abrirAsistenteSeries`):
  una pregunta cada vez (qué serie es → qué mejoras → cómo te lleva la app →
  rango o valor → recámara, cuántas, cómo son y dónde, ya contestadas). Lo
  contestado queda en una línea con «Cambiar». Se usa en la rutina y en la
  ficha («+ Añadir series»). Formas y planes en `rapidas.js`
  (`crearPlanesRapidos`, `completarForma`, `textoForma`); los modos son
  doble progresión, sube al completarlas (reps fijas), **peso según tu 1RM**
  (`progresion.porRM`: fijas reps o %; el peso sale del mejor 1RM de 8
  semanas, `rmReciente`, y el objetivo son las reps que superan el 1RM de la
  última vez), un poco más cada vez, solo apuntar y los prehechos propios.
  Series **ascendentes** (pirámide: reps del máximo al mínimo, peso sube).
- Ficha: cada serie en una línea (`lineaPlan`, `nombreRegla` en series.js)
  con «Ajustar» (abre el editor de siempre) y ✕ con «Deshacer». Los tres
  botones de vista, en rejilla fija. «Deshacer los cambios» en ficha y rutina
  (foto al entrar: `fotosFicha`, `fotoRutina`).
- Rutina: quitar una serie del día ya no borra nada (queda en «Series de
  este ejercicio que hoy no hace este día»).
- Entreno: letrero «Prueba de 1RM» en la serie de prueba (`esPrueba`);
  «espera a la prueba» aparece y desaparece con ella (`pruebasVistas`);
  `pesoDePlan` (calculos.js) pone el peso de cualquier serie desde un 1RM.
- Prehecha «Fuerza sin máquinas» versión 2 (curl femoral sentado, cardio de
  calentamiento al empezar los días de pierna, pautas de calentamiento);
  `plantillaNueva` / `actualizarDesdePlantilla` y el aviso «Actualizar mi
  rutina» en Hoy y en el editor (no toca los entrenamientos).
- «Drop set» pasa a **serie descendente** en todos los textos (la clave
  interna sigue siendo 'drop-set').
- Estética (`docs/guia-de-estilo.md`, nueva): iconos de trazo en toda la app
  (papelera, bocadillo, ojo, reloj, cerrar, bombilla…); los desplegables son
  botoncitos redondos con «+»/«−»; sin cortes con guion; avisos del descanso
  con una pregunta clara al entrenar (`preguntaAvisos`) y sin campana;
  vibración más larga; presentación con la caja más lenta, sonidos de rebote
  sintetizados (solo suenan si el navegador lo deja) y la pesa nítida al
  final (`.pesa.quieta`); oblicuos como capa propia simétrica; fuera el pulso
  de las fuentes de «¿Voy hoy?».
- GIF: las animaciones grises con músculos en rojo (peso muerto sumo,
  prensa, tríceps sobre la cabeza) son de FitnessProgramer, subidas a wger
  por terceros; sus condiciones prohíben copiarlas. No se añaden más.
- 0.49.1-0.49.2: página oculta `#/prueba-botones` (`vistas/prueba-botones.js`)
  con cuatro formas de ordenar los botones de abajo del entreno, para que Dan
  elija. Borrador de correo a FitnessProgramer pidiendo permiso (en Gmail de
  Dan, lo envía él). Animaciones libres provisionales: `herramientas/
  animar_imagenes.py` junta las dos posturas de Everkinetic y wger en un
  WebP animado (`web/imagenes/ejercicios/anim/`, 62 ejercicios); creditos
  guarda la estática en `estatica` y marca `animada`. El encargo de dibujos
  a Design pide el estilo de la guía de Ángel7Real (figura gris, músculo en
  rojo) con dibujos propios.
