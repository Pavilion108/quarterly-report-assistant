import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileCheck2, Share2 } from "lucide-react";
import { toast } from "sonner";
import PptxGenJS from "pptxgenjs";

export function ProjectReport({ project, isManager }: { project: any; isManager: boolean }) {
  const { user } = useAuth();
  const [obs, setObs] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [snaps, setSnaps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  const load = async () => {
    const [o, a, s, m] = await Promise.all([
      supabase.from("observations").select("*, focus_areas:focus_area_id(name,display_order)")
        .eq("project_id", project.id).eq("included_in_report", true)
        .order("sort_order"),
      supabase.from("focus_areas").select("*").eq("project_id", project.id).order("display_order"),
      supabase.from("report_snapshots").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
      supabase.from("project_metrics").select("*").eq("project_id", project.id).maybeSingle(),
    ]);
    setObs(o.data ?? []); setAreas(a.data ?? []); setSnaps(s.data ?? []);
    setMetrics(m.data ?? null);
  };
  useEffect(() => { load(); }, [project.id]);

  const buildPpt = async (kind: "draft" | "final") => {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = `${project.name} – ${project.quarter}`;

    // Title slide
    const t = pptx.addSlide();
    t.background = { color: "1E3A5F" };
    t.addText(project.name, { x: 0.5, y: 2, w: 12, h: 1.2, fontSize: 44, bold: true, color: "FFFFFF" });
    t.addText(`${project.client ?? ""} · ${project.quarter}`, { x: 0.5, y: 3.2, w: 12, h: 0.6, fontSize: 22, color: "C9D6E5" });
    t.addText(kind === "final" ? "FINAL REPORT" : "DRAFT", { x: 0.5, y: 6.5, w: 12, h: 0.5, fontSize: 16, color: "F5A623", bold: true });

    // Executive Summary Slide
    if (metrics?.executive_summary) {
      const e = pptx.addSlide();
      e.addText("Executive Summary", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: "1E3A5F" });
      e.addText(metrics.executive_summary, { x: 0.5, y: 1.3, w: 12, h: 5.8, fontSize: 16, color: "222222", align: "left" });
    }

    // Per focus area
    for (const a of areas) {
      const items = obs.filter((o) => o.focus_area_id === a.id);
      if (items.length === 0) continue;
      const s = pptx.addSlide();
      s.addText(a.name, { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: "1E3A5F" });
      s.addText(
        items.map((i) => ({ text: i.accepted_text || i.original_text, options: { bullet: true, paraSpaceAfter: 8 } })),
        { x: 0.5, y: 1.3, w: 12, h: 5.8, fontSize: 16, color: "222222" }
      );
    }

    // Uncategorized
    const uncat = obs.filter((o) => !o.focus_area_id);
    if (uncat.length) {
      const s = pptx.addSlide();
      s.addText("Other Observations", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: "1E3A5F" });
      s.addText(uncat.map((i) => ({ text: i.accepted_text || i.original_text, options: { bullet: true } })),
        { x: 0.5, y: 1.3, w: 12, h: 5.8, fontSize: 16 });
    }

    const tag = kind === "final" ? "FINAL" : "Draft";
    const fname = `DKC_${project.name}_${project.quarter}_${tag}.pptx`.replace(/\s+/g, "_");
    await pptx.writeFile({ fileName: fname });

    // Record snapshot (without large blob)
    await supabase.from("report_snapshots").insert({
      project_id: project.id, kind, file_path: fname, created_by: user!.id,
    });
    toast.success(`${tag} downloaded`);
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {obs.length} observation{obs.length === 1 ? "" : "s"} included across {areas.length} focus area{areas.length === 1 ? "" : "s"}.
            The PPT is built live from accepted observation text.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => buildPpt("draft")}>
              <Download className="h-4 w-4 mr-1" /> Download draft PPT
            </Button>
            {isManager && (
              <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => buildPpt("final")}>
                <FileCheck2 className="h-4 w-4 mr-1" /> Finalize & download FINAL
              </Button>
            )}
            <Button variant="outline" onClick={async () => {
              toast.loading("Generating secure share link...");
              const token = Math.random().toString(36).substring(2, 15);
              const snapshot = { project, areas, obs, metrics };
              const { error } = await supabase.from("shared_reports").insert({
                project_id: project.id,
                token,
                created_by: user!.id,
                snapshot
              });
              toast.dismiss();
              if (error) return toast.error(error.message);
              const url = `${window.location.origin}/share/${token}`;
              await navigator.clipboard.writeText(url);
              toast.success("Share link copied to clipboard!");
            }}>
              <Share2 className="h-4 w-4 mr-1" /> Create Public Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Snapshot history</CardTitle></CardHeader>
        <CardContent>
          {snaps.length === 0 ? <p className="text-sm text-muted-foreground">No downloads yet.</p> : (
            <div className="space-y-2 text-sm">
              {snaps.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs mr-2 ${s.kind === "final" ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{s.kind}</span>
                    {s.file_path}
                  </div>
                  <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}