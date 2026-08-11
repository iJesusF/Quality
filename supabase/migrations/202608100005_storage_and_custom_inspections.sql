begin;

-- This recovery migration intentionally provisions the bucket again so hosted
-- databases that skipped 003 can recover from "Bucket not found" safely.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('quality-private','quality-private',false,52428800,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists quality_files_read on storage.objects;
drop policy if exists quality_files_insert on storage.objects;
drop policy if exists quality_files_delete on storage.objects;
create policy quality_files_read on storage.objects for select to authenticated using(bucket_id='quality-private' and public.is_project_member(((storage.foldername(name))[1])::uuid));
create policy quality_files_insert on storage.objects for insert to authenticated with check(bucket_id='quality-private' and public.has_project_role(((storage.foldername(name))[1])::uuid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']));
create policy quality_files_delete on storage.objects for delete to authenticated using(bucket_id='quality-private' and public.has_project_role(((storage.foldername(name))[1])::uuid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER']));

alter table public.inspection_templates add column if not exists project_id uuid references public.projects(id);
alter table public.inspection_templates drop constraint if exists inspection_templates_organization_id_code_key;
create unique index if not exists inspection_templates_project_code_key on public.inspection_templates(project_id,code) where project_id is not null;
create unique index if not exists inspection_templates_org_code_key on public.inspection_templates(organization_id,code) where project_id is null;
create index if not exists inspection_templates_project_idx on public.inspection_templates(project_id) where archived_at is null;

with defaults(code,name,discipline) as (values
  ('VISUAL-MECH','Inspección visual mecánica','MECHANICAL'),
  ('HYDROTEST','Prueba hidrostática','MECHANICAL'),
  ('CIVIL-GENERAL','Inspección civil general','CIVIL'),
  ('ELECTRICAL-GENERAL','Inspección eléctrica general','ELECTRICAL'),
  ('INSTRUMENTATION-GENERAL','Inspección de instrumentación','INSTRUMENTATION')
)
insert into public.inspection_templates(organization_id,project_id,code,name,inspection_type)
select p.organization_id,p.id,d.code,d.name,d.discipline from public.projects p cross join defaults d
on conflict(project_id,code) where project_id is not null do update set name=excluded.name,inspection_type=excluded.inspection_type;

insert into public.inspection_template_versions(template_id,version,schema,validation_rules,status,effective_date)
select t.id,1,jsonb_build_object('sections',jsonb_build_array(jsonb_build_object('key','general','title','Datos generales','fields','[]'::jsonb))),'[]'::jsonb,'ACTIVE',current_date
from public.inspection_templates t where t.project_id is not null
on conflict(template_id,version) do nothing;

create or replace function public.create_project_inspection_template(pid uuid, template_code text, template_name text, discipline text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); oid uuid; tid uuid;
begin
  if uid is null or not public.has_project_role(pid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER']) then raise exception 'Project administration access required'; end if;
  if discipline not in ('MECHANICAL','CIVIL','ELECTRICAL','INSTRUMENTATION','GENERAL') then raise exception 'Invalid discipline'; end if;
  select organization_id into oid from public.projects where id=pid;
  insert into public.inspection_templates(organization_id,project_id,code,name,inspection_type)
  values(oid,pid,upper(trim(template_code)),trim(template_name),discipline) returning id into tid;
  insert into public.inspection_template_versions(template_id,version,schema,validation_rules,status,effective_date)
  values(tid,1,'{"sections":[{"key":"general","title":"Datos generales","fields":[]}]}'::jsonb,'[]'::jsonb,'ACTIVE',current_date);
  return tid;
end $$;

drop function if exists public.create_quality_inspection(uuid,text,uuid);
create function public.create_quality_inspection(pid uuid, inspection_kind text, segment_ref uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); version_id uuid; inspection_id uuid; inspection_folio text; prefix text;
begin
  if uid is null or not public.has_project_role(pid,array['ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER']) then raise exception 'Project write access required'; end if;
  if segment_ref is not null and not exists(select 1 from public.segments where id=segment_ref and project_id=pid) then raise exception 'Segment does not belong to the active project'; end if;
  select v.id into version_id from public.inspection_templates t join public.inspection_template_versions v on v.template_id=t.id
  where t.project_id=pid and t.code=upper(trim(inspection_kind)) and t.archived_at is null and v.status='ACTIVE'
  order by v.version desc limit 1;
  if version_id is null then raise exception 'Active inspection template not found for this project'; end if;
  prefix:=left(regexp_replace(upper(inspection_kind),'[^A-Z0-9]','','g'),8);
  inspection_folio:=public.next_project_folio(pid,prefix);
  insert into public.inspections(project_id,segment_id,template_version_id,folio,status,performed_by,started_at,created_by)
  values(pid,segment_ref,version_id,inspection_folio,'DRAFT',uid,timezone('utc',now()),uid) returning id into inspection_id;
  insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action,metadata)
  values(pid,uid,'inspection',inspection_id,'INSPECTION_CREATED',jsonb_build_object('folio',inspection_folio,'template_code',inspection_kind));
  return inspection_id;
end $$;

grant execute on function public.create_project_inspection_template(uuid,text,text,text) to authenticated;
grant execute on function public.create_quality_inspection(uuid,text,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
