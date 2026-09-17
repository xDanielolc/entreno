// De dónde sale cada número que propone la app.
//
// Todo lo que la app recomienda debería poder rastrearse hasta un estudio o
// hasta una decisión tuya. Lo que no tiene respaldo se dice claramente.

export const BIBLIOGRAFIA = [
  {
    tema: '1RM estimado',
    dice: 'La app estima tu 1RM con la fórmula de Epley (carga × reps × 0,03 + carga), la misma de tus hojas de cálculo.',
    matiz: 'Las fórmulas son fiables hasta unas 10 repeticiones; por encima el error crece mucho, y además cada ejercicio se comporta distinto. '
      + 'En tus propios datos, a 20-40 repeticiones la estimación varía entre un 10 % y un 25 %.',
    fuentes: [
      { texto: 'LeSuer et al. (1997), J Strength Cond Res: exactitud de 7 ecuaciones en press banca, sentadilla y peso muerto.', url: 'https://consensus.app/papers/details/d3b112df359c5e75aa39ba1d70f29c9c/' },
      { texto: 'Wood et al. (2002): la exactitud mejora claramente por debajo de 10 repeticiones y varía según el ejercicio.', url: 'https://consensus.app/papers/details/8f36cbe0910a597889bd1166837d9592/' },
      { texto: 'Nuzzo et al. (2023), Sports Medicine: metarregresión de repeticiones por porcentaje del 1RM; cambia entre ejercicios.', url: 'https://consensus.app/papers/details/dfd84b06ab2e576db05dc4b84bf7bb72/' },
    ],
  },
  {
    tema: 'Drop sets',
    dice: 'La app propone 4 bajadas quitando los mismos kilos cada vez, y te deja cambiarlo.',
    matiz: 'A igualdad de volumen, los drop sets dan la misma hipertrofia y fuerza que las series normales, pero en la mitad o un tercio de tiempo. '
      + 'Ningún estudio compara 3 bajadas contra 4: ese número es una decisión práctica, no una recomendación científica.',
    fuentes: [
      { texto: 'Sødal et al. (2023), Sports Medicine Open: revisión sistemática y metaanálisis de drop sets e hipertrofia.', url: 'https://consensus.app/papers/details/eb3a71bf7d6f542ab96339db59951311/' },
      { texto: 'Coleman et al. (2022): drop sets y entrenamiento tradicional producen adaptaciones similares.', url: 'https://consensus.app/papers/details/496a65e8ac5856269a293c9669e78ab5/' },
      { texto: 'Havers et al. (2026): mismos resultados a largo plazo, con más esfuerzo percibido y más lactato.', url: 'https://consensus.app/papers/details/7ebb8838a4f552f39a1f63c9c6ffb9e6/' },
    ],
  },
  {
    tema: 'Series por músculo y semana',
    dice: 'La app avisa por debajo de 10 series semanales por músculo y a partir de unas 20.',
    matiz: 'Más volumen sigue dando más crecimiento, pero cada vez aporta menos. El rango de 12 a 20 series semanales es un punto de partida razonable; '
      + 'por encima puede seguir funcionando si lo recuperas bien.',
    fuentes: [
      { texto: 'Baz-Valle et al. (2022), J Human Kinetics: 12-20 series semanales como recomendación estándar en entrenados.', url: 'https://consensus.app/papers/details/d82bc2b70af65cea97f69cdebc6ab92a/' },
      { texto: 'Schoenfeld et al. (2017), J Sports Sciences: relación dosis-respuesta entre volumen semanal e hipertrofia.', url: 'https://consensus.app/papers/details/0fec06fa365f5224b7c53cd5acdd007d/' },
      { texto: 'Pelland et al. (2025), Sports Medicine: más volumen mejora, con rendimientos decrecientes.', url: 'https://consensus.app/papers/details/28976bf04deb591980a56525e2ba77d1/' },
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
    tema: 'Método Bilbo',
    dice: 'Ciclos de 17 días con la carga de cada día fijada de antemano, intentando igualar o superar el 1RM estimado anterior.',
    matiz: 'Es el método que traías de tus hojas de cálculo. No hay estudios sobre este esquema concreto; lo que sí está estudiado es que lo importante '
      + 'es acumular volumen cerca del fallo y progresar en el tiempo.',
    fuentes: [],
  },
];
