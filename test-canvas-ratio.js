/* Prueba: el lienzo es vertical 9:16 en TODOS los dispositivos, cabe siempre
   dentro de su área, y los dibujos antiguos (hechos cuando el escritorio era
   16:10 apaisado) se siguen viendo completos, sin recortes ni deformación.

   Ejecutar:  node test-canvas-ratio.js
*/
const { chromium } = require('playwright');
const path = require('path');

const RATIO = 9 / 16;
const ARCHIVO = 'file://' + path.resolve(__dirname, 'index.html');

const TAMANOS = [
  ['escritorio 1440x900',  1440, 900],
  ['escritorio 1920x1080', 1920, 1080],
  ['portatil 1280x720',    1280, 720],
  ['portatil bajo 1366x620', 1366, 620],
  ['tablet 820x1180',      820, 1180],
  ['movil 390x844',        390, 844],
  ['movil chico 360x640',  360, 640],
];

/* Quita splash y login para dejar la pantalla de dibujo a la vista. */
const MOSTRAR_APP = () => {
  document.querySelectorAll('#splash,#auth-screen,.splash')
    .forEach(e => { e.style.display = 'none'; });
  const a = document.getElementById('app');
  if (a) a.style.display = 'flex';
  if (typeof setupCanvas === 'function') setupCanvas();
};

async function abrir(b, W, H) {
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto(ARCHIVO);
  await p.waitForTimeout(2600);   // deja pasar el splash
  await p.evaluate(MOSTRAR_APP);
  await p.waitForTimeout(300);
  return { p, errores };
}

async function pruebaProporcion(b) {
  let fallos = 0;
  console.log('— Proporción del lienzo en cada tamaño —');
  for (const [nombre, W, H] of TAMANOS) {
    const { p, errores } = await abrir(b, W, H);
    const m = await p.evaluate(() => {
      const cv = document.getElementById('canvas');
      const area = document.getElementById('carea');
      if (!cv || !area) return null;
      const c = cv.getBoundingClientRect(), a = area.getBoundingClientRect();
      return { cw: c.width, ch: c.height, aw: a.width, ah: a.height,
               bw: cv.width, bh: cv.height };
    });
    if (!m || !m.cw) {
      console.log('❌ ' + nombre + ': el lienzo no es visible');
      fallos++; await p.close(); continue;
    }
    const ratio = m.cw / m.ch;
    const fallas = [];
    if (m.cw > m.aw + 1) fallas.push('DESBORDA-ANCHO');
    if (m.ch > m.ah + 1) fallas.push('DESBORDA-ALTO');
    if (ratio >= 1) fallas.push('NO-VERTICAL');
    if (Math.abs(ratio - RATIO) > 0.01) fallas.push('NO-9:16');
    /* El búfer interno debe tener la misma forma que la caja CSS, si no el
       trazo sale ovalado. */
    if (Math.abs(m.bw / m.bh - ratio) > 0.01) fallas.push('BUFER-DEFORME');
    if (errores.length) fallas.push('ERROR-JS: ' + errores[0].slice(0, 60));

    if (fallas.length) fallos++;
    console.log((fallas.length ? '❌' : '✅') + ' ' + nombre.padEnd(22)
      + 'lienzo ' + Math.round(m.cw) + 'x' + Math.round(m.ch)
      + '  área ' + Math.round(m.aw) + 'x' + Math.round(m.ah)
      + '  ratio ' + ratio.toFixed(4)
      + (fallas.length ? '  ' + fallas.join(' ') : ''));
    await p.close();
  }
  return fallos;
}

/* Un dibujo guardado trae su origW/origH. Al repintarlo en un lienzo de otra
   forma debe encogerse y centrarse, nunca recortarse ni estirarse. */
async function pruebaDibujosAntiguos(b) {
  console.log('\n— Dibujos ya guardados en un lienzo de otra forma —');
  const { p } = await abrir(b, 1440, 900);
  const res = await p.evaluate(() => {
    const cv = document.getElementById('canvas');
    const casos = [
      ['16:10 apaisado', 1206, 754],   // como dibujaba el escritorio antes
      ['9:16 vertical',   424, 754],   // como dibuja ahora
      ['cuadrado',        600, 600],
    ];
    const salida = [];
    for (const [nombre, ow, oh] of casos) {
      /* Un marco que toca las cuatro esquinas del lienzo original: si algo se
         recorta o se estira, se nota en la caja medida. */
      trazos.length = 0;
      trazos.push({ tipo:'inicio', x:0, y:0, h:3, sid:1, t:0, origW:ow, origH:oh });
      const esq = [[0,0],[ow,0],[ow,oh],[0,oh],[0,0]];
      for (let i = 0; i < 4; i++) {
        trazos.push({ tipo:'seg', de:{x:esq[i][0], y:esq[i][1]},
                      a:{x:esq[i+1][0], y:esq[i+1][1]},
                      color:'#1a1a2e', gw:3, sid:1, t:i+1 });
      }
      trazos.push({ tipo:'fin', sid:1, t:5 });
      redibujar();

      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) {
        for (let x = 0; x < cv.width; x++) {
          const i = (y * cv.width + x) * 4;
          if (d[i] < 120 && d[i+1] < 120) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      salida.push({
        nombre, ow, oh,
        pintado: x1 > x0 && y1 > y0,
        dentro: x0 >= 0 && y0 >= 0 && x1 < cv.width && y1 < cv.height,
        ratioDibujado: (x1 - x0) / (y1 - y0),
        ratioOriginal: ow / oh,
        lienzo: [Math.round(cv.width / DPR), Math.round(cv.height / DPR)],
      });
    }
    trazos.length = 0; redibujar();
    return salida;
  });
  await p.close();

  let fallos = 0;
  for (const r of res) {
    const fallas = [];
    if (!r.pintado) fallas.push('NO-SE-PINTO');
    if (!r.dentro)  fallas.push('RECORTADO');
    if (Math.abs(r.ratioDibujado - r.ratioOriginal) > 0.03) fallas.push('DEFORMADO');
    if (fallas.length) fallos++;
    console.log((fallas.length ? '❌' : '✅') + ' ' + r.nombre.padEnd(18)
      + r.ow + 'x' + r.oh + ' en lienzo ' + r.lienzo.join('x')
      + '  ratio ' + r.ratioDibujado.toFixed(3) + ' vs ' + r.ratioOriginal.toFixed(3)
      + (fallas.length ? '  ' + fallas.join(' ') : ''));
  }
  return fallos;
}

(async () => {
  const b = await chromium.launch();
  let fallos = 0;
  try {
    fallos += await pruebaProporcion(b);
    fallos += await pruebaDibujosAntiguos(b);
  } finally {
    await b.close();
  }
  console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ Lienzo correcto en todos los casos');
  process.exit(fallos ? 1 : 0);
})();
