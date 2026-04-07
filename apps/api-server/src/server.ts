import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv() {
  try {
    let envPath = resolve(process.cwd(), ".env");
    if (!require("fs").existsSync(envPath)) {
      envPath = resolve(process.cwd(), "../../.env");
    }
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) process.env[key] = value;
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
import { contentRoutes } from "./routes/content";
import { storyRoutes } from "./routes/stories";
import { milestonesRoutes } from "./routes/milestones";
import { evidenceRoutes } from "./routes/evidence";
import { donationsRoutes } from "./routes/donations";
import { websocketPlugin } from "./ws/plugin";
async function start() {
  const app = Fastify({ logger: false, ignoreTrailingSlash: true });
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];

  await app.register(cors, {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1,
      fields: 10,
    },
  });
  app.setErrorHandler((error: any, req, reply) => {
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
  
  // Register all routes with consistent /api prefix
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(requirementsRoutes, { prefix: "/api/requirements" });
  app.register(donorsRoutes, { prefix: "/api/donors" });
  app.register(initiativesRoutes, { prefix: "/api/initiatives" });
  app.register(agentRoutes, { prefix: "/api/agents" });
  app.register(contentRoutes, { prefix: "/api/content" });
  app.register(storyRoutes, { prefix: "/api/stories" });
  app.register(milestonesRoutes, { prefix: "/api/initiatives" }); // Mounts sub-routes under initiatives
  app.register(evidenceRoutes, { prefix: "/api/evidence" });
  app.register(donationsRoutes, { prefix: "/api/donations" });
  
  const port = parseInt(process.env.API_PORT ?? "4000");
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`✅ API server running on http://localhost:${port}`);
  console.log(app.printRoutes());
}
start().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});