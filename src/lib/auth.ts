import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const requireUser = cache(async () => {
  if (!getSupabaseConfig()) redirect("/setup");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
});

type ProjectRow = { role: string; projects: { id: string; name: string; code: string; organization_id: string } | null };

export const getWorkspaceContext = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("project_members").select("role, projects(id,name,code,organization_id)").eq("user_id", user.id).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as ProjectRow | null;
  if (!row?.projects) redirect("/onboarding");
  return { user, role: row.role, project: row.projects };
});
