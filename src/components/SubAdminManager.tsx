import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, FolderOpen, Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubAdmin {
  user_id: string;
  email: string;
  has_totp: boolean;
  assignedAccounts: { id: string; account_email: string; platform: string }[];
}

interface Account {
  id: string;
  account_email: string;
  platform: string;
  folder_name: string | null;
}

export default function SubAdminManager() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<SubAdmin | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [accountSearch, setAccountSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSubAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      // Get sub_admin roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "sub_admin");

      if (!roles || roles.length === 0) {
        setSubAdmins([]);
        setLoading(false);
        return;
      }

      // Get admin_account_access for all sub_admins
      const subAdminIds = roles.map(r => r.user_id);
      const { data: accessData } = await supabase
        .from("admin_account_access")
        .select("admin_user_id, account_id, accounts:account_id(id, account_email, platform)")
        .in("admin_user_id", subAdminIds);

      // Get emails via admin-manage edge function
      const { data: adminData } = await supabase.functions.invoke("admin-manage", {
        body: { action: "list" },
      });

      const adminList: { user_id: string; email: string; has_totp: boolean }[] = adminData?.admins || [];

      const result: SubAdmin[] = subAdminIds.map(uid => {
        const admin = adminList.find(a => a.user_id === uid);
        const userAccess = accessData?.filter(a => a.admin_user_id === uid) || [];
        return {
          user_id: uid,
          email: admin?.email || uid.slice(0, 8),
          has_totp: admin?.has_totp || false,
          assignedAccounts: userAccess.map(a => {
            const acc = a.accounts as any;
            return {
              id: acc?.id || a.account_id,
              account_email: acc?.account_email || "–",
              platform: acc?.platform || "–",
            };
          }),
        };
      });

      setSubAdmins(result);
    } catch (err) {
      console.error("loadSubAdmins error:", err);
      toast.error("Fehler beim Laden der Sub-Admins");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("accounts")
      .select("id, account_email, platform, folder_name")
      .order("platform")
      .order("account_email");
    setAccounts(data || []);
  }, []);

  useEffect(() => {
    loadSubAdmins();
    loadAccounts();
  }, [loadSubAdmins, loadAccounts]);

  const openAssignDialog = (subAdmin: SubAdmin) => {
    setSelectedSubAdmin(subAdmin);
    setSelectedAccountIds(new Set(subAdmin.assignedAccounts.map(a => a.id)));
    setAccountSearch("");
    setAssignDialogOpen(true);
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!selectedSubAdmin) return;
    setSaving(true);
    try {
      const currentIds = new Set(selectedSubAdmin.assignedAccounts.map(a => a.id));
      const toAdd = [...selectedAccountIds].filter(id => !currentIds.has(id));
      const toRemove = [...currentIds].filter(id => !selectedAccountIds.has(id));

      // Remove revoked
      if (toRemove.length > 0) {
        await supabase
          .from("admin_account_access")
          .delete()
          .eq("admin_user_id", selectedSubAdmin.user_id)
          .in("account_id", toRemove);
      }

      // Add new
      if (toAdd.length > 0) {
        const { data: session } = await supabase.auth.getSession();
        const grantedBy = session?.session?.user?.id;
        await supabase
          .from("admin_account_access")
          .insert(toAdd.map(accId => ({
            admin_user_id: selectedSubAdmin.user_id,
            account_id: accId,
            granted_by: grantedBy || null,
          })));
      }

      toast.success(`Zuweisungen für ${selectedSubAdmin.email} aktualisiert`);
      setAssignDialogOpen(false);
      loadSubAdmins();
    } catch (err) {
      console.error("saveAssignments error:", err);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const filteredAccounts = accounts.filter(a =>
    a.account_email.toLowerCase().includes(accountSearch.toLowerCase()) ||
    a.platform.toLowerCase().includes(accountSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-bold text-foreground">Sub-Admin Zuweisungen</h3>
      </div>

      {subAdmins.length === 0 ? (
        <div className="glass-card-subtle rounded-xl p-6 text-center text-muted-foreground text-sm">
          Keine Sub-Admins vorhanden. Füge über die Admin-Verwaltung neue Mitarbeiter hinzu.
        </div>
      ) : (
        <div className="space-y-3">
          {subAdmins.map(sa => (
            <div
              key={sa.user_id}
              className="glass-card-subtle rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{sa.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {sa.assignedAccounts.length} Account{sa.assignedAccounts.length !== 1 ? "s" : ""} zugewiesen
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAssignDialog(sa)}
                  className="shrink-0"
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                  Zuweisen
                </Button>
              </div>

              {sa.assignedAccounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sa.assignedAccounts.map(acc => (
                    <Badge key={acc.id} variant="secondary" className="text-[10px]">
                      {acc.platform} · {acc.account_email}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Accounts zuweisen – {selectedSubAdmin?.email}
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={accountSearch}
              onChange={e => setAccountSearch(e.target.value)}
              placeholder="Account suchen..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ maxHeight: "50vh" }}>
            {filteredAccounts.map(acc => {
              const isSelected = selectedAccountIds.has(acc.id);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleAccount(acc.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors text-sm",
                    isSelected
                      ? "bg-accent/10 border border-accent/30"
                      : "hover:bg-secondary/50 border border-transparent"
                  )}
                >
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{acc.account_email}</p>
                    <p className="text-[10px] text-muted-foreground">{acc.platform}{acc.folder_name ? ` · ${acc.folder_name}` : ""}</p>
                  </div>
                </button>
              );
            })}
            {filteredAccounts.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-4">Keine Accounts gefunden</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground">{selectedAccountIds.size} ausgewählt</p>
            <Button onClick={saveAssignments} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
