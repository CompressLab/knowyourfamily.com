"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, UserPlus, Loader2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hashPhone, getInitials } from "@/lib/utils";
import type { SearchResult } from "@/types";

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="w-14 h-14 shrink-0">
            {result.current_photo_url && (
              <img src={result.current_photo_url} alt={result.full_name} className="w-full h-full object-cover rounded-full" />
            )}
            <AvatarFallback className="text-lg">{getInitials(result.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900">{result.full_name}</h3>
            {result.short_bio && (
              <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">{result.short_bio}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-xs text-stone-400">
                <Users className="w-3.5 h-3.5" />
                <span className="font-medium text-stone-600">{result.family_count}</span> Family
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href={`/people/${result.id}`}>
              <Button size="sm" variant="outline">View profile</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isPhoneSearch, setIsPhoneSearch] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);

    // Detect if query looks like a phone number
    const looksLikePhone = /^[\d\s\+\-\(\)]{7,15}$/.test(q.trim());
    setIsPhoneSearch(looksLikePhone);

    let data: any[] = [];

    if (looksLikePhone) {
      // Hash the phone and search
      const hash = await hashPhone(q.trim());
      const { data: phoneResults } = await supabase
        .from("people")
        .select("id, full_name, short_bio, current_photo_path, discoverable_by_phone")
        .eq("phone_number_hash", hash)
        .eq("discoverable_by_phone", true)
        .limit(20);
      data = phoneResults ?? [];
    } else {
      // Full-text name search
      const { data: nameResults } = await supabase
        .from("people")
        .select("id, full_name, short_bio, current_photo_path, discoverable_by_name")
        .eq("discoverable_by_name", true)
        .ilike("full_name", `%${q.trim()}%`)
        .limit(20);
      data = nameResults ?? [];
    }

    // Fetch family counts and format results
    // Note: phone_number is intentionally NEVER returned to the client
    const enriched = await Promise.all(
      data.map(async (p) => {
        const [{ data: fc }, { data: frc }] = await Promise.all([
          supabase.rpc("get_family_count", { p_id: p.id }),
          supabase.rpc("get_friend_count", { p_id: p.id }),
        ]);
        return {
          id: p.id,
          full_name: p.full_name,
          short_bio: p.short_bio,
          current_photo_url: null, // don't expose storage paths; profile page will load signed URLs
          family_count: (fc as number) ?? 0,
          friend_count: (frc as number) ?? 0,
        } as SearchResult;
      })
    );

    setResults(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const q = params.get("q");
    if (q) doSearch(q);
  }, [params, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      doSearch(query.trim());
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Find People</h1>
        <p className="text-stone-500 text-sm mb-5">Search for family members and friends already on Know Your Family</p>

        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or phone number…"
            className="h-12 pl-12 pr-28 rounded-2xl text-base"
            autoFocus
          />
          <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </form>
      </motion.div>

      {/* Privacy note */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Search results only include people who have chosen to be discoverable. Phone numbers are never displayed in results — only a matching profile is shown.
        </AlertDescription>
      </Alert>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
          </motion.div>
        ) : searched ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {results.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-stone-300" />
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">No results found</h3>
                <p className="text-sm text-stone-500 max-w-xs mx-auto mb-6">
                  {isPhoneSearch
                    ? "No one with that phone number has enabled phone discovery, or the number isn't registered."
                    : `No profiles found for "${query}". They might not be on Know Your Family yet.`}
                </p>
                <Link href="/people/add">
                  <Button size="sm" className="gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    Create their profile
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-500">
                  {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{params.get("q")}&rdquo;
                  {isPhoneSearch && " (phone number search — number not displayed)"}
                </p>
                {results.map((r) => <SearchResultCard key={r.id} result={r} />)}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16">
            <Search className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <p className="text-stone-400">Enter a name or phone number to search</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8"><div className="h-64 skeleton rounded-2xl" /></div>}>
      <SearchPage />
    </Suspense>
  );
}
