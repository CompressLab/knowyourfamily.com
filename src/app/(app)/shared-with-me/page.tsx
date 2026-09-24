"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Share2, Download, FileText, Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { DOCUMENT_TYPE_LABELS, formatRelativeTime, formatFileSize, getSignedUrl, getInitials } from "@/lib/utils";
import { toast } from "sonner";

export default function SharedWithMePage() {
  const { person: myPerson } = useUser();
  const supabase = createClient();
  const [sharedDocs, setSharedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShared = useCallback(async () => {
    if (!myPerson?.id) return;
    const { data } = await supabase
      .from("document_permissions")
      .select(`
        id, created_at,
        documents!document_permissions_document_id_fkey(
          id, document_name, document_type, mime_type, file_size_bytes, owner_person_id, storage_path,
          owner:people!documents_owner_person_id_fkey(id, full_name)
        )
      `)
      .eq("granted_to_person_id", myPerson.id)
      .order("created_at", { ascending: false });
    setSharedDocs(data ?? []);
    setLoading(false);
  }, [myPerson?.id, supabase]);

  useEffect(() => { fetchShared(); }, [fetchShared]);

  const handleDownload = async (doc: any) => {
    const url = await getSignedUrl("documents", doc.storage_path, 60);
    if (!url) { toast.error("Failed to generate download link."); return; }

    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson!.id,
      action: "document_downloaded",
      target_type: "document",
      target_id: doc.id,
    });

    // Notify owner
    if (doc.owner?.user_id) {
      await supabase.from("notifications").insert({
        recipient_person_id: doc.owner_person_id,
        actor_person_id: myPerson!.id,
        notification_type: "document_downloaded",
        message: `${myPerson!.full_name} downloaded your ${doc.document_name} document.`,
        related_id: doc.id,
      });
    }

    window.open(url, "_blank");
  };

  if (loading) return (
    <div className="p-6 max-w-3xl mx-auto space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-stone-900">Shared With Me</h1>
        <p className="text-stone-500 text-sm mt-1">
          {sharedDocs.length} document{sharedDocs.length !== 1 ? "s" : ""} shared with you
        </p>
      </motion.div>

      {sharedDocs.length === 0 ? (
        <div className="text-center py-16">
          <Share2 className="w-12 h-12 text-stone-200 mx-auto mb-4" />
          <p className="font-semibold text-stone-900 mb-2">Nothing shared with you yet</p>
          <p className="text-sm text-stone-500">When family members share documents with you, they&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sharedDocs.map((perm: any, i) => {
            const doc = perm.documents;
            if (!doc) return null;
            const owner = doc.owner;
            return (
              <motion.div key={perm.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
                      <FileText className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{doc.document_name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                        {" · "}{formatFileSize(doc.file_size_bytes)}
                      </p>
                      {owner && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[9px]">{getInitials(owner.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-stone-400">{owner.full_name}</span>
                          <span className="text-xs text-stone-300">·</span>
                          <span className="text-xs text-stone-400">{formatRelativeTime(perm.created_at)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/documents/${doc.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Download"
                        onClick={() => handleDownload(doc)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
