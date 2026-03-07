import { useState, useEffect, useCallback } from "react";
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
import { Upload, FileText, Trash2, Download, Save, Loader2, Star, Percent, Wallet, StickyNote, CheckCircle2, FileDown, List, Filter } from "lucide-react";
import jsPDF from "jspdf";

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
  notes: string | null;
  revenue_percentage: number | null;
  crypto_address: string | null;
  contract_file_path: string | null;
}

type StatusFilter = "all" | "submitted" | "not_submitted";

const SENDER = {
  company: "Sharify Media FZCO",
  line1: "IFZA Business Park DDP 21236-001",
  line2: "Silicon Oasis",
  line3: "00000, United Arab Emirates",
  taxId: "1041507169",
};

export default function ModelDashboardTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allDashboards, setAllDashboards] = useState<ModelDashboardRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [data, setData] = useState<ModelDashboardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Local form state
  const [fourbasedSubmitted, setFourbasedSubmitted] = useState(false);
  const [notes, setNotes] = useState("");
  const [revenuePercentage, setRevenuePercentage] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [contractPath, setContractPath] = useState("");

  // Gutschrift fields
  const [gutschriftAmount, setGutschriftAmount] = useState("");
  const [gutschriftDescription, setGutschriftDescription] = useState("Gutschrift für erbrachte Leistungen");

  const loadAllDashboards = useCallback(async () => {
    const { data } = await supabase.from("model_dashboard").select("*");
    if (data) setAllDashboards(data as ModelDashboardRow[]);
  }, []);

  useEffect(() => {
    supabase.from("accounts").select("id, account_email, account_domain, platform").order("account_email").then(({ data }) => {
      if (data) setAccounts(data);
    });
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
      setNotes(d.notes || "");
      setRevenuePercentage(d.revenue_percentage || 0);
      setCryptoAddress(d.crypto_address || "");
      setContractPath(d.contract_file_path || "");
    } else {
      setData(null);
      setFourbasedSubmitted(false);
      setNotes("");
      setRevenuePercentage(0);
      setCryptoAddress("");
      setContractPath("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedAccountId) loadModelData(selectedAccountId);
  }, [selectedAccountId, loadModelData]);

  const getDashboardForAccount = (accountId: string) =>
    allDashboards.find(d => d.account_id === accountId);

  const filteredAccounts = accounts.filter(acc => {
    if (statusFilter === "all") return true;
    const dash = getDashboardForAccount(acc.id);
    const submitted = dash?.fourbased_submitted || false;
    return statusFilter === "submitted" ? submitted : !submitted;
  });

  const saveData = async () => {
    if (!selectedAccountId) return;
    setSaving(true);

    const payload = {
      account_id: selectedAccountId,
      fourbased_submitted: fourbasedSubmitted,
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

  const filterButtons: { label: string; value: StatusFilter }[] = [
    { label: "Alle", value: "all" },
    { label: "Submitted", value: "submitted" },
    { label: "Nicht Submitted", value: "not_submitted" },
  ];

  return (
    <div className="space-y-4">
      {/* Model Auswahl */}
      <section className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Model-Dashboard</h2>
        </div>
        <div className="p-4 space-y-3">
          <Label className="text-xs text-muted-foreground block">Schnellauswahl</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Model wählen…" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.account_email} {a.account_domain ? `(${a.account_domain})` : ""} — {a.platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {filterButtons.map(f => (
              <Button
                key={f.value}
                size="sm"
                variant={statusFilter === f.value ? "default" : "outline"}
                className="text-xs h-7 px-3"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Model-Liste */}
      <section className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <List className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Alle Models</h2>
          <Badge variant="secondary" className="ml-auto text-xs">{filteredAccounts.length}</Badge>
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {filteredAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Keine Models gefunden.</p>
            )}
            {filteredAccounts.map(acc => {
              const dash = getDashboardForAccount(acc.id);
              const submitted = dash?.fourbased_submitted || false;
              const isSelected = acc.id === selectedAccountId;
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? "bg-accent/15 border border-accent/30" : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{acc.account_email}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {acc.account_domain && `${acc.account_domain} · `}{acc.platform}
                    </p>
                  </div>
                  <Badge
                    variant={submitted ? "default" : "outline"}
                    className={`text-[10px] shrink-0 ${submitted ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "text-muted-foreground"}`}
                  >
                    {submitted ? "Submitted" : "Offen"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </section>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      {selectedAccountId && !loading && (
        <>
          {/* 1. Vertrag Upload */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Vertrag Upload</h2>
            </div>
            <div className="p-4 space-y-3">
              {contractPath ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{contractPath.split("/").pop()}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={downloadContract}><Download className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={deleteContract}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Noch kein Vertrag hochgeladen.</p>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="text-xs font-medium text-accent">{uploading ? "Wird hochgeladen…" : "PDF hochladen"}</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handleContractUpload} disabled={uploading} />
              </label>
            </div>
          </section>

          {/* 2. 4based submitted */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">4based submitted</h2>
            </div>
            <div className="p-4 flex items-center gap-3">
              <Switch checked={fourbasedSubmitted} onCheckedChange={setFourbasedSubmitted} />
              <span className="text-sm text-foreground">{fourbasedSubmitted ? "Eingereicht ✅" : "Noch nicht eingereicht"}</span>
            </div>
          </section>

          {/* 3. Model Daten */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Model Daten</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notizen / Freitext</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notizen zum Model…" className="bg-secondary border-border min-h-[100px] text-sm" />
              </div>
            </div>
          </section>

          {/* 4. Prozente */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Percent className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Prozente einstellen</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Anteil:</span>
                <Badge variant="outline" className="text-accent border-accent/30 text-sm font-bold">{revenuePercentage}%</Badge>
              </div>
              <Slider value={[revenuePercentage]} onValueChange={([v]) => setRevenuePercentage(v)} min={0} max={100} step={1} />
            </div>
          </section>

          {/* 5. Crypto Address */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Crypto Address</h2>
            </div>
            <div className="p-4">
              <Input value={cryptoAddress} onChange={e => setCryptoAddress(e.target.value)} placeholder="0x… / bc1… / T…" className="bg-secondary border-border text-sm font-mono" />
            </div>
          </section>

          {/* Save */}
          <Button onClick={saveData} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Alles speichern
          </Button>

          {/* 6. Gutschrift */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <FileDown className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Gutschrift generieren</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Beschreibung</Label>
                <Input value={gutschriftDescription} onChange={e => setGutschriftDescription(e.target.value)} className="bg-secondary border-border text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Betrag (€)</Label>
                <Input value={gutschriftAmount} onChange={e => setGutschriftAmount(e.target.value)} placeholder="z.B. 500,00" className="bg-secondary border-border text-sm" />
              </div>
              <Button onClick={generateGutschrift} variant="outline" className="w-full gap-2 border-accent/30 text-accent hover:bg-accent/10">
                <FileDown className="h-4 w-4" />
                Gutschrift als PDF erstellen
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
