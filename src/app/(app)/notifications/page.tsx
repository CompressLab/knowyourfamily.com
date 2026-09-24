"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Check, Users, FileText, Heart, Flag, Download, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const notifIcon: Record<string, React.ElementType> = {
  relationship_request: Users,
  relationship_accepted: Users,
  friend_request: Heart,
  friend_accepted: Heart,
  document_uploaded: FileText,
  document_downloaded: Download,
  document_shared: FileText,
  profile_claim: Flag,
  default: Bell,
};

const notifColor: Record<string, string> = {
  relationship_request: "bg-blue-100 text-blue-600",
  relationship_accepted: "bg-emerald-100 text-emerald-600",
  friend_request: "bg-rose-100 text-rose-600",
  friend_accepted: "bg-rose-100 text-rose-600",
  document_uploaded: "bg-amber-100 text-amber-600",
  document_downloaded: "bg-orange-100 text-orange-600",
  document_shared: "bg-amber-100 text-amber-600",
  profile_claim: "bg-purple-100 text-purple-600",
  default: "bg-stone-100 text-stone-600",
};

export default function NotificationsPage() {
  const { person } = useUser();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(person?.id);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-stone-500 text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </motion.div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-stone-200 mx-auto mb-4" />
          <p className="font-semibold text-stone-900 mb-2">No notifications yet</p>
          <p className="text-sm text-stone-500">Connection requests, document activity, and other updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = notifIcon[n.notification_type] ?? notifIcon.default;
            const iconClass = notifColor[n.notification_type] ?? notifColor.default;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-all",
                    !n.read && "bg-amber-50/50 border-amber-200"
                  )}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug", n.read ? "text-stone-600" : "text-stone-900 font-medium")}>
                        {n.message}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
