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

import { runGapDiagnoser } from "./packages/agents/src/gap-diagnoser/index";
import { prisma } from "@ngo/database";

const REQ_ID = "371681b6-a6cc-453b-9db1-0963d203edea";

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: "shiksha-foundation" },
  });
  if (!tenant) throw new Error("No tenant found");

  console.log("Running Gap Diagnoser on:", REQ_ID);
  console.log("-".repeat(60));

  const report = await runGapDiagnoser({ requirementId: REQ_ID, tenantId: tenant.id });
  console.log("\nGap Report:", JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
