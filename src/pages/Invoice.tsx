import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, endOfMonth, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, FileDown, ArrowLeft, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const RECIPIENT = {
  company: "BasedBuilders Ltd.",
  line1: "CENTRIS BUSINESS GATEWAY, LEVEL 4/W",
  line2: "TRIQ IS-SALIB TA L-IMRIEHEL, ZONE 3",
  line3: "CENTRAL BUSINESS DISTRICT, BIRKIRKARA, CBD 3020, Malta",
};

const DEFAULT_DESCRIPTION = "Verwaltung und Vertrieb von digitalen Inhalten";

const Invoice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [senderName, setSenderName] = useState("");
  const [billingUnlocked, setBillingUnlocked] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [senderAddress, setSenderAddress] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [taxId, setTaxId] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [vatNote, setVatNote] = useState("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");

  const generatePDF = () => {
    if (!senderName || !invoiceNumber || !amount || !invoiceDate) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte fülle mindestens Name, Rechnungsnummer, Betrag und Datum aus.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 25;
    const contentWidth = pageWidth - margin * 2;
    let y = 25;

    // --- Sender ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(senderName, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (senderAddress) { doc.text(senderAddress, margin, y); y += 4; }
    if (senderCity) { doc.text(senderCity, margin, y); y += 4; }
    if (taxId) { doc.text(`Steuernr./USt-IdNr.: ${taxId}`, margin, y); y += 4; }
    y += 8;

    // --- Recipient ---
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${senderName} · ${senderAddress || ""} · ${senderCity || ""}`, margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(RECIPIENT.company, margin, y); y += 5;
    doc.text(RECIPIENT.line1, margin, y); y += 4;
    doc.text(RECIPIENT.line2, margin, y); y += 4;
    doc.text(RECIPIENT.line3, margin, y); y += 12;

    // --- Invoice header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("RECHNUNG", margin, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const rightCol = pageWidth - margin;
    doc.text(`Rechnungsnummer: ${invoiceNumber}`, rightCol, y - 8, { align: "right" });
    doc.text(`Rechnungsdatum: ${format(invoiceDate, "dd.MM.yyyy")}`, rightCol, y - 3, { align: "right" });
    if (periodFrom && periodTo) {
      doc.text(`Leistungszeitraum: ${periodFrom} - ${periodTo}`, rightCol, y + 2, { align: "right" });
    }
    y += 8;

    // --- Divider ---
    doc.setDrawColor(200, 180, 120);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // --- Table header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(245, 240, 230);
    doc.rect(margin, y - 4, contentWidth, 8, "F");
    doc.text("Beschreibung", margin + 2, y);
    doc.text("Betrag", rightCol - 2, y, { align: "right" });
    y += 8;

    // --- Table row ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(description, margin + 2, y);

    const numAmount = parseFloat(amount.replace(",", "."));
    const formattedAmount = isNaN(numAmount)
      ? amount + " €"
      : numAmount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

    doc.text(formattedAmount, rightCol - 2, y, { align: "right" });
    y += 8;

    // --- Divider ---
    doc.setDrawColor(200, 180, 120);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // --- Total ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Gesamtbetrag:", margin + 2, y);
    doc.text(formattedAmount, rightCol - 2, y, { align: "right" });
    y += 8;

    // --- VAT note ---
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(vatNote, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 16;

    // --- Bank details ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Bankverbindung:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (bankName) { doc.text(`Bank: ${bankName}`, margin, y); y += 4; }
    if (iban) { doc.text(`IBAN: ${iban}`, margin, y); y += 4; }
    if (bic) { doc.text(`BIC: ${bic}`, margin, y); y += 4; }

    // --- Footer ---
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${senderName} · ${taxId ? "Steuernr.: " + taxId : ""}`, pageWidth / 2, 285, { align: "center" });

    doc.save(`Rechnung_${invoiceNumber}.pdf`);

    toast({
      title: "PDF erstellt! ✅",
      description: `Rechnung ${invoiceNumber} wurde heruntergeladen.`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold gold-gradient-text">
            Rechnung erstellen
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Demo</span>
            <Switch checked={demoMode} onCheckedChange={setDemoMode} className="scale-75" />
          </div>
        </div>

        {/* Countdown section */}
        <BillingCountdown onUnlock={setBillingUnlocked} demoMode={demoMode} />

        {!billingUnlocked && (
          <Card className="glass-card-subtle border-border">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Das Rechnungsformular wird freigeschaltet, sobald dein Abrechnungszeitraum erreicht ist.
              </p>
            </CardContent>
          </Card>
        )}

        {billingUnlocked && (
          <Card className="glass-card border-accent/30 gold-border-glow">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                📩 Deine Abrechnung ist jetzt möglich!
              </p>
              <p className="text-xs text-muted-foreground">
                Schreibe eine E-Mail an{" "}
                <a href="mailto:support@basedbuilders.com" className="text-accent hover:underline font-medium">
                  support@basedbuilders.com
                </a>{" "}
                und frage deinen Rechnungsbetrag an.
              </p>
              <p className="text-xs text-accent font-medium">
                ⚠️ Wichtig: Erstelle deine Rechnung erst, nachdem du die Abrechnung von uns per E-Mail erhalten hast!
              </p>
            </CardContent>
          </Card>
        )}

        <div className={!billingUnlocked ? "opacity-40 pointer-events-none select-none space-y-6" : "space-y-6"}>
          {/* Sender */}
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground">Deine Daten (Rechnungssteller)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Name / Firma *</Label>
                  <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Max Mustermann" className="h-9 text-sm bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Steuernr. / USt-IdNr.</Label>
                  <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="DE123456789" className="h-9 text-sm bg-secondary border-border" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Straße + Hausnummer</Label>
                <Input value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} placeholder="Musterstraße 1" className="h-9 text-sm bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">PLZ + Ort</Label>
                <Input value={senderCity} onChange={(e) => setSenderCity(e.target.value)} placeholder="12345 Musterstadt" className="h-9 text-sm bg-secondary border-border" />
              </div>
            </CardContent>
          </Card>

          {/* Recipient (read-only) */}
          <Card className="glass-card-subtle border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Rechnungsempfänger (vorausgefüllt)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground space-y-0.5">
                <p className="font-semibold">{RECIPIENT.company}</p>
                <p className="text-muted-foreground text-xs">{RECIPIENT.line1}</p>
                <p className="text-muted-foreground text-xs">{RECIPIENT.line2}</p>
                <p className="text-muted-foreground text-xs">{RECIPIENT.line3}</p>
              </div>
            </CardContent>
          </Card>

          {/* Invoice details */}
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground">Rechnungsdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rechnungsnummer *</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="2025-001" className="h-9 text-sm bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rechnungsdatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-9 w-full justify-start text-left text-sm font-normal bg-secondary border-border", !invoiceDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {invoiceDate ? format(invoiceDate, "dd.MM.yyyy") : "Datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} locale={de} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Leistungszeitraum von</Label>
                  <Input value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} placeholder="01.07.2025" className="h-9 text-sm bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Leistungszeitraum bis</Label>
                  <Input value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} placeholder="31.07.2025" className="h-9 text-sm bg-secondary border-border" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Leistungsbeschreibung</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-sm bg-secondary border-border" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Betrag (€) *</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1.500,00" className="h-9 text-sm bg-secondary border-border" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mehrwertsteuer-Vermerk</Label>
                <Input value={vatNote} onChange={(e) => setVatNote(e.target.value)} className="h-9 text-sm bg-secondary border-border text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Bank details */}
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground">Bankverbindung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bank</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Sparkasse Musterstadt" className="h-9 text-sm bg-secondary border-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">IBAN</Label>
                  <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" className="h-9 text-sm bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">BIC</Label>
                  <Input value={bic} onChange={(e) => setBic(e.target.value)} placeholder="COBADEFFXXX" className="h-9 text-sm bg-secondary border-border" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button
            onClick={generatePDF}
            className="w-full h-12 text-base font-bold gold-glow"
            size="lg"
          >
            <FileDown className="mr-2 h-5 w-5" />
            Rechnung als PDF herunterladen
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pb-4">
          Die Rechnung wird lokal erstellt – keine Daten werden gespeichert.
        </p>
      </div>
    </div>
  );
};

function BillingCountdown({ onUnlock, demoMode }: { onUnlock: (v: boolean) => void; demoMode: boolean }) {
  const now = new Date();
  const deadline = endOfMonth(addMonths(now, 1));
  const totalDays = differenceInDays(deadline, new Date(now.getFullYear(), now.getMonth(), 1));
  const daysLeft = differenceInDays(deadline, now);
  const progressPct = Math.round(((totalDays - daysLeft) / totalDays) * 100);
  const isUnlocked = daysLeft <= 0;

  const unlocked = demoMode || isUnlocked;

  useEffect(() => { onUnlock(unlocked); }, [unlocked, onUnlock]);

  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  return (
    <Card className="glass-card-subtle border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Abrechnungszeitraum</span>
          {unlocked && (
            <Badge className="ml-auto bg-accent text-accent-foreground text-[10px]">
              Abrechnung möglich ✓
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">Startdatum</p>
            <p className="text-sm font-semibold text-foreground">{format(startDate, "dd. MMMM yyyy", { locale: de })}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">Deine erste Abrechnung</p>
            <p className="text-sm font-semibold text-gold-gradient">{format(deadline, "dd. MMMM yyyy", { locale: de })}</p>
          </div>
        </div>

        {!unlocked && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Noch {daysLeft} Tage bis zur Abrechnung</span>
              <span>{format(deadline, "dd.MM.yyyy")}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Invoice;
