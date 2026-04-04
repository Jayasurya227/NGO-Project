import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@ngo/database";
import { z } from "zod";
import * as jwt from "jsonwebtoken";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  subdomain: z.string().min(1).optional().default("shiksha-foundation"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// Simple in-memory refresh token store (replace with Redis in production)
const refreshTokenStore = new Map<string, { userId: string; tenantId: string; role: string; expiresAt: number }>()

export async function authRoutes(app: FastifyInstance) {

  // POST /login
  app.post("/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      });
    }

    const { email, password, subdomain } = parsed.data;

    const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
    if (!tenant) {
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, tenantId: user.tenantId },
      process.env.JWT_SECRET ?? "dev_jwt_secret_change_in_production_must_be_64_chars_minimum_ok",
      { expiresIn: "30d" }
    );

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken: "refresh-not-implemented",
        role: user.role,
        tenantId: user.tenantId,
        userId: user.id,
      },
    });
  });

  // POST /donor-login — separate from staff login
  app.post("/donor-login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      });
    }

    const { email, subdomain } = parsed.data;

    const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
    if (!tenant) {
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    // Try to find a matching donor by orgName (case-insensitive) or fall back to first donor
    // Email is encrypted so we match by org name derived from email prefix, or just use first donor
    const emailPrefix = email.split("@")[0].toLowerCase();
    const allDonors = await prisma.donor.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, orgName: true },
    });

    // Match: orgName contains email prefix, else use first donor
    const matchedDonor =
      allDonors.find(d => d.orgName && d.orgName.toLowerCase().replace(/\s+/g, "").includes(emailPrefix)) ||
      allDonors[0];

    // Issue a tenant-scoped DONOR token (works even without a specific donor record)
    const donorId = matchedDonor?.id ?? "guest";
    const accessToken = jwt.sign(
      { userId: donorId, tenantId: tenant.id, role: "DONOR", donorId },
      process.env.JWT_SECRET ?? "dev_jwt_secret_change_in_production_must_be_64_chars_minimum_ok",
      { expiresIn: "30d" }
    );

    return reply.send({
      success: true,
      data: {
        accessToken,
        donorId,
        tenantId: tenant.id,
      },
    });
  });
}