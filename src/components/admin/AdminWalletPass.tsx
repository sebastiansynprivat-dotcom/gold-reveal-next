import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Smartphone, Sparkles, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminWalletPass() {
  const [passUrl, setPassUrl] = useState<string | null>(null);
  const [serial, setSerial] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase.from("wallet_passes") as any)
      .select("pass_url, serial_number, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPassUrl(data.pass_url);
      setSerial(data.serial_number);
      setLastUpdated(data.updated_at);
    }
  };

  const createPass = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-wallet-pass");
      if (error) throw error;
      if (data?.passUrl) {
        setPassUrl(data.passUrl);
        setSerial(data.serialNumber);
        toast.success("Apple Wallet Pass erstellt 🎉");
      } else {
        throw new Error(data?.error || "Unbekannter Fehler");
      }
    } catch (e: any) {
      toast.error("Konnte Pass nicht erstellen", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("update-wallet-passes");
      if (error) throw error;
      toast.success("Pass aktualisiert — schau auf dein iPhone 📲");
      await load();
    } catch (e: any) {
      toast.error("Update fehlgeschlagen", { description: e.message });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-subtle rounded-2xl p-5 border-2 border-accent/30 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent/60 shadow-lg shadow-accent/30 flex items-center justify-center shrink-0">
            <Wallet className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">Apple Wallet — Live Umsätze</h3>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Deine Umsätze als Karte im iPhone-Wallet — updated sich automatisch alle 10 Min.
            </p>
          </div>
        </div>

        {!passUrl ? (
          <div className="mt-5">
            <Button
              onClick={createPass}
              disabled={loading}
              className="bg-gradient-to-r from-accent to-accent/70 text-accent-foreground hover:opacity-90 w-full sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
              Wallet-Pass erstellen
            </Button>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Smartphone className="h-3 w-3" />
              Funktioniert nur auf iPhone/iPad mit Apple Wallet
            </p>
          </div>
        ) : (
          <div className="mt-5 grid sm:grid-cols-[auto_1fr] gap-5 items-center">
            <div className="bg-white p-3 rounded-xl shadow-lg shrink-0 mx-auto">
              <QRCodeSVG value={passUrl} size={140} level="M" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">So geht's</p>
                <ol className="text-sm mt-1.5 space-y-1 list-decimal list-inside text-foreground/90">
                  <li>QR-Code mit iPhone-Kamera scannen</li>
                  <li>Auf „Zu Wallet hinzufügen" tippen</li>
                  <li>Fertig — Pass updated sich live ✨</li>
                </ol>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={passUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Direkt öffnen
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
                  {refreshing
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Jetzt aktualisieren
                </Button>
              </div>
              {lastUpdated && (
                <p className="text-[11px] text-muted-foreground">
                  Zuletzt aktualisiert: {new Date(lastUpdated).toLocaleString("de-DE")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
