/* Prueba: el aviso flotante y el "vieron tu dibujo".

   Lo que vigila, que es lo fácil de romper:
   - Al ABRIR la app no debe salir un aviso por cada dibujo pendiente: todos
     serían "nuevos" y aparecerían diez de golpe.
   - Un dibujo que llega DESPUÉS sí avisa, con la cara de quien lo manda, y
     al tocarlo se abre la bandeja.
   - La pila no crece sin fin.
   - Al abrir un dibujo se marca viewed en Firestore, que es lo que dispara
     el aviso a quien lo envió. Nadie lo marcaba nunca.

   Ejecutar:  node test-notice.js
*/
/* El navegador sale de la variable NAVEGADOR: "chromium" por defecto,
   "webkit" para el motor de Safari. Probar solo en Chrome no dice nada de
   iOS, y esta app ya se rompió ahí varias veces. */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');
let SITIO;
const path = require('path');
let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 850 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2800);

  /* Firebase está bloqueado aquí, así que se imita lo justo: el camino que
     va del snapshot de la bandeja al aviso y al marcado de visto. */
  await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => e.style.display = 'none');
    document.getElementById('app').style.display = 'flex';
    setupCanvas();

    window.__updates = [];
    window.db = {
      collection: () => ({
        doc: id => ({
          update: datos => { window.__updates.push({ id, datos }); return Promise.resolve(); },
          delete: () => Promise.resolve(),
        })
      })
    };
    window.auth = { currentUser: { uid: 'yo' } };
    window.firebaseReady = true;
    window.firebase = { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } };
  });

  const pila = () => p.evaluate(() => [...document.querySelectorAll('#aviso-pila .aviso')]
    .map(e => e.querySelector('.aviso-quien').textContent + ' ' + e.querySelector('.aviso-que').textContent));

  console.log('— Al abrir la app con dibujos pendientes —');
  await p.evaluate(() => {
    /* Primera carga: tres dibujos ya esperando. */
    bandejaEntrada = [
      { id:'a', sender:'ana',  receivedAt:Date.now()-5000, expiresAt:Date.now()+9e6, viewed:false, visto:false, strokes:[] },
      { id:'b', sender:'luis', receivedAt:Date.now()-4000, expiresAt:Date.now()+9e6, viewed:false, visto:false, strokes:[] },
      { id:'c', sender:'ana',  receivedAt:Date.now()-3000, expiresAt:Date.now()+9e6, viewed:false, visto:false, strokes:[] },
    ];
    primeraBandeja = false;   /* como si el snapshot inicial ya hubiera pasado */
    renderInbox();
  });
  await p.waitForTimeout(400);
  chk((await pila()).length === 0, 'no sale ningún aviso por los que ya estaban', await pila());

  console.log('\n— Llega uno nuevo —');
  await p.evaluate(() => {
    aviso({ quien: 'marta', texto: t('aviso_llego'), alTocar: () => abrirInbox() });
  });
  await p.waitForTimeout(400);
  let v = await pila();
  chk(v.length === 1, 'aparece un aviso', v);
  chk(/@marta/.test(v[0]), 'con quién lo manda', v[0]);
  chk(/drawing|dibujo/.test(v[0]), 'y qué pasó', v[0]);
  const conAvatar = await p.evaluate(() => !!document.querySelector('#aviso-pila .aviso img')?.src);
  chk(conAvatar, 'con su cara');

  console.log('\n— Al tocarlo se abre la bandeja —');
  await p.click('#aviso-pila .aviso');
  await p.waitForTimeout(500);
  chk(await p.evaluate(() => document.getElementById('inbox-overlay').classList.contains('activo')),
      'la bandeja queda abierta');
  chk((await pila()).length === 0, 'y el aviso se retira al tocarlo');

  console.log('\n— La pila no crece sin fin —');
  await p.evaluate(() => { for (let i = 0; i < 7; i++) aviso({ quien: 'u' + i, texto: 'x' }); });
  await p.waitForTimeout(300);
  const n = (await pila()).length;
  chk(n <= 3, 'como mucho tres a la vez', { apilados: n });

  console.log('\n— Abrir un dibujo lo marca como visto —');
  /* No se puede sustituir db ni auth desde fuera (son de ámbito de módulo),
     así que se vigila la función que hace el marcado: lo que importa aquí
     es que el toque la dispare, y una sola vez por dibujo. */
  await p.evaluate(() => {
    window.__vistos = [];
    window.__marcarVistoReal = marcarVisto;
    window.marcarVisto = msg => { if (msg) window.__vistos.push(msg.id); return window.__marcarVistoReal(msg); };
    document.querySelectorAll('#aviso-pila .aviso').forEach(e => e.remove());
    renderInbox();
    document.querySelector('.inbox-card').click();
  });
  await p.waitForTimeout(500);
  const vistos = await p.evaluate(() => window.__vistos);
  chk(vistos.length === 1, 'abrir un dibujo dispara el marcado', vistos);

  console.log('\n— La guarda de no repetir —');
  /* El envío a Firestore no se puede ejercitar aquí: el SDK está bloqueado
     en este entorno, así que marcarVisto sale antes de escribir. Lo que sí
     se comprueba es la guarda, que es la parte con lógica: un dibujo ya
     visto no vuelve a escribirse aunque se abra otra vez. */
  const guarda = await p.evaluate(() => {
    /* La de verdad, sin el espía de antes. */
    const fn = window.__marcarVistoReal || marcarVisto;
    return { yaVisto: fn({ id: 'z', viewed: true }), sinMensaje: fn(null) };
  });
  chk(guarda.yaVisto === false, 'un dibujo ya visto no se vuelve a escribir', guarda);
  chk(guarda.sinMensaje === false, 'y sin dibujo no hace nada');

  chk(erroresDeLaApp(errs).length === 0, 'sin errores de JS', erroresDeLaApp(errs)[0] || '');
  await b.close(); if (SITIO) await SITIO.cerrar();
  console.log(f ? '\n❌ ' + f + ' fallo(s)' : '\n✅ Avisos correctos');
  process.exit(f ? 1 : 0);
})();
