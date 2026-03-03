import { useState, useEffect } from "react";
import { Users, Send, Bell, Search, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface ChatterProfile {
  user_id: string;
  group_name: string;
  telegram_id: string;
  created_at: string;
  account_email?: string;
  account_password?: string;
  account_domain?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatters, setChatters] = useState<ChatterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pushTarget, setPushTarget] = useState<ChatterProfile | null>(null);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);

  // Broadcast state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Account data dialog
  const [accountTarget, setAccountTarget] = useState<ChatterProfile | null>(null);
  const [accEmail, setAccEmail] = useState("");
  const [accPassword, setAccPassword] = useState("");
  const [accDomain, setAccDomain] = useState("");
  const [accSaving, setAccSaving] = useState(false);
  useEffect(() => {
    loadChatters();
  }, []);

  const loadChatters = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, group_name, telegram_id, created_at, account_email, account_password, account_domain")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Chatter");
      setLoading(false);
      return;
    }

    setChatters(data || []);
    setLoading(false);
  };

  const sendIndividualPush = async () => {
    if (!pushTarget || !pushTitle.trim() || !pushBody.trim()) return;

    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            title: pushTitle.trim(),
            body: pushBody.trim(),
            target_user_id: pushTarget.user_id,
          }),
        }
      );

      const result = await res.json();
      if (res.ok) {
        toast.success(`Push an ${pushTarget.group_name || "Chatter"} gesendet!`);
        setPushTarget(null);
        setPushTitle("");
        setPushBody("");
      } else {
        toast.error(result.error || "Fehler beim Senden");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setSending(false);
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;

    setBroadcastSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            title: broadcastTitle.trim(),
            body: broadcastBody.trim(),
          }),
        }
      );

      const result = await res.json();
      if (res.ok) {
        toast.success(`Gesendet an ${result.sent} Empfänger!`);
        setBroadcastOpen(false);
        setBroadcastTitle("");
        setBroadcastBody("");
      } else {
        toast.error(result.error || "Fehler beim Senden");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setBroadcastSending(false);
  };

  const filtered = chatters.filter(
    (c) =>
      c.group_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.telegram_id?.toLowerCase().includes(search.toLowerCase())
  );

  const openAccountDialog = (chatter: ChatterProfile) => {
    setAccountTarget(chatter);
    setAccEmail(chatter.account_email || "");
    setAccPassword(chatter.account_password || "");
    setAccDomain(chatter.account_domain || "");
  };

  const saveAccountData = async () => {
    if (!accountTarget) return;
    setAccSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        account_email: accEmail.trim(),
        account_password: accPassword.trim(),
        account_domain: accDomain.trim(),
      })
      .eq("user_id", accountTarget.user_id);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Account-Daten gespeichert!");
      setAccountTarget(null);
      loadChatters();
    }
    setAccSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-[10px] text-muted-foreground">Chatter verwalten & Benachrichtigungen</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}>
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            An alle senden
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Chatter gesamt</p>
            <p className="text-2xl font-bold text-gold-gradient">{chatters.length}</p>
          </div>
          <div className="glass-card-subtle rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Mit Telegram-ID</p>
            <p className="text-2xl font-bold text-gold-gradient">
              {chatters.filter((c) => c.telegram_id).length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chatter suchen (Gruppe oder Telegram-ID)..."
            className="pl-9 text-sm"
          />
        </div>

        {/* Chatter List */}
        <section className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Alle Chatter</h2>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {search ? "Kein Chatter gefunden." : "Noch keine Chatter registriert."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((chatter) => (
                <div
                  key={chatter.user_id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-accent">
                      {(chatter.group_name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {chatter.group_name || "Kein Gruppenname"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Telegram: {chatter.telegram_id || "—"} · Seit{" "}
                      {new Date(chatter.created_at).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAccountDialog(chatter)}
                      className="text-primary hover:text-primary/80"
                      title="Account-Daten"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPushTarget(chatter)}
                      className="text-accent hover:text-accent/80"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Individual Push Dialog */}
      <Dialog open={!!pushTarget} onOpenChange={(o) => { if (!o) setPushTarget(null); }}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Push an {pushTarget?.group_name || "Chatter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder="Titel"
              maxLength={100}
            />
            <Textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder="Nachricht..."
              maxLength={500}
              className="min-h-[80px]"
            />
            <Button
              onClick={sendIndividualPush}
              disabled={sending || !pushTitle.trim() || !pushBody.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Wird gesendet..." : "Push senden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">An alle Chatter senden</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Titel"
              maxLength={100}
            />
            <Textarea
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder="Nachricht..."
              maxLength={500}
              className="min-h-[80px]"
            />
            <Button
              onClick={sendBroadcast}
              disabled={broadcastSending || !broadcastTitle.trim() || !broadcastBody.trim()}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              {broadcastSending ? "Wird gesendet..." : "An alle senden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
