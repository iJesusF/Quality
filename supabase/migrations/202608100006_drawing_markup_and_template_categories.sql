begin;

create or replace function public.create_project_inspection_template(pid uuid, template_code text, template_name text, discipline text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); oid uuid; tid uuid;
begin
  if uid is null or not public.has_project_role(pid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER']) then raise exception 'Project administration access required'; end if;
  if discipline not in ('MECHANICAL','CIVIL','ELECTRICAL','PLC','INSTRUMENTATION','GENERAL') then raise exception 'Invalid discipline'; end if;
  select organization_id into oid from public.projects where id=pid;
  insert into public.inspection_templates(organization_id,project_id,code,name,inspection_type)
  values(oid,pid,upper(trim(template_code)),trim(template_name),discipline) returning id into tid;
  insert into public.inspection_template_versions(template_id,version,schema,validation_rules,status,effective_date)
  values(tid,1,'{"sections":[{"key":"general","title":"Datos generales","fields":[]}]}'::jsonb,'[]'::jsonb,'ACTIVE',current_date);
  return tid;
end $$;

create or replace function public.update_project_inspection_template(pid uuid, template_ref uuid, template_name text, discipline text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.has_project_role(pid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER']) then raise exception 'Project administration access required'; end if;
  if discipline not in ('MECHANICAL','CIVIL','ELECTRICAL','PLC','INSTRUMENTATION','GENERAL') then raise exception 'Invalid discipline'; end if;
  update public.inspection_templates set name=trim(template_name),inspection_type=discipline where id=template_ref and project_id=pid and archived_at is null;
  if not found then raise exception 'Inspection template not found in active project'; end if;
end $$;

create or replace function public.audit_segment_drawing_markup()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.drawing_revision_id is distinct from old.drawing_revision_id or new.drawing_geometry is distinct from old.drawing_geometry then
    insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action,metadata)
    values(new.project_id,auth.uid(),'segment',new.id,'SEGMENT_DRAWING_MARKED',jsonb_build_object('drawing_revision_id',new.drawing_revision_id));
  end if;
  return new;
end $$;

drop trigger if exists audit_segment_drawing_markup on public.segments;
create trigger audit_segment_drawing_markup after update of drawing_revision_id,drawing_geometry on public.segments for each row execute function public.audit_segment_drawing_markup();

grant execute on function public.create_project_inspection_template(uuid,text,text,text) to authenticated;
grant execute on function public.update_project_inspection_template(uuid,uuid,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
