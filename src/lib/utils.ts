import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createClient } from "@/lib/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a short-lived signed URL for a private storage object.
 * Always use this — never expose raw storage paths.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60
): Promise<string | null> {
  if (!path) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Relationship type labels for display
 */
export const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: "Parent",
  child: "Child",
  spouse: "Spouse",
  sibling: "Sibling",
  grandparent: "Grandparent",
  grandchild: "Grandchild",
  uncle: "Uncle",
  aunt: "Aunt",
  nephew: "Nephew",
  niece: "Niece",
  cousin: "Cousin",
  other: "Other",
};

/**
 * Inverse relationship (for display from the other person's perspective)
 */
export const INVERSE_RELATIONSHIP: Record<string, string> = {
  parent: "child",
  child: "parent",
  spouse: "spouse",
  sibling: "sibling",
  grandparent: "grandchild",
  grandchild: "grandparent",
  uncle: "nephew/niece",
  aunt: "nephew/niece",
  nephew: "uncle/aunt",
  niece: "uncle/aunt",
  cousin: "cousin",
  other: "other",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN Card",
  passport: "Passport",
  voter_id: "Voter ID",
  driving_licence: "Driving Licence",
  birth_certificate: "Birth Certificate",
  marriage_certificate: "Marriage Certificate",
  death_certificate: "Death Certificate",
  property_document: "Property Document",
  other: "Other",
};

export const FRIEND_LABEL_DISPLAY: Record<string, string> = {
  like_a_brother: "Like a Brother",
  like_a_sister: "Like a Sister",
  best_friend: "Best Friend",
  close_friend: "Close Friend",
  friend: "Friend",
  custom: "Friend",
};

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB in bytes
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Hash a phone number (client-side for search) — same algorithm as server
 */
export async function hashPhone(phone: string): Promise<string> {
  const normalized = phone.replace(/\D/g, "");
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
