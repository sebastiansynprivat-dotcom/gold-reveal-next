import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format as formatDate } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, LogOut, Loader2, X, Download, AlertTriangle, CheckCircle2, Timer } from "lucide-react";

interface AccountOption {
  id: string;
  platform: string | null;
  account_email?: string | null;
  username?: string | null;
  archived?: boolean;
}

interface OffboardingRow {
  id: string;
  account_id: string;
  platform: string | null;
  target_date: string;
  status: string;
  archived_at: string | null;
  last_error: string | null;
}

interface StatementFile {
  id: string;
  account_id: string;
  period: string;
  storage_path: string;
  currency: string | null;
  amount: number | null;
}

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const STATUS_LABEL: Record<string, string> = {
  scheduled: "geplant",
  running: "läuft",
  done: "erledigt",
  failed: "fehlgeschlagen",
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-accent/15 text-accent border-accent/30",
  running: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

function useCountdown(targetDate: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(`${targetDate}T00:00:00`).getTime();
  const diff = target - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes };
}

const CountdownLabel = ({ targetDate }: { targetDate: string }) => {
  const cd = useCountdown(targetDate);
  if (!cd) return <span className="text-[10px] text-amber-500 font-medium">Termin erreicht</span>;
  return (
    <span className="text-[10px] text-muted-foreground font-mono">
      noch {cd.days}d {cd.hours}h {cd.minutes}m
    </span>
  );
};

const AccountOffboardingPanel = ({
  modelId,
  accounts,
}: {
  modelId: string;
  accounts: AccountOption[];
}) => {
  const [rows, setRows] = useState<OffboardingRow[]>([]);
  const [files, setFiles] = useState<StatementFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [downloading, setDownloading] = useState<string | null>(null);

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);

  const load = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    const { data: offs } = await (supabase as any)
      .from("account_offboardings")
      .select("id, account_id, platform, target_date, status, archived_at, last_error")
      .eq("model_id", modelId)
      .order("target_date", { ascending: true });
    const list = (offs || []) as OffboardingRow[];
    setRows(list);
    const ids = list.map((r) => r.account_id);
    if (ids.length > 0) {
      const { data: fs } = await (supabase as any)
        .from("offboarding_statement_files")
        .select("id, account_id, period, storage_path, currency, amount")
        .in("account_id", ids)
        .order("period", { ascending: true });
      setFiles((fs || []) as StatementFile[]);
    } else {
      setFiles([]);
    }
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    load();
  }, [load]);

  const openIds = useMemo(
    () => new Set(rows.filter((r) => r.status !== "done").map((r) => r.account_id)),
    [rows],
  );

  const selectable = activeAccounts.filter((a) => !openIds.has(a.id));

  const labelFor = (accId: string, platform: string | null) => {
    const acc = accounts.find((a) => a.id === accId);
    const name = acc?.username || acc?.account_email || `${accId.slice(0, 8)}…`;
    return `${acc?.platform || platform || "?"} · ${name}`;
  };

  const create = async () => {
    if (!accountId || !date) {
      toast.error("Account und Datum auswählen");
      return;
    }
    setSaving(true);
    const acc = accounts.find((a) => a.id === accountId);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("account_offboardings").insert({
      account_id: accountId,
      model_id: modelId,
      platform: acc?.platform ?? null,
      target_date: toYmd(date),
      created_by: userRes?.user?.id ?? null,
    });
    if (error) {
      toast.error(`Fehler: ${error.message}`);
      setSaving(false);
      return;
    }
    // Immediately switch posting + messaging off
    const { error: accErr } = await (supabase as any)
      .from("accounts")
      .update({ post: false, message: false })
      .eq("id", accountId);
    if (accErr) toast.error(`Flags konnten nicht deaktiviert werden: ${accErr.message}`);
    else toast.success("Offboarding geplant – Posting & Nachrichten deaktiviert");
    setAccountId("");
    setDate(undefined);
    setSaving(false);
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await (supabase as any).from("account_offboardings").delete().eq("id", id);
    if (error) {
      toast.error(`Fehler: ${error.message}`);
      return;
    }
    toast.success("Offboarding abgebrochen");
    load();
  };

  const download = async (file: StatementFile, platform: string | null) => {
    setDownloading(file.id);
    try {
      const { data, error } = await supabase.storage
        .from("payout-statements")
        .createSignedUrl(file.storage_path, 60);
      if (error || !data?.signedUrl) throw error || new Error("Kein Link");
      const res = await fetch(data.signedUrl);
      const blob = await res.blob();
      const ext = file.storage_path.split(".").pop() || "pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${platform || "account"}_${file.period}_${toYmd(new Date())}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(`Download fehlgeschlagen: ${e?.message || e}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-lg border border-border/40 bg-secondary/10 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <LogOut className="h-3.5 w-3.5 text-accent" />
        <p className="text-xs font-semibold text-foreground">Offboarding</p>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Account zum Stichtag stilllegen: Posting & Nachrichten werden sofort deaktiviert, Auszahlungsbelege
        täglich gesichert, am Stichtag wird der Account archiviert.
      </p>

      {selectable.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-muted-foreground">Plattform-Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Account wählen" />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {labelFor(a.id, a.platform)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Stichtag</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-full sm:w-[150px] justify-start text-xs gap-1.5">
                  <CalendarIcon className="h-3 w-3" />
                  {date ? formatDate(date, "dd.MM.yyyy", { locale: de }) : "Datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={de} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1 flex flex-col justify-end">
            <Button
              size="sm"
              onClick={create}
              disabled={saving || !accountId || !date}
              className="h-8 text-xs gap-1.5"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
              Offboarding planen
            </Button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => {
            const rowFiles = files.filter((f) => f.account_id === row.account_id);
            const isDone = row.status === "done";
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-lg border p-2.5 space-y-2",
                  isDone ? "border-border/30 bg-secondary/10 opacity-60" : "border-accent/25 bg-accent/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground truncate">
                        {labelFor(row.account_id, row.platform)}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full border font-medium",
                          STATUS_STYLE[row.status] || STATUS_STYLE.scheduled,
                        )}
                      >
                        {STATUS_LABEL[row.status] || row.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatDate(new Date(`${row.target_date}T00:00:00`), "dd.MM.yyyy", { locale: de })}
                      </span>
                      {isDone ? (
                        <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          archiviert
                          {row.archived_at
                            ? ` am ${formatDate(new Date(row.archived_at), "dd.MM.yyyy", { locale: de })}`
                            : ""}
                        </span>
                      ) : (
                        <CountdownLabel targetDate={row.target_date} />
                      )}
                      <span className="text-[10px] text-muted-foreground/70">
                        {rowFiles.length} Beleg{rowFiles.length !== 1 ? "e" : ""} gesichert
                      </span>
                    </div>
                    {row.last_error && (
                      <p className="text-[10px] text-destructive flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-[1px] shrink-0" />
                        {row.last_error}
                      </p>
                    )}
                  </div>
                  {!isDone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancel(row.id)}
                      className="h-7 text-[10px] gap-1 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <X className="h-3 w-3" />
                      Abbrechen
                    </Button>
                  )}
                </div>

                {rowFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                    {rowFiles.map((f) => (
                      <Button
                        key={f.id}
                        size="sm"
                        variant="outline"
                        disabled={downloading === f.id}
                        onClick={() => download(f, row.platform)}
                        className="h-6 text-[10px] gap-1 px-2"
                      >
                        {downloading === f.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {f.period}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AccountOffboardingPanel;
