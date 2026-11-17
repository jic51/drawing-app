/* ¿Cómo llama la app a una persona?
 *
 * El fallo que lo destapó: al agregar a alguien con su CÓDIGO, la app usaba
 * el código como si fuera el nombre. Jose agregó a su amigo Roger con el
 * código y la app le dijo «@XK9P2M y tú ya son amigos».
 *
 * Buscando ese, salieron cinco del mismo tipo:
 *   1. el código haciendo de nombre al agregar
 *   2. una arroba delante de un nombre con espacios: «@Jose Castro»
 *   3. el principio del CORREO como nombre público: «@joseisrael5101»
 *   4. en Ajustes sin arroba y en el carrusel con ella
 *   5. tú en la cabecera con tu nombre de Google, el resto con su @
 *
 * La regla, ahora en un solo sitio (`identidad`): manda el nombre de
 * usuario; si no lo hay, el nombre a secas y SIN arroba; el correo nunca;
 * el código nunca.
 *
 * Ejecutar:  node test-nombres.js      (o NAVEGADOR=webkit node ...)
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

  const casos = await p.evaluate(() => {
    if (typeof etiquetaDe !== 'function') return null;
    return {
      /* Lo normal */
      conUsuario:     etiquetaDe({ username: 'roger', displayName: 'Roger McMullan' }),
      /* Sin nombre de usuario: el nombre a secas, sin arroba, porque
         «@Roger McMullan» no es nada */
      soloNombre:     etiquetaDe({ displayName: 'Roger McMullan' }),
      soloNombreAlt:  etiquetaDe({ nombre: 'Roger McMullan' }),
      /* EL FALLO: un código no es un nombre */
      codigo:         etiquetaDe('XK9P2M'),
      codigoLargo:    etiquetaDe('ABCD2345'),
      /* Un texto que SÍ es un nombre de usuario */
      textoUsuario:   etiquetaDe('roger'),
      yaConArroba:    etiquetaDe('@roger'),
      /* Nada */
      vacio:          etiquetaDe(null),
      /* El nombre de usuario manda SIEMPRE sobre el de Google */
      manda:          etiquetaDe({ username: 'jose', displayName: 'JOSE CASTRO', nombre: 'otra cosa' }),
      /* Para las iniciales del avatar, sin arroba */
      paraAvatar:     identidad('@roger').nombre,
    };
  });

  chk(casos !== null, 'existe la función que decide el nombre');
  if (!casos) { await b.close(); await SITIO.cerrar(); process.exit(1); }

  chk(casos.conUsuario === '@roger',           'con @usuario → @usuario', casos.conUsuario);
  chk(casos.manda === '@jose',                 'el @usuario manda sobre el nombre de Google', casos.manda);
  chk(casos.soloNombre === 'Roger McMullan',   'sin @usuario → el nombre SIN arroba', casos.soloNombre);
  chk(casos.soloNombreAlt === 'Roger McMullan','igual si el nombre viene como `nombre`', casos.soloNombreAlt);
  chk(casos.codigo === 'XK9P2M' && !casos.codigo.startsWith('@'),
      'un CÓDIGO nunca se enseña como @usuario  ← el fallo que encontró Jose', casos.codigo);
  chk(!casos.codigoLargo.startsWith('@'),      'tampoco un código de 8', casos.codigoLargo);
  chk(casos.textoUsuario === '@roger',         'un texto que sí es usuario lleva arroba', casos.textoUsuario);
  chk(casos.yaConArroba === '@roger',          'no se dobla la arroba si ya venía', casos.yaConArroba);
  chk(casos.vacio === '?',                     'sin nada, no se rompe', casos.vacio);
  chk(casos.paraAvatar === 'roger',            'para las iniciales, el nombre sin arroba', casos.paraAvatar);

  /* ── Que el correo no pueda acabar siendo el nombre público ──────────── */
  const correo = await p.evaluate(() => {
    const s = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    /* `senderName` es lo que viaja con el dibujo y ve quien lo recibe. */
    const m = s.match(/const senderName =[\s\S]{0,200}?;/);
    return { trozo: m ? m[0] : '(no se encontró senderName)',
             usaCorreo: !!(m && /email/.test(m[0])) };
  });
  chk(!correo.usaCorreo,
      'el correo NO se usa como nombre público del que envía',
      correo.usaCorreo ? correo.trozo.slice(0, 120) : 'ok');

  /* ── Que nadie vuelva a pegar la arroba a mano ───────────────────────── */
  const aMano = await p.evaluate(() => {
    const s = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    const m = s.match(/'@' \+ \(\s*\w+\.username/g) || [];
    return m.length;
  });
  chk(aMano === 0, 'nadie construye el nombre a mano con "@" + username', { sitios: aMano });

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ la app llama a cada persona por su nombre de usuario');
})();
