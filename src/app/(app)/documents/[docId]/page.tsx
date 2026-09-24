"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText, Download, Trash2, Lock, Share2, Users, X, Loader2,
  Eye, Shield, ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  DOCUMENT_TYPE_LABELS, formatRelativeTime, formatFileSize, getSignedUrl, getInitials,
} from "@/lib/utils";
import { toast } from "sonner";
import type { Document } from "@/types";

export default function DocumentDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const { person: myPerson } = useUser();
  const router = useRouter();
  const supabase = createClient();

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [sharedWith, setSharedWith] = useState<any[]>([]);
  const [myConnections, setMyConnections] = useState<any[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [togglingPerson, setTogglingPerson] = useState<string | null>(null);

  const fetchDoc = useCallback(async () => {
    if (!docId || !myPerson?.id) return;
    setLoading(true);

    const { data, error } = await supabase.from("documents").select("*").eq("id", docId).single();
    if (error || !data) { router.push("/documents"); return; }
    setDoc(data as Document);

    const isOwner = data.owner_person_id === myPerson.id;
    const { data: mgr } = await supabase
      .from("profile_managers")
      .select("id")
      .eq("person_id", data.owner_person_id)
      .eq("manager_person_id", myPerson.id)
      .single();
    setCanEdit(isOwner || !!mgr);

    // Log view
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson.id,
      action: "document_viewed",
      target_type: "document",
      target_id: docId,
    });

    // Shared with
    const { data: perms } = await supabase
      .from("document_permissions")
      .select("id, granted_to_person_id, people!document_permissions_granted_to_person_id_fkey(id, full_name)")
      .eq("document_id", docId);
    setSharedWith(perms ?? []);

    // My connections for sharing
    const { data: rels } = await supabase
      .from("relationships")
      .select(`
        person_a_id, person_b_id,
        person_a:people!relationships_person_a_id_fkey(id, full_name),
        person_b:people!relationships_person_b_id_fkey(id, full_name)
      `)
      .or(`person_a_id.eq.${myPerson.id},person_b_id.eq.${myPerson.id}`)
      .eq("status", "accepted");

    const { data: friends } = await supabase
      .from("friend_connections")
      .select(`
        person_a_id, person_b_id,
        person_a:people!friend_connections_person_a_id_fkey(id, full_name),
        person_b:people!friend_connections_person_b_id_fkey(id, full_name)
      `)
      .or(`person_a_id.eq.${myPerson.id},person_b_id.eq.${myPerson.id}`)
      .eq("status", "accepted");

    const connectionPeople = [
      ...(rels ?? []).map((r: any) => r.person_a_id === myPerson.id ? r.person_b : r.person_a),
      ...(friends ?? []).map((f: any) => f.person_a_id === myPerson.id ? f.person_b : f.person_a),
    ].filter(Boolean).filter((p, i, arr) => arr.findIndex(q => q.id === p.id) === i);

    setMyConnections(connectionPeople);
    setLoading(false);
  }, [docId, myPerson?.id, supabase, router]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleDownload = async () => {
    if (!doc) return;
    const url = await getSignedUrl("documents", doc.storage_path, 60);
    if (!url) { toast.error("Failed to generate download link."); return; }

    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson!.id,
      action: "document_downloaded",
      target_type: "document",
      target_id: doc.id,
    });

    // Notify document owner if someone else downloads
    if (doc.owner_person_id !== myPerson!.id) {
      const { data: owner } = await supabase.from("people")
        .select("id, user_id, full_name").eq("id", doc.owner_person_id).single();
      if (owner?.user_id) {
        await supabase.from("notifications").insert({
          recipient_person_id: owner.id,
          actor_person_id: myPerson!.id,
          notification_type: "document_downloaded",
          message: `${myPerson!.full_name} downloaded your ${doc.document_name} document.`,
          related_id: doc.id,
        });
      }
    }

    window.open(url, "_blank");
    toast.success("Opening document…");
  };

  const toggleSharePermission = async (personId: string) => {
    if (!doc || !myPerson?.id) return;
    setTogglingPerson(personId);
    const existing = sharedWith.find(s => s.granted_to_person_id === personId);

    if (existing) {
      // Remove permission
      await supabase.from("document_permissions").delete().eq("id", existing.id);
      setSharedWith(prev => prev.filter(s => s.id !== existing.id));
      toast.success("Access removed.");
    } else {
      // Add permission — also set mode to shared
      if (doc.permission_mode === "private") {
        await supabase.from("documents").update({ permission_mode: "shared" }).eq("id", doc.id);
        setDoc(prev => prev ? { ...prev, permission_mode: "shared" } : prev);
      }
      const { data: perm } = await supabase
        .from("document_permissions")
        .insert({
          document_id: doc.id,
          granted_to_person_id: personId,
          granted_by_person_id: myPerson.id,
        })
        .select(`id, granted_to_person_id, people!document_permissions_granted_to_person_id_fkey(id, full_name)`)
        .single();
      if (perm) setSharedWith(prev => [...prev, perm]);

      // Notify the newly shared person
      const sharedPerson = myConnections.find(p => p.id === personId);
      if (sharedPerson) {
        const { data: personAccount } = await supabase.from("people").select("user_id").eq("id", personId).single();
        if (personAccount?.user_id) {
          await supabase.from("notifications").insert({
            recipient_person_id: personId,
            actor_person_id: myPerson.id,
            notification_type: "document_shared",
            message: `${myPerson.full_name} shared "${doc.document_name}" with you.`,
            related_id: doc.id,
          });
        }
      }
      toast.success("Access granted.");
    }

    // Audit
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson!.id,
      action: "document_permission_changed",
      target_type: "document",
      target_id: doc.id,
      metadata: { person_id: personId, action: existing ? "revoked" : "granted" },
    });

    // If no permissions left, revert to private
    const newShared = existing
      ? sharedWith.filter(s => s.id !== existing.id)
      : [...sharedWith];
    if (newShared.length === 0 && !existing) {
      // just added one, keep as shared
    } else if (newShared.length === 0 && existing) {
      await supabase.from("documents").update({ permission_mode: "private" }).eq("id", doc.id);
      setDoc(prev => prev ? { ...prev, permission_mode: "private" } : prev);
    }

    setTogglingPerson(null);
  };

  const handleDelete = async () => {
    if (!doc || !myPerson?.id) return;
    setDeleting(true);
    await supabase.storage.from("documents").remove([doc.storage_path]);
    await supabase.from("document_permissions").delete().eq("document_id", doc.id);
    await supabase.from("documents").delete().eq("id", doc.id);
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson.id,
      action: "document_deleted",
      target_type: "document",
      target_id: doc.id,
      metadata: { document_name: doc.document_name },
    });
    toast.success("Document deleted.");
    router.push("/documents");
  };

  if (loading) return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <div className="h-40 skeleton rounded-2xl" />
      <div className="h-64 skeleton rounded-2xl" />
    </div>
  );

  if (!doc) return null;

  const isShared = (personId: string) => sharedWith.some(s => s.granted_to_person_id === personId);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/documents" className="flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to documents
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
                <FileText className="w-7 h-7 text-amber-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-stone-900">{doc.document_name}</h1>
                <p className="text-stone-500 text-sm mt-0.5">
                  {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                  {" · "}{formatFileSize(doc.file_size_bytes)}
                  {" · Uploaded "}{formatRelativeTime(doc.created_at)}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={doc.permission_mode === "private" ? "private" : "shared"}>
                    {doc.permission_mode === "private" ? (
                      <><Lock className="w-3 h-3 mr-1" />Private</>
                    ) : (
                      <><Share2 className="w-3 h-3 mr-1" />Shared with {sharedWith.length}</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDownload} className="gap-1.5">
                <Download className="w-4 h-4" />
                Download
              </Button>
              {canEdit && (
                <>
                  <Button variant="outline" className="gap-1.5" onClick={() => setShareDialogOpen(true)}>
                    <Share2 className="w-4 h-4" />
                    Manage sharing
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current sharing */}
      {sharedWith.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shared with</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {sharedWith.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">{getInitials(s.people?.full_name ?? "?")}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-stone-700 flex-1">{s.people?.full_name}</span>
                    {canEdit && (
                      <Button
                        variant="ghost" size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 gap-1"
                        onClick={() => toggleSharePermission(s.granted_to_person_id)}
                        disabled={togglingPerson === s.granted_to_person_id}
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Only people explicitly listed above can access this document. Being a family member does not automatically grant access.
        </AlertDescription>
      </Alert>

      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share &ldquo;{doc.document_name}&rdquo;</DialogTitle>
            <DialogDescription>
              Select people to grant access. Untick to remove their access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {myConnections.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-4">No connections to share with yet.</p>
            ) : myConnections.map((conn) => {
              const shared = isShared(conn.id);
              return (
                <button
                  key={conn.id}
                  onClick={() => toggleSharePermission(conn.id)}
                  disabled={togglingPerson === conn.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    shared ? "bg-green-50 border border-green-200" : "hover:bg-stone-50"
                  }`}
                >
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="text-xs">{getInitials(conn.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-stone-900 flex-1">{conn.full_name}</span>
                  {togglingPerson === conn.id
                    ? <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                    : shared
                    ? <Badge variant="success" className="text-xs gap-1"><Eye className="w-3 h-3" />Has access</Badge>
                    : <Badge variant="outline" className="text-xs">No access</Badge>
                  }
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setShareDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document permanently?</DialogTitle>
            <DialogDescription>
              &ldquo;{doc.document_name}&rdquo; will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
