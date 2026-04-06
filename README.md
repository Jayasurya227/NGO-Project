# NGO Impact Platform

A full-stack monorepo platform connecting NGOs with CSR donors. Built with Next.js, Fastify, Prisma, BullMQ, and Gemini AI.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites--install-these-first)
2. [External Services Setup](#2-external-services-setup)
3. [Clone & Install](#3-clone--install)
4. [Environment Variables](#4-environment-variables)
5. [Database Setup](#5-database-setup)
6. [Running the Application](#6-running-the-application)
7. [Default Login Credentials](#7-default-login-credentials)
8. [Architecture](#8-architecture)
9. [Features](#9-features-built)
10. [API Routes](#10-api-server)
11. [AI Agents & Workers](#11-ai-agents--workers)
12. [Known Issues & Solutions](#12-known-issues--solutions)

---

## 1. Prerequisites — Install These First

Install the following on your new laptop before anything else.

### Node.js (v20 or higher)
Download from: https://nodejs.org/en/download  
Verify: `node -v`

### pnpm (v8 or higher)
```powershell
npm install -g pnpm
```
Verify: `pnpm -v`

### Git
Download from: https://git-scm.com/downloads  
Verify: `git -v`

### Redis (for background job queues)
**Windows** — use Docker (easiest):
```powershell
# Install Docker Desktop first: https://www.docker.com/products/docker-desktop
docker run -d -p 6379:6379 --name redis redis:alpine
```
Or use Redis via WSL2:
```bash
sudo apt install redis-server
sudo service redis-server start
```
Verify Redis is running: `redis-cli ping` → should return `PONG`

### VS Code (recommended IDE)
Download from: https://code.visualstudio.com

**Recommended VS Code Extensions:**
- Prisma
- Tailwind CSS IntelliSense
- ESLint
- TypeScript and JavaScript Language Features

---

## 2. External Services Setup

You need accounts on these services. All have free tiers.

### Supabase (PostgreSQL Database)
1. Go to https://supabase.com → Sign up
2. Create a new project (choose a region close to you)
3. Wait for project to provision (~2 minutes)
4. Go to **Settings → Database → Connection string → URI**
5. Copy the **Connection pooling** URL (port 6543) — this is your `DATABASE_URL`
6. Also copy the **Direct connection** URL (port 5432) — used for migrations

> **Note:** Free tier projects pause after 7 days of inactivity. Go to your Supabase dashboard and click **Restore** if you see a "paused" message.

### Google Gemini API (AI Extraction)
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account
3. Click **Create API Key**
4. Copy the key — this is your `GEMINI_API_KEY`

---

## 3. Clone & Install

```powershell
# Clone the repository
git clone https://github.com/vitainspire/NGO_Impact.git
cd NGO_Impact

# Install all dependencies (installs for all apps and packages at once)
pnpm install
```

---

## 4. Environment Variables

Create a `.env` file in the **root** of the project (`NGO_Impact/.env`):

```env
# ── Database ──────────────────────────────────────────────────────
# Supabase connection pooling URL (port 6543) — used by the app
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase direct connection URL (port 5432) — used for migrations
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# ── AI ────────────────────────────────────────────────────────────
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-2.5-flash-lite"

# ── Redis ─────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── Auth & Encryption ─────────────────────────────────────────────
# JWT secret — must be at least 64 characters
JWT_SECRET="change-this-to-a-long-random-string-at-least-64-characters-long-ok"

# AES-256-GCM encryption key — must be exactly 64 hex characters (32 bytes)
# Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY_HEX="your-64-character-hex-string-here"

# Hash salt for email lookups
HASH_SALT="ngo-platform-lookup-salt"

# ── App ───────────────────────────────────────────────────────────
NODE_ENV="development"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

> **How to generate ENCRYPTION_KEY_HEX:**
> ```powershell
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> Copy the output (64 characters) and paste as `ENCRYPTION_KEY_HEX`.

---

## 5. Database Setup

Run these once after cloning to create all tables in your Supabase database:

```powershell
cd packages/database

# Push schema to database (creates all tables)
node "..\..\node_modules\.pnpm\prisma@5.22.0\node_modules\prisma\build\index.js" db push --schema=./prisma/schema.prisma
```

To seed a default admin user (required to log in to the Admin Portal):

```powershell
# From the root of the project
pnpm --filter @ngo/database seed
```

If no seed script exists, you can create a user manually via Prisma Studio:
```powershell
cd packages/database
pnpm studio
```

---

## 6. Running the Application

### Option A — Use the startup scripts (recommended)

```powershell
cd NGO_Impact

# Free up ports if already in use
npx kill-port 3000
npx kill-port 3002
npx kill-port 4000

# Start all three servers (Admin Portal, Donor Portal, API)
.\start-servers.ps1

# In a second terminal — start AI background workers
.\start-workers.ps1
```

### Option B — Start each service manually

Open **4 separate terminal windows**:

**Terminal 1 — API Server**
```powershell
cd NGO_Impact/apps/api-server
pnpm dev
```

**Terminal 2 — Admin Portal**
```powershell
cd NGO_Impact/apps/web-admin
pnpm dev
```

**Terminal 3 — Donor Portal**
```powershell
cd NGO_Impact/apps/donor-portal
pnpm dev
```

**Terminal 4 — Background Workers (AI agents)**
```powershell
cd NGO_Impact
.\start-workers.ps1
```

### Access the application

| Service | URL | Who uses it |
|---|---|---|
| Admin Portal | http://localhost:3000 | DRM staff, NGO managers |
| Donor Portal | http://localhost:3002 | CSR/Donor companies |
| API Server | http://localhost:4000 | Backend (not opened in browser) |

---

## 7. Default Login Credentials

### Admin Portal (http://localhost:3000)
| Field | Value |
|---|---|
| Email | admin@shiksha-foundation.org |
| Password | admin123 |
| Subdomain | shiksha-foundation |

> If login fails, check that your database is seeded and the `JWT_SECRET` in `.env` is set.

### Donor Portal (http://localhost:3002)
| Field | Value |
|---|---|
| Email | donor@tcs.com (or any email) |
| Password | any value |
| Subdomain | shiksha-foundation |

> Donor login is tenant-scoped — it does not validate the password in the current version.

---

## 8. Architecture

```
NGO_Impact/
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
├── start-servers.ps1     # Starts all 3 app servers
├── start-workers.ps1     # Starts all AI background workers
└── .env                  # Your environment variables (never commit this)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, TanStack Query |
| Backend | Fastify, Prisma ORM |
| Database | Supabase (PostgreSQL) |
| AI | Google Gemini (gemini-2.5-flash-lite) |
| Background Jobs | BullMQ + Redis |
| Auth | JWT, AES-256-GCM field encryption |
| Package Manager | pnpm workspaces + Turborepo |

---

## 9. Features Built

### Admin Portal

#### NGO Initiatives
- Upload NGO PDF/DOCX/images — AI extracts title, sector, geography, budget, SDG tags, NGO ID
- Multimodal extraction for scanned/image-based PDFs (Gemini base64 inline)
- NGO ID inline edit directly in the table
- Delete button per row with confirmation

#### DRM Workspace (Donor Requirements)
- Displays both NGO and Donor/CSR document submissions
- Pipeline: Pending Extraction → Extracted → Needs Review → Validated → Matched → Contracted → Rejected
- AI rejects documents where zero intake fields are matched
- Delete button per row

#### Requirements Detail & Matches
- Score breakdown in plain language (Great Fit / Decent Fit / Weak Fit)
- Emoji ratings: Excellent / Good / Partial / Weak / No Match
- Rank badges: Best / 2nd / 3rd

#### Proposal Approvals
- Download approved PPTX pitch decks
- Cross-machine file path resolution

#### CSR Intake
- Upload any file type (PDF, DOCX, images, Excel, etc.)
- Triggers Gemini AI extraction automatically

#### Delete Records
- Bulk delete Donors or Initiatives with checkbox selection
- Cascade deletes all related child records

### Donor Portal
- Upload RFP documents (any file type)
- Track submission status
- Download approved pitch decks
- View active initiatives and impact stories

---

## 10. API Server

### Key Routes
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Admin staff login |
| POST | `/api/auth/donor-login` | Donor portal login |
| POST | `/api/initiatives/upload` | Upload NGO document — AI extracts all fields |
| GET | `/api/initiatives` | List all initiatives |
| PATCH | `/api/initiatives/:id` | Update initiative (e.g. ngoId inline edit) |
| DELETE | `/api/initiatives/:id` | Delete initiative + cascade |
| POST | `/api/requirements/upload` | Upload CSR RFP document |
| GET | `/api/requirements` | List all requirements |
| DELETE | `/api/requirements/:id` | Delete requirement |
| DELETE | `/api/donors/:id` | Delete donor + cascade |

### RBAC Roles
| Role | Access |
|---|---|
| `NGO_ADMIN` | Full access including delete |
| `DRM` | Full access including delete |
| `PROGRAM_MANAGER` | Read / create / update only |
| `FIELD_WORKER` | Initiative and milestone read/update |
| `DONOR` | Requirement create/read, initiative read |

---

## 11. AI Agents & Workers

Workers run in the background processing AI tasks. Start them with `.\start-workers.ps1`.

| Worker | What it does |
|---|---|
| `requirement-extraction` | Reads uploaded CSR/NGO documents, extracts fields using Gemini AI |
| `initiative-embedding` | Generates vector embeddings for NGO initiatives (used for matching) |
| `initiative-matching` | Matches donor requirements to NGO initiatives, scores and ranks them |
| `gap-analysis` | Identifies gaps between donor requirements and NGO capabilities |
| `pitch-deck` | Generates PPTX pitch deck presentations |

> Workers require Redis to be running. If workers are not processing jobs, check that Redis is up: `redis-cli ping`

---

## 12. Known Issues & Solutions

| Issue | Solution |
|---|---|
| **Supabase project paused** | Go to supabase.com → your project → click Restore |
| **Port already in use** | Run `npx kill-port 3000` (or 3002/4000) then restart |
| **Redis not running** | Start Docker and run `docker start redis` |
| **Prisma Studio broken** (`npx prisma studio` downloads wrong version) | Use `cd packages/database && pnpm studio` instead |
| **OneDrive sync causes file-not-found errors** | Files on OneDrive need to be "Always kept on this device" — right-click the folder in Explorer |
| **Scanned PDFs not extracting** | Fixed — Gemini multimodal fallback sends file as base64 |
| **`pnpm install` fails** | Make sure Node.js v20+ is installed: `node -v` |
| **Build error: cannot find module 'autoprefixer'** | Run `pnpm install` from the root again |

---

## 13. Example Input Flow (End-to-End Walkthrough)

This section walks through a complete real-world usage scenario after the application is running.

---

### Step 1 — Admin uploads an NGO Initiative

**Who:** DRM staff or NGO Admin  
**Where:** Admin Portal → **CSR Intake** (sidebar)

1. Open http://localhost:3000 and log in as admin
2. Go to **CSR Intake** in the sidebar
3. Click **Upload Document** and select an NGO PDF (e.g. `shiksha-initiative-2024.pdf`)
4. The AI Extraction Agent reads the PDF and auto-fills:
   - **NGO ID** (e.g. `SHIKSHA-EDU-2024`)
   - **Title** (e.g. `Digital Literacy for Rural Girls`)
   - **Sector** → `EDUCATION`
   - **Geography** → `Uttar Pradesh, Varanasi`
   - **Budget** → ₹25L – ₹50L
   - **SDG Tags** → `SDG 4`, `SDG 5`
5. Initiative appears in **NGO Initiatives** table with all fields populated

---

### Step 2 — Donor submits an RFP from the Donor Portal

**Who:** CSR/Donor company  
**Where:** Donor Portal → **Submit RFP** (sidebar)

1. Open http://localhost:3002 and log in (e.g. `donor@tcs.com`, subdomain: `shiksha-foundation`)
2. Go to **Submit RFP**
3. Choose **Upload Document** and upload a CSR RFP PDF (e.g. `tcs-csr-rfp-2024.pdf`)
   - OR choose **Fill Form Manually** and enter:
     - Sector: `EDUCATION`
     - State: `Uttar Pradesh`, District: `Varanasi`
     - Budget: ₹20L min – ₹60L max
     - KPI 1: `500 girls enrolled in digital literacy program`
4. Click **Upload & Start AI Analysis**
5. Status shows **Pending Extraction** → changes to **Extracted** once AI finishes

---

### Step 3 — DRM reviews and validates the submission

**Who:** DRM staff  
**Where:** Admin Portal → **DRM Workspace**

1. Go to **DRM Workspace** in Admin Portal
2. Find the submission with status **EXTRACTED** — orange highlight means action needed
3. Click the row to open the **Correction Form**
4. Review AI-extracted fields and confidence scores:
   - Green border = high confidence (no action needed)
   - Red border = low confidence (review and correct the value)
5. Fix any incorrect fields (e.g. correct the sector or geography)
6. Click **Validate & Start Gap Analysis →**
7. Status moves to **VALIDATED** → AI Gap Diagnoser runs automatically

---

### Step 4 — AI Matching runs and finds best NGO initiatives

**Who:** Automated (background worker)  
**What happens automatically after validation:**

1. **Gap Diagnoser** compares donor requirements vs NGO capabilities
2. **Matching Agent** scores all NGO initiatives against the requirement
3. Top 3 matches are ranked: 🥇 Best / 🥈 2nd / 🥉 3rd
4. Status moves to **MATCHED**

---

### Step 5 — DRM reviews matches and approves pitch deck

**Who:** DRM staff  
**Where:** Admin Portal → **DRM Workspace** → click matched row

1. Open the matched requirement row
2. Scroll to **Match Results** — see ranked initiatives with scores:
   - Score breakdown: Great Fit / Decent Fit / Weak Fit
   - Emoji ratings: Excellent / Good / Partial / Weak
3. Click **Approve & Generate Pitch Deck** on the best match
4. AI Pitch Deck Agent generates a 5-slide PPTX:
   - Slide 1: Cover
   - Slide 2: Problem + NGO Overview + Needs
   - Slide 3: Solution + Gap Analysis + Milestones
   - Slide 4: Budget + Impact + Monitoring + Risks
   - Slide 5: Credibility + Funding Ask + Authorization
5. Go to **Proposal Approvals** sidebar → approve the pitch deck
6. Status moves to **APPROVED**

---

### Step 6 — Donor downloads the pitch deck

**Who:** CSR/Donor company  
**Where:** Donor Portal → **Impact Overview**

1. Log in to Donor Portal (http://localhost:3002)
2. On **Impact Overview**, the right sidebar shows **Your Pitch Decks**
3. Approved pitch deck shows with a green **Download PPTX** button
4. Click to download the generated presentation

---

### Step 7 — Donor asks a question about an initiative

**Who:** CSR/Donor company  
**Where:** Donor Portal → **Initiatives**

1. Go to **Initiatives** in Donor Portal
2. Browse and click any NGO initiative card
3. Click **Need more information** button
4. Type a question (e.g. *"Does this program cover Varanasi district specifically?"*)
5. DRM staff sees this in Admin Portal → **Donor Inquiries**
6. DRM types a response and clicks **Respond**
7. Donor sees the answer under **My Inquiries** in their portal

---

### Summary of Roles

| Role | Portal | What they do |
|---|---|---|
| **NGO Admin / DRM** | Admin Portal (port 3000) | Upload NGO docs, review extractions, validate, approve pitch decks, respond to inquiries |
| **CSR / Donor** | Donor Portal (port 3002) | Submit RFPs, track status, download pitch decks, ask questions |
| **AI Workers** | Background (auto) | Extract fields, match initiatives, generate gap analysis + pitch decks |

---

## 14. UI Workflow — What You See on Screen

This section shows exactly what appears on each page as users move through the platform.

---

### Admin Portal Workflow (http://localhost:3000)

#### Screen 1 — Dashboard
After logging in you land on the Dashboard.
- 4 stat cards: **Total Donors**, **Requirements**, **NGO Initiatives**, **AI Agents**
- Numbers update in real-time as data is added
- Sidebar on the left shows all navigation sections

```
Sidebar sections:
  Overview      → Dashboard
  Management    → NGO Initiatives | DRM Workspace | Donor Inquiries
  AI & Matching → Proposal Approvals | CSR Intake | Delete Records
```

---

#### Screen 2 — CSR Intake (Upload Documents)
**Sidebar → CSR Intake**

What you see:
- A mode toggle: **Upload Document** or **Fill Form Manually**
- Upload mode: drag-and-drop box — supports PDF, DOCX, images, Excel, any file
- After upload: a green progress indicator → status changes to **Pending Extraction**
- Workers terminal shows: `[requirements-analyst] Calling Gemini model...`
- Once done: status changes to **Extracted** and fields appear in DRM Workspace

---

#### Screen 3 — NGO Initiatives Table
**Sidebar → NGO Initiatives**

What you see after uploading an NGO document:
```
| NGO ID          | Title                          | Status  | Sector    | Beneficiaries | Budget    | Start Date |
|-----------------|-------------------------------|---------|-----------|---------------|-----------|------------|
| SHIKSHA-EDU-24  | Digital Literacy Rural Girls   | ACTIVE  | EDUCATION | 1,200         | ₹30,00,000| 01/06/2024 |
```
- Click **NGO ID cell** to inline-edit the ID directly in the table
- Click **View** to open full initiative detail
- Green badge = ACTIVE, Blue = IN_PROGRESS, Gray = DRAFT

---

#### Screen 4 — DRM Workspace
**Sidebar → DRM Workspace**

What you see:
- 3 stat cards at top: **All Submissions** | **⏳ AI Running** | **✅ Matched / Done**
- Table rows colour-coded:
  - 🟠 Orange highlight = needs your review (EXTRACTED or NEEDS REVIEW)
  - White = AI running or already done
- Each row shows: Submitted By, Type (NGO/Donor), Sector, Geography, Budget, Pipeline Status, DRM Action

Pipeline status badges you will see:
```
PENDING EXTRACTION  → yellow  → AI is reading the document
EXTRACTED           → blue    → Ready for DRM review
NEEDS REVIEW        → orange  → DRM must correct low-confidence fields
VALIDATED           → green   → Gap analysis running
MATCHED             → purple  → Best NGO initiatives found
CONTRACTED          → indigo  → Deal in progress
REJECTED            → red     → Document had zero readable fields
```

---

#### Screen 5 — DRM Correction Form (Requirement Detail)
**Click any EXTRACTED or NEEDS REVIEW row**

What you see:
- All AI-extracted fields displayed as editable inputs
- **Red border** on a field = AI confidence is low → you must review it
- **Green border** = high confidence → no action needed
- Confidence score shown as a % badge on each field
- Two action buttons at the bottom:
  - **📨 Request Resubmission** → opens a text box to send a note to the donor
  - **Validate & Start Gap Analysis →** → locks the fields and starts matching

---

#### Screen 6 — Match Results
**Open a MATCHED requirement row**

What you see:
```
Top Matches for: TCS CSR RFP 2024

🥇 Best Match    Digital Literacy Rural Girls    Score: 91%   ✅ Excellent
🥈 2nd Match     Girls Education Varanasi        Score: 78%   ✅ Good
🥉 3rd Match     Rural Skill Dev Maharashtra     Score: 54%   ⚠ Partial
```
- Each match shows a plain-language score breakdown (sector fit, geography fit, budget fit)
- Click **Approve & Generate Pitch Deck** → AI generates a PPTX in the background

---

#### Screen 7 — Proposal Approvals
**Sidebar → Proposal Approvals**

What you see:
- List of all AI-generated pitch decks with status badges (PENDING REVIEW / APPROVED)
- Click a pitch deck row → opens detail page with **Approve** button
- Once approved: donors can download it from their portal

---

#### Screen 8 — Donor Inquiries
**Sidebar → Donor Inquiries**

What you see:
- Cards for each question a donor sent from the Donor Portal
- Shows: donor org name, date, the question text, which initiative it's about
- Click **Respond** → type your answer → click **Send Response**
- Answered inquiries show a green **✅ Responded** badge

---

### Donor Portal Workflow (http://localhost:3002)

#### Screen 1 — Impact Overview (Home)
After logging in donors see:
- 3 stat cards: **Active Initiatives**, **Impact Milestones**, **Lives Impacted**
- **Your Submissions** list — shows all RFPs with live status badges
- **Latest Impact Stories** — 2 most recent field stories
- Right sidebar: **Funding Status** + **Your Pitch Decks** (download button when approved)

Status badges donors see on their submissions:
```
PENDING EXTRACTION  → amber   → Being processed
EXTRACTED / VALIDATED → blue  → Under DRM review
MATCHED             → green   → Best NGO found, pitch deck coming
REJECTED            → red     → ❌ Rejected — document unreadable
Resubmission Required → orange → DRM asked for a new document
```

---

#### Screen 2 — Submit RFP
**Sidebar → Submit RFP**

What donors see:
- Two mode buttons: **✍️ Fill Form Manually** | **📁 Upload Document**
- Upload mode: drag-and-drop any file → click **Upload & Start AI Analysis**
- Manual mode: 8 sections to fill —
  1. Preferred Sectors (checkbox pills)
  2. Preferred Geography (state / district / location)
  3. Financial Parameters (min/max budget in INR)
  4. Project Duration (months)
  5. KPIs / Desired Outcomes
  6. Reporting Requirements
  7. Compliance (CSR Schedule VII)
  8. Additional Notes
- After submit: green success screen → **Submit Another** button

---

#### Screen 3 — Initiatives
**Sidebar → Initiatives**

What donors see:
- Grid of NGO initiative cards with cover image area
- Each card shows: Sector badge, NGO name, Title, Geography, Funding progress bar, SDG tags, Target beneficiaries
- Search bar at top + sector filter pills
- Click **View Details** → opens full initiative page with **Need more information** button

---

#### Screen 4 — My Inquiries
**Sidebar → My Inquiries**

What donors see:
- Cards for each question they asked
- Badge shows: ✅ **Answered** (green) or ⏳ **Pending Response** (amber)
- Answered cards show the DRM's response text in a green box
- Delete button to remove old inquiries

---

#### Screen 5 — Impact Stories
**Sidebar → Impact Stories**

What donors see:
- Article cards with: sector tag, date, title, story body text, dignity score
- **Share Progress** button on each story
- Empty state if no stories have been published yet

---

### Full Platform Flow Diagram

```
NGO Admin uploads PDF
        ↓
AI extracts fields (Gemini)
        ↓
DRM reviews in Workspace → Validates
        ↓
Gap Diagnoser runs (auto)
        ↓
Matching Agent scores NGO initiatives (auto)
        ↓
DRM approves best match → Pitch Deck generated (auto)
        ↓
DRM approves Pitch Deck in Proposal Approvals
        ↓
Donor downloads PPTX from Donor Portal
        ↓
Donor asks questions via Initiatives page
        ↓
DRM responds in Donor Inquiries
```

---

## Troubleshooting

**App won't start / blank screen**
- Check that `.env` file exists in the root with all required variables filled in
- Check the terminal for red error messages

**Login says "Invalid credentials"**
- Make sure the database is seeded (`pnpm --filter @ngo/database seed`)
- Check `JWT_SECRET` is set in `.env`

**AI extraction not working**
- Check `GEMINI_API_KEY` is set in `.env`
- Make sure workers are running (`.\start-workers.ps1`)
- Check the workers terminal for error messages

**Database errors in workers**
- Your Supabase project may be paused — restore it at supabase.com
- Check `DATABASE_URL` is correct in `.env`
