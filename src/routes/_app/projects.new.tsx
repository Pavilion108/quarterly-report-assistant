import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/new")({
  component: NewProject,
});

function NewProject() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", quarter: "", client: "",
    start_date: "", end_date: "", finalize_date: "",
    focus_areas: "Internal Controls\nCompliance\nFinancial Reporting",
  });
  const [busy, setBusy] = useState(false);

  if (!roles.includes("manager") && !roles.includes("admin")) {
    return <p className="text-muted-foreground">Only managers can create projects.</p>;
  }

  const submit = async () => {
    if (!form.name || !form.quarter) return toast.error("Name and quarter are required");
    setBusy(true);
    const { data: project, error } = await supabase.from("projects").insert({
      name: form.name, quarter: form.quarter, client: form.client || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      finalize_date: form.finalize_date || null,
      manager_id: user!.id,
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }

    const areas = form.focus_areas.split("\n").map((s) => s.trim()).filter(Boolean);
    if (areas.length) {
      await supabase.from("focus_areas").insert(
        areas.map((name, i) => ({ project_id: project.id, name, display_order: i }))
      );
    }
    await supabase.from("project_members").insert({ project_id: project.id, user_id: user!.id });
    toast.success("Project created");
    navigate({ to: "/projects/$id", params: { id: project.id } });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>New project</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><Label>Project name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Quarter</Label><Input placeholder="Q2 2026" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} /></div>
          <div><Label>Client / Entity</Label><Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          <div><Label>Finalize date</Label><Input type="date" value={form.finalize_date} onChange={(e) => setForm({ ...form, finalize_date: e.target.value })} /></div>
        </div>
        <div>
          <Label>Focus areas (one per line)</Label>
          <Textarea rows={5} value={form.focus_areas} onChange={(e) => setForm({ ...form, focus_areas: e.target.value })} />
        </div>
        <Button onClick={submit} disabled={busy}>Create project</Button>
      </CardContent>
    </Card>
  );
}