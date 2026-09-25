export * from "./database";

// ── UI / Form types ───────────────────────────────────────────
export interface SearchResult {
  id: string;
  full_name: string;
  short_bio: string | null;
  current_photo_url: string | null;
  family_count: number;
  friend_count: number;
  // phone_number is intentionally NEVER returned in search results
}

export interface Know Your FamilyNode {
  id: string;
  full_name: string;
  current_photo_url: string | null;
  user_id: string | null;
}

export interface Know Your FamilyEdge {
  source: string;
  target: string;
  relationship_type: string;
  label: string;
}

export interface UploadDocumentPayload {
  owner_person_id: string;
  document_name: string;
  document_type: string;
  file: File;
}

export interface ShareDocumentPayload {
  document_id: string;
  permission_mode: "private" | "shared";
  shared_with_person_ids: string[];
}
