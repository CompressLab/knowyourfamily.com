"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Upload, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { MAX_FILE_SIZE, RELATIONSHIP_LABELS } from "@/lib/utils";
import { Suspense } from "react";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(150),
  short_bio: z.string().max(500).optional(),
  relationship_type: z.string().min(1, "Select a relationship"),
  past_photo_period: z.string().max(50).optional(),
});
type FormData = z.infer<typeof schema>;

function AddFamilyMemberForm() {
  const router = useRouter();
  const { person: myPerson } = useUser();
  const supabase = createClient();
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [pastFile, setPastFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { relationship_type: "child" },
  });

  const uploadPhoto = async (file: File, personId: string, slot: "current" | "past") => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum allowed file size is 2 MB.");
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${personId}/${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profile-photos").upload(path, file, { contentType: file.type });
    if (error) return null;
    return path;
  };

  const onSubmit = async (data: FormData) => {
    if (!myPerson?.id) return;
    setSaving(true);
    try {
      // 1. Create person profile (no user_id = no account)
      const { data: newPerson, error: personError } = await supabase
        .from("people")
        .insert({
          full_name: data.full_name,
          short_bio: data.short_bio || null,
          past_photo_period: data.past_photo_period || null,
          user_id: null, // explicitly no account
          discoverable_by_name: true,
          discoverable_by_phone: false,
        })
        .select()
        .single();

      if (personError || !newPerson) throw personError;

      // 2. Upload photos
      if (currentFile) {
        const path = await uploadPhoto(currentFile, newPerson.id, "current");
        if (path) await supabase.from("people").update({ current_photo_path: path }).eq("id", newPerson.id);
      }
      if (pastFile) {
        const path = await uploadPhoto(pastFile, newPerson.id, "past");
        if (path) await supabase.from("people").update({ past_photo_path: path }).eq("id", newPerson.id);
      }

      // 3. Create accepted relationship (creator is automatically connected)
      await supabase.from("relationships").insert({
        person_a_id: myPerson.id,
        person_b_id: newPerson.id,
        relationship_type: data.relationship_type,
        status: "accepted", // auto-accepted since creator is creating the profile
        requested_by_person_id: myPerson.id,
      });

      // 4. Make creator a profile manager
      await supabase.from("profile_managers").insert({
        person_id: newPerson.id,
        manager_person_id: myPerson.id,
        granted_by_person_id: myPerson.id,
      });

      // 5. Audit log
      await supabase.from("audit_logs").insert({
        actor_person_id: myPerson.id,
        action: "profile_created",
        target_type: "person",
        target_id: newPerson.id,
        metadata: { full_name: data.full_name, created_for: "family_member" },
      });

      toast.success(`${data.full_name}'s profile has been created.`);
      router.push(`/people/${newPerson.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Add Family Member</h1>
            <p className="text-sm text-stone-500">This person doesn&apos;t need an account to have a profile</p>
          </div>
        </div>

        <Alert className="mb-5">
          <AlertDescription>
            You can create profiles for relatives who may never use this website — grandparents, children, historical family members. They&apos;ll have full profiles, photos, and can be part of your family tree.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>Essential information about this family member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name *</Label>
                <Input id="full_name" placeholder="e.g. Ibrahim Ahmed Al-Hassan" {...register("full_name")} />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Your relationship to them *</Label>
                <Select value={watch("relationship_type")} onValueChange={(v) => setValue("relationship_type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.relationship_type && <p className="text-xs text-red-500">{errors.relationship_type.message}</p>}
                <p className="text-xs text-stone-400">
                  They are your &ldquo;{RELATIONSHIP_LABELS[watch("relationship_type")] || watch("relationship_type")}&rdquo;
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="short_bio">Short biography <span className="text-stone-400">(optional)</span></Label>
                <Textarea
                  id="short_bio"
                  rows={3}
                  placeholder="A brief description — a few sentences about who they are…"
                  {...register("short_bio")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>Add photos to help family members recognise this person</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Current photo</Label>
                  <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-stone-200 hover:border-amber-400 cursor-pointer transition-colors text-sm text-stone-400 hover:text-amber-600">
                    <Upload className="w-6 h-6" />
                    <span>{currentFile ? currentFile.name : "Upload current photo"}</span>
                    <span className="text-xs">JPG or PNG, max 2 MB</span>
                    <input type="file" accept="image/jpeg,image/png" className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { if (f.size > MAX_FILE_SIZE) { toast.error("File is too large. Maximum allowed file size is 2 MB."); return; } setCurrentFile(f); }
                      }} />
                  </label>
                  {currentFile && <button type="button" onClick={() => setCurrentFile(null)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</button>}
                </div>

                <div className="space-y-1.5">
                  <Label>Past photo <span className="text-stone-400">(Then &amp; Now)</span></Label>
                  <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-stone-200 hover:border-amber-400 cursor-pointer transition-colors text-sm text-stone-400 hover:text-amber-600">
                    <Upload className="w-6 h-6" />
                    <span>{pastFile ? pastFile.name : "Upload past photo"}</span>
                    <span className="text-xs">Helps relatives recognise them</span>
                    <input type="file" accept="image/jpeg,image/png" className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { if (f.size > MAX_FILE_SIZE) { toast.error("File is too large. Maximum allowed file size is 2 MB."); return; } setPastFile(f); }
                      }} />
                  </label>
                  {pastFile && <button type="button" onClick={() => setPastFile(null)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</button>}
                </div>
              </div>

              {(currentFile || pastFile) && (
                <div className="space-y-1.5">
                  <Label htmlFor="past_photo_period">Past photo period <span className="text-stone-400">(optional)</span></Label>
                  <Input id="past_photo_period" placeholder="e.g. Around 1985, Early 2000s" {...register("past_photo_period")} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Creating profile…</> : "Create profile"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AddFamilyMemberPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="h-96 skeleton rounded-2xl" /></div>}>
      <AddFamilyMemberForm />
    </Suspense>
  );
}
