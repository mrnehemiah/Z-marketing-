create or replace function public.zune_attach_verification_document(p_request_id uuid,p_document_path text)
returns public.verified_badge_requests
language plpgsql security definer set search_path=public
as $$
declare v_request public.verified_badge_requests; v_prefix text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_request from public.verified_badge_requests where id=p_request_id and user_id=auth.uid() for update;
 if not found then raise exception 'Verification request not found'; end if;
 if v_request.status<>'pending' or v_request.document_path is not null then raise exception 'Only pending requests without a document can be updated'; end if;
 v_prefix:=auth.uid()::text||'/'||case when v_request.verification_type='seller' then 'seller/' else 'customer/' end;
 if p_document_path not like v_prefix||'%' then raise exception 'Invalid document path'; end if;
 if not exists(select 1 from storage.objects where bucket_id='zune-verification-documents' and name=p_document_path) then raise exception 'Uploaded document not found'; end if;
 update public.verified_badge_requests set document_path=p_document_path,updated_at=now() where id=p_request_id returning * into v_request;
 return v_request;
end; $$;
revoke all on function public.zune_attach_verification_document(uuid,text) from public,anon;
grant execute on function public.zune_attach_verification_document(uuid,text) to authenticated;