import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Check, Wand2, Plus, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function ProjectObservations({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [obs, setObs] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  
  // New state for Focus Area Extractor
  const [showExtractor, setShowExtractor] = useState(false);
  const [extractText, setExtractText] = useState("");

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

  const doEnhance = async () => {
    if (!text.trim()) return toast.error("Write some points to enhance first.");
    setBusy("enhance");
    try {
      const prompt = `IGNORE PREVIOUS INSTRUCTIONS. You are an expert CA. Take these rough bullet points and enhance them into a professional audit observation draft, expanding slightly with typical auditor phrasing. RETURN ONLY THE TEXT: \n\n${text}`;
      const { data, error } = await supabase.functions.invoke("ai", {
        body: { text: prompt }
      });
      if (error) throw new Error(error.message || "Failed to enhance");
      setText(data.text);
      toast.success("Text enhanced by AI");
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const doExtract = async () => {
    if (!extractText.trim()) return toast.error("Paste an audit paragraph first.");
    setBusy("extract");
    try {
      const prompt = `IGNORE PREVIOUS INSTRUCTIONS. You are an expert CA. Extract the key "Focus Areas" (audit scopes) from the following paragraph. RETURN ONLY A COMMA-SEPARATED LIST of short titles (e.g. Revenue, Internal Controls, Compliance): \n\n${extractText}`;
      const res = await supabase.functions.invoke("ai", {
        body: { text: prompt }
      });
      if (res.error) {
        const msg = typeof res.error === 'object' ? (res.error.message || JSON.stringify(res.error)) : String(res.error);
        throw new Error(msg || "AI service unavailable");
      }
      const responseText = res.data?.text || res.data;
      if (!responseText) throw new Error("Empty response from AI");
      
      const newAreas = String(responseText).split(',').map((s: string) => s.trim()).filter(Boolean);
      if (newAreas.length === 0) throw new Error("No focus areas found.");

      // Deduplicate against existing areas
      const existingNames = new Set(areas.map(a => a.name.toLowerCase().trim()));
      let currentOrder = areas.length;
      let added = 0;
      for (const area of newAreas) {
        if (existingNames.has(area.toLowerCase().trim())) continue;
        existingNames.add(area.toLowerCase().trim());
        await supabase.from("focus_areas").insert({
          project_id: projectId,
          name: area,
          display_order: currentOrder++
        });
        added++;
      }
      toast.success(`Extracted ${added} focus areas!`);
      setExtractText("");
      setShowExtractor(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to extract focus areas"); }
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
      <div className="space-y-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-lg">Draft Observation</CardTitle>
            <CardDescription>Log a finding and let AI polish it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Focus Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowExtractor(!showExtractor)} className="text-xs text-blue-600 h-8 w-full justify-start hover:bg-blue-50">
                <Plus className="h-3 w-3 mr-1" /> AI Scope Extraction
              </Button>
            </div>
            
            <AnimatePresence>
              {showExtractor && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-2 mb-2">
                    <Textarea 
                      rows={3} 
                      value={extractText} 
                      onChange={(e) => setExtractText(e.target.value)} 
                      placeholder="Paste audit focus paragraph here..." 
                      className="text-xs bg-white resize-none"
                    />
                    <Button size="sm" onClick={doExtract} disabled={busy === "extract"} className="w-full bg-blue-600 hover:bg-blue-700 text-xs">
                      {busy === "extract" ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Extract Focus Areas
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2 relative">
              <Textarea 
                rows={6} 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                placeholder="Draft your observation or rough bullet points here…" 
                className="resize-none pb-12"
              />
              <div className="absolute bottom-2 right-2">
                <Button size="sm" variant="secondary" onClick={doEnhance} disabled={busy === "enhance"} className="h-8 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                  {busy === "enhance" ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                  AI Enhance Draft
                </Button>
              </div>
            </div>
            <Button onClick={add} className="w-full bg-slate-900 hover:bg-slate-800">Save Observation</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 max-h-[800px] overflow-auto pb-8 pr-2">
        {obs.length === 0 && (
          <div className="text-center py-16 text-slate-500 bg-white border border-slate-200 border-dashed rounded-xl">
            <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p>No observations logged yet.</p>
          </div>
        )}
        {obs.map((o) => (
          <Card key={o.id} className="bg-white border-slate-200 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-1 rounded">
                    {o.focus_areas?.name ?? "General"}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
                <span className="text-xs font-medium text-slate-900">{o.profiles?.name || o.profiles?.email}</span>
              </div>
              
              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {o.accepted_text || o.original_text}
              </div>
              
              {o.rewritten_text && o.rewritten_text !== o.accepted_text && (
                <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5" /> AI Auditor Suggestion
                    </div>
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{o.rewritten_text}</div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8" onClick={() => accept(o)}>
                      <Check className="h-3.5 w-3.5 mr-1.5" /> Accept Suggestion
                    </Button>
                  </div>
                </div>
              )}
              
              {(!o.rewritten_text || o.rewritten_text === o.accepted_text) && (
                <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                  <Button size="sm" variant="outline" onClick={() => doRewrite(o)} disabled={busy === o.id} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8">
                    {busy === o.id ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                    Rewrite as Final Audit Point
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}