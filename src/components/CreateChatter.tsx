import React, { useEffect, useState } from "react";
import {
  UserPlus,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  User,
  Copy,
  Package,
  Globe,
  Languages,
  Building2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// --- Types ---
interface Account {
  id: string;
  account_domain: string;
  account_email: string;
  model_language: string;
  model_active: boolean;
}

interface ChatterUser {
  id: string;
  name: string;
  telegram_id: string;
}

const DOMAINS = {
  brezzels: "app.brezzels.com",
  maloum: "app.maloum.com",
  "4based": "www.4based.com",
};

// --- Main Component ---
const ChatterManager = () => {
  const [users, setUsers] = useState<ChatterUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ChatterUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionOpen, setSectionOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", telegramID: "" });

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("chatters").select("*").order("created_at", { ascending: false });

    if (error) toast.error("Failed to load models");
    else setUsers(data || []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.name.trim()) return;

    const { error } = await supabase.from("chatters").insert({
      name: newUser.name.trim(),
      telegram_id: newUser.telegramID.trim(),
    });

    if (error) {
      toast.error("Error creating model");
    } else {
      toast.success("Chatter created successfully");
      setNewUser({ name: "", telegramID: "" });
      fetchUsers();
    }
  };

  const filterAccounts = () => {
    const filtered = users.filter((acc) => {
      if (searchQuery.length > 2) {
        const q = searchQuery.toLowerCase();
        return acc?.name?.toLowerCase()?.includes(q) || acc.telegram_id.toLowerCase().includes(q);
      }
      return true;
    });

    return filtered;
  };

  useEffect(() => {
    const filtered = filterAccounts();
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setSectionOpen(!sectionOpen)}
        >
          <ChevronRight className={cn("h-5 w-5 transition-transform", sectionOpen && "rotate-90")} />
          <h2 className="text-sm font-semibold tracking-tight">Chatter Management</h2>
          <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium text-muted-foreground">{users.length}</span>
        </div>
      </div>

      {/* List System */}
      {sectionOpen && (
        <>
          <div className="flex justify-between">
            {/* search  */}
            <div className="relative w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <div className="input-gold-shimmer rounded-lmd">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chatter suchen…"
                  className="pl-9 bg-secondary/50 border-transparent text-sm h-9"
                />
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add New Chatter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Chatter</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="Model Name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                  <Input
                    type="email"
                    placeholder="Contact Email"
                    value={newUser.telegramID}
                    onChange={(e) => setNewUser({ ...newUser, telegramID: e.target.value })}
                  />
                  <Button className="w-full" onClick={handleCreateUser}>
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="divide-y border rounded-lg overflow-x-auto overflow-y-auto max-h-[300px] sm:max-h-[500px] bg-card">
            {users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No Chatters found.</div>
            ) : (
              filteredUsers.map((user) => <ChatterRow key={user.id} user={user} />)
            )}
          </div>
        </>
      )}
    </div>
  );
};

// --- Sub-component for each List Row ---
const ChatterRow = ({ user }: { user: ChatterUser }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [chatterLoginCreds, setChatterLoginCreds] = useState({
    email: "",
    password: "",
  });
  const [chatterLoginDialog, setChatterLoginDialog] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && accounts.length === 0) {
      setLoading(true);
      const { data } = await supabase.from("accounts").select("*").eq("assigned_to", user.id);
      if (data) setAccounts(data);
      setLoading(false);
    }
  };

  const generateChatterLogin = async () => {
    setLoading(true);
    setChatterLoginCreds(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-chatter-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          chatter_id: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Fehler beim Erstellen");
      } else {
        setChatterLoginCreds({ email: data.email, password: data.password });
        setChatterLoginDialog(true);
        toast.success("Chatter-Login erstellt ✅");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="group transition-colors">
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors",
          isExpanded && "bg-muted/30",
        )}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm leading-none">{user.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{user.telegram_id}</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              Assigned Models
            </span>
            <span className="text-sm font-medium">{accounts.length || 0}</span>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-muted/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex gap-2">
            <AddAccountDialog user={user} onAccountAdded={(newAccs) => setAccounts(newAccs)} />
            <Button onClick={generateChatterLogin} variant="outline" size="sm" className="h-8 text-xs">
              Manage Logins
            </Button>

            <Dialog open={chatterLoginDialog} onOpenChange={setChatterLoginDialog}>
              <DialogContent className="glass-card border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Chatter-Login erstellt</DialogTitle>
                </DialogHeader>
                {chatterLoginCreds && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Sende diese Zugangsdaten an das Chatter. Das Passwort wird nur einmal angezeigt!
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">E-Mail</p>
                          <p className="text-sm font-mono text-foreground truncate">{chatterLoginCreds.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">Passwort</p>
                          <p className="text-sm font-mono text-foreground truncate">{chatterLoginCreds.password}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(`${chatterLoginCreds.email} ${chatterLoginCreds.password}`);
                            toast.success("email und passwort Kopiert!");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Login-URL:{" "}
                      <a className="text-foreground font-mono hover:underline" href={`${window.location.origin}/auth`}>
                        {window.location.origin}/auth
                      </a>
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Add Account Dialog Component ---
const AddAccountDialog = ({ user, onAccountAdded }: { user: ChatterUser; onAccountAdded: (accs: any[]) => void }) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    site: "",
    email: "",
    pass: "",
    folder: "",
    lang: "de",
    agency: "shex",
    platform: "new",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.site) {
      toast.error("Please select a domain");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("accounts").insert({
      parent_model: user.id,
      platform: form.platform,
      account_email: form.email.trim(),
      account_password: form.pass.trim(),
      account_domain: form.site,
      drive_folder_id: form.folder.trim(),
      model_language: form.lang,
      model_active: form.active,
      model_agency: form.agency,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account added successfully");
      const { data } = await supabase.from("accounts").select("*").eq("parent_model", user.id);
      if (data) onAccountAdded(data);
      setOpen(false);
      // Reset form
      setForm({
        site: "",
        email: "",
        pass: "",
        folder: "",
        lang: "de",
        agency: "shex",
        active: true,
        platform: "new",
      });
    }
    setSubmitting(false);
  };

  /**
   * on open, get accounts of count
   */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="h-8 text-xs gap-1">
          <PlusCircle className="h-3 w-3" /> Assign Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span>New Account: {user.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Domain Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              Platform / Domain
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DOMAINS).map(([key, val]) => (
                <Button
                  key={key}
                  type="button"
                  variant={form.site === val ? "default" : "outline"}
                  className={cn("h-9 text-xs", form.site === val && "ring-2 ring-primary ring-offset-2")}
                  onClick={() => setForm({ ...form, site: val })}
                >
                  {key.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Login Email</label>
              <Input
                className="h-9 text-xs"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="model@provider.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Password</label>
              <Input
                className="h-9 text-xs"
                type="text"
                required
                value={form.pass}
                onChange={(e) => setForm({ ...form, pass: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Language & Agency Selectors */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Languages className="h-3 w-3" /> Language
              </label>
              <div className="flex bg-muted rounded-md p-1">
                {["de", "en"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setForm({ ...form, lang: l })}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-semibold rounded transition-all",
                      form.lang === l
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l === "de" ? "🇩🇪 GER" : "🇬🇧 ENG"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Agency
              </label>
              <div className="flex bg-muted rounded-md p-1">
                {["shex", "syn"].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm({ ...form, agency: a })}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-semibold rounded transition-all uppercase",
                      form.agency === a
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drive Folder & Status */}
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Google Drive ID</label>
              <Input
                className="h-9 text-xs font-mono"
                value={form.folder}
                onChange={(e) => setForm({ ...form, folder: e.target.value })}
                placeholder="Folder ID or Link"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Active Status</span>
                <span className="text-[10px] text-muted-foreground">Account is live and monitoring</span>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>

          <Button disabled={submitting || !form.site} className="w-full font-bold">
            {submitting ? "Processing..." : "Create Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChatterManager;
