import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Search, ChevronDown, Wallet, Percent, FileDown, Save, Users, Crown
} from "lucide-react";
import CreditNoteForm from "@/components/CreditNoteForm";

interface Chatter {
  id: string;
  name: string;
  platform: string;
  monthlyRevenue: number;
  revenuePercentage: number;
}

const STORAGE_KEY = "admin-chatter-dashboard";

const SENDER = {
  company: "Sharify Media FZCO",
  line1: "IFZA Business Park DDP 21236-001",
  line2: "Silicon Oasis",
  line3: "00000, United Arab Emirates",
  taxId: "1041507169",
};

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
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [selectedId, setSelectedId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("");

  // Gutschrift
  const [gutschriftAmount, setGutschriftAmount] = useState("");
  const [gutschriftDescription, setGutschriftDescription] = useState("Gutschrift für erbrachte Leistungen");
  const [paidVia, setPaidVia] = useState("");
  const [cryptoCoin, setCryptoCoin] = useState("USDT");
  const [txHash, setTxHash] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");

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

  const verdienst = useMemo(() => {
    if (!selected || selected.revenuePercentage <= 0) return 0;
    return Math.round(selected.monthlyRevenue * selected.revenuePercentage / 100);
  }, [selected]);

  const addChatter = () => {
    if (!newName.trim()) return;
    const chatter: Chatter = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      platform: newPlatform.trim() || "–",
      monthlyRevenue: 0,
      revenuePercentage: 0,
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

  const generateGutschrift = () => {
    if (!selected || !gutschriftAmount.trim()) {
      toast.error("Bitte Chatter auswählen und Betrag eingeben.");
      return;
    }
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 25;
    const contentWidth = pageWidth - margin * 2;
    const rightCol = pageWidth - margin;
    let y = 25;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(SENDER.company, margin, y); y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(SENDER.line1, margin, y); y += 4;
    doc.text(SENDER.line2, margin, y); y += 4;
    doc.text(SENDER.line3, margin, y); y += 4;
    doc.text(`Tax ID: ${SENDER.taxId}`, margin, y); y += 10;

    doc.setFontSize(10);
    doc.text(`Chatter: ${selected.name}`, margin, y); y += 5;
    if (selected.platform) { doc.text(`Plattform: ${selected.platform}`, margin, y); y += 5; }
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GUTSCHRIFT", margin, y); y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Datum: ${new Date().toLocaleDateString("de-DE")}`, rightCol, y - 8, { align: "right" });
    if (selected.revenuePercentage > 0) doc.text(`Anteil: ${selected.revenuePercentage}%`, rightCol, y - 3, { align: "right" });
    y += 4;

    doc.setDrawColor(200, 180, 120);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y); y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(245, 240, 230);
    doc.rect(margin, y - 4, contentWidth, 8, "F");
    doc.text("Beschreibung", margin + 2, y);
    doc.text("Betrag", rightCol - 2, y, { align: "right" }); y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(gutschriftDescription, margin + 2, y);
    const numAmount = parseFloat(gutschriftAmount.replace(",", "."));
    const formatted = isNaN(numAmount) ? gutschriftAmount + " €" : numAmount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
    doc.text(formatted, rightCol - 2, y, { align: "right" }); y += 8;

    doc.line(margin, y, pageWidth - margin, y); y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Gesamtbetrag:", margin + 2, y);
    doc.text(formatted, rightCol - 2, y, { align: "right" }); y += 12;

    // Payment details
    if (paidVia || txHash || exchangeRate) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      if (paidVia) { doc.text(`Paid Via: ${paidVia} (${cryptoCoin})`, margin + 2, y); y += 5; }
      if (txHash) { doc.text(`TxHash: ${txHash}`, margin + 2, y); y += 5; }
      if (exchangeRate) { doc.text(`Exchange Rate: ${exchangeRate}`, margin + 2, y); y += 5; }
      doc.setTextColor(0, 0, 0);
    }
    y += 8;

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${SENDER.company} · Gutschrift für ${selected.name}`, pageWidth / 2, 285, { align: "center" });

    const filename = `Gutschrift_${selected.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    let downloadTriggered = false;
    try {
      const link = document.createElement("a");
      if (typeof link.download !== "undefined") {
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        downloadTriggered = true;
      }
    } catch { /* fallback */ }

    if (!downloadTriggered) {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) toast.success("PDF im neuen Tab geöffnet ✅");
      else toast.error("Popup blockiert – bitte Popups erlauben.");
    } else {
      toast.success("Gutschrift-PDF erstellt ✅");
    }
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

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
                        <span className="text-xs text-muted-foreground">{c.monthlyRevenue.toLocaleString("de-DE")}€</span>
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
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monatsumsatz</p>
            <p className="text-5xl font-black text-gold-gradient tabular-nums leading-none">
              <AnimatedGoldValue value={selected.monthlyRevenue} />
            </p>
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Monatsumsatz (€)</label>
                <div className="input-gold-shimmer rounded-lg">
                  <Input
                    type="number"
                    value={selected.monthlyRevenue || ""}
                    onChange={e => updateSelected({ monthlyRevenue: Number(e.target.value) || 0 })}
                    className="text-sm border-transparent"
                    placeholder="0"
                  />
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
                      <AnimatedGoldValue value={verdienst} />
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </Section>

          {/* Gutschrift */}
          <Section icon={FileDown} title="Gutschrift erstellen" delay={0.2}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
                <div className="input-gold-shimmer rounded-lg">
                  <Input value={gutschriftDescription} onChange={e => setGutschriftDescription(e.target.value)} className="text-sm border-transparent" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Betrag (€)</label>
                <div className="input-gold-shimmer rounded-lg">
                  <Input
                    value={gutschriftAmount}
                    onChange={e => setGutschriftAmount(e.target.value)}
                    placeholder={verdienst > 0 ? verdienst.toLocaleString("de-DE") : "0"}
                    className="text-sm border-transparent"
                  />
                </div>
                {verdienst > 0 && !gutschriftAmount && (
                  <button onClick={() => setGutschriftAmount(verdienst.toString())} className="text-[10px] text-accent hover:underline">
                    Vorschlag übernehmen: {verdienst.toLocaleString("de-DE")}€
                  </button>
                )}
              </div>

              {/* Paid Via */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Paid Via</label>
                <div className="flex gap-2">
                  <div className="flex-1 input-gold-shimmer rounded-lg">
                    <Input
                      value={paidVia}
                      onChange={e => setPaidVia(e.target.value)}
                      placeholder="z.B. Binance, Coinbase…"
                      className="text-sm border-transparent"
                    />
                  </div>
                  <Select value={cryptoCoin} onValueChange={setCryptoCoin}>
                    <SelectTrigger className="w-[110px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["USDT", "USDC", "BTC", "ETH", "SOL", "BNB", "XRP", "TRX", "LTC"].map(coin => (
                        <SelectItem key={coin} value={coin}>{coin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TxHash */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">TxHash</label>
                <div className="input-gold-shimmer rounded-lg">
                  <Input
                    value={txHash}
                    onChange={e => setTxHash(e.target.value)}
                    placeholder="Transaktions-Hash"
                    className="text-sm border-transparent font-mono text-xs"
                  />
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Exchange Rate</label>
                <div className="input-gold-shimmer rounded-lg">
                  <Input
                    value={exchangeRate}
                    onChange={e => setExchangeRate(e.target.value)}
                    placeholder="z.B. 1 USDT = 0.92€"
                    className="text-sm border-transparent"
                  />
                </div>
              </div>

              <Button onClick={generateGutschrift} className="w-full gap-2">
                <FileDown className="h-4 w-4" /> Gutschrift als PDF erstellen
              </Button>
            </div>
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
