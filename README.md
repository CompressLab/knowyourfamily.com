# FamilyTree

> Know. Connect. Trust.

A modern, secure, browser-based application for managing family relationships, trusted friends, profiles, and important family documents — with privacy at the core.

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Folder Structure](#folder-structure)
5. [Database Structure](#database-structure)
6. [How Authentication Works](#how-authentication-works)
7. [How Profiles Without Accounts Work](#how-profiles-without-accounts-work)
8. [How Relationships Work](#how-relationships-work)
9. [How Profile Claiming Works](#how-profile-claiming-works)
10. [How Family Count Is Calculated](#how-family-count-is-calculated)
11. [How Document Privacy Works](#how-document-privacy-works)
12. [How Document Permissions Work](#how-document-permissions-work)
13. [Security Principles](#security-principles)
14. [Getting Started — Local Setup](#getting-started--local-setup)
15. [Setting Up Supabase](#setting-up-supabase)
16. [Running the Application](#running-the-application)
17. [Demo / Seed Data](#demo--seed-data)
18. [Deploying for Free](#deploying-for-free)
19. [Future Upgrades](#future-upgrades)

---

## What This Is

FamilyTree is a web application that lets you:

- **KNOW**: Create rich profiles for every family member — even those who never use technology.
- **CONNECT**: Build and visualise your family tree. Find relatives. Send relationship requests.
- **TRUST**: Securely store passports, IDs, certificates, and other important documents. Share individual documents with exactly the right people.

### Key design principles

| Principle | Explanation |
|-----------|-------------|
| Profiles without accounts | A registered user can create profiles for relatives who may never register — grandparents, children, historical family members. |
| Family ≠ Friends | Friends and chosen-family connections are completely separate from the biological/legal family tree. |
| Relationship ≠ Document access | Being someone's son/daughter/parent does NOT automatically grant access to their documents. Every document requires explicit authorisation. |
| Nothing is ever public | Documents are private by default. No document can ever receive a public URL. |
| Phone numbers are private | Phone numbers are stored as one-way cryptographic hashes. They are never displayed in search results. |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Browser (React/Next.js)             │
│  - All pages rendered client or server side          │
│  - Supabase browser client for real-time & auth      │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────┐
│              Next.js Server (API routes)              │
│  - Middleware: session refresh, route protection     │
│  - Server-side Supabase client (elevated operations) │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│                   Supabase                            │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │    Auth    │  │   Storage    │  │
│  │  + RLS       │  │  (JWT)     │  │  (private)   │  │
│  └──────────────┘  └────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
```

Everything is kept modular. Supabase can be replaced with any PostgreSQL database + auth provider + S3-compatible storage later.

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend framework | Next.js 15 (App Router) | Full-stack React, free hosting |
| UI library | React 19 + TypeScript | Type safety, component reuse |
| Styling | Tailwind CSS v4 | Rapid, consistent styling |
| UI components | Custom (Radix UI primitives) | Accessible, unstyled primitives |
| Animations | Framer Motion | Premium feel, reduced-motion aware |
| Family tree | ReactFlow + Dagre | Interactive, zoomable, pannable tree |
| Icons | Lucide React | Clean, consistent icon set |
| Forms | React Hook Form + Zod | Validated, type-safe forms |
| Backend/Database | Supabase (PostgreSQL) | Free tier, RLS, real-time, auth |
| Authentication | Supabase Auth | Email/password, JWT sessions |
| File storage | Supabase Storage | Private buckets, signed URLs |
| Testing | Vitest | Fast, compatible with Next.js |
| Hosting | Vercel (recommended) | Free tier, Next.js native |
| Version control | Git / GitHub | Standard |

---

## Folder Structure

```
familytree/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth pages (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── callback/route.ts   # OAuth/email confirmation handler
│   │   ├── (app)/                  # Authenticated app pages (with sidebar)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── people/
│   │   │   │   ├── add/page.tsx
│   │   │   │   └── [personId]/
│   │   │   │       ├── page.tsx    # Person profile
│   │   │   │       └── edit/page.tsx
│   │   │   ├── family-tree/page.tsx
│   │   │   ├── connections/page.tsx
│   │   │   ├── friends/page.tsx
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── upload/page.tsx
│   │   │   │   └── [docId]/page.tsx
│   │   │   ├── shared-with-me/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── activity/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── privacy/page.tsx
│   │   │   │   └── security/page.tsx
│   │   │   └── claim/page.tsx
│   │   ├── api/                    # API routes (if needed beyond Supabase)
│   │   ├── globals.css             # Global styles + animations
│   │   └── layout.tsx              # Root layout
│   ├── components/
│   │   ├── ui/                     # Reusable UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── … (all UI components)
│   │   ├── layout/
│   │   │   └── AppShell.tsx        # Sidebar navigation layout
│   │   ├── profile/
│   │   │   └── ThenAndNow.tsx      # Then & Now photo component
│   │   └── family-tree/
│   │       └── FamilyTreeView.tsx  # ReactFlow family tree
│   ├── hooks/
│   │   ├── useUser.ts              # Current user + person state
│   │   └── useNotifications.ts    # Real-time notifications
│   ├── lib/
│   │   ├── utils.ts                # Helpers, constants, formatters
│   │   └── supabase/
│   │       ├── client.ts           # Browser Supabase client
│   │       ├── server.ts           # Server Supabase client
│   │       └── middleware.ts       # Session refresh middleware
│   ├── types/
│   │   ├── database.ts             # TypeScript types mirroring DB schema
│   │   └── index.ts
│   ├── middleware.ts               # Next.js route protection
│   └── tests/
│       ├── setup.ts
│       └── business-logic.test.ts  # Critical business rule tests
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  # Full database schema + RLS
│       └── 002_seed_demo.sql       # Demo family data
├── .env.local                      # Local environment variables (never commit)
├── .env.example                    # Template for environment variables
├── next.config.ts                  # Next.js config + security headers
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Database Structure

The database is designed around one central principle: **a person can exist without a user account.**

### Tables

| Table | Purpose |
|-------|---------|
| `people` | Every person — with or without an account. The core entity. |
| `profile_managers` | Who is authorised to manage a profile without an account. |
| `relationships` | Family relationships (generic graph — no hard-coded columns). |
| `friend_connections` | Trusted friends, completely separate from family. |
| `profile_claim_requests` | When someone wants to claim an existing profile as their own. |
| `documents` | Uploaded documents (stored in private Supabase Storage). |
| `document_permissions` | Explicit per-person grants for document access. |
| `audit_logs` | Append-only security event log. |
| `notifications` | In-app notifications. |
| `user_privacy_settings` | Per-person discovery preferences. |

### The `people` table — key design

```sql
people (
  id          UUID (primary key)
  full_name   TEXT
  short_bio   TEXT
  phone_number_hash  TEXT  -- SHA-256 hash, never plaintext
  current_photo_path TEXT  -- storage path, never a public URL
  past_photo_path    TEXT
  past_photo_period  TEXT  -- "Around 1985"
  user_id     UUID REFERENCES auth.users  -- NULL = no account
  discoverable_by_name   BOOLEAN
  discoverable_by_phone  BOOLEAN
)
```

The critical column is `user_id`. It is **nullable**. A `person` without a `user_id` is a profile without an account.

### Relationships model

Relationships are stored as a **generic graph** — no `father_id`, `mother_id`, etc.

```
Person A ──[relationship_type]──> Person B

Examples:
  Ahmed ──[grandparent]──> Azeem
  Azeem ──[sibling]──> Sara
  Ahmed ──[spouse]──> Layla
```

The `relationship_type` column uses an enum with values: `parent`, `child`, `spouse`, `sibling`, `grandparent`, `grandchild`, `uncle`, `aunt`, `nephew`, `niece`, `cousin`, `other`.

A check constraint prevents `person_a_id = person_b_id` (self-relationships).

---

## How Authentication Works

1. User registers with email + password → Supabase Auth creates an `auth.users` record.
2. A **database trigger** (`handle_new_user`) automatically:
   - Creates a `people` record linked to the new user via `user_id`.
   - Creates default `user_privacy_settings`.
   - Logs a `user_registered` audit event.
3. On login, Supabase issues a JWT stored in a secure HTTP-only cookie.
4. The Next.js **middleware** (`src/middleware.ts`) refreshes the session on every request and redirects unauthenticated users to `/login`.
5. **Row Level Security (RLS)** on every table verifies the session server-side — client-side user IDs are never trusted for authorization.

---

## How Profiles Without Accounts Work

The entire data model is built around separating **User Accounts** from **Person Profiles**.

```
User Account (auth.users)  ←──── optional link ────→  Person Profile (people)
                                  via user_id
```

- A `Person` can exist with `user_id = NULL` (no account).
- A registered user automatically has a `Person` profile.
- Multiple registered users can be authorised **profile managers** for a profile without an account.

**Example:**

```
Great Grandfather Ibrahim   → person profile, no account
Grandfather Ahmed           → person profile, no account
Father Amina                → person profile, no account
Azeem (Me)                  → person profile + user account
Children Yusuf, Hana        → person profiles, no accounts
```

Only Azeem is logged in. All other family members have full profiles, photos, relationships, and documents.

---

## How Relationships Work

Relationships use a **generic directed graph** stored in the `relationships` table:

```sql
relationships (
  person_a_id      -- The person making the statement
  person_b_id      -- The other person
  relationship_type -- e.g. "grandparent"
  status           -- pending | accepted | declined
)
```

**Interpretation:** `person_a_id` is `relationship_type` of `person_b_id`.

For example: `Ahmed ──[grandparent]──> Azeem` means "Ahmed is the grandparent of Azeem".

### Connection requests

When you send a connection request, `status = 'pending'`.
The other person must accept for `status = 'accepted'`.
Only accepted relationships count toward family counts and appear in the family tree.

For profiles without accounts, the **profile manager** can accept connections on their behalf.

---

## How Profile Claiming Works

If someone discovers a profile that was created for them, they can claim it:

1. They click **"This is me"** on the profile page.
2. A `profile_claim_requests` record is created with `status = 'pending'`.
3. The existing profile manager(s) receive a notification.
4. A manager reviews and approves or declines.
5. If **approved**:
   - The claimant's `user_id` is linked to the existing `people` record.
   - **No new profile is created** — the existing one is used.
   - All existing relationships, documents, and history remain intact.
6. If declined: the claim is rejected.

Claims based only on matching names are **not** automatically approved — a human must review.

---

## How Family Count Is Calculated

The `get_family_count(person_id)` SQL function counts the **deduplicated set of all directly connected confirmed family members**.

```sql
select count(distinct case
  when r.person_a_id = p_id then r.person_b_id
  else r.person_a_id
end)
from relationships r
where (r.person_a_id = p_id or r.person_b_id = p_id)
and r.status = 'accepted';
```

**Important:**
- Only `status = 'accepted'` relationships count.
- Friends (`friend_connections`) are **never** counted in family count.
- A friend labelled "Like a Brother" does not affect the family count.
- The family count and friend count are always displayed separately.

---

## How Document Privacy Works

### Storage

Documents are uploaded to a **private Supabase Storage bucket** called `documents`. This bucket is configured with `public = false`. There are no publicly accessible URLs.

### Accessing a document

Every time a document is viewed or downloaded, a **short-lived signed URL** is generated (valid for 60 seconds). This URL:
- Is unique per request.
- Expires after 60 seconds.
- Requires the user to be authenticated and authorised.

### The `can_access_document` function

```sql
select exists (
  select 1 from documents d where d.id = doc_id
  and (
    d.owner_person_id = auth_person_id()     -- owner
    or d.uploaded_by_person_id = auth_person_id()  -- uploader
    or is_manager_of(d.owner_person_id)       -- profile manager
    or (
      d.permission_mode = 'shared'
      and exists (
        select 1 from document_permissions dp
        where dp.document_id = d.id
        and dp.granted_to_person_id = auth_person_id()
      )
    )
  )
);
```

---

## How Document Permissions Work

There are only two modes:

| Mode | Who can access |
|------|---------------|
| `private` | Only the document owner and their profile managers. |
| `shared` | Owner, managers, **plus** any person explicitly listed in `document_permissions`. |

### Rules

- **Being a family member does NOT give document access.**
- Every access grant must be made explicitly, per document.
- Revoking a permission immediately removes access — the next request will fail authorization.
- When the last permission is removed, the document reverts to `private`.

---

## Security Principles

| Measure | Implementation |
|---------|----------------|
| Authentication | Supabase Auth JWT, HTTP-only cookies |
| Route protection | Next.js middleware |
| Row Level Security | PostgreSQL RLS on every table |
| Document storage | Private Supabase Storage bucket |
| File access | Short-lived signed URLs (60 seconds) |
| Phone numbers | SHA-256 hashed — never stored in plaintext |
| IDOR prevention | Server-side auth check on every document request |
| Audit logging | Append-only `audit_logs` table |
| Download notifications | In-app notification to document owner |
| File validation | MIME type + size limit (2 MB) on client and server |
| XSS prevention | React JSX escaping + Content-Security-Policy header |
| CSRF | Supabase JWT-based auth (not cookie-based form tokens needed) |
| Security headers | `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `CSP` |
| Input validation | Zod schemas on all forms |
| Secrets | Environment variables only — never in source code |

---

## Getting Started — Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment — optional for local)

### Step 1: Get the code

```bash
git clone <your-repo-url>
cd familytree
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Set up environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in your Supabase credentials (see [Setting Up Supabase](#setting-up-supabase)).

---

## Setting Up Supabase

### 1. Create a free Supabase project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **New project**
3. Choose your organisation, name your project, set a database password
4. Select the free tier

### 2. Get your API keys

1. In your Supabase dashboard, go to **Project Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (**keep this secret!**)

### 3. Run the database migration

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click **Run**

This creates all tables, enums, indexes, RLS policies, and helper functions.

### 4. Run the demo seed data (optional)

To get test data with a realistic demo family:

1. Go to **SQL Editor → New query**
2. Copy contents of `supabase/migrations/002_seed_demo.sql`
3. Click **Run**

### 5. Create Storage buckets

1. Go to **Storage** in your Supabase dashboard
2. Create bucket: `documents` — set **Public: OFF** (private)
3. Create bucket: `profile-photos` — set **Public: OFF** (private)

Both buckets must be private. Do NOT enable public access.

### 6. Storage bucket policies

In the Supabase dashboard, go to **Storage → Policies** and add these for each bucket:

**For `documents` bucket:**
- INSERT: Allow authenticated users (`auth.role() = 'authenticated'`)
- SELECT: Deny direct access (access only via signed URLs generated server-side)

**For `profile-photos` bucket:**
- INSERT: Allow authenticated users
- SELECT: Deny direct access (use signed URLs)

---

## Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests (once) |
| `npm run test:watch` | Run tests in watch mode |

---

## Demo / Seed Data

The demo data (`supabase/migrations/002_seed_demo.sql`) creates a synthetic family:

```
Ibrahim Hassan Al-Rashid (Great-grandfather, no account)
Fatima Begum (Great-grandmother, no account)
    │
Ahmed Ibrahim Al-Rashid (Grandfather, no account)
Layla Mohammed (Grandmother, no account)
    │
Amina Ibrahim (Mother, no account)
    │
Mohammed Azeem Al-Rashid ← YOU (register and link your account)
    │
├── Sara Al-Rashid (Sister, no account)
├── Yusuf Azeem Al-Rashid (Son, child, no account)
└── Hana Azeem Al-Rashid (Daughter, child, no account)

Also:
Omar Ibrahim (Uncle, no account)
Nadia Ibrahim (Aunt, no account)
Karim Omar (Cousin, no account)
Abdul Rahman Khan (Friend — "Like a Brother")
Sameer Shaikh (Friend)
```

After running the seed, register as a new user. To link yourself to the "Mohammed Azeem Al-Rashid" demo profile, use the **Claim Profile** flow.

---

## Deploying for Free

### Vercel (recommended — zero cost for personal projects)

1. Push your code to a GitHub repository
2. Go to [https://vercel.com](https://vercel.com) → **Import Project**
3. Select your GitHub repo
4. Add environment variables (copy from `.env.local`)
5. Click **Deploy**

Your app will be live at `https://your-project.vercel.app` — free.

### Alternative free hosts

- **Netlify** — similar to Vercel, supports Next.js
- **Railway** — generous free tier for Node.js apps
- **Render** — free tier for web services

### Supabase free tier limits (as of 2024)

| Resource | Free limit |
|----------|-----------|
| Database | 500 MB |
| Storage | 1 GB |
| Bandwidth | 5 GB/month |
| Auth | Unlimited |
| Row Level Security | Included |

These limits are generous enough for a family-use MVP.

---

## Future Upgrades

When the application grows, these components can be upgraded independently:

| Component | Current (free) | Upgrade path |
|-----------|---------------|-------------|
| Database | Supabase PostgreSQL free | Supabase Pro, Neon, or self-hosted PostgreSQL |
| Auth | Supabase Auth | Supabase Pro, Auth.js, Clerk |
| Storage | Supabase Storage | Supabase Pro, AWS S3, Cloudflare R2 |
| Hosting | Vercel free | Vercel Pro, AWS, self-hosted |
| Email notifications | None (in-app only) | Resend, SendGrid, AWS SES |

The codebase is kept portable — business logic is never tightly coupled to any specific infrastructure provider.

---

*Built with care for families. Documents are always private. Nothing is ever public.*
