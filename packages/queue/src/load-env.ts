import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  let envPath = resolve(process.cwd(), ".env");
  if (!require("fs").existsSync(envPath)) {
    envPath = resolve(process.cwd(), "../../.env");
  }
  try {
    const content = readFileSync(envPath, "utf-8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) process.env[key] = value;
    }
    console.log("ENV loaded - DB:", process.env.DATABASE_URL ? "YES" : "NO");
    console.log("ENV loaded - REDIS:", process.env.REDIS_URL ? "YES" : "NO");
  } catch (e) {
    console.error("Could not load .env:", e);
  }
}

loadEnv();