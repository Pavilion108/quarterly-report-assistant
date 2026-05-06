import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users2, FileStack, LogOut } from "lucide-react";

export function AppShell() {
  const { user, loading, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  const isAdmin = roles.includes("admin");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary text-primary-foreground grid place-items-center font-bold text-sm">D</div>
            <span className="font-semibold tracking-tight">DKC Tracker</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/dashboard" active={loc.pathname.startsWith("/dashboard") || loc.pathname.startsWith("/projects")} icon={<LayoutDashboard className="h-4 w-4" />}>Projects</NavItem>
            {isAdmin && <NavItem to="/admin/users" active={loc.pathname.startsWith("/admin/users")} icon={<Users2 className="h-4 w-4" />}>Users</NavItem>}
            {isAdmin && <NavItem to="/admin/templates" active={loc.pathname.startsWith("/admin/templates")} icon={<FileStack className="h-4 w-4" />}>Templates</NavItem>}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user.email} · {roles.join(", ") || "no role"}
            </span>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, children, icon, active }: { to: string; children: React.ReactNode; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
      }`}
    >
      {icon}{children}
    </Link>
  );
}