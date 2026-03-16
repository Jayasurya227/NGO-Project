import { readFileSync } from "fs";
import { resolve } from "path";

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
  } catch (e) {
    console.error("Could not load .env:", e);
  }
}
loadEnv();

import { embedText } from "./embeddings";

async function main() {
  console.log("Testing Vertex AI embedding...");
  console.log("Project:", process.env.GCP_PROJECT);
  console.log("Location:", process.env.GCP_LOCATION);
  console.log("Model:", process.env.GOOGLE_EMBEDDING_MODEL);

  const vector = await embedText(
    "Education program for rural children in Maharashtra"
  );

  console.log("Vector length:", vector.length);
  console.log("First value:", vector[0]);
  console.log("SUCCESS — Vertex AI embedding working");
}

main().catch((e) => console.error("FAILED:", e.message));