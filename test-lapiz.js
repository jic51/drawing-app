/* El lápiz: la presión manda de principio a fin del trazo.
 *
 * Lo encontró Jose con el Apple Pencil: «la presión y la velocidad a veces
 * se pelean por el control».
 *
 * La causa estaba en el código: quién mandaba en el grosor se decidía en
 * CADA punto. El Pencil no reporta presión en todos los eventos —un roce
 * flojo da `pressure` 0, y algunos eventos vienen sin ella—, así que dentro
 * de un mismo trazo el grosor saltaba de un sistema al otro y salían
 * escalones.
 *
 * Esto NO se ve probando con el ratón, que es como se prueba siempre: un
 * ratón nunca reporta presión, así que siempre cae en la rama de la
 * velocidad y nunca hay pelea. Por eso la prueba simula un lápiz de verdad,
 * con `pointerType: 'pen'`, presión variable y huecos sin presión.
 *
 * Ejecutar:  node test-lapiz.js        (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2500);

  const r = await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
    document.getElementById('app').style.display = 'flex';
    setupCanvas();
    trazos.length = 0;

    /* Un trazo de lápiz con presión CONSTANTE, pero donde algunos eventos
       llegan sin presión — que es justo lo que hace el Apple Pencil. */
    empezarTrazo({ pointerType: 'pen', pressure: 0.6, tiltX: 0, tiltY: 0 });
    const anchos = [];
    for (let i = 0; i < 24; i++) {
      /* Uno de cada tres eventos viene SIN presión. */
      const sinPresion = (i % 3 === 1);
      const e = { pointerType: 'pen', pressure: sinPresion ? 0 : 0.6,
                  tiltX: 0, tiltY: 0, clientX: 0, clientY: 0 };
      const c = coords(e);
      /* Se mueve rápido a propósito: si mandara la velocidad, adelgazaría. */
      anchos.push(grosor(c.p, i * 25, i * 25, c.inc));
    }

    /* El mismo trazo, pero con el lápiz tumbado. */
    empezarTrazo({ pointerType: 'pen', pressure: 0.6, tiltX: 60, tiltY: 40 });
    const cTumbado = coords({ pointerType: 'pen', pressure: 0.6, tiltX: 60, tiltY: 40,
                              clientX: 0, clientY: 0 });
    const anchoTumbado = grosor(cTumbado.p, 10, 10, cTumbado.inc);

    /* Y un trazo de DEDO: ahí no debe tocar nada la presión ni el tilt. */
    empezarTrazo({ pointerType: 'touch', pressure: 1, tiltX: 0, tiltY: 0 });
    const cDedo = coords({ pointerType: 'touch', pressure: 1, tiltX: 50, tiltY: 50,
                           clientX: 0, clientY: 0 });

    return {
      anchos: anchos.map(x => +x.toFixed(2)),
      min: Math.min(...anchos), max: Math.max(...anchos),
      anchoRecto: anchos[0],
      anchoTumbado: +anchoTumbado.toFixed(2),
      dedoPresion: cDedo.p,
      dedoInc: cDedo.inc,
      /* que la inclinación se esté leyendo de verdad */
      incTumbado: +cTumbado.inc.toFixed(3)
    };
  });

  /* ── 1. El grosor NO salta dentro del trazo ───────────────────────── */
  const saltos = [];
  for (let i = 1; i < r.anchos.length; i++) {
    const d = Math.abs(r.anchos[i] - r.anchos[i-1]);
    if (d > r.anchos[i-1] * 0.25) saltos.push({ en: i, de: r.anchos[i-1], a: r.anchos[i] });
  }
  chk(saltos.length === 0,
      'con presión constante el grosor NO salta, aunque falten eventos',
      { saltos: saltos.slice(0, 3), min: +r.min.toFixed(2), max: +r.max.toFixed(2) });

  chk(Math.abs(r.max - r.min) < 0.01,
      'y es exactamente el mismo de principio a fin',
      { min: +r.min.toFixed(2), max: +r.max.toFixed(2) });

  /* ── 2. La inclinación ensancha ───────────────────────────────────── */
  chk(r.incTumbado > 0.5, 'se lee la inclinación del lápiz', { inclinacion: r.incTumbado });
  chk(r.anchoTumbado > r.anchoRecto * 1.2,
      'tumbado el trazo sale más ancho, como un lápiz de verdad',
      { recto: +r.anchoRecto.toFixed(2), tumbado: r.anchoTumbado });

  /* ── 3. Con el dedo no cambia nada ────────────────────────────────── */
  chk(r.dedoPresion === 0 && r.dedoInc === 0,
      'con el dedo no se usa ni presión ni inclinación (manda la velocidad)',
      { presion: r.dedoPresion, inclinacion: r.dedoInc });

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ el lápiz manda de principio a fin del trazo');
})();
