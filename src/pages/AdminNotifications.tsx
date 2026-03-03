import { useState, useEffect } from "react";
import { Send, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("notifications")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data);
      });
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Titel und Nachricht sind erforderlich");
      return;
    }

    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ title: title.trim(), body: body.trim() }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        toast.success(`Gesendet an ${result.sent} Empfänger!`);
        setTitle("");
        setBody("");
        // Refresh history
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .order("sent_at", { ascending: false })
          .limit(20);
        if (data) setHistory(data);
      } else {
        toast.error(result.error || "Fehler beim Senden");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-9 w-9 rounded-full" />
          <div>
            <h1 className="text-base font-bold text-foreground">Push Notifications</h1>
            <p className="text-[10px] text-muted-foreground">Nachricht an alle Chatter senden</p>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Send Form */}
        <section className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Neue Benachrichtigung</h2>
          </div>

          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel der Benachrichtigung"
              className="text-sm"
              maxLength={100}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Nachricht eingeben..."
              className="text-sm min-h-[80px]"
              maxLength={500}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Wird gesendet..." : "An alle senden"}
            </Button>
          </div>
        </section>

        {/* History */}
        {history.length > 0 && (
          <section className="glass-card-subtle rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Verlauf</h2>
            <div className="space-y-2">
              {history.map((n) => (
                <div key={n.id} className="p-3 rounded-lg bg-secondary/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      {n.recipients_count} Empfänger
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(n.sent_at).toLocaleString("de-DE")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
