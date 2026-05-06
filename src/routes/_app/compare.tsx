import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/compare")({
  component: CompareProjects,
});

function CompareProjects() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("projects")
      .select("*, project_metrics(*)")
      .order("created_at", { ascending: false })
      .limit(4)
      .then((res) => {
        setData(res.data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading comparison data...</div>;
  if (data.length < 2) return <div className="p-8 text-center text-muted-foreground">Not enough projects to compare. Create at least 2 projects.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Multi-Quarter Comparison</h1>
        <p className="text-muted-foreground">Compare performance across your recent projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((p) => {
          const m = p.project_metrics?.[0] || {};
          return (
            <Card key={p.id} className="bg-white">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>{p.quarter}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-1">Financials</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-medium text-green-600">${(m.revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Expenses:</span>
                    <span className="font-medium text-red-600">${(m.expenses || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-2">Goals</div>
                  <div className="space-y-1.5">
                    {m.goals?.length ? m.goals.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {g.achieved ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" /> : <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-0.5" />}
                        <span className={g.achieved ? "text-slate-700" : "text-slate-500"}>{g.title}</span>
                      </div>
                    )) : <div className="text-xs text-muted-foreground">No goals set</div>}
                  </div>
                </div>

                <div className="pt-2">
                  <Link to="/projects/$id" params={{ id: p.id }} className="text-xs text-primary font-medium flex items-center hover:underline">
                    View full report <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
