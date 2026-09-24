"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types";

export function useNotifications(personId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const fetch = useCallback(async () => {
    if (!personId) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_person_id", personId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  }, [personId, supabase]);

  const markRead = useCallback(async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, [supabase]);

  const markAllRead = useCallback(async () => {
    if (!personId) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_person_id", personId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [personId, supabase]);

  useEffect(() => {
    fetch();
    if (!personId) return;

    // Real-time subscription
    const channel = supabase
      .channel("notifications:" + personId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_person_id=eq.${personId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [personId, fetch, supabase]);

  return { notifications, unreadCount, markRead, markAllRead, refresh: fetch };
}
