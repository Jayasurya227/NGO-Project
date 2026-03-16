import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env") });

import OpenAI from "openai";

async function main() {
  console.log("Endpoint:", process.env.AZURE_OPENAI_ENDPOINT);
  console.log("Deployment:", process.env.AZURE_OPENAI_DEPLOYMENT);
  console.log("API Key set:", process.env.AZURE_OPENAI_API_KEY ? "YES" : "NO");

  const client = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
    defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
    defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
  });

  const response = await client.embeddings.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
    input: "test text",
  });

  console.log("Vector length:", response.data[0].embedding.length);
  console.log("SUCCESS");
}

main().catch((e) => console.error("FAILED:", e.message));