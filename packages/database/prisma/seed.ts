import { PrismaClient } from "@prisma/client";
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
      emailHash: "admin-hash",
      fullNameEnc: Buffer.from("Priya Sharma"),
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
      emailHash: "drm-hash",
      fullNameEnc: Buffer.from("Vikram Nair"),
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
      title: "Digital Literacy Program — Vidarbha Villages",
      sector: "EDUCATION",
      geography: { state: "Maharashtra", district: "Wardha", lat: 20.7453, lng: 78.6022 },
      description: "Equip 500 rural students with foundational digital skills through community learning centres.",
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

  const initiativesToSeed = [
    {
      id: "seed-init-2",
      title: "Mobile Health Clinics — Tribal Districts of Odisha",
      sector: "HEALTHCARE",
      geography: { state: "Odisha", district: "Koraput", lat: 18.8135, lng: 82.7118 },
      description: "Deploy 3 mobile health vans providing primary care to 15,000 tribal community members in remote Koraput.",
      targetBeneficiaries: 15000,
      budgetRequired: 4500000,
      sdgTags: ["SDG3", "SDG10"],
    },
    {
      id: "seed-init-3",
      title: "Women Entrepreneurship — Micro-Finance + Skill Training",
      sector: "LIVELIHOOD",
      geography: { state: "Rajasthan", district: "Barmer", lat: 25.7521, lng: 71.3967 },
      description: "Train 200 women from desert districts in tailoring and food processing, provide micro-loans up to 50,000.",
      targetBeneficiaries: 200,
      budgetRequired: 2800000,
      sdgTags: ["SDG1", "SDG5", "SDG8"],
    },
    {
      id: "seed-init-4",
      title: "Rainwater Harvesting — 50 Villages in Bundelkhand",
      sector: "WATER_SANITATION",
      geography: { state: "Madhya Pradesh", district: "Sagar", lat: 23.8388, lng: 78.7378 },
      description: "Build rooftop rainwater harvesting systems across 50 water-stressed villages providing clean water to 8,000 people.",
      targetBeneficiaries: 8000,
      budgetRequired: 3200000,
      sdgTags: ["SDG6", "SDG13"],
    },
    {
      id: "seed-init-5",
      title: "Solar Microgrids — Off-Grid Rural Electrification",
      sector: "ENVIRONMENT",
      geography: { state: "Bihar", district: "Araria", lat: 26.1478, lng: 87.4733 },
      description: "Install solar microgrids in 12 villages currently without electricity, powering 600 households and a primary school.",
      targetBeneficiaries: 3000,
      budgetRequired: 5500000,
      sdgTags: ["SDG7", "SDG13"],
    },
    {
      id: "seed-init-6",
      title: "Remedial Education Centres — Learning Recovery Post-COVID",
      sector: "EDUCATION",
      geography: { state: "Uttar Pradesh", district: "Bahraich", lat: 27.5742, lng: 81.5954 },
      description: "Run 20 remedial learning centres for 600 children who fell significantly behind during school closures.",
      targetBeneficiaries: 600,
      budgetRequired: 1200000,
      sdgTags: ["SDG4"],
    },
    {
      id: "seed-init-7",
      title: "Organic Farming Transition — Farmer Collective",
      sector: "LIVELIHOOD",
      geography: { state: "Karnataka", district: "Hassan", lat: 13.0033, lng: 76.0998 },
      description: "Support 150 smallholder farmers transition to organic farming through training, certification, and market linkage.",
      targetBeneficiaries: 150,
      budgetRequired: 1800000,
      sdgTags: ["SDG2", "SDG12"],
    },
  ];

  for (const init of initiativesToSeed) {
    await prisma.initiative.upsert({
      where: { id: init.id },
      update: {},
      create: {
        id: init.id,
        title: init.title,
        sector: init.sector as any,
        geography: init.geography as any,
        description: init.description,
        targetBeneficiaries: init.targetBeneficiaries,
        budgetRequired: init.budgetRequired,
        sdgTags: init.sdgTags,
        status: "ACTIVE",
        tenant: { connect: { id: tenantA.id } },
      },
    });
  }

  console.log("Seeded " + (initiativesToSeed.length + 1) + " initiatives");
  console.log("Seed complete. Test credentials:");
  console.log("   Admin: admin@shiksha.test / TestPass123!");
  console.log("   DRM:   drm@shiksha.test / TestPass123!");
}

main().catch(console.error).finally(() => prisma.$disconnect());