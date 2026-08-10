import Link from "next/link";
import { SearchX } from "lucide-react";
import { getWorkspaceContext, requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
type Result = { type:string; id:string; title:string; detail:string; href:string };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?:string }> }) {
  const q=(await searchParams).q?.trim() ?? ""; const [{supabase},{project}]=await Promise.all([requireUser(),getWorkspaceContext()]); let results:Result[]=[];
  if(q.length>=2){ const term=`%${q.replaceAll("%","")}%`; const [segments,drawings,inspections,materials,ncrs]=await Promise.all([
    supabase.from("segments").select("id,tag,description").eq("project_id",project.id).or(`tag.ilike.${term},description.ilike.${term}`).limit(10),
    supabase.from("drawings").select("id,number,title").eq("project_id",project.id).or(`number.ilike.${term},title.ilike.${term}`).limit(10),
    supabase.from("inspections").select("id,folio,status").eq("project_id",project.id).ilike("folio",term).limit(10),
    supabase.from("materials").select("id,code,description").eq("project_id",project.id).or(`code.ilike.${term},description.ilike.${term}`).limit(10),
    supabase.from("ncrs").select("id,folio,title").eq("project_id",project.id).or(`folio.ilike.${term},title.ilike.${term}`).limit(10),
  ]); const failed=[segments,drawings,inspections,materials,ncrs].find(x=>x.error)?.error; if(failed) throw new Error(failed.message);
  results=[...(segments.data??[]).map(x=>({type:"Tramo",id:x.id,title:x.tag,detail:x.description??"",href:`/segments/${x.id}`})),...(drawings.data??[]).map(x=>({type:"Plano",id:x.id,title:x.number,detail:x.title,href:`/drawings/${x.id}`})),...(inspections.data??[]).map(x=>({type:"Inspección",id:x.id,title:x.folio,detail:x.status,href:`/inspections/${x.id}`})),...(materials.data??[]).map(x=>({type:"Material",id:x.id,title:x.code,detail:x.description,href:`/materials/${x.id}`})),...(ncrs.data??[]).map(x=>({type:"NCR",id:x.id,title:x.folio,detail:x.title,href:`/issues/${x.id}`}))]; }
  return <div className="module-page"><section className="page-heading"><div><div className="eyebrow"><span>BÚSQUEDA GLOBAL</span></div><h1>{q?`Resultados para “${q}”`:"Buscar en el proyecto"}</h1><p>{results.length} coincidencias.</p></div></section>{results.length?<section className="project-list">{results.map(r=><Link className="project-row" href={r.href} key={`${r.type}-${r.id}`}><span className="project-code">{r.type.slice(0,2).toUpperCase()}</span><div><strong>{r.title}</strong><small>{r.type} · {r.detail}</small></div></Link>)}</section>:<section className="empty-state"><SearchX/><h2>Sin resultados</h2><p>Escribe al menos dos caracteres o prueba otro folio, tramo, plano o material.</p></section>}</div>;
}
