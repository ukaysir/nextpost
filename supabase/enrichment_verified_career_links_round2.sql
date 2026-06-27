-- Additional verified career links collected by targeted web search.

begin;

delete from public.job_postings
where source_id in (
  select id from public.company_sources
  where source_type = 'verified_web_career_link_round2'
);

update public.company_profiles profile
set careers_page_url = null,
    updated_at = now()
where exists (
  select 1 from public.company_sources source
  where source.company_id = profile.company_id
    and source.source_type = 'verified_web_career_link_round2'
    and source.source_url = profile.careers_page_url
);

update public.companies company
set careers_page_url = null
where exists (
  select 1 from public.company_sources source
  where source.company_id = company.id
    and source.source_type = 'verified_web_career_link_round2'
    and source.source_url = company.careers_page_url
);

delete from public.company_sources
where source_type = 'verified_web_career_link_round2';

with rows(company_id, source_grade, title, source_url, publisher, evidence, job_function) as (
  values
  (58, 'B_COMPANY_OFFICIAL', '평화그룹 인재채용', 'https://recruit.ph.co.kr/', '평화홀딩스', '{"verification":"web_search","evidence":"official group recruitment site"}'::jsonb, '기동·자동차부품 분야 채용 정보 확인'),
  (6, 'D_SECONDARY_OR_COMMERCIAL', '다윈프릭션 사람인 채용', 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=Q1l4eS9CZGRCd0MxTHR1ODhHRlgzdz09', '사람인', '{"verification":"web_search","evidence":"company-specific Saramin recruitment page"}'::jsonb, '항공기 부품·소재생산 직무 채용 정보 확인'),
  (26, 'D_SECONDARY_OR_COMMERCIAL', '삼영이엔씨 잡코리아 채용', 'https://www.jobkorea.co.kr/company/1486263/recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '통신전자·해양전자 직무 채용 정보 확인'),
  (63, 'D_SECONDARY_OR_COMMERCIAL', '한일단조공업 잡코리아 채용', 'https://www.jobkorea.co.kr/company/1535648/recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '단조·탄약/방산부품 직무 채용 정보 확인'),
  (75, 'B_COMPANY_OFFICIAL', 'HD현대 채용', 'https://recruit.hd.com/', 'HD현대', '{"verification":"web_search","evidence":"official HD Hyundai group recruitment site"}'::jsonb, '기동·건설기계/방산부품 직무 채용 정보 확인'),
  (79, 'B_COMPANY_OFFICIAL', 'LS엠트론 채용공고', 'https://www.lsmtron.com/kr/ko/recruit/jobpost', 'LS엠트론', '{"verification":"web_search","evidence":"official company recruitment page"}'::jsonb, '기동·특수사업부/연구개발 직무 채용 정보 확인'),
  (84, 'B_COMPANY_OFFICIAL', 'SNT다이내믹스 채용공고', 'https://recruit.hisntd.com/recruit/application/posting.html', 'SNT다이내믹스', '{"verification":"web_search","evidence":"official company recruitment site"}'::jsonb, '화력·동력전달장치 직무 채용 정보 확인'),
  (22, 'B_COMPANY_OFFICIAL', '빅텍 채용공고', 'https://www.victek.co.kr/07_rec/job.html', '빅텍', '{"verification":"web_search","evidence":"official company recruitment board"}'::jsonb, '통신전자·전자전 직무 채용 정보 확인'),
  (20, 'D_SECONDARY_OR_COMMERCIAL', '미래엠텍 잡코리아 채용공고', 'https://m.jobkorea.co.kr/Recruit/GI_Read/49358629', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea posting mentioning defense experience preference"}'::jsonb, '통신전자·기계설계/광통신 직무 채용 정보 확인'),
  (56, 'D_SECONDARY_OR_COMMERCIAL', '티에스택 잡코리아 채용', 'https://www.jobkorea.co.kr/company/43082213/Recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '통신전자·방산 연구개발 직무 채용 정보 확인'),
  (49, 'B_COMPANY_OFFICIAL', '인소팩 채용공고', 'https://www.insopack.co.kr/notice/recruit.html', '인소팩', '{"verification":"web_search","evidence":"official company recruitment notice page"}'::jsonb, '통신장비·무전기 직무 채용 정보 확인'),
  (29, 'D_SECONDARY_OR_COMMERCIAL', '삼주기업 사람인 채용공고', 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=53863535', '사람인', '{"verification":"web_search","evidence":"company-specific Saramin posting"}'::jsonb, '기동·고무부품 개발/영업 직무 채용 정보 확인'),
  (1, 'D_SECONDARY_OR_COMMERCIAL', '강남 사람인 채용', 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/MmFGZ1hobWUydTdQMm9YMWgrRUl0Zz09/company_nm/%28%EC%A3%BC%29%EA%B0%95%EB%82%A8?nomo=1', '사람인', '{"verification":"web_search","evidence":"company-specific Saramin recruitment page"}'::jsonb, '함정·조선 설계/생산 직무 채용 정보 확인'),
  (32, 'D_SECONDARY_OR_COMMERCIAL', '스페코 잡코리아 채용', 'https://www.jobkorea.co.kr/company/47443818/recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '함정·기계설비/해외영업 직무 채용 정보 확인'),
  (14, 'B_COMPANY_OFFICIAL', '데크카본 채용공고', 'https://www.dacc21.co.kr/board/bbs/board.php?bo_table=recruitment', '데크카본', '{"verification":"web_search","evidence":"official company recruitment board"}'::jsonb, '항공유도·탄소복합재 직무 채용 정보 확인'),
  (52, 'D_SECONDARY_OR_COMMERCIAL', '진영정기 사람인 채용', 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/UFljRFJNRk5CSHA5QlZXVWNpM2VXQT09/company_nm/%28%EC%A3%BC%29%EC%A7%84%EC%98%81%EC%A0%95%EA%B8%B0?nomo=1', '사람인', '{"verification":"web_search","evidence":"company-specific Saramin recruitment page"}'::jsonb, '화력·정밀가공/생산기술 직무 채용 정보 확인'),
  (54, 'B_COMPANY_OFFICIAL', '코리아디펜스인더스트리 채용전형', 'https://www.koreadefenseindustry.com/home/content.do?menu_cd=000019', '코리아디펜스인더스트리', '{"verification":"web_search","evidence":"official company recruitment process page"}'::jsonb, '탄약·방산 연구개발/사업관리 직무 채용 정보 확인'),
  (72, 'D_SECONDARY_OR_COMMERCIAL', '화인정밀산업 사람인 채용', 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/NUlnd3cvb0NMUlFVSWV6UnY1RWY1QT09/company_nm/%ED%99%94%EC%9D%B8%EC%A0%95%EB%B0%80%EC%82%B0%EC%97%85%28%EC%A3%BC%29?nomo=1', '사람인', '{"verification":"web_search","evidence":"company-specific Saramin recruitment page"}'::jsonb, '항공유도·정밀부품 직무 채용 정보 확인'),
  (27, 'D_SECONDARY_OR_COMMERCIAL', '삼정터빈 잡코리아 채용', 'https://www.jobkorea.co.kr/company/43292753/Recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '기동·터빈/항공엔진 부품 직무 채용 정보 확인'),
  (19, 'B_COMPANY_OFFICIAL', 'MNC솔루션 채용', 'https://motionncontrol.recruiter.co.kr/', 'MNC솔루션', '{"verification":"web_search","evidence":"official Recruiter-hosted company recruitment site"}'::jsonb, '기동·방산 R&D/제어알고리즘 직무 채용 정보 확인'),
  (21, 'B_COMPANY_OFFICIAL', '비츠로밀텍 채용', 'https://vitzromt.career.greetinghr.com/ko/intro', '비츠로밀텍', '{"verification":"web_search","evidence":"official GreetingHR recruitment site"}'::jsonb, '통신전자·열전지/전원체계 직무 채용 정보 확인'),
  (23, 'D_SECONDARY_OR_COMMERCIAL', '삼양정밀화학 잡코리아 채용', 'https://www.jobkorea.co.kr/company/43289971/recruit', '잡코리아', '{"verification":"web_search","evidence":"company-specific JobKorea recruitment page"}'::jsonb, '탄약·정밀화학 소재 직무 채용 정보 확인'),
  (31, 'D_SECONDARY_OR_COMMERCIAL', '세아항공방산소재 사람인 채용', 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=VjJIUmVQQXRHZ092MmVVOU5xQXZYdz09', '사람인', '{"verification":"web_search","evidence":"company-specific Saramin recruitment page"}'::jsonb, '탄약·항공방산 소재 직무 채용 정보 확인'),
  (82, 'B_COMPANY_OFFICIAL', 'SK오션플랜트 채용공고', 'https://www.skoceanplant.com/bbs/board.php?bo_table=06_02', 'SK오션플랜트', '{"verification":"web_search","evidence":"official company recruitment board"}'::jsonb, '함정·조선/해양플랜트 직무 채용 정보 확인'),
  (81, 'B_COMPANY_OFFICIAL', 'SG솔루션 채용안내', 'https://sgsolution.co.kr/employment/', 'SG솔루션', '{"verification":"web_search","evidence":"official company employment page"}'::jsonb, '화력·방산장비 품질/생산 직무 채용 정보 확인'),
  (80, 'B_COMPANY_OFFICIAL', 'SG생활안전 채용공고', 'https://www.sgsafety.net/', 'SG생활안전', '{"verification":"web_search","evidence":"official site includes recruitment board"}'::jsonb, '화생방·보호장비/안전제품 직무 채용 정보 확인')
)
insert into public.company_sources (
  company_id, source_grade, source_type, title, source_url, publisher, evidence, notes
)
select
  company_id,
  source_grade,
  'verified_web_career_link_round2',
  title,
  source_url,
  publisher,
  evidence,
  'Verified by targeted web search and applied through supabase/enrichment_verified_career_links_round2.sql'
from rows
on conflict (company_id, source_type, source_url) do update
  set title = excluded.title,
      publisher = excluded.publisher,
      evidence = excluded.evidence,
      source_grade = excluded.source_grade,
      retrieved_at = now(),
      notes = excluded.notes;

with rows(company_id, source_url) as (
  values
  (58, 'https://recruit.ph.co.kr/'),
  (6, 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=Q1l4eS9CZGRCd0MxTHR1ODhHRlgzdz09'),
  (26, 'https://www.jobkorea.co.kr/company/1486263/recruit'),
  (63, 'https://www.jobkorea.co.kr/company/1535648/recruit'),
  (75, 'https://recruit.hd.com/'),
  (79, 'https://www.lsmtron.com/kr/ko/recruit/jobpost'),
  (84, 'https://recruit.hisntd.com/recruit/application/posting.html'),
  (22, 'https://www.victek.co.kr/07_rec/job.html'),
  (20, 'https://m.jobkorea.co.kr/Recruit/GI_Read/49358629'),
  (56, 'https://www.jobkorea.co.kr/company/43082213/Recruit'),
  (49, 'https://www.insopack.co.kr/notice/recruit.html'),
  (29, 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=53863535'),
  (1, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/MmFGZ1hobWUydTdQMm9YMWgrRUl0Zz09/company_nm/%28%EC%A3%BC%29%EA%B0%95%EB%82%A8?nomo=1'),
  (32, 'https://www.jobkorea.co.kr/company/47443818/recruit'),
  (14, 'https://www.dacc21.co.kr/board/bbs/board.php?bo_table=recruitment'),
  (52, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/UFljRFJNRk5CSHA5QlZXVWNpM2VXQT09/company_nm/%28%EC%A3%BC%29%EC%A7%84%EC%98%81%EC%A0%95%EA%B8%B0?nomo=1'),
  (54, 'https://www.koreadefenseindustry.com/home/content.do?menu_cd=000019'),
  (72, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/NUlnd3cvb0NMUlFVSWV6UnY1RWY1QT09/company_nm/%ED%99%94%EC%9D%B8%EC%A0%95%EB%B0%80%EC%82%B0%EC%97%85%28%EC%A3%BC%29?nomo=1'),
  (27, 'https://www.jobkorea.co.kr/company/43292753/Recruit'),
  (19, 'https://motionncontrol.recruiter.co.kr/'),
  (21, 'https://vitzromt.career.greetinghr.com/ko/intro'),
  (23, 'https://www.jobkorea.co.kr/company/43289971/recruit'),
  (31, 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=VjJIUmVQQXRHZ092MmVVOU5xQXZYdz09'),
  (82, 'https://www.skoceanplant.com/bbs/board.php?bo_table=06_02'),
  (81, 'https://sgsolution.co.kr/employment/'),
  (80, 'https://www.sgsafety.net/')
)
update public.companies company
set careers_page_url = rows.source_url
from rows
where company.id = rows.company_id;

with rows(company_id, source_url) as (
  values
  (58, 'https://recruit.ph.co.kr/'),
  (6, 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=Q1l4eS9CZGRCd0MxTHR1ODhHRlgzdz09'),
  (26, 'https://www.jobkorea.co.kr/company/1486263/recruit'),
  (63, 'https://www.jobkorea.co.kr/company/1535648/recruit'),
  (75, 'https://recruit.hd.com/'),
  (79, 'https://www.lsmtron.com/kr/ko/recruit/jobpost'),
  (84, 'https://recruit.hisntd.com/recruit/application/posting.html'),
  (22, 'https://www.victek.co.kr/07_rec/job.html'),
  (20, 'https://m.jobkorea.co.kr/Recruit/GI_Read/49358629'),
  (56, 'https://www.jobkorea.co.kr/company/43082213/Recruit'),
  (49, 'https://www.insopack.co.kr/notice/recruit.html'),
  (29, 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=53863535'),
  (1, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/MmFGZ1hobWUydTdQMm9YMWgrRUl0Zz09/company_nm/%28%EC%A3%BC%29%EA%B0%95%EB%82%A8?nomo=1'),
  (32, 'https://www.jobkorea.co.kr/company/47443818/recruit'),
  (14, 'https://www.dacc21.co.kr/board/bbs/board.php?bo_table=recruitment'),
  (52, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/UFljRFJNRk5CSHA5QlZXVWNpM2VXQT09/company_nm/%28%EC%A3%BC%29%EC%A7%84%EC%98%81%EC%A0%95%EA%B8%B0?nomo=1'),
  (54, 'https://www.koreadefenseindustry.com/home/content.do?menu_cd=000019'),
  (72, 'https://www.saramin.co.kr/zf_user/company-info/view-inner-recruit/csn/NUlnd3cvb0NMUlFVSWV6UnY1RWY1QT09/company_nm/%ED%99%94%EC%9D%B8%EC%A0%95%EB%B0%80%EC%82%B0%EC%97%85%28%EC%A3%BC%29?nomo=1'),
  (27, 'https://www.jobkorea.co.kr/company/43292753/Recruit'),
  (19, 'https://motionncontrol.recruiter.co.kr/'),
  (21, 'https://vitzromt.career.greetinghr.com/ko/intro'),
  (23, 'https://www.jobkorea.co.kr/company/43289971/recruit'),
  (31, 'https://m.saramin.co.kr/job-search/company-info-view/recruit?csn=VjJIUmVQQXRHZ092MmVVOU5xQXZYdz09'),
  (82, 'https://www.skoceanplant.com/bbs/board.php?bo_table=06_02'),
  (81, 'https://sgsolution.co.kr/employment/'),
  (80, 'https://www.sgsafety.net/')
)
update public.company_profiles profile
set careers_page_url = rows.source_url,
    updated_at = now()
from rows
where profile.company_id = rows.company_id;

with rows(company_id, source_url, job_function) as (
  select source.company_id, source.source_url, source.evidence->>'job_function'
  from public.company_sources source
  where source.source_type = 'verified_web_career_link_round2'
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
  coalesce(rows.job_function, '방산 분야 채용 정보 확인'),
  null,
  null,
  '군 경력 및 방산 직무 연관 경험 우대 가능',
  '{}'::text[],
  '{}'::text[],
  null,
  rows.source_url,
  null,
  jsonb_build_object('kind', 'verified_web_career_page_pointer_round2')
from rows
join public.company_sources sources
  on sources.company_id = rows.company_id
 and sources.source_type = 'verified_web_career_link_round2'
 and sources.source_url = rows.source_url
where not exists (
  select 1 from public.job_postings existing
  where existing.company_id = rows.company_id
    and existing.posting_url = rows.source_url
    and existing.title = '추가 검증 채용 정보 페이지'
);

commit;
