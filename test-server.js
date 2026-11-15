/* Servidor estático para las pruebas.

   Las pruebas servían las páginas con file://. Eso iba bien en Chromium,
   pero WebKit —el motor de Safari— rechaza por CORS cargar el SDK de
   Firebase desde file://, así que toda prueba daba un error de JS que no
   existe en la app de verdad.

   Y además file:// miente sobre las rutas de carpeta: "/app/" no resuelve
   a "/app/index.html" como hace GitHub Pages. Servir por HTTP es lo que
   se parece al sitio publicado.

   Uso:
     const { servir } = require('./test-server');
     const sitio = await servir();          // sitio.url -> http://127.0.0.1:PUERTO
     ...
     await sitio.cerrar();
*/
const http = require('http');
const fs = require('fs');
const path = require('path');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webm': 'video/webm',
};

async function servir(raiz = __dirname) {
  const srv = http.createServer((req, res) => {
    let ruta;
    try { ruta = decodeURIComponent(req.url.split('?')[0].split('#')[0]); }
    catch (e) { res.writeHead(400); res.end('400'); return; }
    if (ruta.endsWith('/')) ruta += 'index.html';

    const abs = path.join(raiz, ruta);
    /* Que una ruta con .. no se salga de la carpeta servida. */
    if (!abs.startsWith(raiz) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(abs)] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  });

  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port;
  return {
    url,
    pagina: p => url + '/' + String(p).replace(/^\/+/, ''),
    cerrar: () => new Promise(r => srv.close(r)),
  };
}

module.exports = { servir };

/* En este entorno de pruebas la red bloquea gstatic.com y googleapis.com,
   así que el SDK de Firebase nunca carga. Chromium lo reporta como error de
   red (que no llega a pageerror) y WebKit como error de CORS (que sí llega).
   Nada de eso pasa en la app publicada: es ruido del entorno.

   Esto deja pasar SOLO ese ruido. Cualquier otro error sí cuenta, que es
   justo lo que las pruebas deben cazar. */
const RUIDO_DEL_ENTORNO = [
  /Cross-origin script load denied/i,
  /Failed to load resource/i,
  /ERR_TUNNEL|ERR_BLOCKED|ERR_NAME_NOT_RESOLVED|net::ERR/i,
  /gstatic\.com|googleapis\.com|posthog\.com/i,
  /firebase is not defined/i,
];
function erroresDeLaApp(lista) {
  return (lista || []).filter(m => !RUIDO_DEL_ENTORNO.some(re => re.test(String(m))));
}
module.exports.erroresDeLaApp = erroresDeLaApp;

