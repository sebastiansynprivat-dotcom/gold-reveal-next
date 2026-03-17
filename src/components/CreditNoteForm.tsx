import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { FileDown, Building2, User, Calendar, Hash } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";

const ISSUER_DEFAULTS = {
  name: "Tapyn B.V.",
  address: "Daalwijkdreef 47, 1103AD, Amsterdam, Netherlands",
  kvk: "95097821",
  vatId: "NL867000533B01",
};

const CRYPTO_NETWORKS = ["TRC20", "ERC20", "BEP20", "SOL", "BTC", "LTC"];

const CRYPTO_COINS = ["USDT", "USDC", "BTC", "ETH", "SOL", "BNB", "XRP", "TRX", "LTC"];

interface CreditNoteFormProps {
  suggestedAmount?: number;
  defaultDescription?: string;
  providerName?: string;
  cryptoAddress?: string;
  accountId?: string;
  chatterName?: string;
  revenuePercentage?: number;
  currency?: string;
}

export default function CreditNoteForm({
  suggestedAmount = 0,
  defaultDescription = "Revenue share payout",
  providerName: initialProviderName = "",
  cryptoAddress = "",
  accountId,
  chatterName = "",
  revenuePercentage = 0,
  currency = "EUR",
}: CreditNoteFormProps) {
  // localStorage key for persisting form fields
  const storageKey = `credit-note-form-${accountId || chatterName || "default"}`;

  // Load persisted values
  const loadSaved = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  };

  const saved = loadSaved();

  // Issuer (editable)
  const [issuerName, setIssuerName] = useState(saved.issuerName || ISSUER_DEFAULTS.name);
  const [issuerAddress, setIssuerAddress] = useState(saved.issuerAddress || ISSUER_DEFAULTS.address);
  const [issuerKvk, setIssuerKvk] = useState(saved.issuerKvk || ISSUER_DEFAULTS.kvk);
  const [issuerVatId, setIssuerVatId] = useState(saved.issuerVatId || ISSUER_DEFAULTS.vatId);

  // Provider
  const [providerName, setProviderName] = useState(saved.providerName || initialProviderName);
  const [providerAddress, setProviderAddress] = useState(saved.providerAddress || "");
  const [isBusiness, setIsBusiness] = useState(saved.isBusiness || false);
  const [providerVatId, setProviderVatId] = useState(saved.providerVatId || "");

  // Metadata – default service period = previous month
  const lastMonth = subMonths(new Date(), 1);
  const [creditNoteDate, setCreditNoteDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [servicePeriodStart, setServicePeriodStart] = useState(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
  const [servicePeriodEnd, setServicePeriodEnd] = useState(format(endOfMonth(lastMonth), "yyyy-MM-dd"));

  // Line item
  const [description, setDescription] = useState(saved.description || defaultDescription);
  const [netAmount, setNetAmount] = useState(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : "");

  // Payment
  const [cryptoNetwork, setCryptoNetwork] = useState(saved.cryptoNetwork || "TRC20");
  const [cryptoCoin, setCryptoCoin] = useState(saved.cryptoCoin || "USDT");
  const [txHash, setTxHash] = useState(saved.txHash || "");
  const [exchangeRate, setExchangeRate] = useState(saved.exchangeRate || "");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [generating, setGenerating] = useState(false);

  // Auto-save form fields to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({
        issuerName, issuerAddress, issuerKvk, issuerVatId,
        providerName, providerAddress, isBusiness, providerVatId,
        description, cryptoNetwork, cryptoCoin, txHash, exchangeRate,
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [issuerName, issuerAddress, issuerKvk, issuerVatId, providerName, providerAddress, isBusiness, providerVatId, description, cryptoNetwork, cryptoCoin, txHash, exchangeRate, storageKey]);

  // Update provider name when prop changes
  useEffect(() => {
    if (initialProviderName && !providerName) setProviderName(initialProviderName);
  }, [initialProviderName]);

  // Calculations
  const net = parseFloat(netAmount.replace(",", ".")) || 0;
  const vatRate = isBusiness ? 0 : 0; // For both private and business: 0% VAT (reverse charge / not subject)
  const vatAmount = net * vatRate / 100;
  const grossAmount = net + vatAmount;

  const generatePDF = (creditNoteNumber: string) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = 210;
    const m = 20; // margin
    const rCol = pw - m;
    const cw = pw - 2 * m;
    let y = 22;

    // ── Header: Issuer left, Credit Note details right ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(issuerName, m, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    y += 4.5;
    doc.text(issuerAddress, m, y);
    y += 4;
    doc.text(`KvK: ${issuerKvk}`, m, y);
    y += 4;
    doc.text(`VAT ID: ${issuerVatId}`, m, y);

    // Right side: credit note details
    let ry = 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Credit Note No:", rCol - 50, ry);
    doc.setFont("helvetica", "normal");
    doc.text(creditNoteNumber, rCol, ry, { align: "right" });
    ry += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Date:", rCol - 50, ry);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(creditNoteDate), "dd.MM.yyyy"), rCol, ry, { align: "right" });
    ry += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Service Period:", rCol - 50, ry);
    doc.setFont("helvetica", "normal");
    doc.text(`${format(new Date(servicePeriodStart), "dd.MM.yyyy")} – ${format(new Date(servicePeriodEnd), "dd.MM.yyyy")}`, rCol, ry, { align: "right" });

    y += 10;

    // ── Title ──
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.4);
    doc.line(m, y, rCol, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CREDIT NOTE / SELF-BILLING STATEMENT", m, y);
    y += 8;
    doc.setLineWidth(0.4);
    doc.line(m, y, rCol, y);
    y += 8;

    // ── Self-billing notice ──
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("This credit note is issued under the self-billing procedure. The service provider does not issue an invoice.", m, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // ── Service Provider ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Service Provider:", m, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (providerName) { doc.text(providerName, m, y); y += 4.5; }
    if (providerAddress) {
      const addrLines = doc.splitTextToSize(providerAddress, cw);
      addrLines.forEach((line: string) => { doc.text(line, m, y); y += 4.5; });
    }
    if (isBusiness && providerVatId) {
      doc.text(`VAT ID: ${providerVatId}`, m, y); y += 4.5;
    }
    if (!isBusiness) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Private individual – not VAT registered", m, y);
      doc.setTextColor(0, 0, 0);
      y += 4.5;
    }
    y += 6;

    // ── Description of Service table ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Description of Service", m, y);
    y += 5;

    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(m, y - 3.5, cw, 7, "F");
    doc.setDrawColor(200, 200, 200);
    doc.rect(m, y - 3.5, cw, 7, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Pos.", m + 2, y);
    doc.text("Description", m + 15, y);
    doc.text(`Amount (${currency})`, rCol - 2, y, { align: "right" });
    y += 7;

    // Table row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.rect(m, y - 3.5, cw, 7, "S");
    doc.text("1", m + 2, y);

    const descLines = doc.splitTextToSize(description, 100);
    doc.text(descLines[0] || description, m + 15, y);

    const formattedNet = net.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.text(formattedNet, rCol - 2, y, { align: "right" });
    y += 7;

    // Subtotal area
    doc.setDrawColor(200, 200, 200);
    y += 2;
    // Net
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Net Amount:", rCol - 45, y);
    doc.text(`${formattedNet} ${currency}`, rCol - 2, y, { align: "right" });
    y += 5;

    // VAT
    const vatLabel = !isBusiness
      ? "VAT (0% – private individual not subject to VAT):"
      : `VAT (${vatRate}%):`;
    doc.text(vatLabel, rCol - 80, y);
    doc.text(`${vatAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${currency}`, rCol - 2, y, { align: "right" });
    y += 5;

    // Gross total
    doc.setLineWidth(0.5);
    doc.line(rCol - 80, y - 1, rCol, y - 1);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total Amount:", rCol - 45, y);
    doc.text(`${grossAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${currency}`, rCol - 2, y, { align: "right" });
    y += 5;
    doc.setLineWidth(0.5);
    doc.line(rCol - 80, y - 1, rCol, y - 1);
    y += 10;

    // VAT note
    if (!isBusiness) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text("No VAT charged – private individual not subject to VAT.", m, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
    }

    // ── Payment Information ──
    if (cryptoCoin || txHash || exchangeRate) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Payment Information", m, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      if (cryptoCoin) { doc.text(`Payment Method: ${cryptoCoin} (${cryptoNetwork})`, m, y); y += 4.5; }
      if (txHash) { doc.text(`Transaction Hash: ${txHash}`, m, y); y += 4.5; }
      if (exchangeRate) { doc.text(`Exchange Rate: ${exchangeRate}`, m, y); y += 4.5; }
      if (paymentDate) { doc.text(`Payment Date: ${format(new Date(paymentDate), "dd.MM.yyyy")}`, m, y); y += 4.5; }
      y += 6;
    }

    // ── Legal clauses ──
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, rCol, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);

    const legalTexts = [
      "This credit note has been issued under the self-billing procedure with the consent of the service provider.",
      "The service provider agrees not to issue separate invoices for the above services.",
      "This document was generated electronically and is valid without signature.",
    ];

    legalTexts.forEach(text => {
      const lines = doc.splitTextToSize(`• ${text}`, cw);
      lines.forEach((line: string) => { doc.text(line, m, y); y += 3.5; });
      y += 1;
    });

    doc.setTextColor(0, 0, 0);

    // Footer
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`${issuerName} · ${issuerAddress} · KvK ${issuerKvk} · VAT ${issuerVatId}`, pw / 2, 287, { align: "center" });
    doc.text(creditNoteNumber, pw / 2, 291, { align: "center" });

    return doc;
  };

  const handleGenerate = async () => {
    if (!netAmount.trim() || net <= 0) {
      toast.error("Bitte einen gültigen Betrag eingeben.");
      return;
    }
    if (!providerName.trim()) {
      toast.error("Bitte den Namen des Service Providers eingeben.");
      return;
    }

    setGenerating(true);

    try {
      // Get next credit note number from DB
      const { data: rpcData, error: rpcError } = await supabase.rpc("next_credit_note_number" as any);
      if (rpcError) throw rpcError;
      const creditNoteNumber = rpcData as string;

      // Save to DB
      const { error: insertError } = await supabase.from("credit_notes" as any).insert({
        credit_note_number: creditNoteNumber,
        credit_note_date: creditNoteDate,
        service_period_start: servicePeriodStart,
        service_period_end: servicePeriodEnd,
        provider_name: providerName,
        provider_address: providerAddress,
        provider_is_business: isBusiness,
        provider_vat_id: isBusiness ? providerVatId : "",
        description,
        net_amount: net,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        gross_amount: grossAmount,
        payment_method: `${cryptoCoin} (${cryptoNetwork})`,
        crypto_coin: cryptoCoin,
        tx_hash: txHash,
        exchange_rate: exchangeRate,
        payment_date: paymentDate || null,
        account_id: accountId || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        chatter_name: chatterName,
      } as any);

      if (insertError) throw insertError;

      // Generate PDF
      const doc = generatePDF(creditNoteNumber);
      const filename = `CreditNote_${creditNoteNumber.replace(/\//g, "-")}.pdf`;
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
        toast.success(`Credit Note ${creditNoteNumber} erstellt ✅`);
      }
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err: any) {
      console.error(err);
      toast.error("Fehler: " + (err.message || "Unbekannter Fehler"));
    }

    setGenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      {/* Issuer (Absender) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Building2 className="h-3.5 w-3.5" />
          Issuer (Absender)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Firmenname</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input value={issuerName} onChange={e => setIssuerName(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Adresse</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input value={issuerAddress} onChange={e => setIssuerAddress(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">KvK</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input value={issuerKvk} onChange={e => setIssuerKvk(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">VAT ID</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input value={issuerVatId} onChange={e => setIssuerVatId(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Service Provider */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <User className="h-3.5 w-3.5" />
          Service Provider (Empfänger)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="Vollständiger Name" className="text-sm border-transparent" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Adresse</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input value={providerAddress} onChange={e => setProviderAddress(e.target.value)} placeholder="Straße, PLZ, Ort, Land" className="text-sm border-transparent" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">
              {isBusiness ? "Business – VAT registered" : "Private individual – not VAT registered"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isBusiness ? "USt-IdNr. wird angefordert" : "Keine MwSt. ausgewiesen"}
            </p>
          </div>
          <Switch checked={isBusiness} onCheckedChange={setIsBusiness} />
        </div>

        {isBusiness && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">VAT ID</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input value={providerVatId} onChange={e => setProviderVatId(e.target.value)} placeholder="z.B. DE123456789" className="text-sm border-transparent" />
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Calendar className="h-3.5 w-3.5" />
          Credit Note Details
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Credit Note Date</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input type="date" value={creditNoteDate} onChange={e => setCreditNoteDate(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Service Period Start</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input type="date" value={servicePeriodStart} onChange={e => setServicePeriodStart(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Service Period End</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input type="date" value={servicePeriodEnd} onChange={e => setServicePeriodEnd(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/15">
          <Hash className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            Credit Note Nr. wird beim Erstellen <span className="text-accent font-semibold">automatisch fortlaufend</span> generiert (z.B. GS-2026-0001)
          </span>
        </div>
      </div>

      {/* Line Item */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <FileDown className="h-3.5 w-3.5" />
          Leistungsbeschreibung
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Beschreibung</Label>
          <div className="input-gold-shimmer rounded-lg">
            <Input value={description} onChange={e => setDescription(e.target.value)} className="text-sm border-transparent" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Netto-Betrag ({currency}) *</Label>
          <div className="input-gold-shimmer rounded-lg">
            <Input
              value={netAmount}
              onChange={e => setNetAmount(e.target.value)}
              placeholder="0,00"
              className="text-sm border-transparent font-mono"
            />
          </div>
          {suggestedAmount > 0 && netAmount !== suggestedAmount.toFixed(2) && (
            <button
              onClick={() => setNetAmount(suggestedAmount.toFixed(2))}
              className="text-[10px] text-accent hover:underline"
            >
              Vorschlag übernehmen: {suggestedAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}
              {revenuePercentage > 0 && ` (${revenuePercentage}%)`}
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Netto</span>
            <span className="font-mono">{net.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>MwSt. ({vatRate}%)</span>
            <span className="font-mono">{vatAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}</span>
          </div>
          <div className="border-t border-border/30 pt-1.5 flex justify-between text-sm font-bold text-foreground">
            <span>Gesamt</span>
            <span className="font-mono text-accent">{grossAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Building2 className="h-3.5 w-3.5" />
          Payment Information
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Coin</Label>
            <div className="flex gap-2">
              <Select value={cryptoCoin} onValueChange={setCryptoCoin}>
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTO_COINS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                <SelectTrigger className="w-[110px] text-sm">
                  <SelectValue placeholder="Netzwerk" />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTO_NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Payment Date</Label>
            <div className="input-gold-shimmer rounded-lg">
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="text-sm border-transparent" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">TxHash</Label>
          <div className="input-gold-shimmer rounded-lg">
            <Input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Transaction Hash" className="text-sm border-transparent font-mono text-xs" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Exchange Rate</Label>
          <div className="input-gold-shimmer rounded-lg">
            <Input value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} placeholder="z.B. 1 USDT = 0.92€" className="text-sm border-transparent" />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || !netAmount.trim() || !providerName.trim()}
        className="w-full gap-2 h-11 text-sm font-semibold bg-accent hover:bg-accent/90 text-accent-foreground transition-all hover:scale-[1.01] active:scale-[0.99] gold-glow"
      >
        <FileDown className="h-4 w-4" />
        {generating ? "Wird erstellt…" : "Credit Note als PDF erstellen"}
      </Button>

      {/* Legal notice */}
      <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed">
        Issued by {ISSUER.name} · KvK {ISSUER.kvk} · VAT {ISSUER.vatId}<br />
        Self-billing procedure – document valid without signature
      </p>
    </motion.div>
  );
}
