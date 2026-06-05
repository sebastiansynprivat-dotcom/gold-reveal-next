import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Save,
  Loader2,
  Star,
  Percent,
  Wallet,
  StickyNote,
  CheckCircle2,
  FileDown,
  Plus,
  Search,
  ChevronRight,
  TrendingUp,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  Users,
  Globe,
  User,
  FolderTree,
  Pencil,
  Tag,
  ChevronDown,
  Link2,
  ShieldCheck,
  Clock,
  Mail,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import CreditNoteForm from "@/components/CreditNoteForm";
import ModelGroupsPanel from "@/components/ModelGroupsPanel";
import { fetchFxRate } from "@/lib/fx";

// ─── Types ───
const extractDriveFolderId = (input: string): string => {
  if (!input) return "";
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input;
};

// ─── Referrer Tag combobox (free-text + suggestions from prior tags) ───
function ReferrerTagInput({
  value,
  onChange,
  suggestions,
  placeholder = "z.B. Instagram Anna",
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    return suggestions
      .filter((s) => s && (!q || s.toLowerCase().includes(q)) && s.toLowerCase() !== q)
      .slice(0, 8);
  }, [suggestions, value]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="bg-secondary/40 border-border/50 text-sm h-9 pl-8 pr-8"
        />
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-border/60 bg-popover/95 backdrop-blur-md shadow-lg overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-accent/15 hover:text-accent flex items-center gap-2"
                >
                  <Tag className="h-3 w-3 text-accent/70" />
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
interface ModelRow {
  id: string;
  name: string;
  username: string;
  address: string;
  revenue_percentage: number;
  revenue_percentage_fourbased?: number;
  revenue_percentage_maloum?: number;
  revenue_percentage_brezzels?: number;
  fourbased_payout_configured?: boolean;
  crypto_address: string;
  currency: string;
  contract_file_path: string;
  notes: string;
  drive_folder_id: string;
  model_language: string;
  model_agency: string;
  model_active: boolean;
  payment_method: string;
  bank_name: string;
  bank_iban: string;
  bank_bic: string;
  bank_account_holder: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  referrer_tag?: string;
  group_id?: string | null;
  commission_override?: number | null;
  referral_source?: string;
}

interface AccountRow {
  id: string;
  account_email: string;
  account_domain: string;
  account_password: string;
  platform: string;
  model_id: string | null;
  assigned_to: string | null;
  model_active: boolean;
  currency?: string;
}

interface ChatterProfile {
  user_id: string;
  group_name: string;
  account_email: string | null;
}

import { PLATFORMS as PLATFORM_DEFS, usePlatforms } from "@/lib/platforms";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AED"] as const;
const PLATFORMS_FALLBACK = PLATFORM_DEFS.map((p) => p.label);
const PLATFORM_DOMAINS: Record<string, string> = {
  "4Based": "4based.com",
  Maloum: "malum.com",
  Brezzels: "brezzels.com",
  
  Admireme: "admireme.com",
  VisitX: "visit-x.net",
  Slushy: "slushy.com",
};

// ─── Animated counter ───
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (start === target) {
      setValue(target);
      return;
    }
    const startTime = performance.now();
    let raf: number;
    const anim = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      // Keep 2-decimal precision so cents are preserved
      setValue(Math.round((start + (target - start) * eased) * 100) / 100);
      if (progress < 1) raf = requestAnimationFrame(anim);
    };
    raf = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function AnimatedGoldValue({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedCounter(value);
  return (
    <span className={className}>
      {animated.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {suffix}
    </span>
  );
}

// ─── Section wrapper ───
function Section({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card rounded-xl overflow-hidden group hover:gold-border-glow transition-shadow duration-500"
    >
      <div className="px-4 py-3 header-gradient-border flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-accent" />
        </div>
        <h2 className="text-sm font-semibold text-foreground tracking-wide">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}

const platformColors: Record<string, string> = {
  "4Based": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Maloum: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Brezzels: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  
  Admireme: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  VisitX: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Slushy: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

// ─── Main Component ───
export default function ModelDashboardTab() {
  // Reactive platform list — updates automatically when platforms are activated/deactivated in Setup
  const platformDefs = usePlatforms();
  const PLATFORMS = useMemo(
    () => (platformDefs.length > 0 ? platformDefs.map((p) => p.label) : PLATFORMS_FALLBACK),
    [platformDefs],
  );
  // Models
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [migratingLogins, setMigratingLogins] = useState(false);

  // Read ?model=<id> from URL once on mount to pre-select model card (used when returning from /admin/model/:id/view)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("model");
    if (m) setSelectedModelId(m);
  }, []);

  const runMigrateLogins = useCallback(async () => {
    if (migratingLogins) return;
    if (!confirm("Wirklich für alle Model-Logins neue clean Emails (<slug>@shex.app) + neue Passwörter generieren? Die Models müssen die neuen Zugangsdaten erhalten.")) return;
    setMigratingLogins(true);
    const t = toast.loading("Migriere Model-Logins…");
    try {
      const { data, error } = await supabase.functions.invoke("migrate-model-logins", { body: {} });
      if (error) throw error;
      const sum = (data as any)?.summary || {};
      toast.success(`Fertig: ${sum.migrated || 0} migriert, ${sum.skipped_already_clean || 0} bereits clean, ${sum.auth_error || 0} Fehler`, { id: t });
    } catch (e: any) {
      toast.error(e?.message || "Migration fehlgeschlagen", { id: t });
    } finally {
      setMigratingLogins(false);
    }
  }, [migratingLogins]);

  // Distinct referrer tags from existing models for autocomplete
  const referrerSuggestions = useMemo(
    () =>
      Array.from(
        new Set(models.map((m) => (m.referrer_tag || "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [models],
  );

  // Selected model form state
  const [modelForm, setModelForm] = useState<Partial<ModelRow>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Accounts for selected model
  const [modelAccounts, setModelAccounts] = useState<AccountRow[]>([]);

  // Shared account entry factory (simplified: only email/password/domain per platform)
  const emptyAccountEntries = () =>
    PLATFORMS.reduce(
      (acc, p) => ({
        ...acc,
        [p]: { selected: false, account_email: "", account_password: "", account_domain: PLATFORM_DOMAINS[p] || "" },
      }),
      {} as Record<
        string,
        { selected: boolean; account_email: string; account_password: string; account_domain: string }
      >,
    );

  // Create model dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [groupsPanelOpen, setGroupsPanelOpen] = useState(false);
  const [groupsList, setGroupsList] = useState<{ id: string; name: string; default_commission: number; referral_source: string }[]>([]);
  const loadGroups = useCallback(async () => {
    const { data } = await supabase.from("model_groups").select("id, name, default_commission, referral_source").order("name");
    setGroupsList((data as any) || []);
  }, []);
  const groupForModel = useCallback(
    (m: { group_id?: string | null; referrer_tag?: string | null }) => {
      if (m.group_id) {
        const g = groupsList.find((x) => x.id === m.group_id);
        if (g) return { name: g.name, auto: false };
      }
      const tag = (m.referrer_tag || "").trim().toLowerCase();
      if (tag) {
        const g = groupsList.find((x) => (x.referral_source || "").trim().toLowerCase() === tag);
        if (g) return { name: g.name, auto: true };
      }
      return null;
    },
    [groupsList],
  );
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);
  const [newModel, setNewModel] = useState({
    name: "",
    username: "",
    address: "",
    drive_folder_id: "",
    model_language: "de" as "de" | "en",
    model_agency: "shex" as "shex" | "syn",
    model_active: true,
    referrer_tag: "",
    group_id: "" as string,
    commission_override: "" as string,
    referral_source: "",
  });
  const [creating, setCreating] = useState(false);
  const [createAccounts, setCreateAccounts] = useState(emptyAccountEntries);

  // Add account dialog – multi-platform
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newAccounts, setNewAccounts] = useState(emptyAccountEntries);
  const [addingAccount, setAddingAccount] = useState(false);

  // Inline edit account
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountData, setEditAccountData] = useState({
    account_email: "",
    account_password: "",
    account_domain: "",
  });

  // Model login dialog
  const [modelLoginDialog, setModelLoginDialog] = useState(false);
  const [modelLoginLoading, setModelLoginLoading] = useState(false);
  const [modelLoginCreds, setModelLoginCreds] = useState<{ email: string; password: string } | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginsManagerOpen, setLoginsManagerOpen] = useState(false);
  const [currentModelLogin, setCurrentModelLogin] = useState<{ email: string; password: string } | null>(null);
  const [revealManagerPw, setRevealManagerPw] = useState(false);

  // Steckbrief / Model Profile
  const [modelProfile, setModelProfile] = useState<import("@/lib/modelProfilePdf").ModelProfileData | null>(null);
  const [filledProfileIds, setFilledProfileIds] = useState<Set<string>>(new Set());

  // Revenue from model_dashboard (per-platform)
  const [dashboardRevenues, setDashboardRevenues] = useState<Record<string, number>>({});
  const [platformRevenues, setPlatformRevenues] = useState<
    Record<string, { fourbased: number; maloum: number; brezzels: number }>
  >({});

  // ─── Revenue period filter (UI only, not yet wired to historical data) ───
  type RevenuePeriod = "today" | "yesterday" | "7d" | "30d" | "last_month" | "this_month";
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("this_month");
  const revenuePeriodLabels: Record<RevenuePeriod, string> = {
    today: "Heute",
    yesterday: "Gestern",
    "7d": "Letzte 7 Tage",
    "30d": "Letzte 30 Tage",
    last_month: "Letzter Monat",
    this_month: "Dieser Monat",
  };

  // ─── Billing month for "Anteil berechnen" (provider invoice basis) ───
  const [billingMonth, setBillingMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [shareCalculated, setShareCalculated] = useState(false);
  const [billingShare, setBillingShare] = useState(0);
  const [payoutRevenueForMonth, setPayoutRevenueForMonth] = useState<{ fourbased: number; maloum: number; brezzels: number } | null>(null);
  const [calcTrigger, setCalcTrigger] = useState(0);

  // ─── Revenue fetch (external backend) ───
  const now = new Date();
  const [fetchMonth, setFetchMonth] = useState<number>(now.getMonth() + 1);
  const [fetchYear, setFetchYear] = useState<number>(now.getFullYear());
  const [fetchingRevenue, setFetchingRevenue] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [lastFetchInfo, setLastFetchInfo] = useState<{ at: string | null; month: number | null; year: number | null }>({ at: null, month: null, year: null });

  // Per-platform revenue from payout_revenue for the selected fetch month/year
  const [fetchedPayoutRevenue, setFetchedPayoutRevenue] = useState<{
    fourbased: number | null;
    maloum: number | null;
    brezzels: number | null;
  } | null>(null);
  const [fetchRevenueTick, setFetchRevenueTick] = useState(0);
  // Per-platform errors from the last fetch (e.g. password incorrect)
  const [fetchErrors, setFetchErrors] = useState<Record<string, { code?: string; message: string }>>({});
  // Additional billing month panels (extra months the user wants to bill)
  type ExtraBilling = {
    uid: string;
    month: number;
    year: number;
    fetching: boolean;
    data: { fourbased: number | null; maloum: number | null; brezzels: number | null } | null;
    billedAt: string | null;
    billedNumber: string | null;
    errors: Record<string, { code?: string; message: string }>;
  };
  const [extraBillings, setExtraBillings] = useState<ExtraBilling[]>([]);
  // Billing history (payout_revenue rows for selected model)
  type BillingHistoryRow = {
    id: string;
    month: number;
    year: number;
    monthly_revenue: number | null;
    fourbased_revenue: number | null;
    maloum_revenue: number | null;
    brezzels_revenue: number | null;
    billed_at: string | null;
    billed_credit_note_number: string | null;
    billed_amount: number | null;
    billed_snapshot: any | null;
    last_fetched_at: string | null;
  };
  const [billingHistory, setBillingHistory] = useState<BillingHistoryRow[]>([]);
  const [billingHistoryTick, setBillingHistoryTick] = useState(0);
  const [historyDetailRow, setHistoryDetailRow] = useState<BillingHistoryRow | null>(null);


  // ─── Custom platforms (per-model, localStorage) ───
  type CustomPlatform = { id: string; name: string; revenue: number; percentage: number };
  const [customPlatforms, setCustomPlatforms] = useState<CustomPlatform[]>([]);
  // Load on model change
  useEffect(() => {
    if (!selectedModelId) { setCustomPlatforms([]); return; }
    try {
      const raw = localStorage.getItem(`model:${selectedModelId}:customPlatforms`);
      setCustomPlatforms(raw ? JSON.parse(raw) : []);
    } catch { setCustomPlatforms([]); }
  }, [selectedModelId]);
  // Persist
  useEffect(() => {
    if (!selectedModelId) return;
    try {
      localStorage.setItem(`model:${selectedModelId}:customPlatforms`, JSON.stringify(customPlatforms));
    } catch {}
  }, [customPlatforms, selectedModelId]);

  const detailRef = useRef<HTMLDivElement>(null);

  // ─── Load models ───
  const loadModels = useCallback(async () => {
    const { data } = await (supabase.from("models") as any).select("*").order("name");
    if (data) setModels(data as ModelRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // ─── Load accounts for selected model ───
  const loadModelAccounts = useCallback(async (modelId: string) => {
    const { data } = await supabase
      .from("accounts")
      .select(
        "id, account_email, account_domain, account_password, platform, model_id, assigned_to, model_active, currency" as any,
      )
      .eq("model_id", modelId)
      .order("platform");
    const accs = ((data as any as AccountRow[]) || []);
    setModelAccounts(accs);

    // Load the single model_dashboard row for this model (one row per model_id)
    const { data: dashRow } = await (supabase as any)
      .from("model_dashboard")
      .select("fourbased_revenue, maloum_revenue, brezzels_revenue, monthly_revenue, last_fetched_at, last_fetched_month, last_fetched_year")
      .eq("model_id", modelId)
      .maybeSingle();

    if (dashRow) {
      setLastFetchInfo({
        at: (dashRow as any).last_fetched_at || null,
        month: (dashRow as any).last_fetched_month || null,
        year: (dashRow as any).last_fetched_year || null,
      });
    } else {
      setLastFetchInfo({ at: null, month: null, year: null });
    }
    // dashboardRevenues / platformRevenues are now sourced from accounts_data
    // by the period-revenue effect below — do not seed from model_dashboard.
  }, []);

  // ─── Period revenue from accounts_data.total ───
  useEffect(() => {
    if (!selectedModelId || modelAccounts.length === 0) return;
    const accountIds = modelAccounts.map((a) => a.id);

    const today = new Date();
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    let from: Date, to: Date;
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    switch (revenuePeriod) {
      case "today": from = startOfDay(today); to = startOfDay(today); break;
      case "yesterday": {
        const y = startOfDay(today); y.setDate(y.getDate() - 1);
        from = y; to = y; break;
      }
      case "7d": {
        to = startOfDay(today);
        from = new Date(to); from.setDate(from.getDate() - 6);
        break;
      }
      case "30d": {
        to = startOfDay(today);
        from = new Date(to); from.setDate(from.getDate() - 29);
        break;
      }
      case "last_month": {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth(), 0);
        from = first; to = last; break;
      }
      case "this_month":
      default: {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = startOfDay(today);
        break;
      }
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("accounts_data")
        .select("account_id, total")
        .in("account_id", accountIds)
        .gte("date", fmt(from))
        .lte("date", fmt(to));
      if (cancelled) return;
      if (error) { console.error("accounts_data load failed", error); return; }
      const sums: Record<string, number> = {};
      for (const id of accountIds) sums[id] = 0;
      for (const r of (data || []) as Array<{ account_id: string; total: number | string }>) {
        sums[r.account_id] = (sums[r.account_id] || 0) + Number(r.total || 0);
      }
      setDashboardRevenues(sums);
      const platMap: Record<string, { fourbased: number; maloum: number; brezzels: number }> = {};
      for (const acc of modelAccounts) {
        const v = sums[acc.id] || 0;
        platMap[acc.id] = {
          fourbased: acc.platform === "4Based" ? v : 0,
          maloum: acc.platform === "Maloum" ? v : 0,
          brezzels: acc.platform === "Brezzels" ? v : 0,
        };
      }
      setPlatformRevenues(platMap);
    })();
    return () => { cancelled = true; };
  }, [selectedModelId, modelAccounts, revenuePeriod]);

  // ─── Query payout_revenue for the main (fetchMonth, fetchYear) ───
  useEffect(() => {
    if (!selectedModelId) {
      setFetchedPayoutRevenue(null);
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .from("payout_revenue")
        .select("fourbased_revenue, maloum_revenue, brezzels_revenue")
        .eq("model_id", selectedModelId)
        .eq("last_fetched_month", fetchMonth)
        .eq("last_fetched_year", fetchYear)
        .maybeSingle();
      if (error || !data) {
        setFetchedPayoutRevenue(null);
        return;
      }
      setFetchedPayoutRevenue({
        fourbased: Number((data as any).fourbased_revenue) || 0,
        maloum: Number((data as any).maloum_revenue) || 0,
        brezzels: Number((data as any).brezzels_revenue) || 0,
      });
    })();
  }, [selectedModelId, fetchMonth, fetchYear, fetchRevenueTick]);

  // ─── Load billing history for selected model ───
  useEffect(() => {
    if (!selectedModelId) { setBillingHistory([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("payout_revenue")
        .select("id, last_fetched_month, last_fetched_year, monthly_revenue, fourbased_revenue, maloum_revenue, brezzels_revenue, billed_at, billed_credit_note_number, billed_amount, billed_snapshot, last_fetched_at")
        .eq("model_id", selectedModelId)
        .order("last_fetched_year", { ascending: false })
        .order("last_fetched_month", { ascending: false });
      setBillingHistory(((data as any[]) || []).map((r) => ({
        id: r.id,
        month: r.last_fetched_month,
        year: r.last_fetched_year,
        monthly_revenue: r.monthly_revenue,
        fourbased_revenue: r.fourbased_revenue,
        maloum_revenue: r.maloum_revenue,
        brezzels_revenue: r.brezzels_revenue,
        billed_at: r.billed_at,
        billed_credit_note_number: r.billed_credit_note_number,
        billed_amount: r.billed_amount,
        billed_snapshot: r.billed_snapshot,
        last_fetched_at: r.last_fetched_at,
      })));

    })();
  }, [selectedModelId, fetchRevenueTick, billingHistoryTick]);

  // ─── Sync extra billings with payout_revenue (refetch their values) ───
  useEffect(() => {
    if (!selectedModelId || extraBillings.length === 0) return;
    (async () => {
      const updated = await Promise.all(extraBillings.map(async (eb) => {
        const { data } = await (supabase as any)
          .from("payout_revenue")
          .select("fourbased_revenue, maloum_revenue, brezzels_revenue, billed_at, billed_credit_note_number")
          .eq("model_id", selectedModelId)
          .eq("last_fetched_month", eb.month)
          .eq("last_fetched_year", eb.year)
          .maybeSingle();
        if (!data) return eb;
        return {
          ...eb,
          data: {
            fourbased: Number((data as any).fourbased_revenue) || 0,
            maloum: Number((data as any).maloum_revenue) || 0,
            brezzels: Number((data as any).brezzels_revenue) || 0,
          },
          billedAt: (data as any).billed_at || null,
          billedNumber: (data as any).billed_credit_note_number || null,
        };
      }));
      setExtraBillings(updated);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId, fetchRevenueTick, billingHistoryTick]);




  // ─── Load selected model data into form ───
  useEffect(() => {
    if (!selectedModelId) return;
    const model = models.find((m) => m.id === selectedModelId);
    if (model) {
      setModelForm({ ...model });
      loadModelAccounts(selectedModelId);
    }
  }, [selectedModelId, models, loadModelAccounts]);

  // Auto-load model login when selected model changes
  useEffect(() => {
    if (!selectedModelId) {
      setCurrentModelLogin(null);
      return;
    }
    supabase
      .from("model_users")
      .select("email, plaintext_password")
      .eq("model_id", selectedModelId)
      .maybeSingle()
      .then(({ data }) => {
        setCurrentModelLogin(
          data ? { email: (data as any).email || "", password: (data as any).plaintext_password || "" } : null,
        );
      });
  }, [selectedModelId]);

  // Load model profile (Steckbrief) for selected model
  useEffect(() => {
    if (!selectedModelId) {
      setModelProfile(null);
      return;
    }
    supabase
      .from("model_profiles" as any)
      .select("*")
      .eq("model_id", selectedModelId)
      .maybeSingle()
      .then(({ data }) => setModelProfile((data as any) || null));
  }, [selectedModelId]);

  // Load list of model_ids that have a profile (for the list badge)
  useEffect(() => {
    supabase
      .from("model_profiles" as any)
      .select("model_id")
      .then(({ data }) => {
        if (data) setFilledProfileIds(new Set((data as any[]).map((r) => r.model_id)));
      });
  }, [selectedModelId]);



  // ─── Filter models ───
  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    const q = searchQuery.toLowerCase();
    return models.filter((m) => m.name.toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q));
  }, [models, searchQuery]);

  // ─── Live FX rates: any per-account currency → model base currency ───
  const baseCurrency = modelForm.currency || "EUR";
  const [fxRates, setFxRates] = useState<Record<string, number>>({});

  // 4Based fetched revenue is always in USD regardless of the account's
  // configured currency. Use USD as the source currency for 4Based so that
  // conversion to the model's base currency (e.g. EUR) is applied correctly.
  // When base currency is USD, this becomes a no-op conversion.
  const getSourceCurrency = useCallback(
    (acc: AccountRow) =>
      acc.platform === "4Based" ? "USD" : acc.currency || baseCurrency,
    [baseCurrency],
  );

  useEffect(() => {
    const need = new Set<string>();
    modelAccounts.forEach((a) => {
      const c = (getSourceCurrency(a) || baseCurrency).trim();
      if (c && c !== baseCurrency) need.add(c);
    });
    need.forEach(async (c) => {
      const key = `${c}->${baseCurrency}`;
      if (fxRates[key]) return;
      const r = await fetchFxRate(c, baseCurrency);
      if (r) setFxRates((p) => ({ ...p, [key]: r }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelAccounts, baseCurrency]);

  const convertToBase = useCallback(
    (amount: number, fromCur?: string | null) => {
      const c = (fromCur || baseCurrency).trim();
      if (!c || c === baseCurrency) return amount;
      const rate = fxRates[`${c}->${baseCurrency}`];
      return rate ? amount * rate : amount;
    },
    [fxRates, baseCurrency],
  );

  // ─── Auto-compute "Gesamt Payouts" + billing share from fetched values ───
  useEffect(() => {
    if (!fetchedPayoutRevenue) {
      setShareCalculated(false);
      setBillingShare(0);
      setPayoutRevenueForMonth(null);
      return;
    }
    const fb = fetchedPayoutRevenue.fourbased ?? 0;
    const ml = fetchedPayoutRevenue.maloum ?? 0;
    const br = fetchedPayoutRevenue.brezzels ?? 0;
    const fallback = modelForm.revenue_percentage || 0;
    const pctFb = modelForm.revenue_percentage_fourbased || fallback;
    const pctMl = modelForm.revenue_percentage_maloum || fallback;
    const pctBr = modelForm.revenue_percentage_brezzels || fallback;
    const customsTotal = customPlatforms.reduce((s, cp) => {
      const pct = cp.percentage > 0 ? cp.percentage : fallback;
      return s + (cp.revenue || 0) * pct / 100;
    }, 0);
    const fbInBase = convertToBase(fb, "USD");
    const calculatedRaw = (fbInBase * pctFb) / 100 + (ml * pctMl) / 100 + (br * pctBr) / 100 + customsTotal;
    const calculated = Math.round(calculatedRaw * 100) / 100;
    setBillingShare(calculated);
    setPayoutRevenueForMonth({ fourbased: fb, maloum: ml, brezzels: br });
    setShareCalculated(true);

    const startD = new Date(fetchYear, fetchMonth - 1, 1);
    const endD = new Date(fetchYear, fetchMonth, 0);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    setModelForm((prev: any) => ({
      ...prev,
      invoice_net_amount: calculated,
      invoice_description: prev.invoice_description || "Creator revenue share for digital content",
      invoice_currency: prev.currency || "EUR",
      invoice_service_period_start: fmt(startD),
      invoice_service_period_end: fmt(endD),
    }));
  }, [fetchedPayoutRevenue, modelForm.revenue_percentage, modelForm.revenue_percentage_fourbased, modelForm.revenue_percentage_maloum, modelForm.revenue_percentage_brezzels, customPlatforms, convertToBase, fetchYear, fetchMonth]);


  // ─── Per-model platform revenue (for selected model) — converted to base currency ───
  const selectedModelPlatformRevenue = useMemo(() => {
    if (!selectedModelId || modelAccounts.length === 0) return [];
    const platformMap: Record<string, { fourbased: number; maloum: number; brezzels: number; total: number }> = {};
    for (const acc of modelAccounts) {
      const pr = platformRevenues[acc.id];
      const rev = dashboardRevenues[acc.id] || 0;
      const accCur = getSourceCurrency(acc);
      if (!platformMap[acc.platform]) platformMap[acc.platform] = { fourbased: 0, maloum: 0, brezzels: 0, total: 0 };
      if (pr) {
        // fourbased fetched values are always in USD
        platformMap[acc.platform].fourbased += convertToBase(pr.fourbased, "USD");
        platformMap[acc.platform].maloum += convertToBase(pr.maloum, acc.currency || baseCurrency);
        platformMap[acc.platform].brezzels += convertToBase(pr.brezzels, acc.currency || baseCurrency);
      }
      platformMap[acc.platform].total += convertToBase(rev, accCur);
    }
    return Object.entries(platformMap).map(([platform, data]) => ({ platform, ...data }));
  }, [selectedModelId, modelAccounts, platformRevenues, dashboardRevenues, convertToBase, baseCurrency, getSourceCurrency]);

  const totalRevenue = useMemo(() => {
    return modelAccounts.reduce(
      (sum, acc) => sum + convertToBase(dashboardRevenues[acc.id] || 0, getSourceCurrency(acc)),
      0,
    );
  }, [modelAccounts, dashboardRevenues, convertToBase, getSourceCurrency]);

  const verdienst = useMemo(() => {
    const fallback = modelForm.revenue_percentage || 0;
    const pctFb = modelForm.revenue_percentage_fourbased || fallback;
    const pctMl = modelForm.revenue_percentage_maloum || fallback;
    const pctBr = modelForm.revenue_percentage_brezzels || fallback;
    // Only use fetched/calculated payout revenue (never the live manual dashboard input).
    const source = payoutRevenueForMonth ?? (fetchedPayoutRevenue
      ? {
          fourbased: fetchedPayoutRevenue.fourbased ?? 0,
          maloum: fetchedPayoutRevenue.maloum ?? 0,
          brezzels: fetchedPayoutRevenue.brezzels ?? 0,
        }
      : null);
    let sum = 0;
    if (source) {
      // 4Based revenue is in USD — convert to base currency
      sum += convertToBase(source.fourbased || 0, "USD") * pctFb / 100;
      sum += (source.maloum || 0) * pctMl / 100;
      sum += (source.brezzels || 0) * pctBr / 100;
    }
    for (const cp of customPlatforms) {
      const pct = cp.percentage > 0 ? cp.percentage : fallback;
      sum += (cp.revenue || 0) * pct / 100;
    }
    return Math.round(sum * 100) / 100;
  }, [payoutRevenueForMonth, fetchedPayoutRevenue, customPlatforms, modelForm.revenue_percentage, modelForm.revenue_percentage_fourbased, modelForm.revenue_percentage_maloum, modelForm.revenue_percentage_brezzels, convertToBase]);

  // ─── Create model ───
  const handleCreateModel = async () => {
    if (!newModel.name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const { data: modelData, error } = await (supabase.from("models") as any)
      .insert({
        name: newModel.name,
        username: newModel.username,
        address: newModel.address,
        drive_folder_id: extractDriveFolderId(newModel.drive_folder_id),
        model_language: newModel.model_language,
        model_agency: newModel.model_agency,
        model_active: newModel.model_active,
        referrer_tag: newModel.referrer_tag.trim(),
        group_id: newModel.group_id || null,
        commission_override:
          newModel.commission_override === "" ? null : Number(newModel.commission_override),
        referral_source: (newModel.referral_source || "").trim(),
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }

    // Create selected platform accounts – model-level fields applied to all
    const selected = Object.entries(createAccounts).filter(([, v]) => v.selected);
    for (const [platform, entry] of selected) {
      await (supabase.from("accounts") as any).insert({
        platform,
        account_email: entry.account_email,
        account_password: entry.account_password,
        account_domain: entry.account_domain,
        drive_folder_id: extractDriveFolderId(newModel.drive_folder_id),
        model_language: newModel.model_language,
        model_agency: newModel.model_agency,
        model_active: newModel.model_active,
        model_id: modelData.id,
        created_by: userId,
      });
    }

    toast.success(
      `Model erstellt${selected.length > 0 ? ` mit ${selected.length} Account${selected.length > 1 ? "s" : ""}` : ""} ✅`,
    );
    setNewModel({
      name: "",
      username: "",
      address: "",
      drive_folder_id: "",
      model_language: "de",
      model_agency: "shex",
      model_active: true,
      referrer_tag: "",
      group_id: "",
      commission_override: "",
      referral_source: "",
    });
    setCreateAccounts(emptyAccountEntries());
    setCreateDialogOpen(false);
    await loadModels();
    if (modelData?.id) {
      setSelectedModelId(modelData.id);
    }
    setCreating(false);
  };

  // ─── Save model ───
  const saveModel = async () => {
    if (!selectedModelId) return;
    setSaving(true);
    const { error } = await (supabase.from("models") as any)
      .update({
        name: modelForm.name,
        username: modelForm.username,
        address: modelForm.address,
        revenue_percentage: modelForm.revenue_percentage,
        revenue_percentage_fourbased: modelForm.revenue_percentage_fourbased || 0,
        revenue_percentage_maloum: modelForm.revenue_percentage_maloum || 0,
        revenue_percentage_brezzels: modelForm.revenue_percentage_brezzels || 0,
        fourbased_payout_configured: !!modelForm.fourbased_payout_configured,
        crypto_address: modelForm.crypto_address,
        currency: modelForm.currency,
        notes: modelForm.notes,
        contract_file_path: modelForm.contract_file_path,
        drive_folder_id: extractDriveFolderId(modelForm.drive_folder_id || ""),
        model_language: modelForm.model_language,
        model_agency: modelForm.model_agency,
        model_active: modelForm.model_active,
        payment_method: modelForm.payment_method || "crypto",
        bank_name: modelForm.bank_name || "",
        bank_iban: modelForm.bank_iban || "",
        bank_bic: modelForm.bank_bic || "",
        bank_account_holder: modelForm.bank_account_holder || "",
        referrer_tag: (modelForm.referrer_tag || "").trim(),
        group_id: (modelForm as any).group_id || null,
        commission_override:
          (modelForm as any).commission_override === "" || (modelForm as any).commission_override == null
            ? null
            : Number((modelForm as any).commission_override),
        referral_source: ((modelForm as any).referral_source || "").trim(),
      })
      .eq("id", selectedModelId);
    // Also update all accounts with model-level fields
    if (!error && modelAccounts.length > 0) {
      await (supabase.from("accounts") as any)
        .update({
          drive_folder_id: extractDriveFolderId(modelForm.drive_folder_id || ""),
          model_language: modelForm.model_language,
          model_agency: modelForm.model_agency,
          model_active: modelForm.model_active,
        })
        .eq("model_id", selectedModelId);
    }
    if (error) toast.error(error.message);
    else {
      toast.success("Gespeichert ✅");
      await loadModels();
    }
    setSaving(false);
  };

  // ─── Contract upload ───
  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedModelId) return;
    setUploading(true);
    const path = `${selectedModelId}/${file.name}`;
    if (modelForm.contract_file_path) {
      await supabase.storage.from("model-contracts").remove([modelForm.contract_file_path]);
    }
    const { error } = await supabase.storage.from("model-contracts").upload(path, file, { upsert: true });
    if (error) toast.error("Upload fehlgeschlagen: " + error.message);
    else {
      setModelForm((prev) => ({ ...prev, contract_file_path: path }));
      toast.success("Vertrag hochgeladen ✅");
    }
    setUploading(false);
    e.target.value = "";
  };

  const deleteContract = async () => {
    if (!modelForm.contract_file_path) return;
    await supabase.storage.from("model-contracts").remove([modelForm.contract_file_path]);
    setModelForm((prev) => ({ ...prev, contract_file_path: "" }));
    toast.success("Vertrag gelöscht");
  };

  const downloadContract = async () => {
    if (!modelForm.contract_file_path) return;
    const { data } = await supabase.storage.from("model-contracts").createSignedUrl(modelForm.contract_file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // ─── Add platform account ───
  const handleAddAccount = async () => {
    if (!selectedModelId) return;
    const selected = Object.entries(newAccounts).filter(([, v]) => v.selected);
    if (selected.length === 0) {
      toast.error("Wähle mindestens eine Plattform");
      return;
    }
    setAddingAccount(true);
    const { data: userData } = await supabase.auth.getUser();
    let errors = 0;
    for (const [platform, entry] of selected) {
      const { error } = await (supabase.from("accounts") as any).insert({
        platform,
        account_email: entry.account_email,
        account_password: entry.account_password,
        account_domain: entry.account_domain,
        drive_folder_id: extractDriveFolderId(modelForm.drive_folder_id || ""),
        model_language: modelForm.model_language || "de",
        model_agency: modelForm.model_agency || "shex",
        model_active: modelForm.model_active !== false,
        model_id: selectedModelId,
        created_by: userData.user?.id,
      });
      if (error) {
        errors++;
        toast.error(`${platform}: ${error.message}`);
      }
    }
    if (errors === 0) {
      toast.success(`${selected.length} Account${selected.length > 1 ? "s" : ""} hinzugefügt ✅`);
      setNewAccounts(emptyAccountEntries());
      setAddAccountOpen(false);
      await loadModelAccounts(selectedModelId);
    }
    setAddingAccount(false);
  };

  // ─── Delete platform account ───
  const deleteAccount = async (accountId: string) => {
    const { error } = await supabase.from("accounts").delete().eq("id", accountId);
    if (error) toast.error(error.message);
    else {
      toast.success("Account gelöscht");
      if (selectedModelId) await loadModelAccounts(selectedModelId);
    }
  };
  // ─── Start editing account ───
  const startEditAccount = (acc: AccountRow) => {
    setEditingAccountId(acc.id);
    setEditAccountData({
      account_email: acc.account_email,
      account_password: acc.account_password,
      account_domain: acc.account_domain,
    });
  };

  // ─── Save edited account ───
  const saveEditAccount = async () => {
    if (!editingAccountId) return;
    const { error } = await supabase
      .from("accounts")
      .update({
        account_email: editAccountData.account_email,
        account_password: editAccountData.account_password,
        account_domain: editAccountData.account_domain,
      } as any)
      .eq("id", editingAccountId);
    if (error) toast.error(error.message);
    else {
      toast.success("Account aktualisiert ✅");
      setEditingAccountId(null);
      if (selectedModelId) await loadModelAccounts(selectedModelId);
    }
  };

  // ─── Model login (one per model, all platforms) ───
  const callLoginEndpoint = async (modelId: string, action?: "reset" | "delete") => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-model-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ model_id: modelId, ...(action ? { action } : {}) }),
    });
    return { ok: res.ok, data: await res.json() };
  };

  const generateModelLogin = async () => {
    if (!selectedModelId) return;
    setModelLoginLoading(true);
    try {
      const { ok, data } = await callLoginEndpoint(selectedModelId);
      if (!ok) toast.error(data.error || "Fehler");
      else {
        setModelLoginCreds({ email: data.email, password: data.password });
        setModelLoginDialog(true);
        toast.success("Login erstellt ✅");
        await loadModelLogin();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setModelLoginLoading(false);
  };

  const resetModelLogin = async () => {
    if (!selectedModelId) return;
    if (!confirm("Passwort wirklich zurücksetzen? Das alte wird ungültig.")) return;
    setModelLoginLoading(true);
    try {
      const { ok, data } = await callLoginEndpoint(selectedModelId, "reset");
      if (!ok) toast.error(data.error || "Fehler");
      else {
        setModelLoginCreds({ email: data.email, password: data.password });
        setModelLoginDialog(true);
        toast.success("Passwort zurückgesetzt ✅");
        await loadModelLogin();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setModelLoginLoading(false);
  };

  const deleteModelLogin = async () => {
    if (!selectedModelId) return;
    if (!confirm("Login wirklich löschen? Das Model kann sich danach nicht mehr einloggen.")) return;
    try {
      const { ok, data } = await callLoginEndpoint(selectedModelId, "delete");
      if (!ok) toast.error(data.error || "Fehler");
      else {
        toast.success("Login gelöscht");
        await loadModelLogin();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadModelLogin = useCallback(async () => {
    if (!selectedModelId) {
      setCurrentModelLogin(null);
      return;
    }
    const { data } = await supabase
      .from("model_users")
      .select("email, plaintext_password")
      .eq("model_id", selectedModelId)
      .maybeSingle();
    setCurrentModelLogin(data ? { email: (data as any).email || "", password: (data as any).plaintext_password || "" } : null);
  }, [selectedModelId]);



  // ─── Delete model ───
  const deleteModel = async () => {
    if (!selectedModelId) return;
    // First unlink accounts
    await (supabase.from("accounts") as any).update({ model_id: null }).eq("model_id", selectedModelId);
    const { error } = await (supabase.from("models") as any).delete().eq("id", selectedModelId);
    if (error) toast.error(error.message);
    else {
      // toast.success("Model gelöscht");
      setSelectedModelId("");
      await loadModels();
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Group accounts by platform
  const accountsByPlatform = useMemo(() => {
    const grouped: Record<string, AccountRow[]> = {};
    for (const acc of modelAccounts) {
      if (!grouped[acc.platform]) grouped[acc.platform] = [];
      grouped[acc.platform].push(acc);
    }
    return grouped;
  }, [modelAccounts]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center gold-glow shrink-0">
          <FolderTree className="h-4.5 w-4.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gold-gradient-shimmer tracking-wide">Model-Verwaltung</h1>
          <p className="text-xs text-muted-foreground">{models.length} Models registriert</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setGroupsPanelOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 border-accent/30 text-accent hover:bg-accent/10 flex-1 sm:flex-none"
          >
            <Tag className="h-3.5 w-3.5" />
            Gruppen
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="sm"
            className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground gold-glow flex-1 sm:flex-none"
          >
            <Plus className="h-3.5 w-3.5" />
            Model anlegen
          </Button>
        </div>
      </motion.div>

      {/* ── Search ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <div className="input-gold-shimmer rounded-lg">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Model suchen…"
              className="pl-9 bg-secondary/50 border-transparent text-sm h-9"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Model-Liste ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="px-4 py-3 header-gradient-border flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground tracking-wide">Alle Models</h2>
          <Badge variant="outline" className="ml-auto text-[10px] border-accent/30 text-accent tabular-nums">
            {filteredModels.length}
          </Badge>
        </div>

        <div className="overflow-x-auto scrollbar-none">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_80px] gap-0 bg-accent/10 border-b border-accent/20 sticky top-0 z-10 backdrop-blur-md">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold">Name</div>
            <div className="px-2 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">
              Benutzername
            </div>
            <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-right">
              Anteil
            </div>
          </div>

          {/* Rows */}
          <ScrollArea className="h-[60vh] max-h-[600px]">
            {filteredModels.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {models.length === 0 ? "Noch keine Models angelegt." : "Keine Models gefunden."}
              </p>
            ) : (
              filteredModels.map((model, i) => {
                const isSelected = model.id === selectedModelId;
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      setSelectedModelId(model.id);
                      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                    }}
                    className={cn(
                      "grid grid-cols-[1fr_100px_80px] gap-0 items-center border-b border-border/30 cursor-pointer transition-colors",
                      isSelected
                        ? "bg-accent/15 border-l-2 border-l-accent"
                        : i % 2 === 0
                          ? "bg-card/40 hover:bg-accent/5"
                          : "bg-card/20 hover:bg-accent/5",
                    )}
                  >
                    <div className="px-3 py-2.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            filledProfileIds.has(model.id)
                              ? "bg-emerald-400 shadow-[0_0_6px_hsl(142_76%_60%)]"
                              : "bg-muted-foreground/30",
                          )}
                          title={filledProfileIds.has(model.id) ? "Steckbrief ausgefüllt" : "Steckbrief leer"}
                        />
                        <p className={cn("text-xs font-medium truncate", isSelected ? "text-accent" : "text-foreground")}>
                          {model.name || "Unbenannt"}
                        </p>
                        {(() => {
                          const g = groupForModel(model);
                          if (!g) return null;
                          return (
                            <span
                              className="text-[9px] px-1.5 py-[1px] rounded border border-accent/40 text-accent shrink-0 bg-accent/5"
                              title={g.auto ? "Per Referrer-Tag automatisch erkannt" : "Gruppe zugeordnet"}
                            >
                              {g.name}{g.auto ? " · Auto" : ""}
                            </span>
                          );
                        })()}
                      </div>
                      {model.address && <p className="text-[10px] text-muted-foreground truncate">{model.address}</p>}
                    </div>
                    <div className="px-2 py-2 text-center">
                      <span className="text-[11px] text-muted-foreground">{model.username || "–"}</span>
                    </div>
                    <div className="px-1 py-2 text-right pr-3">
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {model.revenue_percentage}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>

          <div className="px-3 py-1.5 bg-secondary/20 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground">{filteredModels.length} Models</span>
          </div>
        </div>
      </motion.section>

      {/* ── Detail View (Stammbaum) ── */}
      <AnimatePresence mode="wait">
        {selectedModelId && selectedModel && (
          <motion.div
            ref={detailRef}
            key={selectedModelId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Model header */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center text-sm font-bold text-accent gold-glow">
                {selectedModel.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedModel.name}</p>
                  {(() => {
                    const g = groupForModel(selectedModel as any);
                    if (!g) return null;
                    return (
                      <span
                        className="text-[10px] px-2 py-[2px] rounded-full border border-accent/40 text-accent bg-accent/10"
                        title={g.auto ? "Per Referrer-Tag automatisch erkannt" : "Gruppe zugeordnet"}
                      >
                        Gruppe: {g.name}{g.auto ? " · Auto" : ""}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedModel.username && `@${selectedModel.username} · `}
                  {modelAccounts.length} Plattform-Account{modelAccounts.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    setRevealManagerPw(false);
                    setLoginsManagerOpen(true);
                  }}
                  className="text-xs gap-1.5 font-semibold bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-[0_0_12px_-2px_hsl(var(--accent)/0.6)] hover:shadow-[0_0_18px_-2px_hsl(var(--accent)/0.85)] hover:scale-[1.02] transition-all"
                >
                  <KeyRound className="h-3 w-3" />
                  Model-Login
                  {currentModelLogin && (
                    <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_hsl(142_76%_60%)]" />
                  )}
                </Button>
                {modelAccounts.length < PLATFORMS.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddAccountOpen(true)}
                    className="text-xs gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
                  >
                    <Plus className="h-3 w-3" />
                    Account
                  </Button>
                )}
              </div>
            </div>

            {/* ── Steckbrief / Model Profile ── */}
            <Section icon={User} title="Steckbrief" delay={0.03}>
              {(() => {
                const profile = modelProfile;
                const filledFields = profile
                  ? Object.entries(profile).filter(([k, v]) =>
                      ["name","age","city","place_of_birth","favorite_color","favorite_movie","favorite_food","favorite_music","occupation","hobbies","dream","work","education","languages","special_marks","natural_hair","shoe_size","bra_size","height","weight","content_preferences","no_gos","additional_info"].includes(k) && (v as string)?.trim?.()
                    ).length
                  : 0;
                const totalFields = 23;
                const isFilled = filledFields > 0;
                const submittedAt = (profile as any)?.submitted_at as string | null | undefined;
                const confirmedAt = (profile as any)?.confirmed_at as string | null | undefined;
                const status: "confirmed" | "pending" | "draft" | "empty" = confirmedAt
                  ? "confirmed"
                  : submittedAt
                    ? "pending"
                    : isFilled
                      ? "draft"
                      : "empty";
                const username = selectedModel?.username?.trim() || "";
                const personalizedUrl = username
                  ? `${window.location.origin}/m/${username}`
                  : "";

                const confirmProfile = async () => {
                  if (!profile || !selectedModelId) return;
                  const { data: u } = await supabase.auth.getUser();
                  const { error } = await (supabase.from("model_profiles" as any) as any)
                    .update({ confirmed_at: new Date().toISOString(), confirmed_by: u?.user?.id })
                    .eq("model_id", selectedModelId);
                  if (error) {
                    toast.error("Bestätigung fehlgeschlagen");
                    return;
                  }
                  setModelProfile({ ...(profile as any), confirmed_at: new Date().toISOString(), confirmed_by: u?.user?.id } as any);
                  toast.success("Steckbrief bestätigt — jetzt im Chatter-Dashboard sichtbar");
                };

                const revokeConfirmation = async () => {
                  if (!profile || !selectedModelId) return;
                  const { error } = await (supabase.from("model_profiles" as any) as any)
                    .update({ confirmed_at: null, confirmed_by: null })
                    .eq("model_id", selectedModelId);
                  if (error) {
                    toast.error("Reset fehlgeschlagen");
                    return;
                  }
                  setModelProfile({ ...(profile as any), confirmed_at: null, confirmed_by: null } as any);
                  toast.success("Bestätigung zurückgezogen");
                };

                return (
                  <div className="space-y-3">
                    {/* Status + counter */}
                    <div className="flex flex-wrap items-center gap-2">
                      {status === "confirmed" && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="h-3 w-3" /> Bestätigt
                        </span>
                      )}
                      {status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="h-3 w-3" /> Prüfung läuft
                        </span>
                      )}
                      {status === "draft" && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          <Pencil className="h-3 w-3" /> Entwurf
                        </span>
                      )}
                      {status === "empty" && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                          Noch nicht ausgefüllt
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">
                        {filledFields}/{totalFields} Felder
                      </Badge>
                    </div>

                    {/* Personalized URL */}
                    {personalizedUrl ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-background/40 border border-border/30">
                        <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Persönliche Login-URL</p>
                          <p className="text-xs font-mono text-foreground truncate">{personalizedUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(personalizedUrl);
                            toast.success("Link kopiert");
                          }}
                          className="shrink-0 text-muted-foreground hover:text-accent"
                          title="Link kopieren"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={personalizedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-accent"
                          title="Link öffnen"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-400/80 italic">
                        Kein Username gesetzt — bitte oben in den Stammdaten ergänzen, damit die persönliche URL generiert werden kann.
                      </p>
                    )}

                    {/* Filled preview */}
                    {isFilled && (profile?.name || profile?.age || profile?.city) && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        {profile?.name && (
                          <div className="glass-card-subtle rounded-lg px-2.5 py-1.5">
                            <p className="text-muted-foreground text-[9px] uppercase">Name</p>
                            <p className="text-foreground truncate">{profile.name}</p>
                          </div>
                        )}
                        {profile?.age && (
                          <div className="glass-card-subtle rounded-lg px-2.5 py-1.5">
                            <p className="text-muted-foreground text-[9px] uppercase">Alter</p>
                            <p className="text-foreground truncate">{profile.age}</p>
                          </div>
                        )}
                        {profile?.city && (
                          <div className="glass-card-subtle rounded-lg px-2.5 py-1.5">
                            <p className="text-muted-foreground text-[9px] uppercase">Stadt</p>
                            <p className="text-foreground truncate">{profile.city}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/admin/model/${selectedModelId}/view?return_model=${selectedModelId}`, "_blank")}
                        className="text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
                      >
                        <Eye className="h-3 w-3" />
                        Als Model ansehen
                      </Button>
                      {status === "pending" && (
                        <Button
                          size="sm"
                          onClick={confirmProfile}
                          className="text-xs gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_12px_-2px_hsl(142_76%_45%/0.6)] hover:scale-[1.02] transition-all"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Steckbrief bestätigen
                        </Button>
                      )}
                      {status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={revokeConfirmation}
                          className="text-xs gap-1.5 border-border/50 text-muted-foreground hover:text-foreground"
                        >
                          Bestätigung zurückziehen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={!isFilled}
                        onClick={async () => {
                          const { downloadModelProfilePdf } = await import("@/lib/modelProfilePdf");
                          await downloadModelProfilePdf(profile!, selectedModel!.name, "de");
                          toast.success("Steckbrief PDF (DE) wird heruntergeladen");
                        }}
                        className="text-xs gap-1.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-[0_0_12px_-2px_hsl(var(--accent)/0.5)] hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        <FileDown className="h-3 w-3" />
                        PDF · Deutsch
                      </Button>
                      <Button
                        size="sm"
                        disabled={!isFilled}
                        variant="outline"
                        onClick={async () => {
                          const { downloadModelProfilePdf } = await import("@/lib/modelProfilePdf");
                          await downloadModelProfilePdf(profile!, selectedModel!.name, "en");
                          toast.success("Profile PDF (EN) is downloading");
                        }}
                        className="text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-50"
                      >
                        <FileDown className="h-3 w-3" />
                        PDF · English
                      </Button>
                    </div>
                    {status === "empty" && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Das Model hat den Steckbrief noch nicht im Model-Dashboard ausgefüllt.
                      </p>
                    )}
                  </div>
                );
              })()}
            </Section>


            {/* ── Revenue per Platform ── */}
            {modelAccounts.length > 0 && (
              <Section icon={TrendingUp} title="Einnahmen" delay={0.05}>
                <div className="space-y-3">
                  {/* Period filter pills (UI scaffold — not yet wired to historical data) */}
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(revenuePeriodLabels) as RevenuePeriod[]).map((p) => {
                      const active = revenuePeriod === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRevenuePeriod(p)}
                          className={cn(
                            "text-[10px] px-2.5 py-1 rounded-full border transition-all tabular-nums",
                            active
                              ? "bg-accent/15 text-accent border-accent/40 shadow-sm"
                              : "bg-secondary/30 text-muted-foreground border-border/30 hover:text-foreground hover:border-accent/20",
                          )}
                        >
                          {revenuePeriodLabels[p]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Hero total */}
                  <div className="relative gold-gradient-border-animated pulse-glow rounded-xl p-5 text-center">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/8 via-transparent to-accent/5 pointer-events-none" />
                    <div className="relative">
                      <p className="text-[10px] text-muted-foreground mb-1 tracking-widest uppercase">
                        Gesamtumsatz · {revenuePeriodLabels[revenuePeriod]}
                      </p>

                      <p className="text-3xl font-extrabold text-gold-gradient-shimmer tracking-tight tabular-nums">
                        <AnimatedGoldValue value={totalRevenue} suffix={` ${modelForm.currency || "EUR"}`} />
                      </p>
                      {verdienst > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Verdienst ({modelForm.revenue_percentage}%):{" "}
                          <span className="text-accent font-semibold">
                            {verdienst.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                            {modelForm.currency || "EUR"}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Platform cards with editable revenue */}
                  <div className="space-y-2">
                    {modelAccounts.map((acc) => {
                      const pr = platformRevenues[acc.id] || { fourbased: 0, maloum: 0, brezzels: 0 };
                      const rev = dashboardRevenues[acc.id] || 0;
                      const colorMap: Record<string, string> = {
                        "4Based": "#22d3ee",
                        Maloum: "#d4af37",
                        Brezzels: "#3b82f6",
                        
                        Admireme: "#ec4899",
                        VisitX: "#0ea5e9",
                        Slushy: "#8b5cf6",
                      };
                      // Map platform to the correct revenue field
                      const platformFieldMap: Record<string, string> = {
                        "4Based": "fourbased_revenue",
                        Maloum: "maloum_revenue",
                        Brezzels: "brezzels_revenue",
                      };
                      const revenueField = platformFieldMap[acc.platform] || "monthly_revenue";

                      // 4Based fetched revenue is always USD; override display source currency
                      const accCurrency = acc.platform === "4Based"
                        ? "USD"
                        : (acc.currency || modelForm.currency || "EUR");
                      const isCustomCur = !CURRENCIES.includes(accCurrency as any);

                      return (
                        <div key={acc.id} className="glass-card-subtle rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: colorMap[acc.platform] || "#888" }}
                              />
                              <p className="text-xs font-medium text-foreground">{acc.platform}</p>
                              <Badge variant="outline" className={cn("text-[9px]", platformColors[acc.platform])}>
                                {acc.account_email || acc.account_domain}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-foreground tabular-nums">
                                {rev > 0
                                  ? `${rev.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${accCurrency}`
                                  : "–"}
                              </p>
                              {rev > 0 && accCurrency !== baseCurrency && (
                                <p className="text-[10px] text-accent/80 tabular-nums">
                                  ≈ {convertToBase(rev, accCurrency).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}
                                  {fxRates[`${accCurrency}->${baseCurrency}`] ? (
                                    <span className="text-muted-foreground ml-1">
                                      (1 {accCurrency} = {fxRates[`${accCurrency}->${baseCurrency}`].toFixed(4)} {baseCurrency})
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground ml-1">(Kurs lädt…)</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Per-platform currency */}
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={isCustomCur ? "__custom__" : accCurrency}
                              onValueChange={async (v) => {
                                let newCur = v;
                                if (v === "__custom__") newCur = "";
                                setModelAccounts((prev) =>
                                  prev.map((a) => (a.id === acc.id ? { ...a, currency: newCur } : a)),
                                );
                                if (v !== "__custom__") {
                                  await supabase
                                    .from("accounts")
                                    .update({ currency: newCur } as any)
                                    .eq("id", acc.id);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[90px] h-8 text-xs">
                                <SelectValue placeholder="Währung" />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCIES.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                                <SelectItem value="__custom__">Custom…</SelectItem>
                              </SelectContent>
                            </Select>
                            {isCustomCur && (
                              <Input
                                value={accCurrency === "EUR" ? "" : accCurrency}
                                onChange={(e) => {
                                  const v = e.target.value.toUpperCase().slice(0, 6);
                                  setModelAccounts((prev) =>
                                    prev.map((a) => (a.id === acc.id ? { ...a, currency: v } : a)),
                                  );
                                }}
                                onBlur={async (e) => {
                                  const v = e.target.value.toUpperCase().slice(0, 6);
                                  await supabase
                                    .from("accounts")
                                    .update({ currency: v } as any)
                                    .eq("id", acc.id);
                                }}
                                placeholder="USDT"
                                className="w-[80px] h-8 text-xs font-mono uppercase"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Section>
            )}

            {/* ── Ebene 1: Model-Stammdaten ── */}
            <Section icon={User} title="Model-Stammdaten" delay={0}>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={modelForm.name || ""}
                        onChange={(e) => setModelForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="bg-secondary/40 border-transparent text-sm h-9"
                        placeholder="z.B. Alina"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Benutzername</Label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={modelForm.username || ""}
                        onChange={(e) => setModelForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="bg-secondary/40 border-transparent text-sm h-9"
                        placeholder="z.B. alina_official"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Anschrift</Label>
                  <div className="input-gold-shimmer rounded-lg">
                    <Textarea
                      value={modelForm.address || ""}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="bg-secondary/40 border-transparent text-sm min-h-[60px]"
                      placeholder="Straße, PLZ, Ort, Land"
                    />
                  </div>
                </div>

                {/* Model-level settings */}
                <div className="border-t border-border/30 pt-3 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Einstellungen
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Drive Folder ID</Label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={modelForm.drive_folder_id || ""}
                        onChange={(e) => setModelForm((prev) => ({ ...prev, drive_folder_id: e.target.value }))}
                        placeholder="Google Drive URL oder Folder ID"
                        className="bg-secondary/40 border-transparent text-sm h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Referrer Tag</Label>
                    <ReferrerTagInput
                      value={modelForm.referrer_tag || ""}
                      onChange={(v) => setModelForm((prev) => ({ ...prev, referrer_tag: v }))}
                      suggestions={referrerSuggestions}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Gruppe</Label>
                      <Select
                        value={(modelForm as any).group_id || "__none__"}
                        onValueChange={(v) =>
                          setModelForm((prev) => ({ ...(prev as any), group_id: v === "__none__" ? null : v }))
                        }
                      >
                        <SelectTrigger className="h-9 bg-secondary/40 border-border/50 text-sm">
                          <SelectValue placeholder="Keine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Keine Gruppe</SelectItem>
                          {groupsList.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name} ({g.default_commission}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Override %</Label>
                      <Input
                        type="number"
                        value={(modelForm as any).commission_override ?? ""}
                        onChange={(e) =>
                          setModelForm((prev) => ({
                            ...(prev as any),
                            commission_override: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                        placeholder="Default Gruppe"
                        className="h-9 bg-secondary/40 border-border/50 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Sprache</Label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setModelForm((prev) => ({ ...prev, model_language: "de" }))}
                          className={cn(
                            "flex-1 text-xs px-2 py-2 rounded-lg border transition-all",
                            (modelForm.model_language || "de") === "de"
                              ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                              : "bg-secondary/30 text-muted-foreground border-border/50 hover:border-accent/30",
                          )}
                        >
                          🇩🇪 DE
                        </button>
                        <button
                          onClick={() => setModelForm((prev) => ({ ...prev, model_language: "en" }))}
                          className={cn(
                            "flex-1 text-xs px-2 py-2 rounded-lg border transition-all",
                            modelForm.model_language === "en"
                              ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                              : "bg-secondary/30 text-muted-foreground border-border/50 hover:border-accent/30",
                          )}
                        >
                          🇬🇧 EN
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Agentur</Label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setModelForm((prev) => ({ ...prev, model_agency: "shex" }))}
                          className={cn(
                            "flex-1 text-xs px-2 py-2 rounded-lg border transition-all",
                            (modelForm.model_agency || "shex") === "shex"
                              ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                              : "bg-secondary/30 text-muted-foreground border-border/50 hover:border-accent/30",
                          )}
                        >
                          SheX
                        </button>
                        <button
                          onClick={() => setModelForm((prev) => ({ ...prev, model_agency: "syn" }))}
                          className={cn(
                            "flex-1 text-xs px-2 py-2 rounded-lg border transition-all",
                            modelForm.model_agency === "syn"
                              ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                              : "bg-secondary/30 text-muted-foreground border-border/50 hover:border-accent/30",
                          )}
                        >
                          SYN
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">Model aktiv</span>
                    <Switch
                      checked={modelForm.model_active !== false}
                      onCheckedChange={(checked) => setModelForm((prev) => ({ ...prev, model_active: checked }))}
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Revenue & Payout ── */}
            <Section icon={TrendingUp} title="Einnahmen & Anteil" delay={0.05}>
              <div className="space-y-4">
                {/* ── 4Based Auszahlungen hinterlegt? (nur sichtbar wenn Model 4Based Account hat) ── */}
                {modelAccounts.some((a) => a.platform === "4Based") && (
                  <div
                    className={cn(
                      "rounded-xl border p-3 flex items-center justify-between gap-3 transition-colors",
                      modelForm.fourbased_payout_configured
                        ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                        : "border-amber-500/40 bg-amber-500/[0.06]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4 shrink-0",
                          modelForm.fourbased_payout_configured ? "text-emerald-400" : "text-amber-400/70"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          4Based Auszahlungen hinterlegt
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {modelForm.fourbased_payout_configured
                            ? "Auszahlungsdaten sind im 4Based Account konfiguriert."
                            : "Noch nicht hinterlegt — bitte im 4Based Account prüfen."}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={!!modelForm.fourbased_payout_configured}
                      onCheckedChange={async (checked) => {
                        if (!selectedModelId) return;
                        const prev = !!modelForm.fourbased_payout_configured;
                        setModelForm((f: any) => ({ ...f, fourbased_payout_configured: checked }));
                        const { error } = await (supabase.from("models") as any)
                          .update({ fourbased_payout_configured: checked })
                          .eq("id", selectedModelId);
                        if (error) {
                          setModelForm((f: any) => ({ ...f, fourbased_payout_configured: prev }));
                          toast.error("Konnte Status nicht speichern");
                        } else {
                          toast.success(checked ? "Als hinterlegt markiert" : "Als offen markiert");
                        }
                      }}
                    />
                  </div>
                )}

                {/* ── Umsatz abrufen (externes Backend) ── */}
                <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/[0.06] to-accent/[0.02] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-accent/90 font-semibold">
                      Umsatz abrufen
                    </p>
                    {lastFetchInfo.at && (
                      <span className="text-[9px] text-muted-foreground">
                        Zuletzt: {new Date(lastFetchInfo.at).toLocaleString("de-DE")}
                        {lastFetchInfo.month && lastFetchInfo.year
                          ? ` · ${String(lastFetchInfo.month).padStart(2, "0")}/${lastFetchInfo.year}`
                          : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(fetchMonth)} onValueChange={(v) => setFetchMonth(Number(v))}>
                      <SelectTrigger className="w-[130px] h-9 text-sm bg-secondary/40 border-border/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"].map((label, i) => (
                          <SelectItem key={i+1} value={String(i+1)}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(fetchYear)} onValueChange={(v) => setFetchYear(Number(v))}>
                      <SelectTrigger className="w-[90px] h-9 text-sm bg-secondary/40 border-border/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={fetchingRevenue || !selectedModelId}
                      className="flex-1 h-9 px-3 bg-gradient-to-r from-accent/90 to-accent text-accent-foreground hover:from-accent hover:to-accent/90 shadow-sm"
                      onClick={async () => {
                        if (!selectedModelId) return;
                        if (!confirmOverwrite) {
                          const sameMonth =
                            lastFetchInfo.month === fetchMonth && lastFetchInfo.year === fetchYear;
                          if (sameMonth) {
                            if (!confirm(`Werte für ${String(fetchMonth).padStart(2,"0")}/${fetchYear} bereits vorhanden. Überschreiben?`)) return;
                            setConfirmOverwrite(true);
                          }
                        }
                        setFetchingRevenue(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("fetch-model-revenue", {
                            body: { model_id: selectedModelId, month: fetchMonth, year: fetchYear },
                          });
                          if (error) throw error;
                          if ((data as any)?.error) throw new Error((data as any).error);
                          const errs = ((data as any)?.errors ?? []) as Array<{ platform?: string; accountId?: string; code?: string; message?: string }>;
                          const errMap: Record<string, { code?: string; message: string }> = {};
                          for (const e of errs) {
                            if (e.platform) errMap[e.platform] = { code: e.code, message: e.message || "Unbekannter Fehler" };
                          }
                          setFetchErrors(errMap);
                          if (errs.length > 0) {
                            toast.error(`Umsatz teilweise abgerufen — ${errs.length} Fehler`, {
                              description: errs.map(e => `${e.platform ?? "?"}: ${e.message ?? "Unbekannter Fehler"}`).join("\n"),
                              duration: 10000,
                              style: { whiteSpace: "pre-line" },
                            });
                          } else {
                            toast.success(`Umsatz für ${String(fetchMonth).padStart(2,"0")}/${fetchYear} aktualisiert ✅`);
                          }
                          await loadModelAccounts(selectedModelId);
                          setLastFetchInfo({ at: new Date().toISOString(), month: fetchMonth, year: fetchYear });
                          setFetchRevenueTick(t => t + 1);
                        } catch (err: any) {
                          toast.error(err.message || "Umsatz konnte nicht abgerufen werden");
                        } finally {
                          setFetchingRevenue(false);
                          setConfirmOverwrite(false);
                        }
                      }}
                    >
                      {fetchingRevenue ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Lädt…</>
                      ) : (
                        <><Download className="h-3.5 w-3.5 mr-1.5" /> Fetch Revenue</>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-accent/10">
                    {[
                      { label: "4Based", key: "fourbased" as const, color: "text-blue-400" },
                      { label: "Maloum", key: "maloum" as const, color: "text-purple-400" },
                      { label: "Brezzels", key: "brezzels" as const, color: "text-orange-400" },
                    ].map((p) => {
                      const val = fetchedPayoutRevenue?.[p.key];
                      const hasRow = fetchedPayoutRevenue !== null;
                      return (
                        <div key={p.key} className="text-center">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{p.label}</p>
                          <p className={cn("text-sm font-bold tabular-nums", hasRow ? p.color : "text-muted-foreground/50")}>
                            {hasRow
                              ? `${(val ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                              : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gesamt Payouts — auto-summed from fetched per-platform values */}
                {fetchedPayoutRevenue && (() => {
                  const fb = fetchedPayoutRevenue.fourbased ?? 0;
                  const ml = fetchedPayoutRevenue.maloum ?? 0;
                  const br = fetchedPayoutRevenue.brezzels ?? 0;
                  const fbInBase = convertToBase(fb, "USD");
                  const totalPayouts = fbInBase + ml + br;
                  const startD = new Date(fetchYear, fetchMonth - 1, 1);
                  const monthFmt = (d: Date) =>
                    d.toLocaleDateString("de-DE", { month: "short", year: "numeric" });
                  const rangeLabel = monthFmt(startD);
                  return (
                    <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Gesamt Payouts
                        </p>
                        <span className="text-[9px] text-muted-foreground/70">{rangeLabel}</span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1 border-t border-accent/10">
                        <span className="text-[10px] text-muted-foreground">Summe (in {baseCurrency})</span>
                        <span className="text-xl font-bold text-gold-gradient tabular-nums">
                          {totalPayouts.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                          {baseCurrency}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Weitere Monate abrechnen ── */}
                <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Weitere Monate abrechnen
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-accent hover:text-accent hover:bg-accent/10"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - (extraBillings.length + 1));
                        setExtraBillings((prev) => [
                          ...prev,
                          {
                            uid: crypto.randomUUID(),
                            month: d.getMonth() + 1,
                            year: d.getFullYear(),
                            fetching: false,
                            data: null,
                            billedAt: null,
                            billedNumber: null,
                            errors: {},
                          },
                        ]);
                      }}
                    >
                      + Monat hinzufügen
                    </Button>
                  </div>
                  {extraBillings.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/70 italic">
                      Klicke „+ Monat hinzufügen", um einen weiteren Monat abzurufen und abzurechnen.
                    </p>
                  )}
                  {extraBillings.map((eb, idx) => {
                    const total = eb.data
                      ? convertToBase(eb.data.fourbased ?? 0, "USD") + (eb.data.maloum ?? 0) + (eb.data.brezzels ?? 0)
                      : 0;
                    const monthLabel = new Date(eb.year, eb.month - 1, 1)
                      .toLocaleDateString("de-DE", { month: "short", year: "numeric" });
                    return (
                      <div key={eb.uid} className="rounded-lg border border-accent/20 bg-accent/[0.04] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-accent/90 font-semibold">
                            {monthLabel}
                          </span>
                          <div className="flex items-center gap-2">
                            {eb.billedAt && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                                Abgerechnet{eb.billedNumber ? ` · ${eb.billedNumber}` : ""}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setExtraBillings((prev) => prev.filter((x) => x.uid !== eb.uid))}
                              className="text-muted-foreground hover:text-destructive text-[11px]"
                            >
                              Entfernen
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={String(eb.month)}
                            onValueChange={(v) => setExtraBillings((prev) => prev.map((x) => x.uid === eb.uid ? { ...x, month: Number(v), data: null, billedAt: null, billedNumber: null } : x))}
                          >
                            <SelectTrigger className="w-[130px] h-9 text-sm bg-secondary/40 border-border/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"].map((label, i) => (
                                <SelectItem key={i+1} value={String(i+1)}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={String(eb.year)}
                            onValueChange={(v) => setExtraBillings((prev) => prev.map((x) => x.uid === eb.uid ? { ...x, year: Number(v), data: null, billedAt: null, billedNumber: null } : x))}
                          >
                            <SelectTrigger className="w-[90px] h-9 text-sm bg-secondary/40 border-border/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            disabled={eb.fetching || !selectedModelId}
                            className="flex-1 h-9 px-3 bg-gradient-to-r from-accent/90 to-accent text-accent-foreground hover:from-accent hover:to-accent/90 shadow-sm"
                            onClick={async () => {
                              if (!selectedModelId) return;
                              setExtraBillings((prev) => prev.map((x) => x.uid === eb.uid ? { ...x, fetching: true } : x));
                              try {
                                const { data, error } = await supabase.functions.invoke("fetch-model-revenue", {
                                  body: { model_id: selectedModelId, month: eb.month, year: eb.year },
                                });
                                if (error) throw error;
                                if ((data as any)?.error) throw new Error((data as any).error);
                                const errs = ((data as any)?.errors ?? []) as Array<{ platform?: string; code?: string; message?: string }>;
                                const errMap: Record<string, { code?: string; message: string }> = {};
                                for (const e of errs) {
                                  if (e.platform) errMap[e.platform] = { code: e.code, message: e.message || "Unbekannter Fehler" };
                                }
                                if (errs.length > 0) {
                                  toast.error(`${monthLabel}: ${errs.length} Fehler`, {
                                    description: errs.map(e => `${e.platform ?? "?"}: ${e.message ?? "Unbekannter Fehler"}`).join("\n"),
                                    duration: 10000,
                                    style: { whiteSpace: "pre-line" },
                                  });
                                } else {
                                  toast.success(`Umsatz für ${monthLabel} gespeichert ✅`);
                                }
                                setExtraBillings((prev) => prev.map((x) => x.uid === eb.uid ? { ...x, errors: errMap } : x));
                                setFetchRevenueTick((t) => t + 1);
                              } catch (err: any) {
                                toast.error(err.message || "Umsatz konnte nicht abgerufen werden");
                              } finally {
                                setExtraBillings((prev) => prev.map((x) => x.uid === eb.uid ? { ...x, fetching: false } : x));
                              }
                            }}
                          >
                            {eb.fetching ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Lädt…</>
                            ) : (
                              <><Download className="h-3.5 w-3.5 mr-1.5" /> Fetch</>
                            )}
                          </Button>
                        </div>
                        {eb.data && (
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-accent/10">
                            {[
                              { label: "4Based", key: "fourbased" as const, color: "text-blue-400" },
                              { label: "Maloum", key: "maloum" as const, color: "text-purple-400" },
                              { label: "Brezzels", key: "brezzels" as const, color: "text-orange-400" },
                            ].map((p) => (
                              <div key={p.key} className="text-center">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{p.label}</p>
                                <p className={cn("text-sm font-bold tabular-nums", p.color)}>
                                  {(eb.data?.[p.key] ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {eb.data && (
                          <div className="flex items-baseline justify-between pt-1 border-t border-accent/10">
                            <span className="text-[10px] text-muted-foreground">Summe</span>
                            <span className="text-sm font-bold text-gold-gradient tabular-nums">
                              {total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Abrechnungsverlauf ── */}
                {billingHistory.length > 0 && (
                  <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Abrechnungs-Verlauf
                      </p>
                      <span className="text-[9px] text-muted-foreground/70">
                        {billingHistory.filter((r) => r.billed_at).length} / {billingHistory.length} abgerechnet
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                      {billingHistory.map((r) => {
                        const monthLabel = new Date(r.year, r.month - 1, 1)
                          .toLocaleDateString("de-DE", { month: "short", year: "numeric" });
                        const isBilled = !!r.billed_at;
                        return (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => setHistoryDetailRow(r)}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 border text-[11px] transition-all hover:scale-[1.01] active:scale-[0.99] text-left",
                              isBilled
                                ? "border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]"
                                : "border-border/40 bg-background/30 hover:bg-background/50",
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-foreground tabular-nums">{monthLabel}</span>
                              {isBilled ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-semibold">
                                  Abgerechnet
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-semibold">
                                  Offen
                                </span>
                              )}
                              {r.billed_credit_note_number && (
                                <span className="text-muted-foreground truncate">{r.billed_credit_note_number}</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-foreground font-bold tabular-nums">
                                {(r.billed_amount ?? r.monthly_revenue ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {(r.billed_snapshot as any)?.invoice_currency || modelForm.currency || "EUR"}
                              </div>
                              {isBilled && r.billed_at && (
                                <div className="text-[9px] text-muted-foreground">
                                  {new Date(r.billed_at).toLocaleDateString("de-DE")}
                                </div>
                              )}
                            </div>
                          </button>

                        );
                      })}
                    </div>
                  </div>
                )}


                <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/15 bg-accent/[0.02] px-3 py-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Währung</span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={CURRENCIES.includes((modelForm.currency || "EUR") as any) ? (modelForm.currency || "EUR") : "__custom__"}
                      onValueChange={(v) => {
                        if (v === "__custom__") {
                          setModelForm((prev) => ({ ...prev, currency: prev.currency && !CURRENCIES.includes(prev.currency as any) ? prev.currency : "" }));
                        } else {
                          setModelForm((prev) => ({ ...prev, currency: v }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-[110px] text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        <SelectItem value="__custom__">Custom…</SelectItem>
                      </SelectContent>
                    </Select>
                    {!CURRENCIES.includes((modelForm.currency || "EUR") as any) && (
                      <Input
                        value={modelForm.currency || ""}
                        onChange={(e) =>
                          setModelForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase().slice(0, 6) }))
                        }
                        placeholder="z.B. USDT"
                        className="w-[110px] text-sm h-9 font-mono uppercase"
                      />
                    )}
                  </div>
                </div>

                {/* Calculated share from payout_revenue (result of "Anteil berechnen") */}
                {shareCalculated && billingShare > 0 && (
                  <div className="text-center py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Gesamtanteil</p>
                    <p className="text-4xl font-black text-gold-gradient tabular-nums">
                      <AnimatedGoldValue value={billingShare} suffix={` ${modelForm.currency || "EUR"}`} />
                    </p>
                  </div>
                )}

                {/* Standard percentage slider (fallback) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Standard Revenue-Anteil:</span>
                    <div className="gold-gradient-border-animated rounded-lg px-3 py-1">
                      <span className="text-sm font-bold text-gold-gradient tabular-nums">
                        {modelForm.revenue_percentage || 0}%
                      </span>
                    </div>
                  </div>
                  <Slider
                    value={[modelForm.revenue_percentage || 0]}
                    onValueChange={([v]) => setModelForm((prev) => ({ ...prev, revenue_percentage: v }))}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Wird verwendet, wenn der Plattform-spezifische Wert auf 0 steht.
                  </p>
                </div>

                {/* Per-platform custom percentages */}
                {(() => {
                  const fallback = modelForm.revenue_percentage || 0;
                  const fetchedTotals = fetchedPayoutRevenue
                    ? {
                        fourbased: fetchedPayoutRevenue.fourbased ?? 0,
                        maloum: fetchedPayoutRevenue.maloum ?? 0,
                        brezzels: fetchedPayoutRevenue.brezzels ?? 0,
                      }
                    : null;
                  const totals = payoutRevenueForMonth ?? fetchedTotals ?? { fourbased: 0, maloum: 0, brezzels: 0 };
                  const allRows: Array<{ key: "fourbased" | "maloum" | "brezzels"; label: string; platform: string; rev: number; pctField: keyof ModelRow }> = [
                    { key: "fourbased", label: "4Based", platform: "4Based", rev: totals.fourbased, pctField: "revenue_percentage_fourbased" },
                    { key: "maloum", label: "Maloum", platform: "Maloum", rev: totals.maloum, pctField: "revenue_percentage_maloum" },
                    { key: "brezzels", label: "Brezzels", platform: "Brezzels", rev: totals.brezzels, pctField: "revenue_percentage_brezzels" },
                  ];
                  // Only show platforms the model actually has configured
                  const modelPlatformSet = new Set(modelAccounts.map((a) => a.platform));
                  const rows = allRows.filter((r) => modelPlatformSet.has(r.platform));
                  return (
                    <div className="space-y-3 rounded-xl border border-accent/15 bg-accent/[0.02] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Custom % pro Plattform
                      </p>
                      {rows.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/70 italic">
                          Keine Plattformen beim Model hinterlegt.
                        </p>
                      )}
                      {rows.map((r) => {
                        const pct = (modelForm[r.pctField] as number) || 0;
                        const usingFallback = pct === 0;
                        const effective = usingFallback ? fallback : pct;
                        const isFourbased = r.key === "fourbased";
                        const sourceCur = isFourbased ? "USD" : baseCurrency;
                        const revInBase = isFourbased ? convertToBase(r.rev, "USD") : r.rev;
                        const earn = (revInBase * effective) / 100;
                        const showConversion = isFourbased && sourceCur !== baseCurrency;
                        const platErr = fetchErrors[r.platform];
                        const isAuthErr = !!platErr && /pass|auth|login|credential|401|403|invalid/i.test(`${platErr.code || ""} ${platErr.message || ""}`);
                        return (
                          <div key={r.key} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-foreground shrink-0 flex items-center gap-1.5 flex-wrap">
                                {r.label}
                                {isAuthErr && (
                                  <span
                                    title={platErr.message}
                                    className="inline-flex items-center rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                                  >
                                    Passwort falsch
                                  </span>
                                )}
                              </span>
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                <Slider
                                  value={[pct]}
                                  onValueChange={([v]) =>
                                    setModelForm((prev) => ({ ...prev, [r.pctField]: v }))
                                  }
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-xs font-bold text-gold-gradient tabular-nums w-10 text-right">
                                  {pct}%
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center pl-[4.5rem] text-[10px] text-muted-foreground tabular-nums">
                              <span>
                                Umsatz: {r.rev.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {sourceCur}
                                {showConversion && (
                                  <span className="ml-1 text-accent/70">
                                    ≈ {revInBase.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}
                                  </span>
                                )}
                                {usingFallback && pct === 0 && fallback > 0 && (
                                  <span className="ml-1 text-accent/70">(Standard {fallback}%)</span>
                                )}
                              </span>
                              <span className="text-accent/80">
                                → {earn.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}
                              </span>
                            </div>
                            {/* Manual override for fetched payout revenue */}
                            <div className="flex items-center gap-2 pl-[4.5rem]">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
                                Manuell überschreiben:
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                placeholder={`${r.rev.toFixed(2)} ${sourceCur}`}
                                defaultValue=""
                                key={`${r.key}-${fetchMonth}-${fetchYear}-${r.rev}`}
                                className="bg-secondary/40 border-transparent text-[11px] h-7 tabular-nums max-w-[140px]"
                                onBlur={async (e) => {
                                  if (!selectedModelId) return;
                                  const raw = (e.target as HTMLInputElement).value.replace(",", ".").trim();
                                  if (raw === "") return;
                                  const newVal = Math.round((Number(raw) || 0) * 100) / 100;
                                  if (newVal === r.rev) return;
                                  const { data: existing } = await (supabase as any)
                                    .from("payout_revenue")
                                    .select("id, fourbased_revenue, maloum_revenue, brezzels_revenue")
                                    .eq("model_id", selectedModelId)
                                    .eq("last_fetched_month", fetchMonth)
                                    .eq("last_fetched_year", fetchYear)
                                    .maybeSingle();
                                  const fb = r.key === "fourbased" ? newVal : Number(existing?.fourbased_revenue) || 0;
                                  const ml = r.key === "maloum" ? newVal : Number(existing?.maloum_revenue) || 0;
                                  const br = r.key === "brezzels" ? newVal : Number(existing?.brezzels_revenue) || 0;
                                  const payload: Record<string, any> = {
                                    model_id: selectedModelId,
                                    last_fetched_month: fetchMonth,
                                    last_fetched_year: fetchYear,
                                    fourbased_revenue: fb,
                                    maloum_revenue: ml,
                                    brezzels_revenue: br,
                                    monthly_revenue: fb + ml + br,
                                    last_fetched_at: new Date().toISOString(),
                                  };
                                  const { error } = existing
                                    ? await (supabase as any).from("payout_revenue").update(payload).eq("id", existing.id)
                                    : await (supabase as any).from("payout_revenue").insert(payload);
                                  if (error) {
                                    toast.error("Override fehlgeschlagen: " + error.message);
                                    return;
                                  }
                                  toast.success(`${r.label}: Umsatz manuell überschrieben ✅`);
                                  (e.target as HTMLInputElement).value = "";
                                  setFetchRevenueTick((t) => t + 1);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                              />
                            </div>
                            {platErr && !isAuthErr && (
                              <div className="pl-[4.5rem] text-[10px] text-destructive/80">
                                ⚠ {platErr.message}
                              </div>
                            )}
                          </div>
                        );
                      })}


                      {/* Custom platforms */}
                      {customPlatforms.length > 0 && (
                        <div className="pt-2 border-t border-accent/10 space-y-3">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                            Eigene Plattformen
                          </p>
                          {customPlatforms.map((cp) => {
                            const effectivePct = cp.percentage > 0 ? cp.percentage : fallback;
                            const rev = Number(cp.revenue) || 0;
                            const earn = (rev * effectivePct) / 100;
                            return (
                              <div key={cp.id} className="space-y-2 rounded-lg bg-secondary/20 p-2.5 border border-border/30">
                                {/* Row 1: Name + delete */}
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={cp.name}
                                    onChange={(e) =>
                                      setCustomPlatforms((prev) =>
                                        prev.map((p) => (p.id === cp.id ? { ...p, name: e.target.value } : p)),
                                      )
                                    }
                                    placeholder="Plattform-Name"
                                    className="flex-1 h-8 text-xs bg-secondary/40 border-border/50"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      setCustomPlatforms((prev) => prev.filter((p) => p.id !== cp.id))
                                    }
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                {/* Row 2: Revenue with currency suffix */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">Umsatz</span>
                                  <div className="relative flex-1">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={cp.revenue === 0 ? "" : String(cp.revenue)}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
                                        const n = raw === "" ? 0 : Number(raw);
                                        setCustomPlatforms((prev) =>
                                          prev.map((p) =>
                                            p.id === cp.id ? { ...p, revenue: isNaN(n) ? 0 : n } : p,
                                          ),
                                        );
                                      }}
                                      placeholder="0,00"
                                      className="h-8 text-xs bg-secondary/40 border-border/50 tabular-nums pr-12"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground pointer-events-none">
                                      {baseCurrency}
                                    </span>
                                  </div>
                                </div>
                                {/* Row 3: Percentage slider */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">Prozent</span>
                                  <Slider
                                    value={[cp.percentage]}
                                    onValueChange={([v]) =>
                                      setCustomPlatforms((prev) =>
                                        prev.map((p) => (p.id === cp.id ? { ...p, percentage: v } : p)),
                                      )
                                    }
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="flex-1"
                                  />
                                  <span className="text-xs font-bold text-gold-gradient tabular-nums w-10 text-right">
                                    {cp.percentage}%
                                  </span>
                                </div>
                                {/* Footer: Earnings */}
                                <div className="flex justify-between items-center pt-1.5 border-t border-border/30 text-[10px] tabular-nums">
                                  <span className="text-muted-foreground">
                                    {rev.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}
                                    {cp.percentage === 0 && fallback > 0 && (
                                      <span className="ml-1 text-accent/70">(Standard {fallback}%)</span>
                                    )}
                                  </span>
                                  <span className="text-accent font-semibold">
                                    → {earn.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseCurrency}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setCustomPlatforms((prev) => [
                            ...prev,
                            {
                              id: (typeof crypto !== "undefined" && (crypto as any).randomUUID)
                                ? (crypto as any).randomUUID()
                                : `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                              name: "",
                              revenue: 0,
                              percentage: 0,
                            },
                          ])
                        }
                        className="w-full gap-1.5 text-xs border-accent/30 text-accent hover:bg-accent/10"
                      >
                        <Plus className="h-3 w-3" />
                        Custom Plattform hinzufügen
                      </Button>
                    </div>
                  );
                })()}

                {/* Verdienst */}
                {verdienst > 0 && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Verdienst Model (gewichtet pro Plattform)
                    </p>
                    <p className="text-2xl font-bold text-accent tabular-nums">
                      <AnimatedGoldValue value={verdienst} suffix={` ${modelForm.currency || "EUR"}`} />
                    </p>
                  </div>
                )}
              </div>
            </Section>

            {/* ── Vertrag ── */}
            <Section icon={FileText} title="Vertrag Upload" delay={0.1}>
              <div className="space-y-3">
                {modelForm.contract_file_path ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1 font-medium">
                      {modelForm.contract_file_path.split("/").pop()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-accent"
                      onClick={downloadContract}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={deleteContract}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Noch kein Vertrag hochgeladen.</p>
                )}
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <Upload className="h-4 w-4 text-accent" />
                  )}
                  <span className="text-xs font-medium text-accent">
                    {uploading ? "Wird hochgeladen…" : "PDF hochladen"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleContractUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </Section>

            {/* ── Ebene 2: Plattform-Accounts (Stammbaum) ── */}
            <Section icon={Globe} title="Plattform-Accounts" delay={0.15}>
              <div className="space-y-3">
                {modelAccounts.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground mb-3">Noch keine Plattform-Accounts verknüpft.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(accountsByPlatform).map(([platform, accs]) => (
                      <AccordionItem
                        key={platform}
                        value={platform}
                        className="border border-border/40 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-accent/5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "text-[10px] font-medium px-2.5 py-0.5 rounded-full border",
                                platformColors[platform] || "bg-secondary/50 text-muted-foreground border-border/30",
                              )}
                            >
                              {platform}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {accs.length} Account{accs.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3 space-y-2">
                          {accs.map((acc) => {
                            const isEditing = editingAccountId === acc.id;
                            return (
                              <div
                                key={acc.id}
                                className="rounded-lg border border-border/30 bg-secondary/20 p-3 space-y-2"
                              >
                                {isEditing ? (
                                  /* ── Inline Edit Mode ── */
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">E-Mail / Login</Label>
                                        <Input
                                          value={editAccountData.account_email}
                                          onChange={(e) =>
                                            setEditAccountData((prev) => ({ ...prev, account_email: e.target.value }))
                                          }
                                          className="bg-secondary/40 border-border/50 text-xs h-8"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Passwort</Label>
                                        <Input
                                          value={editAccountData.account_password}
                                          onChange={(e) =>
                                            setEditAccountData((prev) => ({
                                              ...prev,
                                              account_password: e.target.value,
                                            }))
                                          }
                                          className="bg-secondary/40 border-border/50 text-xs h-8"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">Domain</Label>
                                      <Input
                                        value={editAccountData.account_domain}
                                        onChange={(e) =>
                                          setEditAccountData((prev) => ({ ...prev, account_domain: e.target.value }))
                                        }
                                        className="bg-secondary/40 border-border/50 text-xs h-8"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={saveEditAccount}
                                        className="h-7 text-[10px] gap-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                                      >
                                        <Save className="h-3 w-3" />
                                        Speichern
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingAccountId(null)}
                                        className="h-7 text-[10px]"
                                      >
                                        Abbrechen
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* ── View Mode ── */
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center gap-1.5 group/email">
                                          <p className="text-xs font-medium text-foreground truncate">
                                            {acc.account_email || "–"}
                                          </p>
                                          {acc.account_email && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(acc.account_email);
                                                toast.success("E-Mail kopiert");
                                              }}
                                              className="opacity-0 group-hover/email:opacity-100 transition-opacity"
                                            >
                                              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                          )}
                                        </div>
                                        {acc.account_domain && (
                                          <p className="text-[10px] text-muted-foreground truncate">
                                            {acc.account_domain}
                                          </p>
                                        )}
                                        {acc.account_password && (
                                          <div className="flex items-center gap-1.5 group/pw">
                                            <p className="text-[10px] text-muted-foreground font-mono">
                                              PW: {acc.account_password}
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(acc.account_password);
                                                toast.success("Passwort kopiert");
                                              }}
                                              className="opacity-0 group-hover/pw:opacity-100 transition-opacity"
                                            >
                                              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                          </div>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60 font-mono">
                                          ID: {acc.id.slice(0, 8)}…
                                        </p>
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEditAccount(acc)}
                                          className="h-7 text-[10px] gap-1 text-foreground hover:bg-accent/10"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => deleteAccount(acc.id)}
                                          className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    {/* Ebene 3: Chatter assigned */}
                                    <div className="border-t border-border/30 pt-2">
                                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                        Zugewiesener Chatter
                                      </p>
                                      {acc.assigned_to ? (
                                        <div className="flex items-center gap-2">
                                          <div className="h-5 w-5 rounded-full bg-accent/15 flex items-center justify-center">
                                            <User className="h-3 w-3 text-accent" />
                                          </div>
                                          <span className="text-xs text-foreground font-mono">
                                            {acc.assigned_to.slice(0, 8)}…
                                          </span>
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-muted-foreground/60 italic">
                                          Kein Chatter zugewiesen
                                        </p>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}

                {/* Add more accounts button – only if platforms available */}
                {modelAccounts.length < PLATFORMS.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddAccountOpen(true)}
                    className="w-full gap-1.5 text-xs border-accent/30 text-accent hover:bg-accent/10"
                  >
                    <Plus className="h-3 w-3" />
                    Plattform-Account hinzufügen
                  </Button>
                )}
              </div>
            </Section>

            {/* ── Auszahlung ── */}
            <Section icon={Wallet} title="Auszahlung" delay={0.2}>
              <div className="space-y-4">
                {/* Payment method toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Auszahlungsmethode</Label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setModelForm((prev) => ({ ...prev, payment_method: "crypto" }))}
                      className={cn(
                        "flex-1 text-xs px-3 py-2.5 rounded-lg border transition-all font-medium",
                        (modelForm.payment_method || "crypto") === "crypto"
                          ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                          : "bg-secondary/30 text-muted-foreground border-border/50 hover:border-accent/30",
                      )}
                    >
                      💰 Crypto
                    </button>
                    <button
                      onClick={() => setModelForm((prev) => ({ ...prev, payment_method: "bank" }))}
                      className={cn(
                        "flex-1 text-xs px-3 py-2.5 rounded-lg border transition-all font-medium",
                        modelForm.payment_method === "bank"
                          ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                          : "bg-secondary/30 text-muted-foreground border-border/50 hover:border-accent/30",
                      )}
                    >
                      🏦 Bank
                    </button>
                  </div>
                </div>

                {/* Crypto fields */}
                {(modelForm.payment_method || "crypto") === "crypto" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Crypto-Infos (Adresse, Coin, Netzwerk…)</Label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Textarea
                        value={modelForm.crypto_address || ""}
                        onChange={(e) => setModelForm((prev) => ({ ...prev, crypto_address: e.target.value }))}
                        placeholder="z.B. USDT TRC20 – TXyz…&#10;Netzwerk: Tron"
                        className="bg-secondary/40 border-transparent text-sm min-h-[80px]"
                      />
                    </div>
                  </div>
                )}

                {/* Bank fields */}
                {modelForm.payment_method === "bank" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Kontoinhaber</Label>
                      <div className="input-gold-shimmer rounded-lg">
                        <Input
                          value={(modelForm as any).bank_account_holder || ""}
                          onChange={(e) => setModelForm((prev) => ({ ...prev, bank_account_holder: e.target.value }))}
                          placeholder="Vor- und Nachname"
                          className="bg-secondary/40 border-transparent text-sm h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">IBAN</Label>
                      <div className="input-gold-shimmer rounded-lg">
                        <Input
                          value={(modelForm as any).bank_iban || ""}
                          onChange={(e) => setModelForm((prev) => ({ ...prev, bank_iban: e.target.value }))}
                          placeholder="DE89 3704 0044 0532 0130 00"
                          className="bg-secondary/40 border-transparent text-sm h-9 font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">BIC / SWIFT</Label>
                        <div className="input-gold-shimmer rounded-lg">
                          <Input
                            value={(modelForm as any).bank_bic || ""}
                            onChange={(e) => setModelForm((prev) => ({ ...prev, bank_bic: e.target.value }))}
                            placeholder="COBADEFFXXX"
                            className="bg-secondary/40 border-transparent text-sm h-9 font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Bankname</Label>
                        <div className="input-gold-shimmer rounded-lg">
                          <Input
                            value={(modelForm as any).bank_name || ""}
                            onChange={(e) => setModelForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                            placeholder="z.B. Commerzbank"
                            className="bg-secondary/40 border-transparent text-sm h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* ── Notizen ── */}
            <Section icon={StickyNote} title="Notizen" delay={0.25}>
              <div className="space-y-1.5">
                <div className="input-gold-shimmer rounded-lg">
                  <Textarea
                    value={modelForm.notes || ""}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notizen zum Model…"
                    className="bg-secondary/40 border-transparent min-h-[80px] text-sm"
                  />
                </div>
              </div>
            </Section>

            {/* ── Save & Delete ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Button
                onClick={saveModel}
                disabled={saving}
                className="w-full gap-2 h-11 text-sm font-semibold bg-accent hover:bg-accent/90 text-accent-foreground transition-all hover:scale-[1.01] active:scale-[0.99] gold-glow"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Alles speichern
              </Button>
              <Button
                onClick={deleteModel}
                variant="ghost"
                className="w-full text-xs text-destructive/60 hover:text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                Model löschen
              </Button>
            </motion.div>

            {/* ── Credit Note ── */}
            <Section icon={FileDown} title="Provider Invoice erstellen" delay={0.35}>
              <CreditNoteForm
                key={selectedModelId}
                autoApplyTrigger={calcTrigger}
                onInvoiceCreated={async ({ creditNoteNumber, netAmount, servicePeriodStart, servicePeriodEnd }) => {
                  if (!selectedModelId || !servicePeriodStart || !servicePeriodEnd) return;
                  // Compute all (year, month) pairs covered by the invoice service period
                  const start = new Date(servicePeriodStart);
                  const end = new Date(servicePeriodEnd);
                  const pairs: Array<{ y: number; m: number }> = [];
                  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
                  while (cur <= end) {
                    pairs.push({ y: cur.getFullYear(), m: cur.getMonth() + 1 });
                    cur.setMonth(cur.getMonth() + 1);
                  }
                  if (pairs.length === 0) return;
                  const nowIso = new Date().toISOString();
                  const invoiceCurrency = (modelForm as any).invoice_currency || modelForm.currency || "EUR";
                  // Fetch each affected payout row to build a per-row snapshot
                  const rows = await Promise.all(pairs.map(({ y, m }) =>
                    (supabase as any)
                      .from("payout_revenue")
                      .select("fourbased_revenue, maloum_revenue, brezzels_revenue, monthly_revenue")
                      .eq("model_id", selectedModelId)
                      .eq("last_fetched_month", m)
                      .eq("last_fetched_year", y)
                      .maybeSingle()
                      .then((res: any) => ({ y, m, row: res.data }))
                  ));
                  // Allocate share proportionally to monthly revenue; fallback to equal split
                  const fallbackPct = modelForm.revenue_percentage || 0;
                  const totalMonthly = rows.reduce((s, r) => s + Number(r.row?.monthly_revenue || 0), 0);
                  await Promise.all(rows.map(({ y, m, row }) => {
                    const monthly = Number(row?.monthly_revenue || 0);
                    const share = totalMonthly > 0
                      ? netAmount * (monthly / totalMonthly)
                      : netAmount / pairs.length;
                    const snapshot = {
                      invoice_number: creditNoteNumber,
                      invoice_net_amount: netAmount,
                      invoice_currency: invoiceCurrency,
                      billed_share_amount: Math.round(share * 100) / 100,
                      service_period: { start: servicePeriodStart, end: servicePeriodEnd },
                      platform_revenues: {
                        fourbased: Number(row?.fourbased_revenue || 0),
                        maloum: Number(row?.maloum_revenue || 0),
                        brezzels: Number(row?.brezzels_revenue || 0),
                      },
                      percentages: {
                        default: fallbackPct,
                        fourbased: modelForm.revenue_percentage_fourbased || fallbackPct,
                        maloum: modelForm.revenue_percentage_maloum || fallbackPct,
                        brezzels: modelForm.revenue_percentage_brezzels || fallbackPct,
                      },
                      custom_platforms: customPlatforms,
                      monthly_revenue_at_billing: monthly,
                    };
                    return (supabase as any)
                      .from("payout_revenue")
                      .update({
                        billed_at: nowIso,
                        billed_credit_note_number: creditNoteNumber,
                        billed_amount: Math.round(share * 100) / 100,
                        billed_snapshot: snapshot,
                      })
                      .eq("model_id", selectedModelId)
                      .eq("last_fetched_month", m)
                      .eq("last_fetched_year", y);
                  }));
                  setBillingHistoryTick((t) => t + 1);
                  toast.success(`${pairs.length} Monat${pairs.length === 1 ? "" : "e"} als abgerechnet markiert`);
                }}

                suggestedAmount={verdienst}
                providerName={selectedModel.name}
                accountId={modelAccounts[0]?.id || ""}
                providerEntityType="model"
                providerEntityId={selectedModelId}
                providerAddress={(modelForm as any).provider_address || modelForm.address || ""}
                providerIsBusiness={(modelForm as any).provider_is_business ?? false}
                providerVatId={(modelForm as any).provider_vat_id || ""}
                providerNameOverride={(modelForm as any).provider_name_override || ""}
                invoiceDescription={(modelForm as any).invoice_description || ""}
                invoiceNetAmount={Number((modelForm as any).invoice_net_amount) || 0}
                invoiceCurrency={(modelForm as any).invoice_currency || ""}
                invoiceServicePeriodStart={(modelForm as any).invoice_service_period_start || null}
                invoiceServicePeriodEnd={(modelForm as any).invoice_service_period_end || null}
                invoicePaymentDate={(modelForm as any).invoice_payment_date || null}
                invoiceCryptoNetwork={(modelForm as any).invoice_crypto_network || ""}
                invoiceCryptoCoin={(modelForm as any).invoice_crypto_coin || ""}
                invoiceTxHash={(modelForm as any).invoice_tx_hash || ""}
                invoiceExchangeRate={(modelForm as any).invoice_exchange_rate || ""}
                invoiceReceiverWallet={(modelForm as any).invoice_receiver_wallet || ""}
                onProviderDataChange={(patch) => setModelForm((prev) => ({
                  ...prev,
                  provider_name_override: patch.providerNameOverride,
                  provider_address: patch.providerAddress,
                  provider_is_business: patch.providerIsBusiness,
                  provider_vat_id: patch.providerVatId,
                } as any))}
                onInvoiceDataChange={(patch) => setModelForm((prev) => ({
                  ...prev,
                  invoice_description: patch.invoiceDescription,
                  invoice_net_amount: patch.invoiceNetAmount,
                  invoice_currency: patch.invoiceCurrency,
                  invoice_service_period_start: patch.invoiceServicePeriodStart,
                  invoice_service_period_end: patch.invoiceServicePeriodEnd,
                  invoice_payment_date: patch.invoicePaymentDate,
                  invoice_crypto_network: patch.invoiceCryptoNetwork,
                  invoice_crypto_coin: patch.invoiceCryptoCoin,
                  invoice_tx_hash: patch.invoiceTxHash,
                  invoice_exchange_rate: patch.invoiceExchangeRate,
                  invoice_receiver_wallet: patch.invoiceReceiverWallet,
                } as any))}
                cryptoAddress={modelForm.crypto_address || ""}
                revenuePercentage={modelForm.revenue_percentage || 0}
                currency={modelForm.currency || "EUR"}
                paymentMethod={(modelForm as any).payment_method || "crypto"}
                bankName={(modelForm as any).bank_name || ""}
                bankIban={(modelForm as any).bank_iban || ""}
                bankBic={(modelForm as any).bank_bic || ""}
                bankAccountHolder={(modelForm as any).bank_account_holder || ""}
                platformRevenue={selectedModelPlatformRevenue.reduce(
                  (acc, p) => ({
                    fourbased: acc.fourbased + (p.fourbased || 0),
                    maloum: acc.maloum + (p.maloum || 0),
                    brezzels: acc.brezzels + (p.brezzels || 0),
                  }),
                  { fourbased: 0, maloum: 0, brezzels: 0 },
                )}
                platformPercentages={{
                  fourbased: modelForm.revenue_percentage_fourbased || 0,
                  maloum: modelForm.revenue_percentage_maloum || 0,
                  brezzels: modelForm.revenue_percentage_brezzels || 0,
                }}
                platformFxRates={Array.from(
                  modelAccounts.reduce((map, a) => {
                    const from = (getSourceCurrency(a) || baseCurrency).trim();
                    if (!from || from === baseCurrency) return map;
                    const rate = fxRates[`${from}->${baseCurrency}`];
                    if (rate) map.set(`${a.platform}:${from}->${baseCurrency}`, { platform: a.platform, from, to: baseCurrency, rate });
                    return map;
                  }, new Map<string, { platform: string; from: string; to: string; rate: number }>()).values(),
                )}
                platformBreakdown={(() => {
                  const fallback = modelForm.revenue_percentage || 0;
                  const pctMap: Record<string, number> = {
                    "4Based": modelForm.revenue_percentage_fourbased || 0,
                    Maloum: modelForm.revenue_percentage_maloum || 0,
                    Brezzels: modelForm.revenue_percentage_brezzels || 0,
                  };
                  // Prefer fetched/calculated payout revenue over live dashboard input,
                  // matching the "Custom % pro Plattform" card display.
                  const fetchedTotals = fetchedPayoutRevenue
                    ? {
                        "4Based": fetchedPayoutRevenue.fourbased ?? 0,
                        Maloum: fetchedPayoutRevenue.maloum ?? 0,
                        Brezzels: fetchedPayoutRevenue.brezzels ?? 0,
                      }
                    : null;
                  const payoutTotals = payoutRevenueForMonth
                    ? {
                        "4Based": payoutRevenueForMonth.fourbased,
                        Maloum: payoutRevenueForMonth.maloum,
                        Brezzels: payoutRevenueForMonth.brezzels,
                      }
                    : null;
                  const sourceTotals = payoutTotals ?? fetchedTotals;

                  const agg: Record<string, { rev: number; pct: number }> = {};
                  if (sourceTotals) {
                    for (const [name, rev] of Object.entries(sourceTotals)) {
                      const pct = pctMap[name] > 0 ? pctMap[name] : fallback;
                      const raw = Number(rev) || 0;
                      // 4Based fetched values are always in USD — convert to base currency
                      const r = name === "4Based" ? convertToBase(raw, "USD") : raw;
                      if (r > 0) agg[name] = { rev: r, pct };
                    }
                  }
                  const builtins = Object.entries(agg).map(([name, v]) => ({ name, rev: v.rev, pct: v.pct }));
                  const customs = customPlatforms
                    .filter((cp) => cp.name.trim() && cp.revenue > 0)
                    .map((cp) => ({
                      name: cp.name.trim(),
                      rev: cp.revenue,
                      pct: cp.percentage > 0 ? cp.percentage : fallback,
                    }));
                  return [...builtins, ...customs];
                })()}
              />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(v) => {
          setCreateDialogOpen(v);
          if (!v) {
            setCreateAccounts(emptyAccountEntries());
          }
        }}
      >
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Neues Model anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Model info */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={newModel.name}
                onChange={(e) => setNewModel((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Alina"
                className="bg-secondary/40 border-border/50 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Benutzername</Label>
                <Input
                  value={newModel.username}
                  onChange={(e) => setNewModel((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="z.B. alina_official"
                  className="bg-secondary/40 border-border/50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Anschrift</Label>
                <Input
                  value={newModel.address}
                  onChange={(e) => setNewModel((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Straße, PLZ, Ort"
                  className="bg-secondary/40 border-border/50 text-sm"
                />
              </div>
            </div>

            {/* Model-level settings */}
            <div className="border-t border-border/30 pt-3 space-y-3">
              <p className="text-xs font-semibold text-foreground mb-1">Einstellungen</p>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Drive Folder ID</Label>
                <Input
                  value={newModel.drive_folder_id}
                  onChange={(e) => setNewModel((prev) => ({ ...prev, drive_folder_id: e.target.value }))}
                  placeholder="Google Drive URL oder Folder ID (optional)"
                  className="bg-secondary/40 border-border/50 text-xs h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Referrer Tag</Label>
                <ReferrerTagInput
                  value={newModel.referrer_tag}
                  onChange={(v) => setNewModel((prev) => ({ ...prev, referrer_tag: v }))}
                  suggestions={referrerSuggestions}
                />
                <p className="text-[10px] text-muted-foreground/70">
                  Quelle dieses Models (frei wählbar – frühere Tags erscheinen als Vorschläge).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Gruppe</Label>
                  <Select
                    value={newModel.group_id || "__none__"}
                    onValueChange={(v) =>
                      setNewModel((prev) => ({ ...prev, group_id: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-secondary/40 border-border/50">
                      <SelectValue placeholder="Keine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Keine Gruppe</SelectItem>
                      {groupsList.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} ({g.default_commission}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Override %</Label>
                  <Input
                    type="number"
                    value={newModel.commission_override}
                    onChange={(e) =>
                      setNewModel((prev) => ({ ...prev, commission_override: e.target.value }))
                    }
                    placeholder="Default Gruppe"
                    className="h-8 text-xs bg-secondary/40 border-border/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Sprache</Label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setNewModel((prev) => ({ ...prev, model_language: "de" as const }))}
                      className={cn(
                        "flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all",
                        newModel.model_language === "de"
                          ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                          : "bg-secondary/30 text-muted-foreground border-border/50",
                      )}
                    >
                      🇩🇪 DE
                    </button>
                    <button
                      onClick={() => setNewModel((prev) => ({ ...prev, model_language: "en" as const }))}
                      className={cn(
                        "flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all",
                        newModel.model_language === "en"
                          ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                          : "bg-secondary/30 text-muted-foreground border-border/50",
                      )}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Agentur</Label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setNewModel((prev) => ({ ...prev, model_agency: "shex" as const }))}
                      className={cn(
                        "flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all",
                        newModel.model_agency === "shex"
                          ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                          : "bg-secondary/30 text-muted-foreground border-border/50",
                      )}
                    >
                      SheX
                    </button>
                    <button
                      onClick={() => setNewModel((prev) => ({ ...prev, model_agency: "syn" as const }))}
                      className={cn(
                        "flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all",
                        newModel.model_agency === "syn"
                          ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                          : "bg-secondary/30 text-muted-foreground border-border/50",
                      )}
                    >
                      SYN
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[10px] font-medium text-muted-foreground">Model aktiv</span>
                <Switch
                  checked={newModel.model_active}
                  onCheckedChange={(checked) => setNewModel((prev) => ({ ...prev, model_active: checked }))}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/30 pt-3">
              <p className="text-xs font-semibold text-foreground mb-1">Plattform-Accounts</p>
              <p className="text-[10px] text-muted-foreground mb-3">
                Optional – wähle Plattformen aus und trage die Login-Daten ein.
              </p>
            </div>

            {/* Platform accounts */}
            <div className="space-y-2">
              {PLATFORMS.map((platform) => {
                const entry = createAccounts[platform];
                const isSelected = entry?.selected;
                return (
                  <div
                    key={platform}
                    className={cn(
                      "rounded-lg border transition-all duration-200",
                      isSelected ? "border-accent/40 bg-accent/5" : "border-border/40 bg-secondary/10",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCreateAccounts((prev) => ({
                          ...prev,
                          [platform]: { ...prev[platform], selected: !prev[platform].selected },
                        }))
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5"
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                          isSelected ? "border-accent bg-accent/20" : "border-muted-foreground/30",
                        )}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-accent" />}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2.5 py-0.5 rounded-full border",
                          platformColors[platform] || "bg-secondary/50 text-muted-foreground border-border/30",
                        )}
                      >
                        {platform}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{PLATFORM_DOMAINS[platform]}</span>
                    </button>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">E-Mail / Login</Label>
                                <Input
                                  value={entry.account_email}
                                  onChange={(e) =>
                                    setCreateAccounts((prev) => ({
                                      ...prev,
                                      [platform]: { ...prev[platform], account_email: e.target.value },
                                    }))
                                  }
                                  placeholder="login@example.com"
                                  className="bg-secondary/40 border-border/50 text-xs h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Passwort</Label>
                                <Input
                                  value={entry.account_password}
                                  onChange={(e) =>
                                    setCreateAccounts((prev) => ({
                                      ...prev,
                                      [platform]: { ...prev[platform], account_password: e.target.value },
                                    }))
                                  }
                                  placeholder="••••••••"
                                  className="bg-secondary/40 border-border/50 text-xs h-8"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Domain</Label>
                              <Input
                                value={entry.account_domain}
                                onChange={(e) =>
                                  setCreateAccounts((prev) => ({
                                    ...prev,
                                    [platform]: { ...prev[platform], account_domain: e.target.value },
                                  }))
                                }
                                className="bg-secondary/40 border-border/50 text-xs h-8"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleCreateModel}
              disabled={creating}
              className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {(() => {
                const count = Object.values(createAccounts).filter((v) => v.selected).length;
                return count > 0 ? `Model mit ${count} Account${count > 1 ? "s" : ""} erstellen` : "Model erstellen";
              })()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Account Dialog (Multi-Platform) ── */}
      <Dialog
        open={addAccountOpen}
        onOpenChange={(v) => {
          setAddAccountOpen(v);
          if (!v) setNewAccounts(emptyAccountEntries());
        }}
      >
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Plattform-Accounts hinzufügen</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Wähle eine oder mehrere Plattformen aus und trage die Login-Daten ein.
          </p>
          <div className="space-y-3">
            {PLATFORMS.filter((p) => !modelAccounts.some((a) => a.platform === p)).map((platform) => {
              const entry = newAccounts[platform];
              const isSelected = entry?.selected;
              return (
                <div
                  key={platform}
                  className={cn(
                    "rounded-lg border transition-all duration-200",
                    isSelected ? "border-accent/40 bg-accent/5" : "border-border/40 bg-secondary/10",
                  )}
                >
                  {/* Platform toggle header */}
                  <button
                    type="button"
                    onClick={() =>
                      setNewAccounts((prev) => ({
                        ...prev,
                        [platform]: { ...prev[platform], selected: !prev[platform].selected },
                      }))
                    }
                    className="w-full flex items-center gap-3 px-3 py-2.5"
                  >
                    <div
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                        isSelected ? "border-accent bg-accent/20" : "border-muted-foreground/30",
                      )}
                    >
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-accent" />}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2.5 py-0.5 rounded-full border",
                        platformColors[platform] || "bg-secondary/50 text-muted-foreground border-border/30",
                      )}
                    >
                      {platform}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{PLATFORM_DOMAINS[platform]}</span>
                  </button>

                  {/* Expanded fields */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">E-Mail / Login</Label>
                              <Input
                                value={entry.account_email}
                                onChange={(e) =>
                                  setNewAccounts((prev) => ({
                                    ...prev,
                                    [platform]: { ...prev[platform], account_email: e.target.value },
                                  }))
                                }
                                placeholder="login@example.com"
                                className="bg-secondary/40 border-border/50 text-xs h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Passwort</Label>
                              <Input
                                value={entry.account_password}
                                onChange={(e) =>
                                  setNewAccounts((prev) => ({
                                    ...prev,
                                    [platform]: { ...prev[platform], account_password: e.target.value },
                                  }))
                                }
                                placeholder="••••••••"
                                className="bg-secondary/40 border-border/50 text-xs h-8"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Domain</Label>
                            <Input
                              value={entry.account_domain}
                              onChange={(e) =>
                                setNewAccounts((prev) => ({
                                  ...prev,
                                  [platform]: { ...prev[platform], account_domain: e.target.value },
                                }))
                              }
                              className="bg-secondary/40 border-border/50 text-xs h-8"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            <Button
              onClick={handleAddAccount}
              disabled={addingAccount || !Object.values(newAccounts).some((v) => v.selected)}
              className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {addingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {(() => {
                const count = Object.values(newAccounts).filter((v) => v.selected).length;
                return count > 1 ? `${count} Accounts hinzufügen` : "Account hinzufügen";
              })()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Model Logins Manager Dialog ── */}
      <Dialog open={loginsManagerOpen} onOpenChange={setLoginsManagerOpen}>
        <DialogContent className="glass-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" />
              Model-Logins · {selectedModel?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Ein Login pro Model — gilt für <span className="text-accent font-medium">alle Plattformen</span> dieses Models.
            </p>

            {!currentModelLogin ? (
              <div className="rounded-lg border border-dashed border-border/40 bg-secondary/10 p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Noch kein Login für dieses Model.</p>
                <Button
                  onClick={generateModelLogin}
                  disabled={modelLoginLoading || !selectedModelId}
                  className="gap-2 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold shadow-[0_0_18px_-2px_hsl(var(--accent)/0.6)]"
                >
                  <Plus className="h-4 w-4" />
                  {modelLoginLoading ? "Erstelle..." : "Model-Login generieren"}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-accent/30 bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_hsl(142_76%_60%)]" />
                    Login aktiv
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetModelLogin}
                      disabled={modelLoginLoading}
                      className="h-7 text-[10px] gap-1 text-accent hover:bg-accent/10"
                    >
                      <KeyRound className="h-3 w-3" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={deleteModelLogin}
                      className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-background/40 border border-border/30 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">E-Mail</p>
                      <p className="text-xs font-mono text-foreground truncate">{currentModelLogin.email || "—"}</p>
                    </div>
                    {currentModelLogin.email && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentModelLogin.email);
                          toast.success("E-Mail kopiert");
                        }}
                        className="shrink-0 text-muted-foreground hover:text-accent"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-background/40 border border-border/30 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Passwort</p>
                      <p className="text-xs font-mono text-foreground truncate">
                        {currentModelLogin.password ? (
                          revealManagerPw ? currentModelLogin.password : "••••••••••••"
                        ) : (
                          <span className="italic text-muted-foreground/70">Reset für neues PW</span>
                        )}
                      </p>
                    </div>
                    {currentModelLogin.password && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRevealManagerPw((v) => !v)}
                          className="shrink-0 text-muted-foreground hover:text-accent"
                        >
                          {revealManagerPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentModelLogin.password);
                            toast.success("Passwort kopiert");
                          }}
                          className="shrink-0 text-muted-foreground hover:text-accent"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Model Login Dialog ── */}
      <Dialog open={modelLoginDialog} onOpenChange={setModelLoginDialog}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Model-Login erstellt</DialogTitle>
          </DialogHeader>
          {modelLoginCreds && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Sende diese Zugangsdaten an das Model. Das Passwort wird nur einmal angezeigt!
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">E-Mail</p>
                    <p className="text-sm font-mono text-foreground truncate">{modelLoginCreds.email}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(modelLoginCreds.email);
                      toast.success("Kopiert!");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Passwort</p>
                    <p className="text-sm font-mono text-foreground truncate">
                      {showLoginPassword ? modelLoginCreds.password : "••••••••••••"}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    {showLoginPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(modelLoginCreds.password);
                      toast.success("Kopiert!");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Login-URL: <span className="text-foreground font-mono">{window.location.origin}/model/login</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ModelGroupsPanel
        open={groupsPanelOpen}
        onOpenChange={setGroupsPanelOpen}
        onChanged={() => {
          loadGroups();
          loadModels();
        }}
      />

      {/* ── Billing-Verlauf Detail Dialog ── */}
      <Dialog open={!!historyDetailRow} onOpenChange={(o) => !o && setHistoryDetailRow(null)}>
        <DialogContent className="max-w-md">
          {historyDetailRow && (() => {
            const r = historyDetailRow;
            const snap = r.billed_snapshot || {};
            const monthLabel = new Date(r.year, r.month - 1, 1)
              .toLocaleDateString("de-DE", { month: "long", year: "numeric" });
            const isBilled = !!r.billed_at;
            const currency = snap.invoice_currency || modelForm.currency || "EUR";
            const fmt = (n: number) => Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const platRev = snap.platform_revenues || {
              fourbased: r.fourbased_revenue || 0,
              maloum: r.maloum_revenue || 0,
              brezzels: r.brezzels_revenue || 0,
            };
            const pcts = snap.percentages || {};
            const customs: Array<{ name: string; revenue: number; percentage: number }> = snap.custom_platforms || [];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {monthLabel}
                    {isBilled ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                        Abgerechnet
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                        Offen
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  {/* Invoice meta */}
                  {isBilled && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                      {r.billed_credit_note_number && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground text-xs">Provider Invoice</span>
                          <span className="font-mono text-xs text-foreground">{r.billed_credit_note_number}</span>
                        </div>
                      )}
                      {r.billed_at && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground text-xs">Abgerechnet am</span>
                          <span className="text-xs text-foreground">{new Date(r.billed_at).toLocaleString("de-DE")}</span>
                        </div>
                      )}
                      {snap.service_period?.start && snap.service_period?.end && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground text-xs">Leistungszeitraum</span>
                          <span className="text-xs text-foreground">
                            {new Date(snap.service_period.start).toLocaleDateString("de-DE")} – {new Date(snap.service_period.end).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Platform revenues */}
                  <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Umsatz pro Plattform</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">4Based {pcts.fourbased ? `(${pcts.fourbased}%)` : ""}</span>
                        <span className="tabular-nums text-foreground">{fmt(platRev.fourbased)} USD</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Maloum {pcts.maloum ? `(${pcts.maloum}%)` : ""}</span>
                        <span className="tabular-nums text-foreground">{fmt(platRev.maloum)} EUR</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Brezzels {pcts.brezzels ? `(${pcts.brezzels}%)` : ""}</span>
                        <span className="tabular-nums text-foreground">{fmt(platRev.brezzels)} EUR</span>
                      </div>
                      {customs.map((c, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{c.name} {c.percentage ? `(${c.percentage}%)` : ""}</span>
                          <span className="tabular-nums text-foreground">{fmt(c.revenue)} {currency}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs pt-1.5 mt-1.5 border-t border-border/40">
                        <span className="text-muted-foreground">Gesamtumsatz Monat</span>
                        <span className="tabular-nums font-semibold text-foreground">{fmt(r.monthly_revenue || 0)} {currency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payout */}
                  <div className="rounded-lg border border-accent/30 bg-accent/[0.04] p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Payout</span>
                      <span className="text-lg font-bold text-accent tabular-nums">
                        {fmt(r.billed_amount ?? snap.billed_share_amount ?? 0)} {currency}
                      </span>
                    </div>
                    {snap.invoice_net_amount != null && (
                      <div className="flex justify-between mt-1.5 pt-1.5 border-t border-accent/15 text-[10px] text-muted-foreground">
                        <span>Invoice Net Total</span>
                        <span className="tabular-nums">{fmt(snap.invoice_net_amount)} {currency}</span>
                      </div>
                    )}
                  </div>

                  {r.last_fetched_at && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Zuletzt abgerufen: {new Date(r.last_fetched_at).toLocaleString("de-DE")}
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>

  );
}
