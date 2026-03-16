import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@ngo/database";
import { createAndStartServer } from "../shared/create-server";

function registerTools(server: McpServer) {
  server.tool("check_send_eligibility", "Check donor send eligibility", {
    donorId: z.string(),
    channel: z.enum(["EMAIL", "WHATSAPP", "IN_APP"]),
  }, async ({ donorId, channel }) => {
    const donor = await prisma.donor.findUniqueOrThrow({ where: { id: donorId }, select: { notificationPrefs: true, unsubscribedAt: true } });
    const prefs = donor.notificationPrefs as Record<string, boolean>;
    const channelKey = channel === "EMAIL" ? "email" : channel === "WHATSAPP" ? "whatsapp" : "inApp";
    const eligible = prefs[channelKey] === true && !donor.unsubscribedAt;
    return { content: [{ type: "text", text: JSON.stringify({ eligible, reason: eligible ? null : "OPTED_OUT" }) }] };
  });

  server.tool("send_email", "Send email stub", {
    donorId: z.string(),
    subject: z.string(),
    htmlBody: z.string(),
    logId: z.string(),
  }, async ({ donorId, subject, logId }) => {
    console.error(`[messaging] STUB send_email donorId=${donorId} subject="${subject}" logId=${logId}`);
    return { content: [{ type: "text", text: JSON.stringify({ sent: false, reason: "STUB" }) }] };
  });

  server.tool("send_whatsapp", "Send WhatsApp stub", {
    donorId: z.string(),
    templateSid: z.string(),
    variables: z.record(z.string()),
    logId: z.string(),
  }, async ({ donorId, templateSid, logId }) => {
    console.error(`[messaging] STUB send_whatsapp donorId=${donorId} template=${templateSid} logId=${logId}`);
    return { content: [{ type: "text", text: JSON.stringify({ sent: false, reason: "STUB" }) }] };
  });
}

createAndStartServer("ngo-messaging", "1.0.0", registerTools);