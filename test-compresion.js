#!/usr/bin/env node
/*
 * Prueba de la compresión de trazos.
 *
 * Comprimir y descomprimir debe devolver el dibujo tal como estaba:
 * misma estructura, mismo orden de claves, misma cadena de "de".
 * Lo único que puede cambiar es precisión invisible — coords a ±0.05 px,
 * matiz a ±0.05°, grosor a ±0.005 px.
 *
 * Las funciones se EXTRAEN del HTML que se publica, no se copian aquí:
 * así la prueba siempre mide el código real y no una copia que se
 * desactualiza.
 *
 * Correr:  node test-compresion.js
 * Falla con código 1 si algo se rompe.
 */

const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'sketchsendv14.html');
const src = fs.readFileSync(APP, 'utf8');

const failures = [];
let checkCount = 0;

function check(name, condition, detail) {
  checkCount++;
  if (!condition) failures.push(`${name}\n    → ${detail}`);
}

/* ── Extraer las funciones del HTML publicado ── */
function extraer(nombre) {
  /* Toma desde "function nombre(" hasta la llave de cierre a nivel 0. */
  const inicio = src.indexOf(`function ${nombre}(`);
  if (inicio === -1) return null;
  let i = src.indexOf('{', inicio);
  let nivel = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') nivel++;
    else if (src[i] === '}') {
      nivel--;
      if (nivel === 0) return src.slice(inicio, i + 1);
    }
  }
  return null;
}

const piezas = ['_encColor', '_decColor', 'comprimirTrazos', 'descomprimirTrazos']
  .map(n => [n, extraer(n)]);

for (const [n, code] of piezas) {
  check(`Se encuentra ${n}() en el HTML`, code, `No se pudo extraer ${n} de sketchsendv14.html`);
}
if (piezas.some(([, c]) => !c)) {
  console.log('\n❌ No se pudieron extraer las funciones — se aborta.\n');
  process.exit(1);
}

const versionMatch = src.match(/const TRAZOS_V = (\d+)/);
check('Existe el marcador de versión TRAZOS_V', versionMatch, 'Falta "const TRAZOS_V"');

const sandbox = new Function(`
  const TRAZOS_V = ${versionMatch ? versionMatch[1] : 2};
  ${piezas.map(([, c]) => c).join('\n')}
  return { comprimirTrazos, descomprimirTrazos, TRAZOS_V };
`)();
const { comprimirTrazos, descomprimirTrazos, TRAZOS_V } = sandbox;

/* ── Generador: replica EXACTA de iniciarDibujo/dibujar/pararDibujo ── */
function Lienzo() {
  this.trazos = []; this.pilaRedo = []; this.ultimo = null;
  this.sid = 0; this.dibujando = false; this.hue = 0; this.t = 1730000000000;
}
Lienzo.prototype._t = function () { this.t += 16; return this.t; };
Lienzo.prototype.inicio = function (x, y, herramienta) {
  this.dibujando = true; this.sid++; this.ultimo = { x, y };
  this.trazos.push({ tipo:'inicio', x, y, h: herramienta || 'pincel',
    sid:this.sid, t:this._t(), origW:360, origH:640 });
  return this;
};
Lienzo.prototype.punto = function (x, y, modo) {
  if (!this.dibujando) return this;
  let color;
  if (modo === 'borrador') color = '#12121a';
  else if (modo === 'solido') color = '#ff6b6b';
  else { this.hue = (this.hue + 1.2) % 360; color = `hsl(${this.hue},100%,55%)`; }
  const gw = 0.5 + Math.random() * 6;
  this.trazos.push({ tipo:'seg', de:{...this.ultimo}, a:{x,y}, color, gw,
    sid:this.sid, t:this._t() });
  this.ultimo = { x, y };
  return this;
};
Lienzo.prototype.fin = function () {
  if (!this.dibujando) return this;
  this.dibujando = false; this.ultimo = null;
  this.trazos.push({ tipo:'fin', sid:this.sid, t:this._t() });
  return this;
};
Lienzo.prototype.deshacer = function () {
  let l = -1;
  for (let i = this.trazos.length - 1; i >= 0; i--) {
    if (this.trazos[i].sid !== undefined) { l = this.trazos[i].sid; break; }
  }
  if (l === -1) return this;
  this.pilaRedo.push(this.trazos.filter(t => t.sid === l));
  this.trazos = this.trazos.filter(t => t.sid !== l);
  return this;
};
Lienzo.prototype.rehacer = function () {
  if (this.pilaRedo.length) this.trazos.push(...this.pilaRedo.pop());
  return this;
};

/* ── Comparación tolerante a la precisión que sí se descarta ── */
const TOL_COORD = 0.05 + 1e-9;   /* 1 decimal */
const TOL_GW    = 0.005 + 1e-9;  /* 2 decimales */
const TOL_HUE   = 0.05 + 1e-9;   /* 1 decimal */

function hue(c) {
  const m = typeof c === 'string' && c.match(/^hsl\(([\d.]+),100%,55%\)$/);
  return m ? parseFloat(m[1]) : null;
}

/* Devuelve el primer desajuste, o null si todo coincide. */
function diferencia(orig, vuelta) {
  if (orig.length !== vuelta.length) {
    return `largo ${orig.length} → ${vuelta.length}`;
  }
  for (let i = 0; i < orig.length; i++) {
    const a = orig[i], b = vuelta[i];
    if (a.tipo !== b.tipo) return `[${i}] tipo ${a.tipo} → ${b.tipo}`;
    if (a.sid !== b.sid)   return `[${i}] sid ${a.sid} → ${b.sid}`;
    if (a.t !== b.t)       return `[${i}] t ${a.t} → ${b.t}`;

    /* El orden de claves también debe conservarse. */
    const ka = Object.keys(a).join(','), kb = Object.keys(b).join(',');
    if (ka !== kb) return `[${i}] claves "${ka}" → "${kb}"`;

    if (a.tipo === 'inicio') {
      if (Math.abs(a.x - b.x) > TOL_COORD) return `[${i}] x ${a.x} → ${b.x}`;
      if (Math.abs(a.y - b.y) > TOL_COORD) return `[${i}] y ${a.y} → ${b.y}`;
      if (a.h !== b.h)         return `[${i}] herramienta ${a.h} → ${b.h}`;
      if (a.origW !== b.origW) return `[${i}] origW ${a.origW} → ${b.origW}`;
      if (a.origH !== b.origH) return `[${i}] origH ${a.origH} → ${b.origH}`;
    }
    if (a.tipo === 'seg') {
      if (Math.abs(a.a.x - b.a.x) > TOL_COORD)   return `[${i}] a.x ${a.a.x} → ${b.a.x}`;
      if (Math.abs(a.a.y - b.a.y) > TOL_COORD)   return `[${i}] a.y ${a.a.y} → ${b.a.y}`;
      if (Math.abs(a.de.x - b.de.x) > TOL_COORD) return `[${i}] de.x ${a.de.x} → ${b.de.x}`;
      if (Math.abs(a.de.y - b.de.y) > TOL_COORD) return `[${i}] de.y ${a.de.y} → ${b.de.y}`;
      if (Math.abs(a.gw - b.gw) > TOL_GW)        return `[${i}] gw ${a.gw} → ${b.gw}`;
      const ha = hue(a.color), hb = hue(b.color);
      if (ha === null || hb === null) {
        if (a.color !== b.color) return `[${i}] color ${a.color} → ${b.color}`;
      } else if (Math.abs(ha - hb) > TOL_HUE) {
        return `[${i}] matiz ${ha} → ${hb}`;
      }
    }
  }
  return null;
}

/* La cadena debe quedar coherente: cada "de" es el "a" anterior del trazo. */
function cadenaCoherente(trazos) {
  let ancla = null;
  for (let i = 0; i < trazos.length; i++) {
    const e = trazos[i];
    if (e.tipo === 'inicio') { ancla = { x:e.x, y:e.y }; continue; }
    if (e.tipo === 'fin')    { ancla = null; continue; }
    if (e.tipo === 'seg') {
      if (!ancla) return `[${i}] seg sin ancla`;
      if (e.de.x !== ancla.x || e.de.y !== ancla.y) {
        return `[${i}] de ${JSON.stringify(e.de)} ≠ punto previo ${JSON.stringify(ancla)}`;
      }
      ancla = { x:e.a.x, y:e.a.y };
    }
  }
  return null;
}

function rodar(nombre, trazos) {
  const comp = comprimirTrazos(trazos);
  const vuelta = descomprimirTrazos(comp);
  check(`Ida y vuelta: ${nombre}`, diferencia(trazos, vuelta) === null,
    diferencia(trazos, vuelta));
  check(`Cadena "de" coherente: ${nombre}`, cadenaCoherente(vuelta) === null,
    cadenaCoherente(vuelta));
  /* Los "de" no deben compartir referencia con el "a" anterior. */
  let compartida = false;
  for (let i = 1; i < vuelta.length; i++) {
    if (vuelta[i].tipo === 'seg' && vuelta[i-1].tipo === 'seg'
        && vuelta[i].de === vuelta[i-1].a) compartida = true;
  }
  check(`Sin referencias compartidas: ${nombre}`, !compartida,
    'El "de" reconstruido apunta al mismo objeto que el "a" anterior');
  return comp;
}

/* ── 1-2. Fidelidad de ida y vuelta ── */
rodar('un trazo simple',
  new Lienzo().inicio(10,10).punto(20,20).punto(30,30).fin().trazos);

rodar('trazos separados y lejanos',
  new Lienzo().inicio(10,10).punto(20,20).fin()
              .inicio(500,500).punto(510,510).fin()
              .inicio(90,5).punto(95,8).punto(99,12).fin().trazos);

rodar('tras deshacer',
  new Lienzo().inicio(10,10).punto(20,20).fin()
              .inicio(50,50).punto(60,60).fin().deshacer().trazos);

rodar('tras deshacer y rehacer',
  new Lienzo().inicio(10,10).punto(20,20).fin()
              .inicio(50,50).punto(60,60).fin()
              .deshacer().rehacer().trazos);

rodar('dibujar despues de deshacer (sid no contiguo)',
  new Lienzo().inicio(10,10).punto(20,20).fin()
              .inicio(50,50).punto(60,60).fin()
              .deshacer()
              .inicio(99,99).punto(80,80).fin().trazos);

rodar('color solido',
  new Lienzo().inicio(1,1).punto(2,2,'solido').punto(3,3,'solido').fin().trazos);

rodar('borrador',
  new Lienzo().inicio(1,1).punto(2,2,'borrador').punto(3,3,'borrador').fin().trazos);

rodar('mezcla arcoiris + solido + borrador',
  new Lienzo().inicio(1,1).punto(2,2).fin()
              .inicio(10,10).punto(11,11,'solido').fin()
              .inicio(20,20).punto(21,21,'borrador').fin().trazos);

rodar('coordenadas con muchos decimales',
  new Lienzo().inicio(10.123456789, 20.987654321)
              .punto(30.111111111, 40.999999999)
              .punto(50.555555555, 60.444444444).fin().trazos);

/* ── 3. Formato viejo pasa sin tocarse ── */
const viejo = new Lienzo().inicio(10,10).punto(20,20).fin().trazos;
const salida = descomprimirTrazos(viejo);
check('El formato viejo (array plano) pasa intacto',
  JSON.stringify(salida) === JSON.stringify(viejo),
  'descomprimirTrazos alteró un sketch en formato antiguo');
check('El formato viejo devuelve el mismo array',
  salida === viejo,
  'Debería devolverse tal cual, sin copiar');

/* ── 4. Casos degenerados ── */
const vacio = descomprimirTrazos(comprimirTrazos([]));
check('Un dibujo vacío sobrevive', Array.isArray(vacio) && vacio.length === 0,
  `Se esperaba [], llegó ${JSON.stringify(vacio)}`);

rodar('un "inicio" sin segmentos', new Lienzo().inicio(5,5).trazos);
rodar('"inicio" + "fin" sin segmentos', new Lienzo().inicio(5,5).fin().trazos);

/* Entradas corruptas no deben tirar la app. */
let aguanta = true;
for (const malo of [null, undefined, 0, 'texto', {}, { v:99, d:'[]' }, { v:TRAZOS_V, d:'no-json' }]) {
  try {
    const r = descomprimirTrazos(malo);
    if (!Array.isArray(r)) aguanta = false;
  } catch (e) { aguanta = false; }
}
check('Entradas corruptas devuelven [] sin lanzar error', aguanta,
  'descomprimirTrazos lanzó o devolvió algo que no es un array');

/* ── 5. Reducción de tamaño ── */
const l = new Lienzo();
l.inicio(100, 200);
for (let i = 0; i < 2000; i++) l.punto(100 + Math.random()*300, 200 + Math.random()*400);
l.fin();
const real = l.trazos;

const antes = Buffer.byteLength(JSON.stringify(real), 'utf8');
const comp = comprimirTrazos(real);
/* Tamaño en Firestore: el string cuesta sus bytes + 1. */
const despues = Buffer.byteLength(comp.d, 'utf8') + 1;
const ahorro = 100 - (despues / antes) * 100;
const porPuntoAntes = antes / real.length;
const porPuntoDespues = despues / real.length;

check('La reducción de tamaño llega al 60%', ahorro >= 60,
  `Solo se redujo ${ahorro.toFixed(1)}%`);

const LIMITE = 1048576;
const techoAntes = Math.floor(LIMITE / porPuntoAntes);
const techoDespues = Math.floor(LIMITE / porPuntoDespues);

/* ── Reporte ── */
console.log('');
console.log('  Tamaño medido sobre un dibujo real de 2.000 puntos');
console.log('  ' + '─'.repeat(58));
console.log('    antes:   ' + String(porPuntoAntes.toFixed(1)).padStart(6) + ' B/punto   '
  + (antes/1024).toFixed(0).padStart(4) + ' KB   techo ' + techoAntes.toLocaleString().padStart(7)
  + ' puntos (' + (techoAntes/60).toFixed(0) + 's)');
console.log('    después: ' + String(porPuntoDespues.toFixed(1)).padStart(6) + ' B/punto   '
  + (despues/1024).toFixed(0).padStart(4) + ' KB   techo ' + techoDespues.toLocaleString().padStart(7)
  + ' puntos (' + (techoDespues/60).toFixed(0) + 's)');
console.log('    ahorro:  ' + ahorro.toFixed(1) + '%   ·   '
  + (techoDespues/techoAntes).toFixed(1) + 'x más margen para el usuario');
console.log('');

if (failures.length === 0) {
  console.log(`✅ Compresión correcta — ${checkCount} verificaciones pasaron.\n`);
  process.exit(0);
} else {
  console.log(`❌ ${failures.length} de ${checkCount} verificaciones fallaron:\n`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
