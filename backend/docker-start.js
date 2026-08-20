const fs = require('fs');

const manifests = [
  '/opt/backend/package.json',
  '/opt/backend/dist/package.json',
  '/opt/backend/dist/src/package.json',
];

for (const manifest of manifests) {
  if (!fs.existsSync(manifest)) continue;
  try {
    JSON.parse(fs.readFileSync(manifest, 'utf8'));
  } catch {
    fs.unlinkSync(manifest);
  }
}

require('/opt/backend/dist/src/main.cjs');
