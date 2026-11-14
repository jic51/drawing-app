/* Prueba: el video vertical para compartir.

   Lo que vigila, que es justo lo que lo haría inservible para TikTok o
   Reels sin que nadie se diera cuenta:
   - Marco 1080x1920 FIJO. Antes grababa el lienzo de la pantalla, así que
     en un portátil estrecho salía un video de 266x474.
   - Un dibujo largo se acorta. Antes, dos minutos de dibujo daban dos
     minutos de video.
   - La franja de la marca no se come el dibujo.
   - El archivo tiene contenido de verdad y la extensión coincide con lo
     grabado (un .webm que por dentro es MP4 no abre en iOS).

   Ejecutar:  node test-video.js
*/
const { chromium } = require('playwright');
const dir = '/tmp/claude-0/-home-user-drawing-app/a65429ad-417c-5e15-800c-f527dcef78f1/scratchpad/';
let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, 'index.html'));

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
    /* Esperar a que termine (máx 30 s de reloj). */
    for (let i = 0; i < 120 && !window.__video; i++) await new Promise(r => setTimeout(r, 250));
    return { video: window.__video, relojMs: Math.round(performance.now() - t0) };
  });

  chk(!!r.video, 'el video se generó', r.video || 'sin video');
  if (r.video) {
    chk(r.video.size > 20000, 'el archivo tiene contenido', { bytes: r.video.size });
    chk(/\.(webm|mp4)$/.test(r.video.nombre), 'extensión correcta', r.video.nombre);
    /* 30 s de dibujo acotados a 10 + 1,3 de cola ≈ 11-13 s de reloj. */
    chk(r.relojMs < 18000, 'un dibujo de 30 s se acorta (no graba 30 s)', { segundosReales: (r.relojMs/1000).toFixed(1) });
  }

  /* Comprobar el lienzo de grabación: tamaño y marca abajo. */
  const marco = await p.evaluate(() => ({ W: VIDEO_W, H: VIDEO_H, banda: VIDEO_BANDA, max: VIDEO_MAX_MS }));
  chk(marco.W === 1080 && marco.H === 1920, 'marco 1080x1920 (9:16 de redes)', marco);
  chk(Math.abs(marco.W / marco.H - 9/16) < 0.001, 'proporción exacta 9:16');
  chk(marco.banda > 100 && marco.banda < marco.H * 0.15, 'la franja de la marca no se come el dibujo',
      { banda: marco.banda, porcentaje: Math.round(marco.banda / marco.H * 100) + '%' });

  chk(errs.length === 0, 'sin errores de JS', errs[0] || '');
  await b.close();
  console.log(f ? '\n❌ ' + f + ' fallos' : '\n✅ video correcto');
  process.exit(f ? 1 : 0);
})();
