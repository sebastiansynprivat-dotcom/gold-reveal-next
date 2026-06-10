import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { UserPlus, Search, Loader2, CalendarIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  onAssigned: (info: { chatter: ChatterLite; assignedAt: string }) => void;
}

export default function AssignAccountToChatterButton({ account, chatters, onAssigned }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ChatterLite | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? chatters.filter(
          (c) =>
            (c.group_name || "").toLowerCase().includes(q) ||
            (c.telegram_id || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q),
        )
      : chatters;
  }, [chatters, query]);

  const reset = () => {
    setSelected(null);
    setQuery("");
    setStartDate(new Date());
  };

  const assign = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const startStr = format(startDate, "yyyy-MM-dd");
      const assignedAt = new Date().toISOString();

      // 1) Set account.assigned_to (triggers track_account_assignment with current_date)
      const { error: accErr } = await supabase
        .from("accounts")
        .update({ assigned_to: selected.user_id, assigned_at: assignedAt })
        .eq("id", account.id);
      if (accErr) throw accErr;

      // 2) Override start_date on the newly opened assignment row
      const { error: aaErr } = await supabase
        .from("account_assignments")
        .update({ start_date: startStr })
        .eq("account_id", account.id)
        .eq("user_id", selected.user_id)
        .is("end_date", null);
      if (aaErr) console.warn("start_date override failed:", aaErr.message);

      // 3) Mirror credentials to profile
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          account_email: account.account_email,
          account_password: account.account_password,
          account_domain: account.account_domain,
        })
        .eq("user_id", selected.user_id);
      if (profErr) console.warn("Profile mirror failed:", profErr.message);

      // 4) Share Drive folder (best-effort)
      if (account.drive_folder_id && selected.email) {
        try {
          await supabase.functions.invoke("share-drive", {
            body: { folder_id: account.drive_folder_id, email: selected.email },
          });
        } catch (e) {
          console.warn("Drive share failed:", e);
        }
      }

      toast.success(
        `Account zugewiesen an ${selected.group_name || selected.telegram_id || "Chatter"} · ab ${format(startDate, "dd.MM.yyyy")}`,
      );
      const assignedChatter = selected;
      setOpen(false);
      reset();
      onAssigned({ chatter: assignedChatter, assignedAt });
    } catch (err: any) {
      toast.error("Zuweisung fehlgeschlagen: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
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
      <PopoverContent align="end" className="w-80 p-2 glass-card">
        {!selected ? (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Chatter suchen (${chatters.length})...`}
                className="pl-7 h-8 text-xs"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-3">Keine Chatter gefunden</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => setSelected(c)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/10 transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground truncate">
                      {c.group_name || c.telegram_id || c.email || c.user_id.slice(0, 8)}
                    </p>
                    {c.email && c.group_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> zurück
            </button>
            <div className="px-2 py-1.5 rounded-md bg-accent/5 border border-accent/20">
              <p className="text-[10px] text-muted-foreground">Chatter</p>
              <p className="text-xs font-medium text-foreground truncate">
                {selected.group_name || selected.telegram_id || selected.email}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Startdatum</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 w-full justify-start text-xs font-normal"
                  >
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {format(startDate, "dd.MM.yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={assign}
              disabled={busy}
              size="sm"
              className="w-full h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Zuweisen"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
