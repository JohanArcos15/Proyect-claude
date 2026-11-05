// Genera build/vocablo-artifact.html: la app en un solo archivo (CSS y JS
// incrustados) para publicarla como artefacto de claude.ai.
//   node vocablo/build-artifact.js
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');

const body = /<body>([\s\S]*)<\/body>/.exec(html)[1];
const fonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(html)[0];

const inner = body.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const js = fs.readFileSync(path.join(dir, src), 'utf8');
  if (/<\/script/i.test(js)) throw new Error(src + ' contiene «</script»');
  return '<script>\n' + js.trim() + '\n</script>';
});

const out =
  '<title>Vocablo</title>\n' +
  '<meta name="claude:viewport-fit-sides" content="cover">\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  fonts +
  '\n<style>\n' +
  css.trim() +
  '\n</style>\n' +
  inner.trim() +
  '\n';

const outDir = path.join(dir, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'vocablo-artifact.html');
fs.writeFileSync(outFile, out);
console.log(outFile, (out.length / 1024).toFixed(1) + ' KB');
