do $$
begin
  alter type public.analysis_state add value if not exists 'uploading' before 'queued';
  alter type public.analysis_state add value if not exists 'uploaded' before 'queued';
  alter type public.analysis_state add value if not exists 'expired' after 'failed';
  alter type public.analysis_state add value if not exists 'cancelled' after 'expired';
end $$;

alter table public.analysis_jobs
  add column if not exists size_bytes bigint,
  add column if not exists mime_type text,
  add column if not exists uploaded_at timestamptz,
  add column if not exists analysis_started_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists result jsonb,
  add column if not exists result_expires_at timestamptz;

update public.analysis_jobs
set
  size_bytes = coalesce(size_bytes, 1),
  mime_type = coalesce(mime_type, 'application/pdf'),
  expires_at = coalesce(expires_at, created_at + interval '1 hour')
where size_bytes is null or mime_type is null or expires_at is null;

alter table public.analysis_jobs
  alter column size_bytes set not null,
  alter column mime_type set not null,
  alter column expires_at set not null,
  alter column expires_at set default (now() + interval '1 hour');

alter table public.analysis_jobs drop constraint if exists analysis_jobs_size_bytes_check;
alter table public.analysis_jobs add constraint analysis_jobs_size_bytes_check check (size_bytes > 0 and size_bytes <= 31457280);
alter table public.analysis_jobs drop constraint if exists analysis_jobs_mime_type_check;
alter table public.analysis_jobs add constraint analysis_jobs_mime_type_check check (mime_type = 'application/pdf');

create unique index if not exists analysis_jobs_storage_path_idx
  on public.analysis_jobs (storage_path)
  where storage_path is not null;
create index if not exists analysis_jobs_cleanup_idx
  on public.analysis_jobs (expires_at)
  where deleted_at is null;
create index if not exists analysis_jobs_result_cleanup_idx
  on public.analysis_jobs (result_expires_at)
  where result is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('analysis-inputs', 'analysis-inputs', false, 31457280, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
