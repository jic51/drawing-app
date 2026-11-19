/* LA PREGUNTA DE HOY — el único sitio donde viven las preguntas.
 *
 * Lo cargan la app Y la landing. Antes la landing no podía enseñar la
 * pregunta del día porque la lista vivía dentro del HTML de la app, y
 * copiarla en los dos sitios era pedir que acabaran diciendo cosas
 * distintas: exactamente el fallo que ya tuvimos con el nombre de usuario,
 * con la etiqueta del video y con las dos firmas.
 *
 * Qué hace que una pregunta funcione aquí, por si hay que añadir más:
 *  - Se contesta en 30 segundos. «Tu desayuno», no «tu ciudad favorita».
 *  - Tiene UNA respuesta tuya. Lo genérico («un árbol») no da ganas; lo
 *    tuyo («el árbol que ves desde tu ventana») sí.
 *  - Se puede dibujar mal y seguir valiendo. Esa es media gracia de la app.
 *  - Nada que obligue a pensar mucho: si hay que pensar, se cierra la app.
 *
 * Se expone en `window.SS` y no como módulo para que funcione igual desde
 * la app (que es un solo archivo HTML a propósito) y desde la landing.
 */
(function (global) {
  'use strict';

  var RETOS = [
  { es:'tu desayuno',                   en:'your breakfast' },
  { es:'cómo te sientes hoy',           en:'how you feel today' },
  { es:'lo que ves por la ventana',     en:'what you see out your window' },
  { es:'tu animal favorito',            en:'your favourite animal' },
  { es:'un monstruo simpático',         en:'a friendly monster' },
  { es:'tu taza favorita',              en:'your favourite mug' },
  { es:'el tiempo que hace',            en:'the weather right now' },
  { es:'tu comida favorita',            en:'your favourite food' },
  { es:'algo que te dio risa',          en:'something that made you laugh' },
  { es:'un robot',                      en:'a robot' },
  { es:'a quien le mandas esto',        en:'whoever you are sending this to' },
  { es:'lo que tienes en la mano',      en:'what is in your hand' },
  { es:'tu planta o tu mascota',        en:'your plant or your pet' },
  { es:'un dinosaurio con sombrero',    en:'a dinosaur wearing a hat' },
  { es:'tu casa',                       en:'your house' },
  { es:'algo imposible',                en:'something impossible' },
  { es:'lo que cenaste anoche',         en:'what you had for dinner' },
  { es:'un superhéroe inventado',       en:'a superhero you invent' },
  { es:'tu zapato',                     en:'your shoe' },
  { es:'lo primero que se te ocurra',   en:'the first thing that comes to mind' },
  { es:'tu cara ahora mismo',           en:'your face right now' },
  { es:'el sitio donde estás',          en:'the place you are in' },
  { es:'algo que te dé miedo',          en:'something that scares you' },
  { es:'tu canción favorita',           en:'your favourite song' },
  { es:'un gato haciendo algo raro',    en:'a cat doing something weird' },
  { es:'lo que harías hoy si pudieras', en:'what you would do today if you could' },
  { es:'tu desorden',                   en:'your mess' },
  { es:'una planta que no existe',      en:'a plant that does not exist' },
  { es:'lo que te falta para dormir',   en:'what you need before you can sleep' },
  { es:'tu lugar favorito',             en:'your favourite place' },
  { es:'algo que perdiste',             en:'something you lost' },
  { es:'un pájaro cualquiera',          en:'any bird at all' },
  { es:'lo que suena ahora',            en:'what you can hear right now' },
  { es:'tu mano',                       en:'your own hand' },
  { es:'una casa en el cielo',          en:'a house in the sky' },
  { es:'lo que desayunarías siempre',   en:'what you would eat every day' },
  { es:'alguien que echas de menos',    en:'someone you miss' },
  { es:'un pez muy raro',               en:'a very strange fish' },
  { es:'el mejor día de tu semana',     en:'the best day of your week' },
  { es:'tu despertador',                en:'your alarm clock' },
  { es:'algo que compraste y no usas',  en:'something you bought and never use' },
  { es:'una nube con forma de algo',    en:'a cloud shaped like something' },
  { es:'lo que llevas puesto',          en:'what you are wearing' },
  { es:'tu bebida de siempre',          en:'your usual drink' },
  { es:'un bicho inventado',            en:'a bug you invent' },
  { es:'lo que ves al cerrar los ojos', en:'what you see with your eyes closed' },
  { es:'tu silla',                      en:'your chair' },
  { es:'algo que harías mejor hoy',     en:'something you would redo today' },
  { es:'una puerta a otro sitio',       en:'a door to somewhere else' },
  { es:'tu pelo hoy',                   en:'your hair today' },
  { es:'lo que te hizo salir de casa',  en:'what got you out of the house' },
  { es:'un postre que te inventas',     en:'a dessert you make up' },
  { es:'el último mensaje que leíste',  en:'the last message you read' },
  { es:'algo redondo que tengas cerca', en:'something round near you' },
  { es:'tu versión de ti mismo',        en:'your version of yourself' },
  { es:'una luna distinta',             en:'a different moon' },
  { es:'lo que te queda por hacer hoy', en:'what you still have to do today' },
  { es:'un sombrero para tu mascota',   en:'a hat for your pet' },
  { es:'algo que te gusta y da pena',   en:'something you like that makes you sad' },
  { es:'lo que pasó hoy, en un dibujo', en:'today, as one drawing' },
]

  /* CUÁNDO EMPIEZA «HOY».
   *
   * Dos cosas que hay que cumplir a la vez, y chocan:
   *
   * 1. La pregunta es LA MISMA para todo el mundo. No hay servidor detrás:
   *    se CALCULA a partir de la fecha. Si cada uno contara con su reloj
   *    local, dos amigos en husos distintos verían preguntas distintas y no
   *    podrían compararlas.
   *
   * 2. «Hoy» tiene que cambiar a una hora que sea de verdad un día nuevo.
   *    Contando en UTC a secas, la pregunta cambiaba a las 8 de la tarde en
   *    República Dominicana: a media cena, partiendo el día en dos.
   *
   * La salida es contar los días desde una medianoche CONCRETA, la misma
   * para todo el planeta: la de RD (UTC-4). Todos calculan el mismo número
   * —se cumple (1)— y ese número cambia a medianoche donde está casi toda
   * la gente que usa esto —se cumple (2)—.
   *
   * RD no cambia la hora en verano, así que un desfase fijo es exacto todo
   * el año. Si algún día la mayoría estuviera en otro sitio, se cambia este
   * número y ya.
   */
  var DESFASE_H = -4;          /* UTC-4: República Dominicana */

  function diaActual(ahora) {
    var ms = (ahora || Date.now()) + DESFASE_H * 3600000;
    return Math.floor(ms / 86400000);
  }

  function retoDelDia(ahora) {
    var n = RETOS.length;
    return RETOS[((diaActual(ahora) % n) + n) % n];
  }

  /* El texto en el idioma que se pida, con el inglés de respaldo. */
  function textoDelDia(idioma, ahora) {
    var r = retoDelDia(ahora);
    return r[idioma] || r.en;
  }

  global.SS = global.SS || {};
  global.SS.RETOS = RETOS;
  global.SS.DESFASE_H = DESFASE_H;
  global.SS.diaActual = diaActual;
  global.SS.retoDelDia = retoDelDia;
  global.SS.textoDelDia = textoDelDia;
})(typeof self !== 'undefined' ? self : this);
