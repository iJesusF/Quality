import type { ReactNode } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";
import { createIssueAction, createMaterialReceiptAction, createSegmentAction, createTurnoverAction } from "@/app/actions/quality";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

const modules = {
  segments: { label: "Tramos", table: "segments", title: "tag", subtitle: "description" },
  materials: { label: "Materiales", table: "material_receipts", title: "folio", subtitle: "supplier" },
  reports: { label: "Reportes", table: "generated_documents", title: "folio", subtitle: "status" },
  documents: { label: "Documentos", table: "generated_documents", title: "folio", subtitle: "status" },
  turnover: { label: "Turnover", table: "turnover_packages", title: "name", subtitle: "status" },
  notifications: { label: "Notificaciones", table: "notifications", title: "title", subtitle: "body" },
} as const;

type ModuleKey = keyof typeof modules | "issues";
export const dynamic = "force-dynamic";

function Feedback({ error, success }: { error?: string; success?: string }) {
  return <>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}</>;
}

function CreatePanel({ module }: { module: ModuleKey }) {
  if (module === "segments") return <aside className="create-panel"><h2>Nuevo tramo</h2><p>Crea la identidad trazable antes de asignar planos e inspecciones.</p><form action={createSegmentAction} className="auth-form"><label>Tag<input name="tag" required placeholder="TR-0450" /></label><label>Descripción<input name="description" placeholder="Spool de Process Water" /></label><label>Material<input name="material" placeholder="SS316L" /></label><button className="primary-button"><Plus /> Crear tramo</button></form></aside>;
  if (module === "materials") return <aside className="create-panel"><h2>Nueva recepción</h2><p>El folio MR se genera automáticamente.</p><form action={createMaterialReceiptAction} className="auth-form"><label>Proveedor<input name="supplier" required /></label><label>Orden de compra<input name="purchaseOrder" /></label><label>Fecha de recepción<input name="receivedAt" type="date" /></label><button className="primary-button"><Plus /> Crear recepción</button></form></aside>;
  if (module === "issues") return <aside className="create-panel"><h2>Nuevo hallazgo</h2><p>Registra una NCR o un elemento Punch con folio automático.</p><form action={createIssueAction} className="auth-form"><label>Tipo<select name="kind"><option value="NCR">NCR</option><option value="PUNCH">Punch</option></select></label><label>Título<input name="title" required /></label><label>Descripción<textarea name="description" required rows={4} /></label><label>Prioridad<select name="priority" defaultValue="MEDIUM"><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label><button className="primary-button"><Plus /> Crear hallazgo</button></form></aside>;
  if (module === "turnover") return <aside className="create-panel"><h2>Nuevo paquete</h2><p>Después podrás agregar sus documentos y requisitos.</p><form action={createTurnoverAction} className="auth-form"><label>Nombre<input name="name" required placeholder="Sistema PW" /></label><button className="primary-button"><Plus /> Crear paquete</button></form></aside>;
  return null;
}

function Records({ rows, module, titleKey, subtitleKey }: { rows: Record<string, unknown>[]; module: ModuleKey; titleKey: string; subtitleKey: string }) {
  if (!rows.length) return <section className="empty-state"><FolderOpen /><h2>No hay registros todavía</h2><p>{module === "reports" || module === "documents" ? "Los documentos aparecerán cuando una inspección genere su primera revisión." : module === "notifications" ? "Aquí aparecerán asignaciones, revisiones y vencimientos." : "Usa el formulario para crear el primer registro real."}</p></section>;
  return <section className="project-list">{rows.map((row) => {
    const href = module === "notifications" ? undefined : `/${module}/${row.id}`;
    const content = <><span className="project-code">{String(row[titleKey] ?? "--").slice(0, 2)}</span><div><strong>{String(row[titleKey] ?? "Registro")}</strong><small>{String(row[subtitleKey] ?? "Sin detalles")}</small></div>{row.status && <span className="status-pill active">{String(row.status)}</span>}</>;
    return href ? <Link href={href} className="project-row" key={String(row.id)}>{content}</Link> : <article className="project-row" key={String(row.id)}>{content}</article>;
  })}</section>;
}

export default async function ModulePage({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ module }, feedback] = await Promise.all([params, searchParams]);
  if (module === "settings") {
    const { project } = await getWorkspaceContext();
    redirect(`/projects/${project.id}`);
  }
  if (!(module in modules) && module !== "issues") notFound();
  const key = module as ModuleKey;
  const [{ supabase, user }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  let rows: Record<string, unknown>[] = [];
  let titleKey = "folio"; let subtitleKey = "description"; let label = "NCR / Punch";
  if (key === "issues") {
    const [ncrs, punch] = await Promise.all([
      supabase.from("ncrs").select("id,folio,title,description,priority,status,created_at").eq("project_id", project.id).is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("punch_items").select("id,folio,description,priority,status,created_at").eq("project_id", project.id).order("created_at", { ascending: false }),
    ]);
    if (ncrs.error || punch.error) throw new Error(ncrs.error?.message ?? punch.error?.message);
    rows = [...(ncrs.data ?? []), ...(punch.data ?? [])];
  } else {
    const config = modules[key]; label = config.label; titleKey = config.title; subtitleKey = config.subtitle;
    let query = supabase.from(config.table).select("*");
    query = key === "notifications" ? query.eq("recipient_user_id", user.id) : query.eq("project_id", project.id);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message); rows = (data ?? []) as Record<string, unknown>[];
  }
  const panel = <CreatePanel module={key} /> as ReactNode;
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>{project.code}</span></div><h1>{label}</h1><p>{rows.length} registros del proyecto activo.</p></div></section><Feedback {...feedback} /><div className={panel ? "projects-layout" : undefined}><Records rows={rows} module={key} titleKey={titleKey} subtitleKey={subtitleKey} />{panel}</div></div>;
}
