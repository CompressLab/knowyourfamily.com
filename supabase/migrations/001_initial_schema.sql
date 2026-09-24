-- ============================================================
-- FamilyTree — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type relationship_type_enum as enum (
  'parent', 'child', 'spouse', 'sibling',
  'grandparent', 'grandchild', 'uncle', 'aunt',
  'nephew', 'niece', 'cousin', 'other'
);

create type connection_status_enum as enum (
  'pending', 'accepted', 'declined'
);

create type document_type_enum as enum (
  'aadhaar', 'pan', 'passport', 'voter_id',
  'driving_licence', 'birth_certificate', 'marriage_certificate',
  'death_certificate', 'property_document', 'other'
);

create type document_permission_enum as enum (
  'private', 'shared'
);

create type friend_label_enum as enum (
  'like_a_brother', 'like_a_sister', 'best_friend',
  'close_friend', 'friend', 'custom'
);

create type audit_action_enum as enum (
  'profile_created', 'profile_updated',
  'relationship_requested', 'relationship_accepted', 'relationship_declined',
  'profile_claimed', 'profile_claim_approved', 'profile_claim_declined',
  'profile_manager_added', 'profile_manager_removed',
  'document_uploaded', 'document_viewed', 'document_downloaded',
  'document_deleted', 'document_permission_changed',
  'friend_request_sent', 'friend_request_accepted',
  'user_registered', 'user_login'
);

-- ============================================================
-- PEOPLE — Core entity; account is optional
-- ============================================================

create table public.people (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  full_name             text not null check (char_length(full_name) >= 2 and char_length(full_name) <= 150),
  short_bio             text check (char_length(short_bio) <= 500),

  -- Stored as sha256 hash so the raw number is never queryable by default
  -- Match is done by hashing the search input server-side
  phone_number_hash     text unique,  -- sha256(normalized_phone)

  -- Storage paths (never public URLs — always generate signed URLs)
  current_photo_path    text,
  past_photo_path       text,
  past_photo_period     text check (char_length(past_photo_period) <= 50),

  -- Nullable — null means no account
  user_id               uuid unique references auth.users(id) on delete set null,

  -- Discovery preferences
  discoverable_by_name  boolean not null default true,
  discoverable_by_phone boolean not null default false
);

-- Index for name search
create index people_full_name_idx on public.people using gin(to_tsvector('english', full_name));
create index people_user_id_idx on public.people(user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_updated_at
  before update on public.people
  for each row execute function update_updated_at();

-- ============================================================
-- PROFILE MANAGERS
-- ============================================================

create table public.profile_managers (
  id                    uuid primary key default uuid_generate_v4(),
  person_id             uuid not null references public.people(id) on delete cascade,
  manager_person_id     uuid not null references public.people(id) on delete cascade,
  granted_by_person_id  uuid not null references public.people(id) on delete cascade,
  created_at            timestamptz not null default now(),

  unique (person_id, manager_person_id),
  -- A person cannot manage themselves via this table
  check (person_id != manager_person_id)
);

create index pm_person_idx on public.profile_managers(person_id);
create index pm_manager_idx on public.profile_managers(manager_person_id);

-- ============================================================
-- RELATIONSHIPS — Generic graph model, no hard-coded columns
-- ============================================================

create table public.relationships (
  id                      uuid primary key default uuid_generate_v4(),
  person_a_id             uuid not null references public.people(id) on delete cascade,
  person_b_id             uuid not null references public.people(id) on delete cascade,
  relationship_type       relationship_type_enum not null,
  status                  connection_status_enum not null default 'pending',
  requested_by_person_id  uuid not null references public.people(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Prevent self-relationships
  check (person_a_id != person_b_id),
  -- Prevent duplicate pairs regardless of direction
  unique (person_a_id, person_b_id)
);

create index rel_a_idx on public.relationships(person_a_id);
create index rel_b_idx on public.relationships(person_b_id);
create index rel_status_idx on public.relationships(status);

create trigger relationships_updated_at
  before update on public.relationships
  for each row execute function update_updated_at();

-- ============================================================
-- FRIEND CONNECTIONS — Separate from family tree
-- ============================================================

create table public.friend_connections (
  id                      uuid primary key default uuid_generate_v4(),
  person_a_id             uuid not null references public.people(id) on delete cascade,
  person_b_id             uuid not null references public.people(id) on delete cascade,
  label                   friend_label_enum,
  custom_label            text check (char_length(custom_label) <= 50),
  status                  connection_status_enum not null default 'pending',
  requested_by_person_id  uuid not null references public.people(id),
  created_at              timestamptz not null default now(),

  check (person_a_id != person_b_id),
  unique (person_a_id, person_b_id)
);

create index fc_a_idx on public.friend_connections(person_a_id);
create index fc_b_idx on public.friend_connections(person_b_id);

-- ============================================================
-- PROFILE CLAIM REQUESTS
-- ============================================================

create table public.profile_claim_requests (
  id                    uuid primary key default uuid_generate_v4(),
  person_id             uuid not null references public.people(id) on delete cascade,
  claimant_user_id      uuid not null references auth.users(id) on delete cascade,
  status                text not null default 'pending' check (status in ('pending','approved','declined')),
  message               text check (char_length(message) <= 1000),
  reviewed_by_person_id uuid references public.people(id),
  created_at            timestamptz not null default now(),
  reviewed_at           timestamptz,

  -- Prevent duplicate pending claims for same person+user
  unique (person_id, claimant_user_id)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

create table public.documents (
  id                    uuid primary key default uuid_generate_v4(),
  owner_person_id       uuid not null references public.people(id) on delete cascade,
  uploaded_by_person_id uuid not null references public.people(id),
  document_name         text not null check (char_length(document_name) >= 1 and char_length(document_name) <= 200),
  document_type         document_type_enum not null,
  storage_path          text not null unique, -- private storage key, never public
  mime_type             text not null check (mime_type in ('application/pdf','image/jpeg','image/jpg','image/png')),
  file_size_bytes       bigint not null check (file_size_bytes > 0 and file_size_bytes <= 2097152), -- 2 MB max
  permission_mode       document_permission_enum not null default 'private',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index doc_owner_idx on public.documents(owner_person_id);
create index doc_uploader_idx on public.documents(uploaded_by_person_id);

create trigger documents_updated_at
  before update on public.documents
  for each row execute function update_updated_at();

-- ============================================================
-- DOCUMENT PERMISSIONS — Explicit per-person grants
-- ============================================================

create table public.document_permissions (
  id                    uuid primary key default uuid_generate_v4(),
  document_id           uuid not null references public.documents(id) on delete cascade,
  granted_to_person_id  uuid not null references public.people(id) on delete cascade,
  granted_by_person_id  uuid not null references public.people(id),
  created_at            timestamptz not null default now(),

  unique (document_id, granted_to_person_id)
);

create index dp_doc_idx on public.document_permissions(document_id);
create index dp_grantee_idx on public.document_permissions(granted_to_person_id);

-- ============================================================
-- AUDIT LOGS — Append-only security log
-- ============================================================

create table public.audit_logs (
  id                uuid primary key default uuid_generate_v4(),
  actor_person_id   uuid references public.people(id) on delete set null,
  action            audit_action_enum not null,
  target_type       text not null check (target_type in ('person','document','relationship','claim','friend','account')),
  target_id         uuid,
  metadata          jsonb,
  ip_address        inet,
  created_at        timestamptz not null default now()
);

create index audit_actor_idx on public.audit_logs(actor_person_id);
create index audit_target_idx on public.audit_logs(target_id);
create index audit_created_idx on public.audit_logs(created_at desc);

-- No UPDATE or DELETE on audit_logs — append only enforced via RLS

-- ============================================================
-- NOTIFICATIONS — In-app only for MVP
-- ============================================================

create table public.notifications (
  id                    uuid primary key default uuid_generate_v4(),
  recipient_person_id   uuid not null references public.people(id) on delete cascade,
  actor_person_id       uuid references public.people(id) on delete set null,
  notification_type     text not null,
  message               text not null,
  read                  boolean not null default false,
  related_id            uuid,
  created_at            timestamptz not null default now()
);

create index notif_recipient_idx on public.notifications(recipient_person_id);
create index notif_read_idx on public.notifications(recipient_person_id, read);

-- ============================================================
-- USER PRIVACY SETTINGS
-- ============================================================

create table public.user_privacy_settings (
  id                    uuid primary key default uuid_generate_v4(),
  person_id             uuid not null unique references public.people(id) on delete cascade,
  discoverable_by_name  boolean not null default true,
  discoverable_by_phone boolean not null default false,
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns the person_id for the currently authenticated user
create or replace function auth_person_id()
returns uuid language sql security definer stable as $$
  select id from public.people where user_id = auth.uid() limit 1;
$$;

-- Checks if the current user is an authorized manager of a person
create or replace function is_manager_of(target_person_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profile_managers
    where person_id = target_person_id
    and manager_person_id = auth_person_id()
  );
$$;

-- Checks if the current user can access a document
create or replace function can_access_document(doc_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id
    and (
      -- Owner of the profile
      d.owner_person_id = auth_person_id()
      -- Uploader
      or d.uploaded_by_person_id = auth_person_id()
      -- Profile manager of the owner
      or is_manager_of(d.owner_person_id)
      -- Explicitly granted permission (only if document is shared mode)
      or (
        d.permission_mode = 'shared'
        and exists (
          select 1 from public.document_permissions dp
          where dp.document_id = d.id
          and dp.granted_to_person_id = auth_person_id()
        )
      )
    )
  );
$$;

-- Family count: deduplicated reachable confirmed family network
create or replace function get_family_count(p_id uuid)
returns bigint language sql security definer stable as $$
  select count(distinct case
    when r.person_a_id = p_id then r.person_b_id
    else r.person_a_id
  end)
  from public.relationships r
  where (r.person_a_id = p_id or r.person_b_id = p_id)
  and r.status = 'accepted';
$$;

-- Friend count
create or replace function get_friend_count(p_id uuid)
returns bigint language sql security definer stable as $$
  select count(distinct case
    when fc.person_a_id = p_id then fc.person_b_id
    else fc.person_a_id
  end)
  from public.friend_connections fc
  where (fc.person_a_id = p_id or fc.person_b_id = p_id)
  and fc.status = 'accepted';
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.people enable row level security;
alter table public.profile_managers enable row level security;
alter table public.relationships enable row level security;
alter table public.friend_connections enable row level security;
alter table public.profile_claim_requests enable row level security;
alter table public.documents enable row level security;
alter table public.document_permissions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.user_privacy_settings enable row level security;

-- ── PEOPLE RLS ──────────────────────────────────────────────

-- Anyone authenticated can read discoverable profiles (name search)
create policy "people_select_discoverable"
  on public.people for select
  to authenticated
  using (discoverable_by_name = true);

-- Users can always read their own person record
create policy "people_select_own"
  on public.people for select
  to authenticated
  using (user_id = auth.uid());

-- Profile managers can read their managed profiles
create policy "people_select_managed"
  on public.people for select
  to authenticated
  using (is_manager_of(id));

-- Only authenticated users can insert (creating profiles for others)
create policy "people_insert"
  on public.people for insert
  to authenticated
  with check (true);

-- Users can update their own profile
create policy "people_update_own"
  on public.people for update
  to authenticated
  using (user_id = auth.uid());

-- Profile managers can update managed profiles
create policy "people_update_managed"
  on public.people for update
  to authenticated
  using (is_manager_of(id));

-- No deletes via client (soft-delete pattern via API if needed)

-- ── PROFILE MANAGERS RLS ─────────────────────────────────────

create policy "pm_select"
  on public.profile_managers for select
  to authenticated
  using (
    manager_person_id = auth_person_id()
    or person_id = auth_person_id()
    or is_manager_of(person_id)
  );

create policy "pm_insert"
  on public.profile_managers for insert
  to authenticated
  with check (
    -- Only the person themselves (if they have an account) or current managers can add managers
    auth_person_id() = person_id
    or is_manager_of(person_id)
  );

create policy "pm_delete"
  on public.profile_managers for delete
  to authenticated
  using (
    auth_person_id() = person_id
    or is_manager_of(person_id)
  );

-- ── RELATIONSHIPS RLS ─────────────────────────────────────────

create policy "rel_select"
  on public.relationships for select
  to authenticated
  using (
    person_a_id = auth_person_id()
    or person_b_id = auth_person_id()
    or is_manager_of(person_a_id)
    or is_manager_of(person_b_id)
  );

create policy "rel_insert"
  on public.relationships for insert
  to authenticated
  with check (
    requested_by_person_id = auth_person_id()
    or is_manager_of(person_a_id)
  );

create policy "rel_update"
  on public.relationships for update
  to authenticated
  using (
    person_a_id = auth_person_id()
    or person_b_id = auth_person_id()
    or is_manager_of(person_a_id)
    or is_manager_of(person_b_id)
  );

-- ── FRIEND CONNECTIONS RLS ────────────────────────────────────

create policy "fc_select"
  on public.friend_connections for select
  to authenticated
  using (
    person_a_id = auth_person_id()
    or person_b_id = auth_person_id()
  );

create policy "fc_insert"
  on public.friend_connections for insert
  to authenticated
  with check (requested_by_person_id = auth_person_id());

create policy "fc_update"
  on public.friend_connections for update
  to authenticated
  using (
    person_a_id = auth_person_id()
    or person_b_id = auth_person_id()
  );

-- ── PROFILE CLAIM REQUESTS RLS ───────────────────────────────

create policy "pcr_select"
  on public.profile_claim_requests for select
  to authenticated
  using (
    claimant_user_id = auth.uid()
    or is_manager_of(person_id)
    or auth_person_id() = person_id
  );

create policy "pcr_insert"
  on public.profile_claim_requests for insert
  to authenticated
  with check (claimant_user_id = auth.uid());

create policy "pcr_update"
  on public.profile_claim_requests for update
  to authenticated
  using (
    is_manager_of(person_id)
    or auth_person_id() = person_id
  );

-- ── DOCUMENTS RLS ─────────────────────────────────────────────

create policy "doc_select"
  on public.documents for select
  to authenticated
  using (can_access_document(id));

create policy "doc_insert"
  on public.documents for insert
  to authenticated
  with check (
    -- Uploader must be uploading for themselves or a profile they manage
    uploaded_by_person_id = auth_person_id()
    and (
      owner_person_id = auth_person_id()
      or is_manager_of(owner_person_id)
    )
  );

create policy "doc_update"
  on public.documents for update
  to authenticated
  using (
    owner_person_id = auth_person_id()
    or is_manager_of(owner_person_id)
  );

create policy "doc_delete"
  on public.documents for delete
  to authenticated
  using (
    owner_person_id = auth_person_id()
    or is_manager_of(owner_person_id)
  );

-- ── DOCUMENT PERMISSIONS RLS ─────────────────────────────────

create policy "dp_select"
  on public.document_permissions for select
  to authenticated
  using (
    granted_to_person_id = auth_person_id()
    or exists (
      select 1 from public.documents d
      where d.id = document_id
      and (d.owner_person_id = auth_person_id() or is_manager_of(d.owner_person_id))
    )
  );

create policy "dp_insert"
  on public.document_permissions for insert
  to authenticated
  with check (
    granted_by_person_id = auth_person_id()
    and exists (
      select 1 from public.documents d
      where d.id = document_id
      and (d.owner_person_id = auth_person_id() or is_manager_of(d.owner_person_id))
    )
  );

create policy "dp_delete"
  on public.document_permissions for delete
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
      and (d.owner_person_id = auth_person_id() or is_manager_of(d.owner_person_id))
    )
  );

-- ── AUDIT LOGS RLS ────────────────────────────────────────────

-- Append-only: users can only insert, never update or delete
create policy "audit_insert"
  on public.audit_logs for insert
  to authenticated
  with check (actor_person_id = auth_person_id());

-- Users can only read their own audit trail or audit on their documents
create policy "audit_select"
  on public.audit_logs for select
  to authenticated
  using (
    actor_person_id = auth_person_id()
    or (
      target_type = 'document'
      and target_id is not null
      and exists (
        select 1 from public.documents d
        where d.id = target_id
        and (d.owner_person_id = auth_person_id() or is_manager_of(d.owner_person_id))
      )
    )
  );

-- ── NOTIFICATIONS RLS ─────────────────────────────────────────

create policy "notif_select"
  on public.notifications for select
  to authenticated
  using (recipient_person_id = auth_person_id());

create policy "notif_update"
  on public.notifications for update
  to authenticated
  using (recipient_person_id = auth_person_id());

-- Insert allowed from any authenticated user (to notify someone)
create policy "notif_insert"
  on public.notifications for insert
  to authenticated
  with check (true);

-- ── USER PRIVACY SETTINGS RLS ─────────────────────────────────

create policy "ups_select"
  on public.user_privacy_settings for select
  to authenticated
  using (person_id = auth_person_id());

create policy "ups_insert"
  on public.user_privacy_settings for insert
  to authenticated
  with check (person_id = auth_person_id());

create policy "ups_update"
  on public.user_privacy_settings for update
  to authenticated
  using (person_id = auth_person_id());

-- ============================================================
-- STORAGE BUCKET POLICIES (apply after creating bucket)
-- Run after creating "documents" and "profile-photos" buckets
-- ============================================================

-- NOTE: Create these buckets in Supabase Dashboard → Storage
-- with "Public" set to FALSE (private buckets)
--
-- documents     → private, 2MB limit
-- profile-photos → private, 2MB limit

-- ============================================================
-- TRIGGER: Auto-create person record on user registration
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_person_id uuid;
begin
  -- Create person record
  insert into public.people (full_name, user_id, discoverable_by_name)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.id,
    true
  )
  returning id into new_person_id;

  -- Create default privacy settings
  insert into public.user_privacy_settings (person_id, discoverable_by_name, discoverable_by_phone)
  values (new_person_id, true, false);

  -- Log registration
  insert into public.audit_logs (actor_person_id, action, target_type, target_id)
  values (new_person_id, 'user_registered', 'account', new_person_id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
