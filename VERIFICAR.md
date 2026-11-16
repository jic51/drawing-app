# Todo lo que falta por verificar

> Lista completa de lo construido que **todavía no has confirmado tú**.
> Ordenada de lo que más duele si está roto a lo que menos.
>
> Lo que yo sí he verificado son 15 pruebas automáticas en Chromium y en
> WebKit. Eso no cubre: notificaciones reales, Firebase de verdad, iOS,
> ni nada que dependa de dos personas a la vez. De eso va esta lista.

---

## 🔴 Primero: tres cosas en las consolas

Sin esto, parte de lo de abajo no puede funcionar.

- [ ] **Publicar las reglas nuevas.** Están en `firestore.rules`. Firebase
      Console → Firestore → Rules → pegar → Publish.
      ⚠️ Antes de pegar, busca `PON_AQUI_TU_UID` y cámbialo por tu uid real
      (Authentication → Users), o borra ese bloque entero.
- [ ] **Desplegar las funciones otra vez**: `firebase deploy --only functions`.
      Hay una nueva (`emparejarConCreador`) y sin ella las cuentas nuevas ya
      no te tendrán de amigo.
- [ ] **Después de publicar las reglas, comprobar que NO se rompió nada**:
      entra, manda un dibujo, agrega a alguien. Si algo falla con
      "permission denied", avísame con el mensaje exacto.

---

## 🔴 Amistades — lo más delicado, porque toca datos que ya existen

- [ ] **Tus amigos siguen ahí.** Ábrelo y cuéntalos. Deberían ser los mismos.
- [ ] **Eliminar a alguien le llega al otro sin recargar.** Dos cuentas
      abiertas a la vez: elimina en una y mira la otra. Debe desaparecer en
      segundos. *Esto era el fallo que encontraste.*
- [ ] **Al eliminar, el otro ya no puede enviarte.** Tras lo anterior, que
      no te aparezca en su carrusel.
- [ ] **Aceptar llega al momento**, y a quien pidió le sale el aviso
      *"@x aceptó tu solicitud 🎉"*.
- [ ] **Pedir amistad dos veces** dice *"ya le enviaste una solicitud"*, no
      *"ya son amigos"*.
- [ ] **Pedir amistad a quien YA es amigo** dice *"ya eres amigo de @x"*.
- [ ] **El popup de solicitud**: ✕ arriba a la derecha, foto y nombre con
      sitio de sobra, Aceptar y Ahora no abajo a lo ancho.
- [ ] **Cerrar con la ✕ la deja pendiente** (el círculo gris sigue ahí).
- [ ] **Tocar FUERA del popup también lo cierra**, y también la deja pendiente.
- [ ] **Rechazar la quita** y no vuelve a salir.
- [ ] **El círculo ⏳ de enviadas**: si pediste a dos personas, un solo
      círculo con un "2". Al tocarlo, la lista con botón Retirar.
- [ ] **Retirar una** la saca de la lista y del otro lado.

## 🔴 La etiqueta NEW

- [ ] **Una solicitud recibida** sale en gris, con NEW, y **la primera**.
- [ ] **Un amigo nuevo** sale con NEW (a color, no gris).
- [ ] **Tocar un amigo con NEW** le quita la etiqueta y no vuelve.
- [ ] **Una cuenta nueva** ve a `@jose` con NEW, sin ninguna ventana que
      interrumpa. *(Necesita las funciones desplegadas.)*
- [ ] El círculo de enviadas **no** lleva NEW rojo.

## 🔴 "Vieron tu dibujo" — nunca lo has visto funcionar

- [ ] Con dos cuentas: manda un dibujo, **ábrelo en la otra**, y a quien lo
      mandó le llega *"… vio tu dibujo 👀"*.
      ⚠️ **Quien ENVÍA también tiene que tener los avisos activados**, no
      solo quien recibe. Creo que ahí estuvo el fallo cuando lo probaste.

## 🟡 El aviso flotante al recibir

- [ ] Llega un dibujo → sale un aviso con la cara de quien lo manda.
- [ ] **Tocarlo abre la bandeja.**
- [ ] **Con la bandeja ya abierta NO sale el aviso** (la fila nueva se anima
      sola y sobra avisar dos veces).
- [ ] Al abrir la app **no** salen avisos de los dibujos que ya estaban.
- [ ] Nunca hay más de tres avisos apilados.

## 🟡 El punto de conectado

- [ ] **Verde** con otra cuenta abierta (aparece en menos de 5 minutos).
- [ ] **Ámbar** tras unos 10 minutos cerrada; no desaparece de golpe.
- [ ] Sale en el carrusel, en la bandeja y en Ajustes.
- [ ] **No tapa el ✓** al seleccionar a alguien para enviarle.
- [ ] En la bandeja **solo** sale si quien te escribió es amigo tuyo.

## 🟡 El video

- [ ] Save → Video replay. Debe salir **vertical, 1080×1920**.
- [ ] **Sin franja oscura** abajo: el dibujo llega hasta el borde.
- [ ] Tu `@usuario` y "Hecho con SketchSend" abajo a la izquierda, legibles.
- [ ] Los colores del logo **se mueven** a lo largo del video.
- [ ] Un dibujo largo (más de 10 s) sale **acortado**, no entero.
- [ ] Se abre bien en el visor de fotos del teléfono.

## 🟡 Ajustes

- [ ] **Tocar las letras** de Privacidad, Términos, Opinión y Sitio web abre
      cada una. No hace falta acertarle al botón.
- [ ] Opinión y Sitio web se ven **en color de acento**; las legales no.
- [ ] Idioma y Tema tienen **la misma forma** de botones.
- [ ] La versión va **pegada** a la palabra "Versión".
- [ ] **"Replay after sending" sin el bloque naranja** detrás del texto, y
      el interruptor se ve encendido/apagado de verdad.
- [ ] **Los amigos salen al instante** al abrir Ajustes, sin un momento en
      blanco.
- [ ] **Ya no está el botón de compartir** en el carrusel (sigue en Ajustes).

## 🟡 Las sugerencias sobre el lienzo

- [ ] El **reto** sale arriba, destacado, y se va al primer trazo.
- [ ] Una pausa corta **no** lo trae de vuelta.
- [ ] Tras ~75 s parado salen **ideas**, y cambian solas cada 12 s.
- [ ] Al cambiar, las letras **se tiñen con los colores del logo** y salen de
      derecha a izquierda.
- [ ] Ninguna palabra se parte a mitad entre dos líneas.
- [ ] Al limpiar el lienzo vuelve el reto.

## 🟡 La landing

- [ ] El carrusel **sigue girando** tras clicar el idioma, un botón, o
      cualquier sitio. *(Era el fallo que encontraste.)*
- [ ] **No da un salto** al llegar al último dibujo.
- [ ] **No da un brinco** cada vez que una tarjeta asoma por el lado.
- [ ] Al cambiar de idioma **nada se mueve de sitio** en vertical.
- [ ] El botón "Dibujar" de arriba sale **centrado**.
- [ ] El logo **no parpadea** al recargar.
- [ ] El vuelo del splash al hero es **continuo**, sin reinicio de color.
- [ ] Los dibujos llenan su tarjeta, **no salen como tiras estrechas**.

## 🟢 Rutas y dominio

- [ ] `sketch-send.com` abre la **landing**.
- [ ] `sketch-send.com/app` abre la **app**.
- [ ] Un enlace viejo `?view=…` llega al dibujo. *(Esto ya lo confirmaste.)*
- [ ] Desde la app instalada en el teléfono, el icono abre **la app**, no la
      landing.
- [ ] La vista previa al compartir un enlace muestra la imagen.

## 🟢 El moderador

- [ ] `sketch-send.com/admin.html` abre y **pinta** los dibujos pendientes.
- [ ] El botón de copiar ID funciona.
- [ ] Pegando el `refId` de una denuncia se ve ese dibujo.
- [ ] ⚠️ **Nunca lo has abierto**: yo no pude probarlo entero porque mi
      entorno bloquea Firebase.

## 🟢 iOS — solo tú puedes

- [ ] Avisos: borrar el icono de la pantalla de inicio, volver a añadirlo,
      abrir desde ahí, Ajustes → Avisos → Activar.
- [ ] Que llegue una notificación de verdad.
- [ ] Que el video se descargue y se abra (en iOS sale MP4, no webm).
- [ ] Que el login con Google no dé vueltas.

---

## Si algo falla

Dime **qué hiciste, qué esperabas y qué pasó**, y si hay un mensaje de
error, cópialo entero. Lo que menos ayuda es "no funciona": casi todo lo de
esta lista tiene tres o cuatro formas distintas de fallar.
