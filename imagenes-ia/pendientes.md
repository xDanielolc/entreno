# Dibujos que no salieron bien (repetir)
- press-declinado: Gemini dibuja el banco plano aunque se le pida declinado (2 intentos).
- dominadas-supinas: salen piernas sueltas junto a cada figura (borrador guardado como borrador-dominadas-supinas.jpg).
- curl-de-muneca: Gemini dibuja un curl de bíceps en la postura final y no lo corrige; se queda el muñeco de antes.
- subida-al-cajon: Gemini dibuja las dos fases iguales (un pie en el cajón) y no lo corrige.
- curl-nordico: la postura final sale a cuatro patas (cadera doblada), no con el cuerpo recto; no se usa.
- elevacion-de-tibiales: dibuja la postura final de puntillas (al revés); no se usa.
- plancha-copenhague: las dos figuras no son la plancha Copenhague (una de lado y otra boca abajo); no se usa.
- hiperextensiones: las dos posturas mal (los pies se sueltan y no baja el tronco); no se usa.
- press-arnold: la figura de inicio sale más pequeña que la final; no se usa.
- giros-rusos: sale con texto (INICIO/FINAL) y la figura reflejada; no se usa.
- posicion-hueca: sale una V (como la barca), no la posición hueca; no se usa.
- sentadilla-a-una-pierna: el pie de apoyo cambia de sitio entre las dos fases y no se puede encajar (borrador guardado).
- press-pallof: estira los brazos hacia el lado y no hacia delante; no se usa.
- rodillas-al-pecho: Gemini sube la misma pierna en las dos figuras (no se ve la alternancia).
- escaleras: Gemini lo dibujó con camiseta y zapatillas.
- estiramiento-de-lumbares-con-rodillas-al-pecho: una pierna estirada y la otra doblada de forma imposible.
- curl-invertido: se usa, pero Gemini pintó el pantalón relleno de negro; repetir cuando haya cupo.
- estiramiento-del-empeine: sale sentado de lado con una rodilla arriba, no sobre los talones.
- estiramiento-de-los-dedos-del-pie: sale en zancada de rodillas, no sentado sobre los talones (Gemini lo reconoce).
- rotacion-90-90: sale con las piernas cruzadas, no en 90/90.

## Revisión de Dan (21-10-2026, página «Dibujos de Entreno»)

Regla nueva: donde había un dibujo hecho por una persona (Everkinetic, wger) se queda ese
(`hecho_por_persona` en imagenes_ia.py) salvo que en la comparativa elija el nuevo
(`"usar": "ia"` en peticiones.json; `"usar": "antes"` fuerza el de antes). Comparativa:
https://claude.ai/artifact/KjxMo32vHkVN25pGW69Vdi (colección `comparar`).

Errores típicos de la IA (ya van en el texto de `peticion_ia.py`): el aparato cambia entre las dos
figuras (banco, barra, patas de la máquina), las placas no se mueven, aparecen poleas, los pies se
«teletransportan», la figura crece o encoge, el agarre cambia, nariz y orejas, poco músculo.
Gemini: 73 buenos de 126; ChatGPT: 1 de 10 (le tocaron las máquinas difíciles). Se usa Gemini.

Pendiente de la revisión:
- Animaciones de 4 fotogramas: curl alterno (un brazo y luego el otro; el curl normal queda con
  los dos), bicho muerto (los dos lados), mountain climbers (las dos piernas).
- Para los que salen «todo mal» (elevación de gemelos, de pie y sentado, extensión de cuádriceps,
  máquinas): adjuntar, además del estilo, una foto real del ejercicio en dos fases.
- Más definición muscular en casi todos (cruces en polea, dominadas con lastre…).
- Cara lisa de maniquí en todos: al final, después de la comparativa.
- Dominadas negativas: usar la dominada buena con la animación invertida.
- Zancadas hacia atrás: puede usar la animación de las zancadas.
- Extensión de tríceps sobre la cabeza: con los dos brazos y de frente.
