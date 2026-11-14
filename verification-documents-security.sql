-- ZUNE Marketplace 2.0: private verification documents and type-aware Admin review.
-- Applied to the linked Supabase project as secure_verification_documents_and_review.

alter table public.verified_badge_requests
  add column if not exists document_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zune-verification-documents','zune-verification-documents',false,10485760,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public=false,
  file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "ZUNE users upload own verification documents" on storage.objects;
create policy "ZUNE users upload own verification documents"
on storage.objects for insert to authenticated
with check (
  bucket_id='zune-verification-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role::text in ('buyer','vendor') and p.account_status='active' and p.removed_at is null)
);

drop policy if exists "ZUNE admins view verification documents" on storage.objects;
create policy "ZUNE admins view verification documents"
on storage.objects for select to authenticated
using (bucket_id='zune-verification-documents' and public.zune_is_admin());

drop policy if exists "ZUNE owners delete own verification documents" on storage.objects;
create policy "ZUNE owners delete own verification documents"
on storage.objects for delete to authenticated
using (bucket_id='zune-verification-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.admin_review_zune_badge_request(
  p_request_id uuid, p_decision text, p_reason text default null
)
returns public.verified_badge_requests
language plpgsql
security definer
set search_path = public
as $$
declare v_request public.verified_badge_requests;
begin
  if not public.zune_is_admin() then raise exception 'Admin access required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if p_decision='rejected' and nullif(trim(p_reason),'') is null then raise exception 'A rejection reason is required'; end if;
  select * into v_request from public.verified_badge_requests where id=p_request_id for update;
  if not found then raise exception 'Verification request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'Only pending requests can be reviewed'; end if;
  update public.verified_badge_requests
    set status=p_decision,
        rejection_reason=case when p_decision='rejected' then trim(p_reason) else null end,
        reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
    where id=p_request_id returning * into v_request;
  if v_request.verification_type='customer' then
    update public.profiles set is_verified=(p_decision='approved')
      where id=v_request.user_id and role::text='buyer';
  elsif v_request.verification_type='seller' then
    update public.stores
      set verification_status=case when p_decision='approved' then 'verified' else 'rejected' end,
          updated_at=now()
      where owner_id=v_request.user_id;
  end if;
  return v_request;
end;
$$;

revoke all on function public.admin_review_zune_badge_request(uuid,text,text) from public, anon;
grant execute on function public.admin_review_zune_badge_request(uuid,text,text) to authenticated;
