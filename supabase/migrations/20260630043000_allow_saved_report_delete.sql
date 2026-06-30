create policy "public delete saved_reports"
  on public.saved_reports for delete
  to anon, authenticated
  using (user_id = 'test');

grant delete on public.saved_reports to anon, authenticated;
