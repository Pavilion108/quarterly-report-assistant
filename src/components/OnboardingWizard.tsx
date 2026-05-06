import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Activity, Target } from "lucide-react";

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [quarter, setQuarter] = useState("Q3 2024");
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");

  const handleNext = () => setStep((s) => s + 1);

  const handleComplete = async () => {
    if (!name || !quarter) return toast.error("Project name and quarter required");
    
    // Create project
    const { data: proj, error: pErr } = await supabase.from("projects").insert({
      name, quarter, manager_id: user!.id, client: "Internal"
    }).select().single();
    if (pErr) return toast.error(pErr.message);

    // Create metrics
    const { error: mErr } = await supabase.from("project_metrics").insert({
      project_id: proj.id,
      revenue: Number(revenue) || 0,
      expenses: Number(expenses) || 0,
      goals: [{ title: "Launch V2", achieved: true }],
      kpi_scorecard: [{ name: "New users", value: 100, target: 120, status: "Behind" }]
    });
    if (mErr) return toast.error(mErr.message);

    toast.success("Project created! Welcome.");
    navigate({ to: "/projects/$id", params: { id: proj.id } });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-accent/20 border-2">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full grid place-items-center mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to DKC Tracker</CardTitle>
          <CardDescription>Let's set up your first quarterly report project.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input placeholder="e.g. Q3 Digital Transformation" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Quarter</Label>
                <Input placeholder="e.g. Q3 2024" value={quarter} onChange={(e) => setQuarter(e.target.value)} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Activity className="h-4 w-4 text-green-600"/> Revenue (YTD)</Label>
                <Input type="number" placeholder="50000" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Target className="h-4 w-4 text-red-600"/> Expenses (YTD)</Label>
                <Input type="number" placeholder="35000" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground pt-2">You can add more detailed KPIs and goals later.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onComplete()}>
            {step === 1 ? "Skip" : "Back"}
          </Button>
          <Button onClick={step === 1 ? handleNext : handleComplete}>
            {step === 1 ? "Next step" : "Create Project"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
