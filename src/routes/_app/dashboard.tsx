import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchMyProjects } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Calendar, Search, BarChart2 } from "lucide-react";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { roles } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const navigate = useNavigate();
  const canCreate = roles.includes("manager") || roles.includes("admin");

  useEffect(() => {
    fetchMyProjects().then((p) => { 
      setProjects(p); 
      setLoading(false);
      if (p.length === 0 && canCreate) setShowWizard(true);
    });
  }, [canCreate]);

  const filtered = useMemo(() => 
    projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase())),
  [projects, search]);

  return (
    <div>
      {showWizard && <OnboardingWizard onComplete={() => setShowWizard(false)} />}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Projects Dashboard</h1>
          <p className="text-base text-muted-foreground mt-1">Manage and track your quarterly engagements</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/compare" } as any)}>
            <BarChart2 className="h-4 w-4 mr-2" /> Compare
          </Button>
          {canCreate && (
            <Button onClick={() => navigate({ to: "/projects/new" })}>
              <Plus className="h-4 w-4 mr-2" /> New project
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search projects..." 
          className="pl-9 bg-white" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      {loading ? (
        <div className="grid place-items-center h-64"><p className="text-muted-foreground animate-pulse">Loading projects…</p></div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full grid place-items-center mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              {canCreate ? "Create your first project to start tracking KPIs and generating reports." : "A manager will add you to a project."}
            </p>
            {canCreate && <Button onClick={() => setShowWizard(true)}>Start Setup Wizard</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="group">
              <Card className="h-full border-slate-200 transition-all duration-200 hover:shadow-md hover:border-primary/50 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">{p.name}</CardTitle>
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">{p.quarter}</span>
                  </div>
                  <CardDescription className="text-sm font-medium text-slate-500">{p.client ?? "Internal Project"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                    <Calendar className="h-3.5 w-3.5" />
                    Finalize: <span className="font-medium text-slate-700">{p.finalize_date ? new Date(p.finalize_date).toLocaleDateString() : "TBD"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && search && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No projects match your search for "{search}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}