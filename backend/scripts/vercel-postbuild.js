/**
 * Optional database setup during Vercel backend build.
 * Never fails the build — migrations also run at startup when DATABASE_URL is set.
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

if (!process.env.DATABASE_URL) {
  console.log("[vercel-postbuild] No DATABASE_URL — skipping migrate/seed");
  process.exit(0);
}

try {
  execSync("npm run prisma:migrate:deploy", { cwd: root, stdio: "inherit" });
  execSync("npm run prisma:seed-if-empty", { cwd: root, stdio: "inherit" });
  console.log("[vercel-postbuild] Database ready");
} catch (err) {
  console.warn(
    "[vercel-postbuild] Database setup failed (build continues; startup will retry):",
    err.message ?? err,
  );
}
