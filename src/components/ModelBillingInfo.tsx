import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Bitcoin, ChevronDown, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  accountName: string;
  monthlyRevenue: number;
  revenuePercentage: number;
  verdienst: number;
  cryptoAddress?: string;
}

export default function ModelBillingInfo({ accountName, monthlyRevenue, revenuePercentage, verdienst, cryptoAddress }: Props) {
  const [open, setOpen] = useState(false);
  const [copiedSelf, setCopiedSelf] = useState(false);
  const [copiedCrypto, setCopiedCrypto] = useState(false);

  const agencyShare = revenuePercentage > 0 ? 100 - revenuePercentage : 30;
  const creatorShare = revenuePercentage > 0 ? revenuePercentage : 70;
  const agencyAmount = Math.round(monthlyRevenue * agencyShare / 100);
  const today = format(new Date(), "dd.MM.yyyy");
  const period = format(new Date(), "MMMM yyyy", { locale: de });
  const wallet = cryptoAddress || "0x1234...";

  const selfBillingText = `Creator Revenue Share Statement

Creator: ${accountName || "Name"}
Period: ${period}

Total revenue generated: ${monthlyRevenue.toLocaleString("de-DE")} €
Agency share (${agencyShare}%): ${agencyAmount.toLocaleString("de-DE")} €
Creator payout (${creatorShare}%): ${verdienst.toLocaleString("de-DE")} €

Payment method: USDT
Wallet: ${wallet}
Date: ${today}`;

  const cryptoText = `Payout: ${verdienst.toLocaleString("de-DE")} €
Paid via USDT
TX Hash: 0x821ad72...
Exchange Rate: 1 USDT = 0.999 €`;

  const copyText = async (text: string, type: "self" | "crypto") => {
    await navigator.clipboard.writeText(text);
    toast.success("Kopiert!");
    if (type === "self") { setCopiedSelf(true); setTimeout(() => setCopiedSelf(false), 2000); }
    else { setCopiedCrypto(true); setTimeout(() => setCopiedCrypto(false), 2000); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className={`w-full glass-card rounded-xl p-4 flex items-center justify-between ${!open ? "" : "rounded-b-none border-b-0"}`}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Abrechnung & Auszahlung</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-b-xl rounded-t-none border-t-0 overflow-hidden"
          >
            <div className="p-4 space-y-6">
              {/* Section 1: Self-Billing */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground">1. Gutschrift (Self-Billing)</h3>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Das bedeutet:</strong></p>
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li><strong className="text-foreground">Wir erstellen die Rechnung in deinem Namen</strong></li>
                  <li>nennt sich <strong className="text-foreground">Gutschrift / Self-Billing Invoice</strong></li>
                  <li>wir zahlen dann direkt aus</li>
                </ul>

                <p className="text-sm font-semibold text-foreground mt-3">Beispiel:</p>
                <div className="relative bg-[hsl(0,0%,7%)] border border-[hsl(43,30%,20%)] rounded-lg p-4">
                  <button
                    onClick={() => copyText(selfBillingText, "self")}
                    className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    {copiedSelf ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedSelf ? "Kopiert" : "Kopieren"}
                  </button>
                  <pre className="text-xs text-accent/90 font-mono whitespace-pre-wrap leading-relaxed">{selfBillingText}</pre>
                </div>

                <p className="text-sm text-muted-foreground">Diese <strong className="text-foreground">Gutschrift ersetzt die Rechnung.</strong></p>
                <p className="text-sm text-muted-foreground">
                  Das ist <strong className="text-foreground">vollkommen legal</strong>, solange:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>das im Vertrag steht</li>
                  <li>beide Parteien zustimmen</li>
                </ul>
              </div>

              <hr className="border-[hsl(43,30%,15%)]" />

              {/* Section 2: Crypto */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground">2. Crypto Auszahlung</h3>
                <p className="text-sm text-muted-foreground">
                  Crypto Auszahlung ist <strong className="text-foreground">kein Problem</strong>, solange ihr dokumentiert:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>Betrag in EUR</li>
                  <li>Wechselkurs</li>
                  <li>Wallet-Adresse</li>
                  <li>Datum</li>
                  <li>Transaction Hash</li>
                </ul>

                <p className="text-sm font-semibold text-foreground mt-3">Beispiel:</p>
                <div className="relative bg-[hsl(0,0%,7%)] border border-[hsl(43,30%,20%)] rounded-lg p-4">
                  <button
                    onClick={() => copyText(cryptoText, "crypto")}
                    className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    {copiedCrypto ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedCrypto ? "Kopiert" : "Kopieren"}
                  </button>
                  <pre className="text-xs text-accent/90 font-mono whitespace-pre-wrap leading-relaxed">{cryptoText}</pre>
                </div>

                <p className="text-sm text-muted-foreground">Das reicht für Buchhaltung.</p>
                <p className="text-sm text-muted-foreground">
                  Viele Creator-Agenturen zahlen <strong className="text-foreground">USDT (TRC20)</strong>.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
