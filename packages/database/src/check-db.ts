import { PrismaClient } from "@prisma/client";

async function checkDb() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://ngo:ngo_dev_pass@localhost:5433/ngo_platform"
      }
    }
  });

  try {
    const tenants = await prisma.tenant.findMany();
    console.log("Tenants found:", tenants.map((t: any) => t.subdomain));

    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        tenantId: true
      }
    });
    console.log("Users found:", users);

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
}

checkDb();
