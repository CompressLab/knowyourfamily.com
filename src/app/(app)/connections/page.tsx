"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, X, Clock, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { getInitials, RELATIONSHIP_LABELS, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

export default function ConnectionsPage() {
  const { person: myPerson } = useUser();
  const supabase = createClient();
  const [pending, setPending] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!myPerson?.id) return;
    const pid = myPerson.id;

    const { data: rels } = await supabase
      .from("relationships")
      .select(`
        id, relationship_type, status, created_at, requested_by_person_id,
        person_a_id, person_b_id,
        person_a:people!relationships_person_a_id_fkey(id, full_name, current_photo_path, user_id),
        person_b:people!relationships_person_b_id_fkey(id, full_name, current_photo_path, user_id)
      `)
      .or(`person_a_id.eq.${pid},person_b_id.eq.${pid}`)
      .order("created_at", { ascending: false });

    if (!rels) return;

    const pendingIncoming = rels.filter(r => r.status === "pending" && r.person_b_id === pid);
    const pendingSent = rels.filter(r => r.status === "pending" && r.requested_by_person_id === pid);
    const acceptedRels = rels.filter(r => r.status === "accepted");

    setPending(pendingIncoming);
    setSent(pendingSent);
    setAccepted(acceptedRels);
    setLoading(false);
  }, [myPerson?.id, supabase]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const handleAccept = async (relId: string, other: any) => {
    setActionLoading(relId);
    const { error } = await supabase
      .from("relationships")
      .update({ status: "accepted" })
      .eq("id", relId);

    if (error) { toast.error("Failed to accept."); setActionLoading(null); return; }

    // Audit
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson!.id,
      action: "relationship_accepted",
      target_type: "relationship",
      target_id: relId,
    });

    // Notify requester
    if (other?.user_id) {
      await supabase.from("notifications").insert({
        recipient_person_id: other.id,
        actor_person_id: myPerson!.id,
        notification_type: "relationship_accepted",
        message: `${myPerson!.full_name} accepted your family connection request.`,
        related_id: relId,
      });
    }

    toast.success("Connection accepted!");
    fetchConnections();
    setActionLoading(null);
  };

  const handleDecline = async (relId: string) => {
    setActionLoading(relId);
    await supabase.from("relationships").update({ status: "declined" }).eq("id", relId);
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson!.id,
      action: "relationship_declined",
      target_type: "relationship",
      target_id: relId,
    });
    toast.success("Connection declined.");
    fetchConnections();
    setActionLoading(null);
  };

  const getOther = (rel: any) => {
    return rel.person_a_id === myPerson?.id ? rel.person_b : rel.person_a;
  };

  const RelCard = ({ rel, showActions }: { rel: any; showActions?: boolean }) => {
    const other = getOther(rel);
    if (!other) return null;
    const isLoading = actionLoading === rel.id;

    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Link href={`/people/${other.id}`}>
              <Avatar className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-amber-300 transition-all">
                <AvatarFallback>{getInitials(other.full_name)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/people/${other.id}`} className="hover:text-amber-600 transition-colors">
                <p className="font-semibold text-stone-900">{other.full_name}</p>
              </Link>
              <p className="text-sm text-stone-500 capitalize">
                {RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{formatRelativeTime(rel.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {showActions ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(rel.id, other)}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(rel.id)}
                    disabled={isLoading}
                    className="gap-1 text-red-600 hover:bg-red-50 hover:border-red-200"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </Button>
                </>
              ) : rel.status === "pending" ? (
                <Badge variant="pending" className="gap-1">
                  <Clock className="w-3 h-3" />
                  Pending
                </Badge>
              ) : (
                <Badge variant="success">Connected</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) return (
    <div className="p-6 max-w-2xl mx-auto space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Family Connections</h1>
          <p className="text-stone-500 text-sm mt-1">{accepted.length} confirmed family member{accepted.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/search">
          <Button size="sm" className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            Find people
          </Button>
        </Link>
      </motion.div>

      <Tabs defaultValue={pending.length > 0 ? "pending" : "all"}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Pending
            {pending.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{pending.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Family ({accepted.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          <AnimatePresence>
            {pending.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Check className="w-10 h-10 mx-auto mb-2 text-stone-200" />
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              pending.map(rel => <RelCard key={rel.id} rel={rel} showActions />)
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {accepted.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-stone-200" />
              <p className="text-sm">No confirmed family connections yet</p>
              <Link href="/search">
                <Button size="sm" variant="outline" className="mt-3">Find family members</Button>
              </Link>
            </div>
          ) : (
            accepted.map(rel => <RelCard key={rel.id} rel={rel} />)
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-3">
          {sent.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-stone-200" />
              <p className="text-sm">No sent requests awaiting response</p>
            </div>
          ) : (
            sent.map(rel => <RelCard key={rel.id} rel={rel} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
