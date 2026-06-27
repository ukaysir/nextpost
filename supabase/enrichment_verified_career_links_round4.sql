-- Final verified career/company employment links for remaining companies.

begin;

delete from public.job_postings
where source_id in (
  select id from public.company_sources
  where source_type = 'verified_web_career_link_round4'
);

update public.company_profiles profile
set careers_page_url = null,
    updated_at = now()
where exists (
  select 1 from public.company_sources source
  where source.company_id = profile.company_id
    and source.source_type = 'verified_web_career_link_round4'
    and source.source_url = profile.careers_page_url
);

update public.companies company
set careers_page_url = null
where exists (
  select 1 from public.company_sources source
  where source.company_id = company.id
    and source.source_type = 'verified_web_career_link_round4'
    and source.source_url = company.careers_page_url
);

delete from public.company_sources
where source_type = 'verified_web_career_link_round4';

with rows(company_id, source_grade, title, source_url, publisher, evidence, job_function) as (
  values
  (7, 'B_COMPANY_OFFICIAL', '단암시스템즈 채용공고', 'https://www.danam.co.kr/board/board_careers/board_list.asp?pageNum=6&scrID=0000000263&ssubNum=1&subNum=4', '단암시스템즈', '{"verification":"web_search","evidence":"official recruitment board with active postings"}'::jsonb, '항공유도·항공 하드웨어/시스템 설계 직무 채용 정보 확인'),
  (9, 'D_SECONDARY_OR_COMMERCIAL', '대신금속 인크루트 채용정보', 'https://www.incruit.com/company/8462299/', '인크루트', '{"verification":"web_search","evidence":"company-specific employment, salary and profile page"}'::jsonb, '기타·알루미늄 주조/방산부품 생산 직무 채용 정보 확인'),
  (28, 'D_SECONDARY_OR_COMMERCIAL', '삼정티비엠 인크루트 채용정보', 'https://www.incruit.com/company/1684857101/', '인크루트', '{"verification":"web_search","evidence":"company-specific employment, salary and profile page"}'::jsonb, '함정·항공/방산 단조부품 제조 직무 채용 정보 확인'),
  (55, 'B_COMPANY_OFFICIAL', '코오롱그룹 채용', 'https://dream.kolon.com/', '코오롱그룹', '{"verification":"web_search","evidence":"official Kolon group recruitment site covering Kolon Spaceworks"}'::jsonb, '항공유도·복합소재/방산영업 직무 채용 정보 확인'),
  (55, 'D_SECONDARY_OR_COMMERCIAL', '코오롱스페이스웍스 잡코리아 채용', 'https://www.jobkorea.co.kr/company/1578402/recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '항공유도·복합소재/방산영업 직무 채용 정보 확인')
)
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
select
  company_id,
  source_grade,
  'verified_web_career_link_round4',
  title,
  source_url,
  publisher,
  evidence,
  'Verified by targeted web search and applied through supabase/enrichment_verified_career_links_round4.sql'
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
  (7, 'https://www.danam.co.kr/board/board_careers/board_list.asp?pageNum=6&scrID=0000000263&ssubNum=1&subNum=4'),
  (9, 'https://www.incruit.com/company/8462299/'),
  (28, 'https://www.incruit.com/company/1684857101/'),
  (55, 'https://dream.kolon.com/')
)
update public.companies company
set careers_page_url = preferred.source_url
from preferred
where company.id = preferred.company_id;

with preferred(company_id, source_url) as (
  values
  (7, 'https://www.danam.co.kr/board/board_careers/board_list.asp?pageNum=6&scrID=0000000263&ssubNum=1&subNum=4'),
  (9, 'https://www.incruit.com/company/8462299/'),
  (28, 'https://www.incruit.com/company/1684857101/'),
  (55, 'https://dream.kolon.com/')
)
update public.company_profiles profile
set careers_page_url = preferred.source_url,
    updated_at = now()
from preferred
where profile.company_id = preferred.company_id;

with rows(company_id, source_url, job_function) as (
  values
  (7, 'https://www.danam.co.kr/board/board_careers/board_list.asp?pageNum=6&scrID=0000000263&ssubNum=1&subNum=4', '항공유도·항공 하드웨어/시스템 설계 직무 채용 정보 확인'),
  (9, 'https://www.incruit.com/company/8462299/', '기타·알루미늄 주조/방산부품 생산 직무 채용 정보 확인'),
  (28, 'https://www.incruit.com/company/1684857101/', '함정·항공/방산 단조부품 제조 직무 채용 정보 확인'),
  (55, 'https://dream.kolon.com/', '항공유도·복합소재/방산영업 직무 채용 정보 확인')
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
  jsonb_build_object('kind', 'verified_web_career_page_pointer_round4')
from rows
join public.company_sources sources
  on sources.company_id = rows.company_id
 and sources.source_type = 'verified_web_career_link_round4'
 and sources.source_url = rows.source_url
where not exists (
  select 1 from public.job_postings existing
  where existing.company_id = rows.company_id
    and existing.posting_url = rows.source_url
    and existing.title = '추가 검증 채용 정보 페이지'
);

commit;
