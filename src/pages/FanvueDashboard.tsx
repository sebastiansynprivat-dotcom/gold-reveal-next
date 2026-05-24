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
import { Plus, Pencil, Trash2, LogOut, Instagram, Music2, Twitter, Globe, UserCheck, MessageCircle, CheckCircle2, Search, Users, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";
import { useAdminRole } from "@/hooks/useAdminRole";

type Marketer = { name: string; instagram: string };

type FanvueModel = {
  id: string;
  name: string;
  username: string;
  account_setup: boolean;
  chatter_assigned: boolean;
  chatter_name: string;
  social_linked: boolean;
  instagram_url: string;
  tiktok_url: string;
  twitter_url: string;
  other_social: string;
  marketers: Marketer[];
  notes: string;
  status: string;
  is_active: boolean;
  created_at: string;
};

const emptyModel: Omit<FanvueModel, "id" | "created_at"> = {
  name: "",
  username: "",
  account_setup: false,
  chatter_assigned: false,
  chatter_name: "",
  social_linked: false,
  instagram_url: "",
  tiktok_url: "",
  twitter_url: "",
  other_social: "",
  marketers: [],
  notes: "",
  status: "active",
  is_active: true,
};

export default function FanvueDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin } = useAdminRole();
  const [models, setModels] = useState<FanvueModel[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, { followers: number; recorded_at: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FanvueModel | null>(null);
  const [form, setForm] = useState<typeof emptyModel>(emptyModel);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [snapshotFor, setSnapshotFor] = useState<FanvueModel | null>(null);
  const [snapshotValue, setSnapshotValue] = useState("");

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
      })));
    }
    // Load all IG snapshots
    const { data: snaps } = await supabase
      .from("fanvue_instagram_snapshots" as any)
      .select("model_id, followers, recorded_at")
      .order("recorded_at", { ascending: true });
    const grouped: Record<string, { followers: number; recorded_at: string }[]> = {};
    ((snaps || []) as any[]).forEach((s) => {
      (grouped[s.model_id] ||= []).push({ followers: s.followers, recorded_at: s.recorded_at });
    });
    setSnapshots(grouped);
    setLoading(false);
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

  const openEdit = (m: FanvueModel) => {
    setEditing(m);
    const { id, created_at, ...rest } = m;
    setForm(rest);
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
    navigate("/fanvue/login");
  };

  const addMarketer = () => setForm((f) => ({ ...f, marketers: [...f.marketers, { name: "", instagram: "" }] }));
  const updateMarketer = (i: number, field: keyof Marketer, value: string) =>
    setForm((f) => ({ ...f, marketers: f.marketers.map((m, idx) => idx === i ? { ...m, [field]: value } : m) }));
  const removeMarketer = (i: number) =>
    setForm((f) => ({ ...f, marketers: f.marketers.filter((_, idx) => idx !== i) }));

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
    social: models.filter((m) => m.social_linked).length,
  };

  return (
    <div className="min-h-screen bg-background relative">
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
              Fanvue Dashboard
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Model Kartei</p>
          </div>
          <div className="flex-1" />
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
            { label: "Social verlinkt", value: stats.social, icon: Instagram },
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

                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{m.name || "—"}</h3>
                      {m.username && <p className="text-xs text-muted-foreground truncate">@{m.username}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <StatusRow icon={CheckCircle2} label="Account" active={m.account_setup} />
                    <StatusRow icon={MessageCircle} label="Chatter" active={m.chatter_assigned} extra={m.chatter_name} />
                    <StatusRow icon={Instagram} label="Social Media" active={m.social_linked} />
                  </div>

                  {(m.instagram_url || m.tiktok_url || m.twitter_url || m.other_social) && (
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      {m.instagram_url && <SocialLink href={m.instagram_url} icon={Instagram} />}
                      {m.tiktok_url && <SocialLink href={m.tiktok_url} icon={Music2} />}
                      {m.twitter_url && <SocialLink href={m.twitter_url} icon={Twitter} />}
                      {m.other_social && <SocialLink href={m.other_social} icon={Globe} />}
                    </div>
                  )}

                  {m.marketers.length > 0 && (
                    <div className="border-t border-border/30 pt-3 mt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <UserCheck className="h-3 w-3 text-accent/70" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Marketer ({m.marketers.length})</span>
                      </div>
                      <div className="space-y-1">
                        {m.marketers.map((mk, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
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
                        ))}
                      </div>
                    </div>
                  )}

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-accent/20">
          <DialogHeader>
            <DialogTitle className="text-lg">{editing ? "Model bearbeiten" : "Neues Model anlegen"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Anzeigename" />
              </div>
              <div>
                <Label className="text-xs">Fanvue Username</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" />
              </div>
            </div>

            {/* Status Toggles */}
            <div className="rounded-xl border border-border/40 p-4 space-y-3 bg-secondary/20">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</h4>
              <ToggleRow label="Account eingerichtet" checked={form.account_setup} onChange={(v) => setForm({ ...form, account_setup: v })} />
              <ToggleRow label="Chatter zugewiesen" checked={form.chatter_assigned} onChange={(v) => setForm({ ...form, chatter_assigned: v })} />
              {form.chatter_assigned && (
                <Input
                  value={form.chatter_name}
                  onChange={(e) => setForm({ ...form, chatter_name: e.target.value })}
                  placeholder="Chatter Name"
                  className="text-sm"
                />
              )}
              <ToggleRow label="Social Media verlinkt" checked={form.social_linked} onChange={(v) => setForm({ ...form, social_linked: v })} />
            </div>

            {/* Social Links */}
            <div className="rounded-xl border border-border/40 p-4 space-y-2 bg-secondary/20">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Social Media Links</h4>
              <SocialInput icon={Instagram} placeholder="Instagram URL oder @handle" value={form.instagram_url} onChange={(v) => setForm({ ...form, instagram_url: v })} />
              <SocialInput icon={Music2} placeholder="TikTok URL" value={form.tiktok_url} onChange={(v) => setForm({ ...form, tiktok_url: v })} />
              <SocialInput icon={Twitter} placeholder="Twitter/X URL" value={form.twitter_url} onChange={(v) => setForm({ ...form, twitter_url: v })} />
              <SocialInput icon={Globe} placeholder="Andere Plattform" value={form.other_social} onChange={(v) => setForm({ ...form, other_social: v })} />
            </div>

            {/* Marketers */}
            <div className="rounded-xl border border-border/40 p-4 space-y-2 bg-secondary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Marketer & Instagram-Links</h4>
                <Button size="sm" variant="ghost" onClick={addMarketer} className="text-accent h-7">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Hinzufügen
                </Button>
              </div>
              {form.marketers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Noch keine Marketer eingetragen</p>
              ) : (
                <div className="space-y-2">
                  {form.marketers.map((mk, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder="Name"
                        value={mk.name}
                        onChange={(e) => updateMarketer(i, "name", e.target.value)}
                        className="text-sm flex-1"
                      />
                      <Input
                        placeholder="@instagram oder URL"
                        value={mk.instagram}
                        onChange={(e) => updateMarketer(i, "instagram", e.target.value)}
                        className="text-sm flex-1"
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeMarketer(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
  const url = href.startsWith("http") ? href : `https://${href.replace(/^@/, "instagram.com/")}`;
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
