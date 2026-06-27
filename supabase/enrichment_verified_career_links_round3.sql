-- Additional verified career links for the remaining hard-to-match companies.

begin;

delete from public.job_postings
where source_id in (
  select id from public.company_sources
  where source_type = 'verified_web_career_link_round3'
);

update public.company_profiles profile
set careers_page_url = null,
    updated_at = now()
where exists (
  select 1 from public.company_sources source
  where source.company_id = profile.company_id
    and source.source_type = 'verified_web_career_link_round3'
    and source.source_url = profile.careers_page_url
);

update public.companies company
set careers_page_url = null
where exists (
  select 1 from public.company_sources source
  where source.company_id = company.id
    and source.source_type = 'verified_web_career_link_round3'
    and source.source_url = company.careers_page_url
);

delete from public.company_sources
where source_type = 'verified_web_career_link_round3';

with rows(company_id, homepage_url) as (
  values
  (15, 'https://www.dyjg.co.kr'),
  (70, 'https://www.jcomm.co.kr'),
  (13, 'https://www.navcours.com'),
  (30, 'https://www.switch-vr.com')
)
update public.company_profiles profile
set homepage_url = rows.homepage_url,
    updated_at = now()
from rows
where profile.company_id = rows.company_id
  and (profile.homepage_url is null or profile.homepage_url = 'https://-');

with rows(company_id, source_grade, title, source_url, publisher, evidence, job_function) as (
  values
  (70, 'B_COMPANY_OFFICIAL', '현대제이콤 인재채용', 'https://www.jcomm.co.kr/?mnu=recruit', '현대제이콤', '{"verification":"web_search","evidence":"official company recruitment page"}'::jsonb, '통신전자·전장관리체계/M&S 직무 채용 정보 확인'),
  (13, 'B_COMPANY_OFFICIAL', '덕산넵코어스 인재채용', 'https://www.navcours.com/kr/sub/career/career/recruit.php', '덕산넵코어스', '{"verification":"web_search","evidence":"official company recruitment guide"}'::jsonb, '항공유도·위성항법/RF 직무 채용 정보 확인'),
  (13, 'B_COMPANY_OFFICIAL', '덕산그룹 채용', 'https://duksangroup.career.greetinghr.com/ko/intro', '덕산그룹', '{"verification":"web_search","evidence":"official group GreetingHR site listing Duksan Navcours postings"}'::jsonb, '항공유도·위성항법/RF 직무 채용 정보 확인'),
  (15, 'D_SECONDARY_OR_COMMERCIAL', '동양정공 인크루트 채용정보', 'https://www.incruit.com/company/3366069/', '인크루트', '{"verification":"web_search","evidence":"company-specific recruitment and company profile page"}'::jsonb, '탄약·알루미늄 방산 구조물 직무 채용 정보 확인'),
  (51, 'D_SECONDARY_OR_COMMERCIAL', '인피니티에코 잡코리아 채용', 'https://www.jobkorea.co.kr/company/44007509/recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '기타·임베디드 영상/전자제어 직무 채용 정보 확인'),
  (30, 'B_COMPANY_OFFICIAL', '성진테크윈 인사제도', 'https://www.switch-vr.com/sub/personnel_system.php', '성진테크윈', '{"verification":"web_search","evidence":"official personnel/recruitment system page"}'::jsonb, '항공유도·전자부품 품질/생산 직무 채용 정보 확인'),
  (30, 'D_SECONDARY_OR_COMMERCIAL', '성진테크윈 사람인 채용', 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=ZlBnbSs5VUJZOFJpV0xtc01wQ1Y1Zz09&t_ref_content=generic', '사람인', '{"verification":"web_search","evidence":"company-specific Saramin recruitment page"}'::jsonb, '항공유도·전자부품 품질/생산 직무 채용 정보 확인'),
  (16, 'D_SECONDARY_OR_COMMERCIAL', '동인광학 인크루트 채용정보', 'https://www.incruit.com/company/1671465389/', '인크루트', '{"verification":"web_search","evidence":"company-specific recruitment and company profile page"}'::jsonb, '광학·조준경/전자광학 직무 채용 정보 확인'),
  (16, 'C_PUBLIC_OR_PARTNER', '동인광학 RNDJOB 채용공고', 'https://www.rndjob.or.kr/info/eview01.asp?gno=00153517&page=1', '알앤디잡', '{"verification":"web_search","evidence":"public R&D job posting mentioning defense experience and military officer preference"}'::jsonb, '광학·임베디드/펌웨어 연구직 채용 정보 확인'),
  (8, 'D_SECONDARY_OR_COMMERCIAL', '대명 잡코리아 기업 채용정보', 'https://m.jobkorea.co.kr/company/44063764', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea page for Daemyung parachute/defense company; current postings may be absent"}'::jsonb, '기타·낙하산/섬유 방산 직무 채용 정보 확인')
)
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
select
  company_id,
  source_grade,
  'verified_web_career_link_round3',
  title,
  source_url,
  publisher,
  evidence,
  'Verified by targeted web search and applied through supabase/enrichment_verified_career_links_round3.sql'
from rows
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

with preferred(company_id, source_url) as (
  values
  (70, 'https://www.jcomm.co.kr/?mnu=recruit'),
  (13, 'https://duksangroup.career.greetinghr.com/ko/intro'),
  (15, 'https://www.incruit.com/company/3366069/'),
  (51, 'https://www.jobkorea.co.kr/company/44007509/recruit'),
  (30, 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=ZlBnbSs5VUJZOFJpV0xtc01wQ1Y1Zz09&t_ref_content=generic'),
  (16, 'https://www.incruit.com/company/1671465389/'),
  (8, 'https://m.jobkorea.co.kr/company/44063764')
)
update public.companies company
set careers_page_url = preferred.source_url
from preferred
where company.id = preferred.company_id;

with preferred(company_id, source_url) as (
  values
  (70, 'https://www.jcomm.co.kr/?mnu=recruit'),
  (13, 'https://duksangroup.career.greetinghr.com/ko/intro'),
  (15, 'https://www.incruit.com/company/3366069/'),
  (51, 'https://www.jobkorea.co.kr/company/44007509/recruit'),
  (30, 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=ZlBnbSs5VUJZOFJpV0xtc01wQ1Y1Zz09&t_ref_content=generic'),
  (16, 'https://www.incruit.com/company/1671465389/'),
  (8, 'https://m.jobkorea.co.kr/company/44063764')
)
update public.company_profiles profile
set careers_page_url = preferred.source_url,
    updated_at = now()
from preferred
where profile.company_id = preferred.company_id;

with rows(company_id, source_url, job_function) as (
  values
  (70, 'https://www.jcomm.co.kr/?mnu=recruit', '통신전자·전장관리체계/M&S 직무 채용 정보 확인'),
  (13, 'https://duksangroup.career.greetinghr.com/ko/intro', '항공유도·위성항법/RF 직무 채용 정보 확인'),
  (15, 'https://www.incruit.com/company/3366069/', '탄약·알루미늄 방산 구조물 직무 채용 정보 확인'),
  (51, 'https://www.jobkorea.co.kr/company/44007509/recruit', '기타·임베디드 영상/전자제어 직무 채용 정보 확인'),
  (30, 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=ZlBnbSs5VUJZOFJpV0xtc01wQ1Y1Zz09&t_ref_content=generic', '항공유도·전자부품 품질/생산 직무 채용 정보 확인'),
  (16, 'https://www.incruit.com/company/1671465389/', '광학·조준경/전자광학 직무 채용 정보 확인'),
  (8, 'https://m.jobkorea.co.kr/company/44063764', '기타·낙하산/섬유 방산 직무 채용 정보 확인')
)
insert into public.job_postings (
  company_id, source_id, title, job_function, employment_type, experience_level,
  preferred_military_experience, required_skills, preferred_skills, location,
  posting_url, is_active, raw
)
select
  rows.company_id,
  sources.id,
  '추가 검증 채용 정보 페이지',
  rows.job_function,
  null,
  null,
  '군 경력 및 방산 직무 연관 경험 우대 가능',
  '{}'::text[],
  '{}'::text[],
  null,
  rows.source_url,
  null,
  jsonb_build_object('kind', 'verified_web_career_page_pointer_round3')
from rows
join public.company_sources sources
  on sources.company_id = rows.company_id
 and sources.source_type = 'verified_web_career_link_round3'
 and sources.source_url = rows.source_url
where not exists (
  select 1 from public.job_postings existing
  where existing.company_id = rows.company_id
    and existing.posting_url = rows.source_url
    and existing.title = '추가 검증 채용 정보 페이지'
);

commit;
