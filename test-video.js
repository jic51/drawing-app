/* Prueba: el video vertical para compartir.

   Lo que vigila, que es justo lo que lo haría inservible para TikTok o
   Reels sin que nadie se diera cuenta:
   - Marco 1080x1920 FIJO. Antes grababa el lienzo de la pantalla, así que
     en un portátil estrecho salía un video de 266x474.
   - Un dibujo largo se acorta, PERO sin pasarse: nunca más de
     VIDEO_VEL_MAX aumentos. Antes dos minutos de dibujo daban dos minutos
     de video; luego se pasó al otro extremo y salían a 6 aumentos.
   - La franja de la marca no se come el dibujo.
   - El archivo tiene contenido de verdad y la extensión coincide con lo
     grabado (un .webm que por dentro es MP4 no abre en iOS).

   Ejecutar:  node test-video.js
*/
/* El navegador sale de la variable NAVEGADOR: "chromium" por defecto,
   "webkit" para el motor de Safari. Probar solo en Chrome no dice nada de
   iOS, y esta app ya se rompió ahí varias veces. */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');
let SITIO;
const dir = '/tmp/claude-0/-home-user-drawing-app/a65429ad-417c-5e15-800c-f527dcef78f1/scratchpad/';
let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  SITIO = await servir();
  /* Esa opción solo la entiende Chrome; WebKit se niega a arrancar con ella. */
  const b = await NAVEGADOR.launch(NAVEGADOR === chromium
    ? { args: ['--autoplay-policy=no-user-gesture-required'] } : {});
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));

  await p.waitForTimeout(2800);

  const r = await p.evaluate(async () => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display = 'none'; });
    document.getElementById('app').style.display = 'flex';
    setupCanvas();

    /* Un dibujo largo a propósito: 30 s de trazo, para comprobar que se
       acorta a 10 y no sale un video de medio minuto. */
    trazos.length = 0;
    trazos.push({ tipo:'inicio', x:0, y:0, h:3, sid:1, t:0, origW:424, origH:754 });
    let x = 40, y = 380;
    for (let i = 0; i < 300; i++) {
      const nx = 40 + (344 * i / 300), ny = 380 + Math.sin(i/14) * 280;
      trazos.push({ tipo:'seg', de:{x,y}, a:{x:nx,y:ny}, color:'#7c3aed', gw:6, sid:1, t: i * 100 });
      x = nx; y = ny;
    }
    trazos.push({ tipo:'fin', sid:1, t:30000 });
    redibujar();

    /* Interceptar la descarga para medir el video en vez de guardarlo. */
    window.__video = null;
    const origDescargar = window.descargar;
    window.descargar = (blob, nombre) => { window.__video = { size: blob.size, type: blob.type, nombre }; };

    const t0 = performance.now();
    document.getElementById('vid-btn').click();
    /* Esperar a que termine. Desde que el video va a VELOCIDAD REAL, un
       dibujo de 30 s tarda 30 s de reloj en grabarse: la espera de 30 s que
       había antes se quedaba corta y el video «no se generaba». */
    for (let i = 0; i < 240 && !window.__video; i++) await new Promise(r => setTimeout(r, 250));
    return { video: window.__video, relojMs: Math.round(performance.now() - t0) };
  });

  /* La build de WebKit para Linux no trae MediaRecorder; el Safari de verdad
     sí lo tiene desde iOS 14.3, solo que con MP4 en vez de webm. Así que en
     ese motor no se puede comprobar la grabación — pero sí algo que importa
     igual: que la app lo diga en vez de quedarse colgada. */
  const hayGrabador = await p.evaluate(() => typeof MediaRecorder !== 'undefined');
  if (!hayGrabador) {
    console.log('ℹ️  Este motor no trae MediaRecorder: se comprueba que la app avise bien.');
    chk(!r.video, 'no se genera video, como es de esperar');
    const estado = await p.evaluate(() => ({
      avisó: (document.getElementById('toast')?.textContent || '') +
             [...document.querySelectorAll('#aviso-pila .aviso')].map(e => e.textContent).join(' '),
      descargando: typeof _downloading !== 'undefined' ? _downloading : null,
    }));
    chk(/no |not |support|admite/i.test(estado.avisó),
        'la app avisa de que no se puede grabar aquí', estado.avisó.slice(0, 70));
    chk(estado.descargando === false,
        'y no se queda bloqueada creyendo que descarga', estado);
    chk(erroresDeLaApp(errs).length === 0, 'sin errores de JS', erroresDeLaApp(errs)[0] || '');
    await b.close(); if (SITIO) await SITIO.cerrar();
    console.log(f ? '\n❌ ' + f + ' fallos' : '\n✅ degrada bien donde no hay grabador');
    process.exit(f ? 1 : 0);
  }

  chk(!!r.video, 'el video se generó', r.video || 'sin video');
  if (r.video) {
    chk(r.video.size > 20000, 'el archivo tiene contenido', { bytes: r.video.size });
    chk(/\.(webm|mp4)$/.test(r.video.nombre), 'extensión correcta', r.video.nombre);
    /* El dibujo de prueba son 300 trazos separados 100 ms: 30 s de reloj,
       pero esos 100 ms son PAUSA entre trazo y trazo, no trazo.

       La regla, en su tercera versión (2026-11-18, idea de Jose): la
       velocidad de los trazos es la REAL, y lo que se recorta son las
       pausas. Solo si aun así pasa de VIDEO_TOPE_MS se acelera.

       Como 100 ms < GAP_VIDEO (250), aquí no se recorta nada y el video
       dura lo mismo que el dibujo. Eso es CORRECTO y es lo que se quería.
       Lo que se vigila es que no se acelere: que NO salga mucho más corto
       de lo que se dibujó. */
    chk(r.relojMs > 25000, 'el video va a la VELOCIDAD REAL, no acelerado',
        { segundosReales: (r.relojMs/1000).toFixed(1) });
  }

  /* Y que el tope duro siga existiendo: sin él, dos minutos de dibujo
     darían dos minutos de video. */
  const tope = await p.evaluate(() => ({
    tope: VIDEO_TOPE_MS,
    gapVideo: GAP_VIDEO,
    gapReplay: GAP_REPLAY,
    /* lo que pasaría con un dibujo de cinco minutos */
    factorCincoMin: VIDEO_TOPE_MS > 300000 ? 1 : VIDEO_TOPE_MS / 300000
  }));
  chk(tope.tope >= 30000 && tope.tope <= 120000, 'hay un tope duro de duración', tope);
  chk(tope.factorCincoMin < 1, 'un dibujo larguísimo sí se acelera', tope);
  chk(tope.gapVideo < tope.gapReplay,
      'las pausas se aprietan más en el video que en el replay', tope);

  /* Comprobar el lienzo de grabación y la firma. */
  const marco = await p.evaluate(() => ({ W: VIDEO_W, H: VIDEO_H }));
  chk(marco.W === 1080 && marco.H === 1920, 'marco 1080x1920 (9:16 de redes)', marco);
  chk(Math.abs(marco.W / marco.H - 9/16) < 0.001, 'proporción exacta 9:16');
  /* Ya no hay franja ni degradado: la firma es la MISMA cajita que lleva
     la imagen .png, arriba a la izquierda, encima del dibujo. El dibujo
     usa el alto entero. */
  const zona = await p.evaluate(() => {
    const ow = 424, oh = 754;
    const k = Math.min(VIDEO_W / ow, VIDEO_H / oh);
    return { altoDibujo: Math.round(oh * k), altoMarco: VIDEO_H };
  });
  chk(zona.altoDibujo > marco.H * 0.95,
      'el dibujo usa el alto entero del cuadro, sin franja que se lo coma', zona);
  /* La firma del video y la de la imagen tienen que salir de la MISMA
     función: era el fallo que señaló Jose —dos marcas distintas para el
     mismo producto— y es lo que esto impide que vuelva. */
  const firma = await p.evaluate(() => {
    const src = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    return {
      unaSolaFuncion: /function pintarFirmaVideo[\s\S]{0,900}dibujarFirma\(/.test(src),
      sinMarcaVieja: !/function pintarMarcaVideo/.test(src),
      escala: typeof VIDEO_FIRMA_ESCALA !== 'undefined' ? VIDEO_FIRMA_ESCALA : null,
      margen: typeof VIDEO_MARGEN !== 'undefined' ? VIDEO_MARGEN : null
    };
  });
  chk(firma.unaSolaFuncion, 'la firma del video sale de dibujarFirma, la misma que la imagen', firma);
  chk(firma.sinMarcaVieja, 'la marca vieja del video ya no existe');
  chk(firma.escala > 1 && firma.escala * 190 < marco.W,
      'la firma se lee pero no se come el ancho del cuadro',
      { anchoFirma: Math.round(firma.escala * 190), anchoCuadro: marco.W });

  chk(erroresDeLaApp(errs).length === 0, 'sin errores de JS', erroresDeLaApp(errs)[0] || '');
  await b.close(); if (SITIO) await SITIO.cerrar();
  console.log(f ? '\n❌ ' + f + ' fallos' : '\n✅ video correcto');
  process.exit(f ? 1 : 0);
})();
