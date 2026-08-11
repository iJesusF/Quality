"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { workspaceSchema, workspaceValidationMessage } from "@/lib/workspace-validation";

export async function createWorkspaceAction(formData: FormData) {
  const input = workspaceSchema.safeParse({ organization: formData.get("organization"), slug: formData.get("slug"), project: formData.get("project"), code: formData.get("code") });
  if (!input.success) redirect(`/onboarding?error=${encodeURIComponent(workspaceValidationMessage(input.error))}`);
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

const editableProjectSchema = z.object({
  projectId: z.uuid(), name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(20),
  client: z.string().trim().max(120), endClient: z.string().trim().max(120), location: z.string().trim().max(160),
  description: z.string().trim().max(2000), status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"]),
  startDate: z.string(), endDate: z.string(),
});

export async function updateProjectAction(formData: FormData) {
  const input = editableProjectSchema.safeParse({
    projectId: formData.get("projectId"), name: formData.get("name"), code: formData.get("code"), client: formData.get("client"),
    endClient: formData.get("endClient"), location: formData.get("location"), description: formData.get("description"),
    status: formData.get("status"), startDate: formData.get("startDate"), endDate: formData.get("endDate"),
  });
  if (!input.success) redirect(`/projects/${formData.get("projectId")}?error=${encodeURIComponent("Revisa los datos del proyecto.")}`);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").update({
    name: input.data.name, code: input.data.code.toUpperCase(), client: input.data.client || null, end_client: input.data.endClient || null,
    location: input.data.location || null, description: input.data.description || null, status: input.data.status,
    start_date: input.data.startDate || null, end_date: input.data.endDate || null,
  }).eq("id", input.data.projectId);
  if (error) redirect(`/projects/${input.data.projectId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect(`/projects/${input.data.projectId}?success=${encodeURIComponent("Proyecto actualizado.")}`);
}

export async function selectProjectAction(formData: FormData) {
  const projectId = z.uuid().safeParse(formData.get("projectId"));
  if (!projectId.success) redirect("/projects?error=Proyecto+no+válido");
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("project_members").select("project_id").eq("project_id", projectId.data).eq("user_id", user.id).maybeSingle();
  if (error || !data) redirect("/projects?error=No+tienes+acceso+a+ese+proyecto");
  (await cookies()).set("quality_active_project", projectId.data, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}
