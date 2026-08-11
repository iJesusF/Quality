const statuses: Record<string, { color: string; label: string }> = {
  NOT_STARTED: { color: "#94a3b8", label: "Pendiente" },
  PENDING: { color: "#94a3b8", label: "Pendiente" },
  IN_REVIEW: { color: "#eab308", label: "En revisión" },
  IN_PROGRESS: { color: "#eab308", label: "En progreso" },
  COMPLETED: { color: "#22c55e", label: "Completado" },
  APPROVED: { color: "#16a34a", label: "Aprobado" },
  REJECTED: { color: "#ef4444", label: "Rechazado / NCR" },
  NCR: { color: "#ef4444", label: "NCR" },
};

export const getSegmentColor = (status: string) => statuses[status]?.color ?? statuses.NOT_STARTED.color;
export const getSegmentStatusLabel = (status: string) => statuses[status]?.label ?? status.replaceAll("_", " ");
