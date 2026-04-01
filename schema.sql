--
-- PostgreSQL database dump
--

\restrict r7xoX9A57t9NI9p8kzgDHTEyCUeh1JhDWQYfwel3oxKtpHpo9AAGTnHrkmVHiqQ

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg12+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: AllocationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AllocationStatus" AS ENUM (
    'ALLOCATED',
    'DISBURSED',
    'REFUNDED',
    'ON_HOLD'
);


--
-- Name: ArtifactApproval; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArtifactApproval" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'PUBLISHED'
);


--
-- Name: ArtifactType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArtifactType" AS ENUM (
    'PITCH_DECK',
    'PROPOSAL',
    'EMAIL_DRAFT',
    'WHATSAPP_DRAFT',
    'SOCIAL_POST',
    'IMPACT_REPORT'
);


--
-- Name: CommChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CommChannel" AS ENUM (
    'EMAIL',
    'WHATSAPP',
    'IN_APP'
);


--
-- Name: CommStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CommStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'OPENED',
    'CLICKED',
    'BOUNCED',
    'FAILED'
);


--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'SIGNED',
    'ACTIVE',
    'COMPLETED',
    'SUSPENDED',
    'CANCELLED'
);


--
-- Name: DataSharingLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DataSharingLevel" AS ENUM (
    'AGGREGATE_ONLY',
    'MILESTONE_EVIDENCE',
    'ANONYMISED_BENEFICIARY'
);


--
-- Name: DonationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DonationStatus" AS ENUM (
    'PENDING',
    'RECEIVED',
    'ALLOCATED',
    'REFUNDED',
    'FAILED'
);


--
-- Name: DonorType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DonorType" AS ENUM (
    'CSR',
    'INDIVIDUAL'
);


--
-- Name: EvidenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EvidenceType" AS ENUM (
    'PHOTO',
    'VIDEO',
    'DOCUMENT',
    'GPS_CHECKIN',
    'ATTENDANCE_LIST',
    'TEXT_NOTE'
);


--
-- Name: InitiativeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InitiativeStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'FULLY_FUNDED',
    'IN_PROGRESS',
    'COMPLETED',
    'CLOSED'
);


--
-- Name: JobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'RETRYING'
);


--
-- Name: KycStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."KycStatus" AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'VERIFIED'
);


--
-- Name: MilestoneStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MilestoneStatus" AS ENUM (
    'PLANNED',
    'FUNDED',
    'IN_PROGRESS',
    'EVIDENCE_SUBMITTED',
    'COMPLETED',
    'OVERDUE'
);


--
-- Name: OutcomeDataStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OutcomeDataStatus" AS ENUM (
    'PENDING',
    'EXTRACTED',
    'VALIDATED',
    'INSUFFICIENT_DATA'
);


--
-- Name: PaymentGateway; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentGateway" AS ENUM (
    'RAZORPAY',
    'UPI',
    'NEFT',
    'CHEQUE',
    'OTHER'
);


--
-- Name: ReportCadence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReportCadence" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'HALF_YEARLY',
    'ANNUALLY',
    'MILESTONE_BASED'
);


--
-- Name: ReqStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReqStatus" AS ENUM (
    'PENDING_EXTRACTION',
    'EXTRACTED',
    'NEEDS_REVIEW',
    'VALIDATED',
    'MATCHED',
    'CONTRACTED',
    'CLOSED'
);


--
-- Name: Sector; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Sector" AS ENUM (
    'EDUCATION',
    'HEALTHCARE',
    'LIVELIHOOD',
    'ENVIRONMENT',
    'WATER_SANITATION',
    'OTHER'
);


--
-- Name: StoryApproval; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StoryApproval" AS ENUM (
    'DRAFT',
    'DIGNITY_REVIEWED',
    'PM_APPROVED',
    'ADMIN_APPROVED',
    'PUBLISHED',
    'REJECTED'
);


--
-- Name: StoryVariant; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StoryVariant" AS ENUM (
    'DONOR_SAFE',
    'PUBLIC_SAFE',
    'CSR_COMPLIANCE'
);


--
-- Name: TenantStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantStatus" AS ENUM (
    'ONBOARDING',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'NGO_ADMIN',
    'PROGRAM_MANAGER',
    'FIELD_WORKER',
    'FINANCE_OFFICER',
    'DRM',
    'AUDITOR'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AgentJobLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AgentJobLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "agentName" text NOT NULL,
    "jobId" text NOT NULL,
    "modelVersion" text NOT NULL,
    "promptHash" text NOT NULL,
    "inputTokens" integer,
    "outputTokens" integer,
    "latencyMs" integer,
    status public."JobStatus" DEFAULT 'QUEUED'::public."JobStatus" NOT NULL,
    error text,
    "triggeredBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


--
-- Name: Allocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Allocation" (
    id text NOT NULL,
    "donationId" text NOT NULL,
    "milestoneId" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    status public."AllocationStatus" DEFAULT 'ALLOCATED'::public."AllocationStatus" NOT NULL,
    "disbursedAt" timestamp(3) without time zone,
    "confirmedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AuditEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "eventType" text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "actorId" text,
    "actorType" text,
    "beforeState" jsonb,
    "afterState" jsonb NOT NULL,
    metadata jsonb,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "prevHash" text,
    "currentHash" text NOT NULL
);


--
-- Name: Beneficiary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Beneficiary" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "anonId" text NOT NULL,
    "nameEnc" bytea NOT NULL,
    "dobYear" integer,
    "isMinor" boolean DEFAULT false NOT NULL,
    "guardianNameEnc" bytea,
    "guardianRelationship" text,
    "consentL1" boolean DEFAULT false NOT NULL,
    "consentL2" boolean DEFAULT false NOT NULL,
    "consentL3" boolean DEFAULT false NOT NULL,
    "consentUpdatedAt" timestamp(3) without time zone,
    "consentWithdrawnAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BeneficiaryInitiative; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BeneficiaryInitiative" (
    "beneficiaryId" text NOT NULL,
    "initiativeId" text NOT NULL,
    "enrolledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CommunicationLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommunicationLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "donorId" text NOT NULL,
    channel public."CommChannel" NOT NULL,
    subject text,
    status public."CommStatus" DEFAULT 'PENDING'::public."CommStatus" NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "openedAt" timestamp(3) without time zone,
    "clickedAt" timestamp(3) without time zone,
    "bouncedAt" timestamp(3) without time zone,
    "messageIdExternal" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ContentArtifact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentArtifact" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    type public."ArtifactType" NOT NULL,
    "fileUrl" text,
    content jsonb,
    "templateVersion" text,
    "aiModelUsed" text,
    "promptHash" text,
    "approvalStatus" public."ArtifactApproval" DEFAULT 'DRAFT'::public."ArtifactApproval" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    "relatedEntityType" text,
    "relatedEntityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Contract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Contract" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "requirementId" text NOT NULL,
    "donorId" text NOT NULL,
    "milestoneSchedule" jsonb NOT NULL,
    "reportingCadence" public."ReportCadence" NOT NULL,
    "dataSharingLevel" public."DataSharingLevel" NOT NULL,
    "contractDocUrl" text,
    status public."ContractStatus" DEFAULT 'DRAFT'::public."ContractStatus" NOT NULL,
    "signedByNgoAt" timestamp(3) without time zone,
    "signedByDonorAt" timestamp(3) without time zone,
    "digioRequestId" text,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Donation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Donation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "donorId" text NOT NULL,
    "initiativeId" text,
    "contractId" text,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    "paymentGateway" public."PaymentGateway" NOT NULL,
    "gatewayPaymentId" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    status public."DonationStatus" DEFAULT 'PENDING'::public."DonationStatus" NOT NULL,
    "receiptSentAt" timestamp(3) without time zone,
    "receiptUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Donor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Donor" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    type public."DonorType" NOT NULL,
    "orgName" text,
    "contactNameEnc" bytea NOT NULL,
    "emailEnc" bytea NOT NULL,
    "phoneEnc" bytea,
    "panHash" text,
    "kycStatus" public."KycStatus" DEFAULT 'NOT_REQUIRED'::public."KycStatus" NOT NULL,
    "notificationPrefs" jsonb DEFAULT '{"email": true, "inApp": true, "whatsapp": true}'::jsonb NOT NULL,
    "unsubscribedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Evidence" (
    id text NOT NULL,
    "milestoneId" text NOT NULL,
    "submittedBy" text NOT NULL,
    type public."EvidenceType" NOT NULL,
    "fileUrl" text,
    "fileSizeBytes" bigint,
    "gpsLat" numeric(10,7),
    "gpsLng" numeric(10,7),
    "capturedAt" timestamp(3) without time zone NOT NULL,
    "verificationScore" integer,
    "verificationFlags" text[],
    "pHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Initiative; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Initiative" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    sector public."Sector" NOT NULL,
    geography jsonb NOT NULL,
    description text NOT NULL,
    "targetBeneficiaries" integer NOT NULL,
    "budgetRequired" numeric(14,2) NOT NULL,
    "budgetFunded" numeric(14,2) DEFAULT 0 NOT NULL,
    status public."InitiativeStatus" DEFAULT 'DRAFT'::public."InitiativeStatus" NOT NULL,
    "embeddingVector" public.vector(768),
    "sdgTags" text[],
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MatchResult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MatchResult" (
    id text NOT NULL,
    "requirementId" text NOT NULL,
    "initiativeId" text NOT NULL,
    "overallScore" integer NOT NULL,
    "subScores" jsonb NOT NULL,
    explanation text NOT NULL,
    "hardConstraintCheck" text NOT NULL,
    "humanOverride" text,
    "humanOverrideBy" text,
    rank integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Milestone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Milestone" (
    id text NOT NULL,
    "initiativeId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "budgetAllocated" numeric(14,2) NOT NULL,
    status public."MilestoneStatus" DEFAULT 'PLANNED'::public."MilestoneStatus" NOT NULL,
    "evidenceRequirements" jsonb NOT NULL,
    "completionVerifiedBy" text,
    "completionVerifiedAt" timestamp(3) without time zone,
    "sequenceOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Outcome; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Outcome" (
    id text NOT NULL,
    "milestoneId" text NOT NULL,
    "kpiKey" text NOT NULL,
    "kpiLabel" text NOT NULL,
    "targetValue" numeric(12,2),
    "actualValue" numeric(12,2),
    unit text,
    "dataStatus" public."OutcomeDataStatus" DEFAULT 'PENDING'::public."OutcomeDataStatus" NOT NULL,
    "validatedBy" text,
    "validatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SponsorRequirement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SponsorRequirement" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "donorId" text NOT NULL,
    "rawDocumentUrl" text,
    "extractedFields" jsonb,
    "confidenceScores" jsonb,
    status public."ReqStatus" DEFAULT 'PENDING_EXTRACTION'::public."ReqStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "extractedByAgent" text,
    "gapReportJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Story; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Story" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "initiativeId" text NOT NULL,
    variant public."StoryVariant" NOT NULL,
    "contentJson" jsonb NOT NULL,
    "consentLevelsUsed" integer[],
    "dignityScore" numeric(3,1),
    "aiModelUsed" text,
    "promptHash" text,
    "approvalStatus" public."StoryApproval" DEFAULT 'DRAFT'::public."StoryApproval" NOT NULL,
    "approvedByPmAt" timestamp(3) without time zone,
    "approvedByAdminAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    "publishedUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    subdomain text NOT NULL,
    "customDomain" text,
    "brandingConfig" jsonb NOT NULL,
    "featureFlags" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "fcraRegistered" boolean DEFAULT false NOT NULL,
    "registrationNumber" text,
    status public."TenantStatus" DEFAULT 'ONBOARDING'::public."TenantStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    email text NOT NULL,
    "emailHash" text NOT NULL,
    "fullNameEnc" bytea NOT NULL,
    "passwordHash" text NOT NULL,
    role public."UserRole" NOT NULL,
    "phoneHash" text,
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaSecret" text,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: VerificationResult; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VerificationResult" (
    id text NOT NULL,
    "evidenceId" text NOT NULL,
    score integer NOT NULL,
    flags text[],
    "autoApproved" boolean DEFAULT false NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AgentJobLog AgentJobLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentJobLog"
    ADD CONSTRAINT "AgentJobLog_pkey" PRIMARY KEY (id);


--
-- Name: Allocation Allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Allocation"
    ADD CONSTRAINT "Allocation_pkey" PRIMARY KEY (id);


--
-- Name: AuditEvent AuditEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_pkey" PRIMARY KEY (id);


--
-- Name: BeneficiaryInitiative BeneficiaryInitiative_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BeneficiaryInitiative"
    ADD CONSTRAINT "BeneficiaryInitiative_pkey" PRIMARY KEY ("beneficiaryId", "initiativeId");


--
-- Name: Beneficiary Beneficiary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Beneficiary"
    ADD CONSTRAINT "Beneficiary_pkey" PRIMARY KEY (id);


--
-- Name: CommunicationLog CommunicationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunicationLog"
    ADD CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY (id);


--
-- Name: ContentArtifact ContentArtifact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentArtifact"
    ADD CONSTRAINT "ContentArtifact_pkey" PRIMARY KEY (id);


--
-- Name: Contract Contract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_pkey" PRIMARY KEY (id);


--
-- Name: Donation Donation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_pkey" PRIMARY KEY (id);


--
-- Name: Donor Donor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donor"
    ADD CONSTRAINT "Donor_pkey" PRIMARY KEY (id);


--
-- Name: Evidence Evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_pkey" PRIMARY KEY (id);


--
-- Name: Initiative Initiative_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Initiative"
    ADD CONSTRAINT "Initiative_pkey" PRIMARY KEY (id);


--
-- Name: MatchResult MatchResult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MatchResult"
    ADD CONSTRAINT "MatchResult_pkey" PRIMARY KEY (id);


--
-- Name: Milestone Milestone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Milestone"
    ADD CONSTRAINT "Milestone_pkey" PRIMARY KEY (id);


--
-- Name: Outcome Outcome_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Outcome"
    ADD CONSTRAINT "Outcome_pkey" PRIMARY KEY (id);


--
-- Name: SponsorRequirement SponsorRequirement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SponsorRequirement"
    ADD CONSTRAINT "SponsorRequirement_pkey" PRIMARY KEY (id);


--
-- Name: Story Story_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Story"
    ADD CONSTRAINT "Story_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VerificationResult VerificationResult_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VerificationResult"
    ADD CONSTRAINT "VerificationResult_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AgentJobLog_jobId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AgentJobLog_jobId_key" ON public."AgentJobLog" USING btree ("jobId");


--
-- Name: AgentJobLog_tenantId_agentName_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AgentJobLog_tenantId_agentName_status_idx" ON public."AgentJobLog" USING btree ("tenantId", "agentName", status);


--
-- Name: AuditEvent_tenantId_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditEvent_tenantId_entityType_entityId_idx" ON public."AuditEvent" USING btree ("tenantId", "entityType", "entityId");


--
-- Name: AuditEvent_tenantId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditEvent_tenantId_timestamp_idx" ON public."AuditEvent" USING btree ("tenantId", "timestamp");


--
-- Name: Beneficiary_anonId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Beneficiary_anonId_key" ON public."Beneficiary" USING btree ("anonId");


--
-- Name: Beneficiary_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Beneficiary_tenantId_idx" ON public."Beneficiary" USING btree ("tenantId");


--
-- Name: CommunicationLog_tenantId_donorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommunicationLog_tenantId_donorId_idx" ON public."CommunicationLog" USING btree ("tenantId", "donorId");


--
-- Name: ContentArtifact_tenantId_type_approvalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentArtifact_tenantId_type_approvalStatus_idx" ON public."ContentArtifact" USING btree ("tenantId", type, "approvalStatus");


--
-- Name: Contract_tenantId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Contract_tenantId_status_idx" ON public."Contract" USING btree ("tenantId", status);


--
-- Name: Donation_gatewayPaymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Donation_gatewayPaymentId_key" ON public."Donation" USING btree ("gatewayPaymentId");


--
-- Name: Donation_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Donation_idempotencyKey_key" ON public."Donation" USING btree ("idempotencyKey");


--
-- Name: Donation_tenantId_donorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Donation_tenantId_donorId_idx" ON public."Donation" USING btree ("tenantId", "donorId");


--
-- Name: Donor_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Donor_tenantId_idx" ON public."Donor" USING btree ("tenantId");


--
-- Name: Evidence_milestoneId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Evidence_milestoneId_idx" ON public."Evidence" USING btree ("milestoneId");


--
-- Name: Initiative_tenantId_sector_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Initiative_tenantId_sector_status_idx" ON public."Initiative" USING btree ("tenantId", sector, status);


--
-- Name: MatchResult_requirementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MatchResult_requirementId_idx" ON public."MatchResult" USING btree ("requirementId");


--
-- Name: Milestone_initiativeId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Milestone_initiativeId_status_idx" ON public."Milestone" USING btree ("initiativeId", status);


--
-- Name: SponsorRequirement_tenantId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SponsorRequirement_tenantId_status_idx" ON public."SponsorRequirement" USING btree ("tenantId", status);


--
-- Name: Story_tenantId_approvalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Story_tenantId_approvalStatus_idx" ON public."Story" USING btree ("tenantId", "approvalStatus");


--
-- Name: Tenant_customDomain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tenant_customDomain_key" ON public."Tenant" USING btree ("customDomain");


--
-- Name: Tenant_subdomain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tenant_subdomain_key" ON public."Tenant" USING btree (subdomain);


--
-- Name: User_emailHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_emailHash_idx" ON public."User" USING btree ("emailHash");


--
-- Name: User_tenantId_emailHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_tenantId_emailHash_key" ON public."User" USING btree ("tenantId", "emailHash");


--
-- Name: VerificationResult_evidenceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationResult_evidenceId_key" ON public."VerificationResult" USING btree ("evidenceId");


--
-- Name: idx_evidence_phash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_phash ON public."Evidence" USING btree ("pHash") WHERE ("pHash" IS NOT NULL);


--
-- Name: idx_initiatives_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_initiatives_embedding ON public."Initiative" USING ivfflat ("embeddingVector" public.vector_cosine_ops) WITH (lists='10');


--
-- Name: AuditEvent no_delete_audit; Type: RULE; Schema: public; Owner: -
--

CREATE RULE no_delete_audit AS
    ON DELETE TO public."AuditEvent" DO INSTEAD NOTHING;


--
-- Name: AuditEvent no_update_audit; Type: RULE; Schema: public; Owner: -
--

CREATE RULE no_update_audit AS
    ON UPDATE TO public."AuditEvent" DO INSTEAD NOTHING;


--
-- Name: AgentJobLog AgentJobLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentJobLog"
    ADD CONSTRAINT "AgentJobLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Allocation Allocation_donationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Allocation"
    ADD CONSTRAINT "Allocation_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES public."Donation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Allocation Allocation_milestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Allocation"
    ADD CONSTRAINT "Allocation_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES public."Milestone"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditEvent AuditEvent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BeneficiaryInitiative BeneficiaryInitiative_beneficiaryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BeneficiaryInitiative"
    ADD CONSTRAINT "BeneficiaryInitiative_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES public."Beneficiary"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BeneficiaryInitiative BeneficiaryInitiative_initiativeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BeneficiaryInitiative"
    ADD CONSTRAINT "BeneficiaryInitiative_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES public."Initiative"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Beneficiary Beneficiary_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Beneficiary"
    ADD CONSTRAINT "Beneficiary_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CommunicationLog CommunicationLog_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunicationLog"
    ADD CONSTRAINT "CommunicationLog_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public."Donor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContentArtifact ContentArtifact_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentArtifact"
    ADD CONSTRAINT "ContentArtifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Contract Contract_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public."Donor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Contract Contract_requirementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES public."SponsorRequirement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Donation Donation_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."Contract"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Donation Donation_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public."Donor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Donation Donation_initiativeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES public."Initiative"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Donation Donation_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Donor Donor_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Donor"
    ADD CONSTRAINT "Donor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Evidence Evidence_milestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES public."Milestone"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Initiative Initiative_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Initiative"
    ADD CONSTRAINT "Initiative_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MatchResult MatchResult_initiativeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MatchResult"
    ADD CONSTRAINT "MatchResult_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES public."Initiative"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MatchResult MatchResult_requirementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MatchResult"
    ADD CONSTRAINT "MatchResult_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES public."SponsorRequirement"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Milestone Milestone_initiativeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Milestone"
    ADD CONSTRAINT "Milestone_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES public."Initiative"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Outcome Outcome_milestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Outcome"
    ADD CONSTRAINT "Outcome_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES public."Milestone"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SponsorRequirement SponsorRequirement_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SponsorRequirement"
    ADD CONSTRAINT "SponsorRequirement_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public."Donor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Story Story_initiativeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Story"
    ADD CONSTRAINT "Story_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES public."Initiative"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Story Story_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Story"
    ADD CONSTRAINT "Story_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VerificationResult VerificationResult_evidenceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VerificationResult"
    ADD CONSTRAINT "VerificationResult_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES public."Evidence"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict r7xoX9A57t9NI9p8kzgDHTEyCUeh1JhDWQYfwel3oxKtpHpo9AAGTnHrkmVHiqQ

