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
  } catch {}
}
loadEnv();

import { runRequirementsAnalyst } from "../index";
import { prisma } from "@ngo/database";

const SAMPLE_RFP = `
Tata Consultancy Services Limited
Corporate Social Responsibility Department
Request for Proposal: FY 2025-26

1. PROGRAM OVERVIEW
TCS invites proposals from NGOs working in the Education sector in Maharashtra and
Karnataka for implementation of digital literacy programs in rural communities.

2. ELIGIBILITY CRITERIA
- Minimum 5 years of operational experience
- FCRA registration mandatory for all applicants
- Must have implemented minimum 3 similar programs

3. PROGRAM PARAMETERS
Geography: Tier 2 and Tier 3 towns and rural areas in Maharashtra (Vidarbha region preferred)
and Karnataka (North Karnataka districts)
Duration: 18 months, starting April 2025
Target Beneficiaries: Minimum 1,000 students per year, prioritising girls

4. FUNDING DETAILS
Total grant: Rs. 35-50 lakhs (INR 3,500,000 to 5,000,000)
Disbursement: Quarterly, subject to milestone completion and reporting compliance

5. REPORTING REQUIREMENTS
Quarterly progress reports
Financial audit at 6-month and 12-month milestones
Final impact assessment with third-party evaluation
`.trim();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: "shiksha-foundation" },
  });
  if (!tenant) throw new Error("No tenant found — run seed first");

  const donor = await prisma.donor.findFirst({ where: { tenantId: tenant.id } });
  if (!donor) {
    console.log("No donor found — creating a test donor...");
    const testDonor = await prisma.donor.create({
      data: {
        tenantId: tenant.id,
        type: "CSR",
        contactNameEnc: Buffer.from("Test Donor"),
        emailEnc: Buffer.from("test@donor.com"),
        orgName: "Test Corp",
      },
    });
    console.log("Test donor created:", testDonor.id);
    const req = await prisma.sponsorRequirement.create({
      data: { tenantId: tenant.id, donorId: testDonor.id, status: "PENDING_EXTRACTION" },
    });
    await runAndPrint(req.id, tenant.id);
  } else {
    const req = await prisma.sponsorRequirement.create({
      data: { tenantId: tenant.id, donorId: donor.id, status: "PENDING_EXTRACTION" },
    });
    await runAndPrint(req.id, tenant.id);
  }

  await prisma.$disconnect();
}

async function runAndPrint(reqId: string, tenantId: string) {
  console.log("Running Requirements Analyst on:", reqId);
  console.log("-".repeat(60));

  const result = await runRequirementsAnalyst({
    requirementId: reqId,
    tenantId,
    documentText: SAMPLE_RFP,
  });

  console.log("\nAgent result:", JSON.stringify(result, null, 2));

  const saved = await prisma.sponsorRequirement.findUnique({
    where: { id: reqId },
    select: { extractedFields: true, confidenceScores: true, status: true },
  });

  console.log("\nSaved to DB:", JSON.stringify(saved, null, 2));
  console.log("\nExpected:");
  console.log("  sector: EDUCATION");
  console.log("  geography.state: Maharashtra");
  console.log("  budget.minInr: 3500000, maxInr: 5000000");
  console.log("  durationMonths.value: 18");
  console.log("  requiresHumanReview: false");
}

main().catch(console.error);