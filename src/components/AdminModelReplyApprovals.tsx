import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface PendingMessage {
  id: string;
  request_id: string;
  body: string;
  created_at: string;
  request_description?: string;
  model_name?: string;
}

export default function AdminModelReplyApprovals() {
  const [items, setItems] = useState<PendingMessage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: msgs } = await supabase
      .from("model_request_messages")
      .select("id, request_id, body, created_at")
      .eq("sender_role", "model")
      .eq("visible_to_chatter", false)
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (msgs || []) as PendingMessage[];
    if (list.length) {
      const reqIds = Array.from(new Set(list.map((m) => m.request_id)));
      const { data: reqs } = await supabase
        .from("model_requests")
        .select("id, description, model_name")
        .in("id", reqIds);
      const map = new Map((reqs || []).map((r: any) => [r.id, r]));
      for (const m of list) {
        const r: any = map.get(m.request_id);
        if (r) {
          m.request_description = r.description;
          m.model_name = r.model_name;
        }
      }
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_model_reply_approvals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_request_messages" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const approve = async (m: PendingMessage) => {
    setBusy(m.id);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("model_request_messages")
      .update({
        visible_to_chatter: true,
        approved_by_admin_at: new Date().toISOString(),
        approved_by_admin: u.user?.id,
      })
      .eq("id", m.id);
    setBusy(null);
    if (error) return toast.error("Freigabe fehlgeschlagen");
    toast.success("Freigegeben → Chatter sieht die Antwort jetzt");
    setItems((prev) => prev.filter((x) => x.id !== m.id));
  };

  const discard = async (m: PendingMessage) => {
    if (!confirm("Diese Rückfrage wirklich verwerfen?")) return;
    setBusy(m.id);
    const { error } = await supabase
      .from("model_request_messages")
      .delete()
      .eq("id", m.id);
    setBusy(null);
    if (error) return toast.error("Löschen fehlgeschlagen");
    toast.success("Verworfen");
    setItems((prev) => prev.filter((x) => x.id !== m.id));
  };

  if (loading || items.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 space-y-3 border"
      style={{
        background: "linear-gradient(135deg, hsl(340 50% 16% / 0.6), hsl(43 50% 14% / 0.5))",
        borderColor: "hsl(340 60% 50% / 0.35)",
        boxShadow: "0 0 24px -10px hsl(340 70% 50% / 0.35)",
      }}
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-bold text-foreground">
          Model-Rückfragen warten auf Freigabe
        </h3>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 tabular-nums">
          {items.length}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {items.map((m) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="glass-card-subtle rounded-lg p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.model_name || "Model"} · {new Date(m.created_at).toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                {m.request_description && (
                  <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-1">
                    Anfrage: {m.request_description}
                  </p>
                )}
                <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap break-words">
                  {m.body}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => discard(m)}
                disabled={busy === m.id}
                className="gap-1.5 text-muted-foreground hover:text-red-400"
              >
                <X className="h-3 w-3" /> Verwerfen
              </Button>
              <Button
                size="sm"
                onClick={() => approve(m)}
                disabled={busy === m.id}
                className="gap-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
              >
                {busy === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Freigeben → Chatter
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
