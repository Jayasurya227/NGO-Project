import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@ngo/database";
import { createAndStartServer } from "../shared/create-server";

function registerTools(server: McpServer) {
  server.tool(
    "find_similar_initiatives",
    "Find initiatives most semantically similar to a requirement using pgvector cosine similarity",
    {
      tenantId: z.string(),
      vector: z.array(z.number()).length(1536).describe("1536-dimensional embedding vector"),
      topK: z.number().min(1).max(20).default(10).describe("Number of results to return"),
      excludeStatuses: z.array(z.string()).default(["DRAFT", "CLOSED"]),
    },
    async ({ tenantId, vector, topK }) => {
      const results = await prisma.$queryRaw
        Array<{ id: string; title: string; sector: string; cosine_similarity: number }>
      >`
        SELECT
          id,
          title,
          sector,
          1 - ("embeddingVector" <=> ${`[${vector.join(",")}]`}::vector) AS cosine_similarity
        FROM "Initiative"
        WHERE "tenantId" = ${tenantId}
          AND "embeddingVector" IS NOT NULL
        ORDER BY "embeddingVector" <=> ${`[${vector.join(",")}]`}::vector
        LIMIT ${topK}
      `;

      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    }
  );

  server.tool(
    "check_initiative_has_embedding",
    "Check if an initiative has had its embedding vector generated",
    {
      initiativeId: z.string(),
      tenantId: z.string(),
    },
    async ({ initiativeId, tenantId }) => {
      const result = await prisma.$queryRaw<Array<{ has_embedding: boolean }>>`
        SELECT "embeddingVector" IS NOT NULL AS has_embedding
        FROM "Initiative"
        WHERE id = ${initiativeId} AND "tenantId" = ${tenantId}
      `;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ hasEmbedding: result[0]?.has_embedding ?? false }),
        }],
      };
    }
  );
}

createAndStartServer("ngo-vector-search", "1.0.0", registerTools);