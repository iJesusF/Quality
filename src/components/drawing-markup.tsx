"use client";

import Link from "next/link";
import { useMemo, useState, type PointerEvent } from "react";
import { Check, Eraser, Highlighter, MousePointer2, Save, Search } from "lucide-react";
import { saveSegmentDrawingMarkupAction } from "@/app/actions/quality";
import { getSegmentColor, getSegmentStatusLabel } from "@/lib/drawing-markup";

export type Point = { x: number; y: number };
export type PolylineGeometry = { type: "polyline"; points: Point[] };
export type LegacyGeometry = { type: "rectangle"; x: number; y: number; width: number; height: number };
export type DrawingGeometry = PolylineGeometry | LegacyGeometry;
type Segment = { id: string; tag: string; description: string | null; status: string; progress_percentage: number; drawing_geometry: DrawingGeometry | null };

const toPoints = (geometry: DrawingGeometry | null): Point[] => {
  if (!geometry) return [];
  if (geometry.type === "polyline") return geometry.points;
  return [
    { x: geometry.x, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y + geometry.height },
    { x: geometry.x, y: geometry.y + geometry.height },
    { x: geometry.x, y: geometry.y },
  ];
};

const svgPoints = (geometry: DrawingGeometry) => toPoints(geometry).map(({ x, y }) => `${x * 1000},${y * 1000}`).join(" ");

export function DrawingMarkup({ drawingId, revisionId, url, segments }: { drawingId: string; revisionId: string; url: string; segments: Segment[] }) {
  const [tool, setTool] = useState<"select" | "trace">("select");
  const [selectedId, setSelectedId] = useState(segments[0]?.id ?? "");
  const [draft, setDraft] = useState<Point[]>(toPoints(segments[0]?.drawing_geometry ?? null));
  const [drawing, setDrawing] = useState(false);
  const [query, setQuery] = useState("");
  const selected = segments.find((segment) => segment.id === selectedId);
  const geometry: PolylineGeometry | null = draft.length >= 2 ? { type: "polyline", points: draft } : null;
  const filtered = useMemo(() => segments.filter((segment) => `${segment.tag} ${segment.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [query, segments]);

  const normalizedPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) };
  };
  const beginTrace = (event: PointerEvent<SVGSVGElement>) => {
    if (tool !== "trace" || !selectedId) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft([normalizedPoint(event)]);
    setDrawing(true);
  };
  const continueTrace = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawing || tool !== "trace") return;
    const point = normalizedPoint(event);
    setDraft((current) => {
      const previous = current.at(-1);
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < .004) return current;
      return [...current, point];
    });
  };
  const selectSegment = (id: string) => {
    const segment = segments.find((item) => item.id === id);
    setSelectedId(id);
    setDraft(toPoints(segment?.drawing_geometry ?? null));
    setTool("select");
  };

  return <div className="plan-editor">
    <header className="plan-toolbar" role="toolbar" aria-label="Herramientas de marcado">
      <button type="button" className={tool === "select" ? "plan-tool active" : "plan-tool"} onClick={() => setTool("select")} aria-pressed={tool === "select"}><MousePointer2 /> Consultar</button>
      <button type="button" className={tool === "trace" ? "plan-tool active" : "plan-tool"} onClick={() => setTool("trace")} disabled={!selectedId} aria-pressed={tool === "trace"}><Highlighter /> Trazar tubería</button>
      <button type="button" className="plan-tool" onClick={() => setDraft([])} disabled={!draft.length}><Eraser /> Borrar trazo</button>
      <div className="plan-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por tag o descripción" aria-label="Buscar tramos" /></div>
    </header>

    <div className="plan-layout">
      <div className="plan-stage">
        <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="Plano PDF" />
        <svg className={`plan-overlay ${tool === "trace" ? "tracing" : "consulting"}`} viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerDown={beginTrace} onPointerMove={continueTrace} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)} aria-label="Capa de trazos del plano">
          {segments.filter((segment) => segment.drawing_geometry && segment.id !== selectedId).map((segment) => <polyline key={segment.id} points={svgPoints(segment.drawing_geometry!)} fill="none" stroke={getSegmentColor(segment.status)} strokeWidth="8" vectorEffect="non-scaling-stroke" className="saved-pipe" onPointerDown={(event) => { event.stopPropagation(); selectSegment(segment.id); }}><title>{segment.tag} · {getSegmentStatusLabel(segment.status)}</title></polyline>)}
          {geometry && selected && <polyline points={svgPoints(geometry)} fill="none" stroke={getSegmentColor(selected.status)} strokeWidth="10" vectorEffect="non-scaling-stroke" className="active-pipe" />}
        </svg>
        {tool === "trace" && <div className="trace-instruction"><Highlighter /> Mantén presionado y sigue el recorrido real de <strong>{selected?.tag}</strong></div>}
      </div>

      <aside className="plan-sidebar">
        <div className="plan-sidebar-title"><div><strong>Tramos del plano</strong><small>{segments.filter((segment) => segment.drawing_geometry).length} marcados de {segments.length}</small></div><Check /></div>
        <div className="plan-segment-list">
          {filtered.map((segment) => <button type="button" key={segment.id} className={segment.id === selectedId ? "plan-segment active" : "plan-segment"} onClick={() => selectSegment(segment.id)}><i style={{ background: getSegmentColor(segment.status) }} /><span><strong>{segment.tag}</strong><small>{segment.description || "Sin descripción"}</small></span><b>{segment.progress_percentage}%</b></button>)}
          {!filtered.length && <p>No se encontraron tramos.</p>}
        </div>
        {selected && <section className="plan-selection"><span>SEGMENTO SELECCIONADO</span><h2>{selected.tag}</h2><p>{selected.description || "Sin descripción"}</p><div><i style={{ background: getSegmentColor(selected.status) }} />{getSegmentStatusLabel(selected.status)}</div><Link className="secondary-button" href={`/segments/${selected.id}`}>Ver ficha</Link></section>}
        <section className="plan-legend"><strong>Leyenda</strong>{["NOT_STARTED", "IN_REVIEW", "APPROVED", "REJECTED"].map((status) => <span key={status}><i style={{ background: getSegmentColor(status) }} />{getSegmentStatusLabel(status)}</span>)}</section>
        <form className="plan-save" action={saveSegmentDrawingMarkupAction}><input type="hidden" name="drawingId" value={drawingId} /><input type="hidden" name="drawingRevisionId" value={revisionId} /><input type="hidden" name="segmentId" value={selectedId} /><input type="hidden" name="geometry" value={JSON.stringify(geometry)} /><button className="primary-button" disabled={!selectedId || !geometry}><Save /> Guardar trazo permanentemente</button></form>
      </aside>
    </div>
  </div>;
}
