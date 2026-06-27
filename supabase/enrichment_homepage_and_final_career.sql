-- Homepage and final career evidence overlay.
-- Adds official homepage URLs found by web search and marks Sigongsa's historical
-- defense-company recruitment notice separately from current recruiting pages.

begin;

with rows(company_id, verified_name, homepage_url, data_quality_score) as (
  values
  (2, '고려화공', 'https://www.kpyro.com', 78),
  (5, '다산기공', 'https://www.da-san.co.kr', 78),
  (7, '단암시스템즈', 'https://www.danam.co.kr', 78),
  (8, '대명', 'https://www.krparachute.co.kr', 74),
  (13, '덕산넵코어스', 'https://www.navcours.com', 80),
  (15, '동양정공', 'https://www.dyjg.co.kr', 72),
  (30, '성진테크윈', 'https://www.switch-vr.com', 78),
  (44, '유아이헬리콥터', 'https://www.uigroup.co.kr', 72),
  (54, '코리아디펜스인더스트리', 'https://www.koreadefenseindustry.com', 78),
  (55, '코오롱스페이스웍스', 'https://www.kolonspaceworks.com', 72),
  (72, '화인정밀', 'https://www.hwainprecision.com', 68),
  (80, 'SG생활안전', 'https://www.sgsafety.net', 72),
  (81, 'SG솔루션', 'https://sgsolution.co.kr', 72),
  (82, 'SK오션플랜트', 'https://www.skoceanplant.com', 78)
)
insert into public.company_profiles (
  company_id, verified_name, homepage_url, data_quality_score, updated_at
)
select
  rows.company_id,
  rows.verified_name,
  rows.homepage_url,
  rows.data_quality_score,
  now()
from rows
on conflict (company_id) do update
  set verified_name = coalesce(public.company_profiles.verified_name, excluded.verified_name),
      homepage_url = coalesce(public.company_profiles.homepage_url, excluded.homepage_url),
      data_quality_score = greatest(public.company_profiles.data_quality_score, excluded.data_quality_score),
      updated_at = now();

with rows(company_id, source_grade, title, source_url, publisher, evidence) as (
  values
  (2, 'B_COMPANY_OFFICIAL', '고려화공 공식 홈페이지', 'https://www.kpyro.com', '고려화공', '{"verification":"web_search","evidence":"official homepage search result"}'::jsonb),
  (5, 'B_COMPANY_OFFICIAL', '다산기공 공식 홈페이지', 'https://www.da-san.co.kr', '다산기공', '{"verification":"web_search","evidence":"official homepage search result"}'::jsonb),
  (7, 'B_COMPANY_OFFICIAL', '단암시스템즈 공식 홈페이지', 'https://www.danam.co.kr', '단암시스템즈', '{"verification":"web_search","evidence":"official homepage and recruitment board"}'::jsonb),
  (8, 'B_COMPANY_OFFICIAL', '대명 공식 홈페이지', 'https://www.krparachute.co.kr', '대명', '{"verification":"web_search","evidence":"official parachute manufacturer homepage"}'::jsonb),
  (13, 'B_COMPANY_OFFICIAL', '덕산넵코어스 공식 홈페이지', 'https://www.navcours.com', '덕산넵코어스', '{"verification":"web_search","evidence":"official homepage and recruitment page"}'::jsonb),
  (15, 'B_COMPANY_OFFICIAL', '동양정공 공식 홈페이지', 'https://www.dyjg.co.kr', '동양정공', '{"verification":"web_search","evidence":"official homepage"}'::jsonb),
  (30, 'B_COMPANY_OFFICIAL', '성진테크윈 공식 홈페이지', 'https://www.switch-vr.com', '성진테크윈', '{"verification":"web_search","evidence":"official homepage"}'::jsonb),
  (44, 'B_COMPANY_OFFICIAL', '유아이그룹 공식 홈페이지', 'https://www.uigroup.co.kr', '유아이그룹', '{"verification":"web_search","evidence":"official group homepage and recruitment board"}'::jsonb),
  (54, 'B_COMPANY_OFFICIAL', '코리아디펜스인더스트리 공식 홈페이지', 'https://www.koreadefenseindustry.com', '코리아디펜스인더스트리', '{"verification":"web_search","evidence":"official homepage and recruitment process page"}'::jsonb),
  (55, 'B_COMPANY_OFFICIAL', '코오롱스페이스웍스 공식 홈페이지', 'https://www.kolonspaceworks.com', '코오롱스페이스웍스', '{"verification":"web_search","evidence":"official company homepage"}'::jsonb),
  (72, 'B_COMPANY_OFFICIAL', '화인정밀 공식 홈페이지', 'https://www.hwainprecision.com', '화인정밀', '{"verification":"web_search","evidence":"official homepage candidate matched to company name"}'::jsonb),
  (80, 'B_COMPANY_OFFICIAL', 'SG생활안전 공식 홈페이지', 'https://www.sgsafety.net', 'SG생활안전', '{"verification":"web_search","evidence":"official homepage and recruitment board"}'::jsonb),
  (81, 'B_COMPANY_OFFICIAL', 'SG솔루션 공식 홈페이지', 'https://sgsolution.co.kr', 'SG솔루션', '{"verification":"web_search","evidence":"official employment page domain"}'::jsonb),
  (82, 'B_COMPANY_OFFICIAL', 'SK오션플랜트 공식 홈페이지', 'https://www.skoceanplant.com', 'SK오션플랜트', '{"verification":"web_search","evidence":"official homepage and recruitment board"}'::jsonb)
)
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
select
  company_id,
  source_grade,
  'verified_company_homepage',
  title,
  source_url,
  publisher,
  evidence,
  'Verified by targeted web search and applied through supabase/enrichment_homepage_and_final_career.sql'
from rows
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
values (
  33,
  'C_PUBLIC_OR_PARTNER',
  'historical_recruitment_notice',
  '시공사 2022년 신입사원 채용 안내',
  'https://www.kyungnam.ac.kr/bbs/me/807/73601/download.do',
  '경남대학교',
  '{"verification":"web_search","evidence":"PDF recruitment notice for defense company Sigongsa; historical, not current active posting","company_site_in_pdf":"www.sigonghyd.com"}'::jsonb,
  'Historical recruitment evidence found by web search; used because current official recruiting page was not found.'
)
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

update public.companies
set careers_page_url = 'https://www.kyungnam.ac.kr/bbs/me/807/73601/download.do'
where id = 33
  and careers_page_url is null;

update public.company_profiles
set careers_page_url = 'https://www.kyungnam.ac.kr/bbs/me/807/73601/download.do',
    updated_at = now()
where company_id = 33
  and careers_page_url is null;

insert into public.job_postings (
  company_id, source_id, title, job_function, employment_type, experience_level,
  preferred_military_experience, required_skills, preferred_skills, location,
  posting_url, is_active, raw
)
select
  33,
  source.id,
  '과거 검증 채용 안내',
  '기동·기계식 브레이크/유압장치 연구개발 직무 채용 정보 확인',
  null,
  null,
  '군 기동장비 정비 및 기계/유압 계통 경험 연계 가능',
  '{}'::text[],
  '{}'::text[],
  null,
  source.source_url,
  false,
  jsonb_build_object('kind', 'historical_recruitment_notice', 'year', 2022, 'active_status', 'historical')
from public.company_sources source
where source.company_id = 33
  and source.source_type = 'historical_recruitment_notice'
  and source.source_url = 'https://www.kyungnam.ac.kr/bbs/me/807/73601/download.do'
  and not exists (
    select 1 from public.job_postings existing
    where existing.company_id = 33
      and existing.posting_url = source.source_url
      and existing.title = '과거 검증 채용 안내'
  );

commit;
