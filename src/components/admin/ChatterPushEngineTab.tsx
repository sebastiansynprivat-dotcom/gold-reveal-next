import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Send, Search, Zap, Bell } from "lucide-react";
import { toast } from "sonner";

/** Mirror of supabase/functions/_shared/pushTemplates.ts so admins can preview. */
const PUSH_TEMPLATES: Record<
  string,
  {
    category: "pull" | "dopamine";
    cooldown_hours: number;
    de: { title: string; body: string };
    en: { title: string; body: string };
    when: string;
  }
> = {
  morning_kickoff: {
    category: "pull", cooldown_hours: 20,
    when: "Mo–Fr 08–10 Uhr (Berlin) · max 1× pro Tag",
    de: { title: "Guten Morgen, {name} ☀️", body: "Heute starten? Deine Models warten — Tagesziel: {goal}€." },
    en: { title: "Good morning, {name} ☀️", body: "Ready to roll? Your models are waiting — daily goal: {goal}€." },
  },
  daily_tasks_open: {
    category: "pull", cooldown_hours: 20,
    when: "Nachmittag wenn Tagesroutine nicht abgehakt",
    de: { title: "Tagesroutine offen ✅", body: "Noch {open_tasks} Aufgaben offen. 2 Min Aufwand, großer Effekt." },
    en: { title: "Today's routine pending ✅", body: "{open_tasks} tasks still open. 2 min effort, big impact." },
  },
  inbox_pile_up: {
    category: "pull", cooldown_hours: 4,
    when: "Wenn ungelesene Chats > 20 bei einem Account",
    de: { title: "Inbox füllt sich 📬", body: "{count} ungelesene Chats bei {model}. Jeder Chat = potenzieller Sale." },
    en: { title: "Inbox piling up 📬", body: "{count} unread chats on {model}. Every chat = a potential sale." },
  },
  old_chat_warning: {
    category: "pull", cooldown_hours: 20,
    when: "Chat seit ≥3 Tagen ohne Antwort",
    de: { title: "Chat verstaubt ⏰", body: "Ein Chat bei {model} wartet seit {days} Tagen. Schnell antworten = Rettungs-Sale." },
    en: { title: "Chat going stale ⏰", body: "A chat on {model} has been waiting {days} days. Quick reply = rescue sale." },
  },
  streak_at_risk: {
    category: "pull", cooldown_hours: 20,
    when: "Abends 19+ Uhr: Streak ≥3 Tage und heute noch 0€",
    de: { title: "Streak in Gefahr 🔥", body: "{streak} Tage am Stück — heute noch nichts. Ein Sale reicht." },
    en: { title: "Streak at risk 🔥", body: "{streak} days in a row — nothing today yet. One sale saves it." },
  },
  goal_close_no_login: {
    category: "pull", cooldown_hours: 20,
    when: "Wenn ≥80 % vom Tagesziel, aber kein Login mehr",
    de: { title: "Fast da 🎯", body: "Nur noch {missing}€ bis zum Tagesziel. Eine Stunde reicht." },
    en: { title: "Almost there 🎯", body: "Just {missing}€ to your daily goal. One more hour." },
  },
  new_content_drop: {
    category: "pull", cooldown_hours: 0,
    when: "Bei jedem neuen Content-Drop für zugewiesene Models",
    de: { title: "Neuer Content 🎬", body: "{model} hat frischen Content. Perfekt für deine Top-Fans." },
    en: { title: "New content 🎬", body: "{model} just dropped fresh content. Perfect for your top fans." },
  },
  model_request_reply: {
    category: "pull", cooldown_hours: 0,
    when: "Sobald ein Model auf eine Custom-Anfrage antwortet",
    de: { title: "Anfrage beantwortet 💬", body: "{model} hat geantwortet. Schau rein und verkauf's." },
    en: { title: "Request answered 💬", body: "{model} replied. Go check it and sell it." },
  },
  weekend_silent: {
    category: "pull", cooldown_hours: 20,
    when: "Sa/So 11 Uhr wenn heute noch nichts passiert ist",
    de: { title: "Wochenend-Welle 🌊", body: "Sa/So sind oft Top-Tage. Deine Fans sind online." },
    en: { title: "Weekend wave 🌊", body: "Weekends often crush — your fans are online." },
  },
  multi_day_inactive: {
    category: "pull", cooldown_hours: 44,
    when: "Vormittags wenn 2+ Tage komplett ohne Umsatz",
    de: { title: "Wir vermissen dich 👀", body: "2 Tage Funkstille — alles ok? Deine Accounts laufen sonst leer." },
    en: { title: "We miss you 👀", body: "2 quiet days — everything ok? Your accounts go cold otherwise." },
  },
  sale_big: {
    category: "dopamine", cooldown_hours: 0,
    when: "Bei jedem Sale ≥ 50€",
    de: { title: "💎 BIG SALE", body: "{amount}€ bei {model} — sauber gespielt!" },
    en: { title: "💎 BIG SALE", body: "{amount}€ on {model} — clean play!" },
  },
  sale_huge: {
    category: "dopamine", cooldown_hours: 0,
    when: "Bei jedem Sale ≥ 150€",
    de: { title: "🚀 MASSIVE SALE", body: "{amount}€!! Heute geht was bei {model}." },
    en: { title: "🚀 MASSIVE SALE", body: "{amount}€!! Today's hitting different on {model}." },
  },
  sale_combo: {
    category: "dopamine", cooldown_hours: 1,
    when: "3 Sales innerhalb 1h beim selben Chatter",
    de: { title: "🔥 Hot Streak", body: "3 Sales in einer Stunde — du bist in der Zone." },
    en: { title: "🔥 Hot Streak", body: "3 sales in an hour — you're in the zone." },
  },
  personal_record_day: {
    category: "dopamine", cooldown_hours: 20,
    when: "Sobald Tagesumsatz alle letzten 30 Tage übertrifft",
    de: { title: "🏆 NEUER REKORD", body: "{amount}€ heute — dein bester Tag seit 30 Tagen." },
    en: { title: "🏆 NEW RECORD", body: "{amount}€ today — your best day in 30 days." },
  },
  goal_reached: {
    category: "dopamine", cooldown_hours: 20,
    when: "Sobald Tagesziel erreicht ist",
    de: { title: "🎯 ZIEL GEKNACKT", body: "{goal}€ — Tagesziel erfüllt. Jetzt drüberlegen." },
    en: { title: "🎯 GOAL HIT", body: "{goal}€ — daily goal done. Now stack on top." },
  },
  goal_overshoot_150: {
    category: "dopamine", cooldown_hours: 20,
    when: "Bei 150 % Tagesziel",
    de: { title: "🥈 150 %", body: "Du bist 50 % über'm Ziel. Nicht aufhören." },
    en: { title: "🥈 150 %", body: "You're 50 % over goal. Don't stop." },
  },
  goal_overshoot_200: {
    category: "dopamine", cooldown_hours: 20,
    when: "Bei 200 % Tagesziel",
    de: { title: "🥇 DOPPELT", body: "200 % vom Tagesziel. Heute schreibst du Geschichte." },
    en: { title: "🥇 DOUBLE", body: "200 % of daily goal. Today is history-making." },
  },
  streak_milestone_3: {
    category: "dopamine", cooldown_hours: 0, when: "Streak-Tag 3",
    de: { title: "🔥 3er Streak", body: "3 Tage in Folge mit Sales. Halt es am Leben." },
    en: { title: "🔥 3-day streak", body: "3 days in a row with sales. Keep it alive." },
  },
  streak_milestone_7: {
    category: "dopamine", cooldown_hours: 0, when: "Streak-Tag 7",
    de: { title: "🔥🔥 1 Woche Streak", body: "7 Tage. Das ist Konstanz auf Pro-Level." },
    en: { title: "🔥🔥 1-week streak", body: "7 days. Pro-level consistency." },
  },
  streak_milestone_14: {
    category: "dopamine", cooldown_hours: 0, when: "Streak-Tag 14",
    de: { title: "⚡ 14 Tage", body: "Zwei Wochen non-stop. Echtes Tier." },
    en: { title: "⚡ 14 days", body: "Two weeks non-stop. Beast mode." },
  },
  streak_milestone_30: {
    category: "dopamine", cooldown_hours: 0, when: "Streak-Tag 30",
    de: { title: "👑 30 TAGE STREAK", body: "Ein ganzer Monat. Du gehörst zur Spitze." },
    en: { title: "👑 30-DAY STREAK", body: "A full month. You're top-tier." },
  },
  tasks_all_done: {
    category: "dopamine", cooldown_hours: 20, when: "Wenn alle 6 Daily-Tasks abgehakt sind",
    de: { title: "✨ Routine clean", body: "Alle 6 Tasks heute durch. Pro-Move." },
    en: { title: "✨ Routine clean", body: "All 6 tasks done today. Pro move." },
  },
  inbox_cleared: {
    category: "dopamine", cooldown_hours: 20, when: "Wenn Inbox eines Accounts auf 0 sinkt",
    de: { title: "📭 Inbox = 0", body: "Kein offener Chat bei {model}. Sauber." },
    en: { title: "📭 Inbox = 0", body: "Zero open chats on {model}. Clean." },
  },
};

type LogRow = {
  id: string;
  user_id: string;
  trigger_key: string;
  title: string;
  body: string;
  context: any;
  sent_at: string;
};

export default function ChatterPushEngineTab() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatters, setChatters] = useState<{ user_id: string; name: string | null; group_name: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const [filterChatter, setFilterChatter] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | "pull" | "dopamine">("all");
  const [runningPulse, setRunningPulse] = useState(false);

  async function loadLogs() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("chatter_push_log")
      .select("id,user_id,trigger_key,title,body,context,sent_at")
      .order("sent_at", { ascending: false })
      .limit(300);
    setLogs((data ?? []) as LogRow[]);
    setLoading(false);
  }
  async function loadChatters() {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("user_id,name,group_name,role")
      .eq("role", "chatter")
      .order("name");
    setChatters((data ?? []) as any);
  }

  useEffect(() => {
    loadLogs();
    loadChatters();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filterChatter !== "all" && l.user_id !== filterChatter) return false;
      const cat = PUSH_TEMPLATES[l.trigger_key]?.category;
      if (filterCategory !== "all" && cat !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.title.toLowerCase().includes(q) &&
          !l.body.toLowerCase().includes(q) &&
          !l.trigger_key.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [logs, filterChatter, filterCategory, search]);

  async function runPulseNow() {
    setRunningPulse(true);
    try {
      const { data, error } = await supabase.functions.invoke("chatter-pulse-pushes?force=1");
      if (error) throw error;
      toast.success(`Pulse-Run fertig: ${(data as any)?.sent ?? 0} Pushes raus`);
      await loadLogs();
    } catch (e: any) {
      toast.error(e.message ?? "Pulse fehlgeschlagen");
    } finally {
      setRunningPulse(false);
    }
  }

  const chatterName = (uid: string) => {
    const c = chatters.find((x) => x.user_id === uid);
    return c?.name || c?.group_name || uid.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" /> Chatter Push-Engine
          </h2>
          <p className="text-sm text-muted-foreground">
            Alle automatischen Push-Trigger pro Chatter — komplett individuell, mit Audit-Log.
          </p>
        </div>
        <Button onClick={runPulseNow} disabled={runningPulse}>
          {runningPulse ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Pulse jetzt ausführen
        </Button>
      </header>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Trigger-Katalog ({Object.keys(PUSH_TEMPLATES).length})</TabsTrigger>
          <TabsTrigger value="logs">Audit-Log ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-3 mt-4">
          {(["pull", "dopamine"] as const).map((cat) => (
            <section key={cat}>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {cat === "pull" ? <Bell className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {cat === "pull" ? "A · Pull-Trigger (holen Chatter zurück)" : "B · Dopamine-Trigger (belohnen Erfolg)"}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(PUSH_TEMPLATES)
                  .filter(([, t]) => t.category === cat)
                  .map(([key, t]) => (
                    <div key={key} className="glass-card rounded-lg p-4 border border-border/40">
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs text-muted-foreground">{key}</code>
                        <Badge variant="outline">
                          {t.cooldown_hours > 0 ? `${t.cooldown_hours}h cooldown` : "kein Cooldown"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">⏱ {t.when}</p>
                      <div className="mt-3 space-y-2">
                        <div className="bg-muted/30 rounded p-2">
                          <div className="text-xs font-medium text-muted-foreground">🇩🇪 DE</div>
                          <div className="text-sm font-semibold">{t.de.title}</div>
                          <div className="text-sm">{t.de.body}</div>
                        </div>
                        <div className="bg-muted/30 rounded p-2">
                          <div className="text-xs font-medium text-muted-foreground">🇬🇧 EN</div>
                          <div className="text-sm font-semibold">{t.en.title}</div>
                          <div className="text-sm">{t.en.body}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="space-y-3 mt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche Titel / Body / Trigger…"
                className="pl-8"
              />
            </div>
            <select
              value={filterChatter}
              onChange={(e) => setFilterChatter(e.target.value)}
              className="h-9 rounded border bg-background px-2 text-sm"
            >
              <option value="all">Alle Chatter</option>
              {chatters.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.name || c.group_name || c.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="h-9 rounded border bg-background px-2 text-sm"
            >
              <option value="all">Alle Kategorien</option>
              <option value="pull">Pull</option>
              <option value="dopamine">Dopamine</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">Zeit</th>
                  <th className="px-3 py-2">Chatter</th>
                  <th className="px-3 py-2">Trigger</th>
                  <th className="px-3 py-2">Push</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                      Noch keine Pushes geloggt.
                    </td>
                  </tr>
                )}
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.sent_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{chatterName(l.user_id)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={PUSH_TEMPLATES[l.trigger_key]?.category === "dopamine" ? "default" : "secondary"}>
                        {l.trigger_key}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.title}</div>
                      <div className="text-muted-foreground text-xs">{l.body}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
