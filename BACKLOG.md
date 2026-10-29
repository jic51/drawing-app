# SketchSend — Backlog

> Este archivo es la fuente de verdad del proyecto.
> Se actualiza en cada sesión de trabajo con Claude.
> Última actualización: 2026-10-28
>
> **Orden de trabajo actual:**
> 1. PostHog analytics (esperando API key del usuario)
> 2. Push notifications (FCM)
> 3. Firestore TTL (limpieza automática de sketches expirados)
> 4. window.prompt → modal SketchSend
> 5. Onboarding interactivo
> 6. Más agentes IA tester con diferentes personas

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

---

## 🔴 CRÍTICO — Bloquea o daña la experiencia principal

| # | Tarea | Detalle | Prioridad |
|---|-------|---------|-----------|
| C1 | **Push notifications (FCM)** | ✅ Cloud Function desplegada. VAPID key configurada. Merge a `main` hecho. FCM token confirmado en Firestore. En iOS Safari solo funciona si la app está instalada como PWA. Verificar que las notificaciones lleguen con un test real entre 2 cuentas. | ✅ Verificar |
| C2 | **Canvas del viewer — probar escalado en más dispositivos** | Un dibujo hecho en desktop puede verse diferente en móvil. Se hizo un fix de aspect ratio pero falta verificar en dispositivos reales. | 🟡 Media |
| C3 | **Limpieza automática de sketches expirados en Firestore** | Los sketches tienen `expiresAt` pero Firestore no los borra — se filtran solo en el cliente. Los documentos expirados se acumulan para siempre en la DB (hay ~44 sketches acumulados). Solución: activar **Firestore TTL** (Time-to-Live) en Firebase Console → campo `expiresAt` como TTL field. Firebase los borra automáticamente. | 🔴 Alta |
| C4 | **`window.prompt()` y `confirm()` nativos → modales SketchSend** | Todos los `window.prompt()`, `window.confirm()` y `alert()` nativos del navegador se ven feos y poco profesionales. Reemplazar TODOS con modales/overlays en el estilo visual de SketchSend. Incluye: confirmar correo en dispositivo nuevo, eliminar amigo, agregar amigo por código. | 🔴 Alta |
| C5 | **Bug: Google login popup cierra pero la app no recarga** | Al dar clic en Google, se abre el popup, se selecciona la cuenta, el popup desaparece pero la pantalla de login sigue visible. Solo al recargar la página se abre la app. `onAuthStateChanged` no dispara o la UI no se actualiza. Un usuario nuevo lo intentará de nuevo o se irá. | 🔴 Crítico |

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
| I7 | **Contexto en el viewer público para nuevos usuarios** | Agregar una línea antes del CTA: "En SketchSend los mensajes son dibujos. Gratis. Desaparecen en 24h." Valentina (persona) no entiende qué es la app al llegar por primera vez. | 🟡 Alta |
| I8 | **Google primero en login, email como opción secundaria** | 80% de usuarios móviles elige Google si está arriba. El magic link tiene 4-5 pasos (escribir correo → ir al email → encontrar link → tocarlo → volver). Google son 2 toques. | 🟡 Alta |
| I9 | **Correo de invitación sin asunto ni contenido útil** | Cuando alguien invita a un amigo, el correo llega "(sin asunto)" y solo dice "¡Dibujemos juntos en SketchSend! ✏️🌈" sin link ni explicación. Necesita: asunto claro, link a la app, breve explicación de qué es SketchSend. Reportado por 2 usuarios. | 🟡 Alta |
| I10 | **Replay: comprimir tiempo muerto al inicio y reducir MAX_GAP** | `comprimirGaps()` comprime pausas entre trazos a máx 2s, pero NO comprime el espacio vacío antes del primer trazo. Si alguien espera 10s antes de dibujar, se reproducen 10s de nada. Además 2s de gap máximo es mucho — reducir a ~500ms. Afecta también videos descargados. | 🟡 Alta |
| I11 | **Feedback instantáneo al enviar + replay propio opcional** | Al dar clic en "Send" la app tarda en responder. Debe ser instantáneo (feedback visual). Después de enviar, reproducir el dibujo del usuario. Agregar toggle en menú: "Replay your own drawing when sent" para que sea opcional. | 🟡 Alta |
| I12 | **Simplificar registro: ¿nombre + @usuario + correo es demasiado?** | El correo es para auth, el @usuario es ID público, el nombre es display. Evaluar: eliminar el paso de "nombre" y usar solo @usuario, o auto-generarlo del perfil de Google. Menos pasos = menos abandono. | 🟡 Media |
| I13 | **Indicador verde de "online" en avatares de contactos** | Punto verde en los avatares de amigos que están conectados. Requiere actualizar un campo `lastSeen` en Firestore periódicamente y considerar como "online" si < 5 min. | 🟡 Media |
| I14 | **Diferencias de replay entre desktop y móvil** | El replay se ve diferente en computadora vs teléfono. Revisar escalado, aspect ratio y tamaño del canvas en ambos. Reportado con video. | 🟡 Media |
| I15 | **Notificación in-app animada al recibir un dibujo** | Cuando la app está abierta y llega un sketch, mostrar una notificación in-app con el logo de SketchSend animado (colores moviéndose en loop infinito) y texto: "You got a new sketch from @user1234". Las push notifications del sistema son limitadas (solo ícono estático), pero dentro de la app controlamos el diseño completo. | 🟡 Alta |
| I16 | **UI de invitar amigos: mostrar link visible + botón copiar + botón compartir** | El link de invitación no se ve. Debe mostrarse el texto del link (aunque esté truncado), con un botón de copiar al lado (un toque = copiado) y al otro lado el botón de compartir. Todo en una fila compacta. | 🟡 Alta |
| I17 | **Lista de amigos: cachear en local, no recargar cada vez** | Al abrir Settings, la lista de amigos dice "Cargando..." cada vez aunque ya se cargó antes. Guardar en localStorage y solo consultar Firestore si hubo cambios (o en background). Evita parpadeo y reduce lecturas de Firestore. | 🟡 Media |
| I18 | **Sistema de amistades: ¿aceptar/rechazar solicitud?** | Actualmente cualquiera te agrega como amigo sin tu permiso (y también te elimina sin aviso). Evaluar si necesitamos un sistema de solicitud de amistad con aceptar/rechazar. Riesgo de spam y privacidad si se queda como está. Riesgo de fricción si se agrega aprobación. Analizar trade-offs. | 🟡 Media |
| I19 | **Guardar email del usuario en Firestore** | El documento del usuario no guarda el correo electrónico. Está en Firebase Auth pero no en la colección `users`. Agregarlo al crear/actualizar el perfil para tener datos completos. | 🟡 Alta — hacer ya |
| I20 | **Migrar usuarios legacy: campos faltantes** | Usuarios creados con versiones viejas (ej: antonellaqui) no tienen todos los campos (shortCode, etc.). Al hacer login, verificar y rellenar campos faltantes automáticamente. No dejar atrás a los primeros usuarios. | 🟡 Alta — hacer ya |
| I21 | **Patrón "Optimistic UI" en toda la app** | La app espera la respuesta del servidor antes de actualizar la UI. Debe ser al revés: actualizar la UI inmediatamente (optimistic update), hacer el trabajo en background, y si falla revertir y mostrar error con detalle (qué falló, dónde, por qué). Aplicar en: agregar amigo, eliminar amigo, enviar sketch, cambiar nombre, cambiar username. Entre clic y feedback visual no debe haber más de 100ms. | 🟡 Alta |
| I22 | **Lista de amigos: no reescribir todo al agregar uno** | Al agregar un amigo nuevo, toda la lista se borra y se vuelve a escribir completa (toma segundos). Solo debe verificar diferencias y agregar/quitar lo que cambió. Mismo patrón para cualquier lista en la app. | 🟡 Alta |
| I23 | **Recordatorio push antes de que expire un sketch** | Enviar push notification de recordatorio cuando un sketch no visto está por expirar: "Tienes 1 sketch de @user — míralo antes de que se elimine. Quedan X horas." Requiere Cloud Function programada (Cloud Scheduler) o lógica en la función existente. | 🟡 Media |

---

## 🟢 FUTURO — Crecimiento y monetización

| # | Tarea | Detalle | Prioridad |
|---|-------|---------|-----------|
| F1 | **Monetización: planificar y probar SketchSend Premium** | Modelo freemium que agregue valor sin molestar. Ideas: (1) Dibujos permanentes (no se borran), (2) Colores premium + selector libre, (3) Pinceles especiales (acuarela, neón, caligrafía, pixel), (4) Temas de canvas, (5) Stickers/stamps. Buscar el balance: features que el usuario QUIERA pagar, no paywalls molestos. Necesita investigación de precios y A/B testing con PostHog. | 🟡 Media |
| F2 | Foto de perfil | Necesita Firebase Storage (plan Blaze ~$1-5/mes para 100 usuarios) | 🟢 Baja |
| F3 | Colores premium + selector libre | Tienda en-app, modelo freemium | 🟢 Baja |
| F4 | Pinceles especiales (acuarela, neón, caligrafía, pixel) | Tienda en-app | 🟢 Baja |
| F5 | Dibujo colaborativo en tiempo real | Firestore onSnapshot bidireccional, 2 personas dibujando a la vez | 🟢 Planificado |
| F6 | **Feed público / "states" + board público** | (1) Estados de dibujos visibles a contactos (como Stories). (2) Board público donde todos ven los dibujos de todos y pueden dar like. (3) Concursos: el dibujo más votado hasta una fecha gana premios (colores/pinceles gratis). Verificar que solo se pueda votar una vez por dibujo. | 🟢 Planificado |
| F7 | Lanzamiento ProductHunt | Después de push notifications y onboarding | 🟢 Planificado |
| F8 | BetaList / r/alphaandbetausers | Para conseguir early adopters y testers externos | 🟢 Planificado |
| F9 | **Dominio propio (sketchsend.app o similar)** | Mover de `jic51.github.io/drawing-app` a dominio propio. ~$12/año. Da credibilidad profesional. Mismo código, solo cambia hosting. Hacer cuando haya ~500-1000 usuarios activos. | 🟢 Planificado |
| F10 | **Google Play Store (TWA)** | Envolver la PWA en Trusted Web Activity para publicar en Play Store. Mismo código web empaquetado como APK. Costo: $25 una vez. Hacer cuando usuarios pidan "¿por qué no está en la tienda?". Mejora: push al 100%, descubrimiento en tienda. | 🟢 Planificado |
| F11 | **Apple App Store (Capacitor/TWA)** | Wrapper con Capacitor o similar. Costo: $99/año. Apple cobra 30% de pagos in-app. Hacer después de Google Play. Mejora: push nativo en iOS, acceso a contactos, haptics. | 🟢 Planificado |

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
| Dominio temporal: usar `iamjosecastro.com` hasta conseguir dominio de SketchSend | Usuario tiene este dominio disponible. sketchsend.com está ocupado. Buscar alternativas: sketchsend.app, sketchsend.io, etc. | Pendiente |
| **Prioridades competitivas (SIEMPRE PRESENTES):** (1) Retención: streaks, notificaciones in-app. (2) Onboarding que impresione en 30s. (3) Board público + concursos (nadie lo tiene). (4) Replay timing perfecto. (5) Monetización inteligente (no repetir errores de Zynga). (6) Nicho primero, mainstream después. | Análisis competitivo | Estrategia — aplicar en cada decisión de diseño y desarrollo |

---

## 🔧 DEUDA TÉCNICA

| Tarea | Detalle |
|-------|---------|
| `sketchsendv14.html` duplicado de `index.html` | Mantener solo uno como fuente. Decidir si renombramos o eliminamos el .html numerado. |
| Service Worker cache versión `sketchsend-v4` | Actualizar nombre de cache cuando haya cambios breaking en SW |
| Strokes se comprimen antes de guardar | Verificar que el límite de 1MB de Firestore no se alcanza con dibujos complejos |
| Versionado de la app | Agregar número de versión visible (ej: v1.5.0) en la UI y actualizar con cada release. Llevar changelog. |
| Merge `claude/sharp-hamilton-JPQNj` → `main` | Las push notifications y PostHog solo están en la rama de desarrollo. Hay que hacer merge a main para que funcionen en producción (GitHub Pages). |

---

## 📐 ESTRATEGIA DE RAMAS GIT

```
main                    → PRODUCCIÓN (GitHub Pages)
  └── claude/sharp-...  → DESARROLLO (trabajo de Claude)
        └── feature/*   → FEATURES GRANDES (cuando aplique)
```

**Regla:** Claude trabaja en `claude/sharp-hamilton-JPQNj`. Cuando algo está listo → merge a `main`.

---

## 🔗 LINKS

- **App en vivo:** https://jic51.github.io/drawing-app/
- **Repositorio:** https://github.com/jic51/drawing-app
- **Firebase Console:** https://console.firebase.google.com/project/sketchsend-d1976
