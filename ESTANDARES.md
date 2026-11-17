# Estándares de SketchSend

> Escrito el 2026-11-17, después de que Jose encontrara esto: agregó a su
> amigo Roger usando el **código**, y la app le dijo *«@XK9P2M y tú ya son
> amigos»*. El código haciendo de nombre.
>
> Buscando ese fallo salieron cinco iguales. Este archivo existe para que
> no vuelvan: **cuando algo se decide en más de un sitio, acaba decidiéndose
> de formas distintas.**

---

## 1. Cómo se llama una persona

**La función:** `identidad(p)` y `etiquetaDe(p)`.
**La regla:** manda el **nombre de usuario**. Si no lo hay, el nombre a
secas y **sin arroba**. El correo nunca. El código nunca.

| Lo que hay | Lo que se enseña | Por qué |
|---|---|---|
| `{username:'roger', displayName:'Roger McMullan'}` | `@roger` | El @ manda siempre |
| `{displayName:'Roger McMullan'}` | `Roger McMullan` | **Sin arroba**: `@Roger McMullan` no es nada |
| `'XK9P2M'` (un código) | `XK9P2M` | Un código sirve para **encontrar** a alguien, no para llamarlo |
| `'@roger'` | `@roger` | No se dobla la arroba |
| nada | `?` | No se rompe |

**Para las iniciales de un avatar** va `identidad(p).nombre` (sin arroba):
con ella, la inicial de `@roger` sería una arroba.

### Los cinco sitios que estaban mal

| # | Dónde | Qué salía |
|---|---|---|
| 1 | Al agregar por código | `@XK9P2M y tú ya son amigos` ← lo que vio Jose |
| 2 | En la bandeja | `@Jose Castro` — una arroba pegada a un nombre con espacios |
| 3 | En el nombre que viaja con el dibujo | `@joseisrael5101` — **medio correo de verdad**, enseñado a sus amigos |
| 4 | En Ajustes | sin arroba, mientras el carrusel la ponía: el mismo amigo con dos nombres en la misma app |
| 5 | En la cabecera | tú salías con tu nombre de Google mientras a todos los demás se les llama por su @ |

El 3 era el peor: no es feo, es **un dato privado** que no debería salir.

### Si añades una pantalla

No escribas `'@' + algo`. Llama a `etiquetaDe(...)`. Hay una prueba
(`test-nombres.js`) que falla si alguien vuelve a pegar la arroba a mano.

---

## 2. Cómo se avisa de un error

**La función:** `fallo(donde, e, textoHumano)`.
**La regla:** a la persona se le dice **algo que entienda**; el mensaje de
verdad va a la consola y al registro.

Antes había cuatro formas distintas y **trece sitios enseñaban el mensaje
interno tal cual**. Después de publicar las reglas de Firestore eso
significa avisos que dicen *«Missing or insufficient permissions»*: no
informan de nada y asustan.

```js
try { … }
catch (e) { fallo('agregarAmigo', e, 'No se pudo agregar.'); }
```

`fallo` traduce sola los códigos que más salen:

| Código de Firebase | Lo que lee la persona |
|---|---|
| `permission-denied` | No tienes permiso para hacer eso |
| `unauthenticated` | (el de «necesitas entrar») |
| `unavailable`, `deadline-exceeded` | Sin conexión. Revisa tu internet |
| `not-found` | Eso ya no existe |
| `resource-exhausted` | Hay demasiada gente ahora mismo |

Para cualquier otro usa tu `textoHumano`, y si no lo pusiste, uno genérico.

---

## 3. Cómo se encuadra un dibujo

**La función:** `encuadrar(segs, origW, origH, destW, destH, margen)`.
**La regla:** la unión de la caja del lienzo y la caja **real** de los
trazos. Si todo cabe, no cambia nada; si algo se sale, se aleja lo justo.
**Nunca recorta.**

Vale para el video y para el replay. **`redibujar()` NO la usa a propósito**:
es el lienzo vivo, y reencuadrar mientras dibujas sería peor que el fallo.

---

## 4. Lo que ya estaba bien

No todo estaba suelto. Estas partes ya tenían un solo sitio y una sola
regla, y conviene no estropearlas:

- **Confirmaciones y ventanas**: todo pasa por `ssModal` / `ssConfirm` /
  `ssPrompt`. **Cero `confirm()` y cero `alert()` nativos** en toda la app.
- **Traducciones**: `t(clave)` y `applyLang()`. Lo que se escapaba eran los
  textos escritos a mano en atributos del HTML, y eso ya tiene prueba
  (`test-idioma-mezclado.js`).
- **El punto de conectado**: `estadoPresencia()` + `ponerPunto()`.
- **URLs**: `safeUrl()` y `getBaseUrl()`.
- **Escapado**: `esc()` en todo lo que se mete en `innerHTML`.

---

## 5. Lo que sigue suelto, y qué haría yo

| Qué | Hoy | Opinión |
|---|---|---|
| **Dos formatos de enlace de invitación** | `?add=CÓDIGO` en tres sitios y `?u=usuario` en uno | Los dos funcionan y los viejos tienen que seguir funcionando. Yo me quedaría con `?u=` —se lee, se dice por teléfono, y es el mismo nombre que se ve en todas partes— y dejaría `?add=` vivo para siempre. **Baja prioridad** |
| **El nombre viaja CONGELADO con el dibujo** | `fromName` se guarda al enviar | Si alguien cambia su `@usuario`, los dibujos que ya mandó siguen con el viejo. Arreglarlo es leer el nombre en vivo al pintar la bandeja: una lectura más por remitente. **Yo lo dejaría**: 24 horas es poco tiempo para que importe |
| **27 `catch` que se tragan el error** | `.catch(() => {})` | Muchos son correctos a propósito (presencia, estadísticas: que fallen no importa). Pero no se distingue «da igual» de «se me olvidó». **Lo miraría cuando haya un fallo que no se explique** |
| **Emojis al principio de los avisos** | ✅ ❌ ⚠️ ⏳ sin regla | Lo justo sería: ✅ salió bien, ⚠️ algo falló, ⏳ espera. `fallo()` ya pone ⚠️ siempre. **Cosmético** |

---

## 6. Código muerto que se quitó

- `CONTACTOS` — ocho contactos inventados (Ana, Carlos, Sofía…) que no
  usaba nadie desde que el carrusel lee Firestore.
- `generarDibujoSimulado()` — 1.203 caracteres de dibujos falsos, sin una
  sola llamada.

Sonaba a poco, pero código que no se ejecuta es código que confunde a quien
lo lee después y que aparece en las búsquedas cuando buscas otra cosa.
