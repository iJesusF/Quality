import { createInspectionAction } from "@/app/actions/quality";
import { getWorkspaceContext, requireUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewInspectionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase }, { project }, { error }] = await Promise.all([requireUser(), getWorkspaceContext(), searchParams]);
  const [{ data: segments, error: segmentsError }, { data: templates, error: templatesError }] = await Promise.all([
    supabase.from("segments").select("id,tag,description").eq("project_id", project.id).is("archived_at", null).order("tag"),
    supabase.from("inspection_templates").select("id,code,name,inspection_type,inspection_template_versions(id,status,version)").eq("project_id", project.id).is("archived_at", null).order("name"),
  ]);
  if (segmentsError || templatesError) throw new Error(segmentsError?.message ?? templatesError?.message);
  const activeTemplates = (templates ?? []).filter((template) => template.inspection_template_versions.some((version) => version.status === "ACTIVE"));
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>{project.code}</span></div><h1>Nueva inspección</h1><p>Selecciona uno de los tipos configurados para este proyecto.</p></div></section>{error && <p className="form-error">{error}</p>}<section className="project-detail">{activeTemplates.length ? <form action={createInspectionAction} className="auth-form"><label>Tipo de inspección<select name="templateCode" required defaultValue=""><option value="" disabled>Selecciona un tipo</option>{activeTemplates.map((template) => <option value={template.code} key={template.id}>{template.name} · {template.inspection_type}</option>)}</select></label><label>Tramo<select name="segmentId" defaultValue=""><option value="">Sin tramo por ahora</option>{segments?.map((segment) => <option value={segment.id} key={segment.id}>{segment.tag} {segment.description ? `— ${segment.description}` : ""}</option>)}</select></label><button className="primary-button" type="submit">Crear borrador</button></form> : <div className="empty-state"><h2>No hay tipos de inspección activos</h2><p>Configura las revisiones y pruebas aplicables a este proyecto.</p><Link className="primary-button" href="/settings/inspection-templates">Configurar tipos</Link></div>}</section></div>;
}
