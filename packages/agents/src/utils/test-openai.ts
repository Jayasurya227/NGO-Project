import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { embedText } from "./embeddings";

async function main() {
  console.log("Testing Azure OpenAI connection...");
  console.log("Endpoint:", process.env.AZURE_OPENAI_ENDPOINT);
  console.log("Deployment:", process.env.AZURE_OPENAI_DEPLOYMENT);
  console.log("API Key set:", process.env.AZURE_OPENAI_API_KEY ? "YES" : "NO");

  const vector = await embedText("test text for embedding");
  console.log("Vector length:", vector.length);
  console.log("SUCCESS — Azure OpenAI is working");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
});