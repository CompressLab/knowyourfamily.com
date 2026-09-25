"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Shield, Heart, GitBranch, FileText, Search, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: <Users className="w-6 h-6" />,
    title: "Know",
    subtitle: "Rich family profiles",
    desc: "Create detailed profiles for every family member — even those without accounts. Then & Now photos help younger relatives recognise older ones.",
    color: "from-amber-400 to-orange-400",
    bg: "bg-amber-50",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Connect",
    subtitle: "Build your family network",
    desc: "Find relatives and trusted friends. Send relationship requests. Explore your family with an interactive, visual family tree.",
    color: "from-rose-400 to-pink-400",
    bg: "bg-rose-50",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Trust",
    subtitle: "Secure document vault",
    desc: "Store passports, IDs, and certificates privately. Share individual documents with exactly the right people — nothing is ever public.",
    color: "from-blue-400 to-indigo-400",
    bg: "bg-blue-50",
  },
];

const stats = [
  { label: "Family profiles", value: "Unlimited" },
  { label: "Document vault", value: "2 MB/file" },
  { label: "Access control", value: "Per-document" },
  { label: "Cost to start", value: "Free" },
];

// Animated floating dots/orbs for background
const orbs = [
  { x: "10%", y: "20%", size: 120, color: "amber", delay: 0 },
  { x: "80%", y: "10%", size: 90, color: "rose", delay: 1 },
  { x: "70%", y: "70%", size: 150, color: "blue", delay: 2 },
  { x: "20%", y: "75%", size: 80, color: "emerald", delay: 1.5 },
  { x: "50%", y: "40%", size: 60, color: "purple", delay: 0.8 },
];

const colorMap: Record<string, string> = {
  amber: "bg-amber-200",
  rose: "bg-rose-200",
  blue: "bg-blue-200",
  emerald: "bg-emerald-200",
  purple: "bg-purple-200",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-bg overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {orbs.map((orb, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full opacity-20 blur-3xl ${colorMap[orb.color]}`}
            style={{ left: orb.x, top: orb.y, width: orb.size, height: orb.size }}
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 6 + i, delay: orb.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-stone-900">Know Your Family</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
            Free to use — no credit card required
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-stone-900 mb-6 leading-tight">
            Your family,{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              connected
            </span>
            <br />& protected.
          </h1>

          <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Build rich profiles for every family member. Explore your family tree. 
            Store important documents privately and share them with exactly the right people.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="xl" className="gap-2">
                Start building your family tree
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="xl" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Hero visual — connected profile bubbles */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 relative mx-auto max-w-xl h-48"
          aria-hidden="true"
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 200">
            {/* Connection lines */}
            <motion.line x1="300" y1="100" x2="150" y2="60" stroke="#f59e0b" strokeWidth="2" opacity="0.4"
              className="connection-line" />
            <motion.line x1="300" y1="100" x2="450" y2="60" stroke="#f59e0b" strokeWidth="2" opacity="0.4"
              className="connection-line" />
            <motion.line x1="150" y1="60" x2="80" y2="150" stroke="#f59e0b" strokeWidth="1.5" opacity="0.3"
              className="connection-line" />
            <motion.line x1="450" y1="60" x2="520" y2="150" stroke="#f59e0b" strokeWidth="1.5" opacity="0.3"
              className="connection-line" />
            <motion.line x1="300" y1="100" x2="300" y2="170" stroke="#f59e0b" strokeWidth="1.5" opacity="0.3"
              className="connection-line" />
          </svg>
          {/* Profile bubbles */}
          {[
            { x: "calc(50% - 28px)", y: "60px", label: "You", size: "w-14 h-14", gradient: "from-amber-400 to-orange-400", delay: 0 },
            { x: "calc(25% - 24px)", y: "20px", label: "Dad", size: "w-12 h-12", gradient: "from-rose-400 to-pink-400", delay: 0.2 },
            { x: "calc(75% - 24px)", y: "20px", label: "Mum", size: "w-12 h-12", gradient: "from-blue-400 to-indigo-400", delay: 0.4 },
            { x: "calc(13% - 20px)", y: "110px", label: "Nana", size: "w-10 h-10", gradient: "from-purple-400 to-violet-400", delay: 0.6 },
            { x: "calc(87% - 20px)", y: "110px", label: "Baba", size: "w-10 h-10", gradient: "from-emerald-400 to-teal-400", delay: 0.8 },
            { x: "calc(50% - 18px)", y: "120px", label: "Sis", size: "w-9 h-9", gradient: "from-pink-400 to-rose-400", delay: 1 },
          ].map((b, i) => (
            <motion.div
              key={i}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: b.x, top: b.y }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: b.delay, type: "spring", stiffness: 200 }}
            >
              <div className={`${b.size} rounded-full bg-gradient-to-br ${b.gradient} flex items-center justify-center shadow-lg`}>
                <Users className="w-1/2 h-1/2 text-white" />
              </div>
              <span className="text-xs font-medium text-stone-600 whitespace-nowrap">{b.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 bg-white/70 backdrop-blur-md border-y border-stone-100 py-8">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-2xl font-bold text-stone-900">{s.value}</div>
              <div className="text-sm text-stone-500 mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-stone-900 mb-4"
          >
            Everything your family needs
          </motion.h2>
          <p className="text-stone-500 max-w-xl mx-auto">
            From great-grandparents to newborns, every generation has a place — even without a login.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`${f.bg} rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md mb-5`}>
                {f.icon}
              </div>
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">{f.title}</div>
              <h3 className="text-xl font-bold text-stone-900 mb-3">{f.subtitle}</h3>
              <p className="text-stone-600 leading-relaxed text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* More features grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: <Search className="w-5 h-5" />, title: "People Discovery", desc: "Search by name or phone number. Privacy-first: phone numbers are never displayed in results." },
            { icon: <GitBranch className="w-5 h-5" />, title: "Interactive Family Tree", desc: "Pan, zoom, and explore your family visually. Touch-friendly for mobile. Click any profile to learn more." },
            { icon: <FileText className="w-5 h-5" />, title: "Document Vault", desc: "PDFs, IDs, certificates — all stored privately. Share individual documents with specific people, never broadly." },
            { icon: <Shield className="w-5 h-5" />, title: "Security First", desc: "Row-level security, private storage, signed URLs, audit logs, and per-document authorization." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-5 p-6 bg-white/80 rounded-2xl border border-stone-100 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold text-stone-900 mb-1">{item.title}</h4>
                <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-12 shadow-2xl"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Start connecting your family today
          </h2>
          <p className="text-amber-100 mb-8 text-lg">
            Free for personal and family use. No credit card needed.
          </p>
          <Link href="/register">
            <Button size="xl" variant="outline" className="bg-white text-amber-700 hover:bg-amber-50 border-white">
              Create your family tree
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-100 bg-white/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-stone-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <GitBranch className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium text-stone-600">Know Your Family</span>
          </div>
          <p>Documents are private by default. Nothing is ever public.</p>
        </div>
      </footer>
    </div>
  );
}
