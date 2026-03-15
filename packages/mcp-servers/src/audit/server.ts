import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { auditLog } from "@ngo/audit";
import { createAndStartServer } from "../shared/create-server";

function registerTools(server: McpServer) {
  server.tool(
    "log_agent_event",
    "Write an immutable audit event. Agents may only write, never read, the audit log.",
    {
      tenantId: z.string(),
      eventType: z.string().describe("e.g. REQUIREMENT_EXTRACTED, MATCH_RESULTS_SAVED"),
      entityType: z.string().describe("e.g. SponsorRequirement, Initiative"),
      entityId: z.string(),
      afterState: z.record(z.unknown()).describe("The new state after this event"),
      metadata: z.record(z.unknown()).optional(),
    },
    async ({ tenantId, eventType, entityType, entityId, afterState, metadata }) => {
      await auditLog({
        tenantId,
        eventType,
        entityType,
        entityId,
        actorType: "AGENT",
        afterState,
        metadata,
      });

      return { content: [{ type: "text", text: JSON.stringify({ logged: true }) }] };
    }
  );
}

createAndStartServer("ngo-audit", "1.0.0", registerTools);