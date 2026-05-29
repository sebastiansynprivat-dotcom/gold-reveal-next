import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, GripVertical, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { refreshPlatforms } from "@/lib/platforms";
import { cn } from "@/lib/utils";

interface PlatformRow {
  id: string;
  key: string;
  label: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_COLORS = [
  "#d4af37", "#3b82f6", "#22d3ee", "#ec4899", "#0ea5e9",
  "#8b5cf6", "#10b981", "#f97316", "#ef4444", "#a855f7",
];

export default function PlatformsManager() {
  const [rows, setRows] = useState<PlatformRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("platforms") as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Fehler beim Laden", description: error.message, variant: "destructive" });
    } else {
      setRows((data as PlatformRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "").slice(0, 32);

  const handleCreate = async () => {
    const label = newLabel.trim();
    const key = (newKey || slugify(label)).trim();
    if (!label || !key) {
      toast({ title: "Name & Key sind Pflicht", variant: "destructive" });
      return;
    }
    setSaving(true);
    const nextOrder = (rows[rows.length - 1]?.sort_order ?? 0) + 10;
    const { error } = await (supabase.from("platforms") as any).insert({
      label, key, color: newColor, sort_order: nextOrder, is_active: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Konnte nicht anlegen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plattform hinzugefügt", description: `${label} ist überall verfügbar.` });
    setNewLabel(""); setNewKey(""); setNewColor(DEFAULT_COLORS[0]);
    setOpen(false);
    await load();
    await refreshPlatforms();
  };

  const toggleActive = async (row: PlatformRow) => {
    const { error } = await (supabase.from("platforms") as any)
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    await refreshPlatforms();
  };

  const updateField = async (row: PlatformRow, patch: Partial<PlatformRow>) => {
    const { error } = await (supabase.from("platforms") as any)
      .update(patch).eq("id", row.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    await refreshPlatforms();
  };

  const handleDelete = async (row: PlatformRow) => {
    if (!confirm(`Plattform "${row.label}" wirklich löschen?\n\nAccounts mit dieser Plattform bleiben erhalten, werden aber ohne Style angezeigt.`)) return;
    const { error } = await (supabase.from("platforms") as any).delete().eq("id", row.id);
    if (error) {
      toast({ title: "Konnte nicht löschen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plattform gelöscht" });
    await load();
    await refreshPlatforms();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Plattformen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Änderungen wirken sich automatisch auf Setup, Filter, Charts und Einnahmen aus.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Neue Plattform
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Plattform anlegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Anzeigename</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (!newKey) setNewKey(slugify(e.target.value));
                  }}
                  placeholder="z.B. OnlyFans"
                />
              </div>
              <div>
                <Label className="text-xs">Key (eindeutig, klein, ohne Sonderzeichen)</Label>
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(slugify(e.target.value))}
                  placeholder="onlyfans"
                />
              </div>
              <div>
                <Label className="text-xs">Farbe</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-transform",
                        newColor === c ? "border-foreground scale-110" : "border-transparent",
                      )}
                      style={{ background: c }}
                    />
                  ))}
                  <Input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-8 w-12 p-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Hinzufügen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Noch keine Plattformen.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5",
                    !row.is_active && "opacity-50",
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <span
                    className="h-3 w-3 rounded-full shrink-0 ring-2 ring-background"
                    style={{ background: row.color }}
                  />
                  <Input
                    defaultValue={row.label}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== row.label) updateField(row, { label: v });
                    }}
                    className="h-8 text-sm flex-1 min-w-0"
                  />
                  <code className="text-[11px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded shrink-0">
                    {row.key}
                  </code>
                  <Input
                    type="color"
                    defaultValue={row.color}
                    onBlur={(e) => {
                      if (e.target.value !== row.color) updateField(row, { color: e.target.value });
                    }}
                    className="h-8 w-10 p-1 cursor-pointer shrink-0"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleActive(row)}
                    title={row.is_active ? "Deaktivieren" : "Aktivieren"}
                  >
                    {row.is_active ? (
                      <Power className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(row)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
