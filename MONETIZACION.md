# Cómo gana dinero SketchSend

> Escrito el 2026-11-16, a petición de Jose. Las cifras de conversión son
> rangos conocidos del sector, **no datos medidos de SketchSend** — con 17
> usuarios no hay nada que medir todavía. Están para razonar, no para
> prometer.

---

## Lo primero: por qué hoy no se puede cobrar nada

Con 17 usuarios, cualquier cosa de pago convierte aproximadamente cero y
cuesta semanas de trabajo. No es pesimismo, es aritmética: el 3% de 17 es
media persona.

Eso **no** significa regalar todo para siempre. Significa que el orden
correcto es: primero que la app valga algo con gente dentro, y mientras
tanto construir **de forma que cobrar después sea fácil**. Lo segundo sí
se puede hacer ya, y es gratis.

---

## Lo que NUNCA se cobra

Dibujar, enviar, recibir, las 24 horas, tener amigos.

No por generosidad: **el producto no vale nada sin densidad**. Una app de
mensajes donde tus amigos no están no sirve ni regalada. Cada obstáculo
que pongas en el camino de alguien que invita a un amigo te cuesta más de
lo que te da.

Draw Something cobraba por quitar anuncios y murió igual. BeReal tardó
años en monetizar y lo que la salvó fue la gente que volvía, no la que
pagaba.

---

## Las tres vías, por orden de lo que yo haría

### 1. 🏆 Clases y profesores — la fuerte

La idea de Jose: un profesor de arte crea una clase, genera un enlace por
alumno, los alumnos dibujan **sin crear cuenta**, y el profesor lo ve todo
desde su panel.

**Por qué es la mejor, y no es por el dinero directo:**

| | |
|---|---|
| **Quien paga tiene presupuesto y un trabajo que resolver** | Un adolescente no paga 3 € por mandar dibujos. Un profesor sí paga 10 € al mes por una herramienta que le sirve en clase. Es la diferencia entre vender un capricho y vender una herramienta |
| **Resuelve el problema de la soledad** | Hoy quien llega solo no tiene nada que hacer — es la debilidad más grande de la app. Una clase llega con 25 personas **a la vez** y con un motivo para dibujar |
| **El replay es pedagógico de verdad** | Un profesor puede ver CÓMO lo dibujó su alumno, no solo el resultado: por dónde empezó, dónde dudó, qué borró. Eso no lo hace ningún competidor, y es exactamente lo que ya está construido |
| **Reaprovecha casi todo** | Lienzo, trazos, replay, enlaces de visor, descarga de video. Lo nuevo es el panel y los enlaces de clase |

**La aritmética que lo decide:**

- Consumidor: 1.000 usuarios × 3% que pagan × 3 €/mes = **90 €/mes**
- Profesores: **9 profesores** × 10 €/mes = **90 €/mes**

Conseguir 9 profesores es un problema muy distinto —y mucho más
alcanzable— que conseguir 1.000 usuarios.

**⚠️ Lo que hay que resolver antes de tocar una línea de código:**

- **Menores.** Es lo serio. Hoy los términos dicen 13+. Una clase son
  niños, posiblemente de menos de 13. En cuanto se recogen datos de un
  menor de 13 de forma consciente, aplican la COPPA (EE.UU.) y el RGPD-K
  (Europa). **La buena noticia es que el diseño de Jose ya esquiva casi
  todo**: el alumno no crea cuenta, no da correo, no da nombre si no
  quiere. Eso hay que mantenerlo a propósito y escribirlo en la política,
  no que pase por accidente.
- **Enlaces de clase.** Un enlace por alumno tiene que caducar y servir una
  vez. Si no, es un lienzo público con el nombre del colegio encima.
- **El alcance.** Panel + tiempo límite + ver en vivo + descargas es otro
  producto. **Ver en vivo es lo caro** (un documento por trazo sale carísimo
  en Firestore). El replay ya da el 80% del valor pedagógico sin eso.

**La versión mínima que un profesor pagaría:** crear una clase → generar N
enlaces → los alumnos dibujan → el profesor ve todos los dibujos en una
cuadrícula, los reproduce uno a uno y los descarga. **Sin tiempo real y
sin cronómetro en la v1.**

### 2. SketchSend Pro — la del consumidor

Ya está la tienda puesta en Ajustes con "Coming soon", así que la
estructura existe.

Qué incluiría, por orden de lo que de verdad hace pagar:

| Función | Por qué paga la gente |
|---|---|
| **Video sin marca** | La más fuerte. Quien comparte en redes quiere su pieza limpia. Y es el modelo TikTok: el gratuito lleva marca, que es publicidad |
| **Dibujos permanentes** | Lo que se guarda no caduca. Choca de frente con la promesa de las 24 h, así que tiene que ser por dibujo y muy explícito |
| **Colores y pinceles** | Vanidad pura, barata de hacer, convierte poco pero convierte |
| **Descarga en alta** | Para quien quiere imprimirlo o enmarcarlo |

Precio de referencia: **3 €/mes o 20 €/año**. La conversión típica en apps
sociales está entre el **1% y el 3%**; lo que pase de ahí sería excepcional.

### 3. La marca del video — monetización Y crecimiento a la vez

Ya está hecha. Todo video lleva `@usuario` + "Hecho con SketchSend".

Es lo único de esta lista que **gana dinero y trae gente al mismo tiempo**:
quien no paga hace publicidad, quien paga la quita. Es exactamente lo que
hizo TikTok y es su motor viral número uno.

No hay nada que construir aquí; solo hace falta que exista el Pro para
poder quitarla.

---

## Lo que NO haría

- **Anuncios.** Es lo que mató la experiencia de Draw Something, y con
  pocos usuarios no paga ni el café. Además choca con lo íntimo del
  producto: un anuncio entre el dibujo de tu amiga y tú.
- **Cobrar por número de dibujos al día.** Castiga justo a quien más usa la
  app, que es quien te trae a los demás.
- **Montar los pagos ahora.** Stripe, facturas, impuestos, reembolsos y
  política de devolución son semanas de trabajo que no mueven nada hasta
  que haya a quién cobrar.

---

## Qué hacer esta semana, que es gratis

1. **Comprobar si existe el interés antes de construirlo.** El formulario
   de correos de la landing ya está. Añadirle una pregunta: *"¿Eres
   profesor/a? Cuéntanos"*. Si en un mes contestan tres, la vía de las
   clases está validada. Si no contesta nadie, te ahorraste meses.
2. **Hablar con un profesor de arte de verdad.** Uno. Enséñale el replay de
   un dibujo y mira su cara. Eso vale más que cualquier análisis de este
   documento, incluido este.
3. **Mantener la tienda como está**, con "Coming soon". Dice que habrá algo
   de pago sin prometer cuándo, y las pulsaciones en esos botones ya son un
   dato de interés si se miden.

---

## Cuando llegue el momento de cobrar

- **Cobrar desde la web, no desde la app del teléfono.** Apple se lleva el
  30% de los pagos hechos dentro de una app de iOS. Desde el navegador, no.
- **Stripe**, que tiene extensión oficial para Firebase y ahorra montar el
  servidor de suscripciones.
- **Antes del primer cobro hacen falta**: política de devolución, decir qué
  pasa con los dibujos permanentes si alguien cancela, y facturas. Está
  anotado como F17 en el backlog.
