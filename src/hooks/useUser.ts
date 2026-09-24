"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Person } from "@/types";

interface UseUserReturn {
  user: User | null;
  person: Person | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPerson = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", userId)
      .single();
    setPerson(data as Person | null);
  }, [supabase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) await fetchPerson(u.id);
    setLoading(false);
  }, [supabase, fetchPerson]);

  useEffect(() => {
    refresh();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) await fetchPerson(session.user.id);
        else setPerson(null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [refresh, supabase, fetchPerson]);

  return { user, person, loading, refresh };
}
