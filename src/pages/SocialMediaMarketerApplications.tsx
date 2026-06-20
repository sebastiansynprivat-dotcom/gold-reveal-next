import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, ClipboardList, Save, X, Pencil } from "lucide-react";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";

type Application = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  status: string;
  created_at: string;
};

const empty = { name: "", phone: "", notes: "" };

export default function SocialMediaMarketerApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Application[]>([]);
  const [draft, setDraft] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("socialmedia_marketer_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data || []) as Application[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addRow = async () => {
    if (!draft.name.trim() && !draft.phone.trim() && !draft.notes.trim()) {
      toast.error("Mindestens ein Feld ausfüllen");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("socialmedia_marketer_applications")
      .insert({ ...draft, created_by: user?.id });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDraft(empty);
    load();
  };

  const startEdit = (r: Application) => {
    setEditId(r.id);
    setEditRow({ name: r.name, phone: r.phone, notes: r.notes });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const { error } = await (supabase as any)
      .from("socialmedia_marketer_applications")
      .update(editRow)
      .eq("id", editId);
    if (error) { toast.error(error.message); return; }
    setEditId(null);
    load();
  };

  const removeRow = async (id: string) => {
    if (!confirm("Bewerbung löschen?")) return;
    const { error } = await (supabase as any)
      .from("socialmedia_marketer_applications")
      .delete()
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
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
              Marketer-Bewerbungen
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Notiz-Liste</p>
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
        {/* Add row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4 text-accent" />
            <h2 className="font-bold text-foreground">Neue Bewerbung notieren</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              placeholder="Telefon"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <Input
              placeholder="Notizen"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={addRow} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1.5" /> Hinzufügen
            </Button>
          </div>
        </motion.div>

        {/* Table */}
        <div className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border/30">
            <ClipboardList className="h-4 w-4 text-accent" />
            <h2 className="font-bold text-foreground">Bewerbungen ({rows.length})</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Noch keine Bewerbungen eingetragen.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background/30 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Telefon</th>
                    <th className="text-left p-3 font-semibold">Notizen</th>
                    <th className="text-right p-3 font-semibold">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {rows.map((r) => {
                    const editing = editId === r.id;
                    return (
                      <tr key={r.id} className="hover:bg-background/30">
                        {editing ? (
                          <>
                            <td className="p-2"><Input value={editRow.name} onChange={(e) => setEditRow({ ...editRow, name: e.target.value })} /></td>
                            <td className="p-2"><Input value={editRow.phone} onChange={(e) => setEditRow({ ...editRow, phone: e.target.value })} /></td>
                            <td className="p-2"><Textarea className="min-h-[48px]" value={editRow.notes} onChange={(e) => setEditRow({ ...editRow, notes: e.target.value })} /></td>
                            <td className="p-2 text-right whitespace-nowrap">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-accent" onClick={saveEdit}>
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-medium text-foreground">{r.name || "—"}</td>
                            <td className="p-3 text-muted-foreground">{r.phone || "—"}</td>
                            <td className="p-3 text-muted-foreground whitespace-pre-wrap break-words">{r.notes || "—"}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeRow(r.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
