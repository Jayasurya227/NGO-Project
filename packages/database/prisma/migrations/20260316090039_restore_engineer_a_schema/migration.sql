/*
  Warnings:

  - You are about to drop the `agent_job_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `allocations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `beneficiaries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `communication_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `content_artifacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contracts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `donations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `donors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `evidence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `initiatives` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `match_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `milestones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `outcomes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sponsor_requirements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_results` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('NGO_ADMIN', 'PROGRAM_MANAGER', 'FIELD_WORKER', 'FINANCE_OFFICER', 'DRM', 'AUDITOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('CSR', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ReqStatus" AS ENUM ('PENDING_EXTRACTION', 'EXTRACTED', 'NEEDS_REVIEW', 'VALIDATED', 'MATCHED', 'CONTRACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('EDUCATION', 'HEALTHCARE', 'LIVELIHOOD', 'ENVIRONMENT', 'WATER_SANITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "InitiativeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FULLY_FUNDED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'FUNDED', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportCadence" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY', 'MILESTONE_BASED');

-- CreateEnum
CREATE TYPE "DataSharingLevel" AS ENUM ('AGGREGATE_ONLY', 'MILESTONE_EVIDENCE', 'ANONYMISED_BENEFICIARY');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'RECEIVED', 'ALLOCATED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'UPI', 'NEFT', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ALLOCATED', 'DISBURSED', 'REFUNDED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'GPS_CHECKIN', 'ATTENDANCE_LIST', 'TEXT_NOTE');

-- CreateEnum
CREATE TYPE "StoryVariant" AS ENUM ('DONOR_SAFE', 'PUBLIC_SAFE', 'CSR_COMPLIANCE');

-- CreateEnum
CREATE TYPE "StoryApproval" AS ENUM ('DRAFT', 'DIGNITY_REVIEWED', 'PM_APPROVED', 'ADMIN_APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('PITCH_DECK', 'PROPOSAL', 'EMAIL_DRAFT', 'WHATSAPP_DRAFT', 'SOCIAL_POST', 'IMPACT_REPORT');

-- CreateEnum
CREATE TYPE "ArtifactApproval" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CommChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');

-- CreateEnum
CREATE TYPE "CommStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "OutcomeDataStatus" AS ENUM ('PENDING', 'EXTRACTED', 'VALIDATED', 'INSUFFICIENT_DATA');

-- DropForeignKey
ALTER TABLE "agent_job_logs" DROP CONSTRAINT "agent_job_logs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "allocations" DROP CONSTRAINT "allocations_contractId_fkey";

-- DropForeignKey
ALTER TABLE "allocations" DROP CONSTRAINT "allocations_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "beneficiaries" DROP CONSTRAINT "beneficiaries_initiativeId_fkey";

-- DropForeignKey
ALTER TABLE "beneficiaries" DROP CONSTRAINT "beneficiaries_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "communication_logs" DROP CONSTRAINT "communication_logs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "content_artifacts" DROP CONSTRAINT "content_artifacts_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_milestoneId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "donations" DROP CONSTRAINT "donations_donorId_fkey";

-- DropForeignKey
ALTER TABLE "donations" DROP CONSTRAINT "donations_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "donors" DROP CONSTRAINT "donors_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "initiatives" DROP CONSTRAINT "initiatives_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "match_results" DROP CONSTRAINT "match_results_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "milestones" DROP CONSTRAINT "milestones_initiativeId_fkey";

-- DropForeignKey
ALTER TABLE "milestones" DROP CONSTRAINT "milestones_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "outcomes" DROP CONSTRAINT "outcomes_beneficiaryId_fkey";

-- DropForeignKey
ALTER TABLE "outcomes" DROP CONSTRAINT "outcomes_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "sponsor_requirements" DROP CONSTRAINT "sponsor_requirements_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "verification_results" DROP CONSTRAINT "verification_results_evidenceId_fkey";

-- DropForeignKey
ALTER TABLE "verification_results" DROP CONSTRAINT "verification_results_tenantId_fkey";

-- DropTable
DROP TABLE "agent_job_logs";

-- DropTable
DROP TABLE "allocations";

-- DropTable
DROP TABLE "audit_events";

-- DropTable
DROP TABLE "beneficiaries";

-- DropTable
DROP TABLE "communication_logs";

-- DropTable
DROP TABLE "content_artifacts";

-- DropTable
DROP TABLE "contracts";

-- DropTable
DROP TABLE "donations";

-- DropTable
DROP TABLE "donors";

-- DropTable
DROP TABLE "evidence";

-- DropTable
DROP TABLE "initiatives";

-- DropTable
DROP TABLE "match_results";

-- DropTable
DROP TABLE "milestones";

-- DropTable
DROP TABLE "outcomes";

-- DropTable
DROP TABLE "sponsor_requirements";

-- DropTable
DROP TABLE "stories";

-- DropTable
DROP TABLE "tenants";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "verification_results";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "customDomain" TEXT,
    "brandingConfig" JSONB NOT NULL,
    "featureFlags" JSONB NOT NULL DEFAULT '{}',
    "fcraRegistered" BOOLEAN NOT NULL DEFAULT false,
    "registrationNumber" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ONBOARDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "fullNameEnc" BYTEA NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phoneHash" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "DonorType" NOT NULL,
    "orgName" TEXT,
    "contactNameEnc" BYTEA NOT NULL,
    "emailEnc" BYTEA NOT NULL,
    "phoneEnc" BYTEA,
    "panHash" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "notificationPrefs" JSONB NOT NULL DEFAULT '{"email":true,"whatsapp":true,"inApp":true}',
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorRequirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "rawDocumentUrl" TEXT,
    "extractedFields" JSONB,
    "confidenceScores" JSONB,
    "status" "ReqStatus" NOT NULL DEFAULT 'PENDING_EXTRACTION',
    "version" INTEGER NOT NULL DEFAULT 1,
    "extractedByAgent" TEXT,
    "gapReportJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sector" "Sector" NOT NULL,
    "geography" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "targetBeneficiaries" INTEGER NOT NULL,
    "budgetRequired" DECIMAL(14,2) NOT NULL,
    "budgetFunded" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "InitiativeStatus" NOT NULL DEFAULT 'DRAFT',
    "embeddingVector" vector(768),
    "sdgTags" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "nameEnc" BYTEA NOT NULL,
    "dobYear" INTEGER,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianNameEnc" BYTEA,
    "guardianRelationship" TEXT,
    "consentL1" BOOLEAN NOT NULL DEFAULT false,
    "consentL2" BOOLEAN NOT NULL DEFAULT false,
    "consentL3" BOOLEAN NOT NULL DEFAULT false,
    "consentUpdatedAt" TIMESTAMP(3),
    "consentWithdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficiaryInitiative" (
    "beneficiaryId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BeneficiaryInitiative_pkey" PRIMARY KEY ("beneficiaryId","initiativeId")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "budgetAllocated" DECIMAL(14,2) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "evidenceRequirements" JSONB NOT NULL,
    "completionVerifiedBy" TEXT,
    "completionVerifiedAt" TIMESTAMP(3),
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "milestoneSchedule" JSONB NOT NULL,
    "reportingCadence" "ReportCadence" NOT NULL,
    "dataSharingLevel" "DataSharingLevel" NOT NULL,
    "contractDocUrl" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signedByNgoAt" TIMESTAMP(3),
    "signedByDonorAt" TIMESTAMP(3),
    "digioRequestId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "initiativeId" TEXT,
    "contractId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentGateway" "PaymentGateway" NOT NULL,
    "gatewayPaymentId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "receiptSentAt" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ALLOCATED',
    "disbursedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "fileUrl" TEXT,
    "fileSizeBytes" BIGINT,
    "gpsLat" DECIMAL(10,7),
    "gpsLng" DECIMAL(10,7),
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "verificationScore" INTEGER,
    "verificationFlags" TEXT[],
    "pHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationResult" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "flags" TEXT[],
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "kpiLabel" TEXT NOT NULL,
    "targetValue" DECIMAL(12,2),
    "actualValue" DECIMAL(12,2),
    "unit" TEXT,
    "dataStatus" "OutcomeDataStatus" NOT NULL DEFAULT 'PENDING',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "variant" "StoryVariant" NOT NULL,
    "contentJson" JSONB NOT NULL,
    "consentLevelsUsed" INTEGER[],
    "dignityScore" DECIMAL(3,1),
    "aiModelUsed" TEXT,
    "promptHash" TEXT,
    "approvalStatus" "StoryApproval" NOT NULL DEFAULT 'DRAFT',
    "approvedByPmAt" TIMESTAMP(3),
    "approvedByAdminAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "subScores" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "hardConstraintCheck" TEXT NOT NULL,
    "humanOverride" TEXT,
    "humanOverrideBy" TEXT,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentArtifact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "fileUrl" TEXT,
    "content" JSONB,
    "templateVersion" TEXT,
    "aiModelUsed" TEXT,
    "promptHash" TEXT,
    "approvalStatus" "ArtifactApproval" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "channel" "CommChannel" NOT NULL,
    "subject" TEXT,
    "status" "CommStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "messageIdExternal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevHash" TEXT,
    "currentHash" TEXT NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentJobLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- CreateIndex
CREATE INDEX "User_emailHash_idx" ON "User"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_emailHash_key" ON "User"("tenantId", "emailHash");

-- CreateIndex
CREATE INDEX "Donor_tenantId_idx" ON "Donor"("tenantId");

-- CreateIndex
CREATE INDEX "SponsorRequirement_tenantId_status_idx" ON "SponsorRequirement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Initiative_tenantId_sector_status_idx" ON "Initiative"("tenantId", "sector", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Beneficiary_anonId_key" ON "Beneficiary"("anonId");

-- CreateIndex
CREATE INDEX "Beneficiary_tenantId_idx" ON "Beneficiary"("tenantId");

-- CreateIndex
CREATE INDEX "Milestone_initiativeId_status_idx" ON "Milestone"("initiativeId", "status");

-- CreateIndex
CREATE INDEX "Contract_tenantId_status_idx" ON "Contract"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_gatewayPaymentId_key" ON "Donation"("gatewayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_idempotencyKey_key" ON "Donation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Donation_tenantId_donorId_idx" ON "Donation"("tenantId", "donorId");

-- CreateIndex
CREATE INDEX "Evidence_milestoneId_idx" ON "Evidence"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationResult_evidenceId_key" ON "VerificationResult"("evidenceId");

-- CreateIndex
CREATE INDEX "Story_tenantId_approvalStatus_idx" ON "Story"("tenantId", "approvalStatus");

-- CreateIndex
CREATE INDEX "MatchResult_requirementId_idx" ON "MatchResult"("requirementId");

-- CreateIndex
CREATE INDEX "ContentArtifact_tenantId_type_approvalStatus_idx" ON "ContentArtifact"("tenantId", "type", "approvalStatus");

-- CreateIndex
CREATE INDEX "CommunicationLog_tenantId_donorId_idx" ON "CommunicationLog"("tenantId", "donorId");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_entityType_entityId_idx" ON "AuditEvent"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_timestamp_idx" ON "AuditEvent"("tenantId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AgentJobLog_jobId_key" ON "AgentJobLog"("jobId");

-- CreateIndex
CREATE INDEX "AgentJobLog_tenantId_agentName_status_idx" ON "AgentJobLog"("tenantId", "agentName", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorRequirement" ADD CONSTRAINT "SponsorRequirement_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiaryInitiative" ADD CONSTRAINT "BeneficiaryInitiative_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiaryInitiative" ADD CONSTRAINT "BeneficiaryInitiative_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "SponsorRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationResult" ADD CONSTRAINT "VerificationResult_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "SponsorRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentArtifact" ADD CONSTRAINT "ContentArtifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentJobLog" ADD CONSTRAINT "AgentJobLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
