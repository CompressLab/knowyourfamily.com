# Know Your Family — Project Context

Last updated: September 2026

---

## Live Website

- **Production URL:** Check Vercel dashboard for exact URL (format: `https://knowyourfamily-com.vercel.app`)
- **GitHub Repository:** https://github.com/CompressLab/knowyourfamily.com
- **Local project folder:** `C:\Users\MohammedAbdulAzeem\familytree`

---

## Infrastructure

| Service | Purpose | Plan | Dashboard |
|---------|---------|------|-----------|
| Vercel | Hosting + auto-deploy | Hobby (Free) | https://vercel.com/dashboard |
| Supabase | Database + Auth + Storage | Free | https://supabase.com/dashboard/project/tzwvjkghukmhfnxdqqhs |
| GitHub | Source code | Free (CompressLab org) | https://github.com/CompressLab/knowyourfamily.com |

---

## Supabase Project

- **Project ID:** `tzwvjkghukmhfnxdqqhs`
- **Project URL:** `https://tzwvjkghukmhfnxdqqhs.supabase.co`
- **API keys:** Supabase Dashboard → Project Settings → API
- **Storage buckets:** `documents` (private, 2MB, PDF/JPG/PNG), `profile-photos` (private, 2MB, JPG/PNG)
- **Migrations run:**
  - `supabase/migrations/001_initial_schema.sql` — full schema + RLS
  - `supabase/migrations/002_seed_demo.sql` — demo family (optional)

---

## Environment Variables

Set in Vercel (Production) and locally in `.env.local` (never committed):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tzwvjkghukmhfnxdqqhs.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API (secret) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL |
| `NEXT_PUBLIC_APP_NAME` | `Know Your Family` |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 15.3.6 |
| Language | TypeScript | 5.x |
| UI | React | 19.0.3 |
| Styling | Tailwind CSS | 4.x |
| Animation | Framer Motion | 12.x |
| Family Tree | ReactFlow + Dagre | 11.x |
| Icons | Lucide React | latest |
| Forms | React Hook Form + Zod | latest |
| Backend | Supabase | latest |
| Testing | Vitest | 3.x |

---

## All 22 Pages

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/register` | Registration |
| `/login` | Login |
| `/dashboard` | Home dashboard |
| `/search` | Find people |
| `/people/add` | Add family member |
| `/people/[personId]` | Person profile (Then & Now) |
| `/people/[personId]/edit` | Edit profile |
| `/family-tree` | Interactive family tree (ReactFlow) |
| `/connections` | Family connection requests |
| `/friends` | Friends / chosen family |
| `/documents` | My documents |
| `/documents/upload` | Upload document |
| `/documents/[docId]` | Document detail + sharing |
| `/shared-with-me` | Documents shared with me |
| `/notifications` | In-app notifications |
| `/activity` | Audit/activity log |
| `/claim` | Claim a profile ("This is me") |
| `/settings` | Settings hub |
| `/settings/privacy` | Discovery preferences |
| `/settings/security` | Password change |

---

## Key Design Decisions

**People without accounts** — `people.user_id` is nullable. Grandparents, children, elderly relatives all have full profiles, relationships and documents without needing a login.

**Generic relationship model** — No `father_id`/`mother_id` columns. Uses a graph: `person_a → [type] → person_b`. Types: parent, child, spouse, sibling, grandparent, grandchild, uncle, aunt, nephew, niece, cousin, other.

**Document privacy** — Private Supabase Storage. Access via 60-second signed URLs only. Two modes: `private` or `shared`. Sharing is explicit per-person — family relationships never grant document access automatically.

**Phone privacy** — Stored as SHA-256 hash. Never returned in search results. Search hashes the input and compares.

**Family vs Friends** — Completely separate tables. Friends never affect family count. Both counts displayed separately on every profile.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `people` | Core entity — person with or without account |
| `profile_managers` | Authorised managers for profiles without accounts |
| `relationships` | Family relationships (generic graph) |
| `friend_connections` | Friends / chosen family (separate from family tree) |
| `profile_claim_requests` | "This is me" claim workflow |
| `documents` | Uploaded documents (private storage paths) |
| `document_permissions` | Explicit per-person document access grants |
| `audit_logs` | Append-only security event log |
| `notifications` | In-app notifications (real-time) |
| `user_privacy_settings` | Name/phone discovery preferences |

---

## Deployment Workflow

Every push to `main` on GitHub triggers an automatic Vercel redeploy (~2 min).

```powershell
cd C:\Users\MohammedAbdulAzeem\familytree

# Make changes, then:
git add .
git commit -m "Description of change"
git push origin main
# Vercel auto-redeploys
```

---

## Running Locally

```powershell
cd C:\Users\MohammedAbdulAzeem\familytree
npm install
npm run dev
# Open http://localhost:3000

# Run tests
npm test
```

Requires `.env.local` with all 5 variables filled in.

---

## Tests

- **File:** `src/tests/business-logic.test.ts`
- **Run:** `npm test`
- **Status:** 46/46 passing
- **Covers:** File limits, MIME types, document permissions, family/friend separation, phone hashing, self-relationship prevention, profile claiming, search privacy, duplicate handling.

---

## Demo Seed Data (`002_seed_demo.sql`)

Multi-generation synthetic family for testing:

```
Ibrahim (Great-grandfather) + Fatima (Great-grandmother)
    └── Ahmed (Grandfather) + Layla (Grandmother)
            └── Amina (Mother)
                    └── Mohammed Azeem ← register and claim this profile
                            ├── Sara (Sister)
                            ├── Yusuf (Son)
                            └── Hana (Daughter)
        └── Omar (Uncle) + Nadia (Aunt)
                └── Karim (Cousin)

Friends: Abdul Rahman Khan (Like a Brother), Sameer Shaikh (Friend)
```

None have accounts. Register, then use **Claim Profile** to link yourself to Azeem.

---

## Known Issues / Future Work

- [ ] Custom domain `knowyourfamily.com` (add in Vercel → Domains)
- [ ] Profile photo signed URL display (currently shows initials fallback)
- [ ] Profile manager claim approval UI (backend logic done, needs admin screen)
- [ ] Extended family tree beyond 2 hops
- [ ] Email notifications (needs SMTP provider e.g. Resend — free tier available)
- [ ] MFA / passkeys (Supabase Auth supports this — enable in Auth settings)
- [ ] Mobile camera optimisation for document upload

---

## If Something Breaks

1. **Vercel build error** → Vercel Dashboard → Project → Deployments → click failed build → read logs
2. **App error in browser** → Open browser DevTools → Console tab → share the red error
3. **Database error** → Supabase Dashboard → Logs → API logs
4. **Auth not working** → Check Supabase → Authentication → URL Configuration → Site URL matches Vercel URL
5. **Local dev broken** → Check `.env.local` has all 5 variables with correct values
