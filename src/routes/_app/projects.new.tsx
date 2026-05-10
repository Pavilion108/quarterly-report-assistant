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
import { Globe } from "lucide-react";

export const Route = createFileRoute("/_app/projects/new")({
  component: NewProject,
});

function NewProject() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", quarter: "", client: "", website: "",
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
      website: form.website || null,
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
    <Card className="max-w-2xl bg-white border-slate-200 shadow-sm">
      <CardHeader><CardTitle className="text-xl">New Engagement</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-slate-700">Engagement Name</Label>
          <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q2 Statutory Audit" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700">Quarter</Label>
            <Input className="mt-1" placeholder="Q2 2026" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} />
          </div>
          <div>
            <Label className="text-slate-700">Client / Entity</Label>
            <Input className="mt-1" placeholder="Entity Name" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          </div>
        </div>
        
        <div>
          <Label className="text-slate-700">Company Website (for Engagement Intelligence)</Label>
          <div className="relative mt-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="https://www.example.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><Label className="text-slate-700">Start date</Label><Input type="date" className="mt-1" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label className="text-slate-700">End date</Label><Input type="date" className="mt-1" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          <div><Label className="text-slate-700">Finalize date</Label><Input type="date" className="mt-1" value={form.finalize_date} onChange={(e) => setForm({ ...form, finalize_date: e.target.value })} /></div>
        </div>
        
        <div>
          <Label className="text-slate-700">Focus areas (one per line)</Label>
          <Textarea className="mt-1" rows={4} value={form.focus_areas} onChange={(e) => setForm({ ...form, focus_areas: e.target.value })} />
        </div>
        
        <Button onClick={submit} disabled={busy} className="bg-slate-900 hover:bg-slate-800">
          Create Engagement
        </Button>
      </CardContent>
    </Card>
  );
}