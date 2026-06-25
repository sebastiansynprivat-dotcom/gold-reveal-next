import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, ChevronRight, Sparkles } from "lucide-react";
import ModelProfileViewDialog from "./ModelProfileViewDialog";
import { useUILanguage } from "@/hooks/useUILanguage";

interface ModelInput {
  id: string; // model_id (or fallback key)
  name: string;
}

interface Snapshot {
  age?: string | number;
  city?: string;
  occupation?: string;
  hobbies?: string;
  favorite_food?: string;
  favorite_music?: string;
  [k: string]: any;
}

export default function ModelProfilePreviewCards({ models }: { models: ModelInput[] }) {
  const { lang } = useUILanguage();
  const isEN = lang === "en";
  const [profiles, setProfiles] = useState<Record<string, Snapshot>>({});
  const [openModelId, setOpenModelId] = useState<string | null>(null);
  const [openModelName, setOpenModelName] = useState<string>("");

  useEffect(() => {
    const ids = models.map((m) => m.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length === 0) {
      setProfiles({});
      return;
    }
    let cancelled = false;
    supabase
      .from("model_profiles")
      .select("model_id, approved_snapshot, confirmed_at")
      .in("model_id", ids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, Snapshot> = {};
        (data as any[]).forEach((row) => {
          const snap = row.approved_snapshot;
          if (snap && typeof snap === "object") {
            map[row.model_id] = snap as Snapshot;
          } else if (row.confirmed_at) {
            map[row.model_id] = {} as Snapshot;
          }
        });
        setProfiles(map);
      });
    return () => {
      cancelled = true;
    };
  }, [models.map((m) => m.id).join(",")]);

  const visible = models.filter((m) => profiles[m.id]);
  if (visible.length === 0) return null;

  return (
    <>
      <div className="px-4 py-4 lg:px-6 lg:py-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">
            {isEN ? "Your model's profile" : "Steckbrief deines Models"}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {visible.map((m) => {
            const snap = profiles[m.id] || {};
            const bits: string[] = [];
            if (snap.age) bits.push(`${snap.age}${isEN ? "" : " Jahre"}`);
            if (snap.city) bits.push(String(snap.city));
            if (snap.occupation) bits.push(String(snap.occupation));
            const subtitle = bits.slice(0, 3).join(" · ");
            return (
              <button
                key={m.id}
                onClick={() => {
                  setOpenModelId(m.id);
                  setOpenModelName(m.name);
                }}
                className="group flex items-center gap-3 rounded-lg border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-3 text-left transition-all hover:border-accent/40 hover:bg-accent/10"
              >
                <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.name || (isEN ? "Your model" : "Dein Model")}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {subtitle ||
                      (isEN ? "Tap to view the full profile" : "Tippen, um den vollständigen Steckbrief zu sehen")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <ModelProfileViewDialog
        open={!!openModelId}
        onOpenChange={(o) => {
          if (!o) setOpenModelId(null);
        }}
        modelId={openModelId}
      />
    </>
  );
}
