import { useState } from "react";
import { Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ModelRequestDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  const [requestType, setRequestType] = useState<"individual" | "general">("general");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setModelName("");
    setRequestType("general");
    setPrice("");
    setDescription("");
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
    const { error } = await supabase.from("model_requests").insert({
      user_id: user.id,
      model_name: modelName.trim(),
      request_type: requestType,
      price: requestType === "individual" ? parseFloat(price) : null,
      description: description.trim(),
    });
    setLoading(false);

    if (error) {
      toast.error("Fehler beim Senden der Anfrage.");
      return;
    }

    toast.success("Anfrage erfolgreich gesendet! ✅");
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center gap-3 w-full px-4 py-4 lg:px-6 lg:py-5 hover:bg-secondary/30 active:scale-[0.99] transition-all cursor-pointer group">
          <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <Send className="h-4 w-4 text-accent" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground">Anfrage an das Model stellen</p>
            <p className="text-[10px] text-muted-foreground">Individuelle oder allgemeine Anfrage senden</p>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Anfrage an das Model</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Stelle eine Anfrage an dein Model – individuell oder allgemein.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Model Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Model Name *</Label>
            <Input
              placeholder="z.B. Anna, Lisa..."
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Request Type */}
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

          {/* Conditional Price */}
          {requestType === "individual" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-xs text-foreground">Was ist der Kunde bereit zu bezahlen? (€) *</Label>
              <Input
                type="number"
                placeholder="z.B. 50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={0}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Beschreibung der Anfrage *</Label>
            <Textarea
              placeholder="Beschreibe hier die Anfrage an das Model..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Wird gesendet..." : "Anfrage absenden"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelRequestDialog;
