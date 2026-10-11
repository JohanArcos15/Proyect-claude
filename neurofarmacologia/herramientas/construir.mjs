// Empaqueta la app en dos archivos (app.js y app.css) para que index.html
// funcione abriéndolo directamente, sin servidor y sin internet.
import * as esbuild from 'esbuild';

const vigilar = process.argv.includes('--watch');
const comun = { bundle: true, minify: !vigilar, logLevel: 'info', legalComments: 'eof' };
const js = {
  ...comun,
  entryPoints: ['src/main.js'],
  outfile: 'app.js',
  format: 'iife',
  target: ['es2020'],
  loader: { '.bin': 'binary', '.gz': 'binary', '.svg': 'text' },
  sourcemap: vigilar ? 'inline' : false,
};
const css = { ...comun, entryPoints: ['src/estilos.css'], outfile: 'app.css', loader: { '.woff2': 'file' }, external: ['*.woff2'] };

if (vigilar) {
  const a = await esbuild.context(js);
  const b = await esbuild.context(css);
  await Promise.all([a.watch(), b.watch()]);
} else {
  await Promise.all([esbuild.build(js), esbuild.build(css)]);
}
