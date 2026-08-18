#!/usr/bin/env node
/** Polls dev URLs and prints a ready banner once all services are up. */

const URLS = [
  { url: "http://localhost:3000", name: "Streaming (frontend)" },
  { url: "http://localhost:3001", name: "Admin dashboard" },
  { url: "http://localhost:4000/health/ready", name: "API (port 4000)" },
  { url: "http://localhost:4000/api/docs", name: "API Swagger docs" },
];

const TIMEOUT_MS = 120_000;
const INTERVAL_MS = 2_000;

async function isReady(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MS;
  const ready = new Set();

  console.log("\n[wait] Waiting for dev servers...\n");

  while (Date.now() < deadline) {
    for (const item of URLS) {
      if (ready.has(item.url)) continue;
      if (await isReady(item.url)) {
        ready.add(item.url);
        console.log(`[wait]   ready  ${item.name}`);
      }
    }

    if (ready.size === URLS.length) {
      console.log("\n========================================");
      console.log("  B28 Oncodex dev environment is ready");
      console.log("========================================");
      console.log("  Streaming:   http://localhost:3000");
      console.log("  Admin login: http://localhost:3001/login");
      console.log("  API/Swagger: http://localhost:4000/api/docs");
      console.log("========================================");
      console.log("  Press Ctrl+C to stop all servers.\n");
      return;
    }

    await sleep(INTERVAL_MS);
  }

  console.error("[wait] Timeout - some servers did not start in time.");
  for (const item of URLS) {
    if (!ready.has(item.url)) {
      console.error(`[wait]   pending  ${item.name} - ${item.url}`);
    }
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("[wait]", err);
  process.exit(1);
});
