import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Upload, FileText } from "lucide-react";

export function ProjectOverview({ project, isManager, onChange }: { project: any; isManager: boolean; onChange: (p: any) => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [newArea, setNewArea] = useState("");
  const [pickUser, setPickUser] = useState("");

  const load = async () => {
    const [m, a, p] = await Promise.all([
      supabase.from("project_members").select("*, profiles:user_id(name,email)").eq("project_id", project.id),
      supabase.from("focus_areas").select("*").eq("project_id", project.id).order("display_order"),
      supabase.from("profiles").select("*").order("name"),
    ]);
    setMembers(m.data ?? []); setAreas(a.data ?? []); setProfiles(p.data ?? []);
  };
  useEffect(() => { load(); }, [project.id]);

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

  return (
    <div className="grid gap-6 md:grid-cols-2">
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

      <Card className="md:col-span-2">
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
    </div>
  );
}