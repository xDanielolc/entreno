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

PENDIENTE: nombre e icono con Design («luego ya decoramos»); publicar la app
en la consola de Google (es cosa suya); repasar las descripciones de las
progresiones contrastándolas con las fuentes, que él pidió y solo está hecho
lo de Bilbo.
