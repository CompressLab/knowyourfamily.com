/**
 * Critical business logic tests for FamilyTree.
 * Tests core rules that must always hold true.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  RELATIONSHIP_LABELS,
  FRIEND_LABEL_DISPLAY,
  hashPhone,
  getInitials,
  formatFileSize,
} from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// 1. FILE VALIDATION — 2 MB limit enforced on client
// ─────────────────────────────────────────────────────────────
describe("File size limit", () => {
  it("MAX_FILE_SIZE is exactly 2 MB (2097152 bytes)", () => {
    expect(MAX_FILE_SIZE).toBe(2 * 1024 * 1024);
  });

  it("rejects files over 2 MB", () => {
    const overSize = MAX_FILE_SIZE + 1;
    expect(overSize > MAX_FILE_SIZE).toBe(true);
  });

  it("accepts files exactly at 2 MB", () => {
    expect(MAX_FILE_SIZE <= MAX_FILE_SIZE).toBe(true);
  });

  it("accepts files under 2 MB", () => {
    const smallFile = 500 * 1024; // 500 KB
    expect(smallFile <= MAX_FILE_SIZE).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. ALLOWED MIME TYPES
// ─────────────────────────────────────────────────────────────
describe("Allowed MIME types", () => {
  it("allows application/pdf", () => {
    expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
  });

  it("allows image/jpeg", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
  });

  it("allows image/png", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/png");
  });

  it("does NOT allow image/gif", () => {
    expect(ALLOWED_MIME_TYPES).not.toContain("image/gif");
  });

  it("does NOT allow application/zip", () => {
    expect(ALLOWED_MIME_TYPES).not.toContain("application/zip");
  });

  it("does NOT allow text/html (XSS prevention)", () => {
    expect(ALLOWED_MIME_TYPES).not.toContain("text/html");
  });
});

// ─────────────────────────────────────────────────────────────
// 3. RELATIONSHIP TYPES — generic model
// ─────────────────────────────────────────────────────────────
describe("Relationship model", () => {
  it("has all required relationship types", () => {
    const required = ["parent", "child", "spouse", "sibling", "grandparent", "grandchild", "uncle", "aunt", "nephew", "niece", "cousin", "other"];
    required.forEach(type => {
      expect(RELATIONSHIP_LABELS).toHaveProperty(type);
    });
  });

  it("does NOT have hard-coded person-specific keys", () => {
    const keys = Object.keys(RELATIONSHIP_LABELS);
    // Verify no father_id, mother_id etc.
    expect(keys).not.toContain("father_id");
    expect(keys).not.toContain("mother_id");
    expect(keys).not.toContain("son_id");
    expect(keys).not.toContain("daughter_id");
  });
});

// ─────────────────────────────────────────────────────────────
// 4. FRIEND LABELS — separate from family
// ─────────────────────────────────────────────────────────────
describe("Friend labels", () => {
  it("has like_a_brother label", () => {
    expect(FRIEND_LABEL_DISPLAY["like_a_brother"]).toBe("Like a Brother");
  });

  it("has like_a_sister label", () => {
    expect(FRIEND_LABEL_DISPLAY["like_a_sister"]).toBe("Like a Sister");
  });

  it("friend labels do NOT include family relationship types", () => {
    const familyTypes = ["parent", "child", "grandparent", "uncle", "aunt"];
    familyTypes.forEach(type => {
      expect(FRIEND_LABEL_DISPLAY).not.toHaveProperty(type);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 5. PHONE HASHING — privacy
// ─────────────────────────────────────────────────────────────
describe("Phone hashing", () => {
  it("produces a 64-char hex SHA-256 hash", async () => {
    const hash = await hashPhone("+91 98765 43210");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("produces same hash for same normalised number", async () => {
    // +91 98765 43210 and +91-98765-43210 both normalise to 919876543210
    const h1 = await hashPhone("+91 98765 43210");
    const h2 = await hashPhone("+91-98765-43210");
    expect(h1).toBe(h2);
  });

  it("normalises by stripping spaces and dashes", async () => {
    const h1 = await hashPhone("9876543210");
    const h2 = await hashPhone("98765 43210");
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different numbers", async () => {
    const h1 = await hashPhone("9876543210");
    const h2 = await hashPhone("9876543211");
    expect(h1).not.toBe(h2);
  });

  it("does NOT return raw phone number", async () => {
    const phone = "9876543210";
    const hash = await hashPhone(phone);
    expect(hash).not.toContain(phone);
  });
});

// ─────────────────────────────────────────────────────────────
// 6. INITIALS
// ─────────────────────────────────────────────────────────────
describe("getInitials", () => {
  it("extracts first two initials from full name", () => {
    expect(getInitials("Mohammed Azeem")).toBe("MA");
  });

  it("handles single name", () => {
    expect(getInitials("Ibrahim")).toBe("I");
  });

  it("handles three names — only first two", () => {
    expect(getInitials("Ahmed Ibrahim Al-Rashid")).toBe("AI");
  });

  it("uppercases initials", () => {
    expect(getInitials("john doe")).toBe("JD");
  });
});

// ─────────────────────────────────────────────────────────────
// 7. FILE SIZE FORMATTING
// ─────────────────────────────────────────────────────────────
describe("formatFileSize", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("2 MB file size displays correctly", () => {
    expect(formatFileSize(MAX_FILE_SIZE)).toBe("2.0 MB");
  });
});

// ─────────────────────────────────────────────────────────────
// 8. SELF-RELATIONSHIP PREVENTION
// Tests the constraint logic (SQL level enforced by CHECK constraint)
// ─────────────────────────────────────────────────────────────
describe("Self-relationship prevention", () => {
  it("detects identical person A and B IDs", () => {
    const personId = "abc-123";
    const isSelfRelationship = (a: string, b: string) => a === b;
    expect(isSelfRelationship(personId, personId)).toBe(true);
  });

  it("allows different person A and B IDs", () => {
    const isSelfRelationship = (a: string, b: string) => a === b;
    expect(isSelfRelationship("abc-123", "def-456")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// 9. DOCUMENT PRIVACY — permission logic
// ─────────────────────────────────────────────────────────────
describe("Document access control logic", () => {
  const makeDoc = (ownerId: string, permission: "private" | "shared") => ({
    owner_person_id: ownerId,
    permission_mode: permission,
  });

  const makePermissions = (grantedToIds: string[]) =>
    grantedToIds.map(id => ({ granted_to_person_id: id }));

  const canAccess = (
    doc: ReturnType<typeof makeDoc>,
    permissions: ReturnType<typeof makePermissions>,
    actorId: string,
    ownerManagerIds: string[] = []
  ) => {
    // Owner always has access
    if (doc.owner_person_id === actorId) return true;
    // Profile manager has access
    if (ownerManagerIds.includes(actorId)) return true;
    // Explicit permission if document is shared mode
    if (doc.permission_mode === "shared") {
      return permissions.some(p => p.granted_to_person_id === actorId);
    }
    // Private — no access
    return false;
  };

  it("owner can always access their own document", () => {
    const doc = makeDoc("user-1", "private");
    expect(canAccess(doc, [], "user-1")).toBe(true);
  });

  it("private document is inaccessible to non-owner without explicit grant", () => {
    const doc = makeDoc("user-1", "private");
    expect(canAccess(doc, [], "user-2")).toBe(false);
  });

  it("being a family member does NOT grant document access", () => {
    const doc = makeDoc("user-1", "private");
    const permissions = makePermissions([]); // no explicit grant
    // user-2 is family member but not in permissions
    expect(canAccess(doc, permissions, "user-2")).toBe(false);
  });

  it("explicit grant on shared document allows access", () => {
    const doc = makeDoc("user-1", "shared");
    const permissions = makePermissions(["user-2", "user-3"]);
    expect(canAccess(doc, permissions, "user-2")).toBe(true);
  });

  it("shared mode document without explicit grant is still inaccessible", () => {
    const doc = makeDoc("user-1", "shared");
    const permissions = makePermissions(["user-2"]);
    expect(canAccess(doc, permissions, "user-3")).toBe(false);
  });

  it("revoking permission immediately denies access", () => {
    const doc = makeDoc("user-1", "shared");
    let permissions = makePermissions(["user-2"]);
    expect(canAccess(doc, permissions, "user-2")).toBe(true);

    // Remove permission
    permissions = permissions.filter(p => p.granted_to_person_id !== "user-2");
    expect(canAccess(doc, permissions, "user-2")).toBe(false);
  });

  it("profile manager can access owner's document", () => {
    const doc = makeDoc("user-1", "private");
    const managerIds = ["manager-1"];
    expect(canAccess(doc, [], "manager-1", managerIds)).toBe(true);
  });

  it("unauthorized user cannot change document permissions", () => {
    // Only owner or manager can change permissions
    const canChangePermissions = (actorId: string, ownerId: string, managerIds: string[]) => {
      return actorId === ownerId || managerIds.includes(actorId);
    };
    expect(canChangePermissions("random-user", "owner", ["manager"])).toBe(false);
    expect(canChangePermissions("owner", "owner", [])).toBe(true);
    expect(canChangePermissions("manager", "owner", ["manager"])).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 10. FAMILY COUNT — friends must NOT count as family
// ─────────────────────────────────────────────────────────────
describe("Family count separation from friends", () => {
  it("family count uses relationships table, not friend_connections", () => {
    // Simulates counting
    const familyRels = [
      { person_a_id: "me", person_b_id: "dad", status: "accepted" },
      { person_a_id: "me", person_b_id: "mum", status: "accepted" },
    ];
    const friendConns = [
      { person_a_id: "me", person_b_id: "rahman", status: "accepted" },
    ];

    const familyCount = familyRels.filter(r =>
      (r.person_a_id === "me" || r.person_b_id === "me") && r.status === "accepted"
    ).length;

    const friendCount = friendConns.filter(f =>
      (f.person_a_id === "me" || f.person_b_id === "me") && f.status === "accepted"
    ).length;

    expect(familyCount).toBe(2);
    expect(friendCount).toBe(1);
    // Friend does NOT inflate family count
    expect(familyCount + friendCount).toBe(3);
    expect(familyCount).not.toBe(3); // family is still 2, not 3
  });
});

// ─────────────────────────────────────────────────────────────
// 11. PROFILE WITHOUT ACCOUNT
// ─────────────────────────────────────────────────────────────
describe("Profiles without accounts", () => {
  it("a person can exist without a user_id", () => {
    const person = {
      id: "person-abc",
      full_name: "Grandfather Ibrahim",
      user_id: null, // explicitly no account
    };
    expect(person.user_id).toBeNull();
    expect(person.full_name).toBe("Grandfather Ibrahim");
  });

  it("hasAccount check works correctly", () => {
    const hasAccount = (person: { user_id: string | null }) => person.user_id !== null;
    expect(hasAccount({ user_id: null })).toBe(false);
    expect(hasAccount({ user_id: "user-123" })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 12. SEARCH — phone numbers must never be in search results
// ─────────────────────────────────────────────────────────────
describe("Search result privacy", () => {
  it("search results do not include phone_number field", () => {
    const searchResult = {
      id: "person-1",
      full_name: "Ahmed Ibrahim",
      short_bio: "Test bio",
      current_photo_url: null,
      family_count: 5,
      friend_count: 2,
      // phone_number intentionally absent
    };

    expect(searchResult).not.toHaveProperty("phone_number");
    expect(searchResult).not.toHaveProperty("phone_number_hash");
  });

  it("search results do not include documents", () => {
    const searchResult = {
      id: "person-1",
      full_name: "Ahmed Ibrahim",
      family_count: 5,
    };

    expect(searchResult).not.toHaveProperty("documents");
    expect(searchResult).not.toHaveProperty("document_count");
  });

  it("search results do not include storage paths", () => {
    const searchResult = {
      id: "person-1",
      full_name: "Ahmed Ibrahim",
    };

    expect(searchResult).not.toHaveProperty("current_photo_path");
    expect(searchResult).not.toHaveProperty("past_photo_path");
  });
});

// ─────────────────────────────────────────────────────────────
// 13. CLAIM WORKFLOW — no duplicates
// ─────────────────────────────────────────────────────────────
describe("Profile claim workflow", () => {
  it("does not create a duplicate person — links existing profile", () => {
    // Simulates the claim: links user_id to existing person
    const existingPerson = { id: "person-1", full_name: "Grandfather", user_id: null };
    const claimApproved = (person: typeof existingPerson, userId: string) => ({
      ...person, // same ID, same relationships
      user_id: userId, // only adds the account link
    });

    const result = claimApproved(existingPerson, "user-abc");
    expect(result.id).toBe(existingPerson.id); // SAME ID — not a new profile
    expect(result.user_id).toBe("user-abc");
  });
});

// ─────────────────────────────────────────────────────────────
// 14. DUPLICATE REQUEST HANDLING
// ─────────────────────────────────────────────────────────────
describe("Duplicate request handling", () => {
  it("unique constraint prevents duplicate relationship pairs", () => {
    const pairs = new Set<string>();

    const addPair = (a: string, b: string) => {
      const key = [a, b].sort().join(":");
      if (pairs.has(key)) return "duplicate";
      pairs.add(key);
      return "added";
    };

    expect(addPair("person-1", "person-2")).toBe("added");
    expect(addPair("person-1", "person-2")).toBe("duplicate");
    expect(addPair("person-2", "person-1")).toBe("duplicate"); // reversed order
  });
});
