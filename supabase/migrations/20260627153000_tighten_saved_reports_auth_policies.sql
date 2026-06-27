alter table public.saved_reports enable row level security;
alter table public.saved_companies enable row level security;

drop policy if exists "public read saved_reports" on public.saved_reports;
create policy "read own or public saved_reports"
  on public.saved_reports for select
  to anon, authenticated
  using (
    is_public = true
    or user_id = 'test'
    or user_id = auth.uid()::text
  );

drop policy if exists "public insert saved_reports" on public.saved_reports;
create policy "insert own saved_reports"
  on public.saved_reports for insert
  to anon, authenticated
  with check (
    user_id = 'test'
    or user_id = auth.uid()::text
  );

drop policy if exists "public update saved_reports" on public.saved_reports;
create policy "update own saved_reports"
  on public.saved_reports for update
  to anon, authenticated
  using (
    user_id = 'test'
    or user_id = auth.uid()::text
  )
  with check (
    user_id = 'test'
    or user_id = auth.uid()::text
  );

drop policy if exists "public read saved_companies" on public.saved_companies;
create policy "read own saved_companies"
  on public.saved_companies for select
  to anon, authenticated
  using (
    user_id = 'test'
    or user_id = auth.uid()::text
  );

drop policy if exists "public insert saved_companies" on public.saved_companies;
create policy "insert own saved_companies"
  on public.saved_companies for insert
  to anon, authenticated
  with check (
    user_id = 'test'
    or user_id = auth.uid()::text
  );

drop policy if exists "public update saved_companies" on public.saved_companies;
create policy "update own saved_companies"
  on public.saved_companies for update
  to anon, authenticated
  using (
    user_id = 'test'
    or user_id = auth.uid()::text
  )
  with check (
    user_id = 'test'
    or user_id = auth.uid()::text
  );
