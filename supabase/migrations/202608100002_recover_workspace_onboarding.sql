begin;

-- A user can be left with an organization membership but no project membership
-- after data imports or manual administration. Let onboarding repair that state
-- instead of repeatedly reporting that the user already belongs to an organization.
create or replace function public.bootstrap_quality_workspace(org_name text, org_slug text, project_name text, project_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); oid uuid; pid uuid; member_role text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
  insert into public.user_profiles(id,full_name) values(uid,'') on conflict(id) do nothing;

  select m.project_id into pid
  from public.project_members m
  where m.user_id=uid
  order by m.created_at
  limit 1;
  if pid is not null then return pid; end if;

  select m.organization_id,m.role into oid,member_role
  from public.organization_members m
  where m.user_id=uid
  order by m.created_at
  limit 1;

  if oid is null then
    insert into public.organizations(name,slug,created_by) values(trim(org_name),lower(trim(org_slug)),uid) returning id into oid;
    insert into public.organization_members values(oid,uid,'ADMIN',timezone('utc',now()));
  elsif member_role not in ('ADMIN','PROJECT_MANAGER') then
    raise exception 'Tu usuario ya pertenece a una organización; solicita a un administrador que te asigne un proyecto';
  end if;

  insert into public.projects(organization_id,code,name,created_by) values(oid,upper(trim(project_code)),trim(project_name),uid) returning id into pid;
  insert into public.project_members values(pid,uid,'ADMIN',timezone('utc',now()));
  insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action) values(pid,uid,'project',pid,'PROJECT_CREATED');
  return pid;
end $$;

grant execute on function public.bootstrap_quality_workspace(text,text,text,text) to authenticated;

commit;
