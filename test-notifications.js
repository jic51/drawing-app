/* Prueba: el flujo de avisos, sobre todo en iOS.
   Safari de iOS solo abre el diálogo de permiso si la petición sale de un
   TOQUE. Antes se pedía desde un setTimeout de 3 s: en iOS no abría nada,
   devolvía "denied" y iOS ya no vuelve a preguntar nunca. Aquí se comprueba
   que no se pida sola, que se pida al tocar, que la petición ocurra dentro
   del gesto, y que cada estado diga algo útil.

   Ejecutar:  node test-notifications.js
*/
const { chromium } = require('playwright');
const UA_IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
let f=0; const chk=(c,m,d)=>{ if(!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

async function abrir(b, {ua, instalada, permiso, conMessaging=true} = {}) {
  const ctx = await b.newContext(ua ? { userAgent: ua } : {});
  const p = await ctx.newPage();
  await p.addInitScript(([inst, perm, cm]) => {
    // simular PWA instalada
    if (inst) Object.defineProperty(window.navigator, 'standalone', { get:()=>true, configurable:true });
    // simular el estado del permiso y espiar la petición
    window.__pedido = 0; window.__gesto = null;
    const N = window.Notification || function(){};
    Object.defineProperty(window, 'Notification', { configurable:true, writable:true, value:
      Object.assign(function(){}, {
        get permission(){ return perm; },
        requestPermission: function(){ window.__pedido++; window.__gesto = navigator.userActivation ? navigator.userActivation.isActive : null; return Promise.resolve(perm==='default'?'granted':perm); }
      }) });
    Object.defineProperty(window.Notification, 'permission', { get:()=>perm, configurable:true });
    if (!cm) window.__sinMessaging = true;
  }, [instalada, permiso, conMessaging]);
  await p.goto('file://' + process.cwd() + '/app/index.html');
  await p.waitForTimeout(3000);
  await p.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e=>e.style.display='none');
    const a=document.getElementById('app'); if(a) a.style.display='flex';
    window.fcmDisponible = () => true;              // fingir FCM disponible
    const ov = document.getElementById('settings-overlay');
    if (ov) { ov.classList.add('activo'); ov.style.display='flex'; ov.style.opacity='1'; ov.style.visibility='visible'; ov.style.pointerEvents='auto'; }
    pintarFilaNotif();
  });
  return { ctx, p };
}
const leer = p => p.evaluate(()=>{
  const b=document.getElementById('notif-btn');
  return { sub:document.getElementById('lbl-notif-sub').textContent,
           btn:b.textContent, apagado:b.disabled, pedido:window.__pedido };
});

(async () => {
  const b = await chromium.launch();

  console.log('— iPad en Safari, SIN añadir a inicio —');
  let { ctx, p } = await abrir(b, { ua:UA_IPAD, instalada:false, permiso:'default' });
  let e = await leer(p);
  chk(/Home Screen|pantalla de inicio/.test(e.sub), 'dice que hay que añadirlo a inicio', e.sub);
  await p.click('#notif-btn'); await p.waitForTimeout(400);
  const ayuda = await p.evaluate(()=>document.body.innerText);
  chk(/Add to Home Screen|Añadir a inicio/.test(ayuda), 'al tocar explica CÓMO hacerlo');
  e = await leer(p);
  chk(e.pedido === 0, 'no pide permiso sin estar instalada (quemaría el permiso)', {pedido:e.pedido});
  await ctx.close();

  console.log('\n— iPad YA añadido a inicio —');
  ({ ctx, p } = await abrir(b, { ua:UA_IPAD, instalada:true, permiso:'default' }));
  e = await leer(p);
  chk(/arriv|llega/.test(e.sub) && !e.apagado, 'ofrece activarlos', e);
  chk(e.pedido === 0, 'NO los pide solo al entrar', {pedido:e.pedido});
  await p.click('#notif-btn'); await p.waitForTimeout(600);
  const g = await p.evaluate(()=>({ pedido:window.__pedido, gesto:window.__gesto }));
  chk(g.pedido === 1, 'los pide al tocar el botón', g);
  chk(g.gesto !== false, 'y la petición sale DENTRO del gesto del usuario', g);
  await ctx.close();

  console.log('\n— ya denegado antes —');
  ({ ctx, p } = await abrir(b, { ua:UA_IPAD, instalada:true, permiso:'denied' }));
  e = await leer(p);
  chk(/Blocked|Bloquead/.test(e.sub), 'dice que están bloqueados', e.sub);
  await p.click('#notif-btn'); await p.waitForTimeout(400);
  const ay2 = await p.evaluate(()=>document.body.innerText);
  chk(/Delete the SketchSend icon|Borra el icono/.test(ay2), 'explica que en iOS hay que reinstalar el icono');
  chk((await leer(p)).pedido === 0, 'y no vuelve a pedirlo en vano');
  await ctx.close();

  console.log('\n— ya concedido —');
  ({ ctx, p } = await abrir(b, { instalada:true, permiso:'granted' }));
  e = await leer(p);
  chk(/On for|Activados en/.test(e.sub) && e.apagado, 'muestra que ya están activados', e);
  await ctx.close();

  await b.close();
  console.log(f?'\n❌ '+f+' fallos':'\n✅ flujo de avisos correcto');
  process.exit(f?1:0);
})();
