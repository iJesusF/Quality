begin;

create or replace function public.audit_quality_insert()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_logs(project_id,actor_user_id,entity_type,entity_id,action)
  values(new.project_id,auth.uid(),tg_table_name,new.id,upper(tg_table_name)||'_CREATED');
  return new;
end $$;

drop trigger if exists audit_segments_insert on public.segments;
drop trigger if exists audit_material_receipts_insert on public.material_receipts;
drop trigger if exists audit_ncrs_insert on public.ncrs;
drop trigger if exists audit_punch_items_insert on public.punch_items;
drop trigger if exists audit_turnover_packages_insert on public.turnover_packages;

create trigger audit_segments_insert after insert on public.segments for each row execute function public.audit_quality_insert();
create trigger audit_material_receipts_insert after insert on public.material_receipts for each row execute function public.audit_quality_insert();
create trigger audit_ncrs_insert after insert on public.ncrs for each row execute function public.audit_quality_insert();
create trigger audit_punch_items_insert after insert on public.punch_items for each row execute function public.audit_quality_insert();
create trigger audit_turnover_packages_insert after insert on public.turnover_packages for each row execute function public.audit_quality_insert();

commit;
