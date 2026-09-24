"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Lock, Bell, User, ChevronRight, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const settingsSections = [
  {
    icon: User,
    label: "Profile & Privacy",
    desc: "Control who can find you and how your profile appears",
    href: "/settings/privacy",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: Shield,
    label: "Account Security",
    desc: "Password, sessions, and security settings",
    href: "/settings/security",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Eye,
    label: "Activity Log",
    desc: "View all your recent actions and document access",
    href: "/activity",
    color: "text-stone-600 bg-stone-50",
  },
];

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-500 text-sm mt-1">Manage your account, privacy, and security</p>
      </motion.div>

      <div className="space-y-3">
        {settingsSections.map((s, i) => (
          <motion.div
            key={s.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link href={s.href}>
              <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900">{s.label}</p>
                    <p className="text-sm text-stone-500 mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
