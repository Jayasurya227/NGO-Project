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

import { prisma } from "@ngo/database";
import { runRequirementsAnalyst } from "./packages/agents/src/requirements-analyst/index";

const REQ_ID = "286efd99-9f7d-4c1a-9659-7c02978d02d4";

async function main() {
  const req = await prisma.sponsorRequirement.findUniqueOrThrow({
    where: { id: REQ_ID },
    include: { donor: { select: { orgName: true, type: true } } },
  });

  console.log(`Processing: ${req.donor.orgName} (${req.status})`);
  console.log(`Document URL: ${req.rawDocumentUrl ?? "none"}`);

  // Document text is not stored in DB — worker had it in memory but never ran.
  // Use donor name to give the AI enough context to attempt extraction.
  const documentText = `
CSR Requirement submitted by ${req.donor.orgName} (Type: ${req.donor.type}).
Document: ${req.rawDocumentUrl ?? "No document"}.
Please extract whatever fields you can. If sector is unclear, default to OTHER.
  `.trim();

  const result = await runRequirementsAnalyst({
    requirementId: REQ_ID,
    tenantId: req.tenantId,
    documentText,
  });

  console.log("Result:", JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
