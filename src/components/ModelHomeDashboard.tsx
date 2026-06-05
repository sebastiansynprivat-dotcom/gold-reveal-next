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
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { generateProviderInvoicePdf, downloadPdf } from "@/lib/providerInvoicePdf";


type Period = "today" | "yesterday" | "last7" | "last30" | "month" | "lifetime";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Heute",
  yesterday: "Gestern",
  last7: "Letzte 7 Tage",
  last30: "Letzte 30 Tage",
  month: "Diesen Monat",
  lifetime: "Gesamt",
};

const PERIOD_LABELS_EN: Record<Period, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  month: "This month",
  lifetime: "Lifetime",
};

const COPY = {
  de: {
    welcome: "Willkommen zurück",
    confirmed: "Bestätigt",
    pending: "Prüfung läuft",
    revenue: "Einnahmen",
    platforms: "Plattformen",
    active: "aktiv",
    noPlatforms: "Noch keine Plattformen verknüpft.",
    requests: "Custom-Anfragen",
    open: "offen",
    noRequests: "Aktuell keine Anfragen.",
    statusPending: "Offen",
    statusCompleted: "Erledigt",
    statusRejected: "Abgelehnt",
    editProfile: "Steckbrief bearbeiten",
    email: "E-Mail",
    password: "Passwort",
    domain: "Login-Seite",
    openLogin: "Login öffnen",
    copied: "Kopiert",
    showPwd: "Anzeigen",
    hidePwd: "Verbergen",
    billing: "Abrechnungen",
    nextPayout: "Nächste Abrechnung",
    nextPayoutValue: "Innerhalb der ersten 10 Tage",
    lifetime: "Gesamtumsatz",
    pastInvoices: "Vergangene Abrechnungen",
    noInvoices: "Noch keine Abrechnungen.",
    net: "Netto",
    gross: "Brutto",
    yourShare: "Dein Anteil",
    netEarnings: "Deine Netto-Einnahmen",
    forecast: "Monatsprognose",
    forecastHint: "Hochrechnung basierend auf dem bisherigen Tagesdurchschnitt",
    downloadPdf: "PDF herunterladen",
    details: "Details ansehen",
    monthsCovered: "Abgerechnete Monate",
    platformRevenues: "Umsatz pro Plattform",
    payout: "Payout",
    invoiceNumber: "Rechnungs-Nr.",
    billedOn: "Abgerechnet am",
    servicePeriod: "Leistungszeitraum",
  },

  en: {
    welcome: "Welcome back",
    confirmed: "Confirmed",
    pending: "Under review",
    revenue: "Earnings",
    platforms: "Platforms",
    active: "active",
    noPlatforms: "No platforms connected yet.",
    requests: "Custom requests",
    open: "open",
    noRequests: "No requests right now.",
    statusPending: "Open",
    statusCompleted: "Completed",
    statusRejected: "Rejected",
    editProfile: "Edit profile",
    email: "Email",
    password: "Password",
    domain: "Login page",
    openLogin: "Open login",
    copied: "Copied",
    showPwd: "Show",
    hidePwd: "Hide",
    billing: "Payouts",
    nextPayout: "Next payout",
    nextPayoutValue: "Within the first 10 days",
    lifetime: "Lifetime revenue",
    pastInvoices: "Past invoices",
    noInvoices: "No invoices yet.",
    net: "Net",
    gross: "Gross",
    yourShare: "Your share",
    netEarnings: "Your net earnings",
    forecast: "Month forecast",
    forecastHint: "Projection based on daily average so far",
    downloadPdf: "Download PDF",
    details: "View details",
    monthsCovered: "Billed months",
    platformRevenues: "Revenue per platform",
    payout: "Payout",
    invoiceNumber: "Invoice no.",
    billedOn: "Billed on",
    servicePeriod: "Service period",
  },
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
  language?: "de" | "en";
}

export default function ModelHomeDashboard({
  modelId,
  modelName,
  profileConfirmed,
  onEditProfile,
  language = "de",
}: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];
  const periodLabels = lang === "en" ? PERIOD_LABELS_EN : PERIOD_LABELS;
  const [period, setPeriod] = useState<Period>("month");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [revenueByAccount, setRevenueByAccount] = useState<Record<string, number>>({});
  const [lifetimeByAccount, setLifetimeByAccount] = useState<Record<string, number>>({});
  const [monthRevenue, setMonthRevenue] = useState<number>(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [payoutSnapshots, setPayoutSnapshots] = useState<Record<string, any[]>>({});
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);
  const [issuer, setIssuer] = useState<{ name: string; address: string; vat_id: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [shownPwd, setShownPwd] = useState<Record<string, boolean>>({});
  const [openCard, setOpenCard] = useState<Record<string, boolean>>({});
  const [commissionPct, setCommissionPct] = useState<number>(0);
  const [modelCurrency, setModelCurrency] = useState<string>("EUR");

  // Load model commission % + currency
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: dash }, { data: mdl }] = await Promise.all([
        (supabase.from("model_dashboard") as any)
          .select("revenue_percentage")
          .eq("model_id", modelId)
          .maybeSingle(),
        (supabase.from("models") as any)
          .select("currency")
          .eq("id", modelId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setCommissionPct(Number(dash?.revenue_percentage || 0));
      setModelCurrency((mdl?.currency as string) || "EUR");
    })();
    return () => { cancelled = true; };
  }, [modelId]);

  // Load model's accounts (full credentials)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from("accounts") as any)
        .select("id, platform, account_email, account_password, account_domain, assigned_to")
        .eq("model_id", modelId);
      if (!cancelled) setAccounts(data || []);
    })();
    return () => { cancelled = true; };
  }, [modelId]);

  // Load revenue from accounts_data (same source as admin "Einnahmen")
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const accountIds = accounts.map((a) => a.id);
      if (accountIds.length === 0) {
        if (!cancelled) {
          setRevenueByAccount({});
          setLifetimeByAccount({});
          setMonthRevenue(0);
          setLoading(false);
        }
        return;
      }

      const range = periodRange(period);
      const today = new Date();
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const monthFrom = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
      const monthTo = fmt(today);

      // Period query (lifetime when range is null)
      let periodQ = (supabase.from("accounts_data") as any)
        .select("account_id, total")
        .in("account_id", accountIds);
      if (range) periodQ = periodQ.gte("date", range.from).lte("date", range.to);

      const lifetimeQ = (supabase.from("accounts_data") as any)
        .select("account_id, total")
        .in("account_id", accountIds);

      const monthQ = (supabase.from("accounts_data") as any)
        .select("total")
        .in("account_id", accountIds)
        .gte("date", monthFrom)
        .lte("date", monthTo);

      const [{ data: rev }, { data: lifetimeRev }, { data: monthRev }] = await Promise.all([
        periodQ,
        lifetimeQ,
        monthQ,
      ]);

      const byAccount: Record<string, number> = {};
      (rev || []).forEach((r: any) => {
        byAccount[r.account_id] = (byAccount[r.account_id] || 0) + Number(r.total || 0);
      });
      const lifetimeAcc: Record<string, number> = {};
      (lifetimeRev || []).forEach((r: any) => {
        lifetimeAcc[r.account_id] = (lifetimeAcc[r.account_id] || 0) + Number(r.total || 0);
      });
      const monthSum = (monthRev || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);

      if (!cancelled) {
        setRevenueByAccount(byAccount);
        setLifetimeByAccount(lifetimeAcc);
        setMonthRevenue(monthSum);
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

  // Load past invoices (credit_notes) + linked payout_revenue snapshots
  useEffect(() => {
    (async () => {
      if (accounts.length === 0) { setCreditNotes([]); setPayoutSnapshots({}); return; }
      const accountIds = accounts.map((a) => a.id);
      const { data: cn } = await (supabase.from("credit_notes") as any)
        .select("id, credit_note_number, credit_note_date, service_period_start, service_period_end, net_amount, gross_amount, vat_rate, vat_amount, payment_date, description, provider_name, provider_address, provider_is_business, provider_vat_id, payment_method, crypto_coin, tx_hash")
        .in("account_id", accountIds)
        .order("credit_note_date", { ascending: false })
        .limit(20);
      const list = cn || [];
      setCreditNotes(list);
      // Fetch payout_revenue snapshots grouped by credit_note_number
      const numbers = list.map((x: any) => x.credit_note_number).filter(Boolean);
      if (numbers.length > 0) {
        const { data: pr } = await (supabase.from("payout_revenue") as any)
          .select("last_fetched_month, last_fetched_year, fourbased_revenue, maloum_revenue, brezzels_revenue, monthly_revenue, billed_at, billed_amount, billed_credit_note_number, billed_snapshot")
          .eq("model_id", modelId)
          .in("billed_credit_note_number", numbers);
        const map: Record<string, any[]> = {};
        for (const row of (pr || []) as any[]) {
          const k = row.billed_credit_note_number;
          if (!map[k]) map[k] = [];
          map[k].push(row);
        }
        for (const k of Object.keys(map)) {
          map[k].sort((a, b) => (b.last_fetched_year - a.last_fetched_year) || (b.last_fetched_month - a.last_fetched_month));
        }
        setPayoutSnapshots(map);
      } else {
        setPayoutSnapshots({});
      }
    })();
  }, [accounts, modelId]);

  // Load issuer settings (for PDF regeneration)
  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("issuer_settings") as any)
        .select("name, address, vat_id")
        .limit(1)
        .maybeSingle();
      if (data) setIssuer({ name: data.name || "", address: data.address || "", vat_id: data.vat_id || "" });
    })();
  }, []);

  const downloadInvoicePdf = (cn: any) => {
    try {
      const snaps = payoutSnapshots[cn.credit_note_number] || [];
      const lines: Array<{ name: string; gross: number; pct: number }> = [];
      // Use invoice currency from snapshot if available, else model currency
      const currency =
        (snaps[0]?.billed_snapshot as any)?.invoice_currency ||
        modelCurrency ||
        "EUR";
      if (snaps.length > 0) {
        for (const s of snaps) {
          const label = new Date(s.last_fetched_year, s.last_fetched_month - 1, 1)
            .toLocaleDateString("de-DE", { month: "short", year: "numeric" });
          lines.push({
            name: `Creator revenue share ${label}`,
            gross: Number(s.billed_amount || 0),
            pct: 100,
          });
        }
      } else {
        lines.push({
          name: cn.description || "Creator revenue share",
          gross: Number(cn.net_amount || 0),
          pct: 100,
        });
      }
      const doc = generateProviderInvoicePdf({
        creditNoteNumber: cn.credit_note_number,
        creditNoteDate: cn.credit_note_date,
        servicePeriodStart: cn.service_period_start || cn.credit_note_date,
        servicePeriodEnd: cn.service_period_end || cn.credit_note_date,
        issuer: {
          name: issuer?.name || "",
          address: issuer?.address || "",
          vatId: issuer?.vat_id || "",
        },
        provider: {
          name: cn.provider_name || modelName,
          address: cn.provider_address || "",
          isBusiness: !!cn.provider_is_business,
          vatId: cn.provider_vat_id || "",
        },
        description: cn.description || "Creator revenue share for digital content",
        currency,
        lines,
        net: Number(cn.net_amount || 0),
        payment: {
          method: cn.payment_method || undefined,
          txHash: cn.tx_hash || undefined,
          paymentDate: cn.payment_date || undefined,
        },
      });
      downloadPdf(doc, `ProviderInvoice_${String(cn.credit_note_number).replace(/\//g, "-")}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error(lang === "en" ? "Could not generate PDF" : "PDF konnte nicht erstellt werden");
    }
  };




  const total = useMemo(
    () => Object.values(revenueByAccount).reduce((s, v) => s + v, 0),
    [revenueByAccount],
  );
  const lifetimeTotal = useMemo(
    () => Object.values(lifetimeByAccount).reduce((s, v) => s + v, 0),
    [lifetimeByAccount],
  );
  const safeFmt = (v: number, opts: Intl.NumberFormatOptions, ccy?: string) => {
    const locale = lang === "en" ? "en-US" : "de-DE";
    const c = (ccy || modelCurrency || "EUR").toUpperCase();
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: c, ...opts }).format(v);
    } catch {
      return `${new Intl.NumberFormat(locale, opts).format(v)} ${c}`;
    }
  };
  const fmtMoney = (v: number, ccy?: string) => safeFmt(v, { maximumFractionDigits: 0 }, ccy);
  const fmtMoneyDec = (v: number, ccy?: string) => safeFmt(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, ccy);
  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString(lang === "en" ? "en-US" : "de-DE", { day: "2-digit", month: "short", year: "numeric" });

  const openRequests = requests.filter((r) => r.status === "pending").length;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonth = dayOfMonth > 0 ? Math.round((monthRevenue / dayOfMonth) * totalDays) : 0;

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(copy.copied);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {}
  };

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
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{copy.welcome}</p>
            <h1 className="text-2xl font-bold text-gold-gradient-shimmer leading-tight">{modelName}</h1>
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
            {profileConfirmed ? copy.confirmed : copy.pending}
          </div>
        </div>
      </div>

      {/* Revenue */}
      <section className="glass-card rounded-2xl p-5 space-y-4 card-inner-glow">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">{copy.revenue}</h2>
          {commissionPct > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 tabular-nums">
              {copy.yourShare}: {commissionPct}%
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(periodLabels) as Period[]).map((p) => {
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
                {periodLabels[p]}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{periodLabels[period]}</p>
            <p className="text-3xl font-bold text-gold-gradient-shimmer mt-1 tabular-nums">
              {loading ? "…" : fmtMoney(total)}
            </p>
            {commissionPct > 0 && (
              <p className="text-[10px] text-emerald-400 mt-1 tabular-nums">
                {copy.net}: {fmtMoney(total * commissionPct / 100)}
              </p>
            )}
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center relative overflow-hidden">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" /> {copy.forecast}
            </p>
            <p className="text-3xl font-bold text-accent mt-1 tabular-nums">
              {loading ? "…" : fmtMoney(projectedMonth)}
            </p>
            {commissionPct > 0 && (
              <p className="text-[10px] text-emerald-400 mt-1 tabular-nums">
                {copy.net}: {fmtMoney(projectedMonth * commissionPct / 100)}
              </p>
            )}
            <p className="text-[9px] text-muted-foreground/70 mt-1 leading-tight">{copy.forecastHint}</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{copy.lifetime}</p>
            <p className="text-3xl font-bold text-accent mt-1 tabular-nums">
              {loading ? "…" : fmtMoney(lifetimeTotal)}
            </p>
            {commissionPct > 0 && (
              <p className="text-[10px] text-emerald-400 mt-1 tabular-nums">
                {copy.net}: {fmtMoney(lifetimeTotal * commissionPct / 100)}
              </p>
            )}
          </div>
        </div>
      </section>


      {/* Content Requests */}
      <section className="glass-card rounded-2xl p-5 space-y-3 card-inner-glow">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">{copy.requests}</h2>
          {openRequests > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {openRequests} {copy.open}
            </span>
          )}
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {copy.noRequests}
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
                    {new Date(r.created_at).toLocaleDateString(lang === "en" ? "en-US" : "de-DE")} ·{" "}
                    <span
                      className={cn(
                        r.status === "pending" && "text-amber-400",
                        r.status === "completed" && "text-emerald-400",
                        r.status === "rejected" && "text-red-400",
                      )}
                    >
                      {r.status === "pending"
                        ? copy.statusPending
                        : r.status === "completed"
                          ? copy.statusCompleted
                          : copy.statusRejected}
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

      {/* Platforms — expandable cards with credentials */}
      <section className="glass-card rounded-2xl p-5 space-y-4 card-inner-glow">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">{copy.platforms}</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">{accounts.length} {copy.active}</span>
        </div>

        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {copy.noPlatforms}
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => {
              const isOpen = !!openCard[a.id];
              const isPwdShown = !!shownPwd[a.id];
              const loginUrl = a.account_domain
                ? (a.account_domain.startsWith("http") ? a.account_domain : `https://${a.account_domain}`)
                : "";
              return (
                <Collapsible
                  key={a.id}
                  open={isOpen}
                  onOpenChange={(o) => setOpenCard((s) => ({ ...s, [a.id]: o }))}
                  className="glass-card-subtle rounded-xl card-hover-glow overflow-hidden"
                >
                  <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
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
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {a.account_email || a.account_domain || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-accent tabular-nums">
                        {fmtMoney(revenueByAccount[a.id] || 0)}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {periodLabels[period]}
                      </p>
                      {commissionPct > 0 && (
                        <p className="text-[10px] text-emerald-400 tabular-nums mt-0.5">
                          {copy.net}: {fmtMoney((revenueByAccount[a.id] || 0) * commissionPct / 100)}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                    {/* Email */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{copy.email}</p>
                        <p className="text-xs text-foreground font-mono truncate">{a.account_email || "—"}</p>
                      </div>
                      {a.account_email && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => copyValue(`email-${a.id}`, a.account_email)}
                        >
                          {copiedKey === `email-${a.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                    {/* Password */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{copy.password}</p>
                        <p className="text-xs text-foreground font-mono truncate">
                          {a.account_password ? (isPwdShown ? a.account_password : "•".repeat(Math.min(12, a.account_password.length))) : "—"}
                        </p>
                      </div>
                      {a.account_password && (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setShownPwd((s) => ({ ...s, [a.id]: !s[a.id] }))}
                            title={isPwdShown ? copy.hidePwd : copy.showPwd}
                          >
                            {isPwdShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => copyValue(`pwd-${a.id}`, a.account_password)}
                          >
                            {copiedKey === `pwd-${a.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                    {/* Login button */}
                    {loginUrl && (
                      <a
                        href={loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {copy.openLogin} · {a.account_domain}
                      </a>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </section>

      {/* Billing / Invoices */}
      <section className="glass-card rounded-2xl p-5 space-y-3 card-inner-glow">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">{copy.billing}</h2>
        </div>

        <div className="glass-card-subtle rounded-xl p-4 flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{copy.nextPayout}</p>
            <p className="text-sm font-semibold text-foreground">{copy.nextPayoutValue}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">{copy.pastInvoices}</p>
          {creditNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {copy.noInvoices}
            </p>
          ) : (
            <div className="space-y-1.5">
              {creditNotes.map((cn) => (
                <div
                  key={cn.id}
                  className="glass-card-subtle rounded-lg p-3 flex items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(cn)}
                    className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    <p className="text-xs font-semibold text-foreground truncate">
                      {cn.credit_note_number}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {cn.service_period_start && cn.service_period_end
                        ? `${fmtDate(cn.service_period_start)} — ${fmtDate(cn.service_period_end)}`
                        : fmtDate(cn.credit_note_date)}
                    </p>
                  </button>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-accent tabular-nums">
                      {fmtMoneyDec(Number(cn.net_amount || 0))}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      {copy.net}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); downloadInvoicePdf(cn); }}
                    className="h-8 w-8 shrink-0 text-accent hover:text-accent hover:bg-accent/10"
                    title={copy.downloadPdf}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

          )}
        </div>
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
          {copy.editProfile}
        </Button>
      </div>

      {/* Invoice detail dialog */}
      <Dialog open={!!detailInvoice} onOpenChange={(o) => !o && setDetailInvoice(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {detailInvoice && (() => {
            const cn = detailInvoice;
            const snaps = payoutSnapshots[cn.credit_note_number] || [];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <span>{cn.credit_note_number}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                      {lang === "en" ? "Billed" : "Abgerechnet"}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground text-xs">{copy.billedOn}</span>
                      <span className="text-xs text-foreground">{fmtDate(cn.credit_note_date)}</span>
                    </div>
                    {cn.service_period_start && cn.service_period_end && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground text-xs">{copy.servicePeriod}</span>
                        <span className="text-xs text-foreground">
                          {fmtDate(cn.service_period_start)} – {fmtDate(cn.service_period_end)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 pt-1.5 mt-1.5 border-t border-emerald-500/20">
                      <span className="text-muted-foreground text-xs">{copy.payout}</span>
                      <span className="text-base font-bold text-accent tabular-nums">
                        {fmtMoneyDec(Number(cn.net_amount || 0))}
                      </span>
                    </div>
                  </div>

                  {snaps.length > 0 && (
                    <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{copy.monthsCovered}</p>
                      <div className="space-y-2">
                        {snaps.map((s, i) => {
                          const monthLabel = new Date(s.last_fetched_year, s.last_fetched_month - 1, 1)
                            .toLocaleDateString(lang === "en" ? "en-US" : "de-DE", { month: "long", year: "numeric" });
                          const snap = s.billed_snapshot || {};
                          const pr = snap.platform_revenues || {
                            fourbased: s.fourbased_revenue || 0,
                            maloum: s.maloum_revenue || 0,
                            brezzels: s.brezzels_revenue || 0,
                          };
                          const pcts = snap.percentages || {};
                          const defPct = pcts.default || 0;
                          const pctFb = pcts.fourbased || defPct;
                          const pctMa = pcts.maloum || defPct;
                          const pctBr = pcts.brezzels || defPct;
                          const snapCurrency = snap.invoice_currency || modelCurrency;
                          const customs: any[] = snap.custom_platforms || [];
                          const fmtN = (n: number) =>
                            Number(n || 0).toLocaleString(lang === "en" ? "en-US" : "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          const gesamt =
                            Number(pr.fourbased || 0) +
                            Number(pr.maloum || 0) +
                            Number(pr.brezzels || 0) +
                            customs.reduce((sum, c) => sum + Number(c.revenue || 0), 0);
                          return (
                            <div key={i} className="rounded-md bg-background/40 border border-border/30 p-2.5 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
                                <span className="text-xs font-bold text-accent tabular-nums">
                                  {fmtMoneyDec(Number(s.billed_amount || 0), snapCurrency)}
                                </span>
                              </div>
                              <div className="space-y-1 text-[10px]">
                                {Number(pr.fourbased || 0) > 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>4Based {pctFb ? `(${pctFb}%)` : ""}</span>
                                    <span className="tabular-nums">{fmtN(pr.fourbased)} USD</span>
                                  </div>
                                )}
                                {Number(pr.maloum || 0) > 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Maloum {pctMa ? `(${pctMa}%)` : ""}</span>
                                    <span className="tabular-nums">{fmtN(pr.maloum)} EUR</span>
                                  </div>
                                )}
                                {Number(pr.brezzels || 0) > 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Brezzels {pctBr ? `(${pctBr}%)` : ""}</span>
                                    <span className="tabular-nums">{fmtN(pr.brezzels)} EUR</span>
                                  </div>
                                )}
                                {customs.map((c, ci) => {
                                  if (!(Number(c.revenue || 0) > 0)) return null;
                                  const cp = c.percentage || defPct;
                                  return (
                                    <div key={ci} className="flex justify-between text-muted-foreground">
                                      <span>{c.name} {cp ? `(${cp}%)` : ""}</span>
                                      <span className="tabular-nums">{fmtN(c.revenue)} {snapCurrency}</span>
                                    </div>
                                  );
                                })}
                                <div className="flex justify-between pt-1 mt-1 border-t border-border/30 text-foreground">
                                  <span className="text-muted-foreground">{lang === "en" ? "Total revenue" : "Gesamtumsatz Monat"}</span>
                                  <span className="tabular-nums font-semibold">{fmtN(gesamt)} {snapCurrency}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => downloadInvoicePdf(cn)}
                    className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Download className="h-4 w-4" />
                    {copy.downloadPdf}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </motion.div>

  );
}
