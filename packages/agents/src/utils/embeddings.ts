import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../../.env"),
  ];
  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (key) process.env[key] = value;
      }
      break;
    } catch {}
  }
}
loadEnv();

import { prisma } from "@ngo/database";

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set — cannot generate embeddings");

  const model = process.env.GOOGLE_EMBEDDING_MODEL ?? "gemini-embedding-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
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

  await prisma.$executeRaw`UPDATE "Initiative" SET "embeddingVector" = ${vectorString}::vector WHERE id::text = ${initiativeId}`;
}