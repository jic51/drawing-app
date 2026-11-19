/* Prueba: la pregunta del día es LA MISMA para todo el mundo.

   El 2026-11-18 el reto pasó de semanal a diario. Lo que esta prueba vigila
   NO cambió: que la pregunta no dependa del reloj de quien mira. Es la
   regla que puso Jose y la que hace que dos amigos puedan comparar.

   Lo delicado es que ahora hay dos cosas que cumplir a la vez: la misma
   para todos, Y que cambie a una hora que sea de verdad un día nuevo. Se
   cuentan los días desde medianoche en RD (UTC-4), igual en todo el
   planeta.

   No hay backend detrás: el reto se calcula a partir de la fecha. Eso solo
   funciona si la cuenta es idéntica en cualquier parte del planeta, así que
   es justo lo que se comprueba aquí:
   - el mismo reto en husos horarios opuestos,
   - el cambio ocurre en el mismo instante para todos (lunes 00:00 UTC),
   - la lista se recorre entera sin repetir ni saltarse ninguno,
   - la insignia se ve y se traduce.

   Ejecutar:  node test-weekly-challenge.js
*/
/* El navegador sale de la variable NAVEGADOR: "chromium" por defecto,
   "webkit" para el motor de Safari. Probar solo en Chrome no dice nada de
   iOS, y esta app ya se rompió ahí varias veces. */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir } = require('./test-server');
let SITIO;
const path = require('path');

let ARCHIVO;   /* se rellena cuando el servidor está en pie */

let fallos = 0;
const chk = (cond, msg, dato) => {
  if (!cond) fallos++;
  console.log((cond ? '✅' : '❌') + ' ' + msg
    + (dato !== undefined ? '   ' + JSON.stringify(dato) : ''));
};

(async () => {
  SITIO = await servir();
  ARCHIVO = SITIO.pagina('app/index.html');
  const b = await NAVEGADOR.launch();

  /* ── 1. El mismo reto en husos opuestos ─────────────────────────────
     Kiritimati (UTC+14) y Niue (UTC-11) son los extremos del planeta: 25
     horas de diferencia. Si la cuenta usara la hora local, no coincidirían. */
  console.log('— El mismo reto en todo el planeta —');
  const husos = ['Pacific/Kiritimati', 'Asia/Tokyo', 'Europe/Madrid',
                 'America/Los_Angeles', 'Pacific/Niue'];
  const vistos = [];
  for (const tz of husos) {
    const ctx = await b.newContext({ timezoneId: tz });
    const p = await ctx.newPage();
    await p.goto(ARCHIVO);
    await p.waitForTimeout(3000);
    vistos.push({ tz, reto: await p.evaluate(() => textoReto()) });
    await ctx.close();
  }
  const unicos = [...new Set(vistos.map(v => v.reto))];
  chk(unicos.length === 1, 'mismo reto en ' + husos.length + ' husos horarios',
      unicos.length === 1 ? { reto: unicos[0] } : vistos);

  /* ── 2. El cambio cae en medianoche de RD, no de UTC ────────────── */
  console.log('\n— El cambio de día —');
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(ARCHIVO);
  await p.waitForTimeout(3000);

  const r = await p.evaluate(() => {
    /* Medianoche en RD = 04:00 UTC. */
    const M = Date.UTC(2026, 10, 9, 4, 0, 0);
    return {
      desfase: window.SS.DESFASE_H,
      diaAntes: diaActual(M - 60000),
      diaJusto: diaActual(M),
      diaDesp:  diaActual(M + 60000),
      retoAntes: retoDelDia(M - 60000).en,
      retoJusto: retoDelDia(M).en,
      /* Y que a medianoche UTC NO cambie: ahí todavía son las 8 de la
         tarde en RD y no ha empezado ningún día. */
      cambiaEnUtc: diaActual(Date.UTC(2026, 10, 9) - 60000) !== diaActual(Date.UTC(2026, 10, 9)),
    };
  });
  chk(r.desfase === -4, 'el día se cuenta desde medianoche en RD', { desfase: r.desfase });
  chk(r.diaAntes + 1 === r.diaJusto, 'el día avanza justo en ese instante',
      { antes: r.diaAntes, justo: r.diaJusto });
  chk(r.diaJusto === r.diaDesp, 'y no vuelve a avanzar un minuto después');
  chk(r.retoAntes !== r.retoJusto, 'la pregunta cambia al cruzar la medianoche de RD',
      { antes: r.retoAntes, despues: r.retoJusto });
  chk(!r.cambiaEnUtc, 'y NO cambia a medianoche UTC, que en RD son las 8 de la tarde');

  /* ── 3. El ciclo recorre la lista entera ────────────────────────── */
  console.log('\n— El ciclo de retos —');
  const ciclo = await p.evaluate(() => {
    const L = Date.UTC(2026, 10, 9, 12), DIA = 24 * 3600 * 1000;
    const sec = [];
    for (let i = 0; i < window.SS.RETOS.length + 2; i++) sec.push(retoDelDia(L + i * DIA).en);
    return {
      total: window.SS.RETOS.length,
      distintos: new Set(sec.slice(0, window.SS.RETOS.length)).size,
      reinicia: sec[0] === sec[window.SS.RETOS.length],
      repiteSeguido: sec.some((x, i) => i > 0 && x === sec[i - 1]),
      /* Fechas muy anteriores a la época dan semana negativa: el módulo debe
         seguir cayendo dentro de la lista, no devolver undefined. */
      pasado: retoDelDia(Date.UTC(1999, 0, 1)),
    };
  });
  chk(ciclo.distintos === ciclo.total,
      'un ciclo usa las ' + ciclo.total + ' preguntas sin repetir', { distintos: ciclo.distintos });
  chk(ciclo.reinicia, 'y vuelve a empezar al terminar la lista');
  chk(!ciclo.repiteSeguido, 'nunca repite la misma pregunta dos días seguidos');
  chk(ciclo.pasado && ciclo.pasado.en,
      'una fecha anterior a la época sigue dando un reto válido', ciclo.pasado);

  /* ── 4. La insignia ─────────────────────────────────────────────── */
  console.log('\n— La insignia de la cabecera —');
  const ins = await p.evaluate(() => {
    const b = document.getElementById('reto-badge');
    const en = b.textContent;
    lang = 'es'; applyLang();
    const es = b.textContent;
    lang = 'en'; applyLang();
    return { en, es, vuelve: b.textContent };
  });
  chk(ins.en.startsWith('🎯 ') && ins.en.length > 5, 'muestra el reto', ins.en);
  chk(ins.es !== ins.en && ins.es.startsWith('🎯 '), 'se traduce', ins);
  chk(ins.vuelve === ins.en, 'y vuelve bien al idioma anterior');
  await ctx.close();

  /* En móvil la insignia se oculta a propósito: cortada a la mitad no sirve.
     Ahí el reto llega por la sugerencia sobre el lienzo. */
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p2.goto(ARCHIVO);
  await p2.waitForTimeout(2600);
  const m = await p2.evaluate(() => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display = 'none'; });
    const a = document.getElementById('app'); if (a) a.style.display = 'flex';
    setupCanvas(); mostrarReto();   /* mostrarPrompt se dividió en mostrarReto y mostrarIdea */
    const badge = document.getElementById('reto-badge');
    return {
      badgeVisible: badge.getBoundingClientRect().width > 0,
      prompt: document.getElementById('prompt-text').textContent,
    };
  });
  chk(!m.badgeVisible, 'en móvil la insignia se oculta (se cortaba a la mitad)');
  chk(/^Today:|^Hoy:/.test(m.prompt.trim()),
      'en móvil la pregunta llega por la sugerencia del lienzo', m.prompt);
  await p2.close();

  await b.close(); if (SITIO) await SITIO.cerrar();
  console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ La pregunta del día es la misma para todos');
  process.exit(fallos ? 1 : 0);
})();
