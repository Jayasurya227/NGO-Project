import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv() {
  const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}
loadEnv();

import { Redis } from "ioredis";

async function main() {
  console.log("REDIS_URL:", process.env.REDIS_URL?.slice(0, 40) + "...");
  const r = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
  try {
    const pong = await r.ping();
    console.log("Redis ping:", pong);
    // Check queued jobs
    const keys = await r.keys("bull:*");
    console.log("Bull queue keys:", keys.slice(0, 10));
  } catch (e: any) {
    console.error("Redis error:", e.message);
  } finally {
    await r.quit();
  }
}
main().catch(console.error);
