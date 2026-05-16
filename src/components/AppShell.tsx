import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Shield, FileStack, LogOut, Clock, Bell, User, Settings, HelpCircle, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function AppShell() {
  const { user, loading, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [ticketMsg, setTicketMsg] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    } else if (user) {
      // Update last seen
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id).then();
        
        // Fetch announcements
        const fetchAnn = () => {
          supabase.from("announcements").select("*, projects:target_project_id(name), profiles:author_id(name)").order("created_at", { ascending: false }).limit(5).then(res => {
            if (res.data) setAnnouncements(res.data);
          });
        };
        fetchAnn();

        // Subscribe to realtime broadcasts
        const channel = supabase.channel('appshell-announcements')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
            fetchAnn();
          })
          .subscribe();
          
        return () => { supabase.removeChannel(channel); };
      });
    }
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
            <NavItem to="/timesheet" active={loc.pathname.startsWith("/timesheet")} icon={<Clock className="h-4 w-4" />}>Timesheet</NavItem>
            {(isAdmin || roles.includes("partner")) && <NavItem to="/admin/users" active={loc.pathname.startsWith("/admin/users")} icon={<Shield className="h-4 w-4" />}>{isAdmin ? "God's Eye" : "Command Center"}</NavItem>}
            <NavItem to="/admin/templates" active={loc.pathname.startsWith("/admin/templates")} icon={<FileStack className="h-4 w-4" />}>Templates</NavItem>
          </nav>
          <div className="flex items-center gap-2">
            {/* Notifications area */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground transition-all">
                  <Bell className="h-5 w-5" />
                  {announcements.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-card animate-pulse"></span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Firm Announcements</h3>
                  {announcements.length > 0 && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100">{announcements.length} New</Badge>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {announcements.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-8 w-8 mx-auto text-slate-200 mb-2" />
                      <p className="text-xs text-muted-foreground">No broadcasts yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-slate-100">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1.5 group">
                          <span className={`text-[9px] font-bold uppercase tracking-wider w-fit px-1.5 py-0.5 rounded ${ann.target_project_id ? "bg-blue-50 text-blue-700" : "bg-indigo-50 text-indigo-700"}`}>
                            {ann.target_project_id ? `Project: ${ann.projects?.name || 'Unknown'}` : "Global Broadcast"}
                          </span>
                          <p className="text-sm text-slate-800 font-medium leading-snug group-hover:text-slate-900">{ann.message}</p>
                          <span className="text-[10px] text-slate-400 font-mono mt-1">
                            from {ann.profiles?.name || "Admin"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-accent rounded-full transition-all">
                  <Avatar className="h-7 w-7 border">
                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                      {user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{user.email?.split('@')[0]}</p>
                    <p className="text-[10px] leading-none text-muted-foreground mt-1 truncate">{user.email}</p>
                    <div className="flex gap-1 mt-2">
                      {roles.map(r => (
                        <Badge key={r} variant="outline" className="text-[9px] uppercase tracking-tighter px-1.5 py-0 h-4 bg-muted/50 border-none">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate({ to: "/admin/users" })}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Firm Administration</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer" onClick={() => setIsSupportOpen(true)}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Support & Docs</span>
                </DropdownMenuItem>
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

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/10">
                <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                  {user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user?.email?.split('@')[0]}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex gap-1 mt-1">
                  {roles.map(r => (
                    <Badge key={r} variant="outline" className="text-[10px] uppercase">{r}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Support & Docs Dialog */}
      <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Support & Documentation</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="ticket" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ticket">Raise a Ticket</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ticket" className="space-y-4 pt-4">
              <DialogDescription>
                Got a suggestion, improvement, or issue? Let us know.
              </DialogDescription>
              <Textarea 
                placeholder="Describe your request..." 
                value={ticketMsg}
                onChange={(e) => setTicketMsg(e.target.value)}
                className="min-h-[120px]"
              />
              <Button 
                onClick={() => {
                  if(!ticketMsg.trim()) return;
                  toast.success("Your request has been stamped, triplicated, and filed under 'Urgent'. The Bureau of Portal Affairs is on it! 🗄️ (Sent to vignesh@dkothary.com)");
                  window.open(`mailto:vignesh@dkothary.com?subject=Portal Ticket&body=${encodeURIComponent(ticketMsg)}`);
                  setTicketMsg("");
                  setIsSupportOpen(false);
                }}
                className="w-full"
              >
                Send to Commander Vignesh
              </Button>
            </TabsContent>
            
            <TabsContent value="docs" className="pt-4 space-y-4">
              <DialogDescription>
                Learn how to use the portal features.
              </DialogDescription>
              <div className="aspect-video bg-slate-100 dark:bg-slate-900 rounded-md flex items-center justify-center border border-border overflow-hidden relative group">
                <img 
                  src="/tutorial.gif" 
                  alt="Feature Walkthrough" 
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 flex-col items-center justify-center text-center space-y-3 z-10 p-6 bg-background/95 backdrop-blur-sm">
                  <LayoutDashboard className="h-10 w-10 mx-auto text-primary animate-pulse opacity-50" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Waiting for your GIF...</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Record a walkthrough using ScreenToGif, save it as <strong>tutorial.gif</strong>, and place it in the <strong>public</strong> folder.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
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