import { readFileSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";
import { join } from "path";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {}
}
loadEnv();

const tsxPath = join(process.cwd(), "apps", "api-server", "node_modules", ".bin", "tsx");

const workers = [
  {
    name: "Requirement Extraction Worker",
    file: "packages/queue/src/workers/requirement-extraction.worker.ts",
  },
  {
    name: "Gap Analysis Worker",
    file: "packages/queue/src/workers/gap-analysis.worker.ts",
  },
  {
    name: "Initiative Embedding Worker",
    file: "packages/queue/src/workers/initiative-embedding.worker.ts",
  },
];

console.log("🚀 Starting all AI workers...\n");

workers.forEach(({ name, file }) => {
  const proc = spawn(tsxPath, [file], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
  });

  proc.on("error", (err) => console.error(`[${name}] Error:`, err.message));
  proc.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[${name}] Exited with code ${code} — restarting in 5s...`);
      setTimeout(() => {
        spawn(tsxPath, [file], { stdio: "inherit", shell: true, env: { ...process.env } });
      }, 5000);
    }
  });

  console.log(`✅ Started: ${name}`);
});

console.log("\n✅ All workers running. Keep this terminal open.\n");
process.stdin.resume();