/* ¿El video sale entero y sin saltos?
 *
 * Dos cosas que pasaron de verdad, medidas sobre un video que mandó Jose:
 *
 *  1. SALTOS. El reloj del video iba pegado al reloj de pared, así que un
 *     atasco del navegador se tragaba trazos: aparecían ya dibujados. El
 *     hueco normal entre cuadros era de 33 ms y hubo uno de 687 ms, con
 *     407 píxeles cambiando de golpe donde lo normal eran ~25.
 *
 *  2. RECORTE. Si el lienzo cambia de tamaño a mitad del dibujo, los trazos
 *     nuevos quedan en otro sistema de coordenadas que el declarado en
 *     `origW/origH`, y se salían por el borde del video.
 *
 * Ejecutar:  node test-video-fluidez.js      (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

/* El reloj del video, replicado tal cual está en la app. */
function relojDelVideo(huecos, pasoMax) {
  let t = 0; const salida = [];
  for (const h of huecos) { t += Math.min(h, pasoMax); salida.push(t); }
  return salida;
}

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2800);

  /* ── 1. El encuadre no recorta ─────────────────────────────────────── */
  const r = await p.evaluate(() => {
    /* Un dibujo que se sale del lienzo declarado por los cuatro lados: es
       lo que pasa cuando el lienzo cambia de tamaño a mitad del dibujo. */
    const segs = [
      { de:{x:  10, y:  10 }, a:{x: 400, y: 700 }, gw: 8  },
      { de:{x:-120, y: -40 }, a:{x: 650, y: 980 }, gw: 20 },
    ];
    const destW = 1080, destH = 1920, margen = 48;
    const e = encuadrar(segs, 500, 890, destW, destH, margen);

    const pts = [];
    for (const s of segs) for (const q of [s.de, s.a]) {
      pts.push({ x: e.ox + q.x * e.scale, y: e.oy + q.y * e.scale, r: (s.gw/2) * e.scale });
    }
    const fuera = pts.filter(q =>
      q.x - q.r < 0 || q.y - q.r < 0 || q.x + q.r > destW || q.y + q.r > destH);

    /* El caso normal: todo dentro del lienzo. El encuadre NO debe cambiar. */
    const dentro = [{ de:{x:50,y:50}, a:{x:450,y:840}, gw: 6 }];
    const eNormal = encuadrar(dentro, 500, 890, destW, destH, 0);

    return {
      fuera: fuera.length, totalPts: pts.length,
      escalaNormal: eNormal.scale,
      escalaEsperada: Math.min(destW/500, destH/890),
      sinLienzo: !!encuadrar(dentro, 0, 0, destW, destH, 0).scale
    };
  });

  chk(r.fuera === 0, `los ${r.totalPts} puntos caben dentro del video, margen incluido`,
      { seSalen: r.fuera });
  chk(Math.abs(r.escalaNormal - r.escalaEsperada) / r.escalaEsperada < 0.001,
      'un dibujo que ya cabía NO se reencuadra',
      { escala: +r.escalaNormal.toFixed(4), esperada: +r.escalaEsperada.toFixed(4) });
  chk(r.sinLienzo, 'sin lienzo declarado también devuelve un encuadre usable');

  /* ── 2. El reloj no puede saltar ───────────────────────────────────── */
  const fuente = await p.evaluate(() => {
    const s = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    return {
      acotado: /transcurrido\s*\+=\s*Math\.min\(\s*ahora\s*-\s*tPrev\s*,\s*VIDEO_PASO_MAX\s*\)/.test(s),
      incremental: /while\s*\(\s*siguiente\s*<\s*comp\.length/.test(s),
      pasoMax: (s.match(/const VIDEO_PASO_MAX\s*=\s*(\d+)/) || [])[1]
    };
  });

  chk(fuente.acotado,     'el reloj del video está acotado con VIDEO_PASO_MAX');
  chk(fuente.incremental, 'los cuadros se pintan de forma incremental, no desde cero');

  const pasoMax = Number(fuente.pasoMax || 50);
  const huecos = [33, 33, 33, 687, 33, 33];   /* el atasco real que medimos */

  const con = relojDelVideo(huecos, pasoMax);
  const peor = Math.max(...con.map((t,i) => i ? t - con[i-1] : t));
  chk(peor <= pasoMax, `un atasco de 687 ms avanza como mucho ${pasoMax} ms de dibujo`,
      { avanzo: peor });

  /* Que la prueba detectaría la regresión y no pasa por casualidad. */
  const sin = relojDelVideo(huecos, Infinity);
  const peorSin = Math.max(...sin.map((t,i) => i ? t - sin[i-1] : t));
  chk(peorSin > pasoMax, `(sin acotar serían ${peorSin} ms de golpe — el fallo original)`);

  /* ── 3. El arcoíris de la firma gira sin pararse ni saltar ───────── */
  /* La marca vieja del video usaba UN degradado que se deslizaba por encima
     del texto. Un degradado de canvas no se repite: fuera de sus límites el
     color se queda clavado en el del extremo. Así que el texto se iba
     saliendo por la izquierda, todas las letras se quedaban del mismo color
     —la animación parecía pararse— y al cerrar el ciclo volvía de golpe.

     Medido en un video que grabó Jose desde su iPad: 0,3 s casi quieto
     (cambio 0,1 donde lo normal era 4,0) y luego un salto de 10 aumentos,
     cada 2,47 s.

     Se mide pintando la firma en 60 fases de un ciclo y comparando píxeles
     entre fases consecutivas, en círculo. Si la animación es continua, el
     cambio es parecido en todas; si se clava o salta, se ve. */
  const giro = await p.evaluate(() => {
    if (typeof dibujarFirma !== 'function') return null;
    usuario = usuario || 'jose';
    const N = 60, CICLO = 2500;
    const fotos = [];
    const realNow = performance.now.bind(performance);
    try {
      for (let i = 0; i < N; i++) {
        const t = (i / N) * CICLO;
        performance.now = () => t;      /* congelar el reloj en cada fase */
        const c = document.createElement('canvas');
        c.width = 200; c.height = 60;
        const cx = c.getContext('2d');
        dibujarFirma(cx, 200, 60, false);
        fotos.push(cx.getImageData(8, 6, 160, 18).data);
      }
    } finally { performance.now = realNow; }

    const ds = [];
    for (let i = 0; i < N; i++) {
      const a = fotos[i], b2 = fotos[(i + 1) % N];
      let suma = 0;
      for (let j = 0; j < a.length; j++) suma += Math.abs(a[j] - b2[j]);
      ds.push(suma / a.length);
    }
    const orden = [...ds].sort((x, y) => x - y);
    const mediana = orden[Math.floor(orden.length / 2)];
    return {
      mediana: +mediana.toFixed(3),
      maximo:  +Math.max(...ds).toFixed(3),
      minimo:  +Math.min(...ds).toFixed(3),
      quietos: ds.filter(d => d < mediana * 0.25).length,
      saltos:  ds.filter(d => d > mediana * 3).length
    };
  });

  chk(giro !== null, 'se pudo medir la firma');
  if (giro) {
    chk(giro.mediana > 0, 'la firma se mueve', giro);
    chk(giro.saltos === 0,  'el arcoíris NO pega saltos al cerrar el ciclo', giro);
    chk(giro.quietos === 0, 'el arcoíris NO se queda clavado en ningún tramo', giro);
  }

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ el video sale entero y sin saltos');
})();
