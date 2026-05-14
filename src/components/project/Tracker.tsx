import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CalendarDays, CheckCircle2, Clock, CircleDot, MessageSquare, Send, 
  ArrowRight, Users, ChevronDown, Pencil, Trash2, Check, X,
  History, Info, ClipboardList, AlertTriangle, UserCircle2, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
  { value: "working", label: "Working", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  { value: "followup_client", label: "Followup to Client", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { value: "pending_client", label: "Pending at Client", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  { value: "completed", label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "medium", label: "Medium", color: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "high", label: "High", color: "bg-red-50 text-red-600 border-red-200" },
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

function getInitials(name: string = "") {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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

  // Edit focus area state
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");

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
    const latestLog = areaLogs[0];
    const parsed = latestLog ? parseLogStatus(latestLog.tasks) : { status: "not_started", focusAreaName: area.name };
    
    // Urgency check
    const isOverdue = area.target_date && new Date(area.target_date) < new Date() && parsed.status !== 'completed';

    return {
      area,
      status: parsed.status,
      lastUser: latestLog?.profiles?.name || latestLog?.profiles?.email || null,
      lastTime: latestLog?.created_at || null,
      lastNote: latestLog?.progress_notes || null,
      isOverdue
    };
  });

  const updateAreaField = async (id: string, field: string, value: any) => {
    const { error } = await supabase.from("focus_areas").update({ [field]: value }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

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

  const calcProgress = () => {
    const s = new Date(project?.start_date || project?.created_at).getTime();
    const e = new Date(project?.finalize_date).getTime();
    if (!e || isNaN(s) || isNaN(e)) return 0;
    const n = Date.now();
    if (n < s) return 0; if (n > e) return 100;
    return Math.round(((n - s) / (e - s)) * 100);
  };
  const progress = calcProgress();

  const completedCount = boardData.filter(b => b.status === "completed").length;
  const workingCount = boardData.filter(b => b.status === "working").length;

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      {project && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-500 grid place-items-center"><ClipboardList className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Scope Items</p>
              <p className="text-xl font-bold text-slate-900">{areas.length}</p>
            </div>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Completed</p>
              <p className="text-xl font-bold text-emerald-600">{completedCount}<span className="text-sm text-slate-400 font-normal ml-1">/ {areas.length}</span></p>
            </div>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center"><Clock className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">In Progress</p>
              <p className="text-xl font-bold text-blue-600">{workingCount}</p>
            </div>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm p-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Timeline</p>
              <span className="text-[10px] font-bold text-slate-900">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-slate-100" />
          </Card>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        
        <div className="space-y-6 min-w-0">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><CircleDot className="h-5 w-5 text-blue-600" /> Scope Board</CardTitle>
                  <CardDescription>Track status, priority, and target dates for the audit scope.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowQuickEntry(!showQuickEntry)}>
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Quick Entry
                  <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showQuickEntry ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </CardHeader>

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
                      <Label className="text-[10px] text-slate-500">Action Note (optional)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input className="h-8 text-xs" value={qNote} onChange={(e) => setQNote(e.target.value)} placeholder="What happened?" onKeyDown={(e) => e.key === 'Enter' && quickSubmit()} />
                        <Button size="sm" className="h-8 px-3 bg-slate-900 hover:bg-slate-800" onClick={quickSubmit} disabled={busy === "quick"}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <CardContent className="p-0">
              {boardData.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <CircleDot className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No focus areas defined yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {boardData.map((item, idx) => {
                    const meta = getStatusMeta(item.status);
                    const priority = PRIORITIES.find(p => p.value === item.area.priority) || PRIORITIES[1];
                    const isProcessing = busy === item.area.id;

                    return (
                      <motion.div 
                        key={item.area.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.03 }} 
                        className={`group p-4 hover:bg-slate-50/50 transition-colors ${item.isOverdue ? 'bg-red-50/10' : ''}`}
                      >
                        <div className="flex flex-col gap-3">
                          {/* Top Row: Title and Actions */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${meta.dot} shrink-0 mt-1 ${item.isOverdue ? 'animate-pulse' : ''}`} />
                              {editingArea === item.area.id ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input className="h-8 text-sm min-w-[300px]" value={editingAreaName} onChange={(e) => setEditingAreaName(e.target.value)} onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      supabase.from("focus_areas").update({ name: editingAreaName.trim() }).eq("id", item.area.id).then(() => { setEditingArea(null); load(); });
                                    }
                                  }} autoFocus />
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => { supabase.from("focus_areas").update({ name: editingAreaName.trim() }).eq("id", item.area.id).then(() => { setEditingArea(null); load(); }); }}><Check className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingArea(null)}><X className="h-4 w-4" /></Button>
                                </div>
                              ) : (
                                <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                  {item.area.name}
                                  {item.isOverdue && <Badge variant="destructive" className="ml-2 text-[9px] uppercase h-4 px-1.5 animate-bounce">Overdue</Badge>}
                                </h3>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => setShowNoteFor(showNoteFor === item.area.id ? null : item.area.id)} className={`p-2 rounded-md transition-all ${showNoteFor === item.area.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}>
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              <button onClick={() => { setEditingArea(item.area.id); setEditingAreaName(item.area.name); }} className="p-2 rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Metadata Row: Priority, Status, Date, User, Time */}
                          <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                            {/* Priority Select */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Priority</span>
                              <Select value={item.area.priority} onValueChange={(v) => updateAreaField(item.area.id, 'priority', v)}>
                                <SelectTrigger className={`h-7 w-[90px] text-[10px] px-2 font-bold uppercase ${priority.color}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Status Button */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Status</span>
                              <button 
                                disabled={isProcessing} 
                                onClick={() => cycleStatus(item.area, item.status)} 
                                className={`h-7 px-3 rounded-md border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center transition-all ${meta.color} hover:shadow-sm active:scale-95 disabled:opacity-50`}
                              >
                                {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : meta.label}
                              </button>
                            </div>

                            {/* Target Date */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Target Date</span>
                              <div className="flex items-center gap-1.5 h-7">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <input 
                                  type="date" 
                                  className={`text-xs bg-transparent border-0 p-0 focus:ring-0 font-medium ${item.isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'}`} 
                                  value={item.area.target_date || ''} 
                                  onChange={(e) => updateAreaField(item.area.id, 'target_date', e.target.value)} 
                                />
                              </div>
                            </div>

                            {/* Updated By */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Owner</span>
                              <div className="flex items-center gap-2 h-7">
                                <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[9px] font-bold grid place-items-center">
                                  {getInitials(item.lastUser || '??')}
                                </div>
                                <span className="text-xs text-slate-700 font-medium">{item.lastUser?.split(' ')[0] || "—"}</span>
                              </div>
                            </div>

                            {/* When */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Last Update</span>
                              <div className="flex items-center gap-1.5 h-7 text-xs text-slate-500 font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-300" />
                                {item.lastTime ? timeAgo(item.lastTime) : "—"}
                              </div>
                            </div>
                          </div>

                          {/* Last Action Bar */}
                          {item.lastNote && (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex gap-3 items-start">
                              <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Last Action Result</p>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">"{item.lastNote}"</p>
                              </div>
                            </div>
                          )}

                          {/* Inline Note Entry */}
                          <AnimatePresence>
                            {showNoteFor === item.area.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-blue-50/30 rounded-lg border border-blue-100 mt-2">
                                <div className="p-4 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                                  <div className="flex-1 w-full">
                                    <Label className="text-[10px] text-blue-600 font-bold uppercase mb-1.5 block">Log new action for "{item.area.name}"</Label>
                                    <Input className="h-9 text-sm bg-white border-blue-200" placeholder="What happened? (e.g. Reach Hement, Document received)" value={inlineNote[item.area.id] || ""} onChange={(e) => setInlineNote(prev => ({ ...prev, [item.area.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && cycleStatus(item.area, item.status)} autoFocus />
                                  </div>
                                  <Button size="sm" className="h-9 px-6 bg-blue-600 hover:bg-blue-700" onClick={() => cycleStatus(item.area, item.status)}>
                                    Update Progress
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm sticky top-6">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-slate-600">
                <History className="h-4 w-4" /> Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-350px)] overflow-auto divide-y divide-slate-50 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 px-6">
                    <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No activity yet</p>
                  </div>
                ) : (
                  logs.slice(0, 40).map((l, idx) => {
                    const { status, focusAreaName } = parseLogStatus(l.tasks);
                    const statusMeta = getStatusMeta(status);

                    return (
                      <motion.div key={l.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.01 }} className="p-4 hover:bg-slate-50 transition-colors border-l-2 border-transparent hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold grid place-items-center border border-blue-100 mt-0.5`}>
                            {getInitials(l.profiles?.name || '??')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-slate-900">{l.profiles?.name || l.profiles?.email}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{focusAreaName}</span>
                                <span className="text-slate-300 text-[10px]">»</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusMeta.color}`}>{statusMeta.label}</span>
                              </div>
                            </div>
                            {l.progress_notes && <div className="mt-2 bg-slate-100/50 rounded p-2 text-[11px] text-slate-600 leading-normal italic">"{l.progress_notes}"</div>}
                            <div className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-400 font-medium">
                              <Clock className="h-2.5 w-2.5" /> {timeAgo(l.created_at)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}