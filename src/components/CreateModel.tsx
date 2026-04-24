import React, { useEffect, useState } from "react";
import {
  UserPlus,
  ChevronRight,
  ChevronDown,
  CreditCard,
  PlusCircle,
  User,
  Copy,
  Eye,
  EyeOff,
  Package,
  Plus,
  Globe,
  Languages,
  Building2,
  Edit,
  Trash2,
  CircleX,
  CircleCheck,
  CircleEllipsis,
  CircleDot,
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
  platform: string;
  account_domain: string;
  account_email: string;
  account_password: string;
  drive_folder_id: string;
  model_language: string;
  model_active: boolean;
  model_agency: string;
  ping: string;
}

interface ModelUser {
  id: string;
  name: string;
  email?: string | null;
  accounts?: Account[];
}

const DOMAINS = {
  brezzels: "app.brezzels.com",
  maloum: "app.maloum.com",
  "4based": "www.4based.com",
};

// --- Main Component ---
const ModelManager = () => {
  const [users, setUsers] = useState<ModelUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ModelUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionOpen, setSectionOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "" });

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("models").select("*").order("created_at", { ascending: false });

    if (error) toast.error("Failed to load models");
    else setUsers((data || []) as any);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.name.trim()) return;

    const { error } = await supabase.from("models").insert({
      name: newUser.name.trim(),
      email: newUser.email.trim(),
    });

    if (error) {
      toast.error("Error creating model");
    } else {
      toast.success("Model created successfully");
      setNewUser({ name: "", email: "" });
      fetchUsers();
    }
  };

  const filterAccounts = () => {
    const filtered = users.filter((acc) => {
      if (searchQuery.length > 2) {
        const q = searchQuery.toLowerCase();
        return acc?.email?.toLowerCase()?.includes(q) || acc.name.toLowerCase().includes(q);
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
          <h2 className="text-sm font-semibold tracking-tight">Model Management</h2>
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
                  placeholder="Model suchen…"
                  className="pl-9 bg-secondary/50 border-transparent text-sm h-9"
                />
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add Model
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Model</DialogTitle>
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
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                  <Button className="w-full" onClick={handleCreateUser}>
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="divide-y border rounded-lg overflow-x-auto overflow-y-auto w-auto max-h-[300px] sm:max-h-[500px] bg-card">
            {users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No models found.</div>
            ) : (
              filteredUsers.map((user) => <ModelRow key={user.id} user={user} />)
            )}
          </div>
        </>
      )}
    </div>
  );
};

// --- Sub-component for each List Row ---
const ModelRow = ({ user }: { user: ModelUser }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modelLoginCreds, setModelLoginCreds] = useState({
    email: "",
    password: "",
  });
  const [modelLoginDialog, setModelLoginDialog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);

  const toggleExpand = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && accounts.length === 0) {
      setLoading(true);
      const { data } = await supabase.from("accounts").select("*").eq("model_id", user.id);
      if (data) {
        setAccounts(data as any);
      }
      setLoading(false);
    }
  };

  const handleDelete = async (userID: string) => {
    const { error } = await supabase.from("accounts").delete().eq("id", userID);
    if (error) {
      toast.error("delete failed");
      return;
    }
    const { data } = await supabase.from("accounts").select("*").eq("model_id", user.id);
    if (data) {
      setAccounts(data as any);
    }
  };

  const handlePing = async (userID: string) => {
    setPingLoading(true);

    try {
      // 2. Use a Promise to actually wait inside an async function
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Run your actual logic here
      // const pingUpdated =
      setAccounts(accounts.map((x) => (x.id === userID ? { ...x, ping: "active" } : x)));
    } catch (error: any) {
      console.error(error.message);
      toast.error("Ping failed");
    } finally {
      // 3. Always turn off loading
      setPingLoading(false);
    }
  };

  const generateModelLogin = async () => {
    setLoading(true);
    setModelLoginCreds(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-model-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          account_id: user.id,
          email: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Fehler beim Erstellen");
      } else {
        setModelLoginCreds({ email: data.email, password: data.password });
        setModelLoginDialog(true);
        toast.success("Model-Login erstellt ✅");
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
            <div className="font-medium text-sm leading-none">{user.name.toUpperCase()}</div>
            <div className="text-xs text-muted-foreground mt-1">{user.email || ""}</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Accounts</span>
            <span className="text-sm font-medium">{accounts.length || 0}</span>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
          />
        </div>
      </div>

      {/* Accounts  */}
      {isExpanded && (
        <div className="px-1 sm:px-2 pb-4 pt-2 bg-muted/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 gap-2 overflow-x-auto">
            {loading ? (
              <div className="text-xs text-muted-foreground py-2">Loading accounts...</div>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-center justify-between py-1 px-2 rounded border bg-background text-xs w-auto"
                >
                  {/* accounts details  */}
                  <div className="flex items-center justify-start gap-2 ">
                    <Globe className="h-3 w-3 text-muted-foreground hidden md:inline" />
                    <span className="font-semibold">{acc.platform.toUpperCase()}</span>
                    <span className="text-muted-foreground hidden sm:hidden md:inline">|</span>
                    <a href={acc.account_domain} className="font-semibold hover:underline hidden md:inline">
                      {acc.account_domain}
                    </a>
                    <span className="text-muted-foreground ">|</span>
                    <span>{acc.account_email}</span>
                    <span className="text-muted-foreground hidden sm:hidden ">|</span>
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full hidden sm:hidden",
                        acc.model_active ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-zinc-400",
                      )}
                    />
                  </div>

                  {/* account actions  */}
                  <div className="flex items-center gap-2">
                    {/* edit check-creds delete */}

                    <AddAccountDialog
                      user={user}
                      account={acc}
                      addOrEdit="edit"
                      onAccountAdded={(newAccs) => setAccounts(newAccs)}
                      onAccountEdited={(newAccs) => setAccounts(newAccs)}
                    />
                    <span className="text-muted-foreground">|</span>

                    <Trash2
                      onClick={() => {
                        handleDelete(acc.id);
                      }}
                      className="cursor-pointer h-4 w-4 text-muted-foreground text-red-500"
                    />
                    <span className="text-muted-foreground">|</span>

                    {pingLoading ? (
                      <CircleEllipsis
                        className={`cursor-pointer h-4 w-4 text-muted-foreground ${acc.ping ? "hidden" : ""}`}
                      />
                    ) : (
                      <CircleDot
                        onClick={() => handlePing(acc.id)}
                        className={`cursor-pointer h-4 w-4 text-muted-foreground ${acc.ping ? "hidden" : ""}`}
                      />
                    )}
                    {acc.ping == "active" ? (
                      <CircleCheck
                        className={`cursor-pointer h-4 w-4 text-muted-foreground text-cyan-500 ${!acc.ping ? "hidden" : ""}`}
                      />
                    ) : acc.ping == "inactive" ? (
                      <CircleX
                        className={`cursor-pointer h-4 w-4 text-muted-foreground text-red-500 ${!acc.ping ? "hidden" : ""}`}
                      />
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <AddAccountDialog
              user={user}
              account={null}
              addOrEdit="add"
              onAccountAdded={(newAccs) => setAccounts(newAccs)}
              onAccountEdited={(newAccs) => setAccounts(newAccs)}
            />
            <Button onClick={generateModelLogin} variant="outline" size="sm" className="h-8 text-xs">
              Manage Logins
            </Button>

            <Dialog open={modelLoginDialog} onOpenChange={setModelLoginDialog}>
              <DialogContent className="glass-card border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Model-Login erstellt</DialogTitle>
                </DialogHeader>
                {modelLoginCreds && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Sende diese Zugangsdaten an das Model. Das Passwort wird nur einmal angezeigt!
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">E-Mail</p>
                          <p className="text-sm font-mono text-foreground truncate">{modelLoginCreds.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">Passwort</p>
                          <p className="text-sm font-mono text-foreground truncate">{modelLoginCreds.password}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(`${modelLoginCreds.email} ${modelLoginCreds.password}`);
                            toast.success("email und passwort Kopiert!");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Login-URL:{" "}
                      <a
                        className="text-foreground font-mono hover:underline"
                        href={`${window.location.origin}/model/login`}
                      >
                        {window.location.origin}/model/login
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
const AddAccountDialog = ({
  user,
  account,
  addOrEdit,
  onAccountAdded,
  onAccountEdited,
}: {
  user: ModelUser;
  account: Account;
  addOrEdit: string;
  onAccountAdded: (accs: any[]) => void;
  onAccountEdited: (accs: any[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(
    addOrEdit == "add"
      ? {
          site: "",
          email: "",
          pass: "",
          folder: "",
          lang: "de",
          agency: "shex",
          platform: "new",
          active: true,
        }
      : {
          site: account.account_domain,
          email: account.account_email,
          pass: account.account_password,
          folder: account.drive_folder_id,
          lang: account.model_language,
          agency: account.model_agency,
          platform: account.platform,
          active: account.model_active,
        },
  );

  useEffect(() => {
    setForm(
      addOrEdit == "add"
        ? {
            site: "",
            email: "",
            pass: "",
            folder: "",
            lang: "de",
            agency: "shex",
            platform: "new",
            active: true,
          }
        : {
            site: account.account_domain,
            email: account.account_email,
            pass: account.account_password,
            folder: account.drive_folder_id,
            lang: account.model_language,
            agency: account.model_agency,
            platform: account.platform,
            active: account.model_active,
          },
    );
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.site) {
      toast.error("Please select a domain");
      return;
    }

    if (addOrEdit === "add") {
      await handleAdd();
    } else {
      await handleEdit();
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    const { data: edited, error } = await supabase
      .from("accounts")
      .update({
        model_id: user.id,
        platform: form.platform,
        account_email: form.email.trim(),
        account_password: form.pass.trim(),
        account_domain: form.site,
        drive_folder_id: form.folder.trim(),
        model_language: form.lang,
        model_active: form.active,
        model_agency: form.agency,
      })
      .eq("id", account.id)
      .select()
      .single();

    console.log(edited);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account Edited successfully");
      const { data } = await supabase.from("accounts").select("*").eq("model_id", user.id);
      if (data) onAccountEdited(data);
      setOpen(false);
      // Reset form
      setForm({
        site: edited.account_domain,
        email: edited.account_email,
        pass: edited.account_password,
        folder: edited.drive_folder_id,
        lang: edited.model_language,
        agency: edited.model_agency,
        platform: edited.platform,
        active: edited.model_active,
      });
    }
    setSubmitting(false);
  };

  const handleAdd = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("accounts").insert({
      model_id: user.id,
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
      const { data } = await supabase.from("accounts").select("*").eq("model_id", user.id);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {addOrEdit === "add" ? (
          <Button variant="secondary" size="sm" className="h-8 text-xs gap-1">
            <PlusCircle className="h-3 w-3" /> Add Account
          </Button>
        ) : addOrEdit === "edit" ? (
          <Edit className="cursor-pointer h-4 w-4 text-muted-foreground text-blue-500" />
        ) : (
          ""
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span>
              {addOrEdit == "add" ? "New Account" : "Edit Account"} {user.name}
            </span>
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

            <div className="flex items-center justify-end gap-3 px-1">
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Active Status</span>
                {/* <span className="text-[10px] text-muted-foreground">
                  Account is live and monitoring
                </span> */}
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>

          <Button disabled={submitting || !form.site} className="w-full font-bold">
            {submitting ? "Processing..." : addOrEdit === "add" ? "Create Account" : "Edit Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModelManager;
