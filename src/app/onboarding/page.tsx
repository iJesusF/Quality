import { createWorkspaceAction } from "@/app/actions/workspace";
import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireUser(); const { error } = await searchParams;
  return <main className="auth-page"><section className="auth-card wide"><div className="auth-brand"><span>V</span><div><strong>VORTECH</strong><small>QUALITY</small></div></div><div className="auth-heading"><span>CONFIGURACIÓN INICIAL</span><h1>Crea tu espacio de calidad</h1><p>Este paso registra la organización y el primer proyecto para {user.email}.</p></div><form action={createWorkspaceAction} className="auth-form two-columns"><label>Organización<input name="organization" required placeholder="VORTECH" /></label><label>Identificador<input name="slug" required pattern="[a-z0-9-]+" placeholder="vortech" /></label><label>Primer proyecto<input name="project" required placeholder="Nombre del proyecto" /></label><label>Código<input name="code" required placeholder="PROJ-001" /></label>{error && <p className="form-error full" role="alert">{error}</p>}<button className="primary-button full" type="submit">Crear organización y proyecto</button></form></section></main>;
}
