begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quality-private', 'quality-private', false, 52428800, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy quality_files_read on storage.objects for select to authenticated
using (bucket_id='quality-private' and public.is_project_member(((storage.foldername(name))[1])::uuid));
create policy quality_files_insert on storage.objects for insert to authenticated
with check (bucket_id='quality-private' and public.has_project_role(((storage.foldername(name))[1])::uuid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']));
create policy quality_files_delete on storage.objects for delete to authenticated
using (bucket_id='quality-private' and public.has_project_role(((storage.foldername(name))[1])::uuid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER']));

create or replace function public.create_quality_inspection(pid uuid, inspection_kind text, segment_ref uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); org_id uuid; template_id uuid; version_id uuid; inspection_id uuid; inspection_folio text;
begin
  if uid is null or not public.has_project_role(pid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']) then raise exception 'Project write access required'; end if;
  if inspection_kind <> 'HYDROTEST' then raise exception 'Unsupported inspection type'; end if;
  if segment_ref is not null and not exists(select 1 from public.segments s where s.id=segment_ref and s.project_id=pid) then raise exception 'Segment does not belong to the active project'; end if;
  select p.organization_id into org_id from public.projects p where p.id=pid;
  insert into public.inspection_templates(organization_id,code,name,inspection_type) values(org_id,'HYDROTEST','Hydrotest','HYDROTEST')
  on conflict(organization_id,code) do update set name=excluded.name returning id into template_id;
  insert into public.inspection_template_versions(template_id,version,schema,validation_rules,status,effective_date)
  values(template_id,1,'{"sections":[{"key":"test_data","title":"Datos de prueba","fields":[{"key":"design_pressure","type":"measurement","label":"Presión de diseño","required":true},{"key":"test_pressure","type":"measurement","label":"Presión de prueba","required":true},{"key":"result","type":"radio","label":"Resultado","options":["ACCEPTED","REJECTED"],"required":true}]}]}'::jsonb,'[]'::jsonb,'ACTIVE',current_date)
  on conflict(template_id,version) do update set status='ACTIVE' returning id into version_id;
  inspection_folio := public.next_project_folio(pid,'HT');
  insert into public.inspections(project_id,segment_id,template_version_id,folio,status,performed_by,started_at,created_by)
  values(pid,segment_ref,version_id,inspection_folio,'DRAFT',uid,timezone('utc',now()),uid) returning id into inspection_id;
  insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action,metadata)
  values(pid,uid,'inspection',inspection_id,'INSPECTION_CREATED',jsonb_build_object('folio',inspection_folio,'type',inspection_kind));
  return inspection_id;
end $$;

grant execute on function public.create_quality_inspection(uuid,text,uuid) to authenticated;

create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger drawings_updated_at before update on public.drawings for each row execute function public.set_updated_at();
create trigger inspections_updated_at before update on public.inspections for each row execute function public.set_updated_at();

commit;
