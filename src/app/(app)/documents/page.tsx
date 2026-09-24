"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, Lock, Share2, Trash2, Eye, Download, Loader2, Filter } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { DOCUMENT_TYPE_LABELS, formatRelativeTime, formatFileSize, getSignedUrl } from "@/lib/utils";
import { toast } from "sonner";
import type { Document } from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DocumentsPage() {
  const { person: myPerson } = useUser();
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!myPerson?.id) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("owner_person_id", myPerson.id)
      .order("created_at", { ascending: false });
    setDocuments((data as Document[]) ?? []);
    setLoading(false);
  }, [myPerson?.id, supabase]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async () => {
    if (!deleteDoc || !myPerson?.id) return;
    setDeleting(true);
    // Delete from storage
    await supabase.storage.from("documents").remove([deleteDoc.storage_path]);
    // Delete permissions
    await supabase.from("document_permissions").delete().eq("document_id", deleteDoc.id);
    // Delete record
    await supabase.from("documents").delete().eq("id", deleteDoc.id);
    // Audit
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson.id,
      action: "document_deleted",
      target_type: "document",
      target_id: deleteDoc.id,
      metadata: { document_name: deleteDoc.document_name },
    });
    toast.success("Document deleted.");
    setDeleteDoc(null);
    setDeleting(false);
    fetchDocs();
  };

  const handleDownload = async (doc: Document) => {
    const url = await getSignedUrl("documents", doc.storage_path, 60);
    if (!url) { toast.error("Failed to generate download link."); return; }

    // Audit download
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson!.id,
      action: "document_downloaded",
      target_type: "document",
      target_id: doc.id,
    });

    window.open(url, "_blank");
  };

  const filtered = filter === "all" ? documents
    : filter === "private" ? documents.filter(d => d.permission_mode === "private")
    : documents.filter(d => d.permission_mode === "shared");

  const getDocIcon = (mime: string) => {
    if (mime.includes("pdf")) return "🗒️";
    if (mime.includes("image")) return "🖼️";
    return "📄";
  };

  if (loading) return (
    <div className="p-6 max-w-3xl mx-auto space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">My Documents</h1>
          <p className="text-stone-500 text-sm mt-1">{documents.length} document{documents.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/documents/upload">
          <Button size="sm" className="gap-1.5">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </Link>
      </motion.div>

      <Alert>
        <Lock className="w-4 h-4" />
        <AlertDescription className="text-xs">
          All documents are private by default. Nothing is ever publicly accessible.
          Use the share button to grant access to specific trusted people.
        </AlertDescription>
      </Alert>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-stone-400" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All documents</SelectItem>
            <SelectItem value="private">Private only</SelectItem>
            <SelectItem value="shared">Shared</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-300" />
          </div>
          <h3 className="font-semibold text-stone-900 mb-2">No documents yet</h3>
          <p className="text-sm text-stone-500 mb-6 max-w-xs mx-auto">
            Upload passports, IDs, certificates, and important documents for safe keeping.
          </p>
          <Link href="/documents/upload">
            <Button size="sm" className="gap-1.5">
              <Upload className="w-4 h-4" />
              Upload your first document
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-2xl shrink-0 border border-stone-100">
                    {getDocIcon(doc.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-stone-900 truncate">{doc.document_name}</p>
                      <Badge variant={doc.permission_mode === "private" ? "private" : "shared"} className="text-[10px]">
                        {doc.permission_mode === "private" ? (
                          <><Lock className="w-2.5 h-2.5 mr-1" />Private</>
                        ) : (
                          <><Share2 className="w-2.5 h-2.5 mr-1" />Shared</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      {" · "}{formatFileSize(doc.file_size_bytes)}
                      {" · "}{formatRelativeTime(doc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/documents/${doc.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View & manage">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Download"
                      onClick={() => handleDownload(doc)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                      onClick={() => setDeleteDoc(doc)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteDoc?.document_name}&rdquo; will be permanently deleted and all sharing permissions removed.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancel</Button>
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
