/* Prueba: el carrusel de la galería gira SIN FIN y sin saltos.

   Antes, al llegar al último dibujo se hacía scrollLeft = 0 y todo pegaba un
   salto hacia atrás bien visible. Ahora la primera columna se MUEVE al final
   y se le resta su ancho a la posición, así que en pantalla no cambia nada.

   Dos cosas que esta prueba vigila y que es fácil romper sin darse cuenta:
   - Se MUEVEN los elementos, no se clonan. Un clon saldría con el lienzo en
     blanco, porque el dibujo se está reproduciendo en el original.
   - Con dos filas hay que mover la columna ENTERA (dos tarjetas) o el
     emparejado de las filas se desbarata.

   Ejecutar:  node test-carousel.js
*/
const { chromium } = require('playwright');
const path = require('path');

/* Dibujos de mentira pero con proporciones MEZCLADAS, que es el caso real
   desde que cada tarjeta toma la forma de su dibujo: unos verticales (como
   los que hace la app hoy) y otros apaisados (los antiguos). */
function trazosFalsos(semilla, ow, oh) {
  const t = [{ tipo:'inicio', x:0, y:0, h:3, sid:1, t:0, origW:ow, origH:oh }];
  let x = ow * 0.15, y = oh * 0.5;
  for (let i = 0; i < 60; i++) {
    const nx = ow * 0.15 + (ow * 0.7) * (i / 60);
    const ny = oh * 0.5 + Math.sin(i / 5 + semilla) * oh * 0.25;
    t.push({ tipo:'seg', de:{ x, y }, a:{ x:nx, y:ny },
             color:'#7c3aed', gw:5, sid:1, t:i * 30 });
    x = nx; y = ny;
  }
  t.push({ tipo:'fin', sid:1, t:1800 });
  return t;
}

const FORMAS = [[424, 754], [1206, 754], [416, 557], [600, 600]];

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const b = await chromium.launch();
  /* Estrecho a propósito para que el contenido desborde y el carrusel gire. */
  const p = await b.newPage({ viewport: { width: 560, height: 900 } });
  await p.goto('file://' + path.resolve(__dirname, 'index.html'));
  await p.waitForTimeout(1200);

  await p.evaluate(({ formas, fuente }) => {
    const trazosFalsos = new Function('return ' + fuente)();
    document.getElementById('landing-splash')?.remove();
    const grid = document.getElementById('gallery-grid');
    const sec = document.getElementById('gallery-section');
    grid.innerHTML = '';
    /* 8 tarjetas a partir de dibujos REALES, repetidos, para tener suficientes. */
    for (let i = 0; i < 8; i++) {
      const [ow, oh] = formas[i % formas.length];
      const c = createGalleryCard(trazosFalsos(i, ow, oh), 'u' + i, '');
      c.dataset.marca = 'c' + i;          // para seguir quién es quién al rotar
      grid.appendChild(c);
    }
    sec.classList.add('ready'); sec.style.display = '';
    montarCarrusel(grid, 2);
    /* Tanto el giro como la reproducción de los dibujos solo arrancan con la
       sección a la vista (IntersectionObserver): hay que ponerla en pantalla. */
    sec.scrollIntoView({ block: 'center' });
  }, { formas: FORMAS, fuente: trazosFalsos.toString() });
  await p.waitForTimeout(1200);

  const leer = () => p.evaluate(() => {
    const g = document.getElementById('gallery-grid');
    const hijos = [...g.children];
    const filas = {};
    hijos.forEach(c => {
      const t = Math.round(c.getBoundingClientRect().top);
      (filas[t] = filas[t] || []).push(c.dataset.marca);
    });
    return { orden: hijos.map(c => c.dataset.marca), scroll: Math.round(g.scrollLeft),
             nFilas: Object.keys(filas).length,
             desborda: g.scrollWidth > g.clientWidth + 4, n: hijos.length };
  });

  const a = await leer();
  chk(a.desborda, 'el contenido desborda, así que el carrusel gira', { n: a.n });
  const arranco = await p.evaluate(async () => {
    const g = document.getElementById('gallery-grid');
    const s0 = g.scrollLeft;
    await new Promise(r => setTimeout(r, 1500));
    return g.scrollLeft > s0;
  });
  chk(arranco, 'el carrusel se está moviendo');
  chk(a.nFilas === 2, 'empieza con 2 filas', { filas: a.nFilas });

  /* Lo que importa no es scrollLeft sino lo que se VE. Al rotar, a la
     posición se le resta el ancho de la columna que se fue, así que
     scrollLeft baja de golpe aunque en pantalla no se mueva nada: medir eso
     daba un falso fallo.

     Así que se sigue la posición en pantalla de cada tarjeta. Entre dos
     muestras, todas deben haberse desplazado un poquito a la izquierda; la
     única que puede dar un salto grande es la columna que acaba de pasar
     del principio al final, y son como mucho `porColumna` tarjetas. */
  const posiciones = () => p.evaluate(() => {
    const g = document.getElementById('gallery-grid');
    const m = {};
    [...g.children].forEach(c => { m[c.dataset.marca] = Math.round(c.getBoundingClientRect().left); });
    return m;
  });

  let saltonasMax = 0, rotaciones = 0;
  let prev = await posiciones();
  for (let i = 0; i < 70; i++) {
    await p.waitForTimeout(250);
    const cur = await posiciones();
    let saltonas = 0;
    for (const k of Object.keys(cur)) {
      if (prev[k] === undefined) continue;
      if (Math.abs(cur[k] - prev[k]) > 40) saltonas++;
    }
    if (saltonas) rotaciones++;
    saltonasMax = Math.max(saltonasMax, saltonas);
    prev = cur;
  }
  const z = await leer();
  chk(rotaciones > 0, 'llegó a dar la vuelta al menos una vez', { rotaciones });
  chk(saltonasMax <= 2,
      'en pantalla solo salta la columna que da la vuelta, nunca el resto',
      { maxTarjetasQueSaltan: saltonasMax });

  chk(z.nFilas === 2, 'sigue con 2 filas después de rotar', { filas: z.nFilas });
  chk(z.n === a.n, 'no se pierde ni se duplica ninguna tarjeta', { antes: a.n, ahora: z.n });
  chk(JSON.stringify(z.orden) !== JSON.stringify(a.orden), 'el orden rotó (está girando de verdad)',
      { antes: a.orden.join(','), ahora: z.orden.join(',') });
  chk([...new Set(z.orden)].length === z.orden.length, 'sin tarjetas repetidas tras rotar');

  /* ¿Los dibujos siguen animándose después de rotar? Se comparan dos fotos
     del mismo lienzo separadas en el tiempo. */
  const mueve = await p.evaluate(async () => {
    const cv = document.querySelector('#gallery-grid canvas');
    const foto = () => cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data.join(',').length;
    /* El replay se queda QUIETO 2,7 s al terminar antes de repetir, así que
       dos fotos cercanas pueden salir idénticas aunque todo funcione. Se
       vigila una ventana más larga que esa pausa y basta con que cambie
       una vez. */
    const a = foto();
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (foto() !== a) return true;
    }
    return false;
  });
  chk(mueve, 'los dibujos siguen reproduciéndose tras la rotación (no son clones muertos)');

  await b.close();
  console.log(f ? '\n❌ ' + f + ' fallos' : '\n✅ carrusel sin fin correcto');
  process.exit(f ? 1 : 0);
})();
