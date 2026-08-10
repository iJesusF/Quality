"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

const inspectionSchema = z.object({ type: z.enum(["HYDROTEST"]), segmentId: z.union([z.uuid(), z.literal("")]) });

export async function createInspectionAction(formData: FormData) {
  const input = inspectionSchema.safeParse({ type: formData.get("type"), segmentId: formData.get("segmentId") || "" });
  if (!input.success) redirect("/inspections/new?error=Selecciona+datos+válidos");
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { data, error } = await supabase.rpc("create_quality_inspection", { pid: project.id, inspection_kind: input.data.type, segment_ref: input.data.segmentId || null });
  if (error) redirect(`/inspections/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/inspections");
  redirect(`/inspections/${data}`);
}

const drawingSchema = z.object({ number: z.string().trim().min(2).max(80), title: z.string().trim().min(2).max(160), revision: z.string().trim().min(1).max(20) });

export async function uploadDrawingAction(formData: FormData) {
  const input = drawingSchema.safeParse({ number: formData.get("number"), title: formData.get("title"), revision: formData.get("revision") });
  const file = formData.get("file");
  if (!input.success || !(file instanceof File) || file.size === 0) redirect("/drawings?error=Completa+los+datos+y+selecciona+un+PDF");
  if (file.type !== "application/pdf" || file.size > 50 * 1024 * 1024) redirect("/drawings?error=El+archivo+debe+ser+PDF+y+no+superar+50+MB");
  const [{ supabase, user }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const storageKey = `${project.id}/drawings/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from("quality-private").upload(storageKey, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) redirect(`/drawings?error=${encodeURIComponent(uploadError.message)}`);
  const { data: drawing, error: drawingError } = await supabase.from("drawings").insert({ project_id: project.id, number: input.data.number.toUpperCase(), title: input.data.title, type: "PDF" }).select("id").single();
  if (drawingError) {
    await supabase.storage.from("quality-private").remove([storageKey]);
    redirect(`/drawings?error=${encodeURIComponent(drawingError.message)}`);
  }
  const { error: revisionError } = await supabase.from("drawing_revisions").insert({ project_id: project.id, drawing_id: drawing.id, revision: input.data.revision.toUpperCase(), storage_key: storageKey, is_active: true, created_by: user.id });
  if (revisionError) redirect(`/drawings?error=${encodeURIComponent(revisionError.message)}`);
  revalidatePath("/drawings");
  redirect("/drawings?success=Plano+cargado+correctamente");
}
