import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format as formatDate } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertTriangle, CheckCircle2, ChevronDown, Download, ExternalLink, Loader2, LogOut, RefreshCw, Search, Timer, X,
} from "lucide-react";

interface Row {
  id: string;
  account_id: string;
  model_id: string | null;
  platform: string | null;
  target_date: string;
  status: string;
  archived_at: string | null;
  last_run_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  modelLabel: string;
  accountLabel: string;
  archivedAccount: boolean;
  chatterLabel: string | null;
  creatorLabel: string | null;
}

interface FileRow {
  id: string;
  account_id: string;
  period: string;
  storage_path: string;
  currency: string | null;
  amount: number | null;
  pending: boolean | null;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "geplant", running: "läuft", done: "erledigt", failed: "fehlgeschlagen",
};
const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-accent/15 text-accent border-accent/30",
  running: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDate = (s: string | null) => (s ? formatDate(new Date(s), "dd.MM.yyyy HH:mm", { locale: de }) : "–");

const countdown = (target: string, now: number) => {
  const diff = new Date(`${target}T00:00:00`).getTime() - now;
  if (diff <= 0) return null;
  return {
    text: `noch ${Math.floor(diff / 86_400_000)}d ${Math.floor((diff % 86_400_000) / 3_600_000)}h ${Math.floor((diff % 3_600_000) / 60_000)}m`,
    days: diff / 86_400_000,
  };
};

const OffboardingTab = ({ onOpenModel, initialOpenId }: { onOpenModel: (modelId: string) => void; initialOpenId?: string | null }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState<"target" | "created">("target");
  const [openId, setOpenId] = useState<string | null>(initialOpenId || null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = supabase as any;
    const { data: offs, error } = await sb
      .from("account_offboardings")
      .select("id, account_id, model_id, platform, target_date, status, archived_at, last_run_at, last_error, created_by, created_at");
    if (error) {
      toast.error(`Fehler: ${error.message}`);
      setLoading(false);
      return;
    }
    const list = (offs || []) as any[];
    const modelIds = [...new Set(list.map((r) => r.model_id).filter(Boolean))];
    const accIds = [...new Set(list.map((r) => r.account_id).filter(Boolean))];
    const creatorIds = [...new Set(list.map((r) => r.created_by).filter(Boolean))];
    const none = Promise.resolve({ data: [] });
    const [m, a, d, c, f] = await Promise.all([
      modelIds.length ? sb.from("models").select("id, username, name").in("id", modelIds) : none,
      accIds.length ? sb.from("accounts").select("id, platform, username, account_email, assigned_to").in("id", accIds) : none,
      accIds.length ? sb.from("deleted_records").select("original_id, name, data").in("original_id", accIds) : none,
      creatorIds.length ? sb.from("admin_profiles").select("user_id, display_name").in("user_id", creatorIds) : none,
      accIds.length
        ? sb.from("offboarding_statement_files").select("id, account_id, period, storage_path, currency, amount, pending").in("account_id", accIds).order("period")
        : none,
    ]);
    const modelMap = new Map((m.data || []).map((x: any) => [x.id, x]));
    const accMap = new Map((a.data || []).map((x: any) => [x.id, x]));
    const delMap = new Map((d.data || []).map((x: any) => [x.original_id, x]));
    const creatorMap = new Map((c.data || []).map((x: any) => [x.user_id, x.display_name]));
    const chatterIds = [...new Set((a.data || []).map((x: any) => x.assigned_to).filter(Boolean))];
    const { data: chatters } = chatterIds.length
      ? await sb.from("profiles").select("user_id, name").in("user_id", chatterIds)
      : { data: [] };
    const chatterMap = new Map((chatters || []).map((x: any) => [x.user_id, x.name]));

    setRows(
      list.map((r) => {
        const acc: any = accMap.get(r.account_id);
        const del: any = delMap.get(r.account_id);
        const dd = del?.data || {};
        const mod: any = modelMap.get(r.model_id);
        return {
          ...r,
          platform: acc?.platform || r.platform || dd.platform || null,
          modelLabel: mod?.username || mod?.name || "Unbekanntes Model",
          accountLabel: acc?.username || acc?.account_email || dd.username || dd.account_email || del?.name || `${String(r.account_id).slice(0, 8)}…`,
          archivedAccount: !acc,
          chatterLabel: acc?.assigned_to ? String(chatterMap.get(acc.assigned_to) || "Chatter") : null,
          creatorLabel: r.created_by ? String(creatorMap.get(r.created_by) || `${r.created_by.slice(0, 8)}…`) : null,
        } as Row;
      }),
    );
    setFiles((f.data || []) as FileRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!initialOpenId || rows.length === 0) return;
    const hit = rows.find((r) => r.id === initialOpenId);
    if (hit) setOpenGroup(hit.model_id || `label:${hit.modelLabel}`);
    document.getElementById(`offboarding-${initialOpenId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialOpenId, rows.length]);

  const platforms = useMemo(
    () => [...new Set(rows.map((r) => r.platform).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (status === "open" && r.status === "done") return false;
        if (status !== "all" && status !== "open" && r.status !== status) return false;
        if (platform !== "all" && r.platform !== platform) return false;
        if (s && ![r.modelLabel, r.accountLabel, r.platform || ""].some((v) => v.toLowerCase().includes(s))) return false;
        return true;
      })
      .sort((x, y) =>
        sort === "target"
          ? x.target_date.localeCompare(y.target_date)
          : y.created_at.localeCompare(x.created_at),
      );
  }, [rows, q, status, platform, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; modelId: string | null; rows: Row[] }>();
    for (const r of filtered) {
      const key = r.model_id || `label:${r.modelLabel}`;
      if (!map.has(key)) map.set(key, { key, label: r.modelLabel, modelId: r.model_id, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.values()];
  }, [filtered]);

  const cancel = async (id: string) => {
    const { error } = await (supabase as any).from("account_offboardings").delete().eq("id", id);
    if (error) return toast.error(`Fehler: ${error.message}`);
    toast.success("Offboarding abgebrochen");
    load();
  };

  const [recovering, setRecovering] = useState<string | null>(null);
  const recover = async (id: string) => {
    setRecovering(id);
    const { data, error } = await supabase.functions.invoke("process-offboardings", { body: { offboarding_id: id } });
    setRecovering(null);
    if (error) return toast.error(`Fehler: ${error.message}`);
    const res = data?.results?.[0];
    if (res?.error) toast.error(res.error);
    else if (res?.saved) toast.success(`${res.saved} Beleg(e) gesichert`);
    else toast.info(res?.note || "Keine neuen Belege verfügbar");
    load();
  };

  const download = async (file: FileRow, plat: string | null) => {
    setDownloading(file.id);
    try {
      const { data, error } = await supabase.storage.from("payout-statements").createSignedUrl(file.storage_path, 60);
      if (error || !data?.signedUrl) throw error || new Error("Kein Link");
      const blob = await (await fetch(data.signedUrl)).blob();
      const ext = file.storage_path.split(".").pop() || "pdf";
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = `${plat || "account"}_${file.period}_${toYmd(new Date())}.${ext}`;
      document.body.appendChild(el);
      el.click();
      el.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(`Download fehlgeschlagen: ${e?.message || e}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LogOut className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground">Offboarding</h2>
        <span className="text-xs text-muted-foreground">({filtered.length} / {rows.length})</span>
        <Button size="sm" variant="ghost" className="ml-auto h-8 gap-1.5 text-xs" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Aktualisieren
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_160px_160px_170px] gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Model, Account oder Plattform suchen" className="h-9 pl-8 text-xs" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Alle Status</SelectItem>
            <SelectItem value="open" className="text-xs">Offen</SelectItem>
            <SelectItem value="scheduled" className="text-xs">geplant</SelectItem>
            <SelectItem value="running" className="text-xs">läuft</SelectItem>
            <SelectItem value="failed" className="text-xs">fehlgeschlagen</SelectItem>
            <SelectItem value="done" className="text-xs">erledigt</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Alle Plattformen</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="target" className="text-xs">Stichtag (nächster zuerst)</SelectItem>
            <SelectItem value="created" className="text-xs">Neueste zuerst</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Keine Offboardings gefunden.</p>
      )}

      <div className="space-y-4">
        {groups.map((g) => {
          const gOpen = openGroup === g.key;
          const allDone = g.rows.every((r) => r.status === "done");
          const hasError = g.rows.some((r) => r.last_error);
          const nextDate = [...g.rows].map((r) => r.target_date).sort()[0];
          const fileCount = files.filter((f) => g.rows.some((r) => r.account_id === f.account_id)).length;
          return (
          <div key={g.key} className={cn("rounded-xl border transition-colors", allDone ? "border-border/30 bg-secondary/10" : "border-accent/25 bg-accent/5", gOpen && "p-2 space-y-2")}>
            <button type="button" onClick={() => setOpenGroup(gOpen ? null : g.key)} className="w-full text-left p-3 flex items-center gap-3">
              <div className={cn("min-w-0 flex-1 space-y-1", allDone && "opacity-70")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{g.label}</span>
                  {[...new Set(g.rows.map((r) => r.platform || "?"))].map((p) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground">{p}</span>
                  ))}
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", allDone ? STATUS_STYLE.done : STATUS_STYLE.scheduled)}>
                    {allDone ? "erledigt" : "offen"}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {formatDate(new Date(`${nextDate}T00:00:00`), "dd.MM.yyyy", { locale: de })}
                  </span>
                  <span>{g.rows.length} Account{g.rows.length !== 1 ? "s" : ""}</span>
                  <span>{fileCount} Beleg{fileCount !== 1 ? "e" : ""} gesichert</span>
                  {hasError && <AlertTriangle className="h-3 w-3 text-destructive" />}
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", gOpen && "rotate-180")} />
            </button>
            {gOpen && g.modelId && (
              <div className="px-1">
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => onOpenModel(g.modelId!)}>
                  <ExternalLink className="h-3 w-3" /> Model-Karte öffnen
                </Button>
              </div>
            )}
        {gOpen && g.rows.map((r) => {
          const rf = files.filter((f) => f.account_id === r.account_id);
          const isDone = r.status === "done";
          const cd = countdown(r.target_date, now);
          const expanded = openId === r.id;
          const warnChatter = !isDone && r.chatterLabel && (!cd || cd.days < 3);
          return (
            <div
              key={r.id}
              id={`offboarding-${r.id}`}
              className={cn(
                "rounded-lg border transition-colors",
                isDone ? "border-border/30 bg-secondary/10" : "border-accent/25 bg-accent/5",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : r.id)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <div className={cn("min-w-0 flex-1 space-y-1", isDone && "opacity-70")}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{r.modelLabel}</span>
                    <span className="text-xs text-muted-foreground">{r.platform || "?"} · {r.accountLabel}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_STYLE[r.status] || STATUS_STYLE.scheduled)}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {formatDate(new Date(`${r.target_date}T00:00:00`), "dd.MM.yyyy", { locale: de })}
                    </span>
                    {isDone ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> archiviert {r.archived_at ? `am ${formatDate(new Date(r.archived_at), "dd.MM.yyyy", { locale: de })}` : ""}
                      </span>
                    ) : cd ? (
                      <span className="font-mono">{cd.text}</span>
                    ) : (
                      <span className="text-amber-500">Termin erreicht</span>
                    )}
                    <span>{rf.length} Beleg{rf.length !== 1 ? "e" : ""} gesichert</span>
                    {r.last_error && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              </button>

              {expanded && (
                <div className="border-t border-border/30 p-3 space-y-3">
                  {warnChatter && (
                    <p className="text-xs text-destructive flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/30 px-2 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Achtung: {r.chatterLabel} ist noch diesem Account zugewiesen – bitte wechseln.
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <Detail label="Angelegt von" value={r.creatorLabel || "–"} />
                    <Detail label="Angelegt am" value={fmtDate(r.created_at)} />
                    <Detail label="Letzter Lauf" value={fmtDate(r.last_run_at)} />
                    <Detail label="Zugewiesener Chatter" value={r.chatterLabel || "–"} />
                    <Detail label="Account" value={r.archivedAccount ? `${r.accountLabel} (archiviert)` : r.accountLabel} />
                    <Detail label="Archiviert am" value={fmtDate(r.archived_at)} />
                  </div>
                  {r.last_error && (
                    <p className="text-xs text-destructive flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-[1px] shrink-0" /> {r.last_error}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Auszahlungsbelege</p>
                    {rf.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Noch keine Belege gesichert.</p>
                    ) : (
                      <div className="rounded-md border border-border/30 divide-y divide-border/30">
                        {rf.map((f) => (
                          <div key={f.id} className="flex items-center gap-3 px-2.5 py-1.5 text-xs">
                            <span className="font-mono w-16">{f.period}</span>
                            <span className="flex-1 text-muted-foreground">
                              {f.amount != null ? `${Number(f.amount).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${f.currency || ""}` : "–"}
                            </span>
                            {f.pending && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-500">Ausstehend</span>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={downloading === f.id} onClick={() => download(f, r.platform)}>
                              {downloading === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              Herunterladen
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" disabled={recovering === r.id} onClick={() => recover(r.id)}>
                      {recovering === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Belege nachladen
                    </Button>
                    {r.model_id && (
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => onOpenModel(r.model_id!)}>
                        <ExternalLink className="h-3.5 w-3.5" /> Model-Karte öffnen
                      </Button>
                    )}
                    {!isDone && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10" onClick={() => cancel(r.id)}>
                        <X className="h-3.5 w-3.5" /> Abbrechen
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
          </div>
          );
        })}
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-secondary/20 px-2.5 py-1.5">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-foreground truncate">{value}</p>
  </div>
);

export default OffboardingTab;
