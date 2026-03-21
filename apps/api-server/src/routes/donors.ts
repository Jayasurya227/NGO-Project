import { FastifyInstance } from "fastify";
import { prisma } from "@ngo/database";
import { encrypt, decrypt } from "@ngo/auth/encryption";
import { auditLog } from "@ngo/audit";
import { requirePermission } from "../middleware/rbac";
import { z } from "zod";

const CreateDonorBody = z.object({
  type: z.enum(["CSR", "INDIVIDUAL"]),
  orgName: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  notificationPrefs: z.object({
    email: z.boolean().default(true),
    whatsapp: z.boolean().default(true),
    inApp: z.boolean().default(true),
  }).default({ email: true, whatsapp: true, inApp: true }),
});

export async function donorsRoutes(app: FastifyInstance) {

  // GET /api/donors
  app.get("/api/donors", { preHandler: requirePermission("donor:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const page = Number((req.query as any).page) || 1;
    const limit = Number((req.query as any).limit) || 20;

    const [data, total] = await Promise.all([
      prisma.donor.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, type: true, orgName: true, kycStatus: true, createdAt: true },
      }),
      prisma.donor.count({ where: { tenantId } }),
    ]);

    return reply.send({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /api/donors/:id
  app.get("/api/donors/:id", { preHandler: requirePermission("donor:read") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as { id: string };

    const donor = await prisma.donor.findFirst({ where: { id, tenantId } });
    if (!donor) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Donor not found" } });

    return reply.send({
      success: true,
      data: {
        id: donor.id,
        type: donor.type,
        orgName: donor.orgName,
        contactName: await decrypt(donor.contactNameEnc),
        email: await decrypt(donor.emailEnc),
        phone: donor.phoneEnc ? await decrypt(donor.phoneEnc) : null,
        kycStatus: donor.kycStatus,
        createdAt: donor.createdAt,
      },
    });
  });

  // POST /api/donors
  app.post("/api/donors", { preHandler: requirePermission("donor:create") }, async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    const parsed = CreateDonorBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.issues },
      });
    }

    const body = parsed.data;
    const contactNameEnc = await encrypt(body.contactName);
    const emailEnc = await encrypt(body.email);
    const phoneEnc = body.phone ? await encrypt(body.phone) : null;

    const donor = await prisma.donor.create({
      data: {
        tenantId,
        type: body.type as any,
        orgName: body.orgName,
        contactNameEnc,
        emailEnc,
        phoneEnc: phoneEnc ?? undefined,
        notificationPrefs: body.notificationPrefs,
      },
      select: { id: true, type: true, orgName: true, createdAt: true },
    });

    await auditLog({
      tenantId,
      eventType: "DONOR_CREATED",
      entityType: "Donor",
      entityId: donor.id,
      actorId: userId,
      actorType: "USER",
      afterState: { type: body.type, orgName: body.orgName },
    });

    return reply.status(201).send({ success: true, data: donor });
  });
}