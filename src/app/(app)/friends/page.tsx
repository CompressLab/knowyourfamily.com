"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Check, X, Clock, Loader2, UserPlus, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { getInitials, FRIEND_LABEL_DISPLAY, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

export default function FriendsPage() {
  const { person: myPerson } = useUser();
  const supabase = createClient();
  const [pending, setPending] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!myPerson?.id) return;
    const pid = myPerson.id;
    const { data: conns } = await supabase
      .from("friend_connections")
      .select(`
        id, label, custom_label, status, created_at, requested_by_person_id,
        person_a_id, person_b_id,
        person_a:people!friend_connections_person_a_id_fkey(id, full_name, short_bio, user_id),
        person_b:people!friend_connections_person_b_id_fkey(id, full_name, short_bio, user_id)
      `)
      .or(`person_a_id.eq.${pid},person_b_id.eq.${pid}`)
      .order("created_at", { ascending: false });

    if (!conns) return;
    setPending(conns.filter(c => c.status === "pending" && c.person_b_id === pid));
    setAccepted(conns.filter(c => c.status === "accepted"));
    setLoading(false);
  }, [myPerson?.id, supabase]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const getOther = (conn: any) => conn.person_a_id === myPerson?.id ? conn.person_b : conn.person_a;

  const handleAccept = async (connId: string, other: any) => {
    setActionLoading(connId);
    await supabase.from("friend_connections").update({ status: "accepted" }).eq("id", connId);
    if (other?.user_id) {
      await supabase.from("notifications").insert({
        recipient_person_id: other.id,
        actor_person_id: myPerson!.id,
        notification_type: "friend_accepted",
        message: `${myPerson!.full_name} accepted your friend request.`,
        related_id: connId,
      });
    }
    await supabase.from("audit_logs").insert({
      actor_person_id: myPerson!.id,
      action: "friend_request_accepted",
      target_type: "friend",
      target_id: connId,
    });
    toast.success("Friend request accepted!");
    fetchFriends();
    setActionLoading(null);
  };

  const handleDecline = async (connId: string) => {
    setActionLoading(connId);
    await supabase.from("friend_connections").update({ status: "declined" }).eq("id", connId);
    toast.success("Request declined.");
    fetchFriends();
    setActionLoading(null);
  };

  const FriendCard = ({ conn, showActions }: { conn: any; showActions?: boolean }) => {
    const other = getOther(conn);
    if (!other) return null;
    const isLoading = actionLoading === conn.id;
    const label = conn.label === "custom" ? conn.custom_label : FRIEND_LABEL_DISPLAY[conn.label ?? "friend"] ?? "Friend";

    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Link href={`/people/${other.id}`}>
              <Avatar className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700">
                  {getInitials(other.full_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/people/${other.id}`} className="hover:text-amber-600 transition-colors">
                <p className="font-semibold text-stone-900">{other.full_name}</p>
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="friend" className="text-xs">{label}</Badge>
              </div>
              {other.short_bio && (
                <p className="text-xs text-stone-400 mt-1 line-clamp-1">{other.short_bio}</p>
              )}
            </div>
            {showActions && (
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={() => handleAccept(conn.id, other)} disabled={isLoading} className="gap-1">
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDecline(conn.id)} disabled={isLoading}
                  className="gap-1 text-red-600 hover:bg-red-50 hover:border-red-200">
                  <X className="w-3.5 h-3.5" />
                  Decline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) return (
    <div className="p-6 max-w-2xl mx-auto space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Friends & Chosen Family</h1>
          <p className="text-stone-500 text-sm mt-1">{accepted.length} friend{accepted.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/search">
          <Button size="sm" className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            Find friends
          </Button>
        </Link>
      </motion.div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Friends are completely separate from your family tree. A friend labelled &ldquo;Like a Brother&rdquo; will never appear as a biological relative or change your family count.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue={pending.length > 0 ? "pending" : "all"}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Pending
            {pending.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{pending.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Friends ({accepted.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          <AnimatePresence>
            {pending.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Check className="w-10 h-10 mx-auto mb-2 text-stone-200" />
                <p className="text-sm">No pending friend requests</p>
              </div>
            ) : (
              pending.map(conn => <FriendCard key={conn.id} conn={conn} showActions />)
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {accepted.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Heart className="w-10 h-10 mx-auto mb-2 text-stone-200" />
              <p className="text-sm">No friends added yet</p>
              <Link href="/search">
                <Button size="sm" variant="outline" className="mt-3">Find friends</Button>
              </Link>
            </div>
          ) : (
            accepted.map(conn => <FriendCard key={conn.id} conn={conn} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
