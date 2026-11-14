/* Prueba: no hay saltos al cargar.

   Cubre las tres causas que encontramos midiendo, no suponiendo:
   1. La fuente real ocupa otro tamaño que la de reserva, así que al llegar
      todo se recoloca. Se comprueba que cada peso de la reserva mida igual
      que la fuente real.
   2. El logo (Syne 800) es casi un 70% más ancho que cualquier fuente del
      sistema: no se puede igualar con una reserva, así que no se pinta hasta
      que Syne está lista. Se comprueba que nunca se vea con el ancho
      equivocado y, sobre todo, que SIEMPRE acabe apareciendo aunque la
      fuente no llegue nunca.
   3. Textos que el HTML trae en un idioma y el JS reescribe en otro, con
      otra longitud. Se comprueba que no quede castellano con la app en
      inglés.

   Ejecutar:  node test-layout-shift.js
*/
const { chromium } = require('playwright');
const path = require('path');

const url = f => 'file://' + path.resolve(__dirname, f);

/* Umbral: el "bueno" de Google es 0,1, pero eso aquí no sirve de nada: con
   0,01 una regresión real (quitar la reserva de DM Sans) medía 0,0051 y
   pasaba. Hoy las cuatro medidas dan 0,0000 clavado, así que el umbral se
   pone donde de verdad avisa. */
const CLS_MAX = 0.002;

const OBSERVADOR = () => {
  window.__cls = 0; window.__ev = [];
  new PerformanceObserver(l => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__cls += e.value;
      window.__ev.push({
        t: Math.round(e.startTime), v: +e.value.toFixed(4),
        src: (e.sources || []).map(s => {
          const el = s.node;
          if (!el || !el.tagName) return '?';
          return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '');
        }).join(', '),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

let fallos = 0;
const chk = (cond, msg, dato) => {
  if (!cond) fallos++;
  console.log((cond ? '✅' : '❌') + ' ' + msg
    + (dato !== undefined ? '   ' + JSON.stringify(dato) : ''));
};

/* ── 1. CLS de cada página en escritorio y móvil ───────────────────── */
async function pruebaCLS(b) {
  console.log('— Saltos de maquetación al cargar —');
  for (const pag of ['index.html', 'landing.html']) {
    for (const [nombre, W, H] of [['escritorio', 1440, 900], ['móvil', 390, 844]]) {
      const p = await b.newPage({ viewport: { width: W, height: H } });
      await p.addInitScript(OBSERVADOR);
      await p.goto(url(pag));
      await p.waitForTimeout(6000);   // incluye el vuelo del logo (2,0–2,7 s)
      const r = await p.evaluate(() => ({ cls: window.__cls, ev: window.__ev }));
      chk(r.cls <= CLS_MAX, pag + ' ' + nombre + ': CLS ' + r.cls.toFixed(4)
          + ' (máx ' + CLS_MAX + ')');
      if (r.cls > CLS_MAX) {
        for (const e of r.ev.slice(0, 8)) {
          console.log('      ' + String(e.t).padStart(5) + 'ms  ' + e.v.toFixed(4) + '  ' + e.src);
        }
        if (r.ev.length > 8) console.log('      ... y ' + (r.ev.length - 8) + ' más');
      }
      await p.close();
    }
  }
}

/* ── 2. La reserva mide lo mismo que la fuente real ─────────────────── */
async function pruebaReservas(b) {
  console.log('\n— La fuente de reserva mide igual que la real —');
  const casos = [
    ['index.html',   'DM Sans', 'DM Sans respaldo', [400, 500, 600]],
    ['landing.html', 'Inter',   'Inter respaldo',   [400, 500, 600, 700, 800, 900]],
  ];
  for (const [pag, real, reserva, pesos] of casos) {
    const p = await b.newPage();
    await p.goto(url(pag));
    await p.waitForTimeout(4000);
    const res = await p.evaluate(async ([real, reserva, pesos]) => {
      await document.fonts.ready;
      const M = 'SketchSend Cada mensaje es un dibujo 0123456789 ABCDEFGHIJKLM abcdefghijklm';
      const caja = document.createElement('div');
      caja.style.cssText = 'position:absolute;left:-9999px;white-space:nowrap;'
                         + 'font-size:100px;line-height:normal;';
      document.body.appendChild(caja);
      const med = (fam, peso) => {
        const s = document.createElement('span');
        s.style.fontFamily = "'" + fam + "'"; s.style.fontWeight = peso;
        s.textContent = M; caja.appendChild(s);
        const r = s.getBoundingClientRect();
        const o = { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
        s.remove(); return o;
      };
      const out = pesos.map(peso => ({ peso, real: med(real, peso), reserva: med(reserva, peso) }));
      caja.remove(); return out;
    }, [real, reserva, pesos]);
    /* Medir la familia de reserva a mano no basta: sigue existiendo aunque
       nadie la use. Hay que ver que la cadena de fuentes del body la nombre,
       detrás de la real. */
    const cadena = await p.evaluate(() => getComputedStyle(document.body).fontFamily);
    const iReal = cadena.indexOf(real), iResp = cadena.indexOf(reserva);
    chk(iReal !== -1 && iResp !== -1 && iResp > iReal,
        pag + ': la reserva está enchufada detrás de ' + real, cadena);

    for (const r of res) {
      /* 2px sobre 4000 es 0,05%: por debajo de eso ninguna línea cambia de sitio. */
      const ok = Math.abs(r.real.w - r.reserva.w) <= 2 && Math.abs(r.real.h - r.reserva.h) <= 1;
      chk(ok, pag + ' ' + real + ' peso ' + r.peso,
          { real: r.real.w + 'x' + r.real.h, reserva: r.reserva.w + 'x' + r.reserva.h });
    }
    await p.close();
  }
}

/* ── 3. El logo: nunca con la fuente equivocada, nunca invisible ────── */
async function pruebaLogo(b) {
  console.log('\n— El logo espera a Syne, pero siempre aparece —');
  const casos = [['index.html', 'splash-titulo'], ['landing.html', 'landing-splash-logo']];

  for (const [pag, id] of casos) {
    /* (a) con fuentes: no debe verse nunca con el ancho de la reserva */
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(url(pag), { waitUntil: 'commit' });
    const muestras = [];
    for (let i = 0; i < 40; i++) {
      const m = await p.evaluate(id => {
        const e = document.getElementById(id);
        if (!e) return null;
        return { o: +getComputedStyle(e).opacity, w: Math.round(e.getBoundingClientRect().width) };
      }, id).catch(() => null);
      if (m) muestras.push(m);
      await p.waitForTimeout(40);
    }
    await p.close();
    if (!muestras.length) { chk(false, pag + ': no se pudo medir el logo'); continue; }
    const anchoFinal = muestras[muestras.length - 1].w;
    const malas = muestras.filter(m => m.o > 0.05 && m.w !== anchoFinal);
    chk(malas.length === 0, pag + ': el logo nunca se ve con el ancho de reserva',
        malas.length ? { veces: malas.length, visto: malas[0].w, correcto: anchoFinal } : undefined);
    chk(muestras[muestras.length - 1].o === 1, pag + ': el logo termina visible');

    /* (b) sin fuentes: DEBE aparecer igual — esto ya se rompió una vez y el
           logo quedaba invisible hasta recargar */
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**fonts.googleapis.com**', r => r.abort());
    await ctx.route('**fonts.gstatic.com**',    r => r.abort());
    const p2 = await ctx.newPage();
    await p2.goto(url(pag));
    await p2.waitForTimeout(2200);          // la red de seguridad salta a 1200ms
    const r2 = await p2.evaluate(id => ({
      clase: document.documentElement.classList.contains('fuentes-listas'),
      o: +getComputedStyle(document.getElementById(id)).opacity,
    }), id);
    chk(r2.clase && r2.o === 1,
        pag + ': con las fuentes bloqueadas el logo aparece igual', r2);
    await ctx.close();
  }
}

/* ── 4. Nada de castellano con la app en inglés ─────────────────────── */
async function pruebaIdioma(b) {
  console.log('\n— Sin textos a medio traducir —');
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(url('index.html'));
  await p.waitForTimeout(4000);
  const d = await p.evaluate(() => {
    const ES = /\b(tus|sus|dibujos?|privados?|eliminan|enviar|amigos?|cuenta|correo|contraseña|usuario|cargando|guardar|limpiar|bandeja|nombre|elige|ajustes|cerrar|sesión|borrar|aceptar|cancelar|siguiente|atrás|buscar|invitar|compartir|descargar|pincel|colores?|recibidos?|empieza|gratis|crea|pulsa|toca)\b/i;
    const out = [];
    document.querySelectorAll('[id]').forEach(e => {
      if (e.children.length) return;
      const t = e.textContent.trim();
      if (t.length >= 4 && ES.test(t)) out.push('#' + e.id + ' → ' + t.slice(0, 60));
    });
    return out;
  });
  chk(d.length === 0, 'ningún texto se queda en castellano con la app en inglés',
      d.length ? d : undefined);
  await p.close();
}

(async () => {
  const b = await chromium.launch();
  try {
    await pruebaCLS(b);
    await pruebaReservas(b);
    await pruebaLogo(b);
    await pruebaIdioma(b);
  } finally {
    await b.close();
  }
  console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ Sin saltos al cargar');
  process.exit(fallos ? 1 : 0);
})();
