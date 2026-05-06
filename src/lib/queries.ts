import { supabase } from "@/integrations/supabase/client";

export async function fetchMyProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProject(id: string) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function fetchProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function fetchAllRoles() {
  const { data, error } = await supabase.from("user_roles").select("*");
  if (error) throw error;
  return data;
}
