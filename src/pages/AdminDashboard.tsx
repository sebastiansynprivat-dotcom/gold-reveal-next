import { useState, useEffect, useMemo } from "react";
import { Users, Send, Bell, Search, KeyRound, Plus, Package, Trash2, RefreshCw, Target, TrendingUp, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
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
  const [goalTarget, setGoalTarget] = useState<ChatterProfile | null>(null);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"einnahmen" | "chatter">("einnahmen");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  const allRevenueData = useMemo(() => generateFakeRevenueData(), []);

  const filteredRevenueData = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);

    if (timeFilter === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
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

  useEffect(() => {
    loadChatters();
    loadAccounts();
    loadOffers();
  }, []);

  const loadChatters = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, group_name, telegram_id, created_at, account_email, account_password, account_domain")
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
    setAccounts(allAccounts || []);
    
    const enriched = (data || []).map((c) => ({
      ...c,
      assigned_accounts: (allAccounts || []).filter((a) => a.assigned_to === c.user_id),
    }));
    setChatters(enriched);
    setLoading(false);
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true });
    setAccounts(data || []);
  };

  const loadOffers = async () => {
    const { data } = await supabase
      .from("quiz_routes")
      .select("name, target_path")
      .eq("is_active", true);
    setOffers(data || []);
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

  const platforms = [...new Set(accounts.map((a) => a.platform).filter(Boolean))];

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

  const filtered = chatters.filter(
    (c) =>
      c.group_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.telegram_id?.toLowerCase().includes(search.toLowerCase())
  );

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
                  <Calendar className="h-3 w-3 mr-1" />
                  Zeitraum
                </Button>
              </div>
              {timeFilter === "custom" && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <span className="text-xs text-muted-foreground">bis</span>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                </div>
              )}
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

            {/* Gesamtumsatz Tile */}
            <div className="glass-card-subtle rounded-xl p-4 text-center" style={{ borderTop: "3px solid hsl(var(--accent))" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-gold-gradient">{grandTotal.toLocaleString("de-DE")}€</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{filterLabels[timeFilter]}</p>
            </div>
          </div>
        )}

        {activeTab === "chatter" && (<>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Chatter gesamt</p>
            <p className="text-2xl font-bold text-gold-gradient">{chatters.length}</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Mit Telegram-ID</p>
            <p className="text-2xl font-bold text-gold-gradient">
              {chatters.filter((c) => c.telegram_id).length}
            </p>
          </div>
        </div>

        {/* Platform Account Pools */}
        <section className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Account-Pools</h2>
            </div>
            <Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = prompt("Plattform-Name eingeben (z.B. Brezzels):");
                  if (name?.trim()) {
                    setSelectedPlatform(name.trim());
                    setAccountPoolOpen(true);
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Neue Plattform
              </Button>
            </Dialog>
          </div>

          {platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Plattformen angelegt. Erstelle eine neue Plattform oben.
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
          )}
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chatter suchen (Gruppe oder Telegram-ID)..."
            className="pl-9 text-sm"
          />
        </div>

        {/* Chatter List */}
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
              {search ? "Kein Chatter gefunden." : "Noch keine Chatter registriert."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((chatter) => {
                return (
                  <div
                    key={chatter.user_id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-accent">
                        {(chatter.group_name || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openGoalEditor(chatter)}
                      className="text-accent hover:text-accent/80 shrink-0"
                      title="Tagesziel bearbeiten"
                    >
                      <Target className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReassignTarget(chatter)}
                      className="text-foreground hover:text-foreground/80 shrink-0"
                      title="Accounts verwalten"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(chatter)}
                      className="text-destructive hover:text-destructive/80 shrink-0"
                      title="Account entfernen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPushTarget(chatter)}
                      className="text-accent hover:text-accent/80 shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </>)}
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
            {/* Offer zuordnen + Pool löschen */}
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Verknüpftes Offer</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => updatePoolOffer(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 text-foreground text-xs px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors appearance-none cursor-pointer"
                >
                  <option value={selectedPlatform}>{selectedPlatform}</option>
                  {offers
                    .filter((o) => o.name !== selectedPlatform && !platforms.includes(o.name))
                    .map((o) => (
                      <option key={o.name} value={o.name}>{o.name} ({o.target_path})</option>
                    ))}
                </select>
              </div>
              <div className="pt-5">
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
              <p className="text-[10px] text-muted-foreground">Wird automatisch für alle neuen Accounts & Chatter verwendet.</p>
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

            {/* Stats */}
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

            {/* Account list */}
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {platformAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Noch keine Accounts für {selectedPlatform}.
                </p>
              ) : (
                platformAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground truncate">{acc.account_email}</span>
                      {acc.assigned_to ? (
                        <Badge className="text-[10px] bg-secondary text-secondary-foreground">
                          Vergeben an {getChatterName(acc.assigned_to)}
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-green-500/20 text-green-400">
                          Frei
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Domain: {acc.account_domain} · PW: {acc.account_password}
                    </p>
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
    </div>
  );
}
