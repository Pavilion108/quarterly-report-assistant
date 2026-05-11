import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ExternalLink, Upload, FileText, Star, StarOff, Trash2, Copy,
  ClipboardCheck, FileSpreadsheet, Presentation, File, AlertCircle,
  Download, Info, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FILE_ICONS: Record<string, any> = {
  word: FileText,
  excel: FileSpreadsheet,
  ppt: Presentation,
  pdf: File,
  other: File,
};

const FILE_COLORS: Record<string, string> = {
  word: "text-blue-600 bg-blue-50 border-blue-200",
  excel: "text-emerald-600 bg-emerald-50 border-emerald-200",
  ppt: "text-orange-600 bg-orange-50 border-orange-200",
  pdf: "text-red-600 bg-red-50 border-red-200",
  other: "text-slate-600 bg-slate-50 border-slate-200",
};

const AUDIT_TYPES = ["Internal Audit", "Statutory Audit", "IFC Report"];
const CURRENT_YEAR = new Date().getFullYear();
const FINANCIAL_YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = CURRENT_YEAR - i;
  return `${y}-${String(y + 1).slice(2)}`;
});

function detectFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (ext === "pdf") return "pdf";
  return "other";
}

export function ProjectUdin({ project, isManager }: { project: any; isManager: boolean }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [auditType, setAuditType] = useState("Internal Audit");
  const [financialYear, setFinancialYear] = useState(FINANCIAL_YEARS[0]);
  const [notes, setNotes] = useState("");
  const [showCopyBoard, setShowCopyBoard] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("project_files load error:", error);
      toast.error("Could not load files: " + error.message);
    }
    setFiles(data ?? []);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(fileList)) {
      try {
        const fileType = detectFileType(file.name);
        // Upload to Supabase Storage
        const storagePath = `${project.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const { error: storageError } = await supabase.storage
          .from("project-files")
          .upload(storagePath, file, { upsert: false });

        if (storageError) {
          console.error("Storage error:", storageError);
          throw new Error(storageError.message);
        }

        // Save metadata to DB
        const { error: dbError } = await supabase.from("project_files").insert({
          project_id: project.id,
          user_id: user?.id ?? null,
          file_name: file.name,
          file_type: fileType,
          audit_type: auditType,
          financial_year: financialYear,
          notes: notes || null,
          is_final: false,
          storage_path: storagePath,
        });

        if (dbError) {
          // Cleanup storage if DB insert fails
          await supabase.storage.from("project-files").remove([storagePath]);
          throw new Error(dbError.message);
        }
        successCount++;
      } catch (e: any) {
        console.error("Upload error:", e);
        toast.error(`Failed to upload "${file.name}": ${e.message}`);
      }
    }

    if (successCount > 0) toast.success(`${successCount} file(s) uploaded successfully`);
    setNotes("");
    await load();
    setUploading(false);
  };

  const markFinal = async (fileId: string, isFinal: boolean) => {
    if (isFinal) {
      // Unmark all others in same audit type + year
      const sameGroup = files.filter(
        f => f.audit_type === auditType && f.financial_year === financialYear && f.id !== fileId && f.is_final
      );
      for (const f of sameGroup) {
        await supabase.from("project_files").update({ is_final: false }).eq("id", f.id);
      }
    }
    const { error } = await supabase.from("project_files").update({ is_final: isFinal }).eq("id", fileId);
    if (error) return toast.error(error.message);
    toast.success(isFinal ? "⭐ Marked as Final report" : "Unmarked as Final");
    load();
  };

  const deleteFile = async (fileId: string, fileName: string, storagePath: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    if (storagePath) {
      await supabase.storage.from("project-files").remove([storagePath]);
    }
    await supabase.from("project_files").delete().eq("id", fileId);
    toast.success("File removed");
    load();
  };

  const downloadFile = async (f: any) => {
    if (!f.storage_path) return toast.error("No storage path found");
    const { data, error } = await supabase.storage.from("project-files").download(f.storage_path);
    if (error) return toast.error("Download failed: " + error.message);
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = f.file_name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const finalReport = files.find(f => f.is_final);

  const udinSteps = [
    { step: "1", label: "Login to ICAI Portal", detail: "Use your ICAI Membership No. + Password" },
    { step: "2", label: "Click 'Generate UDIN'", detail: "On the portal dashboard" },
    { step: "3", label: "Select Financial Year", detail: finalReport?.financial_year ?? financialYear, copyable: true },
    { step: "4", label: "Select Document Type", detail: finalReport?.audit_type ?? auditType, copyable: true },
    { step: "5", label: "Enter Client Name", detail: project.client ?? project.name, copyable: true },
    { step: "6", label: "Enter Client PAN", detail: "Enter from your records", copyable: false },
    { step: "7", label: "Date of Signing Report", detail: finalReport ? `Final: ${finalReport.file_name}` : "Mark a file as ⭐ Final first", copyable: false },
    { step: "8", label: "Generate & Copy UDIN", detail: "Paste UDIN into your final report" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="h-5 w-5 text-indigo-300" />
              <span className="text-[11px] font-bold tracking-widest text-indigo-300 uppercase">UDIN Filing</span>
            </div>
            <h2 className="text-2xl font-bold">{project.client ?? project.name}</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-md">
              Upload your final audit working files, mark one as ⭐ Final, then follow the step-by-step guide to generate the UDIN on the ICAI portal.
            </p>
            {finalReport && (
              <div className="mt-3 flex items-center gap-2 text-emerald-300 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Final report set: <span className="font-bold">{finalReport.file_name}</span> ({finalReport.audit_type} · {finalReport.financial_year})
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <a
              href="https://udin.icai.org/ICAI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow"
            >
              <ExternalLink className="h-4 w-4" /> Open ICAI Portal
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10 text-xs"
              onClick={() => setShowCopyBoard(!showCopyBoard)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              {showCopyBoard ? "Hide" : "Show"} UDIN Guide
            </Button>
          </div>
        </div>
      </div>

      {/* UDIN Step-by-Step Guide */}
      <AnimatePresence>
        {showCopyBoard && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card className="border-indigo-100 bg-indigo-50/40">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                  <ClipboardCheck className="h-4 w-4" /> UDIN Step-by-Step Guide
                </CardTitle>
                <CardDescription className="text-indigo-700">Follow each step on the ICAI portal — click 📋 to copy values</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {udinSteps.map(({ step, label, detail, copyable }) => (
                    <div key={step} className="flex items-start gap-3 bg-white rounded-lg border border-indigo-100 px-3 py-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">{step}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
                      </div>
                      {copyable && (
                        <button
                          className="text-indigo-400 hover:text-indigo-700 p-1 shrink-0"
                          onClick={() => { navigator.clipboard.writeText(detail ?? ""); toast.success(`Copied: ${detail}`); }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!finalReport && (
                  <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Upload your final report and click ⭐ on it to auto-fill steps 3–5 above.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-6">
        {/* Upload Panel */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-slate-600" /> Upload Working Files
            </CardTitle>
            <CardDescription>Word · Excel · PPT · PDF (no size limit)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Audit Type</Label>
              <Select value={auditType} onValueChange={setAuditType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Financial Year</Label>
              <Select value={financialYear} onValueChange={setFinancialYear}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Notes (optional)</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Draft v2, reviewed by partner..." className="text-sm resize-none" />
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all p-6 text-center ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <Upload className={`h-7 w-7 mx-auto mb-2 ${dragOver ? "text-indigo-500" : "text-slate-400"}`} />
              <p className="text-sm font-medium text-slate-700">Drop files or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">.docx · .xlsx · .pptx · .pdf</p>
              {uploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                  <p className="text-sm text-indigo-600 font-medium animate-pulse">Uploading…</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
              className="hidden"
              onChange={e => uploadFiles(e.target.files)}
            />

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <Info className="h-3.5 w-3.5 shrink-0" />
              After uploading, click ⭐ on the Final report to auto-fill your UDIN guide.
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600" /> Working Files
              </CardTitle>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{files.length} files</span>
            </div>
            <CardDescription>⭐ Star a file to set it as the Final report for UDIN generation</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm animate-pulse">Loading files…</div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Upload className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No files uploaded yet</p>
                <p className="text-xs mt-1">Upload your audit working files using the panel on the left.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
                {files.map((f, idx) => {
                  const Icon = FILE_ICONS[f.file_type] ?? File;
                  const colorClass = FILE_COLORS[f.file_type] ?? FILE_COLORS.other;
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group ${f.is_final ? "border-amber-200 bg-amber-50/50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"}`}
                    >
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{f.file_name}</p>
                          {f.is_final && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 h-4 font-bold">FINAL</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {f.audit_type} · {f.financial_year}{f.notes ? ` · ${f.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title={f.is_final ? "Unmark Final" : "Mark as Final"}
                          onClick={() => markFinal(f.id, !f.is_final)}
                          className={`p-1.5 rounded hover:bg-amber-100 transition-colors ${f.is_final ? "text-amber-500 opacity-100" : "text-slate-300 hover:text-amber-500"}`}
                        >
                          {f.is_final ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          title="Download"
                          onClick={() => downloadFile(f)}
                          className="p-1.5 rounded text-slate-300 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => deleteFile(f.id, f.file_name, f.storage_path)}
                          className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
