import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, Clock, AlertTriangle, AlertCircle, RefreshCw, FileText, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const DEFAULT_TEMPLATES = [
  {
    name: "Revenue Audit",
    items: [
      "Verify contracts/POs match invoices",
      "Check milestone completion before revenue recognition",
      "Confirm Ind AS 115 compliance for revenue timing",
      "Verify license agreements are executed",
      "Check for side letters or undocumented terms",
      "Verify revenue recognition timing per contract",
      "Verify delivery receipts and client acceptance",
      "Check for consignment sales not yet delivered",
      "Verify cut-off procedures at period end",
      "Confirm all statutory approvals (GeM/tender)",
      "Check advance payment accounting",
      "Verify percentage completion method if applicable",
      "Match timesheet hours to billing",
      "Verify rate cards and approvals",
      "Reconcile with bank statements",
      "Verify FD maturity dates and interest rates",
      "Check mark-to-market on forex contracts",
      "Verify hedge accounting compliance",
      "Ensure proper inter-company elimination",
      "Check for circular revenue booking",
      "Verify source and accounting treatment",
      "Review aging report for doubtful debts",
      "Check ECL provision calculation",
      "Verify approval and accounting of all credit notes"
    ]
  },
  {
    name: "Expenditure Audit",
    items: [
      "Reconcile payroll with HR records",
      "Verify ESOP charges per Ind AS 102",
      "Check statutory deductions (PF, ESI, PT)",
      "Verify gratuity and leave provisions",
      "Ensure TDS deduction at source",
      "Verify vendor due diligence and contracts",
      "Check GST input credit claims",
      "Cross-check board/shareholder approvals",
      "Verify earnout liabilities provisioning",
      "Check purchase price allocation per Ind AS 103",
      "Confirm board resolution",
      "Verify amount = DPS × total shares",
      "Check dividend distribution tax (if applicable)",
      "Reconcile advance tax with liability",
      "Check GST input/output matching",
      "Verify TDS returns filed timely",
      "Verify capitalization vs expensing per policy",
      "Check depreciation calculation",
      "Verify asset physical verification",
      "Check capitalization criteria per Ind AS 38",
      "Verify weighted deduction claims",
      "Verify Ind AS 116 ROU asset treatment",
      "Check lease liability calculations",
      "Verify policy compliance and approvals",
      "Check authorization and supporting",
      "Review all RPTs with subsidiaries/directors",
      "Ensure proper disclosure per Ind AS 24",
      "Verify contracts and invoices",
      "Check cloud/software subscription renewals"
    ]
  },
  {
    name: "Inter-Company Audit",
    items: [
      "All inter-company revenues eliminated",
      "All inter-company expenses eliminated",
      "All inter-company balances eliminated",
      "Check minority interest calculation",
      "Verify goodwill on consolidation",
      "Review TP documentation for cross-border transactions",
      "Verify arm's length pricing",
      "Check compliance with Indian TP rules",
      "Verify interest rates are at market",
      "Check Ind AS 109 measurement",
      "Verify loan agreements and terms",
      "Verify service agreements exist",
      "Check allocation methodology",
      "Ensure proper invoicing",
      "Verify license agreements",
      "Check rate reasonableness",
      "Verify secondment agreements",
      "Check allocation of shared costs",
      "Confirm withholding tax compliance",
      "Verify booking as investment income",
      "Check forex gain/loss recognition",
      "Verify hedge accounting if applicable"
    ]
  },
  {
    name: "Compliance Checklist",
    items: [
      "Verify advance tax payments",
      "Check tax audit report completion",
      "Verify MAT credit availability",
      "Monthly GST returns filed (GSTR-1, GSTR-3B)",
      "Input tax credit reconciliation",
      "E-way bill compliance for goods",
      "TDS returns filed quarterly (24Q, 26Q)",
      "TDS certificates issued to deductees",
      "Verify TDS rate applied correctly",
      "Board meetings held as per law",
      "AGM held within statutory timeline",
      "Statutory registers maintained",
      "Related party approvals obtained",
      "Quarterly results filed timely",
      "Corporate governance compliance",
      "RPT disclosures made",
      "FEMA compliance for foreign transactions",
      "FC-TRS/FC-GPR returns filed",
      "PF remittances made monthly",
      "ESI payments current",
      "Professional tax paid",
      "Check industry-specific compliance",
      "Ind AS compliance verified",
      "Disclosures as per schedule III"
    ]
  }
];

export function Checklist({ projectId }: { projectId: string }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemCheck, setNewItemCheck] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedItemForFindings, setSelectedItemForFindings] = useState<any | null>(null);
  const [newFindingText, setNewFindingText] = useState("");

  const loadChecklist = useCallback(async () => {
    setLoading(true);
    const { data: cats, error: catErr } = await supabase
      .from("checklist_categories")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
      
    if (catErr) {
      toast.error(catErr.message);
      setLoading(false);
      return;
    }
    
    setCategories(cats || []);
    
    if (cats && cats.length > 0) {
      if (!activeTab || !cats.find(c => c.id === activeTab)) {
        setActiveTab(cats[0].id);
      }
      
      const { data: itms, error: itmErr } = await supabase
        .from("checklist_items")
        .select("*")
        .in("category_id", cats.map(c => c.id))
        .order("sort_order")
        .order("created_at");
        
      if (itmErr) {
        toast.error(itmErr.message);
      } else {
        const grouped: Record<string, any[]> = {};
        cats.forEach(c => grouped[c.id] = []);
        itms?.forEach(item => {
          if (grouped[item.category_id]) {
            grouped[item.category_id].push(item);
          }
        });
        setItems(grouped);
      }
    }
    setLoading(false);
  }, [projectId, activeTab]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const loadDefaultTemplate = async () => {
    setLoading(true);
    for (const tmpl of DEFAULT_TEMPLATES) {
      const { data: cat, error: catErr } = await supabase
        .from("checklist_categories")
        .insert({ project_id: projectId, name: tmpl.name })
        .select()
        .single();
        
      if (catErr) continue;
      
      const itemsToInsert = tmpl.items.map((it, i) => ({
        category_id: cat.id,
        audit_check: it,
        sort_order: i
      }));
      
      await supabase.from("checklist_items").insert(itemsToInsert);
    }
    toast.success("Default templates loaded successfully!");
    await loadChecklist();
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { data, error } = await supabase
      .from("checklist_categories")
      .insert({ project_id: projectId, name: newCategoryName.trim() })
      .select()
      .single();
      
    if (error) {
      toast.error(error.message);
    } else {
      setNewCategoryName("");
      setActiveTab(data.id);
      await loadChecklist();
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this checklist area and all its items?")) return;
    const { error } = await supabase.from("checklist_categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else await loadChecklist();
  };

  const addItem = async (categoryId: string) => {
    if (!newItemCheck.trim()) return;
    setSaving("add");
    const { error } = await supabase
      .from("checklist_items")
      .insert({
        category_id: categoryId,
        audit_check: newItemCheck.trim(),
        sort_order: items[categoryId]?.length || 0
      });
      
    if (error) {
      toast.error(error.message);
    } else {
      setNewItemCheck("");
      await loadChecklist();
    }
    setSaving(null);
  };

  const updateItem = async (id: string, field: string, value: string) => {
    setSaving(id);
    const { error } = await supabase.from("checklist_items").update({ [field]: value }).eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      // Optimistic update locally
      const updatedItems = { ...items };
      for (const catId in updatedItems) {
        const idx = updatedItems[catId].findIndex(i => i.id === id);
        if (idx > -1) {
          updatedItems[catId][idx][field] = value;
          break;
        }
      }
      setItems(updatedItems);
    }
    setSaving(null);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this checklist item?")) return;
    const { error } = await supabase.from("checklist_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else await loadChecklist();
  };

  const getFindingsArray = (findingsStr: string | null) => {
    if (!findingsStr) return [];
    try {
      const parsed = JSON.parse(findingsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // Legacy string finding
      return [{ id: "legacy", text: findingsStr, date: new Date().toISOString() }];
    }
  };

  const addFinding = async () => {
    if (!newFindingText.trim() || !selectedItemForFindings) return;
    setSaving("add-finding");
    
    const existing = getFindingsArray(selectedItemForFindings.findings);
    const updated = [
      ...existing, 
      { id: Date.now().toString(), text: newFindingText.trim(), date: new Date().toISOString() }
    ];
    const newFindingsStr = JSON.stringify(updated);
    
    const { error } = await supabase.from("checklist_items").update({ findings: newFindingsStr }).eq("id", selectedItemForFindings.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      setNewFindingText("");
      // Update local state
      const updatedItems = { ...items };
      for (const catId in updatedItems) {
        const idx = updatedItems[catId].findIndex(i => i.id === selectedItemForFindings.id);
        if (idx > -1) {
          updatedItems[catId][idx].findings = newFindingsStr;
          setSelectedItemForFindings({ ...updatedItems[catId][idx] }); // Refresh sheet data
          break;
        }
      }
      setItems(updatedItems);
    }
    setSaving(null);
  };

  const deleteFinding = async (findingId: string) => {
    if (!selectedItemForFindings) return;
    
    const existing = getFindingsArray(selectedItemForFindings.findings);
    const updated = existing.filter((f: any) => f.id !== findingId);
    const newFindingsStr = JSON.stringify(updated);
    
    const { error } = await supabase.from("checklist_items").update({ findings: newFindingsStr }).eq("id", selectedItemForFindings.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      // Update local state
      const updatedItems = { ...items };
      for (const catId in updatedItems) {
        const idx = updatedItems[catId].findIndex(i => i.id === selectedItemForFindings.id);
        if (idx > -1) {
          updatedItems[catId][idx].findings = newFindingsStr;
          setSelectedItemForFindings({ ...updatedItems[catId][idx] }); // Refresh sheet data
          break;
        }
      }
      setItems(updatedItems);
    }
  };

  if (loading && categories.length === 0) {
    return <div className="p-8 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>;
  }

  if (categories.length === 0) {
    return (
      <Card className="border-dashed shadow-none bg-slate-50/50">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Audit Checklist</h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            A structured internal audit checklist to guide your engagement. You can load our standard DKC templates or create your own custom areas.
          </p>
          <div className="flex gap-3">
            <Button onClick={loadDefaultTemplate} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" /> Load Default Template
            </Button>
            <div className="flex items-center gap-2 border rounded-md px-2 bg-white">
              <Input 
                placeholder="Or create empty area..." 
                className="border-0 h-9 focus-visible:ring-0 w-40 bg-transparent"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCategory()}
              />
              <Button size="sm" variant="ghost" onClick={addCategory}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allItems = Object.values(items).flat();
  const completedItems = allItems.filter(i => i.status === "Completed").length;
  const progress = allItems.length > 0 ? Math.round((completedItems / allItems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 shadow-lg text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">Checklist Progress</h3>
              <p className="text-slate-400 text-sm mb-4">Tracking completion across all audit areas</p>
              <div className="flex items-center gap-4">
                <Progress value={progress} className="h-2 bg-slate-700 flex-1" />
                <span className="text-sm font-bold text-blue-400">{progress}%</span>
              </div>
            </div>
            <div className="flex gap-4 md:border-l border-slate-700 md:pl-6">
              <div>
                <p className="text-3xl font-bold text-white">{completedItems}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">Completed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{allItems.length}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">Total Checks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="bg-slate-100 border border-slate-200 h-auto p-1 shrink-0">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-sm py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
                {cat.name}
                <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5 bg-slate-200 text-slate-600">
                  {items[cat.id]?.filter(i => i.status === "Completed").length || 0}/{items[cat.id]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center ml-2 border rounded-lg bg-white shrink-0">
            <Input 
              placeholder="New Area..." 
              className="border-0 h-9 w-32 focus-visible:ring-0 text-sm bg-transparent"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCategory()}
            />
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-l-none text-slate-400 hover:text-blue-600" onClick={addCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={loadDefaultTemplate} className="ml-2 h-9 shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50">
            <FileText className="w-4 h-4 mr-1.5" /> Load Templates
          </Button>
        </div>

        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4 outline-none">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-900">{cat.name}</CardTitle>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => deleteCategory(cat.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold w-1/3">Audit Check</th>
                      <th className="px-4 py-3 font-semibold w-[140px]">Status</th>
                      <th className="px-4 py-3 font-semibold w-[120px]">Risk</th>
                      <th className="px-4 py-3 font-semibold">Evidence/Findings</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items[cat.id]?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No audit checks added yet.
                        </td>
                      </tr>
                    ) : (
                      items[cat.id]?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                          <td className="px-4 py-3 align-top font-medium text-slate-700">
                            {item.audit_check}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Select value={item.status || "Pending"} onValueChange={(val) => updateItem(item.id, "status", val)}>
                              <SelectTrigger className={`h-8 text-xs border-0 shadow-none font-semibold ${
                                item.status === 'Completed' ? 'bg-green-50 text-green-700' :
                                item.status === 'In Progress' ? 'bg-amber-50 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending"><div className="flex items-center"><Circle className="w-3 h-3 mr-2" /> Pending</div></SelectItem>
                                <SelectItem value="In Progress"><div className="flex items-center"><Clock className="w-3 h-3 mr-2" /> In Progress</div></SelectItem>
                                <SelectItem value="Completed"><div className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-2" /> Completed</div></SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Select value={item.risk_level || "Low"} onValueChange={(val) => updateItem(item.id, "risk_level", val)}>
                              <SelectTrigger className={`h-8 text-xs border-0 shadow-none font-medium ${
                                item.risk_level === 'High' ? 'bg-red-50 text-red-700' :
                                item.risk_level === 'Medium' ? 'bg-orange-50 text-orange-700' :
                                'bg-emerald-50 text-emerald-700'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Low">Low Risk</SelectItem>
                                <SelectItem value="Medium">Medium Risk</SelectItem>
                                <SelectItem value="High">High Risk</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2 align-top space-y-2">
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs flex-1 justify-start font-normal text-slate-600"
                                onClick={() => setSelectedItemForFindings(item)}
                              >
                                <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                                {getFindingsArray(item.findings).length > 0 
                                  ? `${getFindingsArray(item.findings).length} Findings Recorded` 
                                  : "Add Findings..."}
                              </Button>
                            </div>
                            <Input 
                              placeholder="Evidence reference (doc #, link)..." 
                              className="h-7 text-[10px] bg-transparent border-transparent hover:border-slate-200 focus:border-blue-500 shadow-none px-2 text-slate-500"
                              defaultValue={item.evidence_ref}
                              onBlur={(e) => updateItem(item.id, "evidence_ref", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                <Input 
                  placeholder="Add a new custom audit check..." 
                  className="h-9 text-sm border-slate-200 bg-white shadow-sm"
                  value={newItemCheck}
                  onChange={(e) => setNewItemCheck(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem(cat.id)}
                />
                <Button size="sm" onClick={() => addItem(cat.id)} disabled={saving === "add" || !newItemCheck.trim()} className="bg-slate-900 text-white shrink-0">
                  <Plus className="h-4 w-4 mr-1.5" /> Add Check
                </Button>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Findings Sheet */}
      <Sheet open={!!selectedItemForFindings} onOpenChange={(open) => !open && setSelectedItemForFindings(null)}>
        <SheetContent className="sm:max-w-[450px] w-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl">Audit Findings</SheetTitle>
            <SheetDescription className="text-slate-600 mt-2">
              <span className="font-semibold text-slate-900 block mb-1">Check:</span>
              {selectedItemForFindings?.audit_check}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" /> 
                Recorded Findings
              </h4>
              
              {selectedItemForFindings && getFindingsArray(selectedItemForFindings.findings).length === 0 ? (
                <div className="p-4 border border-dashed rounded-lg text-center text-sm text-slate-500">
                  No findings recorded yet. Add your first finding below.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedItemForFindings && getFindingsArray(selectedItemForFindings.findings).map((f: any) => (
                    <div key={f.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg group relative pr-10">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.text}</p>
                      <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                        {new Date(f.date).toLocaleString()}
                      </span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteFinding(f.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Add New Finding</h4>
              <textarea 
                className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                placeholder="Type your observation or finding here..."
                value={newFindingText}
                onChange={(e) => setNewFindingText(e.target.value)}
              />
              <Button 
                onClick={addFinding} 
                disabled={saving === "add-finding" || !newFindingText.trim()} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Save Finding
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
