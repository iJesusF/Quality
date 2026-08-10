"use client";
import { AlertTriangle } from "lucide-react";
export default function QualityError({ retry }: { error: Error & { digest?:string }; retry:()=>void }) { return <section className="empty-state"><AlertTriangle/><h2>No fue posible cargar los datos</h2><p>Verifica la conexión y los permisos de Supabase.</p><button className="primary-button" onClick={retry}>Reintentar</button></section>; }
