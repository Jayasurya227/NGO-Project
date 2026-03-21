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

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { authRoutes } from "./routes/auth";
import { requirementsRoutes } from "./routes/requirements";
import { donorsRoutes } from "./routes/donors";
import { initiativesRoutes } from "./routes/initiatives";
import { agentRoutes } from "./routes/agents";
import { websocketPlugin } from "./ws/plugin";

async function start() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1,
      fields: 10,
    },
  });

  app.setErrorHandler((error, req, reply) => {
    console.error("[API Error]", error.message);
    reply.status(500).send({
      success: false,
      error: { code: "INTERNAL_ERROR", message: error.message ?? "Internal server error" },
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  }));

  await websocketPlugin(app);
  await authRoutes(app);
  await requirementsRoutes(app);
  await donorsRoutes(app);
  await initiativesRoutes(app);
  await agentRoutes(app);

  const port = parseInt(process.env.API_PORT ?? "4000");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`✅ API server running on http://localhost:${port}`);
}

start().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});