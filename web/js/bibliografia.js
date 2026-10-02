// De dónde sale cada número que propone la app.
//
// Todo lo que la app recomienda debería poder rastrearse hasta un estudio o
// hasta una decisión tuya. Lo que no tiene respaldo se dice claramente.

export const BIBLIOGRAFIA = [
  {
    tema: '1RM estimado',
    dice: 'Por defecto, cada ejercicio calibra su propia fórmula con tus series: busca el divisor y la curvatura con los que '
      + 'series distintas de la misma quincena dan el mismo 1RM. Mientras no hay datos, usa la de Marzagao (2026), cuyo divisor '
      + 'cambia con el peso. El ajuste personal es un factor sobre ese divisor, que se acerca a 1 mientras haya pocos datos.',
    matiz: 'Las fórmulas clásicas (Epley, Brzycki, Mayhew, Wathan) salen de pocas personas haciendo press de banca y fallan por encima '
      + 'de unas 10 repeticiones y entre ejercicios. La de Marzagao es un preprint (aún sin revisión por pares) de un investigador de '
      + 'una app de entrenamiento, pero con 303 494 series de 388 ejercicios, y mejora a las clásicas en todos ellos. La calibración '
      + 'personal usa su mismo criterio; su exactitud depende de que marques bien la recámara.',
    fuentes: [
      { texto: 'Marzagao (2026), preprint: fórmula con divisor dependiente del peso, 303 494 series de 388 ejercicios.', url: 'https://arxiv.org/abs/2603.17495' },
      { texto: 'Hoeger et al. (1990): las repeticiones a un mismo % del 1RM cambian mucho entre ejercicios (prensa frente a press de banca).', url: 'https://journals.lww.com/nsca-jscr/abstract/1990/05000/relationship_between_repetitions_and_selected.4.aspx' },
      { texto: 'LeSuer et al. (1997), J Strength Cond Res: exactitud de 7 ecuaciones en press banca, sentadilla y peso muerto.', url: 'https://consensus.app/papers/details/d3b112df359c5e75aa39ba1d70f29c9c/' },
      { texto: 'Wood et al. (2002), Measurement in Physical Education and Exercise Science: exactitud de siete ecuaciones del 1RM en adultos sedentarios con máquinas.', url: 'https://doi.org/10.1207/S15327841MPEE0602_1' },
      { texto: 'Nuzzo et al. (2024), Sports Medicine: metarregresión de repeticiones por porcentaje del 1RM; cambia entre ejercicios.', url: 'https://consensus.app/papers/details/dfd84b06ab2e576db05dc4b84bf7bb72/' },
    ],
  },
  {
    tema: 'Drop sets',
    dice: 'La app propone 4 bajadas quitando los mismos kilos cada vez, y te deja cambiarlo.',
    matiz: 'A igualdad de volumen, los drop sets dan la misma hipertrofia y fuerza que las series normales, pero en la mitad o un tercio de tiempo. '
      + 'Ningún estudio compara 3 bajadas contra 4: ese número es una decisión práctica, no una recomendación científica.',
    fuentes: [
      { texto: 'Sødal et al. (2023), Sports Medicine Open: revisión sistemática y metaanálisis de drop sets e hipertrofia.', url: 'https://consensus.app/papers/details/eb3a71bf7d6f542ab96339db59951311/' },
      { texto: 'Coleman et al. (2022), International Journal of Strength and Conditioning: drop sets y entrenamiento tradicional producen adaptaciones similares.', url: 'https://journal.iusca.org/index.php/Journal/article/view/135' },
      { texto: 'Havers et al. (2026): mismos resultados a largo plazo, con más esfuerzo percibido y más lactato.', url: 'https://consensus.app/papers/details/7ebb8838a4f552f39a1f63c9c6ffb9e6/' },
    ],
  },
  {
    tema: 'Series por músculo y semana',
    dice: 'La app avisa por debajo de 10 series semanales por músculo y a partir de unas 20. Ese 10 baja a 6 en los músculos '
      + 'que entrenas al fallo o con bajadas, porque el rango clásico se midió con series a 2 o 3 repeticiones del fallo.',
    matiz: 'Más volumen sigue dando más crecimiento, pero cada vez aporta menos. El rango de 12 a 20 series semanales es un punto de partida razonable; '
      + 'por encima puede seguir funcionando si lo recuperas bien. Lo de bajar a 6 series cuando entrenas al fallo NO es una cifra de un estudio: '
      + 'es una decisión práctica de esta app. Lo que sí está medido es que las series cercanas al fallo estimulan más por serie y fatigan más, '
      + 'y que los estudios del rango 10-20 se hicieron con series que dejaban 2 o 3 repeticiones. Poner el mismo mínimo a quien entrena al fallo '
      + 'y a quien no, sería peor que este apaño.',
    fuentes: [
      { texto: 'Baz-Valle et al. (2022), J Human Kinetics: 12-20 series semanales como recomendación estándar en entrenados.', url: 'https://consensus.app/papers/details/d82bc2b70af65cea97f69cdebc6ab92a/' },
      { texto: 'Schoenfeld et al. (2017), J Sports Sciences: relación dosis-respuesta entre volumen semanal e hipertrofia.', url: 'https://consensus.app/papers/details/0fec06fa365f5224b7c53cd5acdd007d/' },
      { texto: 'Pelland et al. (2025), Sports Medicine: más volumen mejora, con rendimientos decrecientes.', url: 'https://consensus.app/papers/details/28976bf04deb591980a56525e2ba77d1/' },
      { texto: 'Refalo et al. (2023), Sports Medicine: llegar al fallo no da más hipertrofia y sí más fatiga.', url: 'https://consensus.app/papers/details/6dcb52427bcc51a9bbef57f2d0e5aa07/' },
    ],
  },
  {
    tema: 'Cómo cuenta un drop set',
    dice: 'Por defecto, un drop set cuenta como todos sus tramos menos uno (uno de tres bajadas son tres series), como en Fink 2018. '
      + 'En Ajustes o en Aprender puedes cambiarlo a la forma de Ozaki 2018: una serie más media por bajada.',
    matiz: 'Sale de los estudios que comparan drop sets con series normales: una serie con cuatro bajadas hizo crecer el músculo '
      + 'como tres series normales (Ozaki 2018), y una con tres bajadas, como tres series de 12 (Fink 2018). La primera forma clava '
      + 'el de Ozaki y la segunda el de Fink, que es la que usa la app; con tan pocas personas no se puede decir cuál es mejor. Contar cada bajada '
      + 'como una serie entera inflaría el volumen. Son estudios pequeños, de 9 a 32 personas, así que es una aproximación.',
    fuentes: [
      { texto: 'Fink et al. (2018), J Sports Med Phys Fitness: un drop set frente a tres series normales (la forma que usa la app por defecto).', url: 'https://pubmed.ncbi.nlm.nih.gov/28474868/' },
      { texto: 'Ozaki et al. (2018), Journal of Sports Sciences: una serie pesada con bajadas hasta el 30 % frente a tres series.', url: 'https://doi.org/10.1080/02640414.2017.1331042' },
      { texto: 'Sødal et al. (2023), Sports Medicine Open: metaanálisis, drop sets y series normales dan una hipertrofia parecida, en menos tiempo.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10390395/' },
    ],
  },
  {
    tema: 'Fuerza e hipertrofia: no se entrenan igual',
    dice: 'Para ganar fuerza, pesos altos y practicar mucho el mismo movimiento. Para ganar músculo, bastantes series cerca del '
      + 'fallo con casi cualquier peso, sin acumular más fatiga de la necesaria.',
    matiz: 'Fuerza: en el metaanálisis de Schoenfeld 2017 (estudios que comparan pesos altos, más del 60 % del 1RM, con pesos '
      + 'bajos), los pesos altos dan más fuerza máxima; en parte porque la fuerza es muy específica: mejoras en lo que practicas, '
      + 'y levantar pesado también es técnica. Por eso el ciclo de fuerza (Bilbo) acaba en pesos altos. '
      + 'Músculo: en ese mismo metaanálisis, pesos bajos y altos dan un crecimiento parecido si las series se llevan cerca del fallo. '
      + 'Y según Refalo 2023, acercarse al fallo ayuda a crecer, pero llegar siempre a él no añade casi nada y cansa más: la '
      + 'fatiga de más puede restar en las series y sesiones siguientes. De ahí el rango de 6 a 10 dejando una o dos en recámara.',
    fuentes: [
      { texto: 'Schoenfeld et al. (2017), J Strength Cond Res: metaanálisis de pesos altos frente a bajos, en fuerza e hipertrofia.', url: 'https://pubmed.ncbi.nlm.nih.gov/28834797/' },
      { texto: 'Refalo et al. (2023), Sports Medicine: metaanálisis de la cercanía al fallo y la hipertrofia.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9935748/' },
    ],
  },
  {
    tema: 'Frecuencia',
    dice: 'La app avisa si llevas más de una semana sin tocar un músculo, y sugiere repartirlo en dos días.',
    matiz: 'A igualdad de volumen semanal, la frecuencia no cambia gran cosa para la hipertrofia; el reparto en dos sesiones sí ayuda cuando el volumen es alto, '
      + 'y para fuerza sí se ve beneficio al entrenar más días.',
    fuentes: [
      { texto: 'Schoenfeld et al. (2016), Sports Medicine: dos veces por semana supera a una, a igual volumen.', url: 'https://consensus.app/papers/details/a624a59dbbb55aef88304a070bef7c14/' },
      { texto: 'Schoenfeld et al. (2019), J Sports Sciences: igualando volumen, la frecuencia no cambia la hipertrofia de forma relevante.', url: 'https://consensus.app/papers/details/0d875e3efa6a5ddbba22355e6dcb8764/' },
    ],
  },
  {
    tema: 'Máximo trabajo',
    dice: 'Busca en tu historial el peso con el que más trabajo (peso × repeticiones) haces y te mantiene ahí, con un tope de repeticiones.',
    matiz: 'Esto es EXPERIMENTAL y no viene de ningún estudio: el trabajo total no es lo mismo que el estímulo de crecimiento. '
      + 'No se puede calcular con fórmulas de 1RM porque todas dicen que el máximo estaría en 0 kg, así que se ajusta a tus propios datos.',
    fuentes: [],
  },
  {
    tema: 'Ejercicios con tu peso',
    dice: 'Puedes progresar con lastre o con más repeticiones: si llegas cerca del fallo, los dos hacen crecer el músculo.',
    matiz: 'En Kikuchi y Nakazato 2017, flexiones y press de banca ligero, ambos hasta el fallo, dieron un crecimiento y una ganancia de fuerza parecidos. '
      + 'Para fuerza máxima, el lastre (más peso) sigue siendo mejor.',
    fuentes: [
      { texto: 'Kikuchi y Nakazato (2017), Journal of Exercise Science & Fitness: press de banca ligero y flexiones.', url: 'https://pubmed.ncbi.nlm.nih.gov/29541130/' },
    ],
  },
  {
    tema: 'Gemelo y sóleo',
    dice: 'Elevación de gemelos de pie: trabaja el gemelo y el sóleo. Sentado: sobre todo el sóleo.',
    matiz: 'En Kinoshita 2023, con una pierna de pie y la otra sentada durante 12 semanas, el gemelo creció mucho más de pie '
      + '(9-12 % frente a 1-2 %) y el sóleo creció igual en las dos. Con la rodilla doblada, el gemelo queda corto y casi no trabaja.',
    fuentes: [
      { texto: 'Kinoshita et al. (2023), Frontiers in Physiology: elevación de gemelos de pie frente a sentado e hipertrofia.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10753835/' },
    ],
  },
  {
    tema: 'Periodizar: de volumen a peso',
    dice: 'Ir cambiando a lo largo del tiempo de más repeticiones y menos peso a menos repeticiones y más peso sube el 1RM algo más '
      + 'que entrenar siempre igual. Es lo que hace un ciclo Bilbo, y lo que hace Bilbo seguido de un 3×5.',
    matiz: 'Williams 2017 lo encontró para la fuerza máxima, sobre todo con programas que cambian a menudo. Moesgaard 2022, igualando '
      + 'el volumen, vio que periodizar da algo más de fuerza pero el mismo crecimiento muscular. Las diferencias son pequeñas: lo '
      + 'que más cuenta sigue siendo entrenar con constancia y progresar.',
    fuentes: [
      { texto: 'Williams et al. (2017), Sports Medicine: metaanálisis de entrenamiento periodizado frente a no periodizado, en fuerza máxima.', url: 'https://link.springer.com/article/10.1007/s40279-017-0734-y' },
      { texto: 'Moesgaard et al. (2022), Sports Medicine: periodización con el mismo volumen, en fuerza e hipertrofia.', url: 'https://www.researchgate.net/publication/357932732_Effects_of_Periodization_on_Strength_and_Muscle_Hypertrophy_in_Volume-Equated_Resistance_Training_Programs_A_Systematic_Review_and_Meta-analysis' },
    ],
  },
  {
    tema: 'Método Bilbo',
    dice: 'Una serie a la máxima velocidad con todas las repeticiones que puedas: empieza hacia el 50 % del 1RM, cada sesión sube 2,5 kg '
      + 'y el ciclo se acaba cuando ya no llegas a 15 repeticiones.',
    matiz: 'No hay ningún estudio sobre el método Bilbo en sí: es un método de entrenadores de press de banca. Lo que sí está estudiado: '
      + 'mover el peso lo más rápido posible da más fuerza que moverlo despacio (González-Badillo 2014); con pesos ligeros cerca del fallo '
      + 'el músculo crece como con pesos altos; pero la fuerza máxima (el 1RM) sube más con pesos altos (Schoenfeld 2017; Lopez 2021). '
      + 'Bilbo empieza con técnica y mucho volumen y acaba en pesos de fuerza: es una forma de periodizar, y periodizar sube algo más '
      + 'el 1RM (Williams 2017). Seguido de unas series pesadas (3×5), cubre las dos cosas: por eso es lo que propone la app si buscas fuerza.',
    fuentes: [
      { texto: 'González-Badillo et al. (2014), European Journal of Sport Science: entrenar a la máxima velocidad frente a la mitad de velocidad.', url: 'https://doi.org/10.1080/17461391.2014.905987' },
      { texto: 'Lopez et al. (2021), Medicine & Science in Sports & Exercise: metaanálisis en red de cargas, fuerza e hipertrofia.', url: 'https://doi.org/10.1249/MSS.0000000000002585' },
    ],
  },
];
