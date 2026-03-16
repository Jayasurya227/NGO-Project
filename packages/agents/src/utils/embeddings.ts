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

import { VertexAI } from "@google-cloud/vertexai";
import { prisma } from "@ngo/database";

function getVertexClient() {
  return new VertexAI({
    project: process.env.GCP_PROJECT ?? "inspire-education-489506",
    location: process.env.GCP_LOCATION ?? "us-central1",
  });
}

/**
 * Convert text to a 768-dimensional vector using Vertex AI text-embedding-004.
 */
export async function embedText(text: string): Promise<number[]> {
  const vertexAI = getVertexClient();
  const model = vertexAI.getGenerativeModel({
    model: process.env.GOOGLE_EMBEDDING_MODEL ?? "text-embedding-004",
  });

  // Use the predict endpoint for embeddings
  const response = await fetch(
    `https://${process.env.GCP_LOCATION ?? "us-central1"}-aiplatform.googleapis.com/v1/projects/${process.env.GCP_PROJECT ?? "inspire-education-489506"}/locations/${process.env.GCP_LOCATION ?? "us-central1"}/publishers/google/models/${process.env.GOOGLE_EMBEDDING_MODEL ?? "text-embedding-004"}:predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        instances: [{ content: text.slice(0, 8000) }],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI embedding failed: ${response.status} ${error}`);
  }

  const data = await response.json() as {
    predictions: Array<{ embeddings: { values: number[] } }>;
  };

  return data.predictions[0].embeddings.values;
}

async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Could not get access token");
  return token.token;
}

export function buildInitiativeEmbeddingText(initiative: {
  title: string;
  sector: string;
  description: string;
  geography: Record<string, unknown>;
  sdgTags: string[];
  targetBeneficiaries: number;
}): string {
  const geo = initiative.geography as { state?: string; district?: string };
  return [
    `Title: ${initiative.title}`,
    `Sector: ${initiative.sector}`,
    `Location: ${geo.state ?? ""} ${geo.district ?? ""}`.trim(),
    `Beneficiaries: ${initiative.targetBeneficiaries}`,
    `SDG Goals: ${initiative.sdgTags.join(", ")}`,
    `Description: ${initiative.description}`,
  ].join("\n");
}

export async function embedAndSaveInitiative(initiativeId: string): Promise<void> {
  const initiative = await prisma.initiative.findUniqueOrThrow({
    where: { id: initiativeId },
  });

  const text = buildInitiativeEmbeddingText({
    title: initiative.title,
    sector: initiative.sector,
    description: initiative.description,
    geography: initiative.geography as Record<string, unknown>,
    sdgTags: initiative.sdgTags,
    targetBeneficiaries: initiative.targetBeneficiaries,
  });

  const vector = await embedText(text);
  const vectorString = `[${vector.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `UPDATE "Initiative" SET "embeddingVector" = '${vectorString}'::vector WHERE id = '${initiativeId}'`
  );
}