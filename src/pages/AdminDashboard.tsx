import { useState, useEffect, useMemo } from "react";
import { Users, Send, Bell, BellOff, Search, KeyRound, Plus, Package, Trash2, RefreshCw, Target, TrendingUp, DollarSign, Calendar as CalendarIcon, CalendarDays, CalendarRange, Filter, MessageSquare, Star, AlertTriangle, Bot, Save, Power, Copy, Smartphone, Percent, ChevronRight } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"einnahmen" | "chatter" | "botdms">("einnahmen");
  const [chatterFilter, setChatterFilter] = useState<ChatterFilter>("alle");
  const [platformFilters, setPlatformFilters] = useState<Set<string>>(new Set());
  const [botMessages, setBotMessages] = useState<Record<string, { message: string; followUp: string; isActive: boolean; saving: boolean }>>({});
  const [botMessagesLoaded, setBotMessagesLoaded] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [savedBotState, setSavedBotState] = useState<Record<string, { message: string; followUp: string; isActive: boolean }>>({});
  const [botFilter, setBotFilter] = useState<"alle" | "missing">("alle");
  const [botPlatformFilter, setBotPlatformFilter] = useState<string>("alle");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30");
  const [newPlatformOpen, setNewPlatformOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [loginStats, setLoginStats] = useState<Record<string, LoginStats>>({});
  const [pushUsers, setPushUsers] = useState<Set<string>>(new Set());
  const [revenueUsers, setRevenueUsers] = useState<Set<string>>(new Set());
  const [pwaUsers, setPwaUsers] = useState<Set<string>>(new Set());

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
    }
    return result;
  }, [allAssignedAccounts, botFilter, botPlatformFilter, savedBotState]);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-[10px] text-muted-foreground">Chatter verwalten & Benachrichtigungen</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}>
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            An alle senden
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto p-4 space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "einnahmen" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("einnahmen")}
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Einnahmen
          </Button>
          <Button
            variant={activeTab === "chatter" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("chatter")}
          >
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Chatter
          </Button>
          <Button
            variant={activeTab === "botdms" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveTab("botdms"); if (!botMessagesLoaded) loadBotMessages(); }}
          >
            <Bot className="h-3.5 w-3.5 mr-1.5" />
            Bot DMs
          </Button>
        </div>

        {activeTab === "einnahmen" && (
          <div className="space-y-4">
            {/* Time Filter */}
            <div className="glass-card rounded-xl p-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(["heute", "gestern", "7", "30", "90"] as TimeFilter[]).map((f) => (
                  <Button
                    key={f}
                    variant={timeFilter === f ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => setTimeFilter(f)}
                  >
                    {filterLabels[f]}
                  </Button>
                ))}
                <Button
                  variant={timeFilter === "custom" ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={() => setTimeFilter("custom")}
                >
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Zeitraum
                </Button>
              </div>
              {timeFilter === "custom" && (
                <div className="flex gap-2 items-center">
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
            </div>

            {/* Revenue Chart */}
            {/* Gesamtumsatz Tile */}
            <div className="glass-card-subtle rounded-xl p-4 text-center" style={{ borderTop: "3px solid hsl(var(--accent))" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-gold-gradient">{grandTotal.toLocaleString("de-DE")}€</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{filterLabels[timeFilter]}</p>
            </div>

            {/* Platform Stat Tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card-subtle rounded-xl p-4 text-center" style={{ borderTop: `3px solid ${PLATFORM_COLORS.maloum}` }}>
                <p className="text-[10px] text-muted-foreground mb-1">Maloum</p>
                <p className="text-xl font-bold text-foreground">{platformTotals.maloum.toLocaleString("de-DE")}€</p>
              </div>
              <div className="glass-card-subtle rounded-xl p-4 text-center" style={{ borderTop: `3px solid ${PLATFORM_COLORS.brezzels}` }}>
                <p className="text-[10px] text-muted-foreground mb-1">Brezzels</p>
                <p className="text-xl font-bold text-foreground">{platformTotals.brezzels.toLocaleString("de-DE")}€</p>
              </div>
              <div className="glass-card-subtle rounded-xl p-4 text-center" style={{ borderTop: `3px solid ${PLATFORM_COLORS["4based"]}` }}>
                <p className="text-[10px] text-muted-foreground mb-1">4Based</p>
                <p className="text-xl font-bold text-foreground">{platformTotals["4based"].toLocaleString("de-DE")}€</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-1">
                Umsatz – {filterLabels[timeFilter]}
              </h2>
              <div className="flex gap-3 mb-3">
                {Object.entries(PLATFORM_COLORS).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-muted-foreground capitalize">{key}</span>
                  </div>
                ))}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [`${value.toLocaleString("de-DE")}€`, name]}
                    />
                    <Line type="monotone" dataKey="maloum" stroke={PLATFORM_COLORS.maloum} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="brezzels" stroke={PLATFORM_COLORS.brezzels} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="4based" stroke={PLATFORM_COLORS["4based"]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chatter" && (<>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Chatter gesamt</p>
            <p className="text-2xl font-bold text-gold-gradient">{chatters.length}</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Mit Telegram</p>
            <p className="text-2xl font-bold text-gold-gradient">
              {chatters.filter((c) => c.telegram_id).length}
            </p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Push aktiv</p>
            <p className="text-2xl font-bold text-gold-gradient">
              {chatters.filter((c) => pushUsers.has(c.user_id)).length}
            </p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">App installiert</p>
            <p className="text-2xl font-bold text-gold-gradient">
              {pwaUsers.size}
            </p>
          </div>
        </div>

        {/* Offer-Verteilung (collapsible) */}
        <section className="glass-card rounded-xl overflow-hidden">
          <button
            onClick={() => setOfferVerteilungOpen(!offerVerteilungOpen)}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Offer-Verteilung</h2>
              {!offerVerteilungOpen && quizRoutes.length > 0 && (
                <div className="flex gap-1.5 ml-2">
                  {quizRoutes.map((route, i) => {
                    const colors = ["hsl(var(--accent))", "#3b82f6", "#22d3ee", "#a855f7"];
                    return (
                      <span key={route.id} className="text-[10px] text-muted-foreground">
                        <span className="inline-block h-2 w-2 rounded-full mr-0.5" style={{ backgroundColor: colors[i % colors.length] }} />
                        {routeWeights[route.id] || 0}%
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <svg
              className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", offerVerteilungOpen && "rotate-180")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {offerVerteilungOpen && (
            <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {accounts.filter(a => !a.is_manual).length} gesamt
                </Badge>
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
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {accounts.filter(a => a.is_manual).length} gesamt
                </Badge>
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

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{manualPlatforms.length} Plattform{manualPlatforms.length !== 1 ? "en" : ""}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setNewManualPlatformName(""); setNewManualPlatformOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Neue Plattform
                </Button>
              </div>

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
            { key: "no_telegram", label: "Telegram fehlt", icon: AlertTriangle },
            { key: "no_push", label: "Push fehlt", icon: BellOff },
            { key: "no_revenue_7d", label: "7d+ ohne Umsatz", icon: AlertTriangle },
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
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Alle Chatter</h2>
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
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </>)}

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

              {/* Filters */}
              <div className="px-3 pt-3 flex gap-2 overflow-x-auto scrollbar-none pb-1">
                <button
                  onClick={() => { setBotFilter("alle"); setBotPlatformFilter("alle"); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors shrink-0",
                    botFilter === "alle" && botPlatformFilter === "alle" ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Bot className="h-3 w-3" />
                  Alle
                </button>
                <button
                  onClick={() => setBotFilter("missing")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors shrink-0",
                    botFilter === "missing" ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Bot-DM fehlt
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
