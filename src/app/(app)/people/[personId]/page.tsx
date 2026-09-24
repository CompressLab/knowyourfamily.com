"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users, Heart, FileText, Edit2, UserPlus, Flag, Shield,
  Phone, ChevronRight, Loader2, AlertCircle, UserCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThenAndNow } from "@/components/profile/ThenAndNow";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  getInitials, RELATIONSHIP_LABELS, formatRelativeTime,
  DOCUMENT_TYPE_LABELS, getSignedUrl,
} from "@/lib/utils";
import { toast } from "sonner";
import type { Person, Relationship, Document } from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PersonProfilePage() {
  const { personId } = useParams<{ personId: string }>();
  const { person: myPerson, user } = useUser();
  const router = useRouter();
  const supabase = createClient();

  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyCount, setFamilyCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [pastPhotoUrl, setPastPhotoUrl] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectType, setConnectType] = useState<"family" | "friend">("family");
  const [relationshipType, setRelationshipType] = useState("sibling");
  const [friendLabel, setFriendLabel] = useState("friend");
  const [customLabel, setCustomLabel] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [existingRelStatus, setExistingRelStatus] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!personId) return;
    setLoading(true);
    try {
      const { data: p, error } = await supabase
        .from("people")
        .select("*")
        .eq("id", personId)
        .single();

      if (error || !p) {
        router.push("/search");
        return;
      }
      setPerson(p as Person);

      // Resolve photo signed URLs
      if (p.current_photo_path) {
        const url = await getSignedUrl("profile-photos", p.current_photo_path, 3600);
        setCurrentPhotoUrl(url);
      }
      if (p.past_photo_path) {
        const url = await getSignedUrl("profile-photos", p.past_photo_path, 3600);
        setPastPhotoUrl(url);
      }

      // Counts
      const [{ data: fc }, { data: frc }] = await Promise.all([
        supabase.rpc("get_family_count", { p_id: personId }),
        supabase.rpc("get_friend_count", { p_id: personId }),
      ]);
      setFamilyCount((fc as number) ?? 0);
      setFriendCount((frc as number) ?? 0);

      // Relationships
      const { data: rels } = await supabase
        .from("relationships")
        .select(`
          id, relationship_type, status, person_a_id, person_b_id,
          person_a:people!relationships_person_a_id_fkey(id, full_name, current_photo_path),
          person_b:people!relationships_person_b_id_fkey(id, full_name, current_photo_path)
        `)
        .or(`person_a_id.eq.${personId},person_b_id.eq.${personId}`)
        .eq("status", "accepted");
      setRelationships(rels ?? []);

      // Profile managers
      const { data: mgrs } = await supabase
        .from("profile_managers")
        .select("manager_person_id, people!profile_managers_manager_person_id_fkey(id, full_name)")
        .eq("person_id", personId);
      setManagers(mgrs ?? []);

      // Check if own profile
      if (myPerson?.id === personId) {
        setIsOwnProfile(true);
        setIsManager(false);
      } else if (myPerson?.id) {
        // Check if manager
        const { data: mgr } = await supabase
          .from("profile_managers")
          .select("id")
          .eq("person_id", personId)
          .eq("manager_person_id", myPerson.id)
          .single();
        setIsManager(!!mgr);

        // Check existing relationship
        const { data: existRel } = await supabase
          .from("relationships")
          .select("status")
          .or(`and(person_a_id.eq.${myPerson.id},person_b_id.eq.${personId}),and(person_a_id.eq.${personId},person_b_id.eq.${myPerson.id})`)
          .single();
        if (existRel) setExistingRelStatus(existRel.status);

        // Check existing friend
        if (!existRel) {
          const { data: existFriend } = await supabase
            .from("friend_connections")
            .select("status")
            .or(`and(person_a_id.eq.${myPerson.id},person_b_id.eq.${personId}),and(person_a_id.eq.${personId},person_b_id.eq.${myPerson.id})`)
            .single();
          if (existFriend) setExistingRelStatus(existFriend.status);
        }
      }

      // Documents (only if authorized)
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("owner_person_id", personId)
        .order("created_at", { ascending: false });
      setDocuments((docs as Document[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [personId, myPerson?.id, supabase, router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleConnect = async () => {
    if (!myPerson?.id || !person) return;
    setConnecting(true);
    try {
      if (connectType === "family") {
        const { error } = await supabase.from("relationships").insert({
          person_a_id: myPerson.id,
          person_b_id: person.id,
          relationship_type: relationshipType,
          status: "pending",
          requested_by_person_id: myPerson.id,
        });
        if (error) throw error;

        // Notification to the other person (if they have account)
        if (person.user_id) {
          await supabase.from("notifications").insert({
            recipient_person_id: person.id,
            actor_person_id: myPerson.id,
            notification_type: "relationship_request",
            message: `${myPerson.full_name} has requested to connect with you as ${RELATIONSHIP_LABELS[relationshipType] || relationshipType}.`,
            related_id: person.id,
          });
        }
        toast.success("Family connection request sent!");
      } else {
        const { error } = await supabase.from("friend_connections").insert({
          person_a_id: myPerson.id,
          person_b_id: person.id,
          label: friendLabel === "custom" ? "custom" : friendLabel,
          custom_label: friendLabel === "custom" ? customLabel : null,
          status: "pending",
          requested_by_person_id: myPerson.id,
        });
        if (error) throw error;
        toast.success("Friend request sent!");
      }
      setExistingRelStatus("pending");
      setConnectDialogOpen(false);

      // Audit log
      await supabase.from("audit_logs").insert({
        actor_person_id: myPerson.id,
        action: connectType === "family" ? "relationship_requested" : "friend_request_sent",
        target_type: connectType === "family" ? "relationship" : "friend",
        target_id: person.id,
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error("A connection request already exists.");
      } else {
        toast.error("Failed to send request. Please try again.");
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleClaimProfile = () => {
    router.push(`/claim?person_id=${personId}`);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-48 skeleton rounded-2xl" />
        <div className="h-24 skeleton rounded-2xl" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!person) return null;

  const canEdit = isOwnProfile || isManager;
  const hasAccount = !!person.user_id;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Profile hero card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          {/* Gradient banner */}
          <div className="h-28 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400" />
          <CardContent className="p-6 -mt-14 relative">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Then & Now photos */}
              <div className="-mt-2">
                <ThenAndNow
                  currentPhotoUrl={currentPhotoUrl}
                  pastPhotoUrl={pastPhotoUrl}
                  pastPhotoPeriod={person.past_photo_period}
                  personName={person.full_name}
                />
              </div>

              <div className="flex-1 pt-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-stone-900">{person.full_name}</h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {!hasAccount && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Profile only
                        </Badge>
                      )}
                      {hasAccount && (
                        <Badge variant="success" className="text-xs">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Member
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {canEdit && (
                      <Link href={`/people/${personId}/edit`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </Link>
                    )}
                    {!isOwnProfile && !isManager && myPerson && !existingRelStatus && (
                      <Button size="sm" className="gap-1.5" onClick={() => setConnectDialogOpen(true)}>
                        <UserPlus className="w-3.5 h-3.5" />
                        Connect
                      </Button>
                    )}
                    {existingRelStatus === "pending" && (
                      <Badge variant="pending">Request pending</Badge>
                    )}
                    {existingRelStatus === "accepted" && (
                      <Badge variant="success">Connected</Badge>
                    )}
                    {!isOwnProfile && !hasAccount && myPerson && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleClaimProfile}>
                        <Flag className="w-3.5 h-3.5" />
                        This is me
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {person.short_bio && (
                  <p className="mt-3 text-stone-600 text-sm leading-relaxed">{person.short_bio}</p>
                )}

                {/* Counts */}
                <div className="flex items-center gap-4 mt-4">
                  <Link href={`/people/${personId}/family`} className="group">
                    <div className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
                      <Users className="w-4 h-4 text-stone-400 group-hover:text-amber-500" />
                      <span className="text-sm font-semibold text-stone-900">{familyCount}</span>
                      <span className="text-sm text-stone-500">Family</span>
                    </div>
                  </Link>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-stone-400" />
                    <span className="text-sm font-semibold text-stone-900">{friendCount}</span>
                    <span className="text-sm text-stone-500">Friends</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs defaultValue="family">
          <TabsList className="w-full">
            <TabsTrigger value="family" className="flex-1">Family ({relationships.length})</TabsTrigger>
            <TabsTrigger value="documents" className="flex-1">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
          </TabsList>

          {/* Family tab */}
          <TabsContent value="family" className="mt-4 space-y-3">
            {relationships.length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-stone-200" />
                <p className="text-sm">No confirmed family connections yet.</p>
                {canEdit && (
                  <Link href="/connections">
                    <Button variant="outline" size="sm" className="mt-3">Manage connections</Button>
                  </Link>
                )}
              </div>
            ) : (
              relationships.map((rel: any) => {
                const other = rel.person_a_id === personId ? rel.person_b : rel.person_a;
                if (!other) return null;
                return (
                  <Link key={rel.id} href={`/people/${other.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{getInitials(other.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-stone-900">{other.full_name}</p>
                        <p className="text-xs text-stone-400 capitalize">{RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-300" />
                    </div>
                  </Link>
                );
              })
            )}
          </TabsContent>

          {/* Documents tab */}
          <TabsContent value="documents" className="mt-4 space-y-3">
            {documents.length === 0 ? (
              <div className="text-center py-10 text-stone-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-stone-200" />
                <p className="text-sm">No documents accessible.</p>
                {canEdit && (
                  <Link href={`/documents/upload?owner=${personId}`}>
                    <Button variant="outline" size="sm" className="mt-3">Upload document</Button>
                  </Link>
                )}
              </div>
            ) : (
              documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors border border-stone-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{doc.document_name}</p>
                      <p className="text-xs text-stone-400">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</p>
                    </div>
                    <Badge variant={doc.permission_mode === "private" ? "private" : "shared"}>
                      {doc.permission_mode === "private" ? "Private" : "Shared"}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>

          {/* About tab */}
          <TabsContent value="about" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                {person.short_bio && (
                  <div>
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Biography</h3>
                    <p className="text-sm text-stone-700 leading-relaxed">{person.short_bio}</p>
                  </div>
                )}
                {(isOwnProfile || isManager) && person.phone_number_hash && (
                  <div>
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Phone</h3>
                    <div className="flex items-center gap-2 text-sm text-stone-700">
                      <Phone className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-400 italic">Phone registered (hidden for privacy)</span>
                    </div>
                  </div>
                )}
                {managers.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Profile managers</h3>
                    <div className="space-y-2">
                      {managers.map((m: any) => (
                        <div key={m.manager_person_id} className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs">
                              {getInitials(m.people?.full_name ?? "?")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-stone-700">{m.people?.full_name}</span>
                          <Badge variant="secondary" className="text-xs">Manager</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!person.short_bio && managers.length === 0 && (
                  <p className="text-sm text-stone-400 text-center py-4">
                    No additional information available.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Connect dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect with {person.full_name}</DialogTitle>
            <DialogDescription>
              Choose how you&apos;re connected. They&apos;ll need to accept before it&apos;s confirmed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex rounded-xl overflow-hidden border border-stone-200">
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${connectType === "family" ? "bg-amber-500 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
                onClick={() => setConnectType("family")}
              >
                Family
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${connectType === "friend" ? "bg-amber-500 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
                onClick={() => setConnectType("friend")}
              >
                Friend
              </button>
            </div>

            {connectType === "family" ? (
              <div className="space-y-1.5">
                <Label>Relationship type</Label>
                <Select value={relationshipType} onValueChange={setRelationshipType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-stone-400">
                  You are saying: &ldquo;{person.full_name} is my {RELATIONSHIP_LABELS[relationshipType]}&rdquo;
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Friend label (optional)</Label>
                  <Select value={friendLabel} onValueChange={setFriendLabel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="close_friend">Close Friend</SelectItem>
                      <SelectItem value="best_friend">Best Friend</SelectItem>
                      <SelectItem value="like_a_brother">Like a Brother</SelectItem>
                      <SelectItem value="like_a_sister">Like a Sister</SelectItem>
                      <SelectItem value="custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {friendLabel === "custom" && (
                  <div className="space-y-1.5">
                    <Label>Custom label</Label>
                    <Input
                      placeholder="e.g. Childhood friend"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
