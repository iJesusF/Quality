import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Geometry = { x: number; y: number; width: number; height: number };

export default async function SegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase }, { project }] = await Promise.all([params, requireUser(), getWorkspaceContext()]);
  const { data: segment, error } = await supabase.from("segments").select("*,drawing_revisions(id,revision,storage_key,drawings(id,number,title))").eq("project_id", project.id).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message); if (!segment) notFound();
  const revision = segment.drawing_revisions?.[0]; const drawing = revision?.drawings?.[0];
  const { data: signed } = revision ? await supabase.storage.from("quality-private").createSignedUrl(revision.storage_key, 1800) : { data: null };
  const geometry = segment.drawing_geometry as Geometry | null;
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>FICHA DE TRAMO</span></div><h1>{segment.tag}</h1><p>{segment.description || "Sin descripción"}</p></div>{drawing && <Link className="primary-button" href={`/drawings/${drawing.id}`}>Abrir y remarcar plano</Link>}</section><section className="segment-sheet"><div className="project-detail"><dl><div><dt>Estado</dt><dd>{segment.status}</dd></div><div><dt>Material</dt><dd>{segment.material || "Pendiente"}</dd></div><div><dt>Schedule</dt><dd>{segment.schedule || "Pendiente"}</dd></div><div><dt>Avance</dt><dd>{segment.progress_percentage}%</dd></div></dl></div><aside className="segment-drawing-card"><h2>Referencia en plano</h2>{signed?.signedUrl && geometry ? <><div className="drawing-thumbnail"><iframe src={signed.signedUrl} title={`Plano ${drawing?.number}`} /><span style={{ left: `${geometry.x * 100}%`, top: `${geometry.y * 100}%`, width: `${geometry.width * 100}%`, height: `${geometry.height * 100}%` }} /></div><strong>{drawing?.number}</strong><small>{drawing?.title} · Rev {revision?.revision}</small></> : <><p>Este tramo todavía no está marcado en un plano.</p><Link className="secondary-button" href="/drawings">Seleccionar plano</Link></>}</aside></section></div>;
}
