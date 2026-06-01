import { useState, useEffect, useRef } from "react";
import { Send, Pencil, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUILanguage } from "@/hooks/useUILanguage";

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
  availablePlatforms?: string[];
}

const ModelRequestDialog = ({ onSubmitted, editData, onEditClear, modelLanguage = "de", availablePlatforms }: ModelRequestDialogProps) => {
  const { user } = useAuth();
  const { lang } = useUILanguage();
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  const [customerName, setCustomerName] = useState("");
  
  const [requestType, setRequestType] = useState<"individual" | "general">("general");
  const [platform, setPlatform] = useState<"Maloum" | "Brezzels" | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // When editData changes, open dialog and pre-fill
  useEffect(() => {
    if (editData) {
      setModelName(editData.model_name);
      setCustomerName(editData.customer_name ?? "");
      // modelLanguage comes from prop now
      setRequestType(editData.request_type);
      setPrice(editData.price != null ? String(editData.price) : "");
      const platformMatch = editData.description.match(/^\[Plattform: (Maloum|Brezzels)\]\s*/);
      if (platformMatch) {
        setPlatform(platformMatch[1] as "Maloum" | "Brezzels");
        setDescription(editData.description.replace(platformMatch[0], ""));
      } else {
        setPlatform(null);
        setDescription(editData.description);
      }
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
    
    setRequestType("general");
    setPlatform(null);
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
    if (!platform) {
      toast.error("Bitte wähle eine Plattform aus.");
      return;
    }
    if (requestType === "individual" && !price.trim()) {
      toast.error("Bitte gib einen Preis an.");
      return;
    }

    const finalDescription = `[Plattform: ${platform}] ${description.trim()}`;

    setLoading(true);

    if (editData) {
      // Update existing request
      const { error } = await supabase.from("model_requests").update({
        model_name: modelName.trim(),
        request_type: requestType,
        model_language: modelLanguage,
        price: requestType === "individual" ? parseFloat(price) : null,
        description: finalDescription,
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
        description: finalDescription,
        customer_name: requestType === "individual" ? customerName.trim() || null : null,
      } as any);
      setLoading(false);
      if (error) {
        toast.error("Fehler beim Senden der Anfrage.");
        return;
      }
      // Fire-and-forget admin push
      supabase.functions.invoke("send-admin-push", {
        body: {
          event: "new_request",
          title: `📨 NEUE ANFRAGE · ${platform}`,
          body: `${modelName.trim()} · ${requestType === "individual" ? `Individuell${price ? ` (${price}€)` : ""}` : "Allgemein"}`,
          url: "/admin",
        },
      }).catch(() => {});
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
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="relative overflow-hidden flex items-center gap-4 w-full p-6 rounded-2xl cursor-pointer group transition-all border-2 border-accent/40 hover:border-accent/70 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.5)]"
          >
            {/* Shimmer sweep */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            {/* Glow blob */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/30 blur-3xl" />

            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shrink-0 shadow-lg shadow-accent/30"
            >
              <Send className="h-7 w-7 text-accent-foreground" />
            </motion.div>
            <div className="relative text-left flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground mb-1">Neue Anfrage erstellen</p>
              <p className="text-sm text-muted-foreground leading-snug">
                Klicke hier, um eine Anfrage an dein <span className="text-accent font-bold">Model</span> zu stellen
              </p>
            </div>
            <ChevronRight className="relative h-5 w-5 text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
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
            <div className="input-gold-shimmer rounded-lg">
              <Input
                placeholder="z.B. Deborahsecret, Luisa.loves"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                maxLength={100}
                className="border-transparent"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">
              Dein Model spricht: <span className="font-semibold text-foreground">{modelLanguage === "en" ? "🇬🇧 Englisch" : "🇩🇪 Deutsch"}</span>
            </p>
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

          <div className="space-y-2">
            <Label className="text-xs text-foreground">Plattform *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["Maloum", "Brezzels"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`px-4 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    platform === p
                      ? "border-accent bg-accent/15 text-accent shadow-[0_0_16px_hsl(43_56%_52%/0.25)]"
                      : "border-border/50 bg-secondary/20 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>



          {requestType === "individual" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Kundenname</Label>
                <div className="input-gold-shimmer rounded-lg">
                  <Input
                    placeholder="z.B. Max, @username"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    maxLength={100}
                    className="border-transparent"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Was ist der Kunde bereit zu bezahlen? (€) *</Label>
                <div className="input-gold-shimmer rounded-lg">
                  <Input
                    inputMode="decimal"
                    placeholder="z.B. 50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ""))}
                    className="border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">
              Beschreibung der Anfrage {modelLanguage === "en" ? "(bitte auf Englisch)" : "(bitte auf Deutsch)"} *
            </Label>
            <div className="input-gold-shimmer rounded-lg">
              <Textarea
                ref={descriptionRef}
                placeholder={modelLanguage === "en" ? "Describe the request to the model here..." : "Beschreibe hier die Anfrage an das Model..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                className="border-transparent"
              />
            </div>
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
