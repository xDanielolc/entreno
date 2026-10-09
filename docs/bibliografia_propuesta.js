// PROPUESTA de bibliografía para web/js/bibliografia.js. Mismo formato que la app.
// Hecha el 09-10-2026 a partir de la auditoría (3_Evidencia/05 Auditoría) y de la investigación
// «Fuerza e hipertrofia». Dan decide qué entra. Todos los DOI se han comprobado en Crossref.
//
// LISTA DE CAMBIOS PROPUESTOS (frente a bibliografia.js actual)
//  A. Enlaces: los 12 de consensus.app, LWW y ResearchGate pasan a https://doi.org/<DOI>.
//  B. «1RM estimado»: Wood 2002 sale (no respalda lo de las 10 repeticiones) y entra Mayhew 2008;
//     Marzagao con dos avisos (no validado contra 1RM medidos; el autor trabaja en Fitbod) y copia con DOI;
//     Nuzzo 2024 no dice «más fiable por debajo de 10»: se cita por lo que sí dice.
//  C. «Series por músculo y semana»: el 10 es de Schoenfeld 2017 y el 12-20 de Baz-Valle 2022;
//     «por encima de 20 no se gana más» pasa a «se gana poco más y sube la fatiga» (Pelland 2026);
//     «y sí más fatiga» ya no se atribuye a Refalo 2023 (no la mide) sino a Morán-Navarro 2017 y Pareja-Blanco 2020.
//  D. «Cómo cuenta un drop set»: Fink 2018 dio +10 % con drop set y +5 % con tres series (sin diferencia
//     estadística, 16 personas), no «como tres series»; la última bajada de Ozaki llega al 30 % del 1RM, no del peso de partida.
//  E. «Fuerza e hipertrofia»: «de ahí el rango de 6 a 10» pasa a decisión práctica (ningún estudio lo señala);
//     se añaden Lopez 2021, Grgic 2022 y Robinson 2024.
//  F. «Frecuencia»: se añade Grgic 2018 (más días ayuda a la fuerza) y Pelland 2026.
//  G. «Máximo trabajo»: el suelo del 30 % se apoya en Lasevicius 2018 (el 20 % rinde menos), no en Schoenfeld/Lopez.
//  H. «Cuánto de tu peso levantas»: manos en alto vale 55 % a 30 cm y 41 % a 61 cm; pica y pino no se midieron;
//     la estatura no influyó (fuera «varía con la longitud de brazos y piernas»).
//  I. «Método Bilbo»: reescrita: un solo ensayo publicado (González-Alcázar 2025, un componente del método, equivalente al tradicional); mecanismos plausibles
//     con su fuente; sus cifras son decisiones prácticas; Bilbo + 3×5 es combinación práctica sin estudio.
//  J. Entradas NUEVAS (huecos): rango 6-10, cercanía al fallo y recámara, descanso entre series, velocidad y tempo,
//     recorrido y posición estirada, orden de ejercicios, programas con nombre (5×5, 5/3/1, HST, Heavy Duty),
//     recuperación entre sesiones (las horas del mapa), novatos y avanzados, variabilidad entre personas,
//     descargas, calentamiento, progresión, técnicas de intensidad, proteína (una sola entrada), fuerza para la salud (OMS).
//  K. Pelland: la app dice 2025 y el índice 2026; aquí se unifica a 2026 (número impreso 56(2)); la fórmula de los
//     Excel (× 0,03) no es Epley (1/30 = 0,0333): donde la app diga «Epley», «variante de Epley con 0,03».
//  L. Faltaban en bibliografia.js tres fuentes que la app ya usa en el código: Grgic 2022 (fallo), Laurent 2011
//     (escala de recuperación) y Grgic 2018 (frecuencia y fuerza). Van en sus entradas.

export const BIBLIOGRAFIA = [
  {
    tema: '1RM estimado',
    dice: 'Por defecto, cada ejercicio calibra su propia fórmula con tus series: busca el divisor y la curvatura con los que '
      + 'series distintas de la misma quincena dan el mismo 1RM. Mientras no hay datos, usa la de Marzagao (2026), cuyo divisor '
      + 'cambia con el peso. El ajuste personal es un factor sobre ese divisor, que se acerca a 1 mientras haya pocos datos.',
    matiz: 'Las fórmulas clásicas (Epley, Brzycki, Mayhew, Wathan) salen de pocas personas haciendo press de banca; aciertan más '
      + 'por debajo de 10 repeticiones (Mayhew 2008) y las repeticiones a un mismo % del 1RM cambian mucho entre ejercicios '
      + '(Hoeger 1990; Nuzzo 2024). La de Marzagao es un preprint (sin revisión por pares) de un investigador de Fitbod, la app '
      + 'de la que salen los datos: 303 494 series de 388 ejercicios. Mejora a las clásicas en consistencia entre series, pero no se '
      + 'ha comprobado contra 1RM medidos de verdad. La calibración personal de esta app usa el mismo criterio y tampoco está '
      + 'validada contra 1RM reales; su exactitud depende de que marques bien la recámara.',
    fuentes: [
      { texto: 'Marzagao (2026), preprint: fórmula con divisor dependiente del peso, 303 494 series de 388 ejercicios (arXiv 2603.17495; copia con DOI en SportRxiv).', url: 'https://doi.org/10.51224/sportrxiv.768' },
      { texto: 'Mayhew et al. (2008), J Strength Cond Res: las ecuaciones del 1RM aciertan más con menos de 10 repeticiones.', url: 'https://doi.org/10.1519/JSC.0b013e31817b02ad' },
      { texto: 'Hoeger et al. (1990), J Strength Cond Res: las repeticiones a un mismo % del 1RM cambian mucho entre ejercicios (citado según Nuzzo 2024 y Marzagao 2026; sin resumen accesible).', url: 'https://doi.org/10.1519/00124278-199005000-00004' },
      { texto: 'LeSuer et al. (1997), J Strength Cond Res: exactitud de 7 ecuaciones en press de banca, sentadilla y peso muerto; todas subestiman el peso muerto (según Marzagao 2026; sin resumen accesible).', url: 'https://doi.org/10.1519/00124278-199711000-00001' },
      { texto: 'Nuzzo et al. (2024), Sports Medicine: metarregresión de repeticiones por % del 1RM (269 estudios); más repeticiones en prensa que en press de banca; la dispersión entre personas crece cuanto más bajo es el % del 1RM.', url: 'https://doi.org/10.1007/s40279-023-01937-7' },
    ],
  },
  {
    tema: 'Drop sets',
    dice: 'La app propone 4 bajadas quitando los mismos kilos cada vez, y te deja cambiarlo.',
    matiz: 'Los drop sets dan la misma hipertrofia y fuerza que las series normales, en la mitad o un tercio de tiempo, con más '
      + 'esfuerzo percibido y más lactato. Ningún estudio compara 3 bajadas contra 4 (los estudios usan 3 o 4): ese número es una '
      + 'decisión práctica, no una recomendación científica.',
    fuentes: [
      { texto: 'Sødal et al. (2023), Sports Medicine Open: metaanálisis de 6 estudios y 142 personas; hipertrofia igual que las series normales, en menos tiempo.', url: 'https://doi.org/10.1186/s40798-023-00620-5' },
      { texto: 'Coleman et al. (2022), International Journal of Strength and Conditioning: 5 estudios; fuerza e hipertrofia iguales (efectos 0,07 y 0,08).', url: 'https://doi.org/10.47206/ijsc.v2i1.135' },
      { texto: 'Havers et al. (2026), Sports Medicine Open: 12 estudios y 274 personas; mismos resultados a largo plazo, con más esfuerzo percibido y más lactato.', url: 'https://doi.org/10.1186/s40798-026-01012-1' },
    ],
  },
  {
    tema: 'Series por músculo y semana',
    dice: 'La app avisa por debajo de 10 series semanales por músculo y a partir de unas 20. Ese 10 baja a 6 en los músculos '
      + 'que entrenas al fallo o con bajadas.',
    matiz: 'El 10 sale de Schoenfeld 2017: cada serie semanal añadida suma alrededor de un 0,37 % de crecimiento y 10 o más series '
      + 'rinden más que menos de 5. El 12-20 es la recomendación de Baz-Valle 2022 para personas entrenadas. Por encima de 20 se '
      + 'sigue ganando, pero poco más y con más fatiga (Pelland 2026). Lo de bajar a 6 series cuando entrenas al fallo NO es una '
      + 'cifra de un estudio: es una decisión práctica de esta app. Lo que sí está medido es que acercarse al fallo estimula algo más '
      + 'por serie (Refalo 2023; Grgic 2022) y que el fallo alarga la recuperación hasta 24-48 h (Morán-Navarro 2017; Pareja-Blanco 2020).',
    fuentes: [
      { texto: 'Schoenfeld, Ogborn y Krieger (2017), J Sports Sciences: dosis-respuesta entre series semanales e hipertrofia; +0,37 % por serie.', url: 'https://doi.org/10.1080/02640414.2016.1210197' },
      { texto: 'Baz-Valle et al. (2022), J Human Kinetics: 12-20 series semanales como recomendación estándar en entrenados.', url: 'https://doi.org/10.2478/hukin-2022-0017' },
      { texto: 'Pelland et al. (2026), Sports Medicine: metarregresión de 67 estudios; más volumen mejora, con rendimientos decrecientes.', url: 'https://doi.org/10.1007/s40279-025-02344-w' },
      { texto: 'Refalo et al. (2023), Sports Medicine: llegar al fallo da como mucho una ventaja trivial para la hipertrofia.', url: 'https://doi.org/10.1007/s40279-022-01784-y' },
      { texto: 'Grgic et al. (2022), J Sport and Health Science: fallo frente a no fallo, iguales en fuerza e hipertrofia; pequeña ventaja del fallo solo en entrenados.', url: 'https://doi.org/10.1016/j.jshs.2021.01.007' },
      { texto: 'Morán-Navarro et al. (2017), Eur J Appl Physiol: al fallo se tarda 24-48 h en recuperar; doblar el volumen sin fallo no lo alarga.', url: 'https://doi.org/10.1007/s00421-017-3725-7' },
    ],
  },
  {
    tema: 'Cómo cuenta un drop set',
    dice: 'Por defecto, un drop set cuenta como todos sus tramos menos uno (uno de tres bajadas son tres series), como en Fink 2018. '
      + 'En Ajustes o en Aprender puedes cambiarlo a la forma de Ozaki 2018: una serie más media por bajada.',
    matiz: 'Sale de los estudios que comparan drop sets con series normales. En Fink 2018 (16 personas), un drop set con tres bajadas '
      + 'hizo crecer el tríceps un 10 % y tres series de 12, un 5 %, sin diferencia estadística con tan poca gente. En Ozaki 2018 '
      + '(9 personas), una serie al 80 % con bajadas hasta el 30 % del 1RM creció igual que tres series. Contar cada bajada como una '
      + 'serie entera inflaría el volumen. Son estudios pequeños: es una aproximación.',
    fuentes: [
      { texto: 'Fink et al. (2018), J Sports Med Phys Fitness: un drop set frente a tres series normales (la forma que usa la app por defecto).', url: 'https://doi.org/10.23736/S0022-4707.17.06838-4' },
      { texto: 'Ozaki et al. (2018), Journal of Sports Sciences: una serie pesada con bajadas hasta el 30 % del 1RM frente a tres series.', url: 'https://doi.org/10.1080/02640414.2017.1331042' },
      { texto: 'Sødal et al. (2023), Sports Medicine Open: metaanálisis; drop sets y series normales dan una hipertrofia parecida, en menos tiempo.', url: 'https://doi.org/10.1186/s40798-023-00620-5' },
    ],
  },
  {
    tema: 'Fuerza e hipertrofia: no se entrenan igual',
    dice: 'Para ganar fuerza, pesos altos y practicar mucho el mismo movimiento. Para ganar músculo, bastantes series cerca del '
      + 'fallo con casi cualquier peso, sin acumular más fatiga de la necesaria.',
    matiz: 'Fuerza: los pesos altos (más del 60 % y sobre todo más del 80 % del 1RM) dan más fuerza máxima que los bajos, unas 0,6 '
      + 'desviaciones típicas más (Schoenfeld 2017; Lopez 2021), incluso con el mismo trabajo total; en parte porque la fuerza es muy '
      + 'específica: mejoras en lo que practicas. Llegar al fallo no añade fuerza (Grgic 2022; Robinson 2024). '
      + 'Músculo: pesos bajos y altos dan un crecimiento parecido si las series se llevan cerca del fallo, desde el 30 % del 1RM. '
      + 'Acercarse al fallo ayuda un poco a crecer, pero quedarse a 1 o 2 repeticiones da lo mismo con igual volumen (Refalo 2024) y '
      + 'cansa menos. El rango de 6 a 10 que propone la app es una elección práctica: pesos medios-altos que dan fuerza además de '
      + 'músculo sin series larguísimas. Ningún estudio señala ese rango como mejor que otro.',
    fuentes: [
      { texto: 'Schoenfeld et al. (2017), J Strength Cond Res: metaanálisis de 21 estudios, pesos altos frente a bajos, en fuerza e hipertrofia.', url: 'https://doi.org/10.1519/JSC.0000000000002200' },
      { texto: 'Lopez et al. (2021), Medicine & Science in Sports & Exercise: metaanálisis en red de 28 estudios; la carga no cambia la hipertrofia y sí la fuerza.', url: 'https://doi.org/10.1249/MSS.0000000000002585' },
      { texto: 'Refalo et al. (2023), Sports Medicine: metaanálisis de la cercanía al fallo y la hipertrofia.', url: 'https://doi.org/10.1007/s40279-022-01784-y' },
      { texto: 'Refalo et al. (2024), J Sports Sciences: 8 semanas al fallo o con 1-2 en recámara en entrenados; mismo crecimiento, menos fatiga.', url: 'https://doi.org/10.1080/02640414.2024.2321021' },
      { texto: 'Grgic et al. (2022), J Sport and Health Science: el fallo no mejora la fuerza.', url: 'https://doi.org/10.1016/j.jshs.2021.01.007' },
      { texto: 'Robinson et al. (2024), Sports Medicine: metarregresión; la hipertrofia sube al acercarse al fallo, la fuerza no cambia.', url: 'https://doi.org/10.1007/s40279-024-02069-2' },
      { texto: 'Schoenfeld et al. (2021), Sports: el «continuo de repeticiones»; el músculo crece igual con 5 que con 30 si llegas cerca del fallo.', url: 'https://doi.org/10.3390/sports9020032' },
    ],
  },
  {
    tema: 'Frecuencia',
    dice: 'La app avisa si llevas más de una semana sin tocar un músculo, y sugiere repartirlo en dos días.',
    matiz: 'A igualdad de volumen semanal, la frecuencia no cambia gran cosa para la hipertrofia; el reparto en dos sesiones sí ayuda '
      + 'cuando el volumen es alto. Para la fuerza, entrenar el mismo levantamiento 2 o 3 veces por semana rinde más que una. '
      + 'El aviso a los 7 días es una decisión práctica.',
    fuentes: [
      { texto: 'Schoenfeld et al. (2016), Sports Medicine: dos veces por semana supera a una, a igual volumen.', url: 'https://doi.org/10.1007/s40279-016-0543-8' },
      { texto: 'Schoenfeld et al. (2019), J Sports Sciences: igualando volumen, la frecuencia no cambia la hipertrofia de forma relevante.', url: 'https://doi.org/10.1080/02640414.2018.1555906' },
      { texto: 'Grgic et al. (2018), Sports Medicine: más días por semana, más fuerza, sobre todo porque suma volumen.', url: 'https://doi.org/10.1007/s40279-018-0872-x' },
      { texto: 'Pelland et al. (2026), Sports Medicine: la frecuencia mejora la fuerza con rendimientos decrecientes; para la hipertrofia, casi nada.', url: 'https://doi.org/10.1007/s40279-025-02344-w' },
    ],
  },
  {
    tema: 'Máximo trabajo',
    dice: 'Busca en tu historial el peso con el que más trabajo (peso × repeticiones) haces y te mantiene ahí, con un tope de repeticiones '
      + 'y un suelo del 30 % del 1RM.',
    matiz: 'Esto es EXPERIMENTAL y no viene de ningún estudio: el trabajo total no es lo mismo que el estímulo de crecimiento. '
      + 'No se puede calcular con fórmulas de 1RM porque todas dicen que el máximo estaría en 0 kg, así que se ajusta a tus propios datos. '
      + 'El suelo del 30 % sí tiene base: con el 20 % del 1RM se gana la mitad de músculo que con el 40, 60 u 80 % (Lasevicius 2018), '
      + 'y los metaanálisis de cargas bajas trabajan desde el 30 % o unas 15 repeticiones máximas.',
    fuentes: [
      { texto: 'Lasevicius et al. (2018), Eur J Sport Science: 20, 40, 60 y 80 % del 1RM con el mismo trabajo; el 20 % rinde la mitad.', url: 'https://doi.org/10.1080/17461391.2018.1450898' },
      { texto: 'Schoenfeld et al. (2017), J Strength Cond Res: metaanálisis de cargas bajas (hasta el 60 %) frente a altas.', url: 'https://doi.org/10.1519/JSC.0000000000002200' },
    ],
  },
  {
    tema: 'Ejercicios con tu peso',
    dice: 'Puedes progresar con lastre o con más repeticiones: si llegas cerca del fallo, los dos hacen crecer el músculo.',
    matiz: 'En Kikuchi y Nakazato 2017 (18 hombres no entrenados), flexiones y press de banca al 40 % del 1RM, ambos hasta el fallo, '
      + 'dieron un crecimiento y una ganancia de fuerza parecidos. Para fuerza máxima, el lastre (más peso) sigue siendo mejor: es lo '
      + 'que dicen los metaanálisis de cargas altas frente a bajas (Schoenfeld 2017; Lopez 2021), no este estudio.',
    fuentes: [
      { texto: 'Kikuchi y Nakazato (2017), Journal of Exercise Science & Fitness: press de banca ligero y flexiones.', url: 'https://doi.org/10.1016/j.jesf.2017.06.003' },
      { texto: 'Schoenfeld et al. (2017), J Strength Cond Res: pesos altos dan más fuerza máxima.', url: 'https://doi.org/10.1519/JSC.0000000000002200' },
    ],
  },
  {
    tema: 'Cuánto de tu peso levantas',
    dice: 'En las flexiones levantas un 64 % de tu peso; con rodillas, un 49 %; con los pies en alto, un 70 % (cajón de 30 cm) o un 74 % '
      + '(61 cm); con las manos en alto, un 55 % (30 cm) o un 41 % (61 cm). En dominadas y fondos, tu peso entero.',
    matiz: 'Medido con plataformas de fuerza en Ebben 2011 (23 personas). La estatura no cambió los porcentajes. Las flexiones en pica '
      + 'o en pino no se midieron en ese estudio: lo que la app pone para ellas es una suposición. Lo de dominadas y fondos es la '
      + 'convención, no una medida.',
    fuentes: [
      { texto: 'Ebben et al. (2011), J Strength Cond Res: análisis de fuerzas en variantes de flexiones.', url: 'https://doi.org/10.1519/JSC.0b013e31820c8587' },
    ],
  },
  {
    tema: 'Gemelo y sóleo',
    dice: 'Elevación de gemelos de pie: trabaja el gemelo y el sóleo. Sentado: sobre todo el sóleo.',
    matiz: 'En Kinoshita 2023 (un estudio de 14 personas no entrenadas, una pierna de pie y la otra sentada durante 12 semanas), el '
      + 'gemelo creció mucho más de pie (9-12 % frente a 1-2 %) y el sóleo creció igual en las dos. Con la rodilla doblada, el gemelo '
      + 'queda corto y casi no trabaja. Es un ejemplo de algo general: el músculo crece más cuando se entrena estirado.',
    fuentes: [
      { texto: 'Kinoshita et al. (2023), Frontiers in Physiology: elevación de gemelos de pie frente a sentado e hipertrofia.', url: 'https://doi.org/10.3389/fphys.2023.1272106' },
    ],
  },
  {
    tema: 'Periodizar: de volumen a peso',
    dice: 'Ir cambiando a lo largo del tiempo de más repeticiones y menos peso a menos repeticiones y más peso sube el 1RM algo más '
      + 'que entrenar siempre igual. Es lo que hace un ciclo Bilbo, y lo que hace Bilbo seguido de un 3×5.',
    matiz: 'Williams 2017 lo encontró para la fuerza máxima, sobre todo con programas que cambian a menudo. Moesgaard 2022, igualando '
      + 'el volumen, vio que periodizar da algo más de fuerza pero el mismo crecimiento muscular, y que lo ondulante gana a lo lineal '
      + 'solo en entrenados. Las diferencias son pequeñas: lo que más cuenta sigue siendo entrenar con constancia y progresar.',
    fuentes: [
      { texto: 'Williams et al. (2017), Sports Medicine: metaanálisis de entrenamiento periodizado frente a no periodizado, en fuerza máxima.', url: 'https://doi.org/10.1007/s40279-017-0734-y' },
      { texto: 'Moesgaard et al. (2022), Sports Medicine: periodización con el mismo volumen, en fuerza e hipertrofia.', url: 'https://doi.org/10.1007/s40279-021-01636-1' },
    ],
  },
  {
    tema: 'Método Bilbo',
    dice: 'Una serie a la máxima velocidad con todas las repeticiones que puedas: empieza hacia el 50 % del 1RM, cada sesión sube 2,5 kg '
      + 'y el ciclo se acaba cuando ya no llegas a 15 repeticiones.',
    matiz: 'Es un método de entrenadores de press de banca (atribuido a Jesús Varela). Solo tiene un ensayo publicado, pequeño y de '
      + 'uno de sus componentes: en 26 powerlifters, una serie ligera (45-60 % del 1RM) rápida y a 4 repeticiones del fallo dio el mismo '
      + '1RM que una serie pesada, con el resto del entrenamiento idéntico (González-Alcázar 2025, con el creador como coautor). Prueba que '
      + 'no perjudica, no que sea mejor, y no prueba el ciclo completo. El 50 %, los 2,5 kg (que no aparecen en ninguna fuente del método) '
      + 'y el corte a 15 son decisiones prácticas. Lo que sí está estudiado, '
      + 'pieza a pieza: mover el peso lo más rápido posible dobla la ganancia de 1RM frente a moverlo despacio (González-Badillo 2014); '
      + 'con pesos ligeros cerca del fallo el músculo crece como con pesos altos, pero el 1RM sube menos (Schoenfeld 2017; Lopez 2021); '
      + 'una sola serie dura basta para progresar en 1RM en entrenados, aunque es una dosis baja, y una serie de 30 al 75 % a máxima '
      + 'velocidad dio el mismo 1RM que 6 series de 5 (Androulakis-Korakakis 2020; Cuevas-Aburto 2021); y llevar al fallo una serie '
      + 'muy larga frena la barra más de un 40 %, que es donde empeora la fuerza explosiva (Pareja-Blanco 2017). Para subir el 1RM lo '
      + 'que más rinde son las series pesadas del propio ejercicio: por eso la app pone un 3×5 detrás. Esa combinación es una decisión '
      + 'práctica sin estudio, coherente con que periodizar sube algo más el 1RM (Williams 2017).',
    fuentes: [
      { texto: 'González-Badillo et al. (2014), European Journal of Sport Science: entrenar a la máxima velocidad frente a la mitad de velocidad.', url: 'https://doi.org/10.1080/17461391.2014.905987' },
      { texto: 'Lopez et al. (2021), Medicine & Science in Sports & Exercise: metaanálisis en red de cargas, fuerza e hipertrofia.', url: 'https://doi.org/10.1249/MSS.0000000000002585' },
      { texto: 'Androulakis-Korakakis et al. (2020), Sports Medicine: dosis mínima para ganar 1RM en entrenados; una serie dura por ejercicio ya funciona.', url: 'https://doi.org/10.1007/s40279-019-01236-0' },
      { texto: 'Cuevas-Aburto et al. (2021), Int J Sports Physiol Perform: 1 serie de 30 al 75 % con velocidad máxima frente a 6×5; mismo 1RM.', url: 'https://doi.org/10.1123/ijspp.2019-1005' },
      { texto: 'Pareja-Blanco et al. (2017), Scand J Med Sci Sports: perder un 20 % o un 40 % de velocidad en la serie; mismo 1RM, menos potencia con el 40 %.', url: 'https://doi.org/10.1111/sms.12678' },
      { texto: 'Trane et al. (2025), Med Sci Sports Exerc: 4×4 al 85 % sube el 1RM un 21,5 %; lanzamientos rápidos al 40 %, un 5,9 %.', url: 'https://doi.org/10.1249/MSS.0000000000003630' },
      { texto: 'González-Alcázar et al. (2025), Applied Sciences: 26 powerlifters, 12 semanas; una serie ligera rápida a 4 en recámara frente a una pesada; mismo 1RM. El único ensayo publicado sobre el protocolo.', url: 'https://doi.org/10.3390/app15041974' },
    ],
  },

  // ---------- ENTRADAS NUEVAS ----------
  {
    tema: 'Cercanía al fallo y recámara',
    dice: 'La app te pide la recámara en cada serie y recomienda quedarte a 1-3 repeticiones del fallo en los ejercicios pesados.',
    matiz: 'Para la fuerza, el fallo no añade nada y resta potencia. Para el músculo, cada repetición que dejas resta un poco, pero '
      + '1 o 2 en recámara dan lo mismo que el fallo con el mismo volumen y cansan menos; en entrenados el fallo aporta una ventaja '
      + 'pequeña. La gente entrenada acierta la recámara con un error de menos de una repetición cerca del fallo, y peor cuanto más '
      + 'lejos: por eso la calibración del 1RM funciona mejor con series a 2 o menos en recámara.',
    fuentes: [
      { texto: 'Refalo et al. (2023), Sports Medicine: metaanálisis; ventaja trivial del fallo para la hipertrofia.', url: 'https://doi.org/10.1007/s40279-022-01784-y' },
      { texto: 'Grgic et al. (2022), J Sport and Health Science: fallo frente a no fallo en fuerza e hipertrofia.', url: 'https://doi.org/10.1016/j.jshs.2021.01.007' },
      { texto: 'Robinson et al. (2024), Sports Medicine: metarregresión por repeticiones en recámara.', url: 'https://doi.org/10.1007/s40279-024-02069-2' },
      { texto: 'Refalo et al. (2024), J Strength Cond Res: los entrenados aciertan 1 y 3 en recámara con un error medio de 0,65 repeticiones.', url: 'https://doi.org/10.1519/JSC.0000000000004653' },
      { texto: 'Halperin et al. (2022), Sports Medicine: revisión; la gente predice las repeticiones que le quedan con un error de alrededor de 1, peor lejos del fallo.', url: 'https://doi.org/10.1007/s40279-021-01559-x' },
      { texto: 'Zourdos et al. (2016), J Strength Cond Res: la escala de repeticiones en recámara.', url: 'https://doi.org/10.1519/JSC.0000000000001049' },
    ],
  },
  {
    tema: 'Descanso entre series',
    dice: 'La app pone 2 minutos por defecto, 30 s entre bajadas y 20 s en rest-pause y miorrepeticiones.',
    matiz: 'En entrenados, 3 minutos dieron más fuerza y algo más de músculo que 1 (Schoenfeld 2016). Entre 1,5 y 3 minutos las '
      + 'diferencias son pequeñas; lo que importa es que no caigan las repeticiones, porque es el trabajo total lo que hace crecer '
      + '(Longo 2022; Singer 2024). En series pesadas, 3-5 minutos. Los 2 minutos por defecto son una elección práctica; los 20-30 s '
      + 'de las técnicas son parte de su definición.',
    fuentes: [
      { texto: 'Schoenfeld et al. (2016), J Strength Cond Res: 1 frente a 3 minutos en entrenados.', url: 'https://doi.org/10.1519/JSC.0000000000001272' },
      { texto: 'Grgic et al. (2018), Sports Medicine: revisión; los entrenados necesitan más de 2 minutos para la fuerza, a los novatos les bastan 1-2.', url: 'https://doi.org/10.1007/s40279-017-0788-x' },
      { texto: 'Singer et al. (2024), Frontiers in Sports and Active Living: metaanálisis; pequeño beneficio de descansar más de 60 s, nada más allá de 90 s.', url: 'https://doi.org/10.3389/fspor.2024.1429789' },
      { texto: 'Longo et al. (2022), J Strength Cond Res: el trabajo total, no el descanso, decide la hipertrofia.', url: 'https://doi.org/10.1519/JSC.0000000000003668' },
    ],
  },
  {
    tema: 'Velocidad y tempo',
    dice: 'Sube el peso lo más rápido que puedas y bájalo controlado. Las excéntricas lentas son una técnica, no la norma.',
    matiz: 'Con el mismo peso, mover rápido dio el doble de ganancia de 1RM que mover a media velocidad (González-Badillo 2014), y '
      + 'frenar la subida a propósito rinde peor para la fuerza (Hermes y Fry 2023). Para el músculo, cualquier tempo entre medio '
      + 'segundo y 8 segundos por repetición da lo mismo; más de 10 segundos, menos (Schoenfeld 2015).',
    fuentes: [
      { texto: 'González-Badillo et al. (2014), European Journal of Sport Science: velocidad máxima frente a la mitad; 1RM +18 % frente a +10 %.', url: 'https://doi.org/10.1080/17461391.2014.905987' },
      { texto: 'Hermes y Fry (2023), J Strength Cond Res: metaanálisis de 24 estudios; la subida intencionadamente lenta da menos fuerza.', url: 'https://doi.org/10.1519/JSC.0000000000004490' },
      { texto: 'Schoenfeld, Ogborn y Krieger (2015), Sports Medicine: duración de la repetición e hipertrofia.', url: 'https://doi.org/10.1007/s40279-015-0304-0' },
    ],
  },
  {
    tema: 'Recorrido completo y posición estirada',
    dice: 'Haz el recorrido completo. Si recortas, recorta por la parte en que el músculo está estirado, no por la acortada.',
    matiz: 'El recorrido completo da más fuerza y más músculo que el parcial en general (Pallarés 2021). Pero los parciales en la zona '
      + 'estirada igualan o superan al completo para crecer: gemelos (Kassiano 2023), tríceps con el brazo por encima de la cabeza '
      + '(Maeo 2023), gemelo de pie frente a sentado (Kinoshita 2023). Lo que no vale es recortar por la parte acortada.',
    fuentes: [
      { texto: 'Pallarés et al. (2021), Scand J Med Sci Sports: metaanálisis; recorrido completo frente a parcial.', url: 'https://doi.org/10.1111/sms.14006' },
      { texto: 'Wolf et al. (2023), Int J Strength and Conditioning: metaanálisis; parciales en la zona larga frente a recorrido completo.', url: 'https://doi.org/10.47206/ijsc.v3i1.182' },
      { texto: 'Kassiano et al. (2023), J Strength Cond Res: revisión; completo o parcial estirado superan al parcial acortado.', url: 'https://doi.org/10.1519/JSC.0000000000004415' },
      { texto: 'Maeo et al. (2023), European Journal of Sport Science: extensión de tríceps sobre la cabeza frente a neutra; 1,4-1,5 veces más crecimiento.', url: 'https://doi.org/10.1080/17461391.2022.2100279' },
    ],
  },
  {
    tema: 'Orden de los ejercicios',
    dice: 'Las rutinas ponen primero los ejercicios básicos y pesados.',
    matiz: 'Lo que haces primero es lo que más mejora en fuerza; para el músculo el orden da igual (Nunes 2021). Así que empieza por lo '
      + 'que más te importe.',
    fuentes: [
      { texto: 'Nunes et al. (2021), European Journal of Sport Science: metaanálisis de 11 estudios sobre el orden de los ejercicios.', url: 'https://doi.org/10.1080/17461391.2020.1733672' },
    ],
  },
  {
    tema: 'Programas con nombre: 5×5, 5/3/1, HST y Heavy Duty',
    dice: 'La app trae estos programas tal como los publicaron sus autores (Starr y StrongLifts, Wendler, Haycock, Mentzer).',
    matiz: 'Ninguno tiene un estudio propio que lo compare con otro: son programas de entrenadores, de libros y webs. Sus cifras '
      + '(5×5, el 90 % del 1RM, los bloques de 15-10-5, una serie al fallo) son decisiones prácticas. Lo que sí está estudiado son '
      + 'sus principios: pesos altos y varias series para el 1RM; variar la carga dentro de la semana ayuda en entrenados '
      + '(Moesgaard 2022); progresar poco a poco; 2-3 series dan más que una (Krieger 2009 y 2010), aunque una serie dura ya sube el '
      + '1RM en entrenados (Androulakis-Korakakis 2020). Heavy Duty: una serie al fallo sí hace crecer, pero varias dan más, el fallo '
      + 'no es imprescindible y las sesiones cada 4-7 días dejan pocas series semanales.',
    fuentes: [
      { texto: 'Krieger (2009), J Strength Cond Res: metaanálisis; 2-3 series dan un 46 % más de fuerza que una.', url: 'https://doi.org/10.1519/JSC.0b013e3181b370be' },
      { texto: 'Krieger (2010), J Strength Cond Res: metaanálisis; varias series dan un 40 % más de hipertrofia que una.', url: 'https://doi.org/10.1519/JSC.0b013e3181d4d436' },
      { texto: 'Carpinelli y Otto (1998), Sports Medicine: la revisión clásica a favor de una sola serie.', url: 'https://doi.org/10.2165/00007256-199826020-00002' },
      { texto: 'Androulakis-Korakakis et al. (2020), Sports Medicine: dosis mínima para el 1RM en entrenados.', url: 'https://doi.org/10.1007/s40279-019-01236-0' },
      { texto: 'Moesgaard et al. (2022), Sports Medicine: ondulante frente a lineal, en entrenados.', url: 'https://doi.org/10.1007/s40279-021-01636-1' },
      { texto: 'Currier et al. (2023), Br J Sports Med: metaanálisis en red; carga alta, varias series y 2-3 días por semana para la fuerza.', url: 'https://doi.org/10.1136/bjsports-2023-106807' },
    ],
  },
  {
    tema: 'Recuperación entre sesiones (las horas del mapa)',
    dice: 'El mapa del cuerpo da 24 h si dejaste 3 o más en recámara, 36 h con 1-2, 48 h al fallo y 60 h al fallo con muchas repeticiones '
      + 'o bajadas, con una curva por volumen y un factor personal.',
    matiz: 'Los estudios miden a 6, 24, 48 y 72 h en press de banca y sentadilla, en hombres entrenados: al fallo se tarda 24-48 h en '
      + 'recuperar la velocidad y la fuerza, más si se llega con muchas repeticiones; doblar el volumen sin fallo no alarga la '
      + 'recuperación (Morán-Navarro 2017). Las cifras de 36, 42 y 60 h son interpolaciones de la app, no de un estudio, y nadie ha '
      + 'medido esto músculo a músculo. La escala de 0 a 10 de «¿cómo llegas?» es la de Laurent 2011.',
    fuentes: [
      { texto: 'Morán-Navarro et al. (2017), Eur J Appl Physiol: recuperación tras series al fallo o no, hasta 72 h.', url: 'https://doi.org/10.1007/s00421-017-3725-7' },
      { texto: 'Pareja-Blanco et al. (2019), Sports: recuperación según carga y pérdida de velocidad, hasta 48 h.', url: 'https://doi.org/10.3390/sports7030059' },
      { texto: 'Pareja-Blanco et al. (2020), J Strength Cond Res: recuperación tras diez configuraciones de series, hasta 48 h.', url: 'https://doi.org/10.1519/JSC.0000000000002756' },
      { texto: 'Laurent et al. (2011), J Strength Cond Res: escala de recuperación percibida de 0 a 10.', url: 'https://doi.org/10.1519/jsc.0b013e3181c69ec6' },
    ],
  },
  {
    tema: 'Novatos y avanzados',
    dice: 'Si eres novato, la app te pone más repeticiones (10-15), más recámara y progresión lineal; si no, 6-10 y ciclos.',
    matiz: 'El 10-15 para novatos es una elección práctica para practicar la técnica con menos peso, no una cifra de estudio. Lo que sí '
      + 'está medido: los novatos ganan fuerza (+21 %) y músculo (+5 %) de media en unos meses con casi cualquier programa; la carga '
      + 'media óptima para la fuerza es el 60 % del 1RM en novatos y el 80 % en entrenados (Rhea 2003); el fallo solo aporta algo en '
      + 'entrenados (Grgic 2022); periodizar solo ayuda en entrenados (Moesgaard 2022); y los entrenados necesitan más series '
      + '(Baz-Valle 2022).',
    fuentes: [
      { texto: 'Rhea et al. (2003), Med Sci Sports Exerc: metaanálisis de dosis-respuesta; 60 % en novatos, 80 % en entrenados.', url: 'https://doi.org/10.1249/01.MSS.0000053727.63505.D4' },
      { texto: 'Ahtiainen et al. (2016), Age: 287 personas; fuerza +21 % y masa +4,8 % de media, con enorme variación.', url: 'https://doi.org/10.1007/s11357-015-9870-1' },
      { texto: 'Lopez et al. (2021), Med Sci Sports Exerc: más hipertrofia en no entrenados; en entrenados, más sesiones.', url: 'https://doi.org/10.1249/MSS.0000000000002585' },
      { texto: 'Moesgaard et al. (2022), Sports Medicine: lo ondulante gana a lo lineal solo en entrenados.', url: 'https://doi.org/10.1007/s40279-021-01636-1' },
    ],
  },
  {
    tema: 'Cada persona responde distinto',
    dice: 'La app ajusta a tus datos el 1RM, la recuperación y el volumen que te sugiere.',
    matiz: 'En 585 personas con el mismo programa, el músculo cambió entre −2 % y +59 % (Hubal 2005). Parte de esa variación es real y '
      + 'parte es error de medida: medir una vez no basta para decir que alguien «no responde» (Dankel y Loenneke 2020). Lo práctico '
      + 'es medir con constancia y subir el volumen antes de concluir nada.',
    fuentes: [
      { texto: 'Hubal et al. (2005), Med Sci Sports Exerc: 585 personas, 12 semanas; cambio de tamaño de −2 a +59 %.', url: 'https://pubmed.ncbi.nlm.nih.gov/15947721/' },
      { texto: 'Ahtiainen et al. (2016), Age: 287 personas con grupo control; altos y bajos respondedores.', url: 'https://doi.org/10.1007/s11357-015-9870-1' },
      { texto: 'Dankel y Loenneke (2020), Sports Medicine: cómo separar la respuesta real del error de medida.', url: 'https://doi.org/10.1007/s40279-019-01147-0' },
    ],
  },
  {
    tema: 'Progresión',
    dice: 'Doble progresión (llenas el rango de repeticiones y subes peso), ciclos con +2,5 kg por sesión y «a más cada vez».',
    matiz: 'Son formas prácticas de aplicar la sobrecarga progresiva; los rangos y el salto de 2,5 kg (el disco más pequeño) no salen '
      + 'de ningún estudio. Lo estudiado: progresar por peso o por repeticiones da lo mismo en 8 semanas (Plotkin 2022); el ACSM '
      + 'propone subir un 2-10 % cuando sobran 1-2 repeticiones; y ajustar la carga por velocidad o por rendimiento del día rinde '
      + 'algo más que los porcentajes fijos (Bao 2026).',
    fuentes: [
      { texto: 'Plotkin et al. (2022), PeerJ: progresar por carga o por repeticiones; equivalentes.', url: 'https://doi.org/10.7717/peerj.14142' },
      { texto: 'ACSM (2009), Med Sci Sports Exerc: posicionamiento sobre progresión.', url: 'https://doi.org/10.1249/MSS.0b013e3181915670' },
      { texto: 'Bao et al. (2026), Frontiers in Physiology: metaanálisis en red; autorregulación frente a porcentajes fijos.', url: 'https://doi.org/10.3389/fphys.2026.1823323' },
    ],
  },
  {
    tema: 'Descargas',
    dice: 'El glosario sugiere una descarga cada seis u ocho semanas.',
    matiz: 'Es costumbre de entrenadores y competidores (cada 5-8 semanas, unos 6 días), no una cifra de estudio. El único ensayo '
      + 'no vio ventaja de una semana de descarga en 9 semanas (Coleman 2024).',
    fuentes: [
      { texto: 'Bell et al. (2023), Sports Medicine Open: consenso de expertos sobre descargas.', url: 'https://doi.org/10.1186/s40798-023-00633-0' },
      { texto: 'Rogerson et al. (2024), Sports Medicine Open: encuesta a competidores; cada 5,6 semanas, 6,4 días.', url: 'https://doi.org/10.1186/s40798-024-00691-y' },
      { texto: 'Coleman et al. (2024), PeerJ: ensayo; sin ventaja de una semana de descarga en 9 semanas.', url: 'https://doi.org/10.7717/peerj.16777' },
    ],
  },
  {
    tema: 'Calentamiento',
    dice: 'La app deja marcar series de calentamiento que no progresan.',
    matiz: 'Calentar mejora el rendimiento en la mayoría de las medidas (Fradkin 2010). El número de series de calentamiento es una '
      + 'elección práctica.',
    fuentes: [
      { texto: 'Fradkin et al. (2010), J Strength Cond Res: metaanálisis; el calentamiento mejora el rendimiento en el 79 % de las medidas.', url: 'https://doi.org/10.1519/JSC.0b013e3181c643a0' },
    ],
  },
  {
    tema: 'Técnicas de intensidad',
    dice: 'Rest-pause, miorrepeticiones, excéntricas lentas, isométrico final y drop sets, combinables.',
    matiz: 'Rest-pause y drop sets dan lo mismo que las series normales (Enes 2021; Sødal 2023). Las excéntricas lentas no añaden '
      + 'crecimiento si la repetición pasa de unos 8-10 segundos (Schoenfeld 2015). Sobre las miorrepeticiones y el isométrico final '
      + 'no hay ensayos: son técnicas de entrenadores.',
    fuentes: [
      { texto: 'Enes et al. (2021), Appl Physiol Nutr Metab: rest-pause y drop set frente a series tradicionales.', url: 'https://doi.org/10.1139/apnm-2021-0278' },
      { texto: 'Sødal et al. (2023), Sports Medicine Open: metaanálisis de drop sets.', url: 'https://doi.org/10.1186/s40798-023-00620-5' },
      { texto: 'Schoenfeld, Ogborn y Krieger (2015), Sports Medicine: duración de la repetición.', url: 'https://doi.org/10.1007/s40279-015-0304-0' },
    ],
  },
  {
    tema: 'Proteína',
    dice: 'La app no aconseja sobre comida. Si quieres un dato: alrededor de 1,6 g de proteína por kilo y día.',
    matiz: 'Metaanálisis de 49 ensayos y 1863 personas: suplementar proteína añade poco (0,3 kg de masa magra) y por encima de 1,6 g '
      + 'por kilo y día no hay más ganancia (Morton 2018).',
    fuentes: [
      { texto: 'Morton et al. (2018), Br J Sports Med: metaanálisis de suplementación proteica y masa muscular.', url: 'https://doi.org/10.1136/bjsports-2017-097608' },
    ],
  },
  {
    tema: 'Actividad física y fuerza para la salud',
    dice: 'La app avisa si no llegas a 150 minutos semanales de cardio moderado, y recuerda que la OMS pide fuerza 2 o más días por semana.',
    matiz: 'Directrices de la OMS de 2020 para adultos: 150-300 minutos semanales de actividad aeróbica moderada o 75-150 intensa, y '
      + 'ejercicios de fuerza de los grandes grupos musculares 2 o más días por semana.',
    fuentes: [
      { texto: 'OMS (2020): directrices sobre actividad física y hábitos sedentarios.', url: 'https://iris.who.int/handle/10665/336656' },
    ],
  },
];
