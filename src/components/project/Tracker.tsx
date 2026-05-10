import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";

export function ProjectTracker({ projectId, project }: { projectId: string, project?: any }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [tasks, setTasks] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [focusArea, setFocusArea] = useState<string>("general");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [logsRes, areasRes] = await Promise.all([
      supabase.from("daily_logs").select("*, profiles:user_id(name,email)").eq("project_id", projectId).order("log_date", { ascending: false }).limit(100),
      supabase.from("focus_areas").select("*").eq("project_id", projectId).order("display_order")
    ]);
    setLogs(logsRes.data ?? []);
    setAreas(areasRes.data ?? []);
  };
  useEffect(() => { load(); }, [projectId]);

  const submit = async () => {
    if (!tasks.trim()) return toast.error("Tasks are required");
    setBusy(true);
    
    // Prefix task with focus area if selected to avoid needing schema changes for now
    const selectedArea = areas.find(a => a.id === focusArea);
    const scopePrefix = selectedArea ? `[Scope: ${selectedArea.name}]\n` : (focusArea === "general" ? "" : "");
    const finalTasks = scopePrefix + tasks;

    const { error } = await supabase.from("daily_logs").insert({
      project_id: projectId, user_id: user!.id, log_date: date,
      tasks: finalTasks, progress_notes: notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setTasks(""); setNotes(""); toast.success("Logged"); load();
  };

  // Calculate project timeline progress
  const calcProgress = () => {
    if (!project?.start_date || !project?.finalize_date) return 0;
    const s = new Date(project.start_date).getTime();
    const e = new Date(project.finalize_date).getTime();
    const n = new Date().getTime();
    if (n < s) return 0;
    if (n > e) return 100;
    return Math.round(((n - s) / (e - s)) * 100);
  };
  
  const progress = calcProgress();
  
  // Highlight missing days - check last 7 days
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
  
  const loggedDates = new Set(logs.map(l => l.log_date));

  return (
    <div className="space-y-6">
      {/* Overview Progress */}
      {project && (
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between text-sm font-medium text-slate-900">
                  <span>Engagement Timeline</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-100" />
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                  <span>Deadline: {new Date(project.finalize_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {last7Days.slice(0, 5).reverse().map(d => (
                  <div 
                    key={d} 
                    onClick={() => setDate(d)}
                    className={`flex flex-col items-center justify-center w-10 h-12 rounded border cursor-pointer transition-colors ${
                      loggedDates.has(d) 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : date === d ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'
                    }`}
                    title={loggedDates.has(d) ? 'Logged' : 'Missing Log'}
                  >
                    <span className="text-[10px] font-bold uppercase">{new Date(d).toLocaleDateString('en-US', {weekday: 'short'})}</span>
                    <span className="text-sm font-semibold">{new Date(d).getDate()}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-[1.5fr_2fr]">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-lg">Update Tracker</CardTitle>
            <CardDescription>Log your specific work steps and progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Work Date</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Project Scope (Focus Area)</Label>
                <Select value={focusArea} onValueChange={setFocusArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General / Administrative</SelectItem>
                    {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 flex justify-between">
                <span>Real Work Step (Tasks)</span>
                <span className="text-xs font-normal text-slate-400">Required</span>
              </Label>
              <Textarea 
                rows={4} 
                value={tasks} 
                onChange={(e) => setTasks(e.target.value)} 
                placeholder="List the specific audit steps completed..."
                className="resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700">Minute Details / Notes</Label>
              <Textarea 
                rows={2} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Any roadblocks, pending items, or extra details..."
                className="resize-none"
              />
            </div>
            
            <Button onClick={submit} disabled={busy} className="w-full bg-slate-900 hover:bg-slate-800">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Submit Daily Update
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-lg">Tracker History</CardTitle>
            <CardDescription>Recent updates across the engagement</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="max-h-[600px] overflow-auto p-6 space-y-6">
              {logs.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  <Clock className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                  <p>No entries logged yet.</p>
                </div>
              )}
              {logs.map((l) => {
                // Parse out the scope prefix if it exists
                let displayTasks = l.tasks;
                let scope = "General";
                const match = l.tasks.match(/^\[Scope: (.*?)\]\n([\s\S]*)$/);
                if (match) {
                  scope = match[1];
                  displayTasks = match[2];
                }

                return (
                  <div key={l.id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] last:before:bottom-0 before:w-0.5 before:bg-slate-100">
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{l.profiles?.name || l.profiles?.email}</span>
                          <span className="text-xs text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">{new Date(l.log_date).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">{scope}</span>
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap">{displayTasks}</div>
                      {l.progress_notes && (
                        <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-500 whitespace-pre-wrap">
                          <span className="font-semibold text-slate-700 block mb-1">Notes:</span>
                          {l.progress_notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}