"use client";

import Link from "next/link";
import { useMemo, useState, type PointerEvent } from "react";
import { Check, Eraser, Highlighter, MousePointer2, RotateCcw, Save, Search } from "lucide-react";
import { deleteSegmentDrawingMarkupAction, saveSegmentDrawingMarkupAction } from "@/app/actions/quality";
import { getSegmentColor, getSegmentStatusLabel } from "@/lib/drawing-markup";

export type Point = { x: number; y: number };
export type TraceStroke = { points: Point[]; color: string; width: number; opacity: number };
export type DrawingGeometry = { type: "multiline"; strokes: TraceStroke[] } | { type: "polyline"; points: Point[] } | { type: "rectangle"; x: number; y: number; width: number; height: number };
type Segment = { id: string; tag: string; description: string | null; status: string; progress_percentage: number; drawing_geometry: DrawingGeometry | null };

const normalizeGeometry = (geometry: DrawingGeometry | null, fallbackColor: string): TraceStroke[] => {
  if (!geometry) return [];
  if (geometry.type === "multiline") return geometry.strokes;
  if (geometry.type === "polyline") return [{ points: geometry.points, color: fallbackColor, width: 10, opacity: .55 }];
  const { x, y, width, height } = geometry;
  return [{ points: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }, { x, y }], color: fallbackColor, width: 10, opacity: .55 }];
};
const svgPoints = (points: Point[]) => points.map(({ x, y }) => `${x * 1000},${y * 1000}`).join(" ");

export function DrawingMarkup({ drawingId, revisionId, url, segments }: { drawingId: string; revisionId: string; url: string; segments: Segment[] }) {
  const initial = segments[0];
  const [tool, setTool] = useState<"select" | "trace">("select");
  const [selectedId, setSelectedId] = useState(initial?.id ?? "");
  const [strokes, setStrokes] = useState<TraceStroke[]>(normalizeGeometry(initial?.drawing_geometry ?? null, getSegmentColor(initial?.status ?? "NOT_STARTED")));
  const [activePoints, setActivePoints] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("#eab308");
  const [width, setWidth] = useState(10);
  const [opacity, setOpacity] = useState(.55);
  const selected = segments.find((segment) => segment.id === selectedId);
  const geometry: DrawingGeometry | null = strokes.length ? { type: "multiline", strokes } : null;
  const filtered = useMemo(() => segments.filter((segment) => `${segment.tag} ${segment.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [query, segments]);

  const point = (event: PointerEvent<SVGSVGElement>): Point => { const box = event.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) }; };
  const begin = (event: PointerEvent<SVGSVGElement>) => { if (tool !== "trace" || !selectedId) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setActivePoints([point(event)]); setDrawing(true); };
  const move = (event: PointerEvent<SVGSVGElement>) => { if (!drawing || tool !== "trace") return; const next = point(event); setActivePoints((current) => { const previous = current.at(-1); return previous && Math.hypot(next.x - previous.x, next.y - previous.y) < .004 ? current : [...current, next]; }); };
  const finish = () => { if (activePoints.length >= 2) setStrokes((current) => [...current, { points: activePoints, color, width, opacity }]); setActivePoints([]); setDrawing(false); };
  const selectSegment = (id: string) => { const segment = segments.find((item) => item.id === id); setSelectedId(id); setStrokes(normalizeGeometry(segment?.drawing_geometry ?? null, getSegmentColor(segment?.status ?? "NOT_STARTED"))); setActivePoints([]); setColor(getSegmentColor(segment?.status ?? "IN_REVIEW")); setTool("select"); };
  const restyleLast = (style: Partial<Pick<TraceStroke, "color" | "width" | "opacity">>) => setStrokes((current) => current.map((stroke, index) => index === current.length - 1 ? { ...stroke, ...style } : stroke));
  const renderGeometry = (geometryValue: DrawingGeometry, status: string, className: string) => normalizeGeometry(geometryValue, getSegmentColor(status)).map((stroke, index) => <polyline key={index} points={svgPoints(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} opacity={stroke.opacity} vectorEffect="non-scaling-stroke" className={className} />);

  return <div className="plan-editor"><header className="plan-toolbar" role="toolbar" aria-label="Herramientas de marcado"><button type="button" className={tool === "select" ? "plan-tool active" : "plan-tool"} onClick={() => setTool("select")}><MousePointer2 /> Consultar</button><button type="button" className={tool === "trace" ? "plan-tool active" : "plan-tool"} onClick={() => setTool("trace")} disabled={!selectedId}><Highlighter /> {selected?.drawing_geometry ? "Agregar / editar" : "Trazar tubería"}</button><button type="button" className="plan-tool" onClick={() => setStrokes((current) => current.slice(0, -1))} disabled={!strokes.length}><RotateCcw /> Deshacer línea</button><button type="button" className="plan-tool" onClick={() => setStrokes([])} disabled={!strokes.length}><Eraser /> Limpiar</button><div className="plan-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tramo" /></div></header>
    <div className="trace-stylebar"><label>Color<input type="color" value={color} onChange={(event) => { setColor(event.target.value); restyleLast({ color: event.target.value }); }} /></label><label>Grosor <b>{width}px</b><input type="range" min="3" max="30" value={width} onChange={(event) => { const value = Number(event.target.value); setWidth(value); restyleLast({ width: value }); }} /></label><label>Opacidad <b>{Math.round(opacity * 100)}%</b><input type="range" min="10" max="100" value={opacity * 100} onChange={(event) => { const value = Number(event.target.value) / 100; setOpacity(value); restyleLast({ opacity: value }); }} /></label><span>{strokes.length} línea{strokes.length === 1 ? "" : "s"} · los controles editan la última</span></div>
    <div className="plan-layout"><div className="plan-stage"><iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="Plano PDF" /><svg className={`plan-overlay ${tool === "trace" ? "tracing" : "consulting"}`} viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>{segments.filter((segment) => segment.drawing_geometry && segment.id !== selectedId).map((segment) => <g key={segment.id} onPointerDown={(event) => { event.stopPropagation(); selectSegment(segment.id); }}>{renderGeometry(segment.drawing_geometry!, segment.status, "saved-pipe")}<title>{segment.tag}</title></g>)}{strokes.map((stroke, index) => <polyline key={index} points={svgPoints(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} opacity={stroke.opacity} vectorEffect="non-scaling-stroke" className="active-pipe" />)}{activePoints.length > 1 && <polyline points={svgPoints(activePoints)} fill="none" stroke={color} strokeWidth={width} opacity={opacity} vectorEffect="non-scaling-stroke" className="active-pipe" />}</svg>{tool === "trace" && <div className="trace-instruction"><Highlighter /> Suelta para terminar una línea; vuelve a presionar para continuar el mismo tramo.</div>}</div>
      <aside className="plan-sidebar"><div className="plan-sidebar-title"><div><strong>Tramos del plano</strong><small>{segments.filter((segment) => segment.drawing_geometry).length} marcados de {segments.length}</small></div><Check /></div><div className="plan-segment-list">{filtered.map((segment) => <button type="button" key={segment.id} className={segment.id === selectedId ? "plan-segment active" : "plan-segment"} onClick={() => selectSegment(segment.id)}><i style={{ background: getSegmentColor(segment.status) }} /><span><strong>{segment.tag}</strong><small>{segment.description || "Sin descripción"}</small></span><b>{segment.progress_percentage}%</b></button>)}</div>{selected && <section className="plan-selection"><span>SEGMENTO SELECCIONADO</span><h2>{selected.tag}</h2><p>{selected.description || "Sin descripción"}</p><div><i style={{ background: getSegmentColor(selected.status) }} />{getSegmentStatusLabel(selected.status)}</div><Link className="primary-button" href={`/inspections/new?segment=${selected.id}`}>Crear inspección</Link><Link className="secondary-button" href={`/segments/${selected.id}`}>Ver ficha</Link></section>}<section className="plan-legend"><strong>Leyenda</strong>{["NOT_STARTED", "IN_REVIEW", "APPROVED", "REJECTED"].map((status) => <span key={status}><i style={{ background: getSegmentColor(status) }} />{getSegmentStatusLabel(status)}</span>)}</section><div className="plan-persistence-actions"><form action={saveSegmentDrawingMarkupAction}><input type="hidden" name="drawingId" value={drawingId} /><input type="hidden" name="drawingRevisionId" value={revisionId} /><input type="hidden" name="segmentId" value={selectedId} /><input type="hidden" name="geometry" value={JSON.stringify(geometry)} /><button className="primary-button" disabled={!selectedId || !geometry}><Save /> Guardar {strokes.length} línea{strokes.length === 1 ? "" : "s"}</button></form><form action={deleteSegmentDrawingMarkupAction}><input type="hidden" name="drawingId" value={drawingId} /><input type="hidden" name="drawingRevisionId" value={revisionId} /><input type="hidden" name="segmentId" value={selectedId} /><button className="danger-button" disabled={!selected?.drawing_geometry} onClick={(event) => { if (!window.confirm(`¿Eliminar el marcado de ${selected?.tag}?`)) event.preventDefault(); }}><Eraser /> Eliminar guardado</button></form></div></aside></div></div>;
}
