import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react";

type AccountRow = {
  id: string;
  platform: string | null;
  account_email: string | null;
  account_domain: string | null;
  account_password: string | null;
};

export default function ModelPasswordDialog({
  open,
  onOpenChange,
  modelId,
  modelLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modelId: string | null;
  modelLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !modelId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase.from("accounts") as any)
        .select("id, platform, account_email, account_domain, account_password")
        .eq("model_id", modelId)
        .order("platform", { ascending: true });
      if (!active) return;
      if (error) toast.error("Konnte Zugangsdaten nicht laden");
      setRows((data as AccountRow[]) || []);
      setDrafts({});
      setReveal({});
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, modelId]);

  const save = async (row: AccountRow) => {
    const next = (drafts[row.id] ?? "").trim();
    if (!next) return;
    setSaving(row.id);
    const { error } = await (supabase.from("accounts") as any)
      .update({ account_password: next })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, account_password: next } : r)));
    setDrafts((prev) => ({ ...prev, [row.id]: "" }));
    toast.success(`${row.platform || "Account"}: Passwort aktualisiert ✅`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-accent" />
            Passwörter {modelLabel ? `· ${modelLabel}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Lade Zugangsdaten…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Keine Plattform-Accounts für dieses Model hinterlegt.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-accent/15 bg-card p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="border-accent/40 text-accent text-[10px]">
                    {r.platform || r.account_domain || "Account"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {r.account_email || "—"}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Aktuelles Passwort</Label>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-xs px-2 py-1.5 rounded-md bg-secondary/40 text-foreground truncate">
                      {r.account_password
                        ? reveal[r.id]
                          ? r.account_password
                          : "••••••••••••"
                        : "— nicht hinterlegt —"}
                    </code>
                    {r.account_password && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setReveal((p) => ({ ...p, [r.id]: !p[r.id] }))}
                        >
                          {reveal[r.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            navigator.clipboard.writeText(r.account_password || "");
                            toast.success("Passwort kopiert");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Neues Passwort</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={drafts[r.id] ?? ""}
                      onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save(r);
                      }}
                      placeholder="neues Passwort eingeben"
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-2.5"
                      disabled={!(drafts[r.id] ?? "").trim() || saving === r.id}
                      onClick={() => save(r)}
                    >
                      {saving === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
