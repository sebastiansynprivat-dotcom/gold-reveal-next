import { useState } from "react";

interface UserProgress {
  current_step: string;
  video_completed: boolean;
  quiz_completed: boolean;
  quiz_score: number | null;
}

export const useProgress = () => {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const updateProgress = async (updates: Partial<UserProgress>) => {
    setProgress((prev) => (prev ? { ...prev, ...updates } : { current_step: "video", video_completed: false, quiz_completed: false, quiz_score: null, ...updates }));
  };

  return { progress, loading: false, updateProgress };
};
