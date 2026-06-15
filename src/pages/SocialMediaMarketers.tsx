import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, UserPlus, Users, CheckCircle2, Mail, Copy, Link as LinkIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";

type Model = { id: string; name: string; username: string };
type Marketer = { user_id: string; email?: string; name?: string };
type Assignment = { id: string; marketer_user_id: string; model_id: string };

export default function SocialMediaMarketers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<Model[]>([]);
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const [editMarketer, setEditMarketer] = useState<Marketer | null>(null);
  const [editSelected, setEditSelected] = useState<Set<string>>(new Set());

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data: m } = await supabase.from("fanvue_models").select("id,name,username").order("name");
    const { data: a } = await supabase.from("marketer_model_assignments").select("id,marketer_user_id,model_id");
    setModels((m as Model[]) || []);
    setAssignments((a as Assignment[]) || []);

    // Marketer list: union of distinct marketer_user_id from assignments AND user_roles
    const { data: roleRows } = await supabase
      .from("user_roles").select("user_id").eq("role", "socialmedia_marketer");
    const ids = Array.from(new Set<string>([
      ...((roleRows || []) as any[]).map(r => r.user_id),
      ...((a || []) as any[]).map(r => r.marketer_user_id),
    ]));
    const { data: profs } = ids.length
      ? await supabase.from("admin_profiles").select("user_id, display_name").in("user_id", ids)
      : { data: [] as any[] };
    const nameById = new Map<string, string>();
    ((profs || []) as any[]).forEach((p) => nameById.set(p.user_id, p.display_name || ""));
    setMarketers(ids.map(id => ({ user_id: id, name: nameById.get(id) || "" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const assignmentsByMarketer = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    assignments.forEach(a => { (map[a.marketer_user_id] ||= []).push(a); });
    return map;
  }, [assignments]);

  const handleCreate = async () => {
    if (!email.trim()) {
      toast.error("E-Mail ist erforderlich.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-marketer", {
        body: {
          email: email.trim(),
          name: name.trim(),
          model_ids: Array.from(selectedModels),
          redirect_to: `${window.location.origin}/marketer/setup-password`,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const link = (data as any)?.action_link as string | undefined;
      const targetEmail = email.trim();
      setCreateOpen(false);
      setEmail(""); setPassword(""); setName(""); setSelectedModels(new Set());
      if (link) {
        setInviteEmail(targetEmail);
        setInviteLink(link);
      } else {
        toast.success("Marketer angelegt.");
      }
      load();
    } catch (e: any) {
      toast.error(e.message || "Einladung fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (m: Marketer) => {
    setEditMarketer(m);
    setEditSelected(new Set((assignmentsByMarketer[m.user_id] || []).map(a => a.model_id)));
  };

  const saveAssignments = async () => {
    if (!editMarketer) return;
    const existing = assignmentsByMarketer[editMarketer.user_id] || [];
    const existingIds = new Set(existing.map(a => a.model_id));
    const toAdd: string[] = [];
    editSelected.forEach(id => { if (!existingIds.has(id)) toAdd.push(id); });
    const toRemove = existing.filter(a => !editSelected.has(a.model_id)).map(a => a.id);
    try {
      if (toAdd.length) {
        const rows = toAdd.map(mid => ({
          marketer_user_id: editMarketer.user_id,
          model_id: mid,
          assigned_by: user?.id,
        }));
        const { error } = await supabase.from("marketer_model_assignments").insert(rows);
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase.from("marketer_model_assignments").delete().in("id", toRemove);
        if (error) throw error;
      }
      toast.success("Zuweisungen aktualisiert");
      setEditMarketer(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    }
  };

  const removeMarketer = async (m: Marketer) => {
    if (!confirm("Marketer-Rolle entfernen? Der Benutzer-Account bleibt bestehen.")) return;
    const { error: e1 } = await supabase.from("marketer_model_assignments").delete().eq("marketer_user_id", m.user_id);
    const { error: e2 } = await supabase.from("user_roles").delete()
      .eq("user_id", m.user_id).eq("role", "socialmedia_marketer");
    if (e1 || e2) { toast.error((e1 || e2)?.message || "Fehler"); return; }
    toast.success("Marketer entfernt");
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <GoldParticles />
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-accent/20 bg-[linear-gradient(180deg,hsl(0_0%_4%/0.95)_0%,hsl(0_0%_6%/0.85)_100%)] backdrop-blur-2xl">
        <div className="relative z-10 flex items-center gap-3 px-4 py-3.5 md:px-6">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" aria-hidden="true" />
            <img src={logo} alt="Logo" className="relative h-10 w-10 rounded-full ring-2 ring-accent/50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">
              Marketer
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">
              Marketer anlegen &amp; Models zuweisen
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => navigate("/socialmedia/admin")} className="border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1.5">Zurück</span>
          </Button>
        </div>
      </header>
      <div className="h-[68px]" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <UserPlus className="h-4 w-4 mr-1.5" /> Marketer einladen
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : marketers.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Marketer angelegt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketers.map(m => {
              const asgs = assignmentsByMarketer[m.user_id] || [];
              return (
                <motion.div
                  key={m.user_id} layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-accent/70" />
                        <span className="truncate">{m.name || `Marketer ${m.user_id.slice(0, 6)}…`}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{asgs.length} Model{asgs.length === 1 ? "" : "s"} zugewiesen</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMarketer(m)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {asgs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 mb-3">
                      {asgs.slice(0, 6).map(a => {
                        const md = models.find(mm => mm.id === a.model_id);
                        return (
                          <span key={a.id} className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-[10px] text-accent">
                            {md?.name || "—"}
                          </span>
                        );
                      })}
                      {asgs.length > 6 && (
                        <span className="px-2 py-0.5 rounded-full bg-accent/5 text-[10px] text-muted-foreground">+{asgs.length - 6}</span>
                      )}
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full border-accent/30 text-accent hover:bg-accent/10" onClick={() => openEdit(m)}>
                    <Users className="h-3.5 w-3.5 mr-1.5" /> Models zuweisen
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle className="text-accent">Marketer einladen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground -mt-1">
              Du bekommst direkt einen Einladungs-Link zum Kopieren — schick ihn dem Marketer (E-Mail, WhatsApp, …). Damit setzt er beim ersten Öffnen sein Passwort.
            </p>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Max Mustermann" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-Mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marketer@example.com" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Models zuweisen (optional)</Label>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border/40 bg-background/40 divide-y divide-border/20">
                {models.length === 0 && <p className="p-3 text-xs text-muted-foreground">Keine Models vorhanden.</p>}
                {models.map(mm => {
                  const checked = selectedModels.has(mm.id);
                  return (
                    <button
                      key={mm.id} type="button"
                      onClick={() => setSelectedModels(s => {
                        const next = new Set(s);
                        if (next.has(mm.id)) next.delete(mm.id); else next.add(mm.id);
                        return next;
                      })}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`}>
                        {checked && <CheckCircle2 className="h-3 w-3 text-accent-foreground" />}
                      </div>
                      <span className="flex-1 truncate">{mm.name || "—"}</span>
                      {mm.username && <span className="text-[10px] text-muted-foreground">@{mm.username}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {submitting ? "Lege an…" : "Link erzeugen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit assignments dialog */}
      <Dialog open={!!editMarketer} onOpenChange={(o) => !o && setEditMarketer(null)}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle className="text-accent">Models zuweisen</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/40 bg-background/40 divide-y divide-border/20">
            {models.map(mm => {
              const checked = editSelected.has(mm.id);
              return (
                <button
                  key={mm.id} type="button"
                  onClick={() => setEditSelected(s => {
                    const next = new Set(s);
                    if (next.has(mm.id)) next.delete(mm.id); else next.add(mm.id);
                    return next;
                  })}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`}>
                    {checked && <CheckCircle2 className="h-3 w-3 text-accent-foreground" />}
                  </div>
                  <span className="flex-1 truncate">{mm.name || "—"}</span>
                  {mm.username && <span className="text-[10px] text-muted-foreground">@{mm.username}</span>}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditMarketer(null)}>Abbrechen</Button>
            <Button onClick={saveAssignments} className="bg-accent text-accent-foreground hover:bg-accent/90">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite link result */}
      <Dialog open={!!inviteLink} onOpenChange={(o) => !o && setInviteLink(null)}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle className="text-accent flex items-center gap-2">
              <LinkIcon className="h-4 w-4" /> Einladungs-Link bereit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Schicke diesen Link an <span className="text-foreground font-medium">{inviteEmail}</span>.
              Er ist einmalig gültig — der Marketer setzt damit sein Passwort und ist sofort eingeloggt.
            </p>
            <div className="flex items-stretch gap-2">
              <Input readOnly value={inviteLink ?? ""} className="font-mono text-[11px]" onFocus={(e) => e.currentTarget.select()} />
              <Button
                size="icon"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                onClick={async () => {
                  if (!inviteLink) return;
                  try {
                    await navigator.clipboard.writeText(inviteLink);
                    toast.success("Link kopiert");
                  } catch {
                    toast.error("Konnte nicht kopieren");
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Hinweis: Der Link läuft i.d.R. nach 1 Stunde ab. Falls nötig, einfach erneut über „Marketer einladen" generieren.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteLink(null)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
