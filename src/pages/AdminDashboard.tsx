import { useState, useEffect } from "react";
import { Users, Send, Bell, Search, KeyRound, Plus, Package, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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

interface AccountEntry {
  id: string;
  platform: string;
  account_email: string;
  account_password: string;
  account_domain: string;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
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

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Account pool state
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [accountPoolOpen, setAccountPoolOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [newAccEmail, setNewAccEmail] = useState("");
  const [newAccPassword, setNewAccPassword] = useState("");
  const [newAccDomain, setNewAccDomain] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatterProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<ChatterProfile | null>(null);
  const [reassigning, setReassigning] = useState(false);
  useEffect(() => {
    loadChatters();
    loadAccounts();
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

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true });
    setAccounts(data || []);
  };

  const platforms = [...new Set(accounts.map((a) => a.platform).filter(Boolean))];

  const addAccount = async () => {
    if (!newAccEmail.trim() || !newAccDomain.trim() || !selectedPlatform) return;
    setAddingAccount(true);
    const { error } = await supabase.from("accounts").insert({
      platform: selectedPlatform,
      account_email: newAccEmail.trim(),
      account_password: newAccPassword.trim(),
      account_domain: newAccDomain.trim(),
    });
    if (error) {
      toast.error("Fehler beim Hinzufügen");
    } else {
      toast.success("Account hinzugefügt!");
      setNewAccEmail("");
      setNewAccPassword("");
      setNewAccDomain("");
      loadAccounts();
    }
    setAddingAccount(false);
  };

  const assignAccounts = async () => {
    if (!selectedPlatform) return;
    setAssigning(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/assign-accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ platform: selectedPlatform }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || "Accounts zugewiesen!");
        loadAccounts();
        loadChatters();
      } else {
        toast.error(result.error || "Fehler beim Zuweisen");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setAssigning(false);
  };

  const deleteChatter = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Unassign any accounts assigned to this user
      await supabase
        .from("accounts")
        .update({ assigned_to: null, assigned_at: null })
        .eq("assigned_to", deleteTarget.user_id);

      // Clear account data from profile
      await supabase
        .from("profiles")
        .update({ account_email: null, account_password: null, account_domain: null })
        .eq("user_id", deleteTarget.user_id);

      toast.success(`Account-Daten von ${deleteTarget.group_name || "Chatter"} wurden entfernt`);
      setDeleteTarget(null);
      loadChatters();
      loadAccounts();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setDeleting(false);
  };

  const reassignAccount = async (newAccountId: string) => {
    if (!reassignTarget) return;
    setReassigning(true);
    try {
      // Free old account if any
      await supabase
        .from("accounts")
        .update({ assigned_to: null, assigned_at: null })
        .eq("assigned_to", reassignTarget.user_id);

      // Assign new account
      const { data: newAcc } = await supabase
        .from("accounts")
        .update({ assigned_to: reassignTarget.user_id, assigned_at: new Date().toISOString() })
        .eq("id", newAccountId)
        .select()
        .single();

      if (newAcc) {
        await supabase
          .from("profiles")
          .update({
            account_email: newAcc.account_email,
            account_password: newAcc.account_password,
            account_domain: newAcc.account_domain,
          })
          .eq("user_id", reassignTarget.user_id);
      }

      toast.success(`Account für ${reassignTarget.group_name || "Chatter"} geändert!`);
      setReassignTarget(null);
      loadChatters();
      loadAccounts();
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setReassigning(false);
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

  const platformAccounts = selectedPlatform
    ? accounts.filter((a) => a.platform === selectedPlatform)
    : [];
  const freeCount = platformAccounts.filter((a) => !a.assigned_to).length;
  const assignedCount = platformAccounts.filter((a) => a.assigned_to).length;

  // Find chatter name by user_id
  const getChatterName = (userId: string | null) => {
    if (!userId) return null;
    const c = chatters.find((ch) => ch.user_id === userId);
    return c?.group_name || c?.telegram_id || userId.slice(0, 8);
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

        {/* Platform Account Pools */}
        <section className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Account-Pools</h2>
            </div>
            <Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = prompt("Plattform-Name eingeben (z.B. Brezzels):");
                  if (name?.trim()) {
                    setSelectedPlatform(name.trim());
                    setAccountPoolOpen(true);
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Neue Plattform
              </Button>
            </Dialog>
          </div>

          {platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Plattformen angelegt. Erstelle eine neue Plattform oben.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {platforms.map((p) => {
                const pAccounts = accounts.filter((a) => a.platform === p);
                const free = pAccounts.filter((a) => !a.assigned_to).length;
                const assigned = pAccounts.filter((a) => a.assigned_to).length;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPlatform(p);
                      setAccountPoolOpen(true);
                    }}
                    className="glass-card-subtle rounded-xl p-4 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">{p}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {pAccounts.length} Accounts
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="text-green-500">{free} frei</span>
                      <span>{assigned} vergeben</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

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
              {filtered.map((chatter) => {
                const hasAccount = !!(chatter.account_email);
                return (
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
                    {hasAccount && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        <KeyRound className="h-3 w-3 mr-1" />
                        Account
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReassignTarget(chatter)}
                      className="text-foreground hover:text-foreground/80 shrink-0"
                      title="Account ändern"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(chatter)}
                      className="text-destructive hover:text-destructive/80 shrink-0"
                      title="Account entfernen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPushTarget(chatter)}
                      className="text-accent hover:text-accent/80 shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Account Pool Dialog */}
      <Dialog open={accountPoolOpen} onOpenChange={setAccountPoolOpen}>
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedPlatform} – Accounts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new account */}
            <div className="space-y-2 border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground">Neuen Account hinzufügen</p>
              <Input
                value={newAccEmail}
                onChange={(e) => setNewAccEmail(e.target.value)}
                placeholder="E-Mail"
                type="email"
              />
              <Input
                value={newAccPassword}
                onChange={(e) => setNewAccPassword(e.target.value)}
                placeholder="Passwort"
              />
              <Input
                value={newAccDomain}
                onChange={(e) => setNewAccDomain(e.target.value)}
                placeholder="Domain (z.B. brezzels.com)"
              />
              <Button
                onClick={addAccount}
                disabled={addingAccount || !newAccEmail.trim() || !newAccDomain.trim()}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addingAccount ? "Wird hinzugefügt..." : "Account hinzufügen"}
              </Button>
            </div>

            {/* Stats + Assign button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">
                  Gesamt: <span className="text-foreground font-semibold">{platformAccounts.length}</span>
                </span>
                <span className="text-accent">
                  Frei: <span className="font-semibold">{freeCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Vergeben: <span className="font-semibold">{assignedCount}</span>
                </span>
              </div>
              {freeCount > 0 && (
                <Button size="sm" onClick={assignAccounts} disabled={assigning} variant="outline">
                  {assigning ? "Wird zugewiesen..." : "Freie Accounts zuweisen"}
                </Button>
              )}
            </div>

            {/* Account list */}
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {platformAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Noch keine Accounts für {selectedPlatform}.
                </p>
              ) : (
                platformAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground truncate">{acc.account_email}</span>
                      {acc.assigned_to ? (
                        <Badge className="text-[10px] bg-secondary text-secondary-foreground">
                          Vergeben an {getChatterName(acc.assigned_to)}
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-green-500/20 text-green-400">
                          Frei
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Domain: {acc.account_domain} · PW: {acc.account_password}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Push Dialog */}
      <Dialog open={!!pushTarget} onOpenChange={(o) => { if (!o) setPushTarget(null); }}>
        <DialogContent className="glass-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Push an {pushTarget?.group_name || "Chatter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Titel" maxLength={100} />
            <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Nachricht..." maxLength={500} className="min-h-[80px]" />
            <Button onClick={sendIndividualPush} disabled={sending || !pushTitle.trim() || !pushBody.trim()} className="w-full">
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
            <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Titel" maxLength={100} />
            <Textarea value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} placeholder="Nachricht..." maxLength={500} className="min-h-[80px]" />
            <Button onClick={sendBroadcast} disabled={broadcastSending || !broadcastTitle.trim() || !broadcastBody.trim()} className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              {broadcastSending ? "Wird gesendet..." : "An alle senden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account-Daten entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die zugewiesenen Account-Daten von {deleteTarget?.group_name || "diesem Chatter"} werden entfernt und der Account wird wieder freigegeben.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deleteChatter} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Wird entfernt..." : "Account entfernen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
