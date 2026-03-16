-- AlterTable
ALTER TABLE "agent_job_logs" ADD COLUMN "agentName" TEXT,
ADD COLUMN "error" TEXT,
ADD COLUMN "latencyMs" INTEGER,
ADD COLUMN "modelVersion" TEXT,
ADD COLUMN "promptHash" TEXT,
ADD COLUMN "tokensUsed" INTEGER,
ADD COLUMN "triggeredBy" TEXT;

-- AlterTable
ALTER TABLE "match_results" ADD COLUMN "explanation" TEXT,
ADD COLUMN "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "subScores" JSONB;

-- AlterTable
ALTER TABLE "sponsor_requirements" ADD COLUMN "confidenceScores" JSONB,
ADD COLUMN "donorId" TEXT,
ADD COLUMN "extractedFields" JSONB,
ADD COLUMN "gapReportJson" JSONB,
ADD COLUMN "rawDocumentUrl" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING_EXTRACTION',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;