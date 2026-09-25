"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Maximize2, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Know Your FamilyView } from "@/components/family-tree/Know Your FamilyView";
import { useUser } from "@/hooks/useUser";

export default function Know Your FamilyPage() {
  const { person } = useUser();
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 h-full">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Family Tree</h1>
            <p className="text-stone-500 text-sm">Click any person to view their profile</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/people/add">
            <Button variant="outline" size="sm" className="gap-1.5">
              <UserPlus className="w-4 h-4" />
              Add member
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setFullscreen(!fullscreen)}
          >
            <Maximize2 className="w-4 h-4" />
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden ${
          fullscreen ? "fixed inset-0 z-50 rounded-none" : ""
        }`}
        style={{ height: fullscreen ? "100vh" : "calc(100vh - 200px)", minHeight: 500 }}
      >
        {fullscreen && (
          <div className="absolute top-4 right-4 z-10">
            <Button size="sm" variant="outline" onClick={() => setFullscreen(false)}>Exit fullscreen</Button>
          </div>
        )}
        <Know Your FamilyView rootPersonId={person?.id} />
      </motion.div>

      {!fullscreen && (
        <div className="text-xs text-stone-400 text-center">
          Scroll to zoom • Drag to pan • Click a person to view their profile
        </div>
      )}
    </div>
  );
}
