// ============================================================
// Database Types — mirrors the Supabase PostgreSQL schema
// ============================================================

export type RelationshipType =
  | "parent"
  | "child"
  | "spouse"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "uncle"
  | "aunt"
  | "nephew"
  | "niece"
  | "cousin"
  | "other";

export type ConnectionStatus = "pending" | "accepted" | "declined";

export type DocumentType =
  | "aadhaar"
  | "pan"
  | "passport"
  | "voter_id"
  | "driving_licence"
  | "birth_certificate"
  | "marriage_certificate"
  | "death_certificate"
  | "property_document"
  | "other";

export type DocumentPermission = "private" | "shared";

export type FriendLabel =
  | "like_a_brother"
  | "like_a_sister"
  | "best_friend"
  | "close_friend"
  | "friend"
  | "custom";

export type AuditAction =
  | "profile_created"
  | "profile_updated"
  | "relationship_requested"
  | "relationship_accepted"
  | "relationship_declined"
  | "profile_claimed"
  | "profile_claim_approved"
  | "profile_claim_declined"
  | "profile_manager_added"
  | "profile_manager_removed"
  | "document_uploaded"
  | "document_viewed"
  | "document_downloaded"
  | "document_deleted"
  | "document_permission_changed"
  | "friend_request_sent"
  | "friend_request_accepted"
  | "user_registered"
  | "user_login";

// ── People ────────────────────────────────────────────────────
export interface Person {
  id: string;
  created_at: string;
  updated_at: string;

  // Identity
  full_name: string;
  short_bio: string | null;
  phone_number: string | null; // stored hashed/encrypted server-side; never returned raw to clients
  phone_number_hash?: string | null; // SHA-256 hash (internal use)

  // Photos (signed URLs fetched on demand, never raw storage paths)
  current_photo_url: string | null; // storage path, not public URL
  past_photo_url: string | null;
  past_photo_period: string | null; // e.g. "Around 2002", "Early 1990s"

  // Account linkage — NULL means no account
  user_id: string | null;

  // Visibility: whether this person can be found in search
  discoverable_by_name: boolean;
  discoverable_by_phone: boolean;
}

// ── Users / Accounts ─────────────────────────────────────────
export interface UserProfile {
  id: string; // matches auth.users.id
  person_id: string; // foreign key → people.id
  email: string;
  created_at: string;
}

// ── Profile Managers ─────────────────────────────────────────
export interface ProfileManager {
  id: string;
  person_id: string; // the profile being managed
  manager_person_id: string; // the person who manages it
  granted_by_person_id: string; // who granted the access
  created_at: string;
}

// ── Relationships ─────────────────────────────────────────────
export interface Relationship {
  id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: RelationshipType; // A is <type> of B
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  requested_by_person_id: string;
}

// ── Friend Connections ────────────────────────────────────────
export interface FriendConnection {
  id: string;
  person_a_id: string;
  person_b_id: string;
  label: FriendLabel | null;
  custom_label: string | null;
  status: ConnectionStatus;
  requested_by_person_id: string;
  created_at: string;
}

// ── Profile Claim Requests ────────────────────────────────────
export interface ProfileClaimRequest {
  id: string;
  person_id: string; // the profile being claimed
  claimant_user_id: string; // the registered user claiming it
  status: "pending" | "approved" | "declined";
  message: string | null;
  reviewed_by_person_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// ── Documents ─────────────────────────────────────────────────
export interface Document {
  id: string;
  owner_person_id: string; // whose document this is
  uploaded_by_person_id: string; // who uploaded it
  document_name: string;
  document_type: DocumentType;
  storage_path: string; // private storage path — never exposed as-is
  mime_type: string;
  file_size_bytes: number;
  permission_mode: DocumentPermission;
  created_at: string;
  updated_at: string;
}

// ── Document Permissions ──────────────────────────────────────
export interface DocumentPermissionEntry {
  id: string;
  document_id: string;
  granted_to_person_id: string;
  granted_by_person_id: string;
  created_at: string;
}

// ── Audit Logs ────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  actor_person_id: string | null;
  action: AuditAction;
  target_type: "person" | "document" | "relationship" | "claim" | "friend";
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ── Notifications ─────────────────────────────────────────────
export interface Notification {
  id: string;
  recipient_person_id: string;
  actor_person_id: string | null;
  notification_type: string;
  message: string;
  read: boolean;
  related_id: string | null; // document_id, relationship_id, etc.
  created_at: string;
}

// ── User Privacy Settings ─────────────────────────────────────
export interface UserPrivacySettings {
  id: string;
  person_id: string;
  discoverable_by_name: boolean;
  discoverable_by_phone: boolean;
  updated_at: string;
}

// ── View / Joined types used by the frontend ─────────────────
export interface PersonWithCounts extends Person {
  family_count: number;
  friend_count: number;
  document_count?: number;
}

export interface RelationshipWithPerson extends Relationship {
  person_a: Person;
  person_b: Person;
}

export interface DocumentWithPermissions extends Document {
  shared_with: PersonWithName[];
}

export interface PersonWithName {
  person_id: string;
  full_name: string;
  current_photo_url: string | null;
}

export interface NotificationWithActor extends Notification {
  actor: Person | null;
}
