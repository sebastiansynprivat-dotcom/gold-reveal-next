import { useState, useEffect, useRef } from "react";
import { Send, Pencil, ChevronRight, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUILanguage } from "@/hooks/useUILanguage";
import RequestMediaPicker, { type RequestAttachment } from "./RequestMediaPicker";

export interface EditRequestData {
  id: string;
  model_name: string;
  request_type: "individual" | "general";
  price: number | null;
  description: string;
  customer_name?: string | null;
  attachments?: RequestAttachment[];
}

export interface AvailableModel {
  id: string;
  name: string;
  language: "de" | "en";
  platforms: string[];
  active?: boolean;
}

interface ModelRequestDialogProps {
  onSubmitted?: () => void;
  editData?: EditRequestData | null;
  onEditClear?: () => void;
  modelLanguage?: "de" | "en";
  availablePlatforms?: string[];
  availableModels?: AvailableModel[];
}

const ModelRequestDialog = ({ onSubmitted, editData, onEditClear, modelLanguage: modelLanguageProp = "de", availablePlatforms, availableModels }: ModelRequestDialogProps) => {
  const { user } = useAuth();
  const { lang } = useUILanguage();
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");

  const [requestType, setRequestType] = useState<"individual" | "general">("general");
  const [platform, setPlatform] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  // Stable id used both as the DB row id and as the storage folder for media.
  const [draftRequestId, setDraftRequestId] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );
  const [loading, setLoading] = useState(false);
  const [inactiveInfoOpen, setInactiveInfoOpen] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const hasModelList = !!availableModels && availableModels.length > 0;
  // When the chatter has exactly ONE model, that model is the source of truth for
  // both name + language + platform — even before the auto-select effect runs.
  const soleModel = hasModelList && availableModels!.length === 1 ? availableModels![0] : null;
  const selectedModel = hasModelList
    ? availableModels!.find((m) => m.id === selectedModelId) || soleModel || null
    : null;
  const modelLanguage: "de" | "en" =
    selectedModel?.language || soleModel?.language || modelLanguageProp;
  const effectivePlatforms = selectedModel
    ? selectedModel.platforms
    : availablePlatforms && availablePlatforms.length > 0
      ? availablePlatforms
      : [];

  // When editData changes, open dialog and pre-fill
  useEffect(() => {
    if (editData) {
      setModelName(editData.model_name);
      setCustomerName(editData.customer_name ?? "");
      setRequestType(editData.request_type);
      setPrice(editData.price != null ? String(editData.price) : "");
      setAttachments(Array.isArray(editData.attachments) ? editData.attachments : []);
      setDraftRequestId(editData.id);
      const platformMatch = editData.description.match(/^\[Plattform: ([^\]]+)\]\s*/);
      if (platformMatch) {
        setPlatform(platformMatch[1]);
        setDescription(editData.description.replace(platformMatch[0], ""));
      } else {
        setPlatform(null);
        setDescription(editData.description);
      }
      // Try to match edit data to one of the available models
      if (availableModels && availableModels.length > 0) {
        const match = availableModels.find(
          (m) => m.name.trim().toLowerCase() === editData.model_name.trim().toLowerCase(),
        );
        if (match) setSelectedModelId(match.id);
      }
      setOpen(true);
      setTimeout(() => {
        const el = descriptionRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 150);
    }
  }, [editData, availableModels]);

  // Auto-select when only one active model is available
  useEffect(() => {
    if (selectedModelId || !availableModels) return;
    const activeOnly = availableModels.filter((m) => m.active !== false);
    if (activeOnly.length === 1) {
      const only = activeOnly[0];
      setSelectedModelId(only.id);
      if (!modelName && only.name) setModelName(only.name);
    }
  }, [availableModels, selectedModelId, modelName]);

  // When user picks a model, pre-fill its name & reset platform if no longer valid
  useEffect(() => {
    if (selectedModel) {
      if (!modelName || (availableModels || []).some((m) => m.name === modelName)) {
        setModelName(selectedModel.name);
      }
      if (platform && !selectedModel.platforms.includes(platform)) {
        setPlatform(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  // Auto-select platform when only one is available
  useEffect(() => {
    if (!platform && effectivePlatforms.length === 1) {
      setPlatform(effectivePlatforms[0]);
    }
  }, [effectivePlatforms, platform, open]);



  const resetForm = () => {
    // Keep auto-selected model when there is only one assigned
    if (!availableModels || availableModels.length !== 1) {
      setSelectedModelId(null);
      setModelName("");
    } else {
      setModelName(availableModels[0].name);
    }
    setCustomerName("");
    setRequestType("general");
    setPlatform(null);
    setPrice("");
    setDescription("");
    setAttachments([]);
    setDraftRequestId(
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    );
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
    if (hasModelList && !selectedModel) {
      toast.error("Bitte wähle ein Model aus.");
      return;
    }
    // Block requests for inactive models (covers both the select path and
    // the auto-filled single-model fallback).
    const targetModel = selectedModel
      || (hasModelList && availableModels!.length === 1 ? availableModels![0] : null);
    if (targetModel && targetModel.active === false) {
      toast.error(
        lang === "en"
          ? "This model is currently inactive — requests are paused."
          : "Dieses Model ist aktuell inaktiv — Anfragen sind pausiert.",
      );
      return;
    }
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
        attachments: attachments as any,
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
      // Insert new request (with the draft id we used as the storage folder).
      const { error } = await supabase.from("model_requests").insert({
        id: draftRequestId,
        user_id: user.id,
        model_name: modelName.trim(),
        request_type: requestType,
        model_language: modelLanguage,
        price: requestType === "individual" ? parseFloat(price) : null,
        description: finalDescription,
        customer_name: requestType === "individual" ? customerName.trim() || null : null,
        attachments: attachments as any,
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
          {hasModelList && (availableModels!.length > 1 || availableModels!.some((m) => m.active === false)) ? (
            <div className="space-y-2">
              <Label className="text-xs text-foreground">
                {lang === "en" ? "Which model is this request for? *" : "Für welches Model ist diese Anfrage? *"}
              </Label>
              <Select
                value={selectedModelId || ""}
                onValueChange={(val) => {
                  const m = availableModels!.find((x) => x.id === val);
                  if (!m || m.active === false) return;
                  setSelectedModelId(m.id);
                  setModelName(m.name);
                }}
              >
                <SelectTrigger className="input-gold-shimmer border-transparent bg-secondary/20 text-foreground">
                  <SelectValue placeholder={lang === "en" ? "Select a model…" : "Model auswählen…"} />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {availableModels!.map((m) => {
                    const inactive = m.active === false;
                    return (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                        disabled={inactive}
                        className={inactive ? "opacity-60" : ""}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{m.name || "—"}</span>
                          <span className="text-[10px] opacity-70">
                            {m.language === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              inactive
                                ? "bg-destructive/15 text-destructive"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}
                          >
                            {inactive
                              ? lang === "en" ? "Inactive" : "Inaktiv"
                              : lang === "en" ? "Active" : "Aktiv"}
                          </span>
                          {inactive && (
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={lang === "en" ? "Why inactive?" : "Warum inaktiv?"}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInactiveInfoOpen(true);
                              }}
                              className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">

              <Label className="text-xs text-foreground">Model Name aus dem Profil *</Label>
              <div className="input-gold-shimmer rounded-lg">
                <Input
                  placeholder="z.B. Deborahsecret, Luisa.loves"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  maxLength={100}
                  className="border-transparent"
                  readOnly={hasModelList}
                />
              </div>
            </div>
          )}

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

          {(() => {
            const platforms = effectivePlatforms.length > 0
              ? Array.from(new Set(effectivePlatforms))
              : ["Maloum", "Brezzels"];
            return (
              <div className="space-y-2">
                <Label className="text-xs text-foreground">Plattform *</Label>
                {platforms.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    {lang === "en" ? "No platforms assigned yet." : "Noch keine Plattformen zugewiesen."}
                  </p>
                ) : (
                  <div className={`grid gap-2 ${platforms.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {platforms.map((p) => (
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
                )}
              </div>
            );
          })()}



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
                placeholder={lang === "en" ? "Describe the request to the model here..." : "Beschreibe hier die Anfrage an das Model..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                className="border-transparent"
              />
            </div>
          </div>

          {user && (
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">
                {lang === "en" ? "Reference image / video (optional)" : "Referenzbild / Video (optional)"}
              </Label>
              <RequestMediaPicker
                userId={user.id}
                requestId={editData ? editData.id : draftRequestId}
                value={attachments}
                onChange={setAttachments}
                helperText={
                  lang === "en"
                    ? "Attach a reference if it helps the model understand what you want. Not required."
                    : "Häng optional eine Referenz an, damit dein Model genau weiß, was gemeint ist. Nicht verpflichtend."
                }
              />
            </div>
          )}


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
