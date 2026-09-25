"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, Heart, FileText, Share2, GitBranch, UserPlus, Search, ArrowRight, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import type { Notification, Person } from "@/types";
import { useRouter } from "next/navigation";

interface DashStats {
  familyCount: number;
  friendCount: number;
  myDocCount: number;
  sharedWithMeCount: number;
  pendingRequests: number;
}

interface RecentConnection {
  id: string;
  full_name: string;
  relationship_label: string;
}

// Animated connection bubble
function ConnectionBubble({
  name, label, index, personId,
}: {
  name: string; label: string; index: number; personId: string;
}) {
  const colors = [
    "from-amber-400 to-orange-400",
    "from-rose-400 to-pink-400",
    "from-blue-400 to-indigo-400",
    "from-emerald-400 to-teal-400",
    "from-purple-400 to-violet-400",
    "from-red-400 to-rose-400",
  ];
  const color = colors[index % colors.length];
  const delay = index * 0.15;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.05 }}
      className="float-animation"
      style={{ animationDelay: `${delay}s` }}
    >
      <Link href={`/people/${personId}`}>
        <div className="flex flex-col items-center gap-2 cursor-pointer">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-md ring-2 ring-white ring-offset-1`}>
            <span className="text-white font-bold text-sm">{getInitials(name)}</span>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-stone-700 max-w-[60px] truncate">{name.split(" ")[0]}</div>
            <div className="text-[10px] text-stone-400 truncate max-w-[60px]">{label}</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { person, loading } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<DashStats>({
    familyCount: 0, friendCount: 0, myDocCount: 0, sharedWithMeCount: 0, pendingRequests: 0,
  });
  const [recentConnections, setRecentConnections] = useState<RecentConnection[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    if (!person?.id) return;
    const pid = person.id;

    // Family count via RPC
    const [{ data: fc }, { data: frc }] = await Promise.all([
      supabase.rpc("get_family_count", { p_id: pid }),
      supabase.rpc("get_friend_count", { p_id: pid }),
    ]);

    // My documents
    const { count: docCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("owner_person_id", pid);

    // Shared with me
    const { count: sharedCount } = await supabase
      .from("document_permissions")
      .select("*", { count: "exact", head: true })
      .eq("granted_to_person_id", pid);

    // Pending connection requests
    const { count: pendingCount } = await supabase
      .from("relationships")
      .select("*", { count: "exact", head: true })
      .eq("person_b_id", pid)
      .eq("status", "pending");

    setStats({
      familyCount: (fc as number) ?? 0,
      friendCount: (frc as number) ?? 0,
      myDocCount: docCount ?? 0,
      sharedWithMeCount: sharedCount ?? 0,
      pendingRequests: (pendingCount ?? 0),
    });

    // Recent accepted family connections
    const { data: rels } = await supabase
      .from("relationships")
      .select(`
        id,
        relationship_type,
        person_a_id, person_b_id,
        person_a:people!relationships_person_a_id_fkey(id, full_name),
        person_b:people!relationships_person_b_id_fkey(id, full_name)
      `)
      .or(`person_a_id.eq.${pid},person_b_id.eq.${pid}`)
      .eq("status", "accepted")
      .limit(6);

    if (rels) {
      const connections = rels.map((r: any) => {
        const other = r.person_a_id === pid ? r.person_b : r.person_a;
        return {
          id: other?.id,
          full_name: other?.full_name ?? "Unknown",
          relationship_label: r.relationship_type,
        };
      }).filter((c) => c.id);
      setRecentConnections(connections as RecentConnection[]);
    }

    // Recent notifications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_person_id", pid)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(3);
    setRecentNotifs((notifs as Notification[]) ?? []);
  }, [person?.id, supabase]);

  useEffect(() => {
    if (person?.id) fetchData();
  }, [person?.id, fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="h-10 w-64 skeleton" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Family", value: stats.familyCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/connections" },
    { label: "Friends", value: stats.friendCount, icon: Heart, color: "text-rose-600", bg: "bg-rose-50", href: "/friends" },
    { label: "My Documents", value: stats.myDocCount, icon: FileText, color: "text-amber-600", bg: "bg-amber-50", href: "/documents" },
    { label: "Shared With Me", value: stats.sharedWithMeCount, icon: Share2, color: "text-emerald-600", bg: "bg-emerald-50", href: "/shared-with-me" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900">
            Welcome back, {person?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            {stats.pendingRequests > 0
              ? `You have ${stats.pendingRequests} pending connection request${stats.pendingRequests > 1 ? "s" : ""}`
              : "Your family network is up to date"}
          </p>
        </div>
        {stats.pendingRequests > 0 && (
          <Link href="/connections">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Bell className="w-4 h-4 text-amber-500" />
              {stats.pendingRequests} pending
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Search bar */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSearch}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
        <Input
          placeholder="Find someone you know — search by name or phone number"
          className="h-12 pl-12 pr-28 rounded-2xl text-base shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
        >
          Search
        </Button>
      </motion.form>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <Link href={s.href}>
              <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <CardContent className="p-5">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-stone-900 mb-0.5">{s.value}</div>
                  <div className="text-sm text-stone-500">{s.label}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Connections visual */}
      {recentConnections.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-stone-900">Your Connections</h2>
                <Link href="/connections" className="text-sm text-amber-600 hover:underline flex items-center gap-1">
                  See all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Animated connection graphic */}
              <div className="relative mb-6 h-28 hidden md:block" aria-hidden="true">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 120">
                  {recentConnections.slice(0, 6).map((_, i) => {
                    const x = 80 + i * ((800 - 160) / 5);
                    return (
                      <motion.line
                        key={i}
                        x1="400" y1="60"
                        x2={x} y2={i % 2 === 0 ? 20 : 100}
                        stroke="#f59e0b" strokeWidth="1.5" opacity="0.3"
                        className="connection-line"
                      />
                    );
                  })}
                  {/* Center self bubble */}
                  <circle cx="400" cy="60" r="24" fill="url(#selfGrad)" className="drop-shadow-md" />
                  <defs>
                    <linearGradient id="selfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                  <text x="400" y="65" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                    {person?.full_name?.split(" ")[0]?.substring(0, 3)}
                  </text>
                </svg>
              </div>

              {/* Connection bubbles */}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                {recentConnections.map((c, i) => (
                  <ConnectionBubble
                    key={c.id}
                    name={c.full_name}
                    label={c.relationship_label}
                    index={i}
                    personId={c.id}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick actions + Recent notifications */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-stone-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { href: "/people/add", icon: UserPlus, label: "Add a family member", desc: "Create a profile for a relative" },
                  { href: "/family-tree", icon: GitBranch, label: "Explore family tree", desc: "Interactive family visualisation" },
                  { href: "/documents/upload", icon: FileText, label: "Upload a document", desc: "Securely store an important document" },
                  { href: "/search", icon: Search, label: "Find someone", desc: "Search by name or phone" },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 transition-colors group cursor-pointer">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                        <action.icon className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-stone-900">{action.label}</div>
                        <div className="text-xs text-stone-400">{action.desc}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-300 ml-auto group-hover:text-amber-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent notifications */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-stone-900">Recent Activity</h2>
                <Link href="/notifications" className="text-sm text-amber-600 hover:underline flex items-center gap-1">
                  All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {recentNotifs.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                  <p className="text-sm text-stone-400">No new notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentNotifs.map((n) => (
                    <div key={n.id} className="flex gap-3 items-start p-3 rounded-xl bg-amber-50/50">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 leading-snug">{n.message}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Empty state if no connections yet */}
      {recentConnections.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-200"
        >
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="font-semibold text-stone-900 mb-2">Start building your family tree</h3>
          <p className="text-sm text-stone-500 mb-6 max-w-xs mx-auto">
            Add family members, send connection requests, or find relatives already on Know Your Family.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/people/add">
              <Button size="sm" className="gap-1.5">
                <UserPlus className="w-4 h-4" />
                Add family member
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Search className="w-4 h-4" />
                Find someone
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
