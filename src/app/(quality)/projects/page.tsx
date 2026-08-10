import Link from "next/link";
import { createProjectAction, selectProjectAction } from "@/app/actions/workspace";
import { getWorkspaceContext, requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase, user }, context, params] = await Promise.all([requireUser(), getWorkspaceContext(), searchParams]);
  const { data, error } = await supabase.from("project_members").select("role,projects(id,name,code,client,status,location)").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const projects = (data ?? []).flatMap((row) => row.projects ?? []).map((project) => ({
    id: String(project.id), name: String(project.name), code: String(project.code),
    client: project.client ? String(project.client) : null, status: String(project.status),
    location: project.location ? String(project.location) : null,
  }));
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>PORTAFOLIO</span></div><h1>Proyectos</h1><p>Selecciona el proyecto que quieres usar o abre su configuración.</p></div></section>{params.error && <p className="form-error">{params.error}</p>}<div className="projects-layout"><section className="project-list">{projects.map((p) => <article className="project-row" key={p.id}><span className="project-code">{p.code.slice(0,2)}</span><div><strong>{p.name}</strong><small>{p.code} · {p.client || "Sin cliente"}</small></div><span className="status-pill active">{p.status}</span><form action={selectProjectAction}><input type="hidden" name="projectId" value={p.id} /><button className="primary-button" type="submit">Usar proyecto</button></form><Link className="secondary-button" href={`/projects/${p.id}`}>Editar</Link></article>)}</section><aside className="create-panel"><h2>Nuevo proyecto</h2><p>Se creará dentro de tu organización actual.</p><form action={createProjectAction} className="auth-form"><input type="hidden" name="organizationId" value={context.project.organization_id} /><label>Nombre<input name="name" required /></label><label>Código<input name="code" required /></label><label>Cliente<input name="client" /></label><button className="primary-button" type="submit">Crear proyecto</button></form></aside></div></div>;
}
