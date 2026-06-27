-- Verified web-search career link overlay.
-- These links are separated from crawler-detected official_homepage_career_link rows.

begin;

delete from public.job_postings
where source_id in (
  select id from public.company_sources
  where source_type = 'verified_web_career_link'
);

update public.company_profiles profile
set careers_page_url = null,
    updated_at = now()
where exists (
  select 1 from public.company_sources source
  where source.company_id = profile.company_id
    and source.source_type = 'verified_web_career_link'
    and source.source_url = profile.careers_page_url
);

update public.companies company
set careers_page_url = null
where exists (
  select 1 from public.company_sources source
  where source.company_id = company.id
    and source.source_type = 'verified_web_career_link'
    and source.source_url = company.careers_page_url
);

delete from public.company_sources
where source_type = 'verified_web_career_link';

with rows(company_id, source_grade, title, source_url, publisher, evidence, job_function) as (
  values
  (25, 'D_SECONDARY_OR_COMMERCIAL', '삼양화학공업 사람인 채용', 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/TzNrMmVIaDVmMDhWL2tyUEpwWHFxZz09/company_nm/%EC%82%BC%EC%96%91%ED%99%94%ED%95%99%EA%B3%B5%EC%97%85%28%EC%A3%BC%29?nomo=1', '사람인', '{"verification":"web_search","reason":"current/active recruit page found in search result"}'::jsonb, '탄약·화공 방산 직무 채용 정보 확인'),
  (64, 'B_COMPANY_OFFICIAL', '한컴라이프케어 인재상/채용', 'https://www.hancomlifecare.com/user/bbs/list.do?bbsId=recruitment', '한컴라이프케어', '{"verification":"web_search","reason":"official company recruitment board"}'::jsonb, '화생방·국방사업 직무 채용 정보 확인'),
  (2, 'B_COMPANY_OFFICIAL', '고려화공 채용안내', 'https://www.kpyro.com/sub/recruit_info.php', '고려화공', '{"verification":"web_search","reason":"official recruitment guide page"}'::jsonb, '탄약·화공 방산 직무 채용 정보 확인'),
  (44, 'B_COMPANY_OFFICIAL', '유아이헬리콥터 채용공고', 'https://www.uigroup.co.kr/bbs/board.php?bo_table=s3_1', '유아이그룹', '{"verification":"web_search","reason":"official UI Group recruitment board for UI Helicopter"}'::jsonb, '항공 MRO·항공유도 직무 채용 정보 확인'),
  (45, 'B_COMPANY_OFFICIAL', '유텍 채용정보', 'https://www.utech.co.kr/sub3/menu1.php', '유텍', '{"verification":"web_search","reason":"official recruitment page"}'::jsonb, '광전자·ILS·기타 방산 직무 채용 정보 확인'),
  (43, 'B_COMPANY_OFFICIAL', '우리별 채용안내', 'https://www.wooribyul.co.kr/bbs/board.php?bo_table=recrut', '우리별', '{"verification":"web_search","reason":"official recruitment board"}'::jsonb, '통신전자·RF 직무 채용 정보 확인'),
  (41, 'B_COMPANY_OFFICIAL', '연합정밀 채용안내', 'https://www.yeonhab.co.kr/recruit/intro.jsp', '연합정밀', '{"verification":"web_search","reason":"official recruitment guide page"}'::jsonb, '통신전자·커넥터 방산 직무 채용 정보 확인'),
  (34, 'B_COMPANY_OFFICIAL', '신정개발특장차 인재채용', 'https://www.sjmotor.com/recruitment/index.jsp', '신정개발특장차', '{"verification":"web_search","reason":"official recruitment page"}'::jsonb, '특장차·기동 분야 채용 정보 확인'),
  (42, 'B_COMPANY_OFFICIAL', '우경광학 인재채용', 'https://wkoptics.koreasme.com/new_kr/views/recruitment.html', '우경광학', '{"verification":"web_search","reason":"official recruitment page"}'::jsonb, '광학·전자광학 직무 채용 정보 확인'),
  (48, 'D_SECONDARY_OR_COMMERCIAL', '이화전기공업 잡코리아 채용', 'https://www.jobkorea.co.kr/company/1586537/recruit', '잡코리아', '{"verification":"web_search","reason":"job platform recruit page with recent postings"}'::jsonb, '전력전자·전기기기 직무 채용 정보 확인'),
  (5, 'D_SECONDARY_OR_COMMERCIAL', '다산기공 잡코리아 채용', 'https://www.jobkorea.co.kr/company/1988336/recruit', '잡코리아', '{"verification":"web_search","reason":"job platform recruit page with active postings"}'::jsonb, '화력·정밀가공 방산 직무 채용 정보 확인'),
  (61, 'D_SECONDARY_OR_COMMERCIAL', '한국특수전지 사람인 채용', 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/MDJiQUFUM2xGc3NtcEIreUYxMTVBQT09/company_nm/%ED%95%9C%EA%B5%AD%ED%8A%B9%EC%88%98%EC%A0%84%EC%A7%80%28%EC%A3%BC%29?nomo=1', '사람인', '{"verification":"web_search","reason":"job platform recruit page found in search result"}'::jsonb, '특수전지·함정 분야 채용 정보 확인'),
  (10, 'D_SECONDARY_OR_COMMERCIAL', '대양전기공업 잡코리아 채용', 'https://www.jobkorea.co.kr/company/1411014/recruit', '잡코리아', '{"verification":"web_search","reason":"job platform recruit page"}'::jsonb, '전장·조명·전자시스템 채용 정보 확인'),
  (11, 'D_SECONDARY_OR_COMMERCIAL', '대영에스텍 인크루트 채용', 'https://www.incruit.com/company/1682080271/job', '인크루트', '{"verification":"web_search","reason":"job platform recruit page"}'::jsonb, '통신전자·정보보호 방산 직무 채용 정보 확인'),
  (38, 'D_SECONDARY_OR_COMMERCIAL', '아이펙 인크루트 채용', 'https://www.incruit.com/company/1683605080/', '인크루트', '{"verification":"web_search","reason":"job platform company recruit page"}'::jsonb, '금속가공·방산부품 직무 채용 정보 확인')
)
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
select
  company_id,
  source_grade,
  'verified_web_career_link',
  title,
  source_url,
  publisher,
  evidence,
  'Verified by web search and applied through supabase/enrichment_verified_career_links.sql'
from rows
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

with rows(company_id, source_url, job_function) as (
  values
  (25, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/TzNrMmVIaDVmMDhWL2tyUEpwWHFxZz09/company_nm/%EC%82%BC%EC%96%91%ED%99%94%ED%95%99%EA%B3%B5%EC%97%85%28%EC%A3%BC%29?nomo=1', '탄약·화공 방산 직무 채용 정보 확인'),
  (64, 'https://www.hancomlifecare.com/user/bbs/list.do?bbsId=recruitment', '화생방·국방사업 직무 채용 정보 확인'),
  (2, 'https://www.kpyro.com/sub/recruit_info.php', '탄약·화공 방산 직무 채용 정보 확인'),
  (44, 'https://www.uigroup.co.kr/bbs/board.php?bo_table=s3_1', '항공 MRO·항공유도 직무 채용 정보 확인'),
  (45, 'https://www.utech.co.kr/sub3/menu1.php', '광전자·ILS·기타 방산 직무 채용 정보 확인'),
  (43, 'https://www.wooribyul.co.kr/bbs/board.php?bo_table=recrut', '통신전자·RF 직무 채용 정보 확인'),
  (41, 'https://www.yeonhab.co.kr/recruit/intro.jsp', '통신전자·커넥터 방산 직무 채용 정보 확인'),
  (34, 'https://www.sjmotor.com/recruitment/index.jsp', '특장차·기동 분야 채용 정보 확인'),
  (42, 'https://wkoptics.koreasme.com/new_kr/views/recruitment.html', '광학·전자광학 직무 채용 정보 확인'),
  (48, 'https://www.jobkorea.co.kr/company/1586537/recruit', '전력전자·전기기기 직무 채용 정보 확인'),
  (5, 'https://www.jobkorea.co.kr/company/1988336/recruit', '화력·정밀가공 방산 직무 채용 정보 확인'),
  (61, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/MDJiQUFUM2xGc3NtcEIreUYxMTVBQT09/company_nm/%ED%95%9C%EA%B5%AD%ED%8A%B9%EC%88%98%EC%A0%84%EC%A7%80%28%EC%A3%BC%29?nomo=1', '특수전지·함정 분야 채용 정보 확인'),
  (10, 'https://www.jobkorea.co.kr/company/1411014/recruit', '전장·조명·전자시스템 채용 정보 확인'),
  (11, 'https://www.incruit.com/company/1682080271/job', '통신전자·정보보호 방산 직무 채용 정보 확인'),
  (38, 'https://www.incruit.com/company/1683605080/', '금속가공·방산부품 직무 채용 정보 확인')
)
update public.companies company
set careers_page_url = rows.source_url
from rows
where company.id = rows.company_id;

with rows(company_id, source_url, job_function) as (
  values
  (25, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/TzNrMmVIaDVmMDhWL2tyUEpwWHFxZz09/company_nm/%EC%82%BC%EC%96%91%ED%99%94%ED%95%99%EA%B3%B5%EC%97%85%28%EC%A3%BC%29?nomo=1', '탄약·화공 방산 직무 채용 정보 확인'),
  (64, 'https://www.hancomlifecare.com/user/bbs/list.do?bbsId=recruitment', '화생방·국방사업 직무 채용 정보 확인'),
  (2, 'https://www.kpyro.com/sub/recruit_info.php', '탄약·화공 방산 직무 채용 정보 확인'),
  (44, 'https://www.uigroup.co.kr/bbs/board.php?bo_table=s3_1', '항공 MRO·항공유도 직무 채용 정보 확인'),
  (45, 'https://www.utech.co.kr/sub3/menu1.php', '광전자·ILS·기타 방산 직무 채용 정보 확인'),
  (43, 'https://www.wooribyul.co.kr/bbs/board.php?bo_table=recrut', '통신전자·RF 직무 채용 정보 확인'),
  (41, 'https://www.yeonhab.co.kr/recruit/intro.jsp', '통신전자·커넥터 방산 직무 채용 정보 확인'),
  (34, 'https://www.sjmotor.com/recruitment/index.jsp', '특장차·기동 분야 채용 정보 확인'),
  (42, 'https://wkoptics.koreasme.com/new_kr/views/recruitment.html', '광학·전자광학 직무 채용 정보 확인'),
  (48, 'https://www.jobkorea.co.kr/company/1586537/recruit', '전력전자·전기기기 직무 채용 정보 확인'),
  (5, 'https://www.jobkorea.co.kr/company/1988336/recruit', '화력·정밀가공 방산 직무 채용 정보 확인'),
  (61, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/MDJiQUFUM2xGc3NtcEIreUYxMTVBQT09/company_nm/%ED%95%9C%EA%B5%AD%ED%8A%B9%EC%88%98%EC%A0%84%EC%A7%80%28%EC%A3%BC%29?nomo=1', '특수전지·함정 분야 채용 정보 확인'),
  (10, 'https://www.jobkorea.co.kr/company/1411014/recruit', '전장·조명·전자시스템 채용 정보 확인'),
  (11, 'https://www.incruit.com/company/1682080271/job', '통신전자·정보보호 방산 직무 채용 정보 확인'),
  (38, 'https://www.incruit.com/company/1683605080/', '금속가공·방산부품 직무 채용 정보 확인')
)
update public.company_profiles profile
set careers_page_url = rows.source_url,
    updated_at = now()
from rows
where profile.company_id = rows.company_id;

with rows(company_id, source_url, job_function) as (
  values
  (25, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/TzNrMmVIaDVmMDhWL2tyUEpwWHFxZz09/company_nm/%EC%82%BC%EC%96%91%ED%99%94%ED%95%99%EA%B3%B5%EC%97%85%28%EC%A3%BC%29?nomo=1', '탄약·화공 방산 직무 채용 정보 확인'),
  (64, 'https://www.hancomlifecare.com/user/bbs/list.do?bbsId=recruitment', '화생방·국방사업 직무 채용 정보 확인'),
  (2, 'https://www.kpyro.com/sub/recruit_info.php', '탄약·화공 방산 직무 채용 정보 확인'),
  (44, 'https://www.uigroup.co.kr/bbs/board.php?bo_table=s3_1', '항공 MRO·항공유도 직무 채용 정보 확인'),
  (45, 'https://www.utech.co.kr/sub3/menu1.php', '광전자·ILS·기타 방산 직무 채용 정보 확인'),
  (43, 'https://www.wooribyul.co.kr/bbs/board.php?bo_table=recrut', '통신전자·RF 직무 채용 정보 확인'),
  (41, 'https://www.yeonhab.co.kr/recruit/intro.jsp', '통신전자·커넥터 방산 직무 채용 정보 확인'),
  (34, 'https://www.sjmotor.com/recruitment/index.jsp', '특장차·기동 분야 채용 정보 확인'),
  (42, 'https://wkoptics.koreasme.com/new_kr/views/recruitment.html', '광학·전자광학 직무 채용 정보 확인'),
  (48, 'https://www.jobkorea.co.kr/company/1586537/recruit', '전력전자·전기기기 직무 채용 정보 확인'),
  (5, 'https://www.jobkorea.co.kr/company/1988336/recruit', '화력·정밀가공 방산 직무 채용 정보 확인'),
  (61, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/MDJiQUFUM2xGc3NtcEIreUYxMTVBQT09/company_nm/%ED%95%9C%EA%B5%AD%ED%8A%B9%EC%88%98%EC%A0%84%EC%A7%80%28%EC%A3%BC%29?nomo=1', '특수전지·함정 분야 채용 정보 확인'),
  (10, 'https://www.jobkorea.co.kr/company/1411014/recruit', '전장·조명·전자시스템 채용 정보 확인'),
  (11, 'https://www.incruit.com/company/1682080271/job', '통신전자·정보보호 방산 직무 채용 정보 확인'),
  (38, 'https://www.incruit.com/company/1683605080/', '금속가공·방산부품 직무 채용 정보 확인')
)
insert into public.job_postings (
  company_id, source_id, title, job_function, employment_type, experience_level,
  preferred_military_experience, required_skills, preferred_skills, location,
  posting_url, is_active, raw
)
select
  rows.company_id,
  sources.id,
  '검증된 채용 정보 페이지',
  rows.job_function,
  null,
  null,
  '군 경력 및 방산 직무 연관 경험 우대 가능',
  '{}'::text[],
  '{}'::text[],
  null,
  rows.source_url,
  null,
  jsonb_build_object('kind', 'verified_web_career_page_pointer')
from rows
join public.company_sources sources
  on sources.company_id = rows.company_id
 and sources.source_type = 'verified_web_career_link'
 and sources.source_url = rows.source_url
where not exists (
  select 1 from public.job_postings existing
  where existing.company_id = rows.company_id
    and existing.posting_url = rows.source_url
    and existing.title = '검증된 채용 정보 페이지'
);

commit;
