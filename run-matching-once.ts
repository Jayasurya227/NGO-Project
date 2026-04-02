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

import { runMatchingAgent } from "./packages/agents/src/matching/index";
import { prisma } from "@ngo/database";

const REQ_ID = "4eac03ce-4aa3-41ef-8f96-680bd7f4e21e";

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: "shiksha-foundation" },
  });
  if (!tenant) throw new Error("No tenant found");

  console.log("Running Matching Agent on:", REQ_ID);
  console.log("-".repeat(60));

  const result = await runMatchingAgent({ requirementId: REQ_ID, tenantId: tenant.id });
  console.log("\nMatching Result:", JSON.stringify(result, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
