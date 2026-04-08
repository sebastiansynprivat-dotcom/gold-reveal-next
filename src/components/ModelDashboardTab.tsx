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
  Upload, FileText, Trash2, Download, Save, Loader2, Star,
  Percent, Wallet, StickyNote, CheckCircle2, FileDown, Plus,
  Search, ChevronRight, TrendingUp, KeyRound, Copy, Eye, EyeOff,
  Users, Globe, User, FolderTree, Pencil
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import CreditNoteForm from "@/components/CreditNoteForm";

// ─── Types ───
const extractDriveFolderId = (input: string): string => {
  if (!input) return "";
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input;
};
interface ModelRow {
  id: string;
  name: string;
  username: string;
  address: string;
  revenue_percentage: number;
  crypto_address: string;
  currency: string;
  contract_file_path: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
}

interface ChatterProfile {
  user_id: string;
  group_name: string;
  account_email: string | null;
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AED"] as const;
const PLATFORMS = ["4Based", "Maloum", "Brezzels", "FansyMe"] as const;
const PLATFORM_DOMAINS: Record<string, string> = {
  "4Based": "4based.com",
  "Maloum": "malum.com",
  "Brezzels": "brezzels.com",
  "FansyMe": "fansyme.com",
};

// ─── Animated counter ───
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

function AnimatedGoldValue({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedCounter(value);
  return <span className={className}>{animated.toLocaleString("de-DE")}{suffix}</span>;
}

// ─── Section wrapper ───
function Section({
  icon: Icon, title, children, delay = 0,
}: { icon: React.ElementType; title: string; children: React.ReactNode; delay?: number }) {
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
  "Maloum": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Brezzels": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "FansyMe": "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

// ─── Main Component ───
export default function ModelDashboardTab() {
  // Models
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Selected model form state
  const [modelForm, setModelForm] = useState<Partial<ModelRow>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Accounts for selected model
  const [modelAccounts, setModelAccounts] = useState<AccountRow[]>([]);

  // Shared account entry factory
  const emptyAccountEntries = () => PLATFORMS.reduce((acc, p) => ({ ...acc, [p]: { selected: false, account_email: "", account_password: "", account_domain: PLATFORM_DOMAINS[p] || "", drive_folder_id: "", model_language: "de" as "de" | "en", model_agency: "shex" as "shex" | "syn", model_active: true } }), {} as Record<string, { selected: boolean; account_email: string; account_password: string; account_domain: string; drive_folder_id: string; model_language: "de" | "en"; model_agency: "shex" | "syn"; model_active: boolean }>);

  // Create model dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState({ name: "", username: "", address: "" });
  const [creating, setCreating] = useState(false);
  const [createAccounts, setCreateAccounts] = useState(emptyAccountEntries);

  // Add account dialog – multi-platform
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newAccounts, setNewAccounts] = useState(emptyAccountEntries);
  const [addingAccount, setAddingAccount] = useState(false);

  // Inline edit account
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountData, setEditAccountData] = useState({ account_email: "", account_password: "", account_domain: "", drive_folder_id: "", model_language: "de" as "de" | "en", model_agency: "shex" as "shex" | "syn", model_active: true });

  // Model login dialog
  const [modelLoginDialog, setModelLoginDialog] = useState(false);
  const [modelLoginLoading, setModelLoginLoading] = useState(false);
  const [modelLoginCreds, setModelLoginCreds] = useState<{ email: string; password: string } | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginAccountId, setLoginAccountId] = useState<string>("");

  // Revenue from model_dashboard (per-platform)
  const [dashboardRevenues, setDashboardRevenues] = useState<Record<string, number>>({});
  const [platformRevenues, setPlatformRevenues] = useState<Record<string, { fourbased: number; maloum: number; brezzels: number }>>({});

  const detailRef = useRef<HTMLDivElement>(null);

  // ─── Load models ───
  const loadModels = useCallback(async () => {
    const { data } = await (supabase.from("models") as any)
      .select("*")
      .order("name");
    if (data) setModels(data as ModelRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);




  // ─── Load accounts for selected model ───
  const loadModelAccounts = useCallback(async (modelId: string) => {
    const { data } = await supabase
      .from("accounts")
      .select("id, account_email, account_domain, account_password, platform, model_id, assigned_to, model_active" as any)
      .eq("model_id", modelId)
      .order("platform");
    if (data) setModelAccounts(data as any as AccountRow[]);

    // Load revenue data from model_dashboard for these accounts
    const { data: dashData } = await supabase
      .from("model_dashboard")
      .select("account_id, fourbased_revenue, maloum_revenue, brezzels_revenue, monthly_revenue");
    if (dashData) {
      const revMap: Record<string, number> = {};
      const platRevMap: Record<string, { fourbased: number; maloum: number; brezzels: number }> = {};
      for (const d of dashData) {
        const fb = Number((d as any).fourbased_revenue) || 0;
        const ml = Number((d as any).maloum_revenue) || 0;
        const br = Number((d as any).brezzels_revenue) || 0;
        revMap[d.account_id] = fb + ml + br || Number((d as any).monthly_revenue) || 0;
        platRevMap[d.account_id] = { fourbased: fb, maloum: ml, brezzels: br };
      }
      setDashboardRevenues(revMap);
      setPlatformRevenues(platRevMap);
    }
  }, []);

  // ─── Load selected model data into form ───
  useEffect(() => {
    if (!selectedModelId) return;
    const model = models.find(m => m.id === selectedModelId);
    if (model) {
      setModelForm({ ...model });
      loadModelAccounts(selectedModelId);
    }
  }, [selectedModelId, models, loadModelAccounts]);

  // ─── Filter models ───
  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    const q = searchQuery.toLowerCase();
    return models.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.username || "").toLowerCase().includes(q)
    );
  }, [models, searchQuery]);

  // ─── Per-model platform revenue (for selected model) ───
  const selectedModelPlatformRevenue = useMemo(() => {
    if (!selectedModelId || modelAccounts.length === 0) return [];
    const platformMap: Record<string, { fourbased: number; maloum: number; brezzels: number; total: number }> = {};
    for (const acc of modelAccounts) {
      const pr = platformRevenues[acc.id];
      const rev = dashboardRevenues[acc.id] || 0;
      if (!platformMap[acc.platform]) platformMap[acc.platform] = { fourbased: 0, maloum: 0, brezzels: 0, total: 0 };
      if (pr) {
        platformMap[acc.platform].fourbased += pr.fourbased;
        platformMap[acc.platform].maloum += pr.maloum;
        platformMap[acc.platform].brezzels += pr.brezzels;
      }
      platformMap[acc.platform].total += rev;
    }
    return Object.entries(platformMap).map(([platform, data]) => ({ platform, ...data }));
  }, [selectedModelId, modelAccounts, platformRevenues, dashboardRevenues]);


  const totalRevenue = useMemo(() => {
    return modelAccounts.reduce((sum, acc) => sum + (dashboardRevenues[acc.id] || 0), 0);
  }, [modelAccounts, dashboardRevenues]);

  const verdienst = useMemo(() => {
    const pct = modelForm.revenue_percentage || 0;
    if (pct <= 0 || totalRevenue <= 0) return 0;
    return Math.round(totalRevenue * pct / 100);
  }, [totalRevenue, modelForm.revenue_percentage]);

  // ─── Create model ───
  const handleCreateModel = async () => {
    if (!newModel.name.trim()) { toast.error("Name ist erforderlich"); return; }
    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase.from("models") as any).insert({
      name: newModel.name,
      username: newModel.username,
      address: newModel.address,
      created_by: userData.user?.id,
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success("Model erstellt ✅");
      setNewModel({ name: "", username: "", address: "" });
      setCreateDialogOpen(false);
      await loadModels();
    }
    setCreating(false);
  };

  // ─── Save model ───
  const saveModel = async () => {
    if (!selectedModelId) return;
    setSaving(true);
    const { error } = await (supabase.from("models") as any).update({
      name: modelForm.name,
      username: modelForm.username,
      address: modelForm.address,
      revenue_percentage: modelForm.revenue_percentage,
      crypto_address: modelForm.crypto_address,
      currency: modelForm.currency,
      notes: modelForm.notes,
      contract_file_path: modelForm.contract_file_path,
    }).eq("id", selectedModelId);
    if (error) toast.error(error.message);
    else { toast.success("Gespeichert ✅"); await loadModels(); }
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
      setModelForm(prev => ({ ...prev, contract_file_path: path }));
      toast.success("Vertrag hochgeladen ✅");
    }
    setUploading(false);
    e.target.value = "";
  };

  const deleteContract = async () => {
    if (!modelForm.contract_file_path) return;
    await supabase.storage.from("model-contracts").remove([modelForm.contract_file_path]);
    setModelForm(prev => ({ ...prev, contract_file_path: "" }));
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
    if (selected.length === 0) { toast.error("Wähle mindestens eine Plattform"); return; }
    setAddingAccount(true);
    const { data: userData } = await supabase.auth.getUser();
    let errors = 0;
    for (const [platform, entry] of selected) {
      const { error } = await (supabase.from("accounts") as any).insert({
        platform,
        account_email: entry.account_email,
        account_password: entry.account_password,
        account_domain: entry.account_domain,
        drive_folder_id: extractDriveFolderId(entry.drive_folder_id),
        model_language: entry.model_language,
        model_agency: entry.model_agency,
        model_active: entry.model_active,
        model_id: selectedModelId,
        created_by: userData.user?.id,
      });
      if (error) { errors++; toast.error(`${platform}: ${error.message}`); }
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
  const startEditAccount = (acc: AccountRow & { drive_folder_id?: string; model_language?: string; model_agency?: string }) => {
    setEditingAccountId(acc.id);
    setEditAccountData({
      account_email: acc.account_email,
      account_password: acc.account_password,
      account_domain: acc.account_domain,
      drive_folder_id: (acc as any).drive_folder_id || "",
      model_language: ((acc as any).model_language || "de") as "de" | "en",
      model_agency: ((acc as any).model_agency || "shex") as "shex" | "syn",
      model_active: acc.model_active !== false,
    });
  };

  // ─── Save edited account ───
  const saveEditAccount = async () => {
    if (!editingAccountId) return;
    const { error } = await supabase.from("accounts").update({
      account_email: editAccountData.account_email,
      account_password: editAccountData.account_password,
      account_domain: editAccountData.account_domain,
      drive_folder_id: extractDriveFolderId(editAccountData.drive_folder_id),
      model_language: editAccountData.model_language,
      model_agency: editAccountData.model_agency,
      model_active: editAccountData.model_active,
    } as any).eq("id", editingAccountId);
    if (error) toast.error(error.message);
    else {
      toast.success("Account aktualisiert ✅");
      setEditingAccountId(null);
      if (selectedModelId) await loadModelAccounts(selectedModelId);
    }
  };

  // ─── Generate model login ───
  const generateModelLogin = async (accountId: string) => {
    setLoginAccountId(accountId);
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
        body: JSON.stringify({ account_id: accountId }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Fehler");
      else {
        setModelLoginCreds({ email: data.email, password: data.password });
        setModelLoginDialog(true);
        toast.success("Login erstellt ✅");
      }
    } catch (err: any) { toast.error(err.message); }
    setModelLoginLoading(false);
  };

  // ─── Delete model ───
  const deleteModel = async () => {
    if (!selectedModelId) return;
    // First unlink accounts
    await (supabase.from("accounts") as any).update({ model_id: null }).eq("model_id", selectedModelId);
    const { error } = await (supabase.from("models") as any).delete().eq("id", selectedModelId);
    if (error) toast.error(error.message);
    else {
      toast.success("Model gelöscht");
      setSelectedModelId("");
      await loadModels();
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center gold-glow">
          <FolderTree className="h-4.5 w-4.5 text-accent" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gold-gradient-shimmer tracking-wide">Model-Verwaltung</h1>
          <p className="text-xs text-muted-foreground">{models.length} Models registriert</p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          size="sm"
          className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground gold-glow"
        >
          <Plus className="h-3.5 w-3.5" />
          Model anlegen
        </Button>
      </motion.div>

      {/* ── Search ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
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
          <div className="grid grid-cols-[1fr_100px_80px] gap-0 bg-accent/10 border-b border-accent/20">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold">Name</div>
            <div className="px-2 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Benutzername</div>
            <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-right">Anteil</div>
          </div>

          {/* Rows */}
          <ScrollArea className="max-h-[350px]">
            {filteredModels.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {models.length === 0 ? 'Noch keine Models angelegt.' : 'Keine Models gefunden.'}
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
                        : i % 2 === 0 ? "bg-card/40 hover:bg-accent/5" : "bg-card/20 hover:bg-accent/5"
                    )}
                  >
                    <div className="px-3 py-2.5 min-w-0">
                      <p className={cn("text-xs font-medium truncate", isSelected ? "text-accent" : "text-foreground")}>
                        {model.name || "Unbenannt"}
                      </p>
                      {model.address && (
                        <p className="text-[10px] text-muted-foreground truncate">{model.address}</p>
                      )}
                    </div>
                    <div className="px-2 py-2 text-center">
                      <span className="text-[11px] text-muted-foreground">{model.username || "–"}</span>
                    </div>
                    <div className="px-1 py-2 text-right pr-3">
                      <span className="text-[11px] tabular-nums text-muted-foreground">{model.revenue_percentage}%</span>
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
                <p className="text-sm font-semibold text-foreground truncate">{selectedModel.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedModel.username && `@${selectedModel.username} · `}
                  {modelAccounts.length} Plattform-Account{modelAccounts.length !== 1 ? "s" : ""}
                </p>
              </div>
              {modelAccounts.length < PLATFORMS.length && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddAccountOpen(true)}
                className="shrink-0 text-xs gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
              >
                <Plus className="h-3 w-3" />
                Account
              </Button>
              )}
            </div>

            {/* ── Revenue per Platform ── */}
            {modelAccounts.length > 0 && (
              <Section icon={TrendingUp} title="Einnahmen" delay={0.05}>
                <div className="space-y-3">
                  {/* Hero total */}
                  <div className="relative gold-gradient-border-animated pulse-glow rounded-xl p-5 text-center">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/8 via-transparent to-accent/5 pointer-events-none" />
                    <div className="relative">
                      <p className="text-[10px] text-muted-foreground mb-1 tracking-widest uppercase">Gesamtumsatz</p>
                      <p className="text-3xl font-extrabold text-gold-gradient-shimmer tracking-tight tabular-nums">
                        <AnimatedGoldValue value={totalRevenue} suffix={` ${modelForm.currency || "EUR"}`} />
                      </p>
                      {verdienst > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Verdienst ({modelForm.revenue_percentage}%): <span className="text-accent font-semibold">{verdienst.toLocaleString("de-DE")} {modelForm.currency || "EUR"}</span>
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
                        "Maloum": "#d4af37",
                        "Brezzels": "#3b82f6",
                        "FansyMe": "#ec4899",
                      };
                      // Map platform to the correct revenue field
                      const platformFieldMap: Record<string, string> = {
                        "4Based": "fourbased_revenue",
                        "Maloum": "maloum_revenue",
                        "Brezzels": "brezzels_revenue",
                      };
                      const revenueField = platformFieldMap[acc.platform] || "monthly_revenue";

                      return (
                        <div key={acc.id} className="glass-card-subtle rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorMap[acc.platform] || "#888" }} />
                              <p className="text-xs font-medium text-foreground">{acc.platform}</p>
                              <Badge variant="outline" className={cn("text-[9px]", platformColors[acc.platform])}>
                                {acc.account_email || acc.account_domain}
                              </Badge>
                            </div>
                            <p className="text-sm font-bold text-foreground tabular-nums">
                              {rev > 0 ? `${rev.toLocaleString("de-DE")}€` : "–"}
                            </p>
                          </div>
                          {/* Inline edit revenue */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 input-gold-shimmer rounded-lg">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="Umsatz eintragen…"
                                defaultValue={rev > 0 ? rev : ""}
                                className="bg-secondary/40 border-transparent text-sm h-8 tabular-nums"
                                onBlur={async (e) => {
                                  const newVal = Number(e.target.value) || 0;
                                  if (newVal === rev) return;
                                  // Upsert into model_dashboard
                                  const updateData: Record<string, any> = {
                                    [revenueField]: newVal,
                                    monthly_revenue: newVal,
                                  };
                                  // Check if row exists
                                  const { data: existing } = await supabase
                                    .from("model_dashboard")
                                    .select("id")
                                    .eq("account_id", acc.id)
                                    .maybeSingle();
                                  if (existing) {
                                    await supabase.from("model_dashboard").update(updateData).eq("account_id", acc.id);
                                  } else {
                                    await supabase.from("model_dashboard").insert({
                                      account_id: acc.id,
                                      ...updateData,
                                    } as any);
                                  }
                                  toast.success(`${acc.platform} Umsatz aktualisiert ✅`);
                                  if (selectedModelId) loadModelAccounts(selectedModelId);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">{modelForm.currency || "EUR"}</span>
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
                        onChange={e => setModelForm(prev => ({ ...prev, name: e.target.value }))}
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
                        onChange={e => setModelForm(prev => ({ ...prev, username: e.target.value }))}
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
                      onChange={e => setModelForm(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-secondary/40 border-transparent text-sm min-h-[60px]"
                      placeholder="Straße, PLZ, Ort, Land"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Revenue & Payout ── */}
            <Section icon={TrendingUp} title="Einnahmen & Anteil" delay={0.05}>
              <div className="space-y-4">
                {/* Total revenue from all platform accounts */}
                {totalRevenue > 0 && (
                  <div className="text-center py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Gesamtumsatz</p>
                    <p className="text-4xl font-black text-gold-gradient tabular-nums">
                      <AnimatedGoldValue value={totalRevenue} suffix={` ${modelForm.currency || "EUR"}`} />
                    </p>
                  </div>
                )}

                {/* Percentage slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Revenue-Anteil:</span>
                    <div className="gold-gradient-border-animated rounded-lg px-3 py-1">
                      <span className="text-sm font-bold text-gold-gradient tabular-nums">{modelForm.revenue_percentage || 0}%</span>
                    </div>
                  </div>
                  <Slider
                    value={[modelForm.revenue_percentage || 0]}
                    onValueChange={([v]) => setModelForm(prev => ({ ...prev, revenue_percentage: v }))}
                    min={0} max={100} step={1}
                  />
                </div>

                {/* Currency */}
                <div className="flex justify-end">
                  <Select value={modelForm.currency || "EUR"} onValueChange={v => setModelForm(prev => ({ ...prev, currency: v }))}>
                    <SelectTrigger className="w-[100px] text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Verdienst */}
                {verdienst > 0 && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Verdienst Model ({modelForm.revenue_percentage}%)
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
                      <AccordionItem key={platform} value={platform} className="border border-border/40 rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-accent/5">
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              "text-[10px] font-medium px-2.5 py-0.5 rounded-full border",
                              platformColors[platform] || "bg-secondary/50 text-muted-foreground border-border/30"
                            )}>
                              {platform}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {accs.length} Account{accs.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3 space-y-2">
                          {accs.map(acc => {
                            const isEditing = editingAccountId === acc.id;
                            return (
                              <div key={acc.id} className="rounded-lg border border-border/30 bg-secondary/20 p-3 space-y-2">
                                {isEditing ? (
                                  /* ── Inline Edit Mode ── */
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">E-Mail / Login</Label>
                                        <Input
                                          value={editAccountData.account_email}
                                          onChange={e => setEditAccountData(prev => ({ ...prev, account_email: e.target.value }))}
                                          className="bg-secondary/40 border-border/50 text-xs h-8"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Passwort</Label>
                                        <Input
                                          value={editAccountData.account_password}
                                          onChange={e => setEditAccountData(prev => ({ ...prev, account_password: e.target.value }))}
                                          className="bg-secondary/40 border-border/50 text-xs h-8"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">Domain</Label>
                                      <Input
                                        value={editAccountData.account_domain}
                                        onChange={e => setEditAccountData(prev => ({ ...prev, account_domain: e.target.value }))}
                                        className="bg-secondary/40 border-border/50 text-xs h-8"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">Drive Folder ID</Label>
                                      <Input
                                        value={editAccountData.drive_folder_id}
                                        onChange={e => setEditAccountData(prev => ({ ...prev, drive_folder_id: e.target.value }))}
                                        placeholder="URL oder ID"
                                        className="bg-secondary/40 border-border/50 text-xs h-8"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Sprache</Label>
                                        <div className="flex gap-1">
                                          <button onClick={() => setEditAccountData(prev => ({ ...prev, model_language: "de" }))}
                                            className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", editAccountData.model_language === "de" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                            🇩🇪 DE
                                          </button>
                                          <button onClick={() => setEditAccountData(prev => ({ ...prev, model_language: "en" }))}
                                            className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", editAccountData.model_language === "en" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                            🇬🇧 EN
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Agentur</Label>
                                        <div className="flex gap-1">
                                          <button onClick={() => setEditAccountData(prev => ({ ...prev, model_agency: "shex" }))}
                                            className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", editAccountData.model_agency === "shex" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                            SheX
                                          </button>
                                          <button onClick={() => setEditAccountData(prev => ({ ...prev, model_agency: "syn" }))}
                                            className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", editAccountData.model_agency === "syn" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                            SYN
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                      <span className="text-[10px] font-medium text-muted-foreground">Model aktiv</span>
                                      <Switch
                                        checked={editAccountData.model_active}
                                        onCheckedChange={(checked) => setEditAccountData(prev => ({ ...prev, model_active: checked }))}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={saveEditAccount} className="h-7 text-[10px] gap-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                                        <Save className="h-3 w-3" />
                                        Speichern
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingAccountId(null)} className="h-7 text-[10px]">
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
                                          <p className="text-xs font-medium text-foreground truncate">{acc.account_email || "–"}</p>
                                          {acc.account_email && (
                                            <button
                                              type="button"
                                              onClick={() => { navigator.clipboard.writeText(acc.account_email); toast.success("E-Mail kopiert"); }}
                                              className="opacity-0 group-hover/email:opacity-100 transition-opacity"
                                            >
                                              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                          )}
                                        </div>
                                        {acc.account_domain && (
                                          <p className="text-[10px] text-muted-foreground truncate">{acc.account_domain}</p>
                                        )}
                                        {acc.account_password && (
                                          <div className="flex items-center gap-1.5 group/pw">
                                            <p className="text-[10px] text-muted-foreground font-mono">PW: {acc.account_password}</p>
                                            <button
                                              type="button"
                                              onClick={() => { navigator.clipboard.writeText(acc.account_password); toast.success("Passwort kopiert"); }}
                                              className="opacity-0 group-hover/pw:opacity-100 transition-opacity"
                                            >
                                              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                          </div>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60 font-mono">ID: {acc.id.slice(0, 8)}…</p>
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <Button
                                          size="sm" variant="ghost"
                                          onClick={() => startEditAccount(acc)}
                                          className="h-7 text-[10px] gap-1 text-foreground hover:bg-accent/10"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm" variant="ghost"
                                          onClick={() => generateModelLogin(acc.id)}
                                          disabled={modelLoginLoading && loginAccountId === acc.id}
                                          className="h-7 text-[10px] gap-1 text-accent hover:bg-accent/10"
                                        >
                                          <KeyRound className="h-3 w-3" />
                                          Login
                                        </Button>
                                        <Button
                                          size="sm" variant="ghost"
                                          onClick={() => deleteAccount(acc.id)}
                                          className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    {/* Ebene 3: Chatter assigned */}
                                    <div className="border-t border-border/30 pt-2">
                                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Zugewiesener Chatter</p>
                                      {acc.assigned_to ? (
                                        <div className="flex items-center gap-2">
                                          <div className="h-5 w-5 rounded-full bg-accent/15 flex items-center justify-center">
                                            <User className="h-3 w-3 text-accent" />
                                          </div>
                                          <span className="text-xs text-foreground font-mono">{acc.assigned_to.slice(0, 8)}…</span>
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-muted-foreground/60 italic">Kein Chatter zugewiesen</p>
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

            {/* ── Crypto ── */}
            <Section icon={Wallet} title="Crypto / Auszahlung" delay={0.2}>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Crypto-Infos (Adresse, Coin, Netzwerk…)</Label>
                <div className="input-gold-shimmer rounded-lg">
                  <Textarea
                    value={modelForm.crypto_address || ""}
                    onChange={e => setModelForm(prev => ({ ...prev, crypto_address: e.target.value }))}
                    placeholder="z.B. USDT TRC20 – TXyz…&#10;Netzwerk: Tron"
                    className="bg-secondary/40 border-transparent text-sm min-h-[80px]"
                  />
                </div>
              </div>
            </Section>

            {/* ── Notizen ── */}
            <Section icon={StickyNote} title="Notizen" delay={0.25}>
              <div className="space-y-1.5">
                <div className="input-gold-shimmer rounded-lg">
                  <Textarea
                    value={modelForm.notes || ""}
                    onChange={e => setModelForm(prev => ({ ...prev, notes: e.target.value }))}
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
                suggestedAmount={verdienst}
                providerName={selectedModel.name}
                accountId={modelAccounts[0]?.id || ""}
                cryptoAddress={modelForm.crypto_address || ""}
                revenuePercentage={modelForm.revenue_percentage || 0}
                currency={modelForm.currency || "EUR"}
                platformRevenue={{
                  fourbased: 0,
                  maloum: 0,
                  brezzels: 0,
                }}
              />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Model Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Neues Model anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={newModel.name}
                onChange={e => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Alina"
                className="bg-secondary/40 border-border/50 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Benutzername</Label>
              <Input
                value={newModel.username}
                onChange={e => setNewModel(prev => ({ ...prev, username: e.target.value }))}
                placeholder="z.B. alina_official"
                className="bg-secondary/40 border-border/50 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Anschrift</Label>
              <Textarea
                value={newModel.address}
                onChange={e => setNewModel(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Straße, PLZ, Ort, Land"
                className="bg-secondary/40 border-border/50 text-sm min-h-[60px]"
              />
            </div>
            <Button
              onClick={handleCreateModel}
              disabled={creating}
              className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Model erstellen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Account Dialog (Multi-Platform) ── */}
      <Dialog open={addAccountOpen} onOpenChange={v => { setAddAccountOpen(v); if (!v) setNewAccounts(emptyAccountEntries()); }}>
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Plattform-Accounts hinzufügen</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Wähle eine oder mehrere Plattformen aus und trage die Login-Daten ein.</p>
          <div className="space-y-3">
            {PLATFORMS.filter(p => !modelAccounts.some(a => a.platform === p)).map(platform => {
              const entry = newAccounts[platform];
              const isSelected = entry?.selected;
              return (
                <div key={platform} className={cn(
                  "rounded-lg border transition-all duration-200",
                  isSelected ? "border-accent/40 bg-accent/5" : "border-border/40 bg-secondary/10"
                )}>
                  {/* Platform toggle header */}
                  <button
                    type="button"
                    onClick={() => setNewAccounts(prev => ({
                      ...prev,
                      [platform]: { ...prev[platform], selected: !prev[platform].selected }
                    }))}
                    className="w-full flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className={cn(
                      "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                      isSelected ? "border-accent bg-accent/20" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-accent" />}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium px-2.5 py-0.5 rounded-full border",
                      platformColors[platform] || "bg-secondary/50 text-muted-foreground border-border/30"
                    )}>
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
                                onChange={e => setNewAccounts(prev => ({
                                  ...prev,
                                  [platform]: { ...prev[platform], account_email: e.target.value }
                                }))}
                                placeholder="login@example.com"
                                className="bg-secondary/40 border-border/50 text-xs h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Passwort</Label>
                              <Input
                                value={entry.account_password}
                                onChange={e => setNewAccounts(prev => ({
                                  ...prev,
                                  [platform]: { ...prev[platform], account_password: e.target.value }
                                }))}
                                placeholder="••••••••"
                                className="bg-secondary/40 border-border/50 text-xs h-8"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Domain</Label>
                            <Input
                              value={entry.account_domain}
                              onChange={e => setNewAccounts(prev => ({
                                ...prev,
                                [platform]: { ...prev[platform], account_domain: e.target.value }
                              }))}
                              className="bg-secondary/40 border-border/50 text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Drive Folder ID</Label>
                            <Input
                              value={entry.drive_folder_id}
                              onChange={e => setNewAccounts(prev => ({
                                ...prev,
                                [platform]: { ...prev[platform], drive_folder_id: e.target.value }
                              }))}
                              placeholder="Optional – URL oder ID"
                              className="bg-secondary/40 border-border/50 text-xs h-8"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Sprache</Label>
                              <div className="flex gap-1">
                                <button onClick={() => setNewAccounts(prev => ({ ...prev, [platform]: { ...prev[platform], model_language: "de" as const } }))}
                                  className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", entry.model_language === "de" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                  🇩🇪 DE
                                </button>
                                <button onClick={() => setNewAccounts(prev => ({ ...prev, [platform]: { ...prev[platform], model_language: "en" as const } }))}
                                  className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", entry.model_language === "en" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                  🇬🇧 EN
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Agentur</Label>
                              <div className="flex gap-1">
                                <button onClick={() => setNewAccounts(prev => ({ ...prev, [platform]: { ...prev[platform], model_agency: "shex" as const } }))}
                                  className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", entry.model_agency === "shex" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                  SheX
                                </button>
                                <button onClick={() => setNewAccounts(prev => ({ ...prev, [platform]: { ...prev[platform], model_agency: "syn" as const } }))}
                                  className={cn("flex-1 text-[10px] px-2 py-1.5 rounded-md border transition-all", entry.model_agency === "syn" ? "bg-accent/15 text-accent border-accent/30 font-semibold" : "bg-secondary/30 text-muted-foreground border-border/50")}>
                                  SYN
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Model aktiv</span>
                            <Switch
                              checked={entry.model_active}
                              onCheckedChange={(checked) => setNewAccounts(prev => ({ ...prev, [platform]: { ...prev[platform], model_active: checked } }))}
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
              disabled={addingAccount || !Object.values(newAccounts).some(v => v.selected)}
              className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {addingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {(() => {
                const count = Object.values(newAccounts).filter(v => v.selected).length;
                return count > 1 ? `${count} Accounts hinzufügen` : "Account hinzufügen";
              })()}
            </Button>
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
    </div>
  );
}
