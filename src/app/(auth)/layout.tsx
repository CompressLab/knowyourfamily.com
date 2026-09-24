import { GitBranch } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <nav className="flex items-center px-6 py-5">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-stone-900">FamilyTree</span>
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  );
}
