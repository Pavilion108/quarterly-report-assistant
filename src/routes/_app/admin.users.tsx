import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/users")({ component: AdminUsers });

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/15 text-red-400 border-red-500/20",
  manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  member: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  partner: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

function AdminUsers() {
  const { roles } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const loadUsers = async () => {
    // Try admin_user_overview RPC first, fall back to manual join
    const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_user_overview" as any);
    if (!rpcErr && rpcData) {
      setUsers(rpcData as any[]);
    } else {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("user_roles").select("*"),
      ]);
      const merged = (p.data ?? []).map((profile: any) => ({
        ...profile,
        role: (r.data ?? []).find((ur: any) => ur.user_id === profile.id)?.role ?? null,
      }));
      setUsers(merged);
    }
  };

  const loadRequests = async () => {
    const { data } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
  };

  useEffect(() => {
    loadUsers();
    loadRequests();
  }, []);

  if (!roles.includes("admin")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const setRole = async (userId: string, role: string) => {
    setBusy(userId);
    // Try set_user_role RPC first, fall back to manual upsert
    const { error: rpcErr } = await supabase.rpc("set_user_role" as any, {
      target_user_id: userId,
      new_role: role,
    });
    if (rpcErr) {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) { toast.error(error.message); setBusy(null); return; }
    }
    toast.success("Role updated");
    await loadUsers();
    setBusy(null);
  };

  const reviewRequest = async (id: string, action: "approved" | "rejected") => {
    setBusy(id);
    const { error } = await supabase
      .from("access_requests")
      .update({ status: action, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    toast.success(`Request ${action}`);
    await loadRequests();
    setBusy(null);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">God's Eye</h1>
        <p className="text-sm text-muted-foreground mt-1">Full user & access management</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Access Requests
            {pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Assign roles: admin · manager · member · partner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
              )}
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{u.name || "—"}</span>
                      {u.role && (
                        <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] ?? ""}`}>
                          {u.role}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <Select
                    value={u.role ?? "member"}
                    onValueChange={(v) => setRole(u.id, v)}
                    disabled={busy === u.id}
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACCESS REQUESTS TAB ── */}
        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Requests</CardTitle>
              <CardDescription>@dkothary.com restricted — review pending requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {requests.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No access requests yet.</p>
              )}
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{req.name || req.email}</span>
                      <Badge
                        variant="outline"
                        className={
                          req.status === "pending"
                            ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
                            : req.status === "approved"
                            ? "bg-green-500/15 text-green-400 border-green-500/20"
                            : "bg-red-500/15 text-red-400 border-red-500/20"
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{req.email}</div>
                    {req.message && (
                      <div className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</div>
                    )}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                        disabled={busy === req.id}
                        onClick={() => reviewRequest(req.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        disabled={busy === req.id}
                        onClick={() => reviewRequest(req.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
