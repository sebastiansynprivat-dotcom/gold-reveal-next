import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Upload, Loader2, FileText, Sparkles, Image as ImageIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  modelId: string;
  hasDriveFolder: boolean;
  onImported: (filledFields: number, source: string) => void;
}

export default function SteckbriefImporter({
  modelId,
  hasDriveFolder,
  onImported,
}: Props) {
  const [busy, setBusy] = useState<null | "drive" | "upload" | "image">(null);
  const [extraText, setExtraText] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);

  const callImport = async (
    body: Record<string, unknown>,
    mode: "drive" | "upload" | "image"
  ) => {
    setBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("import-steckbrief", {
        body,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const filled = (data as any)?.filled_fields ?? 0;
      const source = (data as any)?.source ?? "";
      toast.success(`Steckbrief importiert · ${filled} Felder · ${source}`);
      onImported(filled, source);
    } catch (e: any) {
      const msg = e?.message || String(e);
      toast.error(msg.slice(0, 200));
    } finally {
      setBusy(null);
    }
  };

  const onDrive = () => callImport({ model_id: modelId, mode: "drive" }, "drive");

  const onPickFile = () => fileRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const nameLower = f.name.toLowerCase();
    const isDocx =
      nameLower.endsWith(".docx") ||
      f.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isPdf = nameLower.endsWith(".pdf") || f.type === "application/pdf";
    if (!isDocx && !isPdf) {
      toast.error("Bitte eine .docx oder .pdf Datei wählen");
      return;
    }
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // base64 encode
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunk) as unknown as number[]
      );
    }
    const b64 = btoa(bin);
    await callImport(
      { model_id: modelId, mode: "upload", file_base64: b64, file_name: f.name },
      "upload"
    );
  };

  const onPickImage = () => imageRef.current?.click();

  const onImageChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Bitte ein Bild wählen (JPG, PNG, WEBP)");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Bild ist größer als 8 MB");
      return;
    }
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
    }
    const b64 = btoa(bin);
    await callImport(
      { model_id: modelId, mode: "image", file_base64: `data:${f.type};base64,${b64}`, file_name: f.name },
      "image"
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl border border-accent/25 bg-gradient-to-br from-accent/[0.06] via-background/40 to-accent/[0.03] p-3 overflow-hidden"
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-accent/15 border border-accent/30">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-[11px] font-semibold text-foreground">
              Steckbrief automatisch importieren
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Felder aus Word/PDF importieren — oder per Foto durch KI einen passenden Fantasie-Steckbrief generieren lassen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={onDrive}
              disabled={!hasDriveFolder || busy !== null}
              className="text-[11px] h-7 gap-1.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                hasDriveFolder
                  ? "Sucht im hinterlegten Drive-Ordner nach einer .docx, Google Doc oder .pdf"
                  : "Kein Drive-Ordner am Model hinterlegt"
              }
            >
              {busy === "drive" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Cloud className="h-3 w-3" />
              )}
              Aus Drive importieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onPickFile}
              disabled={busy !== null}
              className="text-[11px] h-7 gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
            >
              {busy === "upload" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              .docx / .pdf hochladen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              onChange={onFileChosen}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={onPickImage}
              disabled={busy !== null}
              className="text-[11px] h-7 gap-1.5 border-fuchsia-400/40 text-fuchsia-300 hover:bg-fuchsia-400/10"
              title="KI generiert einen passenden Fantasie-Steckbrief basierend auf einem Foto des Models"
            >
              {busy === "image" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              KI aus Foto generieren
            </Button>
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              onChange={onImageChosen}
              className="hidden"
            />
          </div>
          <AnimatePresence>
            {busy && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] text-accent"
              >
                {busy === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {busy === "drive"
                  ? "Datei aus Drive ziehen & KI liest aus…"
                  : busy === "image"
                    ? "KI analysiert das Foto & erfindet den passenden Steckbrief…"
                    : "Datei wird gelesen & KI extrahiert die Felder…"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
