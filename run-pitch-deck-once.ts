import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv() {
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
}
loadEnv();

import { prisma } from "@ngo/database";
import { runPitchDeckAgent } from "./packages/agents/src/pitch-deck/index";

const REQ_ID = "34bb5967-0051-46b8-91ea-86687db8f20b";

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { subdomain: "shiksha-foundation" } });
  if (!tenant) throw new Error("No tenant found");

  // Fetch approved match IDs (top 3 ranked matches)
  const matches = await prisma.matchResult.findMany({
    where: { requirementId: REQ_ID },
    orderBy: { rank: "asc" },
    take: 3,
    select: { id: true, rank: true, overallScore: true, initiative: { select: { title: true } } },
  });

  if (matches.length === 0) throw new Error("No match results found — run matching agent first");

  console.log("Running Pitch Deck Agent on:", REQ_ID);
  console.log("Using matches:");
  matches.forEach(m => console.log(`  Rank ${m.rank}: ${m.initiative.title} (score: ${m.overallScore})`));
  console.log("-".repeat(60));

  const result = await runPitchDeckAgent({
    requirementId: REQ_ID,
    tenantId: tenant.id,
    approvedMatchIds: matches.map(m => m.id),
  });

  console.log("\nPitch Deck Result:", JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
