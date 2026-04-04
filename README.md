# NGO Impact Platform

A full-stack monorepo platform connecting NGOs with CSR donors. Built with Next.js, Fastify, Prisma, BullMQ, and Gemini AI.

---

## Architecture

```
ngo-impact-platform/
├── apps/
│   ├── web-admin/        # Admin portal (port 3000) — DRM staff, NGO managers
│   ├── donor-portal/     # Donor/CSR portal (port 3002)
│   └── api-server/       # Fastify REST API (port 4000)
├── packages/
│   ├── database/         # Prisma schema + Supabase PostgreSQL
│   ├── agents/           # Gemini AI agents (requirements analyst)
│   ├── queue/            # BullMQ workers (extraction, matching, embedding, gap analysis, pitch deck)
│   ├── auth/             # AES-256-GCM encryption + JWT helpers
│   └── audit/            # Audit log utilities
```

---

## Running Locally

```powershell
# Kill existing ports
npx kill-port 3000
npx kill-port 3002
npx kill-port 4000

# Start all servers and workers
cd C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform
.\start-servers.ps1
.\start-workers.ps1
```

| Service | URL |
|---|---|
| Admin Portal | http://localhost:3000 |
| Donor Portal | http://localhost:3002 |
| API Server | http://localhost:4000 |

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, Tailwind CSS, TanStack Query, react-hot-toast
- **Backend**: Fastify, Prisma ORM, Supabase PostgreSQL
- **AI**: Google Gemini (gemini-2.5-flash-lite) — document extraction, embeddings, matching
- **Queue**: BullMQ + Redis
- **Auth**: JWT (role-based), AES-256-GCM field encryption
- **Package manager**: pnpm workspaces + Turborepo

---

## Features Built

### Admin Portal (`web-admin`)

#### NGO Initiatives
- Upload NGO PDF/DOCX — AI extracts title, sector, geography, budget, SDG tags, NGO ID
- Multimodal extraction for scanned/image-based PDFs (Gemini base64 inline)
- NGO ID column extracted from registration numbers, FCRA numbers, project IDs
- Clickable rows navigate to initiative detail page
- Delete button per row
- Columns: NGO ID, Title, Beneficiaries (SDG Tags), Sector, Geography, Budget, Status, Actions

#### DRM Workspace (Donor Requirements)
- Displays both NGO and Donor/CSR document submissions
- Pipeline status: Pending Extraction → Extracted → Needs Review → Validated → Matched → Contracted
- AI confidence scores, low-confidence field flags
- Delete button per row with confirmation
- Action badges: Review & Validate, View Matches

#### Requirements Detail & Matches
- Score breakdown in plain language (Great Fit / Decent Fit / Weak Fit)
- Emoji rating labels: Excellent / Good / Partial / Weak / No Match
- Rank badges: Best / 2nd / 3rd
- Importance badges per dimension
- "Why this score? See details" toggle

#### Proposal Approvals (Content & Approvals)
- PPTX pitch deck download with cross-machine file path resolution
- 3-step file resolution: exact path → local tmp → requirement-ID prefix match
- Authenticated download endpoint

#### CSR Intake (Agent Jobs)
- Upload CSR donor RFP documents
- Triggers BullMQ extraction worker → Gemini AI analysis

#### Delete Records
- Bulk delete Donors or Initiatives with checkbox selection
- Confirmation modal before deletion
- Cascade deletes all related records

#### Sidebar Navigation
- Dashboard, NGO Initiatives, DRM Workspace, Donor Inquiries, Proposal Approvals, CSR Intake, Delete Records

---

### Donor Portal (`donor-portal`)

- Login with tenant-scoped JWT (works even if specific donor records are deleted)
- Impact Overview dashboard: active initiatives, milestones, lives impacted
- Your Submissions: RFP status tracking with resubmission alerts
- Pitch Decks: download approved PPTX proposals
- Stories, Initiatives browsing

---

### API Server (`api-server`)

#### Key Routes
| Method | Route | Description |
|---|---|---|
| POST | `/api/initiatives/upload` | Upload NGO PDF, AI extracts all fields + ngoId |
| GET | `/api/initiatives` | List initiatives (includes ngoId) |
| DELETE | `/api/initiatives/:id` | Delete initiative (cascade milestones + matches) |
| DELETE | `/api/requirements/:id` | Delete requirement |
| DELETE | `/api/donors/:id` | Delete donor (cascade requirements, contracts, match results) |
| POST | `/api/auth/donor-login` | Donor portal login — tenant-scoped, not donor-record-dependent |

#### RBAC Roles
- `NGO_ADMIN` — full access including delete
- `DRM` — full access including delete (initiative:delete, requirement:delete, donor:delete)
- `PROGRAM_MANAGER` — read/create/update, no delete
- `FIELD_WORKER` — initiative and milestone read/update only
- `DONOR` — requirement create/read, initiative read, content read

---

### AI Agents & Workers

#### Requirements Analyst (`packages/agents/src/requirements-analyst`)
- Extracts: company name, sector, geography, budget, duration, KPIs, reporting cadence, constraints, NGO ID
- Multimodal mode: sends raw file as base64 to Gemini for scanned PDFs
- Heuristic fallback when Gemini quota exceeded (regex-based extraction)
- Confidence scoring per field — flags low-confidence fields for DRM review
- NGO ID validation: rejects garbage values (sentences, >60 chars, >6 words)

#### BullMQ Workers
| Worker | Trigger | Output |
|---|---|---|
| requirement-extraction | Document upload | Extracted fields saved to SponsorRequirement |
| initiative-embedding | Initiative create | Gemini vector embeddings for matching |
| initiative-matching | After validation | MatchResult records ranked by score |
| gap-analysis | After extraction | Gap report JSON |
| pitch-deck | Manual trigger | PPTX file generated via pptxgenjs |

---

### Database (Prisma + Supabase)

#### Key Schema Changes
- `Initiative.ngoId String?` — NGO registration/project ID
- `MatchResult` → `onDelete: Cascade` on both `requirement` and `initiative` relations
- `Contract` → `onDelete: Cascade` on `requirement` relation
- `SponsorRequirement.donor` → `onDelete: Cascade`
- `Contract.donor` → `onDelete: Cascade`
- `Donation.donor` → `onDelete: Cascade`
- `CommunicationLog.donor` → `onDelete: Cascade`

#### Prisma Studio
Due to a version conflict (npx downloads v7, project uses v5.22.0), use:
```
cd packages/database
pnpm studio
```

---

## Known Issues & Solutions

| Issue | Solution |
|---|---|
| OneDrive Files On-Demand causes `existsSync` false negatives | Removed `existsSync` gates, added 3-step path resolution |
| Scanned PDFs return binary garbage to AI | Added Gemini multimodal (base64) fallback |
| Donor login breaks when donor records deleted | Login now tenant-scoped, not dependent on specific donor record existing |
| Prisma Studio rendering bug on Windows | Use in-app Delete Records page instead |
| Cross-machine PPTX file paths | Fuzzy path resolution using requirement ID prefix matching |

---

## Environment Variables

```env
DATABASE_URL=
GEMINI_API_KEY=
JWT_SECRET=
ENCRYPTION_KEY_HEX=
HASH_SALT=
REDIS_URL=
```
