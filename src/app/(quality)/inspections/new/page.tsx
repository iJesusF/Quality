import { createInspectionAction } from "@/app/actions/quality";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewInspectionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase }, { project }, { error }] = await Promise.all([requireUser(), getWorkspaceContext(), searchParams]);
  const { data: segments, error: segmentsError } = await supabase.from("segments").select("id,tag,description").eq("project_id", project.id).is("archived_at", null).order("tag");
  if (segmentsError) throw new Error(segmentsError.message);
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>{project.code}</span></div><h1>Nueva inspección</h1><p>El folio se asigna de forma atómica y la operación queda en auditoría.</p></div></section>{error && <p className="form-error">{error}</p>}<section className="project-detail"><form action={createInspectionAction} className="auth-form"><label>Tipo<select name="type" defaultValue="HYDROTEST"><option value="HYDROTEST">Hydrotest</option></select></label><label>Tramo<select name="segmentId" defaultValue=""><option value="">Sin tramo por ahora</option>{segments?.map((segment) => <option value={segment.id} key={segment.id}>{segment.tag} {segment.description ? `— ${segment.description}` : ""}</option>)}</select></label><button className="primary-button" type="submit">Crear borrador</button></form></section></div>;
}
