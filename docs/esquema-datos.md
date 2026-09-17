# Esquema de datos — versión 1

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

2. **Número de versión desde el primer día** (`version: 1`). Cuando el formato
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
  "version": 1,
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

### 6.4 `progresion` — cómo se decide qué toca hoy

Este es el campo que hace la app flexible de verdad.

**a) Bilbo** (tu método actual)

```json
"progresion": {
  "tipo": "bilbo",
  "diasPorCiclo": 17,
  "cicloActual": 3,
  "ciclos": [
    {
      "n": 1,
      "inicio": "2023-07-17",
      "fin": "2023-08-21",
      "escalera": [40,45,45,50,50,55,55,60,60,65,65,70,70,75,75,80,80]
    }
  ]
}
```

La `escalera` es la lista explícita de los pesos de cada día. La app te
propone rellenarla sola a partir de un peso inicial y un incremento, pero
puedes editar cualquier casilla a mano, exactamente como haces ahora en el
Excel.

**b) Carga** — subes peso cuando cumples el objetivo de repeticiones

```json
"progresion": {
  "tipo": "carga",
  "objetivoEsfuerzo": [8, 12],
  "incremento": 2.5
}
```

**c) Esfuerzo** — el peso no cambia; intentas hacer más cada vez

```json
"progresion": { "tipo": "esfuerzo", "incremento": 1 }
```

**d) Series** — progresas añadiendo series

```json
"progresion": { "tipo": "series", "seriesObjetivo": 5 }
```

**e) Libre** — la app no te sugiere nada, solo registra

```json
"progresion": { "tipo": "libre" }
```

### 6.5 `formula1RM`

`epley` reproduce exactamente tu Excel: `1RM = peso × reps × 0,03 + peso`.
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
