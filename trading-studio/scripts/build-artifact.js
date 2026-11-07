// Builds the web version as one self-contained HTML page (artifact/studio.html)
// for publishing as a claude.ai artifact.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

execSync('npx vite build --mode artifact', { stdio: 'inherit' });
const dir = 'dist-artifact';
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = [...html.matchAll(/<script[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g)].map((m) => fs.readFileSync(path.join(dir, m[1]), 'utf8'));
const css = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g)].map((m) => fs.readFileSync(path.join(dir, m[1]), 'utf8'));
const fonts = html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];
const safeJs = js.join('\n').replace(/<\/script/gi, '<\\/script');
const out = `<title>Thirty Eleven Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
html,body,#root{height:100%}
body{background:#05060d;color:#e6e8f2;margin:0}
${css.join('\n')}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;
fs.mkdirSync('artifact', { recursive: true });
fs.writeFileSync('artifact/studio.html', out);
console.log(`artifact/studio.html written (${(out.length / 1024).toFixed(0)} KB)`);
