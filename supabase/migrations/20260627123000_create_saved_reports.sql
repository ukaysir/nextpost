create extension if not exists pgcrypto;

create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  share_id text not null unique default encode(gen_random_bytes(9), 'hex'),
  user_id text not null default 'test',
  title text not null,
  input_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  matched_field text,
  matched_job_group text,
  top_company text,
  top_score integer,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_companies (
  id bigint generated always as identity primary key,
  report_id uuid references public.saved_reports(id) on delete cascade,
  user_id text not null default 'test',
  company_name text not null,
  defense_field text,
  fit_score integer,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists saved_reports_user_created_idx
  on public.saved_reports (user_id, created_at desc);

create index if not exists saved_reports_share_id_idx
  on public.saved_reports (share_id);

create index if not exists saved_companies_user_created_idx
  on public.saved_companies (user_id, created_at desc);

alter table public.saved_reports enable row level security;
alter table public.saved_companies enable row level security;

drop policy if exists "public read saved_reports" on public.saved_reports;
create policy "public read saved_reports"
  on public.saved_reports for select
  to anon, authenticated
  using (is_public = true or user_id = 'test');

drop policy if exists "public insert saved_reports" on public.saved_reports;
create policy "public insert saved_reports"
  on public.saved_reports for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public update saved_reports" on public.saved_reports;
create policy "public update saved_reports"
  on public.saved_reports for update
  to anon, authenticated
  using (user_id = 'test')
  with check (user_id = 'test');

drop policy if exists "public read saved_companies" on public.saved_companies;
create policy "public read saved_companies"
  on public.saved_companies for select
  to anon, authenticated
  using (true);

drop policy if exists "public insert saved_companies" on public.saved_companies;
create policy "public insert saved_companies"
  on public.saved_companies for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public update saved_companies" on public.saved_companies;
create policy "public update saved_companies"
  on public.saved_companies for update
  to anon, authenticated
  using (user_id = 'test')
  with check (user_id = 'test');

grant select, insert, update on public.saved_reports to anon, authenticated;
grant select, insert, update on public.saved_companies to anon, authenticated;
grant usage, select on sequence public.saved_companies_id_seq to anon, authenticated;
