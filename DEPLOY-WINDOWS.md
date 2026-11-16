# Desplegar las funciones desde tu Windows

> Lo mismo que `DEPLOY.md` pero en PowerShell. Lo que hay que subir es
> **`emparejarConCreador`**: sin ella, quien se cree una cuenta nueva ya no
> te tendrá de amigo, así que entra y no tiene a nadie a quien dibujar.
>
> Cada paso trae **qué debe salir**. Si lo que sale no se parece, párate ahí
> y mándame la línea entera; seguir con un paso a medias es lo que rompe las
> cosas.

---

## Paso 0 — Abre PowerShell

Tecla Windows → escribe `powershell` → Enter.

⚠️ **No uses el "Símbolo del sistema" (cmd)**, ni Git Bash. Los comandos de
abajo son de PowerShell.

---

## Paso 1 — ¿Tienes el repo descargado?

```powershell
Test-Path "$HOME\drawing-app"
```

**Qué debe salir:** `True`.

**Si sale `False`**, búscalo antes de descargarlo otra vez:

```powershell
Get-ChildItem -Path $HOME -Recurse -Depth 3 -Directory -Filter "drawing*" -ErrorAction SilentlyContinue | Select-Object FullName
```

- **Sale una ruta** → úsala en el Paso 2 en vez de `$HOME\drawing-app`.
- **No sale nada** → descárgalo:

```powershell
cd $HOME
git clone https://github.com/jic51/drawing-app.git
```

> Si `git` no existe, instálalo desde https://git-scm.com/download/win,
> **cierra PowerShell y ábrelo de nuevo**, y repite.

---

## Paso 2 — Métete en la carpeta

```powershell
cd "$HOME\drawing-app"
Get-Location
```

**Qué debe salir:** una ruta que **acaba** en `drawing-app`.

---

## Paso 3 — ¿Es el repo correcto?

```powershell
git remote -v
```

**Qué debe salir:** dos líneas con `jic51/drawing-app`.

**Si sale otro nombre**, estás en otro proyecto. Vuelve al Paso 1.

---

## Paso 4 — ¿Estás en `main` y al día?

```powershell
git branch --show-current
```

**Qué debe salir:** `main`.

Si sale otra cosa:

```powershell
git checkout main
```

Ahora trae lo último:

```powershell
git pull origin main
```

**Qué debe salir:** o `Already up to date.`, o una lista de archivos con
`Fast-forward`.

**Si sale `error: Your local changes ... would be overwritten`:** tienes
cambios tuyos sin guardar. Mándame lo que diga `git status` y lo vemos; no
borres nada por tu cuenta.

### La verificación que de verdad importa

```powershell
Select-String -Path "functions\index.js" -Pattern "exports.emparejarConCreador" -SimpleMatch
```

**Qué debe salir:** **una** línea, algo como
`functions\index.js:123:exports.emparejarConCreador = ...`

**Si no sale nada**, el `git pull` no trajo la función y desplegar no sirve
de nada. Párate aquí y dímelo.

---

## Paso 5 — ¿Tienes Node, y de la versión que hace falta?

```powershell
node -v
```

**Qué debe salir:** `v22.algo` (por ejemplo `v22.22.0`).

- **Dice que no reconoce `node`**, o sale `v18` o menos → instala Node 22
  desde https://nodejs.org (el botón **LTS**), **cierra PowerShell y ábrelo
  otra vez**, y repite.
- **Sale `v20`** → probablemente funcione, pero avísame antes de seguir.

---

## Paso 6 — ¿Tienes las herramientas de Firebase?

```powershell
firebase --version
```

**Qué debe salir:** un número, tipo `13.x.x` o más.

**Si dice que no reconoce `firebase`**, instálalo:

```powershell
npm install -g firebase-tools
```

Tarda uno o dos minutos y escribe mucho. Al final:

```powershell
firebase --version
```

**Si sigue diciendo que no lo reconoce:** cierra PowerShell, ábrelo de nuevo
y vuelve a probar. Es que el PATH no se había refrescado.

**Si el `npm install -g` falla con `EPERM` o `access denied`:** cierra
PowerShell, búscalo otra vez en el menú de inicio, clic derecho →
**Ejecutar como administrador**, y repite solo ese comando. Después puedes
volver a un PowerShell normal.

> En Windows no hay `sudo`: lo que en el Mac era la contraseña del
> ordenador, aquí es abrir PowerShell como administrador.

---

## Paso 7 — ¿Estás dentro de tu cuenta de Google?

```powershell
firebase login
```

- **Si ya estabas dentro:** dice `Already logged in as ...` con tu correo.
- **Si no:** abre el navegador, eliges tu cuenta, aceptas, y la ventana dice
  que ya puedes cerrarla.

**Qué debe salir al final:** tu correo, el mismo con el que entras a Firebase.

**Si sale otro correo:** `firebase logout`, y repite.

---

## Paso 8 — ¿Apunta al proyecto correcto?

```powershell
firebase projects:list
```

**Qué debe salir:** una tabla donde aparece `sketchsend-d1976`.

Y ahora selecciónalo:

```powershell
firebase use sketchsend-d1976
```

**Qué debe salir:** `Now using project sketchsend-d1976`.

---

## Paso 9 — Instala lo que las funciones necesitan

```powershell
cd functions
npm install
cd ..
```

**Qué debe salir:** `added N packages` o `up to date`, y puede traer avisos
de `npm warn` — **esos no importan**.

**Si falla con `EEXIST` o `EACCES`:** borra lo instalado y repite:

```powershell
cd functions
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
cd ..
```

Y comprueba que quedó:

```powershell
Test-Path "functions\node_modules\firebase-admin"
```

**Qué debe salir:** `True`.

---

## Paso 10 — Última comprobación antes de subir

```powershell
node --check functions\index.js
```

**Qué debe salir:** **nada**. Ni una línea. Eso significa que el archivo
está bien escrito.

**Si sale un error**, párate y mándamelo entero.

---

## Paso 11 — Despliega

```powershell
firebase deploy --only functions
```

Tarda **entre 2 y 5 minutos** y no da señales de vida en medio. Es normal.

**Qué debe salir al final:** `✔  Deploy complete!`

Y antes de eso, **estas tres líneas**:

```
✔  functions[sendSketchNotification(us-central1)] Successful update operation.
✔  functions[notifySketchViewed(us-central1)]     Successful update operation.
✔  functions[emparejarConCreador(us-central1)]    Successful create operation.
```

⚠️ **La tercera es la que importa.** Dirá `create` porque es nueva. Si no
aparece `emparejarConCreador` en ningún sitio, el despliegue no hizo lo que
hacía falta: mándame la salida entera.

**Si te pregunta si borrar alguna función, di NO** (`N`) y dímelo.

---

## Paso 12 — Comprueba que subió de verdad

```powershell
firebase functions:list
```

**Qué debe salir:** las tres, `emparejarConCreador` incluida.

---

## Paso 13 — Pruébalo de verdad

Esto es lo único que de verdad confirma que funcionó:

1. Abre `sketch-send.com/app` en el móvil, **en una ventana privada** o con
   otra cuenta de Google.
2. Crea una cuenta nueva, ponle un nombre de usuario.
3. **Qué debe pasar:** en el carrusel aparece **`@jose`**, con la etiqueta
   **NEW**, sin que salte ninguna ventana.

**Si no aparece:** espera 30 segundos y recarga — la función tarda un
momento la primera vez que se despierta. Si sigue sin salir, mándame lo que
veas y lo miro en los registros.

---

## Si algo sale mal

```powershell
firebase functions:log --only emparejarConCreador
```

Cópiame las últimas líneas. Y en general: dime **qué comando**, **qué
esperabas** y **qué salió**, con la línea entera. Lo que menos ayuda es "dio
error".
