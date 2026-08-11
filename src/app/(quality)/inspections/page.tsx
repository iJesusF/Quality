import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InspectionsPage() {
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const { data, error } = await supabase.from("inspections").select("id,folio,status,result,created_at,segments(tag),inspection_template_versions(inspection_templates(name))").eq("project_id", project.id).is("archived_at", null).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>{project.code}</span></div><h1>Inspecciones</h1><p>{data?.length ?? 0} inspecciones registradas en el proyecto activo.</p></div><Link className="primary-button" href="/inspections/new"><Plus /> Nueva inspección</Link></section><section className="project-list">{data?.map((inspection) => <Link className="project-row" href={`/inspections/${inspection.id}`} key={inspection.id}><span className="project-code"><ClipboardCheck /></span><div><strong>{inspection.folio} · {inspection.inspection_template_versions[0]?.inspection_templates[0]?.name ?? "Inspección"}</strong><small>{inspection.segments[0]?.tag ?? "Sin tramo"} · {new Date(inspection.created_at).toLocaleDateString("es-MX")}</small></div><span className="status-pill active">{inspection.status}</span></Link>)}{!data?.length && <div className="empty-state"><ClipboardCheck /><h2>No hay inspecciones todavía</h2><p>Crea el primer Hydrotest y asígnalo a un tramo cuando corresponda.</p><Link className="primary-button" href="/inspections/new">Nueva inspección</Link></div>}</section></div>;
}
