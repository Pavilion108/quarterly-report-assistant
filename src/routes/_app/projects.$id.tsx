import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectOverview } from "@/components/project/Overview";
import { ProjectTracker } from "@/components/project/Tracker";
import { ProjectObservations } from "@/components/project/Observations";
import { ProjectReport } from "@/components/project/Report";

export const Route = createFileRoute("/_app/projects/$id")({
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = useParams({ from: "/_app/projects/$id" });
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("projects").select("*").eq("id", id).single().then(({ data }) => {
      setProject(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!project) return <p>Project not found.</p>;

  const isManager = user?.id === project.manager_id;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.client ?? "—"} · {project.quarter} · Finalize {project.finalize_date ?? "—"}
        </p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tracker">Scope Board</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6"><ProjectOverview project={project} isManager={isManager} onChange={setProject} /></TabsContent>
        <TabsContent value="tracker" className="mt-6"><ProjectTracker projectId={id} project={project} /></TabsContent>
        <TabsContent value="observations" className="mt-6"><ProjectObservations projectId={id} /></TabsContent>
        <TabsContent value="report" className="mt-6"><ProjectReport project={project} isManager={isManager} /></TabsContent>
      </Tabs>
    </div>
  );
}