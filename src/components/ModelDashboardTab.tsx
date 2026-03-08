import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Trash2, Download, Save, Loader2, Star,
  Percent, Wallet, StickyNote, CheckCircle2, FileDown, List, Filter, Search, ChevronRight, TrendingUp, CalendarDays, DollarSign
} from "lucide-react";
import jsPDF from "jspdf";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface Account {
  id: string;
  account_email: string;
  account_domain: string;
  platform: string;
}

interface ModelDashboardRow {
  id: string;
  account_id: string;
  fourbased_submitted: boolean;
  maloum_submitted: boolean;
  brezzels_submitted: boolean;
  notes: string | null;
  revenue_percentage: number | null;
  crypto_address: string | null;
  contract_file_path: string | null;
}

type PlatformKey = "fourbased" | "maloum" | "brezzels";
type StatusFilter = "all" | "fourbased_submitted" | "fourbased_open" | "maloum_submitted" | "maloum_open" | "brezzels_submitted" | "brezzels_open";

const SENDER = {
  company: "Sharify Media FZCO",
  line1: "IFZA Business Park DDP 21236-001",
  line2: "Silicon Oasis",
  line3: "00000, United Arab Emirates",
  taxId: "1041507169",
};

const PLATFORMS: { key: PlatformKey; label: string; dbField: "fourbased_submitted" | "maloum_submitted" | "brezzels_submitted" }[] = [
  { key: "fourbased", label: "4Based", dbField: "fourbased_submitted" },
  { key: "maloum", label: "Maloum", dbField: "maloum_submitted" },
  { key: "brezzels", label: "Brezzels", dbField: "brezzels_submitted" },
];

const filterOptions: { label: string; value: StatusFilter }[] = [
  { label: "Alle", value: "all" },
  { label: "4Based ✅", value: "fourbased_submitted" },
  { label: "4Based ❌", value: "fourbased_open" },
  { label: "Maloum ✅", value: "maloum_submitted" },
  { label: "Maloum ❌", value: "maloum_open" },
  { label: "Brezzels ✅", value: "brezzels_submitted" },
  { label: "Brezzels ❌", value: "brezzels_open" },
];

// ─── Animated counter ───
function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="inline-block"
    >
      {value}
    </motion.span>
  );
}

// ─── Section wrapper ───
function Section({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
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

export default function ModelDashboardTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allDashboards, setAllDashboards] = useState<ModelDashboardRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [data, setData] = useState<ModelDashboardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const detailRef = useRef<HTMLDivElement>(null);

  // Local form state
  const [fourbasedSubmitted, setFourbasedSubmitted] = useState(false);
  const [maloumSubmitted, setMaloumSubmitted] = useState(false);
  const [brezzelsSubmitted, setBrezzelsSubmitted] = useState(false);
  const [notes, setNotes] = useState("");
  const [revenuePercentage, setRevenuePercentage] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [contractPath, setContractPath] = useState("");

  // Gutschrift
  const [gutschriftAmount, setGutschriftAmount] = useState("");
  const [gutschriftDescription, setGutschriftDescription] = useState("Gutschrift für erbrachte Leistungen");

  // Revenue per model
  const [modelRevenue, setModelRevenue] = useState<{ date: string; amount: number; user_id: string }[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueMonth, setRevenueMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const loadAllDashboards = useCallback(async () => {
    const { data } = await supabase.from("model_dashboard").select("*");
    if (data) setAllDashboards(data as ModelDashboardRow[]);
  }, []);

  useEffect(() => {
    supabase
      .from("accounts")
      .select("id, account_email, account_domain, platform")
      .order("account_email")
      .then(({ data }) => { if (data) setAccounts(data); });
    loadAllDashboards();
  }, [loadAllDashboards]);

  const loadModelData = useCallback(async (accountId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("model_dashboard")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (data) {
      const d = data as ModelDashboardRow;
      setData(d);
      setFourbasedSubmitted(d.fourbased_submitted);
      setMaloumSubmitted(d.maloum_submitted);
      setBrezzelsSubmitted(d.brezzels_submitted);
      setNotes(d.notes || "");
      setRevenuePercentage(d.revenue_percentage || 0);
      setCryptoAddress(d.crypto_address || "");
      setContractPath(d.contract_file_path || "");
    } else {
      setData(null);
      setFourbasedSubmitted(false);
      setMaloumSubmitted(false);
      setBrezzelsSubmitted(false);
      setNotes("");
      setRevenuePercentage(0);
      setCryptoAddress("");
      setContractPath("");
    }
    setLoading(false);
  }, []);

  const loadModelRevenue = useCallback(async (accountId: string, month: string) => {
    setRevenueLoading(true);
    // 1. Get all user_ids assigned to this account (current + historical)
    const { data: assignments } = await supabase
      .from("account_assignments")
      .select("user_id")
      .eq("account_id", accountId);

    const userIds = [...new Set((assignments || []).map(a => a.user_id))];
    if (userIds.length === 0) { setModelRevenue([]); setRevenueLoading(false); return; }

    // 2. Get daily_revenue for those users in the selected month
    const [year, mon] = month.split("-").map(Number);
    const monthStart = format(new Date(year, mon - 1, 1), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date(year, mon - 1, 1)), "yyyy-MM-dd");

    const { data: revenue } = await supabase
      .from("daily_revenue")
      .select("date, amount, user_id")
      .in("user_id", userIds)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true });

    setModelRevenue((revenue || []) as { date: string; amount: number; user_id: string }[]);
    setRevenueLoading(false);
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadModelData(selectedAccountId);
      loadModelRevenue(selectedAccountId, revenueMonth);
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedAccountId, loadModelData, loadModelRevenue, revenueMonth]);

  // Revenue calculations
  const totalMonthRevenue = useMemo(() => modelRevenue.reduce((sum, r) => sum + r.amount, 0), [modelRevenue]);
  const gutschriftFromRevenue = useMemo(() => {
    if (revenuePercentage <= 0 || totalMonthRevenue <= 0) return 0;
    return (totalMonthRevenue * revenuePercentage) / 100;
  }, [totalMonthRevenue, revenuePercentage]);

  // Available months for selection (last 12 months)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      months.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") });
    }
    return months;
  }, []);

  const getDashboard = (id: string) => allDashboards.find(d => d.account_id === id);

  const filteredAccounts = accounts.filter(acc => {
    const dash = getDashboard(acc.id);
    if (statusFilter === "fourbased_submitted" && !dash?.fourbased_submitted) return false;
    if (statusFilter === "fourbased_open" && dash?.fourbased_submitted) return false;
    if (statusFilter === "maloum_submitted" && !dash?.maloum_submitted) return false;
    if (statusFilter === "maloum_open" && dash?.maloum_submitted) return false;
    if (statusFilter === "brezzels_submitted" && !dash?.brezzels_submitted) return false;
    if (statusFilter === "brezzels_open" && dash?.brezzels_submitted) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return acc.account_email.toLowerCase().includes(q) || acc.account_domain.toLowerCase().includes(q);
    }
    return true;
  });

  const countByPlatform = (field: "fourbased_submitted" | "maloum_submitted" | "brezzels_submitted") =>
    accounts.filter(a => getDashboard(a.id)?.[field]).length;

  const saveData = async () => {
    if (!selectedAccountId) return;
    setSaving(true);
    const payload = {
      account_id: selectedAccountId,
      fourbased_submitted: fourbasedSubmitted,
      maloum_submitted: maloumSubmitted,
      brezzels_submitted: brezzelsSubmitted,
      notes,
      revenue_percentage: revenuePercentage,
      crypto_address: cryptoAddress,
      contract_file_path: contractPath,
    };
    if (data?.id) {
      await supabase.from("model_dashboard").update(payload).eq("id", data.id);
    } else {
      await supabase.from("model_dashboard").insert(payload);
    }
    toast.success("Gespeichert ✅");
    await loadModelData(selectedAccountId);
    await loadAllDashboards();
    setSaving(false);
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;
    setUploading(true);
    const path = `${selectedAccountId}/${file.name}`;
    if (contractPath) await supabase.storage.from("model-contracts").remove([contractPath]);
    const { error } = await supabase.storage.from("model-contracts").upload(path, file, { upsert: true });
    if (error) toast.error("Upload fehlgeschlagen: " + error.message);
    else { setContractPath(path); toast.success("Vertrag hochgeladen ✅"); }
    setUploading(false);
    e.target.value = "";
  };

  const deleteContract = async () => {
    if (!contractPath) return;
    await supabase.storage.from("model-contracts").remove([contractPath]);
    setContractPath("");
    toast.success("Vertrag gelöscht");
  };

  const downloadContract = async () => {
    if (!contractPath) return;
    const { data } = await supabase.storage.from("model-contracts").createSignedUrl(contractPath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const generateGutschrift = () => {
    if (!selectedAccount || !gutschriftAmount.trim()) {
      toast.error("Bitte Model auswählen und Betrag eingeben.");
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
    doc.text(`Model: ${selectedAccount.account_email}`, margin, y); y += 5;
    if (selectedAccount.account_domain) { doc.text(`Domain: ${selectedAccount.account_domain}`, margin, y); y += 5; }
    if (cryptoAddress) { doc.text(`Crypto-Adresse: ${cryptoAddress}`, margin, y); y += 5; }
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GUTSCHRIFT", margin, y); y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Datum: ${new Date().toLocaleDateString("de-DE")}`, rightCol, y - 8, { align: "right" });
    if (revenuePercentage > 0) doc.text(`Anteil: ${revenuePercentage}%`, rightCol, y - 3, { align: "right" });
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
    doc.text(formatted, rightCol - 2, y, { align: "right" }); y += 16;

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${SENDER.company} · Gutschrift für ${selectedAccount.account_email}`, pageWidth / 2, 285, { align: "center" });

    doc.save(`Gutschrift_${selectedAccount.account_email.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    toast.success("Gutschrift-PDF erstellt ✅");
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center gold-glow">
          <Star className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gold-gradient-shimmer tracking-wide">Model-Dashboard</h1>
          <p className="text-xs text-muted-foreground">{accounts.length} Models registriert</p>
        </div>
      </motion.div>

      {/* ── Stats row – per platform ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-2"
      >
        <button
          onClick={() => setStatusFilter("all")}
          className={`w-full glass-card rounded-xl p-2.5 text-center transition-all duration-300 cursor-pointer ${
            statusFilter === "all" ? "gold-border-glow scale-[1.01]" : "hover:scale-[1.01]"
          }`}
        >
          <p className="text-lg font-bold text-gold-gradient"><AnimatedNumber value={accounts.length} /></p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gesamt</p>
        </button>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORMS.map(p => {
            const submitted = countByPlatform(p.dbField);
            const open = accounts.length - submitted;
            return (
              <div key={p.key} className="glass-card rounded-xl p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-foreground text-center tracking-wide">{p.label}</p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setStatusFilter(`${p.key}_submitted` as StatusFilter)}
                    className={`rounded-lg py-1 text-center transition-all cursor-pointer ${
                      statusFilter === `${p.key}_submitted` ? "bg-accent/20 border border-accent/40" : "bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <p className="text-xs font-bold text-accent tabular-nums">{submitted}</p>
                    <p className="text-[8px] text-muted-foreground">✅</p>
                  </button>
                  <button
                    onClick={() => setStatusFilter(`${p.key}_open` as StatusFilter)}
                    className={`rounded-lg py-1 text-center transition-all cursor-pointer ${
                      statusFilter === `${p.key}_open` ? "bg-destructive/20 border border-destructive/40" : "bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <p className="text-xs font-bold text-foreground tabular-nums">{open}</p>
                    <p className="text-[8px] text-muted-foreground">❌</p>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Search ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
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

      {/* ── Filter pills ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-secondary/40"
      >
        {filterOptions.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`relative text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${
              statusFilter === f.value ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {statusFilter === f.value && (
              <motion.div
                layoutId="filter-pill"
                className="absolute inset-0 rounded-lg bg-accent/20 border border-accent/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{f.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ── Model-Liste ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="px-4 py-3 header-gradient-border flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <List className="h-3.5 w-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground tracking-wide">Alle Models</h2>
          <Badge variant="outline" className="ml-auto text-[10px] border-accent/30 text-accent tabular-nums">
            {filteredAccounts.length}
          </Badge>
        </div>
        <ScrollArea className="max-h-[320px]">
          <div className="p-2 space-y-0.5">
            {filteredAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Keine Models gefunden.</p>
            )}
            <AnimatePresence mode="popLayout">
              {filteredAccounts.map((acc, i) => {
                const dash = getDashboard(acc.id);
                const allSubmitted = dash?.fourbased_submitted && dash?.maloum_submitted && dash?.brezzels_submitted;
                const isSelected = acc.id === selectedAccountId;
                return (
                  <motion.div
                    key={acc.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-accent/10 gold-border-glow"
                        : "hover:bg-secondary/60 border border-transparent"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      allSubmitted
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {acc.account_email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{acc.account_email}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {acc.account_domain && `${acc.account_domain} · `}{acc.platform}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {PLATFORMS.map(p => (
                        <span key={p.key} className={`text-[9px] px-1 py-0.5 rounded ${
                          dash?.[p.dbField] ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                        }`}>
                          {p.label.charAt(0)}{dash?.[p.dbField] ? "✅" : "❌"}
                        </span>
                      ))}
                      <ChevronRight className={`h-3.5 w-3.5 transition-colors ${isSelected ? "text-accent" : "text-muted-foreground/40"}`} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </motion.section>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      {/* ── Detail View ── */}
      <AnimatePresence mode="wait">
        {selectedAccountId && !loading && (
          <motion.div
            ref={detailRef}
            key={selectedAccountId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Selected model header */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center text-sm font-bold text-accent gold-glow">
                {selectedAccount?.account_email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedAccount?.account_email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedAccount?.account_domain && `${selectedAccount.account_domain} · `}{selectedAccount?.platform}
                </p>
              </div>
            </div>

            {/* Einnahmen Übersicht – oben */}
            <Section icon={TrendingUp} title="Einnahmen Übersicht" delay={0.05}>
              <div className="space-y-4">
                {/* Month selector */}
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={revenueMonth} onValueChange={setRevenueMonth}>
                    <SelectTrigger className="bg-secondary/50 border-border h-8 text-xs w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {revenueLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gesamtumsatz</p>
                        <p className="text-lg font-bold text-gold-gradient tabular-nums">
                          {totalMonthRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                        </p>
                      </div>
                      <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Gutschrift ({revenuePercentage}%)
                        </p>
                        <p className="text-lg font-bold text-accent tabular-nums">
                          {gutschriftFromRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                        </p>
                      </div>
                    </div>

                    {modelRevenue.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tagesübersicht</p>
                        <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1 -mr-1">
                          {(() => {
                            const byDate: Record<string, number> = {};
                            for (const r of modelRevenue) {
                              byDate[r.date] = (byDate[r.date] || 0) + r.amount;
                            }
                            return Object.entries(byDate)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .map(([date, amount]) => (
                                <div key={date} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/30 transition-colors">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                  </span>
                                  <span className="text-xs font-semibold text-foreground tabular-nums">
                                    {amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                                  </span>
                                </div>
                              ));
                          })()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4 italic">
                        Keine Einnahmen für diesen Monat.
                      </p>
                    )}
                  </>
                )}
              </div>
            </Section>

            {/* Vertrag */}
            <Section icon={FileText} title="Vertrag Upload" delay={0.05}>
              <div className="space-y-3">
                {contractPath ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1 font-medium">{contractPath.split("/").pop()}</span>
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

            {/* Plattform-Status */}
            <Section icon={CheckCircle2} title="Plattform-Status" delay={0.1}>
              <div className="space-y-3">
                {[
                  { label: "4Based", value: fourbasedSubmitted, onChange: setFourbasedSubmitted },
                  { label: "Maloum", value: maloumSubmitted, onChange: setMaloumSubmitted },
                  { label: "Brezzels", value: brezzelsSubmitted, onChange: setBrezzelsSubmitted },
                ].map(p => (
                  <div key={p.label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-foreground font-medium">{p.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${p.value ? "text-accent" : "text-muted-foreground"}`}>
                        {p.value ? "Eingereicht ✅" : "Offen ❌"}
                      </span>
                      <Switch checked={p.value} onCheckedChange={p.onChange} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Notizen */}
            <Section icon={StickyNote} title="Model Daten" delay={0.15}>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notizen / Freitext</Label>
                <div className="input-gold-shimmer rounded-lg">
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Notizen zum Model…"
                    className="bg-secondary/40 border-transparent min-h-[100px] text-sm"
                  />
                </div>
              </div>
            </Section>

            {/* Prozente */}
            <Section icon={Percent} title="Prozente einstellen" delay={0.2}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Anteil:</span>
                  <div className="gold-gradient-border-animated rounded-lg px-3 py-1">
                    <span className="text-sm font-bold text-gold-gradient tabular-nums">{revenuePercentage}%</span>
                  </div>
                </div>
                <Slider value={[revenuePercentage]} onValueChange={([v]) => setRevenuePercentage(v)} min={0} max={100} step={1} />
              </div>
            </Section>

            {/* Crypto */}
            <Section icon={Wallet} title="Crypto Address" delay={0.25}>
              <div className="input-gold-shimmer rounded-lg">
                <Input
                  value={cryptoAddress}
                  onChange={e => setCryptoAddress(e.target.value)}
                  placeholder="0x… / bc1… / T…"
                  className="bg-secondary/40 border-transparent text-sm font-mono"
                />
              </div>
            </Section>

            {/* Save */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={saveData}
                disabled={saving}
                className="w-full gap-2 h-11 text-sm font-semibold bg-accent hover:bg-accent/90 text-accent-foreground transition-all hover:scale-[1.01] active:scale-[0.99] gold-glow"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Alles speichern
              </Button>
            </motion.div>



            {/* Gutschrift */}
            <Section icon={FileDown} title="Gutschrift generieren" delay={0.4}>
              <div className="space-y-3">
                {/* Auto-fill hint */}
                {gutschriftFromRevenue > 0 && gutschriftAmount !== gutschriftFromRevenue.toFixed(2).replace(".", ",") && (
                  <button
                    onClick={() => setGutschriftAmount(gutschriftFromRevenue.toFixed(2).replace(".", ","))}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors text-left"
                  >
                    <DollarSign className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-[11px] text-foreground">
                      Automatisch aus Einnahmen: <span className="font-bold text-accent">{gutschriftFromRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span> ({revenuePercentage}% von {totalMonthRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €)
                    </span>
                  </button>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Beschreibung</Label>
                  <div className="input-gold-shimmer rounded-lg">
                    <Input
                      value={gutschriftDescription}
                      onChange={e => setGutschriftDescription(e.target.value)}
                      className="bg-secondary/40 border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Betrag (€)</Label>
                  <div className="input-gold-shimmer rounded-lg">
                    <Input
                      value={gutschriftAmount}
                      onChange={e => setGutschriftAmount(e.target.value)}
                      placeholder="z.B. 500,00"
                      className="bg-secondary/40 border-transparent text-sm font-mono"
                    />
                  </div>
                </div>
                <Button
                  onClick={generateGutschrift}
                  variant="outline"
                  className="w-full gap-2 border-accent/30 text-accent hover:bg-accent/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <FileDown className="h-4 w-4" />
                  Gutschrift als PDF erstellen
                </Button>
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
