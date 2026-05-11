import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Users, ShieldAlert, Activity, Settings2, CheckCheck, XCircle,
  UserCog, Clock, Database, FolderKanban, FileText, Radio, Zap,
  RefreshCw, Trash2, Shield, Eye
} from "lucide-react";

export const Route = createFileRoute("/_app/admin/users")({ component: GodsEye });

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/20 text-red-300 border-red-500/30",
  manager: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  member: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  partner: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg grid place-items-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${color.replace("text-", "bg-").split(" ")[0]}`} />
    </motion.div>
  );
}

function GodsEye() {
  const { roles } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitePassword, setInvitePassword] = useState("Dkc@1234");
  const [createdUser, setCreatedUser] = useState<{ email: string, pass: string } | null>(null);

  const loadAll = useCallback(async () => {
    const [uRes, rRes, pRes, sRes, oRes] = await Promise.all([
      supabase.rpc("admin_user_overview" as any).then(r => r.data ? r : supabase.from("profiles").select("*").order("name")),
      supabase.from("access_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("report_snapshots").select("*, projects:project_id(name)").order("created_at", { ascending: false }).limit(20),
      supabase.from("observations").select("id, created_at, original_text, project_id, projects:project_id(name)").order("created_at", { ascending: false }).limit(20),
    ]);
    // If RPC didn't return roles, manually join
    let userData = uRes.data ?? [];
    if (userData.length > 0 && !("role" in userData[0])) {
      const { data: rolesData } = await supabase.from("user_roles").select("*");
      userData = userData.map((u: any) => ({ ...u, role: (rolesData ?? []).find((r: any) => r.user_id === u.id)?.role ?? null }));
    }
    setUsers(userData);
    setRequests(rRes.data ?? []);
    setProjects(pRes.data ?? []);
    setSnapshots(sRes.data ?? []);
    setObservations(oRes.data ?? []);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!roles.includes("admin")) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Admin access required.</p></div>;
  }

  const setRole = async (userId: string, role: string) => {
    setBusy(userId);
    const { error: rpcErr } = await supabase.rpc("set_user_role" as any, { target_user_id: userId, new_role: role });
    if (rpcErr) {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) { toast.error(error.message); setBusy(null); return; }
    }
    toast.success("Role updated");
    await loadAll();
    setBusy(null);
  };

  const inviteUser = async () => {
    if (!inviteEmail || !inviteEmail.endsWith("@dkothary.com")) {
      return toast.error("Please enter a valid @dkothary.com email");
    }
    if (invitePassword.length < 6) return toast.error("Password must be at least 6 characters");
    
    setBusy("invite");
    toast.loading("Creating user account...");
    try {
      const { data, error } = await supabase.functions.invoke("admin_invite", {
        body: { email: inviteEmail, role: inviteRole, password: invitePassword }
      });
      toast.dismiss();
      if (error) throw error;
      
      toast.success(`User ${inviteEmail} created successfully!`);
      setCreatedUser({ email: inviteEmail, pass: invitePassword });
      setInviteEmail("");
      
      // We automatically reload so the new user appears in the list
      await loadAll();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed to create user");
    }
    setBusy(null);
  };

  const reviewRequest = async (id: string, action: "approved" | "rejected") => {
    setBusy(id);
    const { error } = await supabase.from("access_requests").update({ status: action, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    toast.success(`Request ${action}`);
    await loadAll();
    setBusy(null);
  };

  const acceptAllRequests = async () => {
    setBusy("accept-all");
    const pending = requests.filter(r => r.status === "pending");
    for (const req of pending) {
      await supabase.from("access_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    }
    toast.success(`${pending.length} requests approved`);
    await loadAll();
    setBusy(null);
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const totalObs = observations.length;

  // Build activity feed from combined data
  const activityFeed = [
    ...projects.slice(0, 8).map(p => ({ type: "project" as const, text: `Project "${p.name}" created`, time: p.created_at, icon: FolderKanban })),
    ...snapshots.slice(0, 8).map(s => ({ type: "report" as const, text: `${s.kind} report: ${(s as any).projects?.name ?? "—"}`, time: s.created_at, icon: FileText })),
    ...observations.slice(0, 8).map(o => ({ type: "obs" as const, text: `Observation added: "${o.original_text?.slice(0, 50)}…"`, time: o.created_at, icon: Eye })),
    ...requests.slice(0, 5).map(r => ({ type: "request" as const, text: `Access request: ${r.email} (${r.status})`, time: r.created_at, icon: ShieldAlert })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

  const timeAgo = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="space-y-6 -mx-6 -mt-8 px-6 pt-6 pb-8 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 grid place-items-center shadow-md">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">God's Eye</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1"><Radio className="h-3 w-3 text-emerald-500 animate-pulse" /> System Command Center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">LAST SYNC {lastRefresh.toLocaleTimeString()}</span>
          <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-8 bg-white" onClick={loadAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value={users.length} color="bg-blue-50 text-blue-600" />
        <StatCard icon={FolderKanban} label="Projects" value={projects.length} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={ShieldAlert} label="Pending Requests" value={pendingCount} color="bg-amber-50 text-amber-600" />
        <StatCard icon={Database} label="Observations" value={totalObs} color="bg-violet-50 text-violet-600" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="bg-white border border-slate-200 shadow-sm rounded-lg h-10 p-1">
          <TabsTrigger value="users" className="text-slate-500 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md text-xs gap-1.5">
            <UserCog className="h-3.5 w-3.5" /> Users
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-slate-500 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md text-xs gap-1.5 relative">
            <ShieldAlert className="h-3.5 w-3.5" /> Requests
            {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="intel" className="text-slate-500 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md text-xs gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Intel Feed
          </TabsTrigger>
          <TabsTrigger value="controls" className="text-slate-500 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md text-xs gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Controls
          </TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-slate-900 text-base flex items-center gap-2"><UserCog className="h-4 w-4 text-slate-700" /> Create New User Account</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input 
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" 
                  placeholder="new.user@dkothary.com" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Input 
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 sm:w-[150px] font-mono text-sm" 
                  placeholder="Password" 
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="sm:w-[130px] bg-white border-slate-200 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={inviteUser} disabled={busy === "invite"} className="bg-slate-900 hover:bg-slate-800 text-white shrink-0">
                  {busy === "invite" ? "Creating..." : "Create User"}
                </Button>
              </div>
              
              {createdUser ? (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Account successfully created!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">They can log in immediately with the password you set.</p>
                  </div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8" asChild>
                    <a href={`mailto:${createdUser.email}?subject=Welcome to DKC Tracking System&body=Hello,%0D%0A%0D%0AYour account has been created.%0D%0A%0D%0ALogin ID: ${createdUser.email}%0D%0APassword: ${createdUser.pass}%0D%0A%0D%0APlease log in at https://dkcreportassist.vercel.app/`}>
                      Email Credentials
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 mt-2">
                  The account will be instantly active. You can email the credentials directly after creation.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-slate-900 text-base flex items-center gap-2"><Users className="h-4 w-4 text-slate-700" /> All Users & Role Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-4">
              {users.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No users found.</p>}
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 gap-4 hover:bg-slate-100 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">{u.name || "—"}</span>
                      {u.role && <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${ROLE_COLORS[u.role] ?? "text-slate-600"}`}>{u.role}</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 truncate font-mono">{u.email}</div>
                  </div>
                  <Select value={u.role ?? "member"} onValueChange={(v) => setRole(u.id, v)} disabled={busy === u.id}>
                    <SelectTrigger className="w-32 shrink-0 bg-white border-slate-200 text-slate-700 text-xs h-8"><SelectValue /></SelectTrigger>
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
          <Card className="bg-white/[0.03] border-white/[0.08]">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-400" /> Access Requests</CardTitle>
              {pendingCount > 0 && (
                <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-8 text-xs" disabled={busy === "accept-all"} onClick={acceptAllRequests}>
                  <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Accept All ({pendingCount})
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1.5">
              {requests.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No access requests.</p>}
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 gap-4 hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{req.name || req.email}</span>
                      <Badge variant="outline" className={
                        req.status === "pending" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px]"
                          : req.status === "approved" ? "bg-green-500/20 text-green-300 border-green-500/30 text-[10px]"
                          : "bg-red-500/20 text-red-300 border-red-500/30 text-[10px]"
                      }>{req.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{req.email}</div>
                    {req.message && <div className="text-xs text-slate-600 mt-1 italic">"{req.message}"</div>}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-green-400 border-green-500/30 hover:bg-green-500/10 h-7 text-xs" disabled={busy === req.id} onClick={() => reviewRequest(req.id, "approved")}>
                        <CheckCheck className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 h-7 text-xs" disabled={busy === req.id} onClick={() => reviewRequest(req.id, "rejected")}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INTEL FEED TAB ── */}
        <TabsContent value="intel" className="mt-4">
          <Card className="bg-white/[0.03] border-white/[0.08]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" /> Live Activity Intel</CardTitle>
            </CardHeader>
            <CardContent>
              {activityFeed.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No activity recorded yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {activityFeed.map((a, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className={`w-7 h-7 rounded-md grid place-items-center shrink-0 mt-0.5 ${
                        a.type === "project" ? "bg-emerald-500/15 text-emerald-400" :
                        a.type === "report" ? "bg-blue-500/15 text-blue-400" :
                        a.type === "obs" ? "bg-violet-500/15 text-violet-400" :
                        "bg-amber-500/15 text-amber-400"
                      }`}>
                        <a.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{a.text}</p>
                        <p className="text-[10px] text-slate-600 font-mono flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {timeAgo(a.time)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SYSTEM CONTROLS TAB ── */}
        <TabsContent value="controls" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <Card className="bg-white/[0.03] border-white/[0.08]">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start border-white/[0.08] text-slate-300 hover:bg-white/5 hover:text-white h-10" onClick={acceptAllRequests} disabled={pendingCount === 0 || busy === "accept-all"}>
                  <CheckCheck className="h-4 w-4 mr-2 text-green-400" /> Accept All Pending Requests
                  {pendingCount > 0 && <Badge className="ml-auto bg-green-500/20 text-green-300 border-0 text-[10px]">{pendingCount}</Badge>}
                </Button>
                <Button variant="outline" className="w-full justify-start border-white/[0.08] text-slate-300 hover:bg-white/5 hover:text-white h-10" onClick={loadAll}>
                  <RefreshCw className="h-4 w-4 mr-2 text-cyan-400" /> Force Refresh All Data
                </Button>
                <Button variant="outline" className="w-full justify-start border-white/[0.08] text-slate-300 hover:bg-red-500/5 hover:text-red-300 h-10"
                  onClick={async () => {
                    const rejected = requests.filter(r => r.status === "rejected");
                    for (const r of rejected) { await supabase.from("access_requests").delete().eq("id", r.id); }
                    toast.success(`Cleared ${rejected.length} rejected requests`);
                    loadAll();
                  }}>
                  <Trash2 className="h-4 w-4 mr-2 text-red-400" /> Clear Rejected Requests
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="bg-white/[0.03] border-white/[0.08]">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2"><Settings2 className="h-4 w-4 text-slate-400" /> System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Database", status: "Online", color: "bg-green-500" },
                  { label: "Auth Service", status: "Active", color: "bg-green-500" },
                  { label: "Domain Lock", status: "@dkothary.com", color: "bg-blue-500" },
                  { label: "RLS Policies", status: "Enforced", color: "bg-green-500" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${s.color} animate-pulse`} />
                      <span className="text-sm text-slate-300">{s.label}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{s.status}</span>
                  </div>
                ))}
                <div className="pt-2 text-[10px] text-slate-600 font-mono text-center">
                  NODE v20 · VITE SPA · SUPABASE RLS · VERCEL EDGE
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
