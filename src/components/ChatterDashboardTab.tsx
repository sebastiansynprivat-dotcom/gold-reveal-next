import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Search, Wallet, Percent, FileDown, Save, Users, Crown, Clock, Loader2
} from "lucide-react";
import CreditNoteForm from "@/components/CreditNoteForm";
import { supabase } from "@/integrations/supabase/client";

// Helper to query chatters table (not yet in generated types)
const chattersTable = () => supabase.from("chatters" as any);

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AED"] as const;

type ChatterRole = "chatter" | "mitarbeiter";
type CompensationType = "percentage" | "hourly";

interface Chatter {
  id: string;
  name: string;
  platform: string;
  fourbasedRevenue: number;
  maloumRevenue: number;
  brezzelsRevenue: number;
  revenuePercentage: number;
  currency: string;
  cryptoAddress: string;
  role: ChatterRole;
  compensationType: CompensationType;
  hourlyRate: number;
  hoursWorked: number;
}

// Map DB row to local interface
function rowToChatter(row: any): Chatter {
  return {
    id: row.id,
    name: row.name || "",
    platform: row.platform || "–",
    fourbasedRevenue: Number(row.fourbased_revenue) || 0,
    maloumRevenue: Number(row.maloum_revenue) || 0,
    brezzelsRevenue: Number(row.brezzels_revenue) || 0,
    revenuePercentage: Number(row.revenue_percentage) || 0,
    currency: row.currency || "EUR",
    cryptoAddress: row.crypto_address || "",
    role: (row.role as ChatterRole) || "chatter",
    compensationType: (row.compensation_type as CompensationType) || "percentage",
    hourlyRate: Number(row.hourly_rate) || 0,
    hoursWorked: Number(row.hours_worked) || 0,
  };
}

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

function Section({ icon: Icon, title, children, delay = 0 }: { icon: React.ElementType; title: string; children: React.ReactNode; delay?: number }) {
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

const ROLE_FILTERS: { label: string; value: "all" | ChatterRole }[] = [
  { label: "Alle", value: "all" },
  { label: "Chatter", value: "chatter" },
  { label: "Mitarbeiter", value: "mitarbeiter" },
];

const STORAGE_KEY = "admin-chatter-dashboard";

export default function ChatterDashboardTab() {
  const [chatters, setChatters] = useState<Chatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const chatterDetailRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ChatterRole>("all");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newRole, setNewRole] = useState<ChatterRole>("chatter");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB
  useEffect(() => {
    const load = async () => {
      const { data, error } = await chattersTable()
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load chatters:", error);
        toast.error("Fehler beim Laden der Mitarbeiter");
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setChatters(data.map(rowToChatter));
        setLoading(false);
        return;
      }

      // One-time migration from localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const local: any[] = JSON.parse(saved);
          if (local.length > 0) {
            const rows = local.map(c => ({
              id: c.id,
              name: c.name || "",
              platform: c.platform || "–",
              role: c.role || "chatter",
              compensation_type: c.compensationType || "percentage",
              revenue_percentage: c.revenuePercentage || 0,
              hourly_rate: c.hourlyRate || 0,
              hours_worked: c.hoursWorked || 0,
              fourbased_revenue: c.fourbasedRevenue ?? c.monthlyRevenue ?? 0,
              maloum_revenue: c.maloumRevenue || 0,
              brezzels_revenue: c.brezzelsRevenue || 0,
              currency: c.currency || "EUR",
              crypto_address: c.cryptoAddress || "",
            }));
            const { data: inserted, error: insertErr } = await supabase
              .from("chatters")
              .insert(rows)
              .select();
            if (!insertErr && inserted) {
              setChatters(inserted.map(rowToChatter));
              localStorage.removeItem(STORAGE_KEY);
              toast.success("Bestehende Daten migriert ✅");
            }
          }
        }
      } catch { /* ignore */ }

      setLoading(false);
    };
    load();
  }, []);

  // Auto-save to DB with debounce
  const saveToDb = useCallback(async (chatter: Chatter) => {
    const { error } = await supabase
      .from("chatters")
      .update({
        name: chatter.name,
        platform: chatter.platform,
        role: chatter.role,
        compensation_type: chatter.compensationType,
        revenue_percentage: chatter.revenuePercentage,
        hourly_rate: chatter.hourlyRate,
        hours_worked: chatter.hoursWorked,
        fourbased_revenue: chatter.fourbasedRevenue,
        maloum_revenue: chatter.maloumRevenue,
        brezzels_revenue: chatter.brezzelsRevenue,
        currency: chatter.currency,
        crypto_address: chatter.cryptoAddress,
      })
      .eq("id", chatter.id);

    if (error) {
      console.error("Auto-save failed:", error);
      toast.error("Speichern fehlgeschlagen");
    }
  }, []);

  const selected = chatters.find(c => c.id === selectedId) || null;

  const filteredChatters = useMemo(() => {
    return chatters.filter(c => {
      if (roleFilter !== "all" && c.role !== roleFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q);
    });
  }, [chatters, searchQuery, roleFilter]);

  const totalRevenue = useMemo(() => {
    if (!selected) return 0;
    return (selected.fourbasedRevenue || 0) + (selected.maloumRevenue || 0) + (selected.brezzelsRevenue || 0);
  }, [selected]);

  const verdienst = useMemo(() => {
    if (!selected) return 0;
    if (selected.compensationType === "hourly") {
      return Math.round(selected.hourlyRate * selected.hoursWorked);
    }
    if (selected.revenuePercentage <= 0) return 0;
    return Math.round(totalRevenue * selected.revenuePercentage / 100);
  }, [selected, totalRevenue]);

  const addChatter = async () => {
    if (!newName.trim()) return;
    const row = {
      name: newName.trim(),
      platform: newPlatform.trim() || "–",
      role: newRole,
      compensation_type: newRole === "mitarbeiter" ? "hourly" : "percentage",
      revenue_percentage: 0,
      hourly_rate: 0,
      hours_worked: 0,
      fourbased_revenue: 0,
      maloum_revenue: 0,
      brezzels_revenue: 0,
      currency: "EUR",
      crypto_address: "",
    };

    const { data, error } = await chattersTable().insert(row).select().single();
    if (error || !data) {
      toast.error("Fehler beim Anlegen");
      return;
    }

    const chatter = rowToChatter(data);
    setChatters(prev => [...prev, chatter]);
    setSelectedId(chatter.id);
    setNewName("");
    setNewPlatform("");
    setNewRole("chatter");
    setAddingNew(false);
    toast.success("Mitarbeiter hinzugefügt ✅");
  };

  const updateSelected = (patch: Partial<Chatter>) => {
    if (!selectedId) return;
    setChatters(prev => {
      const updated = prev.map(c => c.id === selectedId ? { ...c, ...patch } : c);
      const chatter = updated.find(c => c.id === selectedId);
      if (chatter) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveToDb(chatter), 1200);
      }
      return updated;
    });
  };

  const deleteChatter = async (id: string) => {
    const { error } = await chattersTable().delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }
    setChatters(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId("");
    toast.success("Eintrag gelöscht");
  };

  const getVerdienst = (c: Chatter) => {
    const total = (c.fourbasedRevenue || 0) + (c.maloumRevenue || 0) + (c.brezzelsRevenue || 0);
    if (c.compensationType === "hourly") return Math.round(c.hourlyRate * c.hoursWorked);
    if (c.revenuePercentage <= 0) return 0;
    return Math.round(total * c.revenuePercentage / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Mitarbeiter-Dashboard</h2>
          <p className="text-xs text-muted-foreground">Mitarbeiter & Chatter verwalten & Provider Invoices erstellen</p>
        </div>
      </motion.div>

      {/* Table Section */}
      <Section icon={Users} title="Alle Mitarbeiter">
        <div className="space-y-3">
          {/* Role Filter Pills */}
          <div className="flex gap-1.5">
            {ROLE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setRoleFilter(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  roleFilter === f.value
                    ? "bg-accent/15 text-accent border-accent/30"
                    : "bg-secondary/30 text-muted-foreground border-border/30 hover:bg-accent/5"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search + Add */}
          <div className="flex gap-2">
            <div className="flex-1 input-gold-shimmer rounded-xl">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Suchen…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 text-sm border-transparent"
                />
              </div>
            </div>
            <Button size="sm" onClick={() => setAddingNew(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Neu
            </Button>
          </div>

          {/* Add new inline */}
          <AnimatePresence>
            {addingNew && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                  <div className="input-gold-shimmer rounded-lg">
                    <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="text-sm border-transparent" autoFocus />
                  </div>
                  <div className="input-gold-shimmer rounded-lg">
                    <Input placeholder="Plattform (optional)" value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="text-sm border-transparent" />
                  </div>
                  {/* Role selection */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setNewRole("chatter")}
                      className={cn(
                        "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        newRole === "chatter"
                          ? "bg-accent/15 text-accent border-accent/30"
                          : "bg-secondary/30 text-muted-foreground border-border/30"
                      )}
                    >
                      Chatter
                    </button>
                    <button
                      onClick={() => setNewRole("mitarbeiter")}
                      className={cn(
                        "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        newRole === "mitarbeiter"
                          ? "bg-accent/15 text-accent border-accent/30"
                          : "bg-secondary/30 text-muted-foreground border-border/30"
                      )}
                    >
                      Mitarbeiter
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addChatter} disabled={!newName.trim()} className="flex-1 gap-1.5"><Plus className="h-3 w-3" /> Hinzufügen</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewName(""); setNewPlatform(""); setNewRole("chatter"); }}>Abbrechen</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          {filteredChatters.length > 0 ? (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px_32px] gap-0 bg-accent/10 border-b border-accent/20">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold">Name</div>
                <div className="px-2 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Plattform</div>
                <div className="px-2 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-center">Rolle</div>
                <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-right">Gesamt</div>
                <div className="px-1 py-2 text-[10px] uppercase tracking-wider text-accent font-semibold text-right">Verdienst</div>
                <div className="py-2" />
              </div>

              {/* Rows */}
              <div>
                {filteredChatters.map((c, i) => {
                  const total = (c.fourbasedRevenue || 0) + (c.maloumRevenue || 0) + (c.brezzelsRevenue || 0);
                  const earnings = getVerdienst(c);
                  const isHourlyRow = c.compensationType === "hourly";
                  const isSelected = c.id === selectedId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedId(c.id);
                        setTimeout(() => chatterDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                      }}
                      className={cn(
                        "grid grid-cols-[1fr_80px_80px_80px_80px_32px] gap-0 items-center border-b border-border/30 cursor-pointer transition-colors",
                        isSelected
                          ? "bg-accent/15 border-l-2 border-l-accent"
                          : i % 2 === 0 ? "bg-card/40 hover:bg-accent/5" : "bg-card/20 hover:bg-accent/5"
                      )}
                    >
                      <div className="px-3 py-2 min-w-0">
                        <p className={cn("text-xs font-medium truncate", isSelected ? "text-accent" : "text-foreground")}>{c.name}</p>
                      </div>
                      <div className="px-2 py-2 flex justify-center">
                        <span className="text-[9px] bg-secondary/50 text-muted-foreground border border-border/30 rounded px-1.5 py-0.5 capitalize truncate max-w-[70px]">{c.platform}</span>
                      </div>
                      <div className="px-2 py-2 flex justify-center">
                        <span className={cn(
                          "text-[9px] border rounded px-1.5 py-0.5 capitalize",
                          c.role === "mitarbeiter"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-accent/10 text-accent border-accent/30"
                        )}>{c.role}</span>
                      </div>
                      <div className="px-1 py-2 text-right">
                        <span className="text-[11px] tabular-nums font-semibold text-foreground">{isHourlyRow ? "–" : total.toLocaleString("de-DE")}</span>
                      </div>
                      <div className="px-1 py-2 text-right">
                        <span className="text-[11px] tabular-nums text-accent font-medium">{isHourlyRow ? "–" : earnings.toLocaleString("de-DE")}</span>
                      </div>
                      <div className="flex justify-center py-2">
                        <button
                          onClick={e => { e.stopPropagation(); deleteChatter(c.id); }}
                          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-3 py-1.5 bg-secondary/20 border-t border-border/30">
                <span className="text-[10px] text-muted-foreground">{filteredChatters.length} Einträge</span>
              </div>
            </div>
          ) : chatters.length > 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Keine Treffer für "{searchQuery}"</p>
          ) : null}
        </div>
      </Section>

      {selected && (
        <div ref={chatterDetailRef}>
          {selected.compensationType !== "hourly" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="gold-gradient-border-animated pulse-glow rounded-xl p-6 text-center space-y-3"
            >
              <Crown className="h-8 w-8 text-accent mx-auto" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gesamtumsatz</p>
              <p className="text-5xl font-black text-gold-gradient tabular-nums leading-none">
                <AnimatedGoldValue value={totalRevenue} suffix={` ${selected.currency || "EUR"}`} />
              </p>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
                <span>4Based: {(selected.fourbasedRevenue || 0).toLocaleString("de-DE")}</span>
                <span>Maloum: {(selected.maloumRevenue || 0).toLocaleString("de-DE")}</span>
                <span>Brezzels: {(selected.brezzelsRevenue || 0).toLocaleString("de-DE")}</span>
              </div>
            </motion.div>
          )}

          {/* Details */}
          <Section icon={Save} title="Mitarbeiter-Daten" delay={0.1}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <div className="input-gold-shimmer rounded-lg">
                    <Input value={selected.name} onChange={e => updateSelected({ name: e.target.value })} className="text-sm border-transparent" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Plattform</label>
                  <div className="input-gold-shimmer rounded-lg">
                    <Input value={selected.platform} onChange={e => updateSelected({ platform: e.target.value })} className="text-sm border-transparent" />
                  </div>
                </div>
              </div>

              {/* Role toggle in detail */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Rolle</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updateSelected({ role: "chatter", compensationType: "percentage" })}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      selected.role === "chatter"
                        ? "bg-accent/15 text-accent border-accent/30"
                        : "bg-secondary/30 text-muted-foreground border-border/30"
                    )}
                  >
                    Chatter
                  </button>
                  <button
                    onClick={() => updateSelected({ role: "mitarbeiter", compensationType: "hourly" })}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      selected.role === "mitarbeiter"
                        ? "bg-accent/15 text-accent border-accent/30"
                        : "bg-secondary/30 text-muted-foreground border-border/30"
                    )}
                  >
                    Mitarbeiter
                  </button>
                </div>
              </div>

              {selected.compensationType !== "hourly" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">4Based Revenue</label>
                      <div className="input-gold-shimmer rounded-lg">
                        <Input type="number" value={selected.fourbasedRevenue || ""} onChange={e => updateSelected({ fourbasedRevenue: Number(e.target.value) || 0 })} className="text-sm border-transparent" placeholder="0" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Maloum Revenue</label>
                      <div className="input-gold-shimmer rounded-lg">
                        <Input type="number" value={selected.maloumRevenue || ""} onChange={e => updateSelected({ maloumRevenue: Number(e.target.value) || 0 })} className="text-sm border-transparent" placeholder="0" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Brezzels Revenue</label>
                      <div className="input-gold-shimmer rounded-lg">
                        <Input type="number" value={selected.brezzelsRevenue || ""} onChange={e => updateSelected({ brezzelsRevenue: Number(e.target.value) || 0 })} className="text-sm border-transparent" placeholder="0" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="glass-card rounded-lg p-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Gesamt</span>
                      <span className="text-sm font-bold text-accent tabular-nums">{totalRevenue.toLocaleString("de-DE")} {selected.currency || "EUR"}</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Währung</label>
                      <Select value={selected.currency || "EUR"} onValueChange={v => updateSelected({ currency: v })}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {selected.compensationType === "hourly" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Währung</label>
                  <Select value={selected.currency || "EUR"} onValueChange={v => updateSelected({ currency: v })}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Section>

          {/* Compensation - only for percentage-based */}
          {selected.compensationType !== "hourly" && (
            <Section icon={Percent} title="Anteil & Verdienst" delay={0.15}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Anteil</label>
                    <span className="text-sm font-bold text-accent">{selected.revenuePercentage}%</span>
                  </div>
                  <Slider
                    value={[selected.revenuePercentage]}
                    onValueChange={([v]) => updateSelected({ revenuePercentage: v })}
                    min={0} max={100} step={1}
                    className="py-2"
                  />
                </div>

                {verdienst > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Verdienst ({selected.revenuePercentage}%)
                      </p>
                      <p className="text-xl font-bold text-accent tabular-nums">
                        <AnimatedGoldValue value={verdienst} suffix={` ${selected.currency || "EUR"}`} />
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </Section>
          )}

          {/* Crypto */}
          <Section icon={Wallet} title="Crypto / Auszahlung" delay={0.18}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Crypto-Infos (Adresse, Coin, Netzwerk, Notizen…)</label>
              <div className="input-gold-shimmer rounded-lg">
                <Textarea
                  value={selected.cryptoAddress || ""}
                  onChange={e => updateSelected({ cryptoAddress: e.target.value })}
                  placeholder={"z.B. USDT TRC20 – TXyz…\nNetzwerk: Tron\nWeitere Infos…"}
                  className="bg-secondary/40 border-transparent text-sm min-h-[100px]"
                />
              </div>
            </div>
          </Section>

          {/* Credit Note */}
          <Section icon={FileDown} title="Provider Invoice erstellen" delay={0.22}>
            <CreditNoteForm
              suggestedAmount={verdienst}
              providerName={selected.name}
              chatterName={selected.name}
              revenuePercentage={selected.compensationType === "percentage" ? selected.revenuePercentage : 0}
              currency={selected.currency || "EUR"}
              cryptoAddress={selected.cryptoAddress || ""}
              compensationType={selected.compensationType}
              hourlyRate={selected.hourlyRate}
              hoursWorked={selected.hoursWorked}
              platformRevenue={selected.compensationType === "hourly" ? undefined : {
                fourbased: selected.fourbasedRevenue || 0,
                maloum: selected.maloumRevenue || 0,
                brezzels: selected.brezzelsRevenue || 0,
              }}
            />
          </Section>
        </div>
      )}

      {!selected && chatters.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Noch keine Mitarbeiter angelegt.</p>
          <Button size="sm" onClick={() => setAddingNew(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Ersten Eintrag hinzufügen
          </Button>
        </motion.div>
      )}
    </div>
  );
}
