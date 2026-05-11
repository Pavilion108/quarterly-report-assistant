import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ExternalLink, Upload, FileText, Star, StarOff, Trash2, Copy,
  ClipboardCheck, FileSpreadsheet, Presentation, File, CheckCircle2,
  AlertCircle, Info, Download
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
  const ext = name.split(".").pop()?.toLowerCase();
  if (["doc", "docx"].includes(ext ?? "")) return "word";
  if (["xls", "xlsx", "csv"].includes(ext ?? "")) return "excel";
  if (["ppt", "pptx"].includes(ext ?? "")) return "ppt";
  if (ext === "pdf") return "pdf";
  return "other";
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
    const { data } = await supabase
      .from("project_files")
      .select("*, profiles:user_id(name)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });
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
        // Check size (limit to 5MB for base64 storage)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" exceeds 5MB limit. Skipping.`);
          continue;
        }
        const reader = new FileReader();
        const b64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const fileType = detectFileType(file.name);
        const { error } = await supabase.from("project_files").insert({
          project_id: project.id,
          user_id: user?.id,
          file_name: file.name,
          file_type: fileType,
          audit_type: auditType,
          financial_year: financialYear,
          notes: notes || null,
          is_final: false,
          file_data: b64,
        });
        if (error) throw error;
        successCount++;
      } catch (e: any) {
        toast.error(`Failed to upload "${file.name}": ${e.message}`);
      }
    }
    if (successCount > 0) toast.success(`${successCount} file(s) uploaded successfully`);
    setNotes("");
    load();
    setUploading(false);
  };

  const markFinal = async (fileId: string, isFinal: boolean) => {
    // Unmark all others for same audit type + year first
    if (isFinal) {
      const same = files.filter(f => f.audit_type === auditType && f.financial_year === financialYear && f.id !== fileId);
      for (const f of same) {
        await supabase.from("project_files").update({ is_final: false }).eq("id", f.id);
      }
    }
    await supabase.from("project_files").update({ is_final: isFinal }).eq("id", fileId);
    toast.success(isFinal ? "Marked as Final report" : "Unmarked as Final");
    load();
  };

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    await supabase.from("project_files").delete().eq("id", fileId);
    toast.success("File removed");
    load();
  };

  const downloadFile = (f: any) => {
    if (!f.file_data) return toast.error("No file data");
    const ext = f.file_name.split(".").pop() ?? "";
    const mimeMap: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ppt: "application/vnd.ms-powerpoint",
      pdf: "application/pdf",
    };
    const mime = mimeMap[ext] ?? "application/octet-stream";
    const link = document.createElement("a");
    link.href = `data:${mime};base64,${f.file_data}`;
    link.download = f.file_name;
    link.click();
  };

  const finalReport = files.find(f => f.is_final);

  const udinCopyText = `
UDIN Generation Details — DK C & Associates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client / Company  : ${project.client ?? project.name}
Financial Year    : ${finalReport?.financial_year ?? financialYear}
Type of Report    : ${finalReport?.audit_type ?? auditType}
Final Document    : ${finalReport?.file_name ?? "—"}

Steps to generate UDIN at https://udin.icai.org/ICAI :
1. Login with your ICAI credentials (Membership Number + Password)
2. Click "Generate UDIN" in the dashboard
3. Select Financial Year: ${finalReport?.financial_year ?? financialYear}
4. Select Document Type: ${finalReport?.audit_type ?? auditType}
5. Enter Client Name: ${project.client ?? project.name}
6. Enter PAN of Client (fill manually)
7. Upload the Final Document OR enter its date
8. Click "Generate" — copy the UDIN to your report
`.trim();

  return (
    <div className="space-y-6">
      {/* UDIN Portal Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-300" />
              <span className="text-xs font-bold tracking-widest text-indigo-300 uppercase">UDIN Portal</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">Generate UDIN for {project.client ?? project.name}</h2>
            <p className="text-slate-300 text-sm max-w-md">
              Upload your working files below, mark the final report as ⭐ Final, then use the Copy Board to quickly fill in the ICAI portal.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <a
              href="https://udin.icai.org/ICAI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow"
            >
              <ExternalLink className="h-4 w-4" />
              Open ICAI Portal
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10 text-xs"
              onClick={() => setShowCopyBoard(!showCopyBoard)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              {showCopyBoard ? "Hide" : "Show"} UDIN Copy Board
            </Button>
          </div>
        </div>
      </div>

      {/* UDIN Copy Board */}
      <AnimatePresence>
        {showCopyBoard && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card className="border-indigo-100 bg-indigo-50/50">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                    <ClipboardCheck className="h-4 w-4" /> UDIN Quick-Fill Board
                  </CardTitle>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      navigator.clipboard.writeText(udinCopyText);
                      toast.success("Copied to clipboard!");
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1.5" /> Copy All
                  </Button>
                </div>
                <CardDescription className="text-indigo-700">
                  Copy these details and paste them when filling the ICAI UDIN form
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Client / Company", value: project.client ?? project.name },
                    { label: "Financial Year", value: finalReport?.financial_year ?? financialYear },
                    { label: "Report Type", value: finalReport?.audit_type ?? auditType },
                    { label: "Final Document", value: finalReport?.file_name ?? "No final marked yet" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-lg border border-indigo-100 px-3 py-2.5">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{label}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
                        <button
                          className="ml-2 text-indigo-400 hover:text-indigo-700 shrink-0"
                          onClick={() => { navigator.clipboard.writeText(value); toast.success(`"${label}" copied`); }}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {!finalReport && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Mark one uploaded file as ⭐ Final to auto-fill the document details above.
                  </div>
                )}

                <div className="mt-3 bg-white rounded-lg border border-indigo-100 p-3">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Step-by-Step Instructions</p>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                    <li>Open <strong>https://udin.icai.org/ICAI</strong> and log in with your membership number</li>
                    <li>Click <strong>"Generate UDIN"</strong> in the portal dashboard</li>
                    <li>Select Financial Year: <strong>{finalReport?.financial_year ?? financialYear}</strong></li>
                    <li>Select Document Type: <strong>{finalReport?.audit_type ?? auditType}</strong></li>
                    <li>Enter Client Name: <strong>{project.client ?? project.name}</strong></li>
                    <li>Enter the client's <strong>PAN</strong> (fill from your records)</li>
                    <li>Upload the Final Document or enter its signing date</li>
                    <li>Click <strong>"Generate"</strong> and copy the UDIN to paste into your report</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6">
        {/* Upload Panel */}
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-slate-600" /> Upload Working Files
              </CardTitle>
              <CardDescription>Word, Excel, PPT, PDF (max 5MB each)</CardDescription>
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
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Draft v2, reviewed by partner..."
                  className="text-sm resize-none"
                />
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
                <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">.docx · .xlsx · .pptx · .pdf</p>
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                    <div className="text-sm text-indigo-600 font-medium animate-pulse">Uploading…</div>
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
                After uploading, click ⭐ on a file to mark it as the Final report. The UDIN Copy Board will auto-fill with those details.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Files List */}
        <div>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" /> Working Files
                </CardTitle>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{files.length} files</span>
              </div>
              <CardDescription>Star a file to mark it as the Final report for UDIN</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              {loading ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading files…</div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Upload className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No files uploaded yet.</p>
                  <p className="text-xs mt-1">Upload your audit working files using the panel on the left.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-auto">
                  {files.map((f, idx) => {
                    const Icon = FILE_ICONS[f.file_type] ?? File;
                    const colorClass = FILE_COLORS[f.file_type] ?? FILE_COLORS.other;
                    return (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all group ${f.is_final ? "border-amber-200 bg-amber-50/50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"}`}
                      >
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{f.file_name}</p>
                            {f.is_final && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 h-4 font-bold">
                                FINAL
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {f.audit_type} · {f.financial_year}
                            {f.notes && ` · ${f.notes}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title={f.is_final ? "Unmark Final" : "Mark as Final"}
                            onClick={() => markFinal(f.id, !f.is_final)}
                            className={`p-1.5 rounded hover:bg-amber-100 ${f.is_final ? "text-amber-500" : "text-slate-400 hover:text-amber-500"} transition-colors`}
                          >
                            {f.is_final ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            title="Download"
                            onClick={() => downloadFile(f)}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => deleteFile(f.id, f.file_name)}
                            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
    </div>
  );
}
