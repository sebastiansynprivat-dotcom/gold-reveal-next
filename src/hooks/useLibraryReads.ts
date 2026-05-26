import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LibraryRead = {
  content_key: string;
  progress_pct: number;
  completed_at: string | null;
};

export function useLibraryReads() {
  const [reads, setReads] = useState<Record<string, LibraryRead>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("library_reads")
        .select("content_key, progress_pct, completed_at")
        .eq("user_id", user.id);
      if (!mounted) return;
      const map: Record<string, LibraryRead> = {};
      (data ?? []).forEach((r: any) => {
        map[r.content_key] = r;
      });
      setReads(map);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const upsert = useCallback(
    async (content_key: string, patch: Partial<LibraryRead>) => {
      if (!userId) return;
      const prev = reads[content_key];
      const next: LibraryRead = {
        content_key,
        progress_pct: Math.max(prev?.progress_pct ?? 0, patch.progress_pct ?? prev?.progress_pct ?? 0),
        completed_at: patch.completed_at !== undefined ? patch.completed_at : prev?.completed_at ?? null,
      };
      setReads((p) => ({ ...p, [content_key]: next }));
      await supabase
        .from("library_reads")
        .upsert(
          { user_id: userId, ...next },
          { onConflict: "user_id,content_key" }
        );
    },
    [userId, reads]
  );

  const markProgress = useCallback(
    (key: string, pct: number) => upsert(key, { progress_pct: Math.min(100, Math.max(0, Math.round(pct))) }),
    [upsert]
  );

  const markCompleted = useCallback(
    (key: string) => upsert(key, { progress_pct: 100, completed_at: new Date().toISOString() }),
    [upsert]
  );

  const unmarkCompleted = useCallback(
    (key: string) => upsert(key, { completed_at: null, progress_pct: 0 }),
    [upsert]
  );

  return { reads, loading, markProgress, markCompleted, unmarkCompleted };
}
