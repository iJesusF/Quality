import "server-only";
import { getWorkspaceContext, requireUser } from "@/lib/auth";

export async function getDashboardData() {
  const [{ supabase }, { project }] = await Promise.all([requireUser(), getWorkspaceContext()]);
  const completedInspectionStates = ["COMPLETED", "PENDING_REVIEW", "PENDING_SIGNATURE", "APPROVED"];
  const [segments, inspected, inspections, completed, ncrs, punches, turnover, activity] = await Promise.all([
    supabase.from("segments").select("id", { count: "exact", head: true }).eq("project_id", project.id).is("archived_at", null),
    supabase.from("segments").select("id", { count: "exact", head: true }).eq("project_id", project.id).in("status", ["INSPECTED", "APPROVED", "READY_FOR_TURNOVER"]),
    supabase.from("inspections").select("id", { count: "exact", head: true }).eq("project_id", project.id).is("archived_at", null),
    supabase.from("inspections").select("id", { count: "exact", head: true }).eq("project_id", project.id).in("status", completedInspectionStates),
    supabase.from("ncrs").select("id", { count: "exact", head: true }).eq("project_id", project.id).not("status", "eq", "CLOSED"),
    supabase.from("punch_items").select("id", { count: "exact", head: true }).eq("project_id", project.id).not("status", "eq", "CLOSED"),
    supabase.from("segments").select("id", { count: "exact", head: true }).eq("project_id", project.id).eq("status", "READY_FOR_TURNOVER"),
    supabase.from("audit_logs").select("id,entity_type,action,occurred_at").eq("project_id", project.id).order("occurred_at", { ascending: false }).limit(6),
  ]);
  const failures = [segments, inspected, inspections, completed, ncrs, punches, turnover, activity].find((r) => r.error)?.error;
  if (failures) throw new Error(failures.message);
  return { project, metrics: { segments: segments.count ?? 0, inspected: inspected.count ?? 0, inspections: inspections.count ?? 0, completed: completed.count ?? 0, openIssues: (ncrs.count ?? 0) + (punches.count ?? 0), turnover: turnover.count ?? 0 }, activity: activity.data ?? [] };
}
