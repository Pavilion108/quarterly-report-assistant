import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { FileText, Users, Sparkles, Presentation } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary text-primary-foreground grid place-items-center font-bold">D</div>
            <span className="font-semibold tracking-tight">DKC Tracker</span>
          </div>
          <Link to="/auth"><Button>Sign in</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl">
          Quarterly audit reports, drafted as you work.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          DKC's tracker turns daily fieldwork into a polished PowerPoint. Log progress,
          add observations, refine them with an AI auditor's voice, and download the
          deck any time.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/auth"><Button size="lg">Get started</Button></Link>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: Users, t: "Team workspaces", d: "Managers create projects, add auditor members, set focus areas." },
            { i: FileText, t: "Daily tracker", d: "Members log tasks and progress every day, scoped to the project." },
            { i: Sparkles, t: "AI rewrite", d: "One click to rewrite observations in a soft auditor tone — original kept." },
            { i: Presentation, t: "Live PPT draft", d: "Per-project template auto-drafts. Download draft any time, finalize on schedule." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-lg border bg-card p-6">
              <Icon className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
