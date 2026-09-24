"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Flag, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

function ClaimProfileForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { person: myPerson, user } = useUser();
  const supabase = createClient();
  const personId = params.get("person_id");
  const [targetPerson, setTargetPerson] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    if (!personId) return;
    supabase.from("people").select("*").eq("id", personId).single().then(({ data }) => {
      setTargetPerson(data);
    });
    // Check for existing claim
    if (user?.id) {
      supabase.from("profile_claim_requests")
        .select("id, status")
        .eq("person_id", personId)
        .eq("claimant_user_id", user.id)
        .single()
        .then(({ data }) => { if (data) setExisting(true); });
    }
  }, [personId, user?.id, supabase]);

  const handleSubmit = async () => {
    if (!personId || !user?.id || !myPerson?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("profile_claim_requests").insert({
        person_id: personId,
        claimant_user_id: user.id,
        message: message || null,
        status: "pending",
      });

      if (error?.code === "23505") {
        toast.error("You already have a pending claim for this profile.");
        setSubmitting(false);
        return;
      }
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        actor_person_id: myPerson.id,
        action: "profile_claimed",
        target_type: "claim",
        target_id: personId,
      });

      // Notify profile managers
      const { data: managers } = await supabase
        .from("profile_managers")
        .select("manager_person_id, people!profile_managers_manager_person_id_fkey(id, user_id)")
        .eq("person_id", personId);

      for (const mgr of (managers ?? []) as any[]) {
        if ((mgr.people as any)?.user_id) {
          await supabase.from("notifications").insert({
            recipient_person_id: mgr.manager_person_id,
            actor_person_id: myPerson.id,
            notification_type: "profile_claim",
            message: `${myPerson.full_name} is claiming the profile for ${targetPerson?.full_name}. Please review.`,
            related_id: personId,
          });
        }
      }

      setSubmitted(true);
    } catch {
      toast.error("Failed to submit claim request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!personId) return <div className="p-8 text-stone-400 text-center">No profile specified.</div>;

  if (submitted) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Claim request submitted</h2>
          <p className="text-stone-500 mb-6">
            The profile manager(s) for {targetPerson?.full_name} have been notified and will review your request.
            You&apos;ll receive a notification when it&apos;s approved or declined.
          </p>
          <Button onClick={() => router.push("/dashboard")}>Return to home</Button>
        </motion.div>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto text-center">
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            You already have a pending claim request for this profile. Please wait for a decision.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Flag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Claim this profile</h1>
            <p className="text-sm text-stone-500">Request to link your account to this existing profile</p>
          </div>
        </div>

        {targetPerson && (
          <Card className="mb-5">
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback>{getInitials(targetPerson.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-stone-900">{targetPerson.full_name}</p>
                {targetPerson.short_bio && <p className="text-xs text-stone-500 line-clamp-1">{targetPerson.short_bio}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Alert className="mb-5">
          <AlertDescription className="text-xs">
            Claiming a profile will not create a duplicate. Once approved by the profile manager, your account will be linked to this existing profile and all existing relationships will remain intact.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Your message</CardTitle>
            <CardDescription>Optional — explain why you&apos;re claiming this profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="I am this person because… / I can be identified by…"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !targetPerson}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Submitting…</> : "Submit claim request"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="h-64 skeleton rounded-2xl" /></div>}>
      <ClaimProfileForm />
    </Suspense>
  );
}
