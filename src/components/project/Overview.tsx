import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, FileText, CheckCircle2, Circle, Sparkles, Globe, BrainCircuit, RefreshCw, ClipboardPaste, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ProjectOverview({ project, isManager, onChange }: { project: any; isManager: boolean; onChange: (p: any) => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  
  const [newArea, setNewArea] = useState("");
  const [pickUser, setPickUser] = useState("");
  const [busyIntelligence, setBusyIntelligence] = useState(false);
  const [showAgreementParser, setShowAgreementParser] = useState(false);
  const [agreementText, setAgreementText] = useState("");

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
    const isEmail = pickUser.includes('@');
    if (isEmail) {
      if (!pickUser.endsWith('@dkothary.com')) return toast.error("Only @dkothary.com emails can be invited.");
      toast.loading("Sending invitation...");
      try {
        const { data, error } = await supabase.functions.invoke("admin_invite", { body: { email: pickUser, role: "member" } });
        toast.dismiss();
        if (error) throw error;
        toast.success(`Invitation sent to ${pickUser}.`);
        setPickUser("");
      } catch (err: any) { toast.dismiss(); toast.error(err.message || "Failed to invite"); }
      return;
    }
    // Robust duplicate check — check both in-memory state AND via fresh query
    const isDuplicate = members.some(m => m.user_id === pickUser);
    if (isDuplicate) { toast.error("This user is already a member of this engagement."); setPickUser(""); return; }
    const { data: existing } = await supabase.from("project_members").select("id").eq("project_id", project.id).eq("user_id", pickUser).maybeSingle();
    if (existing) { toast.error("This user is already a member of this engagement."); setPickUser(""); load(); return; }
    const { error } = await supabase.from("project_members").insert({ project_id: project.id, user_id: pickUser });
    if (error) { toast.error("Failed to add member. They may already be assigned."); return; }
    setPickUser(""); load();
  };

  const removeMember = async (id: string) => { await supabase.from("project_members").delete().eq("id", id); load(); };
  const addArea = async () => {
    if (!newArea.trim()) return;
    // Deduplication check
    const exists = areas.some(a => a.name.toLowerCase().trim() === newArea.toLowerCase().trim());
    if (exists) { toast.error(`"${newArea.trim()}" already exists as a focus area.`); return; }
    await supabase.from("focus_areas").insert({ project_id: project.id, name: newArea.trim(), display_order: areas.length });
    setNewArea(""); load();
  };
  const removeArea = async (id: string) => { await supabase.from("focus_areas").delete().eq("id", id); load(); };

  const bulkAddAreas = async () => {
    const lines = agreementText.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return toast.error("No lines found to import.");
    // Deduplicate against existing areas AND within the pasted text itself
    const existingNames = new Set(areas.map(a => a.name.toLowerCase().trim()));
    const uniqueLines: string[] = [];
    let skipped = 0;
    for (const line of lines) {
      const key = line.toLowerCase().trim();
      if (existingNames.has(key)) { skipped++; continue; }
      existingNames.add(key);
      uniqueLines.push(line);
    }
    if (uniqueLines.length === 0) return toast.error("All lines already exist as focus areas.");
    let order = areas.length;
    for (const line of uniqueLines) {
      await supabase.from("focus_areas").insert({ project_id: project.id, name: line, display_order: order++ });
    }
    toast.success(`${uniqueLines.length} scope lines imported!${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`);
    setAgreementText("");
    setShowAgreementParser(false);
    load();
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
      const { data, error } = await supabase.functions.invoke("ai", { body: { text: prompt } });
      if (error) throw new Error(error.message || "Failed to generate");
      updateMetrics({ executive_summary: data.text });
      toast.success("Intelligence generated!");
    } catch (e: any) { toast.error(e.message); }
    setBusyIntelligence(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {/* Company Intelligence — Read-only Panel */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-40 -z-10 translate-x-1/2 -translate-y-1/2"></div>
          <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="h-5 w-5 text-indigo-600" /> Client Profile & Risk Context
              </CardTitle>
              <CardDescription className="mt-1">AI-powered briefing on the client's business profile, industry risks, and audit context.</CardDescription>
            </div>
            {isManager && (
              <Button size="sm" onClick={generateIntelligence} disabled={busyIntelligence} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm shrink-0">
                {busyIntelligence ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {metrics?.executive_summary ? "Refresh Intel" : "Generate Intel"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {/* Company Website — prominent link */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <Globe className="h-4 w-4 text-slate-400 shrink-0" />
              {isManager ? (
                <Input className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0" placeholder="https://example.com" value={project.website || ""} onChange={(e) => updateWebsite(e.target.value)} />
              ) : (
                <span className="text-sm text-slate-600 truncate">{project.website || "No website set"}</span>
              )}
              {project.website && (
                <a href={project.website.startsWith("http") ? project.website : `https://${project.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 shrink-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Intelligence Display — Read-Only */}
            {metrics?.executive_summary ? (
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-lg p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-auto">
                {metrics.executive_summary}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <BrainCircuit className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No intelligence generated yet.</p>
                <p className="text-xs mt-1">Add a website above and click "Generate Intel" to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Focus Areas with Bulk Agreement Parser */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Audit Scope — Focus Areas</CardTitle>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{areas.length} items</span>
            </div>
            <CardDescription>These scope items appear as selectable statuses in the Scope Board.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="space-y-1 max-h-[300px] overflow-auto">
              {areas.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between text-sm group px-3 py-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono w-5">{i + 1}.</span>
                    <span className="text-slate-700">{a.name}</span>
                  </div>
                  {isManager && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500" onClick={() => removeArea(a.id)}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
              {areas.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No focus areas defined yet.</p>}
            </div>

            {isManager && (
              <>
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <Input className="h-8" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Add single focus area..." onKeyDown={(e) => e.key === 'Enter' && addArea()} />
                  <Button size="sm" className="h-8 px-3 shrink-0" onClick={addArea}>Add</Button>
                </div>

                <Button variant="ghost" size="sm" onClick={() => setShowAgreementParser(!showAgreementParser)} className="w-full text-xs text-indigo-600 h-8 hover:bg-indigo-50 justify-start">
                  <ClipboardPaste className="h-3 w-3 mr-1.5" />
                  Paste & Import Scope Lines
                  {showAgreementParser ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                </Button>

                <AnimatePresence>
                  {showAgreementParser && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-2">
                        <Textarea rows={6} value={agreementText} onChange={(e) => setAgreementText(e.target.value)} placeholder={"Paste the raw audit scope here...\nEach line becomes a separate Focus Area.\n\nExample:\nRevenue Recognition\nInternal Controls Testing\nGST Compliance Review\nRelated Party Transactions\nFixed Asset Verification"} className="text-xs bg-white resize-none font-mono" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">{agreementText.split('\n').filter(s => s.trim()).length} lines detected</span>
                          <Button size="sm" onClick={bulkAddAreas} className="bg-indigo-600 hover:bg-indigo-700 text-xs h-7">
                            <ClipboardPaste className="h-3 w-3 mr-1" /> Parse & Add All Lines
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Team Members */}
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
                  <Input placeholder="Type email to invite..." className="h-9" value={pickUser} onChange={(e) => setPickUser(e.target.value)} list="existing-users" />
                  <datalist id="existing-users">
                    {profiles.filter((p) => !members.some((m) => m.user_id === p.id)).map((p) => (
                      <option key={p.id} value={p.id}>{p.name || p.email}</option>
                    ))}
                  </datalist>
                  <Button onClick={addMember} className="h-9 px-4 shrink-0">Add</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Settings */}
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
              ) : <p className="text-[13px] text-slate-500 mt-1 leading-snug">No template uploaded.</p>}
              {isManager && (
                <label className="inline-flex items-center justify-center w-full gap-2 mt-3 cursor-pointer text-sm border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50 transition-colors text-slate-700 font-medium">
                  <Upload className="h-4 w-4 text-slate-400" /> Upload .pptx Template
                  <input type="file" accept=".pptx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quarterly Goals */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 mb-3"><CardTitle className="text-base">Quarterly Goals</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {metrics?.goals?.map((g: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                  const ng = [...metrics.goals]; ng[i].achieved = !ng[i].achieved; updateMetrics({ goals: ng });
                }} disabled={!isManager}>
                  {g.achieved ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                </Button>
                <Input className="h-8 bg-transparent border-0 focus-visible:ring-1" value={g.title} onChange={(e) => {
                  const ng = [...metrics.goals]; ng[i].title = e.target.value; updateMetrics({ goals: ng });
                }} disabled={!isManager} />
                {isManager && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => {
                  updateMetrics({ goals: metrics.goals.filter((_:any, idx:number) => idx !== i) });
                }}><X className="h-4 w-4" /></Button>}
              </div>
            ))}
            {isManager && (
              <Button variant="outline" size="sm" className="w-full mt-2 border-dashed text-slate-500" onClick={() => {
                updateMetrics({ goals: [...(metrics?.goals || []), { title: "New goal", achieved: false }] });
              }}>+ Add Goal</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}