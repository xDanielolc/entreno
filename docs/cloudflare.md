# Renovador del permiso de Google (Cloudflare)

Para que Google no pida volver a conectar cada hora. Es un servidor muy
pequeño (un «Worker» de Cloudflare, gratis) que guarda **nada**: solo cambia
un pase de larga duración por permisos nuevos. El código está en
`herramientas/cloudflare/renovador.js`.

Tiempo: unos 10 minutos. Lo que hace falta: tu cuenta de Cloudflare y entrar
en Google Cloud Console con la cuenta de la app.

## 1. Crear el Worker

1. Entra en <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   **Create Worker**.
2. Nombre: `entreno-renovador`. Pulsa **Deploy** (despliega un «Hola mundo»).
3. Pulsa **Edit code**, borra todo lo que hay, pega el contenido entero de
   `herramientas/cloudflare/renovador.js` y pulsa **Deploy**.
4. Apunta la dirección que te da, del estilo
   `https://entreno-renovador.TU-NOMBRE.workers.dev`.

## 2. Las variables del Worker

En el Worker → **Settings** → **Variables and Secrets** → **Add**:

| Nombre | Tipo | Valor |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Text | `386174644405-eu6sfe270ae5s3ui3jr32frh9j0aat9a.apps.googleusercontent.com` |
| `ORIGENES` | Text | `https://xdanielolc.github.io` |
| `GOOGLE_CLIENT_SECRET` | **Secret** | el secreto del cliente (paso 3) |
| `CLAVE_CIFRADO` | **Secret** | una clave aleatoria (paso 4) |

Guarda con **Deploy** al final.

## 3. El secreto del cliente de Google

1. <https://console.cloud.google.com> → proyecto de la app → **APIs y
   servicios** → **Credenciales** → el cliente OAuth de la app (tipo «Aplicación
   web»).
2. Copia el **Secreto del cliente** y pégalo directamente en Cloudflare, en
   `GOOGLE_CLIENT_SECRET`.

**No lo pegues en el chat ni en ningún archivo.** Solo tiene que estar en
Cloudflare.

## 4. La clave de cifrado

Abre PowerShell y ejecuta esto (saca 32 bytes al azar):

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

Copia lo que salga y pégalo en Cloudflare, en `CLAVE_CIFRADO`. Tampoco hace
falta que me lo pases.

## 5. Publicar la app en Google (importante)

Mientras la app esté en «Prueba» en la pantalla de consentimiento de Google,
los pases de larga duración **caducan a los 7 días**. Hay que pasarla a «En
producción»: ver `google-cloud.md`, apartado «Quitar la advertencia».

## 6. Decirle a Claude la dirección

Pásame la dirección del paso 1.4. Yo la pongo en `web/js/config.js`
(`urlRenovador`), publico la versión y, la primera vez que toques el
indicador de arriba, Google te pedirá permiso una última vez.

## Cómo funciona, por si alguien pregunta

- La primera vez, la app pide a Google un código y el Worker lo cambia por el
  permiso de una hora y el pase de larga duración (refresh token).
- El pase se cifra en el Worker con `CLAVE_CIFRADO` y se guarda **cifrado** en
  el móvil. El Worker no guarda nada: sin la clave, el pase no sirve, y sin el
  móvil, la clave tampoco.
- Cada vez que el permiso caduca, la app manda el pase al Worker y recibe uno
  nuevo, sin ventanas.
- Solo acepta peticiones desde `https://xdanielolc.github.io`.
- Para cortarlo todo: quitar el acceso de la app en
  <https://myaccount.google.com/permissions>, o borrar el Worker.
