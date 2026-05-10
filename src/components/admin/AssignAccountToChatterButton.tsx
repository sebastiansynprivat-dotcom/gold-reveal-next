import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatterLite {
  user_id: string;
  group_name?: string | null;
  telegram_id?: string | null;
  email?: string | null;
}

interface Account {
  id: string;
  account_email: string;
  account_password: string;
  account_domain: string;
  drive_folder_id?: string | null;
}

interface Props {
  account: Account;
  chatters: ChatterLite[];
  onAssigned: () => void;
}

export default function AssignAccountToChatterButton({ account, chatters, onAssigned }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? chatters.filter(
          (c) =>
            (c.group_name || "").toLowerCase().includes(q) ||
            (c.telegram_id || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q),
        )
      : chatters;
    return list.slice(0, 100);
  }, [chatters, query]);

  const assign = async (chatter: ChatterLite) => {
    setBusyId(chatter.user_id);
    try {
      // 1) Set account.assigned_to
      const { error: accErr } = await supabase
        .from("accounts")
        .update({ assigned_to: chatter.user_id, assigned_at: new Date().toISOString() })
        .eq("id", account.id);
      if (accErr) throw accErr;

      // 2) Mirror credentials to profile
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          account_email: account.account_email,
          account_password: account.account_password,
          account_domain: account.account_domain,
        })
        .eq("user_id", chatter.user_id);
      if (profErr) console.warn("Profile mirror failed:", profErr.message);

      // 3) Share Drive folder via edge function (best-effort)
      if (account.drive_folder_id && chatter.email) {
        try {
          await supabase.functions.invoke("share-drive", {
            body: { folder_id: account.drive_folder_id, email: chatter.email },
          });
        } catch (e) {
          console.warn("Drive share failed:", e);
        }
      }

      toast.success(`Account zugewiesen an ${chatter.group_name || chatter.telegram_id || "Chatter"}`);
      setOpen(false);
      setQuery("");
      onAssigned();
    } catch (err: any) {
      toast.error("Zuweisung fehlgeschlagen: " + err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-accent"
          title="An Chatter zuweisen"
        >
          <UserPlus className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2 glass-card">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chatter suchen..."
            className="pl-7 h-8 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">Keine Chatter gefunden</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.user_id}
                onClick={() => assign(c)}
                disabled={busyId !== null}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/10 transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {c.group_name || c.telegram_id || c.email || c.user_id.slice(0, 8)}
                  </p>
                  {c.email && c.group_name && (
                    <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                  )}
                </div>
                {busyId === c.user_id && <Loader2 className="h-3 w-3 animate-spin text-accent shrink-0" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
