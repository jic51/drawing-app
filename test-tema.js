/* ¿El tema de la APP manda sobre el del sistema?
 *
 * Jose, en su iPad: «el undo/redo en el tema claro se ve muy oscuro, en el
 * tema oscuro se ve bien». El iPad estaba en modo oscuro y la app puesta en
 * claro, y los botones que flotan sobre el lienzo se quedaron oscuros sobre
 * un lienzo blanco.
 *
 * La causa: su estilo claro vivía dentro de un
 * `@media (prefers-color-scheme: light)`, que es el tema del SISTEMA
 * OPERATIVO, no el que elige el usuario en Ajustes. Con el sistema en
 * oscuro ese bloque no se aplicaba nunca.
 *
 * Esta prueba fuerza las CUATRO combinaciones, que es lo que no se prueba
 * mirando la app en tu propio ordenador:
 *
 *      sistema oscuro + app clara   ← el caso de Jose
 *      sistema claro  + app oscura
 *      sistema oscuro + app oscura
 *      sistema claro  + app clara
 *
 * Ejecutar:  node test-tema.js       (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

/* El brillo percibido de un color CSS, de 0 (negro) a 255 (blanco). */
function brillo(css) {
  const m = String(css).match(/-?[\d.]+/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.map(Number);
  return 0.299*r + 0.587*g + 0.114*b;
}

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();

  const casos = [
    { sistema: 'dark',  app: 'light', nombre: 'sistema OSCURO + app CLARA  (el caso de Jose)' },
    { sistema: 'light', app: 'dark',  nombre: 'sistema claro  + app oscura' },
    { sistema: 'dark',  app: 'dark',  nombre: 'sistema oscuro + app oscura' },
    { sistema: 'light', app: 'light', nombre: 'sistema claro  + app clara' },
  ];

  for (const c of casos) {
    const p = await b.newPage({ viewport: { width: 1100, height: 800 }, colorScheme: c.sistema });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(SITIO.pagina('app/index.html'));
    await p.waitForTimeout(2200);

    const r = await p.evaluate((tema) => {
      document.documentElement.setAttribute('data-theme', tema);
      document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
      const app = document.getElementById('app'); if (app) app.style.display = 'flex';
      const btn = document.getElementById('undo-btn');
      const cs = getComputedStyle(btn);
      const raiz = getComputedStyle(document.documentElement);
      return {
        fondoBoton: cs.backgroundColor,
        textoBoton: cs.color,
        fondoLienzo: raiz.getPropertyValue('--canvas-bg').trim(),
      };
    }, c.app);

    const bBoton  = brillo(r.fondoBoton);
    const bTexto  = brillo(r.textoBoton);
    const claro   = c.app === 'light';

    /* Lo que importa no es un color concreto, sino que el botón NO sea del
       tema contrario al lienzo: un botón oscuro sobre lienzo blanco. */
    const coherente = claro ? (bBoton > 140 && bTexto < 120)
                            : (bBoton < 140 && bTexto > 120);

    chk(coherente, `[${c.nombre}] el botón va con el tema de la app`,
        { fondoBoton: r.fondoBoton, textoBoton: r.textoBoton, lienzo: r.fondoLienzo });

    const propios = erroresDeLaApp(errs);
    if (propios.length) chk(false, `[${c.nombre}] errores de la app`, propios);
    await p.close();
  }

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ el tema de la app manda sobre el del sistema');
})();
