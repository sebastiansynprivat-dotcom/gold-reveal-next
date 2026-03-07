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
import { Upload, FileText, Trash2, Download, Save, Loader2, Star, Percent, Wallet, StickyNote, CheckCircle2, FileDown } from "lucide-react";
import jsPDF from "jspdf";

interface Account {
  id: string;
  account_email: string;
  account_domain: string;
  platform: string;
}

interface ModelData {
  id: string;
  account_id: string;
  fourbased_submitted: boolean;
  notes: string;
  revenue_percentage: number;
  crypto_address: string;
  contract_file_path: string;
}

const RECIPIENT = {
  company: "BasedBuilders Ltd.",
  line1: "CENTRIS BUSINESS GATEWAY, LEVEL 4/W",
  line2: "TRIQ IS-SALIB TA L-IMRIEHEL, ZONE 3",
  line3: "CENTRAL BUSINESS DISTRICT, BIRKIRKARA, CBD 3020, Malta",
};

export default function ModelDashboardTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [data, setData] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Local form state
  const [fourbasedSubmitted, setFourbasedSubmitted] = useState(false);
  const [notes, setNotes] = useState("");
  const [revenuePercentage, setRevenuePercentage] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [contractPath, setContractPath] = useState("");

  // Gutschrift fields
  const [gutschriftAmount, setGutschriftAmount] = useState("");
  const [gutschriftDescription, setGutschriftDescription] = useState("Gutschrift für erbrachte Leistungen");

  useEffect(() => {
    supabase.from("accounts").select("id, account_email, account_domain, platform").order("account_email").then(({ data }) => {
      if (data) setAccounts(data);
    });
  }, []);

  const loadModelData = useCallback(async (accountId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("model_dashboard")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (data) {
      setData(data as ModelData);
      setFourbasedSubmitted(data.fourbased_submitted);
      setNotes(data.notes || "");
      setRevenuePercentage(data.revenue_percentage || 0);
      setCryptoAddress(data.crypto_address || "");
      setContractPath(data.contract_file_path || "");
    } else {
      // No record yet – reset to defaults
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
    setSaving(false);
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;
    setUploading(true);

    const path = `${selectedAccountId}/${file.name}`;

    // Delete old file if exists
    if (contractPath) {
      await supabase.storage.from("model-contracts").remove([contractPath]);
    }

    const { error } = await supabase.storage.from("model-contracts").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload fehlgeschlagen: " + error.message);
    } else {
      setContractPath(path);
      toast.success("Vertrag hochgeladen ✅");
    }
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

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(RECIPIENT.company, margin, y); y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(RECIPIENT.line1, margin, y); y += 4;
    doc.text(RECIPIENT.line2, margin, y); y += 4;
    doc.text(RECIPIENT.line3, margin, y); y += 12;

    // Model info
    doc.setFontSize(10);
    doc.text(`Model: ${selectedAccount.account_email}`, margin, y); y += 5;
    if (selectedAccount.account_domain) {
      doc.text(`Domain: ${selectedAccount.account_domain}`, margin, y); y += 5;
    }
    if (cryptoAddress) {
      doc.text(`Crypto-Adresse: ${cryptoAddress}`, margin, y); y += 5;
    }
    y += 5;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GUTSCHRIFT", margin, y); y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Datum: ${new Date().toLocaleDateString("de-DE")}`, rightCol, y - 8, { align: "right" });
    if (revenuePercentage > 0) {
      doc.text(`Anteil: ${revenuePercentage}%`, rightCol, y - 3, { align: "right" });
    }
    y += 4;

    // Divider
    doc.setDrawColor(200, 180, 120);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y); y += 8;

    // Table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(245, 240, 230);
    doc.rect(margin, y - 4, contentWidth, 8, "F");
    doc.text("Beschreibung", margin + 2, y);
    doc.text("Betrag", rightCol - 2, y, { align: "right" }); y += 8;

    // Row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(gutschriftDescription, margin + 2, y);

    const numAmount = parseFloat(gutschriftAmount.replace(",", "."));
    const formatted = isNaN(numAmount) ? gutschriftAmount + " €" : numAmount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
    doc.text(formatted, rightCol - 2, y, { align: "right" }); y += 8;

    // Divider
    doc.line(margin, y, pageWidth - margin, y); y += 6;

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Gesamtbetrag:", margin + 2, y);
    doc.text(formatted, rightCol - 2, y, { align: "right" }); y += 16;

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${RECIPIENT.company} · Gutschrift für ${selectedAccount.account_email}`, pageWidth / 2, 285, { align: "center" });

    doc.save(`Gutschrift_${selectedAccount.account_email.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    toast.success("Gutschrift-PDF erstellt ✅");
  };

  return (
    <div className="space-y-4">
      {/* Model Auswahl */}
      <section className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Model-Dashboard</h2>
        </div>
        <div className="p-4">
          <Label className="text-xs text-muted-foreground mb-2 block">Model auswählen</Label>
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
        </div>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={downloadContract}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={deleteContract}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
              <span className="text-sm text-foreground">
                {fourbasedSubmitted ? "Eingereicht ✅" : "Noch nicht eingereicht"}
              </span>
            </div>
          </section>

          {/* 3. Model Daten (Notizen) */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Model Daten</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notizen / Freitext</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notizen zum Model…"
                  className="bg-secondary border-border min-h-[100px] text-sm"
                />
              </div>
            </div>
          </section>

          {/* 4. Prozente einstellen */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Percent className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Prozente einstellen</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Anteil:</span>
                <Badge variant="outline" className="text-accent border-accent/30 text-sm font-bold">
                  {revenuePercentage}%
                </Badge>
              </div>
              <Slider
                value={[revenuePercentage]}
                onValueChange={([v]) => setRevenuePercentage(v)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </section>

          {/* 5. Crypto Address */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Crypto Address</h2>
            </div>
            <div className="p-4">
              <Input
                value={cryptoAddress}
                onChange={e => setCryptoAddress(e.target.value)}
                placeholder="0x… / bc1… / T…"
                className="bg-secondary border-border text-sm font-mono"
              />
            </div>
          </section>

          {/* Save Button */}
          <Button onClick={saveData} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Alles speichern
          </Button>

          {/* 6. Gutschrift generieren */}
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <FileDown className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Gutschrift generieren</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Beschreibung</Label>
                <Input
                  value={gutschriftDescription}
                  onChange={e => setGutschriftDescription(e.target.value)}
                  className="bg-secondary border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Betrag (€)</Label>
                <Input
                  value={gutschriftAmount}
                  onChange={e => setGutschriftAmount(e.target.value)}
                  placeholder="z.B. 500,00"
                  className="bg-secondary border-border text-sm"
                />
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
