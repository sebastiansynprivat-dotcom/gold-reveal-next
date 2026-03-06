import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Send, Bell, BellOff, Search, KeyRound, Plus, Package, Trash2, RefreshCw, Target, TrendingUp, DollarSign, Calendar as CalendarIcon, CalendarDays, CalendarRange, Filter, MessageSquare, Star, AlertTriangle, Bot, Save, Power, Copy, Smartphone, Percent, ChevronRight, ChevronDown, Shield, UserPlus, UserMinus, Check, XCircle, Sparkles, Loader2, ExternalLink, Brain, CheckCircle2, Clock, Repeat, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
type ChatterFilter = "alle" | "open_2d" | "top_tag" | "top_woche" | "top_monat" | "no_telegram" | "no_push" | "no_revenue_7d";

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
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [newAccEmail, setNewAccEmail] = useState("");
  const [newAccPassword, setNewAccPassword] = useState("");
  const [newAccDomain, setNewAccDomain] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatterProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<ChatterProfile | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [deletingPool, setDeletingPool] = useState(false);
  const [deletePoolConfirm, setDeletePoolConfirm] = useState(false);
  const [offers, setOffers] = useState<{ name: string; target_path: string }[]>([]);
  const [quizRoutes, setQuizRoutes] = useState<{ id: string; name: string; target_path: string; weight: number; is_active: boolean }[]>([]);
  const [routeWeights, setRouteWeights] = useState<Record<string, number>>({});
  const [savingWeights, setSavingWeights] = useState(false);
  const [offerVerteilungOpen, setOfferVerteilungOpen] = useState(false);
  const [manualSectionOpen, setManualSectionOpen] = useState(false);
  const [manualPoolOpen, setManualPoolOpen] = useState(false);
  const [selectedManualPlatform, setSelectedManualPlatform] = useState("");
  const [newManualPlatformOpen, setNewManualPlatformOpen] = useState(false);
  const [newManualPlatformName, setNewManualPlatformName] = useState("");
  const [manualAccEmail, setManualAccEmail] = useState("");
  const [manualAccPassword, setManualAccPassword] = useState("");
  const [manualAccDomain, setManualAccDomain] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [deleteManualPoolConfirm, setDeleteManualPoolConfirm] = useState(false);
  const [deletingManualPool, setDeletingManualPool] = useState(false);
  const [accountPoolSectionOpen, setAccountPoolSectionOpen] = useState(false);
  const [goalTarget, setGoalTarget] = useState<ChatterProfile | null>(null);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [expandedChatter, setExpandedChatter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"einnahmen" | "chatter" | "anfragen" | "botdms" | "notifications" | "kiprompt">("einnahmen");
  const [modelRequests, setModelRequests] = useState<any[]>([]);
  const [modelRequestsLoaded, setModelRequestsLoaded] = useState(false);
  const [requestFilter, setRequestFilter] = useState<"all" | "pending" | "accepted" | "in_progress" | "rejected">("all");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [notifHistoryLoaded, setNotifHistoryLoaded] = useState(false);
  const [notifHistoryOpen, setNotifHistoryOpen] = useState(false);

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
  const [chatterFilter, setChatterFilter] = useState<ChatterFilter>("alle");
  const [platformFilters, setPlatformFilters] = useState<Set<string>>(new Set());
  const [botMessages, setBotMessages] = useState<Record<string, { message: string; followUp: string; isActive: boolean; saving: boolean }>>({});
  const [botMessagesLoaded, setBotMessagesLoaded] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [savedBotState, setSavedBotState] = useState<Record<string, { message: string; followUp: string; isActive: boolean }>>({});
  const [botFilter, setBotFilter] = useState<"alle" | "missing" | "active" | "inactive">("alle");
  const [botPlatformFilter, setBotPlatformFilter] = useState<string>("alle");
  const [botSearch, setBotSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30");
  const [newPlatformOpen, setNewPlatformOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [loginStats, setLoginStats] = useState<Record<string, LoginStats>>({});
  const [pushUsers, setPushUsers] = useState<Set<string>>(new Set());
  const [revenueUsers, setRevenueUsers] = useState<Set<string>>(new Set());
  const [pwaUsers, setPwaUsers] = useState<Set<string>>(new Set());

  // Admin management state
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);
  const [adminList, setAdminList] = useState<{ user_id: string; email: string; has_totp: boolean }[]>([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removeAdminConfirm, setRemoveAdminConfirm] = useState<string | null>(null);
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

  const grandTotal = platformTotals.maloum + platformTotals.brezzels + platformTotals["4based"];

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

  // Load summaries when chatter tab is active
  useEffect(() => {
    if (activeTab === "chatter") {
      loadChatterSummaries();
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
      const res = await supabase.functions.invoke("admin-manage", {
        body: { action: "list" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data?.admins) setAdminList(res.data.admins);
    } catch (err) {
      toast.error("Fehler beim Laden der Admins");
    }
    setAdminListLoading(false);
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke("admin-manage", {
        body: { action: "add", email: newAdminEmail.trim() },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success("Admin hinzugefügt!");
        setNewAdminEmail("");
        loadAdmins();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setAddingAdmin(false);
  };

  const removeAdmin = async (targetUserId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke("admin-manage", {
        body: { action: "remove", target_user_id: targetUserId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success("Admin entfernt");
        loadAdmins();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setRemoveAdminConfirm(null);
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
    const { data } = await supabase
      .from("quiz_routes")
      .select("id, name, target_path, weight, is_active")
      .eq("is_active", true);
    setOffers((data || []).map(d => ({ name: d.name, target_path: d.target_path })));
    setQuizRoutes(data || []);
    const weights: Record<string, number> = {};
    (data || []).forEach(r => { weights[r.id] = r.weight; });
    setRouteWeights(weights);
  };

  const saveRouteWeights = async () => {
    setSavingWeights(true);
    try {
      for (const [id, weight] of Object.entries(routeWeights)) {
        await supabase.from("quiz_routes").update({ weight }).eq("id", id);
      }
      toast.success("Offer-Verteilung gespeichert!");
      loadOffers();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setSavingWeights(false);
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

  const loadNotifHistory = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(20);
    if (data) setNotifHistory(data);
    setNotifHistoryLoaded(true);
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



  const deletePool = async () => {
    if (!selectedPlatform) return;
    setDeletingPool(true);
    try {
      // Unassign all accounts for this platform from profiles
      const platformAccs = accounts.filter((a) => a.platform === selectedPlatform);
      for (const acc of platformAccs) {
        if (acc.assigned_to) {
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

  const platforms = [...new Set(accounts.filter(a => !a.is_manual).map((a) => a.platform).filter(Boolean))];
  const manualPlatforms = [...new Set(accounts.filter(a => a.is_manual).map(a => a.platform).filter(Boolean))];

  const addAccount = async () => {
    if (!newAccEmail.trim() || !newAccDomain.trim() || !selectedPlatform) return;
    setAddingAccount(true);
    const { error } = await supabase.from("accounts").insert({
      platform: selectedPlatform,
      account_email: newAccEmail.trim(),
      account_password: newAccPassword.trim(),
      account_domain: newAccDomain.trim(),
    });
    if (error) {
      toast.error("Fehler beim Hinzufügen");
    } else {
      toast.success("Account hinzugefügt!");
      setNewAccEmail("");
      setNewAccPassword("");
      setNewAccDomain("");
      loadAccounts();
    }
    setAddingAccount(false);
  };

  const assignAccounts = async () => {
    if (!selectedPlatform) return;
    setAssigning(true);
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
        toast.success(result.message || "Accounts zugewiesen!");
        loadAccounts();
        loadChatters();
      } else {
        toast.error(result.error || "Fehler beim Zuweisen");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setAssigning(false);
  };

  const deleteChatter = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
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
        // Remove specific account
        await supabase
          .from("accounts")
          .update({ assigned_to: null, assigned_at: null })
          .eq("id", accountId);
      } else {
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

        // Auto-send push notification if user has push enabled
        if (pushUsers.has(reassignTarget.user_id)) {
          try {
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
                  title: "Gute Nachrichten 🥳",
                  body: "Du hast einen neuen Account bekommen! 🚀 Öffne die App für die Log-In Details 👀",
                  target_user_id: reassignTarget.user_id,
                }),
              }
            );
          } catch {
            // silently ignore push errors
          }
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
    }
    return result;
  }, [chatters, search, chatterFilter, pushUsers, revenueUsers, platformFilters]);

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
    ? accounts.filter((a) => a.platform === selectedPlatform)
    : [];
  const freeCount = platformAccounts.filter((a) => !a.assigned_to).length;
  const assignedCount = platformAccounts.filter((a) => a.assigned_to).length;

  // Find chatter name by user_id
  const getChatterName = (userId: string | null) => {
    if (!userId) return null;
    const c = chatters.find((ch) => ch.user_id === userId);
    return c?.group_name || c?.telegram_id || userId.slice(0, 8);
  };

  const tabItems = [
    { key: "einnahmen" as const, label: "Einnahmen", icon: TrendingUp, onClick: () => setActiveTab("einnahmen") },
    { key: "chatter" as const, label: "Chatter", icon: Users, onClick: () => setActiveTab("chatter") },
    { key: "anfragen" as const, label: "Anfragen", icon: Send, onClick: () => { setActiveTab("anfragen"); if (!modelRequestsLoaded) loadModelRequests(); } },
    { key: "botdms" as const, label: "Bot DMs", icon: Bot, onClick: () => { setActiveTab("botdms"); if (!botMessagesLoaded) loadBotMessages(); } },
    { key: "notifications" as const, label: "Benachrichtigungen", icon: Bell, onClick: () => { setActiveTab("notifications"); if (!notifHistoryLoaded) loadNotifHistory(); if (!schedulesLoaded) loadSchedules(); } },
    { key: "kiprompt" as const, label: "KI Prompt", icon: Brain, onClick: () => { setActiveTab("kiprompt"); if (!kiPromptLoaded) loadKiPrompt(); } },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="relative border-b border-border/50 bg-gradient-to-b from-secondary/30 to-background">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-accent/5" />
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-3 relative">
          <button onClick={() => { setAdminSectionOpen(true); if (adminList.length === 0) loadAdmins(); }} className="shrink-0 hover:scale-105 transition-transform">
            <div className="relative">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-full ring-2 ring-accent/20" />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-background" />
            </div>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground tracking-tight">Admin Dashboard</h1>
            <p className="text-[10px] text-muted-foreground tracking-wide">Chatter verwalten & Benachrichtigungen</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-accent/60" />
            <span className="text-[10px] font-medium text-accent/60">Admin</span>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto p-4 space-y-5">
        {/* Premium Tab Navigation */}
        <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
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
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-secondary/40 backdrop-blur-sm border border-border/30">
                {(["heute", "gestern", "7", "30", "90"] as TimeFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
                      timeFilter === f
                        ? "bg-accent text-accent-foreground shadow-md shadow-accent/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    {filterLabels[f]}
                  </button>
                ))}
                <button
                  onClick={() => setTimeFilter("custom")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
                    timeFilter === "custom"
                      ? "bg-accent text-accent-foreground shadow-md shadow-accent/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <CalendarIcon className="h-3 w-3" />
                  Zeitraum
                </button>
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
            <div className="relative glass-card rounded-2xl p-6 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-accent/5" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1.5 tracking-widest uppercase">Gesamtumsatz</p>
                <p className="text-3xl font-extrabold text-gold-gradient tracking-tight">{grandTotal.toLocaleString("de-DE")}€</p>
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
                      <p className="text-lg font-bold text-foreground">{value.toLocaleString("de-DE")}€</p>
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

        {activeTab === "chatter" && (<>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Chatter gesamt", value: chatters.length },
            { label: "Mit Telegram", value: chatters.filter((c) => c.telegram_id).length },
            { label: "Push aktiv", value: chatters.filter((c) => pushUsers.has(c.user_id)).length },
            { label: "App installiert", value: pwaUsers.size },
          ].map((stat, i) => (
            <div key={i} className="glass-card-subtle rounded-xl p-4 text-center hover:scale-[1.02] transition-transform">
              <p className="text-[10px] text-muted-foreground mb-1 tracking-wide uppercase">{stat.label}</p>
              <p className="text-2xl font-bold text-gold-gradient">{stat.value}</p>
            </div>
          ))}
        </div>

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
              {!offerVerteilungOpen && quizRoutes.length > 0 && (
                <div className="flex gap-1.5 ml-1">
                  {quizRoutes.map((route, i) => {
                    const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                    return (
                      <Badge key={route.id} variant="secondary" className="text-[10px]">
                        <span className="inline-block h-2 w-2 rounded-full mr-0.5" style={{ backgroundColor: colors[i % colors.length] }} />
                        {routeWeights[route.id] || 0}%
                      </Badge>
                    );
                  })}
                </div>
              )}
            </button>
          </div>
          {offerVerteilungOpen && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {quizRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Keine Offers konfiguriert.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {quizRoutes.map((route) => (
                      <div key={route.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{route.name}</span>
                          <span className="text-xs font-bold text-accent">{routeWeights[route.id] || 0}%</span>
                        </div>
                        <Slider
                          value={[routeWeights[route.id] || 0]}
                          onValueChange={([v]) => {
                            setRouteWeights(prev => {
                              const otherIds = quizRoutes.filter(r => r.id !== route.id).map(r => r.id);
                              const remaining = 100 - v;
                              const otherTotal = otherIds.reduce((s, id) => s + (prev[id] || 0), 0) || 1;
                              const next: Record<string, number> = { ...prev, [route.id]: v };
                              otherIds.forEach(id => {
                                next[id] = Math.round(((prev[id] || 0) / otherTotal) * remaining);
                              });
                              // Fix rounding to exactly 100
                              const sum = Object.values(next).reduce((s, w) => s + w, 0);
                              if (sum !== 100 && otherIds.length > 0) {
                                next[otherIds[0]] += 100 - sum;
                              }
                              return next;
                            });
                          }}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-[10px] text-muted-foreground">{route.target_path}</p>
                      </div>
                    ))}
                  </div>
                  {/* Live preview bar */}
                  <div className="flex rounded-full overflow-hidden h-3 bg-secondary/50">
                    {quizRoutes.map((route, i) => {
                      const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                      return (
                        <div
                          key={route.id}
                          style={{ width: `${routeWeights[route.id] || 0}%`, backgroundColor: colors[i % colors.length] }}
                          className="transition-all duration-300"
                          title={`${route.name}: ${routeWeights[route.id] || 0}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {quizRoutes.map((route, i) => {
                      const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                      return (
                        <div key={route.id} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                          <span className="text-[10px] text-muted-foreground">{route.name}: {routeWeights[route.id] || 0}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    onClick={saveRouteWeights}
                    disabled={savingWeights}
                    size="sm"
                    className="w-full"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {savingWeights ? "Wird gespeichert..." : "Verteilung speichern"}
                  </Button>
                </>
              )}
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
            {accountPoolSectionOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setNewPlatformName(""); setNewPlatformOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Neuer Pool
              </Button>
            )}
          </div>

          {accountPoolSectionOpen && (platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Pools angelegt. Erstelle einen neuen Pool oben.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {platforms.map((p) => {
                const pAccounts = accounts.filter((a) => a.platform === p);
                const free = pAccounts.filter((a) => !a.assigned_to).length;
                const assigned = pAccounts.filter((a) => a.assigned_to).length;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPlatform(p);
                      // Auto-fill domain from existing accounts
                      const existingDomain = accounts.find((a) => a.platform === p)?.account_domain;
                      setNewAccDomain(existingDomain || "");
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
          ))}
        </section>

        {/* Freie Accounts – Plattform-basiert */}
        <section className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setManualSectionOpen(!manualSectionOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${manualSectionOpen ? "rotate-90" : ""}`} />
              <KeyRound className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Freie Accounts</h2>
              {!manualSectionOpen && (
                <>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {accounts.filter(a => a.is_manual).length} gesamt
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    {accounts.filter(a => a.is_manual && !a.assigned_to).length} frei
                  </Badge>
                </>
              )}
            </button>
            {manualSectionOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setNewManualPlatformName(""); setNewManualPlatformOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Neue Plattform
              </Button>
            )}
          </div>
          {manualSectionOpen && (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Accounts für manuelle Zuweisung – nicht Teil der automatischen Verteilung.
              </p>

              <span className="text-xs text-muted-foreground">{manualPlatforms.length} Plattform{manualPlatforms.length !== 1 ? "en" : ""}</span>

              {manualPlatforms.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  Noch keine Plattformen. Erstelle eine neue Plattform oben.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {manualPlatforms.map((p) => {
                    const pAccounts = accounts.filter(a => a.is_manual && a.platform === p);
                    const free = pAccounts.filter(a => !a.assigned_to).length;
                    const assigned = pAccounts.filter(a => a.assigned_to).length;
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          setSelectedManualPlatform(p);
                          const existingDomain = accounts.find(a => a.is_manual && a.platform === p)?.account_domain;
                          setManualAccDomain(existingDomain || "");
                          setManualPoolOpen(true);
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
                          <span className="text-accent">{free} frei</span>
                          <span>{assigned} vergeben</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Admin-Verwaltung Dialog (opens via logo click) */}
        <Dialog open={adminSectionOpen} onOpenChange={setAdminSectionOpen}>
          <DialogContent className="glass-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                Admin-Verwaltung
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Add new admin */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="E-Mail des neuen Admins..."
                    className="pl-9 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && addAdmin()}
                  />
                </div>
                <Button
                  onClick={addAdmin}
                  disabled={!newAdminEmail.trim() || addingAdmin}
                  size="sm"
                >
                  {addingAdmin ? "..." : "Hinzufügen"}
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
                      <div className="flex items-center gap-2 min-w-0">
                        <Shield className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="text-sm text-foreground truncate">{admin.email}</span>
                        {admin.has_totp && (
                          <Badge variant="secondary" className="text-[9px] shrink-0">2FA ✓</Badge>
                        )}
                        {!admin.has_totp && (
                          <Badge variant="outline" className="text-[9px] text-destructive shrink-0">Kein 2FA</Badge>
                        )}
                        {admin.user_id === user?.id && (
                          <Badge className="text-[9px] shrink-0">Du</Badge>
                        )}
                      </div>
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
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Admin Confirm Dialog */}
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chatter suchen (Gruppe oder Telegram-ID)..."
            className="pl-9 text-sm"
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
            { key: "no_telegram", label: "Telegram fehlt", icon: AlertTriangle },
            { key: "no_push", label: "Push fehlt", icon: BellOff },
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
        </>)}

        {activeTab === "anfragen" && (
          <div className="space-y-4">
            {/* Request Stats Overview */}
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: "pending", label: "Offen", color: "text-yellow-400", bg: "bg-yellow-500/10", count: modelRequests.filter(r => r.status === "pending").length },
                { key: "accepted", label: "Angenommen", color: "text-green-400", bg: "bg-green-500/10", count: modelRequests.filter(r => r.status === "accepted").length },
                { key: "in_progress", label: "In Arbeit", color: "text-blue-400", bg: "bg-blue-500/10", count: modelRequests.filter(r => r.status === "in_progress").length },
                { key: "rejected", label: "Abgelehnt", color: "text-red-400", bg: "bg-red-500/10", count: modelRequests.filter(r => r.status === "rejected").length },
              ] as const).map(({ key, label, color, bg, count }) => (
                <button
                  key={key}
                  onClick={() => setRequestFilter(requestFilter === key ? "all" : key)}
                  className={cn(
                    "glass-card-subtle rounded-xl p-3 text-center transition-all duration-200 hover:scale-[1.02]",
                    requestFilter === key && "ring-1 ring-accent/40 shadow-lg shadow-accent/5"
                  )}
                >
                  <p className={cn("text-xl font-bold", color)}>{count}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </button>
              ))}
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
                  <button onClick={() => setRequestFilter("all")} className="text-[10px] text-accent hover:text-accent/80 transition-colors font-medium">
                    Filter zurücksetzen
                  </button>
                )}
              </div>

              {modelRequests.filter(r => requestFilter === "all" || r.status === requestFilter).length === 0 ? (
                <div className="p-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <Send className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Keine Anfragen in dieser Kategorie.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {modelRequests.filter(r => requestFilter === "all" || r.status === requestFilter).map((req) => {
                    const chatter = chatters.find(c => c.user_id === req.user_id);
                    const chatterName = chatter?.group_name || req.user_id.slice(0, 8);
                    const statusConfig = {
                      pending: { dot: "bg-yellow-400", bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Offen" },
                      accepted: { dot: "bg-green-400", bg: "bg-green-500/10", text: "text-green-400", label: "Angenommen" },
                      in_progress: { dot: "bg-blue-400", bg: "bg-blue-500/10", text: "text-blue-400", label: "In Arbeit" },
                      rejected: { dot: "bg-red-400", bg: "bg-red-500/10", text: "text-red-400", label: "Abgelehnt" },
                    }[req.status as string] || { dot: "bg-muted-foreground", bg: "bg-secondary", text: "text-muted-foreground", label: req.status };
                    return (
                      <div key={req.id} className="px-5 py-4 space-y-3 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-secondary/60 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-foreground">{chatterName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate block">{chatterName}</span>
                              <div className="flex items-center gap-2">
                                <span className={cn("flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", statusConfig.bg, statusConfig.text)}>
                                  <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
                                  {statusConfig.label}
                                </span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border/50">
                                  {req.request_type === "individual" ? "Individuell" : "Allgemein"}
                                </Badge>
                                {req.request_type === "individual" && req.price != null && (
                                  <span className="text-[10px] text-accent font-bold">{req.price}€</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(req.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                          </span>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(req.model_name); toast.success("Model Name kopiert!"); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left">Model: <span className="text-foreground font-medium underline underline-offset-2 decoration-border">{req.model_name}</span> <Copy className="h-3 w-3 inline-block ml-1 opacity-50" /></button>
                        <button onClick={() => { navigator.clipboard.writeText(req.description); toast.success("Beschreibung kopiert!"); }} className="text-sm text-foreground/80 leading-relaxed hover:text-foreground transition-colors cursor-pointer text-left block">{req.description} <Copy className="h-3 w-3 inline-block ml-1 opacity-50" /></button>
                        
                        {/* Admin Kommentar */}
                        <div className="space-y-1.5 pt-1">
                          <Textarea
                            placeholder="Kommentar für den Chatter hinterlassen..."
                            value={req._localComment ?? req.admin_comment ?? ""}
                            onChange={(e) => {
                              setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _localComment: e.target.value } : r));
                            }}
                            rows={2}
                            className="text-xs bg-secondary/30 border-border/30 focus:border-accent/40"
                          />
                          {(req._localComment != null && req._localComment !== (req.admin_comment ?? "")) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                              const comment = req._localComment ?? "";
                              const { error } = await supabase.from("model_requests").update({ admin_comment: comment || null }).eq("id", req.id);
                              if (error) { toast.error("Fehler beim Speichern"); return; }
                              toast.success("Kommentar gespeichert!");
                              setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, admin_comment: comment || null, _localComment: undefined } : r));
                            }}>
                              <Save className="h-3 w-3 mr-1" /> Kommentar speichern
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            {req.status === "pending" ? (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50" onClick={() => updateRequestStatus(req.id, "accepted")}>
                                  <Check className="h-3 w-3 mr-1" /> Angenommen
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50" onClick={() => updateRequestStatus(req.id, "in_progress")}>
                                  <Clock className="h-3 w-3 mr-1" /> Wird bearbeitet
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
                              <Textarea
                                placeholder="Grund für die Ablehnung angeben..."
                                value={req._rejectReason ?? ""}
                                onChange={(e) => {
                                  setModelRequests(prev => prev.map(r => r.id === req.id ? { ...r, _rejectReason: e.target.value } : r));
                                }}
                                rows={2}
                                className="text-xs bg-red-500/5 border-red-500/20 focus:border-red-500/40"
                              />
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={async () => {
                                const reason = req._rejectReason ?? "";
                                const { error } = await supabase.from("model_requests").update({ status: "rejected", admin_comment: reason || null }).eq("id", req.id);
                                if (error) { toast.error("Fehler beim Aktualisieren"); return; }
                                toast.success("Anfrage abgelehnt");
                                loadModelRequests();
                              }}>
                                <XCircle className="h-3 w-3 mr-1" /> Ablehnen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "botdms" && (
          <div className="space-y-4">
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-foreground">Bot DMs</h2>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {allAssignedAccounts.length} Model{allAssignedAccounts.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Platform filters row */}
              <div className="px-3 pt-3 flex gap-2 overflow-x-auto scrollbar-none pb-1">
                <button
                  onClick={() => { setBotFilter("alle"); setBotPlatformFilter("alle"); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors shrink-0",
                    botPlatformFilter === "alle" ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Bot className="h-3 w-3" />
                  Alle
                </button>
                {botPlatforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => setBotPlatformFilter(botPlatformFilter === p ? "alle" : p)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors shrink-0",
                      botPlatformFilter === p ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Package className="h-3 w-3" />
                    {p}
                  </button>
                ))}
              </div>

              {/* Status filters row */}
              <div className="px-3 pt-1 flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {([
                  { key: "missing" as const, label: "Bot-DM fehlt", icon: AlertTriangle },
                  { key: "active" as const, label: "Bot aktiv", icon: Check },
                  { key: "inactive" as const, label: "Bot inaktiv", icon: XCircle },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setBotFilter(botFilter === key ? "alle" : key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors shrink-0",
                      botFilter === key ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="px-3 pt-1 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={botSearch}
                    onChange={(e) => setBotSearch(e.target.value)}
                    placeholder="Account suchen..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {filteredBotAccounts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {botFilter === "missing" ? "Alle Models haben Bot-DMs hinterlegt." : "Keine Accounts gefunden."}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredBotAccounts.map((acc) => {
                    const entry = botMessages[acc.id] || { message: "", followUp: "", isActive: false, saving: false };
                    const saved = savedBotState[acc.id];
                    const hasChanges = !saved || entry.message !== saved.message || entry.followUp !== saved.followUp || entry.isActive !== saved.isActive;
                    const isExpanded = expandedBot === acc.id;
                    return (
                      <div
                        key={acc.id}
                        className={cn(
                          "glass-card-subtle rounded-xl overflow-hidden transition-all duration-200",
                          isExpanded && "ring-1 ring-accent/30"
                        )}
                      >
                        {/* Header Row */}
                        <button
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/5 transition-colors text-left"
                          onClick={() => setExpandedBot(isExpanded ? null : acc.id)}
                        >
                          <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            entry.isActive ? "bg-accent/15" : "bg-secondary/50"
                          )}>
                            <Bot className={cn(
                              "h-4 w-4 transition-colors",
                              entry.isActive ? "text-accent" : "text-muted-foreground"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{acc.account_email}</p>
                            <p className="text-[10px] text-muted-foreground">{acc.platform}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {entry.isActive ? (
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                                <span className="text-[10px] font-medium text-accent">Aktiv</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Inaktiv</span>
                            )}
                            <svg
                              className={cn(
                                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="h-px bg-border" />

                            {/* Credentials */}
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

                            <div className="flex items-center justify-between glass-card-subtle rounded-lg px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <Power className={cn("h-3.5 w-3.5", entry.isActive ? "text-accent" : "text-muted-foreground")} />
                                <span className="text-xs font-medium text-foreground">Bot aktivieren</span>
                              </div>
                              <Switch
                                checked={entry.isActive}
                                onCheckedChange={(checked) =>
                                  setBotMessages((prev) => ({
                                    ...prev,
                                    [acc.id]: { ...entry, isActive: checked },
                                  }))
                                }
                              />
                            </div>

                            {/* Bot Message */}
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Bot-Nachricht
                              </label>
                              <Textarea
                                value={entry.message}
                                onChange={(e) =>
                                  setBotMessages((prev) => ({
                                    ...prev,
                                    [acc.id]: { ...entry, message: e.target.value },
                                  }))
                                }
                                placeholder="Hey! Schreib mir gerne eine Nachricht 💋"
                                className="text-sm min-h-[70px] resize-none bg-background/50 border-border/50 focus:border-accent/50"
                              />
                            </div>

                            {/* Follow-up Message */}
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Follow-up Nachricht
                              </label>
                              <Textarea
                                value={entry.followUp}
                                onChange={(e) =>
                                  setBotMessages((prev) => ({
                                    ...prev,
                                    [acc.id]: { ...entry, followUp: e.target.value },
                                  }))
                                }
                                placeholder="Na, hast du meine letzte Nachricht gelesen? 😏"
                                className="text-sm min-h-[70px] resize-none bg-background/50 border-border/50 focus:border-accent/50"
                              />
                            </div>

                            {/* Save Button */}
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4">
            <section className="glass-card rounded-xl overflow-hidden">
              {/* Send Form */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Neue Benachrichtigung</h2>
                </div>
                <div className="space-y-3">
                  <Input
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Titel der Benachrichtigung"
                    className="text-sm"
                    maxLength={100}
                  />
                  <Textarea
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    placeholder="Nachricht eingeben..."
                    className="text-sm min-h-[80px]"
                    maxLength={500}
                  />
                  <Button
                    onClick={handleSendNotification}
                    disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {notifSending ? "Wird gesendet..." : "An alle senden"}
                  </Button>
                </div>
              </div>

              {/* Collapsible History */}
              {notifHistory.length > 0 && (
                <>
                  <button
                    onClick={() => setNotifHistoryOpen(!notifHistoryOpen)}
                    className="w-full px-5 py-3 border-t border-border flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold text-foreground">Verlauf</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{notifHistory.length}</Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${notifHistoryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {notifHistoryOpen && (
                    <div className="px-5 pb-5 space-y-2">
                      {notifHistory.map((n: any) => (
                        <div key={n.id} className="p-3 rounded-lg bg-secondary/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{n.title}</p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3" />
                              {n.recipients_count} Empfänger
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(n.sent_at).toLocaleString("de-DE")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Scheduled Notifications Card */}
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Geplante Benachrichtigung</h2>
                </div>
                <div className="space-y-3">
                  <Input
                    value={schedTitle}
                    onChange={(e) => setSchedTitle(e.target.value)}
                    placeholder="Titel"
                    className="text-sm"
                    maxLength={100}
                  />
                  <Textarea
                    value={schedBody}
                    onChange={(e) => setSchedBody(e.target.value)}
                    placeholder="Nachricht..."
                    className="text-sm min-h-[60px]"
                    maxLength={500}
                  />

                  {/* Frequency */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Häufigkeit</label>
                    <div className="flex gap-1.5">
                      {(["daily", "weekly", "monthly"] as const).map((f) => (
                        <Button
                          key={f}
                          variant={schedFrequency === f ? "default" : "outline"}
                          size="sm"
                          className="text-xs h-7 px-2.5 flex-1"
                          onClick={() => setSchedFrequency(f)}
                        >
                          {f === "daily" ? "Täglich" : f === "weekly" ? "Wöchentlich" : "Monatlich"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Uhrzeit (deutsche Zeit)</label>
                    <Input
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="text-sm w-32"
                    />
                  </div>

                  {/* Weekday for weekly */}
                  {schedFrequency === "weekly" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Wochentag</label>
                      <div className="flex gap-1">
                        {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((day, i) => (
                          <Button
                            key={i}
                            variant={schedWeekday === i ? "default" : "outline"}
                            size="sm"
                            className="text-xs h-7 w-9 px-0"
                            onClick={() => setSchedWeekday(i)}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day of month for monthly */}
                  {schedFrequency === "monthly" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Tag im Monat</label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={schedDayOfMonth}
                        onChange={(e) => setSchedDayOfMonth(Number(e.target.value))}
                        className="text-sm w-20"
                      />
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
              </div>

              {/* Collapsible scheduled list */}
              <button
                onClick={() => setSchedListOpen(!schedListOpen)}
                className="w-full px-5 py-3 border-t border-border flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">Geplante Benachrichtigungen</span>
                  {schedules.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{schedules.length}</Badge>}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${schedListOpen ? "rotate-180" : ""}`} />
              </button>
              {schedListOpen && (
                <div className="px-5 pb-5 space-y-2">
                  {schedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Noch keine geplanten Benachrichtigungen.</p>
                  ) : (
                    schedules.map((s: any) => (
                      <div key={s.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.body}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => toggleScheduleActive(s.id, s.is_active)}
                              className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                              title={s.is_active ? "Pausieren" : "Aktivieren"}
                            >
                              {s.is_active ? <Pause className="h-3.5 w-3.5 text-accent" /> : <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                            <button
                              onClick={() => setSchedDeleteConfirm(s.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {s.is_active ? "Aktiv" : "Pausiert"}
                          </Badge>
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
            <section className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setChatPromptOpen(!chatPromptOpen)}
                className="w-full px-4 py-3 border-b border-border flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Dashboard Chat-Prompt</h2>
                  {kiPrompt !== kiPromptOriginal && (
                    <Badge className="text-[10px] bg-accent/20 text-accent">Ungespeichert</Badge>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${chatPromptOpen ? "rotate-180" : ""}`} />
              </button>
              {chatPromptOpen && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Dieser Prompt wird im Dashboard-Chatfenster als Anweisung an die KI gesendet.
                  </p>
                  {kiPromptLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={kiPrompt}
                        onChange={(e) => { setKiPrompt(e.target.value); setKiPromptSaved(false); }}
                        className="min-h-[300px] text-sm resize-y bg-background/50 border-border/50 focus:border-accent/50 leading-relaxed"
                        placeholder="System-Prompt eingeben..."
                      />
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
              )}
            </section>

            {/* Chat-Analysen Prompt */}
            <section className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setAnalysisPromptOpen(!analysisPromptOpen)}
                className="w-full px-4 py-3 border-b border-border flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Chat-Analysen Prompt</h2>
                  {analysisPrompt !== analysisPromptOriginal && (
                    <Badge className="text-[10px] bg-accent/20 text-accent">Ungespeichert</Badge>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${analysisPromptOpen ? "rotate-180" : ""}`} />
              </button>
              {analysisPromptOpen && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Dieser Prompt wird für die KI-gestützten Chat-Analysen der Chatter verwendet.
                  </p>
                  {analysisPromptLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={analysisPrompt}
                        onChange={(e) => setAnalysisPrompt(e.target.value)}
                        className="min-h-[300px] text-sm resize-y bg-background/50 border-border/50 focus:border-accent/50 leading-relaxed"
                        placeholder="Analyse-Prompt eingeben..."
                      />
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
              )}
            </section>
          </div>
        )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Account Pool Dialog */}
      <Dialog open={accountPoolOpen} onOpenChange={setAccountPoolOpen}>
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedPlatform} – Accounts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Pool löschen */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Pool: <span className="font-semibold text-foreground">{selectedPlatform}</span></p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletePoolConfirm(true)}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Löschen
              </Button>
            </div>

            {/* Pool Domain */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pool-Domain</label>
              <Input
                value={newAccDomain}
                onChange={(e) => setNewAccDomain(e.target.value)}
                placeholder="Domain (z.B. brezzels.com)"
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Wird automatisch für alle neuen Accounts verwendet.</p>
            </div>

            {/* Add new account */}
            <div className="space-y-2 border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground">Neuen Account hinzufügen</p>
              <Input
                value={newAccEmail}
                onChange={(e) => setNewAccEmail(e.target.value)}
                placeholder="E-Mail"
                type="email"
              />
              <Input
                value={newAccPassword}
                onChange={(e) => setNewAccPassword(e.target.value)}
                placeholder="Passwort"
              />
              <Button
                onClick={addAccount}
                disabled={addingAccount || !newAccEmail.trim() || !newAccDomain.trim()}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addingAccount ? "Wird hinzugefügt..." : "Account hinzufügen"}
              </Button>
            </div>

            {/* Stats + Bulk Assign */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">
                  Gesamt: <span className="text-foreground font-semibold">{platformAccounts.length}</span>
                </span>
                <span className="text-accent">
                  Frei: <span className="font-semibold">{freeCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Vergeben: <span className="font-semibold">{assignedCount}</span>
                </span>
              </div>
              {freeCount > 0 && (
                <Button
                  onClick={assignAccounts}
                  disabled={assigning}
                  size="sm"
                  variant="default"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", assigning && "animate-spin")} />
                  {assigning ? "Zuweisen..." : "Auto-Zuweisen"}
                </Button>
              )}
            </div>

            {/* Account list */}
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {platformAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Noch keine Accounts für {selectedPlatform}.
                </p>
              ) : (
                platformAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${acc.assigned_to ? "bg-muted-foreground/30" : "bg-green-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate">{acc.account_email}</span>
                        {acc.assigned_to ? (
                          <Badge className="text-[10px] bg-secondary text-secondary-foreground shrink-0">
                            → {getChatterName(acc.assigned_to)}
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-accent/20 text-accent shrink-0">
                            Frei
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        PW: {acc.account_password}
                      </p>
                    </div>
                    {acc.assigned_to && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        title="Account freigeben"
                        onClick={async () => {
                          await supabase.from("accounts").update({ assigned_to: null, assigned_at: null }).eq("id", acc.id);
                          toast.success("Account freigegeben");
                          loadAccounts();
                          loadChatters();
                        }}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      title="Account löschen"
                      onClick={async () => {
                        await supabase.from("accounts").delete().eq("id", acc.id);
                        toast.success("Account gelöscht");
                        loadAccounts();
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
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
            <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Titel" maxLength={100} />
            <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Nachricht..." maxLength={500} className="min-h-[80px]" />
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
            <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Titel" maxLength={100} />
            <Textarea value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} placeholder="Nachricht..." maxLength={500} className="min-h-[80px]" />
            <Button onClick={sendBroadcast} disabled={broadcastSending || !broadcastTitle.trim() || !broadcastBody.trim()} className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              {broadcastSending ? "Wird gesendet..." : "An alle senden"}
            </Button>
          </div>
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
      <Dialog open={!!reassignTarget} onOpenChange={(o) => { if (!o) setReassignTarget(null); }}>
        <DialogContent className="glass-card border-border sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Account ändern für {reassignTarget?.group_name || "Chatter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Show currently assigned accounts */}
            {(() => {
              const assigned = reassignTarget?.assigned_accounts || [];
              if (assigned.length === 0) return (
                <p className="text-xs text-muted-foreground italic">Keine Accounts zugewiesen.</p>
              );
              return (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Zugewiesene Accounts:</p>
                  {assigned.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30">
                      <div>
                        <Badge variant="secondary" className="text-[10px] mb-1">{acc.platform}</Badge>
                        <p className="text-xs font-medium text-foreground">{acc.account_email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAccount(acc.id)}
                        disabled={reassigning}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Rausnehmen
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
            
            <p className="text-xs text-muted-foreground font-medium pt-2">Freien Account zuweisen:</p>
            {(() => {
              const freeAccs = accounts.filter((a) => !a.assigned_to);
              if (freeAccs.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keine freien Accounts verfügbar.
                  </p>
                );
              }
              // Group by platform
              const platforms = [...new Set(freeAccs.map((a) => a.platform))];
              return (
                <div className="space-y-3">
                  {platforms.map((p) => (
                    <div key={p}>
                      <p className="text-[10px] text-muted-foreground mb-1">{p}</p>
                      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                        {freeAccs.filter((a) => a.platform === p).map((acc) => (
                          <button
                            key={acc.id}
                            onClick={() => reassignAccount(acc.id)}
                            disabled={reassigning}
                            className="w-full p-3 text-left hover:bg-secondary/30 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{acc.account_email}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Domain: {acc.account_domain}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
              <Input
                type="number"
                min={0}
                step={5}
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="30"
                className="text-lg font-semibold"
              />
            </div>
            <Button onClick={saveGoal} disabled={goalSaving} className="w-full">
              <Target className="h-4 w-4 mr-2" />
              {goalSaving ? "Wird gespeichert..." : "Tagesziel speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Platform Dialog */}
      <Dialog open={newPlatformOpen} onOpenChange={setNewPlatformOpen}>
        <DialogContent className="glass-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Neuen Pool erstellen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pool-Name</label>
              <Input
                value={newPlatformName}
                onChange={(e) => setNewPlatformName(e.target.value)}
                placeholder="z.B. Brezzels, Maloum, 4Based..."
                className="text-sm"
                autoFocus
              />
            </div>
            <Button
              onClick={() => {
                if (newPlatformName.trim()) {
                  setSelectedPlatform(newPlatformName.trim());
                  setNewPlatformOpen(false);
                  setAccountPoolOpen(true);
                }
              }}
              disabled={!newPlatformName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Plattform anlegen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Platform Dialog */}
      <Dialog open={manualPoolOpen} onOpenChange={setManualPoolOpen}>
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {selectedManualPlatform} – Freie Accounts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Delete platform */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Plattform: <span className="font-semibold text-foreground">{selectedManualPlatform}</span></p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteManualPoolConfirm(true)}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Löschen
              </Button>
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Domain</label>
              <Input
                value={manualAccDomain}
                onChange={(e) => setManualAccDomain(e.target.value)}
                placeholder="Domain (z.B. onlyfans.com)"
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Wird automatisch für neue Accounts verwendet.</p>
            </div>

            {/* Add account */}
            <div className="space-y-2 border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground">Neuen Account hinzufügen</p>
              <Input
                value={manualAccEmail}
                onChange={(e) => setManualAccEmail(e.target.value)}
                placeholder="E-Mail / Username"
              />
              <Input
                value={manualAccPassword}
                onChange={(e) => setManualAccPassword(e.target.value)}
                placeholder="Passwort"
              />
              <Button
                onClick={async () => {
                  if (!manualAccEmail.trim() || !selectedManualPlatform) return;
                  setAddingManual(true);
                  const { error } = await supabase.from("accounts").insert({
                    platform: selectedManualPlatform,
                    account_email: manualAccEmail.trim(),
                    account_password: manualAccPassword.trim(),
                    account_domain: manualAccDomain.trim(),
                    is_manual: true,
                  } as any);
                  if (error) {
                    toast.error("Fehler beim Hinzufügen");
                  } else {
                    toast.success("Account hinzugefügt!");
                    setManualAccEmail("");
                    setManualAccPassword("");
                    loadAccounts();
                    loadChatters();
                  }
                  setAddingManual(false);
                }}
                disabled={addingManual || !manualAccEmail.trim()}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addingManual ? "Wird hinzugefügt..." : "Account hinzufügen"}
              </Button>
            </div>

            {/* Stats */}
            {(() => {
              const manualPlatformAccounts = accounts.filter(a => a.is_manual && a.platform === selectedManualPlatform);
              const mFree = manualPlatformAccounts.filter(a => !a.assigned_to).length;
              const mAssigned = manualPlatformAccounts.filter(a => a.assigned_to).length;
              return (
                <>
                  <div className="flex gap-3 text-xs">
                    <span className="text-muted-foreground">Gesamt: <span className="text-foreground font-semibold">{manualPlatformAccounts.length}</span></span>
                    <span className="text-accent">Frei: <span className="font-semibold">{mFree}</span></span>
                    <span className="text-muted-foreground">Vergeben: <span className="font-semibold">{mAssigned}</span></span>
                  </div>

                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {manualPlatformAccounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Noch keine Accounts für {selectedManualPlatform}.
                      </p>
                    ) : (
                      manualPlatformAccounts.map((acc) => (
                        <div key={acc.id} className="p-3 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${acc.assigned_to ? "bg-muted-foreground/30" : "bg-green-500"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground truncate">{acc.account_email}</span>
                              {acc.assigned_to ? (
                                <Badge className="text-[10px] bg-secondary text-secondary-foreground shrink-0">
                                  → {getChatterName(acc.assigned_to)}
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] bg-accent/20 text-accent shrink-0">
                                  Frei
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">PW: {acc.account_password}</p>
                          </div>
                          {acc.assigned_to && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                              title="Account freigeben"
                              onClick={async () => {
                                await supabase.from("accounts").update({ assigned_to: null, assigned_at: null }).eq("id", acc.id);
                                toast.success("Account freigegeben");
                                loadAccounts();
                                loadChatters();
                              }}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            title="Account löschen"
                            onClick={async () => {
                              await supabase.from("accounts").delete().eq("id", acc.id);
                              toast.success("Account gelöscht");
                              loadAccounts();
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Manual Platform Confirmation */}
      <AlertDialog open={deleteManualPoolConfirm} onOpenChange={setDeleteManualPoolConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Plattform "{selectedManualPlatform}" löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Accounts dieser Plattform werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingManualPool}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setDeletingManualPool(true);
                await supabase.from("accounts").delete().eq("platform", selectedManualPlatform).eq("is_manual", true as any);
                toast.success(`Plattform "${selectedManualPlatform}" gelöscht!`);
                setDeleteManualPoolConfirm(false);
                setManualPoolOpen(false);
                setSelectedManualPlatform("");
                loadAccounts();
                loadChatters();
                setDeletingManualPool(false);
              }}
              disabled={deletingManualPool}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingManualPool ? "Wird gelöscht..." : "Plattform löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Manual Platform Dialog */}
      <Dialog open={newManualPlatformOpen} onOpenChange={setNewManualPlatformOpen}>
        <DialogContent className="glass-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-accent" />
              Neue Plattform erstellen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plattform-Name</label>
              <Input
                value={newManualPlatformName}
                onChange={(e) => setNewManualPlatformName(e.target.value)}
                placeholder="z.B. OnlyFans, Fansly..."
                className="text-sm"
                autoFocus
              />
            </div>
            <Button
              onClick={() => {
                if (newManualPlatformName.trim()) {
                  setSelectedManualPlatform(newManualPlatformName.trim());
                  setNewManualPlatformOpen(false);
                  setManualAccDomain("");
                  setManualPoolOpen(true);
                }
              }}
              disabled={!newManualPlatformName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Plattform anlegen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
