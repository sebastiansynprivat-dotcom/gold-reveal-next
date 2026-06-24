import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, ExternalLink, Check, Diamond } from "lucide-react";
import { toast } from "sonner";

type Drop = {
  id: string;
  model_id: string | null;
  model_name: string;
  content_link: string;
  message: string;
  created_at: string;
  model_agency?: string | null;
};

export default function ContentDropsWidget() {
  const { user } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Only show drops for models the user is CURRENTLY assigned to
    // (open assignment = end_date IS NULL).
    const { data: activeAssignments } = await supabase
      .from("account_assignments")
      .select("account_id, accounts!inner(model_id)")
      .eq("user_id", user.id)
      .is("end_date", null);

    const activeModelIds = Array.from(
      new Set(
        (activeAssignments || [])
          .map((a: any) => a?.accounts?.model_id)
          .filter(Boolean) as string[]
      )
    );

    // Load agency info for each active model so we can show the right hint.
    const { data: modelAgencies } = await supabase
      .from("models")
      .select("id, model_agency")
      .in("id", activeModelIds);

    if (activeModelIds.length === 0) {
      setDrops([]);
      setReadIds(new Set());
      return;
    }

    const agencyMap = new Map<string, string | null>();
    (modelAgencies || []).forEach((m: any) => agencyMap.set(m.id, m.model_agency));

    const [{ data: dropsData }, { data: readsData }] = await Promise.all([
      supabase
        .from("content_drops")
        .select("id, model_id, model_name, content_link, message, created_at")
        .in("model_id", activeModelIds)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("content_drop_reads")
        .select("drop_id")
        .eq("user_id", user.id),
    ]);

    const enrichedDrops = ((dropsData as Drop[]) || []).map((drop) => ({
      ...drop,
      model_agency: drop.model_id ? agencyMap.get(drop.model_id) ?? null : null,
    }));
    setDrops(enrichedDrops);
    setReadIds(new Set((readsData || []).map((r: any) => r.drop_id)));
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("content_drops_user")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_drops" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markRead = async (id: string) => {
    if (!user) return;
    setMarking(id);
    const { error } = await supabase
      .from("content_drop_reads")
      .insert({ drop_id: id, user_id: user.id });
    setMarking(null);
    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      toast.error("Konnte nicht markieren");
      return;
    }
    setReadIds((s) => new Set([...s, id]));
  };

  const visible = drops.filter((d) => !readIds.has(d.id));
  if (visible.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <div className="relative">
          <Diamond className="h-4 w-4 text-accent" />
          <div className="absolute inset-0 bg-accent/40 rounded-full blur-md animate-pulse" />
        </div>
        <h2 className="text-sm font-bold text-gold-gradient">
          {visible.length === 1 ? "Neuer Content für dich" : `${visible.length} neue Content Drops`}
        </h2>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {visible.map((d) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="relative rounded-2xl overflow-hidden border border-accent/30 group"
              style={{
                background:
                  "linear-gradient(135deg, hsl(43 56% 12% / 0.6), hsl(0 0% 8% / 0.85))",
                boxShadow:
                  "0 0 0 1px hsl(43 56% 52% / 0.15), 0 8px 32px -8px hsl(43 56% 52% / 0.25), inset 0 1px 0 hsl(43 76% 60% / 0.15)",
              }}
            >
              {/* shimmer top edge */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              {/* radial glow */}
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-50 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(43 76% 50% / 0.4), transparent 70%)" }}
              />

              <div className="relative p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-accent/20 blur-md animate-pulse" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-accent/80 font-bold">
                      Frischer Content
                    </p>
                    <h3 className="text-base font-bold text-foreground leading-tight mt-0.5">
                      {d.model_name} hat neuen Content hochgeladen
                    </h3>
                    {d.message && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                        {d.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <a
                    href={d.content_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] relative overflow-hidden group/btn"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(43 56% 42%), hsl(43 76% 50%), hsl(43 56% 42%))",
                      color: "hsl(0 0% 4%)",
                      boxShadow: "0 4px 18px -4px hsl(43 56% 52% / 0.5)",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                    <ExternalLink className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Content ansehen</span>
                  </a>
                  <button
                    onClick={() => markRead(d.id)}
                    disabled={marking === d.id}
                    className="h-10 px-4 rounded-lg border border-border/60 bg-secondary/40 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-accent/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Gelesen
                  </button>
                </div>

                {d.model_agency === "syn" ? (
                  <p className="mt-2.5 text-[11px] text-muted-foreground/80 leading-relaxed">
                    <span className="text-accent/90 font-semibold">Hinweis (SYN):</span>{" "}
                    Die Models sollen in den Content-Link schauen, der ihnen per Chat mitgeteilt wurde.
                  </p>
                ) : (
                  <p className="mt-2.5 text-[11px] text-muted-foreground/80 leading-relaxed">
                    <span className="text-accent/90 font-semibold">Hinweis (SHE-X):</span>{" "}
                    Der Content liegt im Drive. Die Models können sich diesen dort selbst ansehen und hochladen. Falls es Probleme beim Hochladen gibt, sollen sie sich melden.
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
