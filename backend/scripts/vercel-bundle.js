/**
 * Bundle NestJS for Vercel serverless (Services monorepo omits node_modules from /var/task).
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const entry = path.join(root, 'src', 'main.ts');
const bundleFile = path.join(root, 'src', 'main.bundle.js');

esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: bundleFile,
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

// Stub entry keeps NestJS framework detection; runtime loads the bundle.
fs.writeFileSync(
  entry,
  `import '@nestjs/core';\nrequire('./main.bundle.js');\n`,
  'utf8',
);

console.log('[vercel-bundle] Wrote src/main.bundle.js and stub src/main.ts');
