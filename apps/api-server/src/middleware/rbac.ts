import { FastifyRequest, FastifyReply } from "fastify";
import * as jwt from "jsonwebtoken";

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: { code: "UNAUTHORIZED", message: "No token provided" },
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "dev_jwt_secret_change_in_production_must_be_64_chars_minimum_ok"
    ) as any;
    (req as any).user = decoded;
    (req as any).tenantId = decoded.tenantId;
    (req as any).userId = decoded.userId;
    (req as any).role = decoded.role;
  } catch {
    return reply.status(401).send({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
}

// Role permission map
const PERMISSIONS: Record<string, string[]> = {
  NGO_ADMIN:       ["donor:read", "donor:create", "donor:update", "requirement:read", "requirement:create", "requirement:update", "initiative:read", "initiative:create", "initiative:update", "agent:read"],
  PROGRAM_MANAGER: ["donor:read", "requirement:read", "requirement:update", "initiative:read", "initiative:create", "initiative:update", "agent:read"],
  DRM:             ["donor:read", "donor:create", "donor:update", "requirement:read", "requirement:create", "requirement:update", "initiative:read", "agent:read"],
  FIELD_WORKER:    ["initiative:read"],
  FINANCE_OFFICER: ["donor:read", "requirement:read"],
  AUDITOR:         ["donor:read", "requirement:read", "initiative:read", "agent:read"],
};

export function requirePermission(permission: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await authenticate(req, reply);
    if (reply.sent) return;

    const role = (req as any).role;
    const allowed = PERMISSIONS[role] ?? [];
    if (!allowed.includes(permission)) {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: `Role ${role} cannot perform ${permission}` },
      });
    }
  };
}