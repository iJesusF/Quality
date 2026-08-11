-- Fix hosted schemas without a usable folio conflict constraint and extend trace/inspection operations.
create or replace function public.next_project_folio(pid uuid, folio_prefix text)
returns text language plpgsql security definer set search_path = '' as $$
declare current_value bigint; pad smallint; normalized_prefix text := upper(trim(folio_prefix));
begin
  if auth.uid() is null or not public.is_project_member(pid) then raise exception 'Project access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(pid::text || ':' || normalized_prefix, 0));
  select next_value, padding into current_value, pad from public.folio_counters where project_id=pid and prefix=normalized_prefix for update;
  if found then
    update public.folio_counters set next_value=current_value+1 where project_id=pid and prefix=normalized_prefix;
  else
    current_value:=1; pad:=5;
    insert into public.folio_counters(project_id,prefix,next_value,padding) values(pid,normalized_prefix,2,pad);
  end if;
  return normalized_prefix || '-' || lpad(current_value::text,pad,'0');
end $$;

drop function if exists public.save_segment_drawing_trace(uuid,uuid,uuid,uuid,jsonb);
create function public.save_segment_drawing_trace(pid uuid,drawing_ref uuid,revision_ref uuid,segment_ref uuid,trace_geometry jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare stroke_count integer;
begin
  if auth.uid() is null or not public.has_project_role(pid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']) then raise exception 'Project write access required'; end if;
  if not exists(select 1 from public.drawing_revisions where id=revision_ref and project_id=pid and drawing_id=drawing_ref) then raise exception 'La revisión no pertenece al plano activo'; end if;
  if trace_geometry->>'type'<>'multiline' or jsonb_typeof(trace_geometry->'strokes')<>'array' then raise exception 'El marcado debe contener múltiples líneas'; end if;
  stroke_count:=jsonb_array_length(trace_geometry->'strokes');
  if stroke_count<1 or stroke_count>100 then raise exception 'El marcado debe contener entre 1 y 100 líneas'; end if;
  if exists(select 1 from jsonb_array_elements(trace_geometry->'strokes') s where jsonb_typeof(s->'points')<>'array' or jsonb_array_length(s->'points')<2 or jsonb_array_length(s->'points')>2500 or (s->>'color')!~'^#[0-9a-fA-F]{6}$' or (s->>'width')::numeric not between 3 and 30 or (s->>'opacity')::numeric not between 0.1 and 1) then raise exception 'Una línea tiene estilo o geometría inválida'; end if;
  if exists(select 1 from jsonb_array_elements(trace_geometry->'strokes') s cross join lateral jsonb_array_elements(s->'points') p where jsonb_typeof(p->'x')<>'number' or jsonb_typeof(p->'y')<>'number' or (p->>'x')::numeric not between 0 and 1 or (p->>'y')::numeric not between 0 and 1) then raise exception 'El marcado contiene coordenadas fuera del plano'; end if;
  update public.segments set drawing_revision_id=revision_ref,drawing_geometry=trace_geometry,status=case when status='NOT_STARTED' then 'IN_REVIEW' else status end,updated_at=timezone('utc',now()) where id=segment_ref and project_id=pid and archived_at is null;
  if not found then raise exception 'El tramo no pertenece al proyecto'; end if;
  return true;
end $$;

create or replace function public.update_quality_inspection(pid uuid,inspection_ref uuid,inspection_status text,inspection_result text default null,inspection_notes text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare segment_ref uuid; completion numeric;
begin
  if auth.uid() is null or not public.has_project_role(pid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']) then raise exception 'Project write access required'; end if;
  if inspection_status not in ('DRAFT','IN_PROGRESS','COMPLETED','PENDING_REVIEW','APPROVED','REJECTED','VOID') then raise exception 'Invalid inspection status'; end if;
  update public.inspections set status=inspection_status,result=inspection_result,notes=inspection_notes,completed_at=case when inspection_status in ('COMPLETED','APPROVED','REJECTED') then coalesce(completed_at,timezone('utc',now())) else null end,updated_at=timezone('utc',now()) where id=inspection_ref and project_id=pid and archived_at is null returning segment_id into segment_ref;
  if not found then raise exception 'Inspection not found in active project'; end if;
  if segment_ref is not null then
    select coalesce(round(100.0*count(*) filter(where status in ('COMPLETED','APPROVED'))/nullif(count(*) filter(where status<>'VOID'),0)),0) into completion from public.inspections where project_id=pid and segment_id=segment_ref and archived_at is null;
    update public.segments set progress_percentage=completion,status=case when exists(select 1 from public.inspections where project_id=pid and segment_id=segment_ref and status='REJECTED' and archived_at is null) then 'REJECTED' when completion=100 then 'APPROVED' when completion>0 then 'IN_REVIEW' else status end,updated_at=timezone('utc',now()) where id=segment_ref;
  end if;
  insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action,metadata) values(pid,auth.uid(),'inspection',inspection_ref,'INSPECTION_UPDATED',jsonb_build_object('status',inspection_status,'result',inspection_result));
  return true;
end $$;

grant execute on function public.next_project_folio(uuid,text) to authenticated;
grant execute on function public.save_segment_drawing_trace(uuid,uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function public.update_quality_inspection(uuid,uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
