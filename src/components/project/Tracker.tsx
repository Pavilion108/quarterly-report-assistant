import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function ProjectTracker({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    const { data } = await supabase.from("daily_logs")
      .select("*, profiles:user_id(name,email)")
      .eq("project_id", projectId).order("log_date", { ascending: false }).limit(100);
    setLogs(data ?? []);
  };
  useEffect(() => { load(); }, [projectId]);

  const submit = async () => {
    if (!tasks.trim()) return toast.error("Tasks are required");
    const { error } = await supabase.from("daily_logs").insert({
      project_id: projectId, user_id: user!.id, log_date: date,
      tasks, progress_notes: notes || null,
    });
    if (error) return toast.error(error.message);
    setTasks(""); setNotes(""); toast.success("Logged"); load();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader><CardTitle>Add daily entry</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Tasks done</Label><Textarea rows={3} value={tasks} onChange={(e) => setTasks(e.target.value)} /></div>
          <div><Label>Progress notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button onClick={submit}>Log entry</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent className="space-y-3 max-h-[600px] overflow-auto">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
          {logs.map((l) => (
            <div key={l.id} className="border-l-2 border-accent pl-3 py-1">
              <div className="text-xs text-muted-foreground">
                {l.log_date} · {l.profiles?.name || l.profiles?.email}
              </div>
              <div className="text-sm whitespace-pre-wrap">{l.tasks}</div>
              {l.progress_notes && <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{l.progress_notes}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}