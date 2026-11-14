/* Prueba: el reto semanal es EL MISMO para todo el mundo.

   No hay backend detrás: el reto se calcula a partir de la fecha. Eso solo
   funciona si la cuenta es idéntica en cualquier parte del planeta, así que
   es justo lo que se comprueba aquí:
   - el mismo reto en husos horarios opuestos,
   - el cambio ocurre en el mismo instante para todos (lunes 00:00 UTC),
   - la lista se recorre entera sin repetir ni saltarse ninguno,
   - la insignia se ve y se traduce.

   Ejecutar:  node test-weekly-challenge.js
*/
const { chromium } = require('playwright');
const path = require('path');

const ARCHIVO = 'file://' + path.resolve(__dirname, 'app/index.html');

let fallos = 0;
const chk = (cond, msg, dato) => {
  if (!cond) fallos++;
  console.log((cond ? '✅' : '❌') + ' ' + msg
    + (dato !== undefined ? '   ' + JSON.stringify(dato) : ''));
};

(async () => {
  const b = await chromium.launch();

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

  /* ── 2. El cambio cae exactamente en el lunes 00:00 UTC ─────────── */
  console.log('\n— El cambio de semana —');
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(ARCHIVO);
  await p.waitForTimeout(3000);

  const r = await p.evaluate(() => {
    const L = Date.UTC(2026, 10, 9);          // lunes 9 nov 2026, 00:00 UTC
    return {
      diaEpoca: new Date(RETO_EPOCA).getUTCDay(),
      semAntes: semanaActual(L - 60000),
      semJusto: semanaActual(L),
      semDesp:  semanaActual(L + 60000),
      retoAntes: retoDeLaSemana(L - 60000).en,
      retoJusto: retoDeLaSemana(L).en,
    };
  });
  chk(r.diaEpoca === 1, 'la fecha de origen cae en lunes UTC', { dia: r.diaEpoca });
  chk(r.semAntes + 1 === r.semJusto, 'la semana avanza justo en ese instante',
      { antes: r.semAntes, justo: r.semJusto });
  chk(r.semJusto === r.semDesp, 'y no vuelve a avanzar un minuto después');
  chk(r.retoAntes !== r.retoJusto, 'el reto cambia al cruzar el lunes',
      { antes: r.retoAntes, despues: r.retoJusto });

  /* ── 3. El ciclo recorre la lista entera ────────────────────────── */
  console.log('\n— El ciclo de retos —');
  const ciclo = await p.evaluate(() => {
    const L = Date.UTC(2026, 10, 9), SEM = 7 * 24 * 3600 * 1000;
    const sec = [];
    for (let i = 0; i < 60; i++) sec.push(retoDeLaSemana(L + i * SEM).en);
    return {
      total: RETOS.length,
      distintos: new Set(sec.slice(0, RETOS.length)).size,
      reinicia: sec[0] === sec[RETOS.length],
      repiteSeguido: sec.some((x, i) => i > 0 && x === sec[i - 1]),
      /* Fechas muy anteriores a la época dan semana negativa: el módulo debe
         seguir cayendo dentro de la lista, no devolver undefined. */
      pasado: retoDeLaSemana(Date.UTC(1999, 0, 1)),
    };
  });
  chk(ciclo.distintos === ciclo.total,
      'un ciclo usa los ' + ciclo.total + ' retos sin repetir', { distintos: ciclo.distintos });
  chk(ciclo.reinicia, 'y vuelve a empezar al terminar la lista');
  chk(!ciclo.repiteSeguido, 'nunca repite el mismo reto dos semanas seguidas');
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
    setupCanvas(); mostrarPrompt();
    const badge = document.getElementById('reto-badge');
    return {
      badgeVisible: badge.getBoundingClientRect().width > 0,
      prompt: document.getElementById('prompt-text').textContent,
    };
  });
  chk(!m.badgeVisible, 'en móvil la insignia se oculta (se cortaba a la mitad)');
  chk(/Challenge of the week|Reto de la semana/.test(m.prompt),
      'en móvil el reto llega por la sugerencia del lienzo', m.prompt);
  await p2.close();

  await b.close();
  console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ Reto semanal correcto');
  process.exit(fallos ? 1 : 0);
})();
