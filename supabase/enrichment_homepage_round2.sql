-- Additional homepage overlay for companies that still lacked homepage_url.

begin;

with rows(company_id, verified_name, homepage_url, data_quality_score) as (
  values
  (9, '대신금속', 'https://www.ds-al.com', 76),
  (19, '엠엔씨솔루션', 'https://www.mncsolution.com', 82),
  (25, '삼양화학공업', 'https://samyangchem.com', 78),
  (31, '세아항공방산소재', 'https://www.seahaerospace.com', 80),
  (38, '아이펙', 'https://www.ipeco.co.kr', 72),
  (72, '화인정밀', 'https://finei.kr', 76)
)
insert into public.company_profiles (
  company_id, verified_name, homepage_url, data_quality_score, updated_at
)
select company_id, verified_name, homepage_url, data_quality_score, now()
from rows
on conflict (company_id) do update
  set verified_name = coalesce(public.company_profiles.verified_name, excluded.verified_name),
      homepage_url = coalesce(public.company_profiles.homepage_url, excluded.homepage_url),
      data_quality_score = greatest(public.company_profiles.data_quality_score, excluded.data_quality_score),
      updated_at = now();

with rows(company_id, source_grade, title, source_url, publisher, evidence) as (
  values
  (9, 'B_COMPANY_OFFICIAL', '대신금속 공식 홈페이지', 'https://www.ds-al.com', '대신금속', '{"verification":"web_search","evidence":"official homepage search result; defense business listed"}'::jsonb),
  (19, 'B_COMPANY_OFFICIAL', '엠엔씨솔루션 공식 홈페이지', 'https://www.mncsolution.com', '엠엔씨솔루션', '{"verification":"web_search","evidence":"official homepage search result"}'::jsonb),
  (25, 'B_COMPANY_OFFICIAL', '삼양화학공업 공식 홈페이지', 'https://samyangchem.com', '삼양화학공업', '{"verification":"web_search","evidence":"official homepage search result including recruitment link"}'::jsonb),
  (31, 'B_COMPANY_OFFICIAL', '세아항공방산소재 공식 홈페이지', 'https://www.seahaerospace.com', '세아항공방산소재', '{"verification":"web_search","evidence":"official homepage search result; aerospace and defense sections"}'::jsonb),
  (38, 'B_COMPANY_OFFICIAL', '아이펙 공식 홈페이지', 'https://www.ipeco.co.kr', '아이펙', '{"verification":"web_search","evidence":"official homepage search result"}'::jsonb),
  (72, 'B_COMPANY_OFFICIAL', '화인정밀 공식 홈페이지', 'https://finei.kr', '화인정밀', '{"verification":"web_search","evidence":"official homepage search result mentioning aircraft parts and defense industry"}'::jsonb),
  (11, 'D_SECONDARY_OR_COMMERCIAL', '대영에스텍 기업정보', 'https://www.saramin.co.kr/zf_user/company-info/view/csn/NWJLdFBBcVhCTWhKeUY1TVJjUDJtdz09/company_nm/%28%EC%A3%BC%29%EB%8C%80%EC%98%81%EC%97%90%EC%8A%A4%ED%85%8D', '사람인', '{"verification":"web_search","evidence":"company-specific profile with employee count, revenue, address, industry"}'::jsonb)
)
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
select
  company_id,
  source_grade,
  case when source_grade = 'B_COMPANY_OFFICIAL' then 'verified_company_homepage' else 'company_profile_external' end,
  title,
  source_url,
  publisher,
  evidence,
  'Verified by targeted web search and applied through supabase/enrichment_homepage_round2.sql'
from rows
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

commit;
