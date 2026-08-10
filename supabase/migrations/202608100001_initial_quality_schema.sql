begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end $$;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', job_title text, avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), archived_at timestamptz
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER','CLIENT_REVIEWER','READ_ONLY')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  code text not null, name text not null, client text, end_client text, location text, description text,
  status text not null default 'ACTIVE' check (status in ('PLANNING','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED')),
  start_date date, end_date date, timezone text not null default 'America/Los_Angeles',
  unit_system text not null default 'IMPERIAL', standards text[] not null default '{}',
  quality_config jsonb not null default '{}'::jsonb, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()), archived_at timestamptz,
  unique (organization_id, code)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('ADMIN','PROJECT_MANAGER','QUALITY_MANAGER','QC_INSPECTOR','ENGINEER','FIELD_USER','CLIENT_REVIEWER','READ_ONLY')),
  created_at timestamptz not null default timezone('utc', now()), primary key (project_id, user_id)
);

create table public.areas (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), code text not null, name text not null, created_at timestamptz not null default now(), unique(project_id,code));
create table public.systems (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), area_id uuid references public.areas(id), code text not null, name text not null, service text, created_at timestamptz not null default now(), unique(project_id,code));
create table public.drawings (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), number text not null, title text not null, type text, status text not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, unique(project_id,number));
create table public.drawing_revisions (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), drawing_id uuid not null references public.drawings(id), revision text not null, storage_key text not null, checksum_sha256 text, is_active boolean not null default false, effective_date date, created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(drawing_id,revision));
create unique index drawing_one_active_revision on public.drawing_revisions(drawing_id) where is_active;
create table public.lines (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), system_id uuid references public.systems(id), number text not null, service text, spec text, created_at timestamptz not null default now(), unique(project_id,number));
create table public.segments (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), line_id uuid references public.lines(id), system_id uuid references public.systems(id), area_id uuid references public.areas(id), drawing_revision_id uuid references public.drawing_revisions(id), tag text not null, description text, diameter_value numeric, diameter_unit text, schedule text, material text, spec text, status text not null default 'NOT_STARTED', progress_percentage numeric not null default 0 check(progress_percentage between 0 and 100), drawing_geometry jsonb, responsible_user_id uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, unique(project_id,tag));

create table public.inspection_templates (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), code text not null, name text not null, inspection_type text not null, created_at timestamptz not null default now(), archived_at timestamptz, unique(organization_id,code));
create table public.inspection_template_versions (id uuid primary key default gen_random_uuid(), template_id uuid not null references public.inspection_templates(id), version integer not null, schema jsonb not null, validation_rules jsonb not null default '[]', status text not null default 'DRAFT', effective_date date, created_at timestamptz not null default now(), unique(template_id,version));
create table public.inspection_requirements (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), segment_id uuid not null references public.segments(id), template_id uuid not null references public.inspection_templates(id), required boolean not null default true, status text not null default 'PENDING', created_at timestamptz not null default now(), unique(segment_id,template_id));
create table public.inspections (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), segment_id uuid references public.segments(id), template_version_id uuid not null references public.inspection_template_versions(id), folio text not null, status text not null default 'DRAFT', performed_by uuid references auth.users(id), reviewed_by uuid references auth.users(id), approved_by uuid references auth.users(id), started_at timestamptz, completed_at timestamptz, result text, notes text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, unique(project_id,folio));
create table public.inspection_values (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), inspection_id uuid not null references public.inspections(id) on delete cascade, field_key text not null, value jsonb, unit text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(inspection_id,field_key));
create table public.photos (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), segment_id uuid references public.segments(id), inspection_id uuid references public.inspections(id), original_key text not null, stamped_key text, thumbnail_key text, checksum_sha256 text, captured_at timestamptz, captured_by uuid references auth.users(id), latitude numeric, longitude numeric, comment text, created_at timestamptz not null default now(), deleted_at timestamptz);
create table public.photo_tags (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), name text not null, color text, unique(project_id,name));
create table public.photo_tag_assignments (photo_id uuid not null references public.photos(id) on delete cascade, tag_id uuid not null references public.photo_tags(id) on delete cascade, primary key(photo_id,tag_id));

create table public.materials (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), code text not null, description text not null, specification text, unit text, created_at timestamptz not null default now(), unique(project_id,code));
create table public.material_receipts (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), folio text not null, supplier text, purchase_order text, received_at date, status text not null default 'IN_REVIEW', inspector_id uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,folio));
create table public.material_lots (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), receipt_id uuid references public.material_receipts(id), material_id uuid not null references public.materials(id), lot_number text, quantity numeric not null, unit text not null, status text not null default 'IN_REVIEW', created_at timestamptz not null default now());
create table public.heat_numbers (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), material_lot_id uuid not null references public.material_lots(id), heat_number text not null, created_at timestamptz not null default now(), unique(project_id,heat_number));
create table public.certificates (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), material_lot_id uuid references public.material_lots(id), type text not null, document_number text, storage_key text not null, checksum_sha256 text, created_at timestamptz not null default now());
create table public.material_installations (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), segment_id uuid not null references public.segments(id), material_lot_id uuid not null references public.material_lots(id), heat_number_id uuid references public.heat_numbers(id), quantity numeric not null, unit text not null, installed_at timestamptz, installed_by uuid references auth.users(id), created_at timestamptz not null default now());

create table public.ncrs (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), segment_id uuid references public.segments(id), inspection_id uuid references public.inspections(id), folio text not null, title text not null, description text not null, category text, priority text not null default 'MEDIUM', status text not null default 'OPEN', disposition text, responsible_user_id uuid references auth.users(id), due_date date, detected_at timestamptz not null default now(), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, unique(project_id,folio));
create table public.punch_items (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), segment_id uuid references public.segments(id), folio text not null, description text not null, priority text not null default 'MEDIUM', status text not null default 'OPEN', responsible_user_id uuid references auth.users(id), due_date date, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,folio));
create table public.corrective_actions (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), ncr_id uuid not null references public.ncrs(id), description text not null, status text not null default 'OPEN', owner_id uuid references auth.users(id), due_date date, completed_at timestamptz, created_at timestamptz not null default now());
create table public.reinspections (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), ncr_id uuid references public.ncrs(id), punch_item_id uuid references public.punch_items(id), inspection_id uuid references public.inspections(id), result text, performed_by uuid references auth.users(id), performed_at timestamptz, notes text, created_at timestamptz not null default now());

create table public.document_templates (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), customer text, form_number text not null, name text not null, source_type text not null, created_at timestamptz not null default now(), archived_at timestamptz, unique(organization_id,customer,form_number));
create table public.document_template_versions (id uuid primary key default gen_random_uuid(), template_id uuid not null references public.document_templates(id), revision text not null, original_storage_key text not null, source_checksum_sha256 text not null, output_type text not null, status text not null default 'DRAFT', effective_date date, retired_date date, created_at timestamptz not null default now(), unique(template_id,revision));
create table public.document_mappings (id uuid primary key default gen_random_uuid(), template_version_id uuid not null references public.document_template_versions(id), version integer not null, schema jsonb not null, status text not null default 'DRAFT', approved_by uuid references auth.users(id), approved_at timestamptz, created_at timestamptz not null default now(), unique(template_version_id,version));
create table public.generated_documents (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), inspection_id uuid references public.inspections(id), template_version_id uuid references public.document_template_versions(id), mapping_id uuid references public.document_mappings(id), folio text not null, revision integer not null default 0, status text not null default 'DRAFT', input_snapshot jsonb not null, storage_key text, checksum_sha256 text, generated_by uuid references auth.users(id), generated_at timestamptz, created_at timestamptz not null default now(), unique(project_id,folio,revision));
create table public.signature_envelopes (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), generated_document_id uuid not null references public.generated_documents(id), provider text not null, provider_envelope_id text, status text not null default 'DRAFT', provider_metadata jsonb not null default '{}', sent_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now());
create table public.signature_recipients (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), envelope_id uuid not null references public.signature_envelopes(id), name text not null, email text not null, role text not null, routing_order integer not null, status text not null default 'PENDING', signed_at timestamptz, created_at timestamptz not null default now());
create table public.turnover_packages (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), system_id uuid references public.systems(id), name text not null, revision integer not null default 0, status text not null default 'DRAFT', completion_percentage numeric not null default 0, storage_key text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.turnover_package_items (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), package_id uuid not null references public.turnover_packages(id), item_type text not null, entity_id uuid, required boolean not null default true, status text not null default 'MISSING', created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id), recipient_user_id uuid not null references auth.users(id), type text not null, title text not null, body text, read_at timestamptz, created_at timestamptz not null default now());
create table public.audit_logs (id bigint generated always as identity primary key, project_id uuid references public.projects(id), actor_user_id uuid references auth.users(id), entity_type text not null, entity_id uuid, action text not null, metadata jsonb not null default '{}', occurred_at timestamptz not null default timezone('utc',now()));
create table public.folio_counters (project_id uuid not null references public.projects(id), prefix text not null, next_value bigint not null default 1, padding smallint not null default 5, primary key(project_id,prefix));
create table public.instruments (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), gauge_id text not null, manufacturer text, model text, serial_number text, range_min numeric, range_max numeric, unit text, calibration_date date, expiration_date date, certificate_key text, status text not null default 'ACTIVE', unique(project_id,gauge_id));
create table public.procedures (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), code text not null, name text not null, revision text not null, storage_key text, effective_date date, status text not null default 'ACTIVE', unique(project_id,code,revision));
create table public.customer_quality_profiles (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), customer_name text not null, configuration jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,customer_name));

create index project_members_user_idx on public.project_members(user_id,project_id);
create index segments_project_status_idx on public.segments(project_id,status);
create index inspections_project_status_idx on public.inspections(project_id,status);
create index ncrs_project_status_idx on public.ncrs(project_id,status);
create index punch_project_status_idx on public.punch_items(project_id,status);
create index audit_project_time_idx on public.audit_logs(project_id,occurred_at desc);

create or replace function public.is_org_member(org_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=auth.uid()) $$;
create or replace function public.is_project_member(pid uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.project_members m where m.project_id=pid and m.user_id=auth.uid()) $$;
create or replace function public.has_project_role(pid uuid, allowed text[]) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.project_members m where m.project_id=pid and m.user_id=auth.uid() and m.role=any(allowed)) $$;

create or replace function public.bootstrap_quality_workspace(org_name text, org_slug text, project_name text, project_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); oid uuid; pid uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into public.user_profiles(id,full_name) values(uid,'') on conflict(id) do nothing;
  if exists(select 1 from public.organization_members where user_id=uid) then raise exception 'User already belongs to an organization'; end if;
  insert into public.organizations(name,slug,created_by) values(trim(org_name),lower(trim(org_slug)),uid) returning id into oid;
  insert into public.organization_members values(oid,uid,'ADMIN',timezone('utc',now()));
  insert into public.projects(organization_id,code,name,created_by) values(oid,upper(trim(project_code)),trim(project_name),uid) returning id into pid;
  insert into public.project_members values(pid,uid,'ADMIN',timezone('utc',now()));
  insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action) values(pid,uid,'project',pid,'PROJECT_CREATED');
  return pid;
end $$;

create or replace function public.create_quality_project(org_id uuid, project_name text, project_code text, client_name text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); pid uuid;
begin
  if uid is null or not exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=uid and m.role in ('ADMIN','PROJECT_MANAGER')) then
    raise exception 'Organization administration access required';
  end if;
  insert into public.projects(organization_id,code,name,client,created_by)
  values(org_id,upper(trim(project_code)),trim(project_name),nullif(trim(client_name),''),uid) returning id into pid;
  insert into public.project_members(project_id,user_id,role) values(pid,uid,'ADMIN');
  insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action) values(pid,uid,'project',pid,'PROJECT_CREATED');
  return pid;
end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.user_profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.next_project_folio(pid uuid, folio_prefix text) returns text language plpgsql security definer set search_path='' as $$
declare n bigint; pad smallint;
begin
  if not public.is_project_member(pid) then raise exception 'Project access denied'; end if;
  insert into public.folio_counters(project_id,prefix,next_value) values(pid,upper(folio_prefix),2)
  on conflict(project_id,prefix) do update set next_value=public.folio_counters.next_value+1
  returning next_value-1,padding into n,pad;
  return upper(folio_prefix)||'-'||lpad(n::text,pad,'0');
end $$;

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
create policy profiles_self on public.user_profiles for all using(id=auth.uid()) with check(id=auth.uid());
create policy org_member_read on public.organizations for select using(public.is_org_member(id));
create policy org_members_read on public.organization_members for select using(user_id=auth.uid() or public.is_org_member(organization_id));
create policy projects_member_read on public.projects for select using(public.is_project_member(id));
create policy project_members_read on public.project_members for select using(user_id=auth.uid() or public.is_project_member(project_id));
create policy projects_admin_write on public.projects for all using(public.has_project_role(id,array['ADMIN','PROJECT_MANAGER'])) with check(public.is_org_member(organization_id));

do $$ declare t text; begin
  foreach t in array array['areas','systems','drawings','drawing_revisions','lines','segments','inspection_requirements','inspections','inspection_values','photos','photo_tags','materials','material_receipts','material_lots','heat_numbers','certificates','material_installations','ncrs','punch_items','corrective_actions','reinspections','generated_documents','signature_envelopes','signature_recipients','turnover_packages','turnover_package_items','audit_logs','folio_counters','instruments','procedures'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy project_read on public.%I for select using(public.is_project_member(project_id))',t);
    if t <> 'audit_logs' then execute format('create policy project_write on public.%I for all using(public.has_project_role(project_id,array[''ADMIN'',''PROJECT_MANAGER'',''QUALITY_MANAGER'',''QC_INSPECTOR'',''ENGINEER'',''FIELD_USER''])) with check(public.has_project_role(project_id,array[''ADMIN'',''PROJECT_MANAGER'',''QUALITY_MANAGER'',''QC_INSPECTOR'',''ENGINEER'',''FIELD_USER'']))',t); end if;
  end loop;
end $$;

alter table public.notifications enable row level security;
create policy notifications_own on public.notifications for select using(recipient_user_id=auth.uid());
alter table public.photo_tag_assignments enable row level security;
create policy photo_assignments_read on public.photo_tag_assignments for select using(exists(select 1 from public.photos p where p.id=photo_id and public.is_project_member(p.project_id)));
alter table public.customer_quality_profiles enable row level security;
create policy customer_profiles_read on public.customer_quality_profiles for select using(public.is_org_member(organization_id));
alter table public.inspection_templates enable row level security;
alter table public.inspection_template_versions enable row level security;
alter table public.document_templates enable row level security;
alter table public.document_template_versions enable row level security;
alter table public.document_mappings enable row level security;
create policy inspection_templates_org on public.inspection_templates for select using(public.is_org_member(organization_id));
create policy inspection_versions_org on public.inspection_template_versions for select using(exists(select 1 from public.inspection_templates t where t.id=template_id and public.is_org_member(t.organization_id)));
create policy document_templates_org on public.document_templates for select using(public.is_org_member(organization_id));
create policy document_versions_org on public.document_template_versions for select using(exists(select 1 from public.document_templates t where t.id=template_id and public.is_org_member(t.organization_id)));
create policy document_mappings_org on public.document_mappings for select using(exists(select 1 from public.document_template_versions v join public.document_templates t on t.id=v.template_id where v.id=template_version_id and public.is_org_member(t.organization_id)));

grant execute on function public.bootstrap_quality_workspace(text,text,text,text) to authenticated;
grant execute on function public.create_quality_project(uuid,text,text,text) to authenticated;
grant execute on function public.next_project_folio(uuid,text) to authenticated;

commit;
