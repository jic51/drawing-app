# Desplegar las funciones desde tu MacBook

> Las funciones son el código que corre en el servidor de Firebase: el que
> manda la notificación cuando alguien te envía un dibujo, y el que avisa
> cuando alguien ve el tuyo. **La web se publica sola** al fusionar a `main`;
> las funciones NO. Hay que subirlas a mano, y esto es cómo.

Cada paso trae su comprobación. Si una falla, ahí está qué hacer — no sigas
al siguiente.

---

## Paso 0 — Abre la Terminal

En el Mac: `Cmd + Espacio`, escribe `Terminal`, Enter.

---

## Paso 1 — ¿Tienes el repo descargado?

```bash
ls ~/drawing-app
```

**Si lista archivos** (`index.html`, `app`, `functions`…) → ya lo tienes, ve
al paso 2.

**Si dice `No such file or directory`** → búscalo por si está en otro sitio:

```bash
find ~ -name "sketchsendv14.html" -not -path "*/node_modules/*" 2>/dev/null
```

- Si aparece algo, la carpeta del repo es la que contiene `app/`.
- Si no aparece nada, descárgalo:

```bash
cd ~
git clone https://github.com/jic51/drawing-app.git
```

---

## Paso 2 — Métete en la carpeta

```bash
cd ~/drawing-app
```

(si estaba en otro sitio, usa esa ruta)

**Comprobación — ¿estoy donde creo?**

```bash
pwd && ls firebase.json functions/index.js
```

Tiene que imprimir la ruta y luego los dos archivos. Si dice
`No such file or directory`, estás en la carpeta equivocada: vuelve al paso 1.

---

## Paso 3 — ¿Es el repo correcto?

```bash
git remote -v
```

Tiene que aparecer `jic51/drawing-app`. Si aparece otro, estás en otro
proyecto.

---

## Paso 4 — ¿Estás en `main` y al día?

```bash
git status
```

**Si dice `On branch main` y `nothing to commit, working tree clean`** →
perfecto.

**Si dice otra rama:**
```bash
git checkout main
```

**Si dice que tienes cambios sin guardar** (`modified:`), páralo y avísame:
no quiero que pierdas trabajo tuyo por un despliegue.

Ahora trae lo último:

```bash
git pull origin main
```

**Comprobación — ¿tengo de verdad el código nuevo?**

Lo que hace falta subir hoy es **`emparejarConCreador`**: sin ella, quien se
cree una cuenta nueva ya no te tiene de amigo, entra y no tiene a nadie a
quien dibujar.

```bash
grep -c "exports.emparejarConCreador" functions/index.js
```

Tiene que decir **1**. Si dice `0`, el `git pull` no trajo el código nuevo:
repite el paso 4.

> Ojo con `grep -c`: cuenta **líneas**, no apariciones. Que diga exactamente
> `1` es lo correcto; si dijera `2` sería que la función está declarada dos
> veces, que sería otro problema.

---

## Paso 5 — ¿Tienes Node, y de la versión que hace falta?

```bash
node -v
```

Las funciones piden **Node 22**. Si imprime `v22.algo`, bien.

- **Si no imprime nada o dice `command not found`** → instala Node 22 desde
  https://nodejs.org (elige la versión LTS) y vuelve a abrir la Terminal.
- **Si imprime otra versión** puede funcionar igual, pero si el despliegue
  se queja de la versión, ese es el motivo. Ojo con las MÁS nuevas también:
  con Node 25, `firebase-tools` avisa de que solo admite 20, 22 o 24.

---

## Paso 6 — ¿Tienes las herramientas de Firebase?

```bash
firebase --version
```

**Si imprime un número** → ya las tienes.

**Si dice `command not found`** → instálalas:

```bash
npm install -g firebase-tools
```

Si eso falla por permisos, usa `sudo npm install -g firebase-tools` y te
pedirá **la contraseña de tu Mac** (la de desbloquearlo; al escribirla no se
ve nada, ni puntos — es normal).

⚠️ **Ese `sudo` deja un rastro.** Crea archivos a nombre de root en el
almacén de npm, y el siguiente `npm install` normal falla con `EACCES` o
`EEXIST`. Si te pasa, devuélvete la propiedad:

```bash
sudo chown -R $(whoami) ~/.npm
```

Vuelve a comprobar con `firebase --version`.

---

## Paso 7 — ¿Estás dentro de tu cuenta de Google?

```bash
firebase login
```

- Si ya estabas, dirá `Already logged in as tu@correo`.
- Si no, abrirá el navegador para que entres. **Usa la misma cuenta de
  Google con la que creaste el proyecto en Firebase.**

**Comprobación — ¿ve mi proyecto?**

```bash
firebase projects:list
```

Tiene que aparecer **`sketchsend-d1976`** en la lista.

- Si NO aparece, es que entraste con otra cuenta. Sal y vuelve a entrar:
  ```bash
  firebase logout && firebase login
  ```

---

## Paso 8 — ¿Apunta al proyecto correcto?

```bash
firebase use
```

Tiene que decir algo como `Active Project: default (sketchsend-d1976)`.

Si dice que no hay proyecto activo:

```bash
firebase use sketchsend-d1976
```

---

## Paso 9 — Instala lo que las funciones necesitan

```bash
cd functions && npm install && cd ..
```

Tarda un minuto la primera vez. Si al final no sale ninguna línea con
`ERR!`, fue bien.

**Si falla, SÁLTATELO.** Este paso es opcional: Firebase instala las
dependencias en su propio servidor al desplegar, y esa carpeta local solo
sirve para comprobar antes. Si `npm` se resiste, pasa directo al paso 10;
lo único que de verdad hace falta es la comprobación de aquí abajo.

**Comprobación — ¿el código no tiene errores de escritura?**

```bash
node --check functions/index.js
```

Si no imprime nada, está bien. Si imprime un error, avísame y no sigas.

---

## Paso 10 — Despliega

```bash
firebase deploy --only functions
```

Tarda **de 1 a 3 minutos**. Verás líneas de `i functions:` y al final:

```
✔  Deploy complete!
```

**Si pide activar APIs** (sale un enlace), ábrelo, dale a habilitar, espera
un minuto y repite el comando.

**Si dice que hace falta el plan Blaze**: las funciones necesitan ese plan.
Tiene capa gratuita generosa, pero pide tarjeta. Si sale eso, páralo y
hablamos antes.

---

## Paso 11 — Comprueba que subió

```bash
firebase functions:list
```

Tienen que salir **las tres**:

| Función | Qué hace |
|---|---|
| `sendSketchNotification` | Avisa cuando alguien te manda un dibujo |
| `notifySketchViewed` | Avisa cuando alguien ve el tuyo |
| `emparejarConCreador` | Pone a `@jose` de amigo a cada cuenta nueva |

En la salida del paso 10, las dos primeras dirán `Successful **update**
operation` y la tercera `Successful **create** operation`, porque es nueva.

**Si `emparejarConCreador` no sale**, el despliegue no cogió el código nuevo:
vuelve al paso 4 y comprueba el `grep`.

---

## Paso 12 — Pruébalo de verdad

Esto es lo único que confirma que funciona:

1. En tu teléfono, abre **sketch-send.com/app** y activa los avisos
   (Ajustes → Avisos → Activar).
2. Desde la computadora, mándate un dibujo a ti mismo o pídele a alguien
   que te mande uno.
3. **Tiene que llegarte la notificación.**
4. Ahora abre ese dibujo desde la bandeja.
5. **A quien te lo mandó tiene que llegarle "… vio tu dibujo 👀".**

Si el paso 3 funciona y el 5 no, el despliegue fue bien pero falla el aviso
de vuelta: dímelo y lo miro.

**Y la prueba de la función nueva**, que es otra cosa y hay que probarla
aparte:

6. Abre **sketch-send.com/app** en una ventana privada, o con otra cuenta de
   Google.
7. Crea una cuenta nueva y ponle un nombre de usuario.
8. **En el carrusel tiene que aparecer `@jose`, con la etiqueta NEW**, y sin
   que salte ninguna ventana por encima.

Si no aparece, espera 30 segundos y recarga: la función tarda un momento la
primera vez que se despierta. Si sigue sin salir:

```bash
firebase functions:log --only emparejarConCreador
```

y mándame las últimas líneas.

---

## Paso 13 — La web (esto es aparte, y NO son las funciones)

Las funciones y la web se publican por caminos distintos. Lo de arriba sube
las funciones; la web se publica sola **al fusionar a `main`**.

Primero mira si hay algo mío esperando:

```bash
git fetch origin
git log --oneline origin/main..origin/claude/sharp-hamilton-JPQNj
```

- **No imprime nada** → no hay nada pendiente, ya está todo en la web.
- **Imprime una o varias líneas** → eso es trabajo que todavía NO está en
  vivo. Para publicarlo:

```bash
git checkout main
git merge origin/claude/sharp-hamilton-JPQNj
git push origin main
```

**Qué debe salir:** el `merge` dice `Fast-forward` y una lista de archivos;
el `push` acaba con una línea `main -> main`.

Luego espera **1 o 2 minutos** (GitHub Pages tarda en publicar) y recarga
**sketch-send.com/app** con `Cmd + Shift + R`.

---

## Si algo sale mal

Cópiame el mensaje de error **entero**, incluido el comando que escribiste.
Casi todos los fallos de aquí son uno de estos tres: cuenta de Google
equivocada (paso 7), carpeta equivocada (paso 2), o código viejo (paso 4).
