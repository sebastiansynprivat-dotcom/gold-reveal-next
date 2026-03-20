import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Search, Wallet, Percent, FileDown, Save, Users, Crown, Clock
} from "lucide-react";
import CreditNoteForm from "@/components/CreditNoteForm";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AED"] as const;

type ChatterRole = "chatter" | "mitarbeiter";
type CompensationType = "percentage" | "hourly";

interface Chatter {
  id: string;
  name: string;
  platform: string;
  monthlyRevenue: number;
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

const STORAGE_KEY = "admin-chatter-dashboard";

function migrateChatters(chatters: Chatter[]): Chatter[] {
  return chatters.map(c => ({
    ...c,
    fourbasedRevenue: c.fourbasedRevenue ?? c.monthlyRevenue ?? 0,
    maloumRevenue: c.maloumRevenue ?? 0,
    brezzelsRevenue: c.brezzelsRevenue ?? 0,
    role: c.role ?? "chatter",
    compensationType: c.compensationType ?? "percentage",
    hourlyRate: c.hourlyRate ?? 0,
    hoursWorked: c.hoursWorked ?? 0,
  }));
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

export default function ChatterDashboardTab() {
  const [chatters, setChatters] = useState<Chatter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? migrateChatters(JSON.parse(saved)) : [];
    } catch { return []; }
  });

  const [selectedId, setSelectedId] = useState<string>("");
  const chatterDetailRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ChatterRole>("all");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newRole, setNewRole] = useState<ChatterRole>("chatter");

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatters));
  }, [chatters]);

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

  const addChatter = () => {
    if (!newName.trim()) return;
    const chatter: Chatter = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      platform: newPlatform.trim() || "–",
      monthlyRevenue: 0,
      fourbasedRevenue: 0,
      maloumRevenue: 0,
      brezzelsRevenue: 0,
      revenuePercentage: 0,
      currency: "EUR",
      cryptoAddress: "",
      role: newRole,
      compensationType: newRole === "mitarbeiter" ? "hourly" : "percentage",
      hourlyRate: 0,
      hoursWorked: 0,
    };
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
    setChatters(prev => prev.map(c => c.id === selectedId ? { ...c, ...patch } : c));
  };

  const deleteChatter = (id: string) => {
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Mitarbeiter-Dashboard</h2>
          <p className="text-xs text-muted-foreground">Mitarbeiter & Chatter verwalten & Gutschriften erstellen</p>
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
                        <span className="text-[11px] tabular-nums font-semibold text-foreground">{total.toLocaleString("de-DE")}</span>
                      </div>
                      <div className="px-1 py-2 text-right">
                        <span className="text-[11px] tabular-nums text-accent font-medium">{earnings.toLocaleString("de-DE")}</span>
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
          {/* Big golden revenue/earnings card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="gold-gradient-border-animated pulse-glow rounded-xl p-6 text-center space-y-3"
          >
            <Crown className="h-8 w-8 text-accent mx-auto" />
            {selected.compensationType === "hourly" ? (
              <>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Verdienst</p>
                <p className="text-5xl font-black text-gold-gradient tabular-nums leading-none">
                  <AnimatedGoldValue value={verdienst} suffix={` ${selected.currency || "EUR"}`} />
                </p>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
                  <span>{selected.hourlyRate || 0}€/h × {selected.hoursWorked || 0}h</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gesamtumsatz</p>
                <p className="text-5xl font-black text-gold-gradient tabular-nums leading-none">
                  <AnimatedGoldValue value={totalRevenue} suffix={` ${selected.currency || "EUR"}`} />
                </p>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
                  <span>4Based: {(selected.fourbasedRevenue || 0).toLocaleString("de-DE")}</span>
                  <span>Maloum: {(selected.maloumRevenue || 0).toLocaleString("de-DE")}</span>
                  <span>Brezzels: {(selected.brezzelsRevenue || 0).toLocaleString("de-DE")}</span>
                </div>
              </>
            )}
          </motion.div>

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
              )
            </div>
          </Section>

          {/* Compensation */}
          <Section icon={selected.compensationType === "hourly" ? Clock : Percent} title="Anteil & Verdienst" delay={0.15}>
            <div className="space-y-4">
              {/* Compensation type toggle */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => updateSelected({ compensationType: "percentage" })}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center justify-center gap-1.5",
                    selected.compensationType === "percentage"
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "bg-secondary/30 text-muted-foreground border-border/30"
                  )}
                >
                  <Percent className="h-3 w-3" /> Prozent-Beteiligung
                </button>
                <button
                  onClick={() => updateSelected({ compensationType: "hourly" })}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center justify-center gap-1.5",
                    selected.compensationType === "hourly"
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "bg-secondary/30 text-muted-foreground border-border/30"
                  )}
                >
                  <Clock className="h-3 w-3" /> Stundenlohn
                </button>
              </div>

              {selected.compensationType === "percentage" ? (
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
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Stundensatz (€)</label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        type="number"
                        value={selected.hourlyRate || ""}
                        onChange={e => updateSelected({ hourlyRate: Number(e.target.value) || 0 })}
                        className="text-sm border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Stunden gearbeitet</label>
                    <div className="input-gold-shimmer rounded-lg">
                      <Input
                        type="number"
                        value={selected.hoursWorked || ""}
                        onChange={e => updateSelected({ hoursWorked: Number(e.target.value) || 0 })}
                        className="text-sm border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                      Verdienst {selected.compensationType === "percentage"
                        ? `(${selected.revenuePercentage}%)`
                        : `(${selected.hourlyRate}€ × ${selected.hoursWorked}h)`}
                    </p>
                    <p className="text-xl font-bold text-accent tabular-nums">
                      <AnimatedGoldValue value={verdienst} suffix={` ${selected.currency || "EUR"}`} />
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </Section>

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
          <Section icon={FileDown} title="Credit Note erstellen" delay={0.22}>
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
