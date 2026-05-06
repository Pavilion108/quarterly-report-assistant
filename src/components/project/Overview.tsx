import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, FileText, CheckCircle2, Circle, Sparkles } from "lucide-react";

export function ProjectOverview({ project, isManager, onChange }: { project: any; isManager: boolean; onChange: (p: any) => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  
  const [newArea, setNewArea] = useState("");
  const [pickUser, setPickUser] = useState("");

  const load = async () => {
    const [m, a, p, met] = await Promise.all([
      supabase.from("project_members").select("*, profiles:user_id(name,email)").eq("project_id", project.id),
      supabase.from("focus_areas").select("*").eq("project_id", project.id).order("display_order"),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("project_metrics").select("*").eq("project_id", project.id).maybeSingle(),
    ]);
    setMembers(m.data ?? []); setAreas(a.data ?? []); setProfiles(p.data ?? []);
    setMetrics(met.data || { revenue: 0, expenses: 0, goals: [], kpi_scorecard: [] });
  };
  useEffect(() => { load(); }, [project.id]);

  const updateMetrics = async (patch: any) => {
    const newM = { ...metrics, ...patch };
    setMetrics(newM);
    if (!isManager) return;
    
    // Upsert logic
    const { data } = await supabase.from("project_metrics").select("id").eq("project_id", project.id).maybeSingle();
    if (data) {
      await supabase.from("project_metrics").update(patch).eq("project_id", project.id);
    } else {
      await supabase.from("project_metrics").insert({ project_id: project.id, ...patch });
    }
  };

  const addMember = async () => {
    if (!pickUser) return;
    const { error } = await supabase.from("project_members").insert({ project_id: project.id, user_id: pickUser });
    if (error) return toast.error(error.message);
    setPickUser(""); load();
  };
  const removeMember = async (id: string) => {
    await supabase.from("project_members").delete().eq("id", id); load();
  };
  const addArea = async () => {
    if (!newArea.trim()) return;
    await supabase.from("focus_areas").insert({ project_id: project.id, name: newArea, display_order: areas.length });
    setNewArea(""); load();
  };
  const removeArea = async (id: string) => {
    await supabase.from("focus_areas").delete().eq("id", id); load();
  };

  const uploadTemplate = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const { data, error } = await supabase.from("projects")
        .update({ template_data: b64, template_filename: file.name })
        .eq("id", project.id).select().single();
      if (error) return toast.error(error.message);
      onChange(data); toast.success("Template uploaded");
    };
    reader.readAsDataURL(file);
  };

  const setFinalizeDate = async (d: string) => {
    const { data, error } = await supabase.from("projects").update({ finalize_date: d || null }).eq("id", project.id).select().single();
    if (error) return toast.error(error.message);
    onChange(data);
  };

  const generateSummary = async () => {
    toast.loading("Generating executive summary...");
    const { data, error } = await supabase.functions.invoke("summary", {
      body: { 
        name: project.name, 
        quarter: project.quarter, 
        revenue: metrics?.revenue || 0, 
        expenses: metrics?.expenses || 0, 
        goals: metrics?.goals || [], 
        kpis: metrics?.kpi_scorecard || [] 
      }
    });
    toast.dismiss();
    if (error) return toast.error(error.message || "Failed to generate");
    updateMetrics({ executive_summary: data.text });
    toast.success("Executive summary generated!");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Executive Summary</CardTitle>
          {isManager && (
            <Button size="sm" variant="outline" onClick={generateSummary}>
              <Sparkles className="h-4 w-4 mr-2 text-primary" /> Generate with AI
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Textarea 
            className="min-h-[150px]" 
            placeholder="Write an executive summary or generate one using AI..."
            value={metrics?.executive_summary || ""}
            onChange={(e) => updateMetrics({ executive_summary: e.target.value })}
            disabled={!isManager}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Project Financials & KPIs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Revenue (YTD)</Label>
              <Input type="number" value={metrics?.revenue || ""} onChange={(e) => updateMetrics({ revenue: Number(e.target.value) })} disabled={!isManager} />
            </div>
            <div>
              <Label>Expenses (YTD)</Label>
              <Input type="number" value={metrics?.expenses || ""} onChange={(e) => updateMetrics({ expenses: Number(e.target.value) })} disabled={!isManager} />
            </div>
          </div>
          <div>
            <Label>Quarterly Goals</Label>
            <div className="space-y-2 mt-2">
              {metrics?.goals?.map((g: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const ng = [...metrics.goals];
                    ng[i].achieved = !ng[i].achieved;
                    updateMetrics({ goals: ng });
                  }} disabled={!isManager}>
                    {g.achieved ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />}
                  </Button>
                  <Input value={g.title} onChange={(e) => {
                    const ng = [...metrics.goals];
                    ng[i].title = e.target.value;
                    updateMetrics({ goals: ng });
                  }} disabled={!isManager} />
                  {isManager && <Button variant="ghost" size="sm" onClick={() => {
                    const ng = metrics.goals.filter((_:any, idx:number) => idx !== i);
                    updateMetrics({ goals: ng });
                  }}><X className="h-4 w-4" /></Button>}
                </div>
              ))}
              {isManager && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => {
                  updateMetrics({ goals: [...(metrics?.goals || []), { title: "New goal", achieved: false }] });
                }}>Add Goal</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Report settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <Label>Finalize date</Label>
              <Input type="date" value={project.finalize_date ?? ""} onChange={(e) => setFinalizeDate(e.target.value)} disabled={!isManager} />
            </div>
          </div>
          <div>
            <Label>PPT template</Label>
            {project.template_filename ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <FileText className="h-4 w-4" /> {project.template_filename}
              </div>
            ) : <p className="text-sm text-muted-foreground mt-1">No template uploaded — a default blank deck will be used.</p>}
            {isManager && (
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-secondary">
                <Upload className="h-4 w-4" /> Upload .pptx
                <input type="file" accept=".pptx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <div>{m.profiles?.name || m.profiles?.email}</div>
              {isManager && <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}><X className="h-4 w-4" /></Button>}
            </div>
          ))}
          {isManager && (
            <div className="flex gap-2 pt-2 border-t">
              <Select value={pickUser} onValueChange={setPickUser}>
                <SelectTrigger><SelectValue placeholder="Add member…" /></SelectTrigger>
                <SelectContent>
                  {profiles.filter((p) => !members.some((m) => m.user_id === p.id)).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addMember}>Add</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Focus areas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {areas.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.name}</span>
              {isManager && <Button size="sm" variant="ghost" onClick={() => removeArea(a.id)}><X className="h-4 w-4" /></Button>}
            </div>
          ))}
          {isManager && (
            <div className="flex gap-2 pt-2 border-t">
              <Input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="New focus area" />
              <Button onClick={addArea}>Add</Button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}