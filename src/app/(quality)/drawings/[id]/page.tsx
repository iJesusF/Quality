import { notFound } from "next/navigation";
import { DrawingMarkup } from "@/components/drawing-markup";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DrawingViewerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ id }, feedback, { supabase }, { project }] = await Promise.all([params, searchParams, requireUser(), getWorkspaceContext()]);
  const { data: drawing, error } = await supabase.from("drawings").select("id,number,title,drawing_revisions(id,revision,storage_key,is_active)").eq("project_id", project.id).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message); if (!drawing) notFound();
  const revision = drawing.drawing_revisions.find((item) => item.is_active); if (!revision) throw new Error("El plano no tiene una revisión activa.");
  const [{ data: signed }, { data: segments, error: segmentsError }] = await Promise.all([
    supabase.storage.from("quality-private").createSignedUrl(revision.storage_key, 3600),
    supabase.from("segments").select("id,tag,description,drawing_geometry").eq("project_id", project.id).or(`drawing_revision_id.is.null,drawing_revision_id.eq.${revision.id}`).is("archived_at", null).order("tag"),
  ]);
  if (segmentsError) throw new Error(segmentsError.message); if (!signed?.signedUrl) throw new Error("No fue posible abrir el archivo privado.");
  return <div className="module-page drawing-page"><section className="page-heading"><div><div className="eyebrow"><span>{drawing.number} · REV {revision.revision}</span></div><h1>{drawing.title}</h1><p>Selecciona un tramo, activa el marcado y arrastra sobre el PDF para vincularlo.</p></div></section>{feedback.error && <p className="form-error">{feedback.error}</p>}{feedback.success && <p className="form-success">{feedback.success}</p>}<DrawingMarkup drawingId={drawing.id} revisionId={revision.id} url={signed.signedUrl} segments={(segments ?? []).map((segment) => ({ ...segment, drawing_geometry: segment.drawing_geometry as { type: "rectangle"; x: number; y: number; width: number; height: number } | null }))} /></div>;
}
