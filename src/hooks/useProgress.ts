import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UserProgress {
  current_step: string;
  video_completed: boolean;
  quiz_completed: boolean;
  quiz_score: number | null;
}

export const useProgress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("current_step, video_completed, quiz_completed, quiz_score")
        .eq("user_id", user.id)
        .single();
      setProgress(data);
      setLoading(false);
    };

    fetch();
  }, [user]);

  const updateProgress = async (updates: Partial<UserProgress>) => {
    if (!user) return;
    const { data } = await supabase
      .from("user_progress")
      .update(updates)
      .eq("user_id", user.id)
      .select("current_step, video_completed, quiz_completed, quiz_score")
      .single();
    if (data) setProgress(data);
  };

  return { progress, loading, updateProgress };
};
