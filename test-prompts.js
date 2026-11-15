/* Prueba: las sugerencias sobre el lienzo.

   Son dos cosas distintas que antes se mezclaban:
   - EL RETO de la semana: la invitación. Sale al abrir con el lienzo vacío,
     destacado, y se va al primer trazo.
   - LAS IDEAS: una ayuda. Solo tras un silencio LARGO, y entonces van
     cambiando. Lo que vigila esta prueba es justo lo que molestaba: que una
     pausa corta no las traiga de vuelta.

   También comprueba que la caja quede DENTRO del lienzo: va anclada a él y
   no al área que lo rodea, porque el lienzo es estrecho (9:16) y centrado,
   y una caja anclada al área se salía por los lados.

   Ejecutar:  node test-prompts.js
*/
/* El navegador sale de la variable NAVEGADOR: "chromium" por defecto,
   "webkit" para el motor de Safari. Probar solo en Chrome no dice nada de
   iOS, y esta app ya se rompió ahí varias veces. */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');
let SITIO;
const path = require('path');
const IDEAS_CICLO_ESPERADO = 12000;
let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 850 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2800);
  await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => e.style.display = 'none');
    document.getElementById('app').style.display = 'flex';
    setupCanvas();
    /* En la app esto se lanza al iniciar sesión; aquí hay que llamarlo a
       mano o no se programa el reto ni se registran los escuchadores. */
    iniciarPromptsCanvas();
  });
  await p.waitForTimeout(1200);

  const leer = () => p.evaluate(() => {
    const el = document.getElementById('drawing-prompts');
    const txt = document.getElementById('prompt-text');
    const area = document.getElementById('carea').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { visible: +getComputedStyle(el).opacity > 0.5,
             clases: el.className, texto: txt.textContent,
             arriba: (r.top - area.top) < area.height * 0.25,
             distanciaArriba: Math.round(r.top - area.top),
             subVisible: getComputedStyle(document.getElementById('prompt-sub')).display !== 'none' };
  });

  console.log('— Al abrir con el lienzo vacío —');
  let e = await leer();
  chk(e.visible, 'sale una sugerencia', e.texto);
  chk(/Challenge of the week|Reto de la semana/.test(e.texto), 'y es el RETO de la semana', e.texto);
  chk(e.clases.includes('reto'), 'con el estilo destacado', e.clases);
  chk(e.arriba, 'colocada ARRIBA del lienzo', { aDistanciaDelBorde: e.distanciaArriba });
  chk(e.subVisible, 'con el "empieza a dibujar" debajo');
  const dentro = await p.evaluate(() => {
    const s = document.getElementById('drawing-prompts').getBoundingClientRect();
    const c = document.getElementById('canvas').getBoundingClientRect();
    return s.left >= c.left - 1 && s.right <= c.right + 1 && s.top >= c.top - 1 && s.bottom <= c.bottom;
  });
  chk(dentro, 'y entera DENTRO del lienzo, sin salirse por los lados');
  /* Cada letra va en su propio inline-block para poder animarla; sin
     agrupar por palabras, el navegador corta la línea a mitad de palabra. */
  const partidas = await p.evaluate(() => {
    const el = document.getElementById('prompt-text');
    return [...el.querySelectorAll('.w')].filter(w => {
      const lineas = new Set([...w.querySelectorAll('.ch')].map(c => Math.round(c.getBoundingClientRect().top)));
      return lineas.size > 1;
    }).map(w => w.textContent);
  });
  chk(partidas.length === 0, 'ninguna palabra se parte entre dos líneas', partidas);

  console.log('\n— Al empezar a dibujar —');
  const caja = await p.locator('#canvas').boundingBox();
  await p.mouse.move(caja.x + 60, caja.y + 300);
  await p.mouse.down();
  await p.mouse.move(caja.x + 160, caja.y + 360);
  await p.waitForTimeout(700);
  e = await leer();
  chk(!e.visible, 'desaparece', { opacidad: e.visible });
  await p.mouse.up();

  console.log('\n— Una pausa corta NO debe traerla de vuelta —');
  await p.waitForTimeout(6000);
  e = await leer();
  chk(!e.visible, 'sigue sin aparecer tras 6 s parado');

  console.log('\n— Tras un silencio largo, ideas que van cambiando —');
  /* Se fuerza el final de la cuenta atrás en vez de esperar 75 s. */
  await p.evaluate(() => { clearTimeout(promptTimer); mostrarIdea(); });
  await p.waitForTimeout(300);
  e = await leer();
  chk(e.visible && e.clases.includes('idea'), 'aparece una idea, con otro estilo', e.clases);
  chk(!/Challenge of the week|Reto de la semana/.test(e.texto), 'y no es el reto', e.texto);
  chk(!e.subVisible, 'sin el "empieza a dibujar" (ya dibujó)');
  chk(e.arriba, 'también arriba', { aDistanciaDelBorde: e.distanciaArriba });
  const t1 = e.texto;
  /* El cambio se dispara a mano: esperar los 12 s reales haría la prueba
     eterna sin comprobar nada más. */
  await p.evaluate(() => { clearTimeout(ideasTimer); mostrarIdea(); });
  await p.waitForTimeout(250);
  const barrido = await p.evaluate(() => {
    const ch = [...document.querySelectorAll('#prompt-text .ch')];
    const teñidas = ch.filter(c => c.style.color).length;
    return { teñidas, total: ch.length };
  });
  chk(barrido.teñidas > 0, 'al cambiar, las letras se tiñen con los colores del logo', barrido);
  await p.waitForTimeout(2200);
  const t2 = (await leer()).texto;
  chk(t1 !== t2, 'y entra la frase nueva', { antes: t1, despues: t2 });
  chk(IDEAS_CICLO_ESPERADO === await p.evaluate(() => IDEAS_CICLO),
      'cada frase dura 12 s, no 4', { configurado: await p.evaluate(() => IDEAS_CICLO) });

  console.log('\n— Volver a dibujar la calla —');
  await p.mouse.move(caja.x + 200, caja.y + 400);
  await p.mouse.down(); await p.mouse.move(caja.x + 240, caja.y + 420); await p.mouse.up();
  await p.waitForTimeout(600);
  e = await leer();
  chk(!e.visible, 'se va al tocar el lienzo');
  await p.waitForTimeout(4500);
  chk(!(await leer()).visible, 'y el goteo de ideas quedó cortado, no vuelve solo');

  chk(erroresDeLaApp(errs).length === 0, 'sin errores de JS', erroresDeLaApp(errs)[0] || '');
  await b.close(); if (SITIO) await SITIO.cerrar();
  console.log(f ? '\n❌ ' + f + ' fallos' : '\n✅ sugerencias correctas');
  process.exit(f ? 1 : 0);
})();
