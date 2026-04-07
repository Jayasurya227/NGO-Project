# NGO Impact Platform — Architecture Document

**Version:** 1.0  
**Date:** April 2026  
**Author:** Vitainspire  
**Stack:** Next.js 14 · Fastify · Prisma · Supabase · BullMQ · Google Gemini AI

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Architecture](#6-database-architecture)
7. [AI Agent Pipeline](#7-ai-agent-pipeline)
8. [Worker Architecture](#8-worker-architecture)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Real-Time Communication](#10-real-time-communication)
11. [Security Architecture](#11-security-architecture)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [API Reference Summary](#13-api-reference-summary)
14. [Environment & Infrastructure](#14-environment--infrastructure)
15. [Key Design Decisions](#15-key-design-decisions)

---

## 1. Project Overview

The NGO Impact Platform is a **multi-tenant SaaS** application that connects CSR (Corporate Social Responsibility) donors with verified NGO initiatives using AI-driven matching, document extraction, and automated pitch deck generation.

### Core Purpose

```
Donor uploads RFP document
        ↓
AI extracts fields using Google Gemini
        ↓
DRM (Donor Relationship Manager) reviews & validates
        ↓
AI matches donor requirements to NGO initiatives
        ↓
AI generates a pitch deck (PPTX)
        ↓
DRM approves → Donor downloads pitch deck
```

### Who Uses It

| Role | Portal | Responsibilities |
|---|---|---|
| NGO Admin | Admin Portal (3000) | Manage initiatives, oversee platform |
| DRM | Admin Portal (3000) | Review submissions, validate, approve matches |
| Program Manager | Admin Portal (3000) | Manage initiatives, approve content |
| Field Worker | Admin Portal (3000) | Update milestone progress |
| CSR / Donor | Donor Portal (3002) | Submit RFPs, download pitch decks, ask questions |
| AI Workers | Background | Extract, match, generate — fully automated |

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐    │
│  │   Admin Portal           │    │   Donor Portal               │    │
│  │   Next.js 14 App Router  │    │   Next.js 14 App Router      │    │
│  │   Port 3000              │    │   Port 3002                  │    │
│  │   TanStack Query         │    │   TanStack Query             │    │
│  │   Tailwind CSS           │    │   Tailwind CSS               │    │
│  └────────────┬────────────┘    └──────────────┬───────────────┘    │
│               │  HTTP/REST + WebSocket          │                    │
└───────────────┼────────────────────────────────┼────────────────────┘
                │                                │
┌───────────────▼────────────────────────────────▼────────────────────┐
│                         API LAYER                                    │
│                                                                      │
│              Fastify API Server — Port 4000                          │
│              JWT Auth · RBAC Middleware · Multipart                  │
│              REST Routes · WebSocket Plugin                          │
│                                                                      │
└──────────┬─────────────────────────────────────────────────────────┘
           │
┌──────────▼─────────────────────────────────────────────────────────┐
│                       QUEUE LAYER (BullMQ)                          │
│                                                                      │
│   requirement-extraction  →  gap-analysis  →  initiative-matching   │
│                                                  ↓                  │
│                                            pitch-deck               │
│   initiative-embedding (independent)                                │
│                                                                      │
│   Backed by: Redis Cloud (GCP Asia South 1 Mumbai)                  │
└──────────┬─────────────────────────────────────────────────────────┘
           │
┌──────────▼─────────────────────────────────────────────────────────┐
│                       AI AGENT LAYER                                │
│                                                                      │
│   Requirements Analyst  ·  Gap Diagnoser  ·  Matching Agent         │
│   Pitch Deck Builder    ·  Initiative Embedder                       │
│                                                                      │
│   Powered by: Google Gemini 2.5 Flash Lite                          │
└──────────┬─────────────────────────────────────────────────────────┘
           │
┌──────────▼─────────────────────────────────────────────────────────┐
│                       DATA LAYER                                    │
│                                                                      │
│   Supabase PostgreSQL   ←→   Prisma ORM                             │
│   pgvector extension (embeddings)                                   │
│   pgcrypto extension (encryption)                                   │
│   uuid-ossp extension (UUIDs)                                       │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Monorepo Structure

```
ngo-impact-platform/                   ← pnpm workspace root
│
├── apps/
│   ├── web-admin/                     ← Admin Portal (Next.js 14)
│   └── donor-portal/                  ← Donor Portal (Next.js 14)
│   └── api-server/                    ← Fastify REST API
│
├── packages/
│   ├── database/                      ← Prisma schema + client
│   │   └── prisma/
│   │       ├── schema.prisma          ← Full DB schema (24 models)
│   │       └── seed.ts                ← Dev seed data
│   ├── agents/                        ← AI agent implementations
│   │   └── src/
│   │       ├── requirements-analyst/  ← Document extraction agent
│   │       ├── gap-diagnoser/         ← Gap analysis agent
│   │       ├── matching/              ← Initiative matching agent
│   │       └── pitch-deck/            ← PPTX generation agent
│   ├── queue/                         ← BullMQ workers
│   │   └── src/workers/
│   │       ├── requirement-extraction.worker.ts
│   │       ├── gap-analysis.worker.ts
│   │       ├── initiative-matching.worker.ts
│   │       ├── pitch-deck.worker.ts
│   │       └── initiative-embedding.worker.ts
│   ├── auth/                          ← JWT + AES-256-GCM encryption
│   ├── audit/                         ← Audit log helpers
│   ├── types/                         ← Shared TypeScript types
│   ├── messaging/                     ← Communication helpers
│   └── storage/                       ← File storage helpers
│
├── pnpm-workspace.yaml                ← Workspace config
├── turbo.json                         ← Turborepo build pipeline
├── .env                               ← All secrets (never committed)
└── start-workers.ps1                  ← Launch all 5 workers
```

**Package Manager:** pnpm workspaces  
**Build System:** Turborepo  
**Language:** TypeScript throughout

---

## 4. Frontend Architecture

### 4.1 Admin Portal (`apps/web-admin`) — Port 3000

```
app/
├── login/page.tsx               ← JWT login form
└── dashboard/
    ├── layout.tsx               ← Sidebar nav + auth guard
    ├── page.tsx                 ← Dashboard stats (4 cards)
    ├── initiatives/
    │   ├── page.tsx             ← NGO Initiatives table + inline edit
    │   └── [id]/page.tsx        ← Initiative detail
    ├── requirements/
    │   ├── page.tsx             ← DRM Workspace table
    │   └── [id]/page.tsx        ← Correction Form + match results
    ├── inquiries/page.tsx       ← Donor Inquiries + DRM respond
    ├── content/
    │   ├── page.tsx             ← Proposal Approvals list
    │   └── [id]/page.tsx        ← Pitch deck approval detail
    ├── agents/page.tsx          ← CSR Intake (upload + manual form)
    ├── records/page.tsx         ← Delete Records (bulk select)
    └── donors/page.tsx          ← Donors list + delete
```

**Navigation Groups:**
```
Overview      → Dashboard
Management    → NGO Initiatives | DRM Workspace | Donor Inquiries
AI & Matching → Proposal Approvals | CSR Intake | Delete Records
```

### 4.2 Donor Portal (`apps/donor-portal`) — Port 3002

```
app/
├── login/page.tsx               ← Donor JWT login
└── dashboard/
    ├── layout.tsx               ← Sidebar nav
    ├── page.tsx                 ← Impact Overview (stats + submissions + pitch decks)
    ├── initiatives/
    │   ├── page.tsx             ← Browse NGO initiatives (cards + filter)
    │   └── [id]/page.tsx        ← Initiative detail + inquiry + upload CTA
    ├── upload/page.tsx          ← Submit RFP (upload or manual form)
    ├── inquiries/page.tsx       ← My Inquiries (track Q&A)
    └── stories/page.tsx         ← Impact Stories
```

**Navigation Groups:**
```
Portfolio → Impact Overview | Initiatives
Actions   → My Inquiries | Submit RFP
Reports   → Impact Stories
```

### 4.3 Shared Frontend Patterns

**Data Fetching:** TanStack Query (`useQuery`, `useMutation`)  
**API Client:** Custom `api.ts` wrapper with JWT token injection  
**Auth:** JWT stored in `localStorage`, cleared on logout  
**Real-Time:** `useAgentEvents` hook via WebSocket (admin only)  
**Styling:** Tailwind CSS with custom components  
**Toasts:** `react-hot-toast`  
**Icons:** `lucide-react`

---

## 5. Backend Architecture

### 5.1 Fastify API Server (`apps/api-server`) — Port 4000

```
src/
├── server.ts                    ← Server bootstrap, route registration
├── middleware/
│   ├── rbac.ts                  ← JWT verify + permission check
│   └── audit.ts                 ← Audit event logger
├── routes/
│   ├── auth.ts                  ← /api/auth (login, donor-login)
│   ├── requirements.ts          ← /api/requirements (CRUD + upload + resubmit)
│   ├── initiatives.ts           ← /api/initiatives (CRUD + PATCH ngoId)
│   ├── donors.ts                ← /api/donors (CRUD + inquiries)
│   ├── agents.ts                ← /api/agents (trigger AI jobs)
│   ├── content.ts               ← /api/content (pitch deck approvals)
│   ├── stories.ts               ← /api/stories
│   ├── milestones.ts            ← /api/initiatives/:id/milestones
│   ├── evidence.ts              ← /api/evidence
│   └── donations.ts             ← /api/donations
├── ws/
│   └── plugin.ts                ← WebSocket real-time events
└── utils/
    ├── response.ts              ← Standard response helpers
    └── sanitize.ts              ← Input sanitization
```

### 5.2 All API Routes

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Admin portal login |
| POST | `/api/auth/donor-login` | Public | Donor portal login |
| GET | `/api/requirements` | requirement:read | List all requirements |
| POST | `/api/requirements` | requirement:create | Create requirement manually |
| POST | `/api/requirements/upload` | requirement:create | Upload + extract document |
| GET | `/api/requirements/:id` | requirement:read | Get requirement detail |
| PATCH | `/api/requirements/:id` | requirement:update | Update requirement fields |
| POST | `/api/requirements/:id/validate` | requirement:update | DRM validate → trigger gap analysis |
| POST | `/api/requirements/:id/request-resubmission` | requirement:update | Request donor resubmit |
| DELETE | `/api/requirements/:id` | requirement:delete | Delete requirement |
| GET | `/api/initiatives` | initiative:read | List NGO initiatives |
| POST | `/api/initiatives` | initiative:create | Create initiative |
| GET | `/api/initiatives/:id` | initiative:read | Get initiative detail |
| PATCH | `/api/initiatives/:id` | initiative:update | Update NGO ID or fields |
| DELETE | `/api/initiatives/:id` | initiative:delete | Delete initiative |
| POST | `/api/initiatives/:id/inquiry` | initiative:read | Donor sends inquiry |
| GET | `/api/donors` | donor:read | List donors |
| DELETE | `/api/donors/:id` | donor:delete | Delete donor + cascade |
| GET | `/api/donors/inquiries` | donor:read | Admin: all inquiries |
| PATCH | `/api/donors/inquiries/:id` | donor:read | DRM responds to inquiry |
| GET | `/api/content` | content:read | List content artifacts |
| PATCH | `/api/content/:id/approve` | content:approve | Approve pitch deck |
| GET | `/api/requirements/:id/pitch-deck-file` | requirement:read | Download PPTX |

### 5.3 Plugins Registered

```typescript
@fastify/cors        // CORS for ports 3000, 3001, 3002
@fastify/multipart   // File uploads up to 50MB
websocketPlugin      // Real-time event broadcasting
```

---

## 6. Database Architecture

### 6.1 Technology

- **Database:** PostgreSQL via Supabase  
- **ORM:** Prisma with `@prisma/client`  
- **Extensions:** `pgvector` (embeddings) · `pgcrypto` (encryption) · `uuid-ossp` (UUIDs)

### 6.2 Entity Relationship Overview

```
Tenant (multi-tenant root)
  ├── User (NGO_ADMIN, DRM, PROGRAM_MANAGER, FIELD_WORKER, etc.)
  ├── Donor (CSR or Individual)
  │     └── SponsorRequirement (donor RFP submissions)
  │           ├── MatchResult → Initiative
  │           └── Contract
  ├── Initiative (NGO projects)
  │     ├── Milestone
  │     │     ├── Evidence → VerificationResult
  │     │     ├── Allocation → Donation
  │     │     └── Outcome (KPI tracking)
  │     ├── MatchResult ← SponsorRequirement
  │     └── Story (impact stories)
  ├── ContentArtifact (pitch decks, proposals)
  ├── AgentJobLog (AI job audit trail)
  ├── AuditEvent (tamper-proof audit log)
  ├── Donation
  └── CommunicationLog
```

### 6.3 Key Models

| Model | Purpose | Key Fields |
|---|---|---|
| `Tenant` | Multi-tenant isolation | subdomain, customDomain, featureFlags |
| `User` | Platform staff | role, emailHash, passwordHash, fullNameEnc |
| `Donor` | CSR companies | orgName, type (CSR/INDIVIDUAL), kycStatus |
| `SponsorRequirement` | Donor RFP | extractedFields (JSON), status, confidenceScores |
| `Initiative` | NGO projects | sector, geography, embeddingVector, ngoId, sdgTags |
| `MatchResult` | AI match scores | overallScore, subScores, explanation, rank |
| `ContentArtifact` | Generated content | type (PITCH_DECK), approvalStatus, fileUrl |
| `AgentJobLog` | AI audit trail | agentName, modelVersion, promptHash, latencyMs |
| `AuditEvent` | Tamper-proof log | beforeState, afterState, currentHash, prevHash |

### 6.4 Requirement Status State Machine

```
PENDING_EXTRACTION
    ↓  (AI extraction completes)
EXTRACTED
    ↓  (DRM reviews — low confidence fields)
NEEDS_REVIEW ←──┐
    ↓           │ (DRM requests resubmission)
VALIDATED        │
    ↓  (Gap analysis + matching complete)
MATCHED
    ↓  (Contract created)
CONTRACTED
    ↓
CLOSED

REJECTED  ← (AI found zero matching fields)
```

### 6.5 Cascade Deletes

```
Donor deleted  →  SponsorRequirement deleted  →  MatchResult deleted
                                              →  Contract deleted
Initiative deleted  →  MatchResult deleted
```

---

## 7. AI Agent Pipeline

### 7.1 Agent 1 — Requirements Analyst (`packages/agents/src/requirements-analyst`)

**Trigger:** File uploaded via `/api/requirements/upload`  
**Model:** `gemini-2.5-flash-lite`  
**Mode:** Multimodal (PDF sent as base64 inline)

**What it extracts:**
```json
{
  "companyName":     "TCS Foundation",
  "sector":          "EDUCATION",
  "geography": {
    "state":         "Maharashtra",
    "districts":     ["Pune", "Nashik"]
  },
  "budget": {
    "minInr":        2000000,
    "maxInr":        5000000
  },
  "durationMonths":  12,
  "primaryKpis":     [{ "metric": "literacy rate", "target": 500 }],
  "ngoId":           "SHIKSHA-EDU-2024",
  "companyNameConf": 0.95,
  "sectorConfidence": 0.90
}
```

**Confidence scoring:** Each field has a confidence score (0–1). Fields below 0.6 are flagged red in the DRM Correction Form.

**Rejection logic:** If zero intake fields are matched → status set to `REJECTED`.

**Fallback:** For scanned PDFs (binary/unreadable text), file is sent inline as base64 to Gemini multimodal.

---

### 7.2 Agent 2 — Gap Diagnoser (`packages/agents/src/gap-diagnoser`)

**Trigger:** DRM clicks "Validate & Start Gap Analysis"  
**Model:** `gemini-2.5-flash-lite`

**What it does:**
- Compares donor requirement fields vs available NGO initiative fields
- Produces a gap report: what the donor needs vs what NGOs offer
- Stores result in `SponsorRequirement.gapReportJson`
- Automatically queues Initiative Matching job after completion

---

### 7.3 Agent 3 — Initiative Matching (`packages/agents/src/matching`)

**Trigger:** Queued automatically after Gap Analysis  
**Model:** Custom scoring algorithm + Gemini

**Scoring breakdown:**
```
overallScore = weighted sum of:
  sectorAlignmentScore    (0–100)
  budgetAlignmentScore    (0–100)
  geographyAlignmentScore (0–100)
  sdgAlignmentScore       (0–100)
  kpiAlignmentScore       (0–100)
```

**Output:** Top 3 ranked `MatchResult` records stored in DB with:
- Overall score
- Plain-language explanation
- Hard constraint check (must-match rules)
- Emoji rating (Excellent/Good/Partial/Weak)

---

### 7.4 Agent 4 — Pitch Deck Builder (`packages/agents/src/pitch-deck`)

**Trigger:** DRM approves a match  
**Output:** 5-slide PPTX file saved to `apps/api-server/tmp/pitch-decks/`

**Slide structure:**
```
Slide 1: Cover (NGO name, initiative title, donor branding)
Slide 2: Problem + NGO Overview + Community Needs
Slide 3: Solution + Gap Analysis + Milestones
Slide 4: Budget + Impact Metrics + Monitoring + Risks
Slide 5: Credibility + Funding Ask + Authorization
```

---

### 7.5 Agent 5 — Initiative Embedder (`packages/agents/src/utils/embeddings`)

**Trigger:** New NGO initiative uploaded  
**Purpose:** Creates vector embeddings of initiative title + description  
**Storage:** `Initiative.embeddingVector` (pgvector column)  
**Use:** Semantic similarity search during matching

---

## 8. Worker Architecture

### 8.1 BullMQ Queue Configuration

```typescript
// packages/queue/src/queues.ts
DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 30_000 }
  // Retry 1: 30s, Retry 2: 60s, Retry 3: 120s
}
```

### 8.2 Worker Startup Sequence

```
start-workers.ps1
  ├── requirement-extraction.worker.ts  (window 1)
  ├── gap-analysis.worker.ts            (window 2)
  ├── initiative-matching.worker.ts     (window 3)
  ├── initiative-embedding.worker.ts    (window 4)
  └── pitch-deck.worker.ts              (window 5)
```

Each worker launches in a separate PowerShell window with 1-second stagger.

### 8.3 Stuck Job Recovery

Every worker has auto-recovery built in:

| Worker | Recovery Start | Repeat Every |
|---|---|---|
| Requirement Extraction | 3 seconds after start | 10 minutes |
| Gap Analysis | 3 seconds after start | 10 minutes |
| Pitch Deck | 3 seconds after start | 10 minutes |
| Initiative Matching | 5 seconds after start | 10 minutes |

Recovery scans DB for jobs stuck in `PENDING_EXTRACTION` / `VALIDATED` and re-queues them.

### 8.4 Queue → Worker → Next Queue Chain

```
requirementExtraction queue
    → requirement-extraction.worker
        → saves fields to DB (status: EXTRACTED)

gapAnalysis queue
    → gap-analysis.worker
        → saves gap report to DB
        → auto-queues: initiativeMatching queue

initiativeMatching queue
    → initiative-matching.worker
        → saves top 3 MatchResults to DB (status: MATCHED)

[DRM approves match in UI]

pitchDeck queue
    → pitch-deck.worker
        → generates PPTX file
        → saves ContentArtifact to DB (status: PENDING_REVIEW)

initiativeEmbedding queue
    → initiative-embedding.worker
        → saves vector to Initiative.embeddingVector
```

---

## 9. Authentication & Authorization

### 9.1 JWT Flow

```
User POSTs credentials to /api/auth/login
    ↓
Server verifies passwordHash (bcrypt)
    ↓
Server issues JWT containing:
  { userId, tenantId, role, email, donorId }
    ↓
Client stores token in localStorage
    ↓
Every API request: Authorization: Bearer <token>
    ↓
rbac.ts middleware: jwt.verify() → extracts role + tenantId
    ↓
requirePermission("resource:action") checks PERMISSIONS map
```

### 9.2 Role Permission Matrix

| Permission | NGO_ADMIN | DRM | PROGRAM_MANAGER | FIELD_WORKER | FINANCE_OFFICER | AUDITOR | DONOR |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| donor:read | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| donor:create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| donor:delete | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| requirement:read | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| requirement:create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| requirement:delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| initiative:read | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| initiative:delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| content:approve | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### 9.3 Multi-Tenancy Isolation

Every database query is scoped by `tenantId`:

```typescript
// Example — all queries include tenantId
const req = await prisma.sponsorRequirement.findFirst({
  where: { id, tenantId }  // ← tenant isolation
})
```

Tenants are identified by JWT `tenantId` field. No cross-tenant data access is possible.

---

## 10. Real-Time Communication

### 10.1 WebSocket Architecture

```
Worker completes job
    ↓
ws-emit.ts: publish to Redis pub/sub channel: `ws:{tenantId}`
    ↓
WebSocket plugin (api-server) subscribes to Redis
    ↓
Broadcasts event to all connected clients for that tenant
    ↓
Admin portal: useAgentEvents hook receives event
    ↓
Toast notification shown + data refetched
```

### 10.2 Event Types Emitted

```typescript
{ type: "EXTRACTION_COMPLETE",   requirementId, status: "EXTRACTED" }
{ type: "GAP_ANALYSIS_COMPLETE", requirementId }
{ type: "MATCHING_COMPLETE",     requirementId, matchCount: 3 }
{ type: "PITCH_DECK_READY",      requirementId, artifactId }
```

---

## 11. Security Architecture

### 11.1 PII Encryption

All personally identifiable information is encrypted at rest using **AES-256-GCM**:

```typescript
// packages/auth/src/encryption.ts
encrypt(plaintext) → AES-256-GCM with random IV → stored as Bytes in DB
decrypt(ciphertext) → plaintext on read
```

**Encrypted fields:**
- `User.fullNameEnc`
- `Donor.contactNameEnc`
- `Donor.emailEnc`
- `Donor.phoneEnc`
- `Beneficiary.nameEnc`
- `Beneficiary.guardianNameEnc`

### 11.2 Hashed Fields (one-way)

```typescript
User.emailHash    → SHA-256 (for lookup without decryption)
User.passwordHash → bcrypt (for login verification)
Donor.panHash     → SHA-256
User.phoneHash    → SHA-256
```

### 11.3 Audit Trail

Every state-changing action creates an `AuditEvent`:

```typescript
{
  tenantId, eventType, entityType, entityId,
  actorId, beforeState, afterState,
  currentHash,  // SHA-256 of event content
  prevHash      // SHA-256 of previous event = tamper-proof chain
}
```

This creates a **cryptographic audit chain** — any modification to past events is detectable.

### 11.4 Input Sanitization

- `sanitize.ts` strips HTML tags and dangerous characters from all user inputs
- File uploads: MIME type checked, size limited to 50MB
- NGO ID validation: max 80 chars, max 8 words, no HTML characters

---

## 12. Data Flow Diagrams

### 12.1 Document Upload & Extraction Flow

```
Donor Portal                 API Server              Worker            Gemini AI
     │                           │                     │                   │
     │  POST /api/requirements/  │                     │                   │
     │  upload (multipart)       │                     │                   │
     │──────────────────────────►│                     │                   │
     │                           │ Save file to disk   │                   │
     │                           │ Create Requirement  │                   │
     │                           │ (PENDING_EXTRACTION)│                   │
     │                           │ Add to BullMQ queue │                   │
     │                           │────────────────────►│                   │
     │  { success: true }        │                     │                   │
     │◄──────────────────────────│                     │                   │
     │                           │                     │ Read file as base64│
     │                           │                     │───────────────────►│
     │                           │                     │◄───────────────────│
     │                           │                     │ Extracted JSON     │
     │                           │                     │ Save to DB         │
     │                           │                     │ Status: EXTRACTED  │
     │                           │ WebSocket event     │                   │
     │◄──────────────────────────│◄────────────────────│                   │
     │  Toast: "Extraction done" │                     │                   │
```

### 12.2 DRM Validation → Matching Flow

```
Admin Portal                 API Server           Gap Worker      Match Worker
     │                           │                     │               │
     │  POST /validate/:id       │                     │               │
     │──────────────────────────►│                     │               │
     │                           │ Status: VALIDATED   │               │
     │                           │ Queue gap-analysis  │               │
     │                           │────────────────────►│               │
     │  { success: true }        │                     │               │
     │◄──────────────────────────│                     │               │
     │                           │                     │ Run Gemini    │
     │                           │                     │ gap analysis  │
     │                           │                     │ Save report   │
     │                           │                     │ Queue match   │
     │                           │                     │──────────────►│
     │                           │                     │               │ Score all
     │                           │                     │               │ initiatives
     │                           │                     │               │ Save top 3
     │                           │ WebSocket event     │               │ Status: MATCHED
     │◄──────────────────────────│◄──────────────────────────────────│
     │  Toast: "Match found"     │                     │               │
```

---

## 13. API Reference Summary

### Base URL
```
Local:       http://localhost:4000
Production:  https://api.yourdomain.com
```

### Authentication
```
Header: Authorization: Bearer <jwt_token>
```

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 25, "page": 1 }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Requirement not found"
  }
}
```

### Status Codes Used
| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | No token / invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 500 | Internal server error |

---

## 14. Environment & Infrastructure

### 14.1 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...supabase.co/postgres
DIRECT_URL=postgresql://...supabase.co/postgres

# Queue
REDIS_URL=redis://default:PASSWORD@redis-XXXXX.gcp.cloud.redislabs.com:PORT

# Auth
JWT_SECRET=minimum_64_character_random_string

# AI
GEMINI_API_KEY=AIzaSy...

# Server
PORT=4000
NODE_ENV=development|production
```

### 14.2 Local Development Ports

| Service | Port |
|---|---|
| Admin Portal | 3000 |
| Donor Portal | 3002 |
| API Server | 4000 |
| Redis | Cloud (Redis Cloud GCP Mumbai) |
| PostgreSQL | Cloud (Supabase) |

### 14.3 External Services

| Service | Purpose | Provider |
|---|---|---|
| PostgreSQL | Primary database | Supabase |
| Redis | Job queues + pub/sub | Redis Cloud (GCP Asia South 1) |
| AI Model | Document extraction, matching, pitch deck | Google Gemini 2.5 Flash Lite |
| File Storage | Uploaded documents + PPTX files | Local disk (`tmp/`, `uploads/`) |

### 14.4 Production Deployment Target

| Component | Service | Notes |
|---|---|---|
| Admin Portal | Vercel | Root: `apps/web-admin` |
| Donor Portal | Vercel | Root: `apps/donor-portal` |
| API Server | Railway | Root: `apps/api-server` |
| Workers (x5) | Railway | Separate service, same repo |
| Database | Supabase | Existing cloud instance |
| Redis | Redis Cloud | Existing cloud instance |

---

## 15. Key Design Decisions

### 15.1 Why Monorepo?
Frontend portals import shared packages (`@ngo/database`, `@ngo/auth`) directly. Splitting into separate repos would require publishing packages to npm or duplicating code. Monorepo keeps everything in sync with a single `pnpm install`.

### 15.2 Why BullMQ + Redis over direct API calls?
AI extraction takes 10–40 seconds. Synchronous API calls would time out. BullMQ queues allow:
- Async processing (user gets instant response, AI runs in background)
- Retry on failure with exponential backoff
- Auto-recovery of stuck jobs on worker restart
- Multiple workers processing jobs in parallel

### 15.3 Why Fastify over Express?
- 3–4x faster than Express for JSON serialization
- Native TypeScript support
- Plugin ecosystem (`multipart`, `cors`, `websocket`)
- Schema-based validation

### 15.4 Why Gemini over OpenAI?
- Multimodal support (reads PDFs directly as base64 inline)
- Cheaper for high-volume document extraction
- `gemini-2.5-flash-lite` — fast and cost-effective for structured extraction

### 15.5 Why Supabase over raw PostgreSQL?
- Managed PostgreSQL with automatic backups
- Built-in `pgvector` extension for initiative embeddings
- `pgcrypto` extension for AES encryption
- Dashboard for data inspection without Prisma Studio

### 15.6 Why AES-256-GCM for PII?
Indian DPDP (Digital Personal Data Protection) Act 2023 requires PII to be encrypted at rest. AES-256-GCM provides:
- Authenticated encryption (detects tampering)
- Random IV per encryption (no two ciphertexts are alike)
- Industry standard for financial/NGO compliance

### 15.7 Multi-Tenant Architecture
Every DB record includes `tenantId`. All queries filter by `tenantId` extracted from JWT. This means:
- One database serves multiple NGO organizations
- Complete data isolation between tenants
- Single deployment serves many clients

---

*This document covers the architecture as of Week 5 of development. For setup instructions, refer to README.md.*
