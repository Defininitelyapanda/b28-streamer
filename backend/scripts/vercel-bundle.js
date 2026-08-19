/**
 * Bundle NestJS for Vercel serverless (Services omits node_modules from /var/task).
 * Outputs a self-contained src/server.js handler. Hides src/main.ts so Vercel does not
 * compile it to src/main.js (which would require external @nestjs/core at runtime).
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const entry = path.join(root, 'src', 'vercel-entry.ts');
const outfile = path.join(root, 'run.js');
const mainTs = path.join(root, 'src', 'main.ts');
const mainTsHidden = path.join(root, 'scripts', 'bootstrap.dev.ts');
const mainJs = path.join(root, 'src', 'main.js');

// Vercel auto-detects src/main.ts and compiles it even when entrypoint is server.js.
if (fs.existsSync(mainTs)) {
  fs.renameSync(mainTs, mainTsHidden);
  console.log('[vercel-bundle] Renamed src/main.ts -> scripts/bootstrap.dev.ts for deploy');
}
for (const stale of [mainJs, `${mainJs}.map`]) {
  if (fs.existsSync(stale)) {
    fs.unlinkSync(stale);
    console.log(`[vercel-bundle] Removed stale ${path.basename(stale)}`);
  }
}

esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  sourcemap: true,
  external: [
    '@prisma/client',
    '.prisma/client',
    'argon2',
    '@mapbox/node-pre-gyp',
    'class-transformer/storage',
    '@nestjs/websockets',
    '@nestjs/websockets/socket-module',
    '@nestjs/microservices',
    '@nestjs/microservices/microservices-module',
  ],
  logLevel: 'info',
});

console.log('[vercel-bundle] Wrote run.js from vercel-entry.ts');
