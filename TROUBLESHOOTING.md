# Know Your Family — Troubleshooting Guide

This guide covers every page, what it does, what can go wrong, and how to fix it.
Written for someone who is not a programmer.

---

## Quick Reference — Where Things Live

| What you want to check | Where to go |
|------------------------|-------------|
| Is the site down? | https://vercel.com/dashboard → your project → Deployments |
| Database errors | https://supabase.com/dashboard/project/tzwvjkghukmhfnxdqqhs/logs/edge |
| Auth errors | Supabase → Authentication → Logs |
| Storage errors | Supabase → Storage → your bucket |
| Code changes | `C:\Users\MohammedAbdulAzeem\familytree` |
| Push a fix | `git add . && git commit -m "fix" && git push origin main` |
| Run locally | `npm run dev` in the project folder |
| Run tests | `npm test` in the project folder |

---

## How to Read a Browser Error

When something goes wrong on the live site:

1. Press **F12** in your browser (or right-click → Inspect)
2. Click the **Console** tab
3. Look for red error messages
4. Copy the red text and use it to find the issue in this guide

---

## SECTION 1 — Infrastructure Issues

### Site is completely unreachable (blank page or "This site can't be reached")

**What it means:** Vercel is down, or the deployment failed.

**How to fix:**
1. Go to https://vercel.com/dashboard
2. Click your project → **Deployments** tab
3. If the latest deployment shows a red ✗ — click it and read the error log
4. Fix the code issue, push to GitHub, Vercel redeploys automatically
5. If Vercel itself is having issues → check https://www.vercel-status.com

---

### Site loads but shows "Internal Server Error" or blank white screen

**What it means:** The app connected to Supabase but something failed server-side.

**How to fix:**
1. Check your environment variables in Vercel:
   - Vercel Dashboard → Project → **Settings** → **Environment Variables**
   - Make sure all 5 are present and correct
2. Check Supabase is running: https://status.supabase.com
3. Check the Supabase URL is exactly `https://tzwvjkghukmhfnxdqqhs.supabase.co` (no trailing slash)

---

### After a code push, the site didn't update

**What it means:** Either the push didn't go through, or Vercel didn't detect it.

**How to fix:**
1. Check GitHub — did the commit appear? https://github.com/CompressLab/knowyourfamily.com/commits/main
2. Check Vercel — did a new deployment start? Vercel Dashboard → Deployments
3. If no deployment started: Vercel → Project → Settings → Git → confirm Production Branch is `main`
4. Manually trigger: Vercel Dashboard → Deployments → **Redeploy** (top right)

---

## SECTION 2 — Authentication Pages

### `/register` — Registration page

**What it does:** Creates a new user account. After submission, sends a confirmation email.

---

**Problem: "User already registered" error**

**Fix:** The email is already in use. Use `/login` instead, or use a different email address.

---

**Problem: Confirmation email never arrives**

**Fix:**
1. Check spam/junk folder
2. Check Supabase → Authentication → Users — does the user appear? If yes, the email was sent
3. Supabase → Project Settings → Authentication → **SMTP Settings** — if using Supabase's default email, there is a rate limit of 2 emails per hour on the free plan
4. Wait 1 hour and try registering again, or use a different email

---

**Problem: Clicking the confirmation link shows an error**

**Fix:** The Supabase redirect URL is not set correctly.
1. Supabase → Project Settings → **Authentication**
2. **Site URL** must be your exact Vercel URL, e.g. `https://knowyourfamily-com.vercel.app`
3. **Redirect URLs** must include `https://knowyourfamily-com.vercel.app/auth/callback`
4. Save and try registering again

---

### `/login` — Login page

**What it does:** Signs the user in with email and password. Redirects to dashboard.

---

**Problem: "Invalid login credentials" error**

**Fix:** Wrong email or password. There is no "forgot password" feature yet — to reset, go to Supabase → Authentication → Users → find the user → **Send password recovery email**.

---

**Problem: "Email not confirmed" error**

**Fix:** The user registered but didn't click the confirmation link. Check email (including spam). Or: Supabase → Authentication → Users → find the user → click the three dots → **Send confirmation email**.

---

**Problem: Login succeeds but immediately redirects back to login**

**Fix:** Session cookie issue.
1. Clear browser cookies for the site
2. Check Supabase → Project Settings → Authentication → **Site URL** matches the live URL exactly
3. Check Vercel environment variable `NEXT_PUBLIC_SUPABASE_URL` has no trailing slash

---

## SECTION 3 — Dashboard (`/dashboard`)

**What it does:** Shows family count, friend count, document count, recent connections, quick actions, and recent notifications.

---

**Problem: All counts show 0**

**Fix:** This is normal for a new account with no connections yet. Add family members or send connection requests.

---

**Problem: Dashboard loads but shows a spinning loader forever**

**Fix:** Supabase query is failing.
1. Check browser Console (F12) for a red error — it will mention which table failed
2. Most likely cause: the database schema wasn't run yet. Go to Supabase → SQL Editor and run `001_initial_schema.sql`
3. Or: the RLS functions like `get_family_count` don't exist yet — same fix, run the migration

---

**Problem: "Welcome, undefined" shown instead of name**

**Fix:** The person profile wasn't created on registration.
1. Supabase → SQL Editor → run: `SELECT * FROM people WHERE user_id = auth.uid();`
2. If no row — the `handle_new_user` trigger didn't fire
3. Fix: run this in SQL Editor (replace the email):
   ```sql
   INSERT INTO public.people (full_name, user_id, discoverable_by_name)
   SELECT 'Your Name', id, true FROM auth.users WHERE email = 'your@email.com';
   ```

---

## SECTION 4 — Search (`/search`)

**What it does:** Finds other people by name or phone number. Never exposes phone numbers in results.

---

**Problem: Search returns no results even though the person exists**

**Fix:** The person's discovery settings may be turned off.
1. Open their profile → Edit → Privacy Settings
2. Make sure **"Discoverable by name"** is turned on
3. If searching by phone: **"Discoverable by phone"** must also be on

---

**Problem: Phone number search returns no results**

**Fix:** Phone numbers are stored as hashed values. The person must have:
1. Added their phone number on their profile
2. Enabled **"Discoverable by phone"** in privacy settings
3. The search input must be the exact same number (same country code format)

---

**Problem: Search results show but photos are missing**

**Fix:** This is expected behaviour — the search page shows initials instead of photos for performance and privacy. Click "View profile" to see the full profile with photos.

---

## SECTION 5 — Person Profile (`/people/[personId]`)

**What it does:** Shows a person's full profile — Then & Now photos, biography, family connections, documents they've shared with you, profile managers.

---

**Problem: Profile page shows "Not found" or redirects away**

**Fix:** Either the person ID in the URL is wrong, or RLS is blocking access. Check:
1. The URL has a valid UUID after `/people/`
2. The person exists: Supabase → Table Editor → `people` → filter by ID

---

**Problem: Then & Now photos don't load (shows camera/clock icon)**

**Fix:** Photos haven't been uploaded yet, OR signed URL generation is failing.
1. If photos were uploaded: check Supabase → Storage → `profile-photos` bucket → confirm files exist
2. Check Storage bucket policies allow SELECT for authenticated users
3. Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct in Vercel environment variables

---

**Problem: "Connect" button doesn't appear**

**Fix:** You may already be connected, have a pending request, or you're viewing your own profile.
- If pending: check `/connections` page
- If connected: the button is replaced with a "Connected" badge
- If own profile: edit button shows instead

---

**Problem: "This is me" / Claim button doesn't appear**

**Fix:** The claim button only shows if:
1. The profile has no account (`user_id = null`)
2. You are logged in
3. You are not already a manager of that profile

---

## SECTION 6 — Add Family Member (`/people/add`)

**What it does:** Creates a new person profile for a family member who doesn't have an account. Automatically creates the relationship and makes you a profile manager.

---

**Problem: Form submits but profile isn't created**

**Fix:** Check browser Console for errors. Common causes:
1. Supabase RLS blocking the insert — make sure you're logged in
2. Duplicate relationship — a relationship between you and that person already exists

---

**Problem: Photo upload fails**

**Fix:**
1. File must be JPG or PNG, maximum 2 MB
2. Check Supabase → Storage → `profile-photos` bucket → Policies — INSERT policy must exist for authenticated users
3. Check the bucket name is exactly `profile-photos` (with a hyphen, not underscore)

---

**Problem: "File is too large" error**

**Fix:** The file exceeds 2 MB. Compress the image first:
- On Windows: open the image in Paint → File → Save As → reduce quality
- Online tool: https://squoosh.app (free, no upload to third party)

---

## SECTION 7 — Family Tree (`/family-tree`)

**What it does:** Interactive visual tree of your confirmed family connections. Uses ReactFlow. Supports zoom, pan, and clicking profiles.

---

**Problem: Family tree shows "No family connections yet"**

**Fix:** You need at least one accepted family relationship. Go to `/connections` — if you have pending requests, accept them. Or add a family member via `/people/add`.

---

**Problem: Family tree loads but some people are missing**

**Fix:** Only **accepted** relationships appear in the tree. Pending relationships are not shown. Also, the tree shows up to 2 hops from your profile — very distant relatives may not appear.

---

**Problem: Tree layout looks broken or overlapping**

**Fix:** This can happen with complex family structures. Try:
1. Click the **fit view** button (square icon in the tree controls)
2. Use scroll to zoom out
3. Drag to reposition

---

**Problem: Clicking a person in the tree does nothing**

**Fix:** JavaScript error is likely blocking the click handler. Check browser Console (F12) for red errors.

---

## SECTION 8 — Connections (`/connections`)

**What it does:** Shows incoming family connection requests (pending), all accepted family members, and outgoing requests you've sent.

---

**Problem: Accept button does nothing**

**Fix:** 
1. Check browser Console for errors
2. Most likely a Supabase RLS issue — you can only accept requests where you are `person_b` (the receiver)
3. Refresh the page and try again

---

**Problem: A request was accepted but family count didn't update**

**Fix:** Family count is calculated live from the database. Hard refresh the dashboard (Ctrl+Shift+R). If still wrong, the `get_family_count` SQL function may not be installed — run `001_initial_schema.sql` in Supabase SQL Editor.

---

## SECTION 9 — Friends (`/friends`)

**What it does:** Shows friend connections and incoming friend requests. Completely separate from family tree.

---

**Problem: A friend appears in the family count**

**This should never happen.** Friends are stored in `friend_connections` table, family in `relationships` table. Family count only queries `relationships`. If this is happening:
1. Check Supabase → SQL Editor → run: `SELECT * FROM relationships WHERE person_a_id = 'your-person-id' OR person_b_id = 'your-person-id';`
2. If the friend appears there, they were accidentally added as a family member instead of a friend
3. Delete that relationship: `DELETE FROM relationships WHERE id = 'relationship-id';`

---

## SECTION 10 — Documents (`/documents`)

**What it does:** Lists all documents you own. Allows uploading, downloading, sharing, and deleting.

---

**Problem: Documents list is empty even after uploading**

**Fix:**
1. Confirm the upload succeeded — check Supabase → Storage → `documents` bucket → look for the file
2. Check Supabase → Table Editor → `documents` table → filter by `owner_person_id`
3. If file exists in storage but not in table, the database insert failed — try uploading again

---

**Problem: Download button doesn't work / opens a blank page**

**Fix:** Signed URL generation failed.
1. Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct in Vercel
2. Check Supabase → Storage → `documents` → Policies — SELECT policy must exist
3. Check the file still exists in storage (it may have been deleted manually)

---

**Problem: "File is too large" appears even for a small file**

**Fix:** The MIME type check may be failing before the size check. Make sure the file is genuinely a PDF, JPG, or PNG — not a file that was renamed to have one of those extensions.

---

**Problem: PDF shows as blank when opened**

**Fix:** The signed URL expired (they last 60 seconds). Close and reopen the document from the app — a fresh URL will be generated.

---

## SECTION 11 — Upload Document (`/documents/upload`)

**What it does:** Uploads a document to private storage and creates a database record. The document is private by default.

---

**Problem: Upload fails with no error message**

**Fix:**
1. Check browser Console (F12) for the actual error
2. Check file size is under 2 MB
3. Check file type is PDF, JPG, or PNG
4. Check Supabase Storage → `documents` bucket → Policies → INSERT policy exists

---

**Problem: Can't see other family members in the "Document owner" dropdown**

**Fix:** The dropdown only shows people you are a **profile manager** for, plus yourself. To upload a document for someone else:
1. First become their profile manager: go to their profile → About tab → Profile managers section
2. Or ask an existing manager to add you

---

**Problem: Upload succeeds but file can't be found later**

**Fix:** Check two places:
1. Supabase → Storage → `documents` bucket → the file should be there
2. Supabase → Table Editor → `documents` table → a row should exist

If the file is in storage but no row in the table, the database insert failed after the upload. The orphaned file in storage can be deleted manually. Try uploading again.

---

## SECTION 12 — Document Detail + Sharing (`/documents/[docId]`)

**What it does:** Shows document details, allows downloading, managing who has access, and deleting the document.

---

**Problem: "Manage sharing" dialog shows no one to share with**

**Fix:** You must have accepted family connections or friend connections to share with. Go to `/connections` or `/friends` and confirm you have accepted connections.

---

**Problem: Shared a document but the other person can't see it**

**Fix:** Check:
1. The document `permission_mode` is set to `shared` (not `private`)
2. The person is listed in the "Shared with" section on the document page
3. They are looking in `/shared-with-me`, not `/documents` (which only shows documents they own)
4. They are logged in to their account

---

**Problem: Removed someone's access but they can still see the document**

**Fix:** 
1. Access is checked in real-time on every request — removing them should take effect immediately
2. If they cached the signed URL, it expires after 60 seconds — they will lose access automatically
3. Confirm the permission was actually removed: Supabase → Table Editor → `document_permissions` → filter by `document_id`

---

## SECTION 13 — Shared With Me (`/shared-with-me`)

**What it does:** Shows all documents that other people have explicitly shared with you.

---

**Problem: Page is empty even though someone said they shared a document**

**Fix:**
1. Confirm the sharer added you specifically — go to the document → Manage sharing → confirm your name is listed
2. Check Supabase → `document_permissions` → filter by `granted_to_person_id` = your person ID
3. Make sure you are logged in with the correct account

---

## SECTION 14 — Notifications (`/notifications`)

**What it does:** Shows in-app notifications — connection requests, document downloads, claim requests etc.

---

**Problem: Not receiving notifications**

**Fix:** Notifications are created automatically by the app for most actions. They require:
1. The actor (person doing the action) is logged in
2. The recipient has an account (`user_id` is not null)
3. Real-time subscriptions require the browser to be open and connected

If a profile has no account, notifications about it won't be delivered to anyone.

---

**Problem: Notification count badge shows wrong number**

**Fix:** Hard refresh the page (Ctrl+Shift+R). The badge uses a real-time Supabase subscription — if the connection dropped, it may be stale.

---

## SECTION 15 — Activity Log (`/activity`)

**What it does:** Shows your personal audit trail — every action you performed, every document you viewed/downloaded.

---

**Problem: Activity log is empty**

**Fix:** The audit log only records actions performed while logged in. New accounts will have a `user_registered` entry. Actions recorded include: profile created/updated, relationships, documents uploaded/viewed/downloaded/deleted, permission changes.

---

**Problem: Cannot see audit events for documents owned by others**

**Fix:** By design — you can only see your own actions. Document owners can see who accessed their documents in the same log (it shows their `actor_person_id`).

---

## SECTION 16 — Claim Profile (`/claim`)

**What it does:** Allows a registered user to request ownership of an existing profile that was created for them by someone else.

---

**Problem: Claim submitted but nothing happened**

**Fix:** The claim needs to be approved by an existing profile manager.
1. Check if the profile has any managers: view the profile → About tab → Profile managers
2. If there are managers, they need to approve it in the database (approval UI coming soon)
3. Temporary workaround: Supabase → Table Editor → `profile_claim_requests` → find the pending request → change `status` to `approved` → also update `people` table: set `user_id` to the claimant's user ID

---

**Problem: "You already have a pending claim" error**

**Fix:** You already submitted a claim for this profile. Wait for a manager to review it. Check `/notifications` for any response.

---

## SECTION 17 — Settings (`/settings/privacy`)

**What it does:** Controls whether your profile appears in name search or phone search.

---

**Problem: Privacy settings don't save**

**Fix:**
1. Make sure you click the **Save settings** button
2. Check browser Console for errors
3. RLS policy requires you are updating your own person record — confirm you are logged in

---

## SECTION 18 — Settings (`/settings/security`)

**What it does:** Allows changing your account password.

---

**Problem: Password change fails with no error**

**Fix:** Supabase Auth requires you to be recently authenticated to change password. Try logging out and logging back in, then changing the password immediately.

---

## SECTION 19 — General Issues

### Photos show as initials everywhere

**What it means:** Signed URL generation for profile photos is failing.

**Fix:**
1. Supabase → Storage → `profile-photos` → Policies → confirm SELECT policy exists
2. Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel environment variables is correct
3. Check the bucket name is exactly `profile-photos`

---

### Everything works locally but not on the live site

**What it means:** Environment variable mismatch between local and Vercel.

**Fix:**
1. Vercel → Project → Settings → Environment Variables
2. Compare with your local `.env.local`
3. After changing Vercel env vars, you must **redeploy** — Vercel → Deployments → Redeploy

---

### "relation does not exist" database errors

**What it means:** The database schema migration hasn't been run.

**Fix:** Supabase → SQL Editor → New query → paste entire contents of `supabase/migrations/001_initial_schema.sql` → Run.

---

### RLS policy errors ("new row violates row-level security policy")

**What it means:** The logged-in user doesn't have permission to do what they're trying to do.

**Common causes:**
- Trying to upload a document for someone you're not a manager of
- Trying to accept a connection request you didn't receive
- Trying to edit a profile you don't own

**Fix:** These are working as intended — they're security rules, not bugs. If a legitimate action is being blocked, check the relevant RLS policy in `001_initial_schema.sql` and verify the logic is correct for your use case.

---

## SECTION 20 — Database Direct Access (Advanced)

When you need to inspect or fix data directly:

1. Go to https://supabase.com/dashboard/project/tzwvjkghukmhfnxdqqhs/editor
2. This is the Supabase Table Editor — you can browse all tables visually
3. For SQL queries: https://supabase.com/dashboard/project/tzwvjkghukmhfnxdqqhs/sql

**Useful queries:**

Find a person by name:
```sql
SELECT id, full_name, user_id, discoverable_by_name FROM people WHERE full_name ILIKE '%name%';
```

Check a user's person record:
```sql
SELECT p.* FROM people p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user@email.com';
```

Check pending connection requests:
```sql
SELECT * FROM relationships WHERE status = 'pending';
```

Check document permissions for a document:
```sql
SELECT dp.*, p.full_name FROM document_permissions dp JOIN people p ON dp.granted_to_person_id = p.id WHERE dp.document_id = 'document-uuid-here';
```

Check audit log for a document:
```sql
SELECT * FROM audit_logs WHERE target_id = 'document-uuid-here' ORDER BY created_at DESC;
```

---

## Getting Help

If you can't find the issue in this guide:

1. Copy the exact error message from the browser Console (F12 → Console tab)
2. Note which page you were on and what you were trying to do
3. Check the Vercel deployment logs and Supabase logs
4. Share all of the above — the more detail, the faster it can be fixed
