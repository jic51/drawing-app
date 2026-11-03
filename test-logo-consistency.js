#!/usr/bin/env node
/*
 * Prueba de consistencia visual del logo SketchSend.
 *
 * El logo ("SketchSend ✏️") debe verse EXACTAMENTE igual en la app y en
 * la landing: misma fuente, mismo gradiente, misma animación. Solo el
 * tamaño puede variar.
 *
 * Correr:  node test-logo-consistency.js
 * Falla con código 1 si algo se desincroniza.
 */

const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'sketchsendv14.html');
const LANDING = path.join(__dirname, 'landing.html');

/* El gradiente canónico, tal como está en .titulo de la app. */
const GRADIENT = '#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#9400d3,#ff0000';
const FONT = 'Syne';
const WEIGHT = '800';
const ANIMATION = 'mover 2.5s linear infinite';
const BG_SIZE = '200% auto';

const failures = [];
const checks = [];

function check(name, condition, detail) {
  checks.push(name);
  if (!condition) failures.push(`${name}\n    → ${detail}`);
}

/* Quita espacios para comparar CSS sin depender del formato. */
function squash(s) {
  return s.replace(/\s+/g, '');
}

const app = fs.readFileSync(APP, 'utf8');
const landing = fs.readFileSync(LANDING, 'utf8');

/* ── 1. Extraer la regla canónica .titulo de la app ── */
const tituloMatch = app.match(/\.titulo\s*\{([^}]*)\}/);
check(
  'La app define .titulo',
  tituloMatch,
  'No se encontró la regla .titulo en sketchsendv14.html'
);

if (tituloMatch) {
  const titulo = squash(tituloMatch[1]);

  check(
    '.titulo usa la fuente Syne',
    /font-family:var\(--display\)/.test(titulo),
    `.titulo debe usar var(--display) (Syne). Encontrado: ${tituloMatch[1].trim()}`
  );
  check(
    '.titulo usa el gradiente canónico',
    titulo.includes(squash(GRADIENT)),
    `.titulo debe usar el gradiente ${GRADIENT}`
  );
  check(
    '.titulo usa la animación mover 2.5s',
    squash(titulo).includes(squash(ANIMATION)),
    `.titulo debe usar "animation:${ANIMATION}"`
  );
  check(
    '.titulo usa background-size 200% auto',
    titulo.includes(squash(BG_SIZE)),
    `.titulo debe usar "background-size:${BG_SIZE}"`
  );
}

/* ── 2. var(--display) debe ser Syne ── */
check(
  'var(--display) es Syne en la app',
  /--display:\s*'Syne'/.test(app),
  'La variable --display debe ser \'Syne\', sans-serif'
);

/* ── 3. El header de la app también debe animarse ── */
const hdrMatch = app.match(/\.hdr-logo\s*\{([^}]*)\}/);
check('La app define .hdr-logo', hdrMatch, 'No se encontró .hdr-logo');
if (hdrMatch) {
  const hdr = squash(hdrMatch[1]);
  check(
    '.hdr-logo está animado como .titulo',
    hdr.includes(squash(ANIMATION)),
    '.hdr-logo debe tener "animation:mover 2.5s linear infinite" igual que .titulo'
  );
  check(
    '.hdr-logo usa el gradiente canónico',
    hdr.includes(squash(GRADIENT)),
    `.hdr-logo debe usar el gradiente ${GRADIENT}`
  );
  check(
    '.hdr-logo usa la fuente Syne',
    /font-family:var\(--display\)/.test(hdr),
    '.hdr-logo debe usar var(--display)'
  );
}

/* ── 4. La landing define la clase canónica .ss-logo ── */
const ssMatch = landing.match(/\.ss-logo\s*\{([^}]*)\}/);
check(
  'La landing define .ss-logo',
  ssMatch,
  'La landing debe tener una clase .ss-logo compartida por todos los logos'
);

if (ssMatch) {
  const ss = squash(ssMatch[1]);
  check(
    '.ss-logo usa la fuente Syne',
    /font-family:'Syne'/.test(ss),
    `.ss-logo debe usar 'Syne'. Encontrado: ${ssMatch[1].trim()}`
  );
  check(
    '.ss-logo usa peso 900',
    ss.includes(`font-weight:${WEIGHT}`),
    `.ss-logo debe usar font-weight:${WEIGHT}`
  );
  check(
    '.ss-logo usa la animación mover 2.5s',
    ss.includes(squash(ANIMATION)),
    `.ss-logo debe usar "animation:${ANIMATION}"`
  );
  check(
    '.ss-logo usa background-size 200% auto',
    ss.includes(squash(BG_SIZE)),
    `.ss-logo debe usar "background-size:${BG_SIZE}"`
  );
}

/* ── 5. --rainbow de la landing == gradiente de la app ── */
const rainbowMatch = landing.match(/--rainbow:\s*linear-gradient\(90deg,([^)]*)\)/);
check(
  'La landing define --rainbow',
  rainbowMatch,
  'No se encontró la variable --rainbow'
);
if (rainbowMatch) {
  check(
    '--rainbow coincide con el gradiente de la app',
    squash(rainbowMatch[1]) === squash(GRADIENT),
    `--rainbow debe ser exactamente: ${GRADIENT}\n      Encontrado: ${rainbowMatch[1].trim()}`
  );
}

/* ── 6. La keyframe mover debe existir y coincidir en ambos ── */
for (const [label, src] of [['app', app], ['landing', landing]]) {
  const kf = src.match(/@keyframes\s+mover\s*\{([^}]*\}[^}]*)\}/);
  check(
    `La keyframe "mover" existe en la ${label}`,
    kf,
    `Falta "@keyframes mover" en la ${label}`
  );
  if (kf) {
    const body = squash(kf[1]);
    check(
      `La keyframe "mover" de la ${label} va de 0% a 200%`,
      body.includes('background-position:0%center') &&
        body.includes('background-position:200%center'),
      `La keyframe debe ir de 0% center a 200% center en la ${label}`
    );
  }
}

/* ── 7. Toda instancia del logo en la landing usa .ss-logo ── */
const logoInstances = [...landing.matchAll(/<[^>]*>\s*SketchSend\s*✏️/g)];
check(
  'La landing muestra el logo al menos una vez',
  logoInstances.length > 0,
  'No se encontró ninguna instancia de "SketchSend ✏️"'
);
logoInstances.forEach((m, i) => {
  check(
    `Instancia ${i + 1} del logo usa .ss-logo`,
    /class="[^"]*\bss-logo\b/.test(m[0]),
    `Esta instancia no tiene la clase ss-logo:\n      ${m[0].trim().slice(0, 120)}`
  );
});

/* ── 8. Ninguna animación de logo huérfana ── */
check(
  'No quedan animaciones "rainbowShift" sueltas',
  !/rainbowShift/.test(landing),
  'rainbowShift quedó en la landing — todo debe usar "mover" para estar sincronizado'
);

/* ── 9. El clon volador no debe sobrescribir la tipografía ── */
const flyMatch = landing.match(/clone\.style\.cssText\s*=\s*([^;]*(?:;[^']*)*?)';/);
if (flyMatch) {
  check(
    'El clon volador no fija font-family',
    !/font-family/.test(flyMatch[0]),
    'El cssText del clon no debe fijar font-family: anula .ss-logo a mitad del vuelo'
  );
  check(
    'El clon volador no fija letter-spacing',
    !/letter-spacing/.test(flyMatch[0]),
    'El cssText del clon no debe fijar letter-spacing: anula .ss-logo a mitad del vuelo'
  );
  check(
    'El clon volador no usa transition:all',
    !/transition:all/.test(squash(flyMatch[0])),
    'transition:all también anima background-position y pelea con la animación del arcoíris'
  );
}

/* ── 9b. La caja del logo debe ajustarse al texto ──
   background-size:200% se mide sobre la caja. Si la caja se estira a todo
   el ancho del padre, el texto solo cubre una fracción del degradado y se
   ve de un solo color: el arcoíris desaparece sin que el CSS del color
   cambie en nada. Pasó en el viewer y en el footer de la landing. */
for (const [label, src, sel] of [
  ['app .titulo', app, '\\.titulo'],
  ['app .hdr-logo', app, '\\.hdr-logo'],
  ['landing .ss-logo', landing, '\\.ss-logo'],
]) {
  const m = src.match(new RegExp(sel + '\\s*\\{([^}]*)\\}'));
  check(
    `${label} ajusta su caja al texto`,
    m && /width:\s*fit-content/.test(squash(m[1])),
    `${label} necesita "width:fit-content", si no el degradado se estira ` +
      `con el padre y el logo se ve de un solo color`
  );
}

/* ── 10. La landing carga la fuente Syne ── */
check(
  'La landing carga Syne desde Google Fonts',
  /fonts\.googleapis\.com[^"']*Syne/.test(landing),
  'La landing debe cargar la fuente Syne, si no el logo cae a una fuente genérica'
);

/* ── Reporte ── */
console.log('');
if (failures.length === 0) {
  console.log(`✅ Logo consistente — ${checks.length} verificaciones pasaron.`);
  console.log('   App y landing comparten fuente, gradiente y animación.\n');
  process.exit(0);
} else {
  console.log(`❌ ${failures.length} de ${checks.length} verificaciones fallaron:\n`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
