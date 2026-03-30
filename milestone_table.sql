-- Add Milestone table
CREATE TABLE IF NOT EXISTS "Milestone" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "initiativeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Milestone_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE,
  CONSTRAINT "Milestone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

CREATE INDEX IF NOT EXISTS "Milestone_tenantId_idx" ON "Milestone"("tenantId");
CREATE INDEX IF NOT EXISTS "Milestone_initiativeId_idx" ON "Milestone"("initiativeId");
