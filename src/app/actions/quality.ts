"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

const inspectionSchema = z.object({ templateCode: z.string().trim().min(1).max(80), segmentId: z.union([z.uuid(), z.literal("")]) });

export async function createInspectionAction(formData: FormData) {
  const input = inspectionSchema.safeParse({ templateCode: formData.get("templateCode"), segmentId: formData.get("segmentId") || "" });
  if (!input.success) redirect("/inspections/new?error=Selecciona+datos+válidos");
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { data, error } = await supabase.rpc("create_quality_inspection", { pid: project.id, inspection_kind: input.data.templateCode, segment_ref: input.data.segmentId || null });
  if (error) {
    const message = error.message.includes("schema cache") || error.message.includes("Could not find the function")
      ? "El backend de inspecciones no está instalado. Ejecuta la migración 005 en Supabase."
      : error.message;
    redirect(`/inspections/new?error=${encodeURIComponent(message)}`);
  }
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
  if (uploadError) {
    const message = uploadError.message.toLowerCase().includes("bucket")
      ? "El almacenamiento privado no está instalado. Ejecuta la migración 005 en Supabase."
      : uploadError.message;
    redirect(`/drawings?error=${encodeURIComponent(message)}`);
  }
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

const segmentSchema = z.object({ tag: z.string().trim().min(2).max(80), description: z.string().trim().max(500), material: z.string().trim().max(80) });
export async function createSegmentAction(formData: FormData) {
  const input = segmentSchema.safeParse({ tag: formData.get("tag"), description: formData.get("description"), material: formData.get("material") });
  if (!input.success) redirect("/segments?error=Revisa+los+datos+del+tramo");
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { error } = await supabase.from("segments").insert({ project_id: project.id, tag: input.data.tag.toUpperCase(), description: input.data.description || null, material: input.data.material || null });
  if (error) redirect(`/segments?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/segments"); redirect("/segments?success=Tramo+creado");
}

const receiptSchema = z.object({ supplier: z.string().trim().min(2).max(160), purchaseOrder: z.string().trim().max(80), receivedAt: z.string() });
export async function createMaterialReceiptAction(formData: FormData) {
  const input = receiptSchema.safeParse({ supplier: formData.get("supplier"), purchaseOrder: formData.get("purchaseOrder"), receivedAt: formData.get("receivedAt") });
  if (!input.success) redirect("/materials?error=Revisa+los+datos+de+recepción");
  const [{ supabase, user }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { data: folio, error: folioError } = await supabase.rpc("next_project_folio", { pid: project.id, folio_prefix: "MR" });
  if (folioError) redirect(`/materials?error=${encodeURIComponent(folioError.message)}`);
  const { error } = await supabase.from("material_receipts").insert({ project_id: project.id, folio, supplier: input.data.supplier, purchase_order: input.data.purchaseOrder || null, received_at: input.data.receivedAt || null, inspector_id: user.id });
  if (error) redirect(`/materials?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/materials"); redirect("/materials?success=Recepción+creada");
}

const issueSchema = z.object({ kind: z.enum(["NCR", "PUNCH"]), title: z.string().trim().min(2).max(160), description: z.string().trim().min(2).max(2000), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) });
export async function createIssueAction(formData: FormData) {
  const input = issueSchema.safeParse({ kind: formData.get("kind"), title: formData.get("title"), description: formData.get("description"), priority: formData.get("priority") });
  if (!input.success) redirect("/issues?error=Revisa+los+datos+del+hallazgo");
  const [{ supabase, user }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const prefix = input.data.kind === "NCR" ? "NCR" : "PUNCH";
  const { data: folio, error: folioError } = await supabase.rpc("next_project_folio", { pid: project.id, folio_prefix: prefix });
  if (folioError) redirect(`/issues?error=${encodeURIComponent(folioError.message)}`);
  const operation = input.data.kind === "NCR"
    ? supabase.from("ncrs").insert({ project_id: project.id, folio, title: input.data.title, description: input.data.description, priority: input.data.priority, created_by: user.id })
    : supabase.from("punch_items").insert({ project_id: project.id, folio, description: `${input.data.title}: ${input.data.description}`, priority: input.data.priority, created_by: user.id });
  const { error } = await operation;
  if (error) redirect(`/issues?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/issues"); redirect("/issues?success=Hallazgo+creado");
}

const turnoverSchema = z.object({ name: z.string().trim().min(2).max(160) });
export async function createTurnoverAction(formData: FormData) {
  const input = turnoverSchema.safeParse({ name: formData.get("name") });
  if (!input.success) redirect("/turnover?error=Indica+el+nombre+del+paquete");
  const [{ supabase, user }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { error } = await supabase.from("turnover_packages").insert({ project_id: project.id, name: input.data.name, created_by: user.id });
  if (error) redirect(`/turnover?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/turnover"); redirect("/turnover?success=Paquete+creado");
}

const templateSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]+$/).max(40), name: z.string().trim().min(2).max(120), discipline: z.enum(["MECHANICAL", "CIVIL", "ELECTRICAL", "PLC", "INSTRUMENTATION", "GENERAL"]) });
export async function createInspectionTemplateAction(formData: FormData) {
  const input = templateSchema.safeParse({ code: formData.get("code"), name: formData.get("name"), discipline: formData.get("discipline") });
  if (!input.success) redirect("/settings/inspection-templates?error=Revisa+los+datos+del+tipo+de+inspección");
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { error } = await supabase.rpc("create_project_inspection_template", { pid: project.id, template_code: input.data.code, template_name: input.data.name, discipline: input.data.discipline });
  if (error) {
    const message = error.message.includes("schema cache") || error.message.includes("Could not find the function") ? "Ejecuta la migración 005 en Supabase antes de crear tipos personalizados." : error.message;
    redirect(`/settings/inspection-templates?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/settings/inspection-templates");
  redirect("/settings/inspection-templates?success=Tipo+de+inspección+creado");
}

const drawingMarkupSchema = z.object({
  segmentId: z.uuid(), drawingRevisionId: z.uuid(),
  geometry: z.object({
    type: z.literal("polyline"),
    points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).min(2).max(2500),
  }),
});
export async function saveSegmentDrawingMarkupAction(formData: FormData) {
  let geometry: unknown;
  try { geometry = JSON.parse(String(formData.get("geometry"))); } catch { redirect(`/drawings/${formData.get("drawingId")}?error=Marcado+no+válido`); }
  const input = drawingMarkupSchema.safeParse({ segmentId: formData.get("segmentId"), drawingRevisionId: formData.get("drawingRevisionId"), geometry });
  const drawingId = String(formData.get("drawingId"));
  if (!input.success || !z.uuid().safeParse(drawingId).success) redirect(`/drawings/${drawingId}?error=Selecciona+un+tramo+y+marca+un+área`);
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { data, error } = await supabase.rpc("save_segment_drawing_trace", {
    pid: project.id,
    drawing_ref: drawingId,
    revision_ref: input.data.drawingRevisionId,
    segment_ref: input.data.segmentId,
    trace_geometry: input.data.geometry,
  });
  if (error) redirect(`/drawings/${drawingId}?error=${encodeURIComponent(error.message)}`);
  if (!data) redirect(`/drawings/${drawingId}?error=El+trazo+no+se+guardó.+Verifica+tus+permisos+y+la+migración+007`);
  revalidatePath(`/drawings/${drawingId}`); revalidatePath(`/segments/${input.data.segmentId}`);
  redirect(`/drawings/${drawingId}?success=Tramo+marcado+en+el+plano`);
}

const renameTemplateSchema = z.object({ templateId: z.uuid(), name: z.string().trim().min(2).max(120), discipline: z.enum(["MECHANICAL", "ELECTRICAL", "CIVIL", "PLC", "INSTRUMENTATION", "GENERAL"]) });
export async function updateInspectionTemplateAction(formData: FormData) {
  const input = renameTemplateSchema.safeParse({ templateId: formData.get("templateId"), name: formData.get("name"), discipline: formData.get("discipline") });
  if (!input.success) redirect("/settings/inspection-templates?error=Revisa+el+nombre+y+la+categoría");
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { error } = await supabase.rpc("update_project_inspection_template", { pid: project.id, template_ref: input.data.templateId, template_name: input.data.name, discipline: input.data.discipline });
  if (error) redirect(`/settings/inspection-templates?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/settings/inspection-templates"); redirect("/settings/inspection-templates?success=Tipo+actualizado");
}
