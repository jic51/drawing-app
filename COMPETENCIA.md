# Estudio de competencia — SketchSend

> Hecho el 2026-11-15 con fuentes, no de memoria. Las cifras de apps
> pequeñas vienen de agregadores de terceros y son flojas; están marcadas.
> Lo que vale de aquí no son los números, son los tres patrones del final.

---

## 1. Los competidores de verdad

No son TikTok ni Instagram. Son dos apps que hacen casi exactamente lo
mismo que SketchSend.

### noteit (de sendit) — el más parecido que existe

Manda un dibujo a una persona y **aparece en el widget de su pantalla de
inicio**, sin abrir nada. La ficha de la App Store lo describe como dibujos
de uno a uno donde el widget muestra tu dibujo en cuanto le das a enviar.

- **Tamaño:** Uptodown lista ~135.000 descargas en Android (v2.18.1, oct
  2026). De iOS no hay dato. ⚠️ Dato flojo: es un agregador, no la tienda.
- **Dinero:** anuncios + compras dentro de la app (según Google Play).
- **Lo que hace distinto:** el widget. No hay que abrir la app para recibir.

### Locket Widget — el mismo truco, con fotos

Manda fotos al widget de tus amigos, con reacciones e historial. Mismo
mecanismo, otro contenido. No encontré su tamaño actual con fuente seria.

**Qué significa para nosotros:** su ventaja entera es que **el mensaje
llega sin abrir nada**. SketchSend es web, y una web no puede poner un
widget en la pantalla de inicio. Esto es el argumento más fuerte para
hacer la app nativa — más que "estar en la tienda".

---

## 2. El muerto que hay que estudiar: Draw Something

Explotó en 2012 y se desplomó en meses. Zynga compró OMGPOP por 180–200 M
(las fuentes discrepan) y acabó cerrando el estudio y la app.

Las causas en las que coinciden las fuentes:

- **La gente se cansó de dibujar.** El mecanismo que lo hizo popular es el
  mismo que lo agotó.
- **Viralidad sin retención.** Creció enormemente y no tenía con qué
  sostener a la gente cuando pasó la novedad.
- **Más amigos, menos ganas.** Cuantos más amigos se sumaban, menos ganas
  había de mantener cada partida al día. Crecer lo empeoraba.

*(TechCrunch discrepaba en su momento: decía que la caída era normal en
cualquier juego de éxito. Es una voz minoritaria.)*

**Qué significa para nosotros:** es la advertencia más directa que hay,
porque nuestro acto central también es dibujar, que **cuesta esfuerzo**.
Lo que nos protege es que un dibujo de SketchSend dura 24 h y no tiene que
quedar bien — no hay partida que mantener ni turno que deber. Esa
diferencia hay que **defenderla a propósito**: en cuanto se añada algo que
genere obligación (rachas, turnos, "te toca a ti"), estamos repitiendo
Draw Something.

---

## 3. El ritual: BeReal

El modelo más parecido a nuestro reto semanal.

- Pico en 2022, caída fuerte hasta ~23 M a principios de 2024.
- Vendida a Voodoo en 2024 por ~500 M €.
- Hoy, estabilizada en ~40 M mensuales. Voodoo dice que en sus mercados
  grandes la mitad de los usuarios entran 6 días por semana. ⚠️ Cifras de
  la propia empresa, sin auditar.
- Las descargas siguen cayendo (–50% en 2025) pero los usuarios diarios
  subieron: retienen mejor a menos gente.

Dos cosas que las fuentes señalan y nos tocan de lleno:

- **Lo que diluyó BeReal fue meter famosos y marcas.** Su gracia era que
  solo estaban tus amigos; al abrirlo a cuentas públicas perdió lo que lo
  hacía distinto.
- **"Bonus BeReal":** aflojaron la regla estricta de una al día, pero
  siguieron premiando publicar a tiempo. Ritual sin castigo.

**Qué significa para nosotros:** ⚠️ **La idea de que los estados de los
usuarios Pro los vea todo el mundo es exactamente el error de BeReal.**
Convierte una app de amigos en una app de audiencia. Si se hace, que sea
una sección aparte y claramente separada de lo de tus amigos — no
mezclado en la misma fila.

---

## 4. Los tres patrones

1. **La retención le gana a la viralidad.** Draw Something tuvo la
   viralidad más bestia de su época y murió. BeReal perdió dos tercios de
   su gente y vale medio billón porque los que quedan vuelven. Si hay que
   elegir entre una función que trae gente nueva y una que hace volver a
   la que hay, la segunda.

2. **Lo que mata a estas apps es la obligación.** Draw Something, por los
   turnos. BeReal tuvo que aflojar su propia regla. El reto semanal debe
   ser una invitación, nunca una deuda. Sin rachas que se pierdan.

3. **Quien gana en este nicho entrega sin que abras nada.** noteit y
   Locket no ganan por dibujar mejor: ganan por el widget. Nuestro
   equivalente más cercano hoy son las notificaciones, y por eso importan
   tanto; el widget de verdad necesita app nativa.

---

## 5. Lo que yo haría con esto

| Prioridad | Qué | Por qué, según lo de arriba |
|---|---|---|
| 1 | **"Vieron tu dibujo"** | Retención pura y sin coste de privacidad. Cierra el bucle de respuesta, que es lo que hizo grande a Snapchat |
| 2 | **No meter rachas ni turnos, nunca** | Es la causa número uno de muerte en este nicho. Decisión de diseño, no función |
| 3 | **App nativa, por el widget** | Es la ventaja real de los dos competidores directos, no el estar en la tienda |
| 4 | **Si se hacen estados Pro públicos, separados de los de amigos** | Es el error documentado de BeReal |

---

## Fuentes

- [App Store — Drawing Notes, Noteit Widget](https://apps.apple.com/us/app/drawing-notes-noteit-widget/id6762532346)
- [Uptodown — Noteit Android](https://noteit.en.uptodown.com/android)
- [ScreenRant — What Is NoteIt App](https://screenrant.com/what-is-noteit-app-how-use-explained/)
- [Fast Company — Learning From Zynga's Draw Something Debacle](https://www.fastcompany.com/1836516/learning-zyngas-draw-something-debacle)
- [VentureBeat — Zynga shuts down OMGPOP](https://venturebeat.com/games/zynga-omgpop-finally-shuts-draw-something-developer-omgpop-that-it-bought-for-180m/)
- [The Week — Draw Something's disastrous month](https://theweek.com/articles/475789/draw-somethings-disastrous-month-3-theories-behind-slump)
- [BuzzFeed News — Behind the scenes of Zynga New York's implosion](https://www.buzzfeednews.com/article/mattlynley/behind-the-scenes-of-zynga-new-yorks-implosion)
- [Business of Apps — BeReal statistics](https://www.businessofapps.com/data/bereal-statistics/)
- [em360tech — What happened to BeReal](https://em360tech.com/tech-articles/what-happened-bereal-authenticity-obscurity)
- [Flinque — BeReal update 2026](https://www.flinque.com/blog/bereal-update-everything-you-need-to-know/)
- [Sacra — Voodoo](https://sacra.com/c/voodoo/)
