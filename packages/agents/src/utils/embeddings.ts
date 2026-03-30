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

import { prisma } from "@ngo/database";

/**
 * Mock embedding generator for development when AI keys are not available.
 * Returns a 3072-dimensional vector of small random numbers.
 */
export async function embedText(text: string): Promise<number[]> {
  console.log(`[MOCK] Generating mock embedding for text: ${text.slice(0, 50)}...`);
  // DB expects 3072 dimensions for this project
  return Array.from({ length: 3072 }, () => Math.random() * 0.1);
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