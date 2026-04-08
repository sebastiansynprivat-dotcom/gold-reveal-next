import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Send, Bell, BellOff, Search, KeyRound, Plus, Package, Trash2, RefreshCw, Target, TrendingUp, DollarSign, Calendar as CalendarIcon, CalendarDays, CalendarRange, Filter, MessageSquare, Star, AlertTriangle, Bot, Save, Power, Copy, Smartphone, Percent, ChevronRight, ChevronDown, Shield, UserPlus, UserMinus, Check, XCircle, Sparkles, Loader2, ExternalLink, Brain, CheckCircle2, Clock, Repeat, Pause, Play, FolderOpen, Settings, Building2, Hash, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import ChatterStatsCard from "@/components/ChatterStatsCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ModelDashboardTab from "@/components/ModelDashboardTab";
import ChatterDashboardTab from "@/components/ChatterDashboardTab";
import GoldParticles from "@/components/GoldParticles";
import SubAdminManager from "@/components/SubAdminManager";
import { useAdminRole } from "@/hooks/useAdminRole";

// Extract folder ID from a full Google Drive URL or return as-is if already an ID
const extractDriveFolderId = (input: string): string => {
  if (!input) return "";
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input;
};

// Revoke Drive access for accounts being unassigned
const revokeDriveAccess = async (accountIds: string[], userId: string) => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) return;

    // Get accounts with drive_folder_id
    const { data: accs } = await supabase
      .from("accounts")
      .select("id, drive_folder_id")
      .in("id", accountIds);

    const withDrive = accs?.filter(a => a.drive_folder_id) || [];
    if (withDrive.length === 0) return;

    // Get user's email
    const { data: userData } = await supabase.auth.admin?.getUserById?.(userId) || {};
    // Fallback: get email from profiles or auth via edge function
    // We'll call the unshare-drive function which handles it server-side
    for (const acc of withDrive) {
      try {
        await supabase.functions.invoke("unshare-drive", {
          body: { folder_id: acc.drive_folder_id, user_id: userId },
        });
      } catch (e) {
        console.error("Drive unshare failed:", e);
      }
    }
  } catch (e) {
    console.error("revokeDriveAccess error:", e);
  }
};

// Platform colors – premium aesthetic matching gold/dark theme
const PLATFORM_COLORS = {
  maloum: "#d4af37",    // gold
  brezzels: "#3b82f6",  // brand blue
  "4based": "#22d3ee",  // cyan
};

// Generate 90 days of fictional revenue data with upward trend
const generateFakeRevenueData = () => {
  const data = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const day = 89 - i;
    const trend = day * 12;
    data.push({
      dateObj: new Date(date),
      date: date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      maloum: 1800 + trend + Math.floor(Math.random() * 300 - 150),
      brezzels: 1500 + trend + Math.floor(Math.random() * 250 - 125),
      "4based": 1600 + trend + Math.floor(Math.random() * 280 - 140),
    });
  }
  return data;
};

type TimeFilter = "heute" | "gestern" | "7" | "30" | "90" | "custom";
type ChatterFilter = "alle" | "open_2d" | "top_tag" | "top_woche" | "top_monat" | "no_telegram" | "no_push" | "no_revenue_7d" | "new_2d";

// Reuse hash function from ChatterStatsCard for consistent fake stats
const hashCodeAdmin = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getChatterFakeStats = (userId: string) => {
  const h = hashCodeAdmin(userId);
  const today = 80 + (h % 200);
  const week = today * 5 + (h % 500);
  const month = week * 3.5 + (h % 2000);
  const avgOpenDays = 1 + (h % 5);
  return { today, week: Math.round(week), month: Math.round(month), avgOpenDays };
};

interface LoginStats {
  today: number;
  week: number;
  month: number;
}

interface ChatterProfile {
  user_id: string;
  group_name: string;
  telegram_id: string;
  created_at: string;
  account_email?: string;
  account_password?: string;
  account_domain?: string;
  assigned_accounts?: AccountEntry[];
}

interface AccountEntry {
  id: string;
  platform: string;
  account_email: string;
  account_password: string;
  account_domain: string;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
  is_manual?: boolean;
  drive_folder_id?: string | null;
  folder_name?: string | null;
  model_active?: boolean;
  model_language?: string;
  model_agency?: string;
}

function AnimatedNumber({ value, className, suffix = "€" }: { value: number; className?: string; suffix?: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const start = prevValue.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      el.textContent = current.toLocaleString("de-DE") + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prevValue.current = end;
  }, [value, suffix]);

  return <span ref={spanRef} className={className}>{value.toLocaleString("de-DE")}{suffix}</span>;
}

function getBillingPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  // Billing for previous month, due on 20th of current month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const isDue = now.getDate() >= 20;
  const periodKey = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;
  const periodLabel = new Date(prevYear, prevMonth).toLocaleString("de-DE", { month: "long", year: "numeric" });
  // The billing period covers the previous month (1st to last day)
  const periodStart = new Date(prevYear, prevMonth, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59); // last day of prev month
  return { periodKey, periodLabel, isDue, periodStart, periodEnd };
}

const BILLING_STORAGE_KEY = "admin-billing-tracker";

function loadBillingStatus(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(BILLING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function ChatterOverviewTab({ assignments, assignmentsLoading, chatters }: { assignments: any[]; assignmentsLoading: boolean; chatters: ChatterProfile[] }) {
  const [overviewFilter, setOverviewFilter] = useState<"alle" | "aktiv" | "inaktiv" | "billing_due" | "billing_done">("alle");
  const [chatterSearch, setChatterSearch] = useState("");
  const [collapsedAgencies, setCollapsedAgencies] = useState<Record<string, boolean>>({ shex: false, syn: false });
  const toggleAgency = (key: string) => setCollapsedAgencies(prev => ({ ...prev, [key]: !prev[key] }));
  const [billingStatus, setBillingStatus] = useState<Record<string, boolean>>(loadBillingStatus);

  const billing = useMemo(() => getBillingPeriod(), []);

  const toggleBilling = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${userId}_${billing.periodKey}`;
    setBillingStatus(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // A chatter is billing-eligible if they were assigned before or during the billing period
  // (i.e. assigned_at <= periodEnd) and still active or unassigned after periodStart
  const isBillingEligible = (assignedAt: Date | null, unassignedAt: Date | null) => {
    if (!assignedAt) return false;
    // Must have been assigned before end of billing period
    if (assignedAt > billing.periodEnd) return false;
    // If unassigned, must have been active during at least part of the period
    if (unassignedAt && unassignedAt < billing.periodStart) return false;
    return true;
  };
  const isBillingDone = (userId: string) => billingStatus[`${userId}_${billing.periodKey}`] || false;

  if (assignmentsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  const grouped: Record<string, { account_email: string; account_domain: string; platform: string; model_language: string; model_agency: string; entries: any[] }> = {};
  for (const a of assignments) {
    const key = a.account_id;
    if (!grouped[key]) {
      grouped[key] = {
        account_email: a.accounts?.account_email || "–",
        account_domain: a.accounts?.account_domain || "",
        platform: a.accounts?.platform || "",
        model_language: (a.accounts as any)?.model_language || "de",
        model_agency: (a.accounts as any)?.model_agency || "shex",
        entries: [],
      };
    }
    const chatter = chatters.find(c => c.user_id === a.user_id);
    const name = chatter?.group_name && chatter.group_name.trim() !== "" ? chatter.group_name : chatter?.telegram_id || `User ${a.user_id?.slice(0, 6)}`;
    const assignedAt = a.assigned_at ? new Date(a.assigned_at) : null;
    const unassignedAt = a.unassigned_at ? new Date(a.unassigned_at) : null;
    const isActive = !a.unassigned_at;
    let duration = "";
    if (assignedAt) {
      const end = unassignedAt || new Date();
      const diffMs = end.getTime() - assignedAt.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      duration = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    }
    const billingEligible = isBillingEligible(assignedAt, unassignedAt);
    grouped[key].entries.push({ ...a, name, assignedAt, unassignedAt, isActive, duration, billingEligible });
  }

  // Apply status filter
  if (overviewFilter === "aktiv" || overviewFilter === "inaktiv") {
    const keepActive = overviewFilter === "aktiv";
    for (const key of Object.keys(grouped)) {
      grouped[key].entries = grouped[key].entries.filter((e: any) => e.isActive === keepActive);
      if (grouped[key].entries.length === 0) delete grouped[key];
    }
  }

  // Apply billing filter (only billing-eligible entries)
  if (overviewFilter === "billing_due" || overviewFilter === "billing_done") {
    const wantDone = overviewFilter === "billing_done";
    for (const key of Object.keys(grouped)) {
      grouped[key].entries = grouped[key].entries.filter((e: any) => {
        if (!e.billingEligible) return false;
        return isBillingDone(e.user_id) === wantDone;
      });
      if (grouped[key].entries.length === 0) delete grouped[key];
    }
  }

  // Apply search filter
  if (chatterSearch.trim()) {
    const q = chatterSearch.trim().toLowerCase();
    for (const key of Object.keys(grouped)) {
      grouped[key].entries = grouped[key].entries.filter((e: any) => e.name?.toLowerCase().includes(q));
      if (grouped[key].entries.length === 0) delete grouped[key];
    }
  }

  // Sort entries within each account
  Object.values(grouped).forEach(g => {
    g.entries.sort((a: any, b: any) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return (b.assignedAt?.getTime() || 0) - (a.assignedAt?.getTime() || 0);
    });
  });

  // Group by agency
  const byAgency: Record<string, string[]> = { shex: [], syn: [] };
  for (const accId of Object.keys(grouped)) {
    const agency = grouped[accId].model_agency === "syn" ? "syn" : "shex";
    byAgency[agency].push(accId);
  }

  // Sort accounts within each agency: active first, then by email
  for (const agency of Object.keys(byAgency)) {
    byAgency[agency].sort((a, b) => {
      const aActive = grouped[a].entries.some((e: any) => e.isActive);
      const bActive = grouped[b].entries.some((e: any) => e.isActive);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return grouped[a].account_email.localeCompare(grouped[b].account_email);
    });
  }

  // Count billing stats – only for billing-eligible entries (assigned during billing period)
  const allEligibleEntries = Object.values(grouped).flatMap(g => g.entries.filter((e: any) => e.billingEligible));
  const billingDoneCount = allEligibleEntries.filter((e: any) => isBillingDone(e.user_id)).length;
  const billingDueCount = allEligibleEntries.length - billingDoneCount;

  const filterOptions = [
    { key: "alle" as const, label: "Alle" },
    { key: "aktiv" as const, label: "Aktiv" },
    { key: "inaktiv" as const, label: "Inaktiv" },
    { key: "billing_due" as const, label: `Abr. fällig (${billingDueCount})`, highlight: billingDueCount > 0 },
    { key: "billing_done" as const, label: `Abr. erledigt (${billingDoneCount})` },
  ];

  const getAgencyStats = (agency: string) => {
    const accIds = byAgency[agency] || [];
    let totalActive = 0;
    for (const accId of accIds) {
      totalActive += grouped[accId].entries.filter((e: any) => e.isActive).length;
    }
    return { totalAccounts: accIds.length, totalActive };
  };

  const agencies = [
    { key: "shex", label: "SheX", colorClass: "text-accent border-accent/30 bg-accent/10" },
    { key: "syn", label: "SYN", colorClass: "text-primary border-primary/30 bg-primary/10" },
  ];

  return (
    <div className="space-y-4">
      {/* Billing period info */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs text-muted-foreground">Abrechnungszeitraum:</span>
          <span className="text-xs font-semibold text-foreground">{billing.periodLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {billing.isDue ? (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
              Fällig seit {new Date().getDate() - 20 + 1}. Tag
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Fällig ab 20. {new Date().toLocaleString("de-DE", { month: "long" })}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">{billingDoneCount}/{allEligibleEntries.length} erledigt</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg border border-border/50 w-fit relative flex-wrap">
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setOverviewFilter(opt.key)}
              className="relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors z-10"
            >
              <span className={cn(
                overviewFilter === opt.key ? "text-accent" : "text-muted-foreground hover:text-foreground",
                "highlight" in opt && opt.highlight && overviewFilter !== opt.key && "text-amber-400"
              )}>
                {opt.label}
              </span>
              {overviewFilter === opt.key && (
                <motion.div
                  layoutId="activeOverviewFilter"
                  className="absolute inset-0 bg-accent/15 rounded-md shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="relative input-gold-shimmer rounded-xl">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Chatter suchen…"
            value={chatterSearch}
            onChange={e => setChatterSearch(e.target.value)}
            className="h-8 w-48 pl-8 text-xs bg-secondary/30 border-transparent"
          />
        </div>
      </div>

      {agencies.map(({ key: agencyKey, label, colorClass }) => {
        const { totalAccounts, totalActive } = getAgencyStats(agencyKey);
        const accIds = byAgency[agencyKey] || [];

        return (
          <section key={agencyKey} className="glass-card rounded-xl overflow-hidden">
            <button
              onClick={() => toggleAgency(agencyKey)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", collapsedAgencies[agencyKey] && "-rotate-90")} />
                <span className={cn("text-sm font-bold px-2 py-0.5 rounded border", colorClass)}>{label}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{totalAccounts} Accounts</Badge>
              </div>
              {totalActive > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  {totalActive} aktiv
                </Badge>
              )}
            </button>

            <AnimatePresence initial={false}>
              {!collapsedAgencies[agencyKey] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {accIds.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground border-t border-border/30">
                      Keine Zuweisungen für {label}.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30 border-t border-border/30">
                      {accIds.map(accId => {
                        const g = grouped[accId];
                        const activeCount = g.entries.filter((e: any) => e.isActive).length;
                        return (
                          <div key={accId}>
                            <div className="px-4 py-2 bg-secondary/20 flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-foreground">{g.account_email}</span>
                                {g.account_domain && (
                                  <span className="text-[10px] text-muted-foreground">({g.account_domain})</span>
                                )}
                                {g.platform && (
                                  <span className="text-[10px] bg-secondary/50 text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 capitalize">
                                    {g.platform}
                                  </span>
                                )}
                                <span className="text-[10px] bg-secondary/50 text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">
                                  {g.model_language === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
                                </span>
                              </div>
                              {activeCount > 0 && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                  {activeCount} aktiv
                                </Badge>
                              )}
                            </div>
                            <div className="divide-y divide-border/50">
                              {g.entries.map((entry: any) => {
                                const done = isBillingDone(entry.user_id);
                                return (
                                  <div key={entry.id} className="px-6 py-2 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                      <div className={cn("w-2 h-2 rounded-full", entry.isActive ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30")} />
                                      <span className="font-medium text-foreground text-xs">{entry.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      {/* Billing checkbox – only for billing-eligible entries */}
                                      {entry.billingEligible && (
                                        <button
                                          onClick={(e) => toggleBilling(entry.user_id, e)}
                                          className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                                            done
                                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                              : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                          )}
                                          title={done ? "Abrechnung erledigt" : "Abrechnung fällig – klicken zum Abhaken"}
                                        >
                                          {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                          {done ? "Erledigt" : "Fällig"}
                                        </button>
                                      )}
                                      <span>{entry.assignedAt ? format(entry.assignedAt, "dd.MM.yyyy HH:mm") : "–"}</span>
                                      <span>→</span>
                                      {entry.isActive ? (
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Aktiv</Badge>
                                      ) : (
                                        <span>{entry.unassignedAt ? format(entry.unassignedAt, "dd.MM.yyyy HH:mm") : "–"}</span>
                                      )}
                                      <span className="text-accent font-medium ml-1">{entry.duration}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminRole();
  const [chatters, setChatters] = useState<ChatterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pushTarget, setPushTarget] = useState<ChatterProfile | null>(null);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Account pool state
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [accountPoolOpen, setAccountPoolOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  
  const [assigning, setAssigning] = useState(false);
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [assignResult, setAssignResult] = useState<{ assigned: number; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatterProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<ChatterProfile | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [reassignOpenFolder, setReassignOpenFolder] = useState<string | null>(null);
  const [reassignPoolSectionOpen, setReassignPoolSectionOpen] = useState(false);
  const [reassignManualSectionOpen, setReassignManualSectionOpen] = useState(false);
  const [deletingPool, setDeletingPool] = useState(false);
  const [deletePoolConfirm, setDeletePoolConfirm] = useState(false);
  const [offers, setOffers] = useState<{ name: string; target_path: string }[]>([]);
  const [quizRoutes, setQuizRoutes] = useState<{ id: string; name: string; target_path: string; free_count: number; is_active: boolean }[]>([]);
  const [offerVerteilungOpen, setOfferVerteilungOpen] = useState(false);
  const [manualSectionOpen, setManualSectionOpen] = useState(false);
  const [manualPoolOpen, setManualPoolOpen] = useState(false);
  const [selectedManualPlatform, setSelectedManualPlatform] = useState("");
  const [newManualPlatformOpen, setNewManualPlatformOpen] = useState(false);
  const [newManualPlatformName, setNewManualPlatformName] = useState("");
  const [manualAccEmail, setManualAccEmail] = useState("");
  const [manualAccPassword, setManualAccPassword] = useState("");
  const [manualAccDomain, setManualAccDomain] = useState("");
  const [manualAccDriveFolder, setManualAccDriveFolder] = useState("");
  const [manualAccLanguage, setManualAccLanguage] = useState<"de" | "en">("de");
  const [manualAccModelActive, setManualAccModelActive] = useState(true);
  const [manualAccModelAgency, setManualAccModelAgency] = useState<"shex" | "syn">("shex");
  const [manualAccFolder, setManualAccFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [customFolders, setCustomFolders] = useState<Record<string, string[]>>({});
  const [customSubfolders, setCustomSubfolders] = useState<Record<string, string[]>>({});
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  const [folderColors, setFolderColors] = useState<Record<string, string>>({});
  const [colorPickerFolder, setColorPickerFolder] = useState<string | null>(null);
  const [moveToFolderAcc, setMoveToFolderAcc] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);
  const [addingManual, setAddingManual] = useState(false);
  const [deleteManualPoolConfirm, setDeleteManualPoolConfirm] = useState(false);
  const [deletingManualPool, setDeletingManualPool] = useState(false);
  const [accountPoolSectionOpen, setAccountPoolSectionOpen] = useState(false);
   const [manualAccountSearch, setManualAccountSearch] = useState("");
  const [poolSearchQuery, setPoolSearchQuery] = useState("");
  const [reassignSearchQuery, setReassignSearchQuery] = useState("");
  const [goalTarget, setGoalTarget] = useState<ChatterProfile | null>(null);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [expandedChatter, setExpandedChatter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("einnahmen");
  const [settingsIssuer, setSettingsIssuer] = useState({ name: "", address: "", vat_id: "", kvk: "" });
  const [settingsIssuerId, setSettingsIssuerId] = useState<string | null>(null);
  const [settingsIssuerLoaded, setSettingsIssuerLoaded] = useState(false);
  const [settingsSeqValue, setSettingsSeqValue] = useState<number | null>(null);
  const [settingsSeqLoaded, setSettingsSeqLoaded] = useState(false);
  const [settingsIssuerSaving, setSettingsIssuerSaving] = useState(false);
  const settingsIssuerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const activeTabRef = useRef(activeTab);
  const [modelRequests, setModelRequests] = useState<any[]>([]);
  const [modelRequestsLoaded, setModelRequestsLoaded] = useState(false);
  const [requestFilter, setRequestFilter] = useState<"all" | "pending" | "accepted" | "in_progress" | "rejected">("all");
  const [contentLinkFilter, setContentLinkFilter] = useState<"all" | "with_link" | "without_link">("all");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [notifHistoryLoaded, setNotifHistoryLoaded] = useState(false);
  const [notifHistoryOpen, setNotifHistoryOpen] = useState(false);
  const [notifSendOpen, setNotifSendOpen] = useState(false);
  const [schedSectionOpen, setSchedSectionOpen] = useState(false);

  // Scheduled notifications state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedBody, setSchedBody] = useState("");
  const [schedFrequency, setSchedFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedWeekday, setSchedWeekday] = useState(1);
  const [schedDayOfMonth, setSchedDayOfMonth] = useState(1);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedDeleteConfirm, setSchedDeleteConfirm] = useState<string | null>(null);
  const [schedListOpen, setSchedListOpen] = useState(false);

  // Notification templates state
  const [notifTemplates, setNotifTemplates] = useState<{ id: string; template_key: string; label: string; title: string; body: string }[]>([]);
  const [notifTemplatesLoaded, setNotifTemplatesLoaded] = useState(false);
  const [templatesSectionOpen, setTemplatesSectionOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateEdits, setTemplateEdits] = useState<Record<string, { title: string; body: string }>>({});
  const [templateSaving, setTemplateSaving] = useState<string | null>(null);
  const [chatterFilter, setChatterFilter] = useState<ChatterFilter>("alle");
  const [platformFilters, setPlatformFilters] = useState<Set<string>>(new Set());
  const [filterTelegram, setFilterTelegram] = useState<boolean | null>(null);
  const [filterPush, setFilterPush] = useState<boolean | null>(null);
  const [filterPwa, setFilterPwa] = useState<boolean | null>(null);
  const [botMessages, setBotMessages] = useState<Record<string, { message: string; followUp: string; isActive: boolean; saving: boolean }>>({});
  const [botMessagesLoaded, setBotMessagesLoaded] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [savedBotState, setSavedBotState] = useState<Record<string, { message: string; followUp: string; isActive: boolean }>>({});
  const [botFilter, setBotFilter] = useState<"alle" | "missing" | "active" | "inactive">("alle");
  const [botPlatformFilter, setBotPlatformFilter] = useState<string>("alle");
  const [botSearch, setBotSearch] = useState("");
  const [setupDashboards, setSetupDashboards] = useState<any[]>([]);
  const [setupDashboardsLoaded, setSetupDashboardsLoaded] = useState(false);
  const [setupSearch, setSetupSearch] = useState("");
  const [setupPlatform, setSetupPlatform] = useState<"all" | "4Based" | "Maloum" | "Brezzels">("all");
  const [setupStatusFilter, setSetupStatusFilter] = useState<"alle" | "botdm_missing" | "setup_missing" | "massdm_missing" | "bot_active" | "bot_inactive">("alle");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30");
  const [newPlatformOpen, setNewPlatformOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [poolFilter, setPoolFilter] = useState<"alle" | "frei" | "vergeben">("alle");
  const [manualFilter, setManualFilter] = useState<"alle" | "frei" | "vergeben">("alle");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [loginStats, setLoginStats] = useState<Record<string, LoginStats>>({});
  const [pushUsers, setPushUsers] = useState<Set<string>>(new Set());
  const [revenueUsers, setRevenueUsers] = useState<Set<string>>(new Set());
  const [pwaUsers, setPwaUsers] = useState<Set<string>>(new Set());
  const [revenueBoost, setRevenueBoost] = useState(0);

  // Admin management state
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);
  const [adminList, setAdminList] = useState<{ user_id: string; email: string; has_totp: boolean; role: string }[]>([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removeAdminConfirm, setRemoveAdminConfirm] = useState<string | null>(null);
  const [newAdminCredentials, setNewAdminCredentials] = useState<{ email: string; password: string } | null>(null);
  const [chatterSummaries, setChatterSummaries] = useState<Record<string, { summary: string; date: string }>>({});
  const [summaryLoading, setSummaryLoading] = useState<Record<string, boolean>>({});
  const [showAiSummaries, setShowAiSummaries] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  // KI Prompt state (Dashboard Chat)
  const [kiPrompt, setKiPrompt] = useState("");
  const [kiPromptLoading, setKiPromptLoading] = useState(false);
  const [kiPromptSaving, setKiPromptSaving] = useState(false);
  const [kiPromptLoaded, setKiPromptLoaded] = useState(false);
  const [kiPromptSaved, setKiPromptSaved] = useState(true);
  const [kiPromptOriginal, setKiPromptOriginal] = useState("");

  // KI Prompt state (Chat-Analysen)
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [analysisPromptLoading, setAnalysisPromptLoading] = useState(false);
  const [analysisPromptSaving, setAnalysisPromptSaving] = useState(false);
  const [analysisPromptOriginal, setAnalysisPromptOriginal] = useState("");

  // Collapsible state for prompt sections
  const [chatPromptOpen, setChatPromptOpen] = useState(true);
  const [analysisPromptOpen, setAnalysisPromptOpen] = useState(false);

  // Chatter checklist state (persisted in localStorage)
  const [checkedChatters, setCheckedChatters] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("admin_checked_chatters");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleChatterCheck = useCallback((userId: string) => {
    setCheckedChatters(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      localStorage.setItem("admin_checked_chatters", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const resetCheckedChatters = useCallback(() => {
    setCheckedChatters(new Set());
    localStorage.removeItem("admin_checked_chatters");
    toast.success("Alle Häkchen zurückgesetzt!");
  }, []);

  // Keep activeTabRef in sync
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const allRevenueData = useMemo(() => generateFakeRevenueData(), []);

  const filteredRevenueData = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);

    if (timeFilter === "custom" && customFrom && customTo) {
      const from = startOfDay(customFrom);
      const to = new Date(customTo);
      to.setHours(23, 59, 59);
      return allRevenueData.filter((d) => d.dateObj >= from && d.dateObj <= to);
    }

    let daysBack = 30;
    if (timeFilter === "heute") daysBack = 0;
    else if (timeFilter === "gestern") daysBack = 1;
    else if (timeFilter === "7") daysBack = 7;
    else if (timeFilter === "90") daysBack = 90;

    if (timeFilter === "heute") {
      return allRevenueData.filter((d) => startOfDay(d.dateObj).getTime() === today.getTime());
    }
    if (timeFilter === "gestern") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return allRevenueData.filter((d) => startOfDay(d.dateObj).getTime() === yesterday.getTime());
    }

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - daysBack);
    return allRevenueData.filter((d) => d.dateObj >= cutoff);
  }, [allRevenueData, timeFilter, customFrom, customTo]);

  const platformTotals = useMemo(() => ({
    maloum: filteredRevenueData.reduce((s, d) => s + d.maloum, 0),
    brezzels: filteredRevenueData.reduce((s, d) => s + d.brezzels, 0),
    "4based": filteredRevenueData.reduce((s, d) => s + d["4based"], 0),
  }), [filteredRevenueData]);

  const grandTotal = platformTotals.maloum + platformTotals.brezzels + platformTotals["4based"] + revenueBoost;

  const filterLabels: Record<TimeFilter, string> = {
    heute: "Heute", gestern: "Gestern", "7": "7 Tage", "30": "30 Tage", "90": "90 Tage", custom: "Zeitraum",
  };

  const loadPushUsers = async () => {
    const { data } = await supabase.from("push_subscriptions").select("user_id");
    if (data) {
      setPushUsers(new Set(data.map((d) => d.user_id).filter(Boolean) as string[]));
    }
  };

  const loadRevenueUsers = async () => {
    const { data } = await supabase.from("daily_revenue").select("user_id").gt("amount", 0);
    if (data) {
      setRevenueUsers(new Set(data.map((d) => d.user_id)));
    }
  };

  useEffect(() => {
    loadChatters();
    loadAccounts();
    loadOffers();
    loadLoginStats();
    loadPushUsers();
    loadRevenueUsers();
    if (isSuperAdmin) loadAdmins();

    // Realtime subscription for live revenue updates
    const channel = supabase
      .channel('admin-revenue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_revenue' },
        (payload) => {
          const amount = (payload.new as any)?.amount || 0;
          const oldAmount = (payload.old as any)?.amount || 0;
          const diff = amount - oldAmount;
          if (diff > 0) {
            setRevenueBoost(prev => prev + diff);
            if (activeTabRef.current === 'einnahmen') {
              toast.success(`+${diff}€ Umsatz eingegangen!`, { duration: 3000 });
            }
          }
          loadRevenueUsers();
        }
      )
      .subscribe();

    // Demo: every 5s add random 5-100€
    const demoInterval = setInterval(() => {
      const randomAmount = Math.floor(Math.random() * 96) + 5;
      setRevenueBoost(prev => prev + randomAmount);
      if (activeTabRef.current === 'einnahmen') {
        toast.success(`+${randomAmount}€ Umsatz eingegangen!`, { duration: 2000 });
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(demoInterval);
    };
  }, []);

  // Load cached AI summaries
  const loadChatterSummaries = async () => {
    // Load today's or most recent summaries
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("chatter_summaries")
      .select("user_id, summary, summary_date")
      .order("summary_date", { ascending: false });
    if (data) {
      const map: Record<string, { summary: string; date: string }> = {};
      // Keep only the latest summary per user
      data.forEach((s: any) => { if (!map[s.user_id]) map[s.user_id] = { summary: s.summary, date: s.summary_date }; });
      setChatterSummaries(map);
    }
  };

  // Generate summary for a single chatter
  const generateSummary = async (userId: string) => {
    setSummaryLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-chatter-summary", {
        body: { user_id: userId },
      });
      if (error) throw error;
      // Reload summaries
      await loadChatterSummaries();
      toast.success("AI-Zusammenfassung generiert!");
    } catch (err: any) {
      console.error("Summary generation error:", err);
      toast.error("Fehler beim Generieren der Zusammenfassung");
    } finally {
      setSummaryLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Generate all summaries
  const generateAllSummaries = async () => {
    setGeneratingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-chatter-summary", {
        body: {},
      });
      if (error) throw error;
      await loadChatterSummaries();
      toast.success(`AI-Analysen für alle Chatter generiert!`);
      setShowAiSummaries(true);
    } catch (err: any) {
      console.error("Generate all error:", err);
      toast.error("Fehler beim Generieren der Zusammenfassungen");
    } finally {
      setGeneratingAll(false);
    }
  };

  // Load summaries and refresh accounts when chatter tab is active
  useEffect(() => {
    if (activeTab === "chatter") {
      loadChatterSummaries();
      loadAccounts();
      loadChatters();
    }
  }, [activeTab]);

  const loadKiPrompt = async () => {
    setKiPromptLoading(true);
    setAnalysisPromptLoading(true);
    try {
      const { data } = await supabase
        .from("ai_prompts")
        .select("prompt_key, prompt_text")
        .in("prompt_key", ["system_prompt", "analysis_prompt"]);
      if (data) {
        const sys = data.find((d: any) => d.prompt_key === "system_prompt");
        const ana = data.find((d: any) => d.prompt_key === "analysis_prompt");
        if (sys) { setKiPrompt(sys.prompt_text); setKiPromptOriginal(sys.prompt_text); }
        if (ana) { setAnalysisPrompt(ana.prompt_text); setAnalysisPromptOriginal(ana.prompt_text); }
      }
    } catch {
      toast.error("Fehler beim Laden der KI-Prompts");
    }
    setKiPromptLoading(false);
    setAnalysisPromptLoading(false);
    setKiPromptLoaded(true);
  };

  const saveKiPrompt = async () => {
    setKiPromptSaving(true);
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update({ prompt_text: kiPrompt, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("prompt_key", "system_prompt");
      if (error) throw error;
      toast.success("Dashboard-Chat Prompt gespeichert!");
      setKiPromptSaved(true);
      setKiPromptOriginal(kiPrompt);
    } catch {
      toast.error("Fehler beim Speichern des KI-Prompts");
    }
    setKiPromptSaving(false);
  };

  const saveAnalysisPrompt = async () => {
    setAnalysisPromptSaving(true);
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update({ prompt_text: analysisPrompt, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("prompt_key", "analysis_prompt");
      if (error) throw error;
      toast.success("Chat-Analysen Prompt gespeichert!");
      setAnalysisPromptOriginal(analysisPrompt);
    } catch {
      toast.error("Fehler beim Speichern des Analyse-Prompts");
    }
    setAnalysisPromptSaving(false);
  };

  const loadAdmins = async () => {
    setAdminListLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "list" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        throw new Error(error.message || "Fehler beim Laden der Admins");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAdminList(data?.admins ?? []);
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Laden der Admins");
    } finally {
      setAdminListLoading(false);
    }
  };

  const openAdminSection = () => {
    setAdminSectionOpen(true);
    void loadAdmins();
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "add", email: newAdminEmail.trim() },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        throw new Error(error.message || "Admin konnte nicht hinzugefügt werden");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.created && data?.generated_password) {
        setNewAdminCredentials({ email: data.email, password: data.generated_password });
        toast.success("Neuer Admin erstellt! Zugangsdaten wurden generiert.");
      } else {
        toast.success("Admin hinzugefügt!");
      }

      setNewAdminEmail("");
      await loadAdmins();
    } catch (err: any) {
      toast.error(err.message || "Admin konnte nicht hinzugefügt werden");
    } finally {
      setAddingAdmin(false);
    }
  };

  const removeAdmin = async (targetUserId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "remove", target_user_id: targetUserId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        throw new Error(error.message || "Admin konnte nicht entfernt werden");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Admin entfernt");
      await loadAdmins();
    } catch (err: any) {
      toast.error(err.message || "Admin konnte nicht entfernt werden");
    } finally {
      setRemoveAdminConfirm(null);
    }
  };

  const loadChatters = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, group_name, telegram_id, created_at, account_email, account_password, account_domain, pwa_installed")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden der Chatter");
      setLoading(false);
      return;
    }
    // Enrich chatters with their assigned accounts
    const { data: allAccounts } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true });
    setAccounts((allAccounts as any[] || []) as AccountEntry[]);
    
    const enriched = (data || []).map((c) => ({
      ...c,
      assigned_accounts: ((allAccounts as any[] || []) as AccountEntry[]).filter((a) => a.assigned_to === c.user_id),
    }));
    setChatters(enriched);
    // Track PWA installed users
    const pwaSet = new Set((data || []).filter((c: any) => c.pwa_installed).map((c: any) => c.user_id));
    setPwaUsers(pwaSet);
    setLoading(false);
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true });
    setAccounts((data as any[] || []) as AccountEntry[]);
  };

  const loadOffers = async () => {
    // Load routes with free account counts from RPC
    const { data: routeData } = await supabase.rpc("get_free_account_counts");
    const routes = (routeData || []).map((r: any) => ({
      id: r.route_id,
      name: r.platform_name,
      target_path: r.target_path,
      free_count: Number(r.free_count),
      is_active: true,
    }));
    setOffers(routes.map((d: any) => ({ name: d.name, target_path: d.target_path })));
    setQuizRoutes(routes);
  };

  const loadLoginStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data } = await supabase.from("login_events").select("user_id, logged_in_at");
    if (!data) return;

    const statsMap: Record<string, LoginStats> = {};
    data.forEach((evt: any) => {
      if (!statsMap[evt.user_id]) statsMap[evt.user_id] = { today: 0, week: 0, month: 0 };
      const t = new Date(evt.logged_in_at).toISOString();
      if (t >= todayStart) statsMap[evt.user_id].today++;
      if (t >= weekStart) statsMap[evt.user_id].week++;
      if (t >= monthStart) statsMap[evt.user_id].month++;
    });
    setLoginStats(statsMap);
  };

  const loadAssignments = async () => {
    setAssignmentsLoading(true);
    const { data } = await supabase
      .from("account_assignments")
      .select("*, accounts(account_email, account_domain, platform, folder_name, subfolder_name, model_language, model_agency)")
      .order("assigned_at", { ascending: false });
    if (data) setAssignments(data);
    setAssignmentsLoaded(true);
    setAssignmentsLoading(false);
  };

  const loadNotifHistory = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(20);
    if (data) setNotifHistory(data);
    setNotifHistoryLoaded(true);
  };

  const loadNotifTemplates = async () => {
    const { data } = await supabase
      .from("notification_templates")
      .select("id, template_key, label, title, body");
    if (data) setNotifTemplates(data);
    setNotifTemplatesLoaded(true);
  };

  const saveTemplate = async (id: string) => {
    const edits = templateEdits[id];
    if (!edits) return;
    setTemplateSaving(id);
    const { error } = await supabase
      .from("notification_templates")
      .update({ title: edits.title, body: edits.body, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Vorlage gespeichert!");
      setNotifTemplates(prev => prev.map(t => t.id === id ? { ...t, title: edits.title, body: edits.body } : t));
      setEditingTemplate(null);
    }
    setTemplateSaving(null);
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast.error("Titel und Nachricht sind erforderlich");
      return;
    }
    setNotifSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ title: notifTitle.trim(), body: notifBody.trim() }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast.success(`Gesendet an ${result.sent} Empfänger!`);
        setNotifTitle("");
        setNotifBody("");
        await loadNotifHistory();
      } else {
        toast.error(result.error || "Fehler beim Senden");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setNotifSending(false);
  };

  const loadSchedules = async () => {
    const { data } = await supabase
      .from("scheduled_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSchedules(data as any[]);
    setSchedulesLoaded(true);
  };

  const saveSchedule = async () => {
    if (!schedTitle.trim() || !schedBody.trim()) {
      toast.error("Titel und Nachricht sind erforderlich");
      return;
    }
    setSchedSaving(true);
    try {
      const payload: any = {
        title: schedTitle.trim(),
        body: schedBody.trim(),
        frequency: schedFrequency,
        send_time: (() => {
          // Convert German time to UTC
          const [h, m] = schedTime.split(":").map(Number);
          const now = new Date();
          const german = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
          const utcH = german.getUTCHours().toString().padStart(2, "0");
          const utcM = german.getUTCMinutes().toString().padStart(2, "0");
          return `${utcH}:${utcM}:00`;
        })(),
        created_by: user?.id,
      };
      if (schedFrequency === "weekly") payload.weekday = schedWeekday;
      if (schedFrequency === "monthly") payload.day_of_month = schedDayOfMonth;

      const { error } = await supabase.from("scheduled_notifications" as any).insert(payload);
      if (error) throw error;
      toast.success("Geplante Benachrichtigung erstellt!");
      setSchedTitle("");
      setSchedBody("");
      await loadSchedules();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setSchedSaving(false);
  };

  const toggleScheduleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("scheduled_notifications" as any)
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (error) { toast.error("Fehler"); return; }
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentActive } : s));
    toast.success(!currentActive ? "Aktiviert" : "Pausiert");
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_notifications" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Fehler"); return; }
    setSchedules(prev => prev.filter(s => s.id !== id));
    setSchedDeleteConfirm(null);
    toast.success("Geplante Benachrichtigung gelöscht");
  };
  const loadModelRequests = async () => {
    const { data } = await supabase
      .from("model_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setModelRequests(data);
    setModelRequestsLoaded(true);
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("model_requests")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Fehler beim Aktualisieren"); return; }
    toast.success(`Status auf "${status}" gesetzt`);
    loadModelRequests();
    // Send push notification for status changes (except reset to pending)
    if (status !== "pending") {
      try {
        const req = modelRequests.find(r => r.id === id);
        if (req?.user_id) {
          let tplTitle = "Update zu deiner Anfrage 📋";
          let tplBody = "Es gibt Neuigkeiten zu deiner Content-Anfrage! Schau jetzt nach.";
          const { data: tpl } = await supabase.from("notification_templates").select("title, body").eq("template_key", "request_update").maybeSingle();
          if (tpl && tpl.title.trim() && tpl.body.trim()) { tplTitle = tpl.title; tplBody = tpl.body; }
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const session = await supabase.auth.getSession();
          await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.data.session?.access_token}` },
            body: JSON.stringify({ title: tplTitle, body: tplBody, target_user_id: req.user_id }),
          });
        }
      } catch {}
    }
  };

  const loadBotMessages = async () => {
    const { data } = await supabase
      .from("bot_messages" as any)
      .select("account_id, message, follow_up_message, is_active");
    if (data) {
      const map: Record<string, { message: string; followUp: string; isActive: boolean; saving: boolean }> = {};
      (data as any[]).forEach((d) => {
        if (d.account_id) {
          map[d.account_id] = { message: d.message || "", followUp: d.follow_up_message || "", isActive: d.is_active, saving: false };
        }
      });
      setBotMessages(map);
      const savedMap: Record<string, { message: string; followUp: string; isActive: boolean }> = {};
      Object.entries(map).forEach(([k, v]) => { savedMap[k] = { message: v.message, followUp: v.followUp, isActive: v.isActive }; });
      setSavedBotState(savedMap);
    }
    setBotMessagesLoaded(true);
  };

  const allAssignedAccounts = useMemo(() => {
    return accounts.filter((a) => a.assigned_to);
  }, [accounts]);

  const botPlatforms = useMemo(() => {
    const set = new Set(allAssignedAccounts.map((a) => a.platform));
    return Array.from(set);
  }, [allAssignedAccounts]);

  const filteredBotAccounts = useMemo(() => {
    let result = allAssignedAccounts;
    if (botPlatformFilter !== "alle") {
      result = result.filter((a) => a.platform === botPlatformFilter);
    }
    if (botFilter === "missing") {
      result = result.filter((acc) => {
        const saved = savedBotState[acc.id];
        return !saved || (!saved.message.trim() && !saved.followUp.trim());
      });
    } else if (botFilter === "active") {
      result = result.filter((acc) => {
        const saved = savedBotState[acc.id];
        return saved && saved.isActive;
      });
    } else if (botFilter === "inactive") {
      result = result.filter((acc) => {
        const saved = savedBotState[acc.id];
        return !saved || !saved.isActive;
      });
    }
    if (botSearch.trim()) {
      const q = botSearch.toLowerCase();
      result = result.filter((acc) => acc.account_email.toLowerCase().includes(q));
    }
    return result;
  }, [allAssignedAccounts, botFilter, botPlatformFilter, savedBotState, botSearch]);

  const saveBotMessage = async (accountId: string) => {
    const entry = botMessages[accountId];
    if (!entry) return;
    const account = accounts.find((a) => a.id === accountId);
    setBotMessages((prev) => ({ ...prev, [accountId]: { ...prev[accountId], saving: true } }));
    const { error } = await supabase
      .from("bot_messages" as any)
      .upsert({
        account_id: accountId,
        user_id: account?.assigned_to,
        message: entry.message,
        follow_up_message: entry.followUp,
        is_active: entry.isActive,
      } as any, { onConflict: "account_id" });
    setBotMessages((prev) => ({ ...prev, [accountId]: { ...prev[accountId], saving: false } }));
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Bot-Nachricht gespeichert");
      setSavedBotState((prev) => ({ ...prev, [accountId]: { message: entry.message, followUp: entry.followUp, isActive: entry.isActive } }));
    }
  };

  const loadSetupDashboards = async () => {
    const { data } = await supabase.from("model_dashboard").select("*");
    if (data) setSetupDashboards(data);
    setSetupDashboardsLoaded(true);
  };

  const changeAdminRole = async (targetUserId: string, newRole: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "change_role", target_user_id: targetUserId, new_role: newRole },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Rolle geändert zu ${newRole === "super_admin" ? "Super-Admin" : "Sub-Admin"}`);
      await loadAdmins();
    } catch (err: any) {
      toast.error(err.message || "Rolle konnte nicht geändert werden");
    }
  };

  const deletePool = async () => {
    if (!selectedPlatform) return;
    setDeletingPool(true);
    try {
      // Revoke Drive access & unassign all accounts for this platform from profiles
      const platformAccs = accounts.filter((a) => a.platform === selectedPlatform);
      for (const acc of platformAccs) {
        if (acc.assigned_to) {
          if (acc.drive_folder_id) {
            await revokeDriveAccess([acc.id], acc.assigned_to);
          }
          await supabase
            .from("profiles")
            .update({ account_email: null, account_password: null, account_domain: null })
            .eq("user_id", acc.assigned_to);
        }
      }
      // Delete all accounts for this platform
      await supabase
        .from("accounts")
        .delete()
        .eq("platform", selectedPlatform);

      toast.success(`Pool "${selectedPlatform}" gelöscht!`);
      setDeletePoolConfirm(false);
      setAccountPoolOpen(false);
      setSelectedPlatform("");
      loadAccounts();
      loadChatters();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setDeletingPool(false);
  };

  const updatePoolOffer = async (offerName: string) => {
    if (!selectedPlatform) return;
    // Rename all accounts from old platform name to new offer name
    const { error } = await supabase
      .from("accounts")
      .update({ platform: offerName })
      .eq("platform", selectedPlatform);
    if (error) {
      toast.error("Fehler beim Ändern");
      return;
    }
    toast.success(`Pool umbenannt zu "${offerName}"`);
    setSelectedPlatform(offerName);
    loadAccounts();
  };

  const DEFAULT_PLATFORMS = ["Maloum", "Brezzels", "4Based", "FansyMe"];
  const platforms = DEFAULT_PLATFORMS;
  const manualPlatforms = [...new Set(accounts.filter(a => a.is_manual).map(a => a.platform).filter(Boolean))];

  

  const openAssignDialog = () => {
    setAssignResult(null);
    setAssignConfirmOpen(true);
  };

  const assignAccounts = async () => {
    if (!selectedPlatform) return;
    setAssigning(true);
    setAssignResult(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/assign-accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ platform: selectedPlatform }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        setAssignResult({ assigned: result.assigned || 0, message: result.message || "Fertig" });
        loadAccounts();
        loadChatters();
      } else {
        toast.error(result.error || "Fehler beim Zuweisen");
        setAssignConfirmOpen(false);
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
      setAssignConfirmOpen(false);
    }
    setAssigning(false);
  };

  const deleteChatter = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Revoke Drive access for assigned accounts
      const { data: userAccounts } = await supabase
        .from("accounts")
        .select("id, drive_folder_id")
        .eq("assigned_to", deleteTarget.user_id);
      if (userAccounts?.some(a => a.drive_folder_id)) {
        await revokeDriveAccess(
          userAccounts.filter(a => a.drive_folder_id).map(a => a.id),
          deleteTarget.user_id
        );
      }

      // Unassign any accounts assigned to this user
      await supabase
        .from("accounts")
        .update({ assigned_to: null, assigned_at: null })
        .eq("assigned_to", deleteTarget.user_id);

      // Delete push subscriptions
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", deleteTarget.user_id);

      // Delete user progress
      await supabase
        .from("user_progress")
        .delete()
        .eq("user_id", deleteTarget.user_id);

      // Delete daily goals
      await supabase
        .from("daily_goals")
        .delete()
        .eq("user_id", deleteTarget.user_id);

      // Delete profile
      await supabase
        .from("profiles")
        .delete()
        .eq("user_id", deleteTarget.user_id);

      toast.success(`${deleteTarget.group_name || "Chatter"} wurde komplett gelöscht`);
      setDeleteTarget(null);
      loadChatters();
      loadAccounts();
    } catch (err: any) {
      toast.error("Fehler beim Löschen: " + err.message);
    }
    setDeleting(false);
  };

  const removeAccount = async (accountId?: string) => {
    if (!reassignTarget) return;
    setReassigning(true);
    try {
      if (accountId) {
        // Revoke Drive access for specific account
        await revokeDriveAccess([accountId], reassignTarget.user_id);
        // Remove specific account
        await supabase
          .from("accounts")
          .update({ assigned_to: null, assigned_at: null })
          .eq("id", accountId);
      } else {
        // Revoke Drive for all accounts
        const { data: userAccs } = await supabase
          .from("accounts")
          .select("id, drive_folder_id")
          .eq("assigned_to", reassignTarget.user_id);
        if (userAccs?.some(a => a.drive_folder_id)) {
          await revokeDriveAccess(
            userAccs.filter(a => a.drive_folder_id).map(a => a.id),
            reassignTarget.user_id
          );
        }
        // Remove all accounts (legacy)
        await supabase
          .from("accounts")
          .update({ assigned_to: null, assigned_at: null })
          .eq("assigned_to", reassignTarget.user_id);
      }

      // Sync profile with remaining accounts
      const { data: remaining } = await supabase
        .from("accounts")
        .select("account_email, account_password, account_domain")
        .eq("assigned_to", reassignTarget.user_id)
        .limit(1)
        .maybeSingle();

      await supabase
        .from("profiles")
        .update({
          account_email: remaining?.account_email || null,
          account_password: remaining?.account_password || null,
          account_domain: remaining?.account_domain || null,
        })
        .eq("user_id", reassignTarget.user_id);

      toast.success(`Account entfernt`);
      setReassignTarget(null);
      loadChatters();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setReassigning(false);
  };

  const reassignAccount = async (newAccountId: string) => {
    if (!reassignTarget) return;
    setReassigning(true);
    try {
      // Get the new account's platform
      const newAccInfo = accounts.find((a) => a.id === newAccountId);
      if (!newAccInfo) throw new Error("Account nicht gefunden");

      // No longer replace existing accounts on same platform - allow multiple

      // Assign new account
      const { data: newAcc } = await supabase
        .from("accounts")
        .update({ assigned_to: reassignTarget.user_id, assigned_at: new Date().toISOString() })
        .eq("id", newAccountId)
        .select()
        .single();

      if (newAcc) {
        // Update profile with first assigned account's data (for backward compat)
        await supabase
          .from("profiles")
          .update({
            account_email: newAcc.account_email,
            account_password: newAcc.account_password,
            account_domain: newAcc.account_domain,
          })
          .eq("user_id", reassignTarget.user_id);

        // Auto-share Google Drive folder if drive_folder_id is set
        if (newAcc.drive_folder_id) {
          try {
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const session = await supabase.auth.getSession();
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/share-drive`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${session.data.session?.access_token}`,
                },
                body: JSON.stringify({
                  folder_id: newAcc.drive_folder_id,
                  user_id: reassignTarget.user_id,
                }),
              }
            );
            console.log("Drive folder shared for", reassignTarget.user_id);
          } catch (driveErr) {
            console.error("Drive share failed:", driveErr);
          }
        }

        // Auto-send push notification if user has push enabled
        if (pushUsers.has(reassignTarget.user_id)) {
          try {
            // Fetch template from DB
            let tplTitle = "Gute Nachrichten 🥳";
            let tplBody = "Dir wurde ein neuer Account zugewiesen! Schau jetzt in dein Dashboard.";
            const { data: tpl } = await supabase
              .from("notification_templates")
              .select("title, body")
              .eq("template_key", "account_assigned")
              .maybeSingle();
            if (tpl) {
              tplTitle = tpl.title;
              tplBody = tpl.body;
            }

            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const session = await supabase.auth.getSession();
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/send-notification`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${session.data.session?.access_token}`,
                },
                body: JSON.stringify({
                  title: tplTitle,
                  body: tplBody,
                  target_user_id: reassignTarget.user_id,
                }),
              }
            );
          } catch {
            // silently ignore push errors
          }
        }

        // Schedule follow-up push notification for 1 day later
        try {
          const sendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabase.from("pending_notifications" as any).insert({
            user_id: reassignTarget.user_id,
            template_key: "account_followup",
            send_at: sendAt,
          });
        } catch {
          // silently ignore
        }
      }

      toast.success(`Account für ${reassignTarget.group_name || "Chatter"} zugewiesen!`);
      setReassignTarget(null);
      loadChatters();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setReassigning(false);
  };

  const sendIndividualPush = async () => {
    if (!pushTarget || !pushTitle.trim() || !pushBody.trim()) return;
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            title: pushTitle.trim(),
            body: pushBody.trim(),
            target_user_id: pushTarget.user_id,
          }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast.success(`Push an ${pushTarget.group_name || "Chatter"} gesendet!`);
        setPushTarget(null);
        setPushTitle("");
        setPushBody("");
      } else {
        toast.error(result.error || "Fehler beim Senden");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setSending(false);
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setBroadcastSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            title: broadcastTitle.trim(),
            body: broadcastBody.trim(),
          }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast.success(`Gesendet an ${result.sent} Empfänger!`);
        setBroadcastOpen(false);
        setBroadcastTitle("");
        setBroadcastBody("");
      } else {
        toast.error(result.error || "Fehler beim Senden");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setBroadcastSending(false);
  };

  const filtered = useMemo(() => {
    let result = chatters.filter(
      (c) =>
        c.group_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.telegram_id?.toLowerCase().includes(search.toLowerCase())
    );

    // Platform filter (independent, combinable)
    if (platformFilters.size > 0) {
      result = result.filter((c) =>
        c.assigned_accounts?.some((a) => platformFilters.has(a.platform.toLowerCase()))
      );
    }

    // Top-level toggle filters (tri-state: null=off, true=has, false=missing)
    if (filterTelegram === true) {
      result = result.filter((c) => c.telegram_id && c.telegram_id.trim() !== "");
    } else if (filterTelegram === false) {
      result = result.filter((c) => !c.telegram_id || c.telegram_id.trim() === "");
    }
    if (filterPush === true) {
      result = result.filter((c) => pushUsers.has(c.user_id));
    } else if (filterPush === false) {
      result = result.filter((c) => !pushUsers.has(c.user_id));
    }
    if (filterPwa === true) {
      result = result.filter((c) => pwaUsers.has(c.user_id));
    } else if (filterPwa === false) {
      result = result.filter((c) => !pwaUsers.has(c.user_id));
    }

    switch (chatterFilter) {
      case "no_telegram":
        result = result.filter((c) => !c.telegram_id || c.telegram_id.trim() === "");
        break;
      case "no_push":
        result = result.filter((c) => !pushUsers.has(c.user_id));
        break;
      case "open_2d":
        result = result.filter((c) => getChatterFakeStats(c.user_id).avgOpenDays >= 3);
        break;
      case "top_tag":
        result = [...result].sort((a, b) => getChatterFakeStats(b.user_id).today - getChatterFakeStats(a.user_id).today);
        break;
      case "top_woche":
        result = [...result].sort((a, b) => getChatterFakeStats(b.user_id).week - getChatterFakeStats(a.user_id).week);
        break;
      case "top_monat":
        result = [...result].sort((a, b) => getChatterFakeStats(b.user_id).month - getChatterFakeStats(a.user_id).month);
        break;
      case "no_revenue_7d": {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        result = result.filter((c) => {
          const regDate = new Date(c.created_at);
          return regDate <= sevenDaysAgo && !revenueUsers.has(c.user_id);
        });
        break;
      }
      case "new_2d": {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        result = result.filter((c) => new Date(c.created_at) >= twoDaysAgo);
        break;
      }
    }
    return result;
  }, [chatters, search, chatterFilter, pushUsers, revenueUsers, platformFilters, filterTelegram, filterPush, filterPwa, pwaUsers]);

  const openGoalEditor = async (chatter: ChatterProfile) => {
    setGoalTarget(chatter);
    // Load current goal
    const { data } = await supabase
      .from("daily_goals")
      .select("target_amount")
      .eq("user_id", chatter.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setGoalAmount(data?.target_amount != null ? String(data.target_amount) : "30");
  };

  const saveGoal = async () => {
    if (!goalTarget) return;
    setGoalSaving(true);
    const amount = Number(goalAmount) || 30;
    // Upsert: delete old, insert new
    await supabase.from("daily_goals").delete().eq("user_id", goalTarget.user_id);
    const { error } = await supabase.from("daily_goals").insert({
      user_id: goalTarget.user_id,
      goal_text: `${amount}€ Tagesziel`,
      target_amount: amount,
    });
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success(`Tagesziel für ${goalTarget.group_name || "Chatter"} auf ${amount}€ gesetzt!`);
      setGoalTarget(null);
    }
    setGoalSaving(false);
  };

  const platformAccounts = selectedPlatform
    ? accounts.filter((a) => a.platform.toLowerCase() === selectedPlatform.toLowerCase())
    : [];
  const freeCount = platformAccounts.filter((a) => !a.assigned_to).length;
  const assignedCount = platformAccounts.filter((a) => a.assigned_to).length;

  // ─── Settings Tab: load issuer + sequence ───
  const loadSettingsData = useCallback(async () => {
    if (!settingsIssuerLoaded) {
      const { data } = await (supabase.from("issuer_settings") as any).select("*").limit(1).single();
      if (data) {
        setSettingsIssuer({ name: data.name, address: data.address, vat_id: data.vat_id, kvk: data.kvk });
        setSettingsIssuerId(data.id);
      }
      setSettingsIssuerLoaded(true);
    }
    if (!settingsSeqLoaded) {
      const { data } = await supabase.rpc("get_credit_note_seq" as any);
      if (data !== null) setSettingsSeqValue(Number(data));
      setSettingsSeqLoaded(true);
    }
  }, [settingsIssuerLoaded, settingsSeqLoaded]);

  const saveIssuerSettings = useCallback(async (patch: Partial<typeof settingsIssuer>) => {
    const updated = { ...settingsIssuer, ...patch };
    setSettingsIssuer(updated);
    if (settingsIssuerTimerRef.current) clearTimeout(settingsIssuerTimerRef.current);
    settingsIssuerTimerRef.current = setTimeout(async () => {
      if (!settingsIssuerId) return;
      setSettingsIssuerSaving(true);
      await (supabase.from("issuer_settings") as any).update({
        name: updated.name, address: updated.address, vat_id: updated.vat_id, kvk: updated.kvk,
      }).eq("id", settingsIssuerId);
      setSettingsIssuerSaving(false);
      toast.success("Firmendaten gespeichert");
    }, 1200);
  }, [settingsIssuer, settingsIssuerId]);

  const updateSeqValue = useCallback(async (newVal: number) => {
    if (newVal < 0) return;
    setSettingsSeqValue(newVal);
    const { error } = await supabase.rpc("set_credit_note_seq" as any, { new_val: newVal });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success(`Invoice-Nummer auf GS-${new Date().getFullYear()}-${String(newVal + 1).padStart(4, "0")} gesetzt`);
  }, []);


  const getChatterName = (userId: string | null) => {
    if (!userId) return null;
    const c = chatters.find((ch) => ch.user_id === userId);
    return c?.group_name || c?.telegram_id || userId.slice(0, 8);
  };

  const SUPER_ADMIN_TABS = new Set(["notifications", "kiprompt", "platzhalter", "gdrive", "settings", "admin_mgmt"]);

  const allTabItems = [
    { key: "einnahmen" as const, label: "Einnahmen", icon: TrendingUp, onClick: () => setActiveTab("einnahmen") },
    { key: "chatter" as const, label: "Chatter", icon: Users, onClick: () => setActiveTab("chatter") },
    { key: "anfragen" as const, label: "Anfragen", icon: Send, onClick: () => { setActiveTab("anfragen"); if (!modelRequestsLoaded) loadModelRequests(); } },
    { key: "botdms" as const, label: "Setup", icon: Bot, onClick: () => { setActiveTab("botdms"); if (!botMessagesLoaded) loadBotMessages(); if (!setupDashboardsLoaded) loadSetupDashboards(); } },
    { key: "notifications" as const, label: "Benachrichtigungen", icon: Bell, onClick: () => { setActiveTab("notifications"); if (!notifHistoryLoaded) loadNotifHistory(); if (!schedulesLoaded) loadSchedules(); if (!notifTemplatesLoaded) loadNotifTemplates(); } },
    { key: "kiprompt" as const, label: "KI Prompt", icon: Brain, onClick: () => { setActiveTab("kiprompt"); if (!kiPromptLoaded) loadKiPrompt(); } },
    { key: "chatter_overview" as const, label: "Chatter-Übersicht", icon: Users, onClick: () => { setActiveTab("chatter_overview"); if (!assignmentsLoaded) loadAssignments(); } },
    { key: "platzhalter" as const, label: "Model-Dashboard", icon: Star, onClick: () => setActiveTab("platzhalter") },
    { key: "chatter_dash" as const, label: "Mitarbeiter-Dashboard", icon: Users, onClick: () => setActiveTab("chatter_dash") },
    { key: "gdrive" as const, label: "Google Drive", icon: ExternalLink, onClick: () => setActiveTab("gdrive") },
    { key: "settings" as const, label: "Einstellungen", icon: Settings, onClick: () => { setActiveTab("settings"); loadSettingsData(); } },
    { key: "admin_mgmt" as const, label: "Admin-Verwaltung", icon: Shield, onClick: () => { setActiveTab("admin_mgmt"); void loadAdmins(); } },
  ];

  // Dynamic sub-admin tabs for super-admin view
  const subAdminTabs = isSuperAdmin
    ? adminList
        .filter(a => a.role === "sub_admin")
        .map(a => ({
          key: `sub_${a.user_id}`,
          label: a.email.split("@")[0],
          icon: Users,
          onClick: () => setActiveTab(`sub_${a.user_id}`),
        }))
    : [];

  const tabItems = isSuperAdmin
    ? [...allTabItems, ...subAdminTabs]
    : allTabItems.filter(t => !SUPER_ADMIN_TABS.has(t.key));

  return (
    <div className="min-h-screen bg-background relative">
      <GoldParticles spawnRate={0.2} maxParticles={20} baseOpacity={0.15} />
      {/* Premium Header */}
      <header className="relative border-b border-border/50 bg-gradient-to-b from-secondary/30 to-background">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-accent/5 via-transparent to-accent/5" />
        <div className="relative z-10 flex items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={undefined}
            className="flex items-center gap-3 rounded-xl text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Admin-Verwaltung öffnen"
          >
            <div className="relative shrink-0">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-full ring-2 ring-accent/20" />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-background" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-foreground">Admin Dashboard</h1>
              <p className="text-[10px] tracking-wide text-muted-foreground">Chatter verwalten & Benachrichtigungen</p>
            </div>
          </button>
          <div className="flex-1" />
          {isSuperAdmin && (
            <Button type="button" variant="secondary" size="sm" onClick={openAdminSection} className="shrink-0">
              <Shield className="h-3.5 w-3.5" />
              Admins
            </Button>
          )}
        </div>
      </header>

       <div className="flex min-h-[calc(100vh-65px)]">
         {/* Desktop Sidebar */}
         <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/30 bg-gradient-to-b from-secondary/20 to-background/50 backdrop-blur-sm overflow-y-auto sticky top-0 h-[calc(100vh-65px)]">
           <nav className="flex flex-col gap-0.5 p-3">
             {tabItems.map(({ key, label, icon: Icon, onClick }) => (
               <button
                 key={key}
                 onClick={onClick}
                 className={cn(
                   "relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 text-left w-full",
                   activeTab === key
                     ? "text-accent-foreground"
                     : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                 )}
               >
                 {activeTab === key && (
                   <motion.div
                     layoutId="activeTabSidebar"
                     className="absolute inset-0 bg-accent rounded-lg shadow-md shadow-accent/20"
                     transition={{ type: "spring", stiffness: 400, damping: 30 }}
                   />
                 )}
                 <span className="relative z-10 flex items-center gap-2.5">
                   <Icon className="h-3.5 w-3.5 shrink-0" />
                   {label}
                 </span>
               </button>
             ))}
           </nav>
         </aside>

         <main className="flex-1 min-w-0 p-4 space-y-5 max-w-4xl mx-auto w-full">
         {/* Mobile Tab Navigation */}
          <div
            className="overflow-x-auto -mx-4 px-4 cursor-grab active:cursor-grabbing select-none md:hidden"
            onWheel={(e) => { if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); } }}
            onMouseDown={(e) => { const el = e.currentTarget; el.dataset.dragging = "true"; el.dataset.startX = String(e.pageX); el.dataset.scrollLeft = String(el.scrollLeft); }}
            onMouseMove={(e) => { const el = e.currentTarget; if (el.dataset.dragging !== "true") return; e.preventDefault(); el.scrollLeft = Number(el.dataset.scrollLeft) - (e.pageX - Number(el.dataset.startX)); }}
            onMouseUp={(e) => { e.currentTarget.dataset.dragging = "false"; }}
            onMouseLeave={(e) => { e.currentTarget.dataset.dragging = "false"; }}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
           <style>{`
             div:has(> .inline-flex)::-webkit-scrollbar {
               display: none;
             }
           `}</style>
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-secondary/40 backdrop-blur-sm border border-border/30 relative">
            {tabItems.map(({ key, label, icon: Icon, onClick }) => (
              <button
                key={key}
                onClick={onClick}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap z-10",
                  activeTab === key
                    ? "text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === key && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-accent rounded-lg shadow-md shadow-accent/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >

        {activeTab === "einnahmen" && (
          <div className="space-y-5">
            {/* Premium Time Filter */}
            <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-secondary/40 backdrop-blur-sm border border-border/30 relative">
                {([...["heute", "gestern", "7", "30", "90"] as TimeFilter[], "custom" as TimeFilter]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={cn(
                      "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap z-10",
                      f === "custom" && "flex items-center gap-1",
                      timeFilter === f
                        ? "text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {timeFilter === f && (
                      <motion.div
                        layoutId="activeTimeFilter"
                        className="absolute inset-0 bg-accent rounded-lg shadow-md shadow-accent/20"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1">
                      {f === "custom" && <CalendarIcon className="h-3 w-3" />}
                      {f === "custom" ? "Zeitraum" : filterLabels[f]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {timeFilter === "custom" && (
              <div className="flex gap-2 items-center glass-card-subtle rounded-xl p-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs flex-1 justify-start", !customFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      {customFrom ? format(customFrom, "dd.MM.yyyy") : "Von"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">bis</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs flex-1 justify-start", !customTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      {customTo ? format(customTo, "dd.MM.yyyy") : "Bis"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Hero Gesamtumsatz */}
            <div className="relative gold-gradient-border-animated pulse-glow rounded-xl p-6 text-center">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/8 via-transparent to-accent/5 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1.5 tracking-widest uppercase">Gesamtumsatz</p>
                <p className="text-3xl font-extrabold text-gold-gradient-shimmer tracking-tight"><AnimatedNumber value={grandTotal} /></p>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{filterLabels[timeFilter]}</p>
              </div>
            </div>

            {/* Platform Cards */}
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "maloum", label: "Maloum", color: PLATFORM_COLORS.maloum, value: platformTotals.maloum },
                { key: "brezzels", label: "Brezzels", color: PLATFORM_COLORS.brezzels, value: platformTotals.brezzels },
                { key: "4based", label: "4Based", color: PLATFORM_COLORS["4based"], value: platformTotals["4based"] },
              ]).map(({ key, label, color, value }) => (
                  <div key={key} className="glass-card-subtle rounded-xl p-4 text-center relative overflow-hidden hover:scale-[1.02] transition-transform">
                    <div className="relative">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wide">{label}</p>
                      </div>
                      <p className="text-lg font-bold text-foreground"><AnimatedNumber value={value} /></p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Revenue Chart */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Umsatzverlauf</h2>
                    <p className="text-[10px] text-muted-foreground">{filterLabels[timeFilter]}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {Object.entries(PLATFORM_COLORS).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-muted-foreground capitalize font-medium">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredRevenueData}>
                      <defs>
                        {Object.entries(PLATFORM_COLORS).map(([key, color]) => (
                          <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        interval={Math.max(0, Math.floor(filteredRevenueData.length / 7))}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}€`}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                          padding: "10px 14px",
                        }}
                        formatter={(value: number, name: string) => [`${value.toLocaleString("de-DE")}€`, name]}
                        labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "10px", marginBottom: "4px" }}
                      />
                      <Line type="monotone" dataKey="maloum" stroke={PLATFORM_COLORS.maloum} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                      <Line type="monotone" dataKey="brezzels" stroke={PLATFORM_COLORS.brezzels} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                      <Line type="monotone" dataKey="4based" stroke={PLATFORM_COLORS["4based"]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chatter" && (<div className="space-y-6">
        {/* Stats */}
        {(() => {
          const telegramYes = chatters.filter((c) => c.telegram_id && c.telegram_id.trim() !== "").length;
          const telegramNo = chatters.length - telegramYes;
          const pushYes = chatters.filter((c) => pushUsers.has(c.user_id)).length;
          const pushNo = chatters.length - pushYes;
          const pwaYes = pwaUsers.size;
          const pwaNo = chatters.length - pwaYes;

          const DualCard = ({ labelA, valueA, labelB, valueB, filterState, onClickA, onClickB }: {
            labelA: string; valueA: number; labelB: string; valueB: number;
            filterState: boolean | null; onClickA: () => void; onClickB: () => void;
          }) => (
            <div className={cn(
              "glass-card-subtle rounded-xl overflow-hidden transition-all",
              filterState === true && "ring-2 ring-accent shadow-[0_0_12px_-3px_hsl(var(--accent)/0.3)]",
              filterState === false && "ring-2 ring-destructive/60 shadow-[0_0_12px_-3px_hsl(var(--destructive)/0.2)]"
            )}>
              <button
                onClick={onClickA}
                className={cn(
                  "w-full px-3 py-2.5 text-center transition-all border-b border-border/20",
                  filterState === true ? "bg-accent/10" : "hover:bg-secondary/30"
                )}
              >
                <p className="text-[9px] text-muted-foreground tracking-wide uppercase">{labelA}</p>
                <p className={cn("text-lg font-bold", filterState === true ? "text-accent" : "text-gold-gradient")}>{valueA}</p>
              </button>
              <button
                onClick={onClickB}
                className={cn(
                  "w-full px-3 py-2.5 text-center transition-all",
                  filterState === false ? "bg-destructive/10" : "hover:bg-secondary/30"
                )}
              >
                <p className="text-[9px] text-muted-foreground tracking-wide uppercase">{labelB}</p>
                <p className={cn("text-lg font-bold", filterState === false ? "text-destructive" : "text-gold-gradient")}>{valueB}</p>
              </button>
            </div>
          );

          const toggleFilter = (current: boolean | null, target: boolean): boolean | null =>
            current === target ? null : target;

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Chatter gesamt – simple card, vertically centered to match dual cards */}
              <div className="glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center">
                <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Chatter gesamt</p>
                <p className="text-3xl font-bold text-gold-gradient">{chatters.length}</p>
              </div>

              <DualCard
                labelA="Mit Telegram" valueA={telegramYes}
                labelB="Ohne Telegram" valueB={telegramNo}
                filterState={filterTelegram}
                onClickA={() => setFilterTelegram(p => toggleFilter(p, true))}
                onClickB={() => setFilterTelegram(p => toggleFilter(p, false))}
              />
              <DualCard
                labelA="Push aktiv" valueA={pushYes}
                labelB="Push inaktiv" valueB={pushNo}
                filterState={filterPush}
                onClickA={() => setFilterPush(p => toggleFilter(p, true))}
                onClickB={() => setFilterPush(p => toggleFilter(p, false))}
              />
              <DualCard
                labelA="App installiert" valueA={pwaYes}
                labelB="App fehlt" valueB={pwaNo}
                filterState={filterPwa}
                onClickA={() => setFilterPwa(p => toggleFilter(p, true))}
                onClickB={() => setFilterPwa(p => toggleFilter(p, false))}
              />
            </div>
          );
        })()}

        {isSuperAdmin && (<>
        {/* Offer-Verteilung (collapsible) */}
        <section className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setOfferVerteilungOpen(!offerVerteilungOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${offerVerteilungOpen ? "rotate-90" : ""}`} />
              <Percent className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Offer-Verteilung</h2>
              {!offerVerteilungOpen && quizRoutes.length > 0 && (() => {
                const totalFree = quizRoutes.reduce((s, r) => s + r.free_count, 0);
                return (
                  <div className="flex gap-1.5 ml-1">
                    {quizRoutes.map((route, i) => {
                      const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                      const pct = totalFree > 0 ? Math.round((route.free_count / totalFree) * 100) : 0;
                      return (
                        <Badge key={route.id} variant="secondary" className="text-[10px]">
                          <span className="inline-block h-2 w-2 rounded-full mr-0.5" style={{ backgroundColor: colors[i % colors.length] }} />
                          {route.free_count} frei ({pct}%)
                        </Badge>
                      );
                    })}
                  </div>
                );
              })()}
            </button>
          </div>
          {offerVerteilungOpen && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {quizRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Keine Offers konfiguriert.</p>
              ) : (() => {
                const totalFree = quizRoutes.reduce((s, r) => s + r.free_count, 0);
                return (
                  <>
                    <p className="text-[10px] text-muted-foreground">
                      Trage die Anzahl freier Accounts pro Plattform manuell ein. Die Verteilung berechnet sich automatisch. {totalFree} Account{totalFree !== 1 ? "s" : ""} frei.
                    </p>
                    <div className="space-y-3">
                      {quizRoutes.map((route, i) => {
                        const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                        const pct = totalFree > 0 ? Math.round((route.free_count / totalFree) * 100) : 0;
                        return (
                          <div key={route.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                              <div>
                                <span className="text-xs font-medium text-foreground">{route.name}</span>
                                <p className="text-[10px] text-muted-foreground">{route.target_path}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative input-gold-shimmer rounded-lg">
                                <Input
                                  type="number"
                                  min={0}
                                  value={route.free_count}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setQuizRoutes(prev => prev.map(r => r.id === route.id ? { ...r, free_count: val } : r));
                                  }}
                                  className="h-8 w-20 text-center text-sm font-bold bg-secondary/30 border-transparent"
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-10 text-right">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Live preview bar */}
                    <div className="flex rounded-full overflow-hidden h-3 bg-secondary/50">
                      {quizRoutes.map((route, i) => {
                        const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                        const pct = totalFree > 0 ? Math.round((route.free_count / totalFree) * 100) : 0;
                        return (
                          <div
                            key={route.id}
                            style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                            className="transition-all duration-300"
                            title={`${route.name}: ${pct}%`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {quizRoutes.map((route, i) => {
                        const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                        const pct = totalFree > 0 ? Math.round((route.free_count / totalFree) * 100) : 0;
                        return (
                          <div key={route.id} className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span className="text-[10px] text-muted-foreground">{route.name}: {pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                    {totalFree === 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-[10px] text-amber-400">Keine freien Accounts – Verteilung wird gleichmäßig auf alle Plattformen aufgeteilt.</span>
                      </div>
                    )}
                    <Button
                      onClick={async () => {
                        try {
                          for (const route of quizRoutes) {
                            await supabase.from("quiz_routes").update({ free_count: route.free_count } as any).eq("id", route.id);
                          }
                          toast.success("Freie Accounts gespeichert!");
                          loadOffers();
                        } catch (err: any) {
                          toast.error("Fehler: " + err.message);
                        }
                      }}
                      size="sm"
                      className="w-full"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Speichern
                    </Button>
                  </>
                );
              })()}
            </div>
          )}
        </section>

        <section className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setAccountPoolSectionOpen(!accountPoolSectionOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${accountPoolSectionOpen ? "rotate-90" : ""}`} />
              <Package className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Account-Pools</h2>
              {!accountPoolSectionOpen && (
                <>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {accounts.filter(a => !a.is_manual).length} gesamt
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    {accounts.filter(a => !a.is_manual && !a.assigned_to).length} frei
                  </Badge>
                </>
              )}
            </button>
            
          </div>

           {accountPoolSectionOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {platforms.map((p) => {
                const pAccounts = accounts.filter((a) => a.platform.toLowerCase() === p.toLowerCase());
                const free = pAccounts.filter((a) => !a.assigned_to).length;
                const assigned = pAccounts.filter((a) => a.assigned_to).length;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPlatform(p);
                      setAccountPoolOpen(true);
                    }}
                    className="glass-card-subtle rounded-xl p-4 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">{p}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {pAccounts.length} Accounts
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="text-green-500">{free} frei</span>
                      <span>{assigned} vergeben</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Freie Accounts Section */}
        <section className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setManualSectionOpen(!manualSectionOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${manualSectionOpen ? "rotate-90" : ""}`} />
              <FolderOpen className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Freie Accounts</h2>
              {!manualSectionOpen && (
                <>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {accounts.filter(a => a.is_manual).length} gesamt
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    </span>
                    {accounts.filter(a => a.is_manual && !a.assigned_to).length} frei
                  </Badge>
                </>
              )}
            </button>
          </div>

          {manualSectionOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_PLATFORMS.map((p) => {
                const pAccounts = accounts.filter((a) => a.is_manual && a.platform.toLowerCase() === p.toLowerCase());
                const free = pAccounts.filter((a) => !a.assigned_to).length;
                const assigned = pAccounts.filter((a) => a.assigned_to).length;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPlatform(p);
                      setAccountPoolOpen(true);
                    }}
                    className="glass-card-subtle rounded-xl p-4 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">{p}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {pAccounts.length} Accounts
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="text-amber-400">{free} frei</span>
                      <span>{assigned} vergeben</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        </>)}


        {/* Search & Filters Group */}
        <div className="space-y-3">
          <div className="relative input-gold-shimmer rounded-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chatter suchen (Gruppe oder Telegram-ID)..."
              className="pl-9 text-sm border-transparent"
            />
          </div>

          {/* Platform Filters (independent, combinable) */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: "maloum", label: "Maloum" },
              { key: "brezzels", label: "Brezzels" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setPlatformFilters((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  });
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 border",
                  platformFilters.has(key)
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary border-transparent"
                )}
              >
                <Filter className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Chatter Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {([
              { key: "alle", label: "Alle", icon: Users },
              { key: "open_2d", label: "> 3 Tage offen", icon: MessageSquare },
              { key: "top_tag", label: "Top Tag", icon: Star },
              { key: "top_woche", label: "Top Woche", icon: TrendingUp },
              { key: "top_monat", label: "Top Monat", icon: DollarSign },
              { key: "no_revenue_7d", label: "7d+ ohne Umsatz", icon: AlertTriangle },
              { key: "new_2d", label: "Gestern gestartet", icon: UserPlus },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setChatterFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0",
                  chatterFilter === key
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent shrink-0" />
              <h2 className="text-sm font-semibold text-foreground">Alle Chatter</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={generateAllSummaries}
                disabled={generatingAll}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {generatingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generatingAll ? "Generiere..." : "Alle Mastermind Analysen"}
              </button>
              {checkedChatters.size > 0 && (
                <button
                  onClick={resetCheckedChatters}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <XCircle className="h-3 w-3" />
                  Reset ({checkedChatters.size})
                </button>
              )}
              {Object.keys(chatterSummaries).length > 0 && (
                <button
                  onClick={() => setShowAiSummaries(!showAiSummaries)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors",
                    showAiSummaries ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  {showAiSummaries ? "Analysen ▾" : "Analysen ▸"}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {search ? "Kein Chatter gefunden." : chatterFilter === "no_telegram" ? "Nichts weiter zu sehen." : chatterFilter === "no_push" ? "Alle Chatter haben Push aktiviert." : chatterFilter === "open_2d" ? "Keine Chats länger als 3 Tage offen." : "Noch keine Chatter registriert."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((chatter) => {
                const cStats = loginStats[chatter.user_id];
                const activeToday = (cStats?.today || 0) > 0;
                const fakeStats = getChatterFakeStats(chatter.user_id);
                const chatsOverdue = fakeStats.avgOpenDays > 3;
                return (
                  <div key={chatter.user_id} className={chatsOverdue ? "bg-destructive/10 border-l-4 border-destructive" : ""}>
                    <div
                      className="px-4 py-3 flex flex-col gap-2 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedChatter(expandedChatter === chatter.user_id ? null : chatter.user_id)}
                    >
                      {/* Row 1: Avatar + Name + Badge */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={checkedChatters.has(chatter.user_id)}
                          onCheckedChange={() => toggleChatterCheck(chatter.user_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 border-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                        />
                        <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-accent">
                            {(chatter.group_name || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium text-foreground truncate cursor-copy active:scale-95 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(chatter.group_name || "");
                              toast.success("Name kopiert!");
                            }}
                            title="Klicken zum Kopieren"
                          >
                            {chatter.group_name || "Kein Gruppenname"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Telegram: {chatter.telegram_id || "—"} · Seit{" "}
                            {new Date(chatter.created_at).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                        {(chatter.assigned_accounts?.length || 0) > 0 && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            <KeyRound className="h-3 w-3 mr-1" />
                            {chatter.assigned_accounts!.length} Account{chatter.assigned_accounts!.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {pushUsers.has(chatter.user_id) ? (
                          <span className="shrink-0" aria-label="Push aktiviert"><Bell className="h-4 w-4 text-accent" /></span>
                        ) : (
                          <span className="shrink-0" aria-label="Push nicht aktiviert"><BellOff className="h-4 w-4 text-muted-foreground/50" /></span>
                        )}
                        <span className="shrink-0" aria-label={pwaUsers.has(chatter.user_id) ? "App installiert" : "App nicht installiert"}>
                          <Smartphone className={cn("h-4 w-4", pwaUsers.has(chatter.user_id) ? "text-accent" : "text-muted-foreground/50")} />
                        </span>
                      </div>
                      {/* Row 2: Action Buttons */}
                      <div className="flex justify-end gap-1 -mt-1">
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openGoalEditor(chatter); }}
                            className="text-accent hover:text-accent/80 h-7 w-7 p-0"
                            title="Tagesziel bearbeiten"
                          >
                            <Target className="h-3.5 w-3.5" />
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center w-5 h-5 rounded-full cursor-pointer focus:outline-none"
                                aria-label="Website-Besuche"
                                title="Website-Besuche"
                              >
                                <span className={cn(
                                  "block w-2.5 h-2.5 rounded-full transition-all",
                                  activeToday
                                    ? "bg-green-500 shadow-[0_0_6px_1px_rgba(34,197,94,0.5)] animate-pulse"
                                    : "bg-muted-foreground/40"
                                )} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-3 glass-card border-border" side="top" align="center" onClick={(e) => e.stopPropagation()}>
                              <p className="text-[11px] font-semibold text-foreground mb-2">Website-Besuche</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="w-3.5 h-3.5" /> Heute</span>
                                  <span className="font-semibold text-foreground">{cStats?.today || 0}×</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarRange className="w-3.5 h-3.5" /> Woche</span>
                                  <span className="font-semibold text-foreground">{cStats?.week || 0}×</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarIcon className="w-3.5 h-3.5" /> Monat</span>
                                  <span className="font-semibold text-foreground">{cStats?.month || 0}×</span>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setReassignTarget(chatter); }}
                          className="text-foreground hover:text-foreground/80 h-7 w-7 p-0"
                          title="Accounts verwalten"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(chatter); }}
                          className="text-destructive hover:text-destructive/80 h-7 w-7 p-0"
                          title="Account entfernen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setPushTarget(chatter); }}
                          className="text-accent hover:text-accent/80 h-7 w-7 p-0"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {expandedChatter === chatter.user_id && (
                      <div className="px-4 pb-4 animate-in fade-in duration-200">
                        {(chatter.assigned_accounts?.length || 0) >= 1 ? (
                          /* Account cards – same format for 1 or many */
                          <div className="space-y-3">
                            {chatter.assigned_accounts!.map((acc) => {
                              const h = hashCodeAdmin(chatter.user_id + acc.id);
                              const yesterdayRev = 80 + (h % 200);
                              const weekRev = yesterdayRev * 5 + (h % 500);
                              const monthRev = Math.round(weekRev * 3.5 + (h % 2000));
                              const allTimeRev = Math.round(monthRev * 4.2 + (h % 8000));
                              const massDMs = 120 + (h % 380);
                              const openChats = 3 + (h % 18);
                              const platformColor = (PLATFORM_COLORS as Record<string, string>)[acc.platform.toLowerCase()] || "hsl(var(--accent))";
                              return (
                                <div key={acc.id} className="glass-card-subtle rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${platformColor}` }}>
                                  {/* Account Header */}
                                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-border/50">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-foreground">{acc.platform}</span>
                                      {acc.account_domain && (
                                        <a
                                          href={acc.account_domain.startsWith("http") ? acc.account_domain : `https://${acc.account_domain}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-[10px] text-accent hover:underline truncate max-w-[140px]"
                                        >
                                          ↗ {acc.account_domain}
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Login Row */}
                                  <div className="px-3.5 py-2 flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(acc.account_email); toast.success("E-Mail kopiert!"); }}
                                      className="flex-1 text-left bg-secondary/30 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors cursor-copy group"
                                    >
                                      <p className="text-[9px] text-muted-foreground mb-0.5">E-Mail</p>
                                      <p className="text-xs font-medium text-foreground truncate group-active:scale-95 transition-transform">{acc.account_email}</p>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(acc.account_password); toast.success("Passwort kopiert!"); }}
                                      className="flex-1 text-left bg-secondary/30 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors cursor-copy group"
                                    >
                                      <p className="text-[9px] text-muted-foreground mb-0.5">Passwort</p>
                                      <p className="text-xs font-medium text-foreground truncate group-active:scale-95 transition-transform">{acc.account_password}</p>
                                    </button>
                                  </div>

                                  {/* Stats */}
                                  <div className="px-3.5 pb-3 pt-1 space-y-1.5">
                                    {[
                                      { label: "Gestern", value: `${yesterdayRev}€` },
                                      { label: "Woche", value: `${weekRev.toLocaleString("de-DE")}€` },
                                      { label: "Monat", value: `${monthRev.toLocaleString("de-DE")}€` },
                                      { label: "All-Time", value: `${allTimeRev.toLocaleString("de-DE")}€` },
                                    ].map((s) => (
                                      <div key={s.label} className="flex items-center justify-between px-1">
                                        <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                                        <span className="text-sm font-bold text-foreground">{s.value}</span>
                                      </div>
                                    ))}
                                    <div className="border-t border-border/50 pt-1.5 mt-1 space-y-1.5">
                                      <div className="flex items-center justify-between px-1">
                                        <span className="text-xs font-medium text-muted-foreground">Mass-DMs</span>
                                        <span className="text-sm font-bold text-foreground">{massDMs}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-1">
                                        <span className="text-xs font-medium text-muted-foreground">Offene Chats</span>
                                        <span className="text-sm font-bold text-foreground">{openChats}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-1">
                                        <span className="text-xs font-medium text-muted-foreground">Ø Chats offen seit</span>
                                        <span className="text-sm font-bold text-foreground">{(1 + (h % 5))}d</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* No accounts: just stats */
                          <ChatterStatsCard userId={chatter.user_id} name={chatter.group_name || "Chatter"} />
                        )}
                      </div>
                    )}
                    {/* AI Summary – below chatter row, visible when toggle is on */}
                    {showAiSummaries && chatter.assigned_accounts && chatter.assigned_accounts.length > 0 && (chatterSummaries[chatter.user_id] || summaryLoading[chatter.user_id]) && (
                      <div className="px-4 pb-3 pt-1 border-t border-border/30 bg-accent/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-accent" />
                            <span className="text-[10px] font-semibold text-accent">Sebastian's Mastermind KI</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); generateSummary(chatter.user_id); }}
                            disabled={summaryLoading[chatter.user_id]}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
                          >
                            {summaryLoading[chatter.user_id] ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Neu
                          </button>
                        </div>
                        {summaryLoading[chatter.user_id] ? (
                          <div className="flex items-center gap-2 py-1">
                            <Loader2 className="h-3 w-3 animate-spin text-accent" />
                            <span className="text-[11px] text-muted-foreground">Analysiere...</span>
                          </div>
                        ) : chatterSummaries[chatter.user_id] ? (() => {
                          const raw = chatterSummaries[chatter.user_id].summary;
                          const analyseMatch = raw.match(/\[ANALYSE\]\s*([\s\S]*?)(?:\[NACHRICHT\]|$)/);
                          const nachrichtMatch = raw.match(/\[NACHRICHT\]\s*([\s\S]*?)$/);
                          const analyse = analyseMatch?.[1]?.trim() || raw;
                          const nachricht = nachrichtMatch?.[1]?.trim() || null;
                          return (
                            <div className="space-y-2">
                              <p className="text-[11px] text-foreground/90 leading-relaxed">{analyse}</p>
                              {nachricht && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(nachricht);
                                    toast.success("Nachricht kopiert!");
                                    window.open(`https://wa.me/?text=${encodeURIComponent(nachricht)}`, '_blank');
                                  }}
                                  className="bg-secondary/40 rounded-lg p-2 border border-border/50 cursor-pointer hover:bg-secondary/60 active:bg-secondary/80 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-medium text-muted-foreground">Nachricht:</span>
                                    <span className="flex items-center gap-1 text-[9px] text-green-500">
                                      <Copy className="h-2.5 w-2.5" />
                                      Kopieren & WhatsApp
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-foreground/80 leading-relaxed">{nachricht}</p>
                                </div>
                              )}
                            </div>
                          );
                        })() : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </div>)}

        {activeTab === "anfragen" && (
          <div className="space-y-4">
            {/* Request Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { key: "pending", label: "Offen", icon: Clock, colorClass: "text-yellow-400" },
                { key: "accepted", label: "Angenommen", icon: CheckCircle2, colorClass: "text-emerald-400" },
                { key: "in_progress", label: "In Arbeit", icon: Loader2, colorClass: "text-blue-400" },
                { key: "rejected", label: "Abgelehnt", icon: XCircle, colorClass: "text-destructive" },
              ] as const).map(({ key, label, icon: Icon, colorClass }) => {
                const count = modelRequests.filter(r => r.status === key).length;
                const isActive = requestFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setRequestFilter(requestFilter === key ? "all" : key); setContentLinkFilter("all"); }}
                    className={cn(
                      "glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center transition-all",
                      isActive && "ring-2 ring-accent shadow-[0_0_12px_-3px_hsl(var(--accent)/0.3)]"
                    )}
                  >
                    <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">{label}</p>
                    <p className={cn("text-3xl font-bold", count === 0 ? "text-gold-gradient" : colorClass)}>{count}</p>
                  </button>
                );
              })}
            </div>

            <section className="glass-card rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-foreground">Custom Anfragen</h2>
                  <p className="text-[10px] text-muted-foreground">{modelRequests.length} Anfrage{modelRequests.length !== 1 ? "n" : ""} insgesamt</p>
                </div>
                {requestFilter !== "all" && (
                  <button onClick={() => { setRequestFilter("all"); setContentLinkFilter("all"); }} className="text-[10px] text-accent hover:text-accent/80 transition-colors font-medium">
                    Alle anzeigen
                  </button>
                )}
              </div>

              {requestFilter === "accepted" && (
                <div className="px-5 py-2 border-b border-border/50 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground mr-1">Content-Link:</span>
                  {([
                    { key: "all" as const, label: "Alle" },
                    { key: "with_link" as const, label: "Mit Link" },
                    { key: "without_link" as const, label: "Ohne Link" },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setContentLinkFilter(key)}
                      className={cn(
                        "text-[10px] px-2.5 py-1 rounded-full transition-all font-medium",
                        contentLinkFilter === key
                          ? "bg-accent/20 text-accent ring-1 ring-accent/30"
                          : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {modelRequests.filter(r => {
                if (requestFilter !== "all" && r.status !== requestFilter) return false;
                if (requestFilter === "accepted" && contentLinkFilter === "with_link" && !r.content_link) return false;
                if (requestFilter === "accepted" && contentLinkFilter === "without_link" && r.content_link) return false;
                return true;
              }).length === 0 ? (
                <div className="p-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <Send className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Keine Anfragen in dieser Kategorie.</p>
                </div>
              ) : (
                <div className="p-3 space-y-4">
                  {modelRequests.filter(r => {
                    if (requestFilter !== "all" && r.status !== requestFilter) return false;
                    if (requestFilter === "accepted" && contentLinkFilter === "with_link" && !r.content_link) return false;
                    if (requestFilter === "accepted" && contentLinkFilter === "without_link" && r.content_link) return false;
                    return true;
                  }).map((req, idx, arr) => {
                    const chatter = chatters.find(c => c.user_id === req.user_id);
                    const chatterName = chatter?.group_name || req.user_id.slice(0, 8);
                    const statusConfig = {
                      pending: { dot: "bg-yellow-400", bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Offen", border: "border-l-yellow-500/50" },
                      accepted: { dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Angenommen", border: "border-l-emerald-500/50" },
                      in_progress: { dot: "bg-blue-400", bg: "bg-blue-500/10", text: "text-blue-400", label: "In Arbeit", border: "border-l-blue-500/50" },
                      rejected: { dot: "bg-red-400", bg: "bg-red-500/10", text: "text-red-400", label: "Abgelehnt", border: "border-l-red-500/50" },
                    }[req.status as string] || { dot: "bg-muted-foreground", bg: "bg-secondary", text: "text-muted-foreground", label: req.status, border: "border-l-border" };
                    return (
                      <React.Fragment key={req.id}>
                        <div
                          className={cn(
                            "relative rounded-xl overflow-hidden transition-all duration-300 card-hover-glow border border-border/60 bg-card/60 backdrop-blur-sm border-l-[3px]",
                            statusConfig.border,
                            req.status === "pending" && "ring-1 ring-yellow-500/20"
                          )}
                        >
                          {/* Gold top accent line */}
                          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

                          {/* Header */}
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 ring-1 ring-accent/20 shadow-[0_0_8px_hsl(43_56%_52%/0.1)]">
                              <span className="text-sm font-bold text-accent">{chatterName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground truncate">{chatterName}</span>
                                <span className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", statusConfig.bg, statusConfig.text)}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot, req.status === "pending" && "animate-pulse")} />
                                  {statusConfig.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border/50">
                                  {req.request_type === "individual" ? "Individuell" : "Allgemein"}
                                </Badge>
                                {req.request_type === "individual" && req.price != null && (
                                  <span className="text-[10px] text-accent font-bold">{req.price}€</span>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {new Date(req.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          </div>

                        {/* Content */}
                        <div className="px-4 pb-3 space-y-2.5">
                          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

                          {/* Model Name */}
                          <button
                            onClick={() => { navigator.clipboard.writeText(req.model_name); toast.success("Model Name kopiert!"); }}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full text-left"
                          >
                            <span className="text-muted-foreground">Model:</span>
                            <span className="text-foreground font-medium">{req.model_name}</span>
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity ml-auto shrink-0" />
                          </button>

                          {/* Customer Name */}
                          {(req as any).customer_name && (
                            <button
                              onClick={() => { navigator.clipboard.writeText((req as any).customer_name); toast.success("Kundenname kopiert!"); }}
                              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full text-left"
                            >
                              <span className="text-muted-foreground">Kunde:</span>
                              <span className="text-foreground font-medium">{(req as any).customer_name}</span>
                              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity ml-auto shrink-0" />
                            </button>
                          )}

                          {/* Description with Header */}
                          <button
                            onClick={() => {
                              const priceLine = req.request_type === "individual" && req.price != null
                                ? `\n\nDer Preis, den der Kunde bereit wäre zu bezahlen: ${req.price}€`
                                : "";
                              const fullText = `Hey, eine neue Anfrage des Chatters an dich – ich leite sie dir einmal eins zu eins weiter 🙋🏼‍♂️:\n\n${req.description}${priceLine}\n\nGib mir bitte Feedback, ob du das umsetzen möchtest oder nicht. Danke dir ☺️`;
                              navigator.clipboard.writeText(fullText);
                              toast.success("Beschreibung kopiert!");
                            }}
                            className="glass-card-subtle rounded-lg px-3 py-2.5 text-sm text-foreground/90 leading-relaxed hover:bg-accent/5 transition-colors text-left w-full group"
                          >
                            <p className="text-xs text-muted-foreground italic mb-1.5">Hey, eine neue Anfrage des Chatters an dich – ich leite sie dir einmal eins zu eins weiter 🙋🏼‍♂️:</p>
                            {req.description}
                            {req.request_type === "individual" && req.price != null && (
                              <p className="text-xs text-muted-foreground mt-1.5">Der Preis, den der Kunde bereit wäre zu bezahlen: <span className="text-foreground font-medium">{req.price}€</span></p>
                            )}
                            <p className="text-xs text-muted-foreground italic mt-1.5">Gib mir bitte Feedback, ob du das umsetzen möchtest oder nicht. Danke dir ☺️</p>
                            <Copy className="h-3 w-3 inline-block ml-1.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                          </button>

                          {/* Admin Kommentar */}
                          {req.admin_comment && !req._editingComment ? (
                            <div className="glass-card-subtle rounded-lg px-3 py-2.5 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kommentar</p>
                                <button
                                  onClick={() => setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _editingComment: true, _localComment: r.admin_comment ?? "" } : r))}
                                  className="text-[10px] text-accent hover:text-accent/80 transition-colors font-medium"
                                >
                                  Bearbeiten
                                </button>
                              </div>
                              <p className="text-xs text-foreground leading-relaxed">{req.admin_comment}</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {!req.admin_comment && !req._editingComment ? (
                                <button
                                  onClick={() => setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _editingComment: true, _localComment: "" } : r))}
                                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  Kommentar hinzufügen
                                </button>
                              ) : req._editingComment && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                      {req.admin_comment ? "Kommentar bearbeiten" : "Kommentar"}
                                    </p>
                                    <button
                                      onClick={() => setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _editingComment: false, _localComment: undefined } : r))}
                                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      Abbrechen
                                    </button>
                                  </div>
                                   <div className="input-gold-shimmer rounded-lg">
                                   <Textarea
                                     placeholder="Kommentar für den Chatter..."
                                     value={req._localComment ?? req.admin_comment ?? ""}
                                     onChange={(e) => {
                                       setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _localComment: e.target.value } : r));
                                     }}
                                     rows={2}
                                     className="text-xs bg-secondary/30 border-transparent resize-none"
                                     autoFocus
                                   />
                                   </div>
                                  {(req._localComment != null && req._localComment !== (req.admin_comment ?? "")) && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                                      const comment = req._localComment ?? "";
                                      const { error } = await supabase.from("model_requests").update({ admin_comment: comment || null }).eq("id", req.id);
                                      if (error) { toast.error("Fehler beim Speichern"); return; }
                                      toast.success("Kommentar gespeichert!");
                                      setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, admin_comment: comment || null, _localComment: undefined, _editingComment: false } : r));
                                      // Send push notification for request update
                                      try {
                                        let tplTitle = "Update zu deiner Anfrage 📋";
                                        let tplBody = "Es gibt Neuigkeiten zu deiner Content-Anfrage! Schau jetzt nach.";
                                        const { data: tpl } = await supabase.from("notification_templates").select("title, body").eq("template_key", "request_update").maybeSingle();
                                        if (tpl && tpl.title.trim() && tpl.body.trim()) { tplTitle = tpl.title; tplBody = tpl.body; }
                                        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                                        const session = await supabase.auth.getSession();
                                        await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.data.session?.access_token}` },
                                          body: JSON.stringify({ title: tplTitle, body: tplBody, target_user_id: req.user_id }),
                                        });
                                      } catch {}
                                    }}>
                                      <Save className="h-3 w-3 mr-1" /> Speichern
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Content Link – only for accepted requests */}
                          {(req.status === "accepted" || req.status === "in_progress") && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Content-Link</p>
                              <div className="flex gap-2">
                                <div className="input-gold-shimmer rounded-lg flex-1">
                                <Input
                                  placeholder="Link zum fertigen Content einfügen..."
                                  value={req._localContentLink ?? (req as any).content_link ?? ""}
                                  onChange={(e) => {
                                    setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _localContentLink: e.target.value } : r));
                                  }}
                                  className="text-xs bg-secondary/30 border-transparent flex-1"
                                />
                                </div>
                                {(req as any).content_link && (
                                  <Button size="sm" variant="outline" className="h-9 px-2" asChild>
                                    <a href={(req as any).content_link} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                              {(req._localContentLink != null && req._localContentLink !== ((req as any).content_link ?? "")) && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                                  const link = req._localContentLink ?? "";
                                  const { error } = await supabase.from("model_requests").update({ content_link: link || null } as any).eq("id", req.id);
                                  if (error) { toast.error("Fehler beim Speichern"); return; }
                                  toast.success("Content-Link gespeichert!");
                                  setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, content_link: link || null, _localContentLink: undefined } : r));
                                  try {
                                    let tplTitle = "Update zu deiner Anfrage 📋";
                                    let tplBody = "Es gibt Neuigkeiten zu deiner Content-Anfrage! Schau jetzt nach.";
                                    const { data: tpl } = await supabase.from("notification_templates").select("title, body").eq("template_key", "request_update").maybeSingle();
                                    if (tpl && tpl.title.trim() && tpl.body.trim()) { tplTitle = tpl.title; tplBody = tpl.body; }
                                    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                                    const session = await supabase.auth.getSession();
                                    await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.data.session?.access_token}` },
                                      body: JSON.stringify({ title: tplTitle, body: tplBody, target_user_id: req.user_id }),
                                    });
                                  } catch {}
                                }}>
                                  <Save className="h-3 w-3 mr-1" /> Link speichern
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {req.status === "pending" ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50" onClick={() => updateRequestStatus(req.id, "accepted")}>
                                    <Check className="h-3 w-3 mr-1" /> Annehmen
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50" onClick={() => updateRequestStatus(req.id, "in_progress")}>
                                    <Clock className="h-3 w-3 mr-1" /> In Arbeit
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50" onClick={() => {
                                    setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _showRejectReason: !r._showRejectReason } : r));
                                  }}>
                                    <XCircle className="h-3 w-3 mr-1" /> Ablehnen
                                  </Button>
                                </>
                              ) : (
                                <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg", statusConfig.bg, statusConfig.text)}>
                                  {req.status === "accepted" ? <CheckCircle2 className="h-3.5 w-3.5" /> : req.status === "in_progress" ? <Clock className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                  {statusConfig.label}
                                </span>
                              )}
                              {req.status !== "pending" && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => updateRequestStatus(req.id, "pending")}>
                                  <RefreshCw className="h-3 w-3 mr-1" /> Zurücksetzen
                                </Button>
                              )}
                            </div>
                            {req._showRejectReason && req.status === "pending" && (
                              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="input-gold-shimmer rounded-lg">
                                <Textarea
                                  placeholder="Grund für die Ablehnung..."
                                  value={req._rejectReason ?? ""}
                                  onChange={(e) => {
                                    setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _rejectReason: e.target.value } : r));
                                  }}
                                  rows={2}
                                  className="text-xs bg-destructive/5 border-transparent resize-none"
                                />
                                </div>
                                <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={async () => {
                                  const reason = req._rejectReason ?? "";
                                  const { error } = await supabase.from("model_requests").update({ status: "rejected", admin_comment: reason || null }).eq("id", req.id);
                                  if (error) { toast.error("Fehler beim Aktualisieren"); return; }
                                  toast.success("Anfrage abgelehnt");
                                  loadModelRequests();
                                  try {
                                    let tplTitle = "Update zu deiner Anfrage 📋";
                                    let tplBody = "Es gibt Neuigkeiten zu deiner Content-Anfrage! Schau jetzt nach.";
                                    const { data: tpl } = await supabase.from("notification_templates").select("title, body").eq("template_key", "request_update").maybeSingle();
                                    if (tpl && tpl.title.trim() && tpl.body.trim()) { tplTitle = tpl.title; tplBody = tpl.body; }
                                    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                                    const session = await supabase.auth.getSession();
                                    await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.data.session?.access_token}` },
                                      body: JSON.stringify({ title: tplTitle, body: tplBody, target_user_id: req.user_id }),
                                    });
                                  } catch {}
                                }}>
                                  <XCircle className="h-3 w-3 mr-1" /> Ablehnen
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className="h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent mx-4" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "botdms" && (
          <div className="space-y-4">
            {/* Bot Stats Cards */}
            {(() => {
              const botMissing = allAssignedAccounts.filter((acc) => {
                const saved = savedBotState[acc.id];
                return !saved || (!saved.message.trim() && !saved.followUp.trim());
              }).length;
              const botActive = allAssignedAccounts.filter((acc) => {
                const saved = savedBotState[acc.id];
                return saved && saved.isActive;
              }).length;
              const botInactive = allAssignedAccounts.length - botActive;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center">
                    <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Models gesamt</p>
                    <p className="text-3xl font-bold text-gold-gradient">{allAssignedAccounts.length}</p>
                  </div>
                  <button
                    onClick={() => setBotFilter(botFilter === "missing" ? "alle" : "missing")}
                    className={cn(
                      "glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center transition-all",
                      botFilter === "missing" && "ring-2 ring-destructive/60 shadow-[0_0_12px_-3px_hsl(var(--destructive)/0.2)] bg-destructive/5"
                    )}
                  >
                    <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Bot-DM fehlt</p>
                    <p className={cn("text-3xl font-bold", botMissing === 0 ? "text-gold-gradient" : botFilter === "missing" ? "text-destructive" : "text-destructive/80")}>{botMissing}</p>
                  </button>
                  <button
                    onClick={() => setBotFilter(botFilter === "active" ? "alle" : "active")}
                    className={cn(
                      "glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center transition-all",
                      botFilter === "active" && "ring-2 ring-accent shadow-[0_0_12px_-3px_hsl(var(--accent)/0.3)] bg-accent/5"
                    )}
                  >
                    <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Bot aktiv</p>
                    <p className={cn("text-3xl font-bold", botFilter === "active" ? "text-accent" : "text-gold-gradient")}>{botActive}</p>
                  </button>
                  <button
                    onClick={() => setBotFilter(botFilter === "inactive" ? "alle" : "inactive")}
                    className={cn(
                      "glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center transition-all",
                      botFilter === "inactive" && "ring-2 ring-destructive/60 shadow-[0_0_12px_-3px_hsl(var(--destructive)/0.2)] bg-destructive/5"
                    )}
                  >
                    <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Bot inaktiv</p>
                    <p className={cn("text-3xl font-bold", botInactive === 0 ? "text-gold-gradient" : botFilter === "inactive" ? "text-destructive" : "text-destructive/80")}>{botInactive}</p>
                  </button>
                </div>
              );
            })()}

            {/* Unified BotDMs & Setup Table */}
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">Setup</h2>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {accounts.length} Accounts
                </Badge>
              </div>

              {/* Search + Platform filter */}
              <div className="p-3 space-y-2 border-b border-border/50">
                <div className="relative input-gold-shimmer rounded-lg">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={setupSearch}
                    onChange={e => setSetupSearch(e.target.value)}
                    placeholder="Account suchen…"
                    className="pl-8 text-xs h-8 border-transparent"
                  />
                </div>
                <div className="flex gap-1 p-1 rounded-lg bg-secondary/30">
                  {(["all", "4Based", "Maloum", "Brezzels"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setSetupPlatform(p)}
                      className={cn(
                        "relative flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors duration-200 z-10",
                        setupPlatform === p
                          ? "text-accent"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {setupPlatform === p && (
                        <motion.div
                          layoutId="activeSetupPlatform"
                          className="absolute inset-0 bg-accent/15 rounded-md shadow-sm border border-accent/30"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{p === "all" ? "Alle" : p}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 flex-wrap">
                  {([
                    { key: "alle", label: "Alle" },
                    { key: "botdm_missing", label: "Bot DM fehlt" },
                    { key: "setup_missing", label: "Setup fehlt" },
                    { key: "massdm_missing", label: "MassDM fehlt" },
                    { key: "bot_active", label: "Bot aktiv" },
                    { key: "bot_inactive", label: "Bot inaktiv" },
                  ] as const).map(f => (
                    <button
                      key={f.key}
                      onClick={() => setSetupStatusFilter(f.key)}
                      className={cn(
                        "relative text-[10px] font-medium px-2.5 py-1.5 rounded-md transition-colors duration-200 z-10",
                        setupStatusFilter === f.key
                          ? "text-accent"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {setupStatusFilter === f.key && (
                        <motion.div
                          layoutId="activeSetupStatus"
                          className="absolute inset-0 bg-accent/15 rounded-md shadow-sm border border-accent/30"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[1fr_72px_44px_44px_44px_44px] gap-0 bg-accent/10 border-b border-accent/20">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold">Account</div>
                <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Plattform</div>
                <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">{setupPlatform === "all" || setupPlatform === "Maloum" ? "Bot" : ""}</div>
                <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Setup</div>
                <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Mass</div>
                <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">{setupPlatform === "all" || setupPlatform === "Maloum" ? "Aktiv" : ""}</div>
              </div>

              {/* Table Body */}
              {(() => {
                const getDash = (accId: string) => setupDashboards.find((d: any) => d.account_id === accId);

                const getField = (platform: string, type: "botdm" | "welcome" | "massdm") => {
                  if (type === "botdm") return platform === "Maloum" ? "maloum_botdm_done" : platform === "Brezzels" ? "brezzels_botdm_done" : "fourbased_botdm_done";
                  if (type === "welcome") return platform === "Maloum" ? "maloum_submitted" : platform === "Brezzels" ? "brezzels_submitted" : "fourbased_submitted";
                  return platform === "Maloum" ? "maloum_massdm_done" : platform === "Brezzels" ? "brezzels_massdm_done" : "fourbased_massdm_done";
                };

                const toggleSetupField = async (accountId: string, field: string, currentVal: boolean) => {
                  const dash = getDash(accountId);
                  if (dash) {
                    await supabase.from("model_dashboard").update({ [field]: !currentVal }).eq("id", dash.id);
                  } else {
                    await supabase.from("model_dashboard").insert({ account_id: accountId, [field]: !currentVal } as any);
                  }
                  await loadSetupDashboards();
                };

                const setupPlatformColors: Record<string, string> = {
                  "4Based": "bg-blue-500/15 text-blue-400 border-blue-500/30",
                  "Maloum": "bg-purple-500/15 text-purple-400 border-purple-500/30",
                  "Brezzels": "bg-orange-500/15 text-orange-400 border-orange-500/30",
                };

                // Filter accounts
                let filteredSetupAccounts = accounts.filter(acc => {
                  if (setupPlatform !== "all" && acc.platform !== setupPlatform) return false;
                  if (setupSearch) {
                    const q = setupSearch.toLowerCase();
                    return acc.account_email.toLowerCase().includes(q) || acc.account_domain.toLowerCase().includes(q);
                  }
                  return true;
                });

                // Apply status filter
                if (setupStatusFilter !== "alle") {
                  filteredSetupAccounts = filteredSetupAccounts.filter(acc => {
                    const d = getDash(acc.id);
                    const botdmF = getField(acc.platform, "botdm");
                    const welcomeF = getField(acc.platform, "welcome");
                    const massdmF = getField(acc.platform, "massdm");
                    const botdmDone = !!(d as any)?.[botdmF];
                    const welcomeDone = !!(d as any)?.[welcomeF];
                    const massdmDone = !!(d as any)?.[massdmF];
                    const entry = botMessages[acc.id];
                    const saved = savedBotState[acc.id];

                    if (setupStatusFilter === "botdm_missing") return !botdmDone;
                    if (setupStatusFilter === "setup_missing") return !welcomeDone;
                    if (setupStatusFilter === "massdm_missing") return !massdmDone;
                    if (setupStatusFilter === "bot_active") return saved && saved.isActive;
                    if (setupStatusFilter === "bot_inactive") return !saved || !saved.isActive;
                    return true;
                  });
                }

                if (filteredSetupAccounts.length === 0) {
                  return <p className="text-xs text-muted-foreground text-center py-8">Keine Accounts gefunden.</p>;
                }

                return (
                  <div className="divide-y divide-border/30">
                    {filteredSetupAccounts.map((acc, i) => {
                      const dash = getDash(acc.id);
                      const botdmField = getField(acc.platform, "botdm");
                      const welcomeField = getField(acc.platform, "welcome");
                      const massdmField = getField(acc.platform, "massdm");
                      const botdmVal = !!(dash as any)?.[botdmField];
                      const welcomeVal = !!(dash as any)?.[welcomeField];
                      const massdmVal = !!(dash as any)?.[massdmField];
                      const entry = botMessages[acc.id] || { message: "", followUp: "", isActive: false, saving: false };
                      const saved = savedBotState[acc.id];
                      const hasChanges = !saved || entry.message !== saved.message || entry.followUp !== saved.followUp || entry.isActive !== saved.isActive;
                      const isExpanded = expandedBot === acc.id;

                      return (
                        <div key={acc.id}>
                          {/* Row */}
                          <div
                            className={cn(
                              "grid grid-cols-[1fr_72px_44px_44px_44px_44px] gap-0 items-center transition-colors cursor-pointer hover:bg-accent/5",
                              i % 2 === 0 ? "bg-card/40" : "bg-card/20",
                              isExpanded && "bg-accent/5"
                            )}
                            onClick={() => setExpandedBot(isExpanded ? null : acc.id)}
                          >
                            <div className="px-3 py-2.5 min-w-0 flex items-center gap-2">
                              <ChevronDown className={cn(
                                "h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200",
                                isExpanded ? "rotate-0" : "-rotate-90"
                              )} />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{acc.account_email}</p>
                                {acc.account_domain && <p className="text-[10px] text-muted-foreground truncate">{acc.account_domain}</p>}
                              </div>
                            </div>
                            <div className="px-1 py-2 flex justify-center">
                              <span className={cn(
                                "text-[9px] font-medium px-2 py-0.5 rounded-full border",
                                setupPlatformColors[acc.platform] || "bg-secondary/50 text-muted-foreground border-border/30"
                              )}>
                                {acc.platform}
                              </span>
                            </div>
                            {/* Bot DM checkbox — only Maloum */}
                            {acc.platform === "Maloum" && (
                              <div className="flex justify-center py-2" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleSetupField(acc.id, botdmField, botdmVal)}
                                  className={cn(
                                    "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200",
                                    botdmVal ? "border-accent bg-accent/20" : "border-muted-foreground/30 bg-transparent hover:border-accent/50"
                                  )}
                                >
                                  {botdmVal && <CheckCircle2 className="h-3 w-3 text-accent" />}
                                </button>
                              </div>
                            )}
                            {acc.platform !== "Maloum" && <div />}
                            {/* Setup checkbox — all platforms */}
                            <div className="flex justify-center py-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => toggleSetupField(acc.id, welcomeField, welcomeVal)}
                                className={cn(
                                  "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200",
                                  welcomeVal ? "border-accent bg-accent/20" : "border-muted-foreground/30 bg-transparent hover:border-accent/50"
                                )}
                              >
                                {welcomeVal && <CheckCircle2 className="h-3 w-3 text-accent" />}
                              </button>
                            </div>
                            {/* MassDM checkbox — all platforms */}
                            <div className="flex justify-center py-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => toggleSetupField(acc.id, massdmField, massdmVal)}
                                className={cn(
                                  "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200",
                                  massdmVal ? "border-accent bg-accent/20" : "border-muted-foreground/30 bg-transparent hover:border-accent/50"
                                )}
                              >
                                {massdmVal && <CheckCircle2 className="h-3 w-3 text-accent" />}
                              </button>
                            </div>
                            {/* Active indicator — only Maloum */}
                            {acc.platform === "Maloum" && (
                              <div className="flex justify-center py-2">
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    entry.isActive ? "border-accent bg-accent/20" : "border-muted-foreground/30 bg-transparent"
                                  )}
                                >
                                  {entry.isActive && <span className="h-2 w-2 rounded-full bg-accent" />}
                                </div>
                              </div>
                            )}
                            {acc.platform !== "Maloum" && <div />}
                          </div>

                          {/* Expanded: Bot Message + Follow-Up editing */}
                          {isExpanded && (
                            <div className="px-4 py-3 bg-secondary/10 border-t border-border/30 space-y-3 animate-in slide-in-from-top-1 fade-in duration-200">
                              {/* Credentials copy row */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => { navigator.clipboard.writeText(acc.account_email); toast.success("E-Mail kopiert"); }}
                                  className="glass-card-subtle rounded-lg px-3 py-2 text-left hover:bg-accent/5 transition-colors group"
                                >
                                  <p className="text-[10px] text-muted-foreground mb-0.5">E-Mail</p>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium text-foreground truncate flex-1">{acc.account_email}</p>
                                    <Copy className="h-3 w-3 text-muted-foreground group-hover:text-accent shrink-0" />
                                  </div>
                                </button>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(acc.account_password); toast.success("Passwort kopiert"); }}
                                  className="glass-card-subtle rounded-lg px-3 py-2 text-left hover:bg-accent/5 transition-colors group"
                                >
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Passwort</p>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium text-foreground truncate flex-1">••••••••</p>
                                    <Copy className="h-3 w-3 text-muted-foreground group-hover:text-accent shrink-0" />
                                  </div>
                                </button>
                              </div>

                              {/* Bot Message + Follow-up + Save + Aktiv — only for Maloum */}
                              {acc.platform === "Maloum" && (
                                <>
                                  {/* Aktiv Toggle */}
                                  <div className="flex items-center justify-between glass-card-subtle rounded-lg px-3 py-2">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bot aktiv</span>
                                    <Switch
                                      checked={entry.isActive}
                                      onCheckedChange={(checked) => {
                                        setBotMessages((prev) => ({
                                          ...prev,
                                          [acc.id]: { ...entry, isActive: checked },
                                        }));
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bot-Nachricht</label>
                                    <div className="input-gold-shimmer rounded-lg">
                                      <Textarea
                                        value={entry.message}
                                        onChange={(e) =>
                                          setBotMessages((prev) => ({
                                            ...prev,
                                            [acc.id]: { ...entry, message: e.target.value },
                                          }))
                                        }
                                        placeholder="Hey! Schreib mir gerne eine Nachricht 💋"
                                        className="text-sm min-h-[60px] resize-none bg-background/50 border-transparent"
                                        onClick={e => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Follow-up Nachricht</label>
                                    <div className="input-gold-shimmer rounded-lg">
                                      <Textarea
                                        value={entry.followUp}
                                        onChange={(e) =>
                                          setBotMessages((prev) => ({
                                            ...prev,
                                            [acc.id]: { ...entry, followUp: e.target.value },
                                          }))
                                        }
                                        placeholder="Na, hast du meine letzte Nachricht gelesen? 😏"
                                        className="text-sm min-h-[60px] resize-none bg-background/50 border-transparent"
                                        onClick={e => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>

                                  <Button
                                    onClick={() => saveBotMessage(acc.id)}
                                    disabled={entry.saving || !hasChanges}
                                    variant={hasChanges ? "default" : "secondary"}
                                    className="w-full"
                                    size="sm"
                                  >
                                    {entry.saving ? (
                                      <>
                                        <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                                        Wird gespeichert...
                                      </>
                                    ) : hasChanges ? (
                                      <>
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                        Speichern
                                      </>
                                    ) : (
                                      <>
                                        <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Gespeichert
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Footer */}
              <div className="px-3 py-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{accounts.length} Accounts</span>
              </div>
            </section>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center">
                <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Gesendet</p>
                <p className="text-3xl font-bold text-gold-gradient">{notifHistory.length}</p>
              </div>
              <div className="glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center">
                <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Geplant</p>
                <p className="text-3xl font-bold text-gold-gradient">{schedules.filter((s: any) => s.is_active).length}</p>
              </div>
              <div className="glass-card-subtle rounded-xl p-4 flex flex-col items-center justify-center">
                <p className="text-[9px] text-muted-foreground mb-1 tracking-wide uppercase">Pausiert</p>
                <p className={cn("text-3xl font-bold", schedules.filter((s: any) => !s.is_active).length === 0 ? "text-gold-gradient" : "text-muted-foreground")}>{schedules.filter((s: any) => !s.is_active).length}</p>
              </div>
            </div>

            {/* Send Notification */}
            <section className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setNotifSendOpen(!notifSendOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-secondary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-foreground">Sofort senden</h2>
                    <p className="text-[10px] text-muted-foreground">Push an alle Nutzer</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", notifSendOpen && "rotate-180")} />
              </button>
              {notifSendOpen && (
              <>
              <div className="p-4 space-y-3">
                <div className="input-gold-shimmer rounded-lg">
                <Input
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Titel der Benachrichtigung"
                  className="text-sm bg-secondary/30 border-transparent"
                  maxLength={100}
                />
                </div>
                <div className="input-gold-shimmer rounded-lg">
                <Textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Nachricht eingeben..."
                  className="text-sm min-h-[80px] bg-secondary/30 border-transparent resize-none"
                  maxLength={500}
                />
                </div>
                <Button
                  onClick={handleSendNotification}
                  disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {notifSending ? "Wird gesendet..." : "An alle senden"}
                </Button>
              </div>

              {/* History */}
              {notifHistory.length > 0 && (
                <>
                  <button
                    onClick={() => setNotifHistoryOpen(!notifHistoryOpen)}
                    className="w-full px-5 py-3 border-t border-border/50 flex items-center justify-between hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold text-foreground">Verlauf</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{notifHistory.length}</Badge>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", notifHistoryOpen && "rotate-180")} />
                  </button>
                  {notifHistoryOpen && (
                    <div className="p-3 space-y-2">
                      {notifHistory.map((n: any) => (
                        <div key={n.id} className="glass-card-subtle rounded-xl px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{n.title}</p>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {n.recipients_count}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {new Date(n.sent_at).toLocaleString("de-DE")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              </>
              )}
            </section>

            {/* Scheduled Notifications */}
            <section className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setSchedSectionOpen(!schedSectionOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-secondary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Repeat className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-foreground">Geplante Benachrichtigung</h2>
                    <p className="text-[10px] text-muted-foreground">Wiederkehrende Push-Nachrichten</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", schedSectionOpen && "rotate-180")} />
              </button>
              {schedSectionOpen && (
              <>
              <div className="p-4 space-y-3">
                <div className="input-gold-shimmer rounded-lg">
                <Input
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  placeholder="Titel"
                  className="text-sm bg-secondary/30 border-transparent"
                  maxLength={100}
                />
                </div>
                <div className="input-gold-shimmer rounded-lg">
                <Textarea
                  value={schedBody}
                  onChange={(e) => setSchedBody(e.target.value)}
                  placeholder="Nachricht..."
                  className="text-sm min-h-[60px] bg-secondary/30 border-transparent resize-none"
                  maxLength={500}
                />
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Häufigkeit</label>
                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-secondary/40 backdrop-blur-sm border border-border/30 relative w-full">
                    {(["daily", "weekly", "monthly"] as const).map((f) => (
                      <button
                        key={f}
                        className={cn(
                          "relative flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 z-10",
                          schedFrequency === f
                            ? "text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setSchedFrequency(f)}
                      >
                        {schedFrequency === f && (
                          <motion.div
                            layoutId="activeFrequency"
                            className="absolute inset-0 bg-accent rounded-lg shadow-md shadow-accent/20"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">
                          {f === "daily" ? "Täglich" : f === "weekly" ? "Wöchentlich" : "Monatlich"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Uhrzeit (deutsche Zeit)</label>
                  <div className="input-gold-shimmer rounded-lg w-32">
                  <Input
                    type="time"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="text-sm w-full bg-secondary/30 border-transparent"
                  />
                  </div>
                </div>

                {/* Weekday for weekly */}
                {schedFrequency === "weekly" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Wochentag</label>
                    <div className="flex gap-1">
                      {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((day, i) => (
                        <button
                          key={i}
                          className={cn(
                            "h-8 w-9 rounded-lg text-xs font-medium transition-all",
                            schedWeekday === i
                              ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                              : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                          )}
                          onClick={() => setSchedWeekday(i)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day of month for monthly */}
                {schedFrequency === "monthly" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tag im Monat</label>
                    <div className="input-gold-shimmer rounded-lg w-20">
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={schedDayOfMonth}
                      onChange={(e) => setSchedDayOfMonth(Number(e.target.value))}
                      className="text-sm w-full bg-secondary/30 border-transparent"
                    />
                    </div>
                  </div>
                )}

                <Button
                  onClick={saveSchedule}
                  disabled={schedSaving || !schedTitle.trim() || !schedBody.trim()}
                  className="w-full"
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  {schedSaving ? "Wird gespeichert..." : "Benachrichtigung planen"}
                </Button>
              </div>

              {/* Scheduled list */}
              <button
                onClick={() => setSchedListOpen(!schedListOpen)}
                className="w-full px-5 py-3 border-t border-border/50 flex items-center justify-between hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">Geplante Benachrichtigungen</span>
                  {schedules.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{schedules.length}</Badge>}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", schedListOpen && "rotate-180")} />
              </button>
              {schedListOpen && (
                <div className="p-3 space-y-2">
                  {schedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Noch keine geplanten Benachrichtigungen.</p>
                  ) : (
                    schedules.map((s: any) => (
                      <div key={s.id} className="glass-card-subtle rounded-xl px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{s.body}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => toggleScheduleActive(s.id, s.is_active)}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                s.is_active ? "hover:bg-accent/10" : "hover:bg-secondary/50"
                              )}
                              title={s.is_active ? "Pausieren" : "Aktivieren"}
                            >
                              {s.is_active ? <Pause className="h-3.5 w-3.5 text-accent" /> : <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                            <button
                              onClick={() => setSchedDeleteConfirm(s.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                          <span className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                            s.is_active ? "bg-accent/10 text-accent" : "bg-secondary/50 text-muted-foreground"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", s.is_active ? "bg-accent animate-pulse" : "bg-muted-foreground")} />
                            {s.is_active ? "Aktiv" : "Pausiert"}
                          </span>
                          <span>
                            {s.frequency === "daily" ? "Täglich" : s.frequency === "weekly" ? `Wöchentlich (${["So","Mo","Di","Mi","Do","Fr","Sa"][s.weekday ?? 1]})` : `Monatlich (${s.day_of_month ?? 1}.)`}
                          </span>
                          <span>um {(() => { const [h,m] = (s.send_time || "09:00").split(":").map(Number); const d = new Date(Date.UTC(2025,0,1,h,m)); return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }); })()} Uhr</span>
                          {s.last_sent_at && <span>· Zuletzt: {new Date(s.last_sent_at).toLocaleString("de-DE")}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              </>
              )}
            </section>

            {/* Standard Notification Templates */}
            <section className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setTemplatesSectionOpen(!templatesSectionOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-secondary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Star className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-foreground">Standard-Benachrichtigungen</h2>
                    <p className="text-[10px] text-muted-foreground">Vorlagen für automatische Nachrichten</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", templatesSectionOpen && "rotate-180")} />
              </button>
              {templatesSectionOpen && (
                <div className="p-4 space-y-3">
                  {notifTemplates.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Keine Vorlagen vorhanden.</p>
                  ) : (
                    notifTemplates.map((tpl) => {
                      const isEditing = editingTemplate === tpl.id;
                      const edits = templateEdits[tpl.id] || { title: tpl.title, body: tpl.body };
                      return (
                        <div key={tpl.id} className="glass-card-subtle rounded-xl px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">{tpl.label}</Badge>
                            </div>
                            {!isEditing ? (
                              <button
                                onClick={() => {
                                  setEditingTemplate(tpl.id);
                                  setTemplateEdits(prev => ({ ...prev, [tpl.id]: { title: tpl.title, body: tpl.body } }));
                                }}
                                className="text-xs text-accent hover:text-accent/80 transition-colors"
                              >
                                Bearbeiten
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditingTemplate(null)}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Abbrechen
                                </button>
                                <Button
                                  size="sm"
                                  onClick={() => saveTemplate(tpl.id)}
                                  disabled={templateSaving === tpl.id}
                                  className="h-7 text-xs px-3"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  {templateSaving === tpl.id ? "..." : "Speichern"}
                                </Button>
                              </div>
                            )}
                          </div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="input-gold-shimmer rounded-lg">
                              <Input
                                value={edits.title}
                                onChange={(e) => setTemplateEdits(prev => ({ ...prev, [tpl.id]: { ...edits, title: e.target.value } }))}
                                placeholder="Titel"
                                className="text-sm bg-secondary/30 border-transparent"
                              />
                              </div>
                              <div className="input-gold-shimmer rounded-lg">
                              <Textarea
                                value={edits.body}
                                onChange={(e) => setTemplateEdits(prev => ({ ...prev, [tpl.id]: { ...edits, body: e.target.value } }))}
                                placeholder="Nachricht"
                                className="text-sm min-h-[60px] bg-secondary/30 border-transparent resize-none"
                              />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium text-foreground">{tpl.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{tpl.body}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Delete Schedule Confirmation */}
        <AlertDialog open={!!schedDeleteConfirm} onOpenChange={() => setSchedDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Geplante Benachrichtigung löschen?</AlertDialogTitle>
              <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={() => schedDeleteConfirm && deleteSchedule(schedDeleteConfirm)}>Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {activeTab === "kiprompt" && (
          <div className="space-y-4">
            {/* Dashboard Chat Prompt */}
            <section className={cn("glass-card rounded-xl overflow-hidden", !chatPromptOpen && "border-b-0")}>
              <button
                onClick={() => setChatPromptOpen(!chatPromptOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !chatPromptOpen && "-rotate-90")} />
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-bold text-foreground">Dashboard Chat-Prompt</h2>
                  {kiPrompt !== kiPromptOriginal && (
                    <Badge className="text-[10px] bg-accent/20 text-accent">Ungespeichert</Badge>
                  )}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {chatPromptOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Dieser Prompt wird im Dashboard-Chatfenster als Anweisung an die KI gesendet.
                  </p>
                  {kiPromptLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : (
                    <>
                      <div className="input-gold-shimmer rounded-lg">
                      <Textarea
                        value={kiPrompt}
                        onChange={(e) => { setKiPrompt(e.target.value); setKiPromptSaved(false); }}
                        className="min-h-[300px] text-sm resize-y bg-background/50 border-transparent leading-relaxed"
                        placeholder="System-Prompt eingeben..."
                      />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {kiPrompt.length} Zeichen
                        </span>
                        {kiPrompt !== kiPromptOriginal ? (
                          <Button onClick={saveKiPrompt} disabled={kiPromptSaving} size="sm">
                            {kiPromptSaving ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Wird gespeichert...</>
                            ) : (
                              <><Save className="h-3.5 w-3.5 mr-1.5" />Prompt speichern</>
                            )}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-accent flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Prompt gespeichert
                          </span>
                        )}
                      </div>
                    </>
                  )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Chat-Analysen Prompt */}
            <section className={cn("glass-card rounded-xl overflow-hidden", !analysisPromptOpen && "border-b-0")}>
              <button
                onClick={() => setAnalysisPromptOpen(!analysisPromptOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !analysisPromptOpen && "-rotate-90")} />
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-bold text-foreground">Chat-Analysen Prompt</h2>
                  {analysisPrompt !== analysisPromptOriginal && (
                    <Badge className="text-[10px] bg-accent/20 text-accent">Ungespeichert</Badge>
                  )}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {analysisPromptOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Dieser Prompt wird für die KI-gestützten Chat-Analysen der Chatter verwendet.
                  </p>
                  {analysisPromptLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : (
                    <>
                      <div className="input-gold-shimmer rounded-lg">
                      <Textarea
                        value={analysisPrompt}
                        onChange={(e) => setAnalysisPrompt(e.target.value)}
                        className="min-h-[300px] text-sm resize-y bg-background/50 border-transparent leading-relaxed"
                        placeholder="Analyse-Prompt eingeben..."
                      />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {analysisPrompt.length} Zeichen
                        </span>
                        {analysisPrompt !== analysisPromptOriginal ? (
                          <Button onClick={saveAnalysisPrompt} disabled={analysisPromptSaving} size="sm">
                            {analysisPromptSaving ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Wird gespeichert...</>
                            ) : (
                              <><Save className="h-3.5 w-3.5 mr-1.5" />Prompt speichern</>
                            )}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-accent flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Prompt gespeichert
                          </span>
                        )}
                      </div>
                    </>
                  )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>
        )}

        {activeTab === "chatter_overview" && (
          <ChatterOverviewTab
            assignments={assignments}
            assignmentsLoading={assignmentsLoading}
            chatters={chatters}
          />
        )}

        {activeTab === "platzhalter" && <ModelDashboardTab />}

        {activeTab === "chatter_dash" && <ChatterDashboardTab isSuperAdmin={isSuperAdmin} adminEmails={Object.fromEntries(adminList.map(a => [a.user_id, a.email]))} />}

        {/* Dynamic Sub-Admin Tabs */}
        {activeTab.startsWith("sub_") && isSuperAdmin && (() => {
          const subAdminId = activeTab.replace("sub_", "");
          const subAdmin = adminList.find(a => a.user_id === subAdminId);
          const subAdminAccounts = accounts.filter(a => (a as any).created_by === subAdminId);
          const subAdminChatters = chatters.filter(c =>
            c.assigned_accounts?.some(acc => (acc as any).created_by === subAdminId)
          );
          return (
            <div className="space-y-4">
              <section className="glass-card rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Sub-Admin: {subAdmin?.email || subAdminId}
                  </h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {subAdminAccounts.length} Accounts · {subAdminChatters.length} Chatter
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Accounts */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Accounts</h3>
                    {subAdminAccounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Keine Accounts erstellt</p>
                    ) : (
                      <div className="space-y-1.5">
                        {subAdminAccounts.map(acc => (
                          <div key={acc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
                            <span className="text-xs font-medium text-foreground truncate flex-1">{acc.account_email || acc.platform}</span>
                            <span className="text-[9px] bg-accent/10 text-accent border border-accent/30 rounded px-1.5 py-0.5">{acc.platform}</span>
                            <span className={`text-[9px] rounded px-1.5 py-0.5 ${acc.assigned_to ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-secondary/50 text-muted-foreground border border-border/30"}`}>
                              {acc.assigned_to ? "Vergeben" : "Frei"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Chatters */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chatter</h3>
                    {subAdminChatters.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Keine Chatter zugewiesen</p>
                    ) : (
                      <div className="space-y-1.5">
                        {subAdminChatters.map(c => (
                          <div key={c.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
                            <span className="text-xs font-medium text-foreground truncate flex-1">{c.group_name || c.account_email || c.user_id.slice(0, 8)}</span>
                            {c.assigned_accounts?.map(acc => (
                              <span key={acc.id} className="text-[9px] bg-accent/10 text-accent border border-accent/30 rounded px-1.5 py-0.5">{acc.platform}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          );
        })()}

        {activeTab === "gdrive" && (
          <div className="space-y-4">
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">Google Drive Automatisierung</h2>
              </div>
              <div className="p-4 space-y-5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Wenn ein Chatter einen Account zugewiesen bekommt, wird der zugehörige Google Drive Ordner automatisch mit seiner <span className="font-semibold text-foreground">Login-E-Mail</span> geteilt.
                </p>

                {/* Setup Checklist */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                    Setup-Schritte
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        step: "1",
                        title: "Google Cloud Projekt erstellen",
                        desc: (
                          <>
                            Gehe zu{" "}
                            <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent/80">
                              console.cloud.google.com
                            </a>{" "}
                            und erstelle ein neues Projekt (oder nutze ein bestehendes).
                          </>
                        ),
                      },
                      {
                        step: "2",
                        title: "Google Drive API aktivieren",
                        desc: (
                          <>
                            Im Projekt → „APIs & Dienste" → „Bibliothek" → nach „Google Drive API" suchen → <span className="font-semibold text-foreground">Aktivieren</span>.
                          </>
                        ),
                      },
                      {
                        step: "3",
                        title: "Service Account erstellen",
                        desc: (
                          <>
                            „APIs & Dienste" → „Anmeldedaten" → „Anmeldedaten erstellen" → „Dienstkonto". Namen vergeben (z.B. „drive-bot"), Fertig klicken.
                          </>
                        ),
                      },
                      {
                        step: "4",
                        title: "JSON-Key herunterladen",
                        desc: (
                          <>
                            Das neue Dienstkonto öffnen → Tab „Schlüssel" → „Schlüssel hinzufügen" → „Neuen Schlüssel erstellen" → <span className="font-semibold text-foreground">JSON</span>. Datei wird heruntergeladen.
                          </>
                        ),
                      },
                      {
                        step: "5",
                        title: "Service Account zum Drive-Ordner einladen",
                        desc: (
                          <>
                            Den übergeordneten Google Drive Ordner öffnen → „Teilen" → Die E-Mail des Service Accounts (z.B. <span className="font-mono text-[10px] text-accent">drive-bot@projekt.iam.gserviceaccount.com</span>) als <span className="font-semibold text-foreground">Bearbeiter</span> hinzufügen.
                          </>
                        ),
                      },
                      {
                        step: "6",
                        title: "Secrets hier speichern",
                        desc: (
                          <>
                            Unten die zwei Werte aus der JSON-Datei eingeben: <span className="font-mono text-[10px] text-accent">client_email</span> und <span className="font-mono text-[10px] text-accent">private_key</span>.
                          </>
                        ),
                      },
                      {
                        step: "7",
                        title: "Folder IDs bei Accounts hinterlegen",
                        desc: (
                          <>
                            Beim Anlegen von Accounts im Account-Pool das Feld „Google Drive Folder ID" ausfüllen. Die Folder ID findest du in der URL:{" "}
                            <span className="font-mono text-[10px] text-accent break-all">drive.google.com/drive/folders/<span className="font-bold underline">FOLDER_ID_HIER</span></span>
                          </>
                        ),
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">
                          {item.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secrets Input Section */}
                <div className="border-t border-border/50 pt-4 space-y-3">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-accent" />
                    Secrets konfigurieren
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Klicke auf den Button unten, um die Google Service Account Secrets sicher zu speichern. Du brauchst die zwei Werte aus der heruntergeladenen JSON-Datei.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <p className="text-xs font-semibold text-foreground">GOOGLE_SERVICE_ACCOUNT_EMAIL</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Der Wert von <span className="font-mono text-accent">client_email</span> aus der JSON-Datei</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <p className="text-xs font-semibold text-foreground">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Der Wert von <span className="font-mono text-accent">private_key</span> aus der JSON-Datei (inkl. <span className="font-mono">-----BEGIN PRIVATE KEY-----</span>)</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    💡 Die Secrets werden sicher im Backend gespeichert und sind nie im Frontend sichtbar. Schreib mir im Chat „Secrets hinzufügen", dann leite ich dich durch den Prozess.
                  </p>
                </div>

                {/* Status */}
                <div className="border-t border-border/50 pt-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-accent/30 bg-accent/5">
                    <Clock className="h-4 w-4 text-accent flex-shrink-0" />
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">Status:</span> Sobald die Secrets gespeichert und die Folder IDs hinterlegt sind, funktioniert die automatische Freigabe bei jeder Account-Zuweisung.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-5">
            {/* Firmendaten / Issuer Settings */}
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">Firmendaten (Issuer)</h2>
                {settingsIssuerSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
                {!settingsIssuerSaving && settingsIssuerLoaded && <CheckCircle2 className="h-3 w-3 text-accent ml-auto" />}
              </div>
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Diese Daten werden als Aussteller in allen Provider Invoices (Model- & Mitarbeiter-Dashboard) verwendet. Änderungen gelten sofort systemweit.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Firmenname</label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={settingsIssuer.name}
                        onChange={(e) => saveIssuerSettings({ name: e.target.value })}
                        className="text-sm border-transparent"
                        placeholder="Firmenname"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">VAT ID</label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={settingsIssuer.vat_id}
                        onChange={(e) => saveIssuerSettings({ vat_id: e.target.value })}
                        className="text-sm border-transparent"
                        placeholder="VAT ID"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Adresse</label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={settingsIssuer.address}
                        onChange={(e) => saveIssuerSettings({ address: e.target.value })}
                        className="text-sm border-transparent"
                        placeholder="Adresse"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">KVK / Registernummer</label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        value={settingsIssuer.kvk}
                        onChange={(e) => saveIssuerSettings({ kvk: e.target.value })}
                        className="text-sm border-transparent"
                        placeholder="Registernummer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Invoice-Nummer / Sequence */}
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Hash className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">Provider Invoice Nummerierung</h2>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-[11px] text-muted-foreground">
                  Die nächste Provider Invoice erhält automatisch die nächste fortlaufende Nummer. Du kannst den Zählerstand hier anpassen.
                </p>
                {settingsSeqValue !== null ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground">Aktueller Zählerstand</p>
                        <p className="text-lg font-bold text-foreground font-mono">{settingsSeqValue}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground">Nächste Invoice-Nummer</p>
                        <p className="text-lg font-bold text-accent font-mono">
                          GS-{new Date().getFullYear()}-{String(settingsSeqValue + 1).padStart(4, "0")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSeqValue(settingsSeqValue - 1)}
                        disabled={settingsSeqValue <= 0}
                        className="h-8 gap-1"
                      >
                        <ArrowDown className="h-3 w-3" /> -1
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSeqValue(settingsSeqValue + 1)}
                        className="h-8 gap-1"
                      >
                        <ArrowUp className="h-3 w-3" /> +1
                      </Button>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <label className="text-xs text-muted-foreground">Setze auf:</label>
                        <div className="input-gold-shimmer rounded-lg">
                          <Input
                            type="number"
                            min={0}
                            className="w-24 text-sm border-transparent text-center"
                            value={settingsSeqValue}
                            onChange={(e) => setSettingsSeqValue(Number(e.target.value))}
                            onBlur={() => updateSeqValue(settingsSeqValue)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Lade Nummerierung...</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "admin_mgmt" && (
          <div className="space-y-5">
            {/* Admin hinzufügen */}
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground">Admins verwalten</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Add new admin */}
                <div className="flex gap-2">
                  <div className="relative flex-1 input-gold-shimmer rounded-lg">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="E-Mail des neuen Admins..."
                      className="pl-9 text-sm border-transparent"
                      onKeyDown={(e) => e.key === "Enter" && addAdmin()}
                    />
                  </div>
                  <Button
                    onClick={addAdmin}
                    disabled={!newAdminEmail.trim() || addingAdmin}
                    size="sm"
                  >
                    {addingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hinzufügen"}
                  </Button>
                </div>

                {/* Admin list */}
                {adminListLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : adminList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Keine Admins gefunden.</p>
                ) : (
                  <div className="space-y-2">
                    {adminList.map((admin) => (
                      <div
                        key={admin.user_id}
                        className="flex items-center justify-between glass-card-subtle rounded-lg px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <Shield className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="text-sm text-foreground truncate">{admin.email}</span>
                          {admin.has_totp ? (
                            <Badge variant="secondary" className="text-[9px] shrink-0">2FA ✓</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-destructive shrink-0">Kein 2FA</Badge>
                          )}
                          {admin.user_id === user?.id && (
                            <Badge className="text-[9px] shrink-0">Du</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Role toggle */}
                          {admin.user_id !== user?.id ? (
                            <button
                              type="button"
                              onClick={() => changeAdminRole(
                                admin.user_id,
                                admin.role === "super_admin" ? "sub_admin" : "super_admin"
                              )}
                              className={cn(
                                "text-[9px] font-semibold px-2 py-1 rounded-md border transition-all",
                                admin.role === "super_admin" || admin.role === "admin"
                                  ? "bg-accent/15 text-accent border-accent/30"
                                  : "bg-secondary/30 text-muted-foreground border-border/50 hover:border-accent/30"
                              )}
                            >
                              {admin.role === "super_admin" || admin.role === "admin" ? "Super-Admin" : "Sub-Admin"}
                            </button>
                          ) : (
                            <Badge variant="secondary" className="text-[9px]">
                              {admin.role === "super_admin" || admin.role === "admin" ? "Super-Admin" : "Sub-Admin"}
                            </Badge>
                          )}
                          {admin.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setRemoveAdminConfirm(admin.user_id)}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Sub-Admin Zuweisungen */}
            <section className="glass-card rounded-xl p-4">
              <SubAdminManager />
            </section>
          </div>
        )}

          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* Remove Admin Confirm Dialog */}
      {isSuperAdmin && (
        <AlertDialog open={!!removeAdminConfirm} onOpenChange={() => setRemoveAdminConfirm(null)}>
          <AlertDialogContent className="glass-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Admin entfernen?</AlertDialogTitle>
              <AlertDialogDescription>
                Dieser Benutzer verliert den Admin-Zugang und sein 2FA wird zurückgesetzt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removeAdminConfirm && removeAdmin(removeAdminConfirm)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Entfernen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* New Admin Credentials Dialog */}
      {isSuperAdmin && newAdminCredentials && (
        <Dialog open={!!newAdminCredentials} onOpenChange={() => setNewAdminCredentials(null)}>
          <DialogContent className="glass-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" />
                Neuer Admin erstellt
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ein neues Konto wurde erstellt. Teile diese Zugangsdaten mit dem neuen Admin – das Passwort wird nur einmal angezeigt!
              </p>
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">E-Mail</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-foreground select-all break-all">{newAdminCredentials?.email}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText(newAdminCredentials?.email || ""); toast.success("E-Mail kopiert"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Passwort</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-foreground select-all break-all">{newAdminCredentials?.password}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText(newAdminCredentials?.password || ""); toast.success("Passwort kopiert"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-accent">
                ⚠️ Der neue Admin muss sich über <span className="font-semibold">/admin/login</span> einloggen und dort 2FA einrichten.
              </p>
              <Button className="w-full" onClick={() => setNewAdminCredentials(null)}>Verstanden</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Account Pool Dialog */}
      <Dialog open={accountPoolOpen} onOpenChange={(o) => { setAccountPoolOpen(o); if (!o) { setPoolFilter("alle"); setPoolSearchQuery(""); } }}>
        <DialogContent className="glass-card border-border sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <span className="capitalize">{selectedPlatform}</span>
                  <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Account-Pool verwalten</p>
                </div>
              </DialogTitle>
              <div className="flex items-center gap-2">
                {freeCount > 0 && (
                  <Button onClick={openAssignDialog} size="sm" variant="default" className="h-8 text-xs gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    Auto-Zuweisen
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setDeletePoolConfirm(true)} className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive h-8 text-[10px] gap-1">
                  <Trash2 className="h-3 w-3" /> Löschen
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Stats row */}
          <div className="flex items-center gap-4 px-1 pt-2">
            <div className="flex gap-3 text-xs flex-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/50">
                <span className="text-muted-foreground">Gesamt</span>
                <span className="text-foreground font-bold">{platformAccounts.length}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/5 border border-accent/20">
                <span className="text-accent">Frei</span>
                <span className="text-accent font-bold">{freeCount}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/50">
                <span className="text-muted-foreground">Vergeben</span>
                <span className="text-foreground font-bold">{assignedCount}</span>
              </div>
            </div>
          </div>

          {/* Account List */}
          <div className="flex-1 overflow-hidden flex flex-col pt-3 min-h-0">
            <div className="flex-1 flex flex-col min-h-0 gap-3">
              {/* Filter + Search */}
              <div className="flex items-center gap-2">
                {platformAccounts.length > 0 && (
                  <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border/50">
                    {(["alle", "frei", "vergeben"] as const).map((f) => (
                      <button key={f} onClick={() => setPoolFilter(f)}
                        className="relative text-[10px] font-medium px-3 py-1.5 rounded-md transition-colors z-10">
                        <span className={poolFilter === f ? "text-accent" : "text-muted-foreground hover:text-foreground"}>
                          {f === "alle" ? "Alle" : f === "frei" ? "Frei" : "Vergeben"}
                        </span>
                        {poolFilter === f && (
                          <motion.div
                            layoutId="activePoolFilter"
                            className="absolute inset-0 bg-accent/15 rounded-md shadow-sm"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative flex-1 input-gold-shimmer rounded-lg">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={poolSearchQuery}
                    onChange={(e) => setPoolSearchQuery(e.target.value)}
                    placeholder="Suchen..."
                    className="pl-8 text-xs h-8 border-transparent"
                  />
                </div>
              </div>

              {/* Scrollable account list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
                {(() => {
                  const filtered = platformAccounts.filter((acc) => {
                    if (poolFilter === "frei" && acc.assigned_to) return false;
                    if (poolFilter === "vergeben" && !acc.assigned_to) return false;
                    if (poolSearchQuery.trim()) {
                      const q = poolSearchQuery.toLowerCase();
                      return (acc.account_email?.toLowerCase().includes(q) || acc.account_domain?.toLowerCase().includes(q));
                    }
                    return true;
                  });
                  if (filtered.length === 0) return (
                    <div className="glass-card-subtle rounded-xl p-8 text-center">
                      <Package className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-muted-foreground">
                        {platformAccounts.length === 0 ? `Noch keine Accounts für ${selectedPlatform}.` : "Keine Accounts für diesen Filter."}
                      </p>
                    </div>
                  );
                  const copyToClipboard = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} kopiert!`); };
                  return filtered.map((acc) => (
                    <div key={acc.id} className="glass-card-subtle rounded-lg p-3 group/card hover:border-accent/30 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", acc.assigned_to ? "bg-muted-foreground/30" : "bg-emerald-500")} />
                          {acc.assigned_to ? (
                            <Badge className="text-[9px] bg-secondary text-secondary-foreground">→ {getChatterName(acc.assigned_to)}</Badge>
                          ) : (
                            <Badge className="text-[9px] bg-accent/15 text-accent border-accent/20">Frei</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          {acc.assigned_to && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-accent" title="Freigeben"
                              onClick={async () => {
                                if (acc.drive_folder_id && acc.assigned_to) await revokeDriveAccess([acc.id], acc.assigned_to);
                                await supabase.from("accounts").update({ assigned_to: null, assigned_at: null }).eq("id", acc.id);
                                toast.success("Account freigegeben"); loadAccounts(); loadChatters();
                              }}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Löschen"
                            onClick={async () => {
                              await supabase.from("accounts").delete().eq("id", acc.id);
                              toast.success("Account gelöscht"); loadAccounts();
                            }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <button onClick={() => copyToClipboard(acc.account_email, "E-Mail")} className="w-full flex items-center gap-2 p-1.5 -mx-1.5 rounded-md hover:bg-accent/5 transition-colors group/copy text-left">
                        <Copy className="h-3 w-3 text-muted-foreground group-hover/copy:text-accent shrink-0 transition-colors" />
                        <span className="text-xs font-medium text-foreground truncate">{acc.account_email}</span>
                      </button>
                      <button onClick={() => copyToClipboard(acc.account_password, "Passwort")} className="w-full flex items-center gap-2 p-1.5 -mx-1.5 rounded-md hover:bg-accent/5 transition-colors group/copy text-left">
                        <Copy className="h-3 w-3 text-muted-foreground group-hover/copy:text-accent shrink-0 transition-colors" />
                        <span className="text-[11px] text-muted-foreground truncate">PW: {acc.account_password}</span>
                      </button>
                      {acc.drive_folder_id && (
                        <a href={`https://drive.google.com/drive/folders/${acc.drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-1.5 -mx-1.5 rounded-md hover:bg-accent/5 transition-colors text-[11px] text-primary hover:underline">
                          <ExternalLink className="h-3 w-3 shrink-0" /> Drive-Ordner
                        </a>
                      )}
                      {/* Language & Agency badges */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] bg-secondary/50 text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">
                          {(acc as any).model_language === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
                        </span>
                        <span className={cn("text-[9px] rounded px-1.5 py-0.5 border font-medium", (acc as any).model_agency === "syn" ? "bg-primary/10 text-primary border-primary/30" : "bg-accent/10 text-accent border-accent/30")}>
                          {(acc as any).model_agency === "syn" ? "SYN" : "SheX"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                        <span className="text-[10px] text-muted-foreground">Model aktiv</span>
                        <Switch
                          checked={acc.model_active !== false}
                          onCheckedChange={async (checked) => {
                            await supabase.from("accounts").update({ model_active: checked } as any).eq("id", acc.id);
                            loadAccounts();
                            toast.success(checked ? "Model aktiviert" : "Model deaktiviert");
                          }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Push Dialog */}
      <Dialog open={!!pushTarget} onOpenChange={(o) => { if (!o) setPushTarget(null); }}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Push an {pushTarget?.group_name || "Chatter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="input-gold-shimmer rounded-lg"><Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Titel" maxLength={100} className="border-transparent" /></div>
            <div className="input-gold-shimmer rounded-lg"><Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Nachricht..." maxLength={500} className="min-h-[80px] border-transparent" /></div>
            <Button onClick={sendIndividualPush} disabled={sending || !pushTitle.trim() || !pushBody.trim()} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Wird gesendet..." : "Push senden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">An alle Chatter senden</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="input-gold-shimmer rounded-lg"><Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Titel" maxLength={100} className="border-transparent" /></div>
            <div className="input-gold-shimmer rounded-lg"><Textarea value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} placeholder="Nachricht..." maxLength={500} className="min-h-[80px] border-transparent" /></div>
            <Button onClick={sendBroadcast} disabled={broadcastSending || !broadcastTitle.trim() || !broadcastBody.trim()} className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              {broadcastSending ? "Wird gesendet..." : "An alle senden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Auto-Assign Confirmation Dialog */}
      <Dialog open={assignConfirmOpen} onOpenChange={(o) => { if (!o && !assigning) { setAssignConfirmOpen(false); setAssignResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <UserPlus className="h-4.5 w-4.5 text-accent" />
              </div>
              <span>Auto-Zuweisen</span>
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {!assigning && !assignResult && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Freie Accounts werden automatisch an Chatter ohne Account vergeben.
                </p>

                {/* Stats summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plattform</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PLATFORM_COLORS[selectedPlatform as keyof typeof PLATFORM_COLORS] || "hsl(var(--accent))" }}
                      />
                      <span className="text-sm font-semibold capitalize text-foreground">{selectedPlatform}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Freie Accounts</p>
                    <p className="text-sm font-semibold text-accent">{freeCount}</p>
                  </div>
                </div>

                {/* Chatters without account */}
                {(() => {
                  const unassignedChatters = chatters.filter(c => !c.account_email);
                  return (
                    <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Chatter ohne Account</p>
                      <p className="text-sm font-semibold text-foreground">{unassignedChatters.length}</p>
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setAssignConfirmOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={assignAccounts}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Jetzt zuweisen
                  </Button>
                </div>
              </motion.div>
            )}

            {assigning && !assignResult && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center py-8 gap-4"
              >
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-accent/5 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-accent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">Accounts werden zugewiesen…</p>
                  <p className="text-xs text-muted-foreground">Drive-Ordner werden geteilt</p>
                </div>
              </motion.div>
            )}

            {assignResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, type: "spring", damping: 15 }}
                className="flex flex-col items-center justify-center py-6 gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", damping: 10 }}
                  className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </motion.div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-semibold text-foreground">
                    {assignResult.assigned > 0 ? `${assignResult.assigned} Account${assignResult.assigned > 1 ? "s" : ""} zugewiesen` : "Keine Zuweisungen"}
                  </p>
                  <p className="text-xs text-muted-foreground">{assignResult.message}</p>
                </div>
                <Button
                  className="mt-2"
                  onClick={() => { setAssignConfirmOpen(false); setAssignResult(null); }}
                >
                  Schließen
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chatter komplett löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.group_name || "Dieser Chatter"} wird mit allen Daten (Profil, Fortschritt, Push-Abos) unwiderruflich gelöscht. Zugewiesene Accounts werden freigegeben.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deleteChatter} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Wird gelöscht..." : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reassign Account Dialog */}
      <Dialog open={!!reassignTarget} onOpenChange={(o) => { if (!o) { setReassignTarget(null); setReassignOpenFolder(null); setReassignPoolSectionOpen(false); setReassignManualSectionOpen(false); setReassignSearchQuery(""); } }}>
        <DialogContent className="glass-card border-border/30 sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 gold-glow">
                <KeyRound className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-foreground text-base font-bold">
                  Accounts verwalten
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{reassignTarget?.group_name || "Chatter"}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4 pr-1 -mr-1 pt-3">
            {/* Currently assigned accounts */}
            {(() => {
              const assigned = reassignTarget?.assigned_accounts || [];
              if (assigned.length === 0) return (
                <div className="glass-card-subtle rounded-xl p-6 text-center gold-border-glow">
                  <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Package className="h-5 w-5 text-muted-foreground opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground">Keine Accounts zugewiesen</p>
                </div>
              );
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <p className="text-[11px] font-semibold text-foreground tracking-wide uppercase">Zugewiesen</p>
                    <Badge variant="secondary" className="text-[9px] ml-auto">{assigned.length}</Badge>
                  </div>
                  {assigned.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl glass-card-subtle card-hover-glow group transition-all duration-300">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Badge className="text-[9px] px-1.5 py-0 bg-accent/15 text-accent border-accent/20 font-medium">{acc.platform}</Badge>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {acc.model_language === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {acc.model_agency === "syn" ? "SYN" : "SheX"}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground ml-auto">
                            {acc.is_manual ? "Freier Account" : "Account-Pool"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{acc.account_email}</p>
                        {acc.account_domain && (
                          <p className="text-[10px] text-muted-foreground truncate">{acc.account_domain}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAccount(acc.id)}
                        disabled={reassigning}
                        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0 ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Gold gradient separator */}
            <div className="relative py-2">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
              <p className="relative text-center text-[10px] font-medium text-accent/70 bg-card px-4 mx-auto w-fit uppercase tracking-wider">
                Account zuweisen
              </p>
            </div>

            {/* Search for reassign */}
            <div className="relative input-gold-shimmer rounded-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={reassignSearchQuery}
                onChange={(e) => {
                  setReassignSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setReassignPoolSectionOpen(true);
                    setReassignManualSectionOpen(true);
                  }
                }}
                placeholder="Account suchen..."
                className="pl-8 text-xs h-9 bg-secondary/30 border-transparent rounded-md"
              />
            </div>
            
            {/* Free accounts grouped by source */}
            {(() => {
              const freeAccs = accounts.filter((a) => {
                if (a.assigned_to) return false;
                if (reassignSearchQuery.trim()) {
                  const q = reassignSearchQuery.toLowerCase();
                  return (a.account_email?.toLowerCase().includes(q) || a.account_domain?.toLowerCase().includes(q) || a.folder_name?.toLowerCase().includes(q));
                }
                return true;
              });
              if (freeAccs.length === 0) {
                return (
                  <div className="glass-card-subtle rounded-xl p-6 text-center gold-border-glow">
                    <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Package className="h-5 w-5 text-muted-foreground opacity-40" />
                    </div>
                    <p className="text-xs text-muted-foreground">Keine freien Accounts verfügbar</p>
                  </div>
                );
              }

              const poolAccounts = freeAccs.filter((a) => !a.is_manual);
              const manualAccounts = freeAccs.filter((a) => a.is_manual);

              const poolPlatforms = [...new Set(poolAccounts.map((a) => a.platform))];
              const manualPlatforms = [...new Set(manualAccounts.map((a) => a.platform))];

              const renderAccountList = (accs: typeof freeAccs, platform: string) => (
                <div className="divide-y divide-border/30 rounded-xl overflow-hidden border border-border/30 glass-card-subtle">
                  {accs.filter((a) => a.platform === platform).map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => reassignAccount(acc.id)}
                      disabled={reassigning}
                      className="w-full p-3 text-left hover:bg-accent/5 transition-all duration-200 disabled:opacity-50 group/item"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-medium text-foreground truncate group-hover/item:text-accent transition-colors">{acc.account_email}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {acc.account_domain && <p className="text-[10px] text-muted-foreground truncate">{acc.account_domain}</p>}
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 shrink-0">
                              {acc.model_language === "en" ? "🇬🇧" : "🇩🇪"}
                            </Badge>
                          </div>
                        </div>
                        <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover/item:bg-accent/20 group-hover/item:scale-110 transition-all duration-200">
                          <Plus className="h-3.5 w-3.5 text-accent/60 group-hover/item:text-accent transition-colors" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              );

              return (
                <div className="space-y-4">
                  {/* Account-Pools */}
                  {poolPlatforms.length > 0 && (
                    <div className="space-y-2.5">
                      <button onClick={() => setReassignPoolSectionOpen(!reassignPoolSectionOpen)} className="flex items-center gap-2 px-1 w-full text-left group/sec hover:opacity-80 transition-opacity">
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${reassignPoolSectionOpen ? "rotate-90" : ""}`} />
                        <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_hsl(152_69%_45%/0.4)]" />
                        <p className="text-[11px] font-semibold text-foreground tracking-wide uppercase">Account-Pools</p>
                        <Badge variant="secondary" className="text-[9px] ml-auto">{poolAccounts.length} frei</Badge>
                      </button>
                      {reassignPoolSectionOpen && poolPlatforms.map((p) => (
                        <div key={p} className="space-y-1.5 pl-6">
                          <div className="flex items-center gap-1.5 px-1">
                            <Badge className="text-[9px] px-1.5 py-0 bg-accent/10 text-accent/80 border-accent/15">{p}</Badge>
                            <span className="text-[9px] text-muted-foreground">{poolAccounts.filter(a => a.platform === p).length} verfügbar</span>
                          </div>
                          {renderAccountList(poolAccounts, p)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Freie Accounts */}
                  {manualPlatforms.length > 0 && (
                    <div className="space-y-2.5">
                      <button onClick={() => setReassignManualSectionOpen(!reassignManualSectionOpen)} className="flex items-center gap-2 px-1 w-full text-left group/sec hover:opacity-80 transition-opacity">
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${reassignManualSectionOpen ? "rotate-90" : ""}`} />
                        <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_hsl(38_92%_50%/0.4)]" />
                        <p className="text-[11px] font-semibold text-foreground tracking-wide uppercase">Freie Accounts</p>
                        <Badge variant="secondary" className="text-[9px] ml-auto">{manualAccounts.length} frei</Badge>
                      </button>
                      {reassignManualSectionOpen && manualPlatforms.map((p) => {
                        // If a folder is open, only show the platform that owns it
                        if (reassignOpenFolder && !reassignOpenFolder.startsWith(`${p}::`)) return null;
                        const platAccs = manualAccounts.filter(a => a.platform === p);
                        const platFolders = [...new Set(platAccs.map(a => a.folder_name).filter(Boolean))] as string[];
                        const platCustom = customFolders[p] || [];
                        const allFolders = [...new Set([...platFolders, ...platCustom])];
                        const ungroupedAccs = platAccs.filter(a => !a.folder_name);

                        const getFolderColor = (folder: string) => folderColors[`${p}::${folder}`] || "hsl(var(--accent))";

                        return (
                          <div key={p} className="space-y-1.5 pl-6">
                            <div className="flex items-center gap-1.5 px-1">
                              <Badge className="text-[9px] px-1.5 py-0 bg-amber-400/10 text-amber-400/80 border-amber-400/15">{p}</Badge>
                              <span className="text-[9px] text-muted-foreground">{platAccs.length} verfügbar</span>
                            </div>

                            {/* Folder-first navigation */}
                            {allFolders.length > 0 ? (
                              <>
                                {reassignOpenFolder && reassignOpenFolder.startsWith(`${p}::`) ? (
                                  /* Inside a folder */
                                  (() => {
                                    const folderName = reassignOpenFolder.replace(`${p}::`, "");
                                    const isUngrouped = folderName === "__ungrouped__";
                                    const folderAccs = isUngrouped ? ungroupedAccs : platAccs.filter(a => a.folder_name === folderName);
                                    const folderColor = isUngrouped ? "hsl(var(--muted-foreground))" : getFolderColor(folderName);
                                    return (
                                      <div className="space-y-1.5">
                                        <button onClick={() => setReassignOpenFolder(null)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                          <ChevronRight className="h-3 w-3 rotate-180" /> Zurück
                                        </button>
                                        <div className="flex items-center gap-2 px-1 mb-1">
                                          {isUngrouped ? (
                                            <Package className="h-3 w-3 text-muted-foreground" />
                                          ) : (
                                            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: folderColor }} />
                                          )}
                                          <span className="text-[10px] font-semibold text-foreground">{isUngrouped ? "Unsortiert" : folderName}</span>
                                          <Badge variant="secondary" className="text-[9px]">{folderAccs.length}</Badge>
                                        </div>
                                        {folderAccs.length === 0 ? (
                                          <p className="text-[10px] text-muted-foreground text-center py-3 italic">Keine freien Accounts</p>
                                        ) : (
                                          <div className="divide-y divide-border/30 rounded-xl overflow-hidden border border-border/30 glass-card-subtle">
                                            {folderAccs.map((acc) => (
                                              <button key={acc.id} onClick={() => reassignAccount(acc.id)} disabled={reassigning}
                                                className="w-full p-3 text-left hover:bg-accent/5 transition-all duration-200 disabled:opacity-50 group/item">
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-foreground truncate group-hover/item:text-accent transition-colors">{acc.account_email}</p>
                                                    {acc.account_domain && <p className="text-[10px] text-muted-foreground truncate">{acc.account_domain}</p>}
                                                  </div>
                                                  <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover/item:bg-accent/20 group-hover/item:scale-110 transition-all duration-200">
                                                    <Plus className="h-3.5 w-3.5 text-accent/60 group-hover/item:text-accent transition-colors" />
                                                  </div>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()
                                ) : (
                                  /* Folder overview */
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {allFolders.sort().map((folder) => {
                                      const folderAccs = platAccs.filter(a => a.folder_name === folder);
                                      const color = getFolderColor(folder);
                                      return (
                                        <button key={folder} onClick={() => setReassignOpenFolder(`${p}::${folder}`)}
                                          className="rounded-xl p-2.5 text-left transition-all duration-200 border border-border/30 hover:border-accent/30 hover:scale-[1.02] glass-card-subtle card-inner-glow">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                                            <span className="text-[10px] font-semibold text-foreground truncate flex-1">{folder}</span>
                                            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                          </div>
                                          <Badge variant="secondary" className="text-[8px]">{folderAccs.length} frei</Badge>
                                        </button>
                                      );
                                    })}
                                    {ungroupedAccs.length > 0 && (
                                      <button onClick={() => setReassignOpenFolder(`${p}::__ungrouped__`)}
                                        className="rounded-xl p-2.5 text-left transition-all duration-200 border border-dashed border-border/30 hover:border-accent/30 hover:scale-[1.02] card-inner-glow">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <Package className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                          <span className="text-[10px] font-semibold text-foreground truncate flex-1">Unsortiert</span>
                                          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                        </div>
                                        <Badge variant="secondary" className="text-[8px]">{ungroupedAccs.length} frei</Badge>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              /* No folders – show accounts directly */
                              renderAccountList(manualAccounts, p)
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Pool Confirmation */}
      <AlertDialog open={deletePoolConfirm} onOpenChange={setDeletePoolConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pool "{selectedPlatform}" löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Accounts in diesem Pool werden gelöscht und zugewiesene Account-Daten bei Chattern entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPool}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deletePool} disabled={deletingPool} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingPool ? "Wird gelöscht..." : "Pool löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Daily Goal Dialog */}
      <Dialog open={!!goalTarget} onOpenChange={(o) => { if (!o) setGoalTarget(null); }}>
        <DialogContent className="glass-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Tagesziel für {goalTarget?.group_name || "Chatter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tagesziel in €</label>
              <div className="input-gold-shimmer rounded-lg">
              <Input
                type="number"
                min={0}
                step={5}
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="30"
                className="text-lg font-semibold border-transparent"
              />
              </div>
            </div>
            <Button onClick={saveGoal} disabled={goalSaving} className="w-full">
              <Target className="h-4 w-4 mr-2" />
              {goalSaving ? "Wird gespeichert..." : "Tagesziel speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
