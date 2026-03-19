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
  Plus, Trash2, Search, ChevronDown, Wallet, Percent, FileDown, Save, Users, Crown
} from "lucide-react";
import CreditNoteForm from "@/components/CreditNoteForm";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AED"] as const;

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
}

const STORAGE_KEY = "admin-chatter-dashboard";

function migrateChatters(chatters: Chatter[]): Chatter[] {
  return chatters.map(c => ({
    ...c,
    fourbasedRevenue: c.fourbasedRevenue ?? c.monthlyRevenue ?? 0,
    maloumRevenue: c.maloumRevenue ?? 0,
    brezzelsRevenue: c.brezzelsRevenue ?? 0,
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

export default function ChatterDashboardTab() {
  const [chatters, setChatters] = useState<Chatter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? migrateChatters(JSON.parse(saved)) : [];
    } catch { return []; }
  });

  const [selectedId, setSelectedId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("");

  // (Gutschrift state removed – now uses CreditNoteForm component)

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatters));
  }, [chatters]);

  const selected = chatters.find(c => c.id === selectedId) || null;

  const filteredChatters = chatters.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q);
  });

  const totalRevenue = useMemo(() => {
    if (!selected) return 0;
    return (selected.fourbasedRevenue || 0) + (selected.maloumRevenue || 0) + (selected.brezzelsRevenue || 0);
  }, [selected]);

  const verdienst = useMemo(() => {
    if (!selected || selected.revenuePercentage <= 0) return 0;
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
    };
    setChatters(prev => [...prev, chatter]);
    setSelectedId(chatter.id);
    setNewName("");
    setNewPlatform("");
    setAddingNew(false);
    setListOpen(false);
    toast.success("Chatter hinzugefügt ✅");
  };

  const updateSelected = (patch: Partial<Chatter>) => {
    if (!selectedId) return;
    setChatters(prev => prev.map(c => c.id === selectedId ? { ...c, ...patch } : c));
  };

  const deleteChatter = (id: string) => {
    setChatters(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId("");
    toast.success("Chatter gelöscht");
  };

  // generateGutschrift removed – now uses CreditNoteForm component

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Chatter-Dashboard</h2>
          <p className="text-xs text-muted-foreground">Chatter manuell verwalten & Gutschriften erstellen</p>
        </div>
      </motion.div>

      {/* Chatter Selection */}
      <Section icon={Users} title="Chatter auswählen">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 input-gold-shimmer rounded-xl">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Chatter suchen…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setListOpen(true); }}
                  onFocus={() => setListOpen(true)}
                  className="pl-8 text-sm border-transparent"
                />
              </div>
            </div>
            <Button size="sm" onClick={() => setAddingNew(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Neu
            </Button>
          </div>

          {/* Add new chatter inline */}
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
                    <Input placeholder="Plattform (optional)" value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="text-sm border-transparent"
                      onKeyDown={e => { if (e.key === "Enter") addChatter(); }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addChatter} disabled={!newName.trim()} className="flex-1 gap-1.5"><Plus className="h-3 w-3" /> Hinzufügen</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewName(""); setNewPlatform(""); }}>Abbrechen</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chatter list */}
          <AnimatePresence>
            {listOpen && filteredChatters.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-border/50 divide-y divide-border/30 max-h-64 overflow-y-auto">
                  {filteredChatters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedId(c.id); setListOpen(false); setSearchQuery(""); }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-accent/10",
                        selectedId === c.id && "bg-accent/15 text-accent"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-[10px] bg-secondary/50 text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 capitalize shrink-0">{c.platform}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{((c.fourbasedRevenue || 0) + (c.maloumRevenue || 0) + (c.brezzelsRevenue || 0)).toLocaleString("de-DE")} {c.currency || "EUR"}</span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteChatter(c.id); }}
                          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {selected && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ChevronDown className="h-3 w-3 text-accent" />
              Ausgewählt: <span className="text-accent font-medium">{selected.name}</span>
            </div>
          )}
        </div>
      </Section>

      {selected && (
        <>
          {/* Big golden revenue card */}
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

          {/* Details */}
          <Section icon={Save} title="Chatter-Daten" delay={0.1}>
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
            </div>
          </Section>

          {/* Revenue share */}
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
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Verdienst ({selected.revenuePercentage}%)</p>
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
              revenuePercentage={selected.revenuePercentage}
              currency={selected.currency || "EUR"}
              cryptoAddress={selected.cryptoAddress || ""}
            />
          </Section>
        </>
      )}

      {!selected && chatters.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Noch keine Chatter angelegt.</p>
          <Button size="sm" onClick={() => setAddingNew(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Ersten Chatter hinzufügen
          </Button>
        </motion.div>
      )}
    </div>
  );
}
