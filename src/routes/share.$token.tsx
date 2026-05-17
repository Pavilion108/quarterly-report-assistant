import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/share/$token")({
  component: SharedReportView,
});

function SharedReportView() {
  const { token } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc('get_shared_report_by_token', { token_text: token }).then(({ data: d, error: e }) => {
      setLoading(false);
      if (e || !d) {
        setError("Report not found or link has expired.");
        return;
      }
      setData(d.snapshot);
    });
  }, [token]);

  if (loading) return <div className="min-h-screen grid place-items-center"><p className="animate-pulse text-muted-foreground">Loading secure report...</p></div>;
  if (error) return <div className="min-h-screen grid place-items-center"><p className="text-destructive font-medium">{error}</p></div>;

  const { project, areas, obs, metrics } = data;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{project.name}</h1>
          <p className="text-lg text-slate-500">{project.client ?? "Internal"} · {project.quarter}</p>
        </div>

        {metrics?.executive_summary && (
          <Card className="bg-white border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-slate-700 leading-relaxed space-y-4 whitespace-pre-wrap">
                {metrics.executive_summary}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground">Revenue YTD</span>
                <span className="font-semibold text-green-700">${(metrics?.revenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Expenses YTD</span>
                <span className="font-semibold text-red-700">${(metrics?.expenses || 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Quarterly Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics?.goals?.length > 0 ? metrics.goals.map((g: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  {g.achieved ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />}
                  <span className={g.achieved ? "text-slate-800" : "text-slate-500"}>{g.title}</span>
                </div>
              )) : <p className="text-muted-foreground text-sm">No goals defined.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 border-b pb-2">Key Observations</h2>
          {areas.map((a: any) => {
            const items = obs.filter((o: any) => o.focus_area_id === a.id);
            if (items.length === 0) return null;
            return (
              <Card key={a.id} className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{a.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2 text-slate-700">
                    {items.map((i: any) => (
                      <li key={i.id} className="pl-1 leading-relaxed">
                        {i.accepted_text || i.original_text}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-sm text-slate-400 pt-12">
          Generated securely by DKC Tracker
        </div>
      </div>
    </div>
  );
}
