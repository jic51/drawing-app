# SketchSend — Backlog

> Este archivo es la fuente de verdad del proyecto.
> Se actualiza en cada sesión de trabajo con Claude.
> Última actualización: 2026-11-11
>
> **Orden de trabajo acordado (2026-11-04):**
> 1. 🔴 Safari — la app está rota para la mayoría de iPhones
> 2. 🔴 Revisión legal de privacy.html y terms.html
> 3. 🔵 Extraer el motor de dibujo y replay a una librería (ver estrategia al final)
> 4. Rama aparte `claude/mejoras-bandeja`, NO a main: rediseño de bandeja (I28),
>    carrusel, contador de usuarios y países
> 5. Compresión de trazos — en `claude/compresion-trazos`, pendiente de que el
>    usuario la pruebe. Publicar el LECTOR en main antes que el escritor.
> 6. Iconos propios — aplazado, no urgente

> **Orden anterior (histórico):**
> 1. ~~C6: Login flash fix~~ ✅
> 2. ~~C7: OG preview + favicon~~ ✅
> 3. ~~C8: Idioma inglés por defecto~~ ✅
> 4. ~~Toolbar restructure + rainbow emoji~~ ✅
> 5. ~~C4: Modales SketchSend~~ ✅
> 6. ~~I10: MAX_GAP 2s → 500ms~~ ✅
> 7. ~~I11: Feedback instantáneo al enviar + replay toggle~~ ✅
> 8. ~~I8: Google primero en login~~ ✅
> 9. ~~I7: Contexto en viewer público~~ ✅
> 10. ~~I16: UI invitar amigos (link + copy + share)~~ ✅
> 11. I28: Rediseño bandeja de entrada (layout mitad/mitad, reloj rainbow, link, X borrar, perfil al tocar avatar)
> 12. I29: Popup de perfil de usuario (reutilizable)
> 13. I21: Optimistic UI en toda la app
> 14. I22: Lista de amigos incremental (no reescribir todo)
> 15. I24: Viewer público mejorado (canvas adaptable + pulse CTA + perfil clickeable)
> 16. I26: Clic en amigo = perfil, X = eliminar
> 17. I15: Notificación in-app animada al recibir dibujo
> 18. C3: Firestore TTL (requiere acción del usuario en Firebase Console)

---

## ✅ COMPLETADO

| # | Tarea | Notas |
|---|-------|-------|
| 1 | Dibujo en canvas con grosor variable por velocidad | Funciona en iOS y Android |
| 2 | Enviar sketch a amigos por Firestore | Requiere Firestore Rules aplicadas |
| 3 | Replay animado al recibir dibujo | Loop automático, toque para responder |
| 4 | Login Google (popup + redirect iOS Safari) | Anti-ITP con appVisible guard |
| 5 | Login Email magic link (passwordless) | Fix cross-tab con localStorage |
| 6 | QR code para invitar amigos | Auto-generado para cuentas legacy también |
| 7 | Viewer público `?view=SKETCHID` | Sin login, replay en loop, CTA para responder |
| 8 | OG tags para WhatsApp / iMessage preview | og-preview.png 1200x630 |
| 9 | Service Worker — siempre versión nueva | cache: no-store + auto-reload |
| 10 | Remote error logging (_errors en Firestore) | Captura errores de dispositivos reales |
| 11 | XSS corregido (3 críticos, 2 altos) | esc(), safeUrl(), createElement |
| 12 | PWA instalable | manifest.json + SW |
| 13 | i18n Español / Inglés | applyLang() cubre toda la UI |
| 14 | Firestore Security Rules aplicadas | Usuario aplicó en Firebase Console |
| 15 | index.html = versión actual | Antes era sketchsendv14.html |
| 16 | Repo limpio (borrados 27 archivos viejos) | Solo quedan archivos activos |
| 17 | Toolbar reestructurado: colores arriba, herramientas abajo | Rainbow 🌈, blanco, negro + pincel/borrador. Sin selección dual. |
| 18 | Share links limpios (sin sketchsendv14.html) | getBaseUrl() strip filename |
| 19 | Inbox ordenado (más viejos arriba, más nuevos abajo) | sort by receivedAt ascending |
| 20 | Wake Lock API en replay y viewer público | Pantalla no se apaga durante replay |
| 21 | Textos de inbox traducidos a inglés | agoText, empty state, subtitle |

---

## 🔴 CRÍTICO — Bloquea o daña la experiencia principal

| # | Tarea | Detalle | Prioridad |
|---|-------|---------|-----------|
| C1 | **Push notifications (FCM)** | ✅ Cloud Function desplegada. VAPID key configurada. Merge a `main` hecho. FCM token confirmado en Firestore. En iOS Safari solo funciona si la app está instalada como PWA. Verificar que las notificaciones lleguen con un test real entre 2 cuentas. | ✅ Verificar |
| C2 | **Canvas del viewer — probar escalado en más dispositivos** | Un dibujo hecho en desktop puede verse diferente en móvil. Se hizo un fix de aspect ratio pero falta verificar en dispositivos reales. | 🟡 Media |
| C3 | **Limpieza automática de sketches expirados en Firestore** | Los sketches tienen `expiresAt` pero Firestore no los borra — se filtran solo en el cliente. Los documentos expirados se acumulan para siempre en la DB (hay ~44 sketches acumulados). Solución: activar **Firestore TTL** (Time-to-Live) en Firebase Console → campo `expiresAt` como TTL field. Firebase los borra automáticamente. | 🔴 Alta |
| C4 | **`window.prompt()` y `confirm()` nativos → modales SketchSend** | ✅ ssModal/ssConfirm/ssPrompt/ssAlert con blur backdrop, animaciones, botones accent. 4 diálogos reemplazados. | ✅ Hecho |
| C5 | **Bug: Google login popup cierra pero la app no recarga** | ✅ Fix desplegado: fallback manual si `onAuthStateChanged` no dispara. Verificar que funcione. | ✅ Verificar |
| C6 | **Pantalla de login parpadea al recargar la página** | ✅ Splash screen se mantiene hasta que onAuthStateChanged resuelve. Fallback de 3s. Login no parpadea. | ✅ Hecho |
| C7 | **OG preview image incorrecta + favicon faltante** | ✅ OG 1200x630 con logo rainbow + texto inglés. Favicon 512x192 con ✏️ emoji en fondo rainbow. og:title en inglés. | ✅ Hecho |
| C8 | **Idioma principal → inglés, español secundario** | ✅ App en inglés por defecto. Español como opción en Settings. Viewer público en inglés. | ✅ Hecho |

---

## 🟡 IMPORTANTE — Afecta adopción y retención

| # | Tarea | Detalle | Prioridad |
|---|-------|---------|-----------|
| I1 | **Onboarding interactivo (primera vez)** | Solo la primera vez: la app dibuja algo sola en el canvas (una casita con árbol y sol, un perrito corriendo, unos peces, etc.) — algo sencillo y tierno. Mientras se dibuja, aparecen tooltips/mensajes sobre el canvas, los pinceles y colores explicando cómo funciona. El usuario aprende viendo y luego haciendo. Mucho más efectivo que pantallas estáticas. | 🟡 Alta |
| I2 | **Analytics (PostHog o Clarity)** | Sin métricas no sabemos dónde se cae el usuario. PostHog free tier, instalar desde día 1 del lanzamiento. Ver: funnels, session replay, rage clicks. | 🟡 Alta |
| I3 | **Tests E2E automáticos (Playwright)** | Flujos críticos: registro, enviar sketch, recibir y ver replay. Evita regresiones. | 🟡 Media |
| I4 | **Rate limiting / anti-spam** | Un usuario puede spamear la DB con sketches. Limitar: max 20 sketches/hora por usuario. Implementar en Firestore Rules con timestamps. | 🟡 Media |
| I5 | **App Check (reCAPTCHA v3)** | Protege Firebase de bots y abuso. Opcional pero recomendado antes del lanzamiento público. | 🟡 Media |
| I6 | **Agente IA tester — más personas y escenarios** | Primera ronda hecha (Valentina, 23, CDMX). Falta simular: (1) Hombre de 45 años poco técnico, (2) Adolescente de 15 con iPhone, (3) Usuario que llega desde Instagram, (4) Persona que recibe el link pero no conoce al remitente, (5) Usuario que vuelve después de 1 semana. Correr después de cada cambio importante de UX. | 🟡 Media |
| I7 | **Contexto en el viewer público para nuevos usuarios** | ✅ "In SketchSend, messages are drawings. Free. They disappear in 24h." antes del CTA. | ✅ Hecho |
| I8 | **Google primero en login, email como opción secundaria** | ✅ Google con logo SVG como botón principal. Email colapsado bajo `<details>`. | ✅ Hecho |
| I9 | **Correo de invitación sin asunto ni contenido útil** | Cuando alguien invita a un amigo, el correo llega "(sin asunto)" y solo dice "¡Dibujemos juntos en SketchSend! ✏️🌈" sin link ni explicación. Necesita: asunto claro, link a la app, breve explicación de qué es SketchSend. Reportado por 2 usuarios. | 🟡 Alta |
| I10 | **Replay: comprimir tiempo muerto al inicio y reducir MAX_GAP** | ✅ MAX_GAP reducido de 2s a 500ms. El primer trazo ya comenzaba en tRel=0. | ✅ Hecho |
| I11 | **Feedback instantáneo al enviar + replay propio opcional** | ✅ Toast inmediato, envío en background, replay opcional con toggle en Settings (ss_replay_self). | ✅ Hecho |
| I12 | **Simplificar registro: ¿nombre + @usuario + correo es demasiado?** | El correo es para auth, el @usuario es ID público, el nombre es display. Evaluar: eliminar el paso de "nombre" y usar solo @usuario, o auto-generarlo del perfil de Google. Menos pasos = menos abandono. | 🟡 Media |
| I13 | **Indicador verde de "online" en avatares de contactos** | Punto verde en los avatares de amigos que están conectados. Requiere actualizar un campo `lastSeen` en Firestore periódicamente y considerar como "online" si < 5 min. | 🟡 Media |
| I14 | **Diferencias de replay entre desktop y móvil** | El replay se ve diferente en computadora vs teléfono. Revisar escalado, aspect ratio y tamaño del canvas en ambos. Reportado con video. | 🟡 Media |
| I15 | **Notificación in-app animada al recibir un dibujo** | Cuando la app está abierta y llega un sketch, mostrar una notificación in-app con el logo de SketchSend animado (colores moviéndose en loop infinito) y texto: "You got a new sketch from @user1234". Las push notifications del sistema son limitadas (solo ícono estático), pero dentro de la app controlamos el diseño completo. | 🟡 Alta |
| I16 | **UI de invitar amigos: mostrar link visible + botón copiar + botón compartir** | ✅ Fila compacta con URL visible (truncada), botón 📋 copiar, botón 📤 compartir. | ✅ Hecho |
| I17 | **Lista de amigos: cachear en local, no recargar cada vez** | Al abrir Settings, la lista de amigos dice "Cargando..." cada vez aunque ya se cargó antes. Guardar en localStorage y solo consultar Firestore si hubo cambios (o en background). Evita parpadeo y reduce lecturas de Firestore. | 🟡 Media |
| I18 | **Sistema de amistades: ¿aceptar/rechazar solicitud?** | Actualmente cualquiera te agrega como amigo sin tu permiso (y también te elimina sin aviso). Evaluar si necesitamos un sistema de solicitud de amistad con aceptar/rechazar. Riesgo de spam y privacidad si se queda como está. Riesgo de fricción si se agrega aprobación. Analizar trade-offs. | 🟡 Media |
| I19 | **Guardar email del usuario en Firestore** | El documento del usuario no guarda el correo electrónico. Está en Firebase Auth pero no en la colección `users`. Agregarlo al crear/actualizar el perfil para tener datos completos. | 🟡 Alta — hacer ya |
| I20 | **Migrar usuarios legacy: campos faltantes** | Usuarios creados con versiones viejas (ej: antonellaqui) no tienen todos los campos (shortCode, etc.). Al hacer login, verificar y rellenar campos faltantes automáticamente. No dejar atrás a los primeros usuarios. | 🟡 Alta — hacer ya |
| I21 | **Patrón "Optimistic UI" en toda la app** | La app espera la respuesta del servidor antes de actualizar la UI. Debe ser al revés: actualizar la UI inmediatamente (optimistic update), hacer el trabajo en background, y si falla revertir y mostrar error con detalle (qué falló, dónde, por qué). Aplicar en: agregar amigo, eliminar amigo, enviar sketch, cambiar nombre, cambiar username. Entre clic y feedback visual no debe haber más de 100ms. | 🟡 Alta |
| I22 | **Lista de amigos: no reescribir todo al agregar uno** | Al agregar un amigo nuevo, toda la lista se borra y se vuelve a escribir completa (toma segundos). Solo debe verificar diferencias y agregar/quitar lo que cambió. Mismo patrón para cualquier lista en la app. | 🟡 Alta |
| I23 | **Recordatorio push antes de que expire un sketch** | Enviar push notification de recordatorio cuando un sketch no visto está por expirar: "You have 1 sketch from @user — see it before it's gone. X hours left." Requiere Cloud Function programada (Cloud Scheduler). | 🟡 Media |
| I24 | **Viewer público: canvas adaptable + animación CTA + perfil clickeable** | (1) Canvas muy pequeño en desktop — adaptarlo al tamaño de pantalla. (2) Botón "Reply with a drawing" con animación de latido (pulse) cada 4 segundos. (3) "Drawing by @user" debe tener avatar circular antes del nombre, @ antes del nombre, y el nombre es un link. (4) Al dar clic en el nombre se abre una ventana con avatar, @username y botón "Add as friend" (no QR/link). Si no tiene cuenta, lleva al login. Crea loop viral: ver dibujo → curiosidad por usuario → agregar → enviar dibujos. | 🟡 Alta |
| I25 | **Logo completo en viewer y toda la app** | El logo "SketchSend" debe incluir siempre el lápiz con colores arcoíris recorriendo. En el viewer público el logo está incompleto (falta el lápiz). Unificar en toda la app. | 🟡 Alta |
| I26 | **Amigos: clic en nombre = ver perfil, X = eliminar** | Cambiar la interacción de amigos: dar clic en el nombre/contenedor abre ventana de perfil (avatar, @username, QR, link para compartir). Solo la X elimina. Actualmente al dar clic en cualquier parte se pregunta si quieres eliminar. | 🟡 Alta |
| I27 | **Sistema de solicitud de amistad híbrido** | Código/QR = agregar directo (confianza alta, tú diste tu código). Desde perfil público = solicitud que el otro acepta/rechaza (confianza baja, no te conoce). Protege privacidad sin añadir fricción innecesaria entre amigos reales. | 🟡 Media |
| I28 | **Rediseño bandeja de entrada** | Cada mensaje ocupa la mitad de la pantalla. La otra mitad dividida: 1/3 reloj (horas:minutos:segundos con animación rainbow en los números, misma animación del logo — colores en los números no en el fondo) y 2/3 link del viewer (visible, tap para copiar). Botón X al final de cada fila para borrar sin ver. Tocar avatar/nombre → popup perfil del usuario (no abrir el mensaje). Orden: más viejos arriba, más nuevos abajo. | 🟡 Alta |
| I29 | **Popup de perfil de usuario** | Al tocar nombre/avatar de un mensaje o amigo, abrir ventana emergente con: avatar circular, @username, nombre. Botón "Remove friend" (si ya es amigo), botón "Report abuse" (siempre visible). NO necesita "Add friend" aquí porque ya son amigos si están en la bandeja/lista. Reutilizable desde bandeja, viewer público, lista de amigos. | 🟡 Alta |
| I30 | **Botón "Report a bug" en algún lugar de la app** | Permitir a usuarios reportar bugs fácilmente. Podría ser en Settings o en un menú de ayuda. Envía datos útiles: versión, navegador, dispositivo, screenshot opcional. | 🟡 Media |

---

## 🟢 FUTURO — Crecimiento y monetización

| # | Tarea | Detalle | Prioridad |
|---|-------|---------|-----------|
| F1 | **Monetización: planificar y probar SketchSend Premium** | Modelo freemium que agregue valor sin molestar. Ideas: (1) Dibujos permanentes (no se borran), (2) Colores premium + selector libre, (3) Pinceles especiales (acuarela, neón, caligrafía, pixel), (4) Temas de canvas, (5) Stickers/stamps. Buscar el balance: features que el usuario QUIERA pagar, no paywalls molestos. Necesita investigación de precios y A/B testing con PostHog. | 🟡 Media |
| F2 | Foto de perfil | Necesita Firebase Storage (plan Blaze ~$1-5/mes para 100 usuarios) | 🟢 Baja |
| F3 | Colores premium + selector libre | Tienda en-app, modelo freemium | 🟢 Baja |
| F4 | Pinceles especiales (acuarela, neón, caligrafía, pixel) | Tienda en-app | 🟢 Baja |
| F5 | Dibujo colaborativo en tiempo real | Firestore onSnapshot bidireccional, 2 personas dibujando a la vez | 🟢 Planificado |
| F6 | **Estados (stories) + board público** | **Pedido por el usuario 2026-11-10 — anotado, NO construir todavía.** (1) El usuario sube un dibujo a su *estado*, en vez de enviarlo a una persona. (2) Ve los estados de sus amigos en una fila arriba, estilo stories. (3) **Los estados de usuarios Pro de pago son visibles para todos**, no solo para sus amigos — ese es el gancho de pago: alcance, no funciones. (4) Board público donde todos ven los dibujos de todos y pueden dar like. (5) Concursos: el dibujo más votado hasta una fecha gana premios (colores/pinceles gratis). Verificar que solo se pueda votar una vez por dibujo. **Pendiente de decidir antes de construir:** cuánto dura un estado (¿las mismas 24 h?), si se puede responder a un estado con otro dibujo, y sobre todo la moderación — un estado Pro lo ve cualquiera, así que necesita denuncia y retirada rápida antes de abrirlo, no después. Reusa el motor de replay y el `_reports` que ya existen. | 🟢 Planificado |
| F7 | Lanzamiento ProductHunt | Después de push notifications y onboarding | 🟢 Planificado |
| F8 | BetaList / r/alphaandbetausers | Para conseguir early adopters y testers externos | 🟢 Planificado |
| F9 | **Dominio propio** | ✅ `sketch-send.com` comprado el 2026-11-11. En el código ya está en todas partes (metaetiquetas, enlace de la notificación, correo de contacto, CNAME). **Falta el DNS y activarlo en los ajustes del repo** — ver abajo. Los enlaces compartidos no hacía falta tocarlos: se arman con `getBaseUrl()` desde `location.origin` | 🟡 A medias |
| F10 | **Google Play Store (TWA)** | Envolver la PWA en Trusted Web Activity para publicar en Play Store. Mismo código web empaquetado como APK. Costo: $25 una vez. Hacer cuando usuarios pidan "¿por qué no está en la tienda?". Mejora: push al 100%, descubrimiento en tienda. | 🟢 Planificado |
| F11 | **Apple App Store (Capacitor/TWA)** | Wrapper con Capacitor o similar. Costo: $99/año. Apple cobra 30% de pagos in-app. Hacer después de Google Play. Mejora: push nativo en iOS, acceso a contactos, haptics. | 🟢 Planificado |
| F12 | **Landing page pública** | Página que explique qué es SketchSend, cómo funciona, qué datos se recopilan, screenshots/demo animada. Necesaria para tiendas, ProductHunt y credibilidad. | 🟢 Pre-lanzamiento |
| F13 | **Legal: Privacy Policy** | Obligatoria para Google Play, App Store, GDPR. Cubrir: datos recopilados (email, dibujos, FCM token), uso de Firebase/PostHog, retención (24h sketches), derechos del usuario. | 🔴 Pre-lanzamiento |
| F14 | **Legal: Terms of Service** | Protección legal básica. Cubrir: uso aceptable, contenido generado por usuarios, propiedad intelectual, limitación de responsabilidad. | 🔴 Pre-lanzamiento |
| F15 | **Botón "Delete my account"** | Obligatorio por Apple App Store guidelines. Debe eliminar: documento de usuario, friendships, sketches enviados, FCM token, y datos en Firebase Auth. Poner en Settings. | 🔴 Pre-lanzamiento |
| F16 | **Edad mínima (13+ / COPPA compliance)** | Mostrar en Terms of Service y en el registro. Si un usuario indica <13 años, no permitir crear cuenta. COPPA (US) y GDPR-K (EU) lo requieren. | 🔴 Pre-lanzamiento |
| F17 | **Política de devolución** | Necesaria cuando se implemente Premium. Cubrir: reembolsos, cancelación de suscripción, qué pasa con los dibujos permanentes si se cancela. No necesaria hasta que haya pagos. | 🟢 Con Premium |
| F18 | **Mensajes privados (Premium)** | Sketches que solo puede abrir el destinatario. Sin link público, sin viewer. Si alguien intenta abrirlo y no es el destinatario, se bloquea. Requiere verificar auth del usuario contra el campo `to` del sketch. Feature premium de alto valor. | 🟢 Con Premium |
| F19 | **Compartir dibujos recibidos (motor de viralidad)** | Problema actual: solo se puede copiar el link ANTES de abrir el dibujo (cuando no sabes qué es), y al abrirlo no hay opción de compartir. Solo se pueden descargar videos/imágenes de dibujos propios, no de los recibidos. **Solución propuesta (freemium):** FREE: (1) Compartir link del viewer público después de ver el dibujo. (2) Botón "Share" en el viewer con Web Share API. (3) El link compartido muestra el replay + branding "Made with SketchSend" + CTA para descargar. PREMIUM: (4) Descargar video/GIF de dibujos recibidos (sin watermark). (5) Descargar imagen HD. (6) Compartir sin branding de SketchSend. **Referencia de empresas exitosas:** Snapchat: screenshots notifican al sender (genera FOMO y engagement). TikTok: watermark con @usuario en todo video descargado (motor viral #1, cada video compartido es un ad gratuito). BeReal: compartir tu BeReal en Instagram Stories con link de vuelta. Instagram: Stories compartibles con tag del creador. WhatsApp: stickers creados se comparten con pack link. **Estrategia recomendada:** Modelo TikTok — todo dibujo compartido lleva watermark "✏️ SketchSend" + @usuario del creador. Premium quita el watermark. Esto convierte cada share en publicidad gratuita sin molestar al usuario free. | 🟡 Media |

---

## 💡 IDEAS / SUGERENCIAS ANOTADAS

| Idea | Fuente | Estado |
|------|--------|--------|
| Link preview animado en WhatsApp (viewer público) | Implementado Fase 1 | ✅ Hecho |
| OG image con thumbnail real del sketch | Requiere Blaze (Storage) | Fase 2 |
| GIF animado del replay como OG image | Requiere Cloudflare Worker | Fase 3 |
| Posicionamiento: "cuaderno compartido entre 2 personas" en lugar de "mensajería masiva" | Análisis de mercado | Estrategia |
| Lanzar en nicho específico (diseño, arte casual, parejas) antes de ir a todos | Lección de Draw Something / BeReal | Estrategia |
| Estrategia de distribución: PWA → dominio propio → Play Store (TWA) → App Store (Capacitor) | Análisis de mercado | Estrategia — no entrar a tiendas hasta tener tracción. 90% del código se reutiliza. |
| **🔵 PLATAFORMA: abrir las funciones a otros desarrolladores** | La idea fundacional del proyecto: que otras apps usen dibujar, replay, descarga de video/imagen, links públicos y amigos, y paguen por ello. Hoy es imposible porque toda la lógica vive dentro de un único HTML de 4.200 líneas acoplado a la UI y a Firebase. Camino realista: (1) extraer el motor de dibujo y replay a una librería sin UI ni Firebase, con su propia suite de pruebas; (2) publicarla como paquete npm gratuito para crear adopción; (3) encima de ella, un SDK embebible (`<script>` + un div) que cualquiera pega en su web; (4) solo entonces una API de pago con claves, cuotas y facturación, que exige backend propio — Firebase desde el cliente no sirve para esto. Lo que se vende no es el dibujo: es el replay animado y el link que se comparte. Ver nota de estrategia al final de este archivo. | Sesión 2026-11-04 | 🔵 Estratégico |
| **Devolver el botón .SKS cuando tenga destino** | Oculto el 2026-11-10. El formato guarda los trazos en crudo —color, grosor y el momento de cada uno— pero la app no sabe abrirlo de vuelta y nada más lo consume, así que para el usuario era un botón sin destino. El generador sigue en el código: el formato es la base del plan de plataforma (publicar la especificación y un visor abierto). Cuando exista algo que lo lea, se vuelve a mostrar. | Sesión 2026-11-10 | 🟢 Con la plataforma |
| **Video compartible: el lienzo apaideado no cabe en vertical** | Un dibujo hecho en computadora es casi horizontal; metido en un video 9:16 queda una franja fina con dos vacíos enormes. No se arregla con el diseño del video: hay que decidir qué hacer con el dibujo, y las tres salidas cuestan algo — recortarlo pierde partes, encajarlo pequeño se ve mal, rellenar los lados inventa contenido. **Bloquea D1.** Observado por el usuario, no por mí. | Sesión 2026-11-10 | 🔴 Antes del video |
| **Video compartible: ajustes de maqueta** | Sobre la muestra del 2026-11-09: (1) los colores del logo deben moverse, en la muestra salió un fotograma fijo del degradado; (2) quitar el logo de arriba y dejarlo abajo junto a "Hecho con", que repetido es redundante; (3) el @usuario donde está pero alineado a la izquierda. | Sesión 2026-11-10 | 🟡 Con D1 |
| **El lápiz del preview no toma los colores del logo** | En la imagen de los enlaces el lápiz sale amarillo, no con el arcoíris. Causa: ✏️ es un emoji y los emoji se pintan como imagen de color, así que ignoran el `fill` del SVG y nunca toman el gradiente. Solución probada: dibujar el lápiz como trazado vectorial (rect + polígono), que sí acepta `fill="url(#rainbow)"`. **Ojo:** la imagen de preview es un PNG estático, así que los colores podrán ser arcoíris pero NUNCA moverse como en la app — eso requeriría un GIF o video, que WhatsApp no anima en las tarjetas de enlace. | Sesión 2026-11-06 | 🟡 Media |
| **@usuario: comprobar disponibilidad en tiempo real** | Al escribir un @usuario, consultar según se teclea si ya está tomado y mostrar un indicador verde o rojo, como hacen otras apps. Hoy solo se entera al confirmar. Hay que controlar la frecuencia de consultas (esperar ~400 ms tras dejar de teclear) para no disparar lecturas de Firestore con cada letra, y validar también formato y longitud. Debe cubrir tanto el registro como el cambio de @usuario desde Ajustes. | Sesión 2026-11-06 | 🟡 Alta |
| **Notificaciones en iPhone exigen instalar la app** | Desde iOS 16.4 Safari solo entrega notificaciones web si el usuario añadió la app a la pantalla de inicio. En el navegador normal ni siquiera aparece el diálogo de permiso. Hay que detectar iOS sin instalar y explicarlo antes de ofrecer activar notificaciones, o la mayoría del público de iPhone creerá que están rotas. | Sesión 2026-11-06 | 🟡 Alta |
| **Rediseñar el popup de perfil** | Hoy son cuatro botones iguales en fila y no se distingue lo importante de lo destructivo. Cambios pedidos: (1) mostrar el **QR del amigo** ahí mismo para que lo escaneen sin pasos extra; (2) el enlace como **botón de copiar con parte de la URL visible**, no como una acción ciega; (3) **"Eliminar amigo" en rojo y siendo el único botón llamativo**, porque ahora compite con los demás; (4) **quitar "Cancelar"** y cerrar con una ✕ arriba a la derecha o tocando fuera del popup. Nota: `ssModal` solo sabe pintar una fila de botones, así que esto pide un modal propio o ampliar el existente para aceptar contenido libre y cierre por clic fuera. | Sesión 2026-11-09 | 🟡 Alta |
| **Carrusel doble en la galería (dos filas opuestas)** | Los dibujos en dos filas que se mueven en sentidos contrarios: la de arriba hacia la izquierda, la de abajo hacia la derecha. Muestra el doble de contenido y da sensación de volumen. A decidir al implementarlo: si pasar el cursor detiene solo esa fila o las dos (más natural solo esa), y cuántas filas en móvil, donde dos ocupan mucho alto. Umbral: no activarlo hasta tener bastantes dibujos, o una fila quedaría casi vacía. La velocidad actual del carrusel de comentarios es la referencia aprobada. | Sesión 2026-11-06 | 🟡 Media |
| **Galería completa tipo Pinterest** | Página propia con todos los dibujos compartidos, en cuadrícula tipo mosaico, cada uno con su @usuario y su fecha. Tres cosas a resolver antes: (1) **rendimiento** — cada dibujo es un canvas animándose; con cincuenta a la vez el teléfono sufre, así que habría que animar solo los visibles o mostrar una imagen fija hasta pasar el cursor; (2) **el filtro de 24 horas no encaja** con lo que decidimos — los dibujos de galería se conservan indefinidamente, así que "últimas 24 h" saldría vacío casi siempre: mejor "los más recientes" con la fecha a la vista; (3) **moderación** — cada dibujo pasa por aprobación manual, y con volumen eso es trabajo diario, habría que pensar en reglas automáticas o en varios moderadores. | Sesión 2026-11-06 | 🟢 Futuro |
| **El nombre en la galería no se actualiza al cambiarlo** | Al compartir, el documento guarda una copia del nombre de ese momento, así que cambiarlo después no afecta a lo ya publicado. Es deliberado: actualizarlo exigiría permitir escritura sobre `landing_gallery`, lo que también abriría la puerta a editar dibujos ajenos. El `uid` sí está guardado, así que si algún día se quiere resolver, lo correcto es una Cloud Function que actualice los documentos del usuario al renombrarse, no abrir la regla. | Sesión 2026-11-06 | 🟢 Decisión tomada |
| **Migrar @usuario sin dejar fuera a nadie** | Al separar @usuario de nombre real hay un riesgo real: usuarios creados antes pueden no tener `username`, tenerlo repetido, o tenerlo con mayúsculas. Antes de exigir que sea único hay que: (1) auditar cuántos duplicados y vacíos hay hoy, (2) decidir qué pasa con un duplicado — nadie debe perder el acceso, (3) rellenar los que falten de forma automática, (4) solo entonces activar la unicidad. Nunca al revés. | Sesión 2026-11-06 | 🔴 Antes de tocar nada |
| **¿Sigue haciendo falta el código corto?** | Si cada @usuario es único, el código de invitación deja de aportar: ya se puede añadir a alguien por su @usuario. El QR y el enlace **sí siguen teniendo sentido**, pero deberían llevar el @usuario en vez del código. Decidir si se retira el código, y qué pasa con los QR ya compartidos que llevan el viejo. | Sesión 2026-11-06 | 🟡 Media |
| **Revisar dónde más se pide iniciar sesión de más** | El salto al login desde el viewer ya está arreglado, pero conviene repasar el resto de caminos: abrir un enlace de invitación, volver tras cerrar la pestaña, el enlace mágico abierto en otro navegador. En cada uno, comprobar si ya hay sesión antes de pedir nada, y si hace falta recargar para que el arranque reconozca al usuario. | Sesión 2026-11-06 | 🟡 Alta |
| **~~Notificaciones push nunca llegan~~ ✅** | Aunque el usuario acepte los permisos, no llega ninguna notificación al recibir un dibujo, en ninguna cuenta y en Chrome. Hay que revisar la cadena entera: permiso concedido → token FCM guardado en `users/{uid}.fcmToken` → la Cloud Function en `functions/` dispara al crearse un sketch → el service worker `sw.js` la recibe en segundo plano. Comprobar también si la Function está desplegada y si sus logs muestran errores. | Sesión 2026-11-05 | 🔴 Alta |
| **Separar @usuario de nombre real** | Hoy Ajustes muestra el nombre real arriba, pero el identificador que importa es el @usuario (es con lo que te buscan y te agregan). Propuesta: fuera se ven solo @usuario, correo y avatar; el nombre real se mueve a una pantalla "Perfil" junto a correo y @usuario, que es donde se editan los tres. | Sesión 2026-11-05 | 🟡 Alta |
| **Ver el QR o enlace de un amigo** | Desde la ficha de un amigo, poder ver su QR y su enlace para compartirlo con terceros. | Sesión 2026-11-05 | 🟡 Media |
| **Aceptar términos al empezar** | Ventana en el primer uso donde el usuario lee y acepta términos y privacidad, con enlaces a ambos. Guardar la aceptación (fecha y versión del documento) en el documento del usuario. | Sesión 2026-11-05 | 🔴 Pre-lanzamiento |
| **Enlaces a términos y privacidad dentro de la app** | Desde Ajustes, junto a la fila de Sitio web. | Sesión 2026-11-05 | 🟡 Alta |
| **Estados vacíos y de error que orienten** | Hoy un fallo muestra un aviso genérico, y una bandeja vacía o una lista de amigos sin nadie se quedan en blanco. Cada estado vacío debería decir qué hacer a continuación, no limitarse a no mostrar nada. Es de lo que más separa una app cuidada de una a medio hacer. | Sesión 2026-11-05 | 🟡 Alta |
| **Evitar saltos de layout al cargar** | Al pasar de "Cargando…" al contenido los elementos se desplazan. Reservar el espacio desde el principio (alto mínimo o esqueletos) para que nada brinque. | Sesión 2026-11-05 | 🟡 Media |
| **Onboarding de 30 segundos** | Quien entra por primera vez debería poder dibujar algo ANTES de que se le pida nada. Hoy lo primero es un login. | Sesión 2026-11-05 | 🟡 Alta |
| **Botón "Borrar mi cuenta"** | Obligatorio para App Store. Debe eliminar el documento del usuario, amistades, sketches, token FCM y la cuenta en Firebase Auth. (Duplica F15; se mantiene aquí por prioridad.) | Sesión 2026-11-05 | 🔴 Pre-lanzamiento |
| **Comportamiento sin conexión** | Hoy no hay respuesta clara si se cae la red: ni aviso ni reintento. Definir qué ve el usuario y si se encola el envío. | Sesión 2026-11-05 | 🟡 Media |
| **Deshacer tras un trazo que salió del lienzo** | Un gesto que sale y vuelve a entrar se guarda como varios tramos, así que deshacer quita uno por vez en lugar del gesto completo. Decidir si debe agruparse por gesto. Consecuencia conocida del cambio del 2026-11-05. | Sesión 2026-11-05 | 🟢 Baja |
| **Contador de usuarios en la landing** | Junto a los dibujos enviados, mostrar cuántas cuentas se han creado (activas o no). Esa zona debe ser vistosa: fondo claro que contraste con el resto de la página y un título que explique qué se está mirando, porque hoy un número suelto no se entiende. Requiere escribir el total en `stats/global` al crear cuenta. | Sesión 2026-11-04 | 🟡 Rama bandeja |
| **Carrusel para galería y opiniones** | Carrusel que se detiene al pasar el cursor. Va en la rama de la bandeja, no a main. | Sesión 2026-11-04 | 🟡 Rama bandeja |
| **Países que usan la app** | Contador de países distintos, inferido del idioma o la zona horaria del navegador (sin pedir ubicación). | Sesión 2026-11-04 | 🟡 Rama bandeja |
| **Testimonios: recoger los reales desde la app** | Los 3 testimonios que había eran inventados como relleno — eliminados. Para tener reales: botón "Deja tu opinión" en Ajustes que guarda en `landing_testimonials` con `approved:false`; la landing solo muestra las aprobadas; el dueño aprueba desde la consola de Firebase. Necesita reglas nuevas. | Sesión 2026-11-03 | Pendiente |
| **Galería: botón "Compartir en la galería"** | Hoy no hay forma de que un dibujo llegue a `landing_gallery`. Agregar un botón al terminar un dibujo que lo copie ahí **con permiso explícito del autor**, nunca automático. La landing ya lee esa colección, pero `createGalleryCard` espera un campo `stroke.pts` que la app nunca escribió: hay que reescribirlo contra el formato real. Necesita reglas nuevas. | Sesión 2026-11-03 | Pendiente |
| **Contador: añadir usuarios y países** | El contador de dibujos ya funciona en vivo. Sumar: cantidad de cuentas creadas y número de países distintos. Requiere escribir esos datos en `stats/global` desde la app (el país se puede inferir del idioma o la zona horaria, sin pedir ubicación). | Sesión 2026-11-03 | Pendiente |
| **Hero: rotar varios dibujos reales** | Hoy el hero anima una sola flor generada por código. Mejor: varios dibujos reales que se alternen cada pocos segundos. | Sesión 2026-11-03 | Pendiente |
| **Iconos propios en vez de emoji** | Las tarjetas usan 🎨 ✉️ 🎬 ⏳. Reemplazar por SVG en el estilo de la app. Aplazado hasta el lanzamiento. | Sesión 2026-11-03 | Para el lanzamiento |
| **🔴 La app no funciona en Safari** | Funciona en Chrome pero no en Safari. ~90% de los usuarios de iPhone usan Safari, así que hoy la app está rota para la mayoría del público de iOS — es el bug más caro que tenemos. Sospechas a revisar: (1) `-webkit-background-clip:text` y las animaciones del logo, (2) los eventos pointer y `touch-action` tras quitar los listeners touch, (3) la persistencia de Firebase Auth con ITP (Safari borra el storage de sitios sin interacción a los 7 días), (4) `navigator.share`/`clipboard` que piden gesto del usuario, (5) `env(safe-area-inset-*)`, (6) codecs de MediaRecorder para el video (Safari no soporta webm). Hace falta probar en un iPhone real o en el simulador de Safari y anotar el error exacto de la consola. | Sesión 2026-11-02 | 🔴 CRÍTICO |
| **Avatares pasan sobre el header de Settings al hacer scroll** | z-index del header de Settings debe ser más alto. | Sesión 2026-10-29 | ✅ Corregido |
| **Hover en avatares mueve algo blanco debajo/sobre ellos** | Efecto hover en lista de amigos crea artefacto blanco visible. | Sesión 2026-10-29 | ✅ Corregido |
| **"Cerrar sesión" texto aparece en inglés** | El label de logout aparece en ambos idiomas, debe eliminarse y dejar solo el botón. | Sesión 2026-10-29 | ✅ Corregido |
| **Versión 1.0.0-beta desactualizada** | Actualizar a v1.20.0 para reflejar el estado real del proyecto. | Sesión 2026-10-29 | ✅ Corregido |
| **Splash logo se nota desapareciendo al volar** | Al hacer la animación fly-to-header, el original se ve desvaneciéndose en el centro. Ocultar inmediatamente. | Sesión 2026-10-29 | ✅ Corregido |
| **Theme toggle se ve feo** | Rediseñar Auto/Dark/Light como pill/segmented control más estilizado. | Sesión 2026-10-29 | ✅ Corregido |
| **Branding en sketch viewer:** al abrir un sketch recibido, mostrar logo SketchSend + nombre del usuario que lo envió. No solo al descargar video/imagen — brandear toda la experiencia de visualización. | Sesión 2026-10-29 | Pendiente |
| **QR estilizado con forma/estilo de la app** | El QR actual es genérico. Hacerlo con los colores y estilo visual de SketchSend (colores rainbow, fondo oscuro). | Sesión 2026-10-29 | Pendiente |
| **Tagline/slogan para la app** | Buscar una frase corta en inglés que defina SketchSend. Actualmente "Donde cada mensaje es un dibujo" en español. Debe ser memorable y comunicar la esencia de la app. | Sesión 2026-10-29 | Pendiente |
| **Estandarizar logo en toda la app** | Mismo logo (wordmark rainbow + lápiz) en: OG image, favicon, viewer, videos descargados, imágenes descargadas, header de la app, notificaciones. Un solo diseño consistente. | Sesión 2026-10-29 | Pendiente |
| **Mostrar dibujos caducados en vez de ocultarlos** | Hoy un dibujo que expira desaparece sin rastro y el usuario nunca supo que lo tuvo. Dejar la tarjeta en la bandeja diciendo "Mensaje no disponible — caducó hace XX", con el avatar y @usuario de quien lo envió y una X para borrarla. Enseña que los dibujos caducan y crea urgencia la próxima vez (el efecto FOMO de Snapchat). Ojo: la tarjeta debe sobrevivir al borrado por TTL del documento, así que hace falta guardar un registro ligero aparte o marcar el documento como caducado en vez de borrarlo. | Sesión 2026-11-02 | Pendiente |
| **Variaciones del pincel rainbow** | Explorar: (1) Glow momentáneo al dibujar que desaparece. (2) Dibujo que se vuelve blanco/negro y vuelve a colores periódicamente. (3) Animación de colores que pasa por el dibujo completo (colores se mueven por los trazos). (4) Colores que se mueven por detrás del trazo. Para versiones premium/futuras del pincel. | Sesión 2026-11-02 | Pendiente |
| **Landing page: guardar dibujo del mini-canvas** | Guardar el dibujo del visitante en localStorage y cargarlo después del login/registro, para que no pierda su primer dibujo. | Sesión 2026-11-02 | Pendiente |
| **Eliminar duplicado sketchsendv14.html** | index.html y sketchsendv14.html son el mismo archivo. Mantener solo index.html como fuente y eliminar el duplicado. | Sesión 2026-11-02 | Deuda técnica |
| Dominio temporal: usar `iamjosecastro.com` hasta conseguir dominio de SketchSend | Usuario tiene este dominio disponible. sketch-send.com está ocupado. Buscar alternativas: sketch-send.com, sketchsend.io, etc. | Pendiente |
| **Prioridades competitivas (SIEMPRE PRESENTES):** (1) Retención: streaks, notificaciones in-app. (2) Onboarding que impresione en 30s. (3) Board público + concursos (nadie lo tiene). (4) Replay timing perfecto. (5) Monetización inteligente (no repetir errores de Zynga). (6) Nicho primero, mainstream después. | Análisis competitivo | Estrategia — aplicar en cada decisión de diseño y desarrollo |

---

## 🌐 PONER EN MARCHA sketch-send.com

El código ya está listo. Falta lo de fuera, y **el orden importa**: en cuanto
`CNAME` llegue a `main`, GitHub Pages empieza a redirigir
`jic51.github.io/drawing-app` al dominio nuevo. Si el DNS no responde
todavía, la app queda caída hasta que responda.

**1. DNS primero** (donde compraste el dominio). Cuatro registros A en la
raíz (`@`), que son los de GitHub Pages:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Y uno CNAME para `www` → `jic51.github.io`

**2. Esperar** a que responda. Comprobar con `dig sketch-send.com +short`:
tiene que devolver esas cuatro direcciones.

**3. Fusionar la rama a `main`.** El despliegue sube el `CNAME` y GitHub
toma el dominio. En Settings → Pages, marcar **Enforce HTTPS** en cuanto
deje (el certificado tarda unos minutos en emitirse).

**4. Después del cambio**, dos cosas que hay que hacer aparte:
   - **Volver a desplegar la función** (`firebase deploy --only functions`):
     el enlace que abre la notificación ya apunta al dominio nuevo, pero
     hasta que no se despliegue sigue corriendo la versión vieja.
   - **Firebase Auth → Settings → Authorized domains**: añadir
     `sketch-send.com`. Si no, el login con Google falla en el dominio
     nuevo con `auth/unauthorized-domain`.

**Lo que NO se rompe:** los enlaces que ya mandaste
(`jic51.github.io/drawing-app/?view=...`) siguen funcionando, porque GitHub
los redirige al dominio nuevo.

**Antes de fiarte del correo:** comprar el dominio no da buzón. Para que
`hello@sketch-send.com` reciba de verdad hace falta un servicio de correo
(Zoho y el reenvío de Cloudflare son gratis; Google Workspace es de pago).
Está puesto en privacy.html y terms.html, así que conviene que funcione:
un correo de contacto que no recibe es peor que no poner ninguno.

---

## 🙋 AMISTADES Y AVISOS (pedido 2026-11-14 — anotado, sin construir)

| # | Qué | Detalle |
|---|-----|---------|
| A1 | **Las amistades se aceptan, no se imponen** | Hoy añadir a alguien crea la amistad de golpe: el otro se entera porque aparece en su lista. Debe haber **solicitud → aceptar o rechazar**. Cambia el modelo: `friendships` pasa a tener `estado: 'pendiente' \| 'aceptada'` y quién la pidió. **Ojo con las reglas**: hoy son `allow read, write: if request.auth != null`, o sea que cualquiera con cuenta puede crear o borrar amistades ajenas (ver S3). Esto hay que arreglarlo A LA VEZ, porque si no, aceptar no significa nada: cualquiera podría escribir `aceptada` en la amistad de otro |
| A2 | **Ventana al entrar: quién te agregó** | Al abrir la app, si hay solicitudes nuevas o amigos nuevos desde la última vez, una ventana emergente con **nombre y foto** de cada uno. Con solicitudes: botones aceptar/rechazar ahí mismo. Sin ellas: solo "te agregó", para enterarte de quién es. Hace falta guardar la última vez que se vio, para no repetir a los mismos. Reutiliza el avatar y el popup de perfil que ya existen |
| A3 | **Correos a los usuarios** | (1) De bienvenida al registrarse. (2) De vez en cuando, cuando haya algo nuevo. **Firebase no envía correo** salvo los de login: hace falta un servicio (la extensión *Trigger Email* de Firebase con SendGrid o Mailgun, o Resend, que es lo más sencillo). Tres cosas antes de mandar el primero: hace falta **buzón de verdad** en `hello@sketch-send.com`; todo correo masivo necesita **enlace para darse de baja** (lo exigen la CAN-SPAM y el RGPD); y hay que registrar SPF/DKIM en el dominio o irá a spam. El correo ya está guardado en `users`, y los de la landing en `landing_emails` |

---

## 🐞 ENCONTRADO AL PROBAR (2026-11-12 / 13)

| # | Qué | Estado |
|---|-----|--------|
| B1 | **La bandeja no se actualizaba en vivo.** *(Mi diagnóstico anterior era falso: `cargarBandeja()` SÍ usa `onSnapshot`.)* Lo que pasaba es que la escucha actualizaba los datos y el contador pero **nunca repintaba la lista**, así que un dibujo que llegaba con la bandeja abierta no salía hasta cerrarla y volver a abrirla | ✅ Arreglado — repinta si está abierta, conservando el scroll. De paso, la hora de caducidad se lee en cada cambio y no una sola vez al montar la escucha |
| B2 | **El carrusel se reiniciaba al llegar al final** en vez de seguir girando | ✅ Arreglado — la primera columna se MUEVE al final y se le resta su ancho a la posición, así que en pantalla no cambia nada. Se mueven los elementos en vez de clonarlos a propósito: un clon saldría con el lienzo en blanco, porque el dibujo se está reproduciendo en el original |
| B3 | El contador de la landing decía **2 usuarios habiendo 17**: solo subía al CREAR la cuenta, así que nadie anterior a ese código se contó | ✅ Arreglado — se cuenta la primera vez que cada cuenta entra y queda marcada, así converge sola |
| B4 | **El logo de la barra se veía ~1 s y desaparecía** al recargar la landing. Estaba visible desde el principio y solo se ocultaba cuando arrancaba la animación de scroll, que espera a que el splash aterrice (~2,7 s) | ✅ Arreglado |
| B5 | En la galería **cada dibujo salía como una tira estrecha**: la tarjeta era 4:3 fija y los dibujos son verticales (416x557 los reales). Usaban el 56% del ancho | ✅ Arreglado — cada tarjeta toma la proporción de su dibujo |
| B6 | **Las 7 mejoras de la rama no estaban en main**, así que al probar no se veía ninguna: ni lienzo vertical, ni reto, ni aviso de red, ni bandeja al derecho, ni 2 filas | ⚠️ Falta fusionar |

---

## 📱 APP NATIVA — qué haría falta

Hoy es una web instalable (PWA). Para estar en las tiendas:

| Vía | Qué cambia en el código | Coste | Qué gana |
|-----|------------------------|-------|----------|
| **Google Play (TWA)** | Casi nada: se envuelve la web igual que está. Hace falta firmar la app y publicar un `assetlinks.json` en el dominio | 25 USD, una vez | Aparece en la tienda; las notificaciones suben al 100% |
| **App Store (Capacitor)** | Más: notificaciones nativas en vez de FCM web, revisar que el lienzo responda al tacto como esperan, y Apple exige borrar cuenta (ya está) y política de privacidad (ya está) | 99 USD/año + 30% de los pagos | Notificaciones en iOS sin instalar a mano, contactos, vibración |

Lo importante: **no hay que reescribir la app**. El motor de dibujo, el replay y
Firebase se quedan igual. Lo que cambia es el envoltorio y las notificaciones.

---

## 🔴 SEGURIDAD — hallazgos en las reglas de Firestore (2026-11-11)

Revisadas las reglas que me pasaste. Lo primero está **comprobado en vivo**,
sin iniciar sesión, desde fuera.

| # | Qué | Gravedad | Arreglo |
|---|-----|----------|---------|
| S1 | **Cualquiera puede descargar el correo de todos los usuarios.** `match /users/{userId} { allow read: if true }` y los documentos guardan `email` y `fcmToken`. La clave de API es pública por diseño (está en el HTML), así que basta una URL. Verificado: devuelve `email` y `fcmToken` de usuarios reales sin autenticarse | 🔴 Alta — datos personales, y con el RGPD por medio | **Una línea, ya**: `allow read: if request.auth != null`. Comprobado que nada sin sesión lee `users`: el visor público saca el nombre del propio dibujo (`fromName`), y la landing no toca la colección. Cierra la descarga anónima |
| S2 | Aun con S1 arreglado, cualquiera que se registre puede leer el correo de todos | 🟡 Media | Mover `email` y `fcmToken` a `users/{uid}/privado/datos` con `allow read: if request.auth.uid == uid`. La función en la nube usa el Admin SDK, así que se salta las reglas y la sigue leyendo; solo hay que cambiarle la ruta. Necesita migrar los usuarios que ya existen |
| S3 | `friendships`: `allow read, write: if request.auth != null`. Cualquiera con cuenta puede **borrar o inventar amistades ajenas**, no solo las suyas | 🟡 Media | Exigir que el uid esté en el documento: `request.auth.uid in resource.data.uids` |
| S4 | `stats`: `allow write: if request.auth != null`. Cualquiera puede poner el contador de la landing en lo que quiera | 🟡 Media | Permitir solo incrementos, o escribirlo desde la función en la nube |
| S5 | `fcmTokens`: `allow read, write: if request.auth != null`. Cualquiera con cuenta lee y **sobrescribe** los tokens de los demás, y les deja sin avisos. (La colección parece sin usar: los tokens viven en `users`) | 🟡 Media | Si no se usa, borrar el bloque |
| S6 | `landing_testimonials` y `landing_gallery` están **declarados dos veces**. El segundo bloque dice `allow write: if false`, pero Firestore une los bloques con OR: basta que uno permita. O sea que ese segundo bloque no protege nada, solo despista | 🟢 Baja | Borrar los bloques duplicados |
| S7 | `landing_emails` permite `update` sin sesión, así que cualquiera puede sobrescribir la fila de un correo ajeno | 🟢 Baja | Dejar solo `create` |
| S8 | `sketches` `allow update` deja al destinatario cambiar **cualquier** campo, incluidos los trazos | 🟢 Baja | Limitarlo a `viewed` |

**No es un fallo:** `sketches` `allow get: if true` es a propósito y está bien
pensado — el ID tiene 20 caracteres aleatorios y `list` sí exige ser parte.

---

## 🔧 DEUDA TÉCNICA

| Tarea | Detalle |
|-------|---------|
| `sketchsendv14.html` duplicado de `index.html` | Mantener solo uno como fuente. Decidir si renombramos o eliminamos el .html numerado. |
| Service Worker cache versión `sketchsend-v4` | Actualizar nombre de cache cuando haya cambios breaking en SW |
| Strokes se comprimen antes de guardar | Verificar que el límite de 1MB de Firestore no se alcanza con dibujos complejos |
| Versionado de la app | Agregar número de versión visible (ej: v1.5.0) en la UI y actualizar con cada release. Llevar changelog. |


---

## 📐 ESTRATEGIA DE RAMAS GIT

```
main                    → PRODUCCIÓN (GitHub Pages)
  └── claude/sharp-...  → DESARROLLO (trabajo de Claude)
        └── feature/*   → FEATURES GRANDES (cuando aplique)
```

**Regla:** Claude trabaja en `claude/sharp-hamilton-JPQNj`. Cuando algo está listo → merge a `main`.

---

## 🔵 ESTRATEGIA: convertir SketchSend en plataforma

> Nota de la sesión 2026-11-04. La idea fundacional del proyecto es que otros
> construyan encima y paguen por ello. Esto es lo que haría falta.

**El obstáculo real.** Hoy no hay nada que vender aparte de la app entera. Las
funciones existen, pero viven dentro de un único HTML de 4.200 líneas donde el
motor de dibujo, la interfaz y Firebase están entrelazados. Nadie puede tomar
"el replay" sin llevarse todo lo demás. Antes de cobrar por una pieza hay que
poder separarla.

**Qué es lo valioso.** No el lienzo: dibujar en canvas lo resuelve cualquiera en
una tarde. Lo difícil y distintivo es **el replay con el ritmo original** y **el
link que reproduce un dibujo sin instalar nada**. Eso es lo que otra app querría
y no querría construir. El formato de trazos y su compresión son el activo.

**Orden sensato, cada paso útil por sí mismo:**

| # | Paso | Para qué |
|---|------|----------|
| 1 | Extraer motor de dibujo + replay a una librería sin UI ni Firebase, con pruebas propias | Hace posible todo lo demás; de paso la app queda más mantenible |
| 2 | Publicarla gratis en npm | Adopción y credibilidad antes de cobrar; nadie paga por algo que no probó |
| 3 | SDK embebible: un `<script>` y un div | El 90% de los interesados quiere pegar dos líneas, no integrar una API |
| 4 | API de pago con claves, cuotas y facturación | Solo aquí entra dinero — y exige backend propio: Firebase desde el cliente no sirve |

**Dos cosas que conviene saber antes de empezar.** El paso 4 cambia el negocio:
pasas de una app que se mantiene sola a un servicio con clientes que esperan
disponibilidad, soporte y versiones estables. Y el paso 1 es el único que vale
la pena aunque nunca llegues al 4, porque mejora la app igual.

**Lo primero, y es barato:** publicar la especificación del formato `.SKS` y un
visor de código abierto. Mide el interés real sin construir infraestructura.

---

## 📣 PLAN DE DISTRIBUCIÓN (sesión 2026-11-09)

> Nace de analizar un video de "Vibecodingiseasy" sobre qué es valioso ahora
> que cualquiera puede construir apps. **La cifra que muestra es real y está
> verificada**: Sensor Tower contó ~560.000 apps nuevas en la App Store en el
> primer semestre de 2026, casi tantas como en todo 2025, confirmado por
> 9to5Mac, TechCrunch y medios europeos por separado.
>
> **El dato que el video omite y que importa más:** las apps se duplicaron
> pero las descargas solo subieron un 2% (17.600 millones en el semestre).
> La oferta explotó, la demanda no. Construir dejó de ser el foso.
>
> **Lo que del método NO aplica a SketchSend:** el video enseña a vender un
> infoproducto a un nicho con un problema que la gente busca. Nadie busca
> "cómo mandar dibujos a mis amigos". SketchSend se muestra, no se explica.
>
> **La ventaja que sí tenemos:** cada dibujo enviado ya es una pieza de
> contenido. El del video tiene que fabricar un consejo diario; nosotros
> producimos material cada vez que alguien usa la app.

| # | Qué | Por qué | Estado |
|---|-----|---------|--------|
| D1 | **Video vertical compartible** — el replay de un dibujo como video 9:16 de ~10 s con marca y @usuario, listo para TikTok, Reels o Shorts | El modelo TikTok: cada pieza compartida es publicidad gratis. Ya existe el motor de replay y la descarga de video; falta el formato vertical con marca | 🔴 **Desbloqueado 2026-11-10**: el lienzo ya es 9:16 en todos los dispositivos, así que el dibujo llena el marco sin recortes. Falta el video en sí |
| D2 | **Captar correos desde la landing** | Hoy quien visita y no se registra se pierde para siempre. Una lista es tuya; los seguidores de una red no | ✅ Hecho — formulario en la landing escribe en `landing_emails`. Las reglas impiden leer la lista desde el cliente, así que se exporta desde la consola |
| D3 | **Reto semanal** — un tema por semana, el mismo para todos | Da razón para volver, produce contenido solo y es compartible por naturaleza | ✅ **Primera mitad hecha 2026-11-10.** 20 retos que rotan. No hay backend: el reto se CALCULA de la fecha en UTC, así que es el mismo en todo el planeta y cambia a la vez (lunes 00:00 UTC). Insignia en la cabecera (en móvil se oculta: salía cortada) y primera sugerencia sobre el lienzo, también al limpiar. **Falta la segunda mitad:** marcar los dibujos con el reto y la galería de los mejores — ver R1 |

### Pendiente del reto semanal

| # | Qué | Detalle |
|---|-----|---------|
| R1 | Marcar el dibujo con el reto de esa semana | ✅ Hecho 2026-11-11. Las reglas NO validan con `hasOnly`, así que añadir el campo es seguro. Se guarda el **número de semana**, no el texto: el texto cambia con el idioma de quien envía y no se podría agrupar |
| R2 | Galería de los mejores del reto | Depende de R1: sin la marca no hay por dónde filtrar |
| R3 | Avisar del reto nuevo | Los lunes. Reutilizar las notificaciones push que ya funcionan |

**Lo que NO hacer todavía:** ProductHunt, prensa o cualquier empujón de
tráfico mientras la app siga rota en Safari. Una oleada de visitantes se
encontraría con un login que no funciona, y esa primera impresión no se
repite.

**Cómo verificar un video así la próxima vez:** (1) ¿hay una cifra concreta
con fuente nombrada, o solo "los expertos dicen"? (2) ¿lo confirma alguien
que no sea quien lo cuenta? (3) ¿qué omite? — lo omitido suele ser lo más
revelador. Aquí omitió las descargas estancadas, que es el dato más fuerte,
y que quien lo cuenta vende cursos de esto.


---

## 🔗 LINKS

- **App en vivo:** https://sketch-send.com/
- **Repositorio:** https://github.com/jic51/drawing-app
- **Firebase Console:** https://console.firebase.google.com/project/sketchsend-d1976
