create extension if not exists pgcrypto;

drop table if exists public.saved_companies;
drop table if exists public.saved_reports;
drop table if exists public.glossary_terms;
drop table if exists public.industry_stats;
drop table if exists public.career_centers;
drop table if exists public.career_mapping;
drop table if exists public.education_certs;
drop table if exists public.job_requirements;
drop table if exists public.companies;

create table public.companies (
  id integer primary key,
  company_name text not null,
  defense_field text not null,
  designation_date date,
  total_contract_amount bigint not null default 0,
  recent_contract_year integer,
  is_cost_certified boolean not null default false,
  careers_page_url text,
  avg_salary integer,
  salary_source text
);

create table public.job_requirements (
  id integer primary key,
  defense_field text not null,
  job_title text not null,
  required_skills text[] not null default '{}',
  preferred_military_exp text,
  related_weapon_system text
);

create table public.education_certs (
  id integer primary key,
  defense_field text not null,
  job_title text,
  level text not null,
  education_name text not null,
  education_provider text,
  education_link text,
  cert_name text
);

create table public.career_mapping (
  id integer generated always as identity primary key,
  specialty_keyword text not null,
  position_keywords text[] not null default '{}',
  defense_field text not null,
  job_group text
);

create table public.career_centers (
  id integer primary key,
  name text not null,
  address text,
  phone text,
  jurisdiction text
);

create table public.industry_stats (
  year integer primary key,
  sales integer,
  operating_profit_rate numeric,
  raw jsonb not null default '{}'
);

create table public.glossary_terms (
  id integer primary key,
  term text not null,
  description text not null
);

create table public.company_sources (
  id bigint generated always as identity primary key,
  company_id integer not null references public.companies(id) on delete cascade,
  source_grade text not null check (
    source_grade in (
      'A_GOV_OFFICIAL',
      'B_COMPANY_OFFICIAL',
      'C_PUBLIC_OR_PARTNER',
      'D_SECONDARY_OR_COMMERCIAL'
    )
  ),
  source_type text not null,
  title text,
  source_url text not null,
  publisher text,
  retrieved_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table public.company_profiles (
  company_id integer primary key references public.companies(id) on delete cascade,
  verified_name text,
  homepage_url text,
  careers_page_url text,
  recruit_platform_url text,
  address text,
  stock_code text,
  dart_corp_code text,
  employee_count integer check (employee_count is null or employee_count >= 0),
  employee_count_year integer,
  avg_salary integer check (avg_salary is null or avg_salary >= 0),
  avg_salary_year integer,
  main_products text[] not null default '{}',
  summary text,
  data_quality_score integer not null default 0 check (data_quality_score between 0 and 100),
  updated_at timestamptz not null default now()
);

create table public.company_financials (
  id bigint generated always as identity primary key,
  company_id integer not null references public.companies(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year between 1990 and 2100),
  revenue bigint,
  operating_profit bigint,
  net_income bigint,
  employee_count integer,
  avg_salary integer,
  source_id bigint references public.company_sources(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.contract_records (
  id bigint generated always as identity primary key,
  company_id integer references public.companies(id) on delete set null,
  company_name text not null,
  contract_name text,
  contract_date date,
  contract_year integer check (contract_year is null or contract_year between 1990 and 2100),
  contract_amount bigint check (contract_amount is null or contract_amount >= 0),
  buyer text,
  product_category text,
  weapon_system text,
  source_id bigint references public.company_sources(id) on delete set null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.job_postings (
  id bigint generated always as identity primary key,
  company_id integer not null references public.companies(id) on delete cascade,
  source_id bigint references public.company_sources(id) on delete set null,
  title text not null,
  job_function text,
  employment_type text,
  experience_level text,
  preferred_military_experience text,
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  location text,
  posted_at date,
  deadline_at date,
  posting_url text,
  is_active boolean,
  raw jsonb not null default '{}'::jsonb,
  collected_at timestamptz not null default now()
);

create table public.saved_reports (
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

create table public.saved_companies (
  id bigint generated always as identity primary key,
  report_id uuid references public.saved_reports(id) on delete cascade,
  user_id text not null default 'test',
  company_name text not null,
  defense_field text,
  fit_score integer,
  memo text,
  created_at timestamptz not null default now()
);

create index companies_defense_field_contract_idx
  on public.companies (defense_field, total_contract_amount desc);

create index job_requirements_defense_field_idx
  on public.job_requirements (defense_field);

create index education_certs_defense_field_idx
  on public.education_certs (defense_field);

create index career_mapping_specialty_keyword_idx
  on public.career_mapping (specialty_keyword);

create unique index company_sources_unique_source_idx
  on public.company_sources (company_id, source_type, source_url);

create index company_sources_company_grade_idx
  on public.company_sources (company_id, source_grade, source_type);

create index company_profiles_homepage_idx
  on public.company_profiles (homepage_url) where homepage_url is not null;

create unique index company_financials_company_year_source_idx
  on public.company_financials (company_id, fiscal_year, coalesce(source_id, 0));

create index company_financials_source_id_idx
  on public.company_financials (source_id) where source_id is not null;

create index contract_records_company_year_idx
  on public.contract_records (company_id, contract_year desc);

create index contract_records_amount_idx
  on public.contract_records (contract_amount desc) where contract_amount is not null;

create index contract_records_source_id_idx
  on public.contract_records (source_id) where source_id is not null;

create index job_postings_company_active_idx
  on public.job_postings (company_id, is_active, deadline_at desc);

create index job_postings_source_id_idx
  on public.job_postings (source_id) where source_id is not null;

create index saved_reports_user_created_idx
  on public.saved_reports (user_id, created_at desc);

create index saved_reports_share_id_idx
  on public.saved_reports (share_id);

create index saved_companies_user_created_idx
  on public.saved_companies (user_id, created_at desc);

alter table public.companies enable row level security;
alter table public.job_requirements enable row level security;
alter table public.education_certs enable row level security;
alter table public.career_mapping enable row level security;
alter table public.career_centers enable row level security;
alter table public.industry_stats enable row level security;
alter table public.glossary_terms enable row level security;
alter table public.company_sources enable row level security;
alter table public.company_profiles enable row level security;
alter table public.company_financials enable row level security;
alter table public.contract_records enable row level security;
alter table public.job_postings enable row level security;
alter table public.saved_reports enable row level security;
alter table public.saved_companies enable row level security;

create policy "public read companies"
  on public.companies for select
  to anon, authenticated
  using (true);

create policy "public read job_requirements"
  on public.job_requirements for select
  to anon, authenticated
  using (true);

create policy "public read education_certs"
  on public.education_certs for select
  to anon, authenticated
  using (true);

create policy "public read career_mapping"
  on public.career_mapping for select
  to anon, authenticated
  using (true);

create policy "public read career_centers"
  on public.career_centers for select
  to anon, authenticated
  using (true);

create policy "public read industry_stats"
  on public.industry_stats for select
  to anon, authenticated
  using (true);

create policy "public read glossary_terms"
  on public.glossary_terms for select
  to anon, authenticated
  using (true);

create policy "public read company_sources"
  on public.company_sources for select
  to anon, authenticated
  using (true);

create policy "public read company_profiles"
  on public.company_profiles for select
  to anon, authenticated
  using (true);

create policy "public read company_financials"
  on public.company_financials for select
  to anon, authenticated
  using (true);

create policy "public read contract_records"
  on public.contract_records for select
  to anon, authenticated
  using (true);

create policy "public read job_postings"
  on public.job_postings for select
  to anon, authenticated
  using (true);

create policy "public read saved_reports"
  on public.saved_reports for select
  to anon, authenticated
  using (is_public = true or user_id = 'test');

create policy "public insert saved_reports"
  on public.saved_reports for insert
  to anon, authenticated
  with check (true);

create policy "public update saved_reports"
  on public.saved_reports for update
  to anon, authenticated
  using (user_id = 'test')
  with check (user_id = 'test');

create policy "public read saved_companies"
  on public.saved_companies for select
  to anon, authenticated
  using (true);

create policy "public insert saved_companies"
  on public.saved_companies for insert
  to anon, authenticated
  with check (true);

create policy "public update saved_companies"
  on public.saved_companies for update
  to anon, authenticated
  using (user_id = 'test')
  with check (user_id = 'test');

grant usage on schema public to anon, authenticated;
grant select on public.companies to anon, authenticated;
grant select on public.job_requirements to anon, authenticated;
grant select on public.education_certs to anon, authenticated;
grant select on public.career_mapping to anon, authenticated;
grant select on public.career_centers to anon, authenticated;
grant select on public.industry_stats to anon, authenticated;
grant select on public.glossary_terms to anon, authenticated;
grant select on public.company_sources to anon, authenticated;
grant select on public.company_profiles to anon, authenticated;
grant select on public.company_financials to anon, authenticated;
grant select on public.contract_records to anon, authenticated;
grant select on public.job_postings to anon, authenticated;
grant select, insert, update on public.saved_reports to anon, authenticated;
grant select, insert, update on public.saved_companies to anon, authenticated;
grant usage, select on sequence public.saved_companies_id_seq to anon, authenticated;
