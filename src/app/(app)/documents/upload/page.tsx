"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Upload, Loader2, FileText, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  MAX_FILE_SIZE, ALLOWED_MIME_TYPES, DOCUMENT_TYPE_LABELS, formatFileSize,
} from "@/lib/utils";
import { toast } from "sonner";

const schema = z.object({
  document_name: z.string().min(1, "Document name is required").max(200),
  document_type: z.string().min(1, "Select a document type"),
  owner_person_id: z.string().uuid("Select a profile"),
});
type FormData = z.infer<typeof schema>;

function UploadDocumentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { person: myPerson } = useUser();
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [managedProfiles, setManagedProfiles] = useState<any[]>([]);
  const defaultOwner = params.get("owner") ?? myPerson?.id ?? "";

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { document_type: "passport", owner_person_id: defaultOwner },
  });

  useEffect(() => {
    if (myPerson?.id && !watch("owner_person_id")) {
      setValue("owner_person_id", myPerson.id);
    }
  }, [myPerson?.id, setValue, watch]);

  const loadManagedProfiles = useCallback(async () => {
    if (!myPerson?.id) return;
    const { data } = await supabase
      .from("profile_managers")
      .select("person_id, people!profile_managers_person_id_fkey(id, full_name)")
      .eq("manager_person_id", myPerson.id);
    setManagedProfiles(data ?? []);
  }, [myPerson?.id, supabase]);

  useEffect(() => { loadManagedProfiles(); }, [loadManagedProfiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError(null);
    if (!f) return;

    if (f.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum allowed file size is 2 MB.");
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setFileError("Only PDF, JPG, and PNG files are accepted.");
      return;
    }
    setFile(f);
  };

  const onSubmit = async (data: FormData) => {
    if (!file) { toast.error("Please select a file."); return; }
    if (!myPerson?.id) return;

    // Re-validate file size server-side check (belt and braces)
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum allowed file size is 2 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const storagePath = `${data.owner_person_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          owner_person_id: data.owner_person_id,
          uploaded_by_person_id: myPerson.id,
          document_name: data.document_name,
          document_type: data.document_type,
          storage_path: storagePath,
          mime_type: file.type,
          file_size_bytes: file.size,
          permission_mode: "private",
        })
        .select()
        .single();

      if (docError || !doc) throw docError;

      // Audit
      await supabase.from("audit_logs").insert({
        actor_person_id: myPerson.id,
        action: "document_uploaded",
        target_type: "document",
        target_id: doc.id,
        metadata: {
          document_name: data.document_name,
          document_type: data.document_type,
          owner_person_id: data.owner_person_id,
        },
      });

      // Notify owner if different from uploader
      if (data.owner_person_id !== myPerson.id) {
        const { data: ownerPerson } = await supabase
          .from("people")
          .select("user_id, id")
          .eq("id", data.owner_person_id)
          .single();
        if (ownerPerson?.user_id) {
          await supabase.from("notifications").insert({
            recipient_person_id: ownerPerson.id,
            actor_person_id: myPerson.id,
            notification_type: "document_uploaded",
            message: `${myPerson.full_name} uploaded "${data.document_name}" to your profile.`,
            related_id: doc.id,
          });
        }
      }

      toast.success("Document uploaded successfully.");
      router.push(`/documents/${doc.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // All profiles this user can upload for (themselves + managed)
  const uploadableProfiles = [
    ...(myPerson ? [{ id: myPerson.id, full_name: `${myPerson.full_name} (me)` }] : []),
    ...managedProfiles.map((m: any) => ({ id: m.people?.id, full_name: m.people?.full_name })).filter(p => p.id),
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Upload Document</h1>
            <p className="text-sm text-stone-500">Store securely — private by default</p>
          </div>
        </div>

        <Alert className="mb-5">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Documents are stored privately. After uploading, you can choose to share with specific trusted people.
            Maximum file size: 2 MB. Accepted formats: PDF, JPG, PNG.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
              <CardDescription>Describe the document you&apos;re uploading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Document owner (whose document is this?) *</Label>
                <Select value={watch("owner_person_id")} onValueChange={(v) => setValue("owner_person_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadableProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.owner_person_id && <p className="text-xs text-red-500">{errors.owner_person_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="document_name">Document name *</Label>
                <Input id="document_name" placeholder="e.g. Dad's Passport" {...register("document_name")} />
                {errors.document_name && <p className="text-xs text-red-500">{errors.document_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Document type *</Label>
                <Select value={watch("document_type")} onValueChange={(v) => setValue("document_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File</CardTitle>
              <CardDescription>PDF, JPG, or PNG — maximum 2 MB</CardDescription>
            </CardHeader>
            <CardContent>
              {!file ? (
                <label className="flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed border-stone-200 hover:border-amber-400 cursor-pointer transition-colors text-stone-400 hover:text-amber-600">
                  <Upload className="w-8 h-8" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Click to choose a file</p>
                    <p className="text-xs mt-1">PDF, JPG, PNG — max 2 MB</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{file.name}</p>
                    <p className="text-xs text-stone-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="text-stone-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {fileError && (
                <p className="mt-2 text-sm text-red-600 font-medium">{fileError}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={uploading || !file || !!fileError}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Uploading…</> : "Upload document"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function UploadDocumentPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="h-96 skeleton rounded-2xl" /></div>}>
      <UploadDocumentForm />
    </Suspense>
  );
}
