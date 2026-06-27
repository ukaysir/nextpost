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

create index companies_defense_field_contract_idx
  on public.companies (defense_field, total_contract_amount desc);

create index job_requirements_defense_field_idx
  on public.job_requirements (defense_field);

create index education_certs_defense_field_idx
  on public.education_certs (defense_field);

create index career_mapping_specialty_keyword_idx
  on public.career_mapping (specialty_keyword);

alter table public.companies enable row level security;
alter table public.job_requirements enable row level security;
alter table public.education_certs enable row level security;
alter table public.career_mapping enable row level security;
alter table public.career_centers enable row level security;
alter table public.industry_stats enable row level security;
alter table public.glossary_terms enable row level security;

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

grant usage on schema public to anon, authenticated;
grant select on public.companies to anon, authenticated;
grant select on public.job_requirements to anon, authenticated;
grant select on public.education_certs to anon, authenticated;
grant select on public.career_mapping to anon, authenticated;
grant select on public.career_centers to anon, authenticated;
grant select on public.industry_stats to anon, authenticated;
grant select on public.glossary_terms to anon, authenticated;
