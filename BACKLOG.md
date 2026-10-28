# SketchSend — Backlog

> Este archivo es la fuente de verdad del proyecto.
> Se actualiza en cada sesión de trabajo con Claude.
> Última actualización: 2026-10-28

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
| C1 | **Push notifications (FCM)** | Sin esto nadie sabe que recibió un dibujo. La app queda muda. | 🔴 Siguiente |
| C2 | **Canvas del viewer — probar escalado en más dispositivos** | Un dibujo hecho en desktop puede verse diferente en móvil. Se hizo un fix de aspect ratio pero falta verificar en dispositivos reales. | 🟡 Media |
| C3 | **Limpieza automática de sketches expirados en Firestore** | Los sketches tienen `expiresAt` pero Firestore no los borra — se filtran solo en el cliente. Los documentos expirados se acumulan para siempre en la DB. Solución: activar **Firestore TTL** (Time-to-Live) en Firebase Console → campo `expiresAt` como TTL field. Firebase los borra automáticamente. | 🔴 Alta |
| C4 | **`window.prompt()` al confirmar correo en dispositivo nuevo** | Cuando el link de email se abre en otro dispositivo, aparece un `window.prompt()` nativo del navegador pidiendo el correo. Se ve feo y poco profesional. Reemplazar con un modal/overlay en el estilo visual de SketchSend. | 🔴 Alta |

---

## 🟡 IMPORTANTE — Afecta adopción y retención

| # | Tarea | Detalle | Prioridad |
|---|-------|---------|-----------|
| I1 | **Onboarding de 1 pantalla** | Usuario nuevo no entiende qué hacer. Necesita: "Dibuja → Elige a quién → Envía". 3 pasos visuales, solo aparece la primera vez. | 🟡 Alta |
| I2 | **Analytics (PostHog o Clarity)** | Sin métricas no sabemos dónde se cae el usuario. PostHog free tier, instalar desde día 1 del lanzamiento. Ver: funnels, session replay, rage clicks. | 🟡 Alta |
| I3 | **Tests E2E automáticos (Playwright)** | Flujos críticos: registro, enviar sketch, recibir y ver replay. Evita regresiones. | 🟡 Media |
| I4 | **Rate limiting / anti-spam** | Un usuario puede spamear la DB con sketches. Limitar: max 20 sketches/hora por usuario. Implementar en Firestore Rules con timestamps. | 🟡 Media |
| I5 | **App Check (reCAPTCHA v3)** | Protege Firebase de bots y abuso. Opcional pero recomendado antes del lanzamiento público. | 🟡 Media |
| I6 | ~~Prueba con agente IA como tester~~ | ✅ Hecho — ver resultados abajo | — |
| I7 | **Contexto en el viewer público para nuevos usuarios** | Agregar una línea antes del CTA: "En SketchSend los mensajes son dibujos. Gratis. Desaparecen en 24h." Valentina (persona) no entiende qué es la app al llegar por primera vez. | 🟡 Alta |
| I8 | **Google primero en login, email como opción secundaria** | 80% de usuarios móviles elige Google si está arriba. El magic link tiene 4-5 pasos (escribir correo → ir al email → encontrar link → tocarlo → volver). Google son 2 toques. | 🟡 Alta |

---

## 🟢 FUTURO — Crecimiento y monetización

| # | Tarea | Detalle | Prioridad |
|---|-------|---------|-----------|
| F1 | **Monetización: usuarios premium conservan dibujos** | Los dibujos no se borran si el usuario paga. Campo `premium: true` en user doc → sketches no reciben `expiresAt`. Modelo freemium: gratis = efímero, pago = permanente. | 🟡 Media |
| F2 | Foto de perfil | Necesita Firebase Storage (plan Blaze ~$1-5/mes para 100 usuarios) | 🟢 Baja |
| F3 | Colores premium + selector libre | Tienda en-app, modelo freemium | 🟢 Baja |
| F4 | Pinceles especiales (acuarela, neón, caligrafía, pixel) | Tienda en-app | 🟢 Baja |
| F5 | Dibujo colaborativo en tiempo real | Firestore onSnapshot bidireccional, 2 personas dibujando a la vez | 🟢 Planificado |
| F6 | Feed público / "states" | Dibujos efímeros visibles a todos los contactos (como Stories) | 🟢 Planificado |
| F7 | Lanzamiento ProductHunt | Después de push notifications y onboarding | 🟢 Planificado |
| F8 | BetaList / r/alphaandbetausers | Para conseguir early adopters y testers externos | 🟢 Planificado |

---

## 💡 IDEAS / SUGERENCIAS ANOTADAS

| Idea | Fuente | Estado |
|------|--------|--------|
| Link preview animado en WhatsApp (viewer público) | Implementado Fase 1 | ✅ Hecho |
| OG image con thumbnail real del sketch | Requiere Blaze (Storage) | Fase 2 |
| GIF animado del replay como OG image | Requiere Cloudflare Worker | Fase 3 |
| Posicionamiento: "cuaderno compartido entre 2 personas" en lugar de "mensajería masiva" | Análisis de mercado | Estrategia |
| Lanzar en nicho específico (diseño, arte casual, parejas) antes de ir a todos | Lección de Draw Something / BeReal | Estrategia |

---

## 🔧 DEUDA TÉCNICA

| Tarea | Detalle |
|-------|---------|
| `sketchsendv14.html` duplicado de `index.html` | Mantener solo uno como fuente. Decidir si renombramos o eliminamos el .html numerado. |
| Service Worker cache versión `sketchsend-v4` | Actualizar nombre de cache cuando haya cambios breaking en SW |
| Strokes se comprimen antes de guardar | Verificar que el límite de 1MB de Firestore no se alcanza con dibujos complejos |

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
