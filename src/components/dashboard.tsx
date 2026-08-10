import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronRight, CircleDashed, Clock3,
  FileCheck2, FlaskConical, MapPin, MoreHorizontal, Plus, ShieldCheck, TrendingUp,
} from "lucide-react";

const metrics = [
  { label: "Tramos inspeccionados", value: "128", total: "de 228", percent: 56, tone: "blue", icon: ShieldCheck, note: "+12 esta semana" },
  { label: "Pruebas completadas", value: "342", total: "de 512", percent: 67, tone: "green", icon: FlaskConical, note: "+28 esta semana" },
  { label: "Acciones pendientes", value: "46", total: "abiertas", percent: 38, tone: "orange", icon: Clock3, note: "8 con prioridad alta" },
  { label: "Listos para cierre", value: "23", total: "tramos", percent: 82, tone: "teal", icon: FileCheck2, note: "5 requieren firma" },
] as const;

const progress = [
  ["Inspección visual", 86, "green"], ["Hydrotest", 67, "blue"], ["Materiales", 74, "teal"],
  ["Punch List", 58, "orange"], ["Passivation", 43, "orange"], ["Welding", 79, "blue"], ["Turnover", 34, "gray"],
] as const;

const activities = [
  { icon: CheckCircle2, tone: "green", title: "Hydrotest completado", ref: "HT-034 · TR-0450", user: "Juan Pérez", time: "Hace 18 min" },
  { icon: ShieldCheck, tone: "blue", title: "Inspección visual registrada", ref: "VI-0088 · TR-0448", user: "Ana García", time: "Hace 42 min" },
  { icon: AlertTriangle, tone: "red", title: "NCR creada", ref: "NCR-1023 · TR-0401", user: "Carlos López", time: "Hace 1 h" },
  { icon: Check, tone: "teal", title: "Material aprobado", ref: "MR-00034 · Heat H-24567", user: "María Torres", time: "Hace 2 h" },
] as const;

export function Dashboard() {
  return (
    <div className="dashboard">
      <section className="page-heading">
        <div><div className="eyebrow"><span>ARCA CONTINENTAL</span><ChevronRight /> PROCESS WATER</div><h1>Resumen de calidad</h1><p>Avance del proyecto y acciones que requieren atención.</p></div>
        <div className="heading-actions"><button className="secondary-button"><SlidersIcon /> Filtros</button><button className="primary-button"><Plus /> Nueva inspección</button></div>
      </section>

      <section className="metric-grid" aria-label="Indicadores de calidad">
        {metrics.map(({ label, value, total, percent, tone, icon: Icon, note }) => (
          <article className={`metric-card tone-${tone}`} key={label}>
            <div className="metric-top"><span className="metric-icon"><Icon /></span><span className="metric-trend"><TrendingUp /> {note}</span></div>
            <p>{label}</p><div className="metric-value"><strong>{value}</strong><span>{total}</span></div>
            <div className="progress-track"><span style={{ width: `${percent}%` }} /></div><small>{percent}% completado</small>
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel quality-progress">
          <div className="section-heading"><div><h2>Avance de calidad</h2><p>Progreso por disciplina del proyecto</p></div><button className="text-button">Ver detalle <ArrowRight /></button></div>
          <div className="progress-list">
            {progress.map(([label, value, tone]) => <div className="progress-row" key={label}><div><span>{label}</span><strong>{value}%</strong></div><div className={`progress-track tone-${tone}`}><span style={{ width: `${value}%` }} /></div></div>)}
          </div>
        </section>

        <section className="panel project-completion">
          <div className="section-heading"><div><h2>Completitud del proyecto</h2><p>228 tramos totales</p></div><button className="icon-button"><MoreHorizontal /></button></div>
          <div className="donut-area"><div className="donut"><div><strong>62%</strong><span>general</span></div></div><ul><li><i className="green" />Completado <strong>98</strong></li><li><i className="blue" />En progreso <strong>44</strong></li><li><i className="gray" />Pendiente <strong>68</strong></li><li><i className="red" />Atrasado <strong>18</strong></li></ul></div>
          <div className="completion-note"><TrendingUp /><span><strong>4.8% por encima</strong> del plan semanal</span></div>
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel activity-panel">
          <div className="section-heading"><div><h2>Actividad reciente</h2><p>Últimos movimientos del equipo</p></div><button className="text-button">Ver toda</button></div>
          <div className="activity-list">{activities.map(({ icon: Icon, tone, title, ref, user, time }) => <article key={ref}><span className={`activity-icon tone-${tone}`}><Icon /></span><div><strong>{title}</strong><span className="mono">{ref}</span></div><span className="activity-user">{user}</span><time>{time}</time><ChevronRight /></article>)}</div>
        </section>

        <section className="panel drawing-card">
          <div className="section-heading"><div><h2>Plano activo</h2><p>ISO-PW-014 · Rev B</p></div><span className="status-pill review"><CircleDashed /> En revisión</span></div>
          <div className="drawing-preview"><div className="drawing-grid" /><span className="pipe p1" /><span className="pipe p2" /><span className="pipe p3" /><span className="segment-label">TR-0450</span><span className="drawing-stamp">PROCESS WATER · AREA RO</span></div>
          <div className="drawing-meta"><span><MapPin /> Línea PW-003</span><span>4&quot; · SS316L · SCH10</span><button className="text-button">Abrir plano <ArrowRight /></button></div>
        </section>
      </div>

      <section className="actions-band">
        <div className="section-heading"><div><h2>Próximas acciones</h2><p>Ordenadas por prioridad y fecha compromiso</p></div><button className="secondary-button">Ver calendario</button></div>
        <div className="action-table" role="table"><div className="table-head" role="row"><span>ACTIVIDAD</span><span>TRAMO</span><span>FECHA</span><span>PRIORIDAD</span><span>RESPONSABLE</span><span /></div>{[
          ["Completar Passivation", "TR-0450", "Hoy, 14:00", "Alta", "Ana García"], ["Revisar evidencia Hydrotest", "TR-0442", "Hoy, 16:30", "Media", "Juan Pérez"], ["Cerrar Punch-0081", "TR-0387", "11 Ago", "Alta", "Carlos López"],
        ].map((row) => <div className="table-row" role="row" key={row[0]}>{row.map((cell, i) => <span key={cell} className={i === 3 ? `priority ${cell === "Alta" ? "high" : "medium"}` : i === 1 ? "mono" : ""}>{cell}</span>)}<button className="icon-button"><ChevronRight /></button></div>)}</div>
      </section>
    </div>
  );
}

function SlidersIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
