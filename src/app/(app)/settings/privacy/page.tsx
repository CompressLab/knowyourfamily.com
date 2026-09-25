"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, Search, Phone, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

export default function PrivacySettingsPage() {
  const { person: myPerson, refresh } = useUser();
  const supabase = createClient();
  const [discoverByName, setDiscoverByName] = useState(true);
  const [discoverByPhone, setDiscoverByPhone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (myPerson) {
      setDiscoverByName(myPerson.discoverable_by_name);
      setDiscoverByPhone(myPerson.discoverable_by_phone);
    }
  }, [myPerson]);

  const handleSave = async () => {
    if (!myPerson?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("people")
      .update({
        discoverable_by_name: discoverByName,
        discoverable_by_phone: discoverByPhone,
      })
      .eq("id", myPerson.id);

    // Also update user_privacy_settings
    await supabase.from("user_privacy_settings").upsert({
      person_id: myPerson.id,
      discoverable_by_name: discoverByName,
      discoverable_by_phone: discoverByPhone,
    }, { onConflict: "person_id" });

    if (error) {
      toast.error("Failed to save settings.");
    } else {
      toast.success("Privacy settings saved.");
      await refresh();
    }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/settings" className="flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" />
          Settings
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Profile & Privacy</h1>
        <p className="text-stone-500 text-sm mt-1">Control how people can find you on Know Your Family</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>People can find me by</CardTitle>
          <CardDescription>
            Choose what information others can use to find your profile through search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
              <Search className="w-4 h-4 text-stone-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Full name</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Allow others to find your profile by searching your name
                  </p>
                </div>
                <Switch
                  checked={discoverByName}
                  onCheckedChange={setDiscoverByName}
                  aria-label="Discoverable by name"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
              <Phone className="w-4 h-4 text-stone-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Phone number</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Allow others to find you by entering your exact phone number.
                    Your number is never displayed in results.
                  </p>
                </div>
                <Switch
                  checked={discoverByPhone}
                  onCheckedChange={setDiscoverByPhone}
                  aria-label="Discoverable by phone"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving…</> : "Save settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-stone-900">Document privacy</p>
              <p className="text-sm text-stone-500 mt-1">
                Documents are always private by default. Your documents are never discoverable or publicly accessible.
                Each document has its own individual sharing settings — managed from the document itself.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
