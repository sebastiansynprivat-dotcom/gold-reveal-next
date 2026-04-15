import { useState, useEffect, useRef, useCallback } from "react";
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
  name: "Sharify Media Limited",
  address: "Palaion Patron Germanou 11, 8011, Paphos, Cyprus",
  kvk: "",
  vatId: "CY60329590T",
};

const issuerSettingsTable = () => (supabase.from as any)("issuer_settings");

const CRYPTO_NETWORKS = ["TRC20", "ERC20", "BEP20", "SOL", "BTC", "LTC"];

const CRYPTO_COINS = ["USDT", "USDC", "BTC", "ETH", "SOL", "BNB", "XRP", "TRX", "LTC"];

interface PlatformRevenue {
  fourbased: number;
  maloum: number;
  brezzels: number;
}

interface CreditNoteFormProps {
  suggestedAmount?: number;
  defaultDescription?: string;
  providerName?: string;
  cryptoAddress?: string;
  accountId?: string;
  chatterName?: string;
  revenuePercentage?: number;
  currency?: string;
  platformRevenue?: PlatformRevenue;
  compensationType?: "percentage" | "hourly";
  hourlyRate?: number;
  hoursWorked?: number;
  paymentMethod?: "crypto" | "bank";
  bankName?: string;
  bankIban?: string;
  bankBic?: string;
  bankAccountHolder?: string;
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
  platformRevenue,
  compensationType = "percentage",
  hourlyRate = 0,
  hoursWorked = 0,
  paymentMethod: modelPaymentMethod = "crypto",
  bankName: modelBankName = "",
  bankIban: modelBankIban = "",
  bankBic: modelBankBic = "",
  bankAccountHolder: modelBankAccountHolder = "",
}: CreditNoteFormProps) {
  // localStorage key for persisting provider (recipient) form fields
  const storageKey = `credit-note-form-${accountId || chatterName || "default"}`;

  // Load persisted provider values
  const loadSaved = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  };

  const saved = loadSaved();

  // Issuer (editable, loaded from DB)
  const [issuerName, setIssuerName] = useState(ISSUER_DEFAULTS.name);
  const [issuerAddress, setIssuerAddress] = useState(ISSUER_DEFAULTS.address);
  const [issuerKvk, setIssuerKvk] = useState(ISSUER_DEFAULTS.kvk);
  const [issuerVatId, setIssuerVatId] = useState(ISSUER_DEFAULTS.vatId);
  const issuerDbIdRef = useRef<string | null>(null);
  const issuerSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load issuer settings from DB on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await issuerSettingsTable().select("*").limit(1).single();
        if (!error && data) {
          issuerDbIdRef.current = data.id;
          setIssuerName(data.name);
          setIssuerAddress(data.address);
          setIssuerVatId(data.vat_id);
          setIssuerKvk(data.kvk || "");
        }
      } catch { /* use defaults */ }
    };
    load();
  }, []);

  // Auto-save issuer settings to DB with debounce
  const saveIssuerToDb = useCallback(async (name: string, address: string, vatId: string, kvk: string) => {
    if (!issuerDbIdRef.current) return;
    try {
      await issuerSettingsTable().update({
        name, address, vat_id: vatId, kvk,
      }).eq("id", issuerDbIdRef.current);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!issuerDbIdRef.current) return;
    if (issuerSaveTimerRef.current) clearTimeout(issuerSaveTimerRef.current);
    issuerSaveTimerRef.current = setTimeout(() => {
      saveIssuerToDb(issuerName, issuerAddress, issuerVatId, issuerKvk);
    }, 1200);
    return () => { if (issuerSaveTimerRef.current) clearTimeout(issuerSaveTimerRef.current); };
  }, [issuerName, issuerAddress, issuerVatId, issuerKvk, saveIssuerToDb]);

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
  const [receiverWallet, setReceiverWallet] = useState(saved.receiverWallet || cryptoAddress || "");
  const [exchangeRate, setExchangeRate] = useState(saved.exchangeRate || "");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [generating, setGenerating] = useState(false);
  const [liveExchangeRate, setLiveExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  // Fetch live exchange rate to EUR when currency is not EUR
  useEffect(() => {
    if (currency === "EUR") {
      setLiveExchangeRate(null);
      return;
    }
    let cancelled = false;
    setRateLoading(true);
    fetch(`https://api.frankfurter.app/latest?from=${currency}&to=EUR`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.rates?.EUR) {
          setLiveExchangeRate(data.rates.EUR);
          if (!exchangeRate) {
            setExchangeRate(`1 ${currency} = ${data.rates.EUR.toFixed(4)} EUR`);
          }
        }
      })
      .catch(() => { if (!cancelled) setLiveExchangeRate(null); })
      .finally(() => { if (!cancelled) setRateLoading(false); });
    return () => { cancelled = true; };
  }, [currency]);

  // Auto-save provider form fields to localStorage (issuer fields excluded – saved to DB)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({
        providerName, providerAddress, isBusiness, providerVatId,
        description, cryptoNetwork, cryptoCoin, txHash, exchangeRate, receiverWallet,
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [providerName, providerAddress, isBusiness, providerVatId, description, cryptoNetwork, cryptoCoin, txHash, exchangeRate, receiverWallet, storageKey]);

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
    const ph = 297;
    const m = 18;
    const rCol = pw - m;
    const cw = pw - 2 * m;

    // Colors
    const black: [number, number, number] = [15, 15, 15];
    const darkGray: [number, number, number] = [30, 30, 30];
    const gold: [number, number, number] = [212, 175, 55];
    const goldLight: [number, number, number] = [232, 205, 115];
    const white: [number, number, number] = [255, 255, 255];
    const muted: [number, number, number] = [160, 160, 160];
    const softWhite: [number, number, number] = [220, 220, 220];

    // ── Full page dark background ──
    doc.setFillColor(...black);
    doc.rect(0, 0, pw, ph, "F");

    // ── Top gold accent line ──
    doc.setFillColor(...gold);
    doc.rect(0, 0, pw, 1.5, "F");

    let y = 14;

    // ── Header: Issuer left ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...gold);
    doc.text(issuerName, m, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    y += 5.5;
    const issuerAddrLines = doc.splitTextToSize(issuerAddress, cw / 2 - 5);
    issuerAddrLines.forEach((line: string) => { doc.text(line, m, y); y += 3.8; });
    doc.text(`VAT: ${issuerVatId}`, m, y);
    y += 4;
    const leftEndY = y;

    // ── Header: Credit Note details right ──
    let ry = 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...goldLight);
    doc.text("PROVIDER INVOICE NO", rCol, ry, { align: "right" });
    ry += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.text(creditNoteNumber, rCol, ry, { align: "right" });
    ry += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...goldLight);
    doc.text("DATE", rCol, ry, { align: "right" });
    ry += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.text(format(new Date(creditNoteDate), "dd.MM.yyyy"), rCol, ry, { align: "right" });
    ry += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...goldLight);
    doc.text("SERVICE PERIOD", rCol, ry, { align: "right" });
    ry += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.text(`${format(new Date(servicePeriodStart), "dd.MM.yyyy")} – ${format(new Date(servicePeriodEnd), "dd.MM.yyyy")}`, rCol, ry, { align: "right" });
    ry += 4;

    y = Math.max(leftEndY, ry) + 6;

    // ── Gold divider ──
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(m, y, rCol, y);
    y += 9;

    // ── Title ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...gold);
    doc.text("SELF-BILLED PROVIDER INVOICE", m, y);
    const titleWidth = doc.getTextWidth("SELF-BILLED PROVIDER INVOICE");
    doc.setFont("helvetica", "normal");
     y += 4;

    // Thin gold line
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.2);
    doc.line(m, y, rCol, y);
    y += 6;

    // ── Self-billing notice ──
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("This provider invoice is issued under the self-billing procedure. The service provider does not issue a separate invoice.", m, y);
    y += 8;

    // ── Service Provider section ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...goldLight);
    doc.text("SERVICE PROVIDER", m, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...white);
    if (providerName) { doc.text(providerName, m, y); y += 4.5; }
    doc.setFontSize(8);
    doc.setTextColor(...softWhite);
    if (providerAddress) {
      const addrLines = doc.splitTextToSize(providerAddress, cw);
      addrLines.forEach((line: string) => { doc.text(line, m, y); y += 4; });
    }
    if (isBusiness && providerVatId) {
      doc.text(`VAT ID: ${providerVatId}`, m, y); y += 4;
    }
    if (!isBusiness) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text("Private individual – not VAT registered", m, y);
      y += 4;
    }
    y += 7;

    // ── Description of Service table ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...goldLight);
    doc.text("DESCRIPTION OF SERVICE", m, y);
    y += 5;

    // Table header – dark gold bar
    doc.setFillColor(...darkGray);
    doc.rect(m, y - 3.5, cw, 7, "F");
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.15);
    doc.rect(m, y - 3.5, cw, 7, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...gold);
    doc.text("Pos.", m + 2, y);
    doc.text("Description", m + 15, y);

    const isHourly = compensationType === "hourly";
    const hasHourlyDetails = isHourly && hourlyRate > 0 && hoursWorked > 0;

    if (hasHourlyDetails) {
      doc.text(`Rate (${currency})`, rCol - 70, y, { align: "right" });
      doc.text("Hours", rCol - 35, y, { align: "right" });
      doc.text(`Amount (${currency})`, rCol - 2, y, { align: "right" });
    } else if (isHourly) {
      doc.text(`Amount (${currency})`, rCol - 2, y, { align: "right" });
    } else {
      doc.text(`Revenue (${currency})`, rCol - 52, y, { align: "right" });
      doc.text(`Share ${revenuePercentage}% (${currency})`, rCol - 2, y, { align: "right" });
    }
    y += 7;

    const formattedNet = net.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (isHourly) {
      doc.setFillColor(20, 20, 20);
      doc.rect(m, y - 3.5, cw, 7, "F");
      doc.setDrawColor(50, 50, 50);
      doc.rect(m, y - 3.5, cw, 7, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...white);
      doc.text("1", m + 2, y);
      const descLines = doc.splitTextToSize(description, hasHourlyDetails ? 80 : 100);
      doc.text(descLines[0] || description, m + 15, y);
      if (hasHourlyDetails) {
        doc.setTextColor(...muted);
        doc.text(hourlyRate.toLocaleString("de-DE", { minimumFractionDigits: 2 }), rCol - 70, y, { align: "right" });
        doc.text(hoursWorked.toLocaleString("de-DE", { minimumFractionDigits: 1 }), rCol - 35, y, { align: "right" });
      }
      doc.setTextColor(...white);
      doc.text(formattedNet, rCol - 2, y, { align: "right" });
      y += 7;
    } else {
      // Table row(s) – one per platform if breakdown exists, otherwise single row
      const hasPlatformBreakdown = platformRevenue && revenuePercentage > 0 && (platformRevenue.fourbased > 0 || platformRevenue.maloum > 0 || platformRevenue.brezzels > 0);
      const platforms = hasPlatformBreakdown
        ? [
            { name: "4Based", rev: platformRevenue!.fourbased },
            { name: "Maloum", rev: platformRevenue!.maloum },
            { name: "Brezzels", rev: platformRevenue!.brezzels },
          ].filter(p => p.rev > 0)
        : [];

      if (hasPlatformBreakdown) {
        platforms.forEach((p, i) => {
          const rowBg: [number, number, number] = i % 2 === 0 ? [20, 20, 20] : [25, 25, 25];
          const payout = (p.rev * revenuePercentage / 100);
          const rowH = 7;
          doc.setFillColor(...rowBg);
          doc.rect(m, y - 3.5, cw, rowH, "F");
          doc.setDrawColor(50, 50, 50);
          doc.rect(m, y - 3.5, cw, rowH, "S");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...white);
          doc.text(`${i + 1}`, m + 2, y);
          doc.text(`${description} – ${p.name}`, m + 15, y);
          doc.setTextColor(...muted);
          doc.text(p.rev.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rCol - 52, y, { align: "right" });
          doc.setTextColor(...white);
          doc.text(payout.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rCol - 2, y, { align: "right" });
          y += rowH;
        });

        const totalRev = platforms.reduce((s, p) => s + p.rev, 0);
        doc.setFillColor(18, 18, 18);
        doc.rect(m, y - 3.5, cw, 7, "F");
        doc.setDrawColor(50, 50, 50);
        doc.rect(m, y - 3.5, cw, 7, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...goldLight);
        doc.text("Total", m + 15, y);
        doc.text(totalRev.toLocaleString("de-DE", { minimumFractionDigits: 2 }), rCol - 52, y, { align: "right" });
        doc.setTextColor(...gold);
        doc.text(formattedNet, rCol - 2, y, { align: "right" });
        y += 7;
      } else {
        doc.setFillColor(20, 20, 20);
        doc.rect(m, y - 3.5, cw, 7, "F");
        doc.setDrawColor(50, 50, 50);
        doc.rect(m, y - 3.5, cw, 7, "S");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...white);
        doc.text("1", m + 2, y);
        const descLines = doc.splitTextToSize(description, 100);
        doc.text(descLines[0] || description, m + 15, y);
        doc.text(formattedNet, rCol - 2, y, { align: "right" });
        y += 7;
      }
    }

    y += 4;

    // Subtotals – right-aligned block
    const subtotalX = rCol - 55;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...softWhite);
    doc.text("Net Amount:", subtotalX, y);
    doc.text(`${formattedNet} ${currency}`, rCol - 2, y, { align: "right" });
    y += 5;

    const vatLabel = !isBusiness
      ? "VAT (0% – not subject to VAT):"
      : `VAT (${vatRate}%):`;
    doc.text(vatLabel, subtotalX - 15, y);
    doc.text(`${vatAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${currency}`, rCol - 2, y, { align: "right" });
    y += 5;

    // Total line
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);
    doc.line(subtotalX - 15, y - 1, rCol, y - 1);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...gold);
    doc.text("Total:", subtotalX, y);
    doc.text(`${grossAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${currency}`, rCol - 2, y, { align: "right" });



    y += 2;
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);
    doc.line(subtotalX - 15, y, rCol, y);
    y += 8;

    // VAT note
    if (!isBusiness) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text("No VAT charged – private individual not subject to VAT.", m, y);
      y += 7;
    }

    // ── Payment Information ──
    const isBank = modelPaymentMethod === "bank";
    if (isBank || cryptoCoin || txHash || (currency !== "EUR" && liveExchangeRate)) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...goldLight);
      doc.text("PAYMENT INFORMATION", m, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...white);

      if (isBank) {
        doc.text("Payment Method: Bank Transfer", m, y);
        y += 4.5;
        if (modelBankAccountHolder) {
          doc.text(`Account Holder: ${modelBankAccountHolder}`, m, y);
          y += 4.5;
        }
        if (modelBankIban) {
          doc.text(`IBAN: ${modelBankIban}`, m, y);
          y += 4.5;
        }
        if (modelBankBic) {
          doc.text(`BIC/SWIFT: ${modelBankBic}`, m, y);
          y += 4.5;
        }
        if (modelBankName) {
          doc.text(`Bank: ${modelBankName}`, m, y);
          y += 4.5;
        }
      } else {
        if (cryptoCoin) {
          doc.text(`Payment Method: ${cryptoCoin} (${cryptoNetwork})`, m, y);
          y += 4.5;
        }
        if (receiverWallet) {
          doc.text(`Receiver Wallet: ${receiverWallet}`, m, y);
          y += 4.5;
        }
        if (txHash) {
          doc.text(`TxHash: ${txHash}`, m, y);
          y += 4.5;
        }
      }
      if (currency !== "EUR" && liveExchangeRate) {
        doc.text(`Exchange Rate: 1 ${currency} = ${liveExchangeRate.toFixed(4)} EUR`, m, y);
        y += 4.5;
      }
      if (paymentDate) {
        doc.setFontSize(8.5);
        doc.text(`Payment Date: ${format(new Date(paymentDate), "dd.MM.yyyy")}`, m, y);
        y += 4.5;
      }
      y += 6;
    }

    // ── Legal clauses ──
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.2);
    doc.line(m, y, rCol, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...muted);

    const legalTexts = [
      "This invoice has been issued by Sharify Media Limited under a self-billing arrangement with the consent of the service provider.",
      "The service provider agrees not to issue separate invoices for the above services.",
      "This document was generated electronically and is valid without signature.",
    ];

    legalTexts.forEach(text => {
      const lines = doc.splitTextToSize(`• ${text}`, cw);
      lines.forEach((line: string) => { doc.text(line, m, y); y += 3.2; });
      y += 0.8;
    });

    // ── Footer ──
    // Bottom gold accent line
    doc.setFillColor(...gold);
    doc.rect(0, ph - 1.5, pw, 1.5, "F");

    // Footer text
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`${issuerName}  ·  ${issuerAddress}  ·  VAT ${issuerVatId}`, pw / 2, ph - 6, { align: "center" });
    doc.setTextColor(...goldLight);
    doc.text(creditNoteNumber, pw / 2, ph - 3, { align: "center" });

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
      const filename = `ProviderInvoice_${creditNoteNumber.replace(/\//g, "-")}.pdf`;
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
        toast.success(`Provider Invoice ${creditNoteNumber} erstellt ✅`);
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
          Provider Invoice Details
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Invoice Date</Label>
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
            Provider Invoice Nr. wird beim Erstellen <span className="text-accent font-semibold">automatisch fortlaufend</span> generiert (z.B. GS-2026-0001)
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

        {/* Platform Breakdown */}
        {compensationType !== "hourly" && platformRevenue && (platformRevenue.fourbased > 0 || platformRevenue.maloum > 0 || platformRevenue.brezzels > 0) && revenuePercentage > 0 && (
          <div className="rounded-lg bg-secondary/20 border border-border/40 p-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Plattform-Aufschlüsselung</p>
            {platformRevenue.fourbased > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">4Based</span>
                <span className="font-mono text-foreground">
                  {platformRevenue.fourbased.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}
                  <span className="text-muted-foreground ml-1.5">→ {(platformRevenue.fourbased * revenuePercentage / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}</span>
                </span>
              </div>
            )}
            {platformRevenue.maloum > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Maloum</span>
                <span className="font-mono text-foreground">
                  {platformRevenue.maloum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}
                  <span className="text-muted-foreground ml-1.5">→ {(platformRevenue.maloum * revenuePercentage / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}</span>
                </span>
              </div>
            )}
            {platformRevenue.brezzels > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Brezzels</span>
                <span className="font-mono text-foreground">
                  {platformRevenue.brezzels.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}
                  <span className="text-muted-foreground ml-1.5">→ {(platformRevenue.brezzels * revenuePercentage / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} {currency}</span>
                </span>
              </div>
            )}
          </div>
        )}

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
          {currency !== "EUR" && liveExchangeRate && net > 0 && (
            <div className="border-t border-border/30 pt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>≈ in EUR</span>
              <span className="font-mono text-accent/70">
                {rateLoading ? "…" : `≈ ${(grossAmount * liveExchangeRate).toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`}
              </span>
            </div>
          )}
          {currency !== "EUR" && liveExchangeRate && (
            <div className="text-[10px] text-muted-foreground/60 text-right">
              Kurs: 1 {currency} = {liveExchangeRate.toFixed(4)} EUR (live)
            </div>
          )}
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
          <Label className="text-xs text-muted-foreground">Receiver Wallet</Label>
          <div className="input-gold-shimmer rounded-lg">
            <Input value={receiverWallet} onChange={e => setReceiverWallet(e.target.value)} placeholder="Wallet-Adresse des Empfängers" className="text-sm border-transparent font-mono text-xs" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">TxHash</Label>
          <div className="input-gold-shimmer rounded-lg">
            <Input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Transaction Hash" className="text-sm border-transparent font-mono text-xs" />
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
        {generating ? "Wird erstellt…" : "Provider Invoice als PDF erstellen"}
      </Button>

      {/* Legal notice */}
      <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed">
        Issued by {issuerName} · VAT {issuerVatId}<br />
        Self-billing procedure – document valid without signature
      </p>
    </motion.div>
  );
}
