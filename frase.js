/* LA FRASE QUE CAMBIA LETRA A LETRA — el único sitio donde vive.
 *
 * Es la animación de las sugerencias sobre el lienzo: las letras se van por
 * la izquierda tiñéndose con los colores del logo, y las nuevas entran por
 * abajo, una detrás de otra.
 *
 * Lo cargan la app Y la landing. Jose: «sería bueno que el usuario vea las
 * frases que aparecen de la misma forma en que aparecen en la app, así se
 * acostumbran y saben qué buscar». Para que sean iguales de verdad tienen
 * que salir del mismo sitio; si no, dentro de dos semanas serán parecidas
 * pero no iguales, que es lo que ya pasó con el nombre de usuario, con la
 * etiqueta del video y con las dos firmas.
 *
 * El CSS que necesita lo inyecta este mismo archivo. Así no hay nada que
 * copiar en la hoja de estilos de cada página, y no puede faltar.
 */
(function (global) {
  'use strict';

  /* Los mismos colores del logo, para que el cambio se sienta de la casa. */
  var COLORES = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#9400d3'];

  var SALIDA_LETRA  = 32;   /* ms entre letra y letra al salir */
  var ENTRADA_LETRA = 22;   /* y al entrar */

  var CSS = [
    /* La palabra entera no se parte: el corte de línea solo cae en los
       espacios. Sin esto el texto salía partido a mitad de palabra. */
    '.ss-frase .w { display:inline-block; white-space:nowrap; }',
    '.ss-frase .ch {',
    '  display:inline-block; white-space:pre;',
    '  transition:opacity .3s ease, transform .3s ease, color .3s ease;',
    '}',
    '.ss-frase .ch.sale  { opacity:0; transform:translateX(-10px) scale(.86); }',
    '.ss-frase .ch.entra { opacity:0; transform:translateY(7px); }',
    /* Sin movimiento, el cambio es directo: nadie se marea leyendo una
       sugerencia. */
    '@media (prefers-reduced-motion: reduce) {',
    '  .ss-frase .ch { transition:none; }',
    '  .ss-frase .ch.sale, .ss-frase .ch.entra { opacity:1; transform:none; }',
    '}'
  ].join('\n');

  var cssPuesto = false;
  function ponerCss() {
    if (cssPuesto || typeof document === 'undefined') return;
    cssPuesto = true;
    var st = document.createElement('style');
    st.setAttribute('data-ss', 'frase');
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* Cada letra en su propio inline-block, para poder darle color y retardo
     propios. Las de una palabra van dentro de una envoltura que no se parte. */
  function letrasDe(txt, clase) {
    var frag = document.createDocumentFragment();
    var trozos = String(txt).split(/(\s+)/);
    for (var i = 0; i < trozos.length; i++) {
      var trozo = trozos[i];
      if (!trozo) continue;
      if (/^\s+$/.test(trozo)) {
        var sp = document.createElement('span');
        sp.className = 'ch' + (clase ? ' ' + clase : '');
        sp.textContent = trozo;
        frag.appendChild(sp);
        continue;
      }
      var palabra = document.createElement('span');
      palabra.className = 'w';
      for (var j = 0; j < trozo.length; j++) {
        var c = document.createElement('span');
        c.className = 'ch' + (clase ? ' ' + clase : '');
        c.textContent = trozo[j];
        palabra.appendChild(c);
      }
      frag.appendChild(palabra);
    }
    return frag;
  }

  /* Pone la frase de golpe, sin animación. Para la primera. */
  function pintar(el, txt) {
    if (!el) return;
    ponerCss();
    el.classList.add('ss-frase');
    el.innerHTML = '';
    el.appendChild(letrasDe(txt, ''));
  }

  /* Cambia la frase con el barrido de color. Devuelve cuánto tarda, para
     que quien la llame sepa cuándo queda libre. */
  function cambiar(el, nuevo, estado) {
    if (!el) return 0;
    ponerCss();
    el.classList.add('ss-frase');
    estado = estado || {};
    var viejas = [].slice.call(el.querySelectorAll('.ch'));
    if (!viejas.length) { pintar(el, nuevo); return 0; }

    /* De derecha a izquierda: la última letra es la primera en irse. */
    viejas.forEach(function (sp, i) {
      var desdeElFinal = viejas.length - 1 - i;
      setTimeout(function () {
        /* El color recorre la frase: cada letra toma el siguiente del logo. */
        sp.style.color = COLORES[desdeElFinal % COLORES.length];
        /* Un respiro con el color puesto antes de desaparecer; si no, el
           arcoíris no llega a verse. */
        setTimeout(function () { sp.classList.add('sale'); }, 130);
      }, desdeElFinal * SALIDA_LETRA);
    });

    var msSalida = (viejas.length - 1) * SALIDA_LETRA + 130 + 300;
    clearTimeout(estado.timer);
    estado.timer = setTimeout(function () {
      el.innerHTML = '';
      el.appendChild(letrasDe(nuevo, 'entra'));
      var nuevas = [].slice.call(el.querySelectorAll('.ch'));
      requestAnimationFrame(function () {
        nuevas.forEach(function (sp, i) {
          setTimeout(function () { sp.classList.remove('entra'); }, i * ENTRADA_LETRA);
        });
      });
    }, msSalida);
    return msSalida + String(nuevo).length * ENTRADA_LETRA + 300;
  }

  /* Va pasando por una lista de frases, una tras otra, para siempre.
     Devuelve una función que la para. */
  function rotar(el, textos, opciones) {
    if (!el || !textos || !textos.length) return function () {};
    opciones = opciones || {};
    var cada = opciones.cada || 3600;
    var estado = {};
    var i = 0;
    var vivo = true;
    var siguiente;

    pintar(el, textos[0]);

    function paso() {
      if (!vivo) return;
      i = (i + 1) % textos.length;
      var tarda = cambiar(el, textos[i], estado);
      siguiente = setTimeout(paso, Math.max(cada, tarda + 400));
    }
    siguiente = setTimeout(paso, cada);

    return function parar() {
      vivo = false;
      clearTimeout(siguiente);
      clearTimeout(estado.timer);
    };
  }

  global.SS = global.SS || {};
  global.SS.frase = {
    pintar: pintar,
    cambiar: cambiar,
    rotar: rotar,
    letrasDe: letrasDe,
    COLORES: COLORES
  };
})(typeof self !== 'undefined' ? self : this);
