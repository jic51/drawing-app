/* ¿Se ve ENTERA la etiqueta NEW del carrusel?
 *
 * El fallo: `.carousel` tiene `overflow-x:auto`, y CSS obliga a que si un
 * eje no es `visible` el otro pase a `auto`. La etiqueta va en `top:-5px`,
 * o sea FUERA del avatar, así que el navegador la recortaba por arriba.
 * Se veía media etiqueta.
 *
 * Esto no lo caza mirar el HTML: hay que medir dónde cae la etiqueta y
 * dónde recorta el contenedor.
 *
 * Ejecutar:  node test-badge-nuevo.js     (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();

  for (const vp of [{ width: 1280, height: 800, nombre: 'escritorio' },
                    { width: 390,  height: 844, nombre: 'teléfono' }]) {
    const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(SITIO.pagina('app/index.html'));
    await p.waitForTimeout(2500);

    const r = await p.evaluate(() => {
      document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
      document.getElementById('app').style.display = 'flex';
      if (typeof setupCanvas === 'function') setupCanvas();

      /* Se construye un elemento del carrusel igual que lo hace la app:
         .citem > .cwrap > (.cimg + .etiqueta-nuevo) */
      const car = document.getElementById('carousel');
      car.innerHTML = '';
      const it = document.createElement('div'); it.className = 'citem';
      const wr = document.createElement('div'); wr.className = 'cwrap';
      const im = document.createElement('div'); im.className = 'cimg';
      im.style.background = '#888';
      const et = document.createElement('span');
      et.className = 'etiqueta-nuevo'; et.textContent = 'new';
      wr.appendChild(im); wr.appendChild(et);
      const nm = document.createElement('div'); nm.className = 'cname'; nm.textContent = '@jose';
      it.appendChild(wr); it.appendChild(nm);
      car.appendChild(it);

      const re = et.getBoundingClientRect();
      const rc = car.getBoundingClientRect();
      const est = getComputedStyle(car);
      return {
        etiqueta: { top: re.top, right: re.right, bottom: re.bottom, left: re.left,
                    alto: re.height, ancho: re.width },
        caja:     { top: rc.top, right: rc.right, bottom: rc.bottom },
        overflowY: est.overflowY,
        visible: re.height > 0 && re.width > 0
      };
    });

    chk(r.visible, `[${vp.nombre}] la etiqueta existe y ocupa espacio`, r.etiqueta.alto);

    /* Lo que de verdad importa: que NO sobresalga de la caja que recorta. */
    const sobraArriba  = +(r.caja.top - r.etiqueta.top).toFixed(1);
    const sobraDerecha = +(r.etiqueta.right - r.caja.right).toFixed(1);

    chk(sobraArriba <= 0, `[${vp.nombre}] la etiqueta NO se corta por arriba`,
        { seSaleArriba: sobraArriba > 0 ? sobraArriba + 'px' : 'no' });
    chk(sobraDerecha <= 0, `[${vp.nombre}] la etiqueta NO se corta por la derecha`,
        { seSaleDerecha: sobraDerecha > 0 ? sobraDerecha + 'px' : 'no' });

    const propios = erroresDeLaApp(errs);
    chk(propios.length === 0, `[${vp.nombre}] sin errores de la app`, propios);
    await p.close();
  }

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ la etiqueta NEW se ve entera');
})();
