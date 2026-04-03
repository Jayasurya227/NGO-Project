-- ============================================================
-- Job Queue Table — replaces Redis/BullMQ
-- Run this in: Supabase → SQL Editor → New Query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS "JobQueue" (
  "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"    TEXT        NOT NULL,
  "jobType"     TEXT        NOT NULL,
  -- requirement-extraction | gap-analysis | initiative-matching
  -- pitch-deck | initiative-embedding

  "entityId"    TEXT        NOT NULL,
  -- requirementId or initiativeId depending on jobType

  "status"      TEXT        NOT NULL DEFAULT 'PENDING',
  -- PENDING | RUNNING | COMPLETED | FAILED

  "payload"     JSONB       NOT NULL DEFAULT '{}',
  "result"      JSONB,
  "errorMsg"    TEXT,
  "attempts"    INTEGER     NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER     NOT NULL DEFAULT 3,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "startedAt"   TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ
);

-- Indexes for fast polling by workers
CREATE INDEX IF NOT EXISTS "JobQueue_status_jobType_idx"
  ON "JobQueue" ("status", "jobType");

CREATE INDEX IF NOT EXISTS "JobQueue_tenantId_entityId_idx"
  ON "JobQueue" ("tenantId", "entityId");

-- ============================================================
-- How workers will use this table:
--
-- 1. API adds a job:
--    INSERT INTO "JobQueue" (tenantId, jobType, entityId, payload)
--    VALUES (..., 'requirement-extraction', 'req-uuid', '{"documentText":"..."}')
--
-- 2. Worker polls every 5 seconds:
--    SELECT * FROM "JobQueue"
--    WHERE status = 'PENDING' AND jobType = 'requirement-extraction'
--    ORDER BY "createdAt" ASC LIMIT 1
--    FOR UPDATE SKIP LOCKED   ← prevents two workers grabbing same job
--
-- 3. Worker marks RUNNING, processes, marks COMPLETED or FAILED
-- ============================================================
