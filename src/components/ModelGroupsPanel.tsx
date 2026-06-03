import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Plus,
  Tag,
  Pencil,
  Trash2,
  Users,
  Loader2,
  ArrowLeft,
  Receipt,
  Save,
  Copy,
  X,
  FileDown,
  Download,

} from "lucide-react";
import { generateProviderInvoicePdf, downloadPdf } from "@/lib/providerInvoicePdf";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

type Group = {
  id: string;
  name: string;
  slug: string;
  default_commission: number;
  referral_source: string;
  color: string;
  notes: string;
  created_at: string;
};

type ModelLite = {
  id: string;
  name: string;
  username: string | null;
  group_id: string | null;
  commission_override: number | null;
  commission_override_fourbased: number | null;
  commission_override_maloum: number | null;
  commission_override_brezzels: number | null;
  referral_source: string;
  referrer_tag: string;
  revenue_percentage: number;
  currency: string;
  crypto_address: string | null;
  payment_method: string;
  bank_name: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
  bank_account_holder: string | null;
  provider_name_override: string;
  provider_address: string;
  provider_is_business: boolean;
  provider_vat_id: string;
};

type LineItem = {
  model_id: string;
  model_name: string;
  referral_source: string;
  gross: number;
  commission_pct: number;
  commission_amount: number;
  net_payout: number;
  breakdown: Array<{ name: string; gross: number; pct: number; commission: number }>;
  currency: string;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  Math.random().toString(36).slice(2, 8);

export default function ModelGroupsPanel({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [models, setModels] = useState<ModelLite[]>([]);
  const [platformsByModel, setPlatformsByModel] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<Group | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingItems, setBillingItems] = useState<LineItem[]>([]);
  const [billingPeriod, setBillingPeriod] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10),
    to: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10),
  });
  const [billingLoading, setBillingLoading] = useState(false);
  const [fetchAllProgress, setFetchAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [revenueByModel, setRevenueByModel] = useState<Record<string, { fb: number | null; ml: number | null; br: number | null; fetched_at: string | null }>>({});

  const loadRevenueForPeriod = async () => {
    if (!selected) return;
    const ref = new Date(billingPeriod.from || new Date().toISOString().slice(0, 10));
    const month = ref.getMonth() + 1;
    const year = ref.getFullYear();
    const ids = (selected ? models.filter((m) => {
      const tag = (selected.referral_source || "").trim().toLowerCase();
      return m.group_id === selected.id || (tag && (m.referrer_tag || "").trim().toLowerCase() === tag);
    }) : []).map((m) => m.id);
    if (ids.length === 0) { setRevenueByModel({}); return; }
    const { data } = await (supabase as any)
      .from("payout_revenue")
      .select("model_id, fourbased_revenue, maloum_revenue, brezzels_revenue, last_fetched_at")
      .in("model_id", ids)
      .eq("last_fetched_month", month)
      .eq("last_fetched_year", year);
    const map: Record<string, any> = {};
    ((data as any[]) || []).forEach((r) => {
      map[r.model_id] = {
        fb: r.fourbased_revenue == null ? null : Number(r.fourbased_revenue),
        ml: r.maloum_revenue == null ? null : Number(r.maloum_revenue),
        br: r.brezzels_revenue == null ? null : Number(r.brezzels_revenue),
        fetched_at: r.last_fetched_at,
      };
    });
    setRevenueByModel(map);
  };

  const fetchAllInGroup = async () => {
    if (!selected || groupModels.length === 0) return;
    const ref = new Date(billingPeriod.from || new Date().toISOString().slice(0, 10));
    const month = ref.getMonth() + 1;
    const year = ref.getFullYear();
    const targets = groupModels.filter((m) => (platformsByModel[m.id] || []).length > 0);
    if (targets.length === 0) {
      toast.error("Keine Plattformen in dieser Gruppe hinterlegt.");
      return;
    }
    setFetchAllProgress({ done: 0, total: targets.length });
    const allErrors: Array<{ model: string; platform?: string; message?: string }> = [];
    let successCount = 0;
    for (let i = 0; i < targets.length; i++) {
      const m = targets[i];
      try {
        const { data, error } = await supabase.functions.invoke("fetch-model-revenue", {
          body: { model_id: m.id, month, year },
        });
        if (error) throw new Error(error.message);
        if ((data as any)?.error) throw new Error((data as any).error);
        const errs = ((data as any)?.errors ?? []) as Array<{ platform?: string; message?: string }>;
        if (errs.length > 0) {
          errs.forEach((e) => allErrors.push({ model: m.name, platform: e.platform, message: e.message }));
        } else {
          successCount++;
        }
      } catch (err: any) {
        allErrors.push({ model: m.name, message: err?.message || "Unbekannter Fehler" });
      }
      setFetchAllProgress({ done: i + 1, total: targets.length });
    }
    setFetchAllProgress(null);
    if (allErrors.length > 0) {
      toast.error(`Fetch abgeschlossen — ${successCount}/${targets.length} ok, ${allErrors.length} Fehler`, {
        description: allErrors.map((e) => `${e.model}${e.platform ? ` (${e.platform})` : ""}: ${e.message ?? "Unbekannter Fehler"}`).join("\n"),
        duration: 12000,
        style: { whiteSpace: "pre-line" },
      });
    } else {
      toast.success(`Umsatz für ${targets.length} Models aktualisiert ✅ (${String(month).padStart(2, "0")}/${year})`);
    }
  };


  const [form, setForm] = useState({
    name: "",
    default_commission: 30,
    referral_source: "",
    color: "#D4AF37",
    notes: "",
  });
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: gs }, { data: ms }, { data: accs }] = await Promise.all([
      supabase.from("model_groups").select("*").order("name"),
      supabase
        .from("models")
        .select(
          "id, name, username, group_id, commission_override, commission_override_fourbased, commission_override_maloum, commission_override_brezzels, referral_source, referrer_tag, revenue_percentage, currency, crypto_address, payment_method, bank_name, bank_iban, bank_bic, bank_account_holder, provider_name_override, provider_address, provider_is_business, provider_vat_id"
        )
        .order("name"),
      supabase.from("accounts").select("model_id, platform").not("model_id", "is", null),
    ]);
    setGroups((gs as any) || []);
    setModels((ms as any) || []);
    const map: Record<string, Set<string>> = {};
    ((accs as any[]) || []).forEach((a) => {
      if (!a.model_id || !a.platform) return;
      (map[a.model_id] ||= new Set()).add(String(a.platform));
    });
    setPlatformsByModel(
      Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.from(v).sort()])),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    if (open && selected) loadRevenueForPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, billingPeriod.from, models.length]);

  // Auto-pull: include models explicitly in the group OR matching by referrer_tag (case-insensitive)
  const groupModels = useMemo(() => {
    if (!selected) return [];
    const tag = (selected.referral_source || "").trim().toLowerCase();
    return models.filter((m) => {
      if (m.group_id === selected.id) return true;
      if (tag && (m.referrer_tag || "").trim().toLowerCase() === tag) return true;
      return false;
    });
  }, [models, selected]);

  // One-click: persist auto-matched models into the group (sets group_id on all matches)
  const syncByTag = async () => {
    if (!selected) return;
    const tag = (selected.referral_source || "").trim().toLowerCase();
    if (!tag) {
      toast.error("Setze zuerst einen Referrer-Tag in der Gruppe.");
      return;
    }
    const matches = models.filter(
      (m) => m.group_id !== selected.id && (m.referrer_tag || "").trim().toLowerCase() === tag,
    );
    if (matches.length === 0) {
      toast.info("Keine weiteren passenden Models gefunden.");
      return;
    }
    const ids = matches.map((m) => m.id);
    const { error } = await supabase
      .from("models")
      .update({ group_id: selected.id } as any)
      .in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${matches.length} Models in Gruppe verschoben`);
    await load();
    onChanged?.();
  };


  const resetForm = () => {
    setForm({ name: "", default_commission: 30, referral_source: "", color: "#D4AF37", notes: "" });
    setEditingGroup(null);
  };

  const saveGroup = async () => {
    if (!form.name.trim()) {
      toast.error("Name fehlt");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name),
      default_commission: form.default_commission,
      referral_source: form.referral_source.trim(),
      color: form.color,
      notes: form.notes,
      ...(editingGroup ? {} : { created_by: u.user?.id }),
    };
    const q = editingGroup
      ? supabase.from("model_groups").update(payload).eq("id", editingGroup.id)
      : supabase.from("model_groups").insert(payload);
    const { error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingGroup ? "Gruppe aktualisiert" : "Gruppe erstellt");
    setCreateOpen(false);
    resetForm();
    await load();
    onChanged?.();
  };

  const deleteGroup = async (g: Group) => {
    if (!confirm(`Gruppe "${g.name}" wirklich löschen? Models bleiben erhalten.`)) return;
    const { error } = await supabase.from("model_groups").delete().eq("id", g.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Gruppe gelöscht");
    setSelected(null);
    await load();
    onChanged?.();
  };

  const updateModelField = async (id: string, patch: Partial<ModelLite>) => {
    const { error } = await supabase.from("models").update(patch as any).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    onChanged?.();
  };

  const generateBilling = async () => {
    if (!selected) return;
    setBillingLoading(true);
    setBillingOpen(true);
    try {
      // 4Based revenue is reported in USD → convert to EUR for billing
      let usdToEur = 0.92;
      try {
        const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR");
        const j = await r.json();
        if (j?.rates?.EUR) usdToEur = Number(j.rates.EUR);
      } catch {
        // keep fallback
      }
      // Period → month/year used to look up fetched revenue (payout_revenue)
      const ref = new Date(billingPeriod.from || new Date().toISOString().slice(0, 10));
      const periodMonth = ref.getMonth() + 1;
      const periodYear = ref.getFullYear();
      const items: LineItem[] = [];
      for (const m of groupModels) {
        // All accounts of this model (for label/platform context only)
        const { data: accs } = await supabase
          .from("accounts")
          .select("id, platform")
          .eq("model_id", m.id);
        const hasAccounts = (accs || []).length > 0;

        // Per-platform commission resolver: platform override -> default override -> group default
        const baseDefault =
          m.commission_override != null && Number(m.commission_override) !== 0
            ? Number(m.commission_override)
            : Number(selected.default_commission);
        const pctFor = (key: "fourbased" | "maloum" | "brezzels") => {
          const v =
            key === "fourbased"
              ? m.commission_override_fourbased
              : key === "maloum"
              ? m.commission_override_maloum
              : m.commission_override_brezzels;
          return v != null && Number(v) !== 0 ? Number(v) : baseDefault;
        };

        let gross = 0;
        let commission_total = 0;
        const breakdown: Array<{ name: string; gross: number; pct: number; commission: number }> = [];
        const pushLine = (name: string, g: number, pct: number) => {
          const c = +(g * (pct / 100)).toFixed(2);
          breakdown.push({ name, gross: g, pct, commission: c });
          gross += g;
          commission_total += c;
        };

        if (hasAccounts) {
          // 1) Prefer fetched revenue for the selected period (payout_revenue)
          const { data: pr } = await (supabase as any)
            .from("payout_revenue")
            .select("fourbased_revenue, maloum_revenue, brezzels_revenue")
            .eq("model_id", m.id)
            .eq("last_fetched_month", periodMonth)
            .eq("last_fetched_year", periodYear)
            .maybeSingle();

          // 2) Fallback: manually entered revenue (model_dashboard)
          let src: any = pr;
          if (!src) {
            const { data: md } = await (supabase as any)
              .from("model_dashboard")
              .select("fourbased_revenue, maloum_revenue, brezzels_revenue, monthly_revenue")
              .eq("model_id", m.id)
              .maybeSingle();
            src = md;
          }

          if (src) {
            const fbUsd = Number(src.fourbased_revenue) || 0;
            const fb = +(fbUsd * usdToEur).toFixed(2); // USD → EUR
            const ml = Number(src.maloum_revenue) || 0;
            const br = Number(src.brezzels_revenue) || 0;
            if (fb > 0)
              pushLine(
                `4Based ($${fbUsd.toFixed(2)} @ ${usdToEur.toFixed(4)})`,
                fb,
                pctFor("fourbased"),
              );
            if (ml > 0) pushLine("Maloum", ml, pctFor("maloum"));
            if (br > 0) pushLine("Brezzels", br, pctFor("brezzels"));
          }
        }

        const commission_amount = +commission_total.toFixed(2);
        const net_payout = commission_amount;
        const effectivePct = gross > 0 ? +(commission_amount / gross * 100).toFixed(2) : baseDefault;
        items.push({
          model_id: m.id,
          model_name: m.name,
          referral_source: m.referrer_tag || m.referral_source || selected.referral_source || "",
          gross: +gross.toFixed(2),
          commission_pct: effectivePct,
          commission_amount,
          net_payout,
          breakdown,
          currency: m.currency || "EUR",
        });
      }

      setBillingItems(items);

      // Persist snapshot
      const total_gross = items.reduce((s, i) => s + i.gross, 0);
      const total_commission = items.reduce((s, i) => s + i.commission_amount, 0);
      const total_net = items.reduce((s, i) => s + i.net_payout, 0);
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("group_billings").insert({
        group_id: selected.id,
        group_name: selected.name,
        period_start: billingPeriod.from,
        period_end: billingPeriod.to,
        total_gross,
        total_commission,
        total_net,
        line_items: items as any,
        created_by: u.user?.id,
      });
    } catch (e: any) {
      toast.error(e.message || "Fehler bei Abrechnung");
    } finally {
      setBillingLoading(false);
    }
  };

  const copyBillingCSV = () => {
    const header = "Model,Referral,Gross,Commission %,Commission Amount,Net Payout";
    const rows = billingItems.map(
      (i) =>
        `${i.model_name},${i.referral_source},${i.gross.toFixed(2)},${i.commission_pct}%,${i.commission_amount.toFixed(2)},${i.net_payout.toFixed(2)}`
    );
    const totals = billingItems.reduce(
      (a, i) => ({ g: a.g + i.gross, c: a.c + i.commission_amount, n: a.n + i.net_payout }),
      { g: 0, c: 0, n: 0 }
    );
    const csv =
      [header, ...rows, `TOTAL,,${totals.g.toFixed(2)},,${totals.c.toFixed(2)},${totals.n.toFixed(2)}`].join("\n");
    navigator.clipboard.writeText(csv);
    toast.success("Abrechnung in Zwischenablage kopiert");
  };

  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);

  const generateInvoice = async (item: LineItem) => {
    if (!selected) return;
    const model = models.find((m) => m.id === item.model_id);
    if (!model) {
      toast.error("Model nicht gefunden");
      return;
    }
    if (item.net_payout <= 0) {
      toast.error("Kein Auszahlungsbetrag – Umsatz fehlt.");
      return;
    }
    setInvoiceLoading(item.model_id);
    try {
      // Issuer settings
      const { data: issuer } = await (supabase as any)
        .from("issuer_settings")
        .select("*")
        .limit(1)
        .single();

      // Next invoice number
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "next_credit_note_number" as any
      );
      if (rpcError) throw rpcError;
      const creditNoteNumber = rpcData as string;

      const providerName = model.provider_name_override || model.name;
      const isBusiness = !!model.provider_is_business;
      const providerVatId = model.provider_vat_id || "";
      const providerAddress = model.provider_address || "";
      const currency = item.currency || "EUR";

      const lines = item.breakdown.length > 0
        ? item.breakdown.map((b) => ({
            name: b.name,
            gross: b.gross,
            pct: b.pct,
          }))
        : [{ name: "Revenue Share", gross: item.gross, pct: item.commission_pct }];

      const isBank = (model.payment_method || "crypto") === "bank";
      const payment = isBank
        ? {
            method: "Bank Transfer",
            bankAccountHolder: model.bank_account_holder || "",
            bankIban: model.bank_iban || "",
            bankBic: model.bank_bic || "",
            bankName: model.bank_name || "",
            paymentDate: format(new Date(), "yyyy-MM-dd"),
          }
        : {
            method: "USDT (TRC20)",
            wallet: model.crypto_address || "",
            paymentDate: format(new Date(), "yyyy-MM-dd"),
          };

      // Save record
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("credit_notes" as any).insert({
        credit_note_number: creditNoteNumber,
        credit_note_date: format(new Date(), "yyyy-MM-dd"),
        service_period_start: billingPeriod.from,
        service_period_end: billingPeriod.to,
        provider_name: providerName,
        provider_address: providerAddress,
        provider_is_business: isBusiness,
        provider_vat_id: isBusiness ? providerVatId : "",
        description: `Creator revenue share for digital content`,
        net_amount: item.net_payout,
        vat_rate: 0,
        vat_amount: 0,
        gross_amount: item.net_payout,
        payment_method: payment.method,
        crypto_coin: isBank ? "" : "USDT",
        tx_hash: "",
        exchange_rate: "",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        account_id: null,
        chatter_name: model.name,
        created_by: u.user?.id,
      } as any);

      const doc = generateProviderInvoicePdf({
        creditNoteNumber,
        creditNoteDate: format(new Date(), "yyyy-MM-dd"),
        servicePeriodStart: billingPeriod.from,
        servicePeriodEnd: billingPeriod.to,
        issuer: {
          name: issuer?.name || "Sharify Media Limited",
          address: issuer?.address || "Palaion Patron Germanou 11, 8011, Paphos, Cyprus",
          vatId: issuer?.vat_id || "CY60329590T",
        },
        provider: {
          name: providerName,
          address: providerAddress,
          isBusiness,
          vatId: providerVatId,
        },
        description: `Creator revenue share for digital content`,
        currency,
        lines,
        net: item.net_payout,
        payment,
      });
      downloadPdf(doc, `ProviderInvoice_${creditNoteNumber.replace(/\//g, "-")}_${model.name.replace(/\s+/g, "_")}.pdf`);
      toast.success(`Provider Invoice ${creditNoteNumber} erstellt`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Fehler bei Invoice-Erstellung");
    } finally {
      setInvoiceLoading(null);
    }
  };

  const generateAllInvoices = async () => {
    for (const item of billingItems) {
      if (item.net_payout > 0) {
        // Sequential to avoid number conflicts
        // eslint-disable-next-line no-await-in-loop
        await generateInvoice(item);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-accent/20 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-accent/10">
          <DialogTitle className="text-foreground flex items-center gap-2">
            {selected ? (
              <>
                <Button variant="ghost" size="sm" className="h-7 -ml-2" onClick={() => setSelected(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-gold-gradient-shimmer">{selected.name}</span>
                <Badge variant="outline" className="border-accent/30 text-accent ml-2">
                  Default {selected.default_commission}%
                </Badge>
              </>
            ) : (
              <>
                <Tag className="h-4 w-4 text-accent" />
                <span className="text-gold-gradient-shimmer">Model-Gruppen</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : selected ? (
            // ── Group detail ──
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">
                  {groupModels.length} Models · Tag:{" "}
                  <span className="text-accent font-medium">{selected.referral_source || "—"}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-accent/30"
                    onClick={syncByTag}
                    disabled={!selected.referral_source}
                    title="Alle Models mit passendem Referrer-Tag dieser Gruppe zuweisen"
                  >
                    <Tag className="h-3 w-3 mr-1" /> Auto-Sync nach Tag
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-accent/30"
                    onClick={() => {
                      setEditingGroup(selected);
                      setForm({
                        name: selected.name,
                        default_commission: selected.default_commission,
                        referral_source: selected.referral_source,
                        color: selected.color,
                        notes: selected.notes,
                      });
                      setCreateOpen(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive"
                    onClick={() => deleteGroup(selected)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Löschen
                  </Button>
                  <Button
                    size="sm"
                    className="bg-accent text-accent-foreground gold-glow"
                    onClick={generateBilling}
                  >
                    <Receipt className="h-3 w-3 mr-1" /> Abrechnung erstellen
                  </Button>
                </div>
              </div>


              <div className="flex items-end gap-3 p-3 rounded-lg bg-muted/30 border border-accent/10">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Zeitraum von</Label>
                  <Input
                    type="date"
                    value={billingPeriod.from}
                    onChange={(e) => setBillingPeriod((p) => ({ ...p, from: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">bis</Label>
                  <Input
                    type="date"
                    value={billingPeriod.to}
                    onChange={(e) => setBillingPeriod((p) => ({ ...p, to: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!!fetchAllProgress || groupModels.length === 0}
                  onClick={fetchAllInGroup}
                  className="h-8 bg-gradient-to-r from-accent/90 to-accent text-accent-foreground hover:from-accent hover:to-accent/90 shadow-sm"
                  title="Umsätze für alle Models der Gruppe für den Monat von 'Zeitraum von' abrufen"
                >
                  {fetchAllProgress ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> {fetchAllProgress.done}/{fetchAllProgress.total}</>
                  ) : (
                    <><Download className="h-3.5 w-3.5 mr-1.5" /> Alle fetchen</>
                  )}
                </Button>
              </div>


              <div className="pr-2">
                <div className="space-y-2">
                  {groupModels.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Keine Models in dieser Gruppe. Setze die Gruppe beim Anlegen oder Bearbeiten eines Models.
                    </p>
                  )}
                  {groupModels.map((m) => {
                    const baseDefault =
                      m.commission_override != null && Number(m.commission_override) !== 0
                        ? Number(m.commission_override)
                        : Number(selected.default_commission);
                    const autoMatched = m.group_id !== selected.id;
                    const platformInput = (
                      key: "fourbased" | "maloum" | "brezzels",
                      label: string,
                      current: number | null,
                      patchKey:
                        | "commission_override_fourbased"
                        | "commission_override_maloum"
                        | "commission_override_brezzels",
                    ) => (
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-muted-foreground">{label}</Label>
                        <Input
                          type="number"
                          defaultValue={current ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            if (v !== current) updateModelField(m.id, { [patchKey]: v } as any);
                          }}
                          className="h-7 text-xs"
                          placeholder={String(baseDefault)}
                        />
                      </div>
                    );
                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg bg-card border border-accent/10 hover:border-accent/30 transition space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                @{m.username || "—"} · Tag: {m.referrer_tag || "—"}
                              </p>
                              {(() => {
                                const plats = platformsByModel[m.id] || [];
                                if (plats.length === 0) {
                                  return (
                                    <p className="text-[10px] text-muted-foreground/70 italic mt-1">
                                      Keine Plattformen
                                    </p>
                                  );
                                }
                                return (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {plats.map((p) => (
                                      <Badge
                                        key={p}
                                        variant="outline"
                                        className="border-accent/30 text-accent/90 bg-accent/5 text-[9px] px-1.5 py-0 h-4"
                                      >
                                        {p}
                                      </Badge>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                            {autoMatched && (
                              <Badge
                                variant="outline"
                                className="border-accent/40 text-accent text-[9px] shrink-0"
                                title="Per Referrer-Tag automatisch erkannt – noch nicht fest zugeordnet"
                              >
                                Auto
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="border-accent/40 text-accent text-[10px] shrink-0">
                            Default {baseDefault}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-[9px] text-muted-foreground">Default Override</Label>
                            <Input
                              type="number"
                              defaultValue={m.commission_override ?? ""}
                              onBlur={(e) => {
                                const v = e.target.value === "" ? null : Number(e.target.value);
                                if (v !== m.commission_override)
                                  updateModelField(m.id, { commission_override: v });
                              }}
                              className="h-7 text-xs"
                              placeholder={String(selected.default_commission)}
                            />
                          </div>
                          {platformInput(
                            "fourbased",
                            "4Based %",
                            m.commission_override_fourbased,
                            "commission_override_fourbased",
                          )}
                          {platformInput(
                            "maloum",
                            "Maloum %",
                            m.commission_override_maloum,
                            "commission_override_maloum",
                          )}
                          {platformInput(
                            "brezzels",
                            "Brezzels %",
                            m.commission_override_brezzels,
                            "commission_override_brezzels",
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>
            </div>
          ) : (
            // ── Group list ──
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground gold-glow"
                  onClick={() => {
                    resetForm();
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Neue Gruppe
                </Button>
              </div>
              {groups.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Noch keine Gruppen. Lege z. B. "Opus" oder "DI" an.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groups.map((g) => {
                    const tag = (g.referral_source || "").trim().toLowerCase();
                    const count = models.filter(
                      (m) =>
                        m.group_id === g.id ||
                        (tag && (m.referrer_tag || "").trim().toLowerCase() === tag),
                    ).length;
                    return (
                      <motion.div
                        key={g.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelected(g)}
                        className="cursor-pointer p-4 rounded-xl bg-card border border-accent/15 hover:border-accent/40 hover:gold-glow transition"
                        style={{ borderLeftColor: g.color, borderLeftWidth: 3 }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{g.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Tag: {g.referral_source || "—"} · {count} Models
                            </p>
                          </div>
                          <Badge variant="outline" className="border-accent/30 text-accent">
                            {g.default_commission}%
                          </Badge>
                        </div>
                        {g.notes && (
                          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{g.notes}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create / edit group dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="bg-card border-accent/20">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Gruppe bearbeiten" : "Neue Gruppe"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="z. B. Opus"
                />
              </div>
              <div>
                <Label className="text-xs">Referrer-Tag</Label>
                <Input
                  value={form.referral_source}
                  onChange={(e) => setForm((p) => ({ ...p, referral_source: e.target.value }))}
                  placeholder="z. B. Opus – Models mit diesem Tag werden automatisch zugeordnet"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Alle Models, deren Referrer-Tag (case-insensitive) übereinstimmt, erscheinen automatisch in dieser Gruppe.
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs">Default Commission</Label>
                  <Badge variant="outline" className="border-accent/40 text-accent">
                    {form.default_commission}%
                  </Badge>
                </div>
                <Slider
                  value={[form.default_commission]}
                  onValueChange={([v]) => setForm((p) => ({ ...p, default_commission: v }))}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div>
                <Label className="text-xs">Notizen</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Farbe</Label>
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-9 w-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={saveGroup} className="bg-accent text-accent-foreground">
                  <Save className="h-3 w-3 mr-1" /> Speichern
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Billing result dialog */}
        <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
          <DialogContent className="max-w-3xl bg-card border-accent/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-accent" />
                Abrechnung – {selected?.name}
                <span className="text-xs text-muted-foreground ml-2">
                  {billingPeriod.from} → {billingPeriod.to}
                </span>
              </DialogTitle>
            </DialogHeader>
            {billingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-[420px] pr-2">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground border-b border-accent/10">
                      <tr>
                        <th className="text-left py-2">Model</th>
                        <th className="text-left">Referral</th>
                        <th className="text-right">Gross</th>
                        <th className="text-right">%</th>
                        <th className="text-right">Commission</th>
                        <th className="text-right">Net Payout</th>
                        <th className="text-right pl-2">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingItems.map((i) => (
                        <tr key={i.model_id} className="border-b border-accent/5">
                          <td className="py-2 text-foreground">{i.model_name}</td>
                          <td className="text-muted-foreground">{i.referral_source || "—"}</td>
                          <td className="text-right num">€{i.gross.toFixed(2)}</td>
                          <td className="text-right text-accent num">{i.commission_pct}%</td>
                          <td className="text-right num">€{i.commission_amount.toFixed(2)}</td>
                          <td className="text-right num font-semibold text-accent">
                            €{i.net_payout.toFixed(2)}
                          </td>
                          <td className="text-right pl-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-accent/30"
                              disabled={invoiceLoading === i.model_id || i.net_payout <= 0}
                              onClick={() => generateInvoice(i)}
                            >
                              {invoiceLoading === i.model_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileDown className="h-3 w-3" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-accent/20">
                      <tr>
                        <td colSpan={2} className="py-2 font-semibold">
                          Total
                        </td>
                        <td className="text-right num font-semibold">
                          €{billingItems.reduce((s, i) => s + i.gross, 0).toFixed(2)}
                        </td>
                        <td></td>
                        <td className="text-right num font-semibold">
                          €{billingItems.reduce((s, i) => s + i.commission_amount, 0).toFixed(2)}
                        </td>
                        <td className="text-right num font-bold text-accent">
                          €{billingItems.reduce((s, i) => s + i.net_payout, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={copyBillingCSV} className="border-accent/30">
                    <Copy className="h-3 w-3 mr-1" /> Als CSV kopieren
                  </Button>
                  <Button
                    onClick={generateAllInvoices}
                    disabled={!!invoiceLoading || billingItems.every((i) => i.net_payout <= 0)}
                    className="bg-accent text-accent-foreground gold-glow"
                  >
                    {invoiceLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <FileDown className="h-3 w-3 mr-1" />
                    )}
                    Alle Provider Invoices
                  </Button>
                  <Button onClick={() => setBillingOpen(false)} variant="ghost">
                    <X className="h-3 w-3 mr-1" /> Schließen
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
