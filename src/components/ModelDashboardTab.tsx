import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Trash2, Download, Save, Loader2, Star,
  Percent, Wallet, StickyNote, CheckCircle2, FileDown, List, Filter, Search, ChevronRight, ChevronDown, TrendingUp, CalendarDays, DollarSign, KeyRound, Copy, Eye, EyeOff
} from "lucide-react";
import CreditNoteForm from "@/components/CreditNoteForm";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface Account {
  id: string;
  account_email: string;
  account_domain: string;
  platform: string;
}

interface ModelDashboardRow {
  id: string;
  account_id: string;
  fourbased_submitted: boolean;
  maloum_submitted: boolean;
  brezzels_submitted: boolean;
  botdm_done: boolean;
  massdm_done: boolean;
  fourbased_botdm_done: boolean;
  fourbased_massdm_done: boolean;
  maloum_botdm_done: boolean;
  maloum_massdm_done: boolean;
  brezzels_botdm_done: boolean;
  brezzels_massdm_done: boolean;
  notes: string | null;
  revenue_percentage: number | null;
  crypto_address: string | null;
  contract_file_path: string | null;
}

type PlatformFilter = "all" | "4Based" | "Maloum" | "Brezzels";
type SubFilter = "none" | "botdm_fehlt" | "botdm_vorhanden" | "massdm_fehlt" | "massdm_vorhanden" | "setup_fehlt" | "setup_vorhanden";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AED"] as const;

interface BotMessageRow {
  account_id: string | null;
  message: string;
  follow_up_message: string;
}

const SENDER = {
  company: "Sharify Media FZCO",
  line1: "IFZA Business Park DDP 21236-001",
  line2: "Silicon Oasis",
  line3: "00000, United Arab Emirates",
  taxId: "1041507169",
};

const PLATFORM_LABELS: PlatformFilter[] = ["all", "4Based", "Maloum", "Brezzels"];

const SUB_FILTERS: { label: string; value: SubFilter }[] = [
  { label: "BotDM fehlt", value: "botdm_fehlt" },
  { label: "BotDM vorhanden", value: "botdm_vorhanden" },
  { label: "MassDM fehlt", value: "massdm_fehlt" },
  { label: "MassDM vorhanden", value: "massdm_vorhanden" },
  { label: "Account Setup fehlt", value: "setup_fehlt" },
  { label: "Account Setup vorhanden", value: "setup_vorhanden" },
];

// ─── Animated counter (count-up) ───
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (start === target) { setValue(target); return; }
    const startTime = performance.now();
    let raf: number;
    const anim = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(anim);
    };
    raf = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="inline-block"
    >
      {value}
    </motion.span>
  );
}

function AnimatedGoldValue({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedCounter(value);
  return <span className={className}>{animated.toLocaleString("de-DE")}{suffix}</span>;
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

// ─── BotDM Table Component ───
function BotDmTable({
  rows,
  allDashboards,
  onToggle,
}: {
  rows: { acc: Account; dash: ModelDashboardRow | undefined; botMsg: BotMessageRow | undefined }[];
  allDashboards: ModelDashboardRow[];
  onToggle: (accountId: string, field: string, value: boolean) => Promise<void>;
}) {
  const [tableSearch, setTableSearch] = useState("");
  const [tablePlatform, setTablePlatform] = useState<"all" | "4Based" | "Maloum" | "Brezzels">("all");
  const [expandedFollowUp, setExpandedFollowUp] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const filtered = rows.filter(({ acc }) => {
    if (tablePlatform !== "all" && acc.platform !== tablePlatform) return false;
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      return acc.account_email.toLowerCase().includes(q) || acc.account_domain.toLowerCase().includes(q);
    }
    return true;
  });

  const getField = (acc: Account, type: "botdm" | "welcome" | "massdm") => {
    const p = acc.platform;
    if (type === "botdm") return p === "Maloum" ? "maloum_botdm_done" : p === "Brezzels" ? "brezzels_botdm_done" : "fourbased_botdm_done";
    if (type === "welcome") return p === "Maloum" ? "maloum_submitted" : p === "Brezzels" ? "brezzels_submitted" : "fourbased_submitted";
    return p === "Maloum" ? "maloum_massdm_done" : p === "Brezzels" ? "brezzels_massdm_done" : "fourbased_massdm_done";
  };

  const handleToggle = async (accountId: string, field: string, current: boolean) => {
    const key = `${accountId}-${field}`;
    setToggling(key);
    await onToggle(accountId, field, !current);
    setToggling(null);
  };

  const platformColors: Record<string, string> = {
    "4Based": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "Maloum": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    "Brezzels": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };

  return (
    <div className="space-y-3">
      {/* Search + Filter */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <div className="input-gold-shimmer rounded-lg">
            <Input
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              placeholder="Account suchen…"
              className="pl-9 bg-secondary/50 border-transparent text-sm h-9"
            />
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/30">
          {(["all", "4Based", "Maloum", "Brezzels"] as const).map(p => (
            <button
              key={p}
              onClick={() => setTablePlatform(p)}
              className={cn(
                "flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all duration-200",
                tablePlatform === p
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              {p === "all" ? "Alle" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_50px_50px_50px] gap-0 bg-accent/10 border-b border-accent/20">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold">Account</div>
          <div className="px-2 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Plattform</div>
          <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Bot</div>
          <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Setup</div>
          <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Mass</div>
        </div>

        {/* Rows */}
        <ScrollArea className="max-h-[400px]">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Keine Accounts gefunden.</p>
          ) : (
            filtered.map(({ acc, dash }, i) => {
              const botdmField = getField(acc, "botdm");
              const welcomeField = getField(acc, "welcome");
              const massdmField = getField(acc, "massdm");
              const botdmVal = !!(dash as any)?.[botdmField];
              const welcomeVal = !!(dash as any)?.[welcomeField];
              const massdmVal = !!(dash as any)?.[massdmField];
              const isMaloum = acc.platform === "Maloum";
              const botMsg = rows.find(r => r.acc.id === acc.id)?.botMsg;
              const isExpanded = expandedFollowUp === acc.id;

              return (
                <div key={acc.id}>
                  <div className={cn(
                    "grid grid-cols-[1fr_80px_50px_50px_50px] gap-0 items-center border-b border-border/30 transition-colors hover:bg-accent/5",
                    i % 2 === 0 ? "bg-card/40" : "bg-card/20"
                  )}>
                    {/* Account */}
                    <div className="px-3 py-2 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{acc.account_email}</p>
                      {acc.account_domain && (
                        <p className="text-[10px] text-muted-foreground truncate">{acc.account_domain}</p>
                      )}
                      {isMaloum && botMsg?.follow_up_message && (
                        <button
                          onClick={() => setExpandedFollowUp(isExpanded ? null : acc.id)}
                          className="text-[10px] text-accent hover:underline mt-0.5 flex items-center gap-1"
                        >
                          <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", isExpanded && "rotate-180")} />
                          Follow-Up
                        </button>
                      )}
                    </div>

                    {/* Platform badge */}
                    <div className="px-2 py-2 flex justify-center">
                      <span className={cn(
                        "text-[9px] font-medium px-2 py-0.5 rounded-full border",
                        platformColors[acc.platform] || "bg-secondary/50 text-muted-foreground border-border/30"
                      )}>
                        {acc.platform}
                      </span>
                    </div>

                    {/* BotDM checkbox */}
                    <div className="flex justify-center py-2">
                      <button
                        onClick={() => handleToggle(acc.id, botdmField, botdmVal)}
                        disabled={toggling === `${acc.id}-${botdmField}`}
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200",
                          botdmVal
                            ? "border-accent bg-accent/20"
                            : "border-muted-foreground/30 bg-transparent hover:border-accent/50"
                        )}
                      >
                        {botdmVal && <CheckCircle2 className="h-3 w-3 text-accent" />}
                      </button>
                    </div>

                    {/* Welcome/Setup checkbox */}
                    <div className="flex justify-center py-2">
                      <button
                        onClick={() => handleToggle(acc.id, welcomeField, welcomeVal)}
                        disabled={toggling === `${acc.id}-${welcomeField}`}
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200",
                          welcomeVal
                            ? "border-accent bg-accent/20"
                            : "border-muted-foreground/30 bg-transparent hover:border-accent/50"
                        )}
                      >
                        {welcomeVal && <CheckCircle2 className="h-3 w-3 text-accent" />}
                      </button>
                    </div>

                    {/* MassDM checkbox */}
                    <div className="flex justify-center py-2">
                      <button
                        onClick={() => handleToggle(acc.id, massdmField, massdmVal)}
                        disabled={toggling === `${acc.id}-${massdmField}`}
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200",
                          massdmVal
                            ? "border-accent bg-accent/20"
                            : "border-muted-foreground/30 bg-transparent hover:border-accent/50"
                        )}
                      >
                        {massdmVal && <CheckCircle2 className="h-3 w-3 text-accent" />}
                      </button>
                    </div>
                  </div>

                  {/* Maloum Follow-Up expandable */}
                  <AnimatePresence>
                    {isMaloum && isExpanded && botMsg?.follow_up_message && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-b border-border/30 bg-accent/5"
                      >
                        <div className="px-4 py-2.5">
                          <p className="text-[10px] uppercase tracking-wider text-accent font-medium mb-1">Follow-Up Nachricht</p>
                          <p className="text-xs text-foreground/80 whitespace-pre-wrap">{botMsg.follow_up_message}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-muted-foreground">{filtered.length} Accounts</span>
      </div>
    </div>
  );
}
export default function ModelDashboardTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allDashboards, setAllDashboards] = useState<ModelDashboardRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [data, setData] = useState<ModelDashboardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [subFilter, setSubFilter] = useState<SubFilter>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [modelListOpen, setModelListOpen] = useState(false);
  const [allBotMessages, setAllBotMessages] = useState<BotMessageRow[]>([]);
  const [modelLoginDialog, setModelLoginDialog] = useState(false);
  const [modelLoginLoading, setModelLoginLoading] = useState(false);
  const [modelLoginCreds, setModelLoginCreds] = useState<{ email: string; password: string } | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Local form state – per-platform status
  const [fourbasedSubmitted, setFourbasedSubmitted] = useState(false);
  const [maloumSubmitted, setMaloumSubmitted] = useState(false);
  const [brezzelsSubmitted, setBrezzelsSubmitted] = useState(false);
  const [fourbasedBotdm, setFourbasedBotdm] = useState(false);
  const [fourbasedMassdm, setFourbasedMassdm] = useState(false);
  const [maloumBotdm, setMaloumBotdm] = useState(false);
  const [maloumMassdm, setMaloumMassdm] = useState(false);
  const [brezzelsBotdm, setBrezzelsBotdm] = useState(false);
  const [brezzelsMassdm, setBrezzelsMassdm] = useState(false);
  const [openPlatformStatus, setOpenPlatformStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [revenuePercentage, setRevenuePercentage] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [contractPath, setContractPath] = useState("");
  const [manualMonthly, setManualMonthly] = useState(0);
  const [fourbasedRevenue, setFourbasedRevenue] = useState(0);
  const [maloumRevenue, setMaloumRevenue] = useState(0);
  const [brezzelsRevenue, setBrezzelsRevenue] = useState(0);
  const [currency, setCurrency] = useState("EUR");

  // (Gutschrift state removed – now uses CreditNoteForm component)

  // Revenue per model
  const [modelRevenue, setModelRevenue] = useState<{ date: string; amount: number; user_id: string }[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueMonth, setRevenueMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const loadAllDashboards = useCallback(async () => {
    const { data } = await supabase.from("model_dashboard").select("*");
    if (data) setAllDashboards(data as ModelDashboardRow[]);
  }, []);

  useEffect(() => {
    supabase
      .from("accounts")
      .select("id, account_email, account_domain, platform")
      .order("account_email")
      .then(({ data }) => { if (data) setAccounts(data); });
    loadAllDashboards();
    supabase
      .from("bot_messages")
      .select("account_id, message, follow_up_message")
      .then(({ data }) => { if (data) setAllBotMessages(data as BotMessageRow[]); });
  }, [loadAllDashboards]);

  const loadModelData = useCallback(async (accountId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("model_dashboard")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (data) {
      const d = data as ModelDashboardRow;
      setData(d);
      setFourbasedSubmitted(d.fourbased_submitted);
      setMaloumSubmitted(d.maloum_submitted);
      setBrezzelsSubmitted(d.brezzels_submitted);
      setFourbasedBotdm(d.fourbased_botdm_done);
      setFourbasedMassdm(d.fourbased_massdm_done);
      setMaloumBotdm(d.maloum_botdm_done);
      setMaloumMassdm(d.maloum_massdm_done);
      setBrezzelsBotdm(d.brezzels_botdm_done);
      setBrezzelsMassdm(d.brezzels_massdm_done);
      setNotes(d.notes || "");
      setRevenuePercentage(d.revenue_percentage || 0);
      setCryptoAddress(d.crypto_address || "");
      setContractPath(d.contract_file_path || "");
      setManualMonthly(Number((d as any).monthly_revenue) || 0);
      setFourbasedRevenue(Number((d as any).fourbased_revenue) || 0);
      setMaloumRevenue(Number((d as any).maloum_revenue) || 0);
      setBrezzelsRevenue(Number((d as any).brezzels_revenue) || 0);
      setCurrency((d as any).currency || "EUR");
    } else {
      setData(null);
      setFourbasedSubmitted(false);
      setMaloumSubmitted(false);
      setBrezzelsSubmitted(false);
      setFourbasedBotdm(false);
      setFourbasedMassdm(false);
      setMaloumBotdm(false);
      setMaloumMassdm(false);
      setBrezzelsBotdm(false);
      setBrezzelsMassdm(false);
      setNotes("");
      setRevenuePercentage(0);
      setCryptoAddress("");
      setContractPath("");
      setManualMonthly(0);
      setFourbasedRevenue(0);
      setMaloumRevenue(0);
      setBrezzelsRevenue(0);
      setCurrency("EUR");
    }
    setLoading(false);
  }, []);

  const loadModelRevenue = useCallback(async (accountId: string, month: string) => {
    setRevenueLoading(true);
    // 1. Get all user_ids assigned to this account (current + historical)
    const { data: assignments } = await supabase
      .from("account_assignments")
      .select("user_id")
      .eq("account_id", accountId);

    const userIds = [...new Set((assignments || []).map(a => a.user_id))];
    if (userIds.length === 0) { setModelRevenue([]); setRevenueLoading(false); return; }

    // 2. Get daily_revenue for those users in the selected month
    const [year, mon] = month.split("-").map(Number);
    const monthStart = format(new Date(year, mon - 1, 1), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date(year, mon - 1, 1)), "yyyy-MM-dd");

    const { data: revenue } = await supabase
      .from("daily_revenue")
      .select("date, amount, user_id")
      .in("user_id", userIds)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true });

    setModelRevenue((revenue || []) as { date: string; amount: number; user_id: string }[]);
    setRevenueLoading(false);
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadModelData(selectedAccountId);
      loadModelRevenue(selectedAccountId, revenueMonth);
    }
  }, [selectedAccountId, loadModelData, loadModelRevenue, revenueMonth]);

  // Auto-save with debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const initialLoadDone = useRef(false);
  
  useEffect(() => {
    if (!selectedAccountId || loading) return;
    // Skip auto-save on initial load
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveData();
    }, 1200);
    return () => clearTimeout(autoSaveTimer.current);
  }, [notes, cryptoAddress, manualMonthly, fourbasedRevenue, maloumRevenue, brezzelsRevenue, revenuePercentage, currency,
      fourbasedSubmitted, maloumSubmitted, brezzelsSubmitted,
      fourbasedBotdm, fourbasedMassdm, maloumBotdm, maloumMassdm, brezzelsBotdm, brezzelsMassdm]);

  // Reset initialLoadDone when account changes
  useEffect(() => {
    initialLoadDone.current = false;
  }, [selectedAccountId]);

  // Revenue calculations
  // Auto-calculate total from platform revenues
  const totalPlatformRevenue = fourbasedRevenue + maloumRevenue + brezzelsRevenue;
  // Use platform sum if any platform has a value, otherwise fall back to manual
  const effectiveMonthly = totalPlatformRevenue > 0 ? totalPlatformRevenue : manualMonthly;
  
  // Sync manualMonthly with platform sum
  useEffect(() => {
    if (totalPlatformRevenue > 0) {
      setManualMonthly(totalPlatformRevenue);
    }
  }, [totalPlatformRevenue]);

  const totalMonthRevenue = effectiveMonthly;
  const gutschriftFromRevenue = useMemo(() => {
    if (revenuePercentage <= 0 || effectiveMonthly <= 0) return 0;
    return (effectiveMonthly * revenuePercentage) / 100;
  }, [effectiveMonthly, revenuePercentage]);

  // Available months for selection (last 12 months)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      months.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") });
    }
    return months;
  }, []);

  const getDashboard = (id: string) => allDashboards.find(d => d.account_id === id);

  const getBotMessage = (accountId: string) => allBotMessages.find(b => b.account_id === accountId);

  const getSetupField = (acc: Account): "fourbased_submitted" | "maloum_submitted" | "brezzels_submitted" => {
    if (acc.platform === "Maloum") return "maloum_submitted";
    if (acc.platform === "Brezzels") return "brezzels_submitted";
    return "fourbased_submitted";
  };

  const getBotdmField = (acc: Account): "fourbased_botdm_done" | "maloum_botdm_done" | "brezzels_botdm_done" => {
    if (acc.platform === "Maloum") return "maloum_botdm_done";
    if (acc.platform === "Brezzels") return "brezzels_botdm_done";
    return "fourbased_botdm_done";
  };

  const getMassdmField = (acc: Account): "fourbased_massdm_done" | "maloum_massdm_done" | "brezzels_massdm_done" => {
    if (acc.platform === "Maloum") return "maloum_massdm_done";
    if (acc.platform === "Brezzels") return "brezzels_massdm_done";
    return "fourbased_massdm_done";
  };

  const filteredAccounts = accounts.filter(acc => {
    if (platformFilter !== "all" && acc.platform !== platformFilter) return false;

    if (subFilter !== "none") {
      const dash = getDashboard(acc.id);
      const hasBotDm = !!dash?.[getBotdmField(acc)];
      const hasMassDm = !!dash?.[getMassdmField(acc)];
      const hasSetup = !!dash?.[getSetupField(acc)];

      if (subFilter === "botdm_fehlt" && hasBotDm) return false;
      if (subFilter === "botdm_vorhanden" && !hasBotDm) return false;
      if (subFilter === "massdm_fehlt" && hasMassDm) return false;
      if (subFilter === "massdm_vorhanden" && !hasMassDm) return false;
      if (subFilter === "setup_fehlt" && hasSetup) return false;
      if (subFilter === "setup_vorhanden" && !hasSetup) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return acc.account_email.toLowerCase().includes(q) || acc.account_domain.toLowerCase().includes(q);
    }
    return true;
  });

  const saveData = async () => {
    if (!selectedAccountId) return;
    setSaving(true);
    const payload = {
      account_id: selectedAccountId,
      fourbased_submitted: fourbasedSubmitted,
      maloum_submitted: maloumSubmitted,
      brezzels_submitted: brezzelsSubmitted,
      botdm_done: fourbasedBotdm || maloumBotdm || brezzelsBotdm,
      massdm_done: fourbasedMassdm || maloumMassdm || brezzelsMassdm,
      fourbased_botdm_done: fourbasedBotdm,
      fourbased_massdm_done: fourbasedMassdm,
      maloum_botdm_done: maloumBotdm,
      maloum_massdm_done: maloumMassdm,
      brezzels_botdm_done: brezzelsBotdm,
      brezzels_massdm_done: brezzelsMassdm,
      notes,
      revenue_percentage: revenuePercentage,
      crypto_address: cryptoAddress,
      contract_file_path: contractPath,
      monthly_revenue: manualMonthly,
      fourbased_revenue: fourbasedRevenue,
      maloum_revenue: maloumRevenue,
      brezzels_revenue: brezzelsRevenue,
      currency,
    };
    if (data?.id) {
      await supabase.from("model_dashboard").update(payload).eq("id", data.id);
    } else {
      await supabase.from("model_dashboard").insert(payload);
    }
    toast.success("Gespeichert ✅");
    await loadModelData(selectedAccountId);
    await loadAllDashboards();
    setSaving(false);
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;
    setUploading(true);
    const path = `${selectedAccountId}/${file.name}`;
    if (contractPath) await supabase.storage.from("model-contracts").remove([contractPath]);
    const { error } = await supabase.storage.from("model-contracts").upload(path, file, { upsert: true });
    if (error) toast.error("Upload fehlgeschlagen: " + error.message);
    else { setContractPath(path); toast.success("Vertrag hochgeladen ✅"); }
    setUploading(false);
    e.target.value = "";
  };

  const deleteContract = async () => {
    if (!contractPath) return;
    await supabase.storage.from("model-contracts").remove([contractPath]);
    setContractPath("");
    toast.success("Vertrag gelöscht");
  };

  const downloadContract = async () => {
    if (!contractPath) return;
    const { data } = await supabase.storage.from("model-contracts").createSignedUrl(contractPath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const generateModelLogin = async () => {
    if (!selectedAccountId) return;
    setModelLoginLoading(true);
    setModelLoginCreds(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-model-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ account_id: selectedAccountId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Fehler beim Erstellen");
      } else {
        setModelLoginCreds({ email: data.email, password: data.password });
        setModelLoginDialog(true);
        toast.success("Model-Login erstellt ✅");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setModelLoginLoading(false);
  };

  // generateGutschrift removed – now uses CreditNoteForm component

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center gold-glow">
          <Star className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gold-gradient-shimmer tracking-wide">Model-Dashboard</h1>
          <p className="text-xs text-muted-foreground">{accounts.length} Models registriert</p>
        </div>
      </motion.div>

      {/* ── Platform Filter ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/40"
      >
        {PLATFORM_LABELS.map(p => (
          <button
            key={p}
            onClick={() => { setPlatformFilter(p); setSubFilter("none"); }}
            className={`relative flex-1 text-xs font-medium py-2 rounded-lg transition-colors duration-200 ${
              platformFilter === p ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {platformFilter === p && (
              <motion.div
                layoutId="platform-pill"
                className="absolute inset-0 rounded-lg bg-accent/20 border border-accent/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{p === "all" ? "Alle" : p}</span>
          </button>
        ))}
      </motion.div>

      {/* ── Sub Filter (appears when platform selected) ── */}
      <AnimatePresence>
        {platformFilter !== "all" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-secondary/30 border border-border/50">
              <button
                onClick={() => setSubFilter("none")}
                className={`relative text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${
                  subFilter === "none" ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {subFilter === "none" && (
                  <motion.div layoutId="sub-pill" className="absolute inset-0 rounded-lg bg-accent/20 border border-accent/30" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10">Alle</span>
              </button>
              {SUB_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSubFilter(subFilter === f.value ? "none" : f.value)}
                  className={`relative text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${
                    subFilter === f.value ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {subFilter === f.value && (
                    <motion.div layoutId="sub-pill" className="absolute inset-0 rounded-lg bg-accent/20 border border-accent/30" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10">{f.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <div className="input-gold-shimmer rounded-lg">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Model suchen…"
              className="pl-9 bg-secondary/50 border-transparent text-sm h-9"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Model-Liste (collapsible) ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn("glass-card rounded-xl overflow-hidden", !modelListOpen && "border-b-0")}
      >
        <button
          onClick={() => setModelListOpen(!modelListOpen)}
          className="w-full px-4 py-3 flex items-center gap-2.5 hover:bg-secondary/20 transition-colors"
        >
          <ChevronDown className={`h-4 w-4 text-accent transition-transform duration-200 ${!modelListOpen ? "-rotate-90" : ""}`} />
          <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <List className="h-3.5 w-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground tracking-wide">Alle Models</h2>
          <Badge variant="outline" className="ml-auto text-[10px] border-accent/30 text-accent tabular-nums">
            {filteredAccounts.length}
          </Badge>
        </button>
        <AnimatePresence initial={false}>
          {modelListOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden border-t border-border"
            >
              <ScrollArea className="max-h-[320px]">
                <div className="p-2 space-y-0.5">
                  {filteredAccounts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Keine Models gefunden.</p>
                  )}
                  <AnimatePresence mode="popLayout">
                    {filteredAccounts.map((acc, i) => {
                      const dash = getDashboard(acc.id);
                      const allSubmitted = dash?.fourbased_submitted && dash?.maloum_submitted && dash?.brezzels_submitted;
                      const isSelected = acc.id === selectedAccountId;
                      return (
                        <motion.div
                          key={acc.id}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ duration: 0.2, delay: i * 0.02 }}
                          onClick={() => { setSelectedAccountId(acc.id); setModelListOpen(false); }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "bg-accent/10 gold-border-glow"
                              : "hover:bg-secondary/60 border border-transparent"
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            allSubmitted
                              ? "bg-accent/15 text-accent"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {acc.account_email.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{acc.account_email}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {acc.account_domain && `${acc.account_domain} · `}{acc.platform}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                              {acc.platform}
                            </span>
                            <ChevronRight className={`h-3.5 w-3.5 transition-colors ${isSelected ? "text-accent" : "text-muted-foreground/40"}`} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      {/* ── Detail View ── */}
      <AnimatePresence mode="wait">
        {selectedAccountId && !loading && (
          <motion.div
            key={selectedAccountId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Selected model header */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center text-sm font-bold text-accent gold-glow">
                {selectedAccount?.account_email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedAccount?.account_email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedAccount?.account_domain && `${selectedAccount.account_domain} · `}{selectedAccount?.platform}
                </p>
              <Button
                size="sm"
                variant="outline"
                onClick={generateModelLogin}
                disabled={modelLoginLoading}
                className="shrink-0 text-xs gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
              >
                <KeyRound className="h-3 w-3" />
                {modelLoginLoading ? "Wird erstellt…" : "Login generieren"}
              </Button>
              </div>
            </div>

            {/* Model Login Credentials Dialog */}
            <Dialog open={modelLoginDialog} onOpenChange={setModelLoginDialog}>
              <DialogContent className="glass-card border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Model-Login erstellt</DialogTitle>
                </DialogHeader>
                {modelLoginCreds && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Sende diese Zugangsdaten an das Model. Das Passwort wird nur einmal angezeigt!</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">E-Mail</p>
                          <p className="text-sm font-mono text-foreground truncate">{modelLoginCreds.email}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { navigator.clipboard.writeText(modelLoginCreds.email); toast.success("Kopiert!"); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">Passwort</p>
                          <p className="text-sm font-mono text-foreground truncate">{showLoginPassword ? modelLoginCreds.password : "••••••••••••"}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                          {showLoginPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { navigator.clipboard.writeText(modelLoginCreds.password); toast.success("Kopiert!"); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Login-URL: <span className="text-foreground font-mono">{window.location.origin}/model/login</span></p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Section icon={TrendingUp} title="Einnahmen (manuell)" delay={0.05}>
              <div className="space-y-4">
                {/* Big golden number – total */}
                <div className="text-center py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Gesamtumsatz</p>
                  <p className="text-4xl font-black text-gold-gradient tabular-nums">
                    <AnimatedGoldValue value={effectiveMonthly} suffix={` ${currency}`} />
                  </p>
                </div>

                {/* Currency selector */}
                <div className="flex justify-end">
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-[100px] text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Per-platform revenue inputs */}
                <div className="space-y-2">
                  {([
                    { label: "4Based", value: fourbasedRevenue, onChange: setFourbasedRevenue },
                    { label: "Maloum", value: maloumRevenue, onChange: setMaloumRevenue },
                    { label: "Brezzels", value: brezzelsRevenue, onChange: setBrezzelsRevenue },
                  ] as const).map(p => (
                    <div key={p.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                      <span className="text-xs font-medium text-foreground w-16 shrink-0">{p.label}</span>
                      <div className="flex-1 input-gold-shimmer rounded-lg">
                        <Input
                          type="number"
                          value={p.value || ""}
                          onChange={e => p.onChange(Number(e.target.value) || 0)}
                          className="h-9 text-center text-sm font-semibold border-transparent"
                          placeholder="0"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 shrink-0">{currency}</span>
                    </div>
                  ))}
                </div>

                {/* Payout calculation */}
                {revenuePercentage > 0 && effectiveMonthly > 0 && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-center space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Verdienst Model ({revenuePercentage}%)
                      </p>
                      <p className="text-2xl font-bold text-accent tabular-nums">
                        <AnimatedGoldValue value={Math.round(effectiveMonthly * revenuePercentage / 100)} suffix={` ${currency}`} />
                      </p>
                    </div>

                    {/* Per-platform payout breakdown */}
                    {totalPlatformRevenue > 0 && (
                      <div className="rounded-lg bg-secondary/20 border border-border/40 p-2.5 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Aufschlüsselung Payout</p>
                        {fourbasedRevenue > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">4Based</span>
                            <span className="font-mono text-foreground">{Math.round(fourbasedRevenue * revenuePercentage / 100).toLocaleString("de-DE")} {currency}</span>
                          </div>
                        )}
                        {maloumRevenue > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Maloum</span>
                            <span className="font-mono text-foreground">{Math.round(maloumRevenue * revenuePercentage / 100).toLocaleString("de-DE")} {currency}</span>
                          </div>
                        )}
                        {brezzelsRevenue > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Brezzels</span>
                            <span className="font-mono text-foreground">{Math.round(brezzelsRevenue * revenuePercentage / 100).toLocaleString("de-DE")} {currency}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>

            {/* Vertrag */}
            <Section icon={FileText} title="Vertrag Upload" delay={0.05}>
              <div className="space-y-3">
                {contractPath ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1 font-medium">{contractPath.split("/").pop()}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-accent" onClick={downloadContract}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={deleteContract}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Noch kein Vertrag hochgeladen.</p>
                )}
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <Upload className="h-4 w-4 text-accent" />}
                  <span className="text-xs font-medium text-accent">{uploading ? "Wird hochgeladen…" : "PDF hochladen"}</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={handleContractUpload} disabled={uploading} />
                </label>
              </div>
            </Section>

            {/* BotDMs & Setup – Google Sheets style table */}
            <Section icon={CheckCircle2} title="BotDMs & Setup" delay={0.1}>
              {(() => {
                // Build rows: all accounts with their dashboard data
                const allAccountRows = accounts.map(acc => {
                  const dash = getDashboard(acc.id);
                  const botMsg = getBotMessage(acc.id);
                  return { acc, dash, botMsg };
                });

                return <BotDmTable
                  rows={allAccountRows}
                  allDashboards={allDashboards}
                  onToggle={async (accountId: string, field: string, value: boolean) => {
                    // Find or create dashboard row
                    const dash = allDashboards.find(d => d.account_id === accountId);
                    if (dash) {
                      await supabase.from("model_dashboard").update({ [field]: value }).eq("id", dash.id);
                    } else {
                      await supabase.from("model_dashboard").insert({ account_id: accountId, [field]: value });
                    }
                    await loadAllDashboards();
                    // If it's the selected account, reload its data too
                    if (accountId === selectedAccountId) {
                      await loadModelData(accountId);
                    }
                  }}
                />;
              })()}
            </Section>

            {/* Notizen */}
            <Section icon={StickyNote} title="Model Daten" delay={0.15}>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notizen / Freitext</Label>
                <div className="input-gold-shimmer rounded-lg">
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Notizen zum Model…"
                    className="bg-secondary/40 border-transparent min-h-[100px] text-sm"
                  />
                </div>
              </div>
            </Section>

            {/* Prozente */}
            <Section icon={Percent} title="Prozente einstellen" delay={0.2}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Anteil:</span>
                  <div className="gold-gradient-border-animated rounded-lg px-3 py-1">
                    <span className="text-sm font-bold text-gold-gradient tabular-nums">{revenuePercentage}%</span>
                  </div>
                </div>
                <Slider value={[revenuePercentage]} onValueChange={([v]) => setRevenuePercentage(v)} min={0} max={100} step={1} />
              </div>
            </Section>

            {/* Crypto */}
            <Section icon={Wallet} title="Crypto / Auszahlung" delay={0.25}>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Crypto-Infos (Adresse, Coin, Netzwerk, Notizen…)</Label>
                <div className="input-gold-shimmer rounded-lg">
                  <Textarea
                    value={cryptoAddress}
                    onChange={e => setCryptoAddress(e.target.value)}
                    placeholder="z.B. USDT TRC20 – TXyz…&#10;Netzwerk: Tron&#10;Weitere Infos…"
                    className="bg-secondary/40 border-transparent text-sm min-h-[100px]"
                  />
                </div>
              </div>
            </Section>

            {/* Save */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={saveData}
                disabled={saving}
                className="w-full gap-2 h-11 text-sm font-semibold bg-accent hover:bg-accent/90 text-accent-foreground transition-all hover:scale-[1.01] active:scale-[0.99] gold-glow"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Alles speichern
              </Button>
            </motion.div>



            {/* Credit Note */}
            <Section icon={FileDown} title="Credit Note erstellen" delay={0.4}>
              <CreditNoteForm
                suggestedAmount={gutschriftFromRevenue}
                providerName={selectedAccount?.account_email || ""}
                accountId={selectedAccountId}
                cryptoAddress={cryptoAddress}
                revenuePercentage={revenuePercentage}
                currency={currency}
                platformRevenue={{
                  fourbased: fourbasedRevenue,
                  maloum: maloumRevenue,
                  brezzels: brezzelsRevenue,
                }}
              />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
