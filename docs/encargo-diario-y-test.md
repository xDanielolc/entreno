# Encargo: apartado «Diario y test» (17 de octubre de 2026)

Viene de la investigación «Dormir menos sin perder descanso» (carpeta `IA y automatizaciones\Investigación sueño`; leer antes `1_Leer\5 Plan personal de Dan.docx` y, para el detalle de cada medida, el manual paso a paso, pasos 1, 2, 3 y 16). Esa conversación no tocó la app: deja este encargo para una sesión de Claude Code en esta carpeta. Todas las cifras llevan fuente verificada en la investigación; si algo choca con una decisión ya tomada en la app, preguntar a Dan antes de cambiarlo.

## Qué quiere Dan

Un apartado nuevo del menú, **«Diario y test»**, con tres cosas: el peso (ya existe `peso.js`, se reaprovecha), un registro de sueño diario y un test de «cómo voy hoy» con datos objetivos. El objetivo no es registrar por registrar: es que la app cruce sueño y rendimiento en los básicos y le frene (semáforo) cuando el recorte de sueño le esté costando, porque la sensación de cansancio se satura mientras el rendimiento sigue cayendo (Van Dongen 2003).

## Idea de raíz que debe respetar la app

- El sueño real es tiempo en cama por eficiencia; lo único que se recorta gratis es la cama que no es sueño. Dormir por debajo de la necesidad genera deuda, y la deuda se nota antes en el volumen tolerado y la velocidad de la barra que en el 1RM (Cook 2012; Knowles 2022). La app ya mide repeticiones, carga y recámara: ahí está el sensor.
- La sensación («lo descansado que me siento») se guarda como dato, pero **nunca decide sola**: decide el conjunto de sensores del semáforo.
- Nada de fases de sueño ni «puntuación» del reloj: los dispositivos aciertan el sueño (sensibilidad ≥ 0,93) y fallan la vigilia (especificidad 0,18-0,54; Chinoy 2021). Del reloj solo entran hora de dormir, hora de levantarse, duración aproximada y pulso nocturno, y a mano.

## Fase A. Diario (primera entrega)

**Pantalla «Diario»**, una fila por día, con el día de hoy arriba y editable:
- Peso (kg): el campo de `peso.js`, sin duplicar lógica.
- Sueño: hora de apagar la luz, hora de levantarse, minutos hasta dormirse, minutos despierto por la noche, minutos remoloneando. La app calcula tiempo en cama, sueño real y eficiencia (sueño real / tiempo en cama). Normal: eficiencia ≥ 85 %, en jóvenes sanos > 90 % (Ohayon 2004).
- Sensación al levantarse, 1-5 (una estrella por nivel; texto corto detrás de un «?»: «es un dato, no un criterio»).
- Alcohol: no / 1-2 / 3 o más bebidas. Hora del último té o café (opcional).
- Pulso nocturno medio del reloj (lpm, opcional).
- Siesta: minutos (opcional).

**Resumen semanal** (bajo la tabla, o pestaña): media de sueño real, eficiencia, pulso nocturno, sensación; diferencia de sueño entre fin de semana y laborables (jet lag social: más de 1 h extra el fin de semana indica deuda; Roenneberg 2012); y, al lado, el total de repeticiones de las series de trabajo en los básicos de esa semana sacado de `sesiones` (press de banca, sentadilla, peso muerto, remo con barra, press militar: los que la rutina marque como básicos) frente a la semana anterior, en porcentaje.

**Gráfica** (en `graficas.js`, misma estética): sueño real por noche con una línea en la necesidad (por defecto 8,5 h; editable en Ajustes) y, superpuesto, el pulso nocturno.

**Datos**: nuevo bloque `diario[]` en el archivo JSON, una entrada por fecha: `{ fecha, luzApagada, levantado, latenciaMin, despiertoMin, remoloneoMin, sensacion, alcohol, cafeinaHora, pulsoNocturno, siestaMin }`. Sube `VERSION_ACTUAL` (17 → 18) con migración que añade `diario: []` y `perfil.necesidadSuenoH: 8.5`. Los pesos siguen en `perfil.pesos` (no mover). Documentar en `docs/esquema-datos.md`.

## Fase B. Test «¿Cómo voy hoy?» y semáforo (segunda entrega, tras probar la A)

**PVT de 3 minutos** (test de vigilancia psicomotora, versión breve validada: Basner 2011). Pantalla negra; a intervalos aleatorios de 1 a 4 s aparece un contador en milisegundos; Dan toca la pantalla lo antes posible; se guarda el tiempo de reacción. Tres minutos. Medidas: tiempo de reacción medio, lapsos (respuestas de más de 355 ms) y falsas pulsaciones. Usar `performance.now()`, no `Date`. Pantalla completa y sin otras cosas que distraigan. Guardar en `diario[fecha].pvt = [{ hora, mediaMs, lapsos, falsas }]` (puede haber uno por la mañana y otro a las 16:00).

**Escala de Karolinska** (1-9) a las 16:00, un botón de nueve niveles con su texto corto. **Escala de Epworth** (8 situaciones, 0-3) una vez a la semana, en domingo, con aviso: más de 10 indica somnolencia excesiva (Johns 1991).

**Línea base**: los primeros 14 días con datos son la base; la app guarda media y desviación típica de tiempo de reacción, lapsos y pulso nocturno. Hasta tener 10 días de datos, el semáforo no se enseña.

**Semáforo del domingo** (versión simplificada, la misma del plan personal y de la calculadora de la investigación; los umbrales de PVT, pulso y repeticiones son decisiones prácticas, no cifras de estudios, y hay que decirlo detrás de un «?»):

| Sensor | Ámbar | Rojo |
|---|---|---|
| Lapsos medios del PVT de 3 min en la semana | ≥ 5 | ≥ 8 |
| Pulso nocturno medio menos la base | ≥ +3 lpm | ≥ +6 lpm |
| Sueño extra del fin de semana | ≥ 1 h | ≥ 1,5 h |
| Epworth | 8-10 | > 10 |
| Repeticiones totales en básicos frente a la semana anterior | ≤ −10 % | ≤ −15 % |
| Días con siesta involuntaria (casilla en el diario) | 1 | ≥ 2 |

Decisión: todo verde o un ámbar, «adelante»; dos ámbar, «pausa: no recortes esta semana»; cualquier rojo, «marcha atrás: acuéstate 15 min antes dos semanas». Si el perfil no está en modo recorte (ajuste «Estoy recortando sueño», apagado por defecto), el semáforo se muestra igual pero el texto es «tu sueño te está costando» en vez de «no recortes».

**Enlace con «¿Voy hoy?»** (`voy-hoy.js`): si hay diario, la pregunta «¿Cómo has dormido las dos últimas noches?» se rellena sola con el sueño real de las dos últimas noches y la sensación, y se enseña el dato en vez de preguntarlo (coherente con la regla de ese módulo: lo que la app ya sabe no se pregunta). Sustituir la fuente «Dormir 6 h o menos baja el rendimiento… alrededor de un 3 %» por la versión verificada: metaanálisis de 69 publicaciones, caída media del 7,6 %, mayor por la tarde y con restricción tardía (Craven 2022), y añadir que el volumen cae antes que el 1RM (Cook 2012; Knowles 2022).

## Fase C. Prueba de necesidad y adelanto de fase (tercera entrega, si Dan la quiere)

- **Prueba de la cama ampliada**: botón «Empezar prueba de 9-14 días» que marca las fechas; cada día coge el sueño real del diario; a partir del día 7 enseña la media de las tres últimas noches como necesidad estimada y la deuda pagada en los primeros días (Klerman y Dijk 2008; Kitamura 2016); al terminar propone guardar la necesidad en `perfil.necesidadSuenoH`.
- **Plan de adelanto de fase**: hora de levantarse objetivo y semanas; la app propone la hora de cada semana (15-30 min antes por semana), la hora de luz de mañana, la hora de cortar pantallas (2 h antes de acostarse) y la de la cena (antes de las 21:00), y lo enseña en Inicio cada día (Facer-Childs 2019).

## Fuentes a añadir en `bibliografia.js` (tema nuevo «Sueño y rendimiento»)

Van Dongen 2003 (Sleep, PMID 12683469); Belenky 2003 (J Sleep Res, PMID 12603781); Cook 2012 (Int J Sport Nutr Exerc Metab, PMID 22349085); Knowles 2018 (J Sci Med Sport, PMID 29422383) y 2022 (Med Sci Sports Exerc, PMID 36136596); Craven 2022 (Sports Med, PMID 35708888); Lamon 2021 (Physiol Rep, PMID 33400856); Saner 2020 (J Physiol, PMID 32078168); Basner 2011 (Acta Astronaut, PMID 22025811); Johns 1991 (Sleep, PMID 1798888); Chinoy 2021 (Sleep, PMID 33378539); Klerman y Dijk 2008 (Curr Biol, PMID 18656358); Kitamura 2016 (Sci Rep, PMID 27775095); Facer-Childs 2019 (Sleep Med, PMID 31202686); Roenneberg 2012 (Curr Biol, PMID 22578422); Watson 2015 (Sleep, PMID 26039963); Walsh 2021 (Br J Sports Med, PMID 33144349). Todos comprobados en PubMed el 17-10-2026; usar enlaces `https://doi.org/…` o `https://pubmed.ncbi.nlm.nih.gov/PMID/`.

## Estimación

| Fase | Trabajo de Claude Code | Prueba de Dan |
|---|---|---|
| A. Diario, resumen semanal, gráfica, migración v18 | Una sesión larga (3-4 h de trabajo) | 3-4 días rellenándolo en el móvil |
| B. PVT, Karolinska, Epworth, línea base, semáforo, enlace con «¿Voy hoy?», bibliografía | Dos sesiones (5-6 h) | 2 semanas para tener línea base y ver el primer semáforo |
| C. Cama ampliada y adelanto de fase | Una sesión (2-3 h) | 2-3 semanas de uso real |

En total, unas 4 sesiones de código repartidas en 3-5 semanas de calendario, porque entre fase y fase hace falta que Dan lo use. La fase A sola ya permite empezar la línea base de la investigación (semanas 1-2 del plan), así que conviene hacerla primero y rápido.

## Lo que no entra

- Leer el reloj automáticamente (cada marca tiene su API o ninguna; los datos se meten a mano).
- Fases de sueño ni puntuaciones.
- Fármacos, suplementos o consejos médicos: la app enseña los umbrales y remite al médico del sueño si Epworth pasa de 10 dos semanas seguidas.
