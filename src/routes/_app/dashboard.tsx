import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fetchMyProjects } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Calendar, Search, BarChart2, Activity, Clock, Building,
  Users, Globe, FolderOpen, CheckCircle2, AlertCircle, ArrowRight, Layers,
  Megaphone
} from "lucide-react";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { roles, user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [activityTask, setActivityTask] = useState("");
  const [activityNotes, setActivityNotes] = useState("");
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [projectMeta, setProjectMeta] = useState<Record<string, any>>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [targetProject, setTargetProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const navigate = useNavigate();
  const canCreate = true;

  useEffect(() => {
    async function load() {
      const p = await fetchMyProjects();
      setProjects(p);
      if (p.length > 0) {
        const projectIds = p.map((pr: any) => pr.id);

        // Fetch enriched metadata per project: member count, focus area count, log counts
        const [membersRes, areasRes, logsRes, obsRes, annRes] = await Promise.all([
          supabase.from("project_members").select("project_id").in("project_id", projectIds),
          supabase.from("focus_areas").select("project_id, name").in("project_id", projectIds),
          supabase.from("daily_logs").select("id, project_id, tasks, progress_notes, created_at, log_date, profiles:user_id(name), projects:project_id(name)").in("project_id", projectIds).order("created_at", { ascending: false }).limit(100),
          supabase.from("observations").select("*, projects:project_id(name), profiles:author_id(name)").in("project_id", projectIds).order("created_at", { ascending: false }).limit(5),
          supabase.from("announcements").select("*, profiles:author_id(name), projects:target_project_id(name)").order("created_at", { ascending: false }),
        ]);

        setAnnouncements(annRes.data ?? []);

        // Listen for new announcements
        const channel = supabase.channel('realtime-announcements')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
            // Re-fetch announcements to get relations (like profile name)
            supabase.from("announcements").select("*, profiles:author_id(name), projects:target_project_id(name)").order("created_at", { ascending: false }).then(res => {
              if (res.data) setAnnouncements(res.data);
            });
          })
          .subscribe();

        // Build per-project meta
        const meta: Record<string, any> = {};
        for (const pr of p) {
          const logs = (logsRes.data ?? []).filter((l: any) => l.project_id === pr.id);
          const areas = (areasRes.data ?? []).filter((a: any) => a.project_id === pr.id);
          const members = (membersRes.data ?? []).filter((m: any) => m.project_id === pr.id);

          // Parse status from logs
          const completedScopes = new Set<string>();
          const workingScopes = new Set<string>();
          for (const log of logs) {
            const taskStr = log.tasks ?? "";
            const statusMatch = taskStr.match(/\[STATUS:\s*([^\]]+)\]/i);
            const scopeMatch = taskStr.match(/\[Scope:\s*([^\]]+)\]/i);
            if (statusMatch && scopeMatch) {
              const status = statusMatch[1].toLowerCase().trim();
              const scope = scopeMatch[1].trim();
              if (status === "completed") completedScopes.add(scope);
              else if (["working", "followup to client", "pending at client side"].includes(status)) workingScopes.add(scope);
            }
          }

          const lastLog = logs[0];
          meta[pr.id] = {
            memberCount: members.length,
            focusAreaCount: areas.length,
            completedCount: completedScopes.size,
            workingCount: workingScopes.size,
            lastActivity: lastLog?.created_at ?? null,
            lastUpdatedBy: lastLog?.profiles?.name ?? null,
          };
        }
        setProjectMeta(meta);
        setAllLogs(logsRes.data ?? []);

        const combined = [
          ...(logsRes.data ?? []).slice(0, 5).map((l: any) => ({
            type: "log",
            date: l.created_at,
            text: `Scope update logged`,
            project: p.find((pr: any) => pr.id === l.project_id)?.name ?? "—",
            author: l.profiles?.name,
          })),
          ...(obsRes.data ?? []).map((o: any) => ({
            type: "obs",
            date: o.created_at,
            text: `Observation: ${o.original_text?.substring(0, 50)}...`,
            project: o.projects?.name,
            author: o.profiles?.name,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
        setRecentActivity(combined);
      } else if (canCreate) {
        setShowWizard(true);
      }
      setLoading(false);
    }
    load();
  }, [canCreate]);

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !activityTask.trim() || !user) return;
    setSubmittingActivity(true);
    
    const { error } = await supabase.from("daily_logs").insert({
      project_id: selectedProject,
      user_id: user.id,
      tasks: activityTask,
      progress_notes: activityNotes,
      log_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      toast.error("Failed to submit activity");
    } else {
      toast.success("Activity submitted successfully");
      setActivityTask("");
      setActivityNotes("");
      
      const { data } = await supabase.from("daily_logs")
        .select("id, project_id, tasks, progress_notes, created_at, log_date, profiles:user_id(name), projects:project_id(name)")
        .in("project_id", projects.map(p => p.id))
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setAllLogs(data);
    }
    setSubmittingActivity(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() || !user) return;
    setBroadcasting(true);
    const { error } = await supabase.from("announcements").insert({
      message: broadcastMsg,
      author_id: user.id,
      target_project_id: targetProject,
    });
    if (error) {
      toast.error("Failed to send broadcast");
    } else {
      toast.success("Broadcast sent successfully");
      setBroadcastMsg("");
      const { data } = await supabase.from("announcements").select("*, profiles:author_id(name), projects:target_project_id(name)").order("created_at", { ascending: false });
      setAnnouncements(data ?? []);
    }
    setBroadcasting(false);
  };

  const groupedLogs = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    
    allLogs.forEach(log => {
      const date = log.log_date || new Date(log.created_at).toISOString().split('T')[0];
      const userName = log.profiles?.name || "Unknown User";
      
      if (!groups[date]) groups[date] = {};
      if (!groups[date][userName]) groups[date][userName] = [];
      
      groups[date][userName].push(log);
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allLogs]);

  const filtered = useMemo(
    () => projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.toLowerCase().includes(search.toLowerCase())
    ),
    [projects, search]
  );

  const calculateProgress = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const n = new Date().getTime();
    if (n < s) return 0;
    if (n > e) return 100;
    return Math.round(((n - s) / (e - s)) * 100);
  };

  const timeAgo = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const activeProjects = projects.filter(p => p.status === "active");
  const deadlinesThisWeek = projects.filter(p => {
    if (!p.finalize_date) return false;
    const days = (new Date(p.finalize_date).getTime() - Date.now()) / (1000 * 3600 * 24);
    return days >= 0 && days <= 7;
  });
  const totalCompleted = Object.values(projectMeta).reduce((s: number, m: any) => s + (m.completedCount ?? 0), 0);

  return (
    <Tabs defaultValue="overview" className="max-w-7xl mx-auto space-y-8 w-full">
      {showWizard && <OnboardingWizard onComplete={() => setShowWizard(false)} />}

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((ann, i) => (
            <motion.div key={ann.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`rounded-lg border p-4 shadow-sm flex items-start gap-3 ${ann.target_project_id ? "bg-blue-50 border-blue-200" : "bg-indigo-50 border-indigo-200"}`}
            >
              <div className={`mt-0.5 p-1.5 rounded-md ${ann.target_project_id ? "bg-blue-100 text-blue-700" : "bg-indigo-100 text-indigo-700"}`}>
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${ann.target_project_id ? "text-blue-800" : "text-indigo-800"}`}>
                    {ann.target_project_id ? `Project: ${ann.projects?.name}` : "Global Announcement"}
                  </span>
                  <span className={`text-[10px] ${ann.target_project_id ? "text-blue-500" : "text-indigo-500"}`}>
                    • {timeAgo(ann.created_at)} by {ann.profiles?.name || 'Admin'}
                  </span>
                </div>
                <p className={`text-sm ${ann.target_project_id ? "text-blue-900" : "text-indigo-900"}`}>{ann.message}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Workload Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Active audit engagements and firm workflow</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList className="h-9 bg-white border border-slate-200">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="activities" className="text-xs">Daily Activities</TabsTrigger>
          </TabsList>

          <Button variant="outline" className="h-9" onClick={() => navigate({ to: "/compare" } as any)}>
            <BarChart2 className="h-4 w-4 mr-2" /> Compare
          </Button>
          {(roles.includes("admin") || roles.includes("partner")) && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Megaphone className="h-4 w-4 mr-2" /> Broadcast
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Firm-wide Broadcast</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea 
                      placeholder="Enter your announcement..." 
                      value={broadcastMsg}
                      onChange={e => setBroadcastMsg(e.target.value)}
                      className="h-32 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Project (Optional)</label>
                    <Select value={targetProject || "global"} onValueChange={(v) => setTargetProject(v === "global" ? null : v)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select target..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global (All Users)</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleBroadcast} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={broadcasting || !broadcastMsg.trim()}>
                    {broadcasting ? "Sending..." : "Send Announcement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {canCreate && (
            <Button onClick={() => navigate({ to: "/projects/new" })}>
              <Plus className="h-4 w-4 mr-2" /> New Engagement
            </Button>
          )}
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Engagements", value: activeProjects.length, icon: Building, color: "bg-blue-50 text-blue-600" },
          { label: "Deadlines (7 days)", value: deadlinesThisWeek.length, icon: Clock, color: "bg-amber-50 text-amber-600" },
          { label: "Scopes Completed", value: totalCompleted, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
          { label: "Recent Updates", value: recentActivity.length, icon: Activity, color: "bg-violet-50 text-violet-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-lg grid place-items-center shrink-0 ${color}`}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="w-full space-y-6">
        <TabsContent value="overview" className="space-y-6 outline-none mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Cards */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Engagements</h2>
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search..." className="pl-9 h-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center h-64"><p className="text-slate-500 animate-pulse">Loading workload...</p></div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed border-2 bg-slate-50/50 shadow-none">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="bg-slate-100 w-16 h-16 rounded-full grid place-items-center mb-4"><Building className="h-8 w-8 text-slate-400" /></div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No active engagements</h3>
                <p className="text-slate-500 max-w-sm mb-6">{canCreate ? "Create your first engagement to start assigning focus areas and tracking progress." : "You have not been assigned to any engagements."}</p>
                {canCreate && <Button onClick={() => setShowWizard(true)}>Start Setup Wizard</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((p, idx) => {
                const progress = calculateProgress(p.start_date, p.finalize_date);
                const meta = projectMeta[p.id] ?? {};
                const daysLeft = p.finalize_date ? Math.ceil((new Date(p.finalize_date).getTime() - Date.now()) / (1000 * 3600 * 24)) : null;
                const scopeProgress = meta.focusAreaCount > 0 ? Math.round((meta.completedCount / meta.focusAreaCount) * 100) : 0;
                const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                const isOverdue = daysLeft !== null && daysLeft < 0;

                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                    <Link to="/projects/$id" params={{ id: p.id }} className="group block h-full">
                      <Card className={`h-full transition-all duration-200 hover:shadow-lg bg-white ${isOverdue ? "border-red-200 hover:border-red-300" : isUrgent ? "border-amber-200 hover:border-amber-300" : "border-slate-200 hover:border-blue-200"}`}>
                        <CardHeader className="pb-2 pt-4 px-5">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-sm font-bold group-hover:text-blue-600 transition-colors leading-snug">{p.name}</CardTitle>
                                {isOverdue && <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] px-1.5 py-0 h-4 shrink-0">OVERDUE</Badge>}
                                {isUrgent && !isOverdue && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0 h-4 shrink-0">DUE SOON</Badge>}
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{p.client ?? "Internal Project"}</p>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-[9px] uppercase tracking-wider px-2 py-1 rounded font-bold shrink-0">{p.quarter}</span>
                          </div>
                        </CardHeader>

                        <CardContent className="px-5 pb-4 space-y-3">
                          {/* Scope Progress */}
                          {meta.focusAreaCount > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> Scope Progress</span>
                                <span className="font-bold text-slate-700">{meta.completedCount}/{meta.focusAreaCount} done</span>
                              </div>
                              <Progress value={scopeProgress} className="h-1.5 bg-slate-100" />
                            </div>
                          )}

                          {/* Timeline Progress */}
                          {(p.start_date || p.finalize_date) && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Timeline</span>
                                <span className="font-bold text-slate-700">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-1 bg-slate-100" />
                            </div>
                          )}

                          {/* Stats Row */}
                          <div className="flex items-center gap-3 pt-1">
                            {meta.memberCount > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Users className="h-3 w-3" /> {meta.memberCount + 1} members
                              </div>
                            )}
                            {meta.focusAreaCount > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <FolderOpen className="h-3 w-3" /> {meta.focusAreaCount} scopes
                              </div>
                            )}
                            {meta.workingCount > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                                <Activity className="h-3 w-3" /> {meta.workingCount} active
                              </div>
                            )}
                            {p.website && (
                              <div className="flex items-center gap-1 text-[10px] text-indigo-500 ml-auto">
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[80px]">{p.website.replace(/https?:\/\//, "").split("/")[0]}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {p.finalize_date ? (
                                <span className={isOverdue ? "text-red-500 font-semibold" : isUrgent ? "text-amber-600 font-semibold" : ""}>
                                  {isOverdue ? `${Math.abs(daysLeft!)}d overdue` : daysLeft === 0 ? "Due today!" : daysLeft !== null ? `${daysLeft}d left` : new Date(p.finalize_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              ) : "No deadline set"}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{p.status}</span>
                              {meta.lastActivity && (
                                <span className="text-[9px] text-slate-400">{timeAgo(meta.lastActivity)}</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
              {filtered.length === 0 && search && (
                <div className="col-span-full py-12 text-center text-slate-500">No engagements match "{search}".</div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Activity Feed */}
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-slate-900">Firm Activity</h2>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No recent activity across your engagements.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map((act, i) => (
                    <div key={i} className="p-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-7 h-7 rounded-full grid place-items-center shrink-0 ${act.type === "log" ? "bg-blue-50 text-blue-500" : "bg-violet-50 text-violet-500"}`}>
                          {act.type === "log" ? <Activity className="h-3.5 w-3.5" /> : <BarChart2 className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">{act.project}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{act.text}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                            {act.author && <span className="font-medium">{act.author}</span>}
                            {act.author && <span>·</span>}
                            <span>{timeAgo(act.date)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick deadlines */}
          {deadlinesThisWeek.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" /> Upcoming Deadlines
              </h3>
              <div className="space-y-2">
                {deadlinesThisWeek.map(p => {
                  const days = Math.ceil((new Date(p.finalize_date).getTime() - Date.now()) / (1000 * 3600 * 24));
                  return (
                    <Link key={p.id} to="/projects/$id" params={{ id: p.id }}>
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 hover:border-amber-300 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500">{p.client}</p>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 font-bold text-xs shrink-0 ml-2">
                          <span>{days === 0 ? "Today!" : `${days}d`}</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
          </div>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>What members did today across engagements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {groupedLogs.length === 0 ? (
                      <p className="text-sm text-slate-500">No activities recorded yet.</p>
                    ) : (
                      groupedLogs.map(([date, users]) => (
                        <div key={date} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                              {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </h3>
                            {date === new Date().toISOString().split('T')[0] && (
                              <Badge className="bg-blue-500 text-white hover:bg-blue-600 border-none text-[9px] px-1.5 py-0 h-4">TODAY</Badge>
                            )}
                            <div className="h-px bg-slate-100 flex-1" />
                          </div>
                          
                          <div className="space-y-4">
                            {Object.entries(users).map(([userName, logs]) => (
                              <div key={userName} className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[9px]">
                                    {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </div>
                                  <span className="text-xs font-bold text-slate-900">{userName}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">({logs.length} logs)</span>
                                </div>
                                
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {logs.map((log: any) => (
                                    <div key={log.id} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 hover:border-blue-100 transition-colors">
                                      <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="bg-white text-blue-600 border-blue-100 text-[9px] px-1.5 py-0 h-4">
                                          {log.projects?.name}
                                        </Badge>
                                        <span className="text-[9px] text-slate-400 font-medium">{timeAgo(log.created_at)}</span>
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{log.tasks}</p>
                                      {log.progress_notes && (
                                        <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100/50 italic">{log.progress_notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card className="bg-white border-slate-200 shadow-sm sticky top-6">
                <CardHeader>
                  <CardTitle>Log Activity</CardTitle>
                  <CardDescription>What did you do today?</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitActivity} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">Engagement</label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select engagement..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">Activities</label>
                      <Textarea 
                        placeholder="E.g. Completed scope 1..." 
                        value={activityTask}
                        onChange={e => setActivityTask(e.target.value)}
                        className="resize-none h-20 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">Notes (Optional)</label>
                      <Input 
                        placeholder="Additional details..." 
                        value={activityNotes}
                        onChange={e => setActivityNotes(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submittingActivity || !selectedProject || !activityTask.trim()}>
                      {submittingActivity ? "Submitting..." : "Submit Activity"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}