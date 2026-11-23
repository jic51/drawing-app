/* Bloquear, el dibujo de bienvenida, y la bandeja por días.
 *
 * Los tres salieron de la misma lista: lo que hacía falta antes de poder
 * enseñarle la app a desconocidos.
 *
 * BLOQUEAR. Hasta ahora solo se podía ELIMINAR a alguien, y esa persona te
 * volvía a agregar al minuto. La primera vez que alguien reciba algo
 * desagradable, bloquear es lo primero que va a buscar.
 *
 * Firebase está bloqueado en este entorno, así que lo que se comprueba es
 * la LÓGICA y la pantalla, no el viaje al servidor. Lo que de verdad
 * impide enviar son las reglas, y eso solo se puede probar publicándolas.
 *
 * Ejecutar:  node test-bloqueo.js      (o NAVEGADOR=webkit node ...)
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
  await p.waitForTimeout(2500);

  await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
    document.getElementById('app').style.display = 'flex';
    usuario = 'jose';
  });

  /* ── 1. A quien bloqueas desaparece del carrusel ──────────────────── */
  const car = await p.evaluate(() => {
    amigosCache = [
      { id: 'u1', docId: 'd1', nombre: 'ana',  username: 'ana' },
      { id: 'u2', docId: 'd2', nombre: 'luis', username: 'luis' }
    ];
    solicitudesCache = [{ id: 'u3', docId: 'd3', nombre: 'eva', username: 'eva' }];
    enviadasCache = [];
    bloqueadosCache = [];
    pintarCarrusel();
    const antes = document.querySelectorAll('#carousel .citem').length;

    bloqueadosCache = ['u2', 'u3'];
    pintarCarrusel();
    const despues = document.querySelectorAll('#carousel .citem').length;
    const nombres = [...document.querySelectorAll('#carousel .cname')].map(x => x.textContent);
    return { antes, despues, nombres, bloqueadoDetectado: estaBloqueado('u2'), otro: estaBloqueado('u1') };
  });
  chk(car.antes > car.despues, 'al bloquear, esa persona sale del carrusel',
      { antes: car.antes, despues: car.despues });
  chk(!car.nombres.includes('@luis') && !car.nombres.includes('@eva'),
      'ni como amigo ni como solicitud pendiente', car.nombres);
  chk(car.bloqueadoDetectado && !car.otro, 'estaBloqueado distingue bien');

  /* ── 2. No se le puede enviar ─────────────────────────────────────── */
  const env = await p.evaluate(async () => {
    bloqueadosCache = ['u2'];
    amigosCache = [{ id: 'u2', docId: 'd2', nombre: 'luis', username: 'luis' }];
    const dichos = [];
    const origToast = window.toast;
    window.toast = m => dichos.push(m);
    /* `enviarSketchFirestore` sale antes de tocar Firebase si está bloqueado. */
    try { await enviarSketchFirestore('u2'); } catch (e) { dichos.push('EXCEPCION ' + e.message); }
    window.toast = origToast;
    return dichos;
  });
  chk(env.some(x => /bloque|block/i.test(x)),
      'enviar a alguien bloqueado se corta con un aviso claro', env);

  /* ── 3. El dibujo de bienvenida: solo lo ve el creador ───────────── */
  const bienv = await p.evaluate(() => {
    const caja = document.getElementById('settings-bienvenida-caja');
    usuario = 'otra_persona';
    pintarCajaBienvenida();
    const paraOtro = caja.hidden;
    usuario = 'jose';
    trazos.length = 0;
    pintarCajaBienvenida();
    const sinDibujo = {
      visible: !caja.hidden,
      botonApagado: document.getElementById('guardar-bienvenida').disabled
    };
    trazos.push({ tipo:'inicio', sid:1, t:0 });
    for (let i = 0; i < 5; i++) {
      trazos.push({ tipo:'seg', de:{x:i,y:i}, a:{x:i+1,y:i+1}, color:'#000', gw:3, sid:1, t:i*50 });
    }
    pintarCajaBienvenida();
    return {
      paraOtro,
      sinDibujo,
      conDibujo: {
        visible: !caja.hidden,
        botonEncendido: !document.getElementById('guardar-bienvenida').disabled,
        sub: document.getElementById('lbl-bienvenida-sub').textContent
      }
    };
  });
  chk(bienv.paraOtro, 'la caja de bienvenida NO la ve nadie más que el creador');
  chk(bienv.sinDibujo.visible && bienv.sinDibujo.botonApagado,
      'el creador la ve, pero sin dibujo no puede guardar', bienv.sinDibujo);
  chk(bienv.conDibujo.botonEncendido && /5/.test(bienv.conDibujo.sub),
      'con un dibujo en el lienzo se enciende y dice cuántos trazos', bienv.conDibujo);

  /* ── 4. La bandeja se agrupa por día ──────────────────────────────── */
  const dias = await p.evaluate(() => {
    const DIA = 86400000, ahora = Date.now();

    /* Los instantes se calculan DESDE la misma función que agrupa, no
       restando días a ojo. Restar «un día y dos horas» caía en ayer o en
       anteayer según la hora a la que se ejecutara la prueba: el corte del
       día está a medianoche en RD, no cuando se lanza el test. Una prueba
       que depende de la hora falla sola algún día y nadie sabe por qué. */
    const d0 = SS.diaActual(ahora);
    /* El mediodía de un día concreto, en milisegundos. */
    const medioDiaDe = n => (n * DIA) - (SS.DESFASE_H * 3600000) + DIA / 2;

    bandejaEntrada = [
      { id:'a', sender:'ana',  senderId:'u1', strokes:[], receivedAt: ahora - 1000, expiresAt: ahora + DIA },
      { id:'b', sender:'luis', senderId:'u9', strokes:[], receivedAt: ahora - 2000, expiresAt: ahora + DIA },
      { id:'c', sender:'eva',  senderId:'u8', strokes:[], receivedAt: medioDiaDe(d0 - 1), expiresAt: ahora + DIA },
      { id:'d', sender:'ivan', senderId:'u7', strokes:[], receivedAt: medioDiaDe(d0 - 3), expiresAt: ahora + DIA },
    ];
    idsRecien.clear();
    renderInbox();
    const seps = [...document.querySelectorAll('#inbox-body .inbox-dia')].map(x => x.textContent);
    /* Que el primer elemento sea un separador, no una tarjeta suelta. */
    const primero = document.getElementById('inbox-body').firstElementChild;
    return { seps, primeroEsDia: primero && primero.classList.contains('inbox-dia'),
             tarjetas: document.querySelectorAll('#inbox-body .inbox-card').length };
  });
  chk(dias.seps.length === 3, 'hay un separador por cada día distinto', dias.seps);
  chk(/hoy|today/i.test(dias.seps[0] || ''), 'el primero dice Hoy', dias.seps[0]);
  chk(/ayer|yesterday/i.test(dias.seps[1] || ''), 'el segundo dice Ayer', dias.seps[1]);
  chk(/3/.test(dias.seps[2] || ''), 'y el tercero cuenta los días', dias.seps[2]);
  chk(dias.primeroEsDia, 'la lista empieza por un separador, no por una tarjeta suelta');
  chk(dias.tarjetas === 4, 'no se pierde ningún dibujo al agrupar', dias.tarjetas);

  /* ── 5. El mensaje de bienvenida se pinta ─────────────────────────── */
  const msg = await p.evaluate(() => {
    const DIA = 86400000, ahora = Date.now();
    bandejaEntrada = [{ id:'z', sender:'jose', senderId:'uj', strokes:[],
                        receivedAt: ahora - 1000, expiresAt: ahora + 7*DIA,
                        mensaje: 'Hola, soy Jose. Hice esto para mandarnos dibujos.',
                        esBienvenida: true }];
    idsRecien.clear();
    renderInbox();
    const el = document.querySelector('#inbox-body .inbox-card-msg');
    return { hay: !!el, texto: el ? el.textContent : null };
  });
  chk(msg.hay && /Jose/.test(msg.texto),
      'el mensaje del dibujo de bienvenida se ve en la bandeja', msg.texto);

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ bloquear, bienvenida y bandeja por días');
})();
