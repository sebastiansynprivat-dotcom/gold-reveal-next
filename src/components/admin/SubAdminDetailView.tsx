import { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  account_email?: string | null;
  platform?: string | null;
  assigned_to?: string | null;
}

interface ChatterLite {
  user_id: string;
  group_name?: string | null;
  account_email?: string | null;
  assigned_accounts?: { id: string; platform?: string | null }[];
}

interface Props {
  subAdminId: string;
  subAdminEmail: string;
  accounts: Account[];
  chatters: ChatterLite[];
}

export default function SubAdminDetailView({ subAdminId, subAdminEmail, accounts, chatters }: Props) {
  const [assignedIds, setAssignedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("admin_account_access")
        .select("account_id")
        .eq("admin_user_id", subAdminId);
      if (cancelled) return;
      setAssignedIds(new Set((data || []).map((r: any) => r.account_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [subAdminId]);

  if (!assignedIds) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const subAdminAccounts = accounts.filter((a) => assignedIds.has(a.id));
  const assignedChatterIds = new Set(
    subAdminAccounts.map((a) => a.assigned_to).filter(Boolean) as string[],
  );
  const subAdminChatters = chatters.filter((c) => assignedChatterIds.has(c.user_id));

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Sub-Admin: {subAdminEmail}</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {subAdminAccounts.length} Accounts · {subAdminChatters.length} Chatter
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Accounts
            </h3>
            {subAdminAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Accounts zugewiesen</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                {subAdminAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <span className="text-xs font-medium text-foreground truncate flex-1">
                      {acc.account_email || acc.platform}
                    </span>
                    <span className="text-[9px] bg-accent/10 text-accent border border-accent/30 rounded px-1.5 py-0.5">
                      {acc.platform}
                    </span>
                    <span
                      className={`text-[9px] rounded px-1.5 py-0.5 ${acc.assigned_to ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-secondary/50 text-muted-foreground border border-border/30"}`}
                    >
                      {acc.assigned_to ? "Vergeben" : "Frei"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Chatter
            </h3>
            {subAdminChatters.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Chatter zugewiesen</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                {subAdminChatters.map((c) => (
                  <div
                    key={c.user_id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <span className="text-xs font-medium text-foreground truncate flex-1">
                      {c.group_name || c.account_email || c.user_id}
                    </span>
                    {c.assigned_accounts
                      ?.filter((acc) => assignedIds.has(acc.id))
                      .map((acc) => (
                        <span
                          key={acc.id}
                          className="text-[9px] bg-accent/10 text-accent border border-accent/30 rounded px-1.5 py-0.5"
                        >
                          {acc.platform}
                        </span>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
