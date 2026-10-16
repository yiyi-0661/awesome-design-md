-- Li Lab v0 schema. Apply with the Supabase SQL editor or CLI.
create extension if not exists pgcrypto;

create type public.article_state as enum ('draft', 'published', 'archived');
create type public.analysis_state as enum ('uploading', 'uploaded', 'queued', 'extracting', 'tracing', 'analyzing', 'reviewing', 'complete', 'failed', 'expired', 'cancelled');

create table public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  github_login text not null unique,
  github_id text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.research_issues (
  id text primary key,
  run_id text not null unique,
  digest_hash text not null unique,
  issue_date date not null unique,
  title text not null,
  synthesis text not null,
  paper_count integer not null check (paper_count >= 0),
  canonical_payload jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.radar_preferences (
  singleton boolean primary key default true check (singleton),
  topics text[] not null,
  cadence text not null,
  paper_count integer not null check (paper_count in (5, 10, 15, 20)),
  version integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.preference_audit (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  previous_value jsonb not null,
  next_value jsonb not null,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.method_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  tags text[] not null default '{}',
  state public.article_state not null default 'draft',
  version integer not null default 1,
  author_id uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  source_analysis_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.method_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.method_articles(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(article_id, version)
);

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  state public.analysis_state not null default 'uploading',
  file_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 31457280),
  mime_type text not null check (mime_type = 'application/pdf'),
  trigger_run_id text unique,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_at timestamptz,
  analysis_started_at timestamptz,
  completed_at timestamptz,
  deleted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  result jsonb,
  result_expires_at timestamptz
);

create table public.analysis_results (
  job_id uuid primary key references public.analysis_jobs(id) on delete cascade,
  title text not null,
  core_method jsonb not null,
  reference_origins jsonb not null,
  related_papers jsonb not null,
  limitations jsonb not null,
  protocol_version text not null,
  created_at timestamptz not null default now()
);

create table public.monthly_usage (
  month date primary key,
  accepted_jobs integer not null default 0 check (accepted_jobs >= 0),
  quota integer not null default 50 check (quota > 0),
  updated_at timestamptz not null default now()
);

alter table public.members enable row level security;
alter table public.research_issues enable row level security;
alter table public.radar_preferences enable row level security;
alter table public.preference_audit enable row level security;
alter table public.method_articles enable row level security;
alter table public.method_revisions enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.analysis_results enable row level security;
alter table public.monthly_usage enable row level security;

create policy "published issues are public" on public.research_issues for select using (published_at is not null);
create policy "published methods are public" on public.method_articles for select using (state = 'published' or exists (select 1 from public.members m where m.user_id = auth.uid() and m.enabled));
create policy "members write methods" on public.method_articles for all using (exists (select 1 from public.members m where m.user_id = auth.uid() and m.enabled)) with check (exists (select 1 from public.members m where m.user_id = auth.uid() and m.enabled));
create policy "members read revisions" on public.method_revisions for select using (exists (select 1 from public.members m where m.user_id = auth.uid() and m.enabled));
create policy "members create revisions" on public.method_revisions for insert with check (exists (select 1 from public.members m where m.user_id = auth.uid() and m.enabled));
create policy "owners read own analysis jobs" on public.analysis_jobs for select using (owner_id = auth.uid());
create policy "owners create own analysis jobs" on public.analysis_jobs for insert with check (owner_id = auth.uid() and exists (select 1 from public.members m where m.user_id = auth.uid() and m.enabled));
create policy "owners delete own analysis jobs" on public.analysis_jobs for delete using (owner_id = auth.uid());
create policy "owners read own analysis results" on public.analysis_results for select using (exists (select 1 from public.analysis_jobs j where j.id = job_id and j.owner_id = auth.uid()));

create index research_issues_published_idx on public.research_issues (published_at desc) where published_at is not null;
create index method_articles_state_updated_idx on public.method_articles (state, updated_at desc);
create index analysis_jobs_owner_created_idx on public.analysis_jobs (owner_id, created_at desc);

insert into public.radar_preferences (singleton, topics, cadence, paper_count)
values (true, array['DNA', 'RNA', 'Catalysis', 'Organic Synthesis'], 'Every Monday', 10)
on conflict (singleton) do nothing;

insert into storage.buckets (id, name, public) values ('method-images', 'method-images', true) on conflict do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('analysis-inputs', 'analysis-inputs', false, 31457280, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
