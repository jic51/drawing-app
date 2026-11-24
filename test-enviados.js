/* La bandeja de salida, y la barra de descarga.
 *
 * ENVIADOS (M1). Hasta ahora mandabas un dibujo y desaparecía de tu vista:
 * no sabías si llegó, si lo vieron, ni qué mandaste.
 *
 * Lo obvio —listar `sketches` donde `from` eres tú— no se puede: los
 * trazos viven DENTRO del mismo documento, así que diez dibujos enviados
 * serían más de un mega bajado para enseñar diez cuadraditos. Por eso una
 * miniatura aparte. Esta prueba comprueba que de verdad es pequeña: si
 * alguien la sube a PNG o a 400 px sin darse cuenta, el ahorro desaparece
 * y nadie se entera hasta que llega la factura.
 *
 * LA BARRA DE DESCARGA. Jose: «aparece el toast de descargando pero
 * desaparece a los 2 o 3 segundos, luego simplemente no hay nada que diga
 * que se está descargando algo». Lo que se vigila es que NO sea un toast:
 * que se quede hasta el final.
 *
 * Ejecutar:  node test-enviados.js     (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 880 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2400);

  await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
    document.getElementById('app').style.display = 'flex';
    usuario = 'jose';
    setupCanvas();
  });

  /* ── 1. La miniatura pesa poco de verdad ──────────────────────────── */
  const mini = await p.evaluate(() => {
    const tr = [{ tipo:'inicio', origW:424, origH:754, sid:1, t:0 }];
    let x = 40, y = 60;
    for (let i = 0; i < 900; i++) {
      const nx = 40 + 340*Math.random(), ny = 60 + 640*Math.random();
      tr.push({ tipo:'seg', de:{x,y}, a:{x:nx,y:ny},
                color:'hsl('+(i%360)+',90%,55%)', gw:4, sid:1, t:i*20 });
      x = nx; y = ny;
    }
    const d = miniaturaDeTrazos(tr);
    const pesoTrazos = new Blob([JSON.stringify(tr)]).size;
    return {
      hay: !!d,
      formato: d ? d.slice(5, d.indexOf(';')) : null,
      kb: d ? Math.round(d.length / 1024) : 0,
      trazosKB: Math.round(pesoTrazos / 1024),
      lado: typeof MINI_LADO !== 'undefined' ? MINI_LADO : null,
      /* Un dibujo vacío no debe dar miniatura: no hay nada que enseñar. */
      vacia: miniaturaDeTrazos([{ tipo:'inicio', sid:1, t:0 }])
    };
  });

  chk(mini.hay, 'se genera una miniatura del dibujo', mini.formato);
  chk(/webp|jpeg/.test(mini.formato || ''),
      'en WebP o JPEG, no en PNG (el mismo dibujo en PNG son 45 KB)', mini.formato);
  chk(mini.kb <= 20,
      'y pesa poco: un dibujo de 900 trazos cabe en pocos KB',
      { miniaturaKB: mini.kb, trazosKB: mini.trazosKB });
  chk(mini.trazosKB / Math.max(1, mini.kb) > 5,
      'al menos 5 veces menos que los trazos, que es el motivo de existir',
      { veces: Math.round(mini.trazosKB / Math.max(1, mini.kb)) });
  chk(mini.vacia === null, 'un dibujo vacío no genera miniatura');

  /* ── 2. La pestaña enseña lo enviado y si lo vieron ───────────────── */
  const tab = await p.evaluate(() => {
    const ahora = Date.now(), DIA = 86400000;
    enviadosCacheItems = [
      { id:'a', para:'u1', paraNombre:'ana',  miniatura:null, trazos:9, viewed:true,
        createdAt: ahora,        expiresAt: ahora + DIA },
      { id:'b', para:'u2', paraNombre:'luis', miniatura:null, trazos:9, viewed:false,
        createdAt: ahora - 1000, expiresAt: ahora + DIA },
    ];
    cambiarPestana('enviados');
    const r = {
      items: document.querySelectorAll('#outbox-body .outbox-item').length,
      estados: [...document.querySelectorAll('.outbox-estado')].map(e => ({
        texto: e.textContent.trim(), visto: e.classList.contains('visto')
      })),
      nombres: [...document.querySelectorAll('.outbox-para')].map(e => e.textContent.trim()),
      recibidosOculto: document.getElementById('inbox-body').hidden,
      contador: document.getElementById('tab-enviados').textContent
    };
    /* Y que se pueda volver. */
    cambiarPestana('recibidos');
    r.vuelve = !document.getElementById('inbox-body').hidden
            && document.getElementById('outbox-body').hidden;

    /* Vacía: tiene que invitar a enviar, no informar de la nada. */
    enviadosCacheItems = [];
    cambiarPestana('enviados');
    r.vacio = document.getElementById('outbox-body').textContent.trim();
    cambiarPestana('recibidos');
    return r;
  });

  chk(tab.items === 2, 'la pestaña de enviados pinta lo que mandaste', tab.items);
  chk(tab.nombres.join() === '@ana,@luis', 'con el @ de a quién', tab.nombres);
  /* Por la CLASE y no por el texto: «Not seen yet» contiene «seen», y una
     prueba que casa con las dos cosas no prueba nada. */
  chk(tab.estados[0] && tab.estados[0].visto && tab.estados[1] && !tab.estados[1].visto,
      'y distingue lo que vieron de lo que no', tab.estados);
  chk(tab.recibidosOculto && tab.vuelve, 'las dos pestañas se alternan bien');
  chk(/\(2\)/.test(tab.contador), 'la pestaña lleva la cuenta', tab.contador);
  chk(/pregunta de hoy|today's question/i.test(tab.vacio),
      'vacía, manda a dibujar en vez de informar de la nada', tab.vacio.slice(0, 60));

  /* ── 3. La barra de descarga NO es un toast ───────────────────────── */
  const desc = await p.evaluate(async () => {
    descarga.abrir('probando');
    const caja = document.getElementById('descarga');
    const visibleAlAbrir = caja.classList.contains('ver');

    descarga.poner(0.4);
    const al40 = document.getElementById('descarga-barra').style.width;
    const pct40 = document.getElementById('descarga-pct').textContent;

    /* Lo que fallaba antes: a los 3 segundos no quedaba nada. */
    await new Promise(r => setTimeout(r, 3400));
    const sigueAlos3s = caja.classList.contains('ver');

    descarga.listo('lista');
    const enVerde = caja.classList.contains('hecho');
    const icono = document.getElementById('descarga-icono').textContent;
    return { visibleAlAbrir, al40, pct40, sigueAlos3s, enVerde, icono };
  });

  chk(desc.visibleAlAbrir, 'la barra aparece al empezar la descarga');
  chk(desc.al40 === '40%' && desc.pct40 === '40%',
      'y enseña el porcentaje de verdad', { ancho: desc.al40, texto: desc.pct40 });
  chk(desc.sigueAlos3s,
      'a los 3,4 s SIGUE ahí — no es un toast, que era el fallo');
  chk(desc.enVerde && desc.icono === '✅',
      'al terminar se pone verde con un check', desc.icono);

  /* ── 4. Y que no queden emojis en las sugerencias ──────────────────── */
  const emojis = await p.evaluate(() => {
    const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
    const conEmoji = [];
    for (const lista of [PROMPTS_ES, PROMPTS_EN]) {
      for (const x of lista) if (EMO.test(x)) conEmoji.push(x);
    }
    for (const r of window.SS.RETOS) {
      if (EMO.test(r.es) || EMO.test(r.en)) conEmoji.push(r.en);
    }
    return conEmoji;
  });
  chk(emojis.length === 0,
      'ni las sugerencias ni las preguntas del día llevan emojis', emojis.slice(0, 4));

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ bandeja de salida y barra de descarga');
})();
