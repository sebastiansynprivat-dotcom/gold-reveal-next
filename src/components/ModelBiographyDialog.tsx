import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  modelName?: string;
}

interface BioResponse {
  html: string | null;
  file_name?: string;
  modified_time?: string;
  fetched_at?: string;
  source?: string;
  reason?: "not_found" | "no_drive_folder";
  error?: string;
}

export default function ModelBiographyDialog({ open, onOpenChange, modelId, modelName }: Props) {
  const [data, setData] = useState<BioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke<BioResponse>(
        "get-model-biography",
        { body: { model_id: modelId, force_refresh: force } },
      );
      if (err) throw err;
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && modelId) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modelId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              Biographie {modelName ? `· ${modelName}` : ""}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => load(true)}
              disabled={loading}
              className="h-7 text-[11px] gap-1"
              title="Aus Drive neu laden"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading && !data ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lade Biographie…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : data?.reason === "no_drive_folder" ? (
            <div className="rounded-lg border border-border/40 bg-secondary/30 p-4 text-sm text-muted-foreground">
              Für dieses Model ist noch kein Drive-Ordner hinterlegt.
            </div>
          ) : data?.reason === "not_found" || !data?.html ? (
            <div className="rounded-lg border border-border/40 bg-secondary/30 p-4 text-sm text-muted-foreground">
              Keine Biographie-Datei im Drive-Ordner gefunden. Sie sollte „Biographie" im Dateinamen
              enthalten.
            </div>
          ) : (
            <div
              className="biography-content prose prose-sm prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: data.html }}
            />
          )}
        </div>

        {data?.file_name && (
          <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground flex items-center justify-between gap-2">
            <span className="truncate">{data.file_name}</span>
            <span>
              {data.source === "drive" ? "Frisch aus Drive" : "Cache"}
              {data.fetched_at &&
                ` · ${new Date(data.fetched_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}`}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
