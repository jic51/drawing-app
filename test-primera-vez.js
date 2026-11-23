/* La primera vez, el NEW, y el enlace de invitación.
 *
 * Tres cosas distintas que salieron del mismo sitio: qué se encuentra
 * alguien al abrir la app.
 *
 * EL NEW. Jose: «al volver a entrar a la app, luego de varias horas de no
 * usar o del update de la app, vuelven a aparecer los contactos como
 * nuevos». El diseño estaba mal: la etiqueta solo se quitaba tocando cada
 * contacto UNO POR UNO, y si se perdía lo guardado, TODO volvía a salir
 * como nuevo. Ahora «nuevo» es «apareció desde tu última visita», con una
 * marca de tiempo, y si esa marca falta no sale nada nuevo — que es el
 * lado seguro: una etiqueta roja en todo deja de significar nada.
 *
 * Ejecutar:  node test-primera-vez.js   (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2400);

  await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
    document.getElementById('app').style.display = 'flex';
    usuario = 'jose';
    setupCanvas();
  });

  /* ── 1. Las tres pantallas, y la última enseña la pregunta de hoy ──── */
  const pv = await p.evaluate(async () => {
    try { localStorage.removeItem('ss_primera_vez_v1'); } catch (e) {}
    _vistoDesde = null;
    mostrarPrimeraVez();
    await new Promise(r => setTimeout(r, 200));
    const caja = document.getElementById('primera-vez');
    if (!caja) return null;
    const btn = caja.querySelector('button');
    const textos = () => [...caja.querySelectorAll('div')].map(d => d.textContent.trim()).filter(Boolean);

    const t1 = textos();
    btn.click(); await new Promise(r => setTimeout(r, 90));
    const t2 = textos();
    btn.click(); await new Promise(r => setTimeout(r, 90));
    const t3 = textos();
    const botonFinal = btn.textContent;
    const pregunta = t3.find(x => /^Today:|^Hoy:/.test(x));

    btn.click(); await new Promise(r => setTimeout(r, 400));
    return {
      distintas: t1[1] !== t2[1] && t2[1] !== t3[1],
      pregunta,
      laDeHoy: (typeof textoReto === 'function') ? textoReto() : null,
      botonFinal,
      cerrada: !document.getElementById('primera-vez'),
      marcada: yaVioLaPrimeraVez()
    };
  });

  chk(pv !== null, 'la pantalla de primera vez aparece');
  if (pv) {
    chk(pv.distintas, 'son tres pantallas distintas');
    chk(!!pv.pregunta && pv.pregunta.includes(pv.laDeHoy),
        'la última enseña la pregunta DE HOY, la de verdad', pv.pregunta);
    chk(/empezar|start/i.test(pv.botonFinal), 'y el botón invita a dibujar', pv.botonFinal);
    chk(pv.cerrada && pv.marcada, 'al cerrar queda marcada para no repetirse');
  }

  /* Y que NO vuelva a salir. */
  const otraVez = await p.evaluate(async () => {
    mostrarPrimeraVez();
    await new Promise(r => setTimeout(r, 150));
    return !!document.getElementById('primera-vez');
  });
  chk(!otraVez, 'no vuelve a salir una segunda vez');

  /* ── 2. El NEW: «desde tu última visita», no «todo» ───────────────── */
  const nuevo = await p.evaluate(() => {
    const DIA = 86400000, ahora = Date.now();

    /* (a) Sin marca guardada no debe salir NADA nuevo: es el caso de
       alguien que borró los datos del sitio o entra desde otro navegador,
       y es justo cuando antes salía TODO marcado. */
    try { localStorage.removeItem('ss_carrusel_visto'); } catch (e) {}
    try { localStorage.removeItem('ss_amistades_vistas'); } catch (e) {}
    _vistoDesde = null;
    bloqueadosCache = [];
    amigosCache = [
      { id:'u1', docId:'d1', nombre:'ana',  username:'ana',  creadoEn: ahora - 5*DIA },
      { id:'u2', docId:'d2', nombre:'luis', username:'luis', creadoEn: ahora - 6*60*60*1000 },
    ];
    solicitudesCache = []; enviadasCache = [];
    pintarCarrusel();
    const sinMarca = document.querySelectorAll('#carousel .etiqueta-nuevo').length;

    /* (b) Con una visita de hace 3 días, solo lo posterior es nuevo: luis
       (6 horas) sí, ana (5 días) no. */
    try { localStorage.setItem('ss_carrusel_visto', String(ahora - 3*DIA)); } catch (e) {}
    _vistoDesde = null;
    pintarCarrusel();
    const conMarca = document.querySelectorAll('#carousel .etiqueta-nuevo').length;

    /* (c) Una amistad VIEJA nunca es nueva, aunque no la hayas tocado. */
    try { localStorage.setItem('ss_carrusel_visto', String(0)); } catch (e) {}
    _vistoDesde = null;
    amigosCache = [{ id:'u9', docId:'d9', nombre:'viejo', username:'viejo',
                     creadoEn: ahora - 40*DIA }];
    pintarCarrusel();
    const vieja = document.querySelectorAll('#carousel .etiqueta-nuevo').length;

    /* (d) Una solicitud sin contestar SIEMPRE lleva etiqueta: ahí hay algo
       que decidir, no es un "mira esto". */
    amigosCache = [];
    solicitudesCache = [{ id:'u5', docId:'d5', nombre:'eva', username:'eva',
                          creadoEn: ahora - 40*DIA }];
    pintarCarrusel();
    const solicitud = document.querySelectorAll('#carousel .etiqueta-nuevo').length;

    return { sinMarca, conMarca, vieja, solicitud };
  });

  chk(nuevo.sinMarca === 0,
      'sin marca guardada NO sale nada como nuevo (antes salía todo)', nuevo);
  chk(nuevo.conMarca === 1,
      'con una visita de hace 3 días, solo lo posterior es nuevo', nuevo);
  chk(nuevo.vieja === 0,
      'una amistad de hace 40 días no es nueva aunque no la hayas tocado', nuevo);
  chk(nuevo.solicitud === 1,
      'una solicitud sin contestar siempre lleva etiqueta', nuevo);

  /* ── 3. El enlace de invitación es uno solo ───────────────────────── */
  const enlace = await p.evaluate(() => {
    usuario = 'jose';
    const conUsuario = enlaceInvitacion();
    usuario = null;
    const sinUsuario = enlaceInvitacion();
    usuario = 'jose';
    const src = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    return {
      conUsuario, sinUsuario,
      /* que nadie vuelva a construirlo a mano con el código */
      aMano: (src.match(/getBaseUrl\(\) \+ '\?add='/g) || []).length
    };
  });
  chk(/\?u=jose$/.test(enlace.conUsuario),
      'el enlace de invitación usa el @usuario, que se lee y se dicta', enlace.conUsuario);
  chk(enlace.aMano <= 1,
      'solo queda el respaldo con código, no tres sitios construyéndolo', enlace);

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ primera vez, NEW y enlace de invitación');
})();
