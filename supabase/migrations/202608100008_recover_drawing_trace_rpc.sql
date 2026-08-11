-- Recovery migration for hosted databases where migration 007 was not applied or PostgREST cached the old schema.
drop function if exists public.save_segment_drawing_trace(uuid,uuid,uuid,uuid,jsonb);
drop function if exists public.delete_segment_drawing_trace(uuid,uuid,uuid,uuid);

create function public.save_segment_drawing_trace(
  pid uuid, drawing_ref uuid, revision_ref uuid, segment_ref uuid, trace_geometry jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare point_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_project_role(pid, array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']) then raise exception 'No tienes permisos para marcar tramos en este proyecto'; end if;
  if not exists (select 1 from public.drawing_revisions r where r.id=revision_ref and r.project_id=pid and r.drawing_id=drawing_ref) then raise exception 'La revisión no pertenece al plano activo'; end if;
  if trace_geometry->>'type' <> 'polyline' or jsonb_typeof(trace_geometry->'points') <> 'array' then raise exception 'El marcado debe ser una polilínea'; end if;
  point_count := jsonb_array_length(trace_geometry->'points');
  if point_count < 2 or point_count > 2500 then raise exception 'El trazo debe contener entre 2 y 2500 puntos'; end if;
  if exists (select 1 from jsonb_array_elements(trace_geometry->'points') p where jsonb_typeof(p->'x') <> 'number' or jsonb_typeof(p->'y') <> 'number' or (p->>'x')::numeric not between 0 and 1 or (p->>'y')::numeric not between 0 and 1) then raise exception 'El trazo contiene coordenadas fuera del plano'; end if;
  update public.segments set drawing_revision_id=revision_ref, drawing_geometry=trace_geometry, status=case when status='NOT_STARTED' then 'IN_REVIEW' else status end, updated_at=timezone('utc',now()) where id=segment_ref and project_id=pid and archived_at is null;
  if not found then raise exception 'El tramo no existe o no pertenece al proyecto'; end if;
  return true;
end $$;

create function public.delete_segment_drawing_trace(
  pid uuid, drawing_ref uuid, revision_ref uuid, segment_ref uuid
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_project_role(pid, array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']) then raise exception 'No tienes permisos para eliminar trazos en este proyecto'; end if;
  if not exists (select 1 from public.drawing_revisions r where r.id=revision_ref and r.project_id=pid and r.drawing_id=drawing_ref) then raise exception 'La revisión no pertenece al plano activo'; end if;
  update public.segments set drawing_revision_id=null, drawing_geometry=null, updated_at=timezone('utc',now()) where id=segment_ref and project_id=pid and drawing_revision_id=revision_ref and archived_at is null;
  if not found then raise exception 'No existe un trazo guardado para este tramo y revisión'; end if;
  return true;
end $$;

revoke all on function public.save_segment_drawing_trace(uuid,uuid,uuid,uuid,jsonb) from public;
revoke all on function public.delete_segment_drawing_trace(uuid,uuid,uuid,uuid) from public;
grant execute on function public.save_segment_drawing_trace(uuid,uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function public.delete_segment_drawing_trace(uuid,uuid,uuid,uuid) to authenticated;

comment on function public.save_segment_drawing_trace(uuid,uuid,uuid,uuid,jsonb) is 'Creates or replaces a validated segment polyline on a drawing revision';
comment on function public.delete_segment_drawing_trace(uuid,uuid,uuid,uuid) is 'Permanently removes a segment polyline from its drawing revision';
notify pgrst, 'reload schema';
