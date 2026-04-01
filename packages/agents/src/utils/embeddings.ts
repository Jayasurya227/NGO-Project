import OpenAI from "openai";
import { prisma } from "@ngo/database";

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
  defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
});

export async function embedText(text: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT ?? "text-embedding-3-large",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
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