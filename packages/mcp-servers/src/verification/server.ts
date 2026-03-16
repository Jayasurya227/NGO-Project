import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@ngo/database";
import { createAndStartServer } from "../shared/create-server";

function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    distance += xor.toString(2).split("").filter((b) => b === "1").length;
  }
  return distance;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function registerTools(server: McpServer) {
  server.tool("check_duplicate_image", "Check for duplicate images using pHash", {
    tenantId: z.string(),
    pHash: z.string(),
    threshold: z.number().default(10),
  }, async ({ tenantId, pHash, threshold }) => {
    const allEvidence = await prisma.evidence.findMany({
      where: { pHash: { not: null }, milestone: { initiative: { tenantId } } },
      select: { id: true, pHash: true, milestoneId: true },
    });
    const duplicates = allEvidence
      .filter((e) => e.pHash && hammingDistance(pHash, e.pHash) <= threshold)
      .map((e) => ({ evidenceId: e.id, milestoneId: e.milestoneId, distance: hammingDistance(pHash, e.pHash!) }));
    return { content: [{ type: "text", text: JSON.stringify({ hasDuplicates: duplicates.length > 0, duplicates }) }] };
  });

  server.tool("check_gps_distance", "Calculate GPS distance", {
    submittedLat: z.number(),
    submittedLng: z.number(),
    initiativeLat: z.number(),
    initiativeLng: z.number(),
    thresholdKm: z.number().default(5),
  }, async ({ submittedLat, submittedLng, initiativeLat, initiativeLng, thresholdKm }) => {
    const distKm = haversineKm(submittedLat, submittedLng, initiativeLat, initiativeLng);
    return { content: [{ type: "text", text: JSON.stringify({ distanceKm: Number(distKm.toFixed(3)), exceedsThreshold: distKm > thresholdKm, flag: distKm > thresholdKm ? `GPS_MISMATCH:${distKm.toFixed(1)}km` : null }) }] };
  });
}

createAndStartServer("ngo-verification", "1.0.0", registerTools);