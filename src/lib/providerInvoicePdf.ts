import jsPDF from "jspdf";
import { format } from "date-fns";

export interface ProviderInvoiceData {
  creditNoteNumber: string;
  creditNoteDate: string; // yyyy-mm-dd
  servicePeriodStart: string;
  servicePeriodEnd: string;
  issuer: { name: string; address: string; vatId: string };
  provider: {
    name: string;
    address: string;
    isBusiness: boolean;
    vatId: string;
  };
  description: string;
  currency: string;
  lines: Array<{ name: string; gross: number; pct: number }>;
  net: number;
  payment?: {
    method?: string; // e.g. "USDT (TRC20)" or "Bank Transfer"
    wallet?: string;
    txHash?: string;
    bankAccountHolder?: string;
    bankIban?: string;
    bankBic?: string;
    bankName?: string;
    paymentDate?: string;
  };
}

export function generateProviderInvoicePdf(d: ProviderInvoiceData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210, ph = 297, m = 18, rCol = pw - m, cw = pw - 2 * m;

  const black: [number, number, number] = [15, 15, 15];
  const darkGray: [number, number, number] = [30, 30, 30];
  const gold: [number, number, number] = [212, 175, 55];
  const goldLight: [number, number, number] = [232, 205, 115];
  const white: [number, number, number] = [255, 255, 255];
  const muted: [number, number, number] = [160, 160, 160];
  const softWhite: [number, number, number] = [220, 220, 220];

  doc.setFillColor(...black); doc.rect(0, 0, pw, ph, "F");
  doc.setFillColor(...gold); doc.rect(0, 0, pw, 1.5, "F");

  let y = 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...gold);
  doc.text(d.issuer.name, m, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...muted); y += 5.5;
  doc.splitTextToSize(d.issuer.address, cw / 2 - 5).forEach((line: string) => { doc.text(line, m, y); y += 3.8; });
  doc.text(`VAT: ${d.issuer.vatId}`, m, y); y += 4;
  const leftEndY = y;

  let ry = 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...goldLight);
  doc.text("PROVIDER INVOICE NO", rCol, ry, { align: "right" }); ry += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...white);
  doc.text(d.creditNoteNumber, rCol, ry, { align: "right" }); ry += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...goldLight);
  doc.text("DATE", rCol, ry, { align: "right" }); ry += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...white);
  doc.text(format(new Date(d.creditNoteDate), "dd.MM.yyyy"), rCol, ry, { align: "right" }); ry += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...goldLight);
  doc.text("SERVICE PERIOD", rCol, ry, { align: "right" }); ry += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...white);
  doc.text(`${format(new Date(d.servicePeriodStart), "dd.MM.yyyy")} – ${format(new Date(d.servicePeriodEnd), "dd.MM.yyyy")}`, rCol, ry, { align: "right" });

  y = Math.max(leftEndY, ry + 4) + 6;
  doc.setDrawColor(...gold); doc.setLineWidth(0.5); doc.line(m, y, rCol, y); y += 9;

  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...gold);
  doc.text("SELF-BILLED PROVIDER INVOICE", m, y); y += 4;
  doc.setLineWidth(0.2); doc.line(m, y, rCol, y); y += 6;

  doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(...muted);
  doc.text("This provider invoice is issued under the self-billing procedure. The service provider does not issue a separate invoice.", m, y);
  y += 8;

  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...goldLight);
  doc.text("SERVICE PROVIDER", m, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...white);
  if (d.provider.name) { doc.text(d.provider.name, m, y); y += 4.5; }
  doc.setFontSize(8); doc.setTextColor(...softWhite);
  if (d.provider.address) {
    doc.splitTextToSize(d.provider.address, cw).forEach((line: string) => { doc.text(line, m, y); y += 4; });
  }
  if (d.provider.isBusiness && d.provider.vatId) { doc.text(`VAT ID: ${d.provider.vatId}`, m, y); y += 4; }
  if (!d.provider.isBusiness) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(...muted);
    doc.text("Private individual – not VAT registered", m, y); y += 4;
  }
  y += 7;

  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...goldLight);
  doc.text("DESCRIPTION OF SERVICE", m, y); y += 5;

  doc.setFillColor(...darkGray); doc.rect(m, y - 3.5, cw, 7, "F");
  doc.setDrawColor(...gold); doc.setLineWidth(0.15); doc.rect(m, y - 3.5, cw, 7, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...gold);
  doc.text("Pos.", m + 2, y);
  doc.text("Description", m + 15, y);
  doc.text(`Revenue (${d.currency})`, rCol - 52, y, { align: "right" });
  doc.text(`Share (${d.currency})`, rCol - 2, y, { align: "right" });
  y += 7;

  d.lines.forEach((p, i) => {
    const rowBg: [number, number, number] = i % 2 === 0 ? [20, 20, 20] : [25, 25, 25];
    const payout = p.gross * p.pct / 100;
    doc.setFillColor(...rowBg); doc.rect(m, y - 3.5, cw, 7, "F");
    doc.setDrawColor(50, 50, 50); doc.rect(m, y - 3.5, cw, 7, "S");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...white);
    doc.text(`${i + 1}`, m + 2, y);
    doc.text(`Creator revenue share for digital content – ${p.name} (${p.pct}%)`, m + 15, y);
    doc.setTextColor(...muted);
    doc.text(p.gross.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rCol - 52, y, { align: "right" });
    doc.setTextColor(...white);
    doc.text(payout.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rCol - 2, y, { align: "right" });
    y += 7;
  });

  const totalGross = d.lines.reduce((s, p) => s + p.gross, 0);
  doc.setFillColor(18, 18, 18); doc.rect(m, y - 3.5, cw, 7, "F");
  doc.setDrawColor(50, 50, 50); doc.rect(m, y - 3.5, cw, 7, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...goldLight);
  doc.text("Total", m + 15, y);
  doc.text(totalGross.toLocaleString("de-DE", { minimumFractionDigits: 2 }), rCol - 52, y, { align: "right" });
  doc.setTextColor(...gold);
  doc.text(d.net.toLocaleString("de-DE", { minimumFractionDigits: 2 }), rCol - 2, y, { align: "right" });
  y += 11;

  const subtotalX = rCol - 55;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...softWhite);
  doc.text("Net Amount:", subtotalX, y);
  doc.text(`${d.net.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${d.currency}`, rCol - 2, y, { align: "right" }); y += 5;
  doc.text("VAT (0% – not subject to VAT):", subtotalX - 25, y);
  doc.text(`0,00 ${d.currency}`, rCol - 2, y, { align: "right" }); y += 5;
  doc.setDrawColor(...gold); doc.setLineWidth(0.4); doc.line(subtotalX - 15, y - 1, rCol, y - 1); y += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...gold);
  doc.text("Total:", subtotalX, y);
  doc.text(`${d.net.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${d.currency}`, rCol - 2, y, { align: "right" });
  y += 2; doc.line(subtotalX - 15, y, rCol, y); y += 8;

  if (!d.provider.isBusiness) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(...muted);
    doc.text("No VAT charged – private individual not subject to VAT.", m, y); y += 7;
  }

  const p = d.payment;
  if (p && (p.method || p.wallet || p.txHash || p.bankIban)) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...goldLight);
    doc.text("PAYMENT INFORMATION", m, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...white);
    if (p.method) { doc.text(`Payment Method: ${p.method}`, m, y); y += 4.5; }
    if (p.bankAccountHolder) { doc.text(`Account Holder: ${p.bankAccountHolder}`, m, y); y += 4.5; }
    if (p.bankIban) { doc.text(`IBAN: ${p.bankIban}`, m, y); y += 4.5; }
    if (p.bankBic) { doc.text(`BIC/SWIFT: ${p.bankBic}`, m, y); y += 4.5; }
    if (p.bankName) { doc.text(`Bank: ${p.bankName}`, m, y); y += 4.5; }
    if (p.wallet) { doc.text(`Receiver Wallet: ${p.wallet}`, m, y); y += 4.5; }
    if (p.txHash) { doc.text(`Collect Exchange ID: ${p.txHash}`, m, y); y += 4.5; }
    if (p.paymentDate) { doc.text(`Payment Date: ${format(new Date(p.paymentDate), "dd.MM.yyyy")}`, m, y); y += 4.5; }
    y += 6;
  }

  doc.setDrawColor(50, 50, 50); doc.setLineWidth(0.2); doc.line(m, y, rCol, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...muted);
  [
    "This invoice has been issued by " + d.issuer.name + " under a self-billing arrangement with the consent of the service provider.",
    "The service provider agrees not to issue separate invoices for the above services.",
    "This document was generated electronically and is valid without signature.",
  ].forEach(text => {
    doc.splitTextToSize(`• ${text}`, cw).forEach((line: string) => { doc.text(line, m, y); y += 3.2; });
    y += 0.8;
  });

  doc.setFillColor(...gold); doc.rect(0, ph - 1.5, pw, 1.5, "F");
  doc.setFontSize(6); doc.setTextColor(100, 100, 100);
  doc.text(`${d.issuer.name}  ·  ${d.issuer.address}  ·  VAT ${d.issuer.vatId}`, pw / 2, ph - 6, { align: "center" });
  doc.setTextColor(...goldLight);
  doc.text(d.creditNoteNumber, pw / 2, ph - 3, { align: "center" });

  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
