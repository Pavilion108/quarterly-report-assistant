import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Shield, FileStack, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
            {isAdmin && <NavItem to="/admin/users" active={loc.pathname.startsWith("/admin/users")} icon={<Shield className="h-4 w-4" />}>God's Eye</NavItem>}
            {isAdmin && <NavItem to="/admin/templates" active={loc.pathname.startsWith("/admin/templates")} icon={<FileStack className="h-4 w-4" />}>Templates</NavItem>}
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {roles.join(", ") || "no role"}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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