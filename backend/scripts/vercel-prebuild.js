/**
 * Run before install on Vercel so NestJS auto-detection never sees src/main.ts.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainTs = path.join(root, 'src', 'main.ts');
const hidden = path.join(root, 'scripts', 'bootstrap.dev.ts');

if (fs.existsSync(mainTs)) {
  fs.renameSync(mainTs, hidden);
  console.log('[vercel-prebuild] Moved src/main.ts -> scripts/bootstrap.dev.ts');
}
