drop policy if exists "owners upload current analysis input" on storage.objects;

create policy "owners upload current analysis input"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'analysis-inputs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.analysis_jobs j
    where j.owner_id = auth.uid()
      and j.storage_path = name
      and j.state = 'uploading'
  )
);
