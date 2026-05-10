import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Clock, CircleDot, MessageSquare, Send, ArrowRight, Users, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
  { value: "working", label: "Working", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  { value: "followup_client", label: "Followup to Client", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { value: "pending_client", label: "Pending at Client", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  { value: "completed", label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
] as const;

function getStatusMeta(val: string) {
  return STATUSES.find(s => s.value === val) || STATUSES[0];
}

function getNextStatus(current: string): string {
  const idx = STATUSES.findIndex(s => s.value === current);
  return STATUSES[(idx + 1) % STATUSES.length].value;
}

function parseLogStatus(tasks: string): { status: string; focusAreaName: string } {
  const statusMatch = tasks.match(/^\[STATUS: (.*?)\]/);
  const scopeMatch = tasks.match(/\[Scope: (.*?)\]/);
  return {
    status: statusMatch ? statusMatch[1] : "not_started",
    focusAreaName: scopeMatch ? scopeMatch[1] : "General",
  };
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function ProjectTracker({ projectId, project }: { projectId: string, project?: any }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Quick entry state
  const [qDate, setQDate] = useState(new Date().toISOString().slice(0, 10));
  const [qArea, setQArea] = useState("general");
  const [qStatus, setQStatus] = useState("working");
  const [qNote, setQNote] = useState("");
  const [showQuickEntry, setShowQuickEntry] = useState(false);

  // Inline note state for board
  const [inlineNote, setInlineNote] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [logsRes, areasRes] = await Promise.all([
      supabase.from("daily_logs").select("*, profiles:user_id(name,email)").eq("project_id", projectId).order("created_at", { ascending: false }).limit(200),
      supabase.from("focus_areas").select("*").eq("project_id", projectId).order("display_order"),
    ]);
    setLogs(logsRes.data ?? []);
    setAreas(areasRes.data ?? []);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // Derive the current status of each focus area from the latest log
  const boardData = areas.map(area => {
    const areaLogs = logs.filter(l => {
      const { focusAreaName } = parseLogStatus(l.tasks);
      return focusAreaName === area.name;
    });
    const latestLog = areaLogs[0]; // already sorted desc
    const parsed = latestLog ? parseLogStatus(latestLog.tasks) : { status: "not_started", focusAreaName: area.name };
    return {
      area,
      status: parsed.status,
      lastUser: latestLog?.profiles?.name || latestLog?.profiles?.email || null,
      lastTime: latestLog?.created_at || null,
      lastNote: latestLog?.progress_notes || null,
    };
  });

  // One-click status cycle
  const cycleStatus = async (area: any, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    const note = inlineNote[area.id] || "";
    setBusy(area.id);

    const { error } = await supabase.from("daily_logs").insert({
      project_id: projectId,
      user_id: user!.id,
      log_date: new Date().toISOString().slice(0, 10),
      tasks: `[STATUS: ${nextStatus}][Scope: ${area.name}]`,
      progress_notes: note || null,
    });

    if (error) { toast.error(error.message); }
    else {
      const statusMeta = getStatusMeta(nextStatus);
      toast.success(`${area.name} → ${statusMeta.label}`);
    }
    setInlineNote(prev => ({ ...prev, [area.id]: "" }));
    setShowNoteFor(null);
    await load();
    setBusy(null);
  };

  // Quick entry submit
  const quickSubmit = async () => {
    setBusy("quick");
    const selectedArea = areas.find(a => a.id === qArea);
    const scopeName = selectedArea ? selectedArea.name : "General";
    const { error } = await supabase.from("daily_logs").insert({
      project_id: projectId,
      user_id: user!.id,
      log_date: qDate,
      tasks: `[STATUS: ${qStatus}][Scope: ${scopeName}]`,
      progress_notes: qNote || null,
    });
    if (error) { toast.error(error.message); }
    else { toast.success("Update logged"); setQNote(""); }
    await load();
    setBusy(null);
  };

  // Timeline progress
  const calcProgress = () => {
    if (!project?.start_date || !project?.finalize_date) return 0;
    const s = new Date(project.start_date).getTime();
    const e = new Date(project.finalize_date).getTime();
    const n = Date.now();
    if (n < s) return 0; if (n > e) return 100;
    return Math.round(((n - s) / (e - s)) * 100);
  };
  const progress = calcProgress();

  // Completion stats
  const completedCount = boardData.filter(b => b.status === "completed").length;
  const workingCount = boardData.filter(b => b.status === "working").length;

  return (
    <div className="space-y-5">
      {/* Top Stats Bar */}
      {project && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Scope Items</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{areas.length}</div>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Completed</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}<span className="text-sm text-slate-400 font-normal ml-1">/ {areas.length}</span></div>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">In Progress</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{workingCount}</div>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Timeline</div>
            <div className="mt-2">
              <Progress value={progress} className="h-2 bg-slate-100" />
              <div className="text-[10px] text-slate-500 mt-1">{progress}% elapsed</div>
            </div>
          </Card>
        </div>
      )}

      {/* Scope Board */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><CircleDot className="h-5 w-5 text-blue-600" /> Scope Board</CardTitle>
              <CardDescription>Click any status badge to advance it. Add a note before clicking for context.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowQuickEntry(!showQuickEntry)}>
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Quick Entry
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showQuickEntry ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        {/* Quick Entry Bar */}
        <AnimatePresence>
          {showQuickEntry && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-slate-100">
              <div className="flex flex-wrap gap-3 p-4 bg-slate-50/50">
                <div className="w-32">
                  <Label className="text-[10px] text-slate-500">Date</Label>
                  <Input type="date" className="h-8 text-xs mt-1" value={qDate} onChange={(e) => setQDate(e.target.value)} />
                </div>
                <div className="w-44">
                  <Label className="text-[10px] text-slate-500">Focus Area</Label>
                  <Select value={qArea} onValueChange={setQArea}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-44">
                  <Label className="text-[10px] text-slate-500">Status</Label>
                  <Select value={qStatus} onValueChange={setQStatus}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-[10px] text-slate-500">Note (optional)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input className="h-8 text-xs" value={qNote} onChange={(e) => setQNote(e.target.value)} placeholder="Quick note..." onKeyDown={(e) => e.key === 'Enter' && quickSubmit()} />
                    <Button size="sm" className="h-8 px-3 bg-slate-900 hover:bg-slate-800" onClick={quickSubmit} disabled={busy === "quick"}>
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Board Grid */}
        <CardContent className="p-0">
          {boardData.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CircleDot className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No focus areas defined yet.</p>
              <p className="text-xs mt-1">Go to the Overview tab and add scope items or import from an agreement.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Header */}
              <div className="grid grid-cols-[1fr_160px_120px_100px_40px] gap-2 px-4 py-2 bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Focus Area</span>
                <span>Status</span>
                <span>Updated By</span>
                <span>When</span>
                <span></span>
              </div>

              {boardData.map((item, idx) => {
                const meta = getStatusMeta(item.status);
                const isProcessing = busy === item.area.id;

                return (
                  <motion.div
                    key={item.area.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group"
                  >
                    <div className="grid grid-cols-[1fr_160px_120px_100px_40px] gap-2 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                      {/* Focus Area Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} />
                        <span className="text-sm font-medium text-slate-800 truncate">{item.area.name}</span>
                      </div>

                      {/* Status Badge — Clickable */}
                      <button
                        onClick={() => cycleStatus(item.area, item.status)}
                        disabled={isProcessing}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all hover:shadow-sm hover:scale-[1.02] active:scale-95 ${meta.color} ${isProcessing ? 'opacity-50' : ''}`}
                      >
                        {meta.label}
                        <ArrowRight className="h-3 w-3 opacity-50" />
                      </button>

                      {/* Last Updated By */}
                      <span className="text-xs text-slate-600 truncate">{item.lastUser || "—"}</span>

                      {/* When */}
                      <span className="text-[11px] text-slate-400">{item.lastTime ? timeAgo(item.lastTime) : "—"}</span>

                      {/* Note Toggle */}
                      <button onClick={() => setShowNoteFor(showNoteFor === item.area.id ? null : item.area.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Inline Note */}
                    <AnimatePresence>
                      {showNoteFor === item.area.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-3 flex gap-2">
                            <Input
                              className="h-8 text-xs flex-1 ml-4"
                              placeholder={`Add a note before updating "${item.area.name}"...`}
                              value={inlineNote[item.area.id] || ""}
                              onChange={(e) => setInlineNote(prev => ({ ...prev, [item.area.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && cycleStatus(item.area, item.status)}
                            />
                          </div>
                          {item.lastNote && (
                            <div className="px-4 pb-3 ml-4">
                              <div className="text-[10px] text-slate-400 mb-0.5">Last note:</div>
                              <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5 border border-slate-100">{item.lastNote}</div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Activity Stream */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-slate-600" /> Team Activity Stream</CardTitle>
          <CardDescription>Real-time updates from all team members on this engagement.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-auto divide-y divide-slate-50">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No activity yet.</p>
              </div>
            ) : (
              logs.slice(0, 50).map((l) => {
                const { status, focusAreaName } = parseLogStatus(l.tasks);
                const statusMeta = getStatusMeta(status);

                return (
                  <div key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusMeta.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800">{l.profiles?.name || l.profiles?.email}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-xs font-medium text-slate-600">{focusAreaName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.color}`}>{statusMeta.label}</span>
                      </div>
                      {l.progress_notes && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{l.progress_notes}</p>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 shrink-0 mt-0.5 whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(l.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}