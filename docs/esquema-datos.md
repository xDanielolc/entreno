# Esquema de datos — versión 10

> Las secciones de abajo describen la versión 3. Los cambios posteriores están
> resumidos en «Cambios desde la versión 3», al final del apartado 9, y en
> `web/js/esquema.js` (MIGRACIONES).

Este documento describe **cómo se guardan tus datos**. Es la pieza más
importante del proyecto: el código se puede reescribir entero mañana, pero el
historial no se puede recuperar si el formato se estropea.

> **Esquema**, aquí, significa «la forma que tienen los datos»: qué campos hay,
> cómo se llaman y qué contiene cada uno. Es el equivalente a decidir qué
> columnas tiene una hoja de Excel y qué significa cada una.

---

## 1. Principios

1. **Un solo archivo JSON** por usuario, guardado en su propio Google Drive.
   Con una copia local en el móvil para poder entrenar sin cobertura.

   > **JSON** es un formato de texto para guardar datos ordenados. Se puede
   > abrir con el Bloc de notas y leer a simple vista. No es un formato
   > propietario ni comprimido: si mañana esta app desaparece, tus datos
   > siguen siendo legibles.

2. **Número de versión desde el primer día** (`version: 3`). Cuando el formato
   cambie, la app detecta que tu archivo es de una versión anterior y lo
   convierte sola al abrirlo. Nunca tendrás que hacer nada.

3. **Nada se borra de verdad.** Los elementos eliminados se marcan con
   `archivado: true` en vez de desaparecer. Así una equivocación no te cuesta
   historial, y las sesiones antiguas siguen apuntando a ejercicios que ya no
   usas.

4. **Los identificadores no se reutilizan jamás.** Cada ejercicio, rutina o
   sesión tiene un `id` que no cambia aunque le cambies el nombre.

---

## 2. Vista general

```
archivo
├── version, creado, actualizado, dispositivo
├── perfil          quién eres, tus preferencias
├── sedes[]         los gimnasios donde entrenas
├── ejercicios[]    catálogo, cada uno con SU métrica de progresión
├── rutinas[]       plantillas de días de entrenamiento
└── sesiones[]      el historial: lo que hiciste cada día
```

---

## 3. Cabecera del archivo

```json
{
  "version": 3,
  "creado": "2026-09-04T10:00:00Z",
  "actualizado": "2026-09-04T18:32:11Z",
  "revision": 47,
  "origen": "android"
}
```

| Campo | Para qué sirve |
|---|---|
| `version` | Versión del **formato**, no de la app. Solo sube cuando cambia la forma de los datos |
| `revision` | Sube en 1 con cada guardado. Sirve para detectar si el móvil y el Drive se han desincronizado |
| `origen` | Qué dispositivo hizo el último guardado. Útil si un día usas móvil y ordenador a la vez |

---

## 4. Perfil

```json
"perfil": {
  "nombre": "Ana",
  "correo": "ana@ejemplo.com",
  "pesoCorporalKg": 70,
  "unidadPeso": "kg",
  "sedePorDefecto": "sede_centro",
  "tema": "sistema"
}
```

`pesoCorporalKg` no es decorativo: los ejercicios de peso corporal (flexiones,
dominadas) lo necesitan para calcular la carga real.

---

## 5. Sedes (gimnasios)

Si entrenas en varios gimnasios, las máquinas no son las mismas.

```json
"sedes": [
  { "id": "sede_centro",   "nombre": "Centro",   "archivado": false },
  { "id": "sede_pueblo", "nombre": "Pueblo", "archivado": false }
]
```

Un ejercicio puede estar atado a una sede (`Prensa` de un gimnasio no es la misma
máquina que la del otro, y los kilos no son comparables) o ser universal
(`Flexiones` se hacen igual en cualquier parte).

---

## 6. Ejercicios

Aquí está la flexibilidad que pediste. Cada ejercicio declara **qué mide** y
**cómo progresa**, y la app se adapta.

```json
{
  "id": "ej_press_banca_centro",
  "nombre": "Press de banca",
  "sedeId": "sede_centro",
  "grupo": "empuje",
  "archivado": false,

  "carga": {
    "tipo": "peso",
    "unidad": "kg",
    "etiqueta": "Peso"
  },

  "esfuerzo": {
    "tipo": "repeticiones",
    "unidad": "reps",
    "etiqueta": "Repeticiones"
  },

  "lectura": null,

  "formula1RM": "epley",

  "progresion": { ... },

  "notas": "Agarre algo más cerrado que el ancho de hombros"
}
```

### 6.1 `carga` — lo que aumenta con el tiempo

| `tipo` | Significa | Ejemplo tuyo |
|---|---|---|
| `peso` | Kilos añadidos | Press de banca, sentadilla |
| `pesoCorporal` | Tu propio peso, opcionalmente con lastre | Flexiones, dominadas |
| `altura` | Una medida de dificultad geométrica | Flexiones a una mano (altura del ladrillo) |
| `ninguna` | El ejercicio no lleva carga | Estiramientos, yoga |

### 6.2 `esfuerzo` — lo que registras cada día

| `tipo` | Unidad | Ejemplo tuyo |
|---|---|---|
| `repeticiones` | reps | Casi todos |
| `tiempo` | segundos | Paseos del granjero, isométricos |
| `distancia` | metros | Cardio |

Un ejercicio puede medir **dos cosas a la vez** con `esfuerzoExtra`. Es el
caso del cardio: tiempo y, si quieres, distancia.

```json
{
  "id": "ej_cardio",
  "nombre": "Cardio",
  "carga": { "tipo": "ninguna" },
  "esfuerzo":      { "tipo": "tiempo",    "unidad": "min", "etiqueta": "Minutos" },
  "esfuerzoExtra": { "tipo": "distancia", "unidad": "km",  "etiqueta": "Distancia", "opcional": true },
  "progresion": { "tipo": "libre" }
}
```

El tipo concreto (comba, boxeo, correr…) va en la nota de la serie. No hay
récords ni objetivos: se apunta y ya.

### 6.3 `lectura` — el número que marca la máquina

Algunas máquinas no muestran el peso real. En tus dominadas asistidas, la
máquina marca la **ayuda** que te da, así que cuantos más kilos marca, más
fácil es el ejercicio: justo al revés.

```json
"lectura": {
  "etiqueta": "Kg máq",
  "formula": "referencia - lectura",
  "referencia": 95
}
```

Con 95 kg de peso corporal, una máquina que marca 45 da una carga real de 50 kg.
En la app la referencia es el peso corporal del perfil; `referencia` solo se usa
en datos importados de hojas de cálculo que tenían ese peso fijo.

Tú apuntas lo que ves en la máquina; la app calcula y guarda la carga real,
que es la que sirve para comparar y para el 1RM.

### 6.4 `series`: las series del ejercicio, cada una con su progresión

Un mismo ejercicio se hace con varias series que **no progresan igual**: la
Bilbo sigue la escalera del ciclo y la Heavy Duty es un drop set que sube
cuando toca. Por eso la progresión vive en cada serie, no en el ejercicio.

```json
"series": [
  {
    "id": "pl_a1b2c3",
    "tipo": "bilbo",
    "tecnica": null,
    "objetivoEsfuerzo": null,
    "tramosPrevistos": null,
    "progresion": { "tipo": "bilbo", "sobre": "carga", "diasPorCiclo": 17, "cicloActual": 3, "ciclos": [ … ] }
  },
  {
    "id": "pl_d4e5f6",
    "tipo": "intensidad",
    "tecnica": "drop-set",
    "tramosPrevistos": 3,
    "progresion": { "tipo": "carga", "sobre": "carga", "objetivoEsfuerzo": [6, 8], "incremento": 2.5 }
  }
]
```

Al añadir el ejercicio a un entrenamiento aparecen estas series ya rellenas.
El botón «+ Serie» mete la siguiente que falte.

Cada serie puede combinar **varias técnicas** (`tecnicas: ["unilateral",
"rest-pause", "isometrico-final"]`), y cada técnica decide qué se apunta:

| Técnica | Qué añade |
|---|---|
| Drop set | Bajadas: cada una con su peso y sus repeticiones |
| Rest-pause, miorrepeticiones | Miniseries con el mismo peso |
| Isométrico final | Una casilla de segundos |
| Excéntricas lentas | Repeticiones y segundos de bajada |
| Unilateral | Marca que va por lado |
| Fallo técnico, fallo absoluto | Ponen la recámara a 0 |

Además, toda serie de repeticiones guarda **`recamara`**: las que podrías
haber hecho y dejaste («45 kg × 12 + 1»). El valor por defecto está en
Ajustes.

**`sobre`** dice a qué se aplica la progresión:

| Valor | Cuándo | Qué sube |
|---|---|---|
| `carga` | El ejercicio lleva peso | Los kilos |
| `esfuerzo` | Cardio, estiramientos, abdominales sin peso | Los minutos, segundos o repeticiones |

Los tipos de progresión son `bilbo` (escalera de días), `carga` (doble
progresión: subes repeticiones en un rango y luego carga), `esfuerzo` (a más
cada vez), `maximo-trabajo` y `libre`.

**`maximo-trabajo`** es experimental: busca en tu historial el peso con el que
más trabajo (peso × repeticiones) haces y te mantiene ahí. No usa fórmulas de
1RM, porque todas dicen que el máximo estaría en 0 kg; ajusta una parábola a
tus pares peso-trabajo y coge su cima. Con `topeEsfuerzo` (50 por defecto) se
limita la serie: si la cima pidiese más repeticiones, propone el peso que se
queda en el tope y lo avisa.

En Bilbo, cada ciclo guarda su `escalera` (la lista explícita de valores de
cada día) y el `generador` con el que se rellenó, para poder repetirlo:

```json
{ "n": 3, "inicio": "2026-01-10", "fin": null,
  "generador": { "inicial": 40, "incremento": 5, "cada": 2 },
  "escalera": [40,45,45,50,50,55,55,60,60,65,65,70,70,75,75,80,80] }
```

### 6.5 `formula1RM`

`epley` reproduce exactamente tu Excel: `1RM = peso × reps × 0,03 + peso` (variante de Epley con 0,03; Epley de verdad usa 1/30 = 0,0333).
Se guarda el nombre de la fórmula, no el resultado, para poder recalcular
todo el historial si algún día cambias de criterio.

---

## 7. Rutinas

Una rutina es una **plantilla**, no un calendario. Dice qué ejercicios lleva
cada día y con qué series, pero no en qué fecha caen.

```json
{
  "id": "rut_plpl_2026",
  "nombre": "PLPL Bilbo + Heavy Duty",
  "activa": true,
  "dias": [
    {
      "id": "dia_empuje",
      "nombre": "Día 1 — Empuje",
      "ejercicios": [
        {
          "ejercicioId": "ej_press_banca_centro",
          "opcional": false,
          "series": [
            { "tipo": "bilbo",      "objetivoEsfuerzo": [20, 30] },
            { "tipo": "intensidad", "tecnica": "drop-set", "objetivoEsfuerzo": [6, 8] }
          ]
        },
        {
          "ejercicioId": "ej_cardio",
          "opcional": true,
          "series": [ { "tipo": "libre", "objetivoEsfuerzo": [10, 20] } ]
        }
      ]
    }
  ]
}
```

### Tipos de serie

| `tipo` | Qué es |
|---|---|
| `bilbo` | Serie larga submáxima, sin llegar al fallo. La que alimenta tu progresión |
| `intensidad` | La serie dura. Lleva además una `tecnica` |
| `calentamiento` | No cuenta para récords ni para la progresión |
| `libre` | Cualquier cosa que añadas sobre la marcha |

### Técnicas de intensidad

`drop-set`, `rest-pause`, `isometrico-final`, `excentricas-lentas`,
`unilateral`, `fallo-tecnico`, `fallo-absoluto`. La lista es ampliable desde
la propia app: son solo etiquetas.

---

## 8. Sesiones — el historial

Una sesión es **lo que pasó de verdad**, que no tiene por qué parecerse a la
rutina. Aquí es donde vive tu libertad de cambiar cosas sobre la marcha.

```json
{
  "id": "ses_20260904_1830",
  "fecha": "2026-09-04",
  "sedeId": "sede_centro",
  "rutinaId": "rut_plpl_2026",
  "diaRutinaId": "dia_empuje",
  "estado": "terminada",
  "inicio": "2026-09-04T18:30:00Z",
  "fin": "2026-09-04T19:12:00Z",

  "ejercicios": [
    {
      "ejercicioId": "ej_press_banca_centro",
      "cicloN": 3,
      "diaCiclo": 8,
      "series": [
        {
          "id": "s1",
          "tipo": "bilbo",
          "carga": 60,
          "lectura": null,
          "esfuerzo": 22,
          "objetivo": 19.4,
          "superado": true,
          "hecha": true
        },
        {
          "id": "s2",
          "tipo": "intensidad",
          "tecnica": "drop-set",
          "carga": 75,
          "esfuerzo": 7,
          "hecha": true,
          "anadidaEnSesion": true
        }
      ],
      "notas": "La última costó"
    }
  ],
  "notas": ""
}
```

Campos que merecen explicación:

- **`objetivo`** guarda el número que la app te enseñó *antes* de la serie
  («supera 19,4»). Se guarda el valor, no la fórmula, para que dentro de dos
  años sigas viendo qué te pidió aquel día aunque el cálculo haya cambiado.
- **`planId`** enlaza la serie con su plantilla en el ejercicio. Es lo que
  permite saber por qué ciclo vas y comparar con las veces anteriores.
- **`tramos`** guarda las bajadas de un drop set, un rest-pause o unas
  miorrepeticiones: `[{ "carga": 75, "esfuerzo": 8 }, { "carga": 60, "esfuerzo": 6 }]`.
  El trabajo de la serie es la suma de todos los tramos.
- **`anadidaEnSesion: true`** marca lo que improvisaste. Al terminar, la app
  te pregunta: *«has añadido una serie de fondos, ¿la dejo solo para hoy o la
  meto en tu rutina para siempre?»*. Si dices que sí, se añade a la rutina y
  esta marca desaparece.
- **`borrada`** (fecha o `null`): el entrenamiento está en la papelera. No
  cuenta para la progresión ni aparece en el historial, pero se puede
  recuperar. Un entrenamiento nunca se elimina del archivo.
- **`hecha: false`** es una serie que la rutina proponía y te saltaste. Se
  guarda igualmente, porque saber lo que no hiciste también es información.

---

## 9. Cómo se migra a versiones futuras

Cada versión del esquema tendrá una función de conversión que lleva del
formato anterior al nuevo. Al abrir la app:

1. Lee `version` del archivo.
2. Si es menor que la actual, aplica en cadena las conversiones que falten
   (1 → 2 → 3…).
3. **Antes de tocar nada**, guarda una copia del archivo original en Drive
   con el nombre `entrenamiento-v1-copia-2026-09-04.json`.
4. Guarda el resultado y sigue.

El paso 3 no es opcional. Es la red de seguridad.

### Cambios desde la versión 3

- **v4.** El fallo deja de ser una técnica: se deduce de `recamara` (0 =
  fallo). Cada plantilla de serie gana `tramoSalto` (kilos por bajada).
- **v5.** `perfil.dropSet = { bajadas, salto, inicioPorcentaje }`.
- **v6.** Cada ejercicio gana `musculos = { principales: [], secundarios: [] }`
  con claves de `web/js/musculos.js` (cuello, trapecio, hombro,
  hombroPosterior, pecho, biceps, triceps, antebrazo, abdomen, oblicuos,
  dorsal, lumbar, gluteo, abductores, cuadriceps, aductores, isquios, gemelo,
  tibial).
- **v7.** `perfil.descansoTramos = { 'drop-set': 30, 'rest-pause': 20,
  miorepeticiones: 20 }` (segundos) y `perfil.dropSet.autoRellenar`. En las
  series con tramos: `cargaAutomatica` (la app puede recalcular sus pesos
  mientras no los toques) y `rellenoDesde = { rm, porcentaje }`. Se limpian
  los pesos no numéricos que dejaba «+ Bajada».
- **v8.** `perfil.tramosPorDefecto` (rest-pause y miorrepeticiones),
  `perfil.respiracion = { veces, inspirar, espirar }`,
  `perfil.recuperacion = { factores: { musculo: 0.7…1.4 }, desde: { musculo: fecha } }`.
  En cada plantilla de serie, `tramosModo` ('ultima' | 'ajustes' |
  'plantilla'), `tramoReps` y `tramosFijos` (kilos fijos de un drop set). En
  cada sesión, `sensaciones = { musculo: { sentida, prevista } }` y
  `sensacionesCerrada`. En ejercicios de estiramiento, movilidad o yoga,
  `estiramiento = { tecnica, asistencia }`, y en sus series además `nivel`
  (escala de apoyo con la mano).
- **v9.** `formula1RM`: 'personal' (por defecto; calibrada con tus series),
  'peso' (Marzagao 2026) o 'epley'. `maquinaPlacas` en cada ejercicio. Cada
  sede lleva `tipo` (gimnasio, casa, calle, otro) y las rutinas `sedeId`. En
  las series con tramos, `modoCarga` ('rm' o 'kg'), `rmUsado` y en cada tramo
  `pct` (porcentaje del 1RM); desaparecen `cargaAutomatica` y `rellenoDesde`.
- **v10.** `perfil.tutoriales = { nivel: 'basico' | 'avanzado' | 'ninguno' | null,
  vistos: { clave: true } }`, `perfil.modoEntreno` ('serie' | 'ejercicio' |
  'todo'), `perfil.dropSet.modoCarga` ('rm' | 'kg'; sustituye a
  `autoRellenar`, que se conserva). En cada ejercicio de peso corporal,
  `fraccionCorporal` (parte del peso que se levanta: flexiones 0,64) y en sus
  series `lastre` (kg; null = la carga se escribió a mano). `modoCarga`
  también en cada plantilla de serie y en cada ejercicio de un día de rutina
  (null = heredar). La progresión «esfuerzo» admite `sobre: 'carga'` (más
  peso con las mismas repeticiones).
- **Sin cambio de versión (0.17.0 a 0.20.0).** `perfil.cuestionario =
  { experiencia, objetivo, donde, tema, hecho }`, `perfil.tema` ('claro' |
  'oscuro' | 'sistema'), `perfil.tutoriales.paso` y `guiaHecha`,
  `perfil.bilboMinReps`, `perfil.hiit = { preset, trabajo, descanso, rondas }`,
  `perfil.descansoEstiramientos` (segundos; 20 si falta).
  `perfil.preguntarComoLlegas` (false = no preguntar), `perfil.comoLlegasSaltos`,
  progresión ciclo `corte.cargaMax` y `corte.rmPct` (se corta si el peso llega
  a X kg o pasa del Y % del 1RM), `plan.calentamiento` (el tipo de serie ya no
  se elige: sale de la regla, las técnicas y esta casilla), `ej.recamaraPorDefecto`
  (recámara propia del ejercicio; si falta, la del perfil).
  Sesiones: `vista = { modo, pos }` (cómo se está viendo el entreno) y
  `tutorial` (true en el entrenamiento de prueba de la guía). Progresión de
  ciclo (tipo 'bilbo'): `preset`, `corte = { sesiones, esfuerzoMin,
  esfuerzoMax }`, `reinicio = { modo, porcentaje }`; cada ciclo lleva
  `inicio` y `fin` (fechas). En creditos.json, `aliasDe` marca las imágenes
  que reutilizan la de otro ejercicio.
- **Sin cambio de versión (0.22-0.23).** Perfil: `glosario` ('siempre' |
  'primera' | 'ninguno'), `preguntarVista` (false = no preguntar cómo ver el
  entreno), `hiitPropios` (lista de `{ nombre, trabajo, descanso, rondas }`),
  `tutoriales.guia` (guía en curso) y `tutoriales.hechas` (por guía).
  Ejercicios: `medidas` (lista ordenada de 'repeticiones' | 'tiempo' |
  'distancia'; la primera es la que llevan las reglas, y si falta se deduce de
  `esfuerzo` + `esfuerzoExtra`). Series de una sesión: `extras` (lo apuntado en
  las medidas que no son la principal, por nombre). Progresión de ciclo:
  `reinicio.modo` acepta `'rm-ciclo'` (al % del mejor 1RM logrado en ese ciclo)
  y `ciclo.generador` acepta `inicialEsfuerzo` e `incrementoEsfuerzo` (que
  suban peso y repeticiones a la vez). Planes de serie: `tramoInicio` (% del
  1RM por el que arranca un drop set). Ejercicios: `rmManual` (kg; el 1RM que sabes, solo cuenta mientras no hay series). Progresión de ciclo: `corte.cuantas`
  (con cuántas condiciones marcadas se acaba: 1, 2… o 'todas'),
  `reinicio.modo` acepta `'reps'` con `reinicio.reps` (empieza por el peso al
  que harías esas repeticiones) y `ciclo.generador.extras`
  ({ medida: { inicial, incremento } }, el objetivo de las medidas que no son
  la principal). Estiramientos de una serie:
  `estiramiento.asistencias` (lista; `asistencia` se mantiene con la primera,
  para lo ya guardado) y `estiramiento.cm` (hasta dónde llegas, en centímetros).
- **Sin cambio de versión (0.15.0).** Rutinas: `activa` puede ser true en
  varias a la vez y `diasSemana` (lista de 0 = lunes … 6 = domingo, o null).
  Ejercicios: `pesosMaquina` (lista de kg disponibles, o null) y `borrado`
  (fecha, o null; va con `archivado: true`). Progresión `programa`:
  `{ tipo: 'programa', programa: '5x5' | '531' | 'hst', inicial, incremento,
  desde }`; sus series llevan `programaSet` (1…n) y `amrap`.
- **Sin cambio de versión (0.12.0).** `formula1RM` acepta 'personal' y 'peso'
  ('epley' se lee como 'personal'). Las rutinas pueden llevar `descripcion` y
  `plantilla` (id de la rutina prehecha de la que salen), y cada ejercicio de
  un día, `nota` (superseries, alternancias).

---

## 10. Sincronización entre el móvil y Drive

Regla sencilla, pensada para el uso real (un solo usuario, un dispositivo a
la vez, a veces sin cobertura):

1. Al abrir la app se lee la copia local: **instantánea**, funciona sin datos.
2. En segundo plano se pregunta a Drive por su `revision`.
3. Si la de Drive es mayor, se descarga y se avisa: *«datos actualizados desde
   otro dispositivo»*.
4. Al guardar sube la `revision` y se envía a Drive. Si falla (sin cobertura),
   queda en cola y se reintenta al recuperar conexión. **La copia local nunca
   se pierde.**
5. Si al subir se detecta que Drive tiene una revisión más nueva que la que
   teníamos, **no se sobrescribe**: se avisa y se ofrece elegir. Este caso
   solo puede darse si entrenas desde dos dispositivos sin sincronizar entre
   medias.


- **0.28.** `perfil.cuentaDropSet` ('ozaki' | 'x-1'): cuántas series vale
  un drop set o rest-pause al contar el volumen por músculo.

- **0.29-0.30.** `perfil.objetivoSeries` ({músculo: series}); `perfil.recuperacion.factores[m]`
  ausente = automático; `sesion.sensaciones[m].factor` (factor en vigor ese día);
  `ej.unidades` ({distancia: 'km'|'m'|'cm', altura: 'cm'|'m'});
  `progresion.inicio` ({modo, porcentaje, reps}); `reinicio.modo = 'prueba'`;
  `ciclo.pendientePrueba`.

- **v13 (0.44.0).** `plan.soloRutina`: id de la rutina en la que se creó la
  serie desde el editor de rutinas (o 'retirada' si se quitó y ya tenía
  historial); null = serie del ejercicio. Un día de rutina con
  `item.series = null` usa las del ejercicio (las que no son `soloRutina`), y
  «entrenar sin rutina» también. `ej.fotoDe`: nombre del ejercicio del que
  sale la foto (las variantes partidas de otro se llaman distinto).

- **v14 (0.45.0).** `perfil.pesos` ([{ fecha, kg }], uno por día; el último
  manda en `pesoCorporalKg`, ver `web/js/peso.js`). `serie.hechaA`: hora a
  la que se acabó la serie (para los descansos). `item.superserie`: ese
  ejercicio de la rutina se alterna con el siguiente sin descanso.

- **v15 (0.46.0).** `perfil.redondeoKg` (a qué salto se redondean los pesos
  que propone la app; 2,5 por defecto) y `ej.redondeoKg` (el del ejercicio,
  manda sobre el de Ajustes). `perfil.prehechos`: reglas guardadas por el
  usuario ([{ id, nombre, progresion, tecnicas, descripcion }]); una serie
  que viene de una lleva `progresion.deMio` con su id. `progresion.recamaraMin`
  en la doble progresión («carga»): el peso solo sube si la última serie
  dejó al menos esas en recámara.

- **v16 (0.48.0).** `ej.fraccionCorporal` de los ejercicios con tu peso que
  no levantan el cuerpo entero (elevaciones de piernas y rodillas 0,32; curl
  nórdico 0,65) deja de ser 1. `perfil.avisarDescanso`: notificación con
  vibración al acabar el descanso. `serie.rmUsado` también en series
  normales cuyo peso salió del 1RM de hoy (`deHoy: true`).

- **v17 (0.49.0).** `progresion.porRM` en la doble progresión («carga»):
  { fija: 'reps' | 'pct', valor, semanas }. El peso sale del mejor 1RM de
  las últimas `semanas` (`rmReciente` en calculos.js) y el objetivo son las
  repeticiones que superan el 1RM de la última vez. `rutina.versionPlantilla`:
  versión de la prehecha de la que salió (si la prehecha tiene una mayor,
  la app ofrece actualizarla sin tocar lo entrenado).

- **v18 (0.51.0).** Todo opcional. `ejercicio.pesoMinimo`: el peso más bajo
  que propone la app (la barra vacía; sin él, 20 kg si el material es
  «barra» y el peso es libre). `ejercicio.rmManualEn`: cuándo pusiste el 1RM
  a mano (manda sobre las series de hoy hechas antes). En la serie:
  `cargaAuto` (el peso lo puso la app con tu 1RM y se ajusta si el 1RM de hoy
  cambia), `cargaAMano` (lo cambiaste tú: no se toca), `objetivoDe: 'rm'`
  (primera vez en un ciclo: el objetivo iguala tu 1RM, no «la última vez»),
  `rmObjetivo`, y `planIdAntes` / `objetivoAntes` (una serie pasada a
  calentamiento deja su regla y la recupera si vuelve). `sesion.vista.serie`:
  qué serie se ve en el modo «una serie». `progresion.porRM` con
  `fija: 'pct'` también en planes de calentamiento («50 % × 8»; 0 % = la
  barra sola).

- **v19 (0.52.0).** `diario[]`: una entrada por día, `{ id, fecha, luzApagada,
  levantado, latenciaMin, despiertoMin, remoloneoMin, sensacion (1-5),
  alcohol ('no' | 'poco' | 'mucho'), cafeinaHora, pulsoNocturno, siestaMin }`
  (todo opcional salvo `id` y `fecha`, que son la fecha del día en que te
  levantas). Las horas van como «HH:MM». El sueño real y la eficiencia se
  calculan (`diario.js`), no se guardan. `perfil.necesidadSuenoH` (8,5 por
  defecto). Los pesos siguen en `perfil.pesos`.

- **v20 (0.54.0).** Todas las fórmulas del 1RM pasan a «se ajusta a ti»
  (`formula1RM: 'personal'`). `ejercicio.pesoMinimoPct` (opcional): peso
  mínimo como % del 1RM; con `pesoMinimo`, manda el más alto ese día.
- **v21 (0.58.0).** Campo opcional `aviso` en cada ejercicio de un día de rutina: una nota que se ve siempre en el entreno (en el texto de una rutina, un paréntesis que empieza por «!»).
- **v22 (0.60.20).** Los estiramientos que son una postura de yoga llevan el nombre en sánscrito en el título («Estiramiento de isquios (Janu Sirsasana)»); la migración renombra los tuyos que se llamen como el catálogo de antes (y `fotoDe`).
- **v23 (0.60.25).** «CARs de hombro» y «Dislocaciones con pica» pasan a llamarse «Rotaciones de hombro con palo» (si tienes los dos, el segundo se queda con su nombre).
- **v24 (0.61.0).** Campos nuevos opcionales, sin nada que convertir:
  `plan.descansoSegundos` (el descanso guardado para ese tipo de serie),
  `perfil.bilboRepsMax`, `perfil.bilboRecamara` y
  `perfil.redondeoMancuernasKg`.
- **v25 (fase A bis del Diario).** El plan de sueño. Dos campos nuevos
  opcionales del perfil: `levantarseObjetivo` («HH:MM»: la hora a la que
  quieres levantarte) e `inicioPlanSueno` («YYYY-MM-DD»: cuándo empieza el
  plan). Nada que convertir: los archivos antiguos los reciben vacíos y, sin
  ellos, la tarjeta de Inicio dice qué falta en vez de calcular una hora.
  Con ellos y con `perfil.necesidadSuenoH`, `horaAcostarse` (en
  `web/js/diario.js`) calcula la hora de acostarse de esta semana: parte de la
  media de la primera semana apuntada y la adelanta 15 min por semana sin
  pasarse de la hora objetivo, con un tope que nunca deja menos de 7 h de
  sueño real. Nada de esto se guarda: se calcula al pintar.

- **v26 (fase B del Diario: el test de atención).** Cada día del diario puede
  llevar `pvt[]`, una **lista** (puede haber más de un test al día: uno por la
  mañana y otro por la tarde). Cada test es
  `{ hora: "09:14", modo, velocidad, mediaMs, lapsos, falsos }`: la hora a la
  que se hizo, la duración (`modo`: `"min3"`, `"min5"` o `"min10"`), la
  velocidad de respuesta en respuestas por segundo (la media de 1/TR, con tres
  decimales), el tiempo de reacción medio en milisegundos, el número de lapsos
  y el de falsos toques. Nada más se guarda: las medias, la media móvil de 7
  tests, la línea base y la comparación se calculan al pintar
  (`web/js/diario.js`, `MODOS_PVT`).
  Las tres duraciones **no se mezclan nunca**: 3 min con intervalos de 1 a 4 s
  y lapso por encima de 355 ms; 5 y 10 min con intervalos de 2 a 10 s y lapso
  por encima de 500 ms. Por defecto, 5 min, que es la única con un cambio
  mínimo detectable publicado (Thompson 2022; por debajo del 11-12 % no es un
  cambio, es ruido). En gente descansada el de 3 min y el de 10 ni se parecen
  (r = 0,134; Antler 2022) y no hay baremos de ninguna versión (Taillard 2024,
  PMID 38401239): la comparación es siempre con uno mismo. El dato principal
  es la velocidad, porque con 7 h en cama baja aunque los lapsos no suban
  (Belenky 2003).
  En el perfil, dos campos nuevos opcionales para el recordatorio de la
  mañana: `avisarPvt` (true, false o null si aún no se ha contestado) y
  `avisarPvtHora` («HH:MM»; sin ella, media hora después de
  `levantarseObjetivo`). Nada que convertir: los archivos de antes llegan sin
  tests y sin aviso.
- **v27 (lados y medidas de los estiramientos, 27-10-2026).** Una serie de un
  ejercicio de un solo lado puede llevar `plan.lado` (`"izquierda"` o
  `"derecha"`): la app lo dice en la serie y cada lado guarda lo suyo («la
  última vez» va por serie). En el ejercicio, `estiramiento.medida`
  (`"ninguna"`, `"mano"` o `"cm"`) manda sobre cómo se mide un estiramiento;
  sin ella, lo dice `web/js/medidas-estiramiento.js`. La medida de cada serie
  sigue en `serie.estiramiento.cm` o `serie.estiramiento.nivel`. Nada que
  convertir.
- **v28 (medidas del cuerpo y fotos de progreso, 27-10-2026).** Dos
  colecciones nuevas que se funden con Drive como las demás:
  `medidas[]` ({ `id`, `fecha` «YYYY-MM-DD», `clave`, `valor` }: `grasa` en %,
  `kcal`, y perímetros en cm como `cuello`, `hombros`, `pecho`, `biceps-izq`,
  `biceps-der`, `antebrazo-izq`, `antebrazo-der`, `cintura`, `caderas`,
  `muslo-izq`, `muslo-der`, `pantorrilla-izq`, `pantorrilla-der`, o la clave
  de una medida tuya; el peso sigue en `perfil.pesos`) y `fotos[]` ({ `id`,
  `fecha`, `nota`, `driveId`, `borrada` }: la imagen va aparte, en el móvil y
  en la carpeta de la app en Drive, no dentro del JSON). En el perfil,
  opcionales: `medidasPropias` ([{ `clave`, `nombre`, `unidad` }]),
  `recordsHoy` ([{ `ejercicioId`, `tipo` }], los récords que salen en Hoy; sin
  él, los de los básicos) y `retos` (`false` quita los retos del mes de Hoy).
  Nada que convertir.
- **v29 (cribado del sueño, 28-10-2026).** `cribadoSueno` en la raíz de los
  datos: { `fecha`, `version`, `respuestas` } (sí o no por pregunta, claves
  «grupo.pregunta», `CRIBADO_SUENO` en `web/js/diario.js`), o null si no se ha
  hecho. `fusion.js` lo funde entero (`SUELTOS`). Nada que convertir.
