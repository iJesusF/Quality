import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { uploadDrawingAction } from "@/app/actions/quality";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DrawingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ supabase }, { project }, feedback] = await Promise.all([requireUser(), getWorkspaceContext(), searchParams]);
  const { data, error } = await supabase.from("drawings").select("id,number,title,status,drawing_revisions(revision,is_active)").eq("project_id", project.id).is("archived_at", null).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>{project.code}</span></div><h1>Planos</h1><p>PDF y revisiones protegidos en Supabase Storage.</p></div></section>{feedback.error && <p className="form-error">{feedback.error}</p>}{feedback.success && <p className="form-success">{feedback.success}</p>}<div className="projects-layout"><section className="project-list">{data?.map((drawing) => <Link href={`/drawings/${drawing.id}`} className="project-row" key={drawing.id}><span className="project-code"><FileText /></span><div><strong>{drawing.number} — {drawing.title}</strong><small>Revisión {drawing.drawing_revisions.find((revision) => revision.is_active)?.revision ?? "sin revisión"}</small></div><span className="status-pill active">{drawing.status}</span></Link>)}{!data?.length && <div className="inline-empty"><FileText /><div><strong>No hay planos cargados</strong><span>Usa el formulario para cargar el primer PDF.</span></div></div>}</section><aside className="create-panel"><h2>Cargar plano</h2><p>Máximo 50 MB. El original se conserva como revisión inmutable.</p><form action={uploadDrawingAction} className="auth-form"><label>Número<input name="number" required placeholder="ISO-PW-014" /></label><label>Título<input name="title" required placeholder="Process Water" /></label><label>Revisión<input name="revision" required placeholder="A" /></label><label>Archivo PDF<input name="file" type="file" accept="application/pdf,.pdf" required /></label><button className="primary-button" type="submit"><Upload /> Cargar PDF</button></form></aside></div></div>;
}
