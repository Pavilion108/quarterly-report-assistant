import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const { roles } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase.from("user_roles").select("*"),
    ]);
    setProfiles(p.data ?? []); setAllRoles(r.data ?? []);
  };
  useEffect(() => { load(); }, []);

  if (!roles.includes("admin")) return <p className="text-muted-foreground">Admin only.</p>;

  const setRole = async (userId: string, role: "admin" | "manager" | "member") => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Role updated"); load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Users</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {profiles.map((p) => {
          const current = allRoles.find((r) => r.user_id === p.id)?.role ?? "member";
          return (
            <div key={p.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <div className="text-sm font-medium">{p.name || "—"}</div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </div>
              <Select value={current} onValueChange={(v: any) => setRole(p.id, v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}