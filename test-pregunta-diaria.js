/* La pregunta del día: el posicionamiento, convertido en prueba.
 *
 * El 2026-11-18 Jose decidió para qué es la app, que era el problema más
 * grande que tenía (su amigo Roger preguntó TRES veces «¿para quién es?»):
 *
 *   «Cada día hay una pregunta. La dibujas en 30 segundos y se la mandas a
 *    tu gente. Ellos te ven dibujarla. Mañana desaparece.»
 *
 * Una decisión de producto se deshace sola si nadie la vigila: alguien
 * cambia el reto a semanal «por simplificar», o el estado vacío vuelve a
 * decir «no tienes dibujos» en vez de mandarte a dibujar la de hoy. Esto
 * comprueba lo que de verdad la sostiene.
 *
 * Ejecutar:  node test-pregunta-diaria.js   (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2500);

  /* ── 1. Cambia cada DÍA, no cada semana ───────────────────────────── */
  const ritmo = await p.evaluate(() => {
    const dia = 86400000;
    const base = Date.UTC(2026, 5, 15, 12, 0, 0);   /* mediodía en RD */
    const hoy    = retoDelDia(base);
    const manana = retoDelDia(base + dia);
    const semana = retoDelDia(base + 7 * dia);

    /* ¿Cuántos días distintos seguidos antes de repetirse? */
    const vistos = new Set();
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const r = retoDelDia(base + i * dia);
      if (vistos.has(r.en)) break;
      vistos.add(r.en); n++;
    }

    /* Y que dos momentos del mismo día (en RD) den lo mismo. El corte
       está a medianoche UTC-4, o sea a las 04:00 UTC. */
    const manana8  = retoDelDia(Date.UTC(2026, 5, 15, 12, 0, 0));
    const noche23  = retoDelDia(Date.UTC(2026, 5, 16, 3, 0, 0));

    return {
      cambiaManana: hoy.en !== manana.en,
      distintoEnSemana: hoy.en !== semana.en,
      sinRepetir: n,
      total: window.SS.RETOS.length,
      mismoDiaMismaPregunta: manana8.en === noche23.en
    };
  });

  chk(ritmo.cambiaManana, 'la pregunta cambia de un día al siguiente');
  chk(ritmo.mismoDiaMismaPregunta,
      'a lo largo del mismo día no cambia (el corte es medianoche en RD, no en UTC)');
  chk(ritmo.sinRepetir >= 45,
      'tarda semanas en repetirse',
      { diasSinRepetir: ritmo.sinRepetir, total: ritmo.total });

  /* ── 2. Es lo primero que se ve al abrir con el lienzo vacío ──────── */
  const enPantalla = await p.evaluate(async () => {
    document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
    document.getElementById('app').style.display = 'flex';
    usuario = 'jose';
    setupCanvas();
    trazos.length = 0;
    promptsInicializados = false;
    iniciarPromptsCanvas();
    await new Promise(r => setTimeout(r, 1400));
    const caja = document.getElementById('drawing-prompts');
    const txt  = document.getElementById('prompt-text');
    const cs = getComputedStyle(caja);
    return {
      visible: +cs.opacity > 0.5,
      esElReto: caja.classList.contains('reto'),
      texto: (txt.textContent || '').trim(),
      contieneLaDeHoy: (txt.textContent || '').includes(retoDelDia()[lang] || retoDelDia().en)
    };
  });

  chk(enPantalla.visible, 'la pregunta se ve al abrir con el lienzo vacío', enPantalla.texto.slice(0, 70));
  chk(enPantalla.esElReto, 'y es la pregunta del día, no una idea suelta');
  chk(enPantalla.contieneLaDeHoy, 'enseña la pregunta que toca hoy', enPantalla.texto.slice(0, 70));
  chk(/^hoy|^today/i.test(enPantalla.texto),
      'empieza por «Hoy», no por «Reto de la semana»', enPantalla.texto.slice(0, 40));

  /* ── 3. Los textos vacíos mandan a dibujar, no informan de la nada ── */
  const textos = await p.evaluate(() => {
    const r = {};
    for (const idioma of ['es', 'en']) {
      lang = idioma;
      r[idioma] = {
        vacio: t('inbox_empty_hint'),
        sinAmigos: t('no_friends_hint'),
        titulo: t('reto_titulo')
      };
    }
    return r;
  });

  chk(/pregunta de hoy/i.test(textos.es.vacio) && /today's question/i.test(textos.en.vacio),
      'la bandeja vacía manda a dibujar la de hoy', textos.es.vacio);
  chk(!/semana|week/i.test(textos.es.titulo + textos.en.titulo),
      'ya no queda ningún «de la semana»', textos.es.titulo + ' / ' + textos.en.titulo);

  /* ── 4. La landing dice lo mismo ──────────────────────────────────── */
  const p2 = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await p2.goto(SITIO.pagina('index.html'));
  await p2.waitForTimeout(3200);
  const landing = await p2.evaluate(() => {
    const h = document.querySelector('[data-i18n="hero_tagline"]');
    const s = document.querySelector('[data-i18n="hero_subtitle"]');
    return { titular: (h && h.textContent || '').trim(), sub: (s && s.textContent || '').trim() };
  });
  chk(/question a day|pregunta al día/i.test(landing.titular),
      'el titular de la landing habla de la pregunta del día', landing.titular);
  chk(/30 seconds|30 segundos/.test(landing.sub) && /gone|desaparece/i.test(landing.sub),
      'y el subtítulo dice los 30 segundos y que desaparece', landing.sub);

  /* ── 5. La landing enseña la pregunta DE HOY, y es la misma ──────── */
  const hero = await p2.evaluate(() => {
    const caja = document.getElementById('hero-reto');
    const txt  = document.getElementById('hero-reto-txt');
    if (!caja || !txt) return null;
    const en = txt.textContent.trim();
    setLang('es');
    const es = txt.textContent.trim();
    const etiqueta = document.querySelector('.hero-reto-et').textContent.trim();
    setLang('en');
    return {
      oculta: caja.hidden,
      en, es, etiqueta,
      vuelve: txt.textContent.trim(),
      /* lo que dice el archivo compartido, para comparar */
      delArchivo: window.SS ? window.SS.textoDelDia('en') : null
    };
  });

  chk(hero !== null, 'la landing tiene sitio para la pregunta de hoy');
  if (hero) {
    chk(!hero.oculta, 'y se ve', hero.en);
    chk(hero.en.length > 2, 'con texto de verdad', hero.en);
    chk(hero.en === hero.delArchivo,
        'la pregunta de la landing sale del archivo compartido', hero);
    chk(hero.es !== hero.en && hero.etiqueta === 'Hoy',
        'se traduce al cambiar de idioma', { es: hero.es, etiqueta: hero.etiqueta });
    chk(hero.vuelve === hero.en, 'y vuelve bien al idioma anterior');
  }

  /* Y lo que de verdad importa: que la landing y la APP digan LA MISMA
     pregunta. Son dos páginas distintas leyendo el mismo archivo; si
     alguien volviera a copiar la lista, esto lo cazaría. */
  const enLaApp = await p.evaluate(() => { lang = 'en'; return textoReto(); });
  const enLaLanding = hero ? hero.en : null;
  chk(!!enLaApp && enLaApp === enLaLanding,
      'la app y la landing dicen la MISMA pregunta (en el mismo idioma)',
      { app: enLaApp, landing: enLaLanding });

  /* ── 6. La sección de preguntas: la MISMA animación que la app ───── */
  await p2.evaluate(() => document.getElementById('preguntas-section').scrollIntoView());
  await p2.waitForTimeout(700);
  const sec = await p2.evaluate(() => {
    const el = document.getElementById('preguntas-frase');
    if (!el) return null;
    return {
      primera: el.textContent.trim(),
      letras: el.querySelectorAll('.ch').length,
      palabras: el.querySelectorAll('.w').length,
      /* la clase que `frase.js` pone y de la que cuelga su CSS */
      marcada: el.classList.contains('ss-frase'),
      /* y que el estilo lo haya inyectado el archivo, no la página */
      estiloInyectado: !!document.querySelector('style[data-ss="frase"]')
    };
  });
  chk(sec !== null, 'la landing tiene la sección de preguntas');
  if (sec) {
    chk(sec.letras > 5, 'la frase está partida en letras, como en la app',
        { letras: sec.letras, palabras: sec.palabras });
    chk(sec.marcada && sec.estiloInyectado,
        'el estilo lo pone frase.js, no una copia en la landing', sec);
  }

  await p2.waitForTimeout(5400);
  const despues = await p2.evaluate(() =>
    document.getElementById('preguntas-frase').textContent.trim());
  chk(sec && despues !== sec.primera, 'las preguntas van cambiando solas',
      { antes: sec && sec.primera, despues });

  /* Y que la app use EXACTAMENTE la misma animación, no una copia. */
  const mismaAnimacion = await p.evaluate(() => {
    const src = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
    return {
      usaElArchivo: /window\.SS\.frase\.(pintar|cambiar)/.test(src),
      sinCopiaLocal: !/function letrasDe\s*\(/.test(src),
      estiloInyectado: !!document.querySelector('style[data-ss="frase"]')
    };
  });
  chk(mismaAnimacion.usaElArchivo && mismaAnimacion.sinCopiaLocal,
      'la app usa frase.js y ya no tiene su propia copia', mismaAnimacion);

  /* Y que ya no quede ningún «cada semana» en la landing. */
  const semanal = await p2.evaluate(() => {
    const t = document.body.innerText;
    return (t.match(/cada semana|every week|every Monday|cada lunes/gi) || []);
  });
  chk(semanal.length === 0, 'en la landing no queda ningún «cada semana»', semanal);

  await p2.close();

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ la app dice lo mismo en todas partes: una pregunta al día');
})();
