import { useState, useEffect, useCallback, useMemo, useRef } from "react";

/** Data-freshness label for today's ingested revenue. Stale = older than 3h. */
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
function freshnessInfo(ts: Date | null, lang: string) {
  if (!ts) return null;
  const time = ts.toLocaleTimeString(lang === "en" ? "en-GB" : "de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const stale = Date.now() - ts.getTime() > STALE_AFTER_MS;
  return {
    stale,
    label: stale
      ? lang === "en"
        ? `Updating – as of ${time}`
        : `Daten werden aktualisiert – Stand ${time}`
      : lang === "en"
        ? `As of ${time}`
        : `Stand ${time}`,
  };
}
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Save,
  CheckCircle2,
  Award,
  Zap,
  HelpCircle,
  FileText,
  Clock,
  Users,
  User,
  Pencil,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Smartphone,
  MessageSquare,
  ExternalLink,
  Gift,
  Crown,
  Diamond,
  Medal,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  Trophy,
  AlertTriangle,
  VolumeX,
  Info,
} from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demoMode";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import DashboardChat from "@/components/DashboardChat";
import { useAppPresence } from "@/hooks/useAppPresence";
import BillingAudioDialog from "@/components/BillingAudioDialog";
import DailyChecklist from "@/components/DailyChecklist";
import BrezzelsCommentTargets from "@/components/BrezzelsCommentTargets";
import MassDmGenerator from "@/components/MassDmGenerator";
import DailyGoal from "@/components/DailyGoal";
import StreakTracker from "@/components/StreakTracker";
import MonthlyStreakTracker from "@/components/MonthlyStreakTracker";
import NotificationBanner from "@/components/NotificationBanner";
import { useAuth } from "@/hooks/useAuth";
import { isGamificationExcluded } from "@/lib/commitmentFlag";
import { useUILanguage } from "@/hooks/useUILanguage";
import { supabase } from "@/integrations/supabase/client";
import { withWriteRetry } from "@/lib/netRetry";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { format, endOfMonth, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import HomescreenTutorial from "@/components/HomescreenTutorial";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import CommitmentPrompt from "@/components/CommitmentPrompt";
import CommitmentCard from "@/components/CommitmentCard";

import LootBoxReward from "@/components/LootBoxReward";
import FrageMemoDialog from "@/components/FrageMemoDialog";
import ModelRequestDialog, { EditRequestData } from "@/components/ModelRequestDialog";
import RequestMediaPicker, { type RequestAttachment } from "@/components/RequestMediaPicker";
import RequestMediaList from "@/components/RequestMediaList";
import RevenueChart from "@/components/RevenueChart";
import MonthSummaryWidget from "@/components/MonthSummaryWidget";

import ChatterFaqWidget from "@/components/ChatterFaqWidget";
import ModelProfilePreviewCards from "@/components/ModelProfilePreviewCards";
import QuickActionBar from "@/components/QuickActionBar";
import InspirationLibrary from "@/components/InspirationLibrary";
import ThirtyDayChallenge from "@/components/ThirtyDayChallenge";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { highlightSection } from "@/lib/sectionHighlight";


// Streak helper (mirrors StreakTracker logic)
function getStreakDays(): number {
  try {
    const raw = localStorage.getItem("streak_data");
    if (!raw) return 0;
    const { dates } = JSON.parse(raw) as { dates: string[] };
    if (!dates || dates.length === 0) return 0;
    const sorted = [...new Set(dates)].sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let count = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) count++;
      else break;
    }
    return count;
  } catch {
    return 0;
  }
}

const BONUS_TIERS = [
  { name: "Starter", emoji: "⚡", min: 0, max: 2999, rate: 20 },
  { name: "Elite", emoji: "💎", min: 3000, max: Infinity, rate: 25 },
] as const;

function getCurrentTier(monthlyRevenue: number) {
  return BONUS_TIERS.find((t) => monthlyRevenue >= t.min && monthlyRevenue <= t.max) || BONUS_TIERS[0];
}

function getNextTier(monthlyRevenue: number) {
  const currentIdx = BONUS_TIERS.findIndex((t) => monthlyRevenue >= t.min && monthlyRevenue <= t.max);
  if (currentIdx < BONUS_TIERS.length - 1) return BONUS_TIERS[currentIdx + 1];
  return null;
}

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (start === target) {
      setValue(target);
      return;
    }
    const startTime = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// Stagger container/item variants
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
} as const;
const staggerItem = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
} as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
} as const;

function AnimatedValue({ value, suffix = "€", className }: { value: number; suffix?: string; className?: string }) {
  const animated = useAnimatedCounter(value);
  return (
    <span className={className}>
      {animated.toLocaleString("de-DE")}
      {suffix}
    </span>
  );
}

function TierLabel({ tier, className }: { tier: { name: string; emoji: string }; className?: string }) {
  if (tier.name === "Champions League") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
        <motion.span
          initial={{ rotate: -8, scale: 0.9 }}
          animate={{
            rotate: [-8, 8, -8],
            scale: [1, 1.12, 1],
            filter: [
              "drop-shadow(0 0 6px hsl(43 76% 56% / 0.6))",
              "drop-shadow(0 0 14px hsl(43 76% 56% / 0.95))",
              "drop-shadow(0 0 6px hsl(43 76% 56% / 0.6))",
            ],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex"
        >
          <Trophy className="h-[1.05em] w-[1.05em] text-[hsl(43_90%_58%)] fill-[hsl(43_90%_58%)]" />
        </motion.span>
        <span className="text-gold-gradient-shimmer is-animated">{tier.name}</span>
      </span>
    );
  }
  return (
    <span className={className}>
      {tier.emoji} {tier.name}
    </span>
  );
}


function AnimatedDecimalValue({
  value,
  suffix = "€",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const animated = useAnimatedCounter(Math.round(value * 100));
  const display = (animated / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

export default function Dashboard() {
  useAppPresence("chatter");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const platform = searchParams.get("platform") || "Brezzels";

  const { user } = useAuth();
  const { lang, t } = useUILanguage();

  // Role-guard: if this user isn't a chatter (e.g. a fanvue_model who installed
  // the PWA from the root manifest and landed on /dashboard), redirect them to
  // their correct dashboard instead of rendering the chatter UI.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled || !data) return;
      const roles = data.map((r: any) => r.role);
      // Chatters have no special role row — anyone with a role row that maps
      // to another dashboard gets redirected.
      if (roles.includes("fanvue_model")) navigate("/socialmedia/model", { replace: true });
      else if (roles.includes("model")) navigate("/model", { replace: true });
      else if (roles.includes("socialmedia_marketer")) navigate("/marketer", { replace: true });
      else if (roles.includes("fanvue_partner")) navigate("/socialmedia/admin", { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);



  const [telegramId, setTelegramId] = useState("");
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramHelpOpen, setTelegramHelpOpen] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupNameSaved, setGroupNameSaved] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [userName, setUserName] = useState("");

  const [offer, setOffer] = useState("");
  const [assignedAccounts, setAssignedAccounts] = useState<
    {
      id: string;
      account_email: string;
      account_password: string;
      account_domain: string;
      platform: string;
      assigned_at: string | null;
      drive_folder_id?: string;
      model_language?: string;
      model_active?: boolean;
      model_status?: "active" | "semi" | "inactive";
      model_id?: string | null;
      model_name?: string;
    }[]
  >([]);
  const [perModelMonthly, setPerModelMonthly] = useState<{ name: string; total: number }[]>([]);
  const [perModelLoaded, setPerModelLoaded] = useState(false);
  const [modelInactiveInfoOpen, setModelInactiveInfoOpen] = useState(false);

  const [demoModelInactive, setDemoModelInactive] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyAttachments, setReplyAttachments] = useState<Record<string, RequestAttachment[]>>({});
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [showArchivedRequests, setShowArchivedRequests] = useState(false);
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(new Set());
  const [editRequest, setEditRequest] = useState<any>(null);
  const [seenRequestIds, setSeenRequestIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("seen_request_updates");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });


  const loadMyRequests = useCallback(async () => {
    if (!user) return;

    // Models, die dieser Chatter aktuell betreut → er darf auch Anfragen sehen,
    // die ein früherer Chatter für dieses Model gestellt hat (Chatterwechsel).
    const { data: myAccounts } = await supabase
      .from("accounts")
      .select("model_id")
      .eq("assigned_to", user.id);
    const myModelIds = Array.from(
      new Set((myAccounts || []).map((a: any) => a.model_id).filter(Boolean)),
    ) as string[];

    const [{ data: ownReqs }, { data: inheritedReqs }] = await Promise.all([
      supabase
        .from("model_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      myModelIds.length
        ? supabase
            .from("model_requests")
            .select("*")
            .in("model_id", myModelIds)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const data = [
      ...(ownReqs || []).map((r: any) => ({ ...r, _inherited: false })),
      ...(inheritedReqs || []).map((r: any) => ({ ...r, _inherited: true })),
    ].sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));

    if (data) {
      const ids = data.map((r: any) => r.id);
      let msgsByReq: Record<string, any[]> = {};
      let fupsByReq: Record<string, any[]> = {};
      if (ids.length > 0) {
        const fetchForRequestIds = async (
          table: "model_request_messages" | "model_request_followups",
          select: string,
          orderColumn: string,
        ): Promise<{ rows: any[]; error: any }> => {
          const rows: any[] = [];
          const ID_BATCH = 40;
          const PAGE_SIZE = 1000;
          for (let start = 0; start < ids.length; start += ID_BATCH) {
            const batch = ids.slice(start, start + ID_BATCH);
            for (let page = 0; page < 100; page++) {
              const from = page * PAGE_SIZE;
              const result = await (supabase as any)
                .from(table)
                .select(select)
                .in("request_id", batch)
                .order(orderColumn, { ascending: true })
                .range(from, from + PAGE_SIZE - 1);
              if (result.error) return { rows, error: result.error };
              const chunk = result.data || [];
              rows.push(...chunk);
              if (chunk.length < PAGE_SIZE) break;
            }
          }
          return { rows, error: null };
        };

        const [msgsResult, fupsResult] = await Promise.all([
          fetchForRequestIds("model_request_messages", "*", "created_at"),
          fetchForRequestIds("model_request_followups", "id, request_id, sent_at, note", "sent_at"),
        ]);
        const { rows: msgs, error: msgsError } = msgsResult;
        const { rows: fups, error: fupsError } = fupsResult;
        if (msgsError) {
          console.error("[RequestMessages] load failed", msgsError);
          toast.error(
            "Kommentare konnten nicht geladen werden. Bitte prüfe deine Verbindung und lade die Seite neu.",
            { duration: 12000 },
          );
        }
        if (fupsError) console.error("[RequestFollowups] load failed", fupsError);
        (msgs || []).forEach((m: any) => {
          (msgsByReq[m.request_id] ||= []).push(m);
        });
        (fups || []).forEach((f: any) => {
          (fupsByReq[f.request_id] ||= []).push(f);
        });
      }
      setMyRequests(
        data.map((r: any) => ({
          ...r,
          _messages: msgsByReq[r.id] || [],
          _followups: fupsByReq[r.id] || [],
        })),
      );
    }
  }, [user]);


  useEffect(() => {
    if (user) loadMyRequests();
  }, [user, loadMyRequests]);

  // Realtime: update request status/comments live when admin changes them
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my_requests_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_requests", filter: `user_id=eq.${user.id}` },
        () => loadMyRequests(),
      )
      // Übernommene Anfragen (Chatterwechsel): ohne Filter, RLS liefert nur Erlaubtes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_requests" },
        () => loadMyRequests(),
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_request_messages" },
        () => loadMyRequests(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_request_followups" },
        () => loadMyRequests(),
      )
      // Silent reconnects – no status toasts. Problems are only reported when a
      // send actually fails.
      .subscribe();

    const handleVisible = () => {
      if (document.visibilityState === "visible") void loadMyRequests();
    };
    const handleOnline = () => void loadMyRequests();
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("online", handleOnline);


    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("online", handleOnline);
      supabase.removeChannel(channel);
    };
  }, [user, loadMyRequests]);


  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFrageMemo, setShowFrageMemo] = useState(false);
  const [homescreenDismissed, setHomescreenDismissed] = useState(() => {
    // If PWA is already installed or tutorial was seen, no need to wait
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    const seen = localStorage.getItem("homescreen_tutorial_seen");
    const forced = localStorage.getItem("force_homescreen_tutorial") === "1";
    if (forced) return isStandalone;
    return isStandalone || !!seen;
  });

  const [isPwaInstalled, setIsPwaInstalled] = useState(() => {
    return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
  });

  // Listen for PWA install changes (e.g. user adds to homescreen while page is open)
  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsPwaInstalled(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Load profile data – retry once on transient auth races so we don't
  // briefly render an "empty" header (no name / group / telegram) for users
  // whose session is still warming up.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadProfile = async (attempt = 0): Promise<void> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("telegram_id, group_name, offer, name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn("[Dashboard] profile load error", error);
        if (attempt < 2) {
          setTimeout(() => loadProfile(attempt + 1), 600 * (attempt + 1));
          return;
        }
      }

      // If the row is missing AND we have no cached values yet, retry once –
      // this can happen during a brief session-restore race after a refresh.
      if (!data && attempt < 2) {
        setTimeout(() => loadProfile(attempt + 1), 600 * (attempt + 1));
        return;
      }

      if (data?.telegram_id) {
        setTelegramId(data.telegram_id);
        setTelegramSaved(true);
      }
      if (data?.group_name) {
        setGroupName(data.group_name);
        setGroupNameSaved(true);
      }
      if ((data as any)?.name) setUserName((data as any).name);
      if (data?.offer) setOffer(data.offer);
      setTelegramLoading(false);
    };

    loadProfile();

    // Load all assigned accounts (+ resolve model names for the request dialog)
    // We need accounts assigned via BOTH paths:
    //   1. accounts.assigned_to = user.id (normal post-claim state)
    //   2. open account_assignments rows linked to this user's profile_id
    //      (pre-create profiles whose account row was never updated with assigned_to)
    (async () => {
      // 1) directly-assigned accounts
      const { data: direct } = await supabase
        .from("accounts")
        .select(
          "id, account_email, account_password, account_domain, platform, assigned_at, drive_folder_id, model_language, model_active, model_status, model_id",
        )
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: true });

      // 2) account_assignments via profile_id (covers pre-create handoffs)
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let viaAssignments: any[] = [];
      if (myProfile?.id) {
        const { data: aa } = await supabase
          .from("account_assignments")
          .select("account_id")
          .or(`user_id.eq.${user.id},profile_id.eq.${myProfile.id}`)
          .is("end_date", null);
        const ids = Array.from(new Set((aa || []).map((r: any) => r.account_id))).filter(Boolean);
        const directIds = new Set((direct || []).map((a: any) => a.id));
        const missing = ids.filter((id) => !directIds.has(id));
        if (missing.length > 0) {
          const { data: extra } = await supabase
            .from("accounts")
            .select(
              "id, account_email, account_password, account_domain, platform, assigned_at, drive_folder_id, model_language, model_active, model_status, model_id",
            )
            .in("id", missing as string[]);
          viaAssignments = extra || [];
        }
      }

      const accounts = [...(direct || []), ...viaAssignments];
      const modelIds = Array.from(new Set(accounts.map((a: any) => a.model_id).filter(Boolean)));
      const metaById: Record<string, { name?: string; lang?: string }> = {};
      if (modelIds.length > 0) {
        const { data: models } = await supabase
          .from("models")
          .select("id, name, username, model_language")
          .in("id", modelIds as string[]);
        (models || []).forEach((m: any) => {
          // Chatter sehen immer den Benutzernamen, nie den echten Namen
          metaById[m.id] = { name: m.username || m.name, lang: m.model_language };
        });
      }
      setAssignedAccounts(
        accounts.map((a: any) => {
          const meta = a.model_id ? metaById[a.model_id] : undefined;
          return {
            ...a,
            model_name: meta?.name,
            // Prefer the models table (source of truth) over accounts.model_language,
            // which can be stale if the model's language was changed later.
            model_language: meta?.lang || a.model_language || "de",
          };
        }),
      );
    })();


    // Check if first login
    supabase
      .from("login_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (count !== null && count <= 1) {
          setIsFirstLogin(true);
        }
      });

    // Track PWA install status
    if (isPwaInstalled) {
      supabase
        .from("profiles")
        .update({ pwa_installed: true } as any)
        .eq("user_id", user.id)
        .then();
    }

    return () => {
      cancelled = true;
    };
  }, [user, isPwaInstalled]);
  const saveTelegram = async () => {
    if (!user) return;
    const trimmed = telegramId.trim();
    const digitCount = (trimmed.match(/\d/g) || []).length;
    if (digitCount < 7) {
      setTelegramHelpOpen(true);
      return;
    }
    // Proactively claim any pre-create profile that already owns this
    // telegram_id BEFORE we try to upsert – avoids the unique-index race
    // for users whose auth profile row doesn't exist yet.
    const { data: claimData, error: claimErr } = await (supabase as any).rpc(
      "claim_pre_create_by_telegram",
      { p_telegram_id: trimmed }
    );
    if (claimErr) {
      console.warn("[saveTelegram] claim RPC failed", claimErr);
    }

    let { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, telegram_id: trimmed }, { onConflict: "user_id" });

    // Fallback: if the upsert still hits a unique-violation, retry the claim + upsert once more.
    if (error && (error as any).code === "23505") {
      const { error: rpcErr } = await (supabase as any).rpc("claim_pre_create_by_telegram", {
        p_telegram_id: trimmed,
      });
      if (!rpcErr) {
        const retry = await supabase
          .from("profiles")
          .upsert({ user_id: user.id, telegram_id: trimmed }, { onConflict: "user_id" });
        error = retry.error;
      } else {
        console.warn("[saveTelegram] second claim RPC failed", rpcErr);
      }
    }

    if (error) {
      console.error("[saveTelegram] upsert failed", error);
      const msg = (error as any)?.message || (error as any)?.code || "Unbekannter Fehler";
      toast.error(`Fehler beim Speichern: ${msg}`);
      return;
    }
    if (claimData && (claimData as any).merged) {
      toast.success("Telegram-ID gespeichert & bestehende Daten übernommen!");
    } else {
      toast.success("Telegram-ID gespeichert!");
    }
    setTelegramSaved(true);
  };

  const saveGroupName = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, group_name: groupName.trim() }, { onConflict: "user_id" });
    if (error) {
      toast.error("Fehler beim Speichern");
      return;
    }
    setGroupNameSaved(true);
    setEditingGroupName(false);
    toast.success("Gruppenname gespeichert!");
  };

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [umsatz, setUmsatz] = useState(0);
  const [dataFreshness, setDataFreshness] = useState<Date | null>(null);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [hadConfetti, setHadConfetti] = useState(false);
  const [savingRevenue, setSavingRevenue] = useState(false);
  const { playCoinSound, playLevelUpSound } = useSoundEffects();
  const prevTierRef = useRef<string | null>(null);

  // Load revenue data from accounts_data (only currently assigned accounts).
  // Keep this callable so ingests and returning from another app refresh the figures.
  const loadRevenue = useCallback(async () => {
    if (!user) return;
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + "01";
      const yearStart = today.slice(0, 4) + "-01-01";

      // Freshness of today's ingested data (silently ignored on failure)
      void supabase
        .rpc("get_chatter_data_freshness")
        .then(({ data: ts }) => setDataFreshness(ts ? new Date(ts as string) : null));

      const { data, error } = await supabase.rpc("get_chatter_revenue_series", {
        p_from: yearStart,
        p_to: today,
      });

      if (error) {
        console.error("get_chatter_revenue_series error", error);
        return;
      }

      if (data) {
        const rows = data as { date: string; total: number | string }[];
        const todayEntry = rows.find((d) => d.date === today);
        setUmsatz(todayEntry ? Number(todayEntry.total) : 0);

        const yesterdayEntry = rows.find((d) => d.date === yesterday);
        setYesterdayRevenue(yesterdayEntry ? Number(yesterdayEntry.total) : 0);

        const monthly = rows.filter((d) => d.date >= monthStart).reduce((sum, d) => sum + Number(d.total), 0);
        setMonthlyRevenue(monthly);

        const total = rows.reduce((sum, d) => sum + Number(d.total), 0);
        setTotalRevenue(total);
      }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadRevenue();

    const channel = supabase
      .channel(`dashboard_revenue_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts_data" },
        () => void loadRevenue(),
      )
      .subscribe();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadRevenue();
    };
    const refreshWhenOnline = () => void loadRevenue();
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadRevenue();
    }, 30_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenOnline);

    return () => {
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenOnline);
      supabase.removeChannel(channel);
    };
  }, [user, loadRevenue]);

  // Per-model monthly revenue (needed for the 3.000 € Elite rule)
  useEffect(() => {
    if (!user || assignedAccounts.length === 0) return;
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + "01";
      const ids = assignedAccounts.map((a) => a.id);
      const { data, error } = await supabase
        .from("accounts_data")
        .select("account_id,total,date")
        .in("account_id", ids)
        .gte("date", monthStart)
        .lte("date", today);
      if (cancelled) return;
      if (error) {
        console.error("per-model revenue error", error);
        return;
      }
      const byAccount: Record<string, number> = {};
      for (const row of (data || []) as any[]) {
        byAccount[row.account_id] = (byAccount[row.account_id] || 0) + Number(row.total || 0);
      }
      const byModel: Record<string, number> = {};
      for (const acc of assignedAccounts) {
        const key = acc.model_name || acc.account_email || acc.id;
        byModel[key] = (byModel[key] || 0) + (byAccount[acc.id] || 0);
      }
      setPerModelMonthly(
        Object.entries(byModel)
          .map(([name, total]) => ({ name, total: Math.round(total) }))
          .sort((a, b) => b.total - a.total),
      );
      setPerModelLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, assignedAccounts]);




  // // Save revenue on change (debounced)
  // const saveRevenue = useCallback(async (amount: number) => {
  //   if (!user) return;
  //   setSavingRevenue(true);
  //   const today = new Date().toISOString().slice(0, 10);
  //   console.log(today, amount)
  //   // const { error } = await supabase.
  //   // from("daily_revenue").
  //   // upsert(
  //   //   { user_id: user.id, date: today, amount },
  //   //   { onConflict: "user_id,date" }
  //   // );
  //   // if (error) {
  //   //   toast.error("Fehler beim Speichern des Umsatzes");
  //   // }
  //   playCoinSound();
  //   setSavingRevenue(false);
  // }, [user, playCoinSound]);

  // const handleUmsatzChange = useCallback((val: number) => {
  //   setUmsatz(val);
  //   // Recalculate monthly and total with new today value
  //   // We update optimistically
  // }, []);

  // // Debounce save
  // useEffect(() => {
  //   if (!user) return;
  //   const timer = setTimeout(() => {
  //     saveRevenue(umsatz);
  //   }, 800);
  //   return () => clearTimeout(timer);
  // }, [umsatz, saveRevenue, user]);

  // Derived: total includes today's change
  const effectiveMonthlyRevenue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + "01";
    // monthlyRevenue already includes old today value, so we just use the state
    // This is approximate; for accuracy we'd track separately but good enough
    return monthlyRevenue;
  }, [monthlyRevenue]);

  const FORCED_ELITE_USER_IDS = new Set(["ad822168-efed-495f-b1da-84fdf75538f3"]);
  const CHAMPIONS_LEAGUE_USER_IDS = new Set(["170b30d0-c3a4-4272-ab57-302860e9e025"]); // Philip S
  const isChampionsLeague = !!(user && CHAMPIONS_LEAGUE_USER_IDS.has(user.id));

  // Elite (25%) qualifies only if >= 3.000 € monthly revenue with a SINGLE model
  const bestModelMonthly = useMemo(
    () => perModelMonthly.reduce((max, m) => Math.max(max, m.total), 0),
    [perModelMonthly],
  );
  // Until per-model data is loaded, fall back to total monthly revenue (avoids flicker)
  const tierBasisRevenue = perModelLoaded ? bestModelMonthly : monthlyRevenue;

  let currentTier: { name: string; emoji: string; min: number; max: number; rate: number } =
    getCurrentTier(tierBasisRevenue) as any;
  let nextTier: { name: string; emoji: string; min: number; max: number; rate: number } | null =
    getNextTier(tierBasisRevenue) as any;
  if (isChampionsLeague) {
    currentTier = { name: "Champions League", emoji: "🏆", min: 0, max: Infinity, rate: 30 };
    nextTier = null;
  } else if (user && FORCED_ELITE_USER_IDS.has(user.id) && currentTier.rate < 25) {
    const eliteIdx = BONUS_TIERS.findIndex((t) => t.name === "Elite");
    currentTier = BONUS_TIERS[eliteIdx];
    nextTier = BONUS_TIERS[eliteIdx + 1] ?? null;
  }
  const rate = currentTier.rate / 100;
  const verdienst = monthlyRevenue * rate;
  const isTopTier = !nextTier;
  const progressToNext = nextTier
    ? Math.min(((tierBasisRevenue - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)
    : 100;


  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a"],
    });
  }, []);

  useEffect(() => {
    if (isTopTier && !hadConfetti) {
      setHadConfetti(true);
      fireConfetti();
    }
    if (!isTopTier) setHadConfetti(false);
  }, [isTopTier, hadConfetti, fireConfetti]);

  // Tier change sound
  useEffect(() => {
    if (prevTierRef.current && prevTierRef.current !== currentTier.name) {
      playLevelUpSound();
    }
    prevTierRef.current = currentTier.name;
  }, [currentTier.name, playLevelUpSound]);

  // Streak for hot-streak effect
  const streakDays = useMemo(() => getStreakDays(), []);
  const hotStreakClass =
    streakDays >= 7
      ? "hot-streak-7"
      : streakDays >= 6
        ? "hot-streak-6"
        : streakDays >= 5
          ? "hot-streak-5"
          : streakDays >= 4
            ? "hot-streak-4"
            : streakDays >= 3
              ? "hot-streak-3"
              : "";

  return (
    <div className="min-h-screen pb-24">
      <GoldParticles spawnRate={0.25} maxParticles={20} baseOpacity={0.2} />
      <HomescreenTutorial
        isFirstLogin={isFirstLogin}
        manualOpen={showTutorial}
        onManualClose={() => {
          setShowTutorial(false);
          setHomescreenDismissed(true);
        }}
        onDismiss={() => setHomescreenDismissed(true)}
      />
      <DashboardOnboarding
        isFirstLogin={isFirstLogin}
        manualOpen={showOnboarding}
        onManualClose={() => setShowOnboarding(false)}
        waitForDismiss={!homescreenDismissed}
      />
      <PushNotificationDialog />
      <CommitmentPrompt />
      
      <FrageMemoDialog open={showFrageMemo} onOpenChange={setShowFrageMemo} />
      {/* Header with Telegram + Umsatz inline */}
      <header className="header-gradient-border">
        <div className="container max-w-5xl mx-auto px-4 py-3 lg:px-8">
          {/* Desktop: clean pill-based meta header */}
          <div className="hidden sm:flex items-center gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <img src={logo} alt="Logo" className="h-9 w-9 rounded-full" />
              <h1 className="text-base lg:text-lg font-bold text-foreground leading-tight whitespace-nowrap">
                Chatter Dashboard
              </h1>
            </div>

            {/* Meta pills cluster */}
            <div className="flex flex-1 items-center gap-2 min-w-0 max-w-3xl">
              {/* Name pill (read-only) – hidden when it duplicates the group name */}
              {userName && userName.trim().toLowerCase() !== groupName.trim().toLowerCase() && (
                <div className="relative flex-1 min-w-0 group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <div
                    className="w-full h-9 flex items-center pl-9 pr-3 rounded-full bg-secondary/60 border border-border text-sm truncate text-foreground font-medium"
                    title={userName}
                  >
                    {userName}
                  </div>
                </div>
              )}

              {/* Group name pill – read-only if set, editable fallback if empty */}
              <div className="relative flex-1 min-w-0 group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                {groupName ? (
                  <div
                    className="w-full h-9 flex items-center pl-9 pr-3 rounded-full bg-secondary/60 border border-border text-sm truncate text-foreground font-medium"
                    title={groupName}
                  >
                    <span className="truncate">{groupName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && groupName.trim()) saveGroupName(); }}
                      placeholder={lang === "en" ? "Group Name" : "Gruppenname"}
                      className="h-9 pl-9 pr-3 rounded-full bg-secondary/60 border-border text-sm"
                    />
                    {groupName.trim() && (
                      <Button size="sm" className="h-9 px-3" onClick={saveGroupName}>
                        {lang === "en" ? "Save" : "Speichern"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Telegram ID pill – read-only if set, editable fallback if empty */}
              <div className="relative flex-1 min-w-0 group">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                {telegramId && telegramSaved ? (
                  <div
                    className="w-full h-9 flex items-center pl-9 pr-3 rounded-full bg-secondary/60 border border-border text-sm truncate text-foreground font-medium"
                    title={telegramId}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mr-1.5" />
                    <span className="truncate">{telegramId}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={telegramId}
                      onChange={(e) => { setTelegramId(e.target.value); setTelegramSaved(false); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && telegramId.trim()) saveTelegram(); }}
                      placeholder="Telegram ID"
                      className="h-9 pl-9 pr-3 rounded-full bg-secondary/60 border-border text-sm"
                    />
                    {telegramId.trim() && (
                      <Button size="sm" className="h-9 px-3" onClick={saveTelegram}>
                        {lang === "en" ? "Save" : "Speichern"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-border">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold leading-none">
                  {lang === "en" ? "Revenue" : "Umsatz"}
                </p>
                <p className="text-foreground font-semibold text-base leading-tight mt-0.5">€{umsatz || "0"}</p>
                {(() => {
                  const f = freshnessInfo(dataFreshness, lang);
                  if (!f) return null;
                  return (
                    <p className={`text-[9px] leading-none mt-0.5 ${f.stale ? "text-accent" : "text-muted-foreground"}`}>
                      {f.label}
                    </p>
                  );
                })()}
              </div>
              <Badge
                className={
                  isTopTier ? "bg-accent text-accent-foreground gold-glow" : "bg-secondary text-secondary-foreground"
                }
              >
                <Award className="h-3 w-3 mr-1" />
                <TierLabel tier={currentTier} />
              </Badge>
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex sm:hidden flex-col gap-3">
            {/* Row 1: Logo + Title + Badge + Refresh */}
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-foreground leading-tight">Chatter Dashboard</h1>
              </div>
              
              <button
                onClick={() => setShowOnboarding(true)}
                className="hidden"
                aria-hidden
              />

              <button
                type="button"
                onClick={async () => {
                  try {
                    if ("caches" in window) {
                      const names = await caches.keys();
                      await Promise.all(names.map((n) => caches.delete(n)));
                    }
                    if ("serviceWorker" in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      await Promise.all(regs.map((r) => r.unregister()));
                    }
                  } catch (e) {
                    console.error("Refresh failed:", e);
                  }
                  window.location.reload();
                }}
                aria-label="App aktualisieren"
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-accent border border-accent/20 bg-accent/5 hover:bg-accent/15 hover:border-accent/40 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <Badge
                className={`shrink-0 text-[10px] ${isTopTier ? "bg-accent text-accent-foreground gold-glow" : "bg-secondary text-secondary-foreground"}`}
              >
                <Award className="h-3 w-3 mr-1" />
                <TierLabel tier={currentTier} />
              </Badge>
            </div>

            {/* Row 1b: Name – hidden when it duplicates the group name */}
            {userName && userName.trim().toLowerCase() !== groupName.trim().toLowerCase() && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-xs font-medium truncate text-foreground">
                  {userName}
                </span>
              </div>
            )}

            {/* Row 2: Gruppenname – read-only if set, editable fallback if empty */}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-accent shrink-0" />
              {groupName ? (
                <span className="text-xs font-medium truncate flex-1 min-w-0 text-foreground">
                  {groupName}
                </span>
              ) : (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && groupName.trim()) saveGroupName(); }}
                    placeholder={lang === "en" ? "Group Name" : "Gruppenname"}
                    className="h-7 text-xs flex-1 min-w-0"
                  />
                  {groupName.trim() && (
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={saveGroupName}>
                      {lang === "en" ? "Save" : "Speichern"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Telegram (editable fallback) + Umsatz */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {telegramId && telegramSaved ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-xs font-medium truncate text-foreground">
                      {telegramId}
                    </span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3.5 w-3.5 text-accent shrink-0" />
                    <Input
                      value={telegramId}
                      onChange={(e) => { setTelegramId(e.target.value); setTelegramSaved(false); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && telegramId.trim()) saveTelegram(); }}
                      placeholder="Telegram ID"
                      className="h-7 text-xs flex-1 min-w-0"
                    />
                    {telegramId.trim() && (
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={saveTelegram}>
                        {lang === "en" ? "Save" : "Speichern"}
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-0.5" data-tour="revenue-input">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-accent" />
                  <div className="input-gold-shimmer rounded-lg">
                    <span className="h-7 text-sm w-24 font-semibold border-transparent">Umsatz: €{umsatz || "0"}</span>
                  </div>
                </div>
                {(() => {
                  const f = freshnessInfo(dataFreshness, lang);
                  if (!f) return null;
                  return (
                    <span className={`text-[9px] leading-none ${f.stale ? "text-accent" : "text-muted-foreground"}`}>
                      {f.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={`container max-w-5xl mx-auto p-4 lg:px-8 lg:py-8 space-y-5 lg:space-y-6 ${hotStreakClass}`}>
        {/* Notification Banner */}
        <NotificationBanner />

        {/* Commitment Card (nur für Tester) */}
        <CommitmentCard />

        {/* Live Activity Ticker */}
        <LiveActivityTicker />

        {/* Stats Cards */}
        <div data-tour="stats-cards">
          {/* Mobile: 2-col grid with full-width status */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 lg:hidden"
          >
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Umsatz gestern</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={yesterdayRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Monatsumsatz</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={monthlyRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Gesamtumsatz</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={totalRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedDecimalValue value={verdienst} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-3 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Deine Rate</p>
              <p className="text-xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                {Math.round(rate * 100)}%
              </p>
            </motion.div>
            <div className="hidden"><DailyGoal /></div>
            <motion.div
              variants={staggerItem}
              className="gold-gradient-border-animated rounded-xl p-3 text-center col-span-2 pulse-glow"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
              <p className={`text-xl font-bold ${isTopTier ? "text-gold-gradient" : "text-foreground"}`}>
                <TierLabel tier={currentTier} />
              </p>
            </motion.div>
          </motion.div>
          {/* Desktop: Bento grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="hidden lg:grid grid-cols-4 gap-4"
          >
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Umsatz gestern</p>
              <p className="text-2xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={yesterdayRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow card-top-line group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Monatsumsatz</p>
              <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={monthlyRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedValue value={totalRevenue} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow card-top-line group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Verdienst diesen Monat</p>
              <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                <AnimatedDecimalValue value={verdienst} />
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              className="col-span-2 glass-card-subtle rounded-xl p-5 text-center card-hover-glow card-inner-glow group"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Deine Rate</p>
              <p className="text-3xl font-bold text-gold-gradient transition-transform duration-200 group-hover:scale-105">
                {Math.round(rate * 100)}%
              </p>
            </motion.div>
            <div className="hidden"><DailyGoal /></div>
            <motion.div
              variants={staggerItem}
              className="gold-gradient-border-animated rounded-xl p-5 text-center col-span-4 pulse-glow"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Status</p>
              <p className={`text-2xl font-bold ${isTopTier ? "text-gold-gradient" : "text-foreground"}`}>
                <TierLabel tier={currentTier} />
              </p>
            </motion.div>
          </motion.div>

          {/* Billing disclaimer: billing basis is always account statistics */}
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
            <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("dashboard.billingDisclaimer")}
            </p>
          </div>

          {/* Elite-Tracking: 25% gilt nur ab 3.000 € Monatsumsatz mit EINEM Model */}
          {perModelLoaded && perModelMonthly.length > 0 && !isChampionsLeague && (
            <div className="glass-card-subtle rounded-xl p-4 card-inner-glow space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground">Elite-Rate (25 %) — Fortschritt pro Model</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Die 25 % gelten erst, wenn du mit <span className="text-foreground font-semibold">einem einzelnen Model</span> mindestens 3.000 € Monatsumsatz erreichst.
                </p>
              </div>
              <div className="space-y-2.5">
                {perModelMonthly.map((m) => {
                  const pct = Math.min((m.total / 3000) * 100, 100);
                  const done = m.total >= 3000;
                  return (
                    <div key={m.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{m.name}</span>
                        <span className={`text-xs font-bold ${done ? "text-gold-gradient" : "text-foreground"}`}>
                          {m.total.toLocaleString("de-DE")}€ / 3.000€
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${done ? "bg-accent" : "bg-accent/50"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {!perModelMonthly.some((m) => m.total >= 3000) && (
                <p className="text-[10px] text-muted-foreground">
                  Noch{" "}
                  <span className="text-foreground font-semibold">
                    {(3000 - bestModelMonthly).toLocaleString("de-DE")}€
                  </span>{" "}
                  mit deinem stärksten Model bis zur Elite-Rate.
                </p>
              )}
            </div>
          )}
        </div>


        {/* Quick Action Bar */}
        <QuickActionBar
          onStartTour={() => setShowOnboarding(true)}
          onAskQuestion={() => setShowFrageMemo(true)}
          onFocusRevenue={() => {
            const input = document.querySelector(
              'input[placeholder="Umsatz €"], input[placeholder="€"]',
            ) as HTMLInputElement;
            if (input) {
              input.focus();
              input.scrollIntoView({ behavior: "smooth", block: "center" });
              const card = input.closest('[data-section], .glass-card, .glass-card-subtle') ?? input;
              highlightSection(card, "Tagesumsatz eintragen");
            }
          }}
          onScrollToAccount={() => {
            const el = document.querySelector('[data-section="requests"]');
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            highlightSection(el, "Anfragen an das Model");
          }}
          onScrollToInspiration={() => {
            const el = document.querySelector('[data-section="inspiration"]');
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            highlightSection(el, "Inspirations-Bibliothek");
          }}
        />

        {/* PWA Install To-Do */}
        {!isPwaInstalled && (
          <button
            onClick={() => setShowTutorial(true)}
            className="lg:hidden w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 hover:border-accent/50 transition-all"
          >
            <Smartphone className="h-5 w-5 text-accent shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Aufgabe bevor du startest: Füge die App auf deinem Handy zum Homescreen hinzu.
              </p>
              <p className="text-xs text-accent mt-0.5 hover:underline">Wie geht das?</p>
            </div>
          </button>
        )}

        {/* 7-Day Revenue Chart */}
        <div data-tour="revenue-chart">{user && <RevenueChart userId={user.id} />}</div>

        {/* Revenue disclaimer */}
        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed px-2">
          {lang === "en"
            ? "* The numbers shown may differ from the actual values and are not necessarily 100% accurate. Please always verify them against the official platform statistics. These figures are for guidance only — final billing is based exclusively on the platform statistics."
            : "* Die angezeigten Zahlen können von den tatsächlichen Werten abweichen und sind nicht zwingend zu 100 % korrekt. Bitte prüfe die Daten immer anhand der offiziellen Plattformstatistiken. Diese Angaben dienen ausschließlich zur Orientierung — die finale Abrechnung basiert einzig und allein auf den Statistiken der jeweiligen Plattformen."}
        </p>

        {/* 1. Tägliche Aufgaben */}
        <div data-tour="checklist">
          <DailyChecklist />
        </div>

        {/* Brezzels-Profile kommentieren – direkt unter den täglichen Aufgaben für Brezzels-Chatter */}
        {assignedAccounts.some((a) => (a.platform || "").toLowerCase() === "brezzels") && (
          <BrezzelsCommentTargets />
        )}

        {/* 2. Mass-DM Generator */}
        <div data-tour="massdm">
          <MassDmGenerator />
        </div>

        {/* Anfrage an das Model */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="glass-card rounded-xl overflow-hidden card-inner-glow relative"
          data-section="requests"
        >
          {/* Gold shimmer sweep for extra presence */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                background: "linear-gradient(105deg, transparent 40%, hsl(43 56% 52%) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "bonus-sweep 10s ease-in-out infinite",
              }}
            />
          </div>

          {/* Prominent Header */}
          <div className="relative flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-5 border-b border-accent/20 bg-accent/5">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-11 w-11 rounded-full bg-accent/20 flex items-center justify-center shrink-0 ring-2 ring-accent/30"
            >
              <MessageSquare className="h-5 w-5 text-accent" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm lg:text-base font-bold text-gold-gradient">Anfrage an das Model stellen</p>
              <p className="text-[11px] lg:text-xs text-muted-foreground mt-0.5">
                Individuelle oder allgemeine Anfragen direkt an dein Model senden
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Verfügbar</span>
            </div>
          </div>

          {/* Anfrage an das Model – oder Inaktiv-Hinweis */}
          {(() => {
            type ModelStatus = "active" | "semi" | "inactive";
            const resolveStatus = (a: any): ModelStatus => {
              const s = (a?.model_status as ModelStatus | undefined);
              if (s === "semi" || s === "inactive" || s === "active") return s;
              return a?.model_active === false ? "inactive" : "active";
            };
            // Group assigned accounts by model
            const modelsMap = new Map<
              string,
              { id: string; modelId: string | null; name: string; language: "de" | "en"; status: ModelStatus; platforms: Set<string> }
            >();
            assignedAccounts.forEach((a) => {
              const key = a.model_id || a.model_name || a.platform || a.id;
              if (!key) return;
              const existing = modelsMap.get(key);
              const s = resolveStatus(a);
              const rank = (x: ModelStatus) => (x === "active" ? 2 : x === "semi" ? 1 : 0);
              if (existing) {
                if (a.platform) existing.platforms.add(a.platform);
                // Best status across the model's accounts wins
                if (rank(s) > rank(existing.status)) existing.status = s;
                if (!existing.name && a.model_name) existing.name = a.model_name;
                if (!existing.modelId && a.model_id) existing.modelId = String(a.model_id);
                if (a.model_language) existing.language = a.model_language as "de" | "en";
              } else {
                modelsMap.set(key, {
                  id: key,
                  modelId: a.model_id ? String(a.model_id) : null,
                  name: a.model_name || "",
                  language: (a.model_language as "de" | "en") || "de",
                  status: s,
                  platforms: new Set(a.platform ? [a.platform] : []),
                });
              }
            });
            const allModels = Array.from(modelsMap.values());
            const requestableModels = allModels.filter((m) => m.status !== "inactive");
            const hasInactive = allModels.some((m) => m.status === "inactive");
            const hasSemi = allModels.some((m) => m.status === "semi");
            const allInactive = allModels.length > 0 && requestableModels.length === 0;
            const showInactiveBlocker = demoModelInactive || allInactive;
            const showEnglishWarning = requestableModels.some((m) => m.language === "en");

            return (
              <div className="relative">
                {showInactiveBlocker ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-5">
                      <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-5 w-5 text-destructive/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-muted-foreground">
                          {allModels.length > 1
                            ? "Deine Models können momentan keine Anfragen entgegennehmen"
                            : "Dein Model kann momentan keine Anfragen entgegennehmen"}
                        </p>
                        <button
                          onClick={() => setModelInactiveInfoOpen(true)}
                          className="text-[11px] text-accent/70 hover:text-accent underline underline-offset-2 mt-0.5 transition-colors"
                        >
                          Wieso ist das so?
                        </button>
                      </div>
                    </div>
                    <Dialog open={modelInactiveInfoOpen} onOpenChange={setModelInactiveInfoOpen}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Model momentan inaktiv</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Dein Model hat uns mitgeteilt, dass sie aktuell keine neuen Anfragen entgegennehmen kann. Das
                            ist der letzte Stand, den wir haben.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                          <p className="text-sm text-foreground">
                            <strong>Trotzdem kann gutes Geld verdient werden!</strong> Es ist bereits genug Content auf
                            dem Account vorhanden, mit dem du weiterarbeiten kannst. Nutze den vorhandenen Content, um
                            Umsatz zu machen.
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="px-4 py-4 lg:px-6 lg:py-5 space-y-3">
                    {hasInactive && (
                      <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
                        {lang === "en"
                          ? "One of your assigned models is currently not accepting requests. You can still submit requests for your active models below."
                          : "Eines deiner Models nimmt aktuell keine Anfragen entgegen. Für deine aktiven Models kannst du unten weiterhin Anfragen stellen."}
                      </div>
                    )}
                    {hasSemi && (
                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-amber-100/90 leading-relaxed">
                        {lang === "en"
                          ? "One of your models is currently only half-active. You can still submit requests, but keep expectations flexible with customers — no firm promises."
                          : "Eines deiner Models ist aktuell nur halbaktiv. Du kannst weiterhin Anfragen stellen, kommuniziere das Ganze aber vorsichtig mit den Kunden – bitte keine festen Zusagen."}
                      </div>
                    )}
                    {showEnglishWarning && (
                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-amber-200">
                            {lang === "en" ? "Authenticity note" : "Authentizitäts-Hinweis"}
                          </p>
                          <p className="text-[11px] text-amber-100/80 mt-0.5 leading-relaxed">
                            {lang === "en"
                              ? "English-speaking models do not create custom audio or video content with speech, as this would compromise authenticity. Please keep this in mind when submitting requests."
                              : "Englischsprachige Models erstellen keine Custom-Audios oder Videos mit Sprechen, da dies die Authentizität beeinträchtigen würde. Bitte berücksichtige dies bei deinen Anfragen."}
                          </p>
                        </div>
                      </div>
                    )}
                    <ModelProfilePreviewCards
                      models={allModels.map((m) => ({ id: m.id, name: m.name }))}
                    />
                    <ModelRequestDialog
                      onSubmitted={loadMyRequests}
                      editData={editRequest}
                      onEditClear={() => setEditRequest(null)}
                      modelLanguage={
                        (allModels.length === 1
                          ? allModels[0].language
                          : requestableModels[0]?.language || allModels[0]?.language) || "de"
                      }
                      availablePlatforms={Array.from(
                        new Set(
                          (requestableModels.length > 0 ? requestableModels : allModels).flatMap((m) =>
                            Array.from(m.platforms),
                          ),
                        ),
                      )}
                      availableModels={allModels.map((m) => ({
                        id: m.id,
                        modelId: m.modelId,
                        name: m.name,
                        language: m.language,
                        platforms: Array.from(m.platforms),
                        active: m.status !== "inactive",
                        status: m.status,
                      }))}
                    />
                  </div>
                )}
              </div>
            );
          })()}



          {/* Bisherige Anfragen – einklappbar */}
          {myRequests.length > 0 &&
            (() => {
              // Unseen = requests with status !== pending OR with admin messages, that user hasn't seen yet
              const latestAdminMsgTs = (r: any) => {
                const msgs = (r._messages || []).filter((m: any) => m.sender_role === "admin");
                return msgs.length ? msgs[msgs.length - 1].created_at : "";
              };
              const seenKey = (r: any) =>
                r.id + "_" + r.status + "_" + (r.admin_comment || "") + "_" + latestAdminMsgTs(r);
              const unseenCount = myRequests.filter(
                (r) =>
                  (r.status !== "pending" || r.admin_comment || latestAdminMsgTs(r)) &&
                  !seenRequestIds.has(seenKey(r)),
              ).length;

              const markAllSeen = () => {
                const newSeen = new Set(seenRequestIds);
                myRequests.forEach((r) => {
                  newSeen.add(seenKey(r));
                });
                setSeenRequestIds(newSeen);
                localStorage.setItem("seen_request_updates", JSON.stringify([...newSeen]));
              };

              return (
                <div className="border-t border-border/30">
                  <button
                    onClick={() => {
                      const newOpen = !requestsOpen;
                      setRequestsOpen(newOpen);
                      if (newOpen) markAllSeen();
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 lg:px-6 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Deine Anfragen ({myRequests.filter((r) => r.status !== "archived" && r.status !== "rejected").length})
                      </span>
                      {unseenCount > 0 && (
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
                          {unseenCount}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${requestsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {requestsOpen && (
                    <div className="px-4 pb-4 lg:px-6 lg:pb-6 space-y-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="flex items-center gap-2 text-[11px] text-accent hover:underline mb-1 cursor-pointer">
                            <HelpCircle className="h-3.5 w-3.5" />
                            Wie lange dauert es, bis eine Anfrage bearbeitet wird?
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm bg-background border-border">
                          <DialogHeader>
                            <DialogTitle className="text-foreground text-sm">⏳ Bearbeitungsdauer</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-2">
                              In der Regel werden Anfragen innerhalb von{" "}
                              <strong className="text-foreground">24 bis 48 Stunden</strong> bearbeitet.
                              <br />
                              <br />
                              In Sonderfällen – zum Beispiel wenn das Model gesundheitlich angeschlagen ist – kann es
                              auch länger dauern.
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                      {(() => {
                        const isPastReq = (r: any) => r.status === "rejected" || r.status === "archived";
                        const activeReqs = myRequests.filter((r) => !isPastReq(r));
                        const pastReqs = myRequests.filter(isPastReq);
                        const visibleReqs = showArchivedRequests ? [...activeReqs, ...pastReqs] : activeReqs;
                        return (
                          <>
                            {visibleReqs.map((req) => {
                              const isPast = isPastReq(req);
                              const needsReply = req.status === "waiting_feedback";
                              return (
                          <div
                            key={req.id}
                            className={`rounded-lg border p-3 space-y-1.5 transition-opacity ${
                              isPast
                                ? "opacity-60 grayscale-[40%] border-border/50 bg-secondary/20"
                                : needsReply
                                  ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-[0_0_18px_hsl(38_92%_50%/0.15)]"
                                  : "border-border/50 bg-secondary/20"
                            }`}
                          >
                            {(req as any)._inherited && (
                              <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-[10px] text-sky-200 leading-snug">
                                <strong className="font-semibold">Übernommene Anfrage.</strong>{" "}
                                Diese Anfrage wurde von einem früheren Chatter für dieses Model gestellt – du siehst
                                alle Details und den aktuellen Status, damit du den Kunden informieren kannst.
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">{req.model_name}</span>
                                {(req as any).customer_name && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Kunde: {(req as any).customer_name}
                                  </span>
                                )}
                                {(req as any).price != null && (
                                  <span className="text-[10px] font-semibold text-accent">
                                    Vereinbarter Preis: {Number((req as any).price).toFixed(2)}€
                                  </span>
                                )}
                              </div>

                              {(() => {
                                const statusStyles: Record<string, string> = {
                                  pending: "bg-amber-500/15 text-amber-300 border border-amber-500/40",
                                  accepted: "bg-sky-500/15 text-sky-300 border border-sky-500/40",
                                  in_progress: "bg-blue-500/15 text-blue-300 border border-blue-500/40",
                                  waiting_feedback: "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse",
                                  archived: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/50",
                                  rejected: "bg-red-500/15 text-red-300 border border-red-500/40",
                                };
                                const statusLabels: Record<string, string> = {
                                  pending: "⏳ Ausstehend",
                                  accepted: "✅ Ans Model weitergeleitet",
                                  in_progress: "⏳ Wird bearbeitet",
                                  waiting_feedback: "💬 Deine Antwort benötigt",
                                  archived: "✔️ Erledigt",
                                  rejected: "❌ Abgelehnt",
                                };
                                const cls = needsReply
                                  ? statusStyles.waiting_feedback
                                  : statusStyles[req.status as string] || statusStyles.pending;
                                return (
                                  <Badge className={`text-[10px] ${cls}`}>
                                    {statusLabels[req.status as string] || req.status}
                                  </Badge>
                                );
                              })()}
                            </div>
                            {needsReply && (
                              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-200 leading-snug">
                                <strong className="font-semibold">Das Model hat eine Rückfrage.</strong>{" "}
                                Bitte antworte unten im Kommentarverlauf, damit die Anfrage richtig bearbeitet werden kann.
                              </div>
                            )}
                            {(() => {
                              const isExpanded = expandedRequestIds.has(req.id);
                              const desc = String(req.description || "");
                              const isLong = desc.length > 120 || desc.includes("\n");
                              return (
                                <div className="rounded-md border border-border/40 bg-secondary/10 px-2.5 py-2 space-y-1">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{(req as any)._inherited ? "Anfrage (früherer Chatter)" : "Deine Anfrage"}</p>
                                  <p className={`text-[11px] text-foreground/90 leading-relaxed whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-2"}`}>
                                    {desc}
                                  </p>
                                  {isLong && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedRequestIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(req.id)) next.delete(req.id);
                                          else next.add(req.id);
                                          return next;
                                        })
                                      }
                                      className="text-[10px] text-accent hover:underline"
                                    >
                                      {isExpanded ? "Weniger anzeigen" : "Mehr anzeigen"}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                            {Array.isArray((req as any).attachments) && (req as any).attachments.length > 0 && (
                              <div className="rounded-md border border-border/40 bg-secondary/10 p-2 space-y-1">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Referenz</p>
                                <RequestMediaList attachments={(req as any).attachments} size="sm" />
                              </div>
                            )}
                            {/* Kommentarverlauf */}
                            {(() => {
                              const msgs = ((req as any)._messages || []) as Array<{
                                id: string;
                                sender_role: string;
                                body: string;
                                created_at: string;
                                attachments?: RequestAttachment[];
                              }>;
                              const hasLegacy =
                                !!req.admin_comment && !msgs.some((m) => m.body === req.admin_comment);
                              const fups = (((req as any)._followups || []) as Array<{
                                id: string;
                                sent_at: string;
                                note: string | null;
                              }>).map((f) => ({
                                id: `fup-${f.id}`,
                                sender_role: "followup" as const,
                                body: f.note || "Erinnerung ans Model geschickt",
                                created_at: f.sent_at,
                              }));
                              const baseMsgs = [
                                ...(hasLegacy
                                  ? [
                                      {
                                        id: "legacy",
                                        sender_role: "admin",
                                        body: req.admin_comment as string,
                                        created_at: req.created_at,
                                      },
                                    ]
                                  : []),
                                ...msgs,
                                ...fups,
                              ];
                              const allMsgs = baseMsgs.sort(
                                (a, b) =>
                                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                              );
                              const draft = replyDrafts[req.id] ?? "";
                              const draftAttachments = replyAttachments[req.id] ?? [];
                              const sendReply = async () => {
                                const body = draft.trim();
                                if ((!body && draftAttachments.length === 0) || !user) return;
                                const { data: ins, error } = await withWriteRetry(() =>
                                  supabase
                                  .from("model_request_messages")
                                  .insert({
                                    request_id: req.id,
                                    user_id: user.id,
                                    sender_role: "chatter",
                                    body: body || "(Medien angehängt)",
                                    attachments: draftAttachments as any,
                                    visible_to_chatter: true,
                                  } as any)
                                  .select()
                                  .single(),
                                );

                                if (error || !ins) {
                                  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
                                  toast.error(
                                    offline
                                      ? "Keine Internetverbindung – Nachricht wurde NICHT gesendet. Bitte erneut versuchen."
                                      : `Nachricht wurde NICHT gesendet: ${error?.message || "Unbekannter Fehler"}. Bitte Seite neu laden und erneut senden.`,
                                    { duration: 12000 },
                                  );
                                  console.error("[ChatterReply] insert failed", error);
                                  return;
                                }

                                setMyRequests((prev) =>
                                  prev.map((r) =>
                                    r.id === req.id
                                      ? { ...r, _messages: [...((r as any)._messages || []), ins] }
                                      : r,
                                  ),
                                );
                                setReplyDrafts((prev) => ({ ...prev, [req.id]: "" }));
                                setReplyAttachments((prev) => ({ ...prev, [req.id]: [] }));
                                // If request was archived/rejected/waiting_feedback, reopen it so admins see it again
                                if (
                                  req.status === "archived" ||
                                  req.status === "rejected" ||
                                  req.status === "waiting_feedback"
                                ) {
                                  await supabase
                                    .from("model_requests")
                                    .update({ status: "in_progress" })
                                    .eq("id", req.id);
                                  setMyRequests((prev) =>
                                    prev.map((r) => (r.id === req.id ? { ...r, status: "in_progress" } : r)),
                                  );
                                }
                                // Fire-and-forget admin push (routed by platform: Maloum→Vanessa, sonst→Max)
                                const _pm = String(req.description || "").match(/^\[Plattform:\s*([^\]]+)\]\s*/i);
                                const _platform = _pm ? _pm[1].trim() : "";
                                supabase.functions.invoke("send-admin-push", {
                                  body: {
                                    event: "new_request_comment",
                                    title: `💬 NEUER KOMMENTAR · ${req.model_name || "Anfrage"}`,
                                    body: body.length > 120 ? body.slice(0, 117) + "..." : (body || "📎 Medien"),
                                    url: "/admin",
                                    platform: _platform,
                                  },
                                }).catch(() => {});
                                toast.success("Antwort gesendet");
                              };
                              return (
                                <div className="space-y-1.5 mt-1">
                                  {allMsgs.map((m) => {
                                    if (m.sender_role === "followup") {
                                      return (
                                        <div key={m.id} className="flex justify-center">
                                          <div className="max-w-[90%] rounded-md px-2.5 py-1.5 bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
                                            <span className="text-[10px]">🔔</span>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[9px] text-orange-300/80 uppercase tracking-wide">
                                                Follow-up ans Model ·{" "}
                                                {new Date(m.created_at).toLocaleString("de-DE", {
                                                  day: "2-digit",
                                                  month: "2-digit",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })}
                                              </p>
                                              <p className="text-[11px] text-orange-100 leading-snug whitespace-pre-wrap">
                                                {m.body}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div
                                        key={m.id}
                                        className={`flex ${m.sender_role === "admin" ? "justify-start" : "justify-end"}`}
                                      >
                                        <div
                                          className={`max-w-[85%] rounded-md px-2.5 py-1.5 space-y-1 ${
                                            m.sender_role === "admin"
                                              ? "bg-accent/10 border border-accent/20"
                                              : "bg-secondary/40 border border-border/40"
                                          }`}
                                        >
                                          <p className="text-[9px] text-muted-foreground mb-0.5">
                                            {m.sender_role === "admin" ? "Admin" : "Du"} ·{" "}
                                            {new Date(m.created_at).toLocaleString("de-DE", {
                                              day: "2-digit",
                                              month: "2-digit",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </p>
                                          <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                                            {m.body}
                                          </p>
                                          {Array.isArray((m as any).attachments) && (m as any).attachments.length > 0 && (
                                            <RequestMediaList attachments={(m as any).attachments} size="sm" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex gap-1.5">
                                      <Textarea
                                        placeholder={
                                          allMsgs.length === 0
                                            ? "Feedback oder Frage an Admin..."
                                            : "Antwort an Admin..."
                                        }
                                        value={draft}
                                        onChange={(e) =>
                                          setReplyDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))
                                        }
                                        rows={1}
                                        className="text-[11px] bg-secondary/30 border-border/40 resize-none min-h-[32px] py-1.5"
                                      />
                                      {(draft.trim() || draftAttachments.length > 0) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 px-2 text-[10px] shrink-0"
                                          onClick={sendReply}
                                        >
                                          Senden
                                        </Button>
                                      )}
                                    </div>
                                    {user && (
                                      <RequestMediaPicker
                                        userId={user.id}
                                        requestId={req.id}
                                        value={draftAttachments}
                                        onChange={(next) =>
                                          setReplyAttachments((prev) => ({ ...prev, [req.id]: next }))
                                        }
                                        compact
                                        max={4}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            {/* Content Link – öffnet direkt den angefragten Content */}
                            {(req as any).content_link &&
                              (req.status === "accepted" || req.status === "in_progress" || req.status === "archived") && (
                                <a
                                  href={(req as any).content_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClickCapture={(e) => e.stopPropagation()}
                                  onPointerDownCapture={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-2.5 py-2 mt-1 hover:bg-accent/15 transition-colors w-full text-left"
                                >
                                  <ExternalLink className="h-3 w-3 text-accent shrink-0" />
                                  <span className="text-[11px] text-accent font-medium">
                                    Link zum angefragten Content
                                  </span>
                                </a>
                              )}

                            {/* Bearbeiten Button – nur bei Admin-Kommentar & eigener Anfrage */}
                            {req.admin_comment && req.status !== "rejected" && !(req as any)._inherited && (

                              <button
                                onClick={() =>
                                  setEditRequest({
                                    id: req.id,
                                    model_name: req.model_name,
                                    request_type: req.request_type as "individual" | "general",
                                    price: req.price,
                                    description: req.description,
                                    customer_name: (req as any).customer_name,
                                    attachments: Array.isArray((req as any).attachments) ? (req as any).attachments : [],
                                  })
                                }
                                className="flex items-center gap-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors mt-1 cursor-pointer"
                              >
                                <Pencil className="h-3 w-3" />
                                Anfrage bearbeiten
                              </button>
                            )}
                          </div>
                              );
                            })}
                            {pastReqs.length > 0 && (
                              <button
                                onClick={() => setShowArchivedRequests((v) => !v)}
                                className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-md border border-border/40 bg-secondary/10 px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                              >
                                {showArchivedRequests
                                  ? `Archiv ausblenden`
                                  : `Archiv anzeigen (${pastReqs.length})`}
                              </button>
                            )}
                          </>
                        );
                      })()}

                    </div>
                  )}
                </div>
              );
            })()}
        </motion.section>

        {/* Month Summary Widget */}
        <MonthSummaryWidget
          monthlyRevenue={monthlyRevenue}
          rate={rate}
          tierName={currentTier.name}
          tierEmoji={currentTier.emoji}
        />

        {/* Inspirations-Bibliothek (Placeholder) */}
        <InspirationLibrary />

        {/* 30-Tage Bonus-Challenge für neue Chatter */}
        <ThirtyDayChallenge />

        {/* LootBox Milestone Rewards */}
        <LootBoxReward monthlyRevenue={monthlyRevenue} />

        {/* Frage stellen */}
        <button
          onClick={() => setShowFrageMemo(true)}
          className="w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 hover:border-accent/50 transition-all"
        >
          <HelpCircle className="h-5 w-5 text-accent shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Ich habe eine Frage</p>
            <p className="text-xs text-accent mt-0.5">Wo kann ich diese Frage stellen?</p>
          </div>
        </button>

        {/* Dashboard Tour Button - moved to header */}


        {/* MassDM Generator, Tägliche Aufgaben und Brezzels wurden weiter nach oben verschoben */}

        {/* Bonus Model - alles in einer Karte (nur im Demo-Modus sichtbar) */}
        {isDemoMode() && (
          <BonusModelSection
            monthlyRevenue={monthlyRevenue}
            currentTier={currentTier as any}
            nextTier={nextTier as any}
            progressToNext={progressToNext}
            isTopTier={isTopTier}
            umsatz={umsatz}
          />
        )}

        {/* Billing countdown + Invoice button */}
        <DashboardBillingInfo
          onNavigate={(monthISO) => navigate(`/rechnung?month=${monthISO}`)}
          groupName={groupName}
          userId={user?.id ?? ""}
          rate={rate}
        />

        {/* FAQ – ganz unten als allgemeine Hilfe */}
        <ChatterFaqWidget onOpenChat={() => setChatOpen(true)} />
      </main>

      <DashboardChat externalOpen={chatOpen} onExternalOpenChange={setChatOpen} />

      <Dialog open={telegramHelpOpen} onOpenChange={setTelegramHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Das ist nicht deine Telegram-ID</DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-sm">
              <span className="block">
                Deine Telegram-ID besteht aus mindestens <span className="font-semibold text-foreground">7 Ziffern</span> (z.B. <span className="font-mono">123456789</span>) – nicht dein @username.
              </span>
              <span className="block font-semibold text-foreground">So findest du sie:</span>
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Öffne Telegram und suche nach <span className="font-semibold text-foreground">@userinfobot</span></li>
            <li>Starte den Bot mit <span className="font-mono">/start</span></li>
            <li>Der Bot zeigt dir deine numerische ID an</li>
            <li>Kopiere die Zahlen und füge sie hier ein</li>
          </ol>
          <Button onClick={() => setTelegramHelpOpen(false)} className="w-full">
            Verstanden
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BonusModelSection({
  monthlyRevenue,
  currentTier,
  nextTier,
  progressToNext,
  isTopTier,
  umsatz,
}: {
  monthlyRevenue: number;
  currentTier: (typeof BONUS_TIERS)[number];
  nextTier: (typeof BONUS_TIERS)[number] | null;
  progressToNext: number;
  isTopTier: boolean;
  umsatz: number;
}) {
  const { user: bonusUser } = useAuth();
  const hideStreaks = isGamificationExcluded(bonusUser?.id);
  const [demoMode, setDemoMode] = useState(false);
  const [demoTierIndex, setDemoTierIndex] = useState(0);

  // Demo values
  const demoTier = BONUS_TIERS[demoTierIndex];
  const demoRevenue = demoTier.max === Infinity ? demoTier.min + 500 : Math.round((demoTier.min + demoTier.max) / 2);
  const demoNextTier = demoTierIndex < BONUS_TIERS.length - 1 ? BONUS_TIERS[demoTierIndex + 1] : null;
  const demoProgress = demoNextTier
    ? Math.min(((demoRevenue - demoTier.min) / (demoNextTier.min - demoTier.min)) * 100, 100)
    : 100;

  // Use demo or real values
  const activeTier = demoMode ? demoTier : currentTier;
  const activeRevenue = demoMode ? demoRevenue : monthlyRevenue;
  const activeNextTier = demoMode ? demoNextTier : nextTier;
  const activeProgress = demoMode ? demoProgress : progressToNext;
  const activeIsTop = demoMode ? !demoNextTier : isTopTier;

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      data-section="bonus"
      className="glass-card rounded-xl p-4 lg:p-6 space-y-4 relative overflow-hidden card-inner-glow"
    >
      {/* Animated gold shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background: "linear-gradient(105deg, transparent 40%, hsl(43 56% 52%) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "bonus-sweep 14s ease-in-out infinite",
          }}
        />
      </div>

      {/* Header with Demo Toggle */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-accent" />
            </motion.div>
            <h2 className="text-sm lg:text-base font-bold text-gold-gradient-shimmer">Bonus-Modell</h2>
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode() && (
              <button
                onClick={() => {
                  setDemoMode(!demoMode);
                  setDemoTierIndex(0);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-all",
                  demoMode
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-secondary/50 text-muted-foreground border border-border/30 hover:border-accent/20 hover:text-foreground",
                )}
              >
                {demoMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {demoMode ? "Demo beenden" : "Demo"}
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      </div>

      {/* Demo Controls */}
      {demoMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center justify-center gap-4"
        >
          <Badge variant="outline" className="text-[10px] border-accent/30 text-accent bg-accent/5">
            Demo
          </Badge>
          <button
            onClick={() => setDemoTierIndex(Math.max(0, demoTierIndex - 1))}
            disabled={demoTierIndex === 0}
            className="h-7 w-7 rounded-full border border-border/40 bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-semibold text-foreground min-w-[80px] text-center">
            {demoTier.emoji} {demoTier.name}
          </span>
          <button
            onClick={() => setDemoTierIndex(Math.min(BONUS_TIERS.length - 1, demoTierIndex + 1))}
            disabled={demoTierIndex === BONUS_TIERS.length - 1}
            className="h-7 w-7 rounded-full border border-border/40 bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      <motion.div
        className="space-y-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Tier Cards Grid – 3-col mobile, 6-col desktop */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
        >
          <div data-tour="bonus-tiers" className="grid grid-cols-2 gap-2 lg:gap-2.5">
            {BONUS_TIERS.map((tier, idx) => {
              const isActive = activeTier.name === tier.name;
              const isPassed = activeRevenue > tier.max;
              return (
                <motion.div
                  key={tier.name}
                  animate={isActive ? { scale: 1 } : { scale: 1 }}
                  className={cn(
                    "relative rounded-xl overflow-hidden transition-all duration-300",
                    isActive
                      ? tier.name === "Elite"
                        ? "gold-gradient-border-animated bg-[hsl(0_0%_8%/0.8)]"
                        : "border border-accent/50 bg-[hsl(0_0%_8%/0.8)] shadow-[0_0_24px_hsl(43_56%_52%/0.15)]"
                      : isPassed
                        ? "border border-accent/15 bg-[hsl(0_0%_7%/0.5)]"
                        : "border border-border/20 bg-[hsl(0_0%_6%/0.4)]",
                  )}
                >

                  {/* Active top shine */}
                  {isActive && (
                    <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
                  )}
                  {/* Passed checkmark */}
                  {isPassed && (
                    <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-accent/20 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-accent/60" />
                    </div>
                  )}
                  <div className="relative flex flex-col items-center text-center p-3 lg:p-4 gap-1">
                    <span
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl",
                      )}
                    >
                      {tier.emoji}
                    </span>
                    <p
                      className={cn(
                        "font-bold text-[10px] lg:text-xs leading-tight tracking-wide uppercase",
                        isActive ? "text-gold-gradient" : isPassed ? "text-accent/40" : "text-muted-foreground/60",
                      )}
                    >
                      {tier.name}
                    </p>
                    <p
                      className={cn(
                        "font-bold leading-none",
                        isActive
                          ? "text-lg lg:text-xl text-foreground"
                          : isPassed
                            ? "text-base lg:text-lg text-accent/30"
                            : "text-base lg:text-lg text-muted-foreground/50",
                      )}
                    >
                      {tier.rate}%
                    </p>
                    <p
                      className={cn(
                        "text-[10px] lg:text-xs leading-tight font-medium",
                        isActive
                          ? "text-accent/70"
                          : isPassed
                            ? "text-muted-foreground/40"
                            : "text-muted-foreground/60",
                      )}
                    >
                      ab {tier.min.toLocaleString("de-DE")}€
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Progress bar */}
          {activeNextTier &&
            (() => {
              const isAlmostThere = activeProgress >= 85;
              const remaining = activeNextTier.min - activeRevenue;
              return (
                <div className="mt-3 space-y-1.5">
                  <div className="relative">
                    <Progress
                      value={activeProgress}
                      className={`h-2.5 [&>div]:bg-accent shimmer-bar transition-all duration-500 ${isAlmostThere ? "gold-glow [&>div]:animate-pulse" : ""}`}
                    />
                    {isAlmostThere && (
                      <motion.div
                        className="absolute -top-6 right-0 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                      >
                        🔥 Fast da! Nur noch {remaining.toLocaleString("de-DE")}€!
                      </motion.div>
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] lg:text-[10px] text-muted-foreground">
                    <span>
                      {activeTier.emoji} {activeRevenue.toLocaleString("de-DE")}€
                    </span>
                    <span>
                      Noch <span className="text-accent font-semibold">{remaining.toLocaleString("de-DE")}€</span> bis{" "}
                      {activeNextTier.emoji} {activeNextTier.name}
                    </span>
                  </div>
                  {(() => {
                    const now = new Date();
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    const daysLeft = Math.max(1, daysInMonth - now.getDate());
                    const dailyAvg = Math.ceil(remaining / daysLeft);
                    return (
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground text-center mt-1">
                        ⌀ <span className="text-accent font-semibold">{dailyAvg.toLocaleString("de-DE")}€</span> pro Tag
                        nötig für {activeNextTier.emoji} {activeNextTier.name}
                      </p>
                    );
                  })()}
                </div>
              );
            })()}
          {activeIsTop && (
            <p className="text-[10px] text-accent font-semibold mt-3 text-center">🏆 Höchste Stufe erreicht!</p>
          )}
        </motion.div>

        {/* Spacer before streaks */}
        <div className="h-6 lg:h-8" />

        {/* Account Upgrade - Streak */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          className="relative rounded-xl overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 p-4 lg:p-5 space-y-4 transition-transform duration-200 hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-lg">⬆</span>
              </div>
              <div>
                <p className="font-bold text-accent text-sm lg:text-base">Account Upgrade</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">7 Tage in Folge mind. 30€ Umsatz</p>
              </div>
            </div>
            <span className="font-bold text-accent text-sm lg:text-base">Besserer Account</span>
          </div>
          <StreakTracker dailyRevenue={umsatz} />
        </motion.div>

        {/* 30-Tage-Challenge */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          className="relative rounded-xl overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-4 lg:p-5 space-y-4 transition-transform duration-200 hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center">
                <span className="text-lg">💎</span>
              </div>
              <div>
                <p className="font-bold text-accent text-sm lg:text-base">30-Tage-Challenge</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">30 Tage in Folge mind. 100€ Umsatz</p>
              </div>
            </div>
          </div>
          <MonthlyStreakTracker dailyRevenue={umsatz} />
        </motion.div>
      </motion.div>

      <p className="text-[10px] lg:text-xs text-muted-foreground">
        Deine Rate gilt für den <strong className="text-foreground">gesamten Monatsumsatz</strong> und wird automatisch
        angepasst.
      </p>
      <p className="text-[10px] lg:text-xs text-muted-foreground">
        7 Tage × 30€ = <strong className="text-foreground">Account Upgrade</strong> · 30 Tage × 100€ ={" "}
        <strong className="text-foreground">Elite Stufe 💎</strong>
      </p>
    </motion.section>
  );
}
const REFERRAL_LINKEDIN_URL = "https://app.youform.com/forms/tcrienu8";

function DashboardBillingInfo({
  onNavigate,
  groupName,
  userId,
  rate,
}: {
  onNavigate: (monthISO: string) => void;
  groupName: string;
  userId: string;
  rate: number;
}) {
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const n = new Date();
    // Suggested = previous full month (e.g. on July 20 → June)
    return new Date(n.getFullYear(), n.getMonth() - 1, 1);
  });
  const [revenue, setRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const created = data?.created_at ? new Date(data.created_at) : null;
        if (created) {
          setCreatedAt(created);
          // If user has no billable previous month yet → default to current month for preview
          const now = new Date();
          const lastClosedMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          if (created > lastClosedMonthEnd) {
            setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
          }
        }
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    const from = format(selectedMonth, "yyyy-MM-dd");
    const to = format(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0),
      "yyyy-MM-dd",
    );
    supabase
      .rpc("get_chatter_revenue_series", { p_from: from, p_to: to })
      .then(({ data }) => {
        if (cancelled) return;
        const total = (data as { total: number | string }[] | null)?.reduce(
          (s, r) => s + Number(r.total || 0),
          0,
        ) ?? 0;
        setRevenue(total);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, selectedMonth]);

  const now = new Date();
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  const unlockDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 20);
  const unlocked = now >= unlockDate;
  const isCurrent =
    selectedMonth.getFullYear() === now.getFullYear() &&
    selectedMonth.getMonth() === now.getMonth();

  const earliestMonth = createdAt
    ? new Date(createdAt.getFullYear(), createdAt.getMonth(), 1)
    : null;
  const latestMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const canPrev = !earliestMonth || selectedMonth > earliestMonth;
  const canNext = selectedMonth < latestMonth;

  const daysToUnlock = Math.max(0, differenceInDays(unlockDate, now));
  const payout = revenue !== null && rate > 0 ? revenue * rate : null;

  const nlFmt = (v: number) =>
    v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: de });
  const periodStr = `${format(selectedMonth, "dd. MMM", { locale: de })} – ${format(monthEnd, "dd. MMM yyyy", { locale: de })}`;

  const shiftMonth = (delta: number) =>
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1));

  const goInvoice = () => onNavigate(format(selectedMonth, "yyyy-MM"));

  const referralText = `Hey! Ich arbeite als Chatter und verdiene damit richtig gutes Geld. Wenn du Lust hast, bewirb dich hier!\n\nWichtig: Gib bei der Bewerbung meinen Gruppennamen „${groupName}" an – das ist nötig, damit es zugeordnet werden kann!\n\nLink zum Bewerben: ${REFERRAL_LINKEDIN_URL}`;

  const copyReferralText = async () => {
    try {
      await navigator.clipboard.writeText(referralText);
      toast.success("Text kopiert!");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <div className="space-y-3">
      <div className="glass-card-subtle rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Abrechnungszeitraum</span>
          </div>
          <BillingAudioDialog />
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-2 py-1.5">
          <button
            type="button"
            onClick={() => canPrev && shiftMonth(-1)}
            disabled={!canPrev}
            aria-label="Vorheriger Monat"
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Monat wählen</p>
            <p className="text-sm font-bold text-foreground capitalize">{monthLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => canNext && shiftMonth(1)}
            disabled={!canNext}
            aria-label="Nächster Monat"
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">Zeitraum</p>
            <p className="text-xs font-semibold text-foreground">{periodStr}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">
              {unlocked ? "Anfragbar seit" : "Anfragbar ab"}
            </p>
            <p className="text-xs font-semibold text-gold-gradient">
              {format(unlockDate, "dd. MMM yyyy", { locale: de })}
            </p>
          </div>
        </div>

        {!unlocked && !isCurrent && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                Noch <span className="text-accent font-semibold">{daysToUnlock}</span> Tage bis Freischaltung
              </span>
              <span>{format(unlockDate, "dd.MM.")}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden shimmer-bar">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round(
                        ((differenceInDays(now, selectedMonth) + 1) /
                          Math.max(1, differenceInDays(unlockDate, selectedMonth))) *
                          100,
                      ),
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {isCurrent && (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
            📊 Der aktuelle Monat läuft noch – die Werte sind eine Vorschau und aktualisieren sich täglich.
          </div>
        )}

        {/* Revenue + expected payout */}
        <div className="rounded-lg border border-border/70 bg-background/40 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Voraussichtliche Auszahlung
          </p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Lädt …</p>
          ) : revenue === null || revenue === 0 ? (
            <p className="text-xs text-muted-foreground">
              Für {monthLabel} liegt uns noch kein Umsatz vor.
            </p>
          ) : rate <= 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Umsatz</p>
                <p className="text-sm font-semibold text-foreground">{nlFmt(revenue)} €</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Anteil</p>
                <p className="text-xs text-muted-foreground">Wird bald zugewiesen</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Umsatz</p>
                  <p className="text-sm font-semibold text-foreground">{nlFmt(revenue)} €</p>
                </div>
                <div className="text-muted-foreground text-xs">×&nbsp;{Math.round(rate * 100)}%</div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Auszahlung</p>
                  <p className="text-lg font-bold text-gold-gradient">{nlFmt(payout || 0)} €</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Das ist der Betrag, den du für <span className="capitalize">{monthLabel}</span> ungefähr in Rechnung stellen kannst.
              </p>
            </>
          )}
        </div>

        {payout !== null && payout > 0 && payout < 50 && !isCurrent && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
            <p className="text-xs font-semibold text-amber-300">⚠️ Empfehlung: Auszahlung erst ab 50&nbsp;€</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Unter 50&nbsp;€ fällt eine Auszahlungsgebühr von <strong>5&nbsp;€</strong> an – warte ggf. den nächsten Monat ab.
            </p>
          </div>
        )}
      </div>


      <Button
        onClick={goInvoice}
        className="w-full h-11 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:brightness-110 transition-all"
      >
        <FileText className="mr-2 h-4 w-4" />
        {unlocked
          ? `Rechnung für ${monthLabel} erstellen`
          : `Rechnungsvorschau ${monthLabel} öffnen`}
      </Button>

      {/* Referral Card */}
      <Dialog>
        <DialogTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl p-6 cursor-pointer group transition-all border-2 border-accent/40 hover:border-accent/70 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.5)]"
          >
            <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/30 blur-3xl" />

            <div className="relative flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, -8, 8, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shrink-0 shadow-lg shadow-accent/30"
              >
                <Gift className="h-7 w-7 text-accent-foreground" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-lg font-bold text-foreground">Empfehle deine Freunde</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground rounded-full px-2 py-0.5 animate-pulse">
                    Neu
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-snug">
                  Verdiene <span className="text-accent font-bold">1%</span> von dem, was sie verdienen –{" "}
                  <span className="inline-flex items-center bg-accent/20 text-accent border border-accent/50 rounded-md px-2 py-0.5 text-[12px] font-extrabold tracking-wider uppercase">
                    Lifetime
                  </span>
                </p>
              </div>
              <ChevronDown className="h-5 w-5 text-accent shrink-0 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </motion.div>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4 text-accent" />
              Empfehlungsprogramm
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verdiene passiv mit – für jeden Freund, den du bringst.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Explanation */}
            <div className="glass-card-subtle rounded-lg p-3 space-y-2">
              <p className="text-xs text-foreground font-medium">So funktioniert's:</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Für jeden Freund, den du zu uns bringst, erhältst du{" "}
                <span className="text-accent font-semibold">1% von dessen Verdienst – lebenslang</span>. Je mehr Freunde
                du empfiehlst, desto mehr verdienst du passiv dazu.
              </p>
            </div>

            {/* Important note */}
            <div className="glass-card-subtle rounded-lg p-3 space-y-2 border border-accent/20">
              <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-accent" />
                Wichtig
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Dein Freund muss im Bewerbungsprozess deinen{" "}
                <span className="text-foreground font-semibold">Gruppennamen</span> angeben, damit wir die Empfehlung
                zuordnen können.
              </p>
              {groupName && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">Dein Gruppenname:</span>
                  <Badge variant="outline" className="text-[11px] border-accent/30 text-accent font-semibold">
                    {groupName}
                  </Badge>
                </div>
              )}
            </div>

            {/* LinkedIn Link – copy */}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(REFERRAL_LINKEDIN_URL);
                  toast.success("Bewerbungslink kopiert!");
                } catch {
                  toast.error("Kopieren fehlgeschlagen");
                }
              }}
              className="w-full h-10 text-xs border-accent/30 hover:bg-accent/10 hover:text-accent"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Bewerbungslink kopieren
            </Button>

            {/* Copyable text */}
            <div className="space-y-2">
              <p className="text-xs text-foreground font-medium">Nachricht zum Teilen:</p>
              <div className="glass-card-subtle rounded-lg p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Hey! Ich arbeite als Chatter und verdiene damit richtig gutes Geld. Wenn du Lust hast, bewirb dich
                  hier!
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Wichtig: Gib bei der Bewerbung meinen Gruppennamen „
                  <span className="text-accent font-semibold">{groupName || "—"}</span>" an – das ist nötig, damit es
                  zugeordnet werden kann!
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Link zum Bewerben:{" "}
                  <span className="text-accent font-semibold break-all">{REFERRAL_LINKEDIN_URL}</span>
                </p>
              </div>
              <Button
                onClick={copyReferralText}
                variant="outline"
                className="w-full h-9 text-xs border-accent/30 hover:bg-accent/10 hover:text-accent"
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Nachricht kopieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
