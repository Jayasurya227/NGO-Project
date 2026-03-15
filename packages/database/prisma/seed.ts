import { PrismaClient } from "@prisma/client";
import { encrypt, hashForLookup } from "@ngo/auth/encryption";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const tenantA = await prisma.tenant.upsert({
    where: { subdomain: "shiksha-foundation" },
    update: {},
    create: {
      name: "Shiksha Foundation",
      subdomain: "shiksha-foundation",
      brandingConfig: { primaryColor: "#1D4ED8", logoUrl: null },
      featureFlags: { aiAgents: true, matchingAgent: true },
      status: "ACTIVE",
    },
  });

  const passwordHash = await bcrypt.hash("TestPass123!", 10);

  await prisma.user.upsert({
    where: { id: "seed-user-admin-a" },
    update: {},
    create: {
      id: "seed-user-admin-a",
      tenantId: tenantA.id,
      email: "admin@shiksha.test",
      emailHash: hashForLookup("admin@shiksha.test"),
      fullNameEnc: await encrypt("Priya Sharma"),
      passwordHash,
      role: "NGO_ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { id: "seed-user-drm-a" },
    update: {},
    create: {
      id: "seed-user-drm-a",
      tenantId: tenantA.id,
      email: "drm@shiksha.test",
      emailHash: hashForLookup("drm@shiksha.test"),
      fullNameEnc: await encrypt("Vikram Nair"),
      passwordHash,
      role: "DRM",
      status: "ACTIVE",
    },
  });

  const init1 = await prisma.initiative.upsert({
    where: { id: "seed-init-1" },
    update: {},
    create: {
      id: "seed-init-1",
      tenantId: tenantA.id,
      title: "Digital Literacy Program � Vidarbha Villages",
      sector: "EDUCATION",
      geography: { state: "Maharashtra", district: "Wardha", lat: 20.7453, lng: 78.6022 },
      description: "Equip 500 rural students with foundational digital skills.",
      targetBeneficiaries: 500,
      budgetRequired: 1500000,
      sdgTags: ["SDG4", "SDG10"],
      status: "ACTIVE",
    },
  });

  await prisma.milestone.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-ms-1-1",
        initiativeId: init1.id,
        title: "Setup 5 Learning Centres",
        description: "Procure computers, install internet, train 5 facilitators.",
        dueDate: new Date("2025-06-30"),
        budgetAllocated: 500000,
        sequenceOrder: 1,
        evidenceRequirements: { requiredTypes: ["PHOTO", "DOCUMENT"], minPhotoCount: 5, gpsRequired: true },
      },
      {
        id: "seed-ms-1-2",
        initiativeId: init1.id,
        title: "First 3 Months of Classes",
        description: "Conduct classes, record attendance, assess 250 students.",
        dueDate: new Date("2025-09-30"),
        budgetAllocated: 600000,
        sequenceOrder: 2,
        evidenceRequirements: { requiredTypes: ["PHOTO", "ATTENDANCE_LIST", "DOCUMENT"], minPhotoCount: 10, gpsRequired: false },
      },
    ],
  });

  console.log("Seed complete. Test credentials:");
  console.log("   Admin: admin@shiksha.test / TestPass123!");
  console.log("   DRM:   drm@shiksha.test / TestPass123!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
