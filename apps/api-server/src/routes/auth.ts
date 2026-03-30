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
      { expiresIn: "8h" }
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

    // For donors: stub approach for Phase 2 scaffold
    const donor = await prisma.donor.findFirst({
      where: { tenantId: tenant.id },
      select: { id: true },
    });

    if (!donor) {
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Donor not found for this tenant" },
      });
    }

    // Issue a donor-scoped token
    const accessToken = jwt.sign(
      { userId: donor.id, tenantId: tenant.id, role: 'DONOR', donorId: donor.id },
      process.env.JWT_SECRET ?? "dev_jwt_secret_change_in_production_must_be_64_chars_minimum_ok",
      { expiresIn: '8h' }
    );

    return reply.send({
      success: true,
      data: {
        accessToken,
        donorId: donor.id,
        tenantId: tenant.id,
      }
    });
  });
}