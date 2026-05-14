import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Clock, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Activity } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/timesheet")({ component: TimesheetHelper });

function parseLogStatus(tasks: string) {
  const scopeMatch = tasks?.match(/\[Scope:\s*(.*?)\]/);
  return scopeMatch ? scopeMatch[1] : "General";
}

function TimesheetHelper() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchLogs() {
      if (!user) return;
      const { data, error } = await supabase
        .from("daily_logs")
        .select(`
          *,
          projects ( name )
        `)
        .eq("user_id", user.id)
        .order("log_date", { ascending: false });
      
      if (error) toast.error("Failed to load logs");
      else setLogs(data || []);
      setLoading(false);
    }
    fetchLogs();
  }, [user]);

  // Group by Month -> Date -> Project
  const groupedData = useMemo(() => {
    const months: Record<string, Record<string, Record<string, string[]>>> = {};

    logs.forEach(log => {
      // Only include logs that have actual progress notes, otherwise it's just a status change
      if (!log.progress_notes || log.progress_notes.trim() === "") return;

      const d = new Date(log.log_date || log.created_at);
      const monthKey = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const projectName = log.projects?.name || "Unknown Project";
      const focusArea = parseLogStatus(log.tasks);

      if (!months[monthKey]) months[monthKey] = {};
      if (!months[monthKey][dateKey]) months[monthKey][dateKey] = {};
      if (!months[monthKey][dateKey][projectName]) months[monthKey][dateKey][projectName] = [];

      months[monthKey][dateKey][projectName].push(`[${focusArea}] ${log.progress_notes}`);
    });

    return months;
  }, [logs]);

  const toggleMonth = (m: string) => setExpandedMonths(prev => ({ ...prev, [m]: !prev[m] }));

  const copyToClipboard = (dateStr: string, projectData: Record<string, string[]>) => {
    let copyText = `Activities for ${new Date(dateStr).toLocaleDateString()}:\n\n`;
    
    Object.entries(projectData).forEach(([proj, notes]) => {
      copyText += `${proj}:\n`;
      notes.forEach(n => {
        copyText += `  - ${n}\n`;
      });
      copyText += `\n`;
    });
    copyText += `Target Hours: 8 hr 30 min`;

    navigator.clipboard.writeText(copyText);
    toast.success("Timesheet notes copied to clipboard!");
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Loading timesheet data...</div>;

  const monthKeys = Object.keys(groupedData);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-3">
            <Activity className="h-3 w-3" /> Behivee Helper
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Timesheet Records</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xl">
            A summary of your project activities. Use the copy button to quickly format your daily notes based activity for the Behivee portal.
          </p>
        </div>
        <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center gap-4 shrink-0 shadow-lg">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <Clock className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Each Day Behivee Recorded Hours</p>
            <p className="text-xl font-black">8 hr <span className="text-blue-400">30 min</span></p>
          </div>
        </div>
      </div>

      {monthKeys.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium text-slate-600">No tracked activities found.</p>
            <p className="text-sm">Start adding notes to Focus Areas in your projects.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {monthKeys.map((month) => {
            const isExpanded = expandedMonths[month] !== false; // default true
            const days = Object.keys(groupedData[month]).sort((a, b) => b.localeCompare(a));

            return (
              <Card key={month} className="overflow-hidden border-slate-200 shadow-sm">
                <button 
                  onClick={() => toggleMonth(month)}
                  className="w-full bg-slate-50/80 p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                    <h2 className="text-lg font-bold text-slate-800">{month}</h2>
                    <Badge variant="secondary" className="bg-white text-slate-500">{days.length} days logged</Badge>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="divide-y divide-slate-100">
                        {days.map(date => {
                          const projects = groupedData[month][date];
                          const dateObj = new Date(date);
                          const dayName = dateObj.toLocaleDateString('default', { weekday: 'long' });
                          const dayNum = dateObj.getDate();

                          return (
                            <div key={date} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row gap-6">
                              {/* Date Column */}
                              <div className="md:w-48 shrink-0 flex flex-col items-start">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{dayNum}</span>
                                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{dayName}</span>
                                </div>
                                <Badge variant="outline" className="mt-2 bg-blue-50/50 text-blue-700 border-blue-200">
                                  8 hr 30 min
                                </Badge>
                                
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  className="mt-4 w-full h-8 text-[11px] bg-slate-900 text-white hover:bg-slate-800"
                                  onClick={() => copyToClipboard(date, projects)}
                                >
                                  <Copy className="h-3 w-3 mr-1.5" /> Copy for Behivee
                                </Button>
                              </div>

                              {/* Activities Column */}
                              <div className="flex-1 space-y-4">
                                {Object.entries(projects).map(([projName, notes]) => (
                                  <div key={projName} className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                      <div className="w-2 h-2 rounded-full bg-blue-500" /> {projName}
                                    </h4>
                                    <ul className="space-y-2">
                                      {notes.map((note, i) => (
                                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                          <span className="leading-relaxed">{note}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
