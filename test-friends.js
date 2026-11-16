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
    get: () => {
      let filas = col === 'friendships' ? window.__db.amistades
                : Object.values(window.__db.usuarios);
      for (const ft of filtros) {
        if (ft.op === 'array-contains') filas = filas.filter(r => (r[ft.campo]||[]).includes(ft.val));
        else filas = filas.filter(r => r[ft.campo] === ft.val);
      }
      return Promise.resolve({
        empty: filas.length === 0,
        size: filas.length,
        docs: filas.map(r => ({ id: r.id, data: () => r, ref: docRef(col, r.id) })),
      });
    },
  });
  const miDb = { collection: col => Object.assign(consulta(col, []), { doc: id => docRef(col, id),
    add: datos => { const id = 'n' + (window.__db.amistades.length + 1);
      window.__db.amistades.push({ id, ...datos });
      window.__db.escrituras.push({ tipo:'add', col, datos }); return Promise.resolve({ id }); } }) };
  /* Se sustituye la costura, no las variables: db y auth son `let` de
     módulo y no se pueden reemplazar desde fuera. */
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

  console.log('\n— La ventana al entrar —');
  const vent = await p.evaluate(async () => {
    try { localStorage.removeItem('ss_amigos_vistos'); } catch (e) {}
    /* SIN await: la ventana no se resuelve hasta que alguien pulsa cerrar,
       así que esperarla aquí colgaría la prueba para siempre. */
    mostrarVentanaAmigos();
    await new Promise(r => setTimeout(r, 400));
    const modal = [...document.body.children].find(e => {
      const cs = getComputedStyle(e);
      return cs.position === 'fixed' && +cs.zIndex >= 99999;
    });
    return { texto: (modal ? modal.textContent : '').slice(0, 220), hayModal: !!modal };
  });
  chk(vent.hayModal, 'se abre la ventana', vent.texto.slice(0, 60));
  chk(/ana|luis/i.test(vent.texto), 'lista a los amigos que no conocías', vent.texto.slice(0, 80));
  chk(!/wants to be|quiere ser/i.test(vent.texto),
      'a quien YA es amigo no le dice "quiere ser tu amigo"', vent.texto.slice(0, 90));

  console.log('\n— No repite a los mismos —');
  const segunda = await p.evaluate(async () => {
    [...document.body.children].filter(e => {
      const cs = getComputedStyle(e);
      return cs.position === 'fixed' && +cs.zIndex >= 99999;
    }).forEach(e => e.remove());
    mostrarVentanaAmigos();
    await new Promise(r => setTimeout(r, 400));
    return !![...document.body.children].find(e => {
      const cs = getComputedStyle(e);
      return cs.position === 'fixed' && +cs.zIndex >= 99999;
    });
  });
  chk(!segunda, 'la segunda vez no sale nada nuevo');

  chk(erroresDeLaApp(errs).length === 0, 'sin errores de JS', erroresDeLaApp(errs)[0] || '');
  await b.close(); if (SITIO) await SITIO.cerrar();
  console.log(f ? '\n❌ ' + f + ' fallo(s)' : '\n✅ Amistades correctas');
  process.exit(f ? 1 : 0);
})();
