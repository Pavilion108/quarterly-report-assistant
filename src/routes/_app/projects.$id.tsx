import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectOverview } from "@/components/project/Overview";
import { ProjectTracker } from "@/components/project/Tracker";
import { ProjectObservations } from "@/components/project/Observations";
import { ProjectReport } from "@/components/project/Report";
import { ProjectUdin } from "@/components/project/Udin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2, Save, X } from "lucide-react";

export const Route = createFileRoute("/_app/projects/$id")({
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = useParams({ from: "/_app/projects/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", quarter: "", client: "" });

  useEffect(() => {
    supabase.from("projects").select("*").eq("id", id).single().then(({ data }) => {
      setProject(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!project) return <p>Project not found.</p>;

  const isManager = user?.id === project.manager_id;

  const startEdit = () => {
    setEditForm({ name: project.name, quarter: project.quarter, client: project.client || "" });
    setEditing(true);
  };

  const saveEdit = async () => {
    const { data, error } = await supabase.from("projects").update({
      name: editForm.name, quarter: editForm.quarter, client: editForm.client || null,
    }).eq("id", project.id).select().single();
    if (error) return toast.error(error.message);
    setProject(data);
    setEditing(false);
    toast.success("Engagement updated");
  };

  const deleteProject = async () => {
    if (!confirm("Are you sure you want to permanently delete this engagement and all its data? This cannot be undone.")) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) return toast.error(error.message);
    toast.success("Engagement deleted");
    navigate({ to: "/dashboard" });
  };

  return (
    <div>
      <div className="mb-6">
        {editing ? (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-500">Engagement Name</Label>
              <Input className="h-9 mt-1 w-64" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Quarter</Label>
              <Input className="h-9 mt-1 w-28" value={editForm.quarter} onChange={(e) => setEditForm({ ...editForm, quarter: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Client</Label>
              <Input className="h-9 mt-1 w-40" value={editForm.client} onChange={(e) => setEditForm({ ...editForm, client: e.target.value })} />
            </div>
            <Button size="sm" className="h-9 bg-slate-900 hover:bg-slate-800" onClick={saveEdit}><Save className="h-3.5 w-3.5 mr-1.5" /> Save</Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.client ?? "—"} · {project.quarter} · Finalize {project.finalize_date ?? "—"}
              </p>
            </div>
            {isManager && (
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={startEdit}>
                  <Pencil className="h-3 w-3 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={deleteProject}>
                  <Trash2 className="h-3 w-3 mr-1.5" /> Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tracker">Scope Board</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="udin">UDIN & Files</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6"><ProjectOverview project={project} isManager={isManager} onChange={setProject} /></TabsContent>
        <TabsContent value="tracker" className="mt-6"><ProjectTracker projectId={id} project={project} /></TabsContent>
        <TabsContent value="observations" className="mt-6"><ProjectObservations projectId={id} /></TabsContent>
        <TabsContent value="udin" className="mt-6"><ProjectUdin project={project} isManager={isManager} /></TabsContent>
        <TabsContent value="report" className="mt-6"><ProjectReport project={project} isManager={isManager} /></TabsContent>
      </Tabs>
    </div>
  );
}