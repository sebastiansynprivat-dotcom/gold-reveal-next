import { useRef, useState } from "react";
import { Paperclip, Loader2, X, Image as ImageIcon, Film, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RequestAttachment {
  path: string;
  name: string;
  type: string;
  size: number;
}

interface Props {
  userId: string;
  requestId: string; // use "draft" for new requests, then move/rename if needed (we keep "draft" — admin still sees them)
  value: RequestAttachment[];
  onChange: (next: RequestAttachment[]) => void;
  /** Optional helper text shown above the picker. */
  helperText?: string;
  /** Compact mode for inline use in comment composers. */
  compact?: boolean;
  /** Maximum number of attachments (default 6). */
  max?: number;
  /** Maximum size per file in MB (default 50). */
  maxMb?: number;
}

const ACCEPT = "image/*,video/*";

function IconFor({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="h-3.5 w-3.5" />;
  if (type.startsWith("video/")) return <Film className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

const RequestMediaPicker = ({
  userId,
  requestId,
  value,
  onChange,
  helperText,
  compact = false,
  max = 6,
  maxMb = 50,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (value.length + files.length > max) {
      toast.error(`Maximal ${max} Dateien erlaubt.`);
      return;
    }
    setUploading(true);
    const uploaded: RequestAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > maxMb * 1024 * 1024) {
        toast.error(`"${file.name}" ist größer als ${maxMb} MB.`);
        continue;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await supabase.storage
        .from("request-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error(`Upload fehlgeschlagen: ${file.name}`);
        continue;
      }
      uploaded.push({ path, name: file.name, type: file.type, size: file.size });
    }
    setUploading(false);
    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
      toast.success(`${uploaded.length} Datei${uploaded.length === 1 ? "" : "en"} hochgeladen.`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (att: RequestAttachment) => {
    await supabase.storage.from("request-media").remove([att.path]).catch(() => {});
    onChange(value.filter((a) => a.path !== att.path));
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {helperText && !compact && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{helperText}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || value.length >= max}
        className={`flex items-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/60 transition-colors ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "w-full px-3 py-2.5 text-xs"
        } text-accent disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Paperclip className="h-3.5 w-3.5" />
        )}
        <span className="font-medium">
          {uploading
            ? "Wird hochgeladen…"
            : compact
              ? "Medien (optional)"
              : "Referenzbild oder Video anhängen (optional)"}
        </span>
        {value.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {value.length}/{max}
          </span>
        )}
      </button>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((att) => (
            <div
              key={att.path}
              className="flex items-center gap-1.5 rounded-md bg-secondary/40 border border-border/40 pl-2 pr-1 py-1 text-[10px] text-foreground/80 max-w-[180px]"
            >
              <IconFor type={att.type} />
              <span className="truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => remove(att)}
                className="h-4 w-4 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center shrink-0"
                aria-label="Entfernen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestMediaPicker;
