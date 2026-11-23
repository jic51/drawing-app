/* Prueba: solicitudes de amistad y la ventana al entrar.

   Lo que más importa aquí NO es que lo nuevo funcione, sino que lo VIEJO
   siga igual. Las amistades que ya existen se guardaron con
   status 'accepted'; si el cambio las tocara, 17 personas perderían a sus
   amigos de golpe. Esta prueba lo vigila explícitamente.

   Ejecutar:  node test-friends.js   ·   NAVEGADOR=webkit node test-friends.js
*/
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');
let SITIO;

/* El navegador normaliza el atributo style ("z-index:99999" pasa a
   "z-index: 99999"), así que buscarlo como texto no encuentra nada. Se
   mira el estilo calculado. */
const BUSCAR_MODAL = `(() => [...document.body.children].find(e => {
  const cs = getComputedStyle(e);
  return cs.position === 'fixed' && +cs.zIndex >= 99999;
}))()`;

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

/* Un Firestore de mentira, lo justo para seguir el camino del código. */
const STUB = () => {
  window.__db = {
    amistades: [
      /* como las que YA existen hoy */
      { id: 'v1', users: ['yo', 'ana'],   status: 'accepted', requestedBy: 'ana' },
      { id: 'v2', users: ['yo', 'luis'],  status: 'accepted', requestedBy: 'yo' },
      /* una que me acaban de pedir */
      { id: 'p1', users: ['yo', 'marta'], status: 'pendiente', requestedBy: 'marta' },
      /* una que pedí yo y aún no contestan */
      { id: 'p2', users: ['yo', 'pedro'], status: 'pendiente', requestedBy: 'yo' },
    ],
    usuarios: {
      ana:   { uid:'ana',   username:'ana',   displayName:'Ana' },
      luis:  { uid:'luis',  username:'luis',  displayName:'Luis' },
      marta: { uid:'marta', username:'marta', displayName:'Marta' },
      pedro: { uid:'pedro', username:'pedro', displayName:'Pedro' },
      jose:  { uid:'jose',  username:'jose',  displayName:'Jose' },
    },
    escrituras: [],
  };
  const docRef = (col, id) => ({
    get: () => Promise.resolve({
      exists: col === 'users' ? !!window.__db.usuarios[id] : true,
      data: () => col === 'users' ? window.__db.usuarios[id] : null,
    }),
    update: datos => { window.__db.escrituras.push({ tipo:'update', col, id, datos }); 
      const a = window.__db.amistades.find(x => x.id === id); if (a) Object.assign(a, datos);
      return Promise.resolve(); },
    delete: () => { window.__db.escrituras.push({ tipo:'delete', col, id });
      window.__db.amistades = window.__db.amistades.filter(x => x.id !== id);
      return Promise.resolve(); },
  });
  const consulta = (col, filtros) => ({
    where: (campo, op, val) => consulta(col, [...filtros, { campo, op, val }]),
    limit: () => consulta(col, filtros),
    /* La escucha viva: lo que de verdad arregla que el otro lado se entere.
       Se guarda el aviso y se dispara con window.__emitir(). */
    onSnapshot: (cb) => {
      const lanzar = () => consulta(col, filtros).get().then(cb);
      window.__oyentes = window.__oyentes || [];
      window.__oyentes.push(lanzar);
      lanzar();
      return () => {};
    },
    get: () => {
      let filas = col === 'friendships' ? window.__db.amistades
                : Object.values(window.__db.usuarios);
      for (const ft of filtros) {
        if (ft.op === 'array-contains') filas = filas.filter(r => (r[ft.campo]||[]).includes(ft.val));
        else filas = filas.filter(r => r[ft.campo] === ft.val);
      }
      const docs = filas.map(r => ({ id: r.id, data: () => r, ref: docRef(col, r.id) }));
      return Promise.resolve({
        empty: docs.length === 0,
        size: docs.length,
        docs,
        /* El código real recorre el snapshot con forEach, no con .docs. */
        forEach: fn => docs.forEach(fn),
      });
    },
  });
  const miDb = { collection: col => Object.assign(consulta(col, []), { doc: id => docRef(col, id),
    add: datos => { const id = 'n' + (window.__db.amistades.length + 1);
      window.__db.amistades.push({ id, ...datos });
      window.__db.escrituras.push({ tipo:'add', col, datos }); return Promise.resolve({ id }); } }) };
  /* Se sustituye la costura, no las variables: db y auth son `let` de
     módulo y no se pueden reemplazar desde fuera. */
  window.__emitir = () => (window.__oyentes || []).forEach(f => f());
  window.contextoFirebase = () => ({ db: miDb, auth: { currentUser: { uid: 'yo' } }, listo: true });
  window.db = miDb;
  window.auth = { currentUser: { uid: 'yo' } };
  window.firebaseReady = true;
  window.firebase = { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } };
};

(async () => {
  SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 850 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2800);
  await p.evaluate(STUB);

  console.log('— Lo viejo no se toca —');
  const viejas = await p.evaluate(() => window.__db.amistades
    .filter(a => a.status === 'accepted').map(a => a.id));
  chk(viejas.length === 2 && viejas.includes('v1') && viejas.includes('v2'),
      'las amistades ya aceptadas siguen aceptadas', viejas);
  const consulta = await p.evaluate(async () => {
    const s = await contextoFirebase().db.collection('friendships')
      .where('users', 'array-contains', 'yo').where('status', '==', 'accepted').get();
    return s.docs.map(d => d.id);
  });
  chk(consulta.length === 2, 'y la consulta de amigos las sigue encontrando', consulta);

  console.log('\n— Solo se me pide aceptar lo que OTROS pidieron —');
  const pend = await p.evaluate(() => solicitudesPendientes().then(r => r.map(x => x.id + ':' + x.docId)));
  chk(pend.length === 1, 'una sola solicitud pendiente', pend);
  chk(pend[0] === 'marta:p1', 'la de marta, no la que pedí yo a pedro', pend);

  console.log('\n— Aceptar y rechazar —');
  const tras = await p.evaluate(async () => {
    await aceptarSolicitud('p1');
    const aceptada = window.__db.amistades.find(a => a.id === 'p1');
    await rechazarSolicitud('p2');
    const quedaP2 = !!window.__db.amistades.find(a => a.id === 'p2');
    return { estado: aceptada && aceptada.status, tieneFecha: !!(aceptada && aceptada.acceptedAt), quedaP2,
             siguenLasViejas: window.__db.amistades.filter(a => a.id === 'v1' || a.id === 'v2').length };
  });
  chk(tras.estado === 'accepted', 'aceptar la pasa a aceptada', tras);
  chk(tras.tieneFecha, 'y guarda cuándo se aceptó');
  chk(!tras.quedaP2, 'rechazar la borra, no deja rastro de quién dijo que no');
  chk(tras.siguenLasViejas === 2, 'y las viejas siguen intactas', tras);

  console.log('\n— Agregar a alguien PIDE, no impone —');
  const nueva = await p.evaluate(async () => {
    const antes = window.__db.escrituras.length;
    await contextoFirebase().db.collection('friendships').add({ users:['yo','jose'], status:'pendiente', requestedBy:'yo' });
    const u = window.__db.escrituras[antes];
    return u.datos.status;
  });
  chk(nueva === 'pendiente', 'la amistad nueva nace pendiente', nueva);

  console.log('\n— El carrusel distingue los tres estados —');
  const car = await p.evaluate(async () => {
    try { localStorage.removeItem('ss_amistades_vistas'); } catch (e) {}
    /* REGLA NUEVA (2026-11-23): «nuevo» ya no es «no lo has tocado», es
       «apareció DESDE TU ÚLTIMA VISITA». Así que hace falta decir cuándo
       fue esa visita y cuándo nació cada amistad; antes bastaba con no
       haberla tocado, y por eso a Jose le salían los dieciséis contactos
       marcados cada vez que entraba. */
    const DIA = 86400000, ahora = Date.now();
    try { localStorage.setItem('ss_carrusel_visto', String(ahora - 2*DIA)); } catch (e) {}
    _vistoDesde = null;
    /* Se alimenta a mano lo que normalmente trae la escucha viva. */
    const per = (n, creadoEn) => ({ id:n, docId:'d'+n, nombre:n, username:n,
                                    photoURL:'', creadoEn: creadoEn });
    /* ana llegó DESPUÉS de la última visita → nueva.
       luis llegó mucho antes → no. */
    amigosCache = [per('ana', ahora - 60*60*1000), per('luis', ahora - 10*DIA)];
    solicitudesCache = [per('marta', ahora - 30*DIA)];
    enviadasCache = [per('pedro', ahora - 1000)];
    pintarCarrusel();
    const items = [...document.querySelectorAll('#carousel .citem')];
    return {
      orden: items.map(e => e.dataset.id || '+'),
      pendientes: items.filter(e => e.classList.contains('pendiente')).map(e => e.dataset.id),
      /* Las enviadas se agrupan en UN círculo, sin dataset.id. */
      enviadas: items.filter(e => e.classList.contains('esperando')).length,
      cuentaEnviadas: document.querySelector('.cuenta-esperando')?.textContent,
      conEtiqueta: items.filter(e => e.querySelector('.etiqueta-nuevo')).map(e => e.dataset.id),
    };
  });
  chk(car.pendientes.join() === 'marta', 'la solicitud recibida sale en gris', car.pendientes);
  chk(car.enviadas === 1, 'las que envié yo se agrupan en UN círculo', car.enviadas);
  chk(car.cuentaEnviadas === '1', 'con su cuenta encima', car.cuentaEnviadas);
  chk(car.orden[0] === 'marta', 'y la solicitud va PRIMERA', car.orden);
  chk(!car.conEtiqueta.includes('pedro'),
      'la que envié yo no lleva etiqueta de nuevo: no tengo nada que hacer', car.conEtiqueta);
  /* El botón de compartir se quitó del carrusel: ya está en Ajustes. */
  const share = await p.evaluate(() => !!document.querySelector('#carousel .sharebtn'));
  chk(!share, 'el botón de compartir ya no duplica el de Ajustes');
  chk(car.conEtiqueta.includes('marta') && car.conEtiqueta.includes('ana'),
      'la solicitud (aunque sea vieja) y el amigo llegado DESPUÉS de tu última visita sí la llevan',
      car.conEtiqueta);
  chk(!car.conEtiqueta.includes('luis'),
      'pero un amigo de hace diez días NO, aunque no lo hayas tocado nunca',
      car.conEtiqueta);

  console.log('\n— Tocar un amigo le quita la etiqueta —');
  const trasTocar = await p.evaluate(() => {
    const el = [...document.querySelectorAll('#carousel .citem')].find(e => e.dataset.id === 'ana');
    el.click();
    const sigue = !!el.querySelector('.etiqueta-nuevo');
    pintarCarrusel();   /* y tampoco vuelve al repintar */
    const tras = [...document.querySelectorAll('#carousel .citem')]
      .find(e => e.dataset.id === 'ana').querySelector('.etiqueta-nuevo');
    return { sigue, trasRepintar: !!tras };
  });
  chk(!trasTocar.sigue, 'la etiqueta se va al tocarlo', trasTocar);
  chk(!trasTocar.trasRepintar, 'y no vuelve al repintar', trasTocar);

  console.log('\n— Tocar una solicitud abre el popup, no la selecciona —');
  const pop = await p.evaluate(async () => {
    const el = [...document.querySelectorAll('#carousel .citem')].find(e => e.dataset.id === 'marta');
    el.click();
    await new Promise(r => setTimeout(r, 300));
    const modal = [...document.body.children].find(e => {
      const cs = getComputedStyle(e);
      return cs.position === 'fixed' && +cs.zIndex >= 99999;
    });
    return { hay: !!modal, texto: (modal ? modal.textContent : '').slice(0, 120),
             seSeleccionó: el.classList.contains('sel') };
  });
  chk(pop.hay, 'se abre el popup', pop.texto.slice(0, 50));
  chk(/marta/.test(pop.texto), 'con quién es', pop.texto.slice(0, 60));
  chk(!/Got it|Entendido/i.test(pop.texto), 'sin el botón "Entendido", que no hacía nada', pop.texto);
  chk(/Accept|Aceptar/i.test(pop.texto) && /Not now|Ahora no/i.test(pop.texto),
      'con aceptar y rechazar', pop.texto.slice(0, 90));
  chk(!pop.seSeleccionó, 'y NO la selecciona para enviarle: todavía no es amiga');

  console.log('\n— Lo que motivó todo: el otro lado SE ENTERA —');
  const vivo = await p.evaluate(async () => {
    window.__db.amistades = [
      { id:'a1', users:['yo','ana'],   status:'accepted',  requestedBy:'ana' },
      { id:'a2', users:['yo','luis'],  status:'accepted',  requestedBy:'yo' },
      { id:'a3', users:['yo','marta'], status:'pendiente', requestedBy:'yo' },
    ];
    window.__oyentes = [];
    _amistadesSuelta = null;
    vigilarAmistades();
    await new Promise(r => setTimeout(r, 300));
    const alPrincipio = amigosCache.map(a => a.id).sort().join();

    /* Alguien me elimina: antes esto no llegaba nunca a mi lista. */
    window.__db.amistades = window.__db.amistades.filter(a => a.id !== 'a1');
    window.__emitir();
    await new Promise(r => setTimeout(r, 300));
    const trasEliminar = amigosCache.map(a => a.id).sort().join();

    /* Me aceptan la que pedí yo. */
    window.__db.amistades.find(a => a.id === 'a3').status = 'accepted';
    document.querySelectorAll('#aviso-pila .aviso').forEach(e => e.remove());
    window.__emitir();
    await new Promise(r => setTimeout(r, 400));
    const trasAceptar = amigosCache.map(a => a.id).sort().join();
    const avisos = [...document.querySelectorAll('#aviso-pila .aviso')].map(e => e.textContent).join(' ');

    return { alPrincipio, trasEliminar, trasAceptar, avisos };
  });
  chk(vivo.alPrincipio === 'ana,luis', 'arranca con los dos amigos', vivo.alPrincipio);
  chk(vivo.trasEliminar === 'luis',
      'si alguien me elimina, desaparece de mi lista SIN recargar', vivo.trasEliminar);
  chk(vivo.trasAceptar === 'luis,marta',
      'si me aceptan, aparece al momento', vivo.trasAceptar);
  chk(/marta/.test(vivo.avisos) && /accept|acept/i.test(vivo.avisos),
      'y avisa de que me aceptaron, que antes no pasaba nunca', vivo.avisos.slice(0, 80));

  chk(erroresDeLaApp(errs).length === 0, 'sin errores de JS', erroresDeLaApp(errs)[0] || '');
  await b.close(); if (SITIO) await SITIO.cerrar();
  console.log(f ? '\n❌ ' + f + ' fallo(s)' : '\n✅ Amistades correctas');
  process.exit(f ? 1 : 0);
})();
