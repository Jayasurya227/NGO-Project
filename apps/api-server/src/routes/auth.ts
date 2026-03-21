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

import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@ngo/database";
import { z } from "zod";
import * as jwt from "jsonwebtoken";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  subdomain: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      });
    }

    const { email, password, subdomain } = parsed.data;

    // Find tenant by subdomain
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
    });
    if (!tenant) {
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
      });
    }

    // Find user by plain email within tenant
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
}