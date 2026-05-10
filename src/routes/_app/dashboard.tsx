import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fetchMyProjects } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Calendar, Search, BarChart2, Activity, Clock, Building, Users } from "lucide-react";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { roles } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const navigate = useNavigate();
  const canCreate = roles.includes("manager") || roles.includes("admin");

  useEffect(() => {
    async function load() {
      const p = await fetchMyProjects();
      setProjects(p);
      if (p.length > 0) {
        // Fetch recent logs & obs across these projects
        const projectIds = p.map(pr => pr.id);
        const [logsRes, obsRes] = await Promise.all([
          supabase.from("daily_logs").select("*, projects:project_id(name), profiles:user_id(name)").in("project_id", projectIds).order("created_at", { ascending: false }).limit(5),
          supabase.from("observations").select("*, projects:project_id(name), profiles:author_id(name)").in("project_id", projectIds).order("created_at", { ascending: false }).limit(5)
        ]);
        
        const combined = [
          ...(logsRes.data || []).map(l => ({ type: 'log', date: l.created_at, text: `Logged: ${l.tasks}`, project: l.projects?.name, author: l.profiles?.name })),
          ...(obsRes.data || []).map(o => ({ type: 'obs', date: o.created_at, text: `Observed: ${o.original_text.substring(0, 50)}...`, project: o.projects?.name, author: o.profiles?.name }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        
        setRecentActivity(combined);
      } else if (canCreate) {
        setShowWizard(true);
      }
      setLoading(false);
    }
    load();
  }, [canCreate]);

  const filtered = useMemo(() => 
    projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase())),
  [projects, search]);

  const calculateProgress = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const n = new Date().getTime();
    if (n < s) return 0;
    if (n > e) return 100;
    return Math.round(((n - s) / (e - s)) * 100);
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const deadlinesThisWeek = projects.filter(p => {
    if (!p.finalize_date) return false;
    const days = (new Date(p.finalize_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return days >= 0 && days <= 7;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {showWizard && <OnboardingWizard onComplete={() => setShowWizard(false)} />}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Workload Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage active audit engagements and firm workflow</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/compare" } as any)}>
            <BarChart2 className="h-4 w-4 mr-2" /> Compare Engagements
          </Button>
          {canCreate && (
            <Button onClick={() => navigate({ to: "/projects/new" })}>
              <Plus className="h-4 w-4 mr-2" /> New Engagement
            </Button>
          )}
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 grid place-items-center"><Building className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Engagements</p>
              <h3 className="text-2xl font-bold text-slate-900">{activeProjects.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 grid place-items-center"><Clock className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Deadlines (7 days)</p>
              <h3 className="text-2xl font-bold text-slate-900">{deadlinesThisWeek.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><Activity className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Recent Updates</p>
              <h3 className="text-2xl font-bold text-slate-900">{recentActivity.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Engagements</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search engagements..." 
                className="pl-9 h-9 bg-white" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center h-64"><p className="text-slate-500 animate-pulse">Loading workload...</p></div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed border-2 bg-slate-50/50 shadow-none">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="bg-slate-100 w-16 h-16 rounded-full grid place-items-center mb-4">
                  <Building className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No active engagements</h3>
                <p className="text-slate-500 max-w-sm mb-6">
                  {canCreate ? "Create your first engagement to start assigning focus areas and tracking progress." : "You have not been assigned to any engagements."}
                </p>
                {canCreate && <Button onClick={() => setShowWizard(true)}>Start Setup Wizard</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((p) => {
                const progress = calculateProgress(p.start_date, p.finalize_date);
                return (
                <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="group">
                  <Card className="h-full border-slate-200 transition-all duration-200 hover:shadow-md hover:border-blue-200 bg-white">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors line-clamp-1">{p.name}</CardTitle>
                          <CardDescription className="text-sm font-medium text-slate-500 mt-1">{p.client ?? "Internal Project"}</CardDescription>
                        </div>
                        <span className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold shrink-0">{p.quarter}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span>Timeline Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-slate-100" />
                      </div>
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {p.finalize_date ? new Date(p.finalize_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "TBD"}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {p.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )})}
              {filtered.length === 0 && search && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  No engagements match "{search}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Recent Activity */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Firm Activity</h2>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No recent activity across your engagements.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map((act, i) => (
                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-8 h-8 rounded-full grid place-items-center shrink-0 ${act.type === 'log' ? 'bg-blue-50 text-blue-500' : 'bg-violet-50 text-violet-500'}`}>
                          {act.type === 'log' ? <Activity className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{act.project}</p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{act.text}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            <span>{act.author}</span>
                            <span>•</span>
                            <span>{new Date(act.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}