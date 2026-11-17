/* ¿La ventana de agregar amigo avisa MIENTRAS escribes?
 *
 * Antes: escribías, dabas a Aceptar, la ventana se cerraba y ENTONCES salía
 * un aviso diciendo si existía o no. El peor momento para enterarse, porque
 * ya no puedes corregir lo que escribiste.
 *
 * Firebase está bloqueado en este entorno, así que `buscarDestinatario` se
 * sustituye por una falsa controlada. Lo que se prueba es la VENTANA: que
 * consulte sola, que diga lo que encontró, y que el botón no deje agregar a
 * alguien que no existe.
 *
 * Ejecutar:  node test-agregar-amigo.js    (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2500);

  /* La búsqueda es una función declarada arriba del todo, así que se puede
     sustituir de verdad (a diferencia de un `let`, que no). */
  await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
    document.getElementById('app').style.display = 'flex';
    window.__consultas = [];
    window.buscarDestinatario = async (raw) => {
      window.__consultas.push(raw);
      await new Promise(r => setTimeout(r, 30));
      const v = String(raw).replace(/^@/,'').toLowerCase().trim();
      if (v === 'jose')   return { ok: true, nombre: 'jose', foto: null };
      if (v === 'yomismo')return 'yo';
      if (v === 'yaamigo')return 'amigo';
      return 'nadie';
    };
    window.__agregados = [];
    window.agregarAmigo = (x) => { window.__agregados.push(x); };
    abrirAgregarAmigo();
  });

  await p.waitForTimeout(250);
  const campo = p.locator('input[type=text]').last();
  chk(await campo.count() > 0, 'la ventana se abre con un campo de texto');

  /* ── Alguien que no existe ──────────────────────────────────────────── */
  await campo.fill('noexistenadie');
  await p.waitForTimeout(700);
  let r = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const ok = btns[btns.length - 1];
    const inp = [...document.querySelectorAll('input[type=text]')].pop();
    return { aviso: inp.nextElementSibling?.textContent || '', apagado: ok.disabled, consultas: window.__consultas.length };
  });
  chk(r.consultas >= 1, 'consulta sola, sin tocar ningún botón', { consultas: r.consultas });
  chk(/no existe|nobody/i.test(r.aviso), 'dice que no existe MIENTRAS escribes', { aviso: r.aviso });
  chk(r.apagado, 'el botón de agregar está apagado');

  /* ── Alguien que sí existe ──────────────────────────────────────────── */
  await campo.fill('jose');
  await p.waitForTimeout(700);
  r = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const ok = btns[btns.length - 1];
    const inp = [...document.querySelectorAll('input[type=text]')].pop();
    return { aviso: inp.nextElementSibling?.textContent || '', apagado: ok.disabled };
  });
  chk(/@jose/.test(r.aviso), 'enseña a quién encontró', { aviso: r.aviso });
  chk(!r.apagado, 'el botón de agregar se enciende');

  /* ── Ya es amigo ────────────────────────────────────────────────────── */
  await campo.fill('yaamigo');
  await p.waitForTimeout(700);
  r = await p.evaluate(() => {
    const inp = [...document.querySelectorAll('input[type=text]')].pop();
    const btns = [...document.querySelectorAll('button')];
    return { aviso: inp.nextElementSibling?.textContent || '', apagado: btns[btns.length-1].disabled };
  });
  chk(/ya es tu amigo|already your friend/i.test(r.aviso), 'distingue "ya es tu amigo"', { aviso: r.aviso });
  chk(r.apagado, 'y no deja volver a pedírselo');

  /* ── Agregar de verdad ──────────────────────────────────────────────── */
  await campo.fill('jose');
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    btns[btns.length - 1].click();
  });
  await p.waitForTimeout(400);
  const ag = await p.evaluate(() => window.__agregados);
  chk(ag.length === 1 && ag[0] === 'jose', 'al aceptar se agrega a quien se encontró', ag);

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ la ventana de agregar valida mientras escribes');
})();
