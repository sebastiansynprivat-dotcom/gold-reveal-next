import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, Smartphone, Check, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isPushSubscribed, subscribeToPush } from "@/lib/pushNotifications";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Prefs = { new_request: boolean; new_revenue: boolean };

const DEFAULT_PREFS: Prefs = { new_request: true, new_revenue: true };

export default function AdminPushSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setSubscribed(await isPushSubscribed());

      const { data } = await supabase
        .from("admin_notification_preferences")
        .select("new_request,new_revenue")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs({ new_request: data.new_request, new_revenue: data.new_revenue });
    })();
  }, []);

  const enablePush = async () => {
    setLoading(true);
    try {
      const ok = await subscribeToPush();
      setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");
      setSubscribed(ok);
      if (ok) toast.success("Push aktiviert auf diesem Gerät");
      else toast.error("Push konnte nicht aktiviert werden");
    } finally {
      setLoading(false);
    }
  };

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    if (!userId) return;
    setPrefs((p) => ({ ...p, [key]: value }));
    setSavingKey(key);
    const next = { ...prefs, [key]: value };
    const { error } = await supabase
      .from("admin_notification_preferences")
      .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    setSavingKey(null);
    if (error) {
      toast.error("Konnte Einstellung nicht speichern");
      setPrefs((p) => ({ ...p, [key]: !value }));
    }
  };

  const sendTest = async () => {
    try {
      const { error } = await supabase.functions.invoke("send-admin-push", {
        body: {
          event: "test",
          title: "Test-Push 🔔",
          body: "Deine Admin-Benachrichtigungen funktionieren!",
          url: "/admin",
        },
      });
      if (error) throw error;
      toast.success("Test-Push gesendet");
    } catch (e: any) {
      toast.error("Test fehlgeschlagen");
    }
  };

  const isIOS = typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="space-y-4">
      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-subtle rounded-2xl p-5 border-2 border-accent/30"
      >
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
            subscribed && permission === "granted"
              ? "bg-gradient-to-br from-accent to-accent/60 shadow-lg shadow-accent/30"
              : "bg-muted/40"
          }`}>
            {subscribed && permission === "granted"
              ? <BellRing className="h-6 w-6 text-accent-foreground" />
              : <Bell className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">Push auf diesem Gerät</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {subscribed && permission === "granted"
                ? "Aktiv — du bekommst Pushes auf diesem Gerät."
                : permission === "denied"
                ? "Browser blockiert Push. Erlaube Benachrichtigungen in den Browser-Einstellungen."
                : "Noch nicht aktiviert auf diesem Gerät."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!(subscribed && permission === "granted") && (
                <Button
                  onClick={enablePush}
                  disabled={loading || permission === "denied"}
                  className="bg-gradient-to-r from-accent to-accent/70 text-accent-foreground hover:opacity-90"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Auf diesem Gerät aktivieren
                </Button>
              )}
              {subscribed && permission === "granted" && (
                <Button onClick={sendTest} variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Test-Push senden
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Home-Screen Hint */}
      <div className="glass-card-subtle rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-accent mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold mb-1">Zum Home-Bildschirm hinzufügen</p>
            <p className="text-muted-foreground leading-relaxed">
              Damit Pushes auch ankommen wenn die App geschlossen ist, installiere sie
              {isIOS
                ? " auf iPhone: Safari → Teilen-Symbol → „Zum Home-Bildschirm". Danach App öffnen und oben aktivieren."
                : " (Android: Browser-Menü → „App installieren" oder „Zum Startbildschirm hinzufügen"). Auf Desktop kannst du sie aus dem Chrome-Menü installieren."}
            </p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card-subtle rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h3 className="text-base font-bold">Wofür Push erhalten?</h3>
        </div>

        <PrefRow
          title="Neue Model-Anfrage"
          description="Push wenn ein Chatter eine neue Anfrage stellt."
          checked={prefs.new_request}
          saving={savingKey === "new_request"}
          onChange={(v) => updatePref("new_request", v)}
        />
        <div className="h-px bg-border/50 my-3" />
        <PrefRow
          title="Neue Einnahme"
          description="Push bei jedem neuen Umsatz-Eingang (alle Plattformen)."
          checked={prefs.new_revenue}
          saving={savingKey === "new_revenue"}
          onChange={(v) => updatePref("new_revenue", v)}
        />
      </div>
    </div>
  );
}

function PrefRow({
  title, description, checked, onChange, saving,
}: {
  title: string; description: string; checked: boolean; saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {saving && <Check className="h-3.5 w-3.5 text-accent animate-pulse" />}
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}
