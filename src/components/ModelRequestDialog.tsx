import { useState, useEffect, useRef } from "react";
import { Send, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EditRequestData {
  id: string;
  model_name: string;
  request_type: "individual" | "general";
  price: number | null;
  description: string;
  customer_name?: string | null;
}

interface ModelRequestDialogProps {
  onSubmitted?: () => void;
  editData?: EditRequestData | null;
  onEditClear?: () => void;
  modelLanguage?: "de" | "en";
}

const ModelRequestDialog = ({ onSubmitted, editData, onEditClear, modelLanguage = "de" }: ModelRequestDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  const [customerName, setCustomerName] = useState("");
  
  const [requestType, setRequestType] = useState<"individual" | "general">("general");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // When editData changes, open dialog and pre-fill
  useEffect(() => {
    if (editData) {
      setModelName(editData.model_name);
      setCustomerName(editData.customer_name ?? "");
      setModelLanguage((editData as any).model_language === "en" ? "en" : "de");
      setRequestType(editData.request_type);
      setPrice(editData.price != null ? String(editData.price) : "");
      setDescription(editData.description);
      setOpen(true);
      // Focus description and place cursor at end after dialog opens
      setTimeout(() => {
        const el = descriptionRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 150);
    }
  }, [editData]);

  const resetForm = () => {
    setModelName("");
    setCustomerName("");
    setModelLanguage("de");
    setRequestType("general");
    setPrice("");
    setDescription("");
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) {
      resetForm();
      onEditClear?.();
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!modelName.trim() || !description.trim()) {
      toast.error("Bitte fülle alle Pflichtfelder aus.");
      return;
    }
    if (requestType === "individual" && !price.trim()) {
      toast.error("Bitte gib einen Preis an.");
      return;
    }

    setLoading(true);

    if (editData) {
      // Update existing request
      const { error } = await supabase.from("model_requests").update({
        model_name: modelName.trim(),
        request_type: requestType,
        model_language: modelLanguage,
        price: requestType === "individual" ? parseFloat(price) : null,
        description: description.trim(),
        customer_name: requestType === "individual" ? customerName.trim() || null : null,
        status: "pending",
        admin_comment: null,
      } as any).eq("id", editData.id);
      setLoading(false);
      if (error) {
        toast.error("Fehler beim Aktualisieren der Anfrage.");
        return;
      }
      toast.success("Anfrage aktualisiert! ✅");
    } else {
      // Insert new request
      const { error } = await supabase.from("model_requests").insert({
        user_id: user.id,
        model_name: modelName.trim(),
        request_type: requestType,
        model_language: modelLanguage,
        price: requestType === "individual" ? parseFloat(price) : null,
        description: description.trim(),
        customer_name: requestType === "individual" ? customerName.trim() || null : null,
      } as any);
      setLoading(false);
      if (error) {
        toast.error("Fehler beim Senden der Anfrage.");
        return;
      }
      toast.success("Anfrage erfolgreich gesendet! ✅");
    }

    resetForm();
    setOpen(false);
    onEditClear?.();
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {!editData && (
        <DialogTrigger asChild>
          <button className="flex items-center gap-3 w-full px-4 py-4 lg:px-6 lg:py-5 hover:bg-secondary/30 active:scale-[0.99] transition-all cursor-pointer group">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <Send className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Anfrage an das Model stellen</p>
              <p className="text-xs text-muted-foreground">Individuelle oder allgemeine Anfrage senden</p>
            </div>
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editData ? "Anfrage bearbeiten" : "Anfrage an das Model"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {editData
              ? "Bearbeite deine Anfrage und sende sie erneut."
              : "Stelle eine Anfrage an dein Model – individuell oder allgemein."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Model Name aus dem Profil *</Label>
            <Input
              placeholder="z.B. Deborahsecret, Luisa.loves"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-foreground">Dein Model spricht *</Label>
            <RadioGroup value={modelLanguage} onValueChange={(v) => setModelLanguage(v as "de" | "en")} className="flex gap-3">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="de" id="lang-de" />
                <Label htmlFor="lang-de" className="text-xs cursor-pointer">🇩🇪 Deutsch</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="en" id="lang-en" />
                <Label htmlFor="lang-en" className="text-xs cursor-pointer">🇬🇧 Englisch</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-foreground">Art der Anfrage *</Label>
            <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as "individual" | "general")} className="flex flex-col gap-3">
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="text-xs font-semibold cursor-pointer">Individuelle Anfrage</Label>
                </div>
                <p className="text-[10px] text-muted-foreground pl-6">ℹ️ Personalisierter Content – z.B. der Name des Kunden wird erwähnt, spezielle Wünsche oder maßgeschneiderte Inhalte.</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="general" id="general" />
                  <Label htmlFor="general" className="text-xs font-semibold cursor-pointer">Allgemeine Anfrage</Label>
                </div>
                <p className="text-[10px] text-muted-foreground pl-6">ℹ️ Allgemeiner Content – z.B. neue Fotos, Videos oder Posts, die nicht auf einen bestimmten Kunden zugeschnitten sind.</p>
              </div>
            </RadioGroup>
          </div>

          {requestType === "individual" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Kundenname</Label>
                <Input
                  placeholder="z.B. Max, @username"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Was ist der Kunde bereit zu bezahlen? (€) *</Label>
                <Input
                  type="number"
                  placeholder="z.B. 50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={0}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">
              Beschreibung der Anfrage {modelLanguage === "en" ? "(bitte auf Englisch)" : "(bitte auf Deutsch)"} *
            </Label>
            <Textarea
              ref={descriptionRef}
              placeholder="Beschreibe hier die Anfrage an das Model..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading
              ? (editData ? "Wird aktualisiert..." : "Wird gesendet...")
              : (editData ? "Anfrage aktualisieren" : "Anfrage absenden")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelRequestDialog;
