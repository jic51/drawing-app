/* Prueba: el punto de conectado y el emparejado con el creador.

   El punto tiene TRES estados a propósito, no dos: conectado, hace un rato,
   y nada. Un punto que solo dice sí/no miente por los pelos — quien cerró
   hace treinta segundos no está "desconectado" en ningún sentido útil.

   Lo que más vigila: que el punto quede PEGADO al avatar (es lo pedido) y
   que no se cuele en sitios donde no toca.

   Ejecutar:  node test-presence.js   ·   NAVEGADOR=webkit node test-presence.js
*/
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');
let SITIO;
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
  });

  console.log('— Los tres estados —');
  const est = await p.evaluate(() => {
    const ahora = Date.now();
    const seg = s => ({ seconds: Math.floor((ahora - s * 1000) / 1000) });
    return {
      ahoraMismo: estadoPresencia({ seconds: Math.floor(ahora / 1000) }),
      hace2min:   estadoPresencia(seg(120)),
      hace10min:  estadoPresencia(seg(600)),
      hace40min:  estadoPresencia(seg(2400)),
      hace3horas: estadoPresencia(seg(10800)),
      sinDato:    estadoPresencia(null),
      cero:       estadoPresencia(0),
      /* El reloj del servidor puede ir por delante del navegador. */
      futuro:     estadoPresencia({ seconds: Math.floor(ahora / 1000) + 30 }),
    };
  });
  chk(est.ahoraMismo === 'enlinea', 'ahora mismo → conectado', est.ahoraMismo);
  chk(est.hace2min === 'enlinea', 'hace 2 min → conectado', est.hace2min);
  chk(est.hace10min === 'reciente', 'hace 10 min → hace un rato', est.hace10min);
  chk(est.hace40min === 'reciente', 'hace 40 min → hace un rato', est.hace40min);
  chk(est.hace3horas === 'nada', 'hace 3 horas → sin punto', est.hace3horas);
  chk(est.sinDato === 'nada', 'sin dato → sin punto', est.sinDato);
  chk(est.cero === 'nada', 'un cero no se toma por "justo ahora"', est.cero);
  chk(est.futuro === 'enlinea', 'una marca en el futuro no rompe nada', est.futuro);

  console.log('\n— El punto va pegado al avatar —');
  const pos = await p.evaluate(() => {
    const caja = document.createElement('div');
    caja.style.cssText = 'position:fixed;top:40px;left:40px';
    const wrap = document.createElement('span');
    wrap.className = 'settings-friend-av-wrap';
    const img = document.createElement('img');
    img.className = 'settings-friend-av';
    img.src = genAvatar('ana');
    wrap.appendChild(img); caja.appendChild(wrap); document.body.appendChild(caja);
    ponerPunto(wrap, 'enlinea');
    const w = wrap.getBoundingClientRect(), d = wrap.querySelector('.punto-presencia').getBoundingClientRect();
    return {
      hay: !!wrap.querySelector('.punto-presencia'),
      /* pegado: su centro cae dentro del avatar o justo en el borde */
      pegado: Math.abs((d.left + d.width/2) - w.right) < 10 && Math.abs((d.top + d.height/2) - w.bottom) < 10,
      tam: Math.round(d.width),
    };
  });
  chk(pos.hay, 'se pinta el punto');
  chk(pos.pegado, 'pegado a la esquina del círculo del avatar', pos);
  chk(pos.tam >= 8 && pos.tam <= 16, 'de un tamaño razonable', { px: pos.tam });

  console.log('\n— Cambiar de estado no duplica puntos —');
  const dup = await p.evaluate(() => {
    const wrap = document.querySelector('.settings-friend-av-wrap');
    ponerPunto(wrap, 'reciente'); ponerPunto(wrap, 'enlinea'); ponerPunto(wrap, 'reciente');
    const n = wrap.querySelectorAll('.punto-presencia').length;
    const esReciente = wrap.querySelector('.punto-presencia').classList.contains('reciente');
    ponerPunto(wrap, 'nada');
    return { n, esReciente, trasQuitar: wrap.querySelectorAll('.punto-presencia').length };
  });
  chk(dup.n === 1, 'siempre un solo punto, no uno encima de otro', dup);
  chk(dup.esReciente, 'y refleja el último estado', dup);
  chk(dup.trasQuitar === 0, 'y "nada" lo quita', dup);

  console.log('\n— La cuenta del creador —');
  const cre = await p.evaluate(() => ({
    reconoce: esCreador('jose'),
    mayusculas: esCreador('JOSE'),
    conArroba: esCreador('@jose'),
    otro: esCreador('cristina9792'),
    vacio: esCreador(''),
    nulo: esCreador(null),
  }));
  chk(cre.reconoce, 'reconoce la cuenta del creador');
  chk(cre.mayusculas, 'sin importar mayúsculas');
  chk(!cre.conArroba, 'el @ no cuenta como parte del nombre', cre);
  chk(!cre.otro, 'no confunde a otra persona');
  chk(!cre.vacio && !cre.nulo, 'vacío o nulo no es el creador');

  chk(erroresDeLaApp(errs).length === 0, 'sin errores de JS', erroresDeLaApp(errs)[0] || '');
  await b.close(); if (SITIO) await SITIO.cerrar();
  console.log(f ? '\n❌ ' + f + ' fallo(s)' : '\n✅ Presencia y creador correctos');
  process.exit(f ? 1 : 0);
})();
