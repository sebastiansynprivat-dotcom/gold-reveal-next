import { useEffect, useState } from "react";
import { Download, Image as ImageIcon, Film, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RequestAttachment } from "./RequestMediaPicker";

interface Props {
  attachments: RequestAttachment[];
  /** Compact thumbnails (used inside chat bubbles). */
  size?: "sm" | "md";
}

interface Resolved extends RequestAttachment {
  url: string;
}

const RequestMediaList = ({ attachments, size = "md" }: Props) => {
  const [resolved, setResolved] = useState<Resolved[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!attachments || attachments.length === 0) {
      setResolved([]);
      return;
    }
    setLoading(true);
    (async () => {
      const out: Resolved[] = [];
      for (const att of attachments) {
        const { data } = await supabase.storage
          .from("request-media")
          .createSignedUrl(att.path, 60 * 60); // 1h
        if (data?.signedUrl) out.push({ ...att, url: data.signedUrl });
      }
      if (!cancelled) {
        setResolved(out);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(attachments)]);

  const handleDownload = async (att: Resolved) => {
    setBusy(att.path);
    try {
      const { data, error } = await supabase.storage.from("request-media").download(att.path);
      if (error || !data) throw error || new Error("no data");
      const objUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = att.name || att.path.split("/").pop() || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
    } catch {
      // Fallback: open the signed URL so the user can save it manually
      window.open(att.url, "_blank", "noopener,noreferrer");
      toast.info("Datei wird geöffnet – dort lange drücken und speichern.");
    } finally {
      setBusy(null);
    }
  };

  if (!attachments || attachments.length === 0) return null;

  const thumbCls = size === "sm" ? "h-16 w-16 rounded-md" : "h-24 w-24 rounded-lg";

  return (
    <div className="space-y-1.5">
      {loading && resolved.length === 0 ? (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Medien werden geladen…
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {resolved.map((att) => {
          const isImg = att.type.startsWith("image/");
          const isVid = att.type.startsWith("video/");
          return (
            <div key={att.path} className="flex flex-col gap-1">
              <div
                className={`relative ${thumbCls} overflow-hidden border border-border/50 bg-secondary/40 flex items-center justify-center`}
              >
                {isImg ? (
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                ) : isVid ? (
                  <video src={att.url} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <FileText className="h-6 w-6 text-muted-foreground" />
                )}
                {/* Type chip */}
                <div className="absolute top-0.5 left-0.5 rounded-sm bg-background/70 backdrop-blur px-1 py-0.5 text-[9px] text-foreground/80 flex items-center gap-0.5">
                  {isImg ? <ImageIcon className="h-2.5 w-2.5" /> : isVid ? <Film className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(att);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={busy === att.path}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-accent/50 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20 transition disabled:opacity-60"
                title={`${att.name} herunterladen`}
              >
                {busy === att.path ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                Download
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RequestMediaList;
