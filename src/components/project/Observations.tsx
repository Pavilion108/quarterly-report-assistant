import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

export function ProjectObservations({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [obs, setObs] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [o, a] = await Promise.all([
      supabase.from("observations")
        .select("*, profiles:author_id(name,email), focus_areas:focus_area_id(name)")
        .eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("focus_areas").select("*").eq("project_id", projectId).order("display_order"),
    ]);
    setObs(o.data ?? []); setAreas(a.data ?? []);
    if (!areaId && a.data?.[0]) setAreaId(a.data[0].id);
  };
  useEffect(() => { load(); }, [projectId]);

  const add = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from("observations").insert({
      project_id: projectId, author_id: user!.id,
      focus_area_id: areaId || null, original_text: text, accepted_text: text,
    });
    if (error) return toast.error(error.message);
    setText(""); load();
  };

  const doRewrite = async (o: any) => {
    setBusy(o.id);
    try {
      const { data, error } = await supabase.functions.invoke("ai", {
        body: { text: o.accepted_text || o.original_text }
      });
      if (error) throw new Error(error.message || "Failed to rewrite");
      
      await supabase.from("observations").update({ rewritten_text: data.text }).eq("id", o.id);
      await supabase.from("observation_history").insert({
        observation_id: o.id, actor_id: user!.id, action: "ai_rewrite",
        snapshot: { rewritten_text: data.text },
      });
      load();
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const accept = async (o: any) => {
    if (!o.rewritten_text) return;
    await supabase.from("observations").update({ accepted_text: o.rewritten_text }).eq("id", o.id);
    await supabase.from("observation_history").insert({
      observation_id: o.id, actor_id: user!.id, action: "accept_rewrite",
      snapshot: { accepted_text: o.rewritten_text },
    });
    load();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader><CardTitle>Add observation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger><SelectValue placeholder="Focus area" /></SelectTrigger>
            <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the observation point…" />
          <Button onClick={add}>Add observation</Button>
        </CardContent>
      </Card>
      <div className="space-y-3 max-h-[700px] overflow-auto">
        {obs.length === 0 && <p className="text-sm text-muted-foreground">No observations yet.</p>}
        {obs.map((o) => (
          <Card key={o.id}>
            <CardContent className="pt-4 space-y-2">
              <div className="text-xs text-muted-foreground">
                {o.focus_areas?.name ?? "—"} · {o.profiles?.name || o.profiles?.email} · {new Date(o.created_at).toLocaleString()}
              </div>
              <div className="text-sm whitespace-pre-wrap">{o.accepted_text || o.original_text}</div>
              {o.rewritten_text && o.rewritten_text !== o.accepted_text && (
                <div className="rounded border bg-secondary/40 p-2 text-sm">
                  <div className="text-xs font-medium mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI suggestion</div>
                  <div className="whitespace-pre-wrap">{o.rewritten_text}</div>
                  <Button size="sm" className="mt-2" onClick={() => accept(o)}><Check className="h-3 w-3 mr-1" />Accept</Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => doRewrite(o)} disabled={busy === o.id}>
                  <Sparkles className="h-3 w-3 mr-1" />{busy === o.id ? "Rewriting…" : "AI rewrite"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}