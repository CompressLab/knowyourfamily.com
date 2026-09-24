"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Upload, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "@/lib/utils";
import type { Person } from "@/types";

const schema = z.object({
  full_name: z.string().min(2).max(150),
  short_bio: z.string().max(500).optional(),
  phone_number: z.string().max(20).optional(),
  past_photo_period: z.string().max(50).optional(),
  discoverable_by_name: z.boolean(),
  discoverable_by_phone: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function EditProfilePage() {
  const { personId } = useParams<{ personId: string }>();
  const { person: myPerson } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [pastFile, setPastFile] = useState<File | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loadProfile = useCallback(async () => {
    if (!personId || !myPerson?.id) return;
    const { data: p } = await supabase.from("people").select("*").eq("id", personId).single();
    if (!p) { router.push("/dashboard"); return; }

    // Authorization check
    const isOwn = p.user_id === myPerson.user_id;
    const { data: mgr } = await supabase
      .from("profile_managers")
      .select("id")
      .eq("person_id", personId)
      .eq("manager_person_id", myPerson.id)
      .single();
    if (!isOwn && !mgr) { router.push(`/people/${personId}`); return; }
    setIsAuthorized(true);

    reset({
      full_name: p.full_name,
      short_bio: p.short_bio ?? "",
      phone_number: "",
      past_photo_period: p.past_photo_period ?? "",
      discoverable_by_name: p.discoverable_by_name,
      discoverable_by_phone: p.discoverable_by_phone,
    });
    setLoading(false);
  }, [personId, myPerson?.id, myPerson?.user_id, supabase, router, reset]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const uploadPhoto = async (file: File, slot: "current" | "past"): Promise<string | null> => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum allowed file size is 2 MB.");
      return null;
    }
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Only JPG and PNG images are accepted for photos.");
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${personId}/${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profile-photos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) { toast.error("Photo upload failed."); return null; }
    return path;
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const updates: Partial<Person> & Record<string, any> = {
        full_name: data.full_name,
        short_bio: data.short_bio || null,
        past_photo_period: data.past_photo_period || null,
        discoverable_by_name: data.discoverable_by_name,
        discoverable_by_phone: data.discoverable_by_phone,
      };

      // Handle phone: hash it server-side via RPC or just store hash
      if (data.phone_number?.trim()) {
        const normalized = data.phone_number.replace(/\D/g, "");
        const encoder = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", encoder.encode(normalized));
        updates.phone_number_hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      }

      // Upload photos
      if (currentFile) {
        const path = await uploadPhoto(currentFile, "current");
        if (path) updates.current_photo_path = path;
        else { setSaving(false); return; }
      }
      if (pastFile) {
        const path = await uploadPhoto(pastFile, "past");
        if (path) updates.past_photo_path = path;
        else { setSaving(false); return; }
      }

      const { error } = await supabase.from("people").update(updates).eq("id", personId);
      if (error) throw error;

      // Audit
      await supabase.from("audit_logs").insert({
        actor_person_id: myPerson!.id,
        action: "profile_updated",
        target_type: "person",
        target_id: personId,
      });

      toast.success("Profile saved successfully.");
      router.push(`/people/${personId}`);
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 max-w-2xl mx-auto"><div className="h-96 skeleton rounded-2xl" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-stone-900 mb-6">Edit Profile</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name *</Label>
                <Input id="full_name" {...register("full_name")} />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="short_bio">Short biography <span className="text-stone-400">(max 500 chars)</span></Label>
                <Textarea id="short_bio" rows={3} placeholder="A brief description of this person…" {...register("short_bio")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone_number">Phone number <span className="text-stone-400">(stored privately)</span></Label>
                <Input id="phone_number" type="tel" placeholder="+91 98765 43210" {...register("phone_number")} />
                <p className="text-xs text-stone-400">Phone numbers are stored as a hash and never displayed publicly.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current photo</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-stone-300 hover:border-amber-400 cursor-pointer transition-colors text-sm text-stone-500 hover:text-amber-600">
                    <Upload className="w-4 h-4" />
                    {currentFile ? currentFile.name : "Choose photo…"}
                    <input type="file" accept="image/jpeg,image/png" className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > MAX_FILE_SIZE) { toast.error("File is too large. Maximum allowed file size is 2 MB."); return; }
                          setCurrentFile(f);
                        }
                      }} />
                  </label>
                  {currentFile && <button type="button" onClick={() => setCurrentFile(null)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Past photo <span className="text-stone-400">(Then &amp; Now)</span></Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-stone-300 hover:border-amber-400 cursor-pointer transition-colors text-sm text-stone-500 hover:text-amber-600">
                    <Upload className="w-4 h-4" />
                    {pastFile ? pastFile.name : "Choose past photo…"}
                    <input type="file" accept="image/jpeg,image/png" className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > MAX_FILE_SIZE) { toast.error("File is too large. Maximum allowed file size is 2 MB."); return; }
                          setPastFile(f);
                        }
                      }} />
                  </label>
                  {pastFile && <button type="button" onClick={() => setPastFile(null)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
                <Input placeholder="Period (e.g. Around 1995, Early 2000s)" {...register("past_photo_period")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Privacy Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">Discoverable by name</p>
                  <p className="text-xs text-stone-400">Allow others to find this profile by searching the name</p>
                </div>
                <Switch checked={watch("discoverable_by_name")} onCheckedChange={(v) => setValue("discoverable_by_name", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">Discoverable by phone</p>
                  <p className="text-xs text-stone-400">Allow finding this profile by searching the exact phone number</p>
                </div>
                <Switch checked={watch("discoverable_by_phone")} onCheckedChange={(v) => setValue("discoverable_by_phone", v)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving…</> : "Save profile"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
