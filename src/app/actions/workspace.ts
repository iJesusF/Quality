"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const workspaceSchema = z.object({ organization: z.string().min(2).max(100), slug: z.string().regex(/^[a-z0-9-]+$/), project: z.string().min(2).max(120), code: z.string().min(2).max(20) });
export async function createWorkspaceAction(formData: FormData) {
  const input = workspaceSchema.safeParse({ organization: formData.get("organization"), slug: formData.get("slug"), project: formData.get("project"), code: formData.get("code") });
  if (!input.success) redirect("/onboarding?error=Revisa+los+campos+requeridos");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("bootstrap_quality_workspace", { org_name: input.data.organization, org_slug: input.data.slug, project_name: input.data.project, project_code: input.data.code });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect(`/projects/${data}`);
}

const projectSchema = z.object({ organizationId: z.uuid(), name: z.string().min(2).max(120), code: z.string().min(2).max(20), client: z.string().max(120).optional() });
export async function createProjectAction(formData: FormData) {
  const input = projectSchema.safeParse({ organizationId: formData.get("organizationId"), name: formData.get("name"), code: formData.get("code"), client: formData.get("client") || undefined });
  if (!input.success) redirect("/projects?error=Revisa+los+datos+del+proyecto");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_quality_project", { org_id: input.data.organizationId, project_name: input.data.name, project_code: input.data.code, client_name: input.data.client ?? null });
  if (error) redirect(`/projects?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/projects");
  redirect(`/projects/${data}`);
}
