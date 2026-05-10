import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, FileText, CheckCircle2, Circle, Sparkles, Globe, BrainCircuit, RefreshCw } from "lucide-react";

export function ProjectOverview({ project, isManager, onChange }: { project: any; isManager: boolean; onChange: (p: any) => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  
  const [newArea, setNewArea] = useState("");
  const [pickUser, setPickUser] = useState("");
  const [busyIntelligence, setBusyIntelligence] = useState(false);

  const load = async () => {
    const [m, a, p, met] = await Promise.all([
      supabase.from("project_members").select("*, profiles:user_id(name,email)").eq("project_id", project.id),
      supabase.from("focus_areas").select("*").eq("project_id", project.id).order("display_order"),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("project_metrics").select("*").eq("project_id", project.id).maybeSingle(),
    ]);
    setMembers(m.data ?? []); setAreas(a.data ?? []); setProfiles(p.data ?? []);
    setMetrics(met.data || { revenue: 0, expenses: 0, goals: [], kpi_scorecard: [], executive_summary: "" });
  };
  useEffect(() => { load(); }, [project.id]);

  const updateMetrics = async (patch: any) => {
    const newM = { ...metrics, ...patch };
    setMetrics(newM);
    if (!isManager) return;
    
    const { data } = await supabase.from("project_metrics").select("id").eq("project_id", project.id).maybeSingle();
    if (data) {
      await supabase.from("project_metrics").update(patch).eq("project_id", project.id);
    } else {
      await supabase.from("project_metrics").insert({ project_id: project.id, ...patch });
    }
  };

  const addMember = async () => {
    if (!pickUser) return;
    
    // Determine if the pickUser is an ID from the dropdown or a typed email
    const isEmail = pickUser.includes('@');
    
    if (isEmail) {
      if (!pickUser.endsWith('@dkothary.com')) {
        return toast.error("Only @dkothary.com emails can be invited.");
      }
      toast.loading("Sending invitation...");
      try {
        const { data, error } = await supabase.functions.invoke("admin_invite", {
          body: { email: pickUser, role: "member" }
        });
        toast.dismiss();
        if (error) throw error;
        toast.success(`Invitation sent to ${pickUser}. They will be automatically added here once they sign up.`);
        setPickUser("");
      } catch (err: any) {
        toast.dismiss();
        toast.error(err.message || "Failed to invite user");
      }
      return;
    }

    // It's a selected existing user ID
    // Fix: Check for duplicate first
    const isDuplicate = members.some(m => m.user_id === pickUser);
    if (isDuplicate) {
      toast.error("User is already a member of this project.");
      setPickUser("");
      return;
    }

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

  const updateWebsite = async (url: string) => {
    const { data, error } = await supabase.from("projects").update({ website: url || null }).eq("id", project.id).select().single();
    if (error) return toast.error(error.message);
    onChange(data);
  };

  const generateIntelligence = async () => {
    setBusyIntelligence(true);
    try {
      const prompt = `IGNORE PREVIOUS INSTRUCTIONS. You are an expert business analyst and auditor. Based on the client name "${project.client || project.name}"${project.website ? ` and their website URL ${project.website}` : ''}, provide a concise 2-paragraph "Engagement Intelligence" briefing. Cover likely industry risks, primary audit focuses, and a general company overview. RETURN ONLY THE BRIEFING TEXT.`;
      
      const { data, error } = await supabase.functions.invoke("ai", {
        body: { text: prompt }
      });
      if (error) throw new Error(error.message || "Failed to generate");
      
      updateMetrics({ executive_summary: data.text });
      toast.success("Engagement Intelligence generated!");
    } catch (e: any) { toast.error(e.message); }
    setBusyIntelligence(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden relative">
          {/* Subtle gradient background for the intelligence card */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -z-10 translate-x-1/2 -translate-y-1/2"></div>
          
          <CardHeader className="flex flex-row items-start justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-indigo-600" /> 
                Engagement Intelligence
              </CardTitle>
              <CardDescription className="mt-1">Latest project context, industry risks, and company overview.</CardDescription>
            </div>
            {isManager && (
              <Button size="sm" onClick={generateIntelligence} disabled={busyIntelligence} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm">
                {busyIntelligence ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI Context Update
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <Input 
                className="h-8 text-sm" 
                placeholder="Company Website URL (e.g., https://example.com)" 
                value={project.website || ""} 
                onChange={(e) => updateWebsite(e.target.value)}
                disabled={!isManager}
              />
            </div>
            <Textarea 
              className="min-h-[180px] bg-white/60 resize-y leading-relaxed text-slate-700" 
              placeholder="Provide context about the client, latest news, or let AI generate an industry briefing..."
              value={metrics?.executive_summary || ""}
              onChange={(e) => updateMetrics({ executive_summary: e.target.value })}
              disabled={!isManager}
            />
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Project Financials & KPIs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">Revenue (YTD)</Label>
                <Input type="number" className="mt-1" value={metrics?.revenue || ""} onChange={(e) => updateMetrics({ revenue: Number(e.target.value) })} disabled={!isManager} />
              </div>
              <div>
                <Label className="text-slate-700">Expenses (YTD)</Label>
                <Input type="number" className="mt-1" value={metrics?.expenses || ""} onChange={(e) => updateMetrics({ expenses: Number(e.target.value) })} disabled={!isManager} />
              </div>
            </div>
            <div className="pt-2">
              <Label className="text-slate-700">Quarterly Goals</Label>
              <div className="space-y-2 mt-2">
                {metrics?.goals?.map((g: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                      const ng = [...metrics.goals];
                      ng[i].achieved = !ng[i].achieved;
                      updateMetrics({ goals: ng });
                    }} disabled={!isManager}>
                      {g.achieved ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                    </Button>
                    <Input className="h-8 bg-transparent border-0 focus-visible:ring-1" value={g.title} onChange={(e) => {
                      const ng = [...metrics.goals];
                      ng[i].title = e.target.value;
                      updateMetrics({ goals: ng });
                    }} disabled={!isManager} />
                    {isManager && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => {
                      const ng = metrics.goals.filter((_:any, idx:number) => idx !== i);
                      updateMetrics({ goals: ng });
                    }}><X className="h-4 w-4" /></Button>}
                  </div>
                ))}
                {isManager && (
                  <Button variant="outline" size="sm" className="w-full mt-2 border-dashed text-slate-500" onClick={() => {
                    updateMetrics({ goals: [...(metrics?.goals || []), { title: "New goal", achieved: false }] });
                  }}>+ Add Goal</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 mb-3"><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-md border border-slate-100">
                  <span className="font-medium text-slate-700">{m.profiles?.name || m.profiles?.email}</span>
                  {isManager && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500" onClick={() => removeMember(m.id)}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
            </div>
            {isManager && (
              <div className="flex flex-col gap-2 pt-3">
                <Label className="text-xs text-slate-500">Add or Invite Member</Label>
                <div className="flex gap-2">
                  <div className="relative w-full">
                    <Input 
                      placeholder="Type email to invite..." 
                      className="h-9 w-full"
                      value={pickUser}
                      onChange={(e) => setPickUser(e.target.value)}
                      list="existing-users"
                    />
                    <datalist id="existing-users">
                      {profiles.filter((p) => !members.some((m) => m.user_id === p.id)).map((p) => (
                        <option key={p.id} value={p.id}>{p.name || p.email}</option>
                      ))}
                    </datalist>
                  </div>
                  <Button onClick={addMember} className="h-9 px-4 shrink-0">Add</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 mb-3"><CardTitle className="text-base">Focus Areas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1.5">
              {areas.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm group px-2 py-1.5 hover:bg-slate-50 rounded-md">
                  <span className="text-slate-700">{a.name}</span>
                  {isManager && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500" onClick={() => removeArea(a.id)}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
            </div>
            {isManager && (
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Input className="h-8" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="New focus area" />
                <Button size="sm" className="h-8 px-3" onClick={addArea}>Add</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 mb-3"><CardTitle className="text-base">Report Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-700">Finalize Date</Label>
              <Input type="date" className="mt-1 h-9" value={project.finalize_date ?? ""} onChange={(e) => setFinalizeDate(e.target.value)} disabled={!isManager} />
            </div>
            <div>
              <Label className="text-slate-700">PowerPoint Template</Label>
              {project.template_filename ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                  <FileText className="h-4 w-4 text-blue-500" /> <span className="truncate">{project.template_filename}</span>
                </div>
              ) : <p className="text-[13px] text-slate-500 mt-1 leading-snug">No template uploaded. A default blank layout will be used.</p>}
              {isManager && (
                <label className="inline-flex items-center justify-center w-full gap-2 mt-3 cursor-pointer text-sm border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50 transition-colors text-slate-700 font-medium">
                  <Upload className="h-4 w-4 text-slate-400" /> Upload .pptx Template
                  <input type="file" accept=".pptx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
                </label>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}