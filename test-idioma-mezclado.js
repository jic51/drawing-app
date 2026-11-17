/* ¿Hay texto del otro idioma en la interfaz?
 *
 * Un amigo de Jose lo dijo así al probar la app: «el inglés y el español
 * están todo mezclado». Tenía razón, y era objetivo: los tooltips de los
 * colores decían "Rainbow" con la app en español, y los campos de entrada
 * decían "Tu nombre" con la app en inglés. Estaban escritos a mano en el
 * HTML, así que no pasaban por t() y no cambiaban nunca.
 *
 * Esta prueba recorre todo lo visible —textos, placeholders y tooltips— y
 * busca palabras que solo existen en el OTRO idioma. No es perfecta (hay
 * palabras iguales en los dos), pero caza justo el tipo de descuido que
 * pasó: un texto que se quedó escrito a mano.
 *
 * Ejecutar:  node test-idioma-mezclado.js   (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

/* Palabras inequívocas de cada idioma. Solo se ponen las que NO existen en
   el otro, para no dar falsos positivos con "no", "color" o "total". */
const SOLO_INGLES = ['rainbow','white','black','your name','you@','change photo',
                     'cancel reply','send to','clear','save','inbox','friend',
                     'settings','available','already taken','checking'];
const SOLO_ESPANOL = ['arcoíris','blanco','negro','tu nombre','tu@','cambiar foto',
                      'cancelar respuesta','enviar a','limpiar','guardar','bandeja',
                      'amigo','ajustes','disponible','ya está tomado','comprobando'];

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITIO.pagina('app/index.html'));
  await p.waitForTimeout(2500);

  for (const idioma of ['es', 'en']) {
    const prohibidas = idioma === 'es' ? SOLO_INGLES : SOLO_ESPANOL;

    const encontrado = await p.evaluate(({ idioma, prohibidas }) => {
      /* Cambiar de idioma por la misma puerta que usa la app. */
      lang = idioma;
      try { localStorage.setItem('ss_lang', idioma); } catch (e) {}
      /* Si `applyLang` deja de existir la prueba debe FALLAR, no pasar de
         largo: una prueba que no encuentra lo que prueba no prueba nada. */
      if (typeof applyLang !== 'function') return [{ palabra: '(sin applyLang)', texto: 'la función que aplica el idioma ya no existe', donde: '—' }];
      applyLang();

      document.querySelectorAll('#splash-screen,#auth-screen').forEach(e => { e.style.display='none'; });
      const app = document.getElementById('app'); if (app) app.style.display = 'flex';

      const malos = [];
      const mira = (texto, donde) => {
        if (!texto) return;
        const t = String(texto).toLowerCase();
        for (const w of prohibidas) {
          if (t.includes(w)) { malos.push({ palabra: w, texto: String(texto).slice(0,60), donde }); break; }
        }
      };

      /* Atributos visibles: son los que se olvidan. */
      document.querySelectorAll('[title]').forEach(el => {
        if (el.offsetParent !== null || el.closest('#app')) mira(el.getAttribute('title'), 'title de ' + (el.id || el.className || el.tagName));
      });
      document.querySelectorAll('[placeholder]').forEach(el => {
        mira(el.getAttribute('placeholder'), 'placeholder de ' + (el.id || el.tagName));
      });

      return malos;
    }, { idioma, prohibidas });

    const nombre = idioma === 'es' ? 'español' : 'inglés';
    chk(encontrado.length === 0,
        `con la app en ${nombre} no hay textos del otro idioma`,
        encontrado.slice(0, 6));
  }

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ la interfaz no mezcla idiomas');
})();
