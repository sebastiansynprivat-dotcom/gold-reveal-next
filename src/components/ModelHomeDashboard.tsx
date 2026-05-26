import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Layers,
  MessageSquare,
  Pencil,
  CheckCircle2,
  Clock,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "today" | "yesterday" | "last7" | "last30" | "month" | "lifetime";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Heute",
  yesterday: "Gestern",
  last7: "Letzte 7 Tage",
  last30: "Letzte 30 Tage",
  month: "Diesen Monat",
  lifetime: "Gesamt",
};

const PLATFORM_LABELS: Record<string, string> = {
  fourbased: "4Based",
  maloum: "Maloum",
  brezzels: "Brezzels",
  fansy: "FansyMe",
};

function periodRange(p: Period): { from: string; to: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (p === "today") return { from: fmt(today), to: fmt(today) };
  if (p === "yesterday") {
    const y = new Date(today); y.setDate(today.getDate() - 1);
    return { from: fmt(y), to: fmt(y) };
  }
  if (p === "last7") {
    const s = new Date(today); s.setDate(today.getDate() - 6);
    return { from: fmt(s), to: fmt(today) };
  }
  if (p === "last30") {
    const s = new Date(today); s.setDate(today.getDate() - 29);
    return { from: fmt(s), to: fmt(today) };
  }
  if (p === "month") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(s), to: fmt(today) };
  }
  return null;
}

interface Props {
  modelId: string;
  modelName: string;
  modelUsername?: string | null;
  profileConfirmed: boolean;
  onEditProfile: () => void;
}

export default function ModelHomeDashboard({
  modelId,
  modelName,
  modelUsername,
  profileConfirmed,
  onEditProfile,
}: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [revenueByAccount, setRevenueByAccount] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load model's accounts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from("accounts") as any)
        .select("id, platform, account_email, account_domain, assigned_to")
        .eq("model_id", modelId);
      if (!cancelled) setAccounts(data || []);
    })();
    return () => { cancelled = true; };
  }, [modelId]);

  // Load revenue for given period
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const accountIds = accounts.map((a) => a.id);
      if (accountIds.length === 0) {
        if (!cancelled) { setRevenueByAccount({}); setLoading(false); }
        return;
      }

      const range = periodRange(period);
      // Get all assignments (active or historic) for these accounts
      const { data: assigns } = await (supabase.from("account_assignments") as any)
        .select("account_id, user_id")
        .in("account_id", accountIds);
      const userToAccount: Record<string, string> = {};
      (assigns || []).forEach((a: any) => { userToAccount[a.user_id] = a.account_id; });

      // Also include current assignments via accounts.assigned_to
      accounts.forEach((a) => { if (a.assigned_to) userToAccount[a.assigned_to] = a.id; });

      const userIds = Object.keys(userToAccount);
      if (userIds.length === 0) {
        if (!cancelled) { setRevenueByAccount({}); setLoading(false); }
        return;
      }

      let q = (supabase.from("daily_revenue") as any).select("user_id, amount, date").in("user_id", userIds);
      if (range) q = q.gte("date", range.from).lte("date", range.to);
      const { data: rev } = await q;

      const byAccount: Record<string, number> = {};
      (rev || []).forEach((r: any) => {
        const accId = userToAccount[r.user_id];
        if (!accId) return;
        byAccount[accId] = (byAccount[accId] || 0) + Number(r.amount || 0);
      });

      if (!cancelled) {
        setRevenueByAccount(byAccount);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accounts, period]);

  // Load open content requests
  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("model_requests") as any)
        .select("id, description, status, created_at, request_type, price")
        .eq("model_name", modelName)
        .order("created_at", { ascending: false })
        .limit(10);
      setRequests(data || []);
    })();
  }, [modelName]);

  const total = useMemo(
    () => Object.values(revenueByAccount).reduce((s, v) => s + v, 0),
    [revenueByAccount],
  );
  const fmtMoney = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

  const openRequests = requests.filter((r) => r.status === "pending").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-5"
    >
      {/* Hero / Welcome */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden card-inner-glow card-top-line">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Willkommen zurück</p>
            <h1 className="text-2xl font-bold text-gold-gradient-shimmer leading-tight">{modelName}</h1>
            {modelUsername && (
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                shex-dashboard.com/m/{modelUsername}
              </p>
            )}
          </div>
          <div
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider",
              profileConfirmed
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30",
            )}
          >
            {profileConfirmed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {profileConfirmed ? "Bestätigt" : "Prüfung läuft"}
          </div>
        </div>
      </div>

      {/* Revenue */}
      <section className="glass-card rounded-2xl p-5 space-y-4 card-inner-glow">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">Einnahmen</h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-full border transition-all tabular-nums",
                  active
                    ? "bg-accent/15 text-accent border-accent/40 shadow-sm"
                    : "bg-secondary/30 text-muted-foreground border-border/30 hover:text-foreground hover:border-accent/20",
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            );
          })}
        </div>

        <div className="glass-card-subtle rounded-xl p-5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{PERIOD_LABELS[period]}</p>
          <p className="text-4xl font-bold text-gold-gradient-shimmer mt-1 tabular-nums">
            {loading ? "…" : fmtMoney(total)}
          </p>
        </div>
      </section>

      {/* Platforms */}
      <section className="glass-card rounded-2xl p-5 space-y-4 card-inner-glow">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">Plattformen</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">{accounts.length} aktiv</span>
        </div>

        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Noch keine Plattformen verknüpft.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="glass-card-subtle rounded-xl p-4 card-hover-glow card-inner-glow"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground">
                    {PLATFORM_LABELS[a.platform] || a.platform}
                  </span>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      a.assigned_to ? "bg-emerald-400" : "bg-muted-foreground/40",
                    )}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {a.account_email || a.account_domain || "—"}
                </p>
                <p className="text-lg font-bold text-accent tabular-nums mt-2">
                  {fmtMoney(revenueByAccount[a.id] || 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Content Requests */}
      <section className="glass-card rounded-2xl p-5 space-y-3 card-inner-glow">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">Custom-Anfragen</h2>
          {openRequests > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {openRequests} offen
            </span>
          )}
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Aktuell keine Anfragen.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="glass-card-subtle rounded-lg p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString("de-DE")} ·{" "}
                    <span
                      className={cn(
                        r.status === "pending" && "text-amber-400",
                        r.status === "completed" && "text-emerald-400",
                        r.status === "rejected" && "text-red-400",
                      )}
                    >
                      {r.status === "pending"
                        ? "Offen"
                        : r.status === "completed"
                          ? "Erledigt"
                          : "Abgelehnt"}
                    </span>
                  </p>
                </div>
                {r.price && (
                  <div className="shrink-0 inline-flex items-center gap-1 text-[10px] text-accent">
                    <Wallet className="h-3 w-3" />
                    {fmtMoney(Number(r.price))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Profile small option */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditProfile}
          className="text-xs text-muted-foreground hover:text-accent gap-1.5"
        >
          <Pencil className="h-3 w-3" />
          Steckbrief bearbeiten
        </Button>
      </div>
    </motion.div>
  );
}
