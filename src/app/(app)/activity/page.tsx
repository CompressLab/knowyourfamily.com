"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, FileText, Users, Shield, Download, Eye, Trash2, UserPlus, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { formatRelativeTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

const actionIcon: Record<string, React.ElementType> = {
  profile_created: UserPlus,
  profile_updated: Users,
  relationship_requested: Users,
  relationship_accepted: Users,
  document_uploaded: FileText,
  document_viewed: Eye,
  document_downloaded: Download,
  document_deleted: Trash2,
  document_permission_changed: Shield,
  profile_manager_added: Shield,
  default: Activity,
};

const actionLabel: Record<string, string> = {
  profile_created: "Created profile",
  profile_updated: "Updated profile",
  relationship_requested: "Sent connection request",
  relationship_accepted: "Accepted connection",
  relationship_declined: "Declined connection",
  profile_claimed: "Claimed a profile",
  profile_claim_approved: "Approved profile claim",
  profile_manager_added: "Added profile manager",
  profile_manager_removed: "Removed profile manager",
  document_uploaded: "Uploaded document",
  document_viewed: "Viewed document",
  document_downloaded: "Downloaded document",
  document_deleted: "Deleted document",
  document_permission_changed: "Changed document access",
  friend_request_sent: "Sent friend request",
  friend_request_accepted: "Accepted friend request",
  user_registered: "Created account",
  user_login: "Signed in",
};

const actionColor: Record<string, string> = {
  document_downloaded: "text-orange-600 bg-orange-50",
  document_deleted: "text-red-600 bg-red-50",
  document_permission_changed: "text-amber-600 bg-amber-50",
  relationship_accepted: "text-emerald-600 bg-emerald-50",
  document_uploaded: "text-blue-600 bg-blue-50",
  default: "text-stone-600 bg-stone-50",
};

export default function ActivityPage() {
  const { person: myPerson } = useUser();
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 25;

  const fetchLogs = useCallback(async (fromId?: string) => {
    if (!myPerson?.id) return;
    const query = supabase
      .from("audit_logs")
      .select("*")
      .eq("actor_person_id", myPerson.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (fromId) query.lt("id", fromId);
    const { data } = await query;
    return (data as AuditLog[]) ?? [];
  }, [myPerson?.id, supabase]);

  useEffect(() => {
    fetchLogs().then(data => {
      if (!data) return;
      setLogs(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    });
  }, [fetchLogs]);

  const loadMore = async () => {
    setLoadingMore(true);
    const lastLog = logs[logs.length - 1];
    const data = await fetchLogs(lastLog?.id);
    if (data) {
      setLogs(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  if (loading) return (
    <div className="p-6 max-w-3xl mx-auto space-y-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-16 skeleton rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Activity Log</h1>
            <p className="text-stone-500 text-sm">Your recent actions and security events</p>
          </div>
        </div>
      </motion.div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Activity className="w-12 h-12 mx-auto mb-3 text-stone-200" />
          <p className="text-sm">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => {
            const Icon = actionIcon[log.action] ?? actionIcon.default;
            const color = actionColor[log.action] ?? actionColor.default;
            const label = actionLabel[log.action] ?? log.action;
            const meta = log.metadata as Record<string, string> | null;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900">{label}</p>
                      {meta?.document_name && (
                        <p className="text-xs text-stone-500 mt-0.5 truncate">
                          {meta.document_name}
                        </p>
                      )}
                      {meta?.full_name && (
                        <p className="text-xs text-stone-500 mt-0.5">{meta.full_name}</p>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 shrink-0">
                      {formatRelativeTime(log.created_at)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="gap-1.5">
            {loadingMore ? null : <ChevronDown className="w-4 h-4" />}
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
