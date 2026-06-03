import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, LogOut, Instagram, Music2, Twitter, Globe, UserCheck, MessageCircle, CheckCircle2, Search, Users, ArrowLeft, TrendingUp, TrendingDown, Minus, Link2, X, Sparkles, Copy, KeyRound, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";
import { useAdminRole } from "@/hooks/useAdminRole";

type Marketer = { name: string; instagram: string; tracking_link?: string; tracking_name?: string };
type PlatformLogin = { platform: string; email: string; password: string };

export type ModelStage = "onboarding" | "warm_up" | "active" | "ready";

export const STAGE_OPTIONS: { value: ModelStage; label: string; color: string }[] = [
  { value: "onboarding", label: "Onboarding", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { value: "warm_up", label: "Warm up", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { value: "active", label: "Aktiv", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "ready", label: "Alles ready", color: "bg-accent/20 text-accent border-accent/40" },
];

type SocialMediaModel = {
  id: string;
  name: string;
  username: string;
  account_setup: boolean;
  chatter_needed: boolean;
  chatter_assigned: boolean;
  chatter_name: string;
  social_linked: boolean;
  instagram_url: string;
  instagram_urls: string[];
  linktree_url: string;
  tiktok_url: string;
  twitter_url: string;
  other_social: string;
  marketers: Marketer[];
  notes: string;
  status: string;
  stage: ModelStage;
  is_active: boolean;
  created_at: string;
};

const emptyModel: Omit<SocialMediaModel, "id" | "created_at"> = {
  name: "",
  username: "",
  account_setup: false,
  chatter_needed: false,
  chatter_assigned: false,
  chatter_name: "",
  social_linked: false,
  instagram_url: "",
  instagram_urls: [],
  linktree_url: "",
  tiktok_url: "",
  twitter_url: "",
  other_social: "",
  marketers: [],
  notes: "",
  status: "active",
  stage: "onboarding",
  is_active: true,
};

export default function SocialMediaDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin } = useAdminRole();
  const [models, setModels] = useState<SocialMediaModel[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, { followers: number; recorded_at: string; instagram_url: string | null }[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocialMediaModel | null>(null);
  const [form, setForm] = useState<typeof emptyModel>(emptyModel);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [snapshotFor, setSnapshotFor] = useState<SocialMediaModel | null>(null);
  const [snapshotValue, setSnapshotValue] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [logins, setLogins] = useState<Record<string, { email: string; password: string | null }>>({});
  const [loginBusy, setLoginBusy] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);

  const runScrape = async () => {
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-instagram-followers");
      if (error) throw error;
      const saved = (data as any)?.saved ?? 0;
      const scanned = (data as any)?.scanned ?? 0;
      toast.success(`Scrape fertig: ${saved}/${scanned} Models aktualisiert`);
      // Reload snapshots
      const { data: snaps } = await supabase
        .from("fanvue_instagram_snapshots" as any)
        .select("model_id, followers, recorded_at, instagram_url")
        .order("recorded_at", { ascending: true });
      const grouped: Record<string, { followers: number; recorded_at: string; instagram_url: string | null }[]> = {};
      (snaps || []).forEach((s: any) => {
        if (!grouped[s.model_id]) grouped[s.model_id] = [];
        grouped[s.model_id].push({ followers: s.followers, recorded_at: s.recorded_at, instagram_url: s.instagram_url ?? null });
      });
      setSnapshots(grouped);
    } catch (e: any) {
      toast.error(e?.message || "Scrape fehlgeschlagen");
    } finally {
      setScraping(false);
    }
  };

  const generateSummary = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryText("");
    try {
      const payload = models
        .filter((m) => m.notes && m.notes.trim())
        .map((m) => ({
          name: m.name,
          stage: STAGE_OPTIONS.find((s) => s.value === m.stage)?.label ?? m.stage,
          notes: m.notes,
        }));
      const { data, error } = await supabase.functions.invoke("summarize-model-notes", { body: { notes: payload } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummaryText((data as any)?.summary ?? "");
    } catch (e: any) {
      toast.error("AI Zusammenfassung fehlgeschlagen: " + (e?.message ?? "unbekannter Fehler"));
      setSummaryOpen(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fanvue_models" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden: " + error.message);
    } else {
      setModels(((data || []) as any[]).map((m) => ({
        ...m,
        marketers: Array.isArray(m.marketers) ? m.marketers : [],
        instagram_urls: Array.isArray(m.instagram_urls) ? m.instagram_urls : [],
        linktree_url: m.linktree_url ?? "",
        stage: (m.stage as ModelStage) ?? "onboarding",
        chatter_needed: !!m.chatter_needed,
      })));
    }
    // Load all IG snapshots
    const { data: snaps } = await supabase
      .from("fanvue_instagram_snapshots" as any)
      .select("model_id, followers, recorded_at, instagram_url")
      .order("recorded_at", { ascending: true });
    const grouped: Record<string, { followers: number; recorded_at: string; instagram_url: string | null }[]> = {};
    ((snaps || []) as any[]).forEach((s) => {
      (grouped[s.model_id] ||= []).push({ followers: s.followers, recorded_at: s.recorded_at, instagram_url: s.instagram_url ?? null });
    });
    setSnapshots(grouped);

    // Load model logins
    const { data: lg } = await supabase
      .from("fanvue_model_users" as any)
      .select("model_id, email, plaintext_password");
    const loginMap: Record<string, { email: string; password: string | null }> = {};
    ((lg || []) as any[]).forEach((r) => {
      loginMap[r.model_id] = { email: r.email, password: r.plaintext_password };
    });
    setLogins(loginMap);

    setLoading(false);
  };

  const callLoginFn = async (modelId: string, action: "create" | "reset" | "delete") => {
    setLoginBusy(modelId);
    try {
      const { data, error } = await supabase.functions.invoke("create-fanvue-model-login", {
        body: { model_id: modelId, action: action === "create" ? undefined : action },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (action === "delete") {
        setLogins((prev) => {
          const n = { ...prev };
          delete n[modelId];
          return n;
        });
        toast.success("Login gelöscht");
      } else {
        setLogins((prev) => ({ ...prev, [modelId]: { email: (data as any).email, password: (data as any).password } }));
        toast.success(action === "create" ? "Login erstellt" : "Passwort zurückgesetzt");
      }
    } catch (e: any) {
      toast.error("Fehler: " + (e?.message ?? "unbekannt"));
    } finally {
      setLoginBusy(null);
    }
  };

  const copyCreds = (email: string, password: string | null) => {
    const text = password ? `${email}\n${password}` : email;
    navigator.clipboard.writeText(text);
    toast.success("Zugangsdaten kopiert");
  };

  const saveSnapshot = async () => {
    if (!snapshotFor) return;
    const v = parseInt(snapshotValue.replace(/\D/g, ""), 10);
    if (!Number.isFinite(v) || v < 0) {
      toast.error("Bitte gültige Followerzahl eingeben");
      return;
    }
    const { error } = await supabase.from("fanvue_instagram_snapshots" as any).insert({
      model_id: snapshotFor.id,
      followers: v,
      created_by: user?.id,
    });
    if (error) {
      toast.error("Speichern fehlgeschlagen: " + error.message);
      return;
    }
    toast.success("Follower-Stand gespeichert");
    setSnapshotFor(null);
    setSnapshotValue("");
    load();
  };

  useEffect(() => { load(); }, []);



  const openCreate = () => {
    setEditing(null);
    setForm(emptyModel);
    setDialogOpen(true);
  };

  const openEdit = (m: SocialMediaModel) => {
    setEditing(m);
    const { id, created_at, ...rest } = m;
    // Seed Instagram list from legacy instagram_url if list is empty
    const igs = Array.isArray(rest.instagram_urls) && rest.instagram_urls.length > 0
      ? rest.instagram_urls
      : (rest.instagram_url ? [rest.instagram_url] : []);
    setForm({ ...rest, instagram_urls: igs });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    setSaving(true);
    const payload: any = { ...form, created_by: user?.id };
    let res;
    if (editing) {
      res = await supabase.from("fanvue_models" as any).update(payload).eq("id", editing.id);
    } else {
      res = await supabase.from("fanvue_models" as any).insert(payload);
    }
    setSaving(false);
    if (res.error) {
      toast.error("Speichern fehlgeschlagen: " + res.error.message);
      return;
    }
    toast.success(editing ? "Model aktualisiert" : "Model angelegt");
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("fanvue_models" as any).delete().eq("id", deleteId);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
    } else {
      toast.success("Model gelöscht");
      load();
    }
    setDeleteId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/socialmedia/login");
  };

  const addMarketer = () => setForm((f) => ({ ...f, marketers: [...f.marketers, { name: "", instagram: "" }] }));
  const updateMarketer = (i: number, field: keyof Marketer, value: string) =>
    setForm((f) => ({ ...f, marketers: f.marketers.map((m, idx) => idx === i ? { ...m, [field]: value } : m) }));
  const removeMarketer = (i: number) =>
    setForm((f) => ({ ...f, marketers: f.marketers.filter((_, idx) => idx !== i) }));

  const addInstagram = () => setForm((f) => ({ ...f, instagram_urls: [...f.instagram_urls, ""] }));
  const updateInstagram = (i: number, v: string) =>
    setForm((f) => ({ ...f, instagram_urls: f.instagram_urls.map((u, idx) => idx === i ? v : u) }));
  const removeInstagram = (i: number) =>
    setForm((f) => ({ ...f, instagram_urls: f.instagram_urls.filter((_, idx) => idx !== i) }));

  const filtered = models.filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.chatter_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: models.length,
    setup: models.filter((m) => m.account_setup).length,
    chatters: models.filter((m) => m.chatter_assigned).length,
    needed: models.filter((m) => m.chatter_needed && !m.chatter_assigned).length,
  };

  return (
    <div className="min-h-screen relative">
      <GoldParticles spawnRate={0.2} maxParticles={20} baseOpacity={0.15} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-accent/20 bg-[linear-gradient(180deg,hsl(0_0%_4%/0.95)_0%,hsl(0_0%_6%/0.85)_100%)] backdrop-blur-2xl shadow-[0_8px_32px_-8px_hsl(0_0%_0%/0.6)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.12)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <div className="relative z-10 flex items-center gap-3 px-4 py-3.5 md:px-6">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" aria-hidden="true" />
            <img src={logo} alt="Logo" className="relative h-10 w-10 rounded-full ring-2 ring-accent/50 shadow-[0_0_20px_hsl(var(--accent)/0.4)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">
              Social Media Dashboard
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Model Kartei</p>
          </div>
          <div className="flex-1" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/socialmedia/admin/plans")}
            className="shrink-0 border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/50 transition-all mr-2"
            title="Content Pläne"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1.5">Content Pläne</span>
          </Button>
          {isSuperAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/admin")}
              className="shrink-0 border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/50 transition-all shadow-[inset_0_1px_0_hsl(var(--accent)/0.15)] mr-2"
              title="Zurück zum Admin Dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">Admin Dashboard</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Abmelden</span>
          </Button>
        </div>
      </header>
      <div className="h-[68px]" aria-hidden="true" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Models gesamt", value: stats.total, icon: Users },
            { label: "Account eingerichtet", value: stats.setup, icon: CheckCircle2 },
            { label: "Mit Chatter", value: stats.chatters, icon: MessageCircle },
            { label: "Chatter benötigt", value: stats.needed, icon: MessageCircle },
          ].map(({ label, value, icon: Icon }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-4 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                <Icon className="h-3.5 w-3.5 text-accent/70" />
              </div>
              <div className="text-2xl font-bold text-foreground">{value}</div>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen nach Name, Username, Chatter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card/40 border-border/50"
            />
          </div>
          <Button
            onClick={generateSummary}
            variant="outline"
            className="shrink-0 border-accent/40 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/60"
            title="AI Zusammenfassung aller Model-Notizen"
          >
            <Sparkles className="h-4 w-4 mr-1.5" /> AI Summary
          </Button>
          <Button
            onClick={runScrape}
            disabled={scraping}
            variant="outline"
            className="shrink-0 border-accent/40 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/60"
            title="Aktuelle Instagram-Followerzahlen jetzt scrapen"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${scraping ? "animate-spin" : ""}`} />
            {scraping ? "Scrape läuft…" : "IG Scrape"}
          </Button>
          <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> Neues Model
          </Button>
        </div>

        {/* Model Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Models angelegt</p>
            <Button onClick={openCreate} variant="ghost" className="mt-3 text-accent">
              <Plus className="h-4 w-4 mr-1.5" /> Erstes Model anlegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden hover:border-accent/40 transition-all group"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{m.name || "—"}</h3>
                      {m.username && <p className="text-xs text-muted-foreground truncate">@{m.username}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {(() => {
                    const s = STAGE_OPTIONS.find((o) => o.value === m.stage) ?? STAGE_OPTIONS[0];
                    return (
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider mb-3 ${s.color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {s.label}
                      </div>
                    );
                  })()}

                  <div className="space-y-1.5 mb-3">
                    {m.chatter_needed && !m.chatter_assigned && (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-red-500/50 bg-red-500/15 text-red-300 animate-pulse">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Chatter benötigt!</span>
                      </div>
                    )}
                    <StatusRow icon={CheckCircle2} label="Account" active={m.account_setup} />
                    <StatusRow icon={MessageCircle} label="Chatter zugeteilt" active={m.chatter_assigned} extra={m.chatter_name} />
                  </div>

                  {(() => {
                    const igs = m.instagram_urls?.length ? m.instagram_urls : (m.instagram_url ? [m.instagram_url] : []);
                    const hasAny = igs.length > 0 || m.linktree_url;
                    if (!hasAny) return null;
                    return (
                      <div className="flex gap-1.5 mb-3 flex-wrap">
                        {igs.filter(Boolean).map((u, i) => (
                          <SocialLink key={i} href={u} icon={Instagram} />
                        ))}
                        {m.linktree_url && <SocialLink href={m.linktree_url} icon={Link2} />}
                      </div>
                    );
                  })()}

                  {(() => {
                    const igs = (m.instagram_urls?.length ? m.instagram_urls : (m.instagram_url ? [m.instagram_url] : []))
                      .map((u) => u?.trim()).filter(Boolean);
                    const all = snapshots[m.id] || [];
                    const legacy = all.filter((s) => !s.instagram_url);
                    return (
                      <div className="space-y-2 border-t border-border/30 pt-3 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Instagram className="h-3 w-3 text-accent/70" />
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">IG Wachstum</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => { setSnapshotFor(m); setSnapshotValue(""); }} className="h-6 px-2 text-[10px] text-accent hover:bg-accent/10">
                            <Plus className="h-3 w-3 mr-1" /> Eintragen
                          </Button>
                        </div>
                        {igs.length === 0 && legacy.length === 0 && (
                          <p className="text-[11px] text-muted-foreground/70 italic">Noch keine Instagram-Links hinterlegt</p>
                        )}
                        {igs.map((u) => {
                          const snaps = all.filter((s) => s.instagram_url === u);
                          const merged = snaps.length === 0 && igs.length === 1 ? legacy : snaps;
                          return <IgGrowthBlock key={u} url={u} snaps={merged} />;
                        })}
                        {igs.length === 0 && legacy.length > 0 && (
                          <IgGrowthBlock url={null} snaps={legacy} />
                        )}
                      </div>
                    );
                  })()}


                  {m.marketers.length > 0 && (
                    <div className="border-t border-border/30 pt-3 mt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <UserCheck className="h-3 w-3 text-accent/70" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Marketer ({m.marketers.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.marketers.map((mk, i) => (
                          <div key={i} className="flex flex-col gap-0.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-foreground truncate">{mk.name || "—"}</span>
                              {mk.instagram && (
                                <a
                                  href={mk.instagram.startsWith("http") ? mk.instagram : `https://instagram.com/${mk.instagram.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent hover:underline flex items-center gap-1 shrink-0 ml-2"
                                >
                                  <Instagram className="h-3 w-3" />
                                  <span className="truncate max-w-[100px]">{mk.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")}</span>
                                </a>
                              )}
                            </div>
                            {(mk.tracking_link || mk.tracking_name) && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                                <Link2 className="h-2.5 w-2.5 shrink-0" />
                                {mk.tracking_link ? (
                                  <a
                                    href={mk.tracking_link.startsWith("http") ? mk.tracking_link : `https://${mk.tracking_link}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent/80 hover:underline truncate max-w-[180px]"
                                  >
                                    {mk.tracking_name || mk.tracking_link}
                                  </a>
                                ) : (
                                  <span className="truncate">{mk.tracking_name}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Login section */}
                  <div className="border-t border-border/30 pt-3 mt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <KeyRound className="h-3 w-3 text-accent/70" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Login</span>
                    </div>
                    {logins[m.id] ? (
                      <div className="rounded-lg border border-accent/20 bg-background/40 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">E-Mail</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(logins[m.id].email); toast.success("E-Mail kopiert"); }}
                            className="text-xs text-foreground font-mono truncate hover:text-accent transition-colors"
                            title="Kopieren"
                          >
                            {logins[m.id].email}
                          </button>
                        </div>
                        {logins[m.id].password && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Passwort</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(logins[m.id].password!); toast.success("Passwort kopiert"); }}
                              className="text-xs text-foreground font-mono truncate hover:text-accent transition-colors"
                              title="Kopieren"
                            >
                              {logins[m.id].password}
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1.5 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] flex-1"
                            onClick={() => copyCreds(logins[m.id].email, logins[m.id].password)}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Kopieren
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] flex-1"
                            disabled={loginBusy === m.id}
                            onClick={() => callLoginFn(m.id, "reset")}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Reset
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive"
                            disabled={loginBusy === m.id}
                            onClick={() => callLoginFn(m.id, "delete")}
                            title="Login löschen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs border-accent/30 bg-accent/5 text-accent hover:bg-accent/15"
                        disabled={loginBusy === m.id}
                        onClick={() => callLoginFn(m.id, "create")}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {loginBusy === m.id ? "Erstelle…" : "Login generieren"}
                      </Button>
                    )}
                  </div>

                  {m.notes && (
                    <p className="text-xs text-muted-foreground mt-3 border-t border-border/30 pt-3 line-clamp-2">{m.notes}</p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-card border-accent/20 p-3 sm:p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-base sm:text-lg pr-2">{editing ? "Model bearbeiten" : "Neues Model anlegen"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Anzeigename" />
              </div>
              <div>
                <Label className="text-xs">Plattform Username</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as ModelStage, chatter_needed: v === "ready" && !form.chatter_assigned ? true : form.chatter_needed })}>
                <SelectTrigger className="bg-background/40">
                  <SelectValue placeholder="Stage wählen" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {/* Status Toggles */}
            <div className="rounded-xl border border-border/40 p-3 sm:p-4 space-y-3 bg-secondary/20">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</h4>
              <ToggleRow label="Account eingerichtet" checked={form.account_setup} onChange={(v) => setForm({ ...form, account_setup: v })} />
              <ToggleRow label="Chatter benötigt" checked={form.chatter_needed} onChange={(v) => setForm({ ...form, chatter_needed: v })} />
              <ToggleRow label="Chatter zugeteilt" checked={form.chatter_assigned} onChange={(v) => setForm({ ...form, chatter_assigned: v, chatter_needed: v ? false : form.chatter_needed })} />
              {form.chatter_assigned && (
                <Input
                  value={form.chatter_name}
                  onChange={(e) => setForm({ ...form, chatter_name: e.target.value })}
                  placeholder="Chatter Name"
                  className="text-sm"
                />
              )}
            </div>

            {/* Social Links (Instagram only, dynamic) */}
            <div className="rounded-xl border border-border/40 p-3 sm:p-4 space-y-2 bg-secondary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Instagram Accounts</h4>
                <Button size="sm" variant="ghost" onClick={addInstagram} className="text-accent h-7">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Hinzufügen
                </Button>
              </div>
              {form.instagram_urls.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Noch kein Instagram Account hinzugefügt</p>
              ) : (
                <div className="space-y-2">
                  {form.instagram_urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 min-w-0">
                      <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Instagram URL oder @handle"
                        value={url}
                        onChange={(e) => updateInstagram(i, e.target.value)}
                        className="text-sm min-w-0 flex-1"
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeInstagram(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linktree (separate from social links) */}
            <div className="rounded-xl border border-border/40 p-3 sm:p-4 space-y-2 bg-secondary/20">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Linktree</h4>
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="https://linktr.ee/username"
                  value={form.linktree_url}
                  onChange={(e) => setForm({ ...form, linktree_url: e.target.value })}
                  className="text-sm min-w-0 flex-1"
                />
              </div>
            </div>

            {/* Marketers */}
            <div className="rounded-xl border border-border/40 p-3 sm:p-4 space-y-2 bg-secondary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Marketer & Instagram-Links</h4>
                <Button size="sm" variant="ghost" onClick={addMarketer} className="text-accent h-7">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Hinzufügen
                </Button>
              </div>
              {form.marketers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Noch keine Marketer eingetragen</p>
              ) : (
                <div className="space-y-3">
                  {form.marketers.map((mk, i) => (
                    <div key={i} className="rounded-lg border border-border/30 p-2.5 space-y-2 bg-background/30">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center min-w-0">
                        <Input
                          placeholder="Name"
                          value={mk.name}
                          onChange={(e) => updateMarketer(i, "name", e.target.value)}
                          className="text-sm min-w-0 flex-1"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <Input
                            placeholder="@instagram oder URL"
                            value={mk.instagram}
                            onChange={(e) => updateMarketer(i, "instagram", e.target.value)}
                            className="text-sm min-w-0 flex-1"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeMarketer(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          placeholder="Tracking Name"
                          value={mk.tracking_name || ""}
                          onChange={(e) => updateMarketer(i, "tracking_name", e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Tracking Link"
                          value={mk.tracking_link || ""}
                          onChange={(e) => updateMarketer(i, "tracking_link", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">Notizen</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Interne Notizen..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm bg-card border-destructive/30">
          <DialogHeader>
            <DialogTitle>Model löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instagram Snapshot Dialog */}
      <Dialog open={!!snapshotFor} onOpenChange={(o) => !o && setSnapshotFor(null)}>
        <DialogContent className="max-w-sm bg-card border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-accent" />
              Follower-Stand eintragen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              {snapshotFor?.name} — aktuelle Instagram Follower
            </p>
            <Input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="z.B. 12450"
              value={snapshotValue}
              onChange={(e) => setSnapshotValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveSnapshot(); }}
            />
            {(() => {
              const hist = snapshotFor ? snapshots[snapshotFor.id] || [] : [];
              const last = hist[hist.length - 1];
              return last ? (
                <p className="text-[11px] text-muted-foreground">
                  Letzter Stand: {last.followers.toLocaleString("de-DE")} ({new Date(last.recorded_at).toLocaleDateString("de-DE")})
                </p>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSnapshotFor(null)}>Abbrechen</Button>
            <Button onClick={saveSnapshot} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              AI Summary aller Model-Notizen
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 min-h-[120px]">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">AI analysiert {models.filter((m) => m.notes?.trim()).length} Notizen…</p>
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90 prose-headings:text-accent prose-strong:text-foreground prose-li:my-0.5">
                <ReactMarkdown>{summaryText || "Keine Zusammenfassung verfügbar."}</ReactMarkdown>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {summaryText && !summaryLoading && (
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(summaryText);
                  toast.success("Zusammenfassung kopiert");
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Kopieren
              </Button>
            )}
            <Button onClick={() => setSummaryOpen(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IgGrowthBlock({ url, snaps }: { url: string | null; snaps: { followers: number; recorded_at: string; instagram_url: string | null }[] }) {
  const latest = snaps[snaps.length - 1];

  // 7-day baseline: latest snapshot recorded >=7 days before "latest"
  const sevenDayBaseline = (() => {
    if (!latest) return null;
    const latestT = new Date(latest.recorded_at).getTime();
    const cutoff = latestT - 7 * 24 * 60 * 60 * 1000;
    // Walk backwards, pick the closest snapshot on/before cutoff,
    // or fallback to the oldest snapshot we have if none is old enough.
    let baseline = null as null | typeof latest;
    for (let i = snaps.length - 2; i >= 0; i--) {
      const t = new Date(snaps[i].recorded_at).getTime();
      if (t <= cutoff) { baseline = snaps[i]; break; }
    }
    if (!baseline && snaps.length >= 2) baseline = snaps[0];
    return baseline;
  })();

  const delta7 = latest && sevenDayBaseline ? latest.followers - sevenDayBaseline.followers : 0;
  const pct7 = latest && sevenDayBaseline && sevenDayBaseline.followers > 0
    ? (delta7 / sevenDayBaseline.followers) * 100
    : 0;
  const TrendIcon = delta7 > 0 ? TrendingUp : delta7 < 0 ? TrendingDown : Minus;
  const trendColor = delta7 > 0 ? "text-emerald-400" : delta7 < 0 ? "text-red-400" : "text-muted-foreground";

  // Sparkline
  const w = 100, h = 24;
  let path = "";
  if (snaps.length >= 2) {
    const vals = snaps.map((s) => s.followers);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    path = snaps.map((s, i) => {
      const x = (i / (snaps.length - 1)) * w;
      const y = h - ((s.followers - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  const handle = url
    ? url.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/$/, "").split("?")[0]
    : "Legacy";

  return (
    <div className="rounded-lg border border-border/30 bg-card/30 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent/90 hover:underline truncate max-w-[60%]">
            {handle}
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground/60 italic">{handle}</span>
        )}
        {latest && (
          <span className="text-xs font-bold text-foreground">
            {latest.followers.toLocaleString("de-DE")}
          </span>
        )}
      </div>
      {!latest ? (
        <p className="text-[10px] text-muted-foreground/60 italic">Noch keine Daten – beim nächsten Scrape um 00:00 UTC</p>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <div className={`flex items-center gap-1 text-[11px] ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {sevenDayBaseline ? (
              <>
                <span className="font-semibold">
                  {delta7 > 0 ? "+" : ""}{delta7.toLocaleString("de-DE")}
                </span>
                <span className="text-muted-foreground/80">
                  ({pct7 > 0 ? "+" : ""}{pct7.toFixed(1)}%) · 7T
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Erster Eintrag</span>
            )}
          </div>
          {path && (
            <svg width={w} height={h} className="shrink-0 overflow-visible">
              <path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}


function StatusRow({ icon: Icon, label, active, extra }: { icon: any; label: string; active: boolean; extra?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`h-3.5 w-3.5 ${active ? "text-accent" : "text-muted-foreground/40"}`} />
      <span className={active ? "text-foreground" : "text-muted-foreground/60"}>{label}</span>
      {extra && active && <span className="text-muted-foreground">· {extra}</span>}
      {active && <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[9px] bg-accent/10 text-accent border-0">✓</Badge>}
    </div>
  );
}

function SocialLink({ href, icon: Icon }: { href: string; icon: any }) {
  let url = href.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = url.startsWith("@") ? `https://instagram.com/${url.slice(1)}` : `https://${url}`;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="h-7 w-7 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 flex items-center justify-center text-accent transition-colors">
      <Icon className="h-3.5 w-3.5" />
    </a>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SocialInput({ icon: Icon, placeholder, value, onChange }: { icon: any; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
    </div>
  );
}
